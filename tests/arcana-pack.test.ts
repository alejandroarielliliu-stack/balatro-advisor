import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import type {Card} from '../src/catalog/initial.js';
import type {Fact,GameStateV01,GameStateV02} from '../src/state/model.js';
import type {PackAction,PackContext,PackEntry} from '../src/state/pack-contract.js';
import {applyPackAction} from '../src/rules/pack-shop.js';
import {applyTarotAction} from '../src/rules/tarot.js';
import {freshJokerInstance} from '../src/rules/shop.js';
import {known,success} from './helpers.js';

const timestamp='2026-10-18T02:00:00Z',unknown={status:'unknown',reason:'No observado.'}as const;
function value<T>(fact:Fact<T>):T{assert.equal(fact.status,'known');if(fact.status!=='known')throw new Error('unknown');return fact.value;}
function fixture(catalogId='arcana-normal',price=4):GameStateV02{
 const legacy=JSON.parse(readFileSync('examples/shop-purchase.json','utf8'))as GameStateV01;
 const state:GameStateV02={...legacy,schemaVersion:'0.2',phase:'shop',phaseData:{origin:known({ante:1,kind:'small'})}};
 state.observed.money=known(20);state.observed.jokerContext=known({consumables:known([]),consumableSlots:known(2),tarotsUsed:known(7),tags:known([])});
 value(state.observed.shop).packOffers=[{offerId:'pack',catalogId,price:known(price)},{offerId:'keep',catalogId:'buffoon-normal',price:known(4)}];
 return state;
}
function act(state:GameStateV02,action:PackAction){return applyPackAction(state,action,{expectedRevision:state.revision,updatedAt:timestamp});}
function changed(state:GameStateV02,action:PackAction){return success(act(state,action));}
function context(state:GameStateV02):PackContext{assert.equal(state.phase,'open_pack');if(state.phase!=='open_pack'||!state.phaseData.context)throw new Error('closed');return state.phaseData.context;}
function rejection(state:GameStateV02,action:PackAction,code:string){const before=structuredClone(state),result=act(state,action);assert.ok(!result.ok,JSON.stringify(result));assert.equal(result.errors[0]!.code,code);assert.deepEqual(state,before);}
function tarot(catalogId='c_chariot',entryId='one'):PackEntry{return{entryId,kind:'tarot',catalogId};}
const normalEntries:PackEntry[]=[tarot(),tarot('c_sun','two'),{entryId:'other',kind:'unsupported',catalogId:'c_fool'}];
const megaEntries:PackEntry[]=[...normalEntries,tarot('c_star','star'),tarot('c_moon','moon')];
const observedHand=['8S','8H','KS','2C','3C','4C','5C','6C'];
function open(state=fixture(),entries=normalEntries){return changed(changed(state,{type:'buy_pack',offerId:'pack'}).state,{type:'observe_pack',contents:entries}).state;}
function ready(state=fixture(),entries=normalEntries,cardIds=observedHand){return changed(open(state,entries),{type:'observe_pack_hand',cardIds}).state;}
function select(state:GameStateV02,entryId='one',targetCardIds=['8S']){return changed(state,{type:'choose_pack_item',entryId,targetCardIds});}
function deck(state:GameStateV02):Card[]{const data=value(state.observed.deck);assert.ok('cards'in data);return data.cards;}
function card(state:GameStateV02,id='8S'):Card{const found=deck(state).find(item=>item.instanceId===id);assert.ok(found);return found;}

