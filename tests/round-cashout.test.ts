import assert from 'node:assert/strict';
import test from 'node:test';
import {createUnknownState} from '../src/state/model.js';
import type {GameStateV02,JokerInstance,Result} from '../src/state/model.js';
import {applyRunProgress} from '../src/run/progress.js';
import type {RecordCashoutCommand} from '../src/run/progress.js';
import {analysisBinding,CONFIRMED_STORAGE_KEY,createConfirmedStore,validateConfirmedRecord} from '../src/storage/confirmed-store.js';
import {known,MemoryStorage,success} from './helpers.js';

const time='2026-11-07T23:00:00Z';
const unknown={status:'unknown' as const,reason:'Sin observar.'};
const inventory={unchanged:true as const};
const joker=(instanceId:string,catalogId='green_joker',counters:JokerInstance['counters']={greenMult:known(7)}):JokerInstance=>({instanceId,catalogId,edition:known('base'),stickers:known([]),sellValue:known(2),counters});
function round(kind:'small'|'big'|'boss'='small',ante=1):GameStateV02{
  const state=createUnknownState('synthetic-observed-cashout',time);
  state.revision=7;
  state.observed.nextBlind=known({ante,kind,bossId:known(kind==='boss'?'the_window':'none'),target:known(300),reward:known(3)});
  state.observed.money=known(100);
  state.observed.jokers=known([joker('green-a'),joker('green-b')]);
  state.observed.deck=known({preset:'standard52-unmodified'});
  state.observed.handBases=known({preset:'all-standard-level1'});
  state.observed.outOfScope=known({vouchers:[],consumables:[],pendingTags:[],otherModifiers:[]});
  state.observed.resources={handsPerRound:known(4),discardsPerRound:known(3),handSize:known(8),jokerSlots:known(5)};
  state.observed.jokerContext=known({tags:known([]),handCounts:{pair:known(4)},roundHandCounts:{pair:known(2)},tarotsUsed:known(0),startingDeckSize:known(52),rerollCost:known(5)});
  return {...state,phase:'in_round',phaseData:{blind:known({ante,kind}),handsRemaining:unknown,discardsRemaining:unknown,score:unknown,heldCardIds:unknown}};
}
const command=(changes:Partial<RecordCashoutCommand>={}):RecordCashoutCommand=>({type:'record_cashout',money:28,amount:9,jokerUpdates:[],...changes});
const apply=(state:GameStateV02,request:RecordCashoutCommand=command())=>applyRunProgress(state,request,{expectedRevision:state.revision,updatedAt:time,inventory});
const code=(result:Result<unknown>)=>{assert.ok(!result.ok);return result.errors[0]!.code;};
const owned=(state:GameStateV02)=>{assert.equal(state.observed.jokers.status,'known');if(state.observed.jokers.status!=='known')throw Error('Falta inventario');return state.observed.jokers.value;};

test('cobro observado registra saldo absoluto, resultado y avance con una revisión, sin mutar entradas',()=>{
  const state=round(),request=command({money:-3,amount:40}),before=structuredClone(state),requestBefore=structuredClone(request);
  const result=success(apply(state,request)),next=result.state;
  assert.equal(next.phase,'shop');assert.equal(next.revision,8);
  assert.deepEqual(next.observed.money,known(-3));assert.deepEqual(next.observed.lastCleared,known({ante:1,kind:'small'}));
  assert.equal(next.observed.nextBlind.status,'known');if(next.observed.nextBlind.status==='known')assert.equal(next.observed.nextBlind.value.kind,'big');
  assert.equal(next.observed.shop.status,'unknown');
  assert.ok(result.trace.some(step=>step.ruleId==='run.observed.balance'&&step.values.money===-3&&step.values.amount===40));
  assert.deepEqual(state,before);assert.deepEqual(request,requestBefore);
});

