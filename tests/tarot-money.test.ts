import assert from 'node:assert/strict';
import test from 'node:test';
import type {GameStateV02} from '../src/state/model.js';
import {createNewRun} from '../src/run/start.js';
import {applyTarotAction} from '../src/rules/tarot.js';
import {applyPackAction} from '../src/rules/pack-shop.js';
import {freshJokerInstance} from '../src/rules/shop.js';
import {compareArcanaChoices} from '../src/advisor/arcana-choices.js';
import {analysisBinding,CONFIRMED_STORAGE_KEY,createConfirmedStore} from '../src/storage/confirmed-store.js';
import {known,MemoryStorage,success} from './helpers.js';

const date='2026-10-18T22:00:00Z',unknown={status:'unknown',reason:'No observado.'} as const;
function fixture(id='c_hermit',money=16):GameStateV02{
 const s=success(createNewRun({runId:'money-tarot',updatedAt:date,deckId:'blue',profileConfirmed:true}));
 const state:GameStateV02={...s,phase:'shop',phaseData:{origin:known({ante:1,kind:'small'})}};
 state.observed.shop=known({shopId:'shop',cardOffers:[],voucherOffers:[],packOffers:[],ignoredOtherOffers:[]});state.observed.money=known(money);
 state.observed.jokerContext=known({tarotsUsed:known(7),consumables:known([{instanceId:'money',catalogId:id,kind:'tarot',edition:'base',sellValue:1}])});return state;
}
const use=(state:GameStateV02,options={})=>applyTarotAction(state,{type:'use_tarot',instanceId:'money',targetCardIds:[]},{expectedRevision:state.revision,updatedAt:date},options);
function sales(state:GameStateV02,values:number[]){state.observed.jokers=known(values.map((n,i)=>({...freshJokerInstance(i===0?'egg':'joker','owned:'+i),sellValue:known(n)})));}
function pack(mega=false):GameStateV02{
 const s=fixture();return {...s,phase:'open_pack',phaseData:{packId:known('pack'),returnTo:'shop',context:{offerId:'pack',shopId:'shop',catalogId:mega?'arcana-mega':'arcana-normal',paid:mega?8:4,remainingChoices:mega?2:1,contents:known([
  {entryId:'hermit',kind:'tarot',catalogId:'c_hermit'},{entryId:'temperance',kind:'tarot',catalogId:'c_temperance'},{entryId:'chariot',kind:'tarot',catalogId:'c_chariot'},
  ...(mega?[{entryId:'sun',kind:'tarot' as const,catalogId:'c_sun'},{entryId:'moon',kind:'tarot' as const,catalogId:'c_moon'}]:[])
 ]),selectedEntryIds:[],shopOrigin:known({ante:1,kind:'small'}),heldCardIds:unknown}}};
}
const choose=(state:GameStateV02,entryId:string)=>applyPackAction(state,{type:'choose_pack_item',entryId},{expectedRevision:state.revision,updatedAt:date});

