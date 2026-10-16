import assert from 'node:assert/strict';
import test from 'node:test';
import {observationNeeds,observationPatch} from '../src/state/observations.js';
import {migrateState} from '../src/state/migration.js';
import {applyRunProgress} from '../src/run/progress.js';
import {createConfirmedStore,analysisBinding,CONFIRMED_STORAGE_KEY,validateConfirmedRecord} from '../src/storage/confirmed-store.js';
import {known,s01,success,MemoryStorage} from './helpers.js';
const unknown={status:'unknown' as const,reason:'Valor final no anotado.'};
function fixture(){const state=success(migrateState(s01()));state.observed.jokers=known([
 {instanceId:'green-a',catalogId:'green_joker',edition:known('base'),stickers:known([]),sellValue:known(2),counters:{greenMult:unknown}},
 {instanceId:'green-b',catalogId:'green_joker',edition:known('base'),stickers:known([]),sellValue:known(2),counters:{greenMult:known(9)}}]);return state;}
test('OBS01a pide solo datos pendientes del inventario actual; las copias del mismo comodín son distintas',()=>{
 const state=fixture(),before=structuredClone(state),needs=success(observationNeeds(state));
 assert.equal(needs.length,1);assert.deepEqual(needs[0]!.target,{kind:'counter',instanceId:'green-a',key:'greenMult'});
 assert.equal(needs[0]!.min,0);assert.ok(needs[0]!.affects.includes('valoración contextual'));assert.deepEqual(state,before);
});
test('OBS01a registrar Mult7 conserva todo salvo ese hecho, incluido otro Green9',()=>{
 const state=fixture(),before=structuredClone(state),need=success(observationNeeds(state))[0]!;
 const patch=success(observationPatch(state,[{needId:need.id,value:7}],state.revision));
 const expected=structuredClone(state.observed.jokers);assert.equal(expected.status,'known');if(expected.status==='known')expected.value[0]!.counters.greenMult=known(7);
 assert.deepEqual(patch,{jokers:expected});assert.deepEqual(state,before);
 assert.equal(success(observationNeeds({...state,observed:{...state.observed,...patch}})).length,0);
});
test('OBS01a cero es una observación válida y no se usa al dejar un campo vacío',()=>{
 const state=fixture(),need=success(observationNeeds(state))[0]!;const patch=success(observationPatch(state,[{needId:need.id,value:0}],0));
 assert.equal(patch.jokers?.status,'known');if(patch.jokers?.status==='known')assert.deepEqual(patch.jokers.value[0]!.counters.greenMult,known(0));
 assert.equal(observationPatch(state,[],0).ok,false);assert.deepEqual(state.observed.jokers.status==='known'&&state.observed.jokers.value[0]!.counters.greenMult,unknown);
});
test('OBS01a errores claros ante revisión antigua, negativos, fracciones, solicitudes ajenas/duplicadas y proyecciones',()=>{
 const state=fixture(),need=success(observationNeeds(state))[0]!,before=structuredClone(state);
 for(const answers of [[{needId:need.id,value:-1}],[{needId:need.id,value:1.5}],[{needId:'not-owned',value:3}],[{needId:need.id,value:2},{needId:need.id,value:3}],[{needId:need.id,value:2,projectedState:state}]])assert.equal(observationPatch(state,answers,0).ok,false);
 const stale=observationPatch(state,[{needId:need.id,value:7}],8);assert.equal(stale.ok,false);if(!stale.ok)assert.equal(stale.errors[0]!.code,'stale_revision');assert.deepEqual(state,before);
});
test('OBS01a venta desconocida solo se pregunta en tienda; recursos se preguntan por campo y conservan los demás',()=>{
 const state=fixture();if(state.observed.jokers.status==='known')state.observed.jokers.value[0]!.sellValue=unknown;
 state.observed.resources.handSize=unknown;const needs=success(observationNeeds(state));
 const resource=needs.find(n=>n.target.kind==='resource')!,sale=needs.find(n=>n.target.kind==='sell')!;
 assert.deepEqual(sale.affects,['venta','reemplazo']);const patch=success(observationPatch(state,[{needId:resource.id,value:9}],0));
 assert.deepEqual(patch.resources,{...state.observed.resources,handSize:known(9)});assert.equal(patch.jokers,undefined);
 const round={...state,phase:'in_round',phaseData:{blind:unknown,handsRemaining:unknown,discardsRemaining:unknown,score:unknown,heldCardIds:unknown}};
 assert.ok(success(observationNeeds(round)).every(n=>n.target.kind==='counter'));
});
test('OBS01a límites del catálogo se reutilizan (Seltzer1..10); no se crean preguntas de los otros149 comodines',()=>{
 const state=fixture();state.observed.jokers=known([{instanceId:'s',catalogId:'selzer',edition:known('base'),stickers:known([]),sellValue:known(3),counters:{hands:unknown}}]);
 const needs=success(observationNeeds(state));assert.equal(needs.length,1);const need=needs[0]!;assert.equal(need.min,1);assert.equal(need.max,10);
 assert.equal(observationPatch(state,[{needId:need.id,value:11}],0).ok,false);
 state.observed.jokers=known([]);assert.equal(success(observationNeeds(state)).length,0);
});
test('OBS01a grupos cambiados: solo mazo pendiente, conserva vales, inventario, niveles y recursos',()=>{
 const state=fixture(),before=structuredClone(state);const result=success(applyRunProgress(state,{type:'leave_shop'},{expectedRevision:0,updatedAt:'2026-10-16T12:00:00Z',inventory:{reconcile:{changedGroups:['deck']}}}));
 assert.equal(result.state.observed.deck.status,'unknown');for(const key of ['jokers','resources','handBases','outOfScope']as const)assert.deepEqual(result.state.observed[key],state.observed[key]);assert.deepEqual(state,before);
});
test('OBS01a grupos vacíos/repetidos/desconocidos no registran un avance',()=>{
 const state=fixture();for(const changedGroups of [[],['deck','deck'],['hypothetical']])assert.equal(applyRunProgress(state,{type:'leave_shop'},{expectedRevision:0,updatedAt:'2026-10-16T12:00:00Z',inventory:{reconcile:{changedGroups}} as never}).ok,false);
});
test('OBS01a resolver un dato se guarda con T09b, revisión, historia y deshacer sin desincronizar cuota',()=>{
 const state=fixture(),memory=new MemoryStorage(),store=createConfirmedStore(()=>memory);success(store.initialize(state));
 const need=success(observationNeeds(state))[0]!,patch=success(observationPatch(state,[{needId:need.id,value:7}],0));
 const request={confirmationId:'observed-green',confirmed:true,expected:analysisBinding(state),updatedAt:'2026-10-16T12:00:00Z',patch,reason:'Mult7 observado en el comodín propio.'};
 const raw=memory.getItem(CONFIRMED_STORAGE_KEY);memory.failWrite=true;assert.equal(store.correct(request).ok,false);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);
 memory.failWrite=false;const saved=success(store.correct(request));assert.equal(saved.state.revision,1);assert.equal(saved.history.length,1);assert.deepEqual(success(store.load()),saved);
 assert.deepEqual(saved.state.observed.deck,state.observed.deck);assert.deepEqual(saved.state.observed.money,state.observed.money);assert.deepEqual(saved.state.assumptions,state.assumptions);
 const undo=success(store.undoLatest({confirmationId:'undo-green',confirmed:true,expected:analysisBinding(saved.state),updatedAt:'2026-10-16T12:01:00Z',targetEntryId:'observed-green',reason:'El valor se transcribió por error.'}));
 assert.deepEqual(undo.state.observed,state.observed);assert.equal(undo.state.revision,2);success(validateConfirmedRecord(undo));
});
