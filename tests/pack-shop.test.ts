import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import type {GameStateV01,GameStateV02} from '../src/state/model.js';
import type {PackAction,PackEntry} from '../src/state/pack-contract.js';
import {applyPackAction} from '../src/rules/pack-shop.js';
import {freshJokerInstance} from '../src/rules/shop.js';
import {applyGameEvent} from '../src/rules/full-events.js';
import {known,success} from './helpers.js';

const timestamp='2026-10-17T17:00:00Z',missing={status:'unknown',reason:'No observado.'} as const;
function fixture(catalogId='buffoon-normal',price=4):GameStateV02{
 const legacy=JSON.parse(readFileSync('examples/shop-purchase.json','utf8')) as GameStateV01;
 const state:GameStateV02={...legacy,schemaVersion:'0.2',phase:'shop',phaseData:{origin:known({ante:1,kind:'small'})}};
 state.observed.money=known(20);state.observed.jokers=known([]);
 state.observed.jokerContext=known({tags:known([]),consumables:known([]),consumableSlots:known(2),planetsUsed:known([]),freeRerolls:known(0)});
 if(state.observed.shop.status==='known')state.observed.shop.value.packOffers=[{offerId:'pack',catalogId,price:known(price)},{offerId:'keep',catalogId:'celestial-normal',price:known(4)}];
 return state;
}
function fact<T>(f:{status:'known';value:T}|{status:'unknown';reason:string}):T{assert.equal(f.status,'known');if(f.status!=='known')throw new Error('unknown');return f.value;}
function act(state:GameStateV02,action:PackAction){return applyPackAction(state,action,{expectedRevision:state.revision,updatedAt:timestamp});}
function changed(state:GameStateV02,action:PackAction):GameStateV02{return success(act(state,action)).state;}
function buy(state:GameStateV02){return changed(state,{type:'buy_pack',offerId:'pack'});}
function buffoon(catalogId='joker',id='one',edition='base'):PackEntry{return {entryId:id,kind:'joker',joker:freshJokerInstance(catalogId,'instance:'+id,edition)};}
const planets:PackEntry[]=[{entryId:'p1',kind:'planet',catalogId:'c_mercury'},{entryId:'p2',kind:'planet',catalogId:'c_jupiter'},{entryId:'p3',kind:'planet',catalogId:'c_pluto'}];
function observed(state:GameStateV02,contents:PackEntry[]=[buffoon(),buffoon('half_joker','two')]){return changed(buy(state),{type:'observe_pack',contents});}
function rejection(state:GameStateV02,action:PackAction,code:string){const before=structuredClone(state),result=act(state,action);assert.ok(!result.ok,JSON.stringify(result));assert.equal(result.errors[0]!.code,code);assert.deepEqual(state,before);}
function context(state:GameStateV02){assert.equal(state.phase,'open_pack');if(state.phase!=='open_pack'||!state.phaseData.context)throw new Error('not open');return state.phaseData.context;}
function add(state:GameStateV02,...ids:string[]){state.observed.jokers=known(ids.map((id,i)=>freshJokerInstance(id,'owned:'+i)));}