// Literal oracles from L14 primary code; not values produced by this engine.
test('L14 Ermitaño: deuda/0/7/20/41 produce saldos -5/0/14/40/61',()=>{
 for(const [before,income,after]of [[-5,0,-5],[0,0,0],[7,7,14],[20,20,40],[41,20,61]]){
  const state=fixture('c_hermit',before),copy=structuredClone(state),result=success(use(state));
  assert.deepEqual(result.moneyChange,{catalogId:'c_hermit',before,income,after,sellValues:[]});assert.deepEqual(result.state.observed.money,known(after));assert.deepEqual(state,copy);
  assert.deepEqual(result.cardChanges,[]);assert.deepEqual(result.state.observed.deck,state.observed.deck);assert.deepEqual(result.state.observed.jokers,state.observed.jokers);
  assert.ok(result.state.observed.jokerContext?.status==='known');assert.deepEqual(result.state.observed.jokerContext.value.tarotsUsed,known(8));assert.deepEqual(result.state.observed.jokerContext.value.consumables,known([]));
 }
});
test('L14 Templanza usa ventas físicas2+8=10 sin vender y limita2+8+60 a50',()=>{
 for(const [values,income]of [[[],0],[[2,8],10],[[2,8,60],50]] as const){
  const s=fixture('c_temperance',7);sales(s,[...values]);const before=structuredClone(s),r=success(use(s));
  assert.equal(r.moneyChange!.income,income);assert.deepEqual(r.state.observed.money,known(7+income));assert.deepEqual(r.state.observed.jokers,s.observed.jokers);assert.deepEqual(s,before);
 }
});
test('Ermitaño no necesita mazo, mano, inventario Joker ni tamaño; Templanza sí necesita ventas',()=>{
 const s=fixture();s.observed.deck=unknown;s.observed.jokers=unknown;s.observed.resources.handSize=unknown;
 assert.equal(success(use(s)).moneyChange!.after,32);
 const t=fixture('c_temperance');t.observed.jokers=unknown;assert.equal(use(t).ok,false);
 t.observed.jokers=known([{...freshJokerInstance('joker','unknown-sale'),sellValue:unknown}]);
 assert.equal(use(t).ok,false);
});
test('Ambos requieren saldo conocido y rechazan objetivos sin cambiar la entrada',()=>{
 for(const id of ['c_hermit','c_temperance']){
  const s=fixture(id),copy=structuredClone(s),bad=applyTarotAction(s,{type:'use_tarot',instanceId:'money',targetCardIds:['2S']},{expectedRevision:s.revision,updatedAt:date});
  assert.ok(!bad.ok);assert.equal(bad.errors[0]!.code,'unexpected_targets');assert.deepEqual(s,copy);s.observed.money=unknown;assert.equal(use(s).ok,false);
 }
});
test('Templanza no exige ventas desconocidas si las conocidas ya alcanzan el tope50',()=>{
 const s=fixture('c_temperance',7);sales(s,[50,2]);assert.ok(s.observed.jokers.status==='known');s.observed.jokers.value[1]!.sellValue=unknown;
 const r=success(use(s));assert.equal(r.moneyChange!.income,50);assert.equal(r.moneyChange!.after,57);assert.match(r.limitations.join(' '),/desconocidos no se convierten en cero/);assert.deepEqual(s.observed.jokers.value[1]!.sellValue,unknown);
});
test('Tarot de dinero en ronda no depende de jefe o mano y conserva recursos',()=>{
 const base=fixture(),s:GameStateV02={...base,phase:'in_round',phaseData:{blind:unknown,handsRemaining:known(3),discardsRemaining:known(2),score:known(17),heldCardIds:unknown}};
 s.observed.deck=unknown;s.observed.nextBlind=unknown;const r=success(use(s));assert.deepEqual(r.state.phaseData,s.phaseData);assert.deepEqual(r.state.observed.resources,s.observed.resources);assert.equal(r.moneyChange!.after,32);
});
test('Historial desconocido queda desconocido y el modo estricto conserva su bloqueo',()=>{
 const s=fixture();assert.ok(s.observed.jokerContext?.status==='known');s.observed.jokerContext.value.tarotsUsed=unknown;
 const r=success(use(s));assert.ok(r.state.observed.jokerContext?.status==='known');assert.deepEqual(r.state.observed.jokerContext.value.tarotsUsed,unknown);assert.match(r.limitations.join(' '),/total previo de Tarot usados/);
 const strict=use(s,{requireObserved:true});assert.ok(!strict.ok);assert.equal(strict.errors[0]!.code,'pending_rule');
});
test('Desbordamiento y revisión antigua rechazan sin consumir el Tarot',()=>{
 const s=fixture('c_hermit',Number.MAX_SAFE_INTEGER),copy=structuredClone(s);const r=use(s);assert.ok(!r.ok);assert.equal(r.errors[0]!.code,'numeric_range');assert.deepEqual(s,copy);
 const stale=applyTarotAction(fixture(),{type:'use_tarot',instanceId:'money',targetCardIds:[]},{expectedRevision:99,updatedAt:date});assert.ok(!stale.ok);assert.equal(stale.errors[0]!.code,'stale_revision');
});
test('Arcana cobra del saldo posterior a apertura16→32, sin mano, mazo ni consumir inventario propio',()=>{
 const s=pack(),copy=structuredClone(s);s.observed.deck=unknown;s.observed.jokers=unknown;const stock=structuredClone(s.observed.jokerContext),r=success(choose(s,'hermit'));
 assert.equal(r.state.phase,'shop');assert.equal(r.moneyChange!.after,32);assert.deepEqual(r.cardChanges,[]);assert.ok(r.state.observed.jokerContext?.status==='known'&&stock?.status==='known');assert.deepEqual(r.state.observed.jokerContext.value.consumables,stock.value.consumables);assert.deepEqual(copy.observed.money,known(16));
});
test('Mega permite observar la mano inicialmente desconocida después de un Tarot de dinero',()=>{
 const s=pack(true);sales(s,[2,7]);const first=success(choose(s,'hermit')).state;assert.equal(first.phase,'open_pack');
 const hand=['2S','3S','4S','5S','6S','7S','8S','9S'];
 const observed=success(applyPackAction(first,{type:'observe_pack_hand',cardIds:hand},{expectedRevision:first.revision,updatedAt:date})).state;
 const second=success(choose(observed,'temperance'));assert.equal(second.state.phase,'shop');assert.equal(second.moneyChange!.before,32);assert.equal(second.moneyChange!.income,9);assert.equal(second.moneyChange!.after,41);
 assert.ok(second.state.observed.jokerContext?.status==='known');assert.deepEqual(second.state.observed.jokerContext.value.tarotsUsed,known(9));
});
test('Comparación conserva cálculos monetarios aunque falten objetivos de otro Tarot',()=>{
 const s=pack(),copy=structuredClone(s),r=success(compareArcanaChoices(s));assert.equal(r.recommendation.kind,'abstain');
 const hermit=r.options.find(o=>o.entryId==='hermit')!;assert.ok(hermit.projection.ok);assert.equal(hermit.projection.value.moneyChange!.after,32);assert.deepEqual(hermit.targetCardIds,[]);assert.deepEqual(s,copy);
});
test('T09b confirma, recarga, rechaza duplicado y deshace dinero e inventario juntos',()=>{
 const s=fixture(),memory=new MemoryStorage(),store=createConfirmedStore(()=>memory);success(store.initialize(s));const initial=memory.getItem(CONFIRMED_STORAGE_KEY);
 const request={confirmationId:'hermit-use',confirmed:true,expected:analysisBinding(s),updatedAt:date,action:{type:'use_tarot' as const,instanceId:'money',targetCardIds:[]}};
 const saved=success(store.confirm(request));assert.deepEqual(saved.state.observed.money,known(32));assert.equal(saved.history.length,1);assert.deepEqual(success(store.load()),saved);assert.equal(store.confirm(request).ok,false);
 const undone=success(store.undoLatest({confirmationId:'undo-hermit',confirmed:true,expected:analysisBinding(saved.state),updatedAt:date,targetEntryId:'hermit-use',reason:'No usé el Tarot.'}));assert.deepEqual(undone.state.observed.money,known(16));assert.deepEqual(undone.state.observed.jokerContext,s.observed.jokerContext);assert.notEqual(memory.getItem(CONFIRMED_STORAGE_KEY),initial);
});
test('Fallo de guardado de dinero conserva el documento previo recuperable',()=>{
 const s=fixture(),memory=new MemoryStorage(),store=createConfirmedStore(()=>memory);success(store.initialize(s));const before=memory.getItem(CONFIRMED_STORAGE_KEY);memory.failWrite=true;
 const r=store.confirm({confirmationId:'failed-hermit',confirmed:true,expected:analysisBinding(s),updatedAt:date,action:{type:'use_tarot',instanceId:'money',targetCardIds:[]}});assert.equal(r.ok,false);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),before);memory.failWrite=false;assert.deepEqual(success(store.load())!.state,s);
});