// Expected sizes/prices/draw timing come from L13; local transformations from L12.
// These literal cases are independent of this engine, not observed played-game results.
test('Arcana normal/jumbo/mega paga4/6/8, ofrece3/5/5, elige1/1/2 y no inventa mano ni contenido',()=>{
 for(const[catalogId,price,choices]of [['arcana-normal',4,1],['arcana-jumbo',6,1],['arcana-mega',8,2]]as const){
  const state=fixture(catalogId,price),before=structuredClone(state),result=changed(state,{type:'buy_pack',offerId:'pack'}),ctx=context(result.state);
  assert.equal(value(result.state.observed.money),20-price);assert.equal(ctx.remainingChoices,choices);assert.equal(ctx.contents.status,'unknown');assert.equal(ctx.heldCardIds?.status,'unknown');assert.deepEqual(ctx.selectedEntryIds,[]);assert.equal(ctx.paid,price);
  assert.deepEqual(result.state.observed.deck,state.observed.deck);assert.deepEqual(result.state.observed.jokerContext,state.observed.jokerContext);assert.deepEqual(state,before);assert.deepEqual(value(result.state.observed.shop).packOffers!.map(item=>item.offerId),['keep']);assert.deepEqual(result.cardChanges,[]);
 }
});
test('El contenido completo y la mano se observan por separado sin pagar ni usar Tarot',()=>{
 const state=open(),before=structuredClone(state),result=changed(state,{type:'observe_pack_hand',cardIds:observedHand});
 assert.deepEqual(context(result.state).heldCardIds,known(observedHand));assert.deepEqual(result.state.observed,before.observed);assert.deepEqual(context(result.state).contents,context(before).contents);assert.equal(context(result.state).remainingChoices,1);assert.deepEqual(state,before);assert.equal(value(value(result.state.observed.jokerContext!).tarotsUsed!),7);
});
test('No hereda una mano de ronda ni usa cartas antes de transcribir la mano robada',()=>{
 const state=open();rejection(state,{type:'choose_pack_item',entryId:'one',targetCardIds:['8S']},'unknown_data');
 const oldContext=structuredClone(state);delete context(oldContext).heldCardIds;rejection(oldContext,{type:'choose_pack_item',entryId:'one',targetCardIds:['8S']},'unknown_data');assert.deepEqual(context(changed(oldContext,{type:'observe_pack_hand',cardIds:observedHand}).state).heldCardIds,known(observedHand));
});
test('Mano observada exige referencias únicas existentes y respeta el máximo conocido',()=>{
 const state=open();rejection(state,{type:'observe_pack_hand',cardIds:['8S','8S']},'duplicate_id');rejection(state,{type:'observe_pack_hand',cardIds:['phantom']},'unknown_card');
 rejection(state,{type:'observe_pack_hand',cardIds:['2S','3S','4S','5S','6S','7S','8S','9S','10S']},'hand_too_large');
 rejection(state,{type:'observe_pack_hand',cardIds:['8S','8H','KS']},'incomplete_pack_hand');
 state.observed.resources.handSize=unknown;assert.ok(changed(state,{type:'observe_pack_hand',cardIds:['8S']}).limitations.some(text=>text.includes('Tamaño de mano desconocido')));
});
test('La mano del sobre no existe para Buffoon/Celestial ni para una fase de tienda',()=>{
 for(const[catalogId,entries]of [['buffoon-normal',[{entryId:'u',kind:'unsupported',catalogId:'other'},{entryId:'v',kind:'unsupported',catalogId:'other2'}]],['celestial-normal',[{entryId:'p1',kind:'planet',catalogId:'c_mercury'},{entryId:'p2',kind:'planet',catalogId:'c_jupiter'},{entryId:'p3',kind:'planet',catalogId:'c_pluto'}]]]as const){
  const state=open(fixture(catalogId),[...structuredClone(entries)]);rejection(state,{type:'observe_pack_hand',cardIds:['8S']},'incompatible_pack_action');
 }
 rejection(fixture(),{type:'observe_pack_hand',cardIds:['8S']},'wrong_phase');
});
test('Usar Chariot directo convierte8S aSteel, cuentaunTarot y no crea/retira consumibles propios',()=>{
 const state=ready(),before=structuredClone(state),result=select(state),after=result.state;
 assert.equal(after.phase,'shop');assert.equal(card(after).enhancement,'steel');assert.equal(card(after).rank,'8');assert.equal(card(after).suit,'S');assert.equal(value(value(after.observed.jokerContext!).tarotsUsed!),8);
 assert.deepEqual(value(after.observed.jokerContext!).consumables,value(before.observed.jokerContext!).consumables);assert.deepEqual(after.observed.resources,before.observed.resources);assert.deepEqual(after.observed.money,before.observed.money);assert.deepEqual(after.assumptions,before.assumptions);assert.deepEqual(state,before);assert.equal(result.cardChanges.length,1);assert.equal(result.state.revision,state.revision+1);
});
test('Los doce efectos Arcana coinciden con las transformaciones literales de la inspección L12',()=>{
 for(const[catalogId,property,expected]of [['c_magician','enhancement','lucky'],['c_empress','enhancement','mult'],['c_hierophant','enhancement','bonus'],['c_lovers','enhancement','wild'],['c_chariot','enhancement','steel'],['c_justice','enhancement','glass'],['c_devil','enhancement','gold'],['c_tower','enhancement','stone'],['c_star','suit','D'],['c_moon','suit','C'],['c_sun','suit','H'],['c_world','suit','S']]as const){
  const state=ready(fixture(),[tarot(catalogId),normalEntries[1]!,normalEntries[2]!]),after=select(state).state;assert.equal(card(after)[property],expected);assert.equal(value(value(after.observed.jokerContext!).tarotsUsed!),8);
 }
});
test('Objetivos ausentes, fuera de mano, repetidos o demasiados son errores atómicos',()=>{
 const state=ready();rejection(state,{type:'choose_pack_item',entryId:'one'},'missing_targets');rejection(state,{type:'choose_pack_item',entryId:'one',targetCardIds:[]},'invalid_target_count');rejection(state,{type:'choose_pack_item',entryId:'one',targetCardIds:['2S']},'card_not_held');rejection(state,{type:'choose_pack_item',entryId:'one',targetCardIds:['phantom']},'unknown_card');rejection(state,{type:'choose_pack_item',entryId:'one',targetCardIds:['8S','8H']},'invalid_target_count');
 const two=ready(fixture(),[tarot('c_magician'),normalEntries[1]!,normalEntries[2]!]);rejection(two,{type:'choose_pack_item',entryId:'one',targetCardIds:['8S','8S']},'duplicate_id');
});
test('Mega usa la misma mano: Steel y luegoDiamond sobre8S; totalTarot7→9 sin otro robo',()=>{
 const state=ready(fixture('arcana-mega',8),megaEntries),first=select(state).state;assert.equal(first.phase,'open_pack');assert.equal(context(first).remainingChoices,1);assert.deepEqual(context(first).heldCardIds,known(observedHand));assert.equal(card(first).enhancement,'steel');
 const second=select(first,'star').state;assert.equal(second.phase,'shop');assert.equal(card(second).enhancement,'steel');assert.equal(card(second).suit,'D');assert.equal(value(value(second.observed.jokerContext!).tarotsUsed!),9);assert.equal(value(second.observed.money),12);assert.equal(deck(second).length,52);assert.deepEqual(second.observed.resources,state.observed.resources);
 rejection(first,{type:'observe_pack_hand',cardIds:['2S']},'pack_already_selected');rejection(first,{type:'choose_pack_item',entryId:'one',targetCardIds:['8H']},'already_selected');rejection(first,{type:'choose_pack_item',entryId:'star',targetCardIds:['2S']},'card_not_held');
});
test('Dos entradas con el mismo Tarot son fuentes distintas y admiten uso repetido sobre misma carta',()=>{
 const entries=[tarot(),tarot('c_chariot','copy'),...megaEntries.slice(2)],state=ready(fixture('arcana-mega',8),entries),first=select(state).state,after=select(first,'copy').state;assert.equal(card(after).enhancement,'steel');assert.equal(value(value(after.observed.jokerContext!).tarotsUsed!),9);assert.equal(deck(after).length,52);
});
test('Primera elección y luego omitir conserva mejora y sumaRedCarduna vez sin otro Tarot usado',()=>{
 const state=fixture('arcana-mega',8);state.observed.jokers=known([freshJokerInstance('red_card','red')]);const first=select(ready(state,megaEntries)).state,after=changed(first,{type:'skip_open_pack'}).state;
 assert.equal(after.phase,'shop');assert.equal(card(after).enhancement,'steel');assert.equal(value(value(after.observed.jokerContext!).tarotsUsed!),8);assert.equal(value(value(after.observed.jokers)[0]!.counters.mult!),3);assert.equal(value(after.observed.money),12);
});
test('Omitir antes de transcribir añade limitación explícita sin inventar cartas ni Tarot usados',()=>{
 const state=changed(fixture(),{type:'buy_pack',offerId:'pack'}).state,before=structuredClone(state),result=changed(state,{type:'skip_open_pack'});assert.equal(result.state.phase,'shop');assert.deepEqual(result.state.observed.deck,before.observed.deck);assert.equal(value(value(result.state.observed.jokerContext!).tarotsUsed!),7);assert.ok(result.limitations.some(text=>text.includes('No se comprobó que el botón omitir')));
});
test('Una mano vacía con capacidad positiva no certifica omitir; capacidadcero sí permite cerrar',()=>{
 const state=open();context(state).heldCardIds=known([]);rejection(state,{type:'skip_open_pack'},'pack_hand_not_ready');
 const zero=fixture();zero.observed.resources.handSize=known(0);const empty=ready(zero,normalEntries,[]);assert.deepEqual(context(empty).heldCardIds,known([]));assert.equal(changed(empty,{type:'skip_open_pack'}).state.phase,'shop');
});
test('La mano completa usa el mínimo del tamaño y mazo disponible; cinco cartas reales caben con límiteocho',()=>{
 const state=fixture(),cards:Card[]=[{instanceId:'8S',rank:'8',suit:'S',edition:'base',enhancement:'none',seal:'none',extraChips:0},{instanceId:'8H',rank:'8',suit:'H',edition:'base',enhancement:'none',seal:'none',extraChips:0},{instanceId:'KS',rank:'K',suit:'S',edition:'base',enhancement:'none',seal:'none',extraChips:0},{instanceId:'2C',rank:'2',suit:'C',edition:'base',enhancement:'none',seal:'none',extraChips:0},{instanceId:'3C',rank:'3',suit:'C',edition:'base',enhancement:'none',seal:'none',extraChips:0}];
 state.observed.deck=known({cards});const hand=['8S','8H','KS','2C','3C'],observed=ready(state,normalEntries,hand);assert.deepEqual(context(observed).heldCardIds,known(hand));assert.equal(card(select(observed).state).enhancement,'steel');
});
test('Un contexto importado con mano incompleta no evita la comprobación al usar Tarot',()=>{
 const state=ready(),ctx=context(state);ctx.heldCardIds=known(['8S','8H','KS']);rejection(state,{type:'choose_pack_item',entryId:'one',targetCardIds:['8S']},'incomplete_pack_hand');
 state.observed.resources.handSize=unknown;const result=select(state);assert.equal(card(result.state).enhancement,'steel');assert.deepEqual(result.state.observed.resources.handSize,unknown);assert.ok(result.limitations.some(text=>text.includes('Tamaño de mano desconocido')));
});
test('Tarot no implementados, Soul y Spectral observados siguen como no compatibles sin efecto falso',()=>{
 for(const catalogId of ['c_fool','c_death','c_strength','c_hanged_man','c_wheel_of_fortune','c_soul','c_ectoplasm']){
  const state=ready(fixture(),[{entryId:'no',kind:'unsupported',catalogId},...normalEntries.slice(1)]);rejection(state,{type:'choose_pack_item',entryId:'no'},'unsupported_pack_item');assert.equal(changed(state,{type:'skip_open_pack'}).state.phase,'shop');
 }
 const state=changed(fixture(),{type:'buy_pack',offerId:'pack'}).state;rejection(state,{type:'observe_pack',contents:[tarot('c_death'),...normalEntries.slice(1)]},'unsupported_tarot');rejection(state,{type:'observe_pack',contents:normalEntries.slice(0,2)},'incomplete_pack_contents');
});
test('No mezcla familias ni ignora cartas objetivo añadidas a Planet o Joker',()=>{
 const state=changed(fixture(),{type:'buy_pack',offerId:'pack'}).state;rejection(state,{type:'observe_pack',contents:[{entryId:'planet',kind:'planet',catalogId:'c_mercury'},...normalEntries.slice(1)]},'incompatible_pack_item');
 const celestial=open(fixture('celestial-normal'),[{entryId:'p1',kind:'planet',catalogId:'c_mercury'},{entryId:'p2',kind:'planet',catalogId:'c_jupiter'},{entryId:'p3',kind:'planet',catalogId:'c_pluto'}]);rejection(celestial,{type:'choose_pack_item',entryId:'p1',targetCardIds:['8S']},'unexpected_targets');
});
test('Inventario lleno o desconocido, dinero desconocido y espacios desconocidos no impiden efecto local',()=>{
 for(const unknownInventory of [false,true]){
  const state=ready();state.observed.money=unknown;state.observed.resources.jokerSlots=unknown;state.observed.jokers=unknown;const ctx=value(state.observed.jokerContext!);
  ctx.consumables=unknownInventory?unknown:known([{instanceId:'a',catalogId:'c_fool',kind:'tarot',edition:'base',sellValue:1},{instanceId:'b',catalogId:'c_emperor',kind:'tarot',edition:'base',sellValue:1}]);ctx.consumableSlots=unknown;
  const before=structuredClone(ctx.consumables),after=select(state).state;assert.equal(card(after).enhancement,'steel');assert.deepEqual(value(after.observed.jokerContext!).consumables,before);assert.deepEqual(after.observed.money,unknown);assert.deepEqual(after.observed.resources.jokerSlots,unknown);assert.equal(value(value(after.observed.jokerContext!).tarotsUsed!),8);
 }
});
test('Historial o contexto desconocidos se conservan sin adivinar bonificación Fortune Teller',()=>{
 for(const missingContext of [false,true]){const state=ready();if(missingContext)state.observed.jokerContext=unknown;else value(state.observed.jokerContext!).tarotsUsed=unknown;const result=select(state);assert.equal(card(result.state).enhancement,'steel');assert.ok(result.limitations.some(text=>text.includes('Fortune Teller')));assert.deepEqual(result.state.observed.jokerContext,state.observed.jokerContext);}
});
test('Siguiente jefe no es jefe activo del sobre comprado en tienda',()=>{
 const state=ready();value(state.observed.nextBlind).kind='boss';value(state.observed.nextBlind).bossId=known('the_head');state.observed.jokers=unknown;assert.equal(card(select(state).state).debuff,false);
 state.observed.nextBlind=unknown;assert.equal(card(select(state).state).enhancement,'steel');
});
test('Conserva edición, sello, fichas permanentes e identidad sin activar Hologram o Glass por sustitución',()=>{
 const state=fixture();const cards:Card[]=[{instanceId:'8S',rank:'K',suit:'H',edition:'polychrome',enhancement:'glass',seal:'red',extraChips:19},{instanceId:'8H',rank:'8',suit:'H',edition:'base',enhancement:'none',seal:'none',extraChips:0},{instanceId:'KS',rank:'K',suit:'S',edition:'base',enhancement:'none',seal:'none',extraChips:0}];
 state.observed.deck=known({cards});state.observed.jokers=known([freshJokerInstance('hologram','holo'),freshJokerInstance('glass','glass')]);const observed=ready(state,normalEntries,['8S','8H','KS']),before=structuredClone(observed),result=select(observed),after=result.state;
 assert.deepEqual(card(after),{...cards[0],enhancement:'steel',debuff:false});assert.deepEqual(after.observed.jokers,before.observed.jokers);assert.equal(deck(after).length,3);
 result.cardChanges[0]!.after.enhancement='gold';assert.equal(card(after).enhancement,'steel');assert.deepEqual(observed,before);
});
test('Consistencia interna: una fuente poseída y una de sobre comparten transformación, sin duplicar fórmulas',()=>{
 const fromPack=select(ready()).state,owned=fixture();value(owned.observed.jokerContext!).consumables=known([{instanceId:'owned',catalogId:'c_chariot',kind:'tarot',edition:'base',sellValue:1}]);
 const round:GameStateV02={...owned,phase:'in_round',phaseData:{blind:known({ante:1,kind:'big'}),handsRemaining:known(5),discardsRemaining:known(3),score:known(0),heldCardIds:known(['8S','8H','KS'])}},result=success(applyTarotAction(round,{type:'use_tarot',instanceId:'owned',targetCardIds:['8S']},{expectedRevision:round.revision,updatedAt:timestamp}));
 assert.deepEqual(result.state.observed.deck,fromPack.observed.deck);assert.deepEqual(value(result.state.observed.jokerContext!).tarotsUsed,value(fromPack.observed.jokerContext!).tarotsUsed);
});
test('Revisiones antiguas, metadatos inválidos y modo estricto dejan el estado sin cambios',()=>{
 const state=ready(),before=structuredClone(state),action:PackAction={type:'choose_pack_item',entryId:'one',targetCardIds:['8S']};
 const stale=applyPackAction(state,action,{expectedRevision:99,updatedAt:timestamp});assert.ok(!stale.ok);assert.equal(stale.errors[0]!.code,'stale_revision');
 const invalid=applyPackAction(state,action,{expectedRevision:state.revision,updatedAt:'bad'});assert.ok(!invalid.ok);
 const strict=applyPackAction(state,action,{expectedRevision:state.revision,updatedAt:timestamp},{requireObserved:true});assert.ok(!strict.ok);assert.equal(strict.errors[0]!.code,'pending_rule');assert.deepEqual(state,before);
});
