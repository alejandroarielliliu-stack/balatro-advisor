import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import type {Card} from '../src/catalog/initial.js';
import type {Fact,GameStateV01,GameStateV02} from '../src/state/model.js';
import type {TarotAction} from '../src/state/tarot-contract.js';
import {applyTarotAction} from '../src/rules/tarot.js';
import {freshJokerInstance} from '../src/rules/shop.js';
import {known,success} from './helpers.js';

const timestamp='2026-10-17T18:00:00Z';
const unknown={status:'unknown',reason:'No observado.'} as const;
function value<T>(fact:Fact<T>):T{assert.equal(fact.status,'known');if(fact.status!=='known')throw new Error('unknown');return fact.value;}
function fixture(catalogId='c_chariot'):GameStateV02{
 const legacy=JSON.parse(readFileSync('examples/shop-purchase.json','utf8')) as GameStateV01;
 return {...legacy,schemaVersion:'0.2',phase:'in_round',phaseData:{blind:known({ante:1,kind:'big'}),handsRemaining:known(5),discardsRemaining:known(3),score:known(0),heldCardIds:known(['8S','8H','KS'])},
  observed:{...legacy.observed,jokerContext:known({consumables:known([{instanceId:'tarot',catalogId,kind:'tarot',edition:'base',sellValue:1}]),tarotsUsed:known(0)})}};
}
function act(state:GameStateV02,action:TarotAction){return applyTarotAction(state,action,{expectedRevision:state.revision,updatedAt:timestamp});}
function changed(state:GameStateV02,action:TarotAction){return success(act(state,action));}
function use(state:GameStateV02,ids=['8S'],instanceId='tarot'){return changed(state,{type:'use_tarot',instanceId,targetCardIds:ids});}
function cards(state:GameStateV02):Card[]{const deck=value(state.observed.deck);assert.ok('cards'in deck);return deck.cards;}
function targetCard(state:GameStateV02):Card{const card=cards(state).find(card=>card.instanceId==='8S');assert.ok(card);return card;}
function explicit(state:GameStateV02,changes:Partial<Card>={}):Card{
 const card:Card={instanceId:'8S',rank:'8',suit:'S',edition:'polychrome',enhancement:'glass',seal:'red',extraChips:17,...changes};
 state.observed.deck=known({cards:[card,{instanceId:'8H',rank:'8',suit:'H',edition:'base',enhancement:'none',seal:'none',extraChips:0},{instanceId:'KS',rank:'K',suit:'S',edition:'base',enhancement:'none',seal:'none',extraChips:0}]});return card;
}
function rejection(state:GameStateV02,action:TarotAction,code:string){const before=structuredClone(state),result=act(state,action);assert.ok(!result.ok,JSON.stringify(result));assert.equal(result.errors[0]!.code,code);assert.deepEqual(state,before);}

