import test from 'node:test';
import assert from 'node:assert/strict';
import {prepareBasicObservation} from '../src/state/basic-observations.js';
import {createNewRun} from '../src/run/start.js';
import {createConfirmedStore,analysisBinding,CONFIRMED_STORAGE_KEY} from '../src/storage/confirmed-store.js';
import {known,MemoryStorage,success} from './helpers.js';
import type {Fact,JokerInstance} from '../src/state/model.js';

const time='2026-10-28T12:00:00Z';
const missing=<T>(reason='No observado.'):Fact<T>=>({status:'unknown',reason});
function fixture(){
 const state=success(createNewRun({runId:'basic-observed',updatedAt:time,deckId:'blue',profileConfirmed:true}));
 state.phase='shop';state.phaseData={origin:known({ante:2,kind:'boss'})};state.observed.money=known(25);
 state.observed.shop=known({shopId:'current-shop',cardOffers:[],ignoredOtherOffers:[]});
 return state;
}
function joker(id:string,catalogId='green_joker'):JokerInstance{return {instanceId:id,catalogId,edition:known('base'),stickers:known([]),sellValue:known(2),counters:{greenMult:known(7),extraSell:known(2)}};}
const preset=<T>(value:T):Fact<T>=>({status:'known',source:'confirmedPreset',value});