test('cobro actualiza dos copias por instancia y conserva desconocidos los contadores no reintroducidos',()=>{
  const state=round();state.observed.jokers=known([joker('green-a'),joker('green-b'),joker('yorick','yorick',{x100:known(125),remaining:known(8)}),joker('red','red_card',{mult:known(6)})]);
  const next=success(apply(state,command({jokerUpdates:[
    {instanceId:'green-a',counters:{greenMult:known(12)}},
    {instanceId:'green-b',counters:{greenMult:known(24)}},
    {instanceId:'yorick',counters:{x100:known(150)}}
  ]}))).state;
  const [a,b,y,red]=owned(next);
  assert.deepEqual(a!.counters.greenMult,known(12));assert.deepEqual(b!.counters.greenMult,known(24));
  assert.deepEqual(y!.counters.x100,known(150));assert.equal(y!.counters.remaining!.status,'unknown');
  assert.deepEqual(red!.counters.mult,known(6));
  for(const key of ['deck','handBases','outOfScope','resources'] as const)assert.deepEqual(next.observed[key],state.observed[key]);
  assert.equal(next.observed.jokerContext?.status,'known');if(next.observed.jokerContext?.status==='known'){
    assert.equal(next.observed.jokerContext.value.tarotsUsed?.status,'unknown');
    assert.equal(next.observed.jokerContext.value.handCounts?.pair?.status,'unknown');
    assert.equal(next.observed.jokerContext.value.rerollCost?.status,'unknown');
    assert.deepEqual(next.observed.jokerContext.value.startingDeckSize,known(52));
  }
});

test('cobro admite valores vacíos desconocidos, venta observada de Egg/Gift y retirada declarada',()=>{
  const state=round();state.observed.jokers=known([joker('egg','egg',{}),joker('gift','gift',{}),joker('green'),joker('ice','ice_cream',{chips:known(5)})]);
  const next=success(apply(state,command({jokerUpdates:[
    {instanceId:'egg',counters:{},sellValue:known(11)},
    {instanceId:'green',counters:{greenMult:unknown},sellValue:known(7)},
    {instanceId:'ice',counters:{},removed:true}
  ]}))).state;
  const [egg,gift,green]=owned(next);assert.equal(owned(next).length,3);
  assert.deepEqual(egg!.sellValue,known(11));assert.equal(gift!.sellValue.status,'unknown');
  assert.deepEqual(green!.counters.greenMult,unknown);assert.deepEqual(green!.sellValue,known(7));
});

test('cobro acepta una fase cashout ya registrada sin repetir su resultado',()=>{
  const state=round();
  const reported=success(applyRunProgress(state,{type:'report_result',outcome:'won',score:400,handsUsed:2,discardsUsed:0},{expectedRevision:state.revision,updatedAt:time,inventory})).state;
  const next=success(apply(reported,command({jokerUpdates:[{instanceId:'green-a',counters:{greenMult:known(18)}}]}))).state;
  assert.equal(next.phase,'shop');assert.equal(next.revision,reported.revision+1);
  assert.deepEqual(next.recentRounds,reported.recentRounds);assert.deepEqual(next.observed.money,known(28));
  assert.deepEqual(owned(next)[0]!.counters.greenMult,known(18));assert.equal(owned(next)[1]!.counters.greenMult!.status,'unknown');
});

test('cobro del jefe de ante 8 finaliza y conserva saldo y cambios sin inventar tienda',()=>{
  const state=round('boss',8),next=success(apply(state,command({money:54,jokerUpdates:[{instanceId:'green-a',counters:{greenMult:known(30)}}]}))).state;
  assert.equal(next.phase,'finished');if(next.phase==='finished')assert.equal(next.phaseData.outcome,'won');
  assert.equal(next.revision,state.revision+1);assert.deepEqual(next.observed.money,known(54));
  assert.deepEqual(next.observed.lastCleared,known({ante:8,kind:'boss'}));
  assert.deepEqual(next.observed.nextBlind,state.observed.nextBlind);assert.equal(next.observed.shop.status,'unknown');
  assert.deepEqual(owned(next)[0]!.counters.greenMult,known(30));
  assert.equal(code(apply(state,command({nextBlind:{ante:8,kind:'small',bossId:known('none'),target:known(300),reward:known(3)}}))),'finished_run');
});