// Literal transformations/limits below are transcribed independently from L12 Lua evidence.
// They are not outputs of TAROT_TARGETS or this engine, nor observations of a played game.
test('Ocho Tarot sustituyen la mejora con límites2/1 y conservan las demás propiedades',()=>{
 for(const [catalogId,enhancement,max]of [
  ['c_magician','lucky',2],['c_empress','mult',2],['c_hierophant','bonus',2],['c_lovers','wild',1],
  ['c_chariot','steel',1],['c_justice','glass',1],['c_devil','gold',1],['c_tower','stone',1]
 ]as const){
  const state=fixture(catalogId),before=structuredClone(state),original=structuredClone(explicit(state));
  const result=use(state,['8S','8H'].slice(0,max)),after=result.state,ctx=value(after.observed.jokerContext!);
  assert.deepEqual(cards(after)[0],{...original,enhancement,debuff:false});
  assert.equal(cards(after)[1]!.enhancement,max===2?enhancement:'none');assert.equal(cards(after)[2]!.enhancement,'none');
  assert.equal(value(ctx.consumables!).length,0);assert.equal(value(ctx.tarotsUsed!),1);assert.equal(result.cardChanges.length,max);
  assert.equal(after.revision,before.revision+1);assert.equal(after.updatedAt,timestamp);assert.equal(result.steps.length,1);
  assert.deepEqual(state.observed.deck,known({cards:[original,{instanceId:'8H',rank:'8',suit:'H',edition:'base',enhancement:'none',seal:'none',extraChips:0},{instanceId:'KS',rank:'K',suit:'S',edition:'base',enhancement:'none',seal:'none',extraChips:0}]}));
 }
});
test('Cuatro Tarot de palo convierten1..3 objetivos y conservan mejora, edición, sello y bonus',()=>{
 for(const [catalogId,suit]of [['c_star','D'],['c_moon','C'],['c_sun','H'],['c_world','S']]as const){
  const state=fixture(catalogId),original=structuredClone(explicit(state)),before=structuredClone(state),result=use(state,['8S','8H','KS']);
  assert.deepEqual(cards(result.state)[0],{...original,suit,debuff:false});assert.ok(cards(result.state).every(card=>card.suit===suit));assert.equal(result.cardChanges.length,3);assert.deepEqual(state,before);
 }
});
test('Límite máximo es propio de cada Tarot; cero y exceso rechazan sin consumir',()=>{
 for(const [catalogId,max]of [['c_magician',2],['c_empress',2],['c_hierophant',2],['c_lovers',1],['c_chariot',1],['c_justice',1],['c_devil',1],['c_tower',1],['c_star',3],['c_moon',3],['c_sun',3],['c_world',3]]as const){
  const state=fixture(catalogId);if(state.phase==='in_round')state.phaseData.heldCardIds=known(['8S','8H','KS','KH']);
  rejection(state,{type:'use_tarot',instanceId:'tarot',targetCardIds:[]},'invalid_target_count');
  rejection(state,{type:'use_tarot',instanceId:'tarot',targetCardIds:['8S','8H','KS','KH'].slice(0,max+1)},'invalid_target_count');
 }
});
test('Palo o mejora que ya coincide sigue siendo legal y consume exactamente una instancia',()=>{
 for(const [catalogId,changes]of [['c_chariot',{enhancement:'steel'}],['c_world',{suit:'S'}]]as const){
  const state=fixture(catalogId);explicit(state,changes);const after=use(state).state;assert.equal(value(value(after.observed.jokerContext!).consumables!).length,0);assert.equal(value(value(after.observed.jokerContext!).tarotsUsed!),1);
 }
});
test('Stone conserva rango y palo latentes; Steel los restaura sin crear una carta nueva',()=>{
 const state=fixture();const original=structuredClone(explicit(state,{rank:'K',suit:'H',enhancement:'stone'})),after=use(state).state;
 assert.deepEqual(cards(after)[0],{...original,enhancement:'steel',debuff:false});assert.equal(cards(after).length,3);assert.equal(new Set(cards(after).map(card=>card.instanceId)).size,3);
});
test('Convertir el palo de Stone o Wild conserva su mejora',()=>{
 for(const enhancement of ['stone','wild']){const state=fixture('c_sun');explicit(state,{enhancement});const after=use(state).state;assert.equal(cards(after)[0]!.enhancement,enhancement);assert.equal(cards(after)[0]!.suit,'H');}
});
test('La observación registra solo cartas vistas y no consume ni cambia dinero, recursos o escenarios',()=>{
 const state=fixture(),before=structuredClone(state),result=changed(state,{type:'observe_round_hand',cardIds:['2C','KH']});
 assert.equal(result.state.phase,'in_round');if(result.state.phase!=='in_round')throw new Error('phase');
 assert.deepEqual(result.state.phaseData.heldCardIds,known(['2C','KH']));assert.deepEqual(result.state.observed,before.observed);assert.deepEqual(result.state.assumptions,before.assumptions);assert.deepEqual(state,before);
 assert.deepEqual(result.cardChanges,[]);assert.deepEqual(result.state.phaseData.score,state.phase==='in_round'?state.phaseData.score:undefined);assert.ok(result.limitations.some(text=>text.includes('no infiere robos')));
});
test('Una mano real vacía es registrable y no permite usar Tarot sin objetivos',()=>{
 const state=changed(fixture(),{type:'observe_round_hand',cardIds:[]}).state;
 assert.equal(state.phase,'in_round');if(state.phase==='in_round')assert.deepEqual(value(state.phaseData.heldCardIds),[]);
 rejection(state,{type:'use_tarot',instanceId:'tarot',targetCardIds:['8S']},'card_not_held');
});
test('Observar rechaza repetidas, cartas inexistentes y más cartas que el tamaño conocido',()=>{
 const state=fixture();rejection(state,{type:'observe_round_hand',cardIds:['8S','8S']},'duplicate_id');rejection(state,{type:'observe_round_hand',cardIds:['phantom']},'unknown_card');
 rejection(state,{type:'observe_round_hand',cardIds:['2S','3S','4S','5S','6S','7S','8S','9S','10S']},'hand_too_large');
});
test('Tamaño desconocido permite observación explícita con limitación sin inventar ocho',()=>{
 const state=fixture();state.observed.resources.handSize=unknown;const result=changed(state,{type:'observe_round_hand',cardIds:['2S','3S']});assert.deepEqual(result.state.observed.resources.handSize,unknown);assert.ok(result.limitations.some(text=>text.includes('Tamaño de mano desconocido')));
});
test('Solo cartas de la mano conocida pueden ser objetivo, nunca una carta arbitraria del mazo',()=>{
 rejection(fixture(),{type:'use_tarot',instanceId:'tarot',targetCardIds:['2S']},'card_not_held');rejection(fixture(),{type:'use_tarot',instanceId:'tarot',targetCardIds:['phantom']},'unknown_card');
 const unknownHeld=fixture();if(unknownHeld.phase==='in_round')unknownHeld.phaseData.heldCardIds=unknown;rejection(unknownHeld,{type:'use_tarot',instanceId:'tarot',targetCardIds:['8S']},'unknown_data');
 rejection(fixture('c_magician'),{type:'use_tarot',instanceId:'tarot',targetCardIds:['8S','8S']},'duplicate_id');
});
test('No acepta una mano importada mayor del tamaño conocido ni referencias falsas del preset',()=>{
 const oversized=fixture();if(oversized.phase==='in_round')oversized.phaseData.heldCardIds=known(['2S','3S','4S','5S','6S','7S','8S','9S','10S']);rejection(oversized,{type:'use_tarot',instanceId:'tarot',targetCardIds:['8S']},'hand_too_large');
 const invalid=fixture();if(invalid.phase==='in_round')invalid.phaseData.heldCardIds=known(['8S','phantom']);rejection(invalid,{type:'use_tarot',instanceId:'tarot',targetCardIds:['8S']},'unknown_card');
});
test('Tarot ausente, no compatible y tipo falsificado rechazan sin corrección arbitraria',()=>{
 rejection(fixture(),{type:'use_tarot',instanceId:'other',targetCardIds:['8S']},'missing_consumable');rejection(fixture('c_death'),{type:'use_tarot',instanceId:'tarot',targetCardIds:['8S']},'unsupported_tarot');
 const fake=fixture();value(value(fake.observed.jokerContext!).consumables!)[0]!.kind='planet';rejection(fake,{type:'use_tarot',instanceId:'tarot',targetCardIds:['8S']},'unsupported_tarot');
 const typo=fixture('c_heirophant');rejection(typo,{type:'use_tarot',instanceId:'tarot',targetCardIds:['8S']},'unsupported_tarot');
 const extra=act(fixture(),{type:'use_tarot',instanceId:'tarot',targetCardIds:['8S'],correction:{money:999}}as TarotAction);assert.ok(!extra.ok);assert.equal(extra.errors[0]!.code,'unexpected_field');
});
test('Dos copias del mismo Tarot son acciones distintas y solo se retira la instancia elegida',()=>{
 const state=fixture(),ctx=value(state.observed.jokerContext!);value(ctx.consumables!).push({instanceId:'other',catalogId:'c_chariot',kind:'tarot',edition:'negative',sellValue:0});
 const first=use(state,['8S'],'other').state;assert.deepEqual(value(value(first.observed.jokerContext!).consumables!).map(item=>item.instanceId),['tarot']);
 const after=use(first,['8H']).state;assert.equal(value(value(after.observed.jokerContext!).tarotsUsed!),2);assert.equal(cards(after).filter(card=>card.enhancement==='steel').length,2);rejection(after,{type:'use_tarot',instanceId:'tarot',targetCardIds:['KS']},'missing_consumable');
});
test('Historial conocido se actualiza con Fortune Teller sin un contador ficticio por comodín',()=>{
 const state=fixture();state.observed.jokers=known([freshJokerInstance('fortune_teller','fortune')]);const ctx=value(state.observed.jokerContext!);ctx.tarotsUsed=known(4);const beforeJokers=structuredClone(state.observed.jokers),after=use(state).state;
 assert.equal(value(value(after.observed.jokerContext!).tarotsUsed!),5);assert.deepEqual(after.observed.jokers,beforeJokers);
});
test('Historial desconocido o ausente limita Fortune Teller, sin bloquear la transformación exacta',()=>{
 for(const absent of [false,true]){const state=fixture(),ctx=value(state.observed.jokerContext!);if(absent)delete ctx.tarotsUsed;else ctx.tarotsUsed=unknown;
  const result=use(state),afterCtx=value(result.state.observed.jokerContext!);assert.equal(targetCard(result.state).enhancement,'steel');assert.deepEqual(afterCtx.tarotsUsed,absent?undefined:unknown);assert.ok(result.limitations.some(text=>text.includes('Fortune Teller')));assert.equal(value(afterCtx.consumables!).length,0);
 }
});
test('Los contadores máximos no desbordan ni dejan el consumible retirado parcialmente',()=>{
 const state=fixture();value(state.observed.jokerContext!).tarotsUsed=known(Number.MAX_SAFE_INTEGER);rejection(state,{type:'use_tarot',instanceId:'tarot',targetCardIds:['8S']},'numeric_range');
});
test('No puntúa, paga Gold, altera rondas ni inventa robos al transformar',()=>{
 const state=fixture('c_devil');explicit(state);const before=structuredClone(state),after=use(state).state;
 assert.deepEqual(after.phaseData,before.phaseData);assert.deepEqual(after.observed.money,before.observed.money);assert.deepEqual(after.observed.resources,before.observed.resources);assert.deepEqual(after.observed.handBases,before.observed.handBases);assert.deepEqual(after.assumptions,before.assumptions);assert.deepEqual(after.observed.shop,before.observed.shop);
});
test('Refresca debuff a falso en Small/Big y los cuatro jefes compatibles sin debuff de carta',()=>{
 for(const boss of ['none','the_psychic','the_water','the_wall','violet_vessel']){
  const state=fixture();explicit(state,{debuff:true});if(boss!=='none'){const blind=value(state.observed.nextBlind);blind.kind='boss';blind.bossId=known(boss);if(state.phase==='in_round')state.phaseData.blind=known({ante:blind.ante,kind:'boss'});}
  assert.equal(cards(use(state).state)[0]!.debuff,false);
 }
});
test('La fase activa Small/Big basta para usar Tarot aunque nextBlind sea desconocida',()=>{
 for(const kind of ['small','big']as const){
  const state=fixture();explicit(state,{debuff:true});if(state.phase==='in_round')state.phaseData.blind=known({ante:1,kind});state.observed.nextBlind=unknown;
  const before=structuredClone(state),after=use(state).state;assert.equal(targetCard(after).enhancement,'steel');assert.equal(targetCard(after).debuff,false);assert.deepEqual(after.observed.nextBlind,unknown);assert.deepEqual(state,before);
 }
});
test('Ciega activa desconocida bloquea el uso afectado, pero permite registrar cartas observadas',()=>{
 const state=fixture();if(state.phase==='in_round')state.phaseData.blind=unknown;rejection(state,{type:'use_tarot',instanceId:'tarot',targetCardIds:['8S']},'unknown_data');
 const result=changed(state,{type:'observe_round_hand',cardIds:['8H']}).state;assert.equal(result.phase,'in_round');if(result.phase==='in_round'){assert.deepEqual(result.phaseData.blind,unknown);assert.deepEqual(result.phaseData.heldCardIds,known(['8H']));}
});
test('Small/Big con bossId conocido contradictorio rechaza, sin exigir bossId desconocido',()=>{
 const state=fixture();value(state.observed.nextBlind).bossId=known('the_head');rejection(state,{type:'use_tarot',instanceId:'tarot',targetCardIds:['8S']},'invalid_blind');
 value(state.observed.nextBlind).bossId=unknown;const after=use(state).state;assert.equal(targetCard(after).enhancement,'steel');assert.deepEqual(value(after.observed.nextBlind).bossId,unknown);
});
test('Jefe de debuff sin implementar bloquea solo uso; observar sigue permitido',()=>{
 const state=fixture();const blind=value(state.observed.nextBlind);blind.kind='boss';blind.bossId=known('the_head');if(state.phase==='in_round')state.phaseData.blind=known({ante:blind.ante,kind:'boss'});
 rejection(state,{type:'use_tarot',instanceId:'tarot',targetCardIds:['8S']},'unsupported_debuff_refresh');assert.equal(changed(state,{type:'observe_round_hand',cardIds:['8S']}).state.phase,'in_round');
 value(state.observed.jokerContext!).bossDisabled=known(true);assert.equal(targetCard(use(state).state).debuff,false);
});
test('Jefe desconocido o desactivación desconocida no conservan silenciosamente debuff obsoleto',()=>{
 const state=fixture();const blind=value(state.observed.nextBlind);blind.kind='boss';blind.bossId=unknown;if(state.phase==='in_round')state.phaseData.blind=known({ante:blind.ante,kind:'boss'});
 rejection(state,{type:'use_tarot',instanceId:'tarot',targetCardIds:['8S']},'unknown_data');blind.bossId=known('the_head');value(state.observed.jokerContext!).bossDisabled=unknown;rejection(state,{type:'use_tarot',instanceId:'tarot',targetCardIds:['8S']},'unknown_data');
});
test('Datos de desactivación irrelevantes no bloquean jefes sin debuff ni un jefe confirmado desactivado',()=>{
 const state=fixture();state.observed.jokers=unknown;const blind=value(state.observed.nextBlind);blind.kind='boss';blind.bossId=known('the_psychic');if(state.phase==='in_round')state.phaseData.blind=known({ante:blind.ante,kind:'boss'});value(state.observed.jokerContext!).bossDisabled=unknown;
 assert.equal(targetCard(use(state).state).enhancement,'steel');blind.bossId=unknown;value(state.observed.jokerContext!).bossDisabled=known(true);assert.equal(targetCard(use(state).state).enhancement,'steel');
});
test('Chicot físico desactiva un jefe y permite refrescar sus cartas',()=>{
 const state=fixture();explicit(state,{debuff:true});state.observed.jokers=known([freshJokerInstance('chicot','chicot')]);const blind=value(state.observed.nextBlind);blind.kind='boss';blind.bossId=known('the_head');if(state.phase==='in_round')state.phaseData.blind=known({ante:blind.ante,kind:'boss'});assert.equal(cards(use(state).state)[0]!.debuff,false);
});
test('No requiere dinero, espacios de comodines ni otros recursos para el efecto dirigido',()=>{
 const state=fixture();state.observed.money=unknown;state.observed.resources.jokerSlots=unknown;state.observed.resources.handsPerRound=unknown;state.observed.resources.discardsPerRound=unknown;assert.equal(targetCard(use(state).state).enhancement,'steel');
});
test('El contador global conocido no depende de un inventario de comodines desconocido',()=>{
 const state=fixture();state.observed.jokers=unknown;value(state.observed.jokerContext!).tarotsUsed=known(6);const after=use(state).state;assert.equal(targetCard(after).enhancement,'steel');assert.equal(value(value(after.observed.jokerContext!).tarotsUsed!),7);assert.deepEqual(after.observed.jokers,unknown);
});
test('Revisión obsoleta, fase incorrecta y metadatos inválidos no modifican la entrada',()=>{
 const state=fixture(),before=structuredClone(state);const stale=applyTarotAction(state,{type:'use_tarot',instanceId:'tarot',targetCardIds:['8S']},{expectedRevision:99,updatedAt:timestamp});assert.ok(!stale.ok);assert.equal(stale.errors[0]!.code,'stale_revision');assert.deepEqual(state,before);
 const shop={...state,phase:'shop' as const,phaseData:{origin:known({ante:1,kind:'small' as const})}};rejection(shop,{type:'observe_round_hand',cardIds:['8S']},'wrong_phase');
 const invalid=applyTarotAction(state,{type:'use_tarot',instanceId:'tarot',targetCardIds:['8S']},{expectedRevision:state.revision,updatedAt:'not-a-date'});assert.ok(!invalid.ok);assert.deepEqual(state,before);
});
test('Proyecciones independientes no comparten mutaciones con entrada, resultados ni pasos',()=>{
 const state=fixture(),before=structuredClone(state),one=use(state),two=use(state,['8H']);assert.deepEqual(state,before);assert.equal(cards(one.state).find(card=>card.instanceId==='8H')!.enhancement,'none');assert.equal(cards(two.state).find(card=>card.instanceId==='8S')!.enhancement,'none');
 one.cardChanges[0]!.after.enhancement='gold';targetCard(one.steps[0]!).enhancement='lucky';assert.equal(targetCard(one.state).enhancement,'steel');assert.equal(one.cardChanges[0]!.before.enhancement,'none');
});
test('Modo estricto conserva abstención por falta de contraste en partida',()=>{
 const state=fixture(),before=structuredClone(state),result=applyTarotAction(state,{type:'use_tarot',instanceId:'tarot',targetCardIds:['8S']},{expectedRevision:state.revision,updatedAt:timestamp},{requireObserved:true});assert.ok(!result.ok);assert.equal(result.errors[0]!.code,'pending_rule');assert.deepEqual(state,before);
});
