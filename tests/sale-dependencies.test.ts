import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import type {GameState,JokerInstance} from '../src/state/model.js';
import {parseState} from '../src/state/validation.js';
import {applyShopAction} from '../src/rules/shop.js';
import {historyEvent} from '../src/rules/history-jokers.js';
import type {FullEventInput} from '../src/rules/full-joker-contract.js';
import {known,success} from './helpers.js';

const unknown=()=>({status:'unknown',reason:'No se ha transcrito todavía.'} as const);
const joker=(id:string,catalogId='joker',sellValue=1):JokerInstance=>({instanceId:id,catalogId,edition:known('base'),stickers:known([]),sellValue:known(sellValue),counters:{}});
function fixture():GameState {
 const state=success(parseState(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8')));
 state.observed.money=known(7);state.observed.jokers=known([joker('sold'),joker('kept','half_joker',2)]);
 return state;
}
const mutation=(state:GameState)=>({expectedRevision:state.revision,updatedAt:'2026-10-13T12:00:00Z'});
const event=(state:GameState,stage:FullEventInput['stage']):FullEventInput=>({state,stage,cards:[],trace:[],use:()=>{}});

test('SDEP01: vender Joker conserva ciega y tienda desconocidas; saldo literal7→8, hueco libre y entrada inmutable',()=>{
 // Shop rule: Joker base sale value $1. No blind event or shop offer is used.
 const state=fixture();state.observed.nextBlind=unknown();state.observed.shop=unknown();const before=structuredClone(state);
 const result=applyShopAction(state,{type:'sell',instanceId:'sold'},mutation(state));assert.ok(result.ok,JSON.stringify(result));
 assert.deepEqual(result.value.state.observed.money,known(8));
 assert.deepEqual(result.value.state.observed.jokers,known([joker('kept','half_joker',2)]));
 assert.equal(result.value.occupiedSlots,1);assert.equal(result.value.freeSlots,4);
 assert.equal(result.value.state.revision,state.revision+1);assert.equal(result.value.steps.length,1);
 assert.deepEqual(result.value.state.observed.nextBlind,before.observed.nextBlind);
 assert.deepEqual(result.value.state.observed.shop,before.observed.shop);assert.deepEqual(state,before);
 assert.ok(!result.evidence.limitations.some(r=>r.ruleId==='jokers.history'));
});

test('SDEP02: vender no exige ofertas; comprar con tienda desconocida sí conserva su error y no modifica entrada',()=>{
 const state=fixture();state.observed.shop=unknown();const before=structuredClone(state);
 const sold=applyShopAction(state,{type:'sell',instanceId:'sold'},mutation(state));assert.ok(sold.ok);assert.deepEqual(sold.value.state.observed.money,known(8));
 const bought=applyShopAction(state,{type:'buy',offerId:'o1',instanceId:'new'},mutation(state));assert.ok(!bought.ok);
 assert.equal(bought.errors[0]!.code,'unknown_data');assert.equal(bought.errors[0]!.path,'$.observed.shop');assert.deepEqual(state,before);
});

test('SDEP03: Luchador vendido en tienda no requiere la siguiente ciega ni inventa su desactivación',()=>{
 const state=fixture();state.observed.jokers=known([joker('sold','luchador',2)]);state.observed.nextBlind=unknown();state.observed.shop=unknown();const before=structuredClone(state);
 const result=applyShopAction(state,{type:'sell',instanceId:'sold'},mutation(state));assert.ok(result.ok,JSON.stringify(result));
 assert.deepEqual(result.value.state.observed.money,known(9));assert.deepEqual(result.value.state.observed.jokers,known([]));
 assert.equal(result.value.freeSlots,5);assert.deepEqual(result.value.state.observed.nextBlind,unknown());
 assert.equal(result.value.state.observed.jokerContext?.status==='known'?result.value.state.observed.jokerContext.value.bossDisabled:undefined,undefined);
 assert.deepEqual(state,before);
});

test('SDEP04: Luchador vendido con ciega activa requiere identificarla; fallo conserva dinero e inventario',()=>{
 const state=fixture();state.observed.jokers=known([joker('sold','luchador',2)]);state.observed.nextBlind=unknown();state.observed.shop=unknown();const before=structuredClone(state);
 const result=applyShopAction(state,{type:'sell',instanceId:'sold'},mutation(state),{activeBlind:true});assert.ok(!result.ok);
 assert.equal(result.errors[0]!.code,'unknown_data');assert.equal(result.errors[0]!.path,'$.observed.nextBlind');assert.deepEqual(state,before);
});

test('SDEP05: Luchador ante un jefe activo conocido sigue desactivándolo y paga solo su venta',()=>{
 const state=fixture();state.observed.jokers=known([joker('sold','luchador',2)]);state.observed.shop=unknown();
 state.observed.nextBlind=known({ante:1,kind:'boss',bossId:known('the_wall'),target:known(1200),reward:known(5)});
 const before=structuredClone(state),result=applyShopAction(state,{type:'sell',instanceId:'sold'},mutation(state),{activeBlind:true});assert.ok(result.ok,JSON.stringify(result));
 assert.deepEqual(result.value.state.observed.money,known(9));assert.deepEqual(result.value.state.observed.nextBlind,before.observed.nextBlind);
 assert.equal(result.value.state.observed.jokerContext?.status==='known'&&result.value.state.observed.jokerContext.value.bossDisabled?.status==='known'?result.value.state.observed.jokerContext.value.bossDisabled.value:false,true);
 assert.deepEqual(state,before);
});

test('SDEP06: seleccionar ciega con Chicot y cobrar Rocket mantienen su dependencia de la ciega',()=>{
 const state=fixture();state.observed.nextBlind=unknown();state.observed.jokers=known([joker('chicot','chicot',10)]);
 assert.throws(()=>historyEvent(event(state,'select_blind')),/Falta dato/);
 state.observed.jokers=known([{...joker('rocket','rocket',3),counters:{dollars:known(1)}}]);
 assert.throws(()=>historyEvent({...event(state,'end_round'),won:true}),/Falta dato/);
});

test('SDEP07: Turtle Bean sin Rocket puede agotar duración sin necesitar la ciega siguiente',()=>{
 const state=fixture();state.observed.nextBlind=unknown();state.observed.jokers=known([{...joker('bean','turtle_bean',3),counters:{hSize:known(2)}}]);state.observed.resources.handSize=known(10);
 historyEvent({...event(state,'end_round'),won:false});
 assert.deepEqual(state.observed.resources.handSize,known(9));
 assert.deepEqual(state.observed.jokers.status==='known'?state.observed.jokers.value[0]!.counters.hSize:undefined,known(1));
 assert.deepEqual(state.observed.nextBlind,unknown());
});