test('UX01b basic: equivalent facts retain provenance and unknown reasons without creating a correction',()=>{
 const state=fixture();state.observed.money=preset(25);state.observed.resources.handSize=missing('Tamaño actual pendiente.');
 const out=success(prepareBasicObservation(state,{money:known(25),resources:{handSize:missing('Otra descripción.')}}));
 assert.equal(out.changed,false);assert.deepEqual(out.patch,{});assert.deepEqual(success(prepareBasicObservation(state,{})).patch,{});
});
test('UX01b basic: money correction preserves phase, context, deck, hands, offers and hypothetical plans',()=>{
 const state=fixture(),before=structuredClone(state);const result=success(prepareBasicObservation(state,{money:known(27)}));
 assert.deepEqual(Object.keys(result.patch),['money']);assert.deepEqual(result.patch.money,known(27));assert.equal(result.changed,true);
 assert.deepEqual(state,before);const after={...state,observed:{...state.observed,...result.patch}};
 for(const key of ['deck','handBases','shop','jokerContext','nextBlind','resources','jokers','outOfScope']as const)assert.deepEqual(after.observed[key],before.observed[key]);
 assert.deepEqual(after.phaseData,before.phaseData);assert.equal(after.phase,before.phase);assert.equal(after.revision,before.revision);assert.equal(after.updatedAt,before.updatedAt);assert.deepEqual(after.assumptions,before.assumptions);
});
test('UX01b basic: reordering keeps instance provenance and omitted counters while moving only those instances',()=>{
 const state=fixture(),a=joker('a'),b=joker('b');a.edition=missing('No vi la edición.');a.counters.greenMult=preset(7);state.observed.jokers=preset([a,b]);
 const changed=structuredClone([b,a]);changed[1]!.edition=missing('Texto de formulario.');changed[1]!.counters={greenMult:known(7)};
 const out=success(prepareBasicObservation(state,{jokers:known(changed)}));assert.equal(out.changed,true);assert.ok(out.patch.jokers?.status==='known');
 assert.deepEqual(out.patch.jokers.value.map(j=>j.instanceId),['b','a']);assert.deepEqual(out.patch.jokers.value[1]!.edition,a.edition);assert.deepEqual(out.patch.jokers.value[1]!.counters,a.counters);
});
test('UX01b basic: omitted same-effect extraSell is retained without defeating no-op detection',()=>{
 const state=fixture(),a=joker('a');state.observed.jokers=preset([a]);const input=structuredClone(a);input.counters={greenMult:known(7)};
 const result=success(prepareBasicObservation(state,{jokers:known([input])}));assert.equal(result.changed,false);assert.deepEqual(result.patch,{});
});
test('UX01b basic: a changed counter keeps other metadata, but a changed catalog or instance inherits no development',()=>{
 const state=fixture(),a=joker('a');a.sellValue=preset(2);state.observed.jokers=known([a]);
 const changed=structuredClone(a);changed.counters={greenMult:known(9)};changed.sellValue=known(2);const out=success(prepareBasicObservation(state,{jokers:known([changed])}));assert.ok(out.patch.jokers?.status==='known');
 assert.deepEqual(out.patch.jokers.value[0]!.sellValue,preset(2));assert.deepEqual(out.patch.jokers.value[0]!.counters,{greenMult:known(9),extraSell:known(2)});
 for(const incoming of [{...joker('a','joker'),counters:{}},{...joker('new'),counters:{greenMult:known(0)}}]){
  const next=success(prepareBasicObservation(state,{jokers:known([incoming])}));assert.ok(next.patch.jokers?.status==='known');assert.deepEqual(next.patch.jokers.value[0]!.counters,incoming.counters);
 }
});
test('UX01b basic: voucher observations preserve all other modifiers and do not spend money',()=>{
 const state=fixture();state.observed.outOfScope=preset({vouchers:['v_blank'],consumables:['observed-tarot'],pendingTags:['tag_investment'],otherModifiers:['manual-effect']});
 assert.ok(state.observed.outOfScope.status==='known');
 const out=success(prepareBasicObservation(state,{voucherIds:['v_blank','v_antimatter']}));assert.deepEqual(Object.keys(out.patch),['outOfScope']);assert.ok(out.patch.outOfScope?.status==='known');
 assert.deepEqual(out.patch.outOfScope.value,{...state.observed.outOfScope.value,vouchers:['v_blank','v_antimatter']});assert.equal(out.patch.money,undefined);
 assert.deepEqual(success(prepareBasicObservation(state,{voucherIds:['v_blank']})).patch,{});
});
test('UX01b basic: unknown modifier context rejects even an empty voucher list without manufacturing facts',()=>{
 const state=fixture();state.observed.outOfScope=missing('No sabemos qué otros modificadores hay.');const before=structuredClone(state),out=prepareBasicObservation(state,{money:known(10),voucherIds:[]});
 assert.ok(!out.ok);assert.equal(out.errors[0]!.code,'unknown_modifier_context');assert.deepEqual(state,before);
});
test('UX01b basic: partial resource correction preserves the other known/unknown facts',()=>{
 const state=fixture();state.observed.resources.handSize=missing('Tamaño no visto.');const out=success(prepareBasicObservation(state,{resources:{jokerSlots:known(6)}}));
 assert.deepEqual(out.patch.resources,{...state.observed.resources,jokerSlots:known(6)});assert.deepEqual(Object.keys(out.patch),['resources']);
});
test('UX01b basic: runtime schema rejects unsafe values, malformed facts, unrecognized payloads and resource counts',()=>{
 for(const request of [{money:known(1.5)},{money:known(Number.MAX_SAFE_INTEGER+1)},{money:known('25')},{money:{status:'unknown',reason:''}},{resources:{handSize:known(-1)}},{resources:{handsPerRound:known(2.2)}},{resources:{round:known(1)}},{assumptions:{}},{state:fixture()},{voucherIds:[1]},undefined])assert.equal(prepareBasicObservation(fixture(),request).ok,false,JSON.stringify(request));
 const state=fixture(),a=joker('a');assert.equal(prepareBasicObservation(state,{jokers:known([a,a])}).ok,false);a.counters.greenMult=known(1.5);assert.equal(prepareBasicObservation(state,{jokers:known([a])}).ok,false);
});
test('UX01b basic: combined observations validate as one patch and own their copies',()=>{
 const state=fixture(),request={money:known(10),jokers:known([joker('a')]),voucherIds:['v_grabber'],resources:{handsPerRound:known(6)}};
 const before=structuredClone({state,request}),out=success(prepareBasicObservation(state,request));assert.deepEqual(Object.keys(out.patch),['money','jokers','outOfScope','resources']);
 assert.deepEqual({state,request},before);assert.ok(out.patch.jokers?.status==='known');out.patch.jokers.value[0]!.counters.greenMult=known(99);out.patch.money=known(1);assert.deepEqual({state,request},before);
 const next=success(prepareBasicObservation(state,request));assert.ok(next.patch.jokers?.status==='known');assert.deepEqual(next.patch.jokers.value[0]!.counters.greenMult,known(7));
});
test('UX01b basic: existing T09b quota, revision and undo contracts keep the previous record recoverable',()=>{
 const state=fixture(),memory=new MemoryStorage(),store=createConfirmedStore(()=>memory);success(store.initialize(state));
 const patch=success(prepareBasicObservation(state,{money:known(27)})).patch,request={confirmationId:'basic-money',confirmed:true,expected:analysisBinding(state),updatedAt:time,patch,reason:'Dinero observado actualizado.'};
 const original=memory.getItem(CONFIRMED_STORAGE_KEY);memory.failWrite=true;assert.equal(store.correct(request).ok,false);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),original);
 memory.failWrite=false;const saved=success(store.correct(request));assert.equal(saved.state.revision,1);assert.equal(saved.history.length,1);assert.equal(saved.history[0]!.kind,'correction');assert.equal(saved.history[0]!.action,null);
 const raw=memory.getItem(CONFIRMED_STORAGE_KEY);const stale=store.correct({...request,confirmationId:'basic-stale',patch:success(prepareBasicObservation(state,{money:known(99)})).patch});assert.ok(!stale.ok);assert.equal(stale.errors[0]!.code,'stale_revision');assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);
 const undone=success(store.undoLatest({confirmationId:'undo-basic',confirmed:true,expected:analysisBinding(saved.state),updatedAt:time,targetEntryId:'basic-money',reason:'Dato transcrito por error.'}));assert.deepEqual(undone.state.observed,state.observed);assert.equal(undone.history.length,2);
});