test('cobro rechaza fase incorrecta, revisión antigua, IDs inexistentes/duplicados y contadores inválidos',()=>{
  const state=round(),before=structuredClone(state);
  const shop:GameStateV02={...state,phase:'shop',phaseData:{origin:unknown}};
  assert.equal(code(apply(shop)),'wrong_phase');
  assert.equal(code(applyRunProgress(state,command(),{expectedRevision:state.revision-1,updatedAt:time,inventory})),'stale_revision');
  assert.equal(code(apply(state,command({jokerUpdates:[{instanceId:'absent',counters:{}}]}))),'unknown_reference');
  assert.equal(code(apply(state,command({jokerUpdates:[{instanceId:'green-a',counters:{}},{instanceId:'green-a',counters:{}}]}))),'duplicate_id');
  assert.equal(code(apply(state,command({jokerUpdates:[{instanceId:'green-a',counters:{greenMult:known(-1)}}]}))),'out_of_range');
  assert.equal(code(apply(state,command({jokerUpdates:[{instanceId:'green-a',counters:{other:known(4)}}]}))),'unsupported_counter');
  assert.ok(!apply(state,command({amount:-1})).ok);assert.ok(!apply(state,command({money:1.5})).ok);
  assert.deepEqual(state,before);
});

test('store guarda cobro, cambios e historial atómicamente y rechaza doble confirmación y reintentos obsoletos',()=>{
  const state=round(),memory=new MemoryStorage(),store=createConfirmedStore(()=>memory);success(store.initialize(state));
  const request={confirmationId:'cashout-once',confirmed:true,expected:analysisBinding(state),updatedAt:time,command:command({jokerUpdates:[{instanceId:'green-a',counters:{greenMult:known(16)}}]}),inventory};
  const writes=memory.writes,saved=success(store.progress(request));
  assert.equal(memory.writes,writes+1);assert.equal(saved.history.length,1);assert.equal(saved.state.revision,state.revision+1);
  assert.equal(saved.history[0]!.kind,'progress');assert.deepEqual(saved.history[0]!.before,state);
  const entry=saved.history[0]!;assert.ok('progress' in entry);assert.deepEqual(entry.progress?.command,request.command);
  assert.deepEqual(success(validateConfirmedRecord(saved)),saved);
  assert.deepEqual(success(createConfirmedStore(()=>memory).load()),saved);
  const raw=memory.getItem(CONFIRMED_STORAGE_KEY);
  assert.equal(code(store.progress(request)),'duplicate_confirmation');
  assert.equal(code(store.progress({...request,confirmationId:'cashout-old'})),'stale_revision');
  assert.equal(code(store.progress({...request,confirmationId:'cashout-twice',expected:analysisBinding(saved.state)})),'wrong_phase');
  assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);assert.equal(memory.writes,writes+1);
});

test('fallo de almacenamiento conserva fase, saldo, contadores e historial y permite reintentar el cobro',()=>{
  const state=round(),memory=new MemoryStorage(),store=createConfirmedStore(()=>memory);success(store.initialize(state));
  const request={confirmationId:'cashout-retry',confirmed:true,expected:analysisBinding(state),updatedAt:time,command:command({jokerUpdates:[{instanceId:'green-a',counters:{greenMult:known(16)}}]}),inventory};
  const raw=memory.getItem(CONFIRMED_STORAGE_KEY);memory.failWrite=true;
  assert.equal(code(store.progress(request)),'storage_write');assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);
  memory.failWrite=false;assert.deepEqual(success(store.load())?.state,state);
  const saved=success(store.progress(request));assert.equal(saved.history.length,1);assert.equal(saved.state.revision,state.revision+1);
});