// Literal expected prices, counts and hand progression come from the recorded Lua evidence,
// not from BOOSTER_CATALOG or the functions under test. These are not gameplay observations.
test('Seis sobres pagan 4/6/8, abren sin inventar cartas y conservan la tienda original',()=>{
 for(const [catalogId,price,remaining] of [['buffoon-normal',4,1],['buffoon-jumbo',6,1],['buffoon-mega',8,2],['celestial-normal',4,1],['celestial-jumbo',6,1],['celestial-mega',8,2]] as const){
  const state=fixture(catalogId,price),original=structuredClone(state),result=act(state,{type:'buy_pack',offerId:'pack'}),after=success(result).state;
  assert.deepEqual(state,original);assert.equal(fact(after.observed.money),20-price);assert.equal(after.revision,state.revision+1);assert.equal(after.updatedAt,timestamp);
  assert.equal(context(after).remainingChoices,remaining);assert.equal(context(after).contents.status,'unknown');assert.equal(context(after).paid,price);assert.equal(fact(after.phase==='open_pack'?after.phaseData.packId:missing),'pack');
  assert.deepEqual(fact(after.observed.shop).packOffers?.map(o=>o.offerId),['keep']);assert.deepEqual(after.observed.jokers,state.observed.jokers);assert.deepEqual(context(after).shopOrigin,known({ante:1,kind:'small'}));
  assert.ok(result.ok&&result.projected);assert.ok(result.evidence.limitations.some(e=>e.status==='provisional'));
 }
});
test('Dinero insuficiente, precio distinto y ofertas ajenas rechazan sin modificar entrada',()=>{
 const poor=fixture();poor.observed.money=known(3);rejection(poor,{type:'buy_pack',offerId:'pack'},'insufficient_money');
 rejection(fixture('buffoon-normal',3),{type:'buy_pack',offerId:'pack'},'unsupported_price');
 rejection(fixture('arcana-normal'),{type:'buy_pack',offerId:'pack'},'unsupported_pack');rejection(fixture(),{type:'buy_pack',offerId:'absent'},'missing_offer');
});
test('Crédito físico permite saldo -20, pero Blueprint no concede crédito',()=>{
 const state=fixture();add(state,'credit_card');state.observed.money=known(-16);assert.equal(fact(buy(state).observed.money),-20);
 state.observed.money=known(-17);rejection(state,{type:'buy_pack',offerId:'pack'},'insufficient_money');
 add(state,'blueprint');state.observed.money=known(0);rejection(state,{type:'buy_pack',offerId:'pack'},'insufficient_money');
});
test('Abrir con cinco comodines es legal; elegir requiere hueco y vender dentro del sobre lo libera',()=>{
 const state=fixture();state.observed.jokers=known(Array.from({length:5},(_,i)=>freshJokerInstance('joker','owned:'+i)));
 const open=observed(state);rejection(open,{type:'choose_pack_item',entryId:'one'},'no_slots');
 const sold=changed(open,{type:'sell_pack_joker',instanceId:'owned:0'});assert.equal(sold.phase,'open_pack');assert.equal(fact(sold.observed.money),17);assert.equal(context(sold).remainingChoices,1);
 const after=changed(sold,{type:'choose_pack_item',entryId:'one'});assert.equal(after.phase,'shop');assert.equal(fact(after.observed.jokers).length,5);assert.equal(fact(after.observed.money),17);
});
test('Observar exige todas las entradas, no cobra ni dispara hooks y no acepta tipos falsos',()=>{
 const open=buy(fixture()),before=structuredClone(open);rejection(open,{type:'observe_pack',contents:[buffoon()]},'incomplete_pack_contents');
 rejection(open,{type:'observe_pack',contents:[planets[0]!,planets[1]!]},'incompatible_pack_item');
 const after=changed(open,{type:'observe_pack',contents:[buffoon(),buffoon('half_joker','two')]});assert.deepEqual(open,before);assert.equal(fact(after.observed.money),16);assert.deepEqual(after.observed.jokers,open.observed.jokers);assert.equal(after.revision,open.revision+1);
});
test('Elección Buffoon conserva instancia observada y actualiza recursos; Negative no consume hueco normal',()=>{
 const state=fixture(),after=changed(observed(state,[buffoon('juggler'),buffoon('joker','two')]),{type:'choose_pack_item',entryId:'one'});
 assert.equal(after.phase,'shop');assert.equal(fact(after.observed.resources.handSize),9);assert.deepEqual(fact(after.observed.jokers)[0],freshJokerInstance('juggler','instance:one'));assert.equal(fact(after.observed.money),16);
 const full=fixture();full.observed.jokers=known(Array.from({length:5},(_,i)=>freshJokerInstance('joker','owned:'+i)));
 const negative=changed(observed(full,[buffoon('joker','one','negative'),buffoon('half_joker','two')]),{type:'choose_pack_item',entryId:'one'});
 assert.equal(fact(negative.observed.jokers).length,6);assert.equal(fact(negative.observed.resources.jokerSlots),6);
});
test('Mega permite dos elecciones únicas; elegir una y omitir resto conserva carta y suma Red Card solo una vez',()=>{
 const state=fixture('buffoon-mega',8);add(state,'red_card');const entries=[buffoon(),buffoon('half_joker','two'),buffoon('scholar','three'),buffoon('banner','four')];
 const open=changed(buy(state),{type:'observe_pack',contents:entries}),first=changed(open,{type:'choose_pack_item',entryId:'one'});
 assert.equal(context(first).remainingChoices,1);assert.equal(fact(first.observed.jokers).length,2);rejection(first,{type:'choose_pack_item',entryId:'one'},'already_selected');rejection(first,{type:'observe_pack',contents:entries},'pack_already_selected');
 const skipped=changed(first,{type:'skip_open_pack'});assert.equal(skipped.phase,'shop');assert.equal(fact(fact(skipped.observed.jokers)[0]!.counters.mult!),3);assert.equal(fact(skipped.observed.jokers).length,2);assert.equal(fact(skipped.observed.money),12);
 assert.deepEqual(skipped.phaseData,{origin:known({ante:1,kind:'small'})});rejection(skipped,{type:'skip_open_pack'},'wrong_phase');
 const second=changed(first,{type:'choose_pack_item',entryId:'two'});assert.equal(second.phase,'shop');assert.equal(fact(second.observed.jokers).length,3);assert.equal(fact(fact(second.observed.jokers)[0]!.counters.mult!),0);
});
test('Celestial usa Planet directamente con consumibles llenos: Pair25×3, Constellation110 e ingreso inmediato0',()=>{
 const state=fixture('celestial-normal');add(state,'constellation','satellite');
 if(state.observed.jokerContext?.status==='known')state.observed.jokerContext.value.consumables=known([{instanceId:'t1',catalogId:'c_fool',kind:'tarot',edition:'base',sellValue:1},{instanceId:'t2',catalogId:'c_emperor',kind:'tarot',edition:'base',sellValue:1}]);
 const open=observed(state,planets),before=structuredClone(open),after=changed(open,{type:'choose_pack_item',entryId:'p1'});
 const bases=fact(after.observed.handBases);assert.ok('values'in bases);assert.deepEqual(fact(bases.values.pair),{level:2,chips:25,mult:3});assert.equal(fact(fact(after.observed.jokers)[0]!.counters.x100!),110);
 assert.deepEqual(fact(fact(after.observed.jokerContext!).planetsUsed!),['c_mercury']);assert.equal(fact(after.observed.money),16);assert.deepEqual(fact(after.observed.jokerContext!).consumables,fact(before.observed.jokerContext!).consumables);assert.deepEqual(open,before);
});
test('Dos Mercury observados mejoran dos niveles y el historial de planetas únicos no se duplica',()=>{
 const state=fixture('celestial-mega',8),entries=[{entryId:'p1',kind:'planet',catalogId:'c_mercury'},{entryId:'p2',kind:'planet',catalogId:'c_mercury'},...planets.map((p,i)=>({...p,entryId:'other:'+i}))] as PackEntry[];
 const first=changed(observed(state,entries),{type:'choose_pack_item',entryId:'p1'}),after=changed(first,{type:'choose_pack_item',entryId:'p2'}),bases=fact(after.observed.handBases);assert.ok('values'in bases);assert.deepEqual(fact(bases.values.pair),{level:3,chips:40,mult:4});assert.deepEqual(fact(fact(after.observed.jokerContext!).planetsUsed!),['c_mercury']);
});
test('Planet comparte efecto con use_consumable sin inventar una plaza o instancia en el inventario',()=>{
 const state=fixture('celestial-normal'),fromPack=changed(observed(state,planets),{type:'choose_pack_item',entryId:'p1'}),consumable=fixture();
 if(consumable.observed.jokerContext?.status==='known')consumable.observed.jokerContext.value.consumables=known([{instanceId:'p',catalogId:'c_mercury',kind:'planet',edition:'base',sellValue:1}]);
 const other=success(applyGameEvent(consumable,{type:'use_consumable',instanceId:'p'},{expectedRevision:consumable.revision,updatedAt:timestamp})).state;
 assert.deepEqual(fromPack.observed.handBases,other.observed.handBases);assert.deepEqual(fact(fromPack.observed.jokerContext!).planetsUsed,fact(other.observed.jokerContext!).planetsUsed);
});
test('Historial desconocido limita únicamente elegir Planet, no abrir ni omitir el sobre',()=>{
 const state=fixture('celestial-normal');if(state.observed.jokerContext?.status==='known')state.observed.jokerContext.value.planetsUsed=missing;
 const open=observed(state,planets);rejection(open,{type:'choose_pack_item',entryId:'p1'},'unknown_data');assert.equal(changed(open,{type:'skip_open_pack'}).phase,'shop');
});
test('Black Hole observado no compatible puede conservarse y omitirse sin ejecutar un efecto falso',()=>{
 const open=observed(fixture('celestial-normal'),[{entryId:'hole',kind:'unsupported',catalogId:'c_black_hole'},planets[0]!,planets[1]!]);rejection(open,{type:'choose_pack_item',entryId:'hole'},'unsupported_pack_item');assert.equal(changed(open,{type:'skip_open_pack'}).phase,'shop');
});
test('Fresh Joker rechaza crecimiento previo, Legendary, pegatinas y valores de venta ajenos',()=>{
 const grown=buffoon('constellation');if(grown.kind==='joker')grown.joker.counters.x100=known(200);rejection(observed(fixture(),[grown,buffoon('joker','two')]),{type:'choose_pack_item',entryId:'one'},'nonfresh_joker');
 const eternal=buffoon();if(eternal.kind==='joker')eternal.joker.stickers=known(['eternal']);rejection(observed(fixture(),[eternal,buffoon('joker','two')]),{type:'choose_pack_item',entryId:'one'},'unsupported_modifier');
 const legendary=buffoon('caino');rejection(observed(fixture(),[legendary,buffoon('joker','two')]),{type:'choose_pack_item',entryId:'one'},'unsupported_pack_item');
 const price=buffoon();if(price.kind==='joker')price.joker.sellValue=known(8);rejection(observed(fixture(),[price,buffoon('joker','two')]),{type:'choose_pack_item',entryId:'one'},'unsupported_price');
});
test('Fresh Joker deja objetivos no registrados desconocidos y Chaos añade su reroll sin reiniciar usos',()=>{
 const target=changed(observed(fixture(),[buffoon('mail'),buffoon('joker','two')]),{type:'choose_pack_item',entryId:'one'});assert.ok(Object.values(fact(target.observed.jokers)[0]!.counters).some(f=>f.status==='unknown'));
 const chaos=changed(observed(fixture(),[buffoon('chaos'),buffoon('joker','two')]),{type:'choose_pack_item',entryId:'one'});assert.equal(fact(fact(chaos.observed.jokerContext!).freeRerolls!),1);
});
test('Astronomer solo físico hace Celestial gratis y la adquisición/venta actualiza ofertas existentes',()=>{
 const state=fixture('celestial-jumbo',0);add(state,'astronomer');assert.equal(fact(buy(state).observed.money),20);
 const absent=fixture('celestial-normal',0);rejection(absent,{type:'buy_pack',offerId:'pack'},'unsupported_price');
 const acquired=changed(observed(fixture(),[buffoon('astronomer'),buffoon('joker','two')]),{type:'choose_pack_item',entryId:'one'});assert.equal(fact(fact(acquired.observed.shop).packOffers![0]!.price),0);
 const next=buy({...acquired,observed:{...acquired.observed,shop:known({...fact(acquired.observed.shop),packOffers:[{offerId:'pack',catalogId:'celestial-mega',price:known(0)}]})}});
 const sold=changed(next,{type:'sell_pack_joker',instanceId:'instance:one'});assert.equal(sold.phase,'open_pack');
});
test('Hallucination requiere rama observada; Oops hace el éxito seguro y abrir lo aplica una vez',()=>{
 const state=fixture();add(state,'hallucination');rejection(state,{type:'buy_pack',offerId:'pack'},'needs_outcome');
 const failure=changed(state,{type:'buy_pack',offerId:'pack',choices:[{key:'owned:0:hallucination_trigger',kind:'boolean',value:false,knowledge:'known',basis:'No generó Tarot en el juego.'}]});assert.equal(fact(fact(failure.observed.jokerContext!).consumables!).length,0);
 add(state,'hallucination','oops');const open=changed(state,{type:'buy_pack',offerId:'pack',choices:[{key:'owned:0:hallucination',kind:'consumable',value:{instanceId:'generated',catalogId:'c_fool',kind:'tarot',edition:'base',sellValue:1},knowledge:'known',basis:'Tarot observado.'}]}),seen=changed(open,{type:'observe_pack',contents:[buffoon(),buffoon('joker','two')]});assert.equal(fact(fact(seen.observed.jokerContext!).consumables!).length,1);
});
test('No aplica recomendaciones de revisiones anteriores ni abre un segundo sobre antes de cerrar',()=>{
 const state=fixture(),r=applyPackAction(state,{type:'buy_pack',offerId:'pack'},{expectedRevision:99,updatedAt:timestamp});assert.ok(!r.ok);assert.equal(r.errors[0]!.code,'stale_revision');rejection(buy(state),{type:'buy_pack',offerId:'keep'},'wrong_phase');
});
test('Fases antiguas sin contexto y formato0.1 se conservan sin fabricar una apertura',()=>{
 const legacy=JSON.parse(readFileSync('examples/shop-purchase.json','utf8')) as GameStateV01,r=applyPackAction(legacy,{type:'buy_pack',offerId:'pack'},{expectedRevision:legacy.revision,updatedAt:timestamp});assert.ok(!r.ok);assert.equal(r.errors[0]!.code,'unsupported_schema');
 const state={...fixture(),phase:'open_pack' as const,phaseData:{packId:known('old'),returnTo:'shop' as const}};rejection(state,{type:'skip_open_pack'},'missing_pack_context');
});
test('Modo estricto mantiene abstención provisional y no modifica el estado',()=>{
 const state=fixture(),before=structuredClone(state),r=applyPackAction(state,{type:'buy_pack',offerId:'pack'},{expectedRevision:state.revision,updatedAt:timestamp},{requireObserved:true});assert.ok(!r.ok);assert.equal(r.errors[0]!.code,'pending_rule');assert.deepEqual(state,before);
});

test('Vender el último Astronomer restaura precios de sobres visibles; conservar una copia mantiene cero',()=>{
 const state=fixture('buffoon-mega',8);add(state,'astronomer','astronomer');
 if(state.observed.shop.status==='known')state.observed.shop.value.packOffers=[{offerId:'pack',catalogId:'buffoon-mega',price:known(8)},{offerId:'normal',catalogId:'celestial-normal',price:known(0)},{offerId:'jumbo',catalogId:'celestial-jumbo',price:known(0)},{offerId:'mega',catalogId:'celestial-mega',price:known(0)}];
 const open=buy(state),first=changed(open,{type:'sell_pack_joker',instanceId:'owned:0'});assert.deepEqual(fact(first.observed.shop).packOffers!.map(o=>fact(o.price)),[0,0,0]);
 const last=changed(first,{type:'sell_pack_joker',instanceId:'owned:1'});assert.deepEqual(fact(last.observed.shop).packOffers!.map(o=>fact(o.price)),[4,6,8]);assert.equal(last.phase,'open_pack');assert.equal(context(last).remainingChoices,2);
});

test('Contexto importado con la oferta abierta aún disponible se rechaza sin corregirlo silenciosamente',()=>{
 const crafted=buy(fixture());
 if(crafted.observed.shop.status==='known')crafted.observed.shop.value.packOffers!.push({offerId:'pack',catalogId:'buffoon-normal',price:known(4)});
 rejection(crafted,{type:'skip_open_pack'},'incompatible_pack_context');
});
