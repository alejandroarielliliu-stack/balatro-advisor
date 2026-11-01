import assert from 'node:assert/strict';
import test from 'node:test';
import {prepareBasicObservation} from '../src/state/basic-observations.js';
import {invalidateDeckGrowth,inventoryCards} from '../src/state/inventory-changes.js';
import {createNewRun} from '../src/run/start.js';
import {createConfirmedStore,analysisBinding,CONFIRMED_STORAGE_KEY} from '../src/storage/confirmed-store.js';
import type {Fact,GameState,JokerInstance} from '../src/state/model.js';
import type {Card} from '../src/catalog/initial.js';
import {known,MemoryStorage,s01,success} from './helpers.js';

const time='2026-11-01T12:00:00Z';
const unknown=<T>():Fact<T>=>({status:'unknown',reason:'No observado.'});
const preset=<T>(value:T):Fact<T>=>({status:'known',source:'confirmedPreset',value});
function fixture(){return success(createNewRun({runId:'deck-observations',updatedAt:time,deckId:'blue',profileConfirmed:true}));}
function cards(state:GameState):Card[]{const result=inventoryCards(state);assert.ok(result);return result;}
const joker=(catalogId:string):JokerInstance=>({instanceId:catalogId,catalogId,edition:preset('base'),stickers:known([]),sellValue:known(2),counters:{x100:known(200),extraSell:known(17)}});
const growthIds=['hologram','caino','glass','vampire','joker'];
function withGrowth(){const state=fixture();state.observed.jokers=known(growthIds.map(joker));return state;}
function assertGrowth(jokers:Fact<JokerInstance[]>|undefined,affected:readonly string[]){
 assert.equal(jokers?.status,'known');if(jokers?.status!=='known')return;
 for(const j of jokers.value){assert.equal(j.counters.x100!.status,affected.includes(j.catalogId)?'unknown':'known',j.catalogId);assert.deepEqual(j.counters.extraSell,known(17));}
}

test('OBS01d deck correction is narrow, immutable and preserves unrelated facts and hypothetical plans',()=>{
 const state=fixture(),before=structuredClone(state),next=cards(state);next.find(c=>c.instanceId==='KS')!.enhancement='steel';
 const request={deck:known({cards:next})},originalRequest=structuredClone(request),result=success(prepareBasicObservation(state,request));
 assert.deepEqual(Object.keys(result.patch),['deck']);assert.equal(result.changed,true);assert.deepEqual(result.patch.deck,request.deck);assert.deepEqual(state,before);assert.deepEqual(request,originalRequest);
 const after={...state,observed:{...state.observed,...result.patch}};
 for(const key of ['money','jokers','resources','handBases','shop','jokerContext','outOfScope','nextBlind','lastCleared']as const)assert.deepEqual(after.observed[key],before.observed[key]);
 assert.deepEqual(after.assumptions,before.assumptions);assert.equal(after.phase,before.phase);assert.equal(after.revision,before.revision);assert.equal(after.updatedAt,before.updatedAt);
 assert.ok(result.patch.deck?.status==='known'&&'cards'in result.patch.deck.value);result.patch.deck.value.cards[0]!.rank='A';assert.deepEqual(request,originalRequest);
});

test('OBS01d equivalent deck facts preserve metadata and create no correction; ordering does not invent growth',()=>{
 const state=withGrowth(),before=structuredClone(state),equivalent=success(prepareBasicObservation(state,{deck:known({cards:cards(state)})}));
 assert.equal(equivalent.changed,false);assert.deepEqual(equivalent.patch,{});assert.deepEqual(state,before);
 const reordered=success(prepareBasicObservation(state,{deck:known({cards:cards(state).reverse()})}));assert.equal(reordered.changed,true);assert.equal(reordered.patch.jokers,undefined);
});

test('OBS01d malformed cards, repeated identities and malformed discard flags are rejected without mutation',()=>{
 const state=fixture(),before=structuredClone(state),list=cards(state),first=list[0]!;
 for(const request of [{deck:known({cards:[{...first,rank:'99'}]})},{deck:known({cards:[first,first]})},{deck:known({cards:[{...first,instanceId:''}]})},{deck:known({cards:[{...first,extraChips:0.5}]})},{deck:known({cards:list}),discardSavedScenarios:'yes'},{deck:known({cards:list}),phase:'shop'},{deck:{status:'unknown',reason:''}}])assert.equal(prepareBasicObservation(state,request).ok,false);
 assert.deepEqual(state,before);
});

test('OBS01d card additions, removals and modifications invalidate only potentially affected growth',()=>{
 const state=withGrowth(),before=structuredClone(state),original=cards(state);
 const added=[...original,{...original[0]!,instanceId:'observed-new-copy'}],removed=original.filter(c=>c.instanceId!=='2S'),modified=structuredClone(original);modified.find(c=>c.instanceId==='KS')!.enhancement='steel';
 for(const [next,affected]of [[added,['hologram']],[removed,['caino','glass']],[modified,['vampire']]]as const){
  const result=success(prepareBasicObservation(state,{deck:known({cards:next})}));assertGrowth(result.patch.jokers,affected);
 }
 assert.deepEqual(state,before);
});

test('OBS01d combined joker/deck observations invalidate the final supplied instances rather than restore the old inventory',()=>{
 const state=withGrowth(),next=cards(state);next.push({...next[0]!,instanceId:'observed-new-copy'});
 const supplied=joker('hologram');supplied.instanceId='new-hologram';supplied.counters.x100=known(300);
 const out=success(prepareBasicObservation(state,{jokers:known([supplied]),deck:known({cards:next})}));
 assert.ok(out.patch.jokers?.status==='known');assert.equal(out.patch.jokers.value.length,1);assert.equal(out.patch.jokers.value[0]!.instanceId,'new-hologram');assert.equal(out.patch.jokers.value[0]!.counters.x100!.status,'unknown');assert.deepEqual(out.patch.jokers.value[0]!.edition,preset('base'));
 assert.deepEqual(supplied.counters.x100,known(300));
});

test('OBS01d unknown or entirely replaced baselines conservatively invalidate growth without manufacturing its value',()=>{
 for(const mode of ['known-to-unknown','unknown-to-known','reset-identities']as const){
  const state=withGrowth(),full=cards(state);if(mode==='unknown-to-known')state.observed.deck=unknown();
  const deck=mode==='known-to-unknown'?unknown<Extract<GameState['observed']['deck'],{status:'known'}>['value']>():known({cards:mode==='reset-identities'?full.map(c=>({...c,instanceId:'reset-'+c.instanceId})):full});
  const before=structuredClone(state),result=success(prepareBasicObservation(state,{deck}));assertGrowth(result.patch.jokers,growthIds.slice(0,4));assert.deepEqual(state,before);
 }
});

test('OBS01d shared growth invalidation is pure and preserves an unknown inventory',()=>{
 const state=withGrowth(),before=structuredClone(state.observed.jokers),result=invalidateDeckGrowth(state.observed.jokers,{added:true,removed:false,changed:false});
 assertGrowth(result,['hologram']);assert.deepEqual(state.observed.jokers,before);assert.deepEqual(invalidateDeckGrowth(unknown(),{added:true,removed:true,changed:true}),unknown());
});

test('OBS01d saved scenario references reject removal unless explicit discard is passed to validation and persistence',()=>{
 const state=fixture();state.assumptions.probes=[{probeId:'saved-king',label:'Hipótesis anterior',playedCardIds:['KS'],discardsRemaining:3,role:'favorable'}];
 const original=structuredClone(state),deck=known({cards:cards(state).filter(c=>c.instanceId!=='KS')});
 const rejected=prepareBasicObservation(state,{deck});assert.ok(!rejected.ok);assert.equal(rejected.errors[0]!.code,'unknown_reference');
 const result=success(prepareBasicObservation(state,{deck,discardSavedScenarios:true}));assert.equal('assumptions'in result.patch,false);assert.deepEqual(state,original);
 const memory=new MemoryStorage(),store=createConfirmedStore(()=>memory);success(store.initialize(state));
 const request={confirmationId:'remove-king',confirmed:true,expected:analysisBinding(state),updatedAt:time,patch:result.patch,reason:result.description};
 assert.equal(store.correct(request).ok,false,'The caller must forward the explicit discard flag.');
 const saved=success(store.correct({...request,discardSavedScenarios:true}));assert.deepEqual(saved.state.assumptions.probes,[]);assert.equal(saved.history[0]!.before.assumptions.probes[0]!.probeId,'saved-king');
 const undone=success(store.undoLatest({confirmationId:'restore-king',confirmed:true,expected:analysisBinding(saved.state),updatedAt:time,targetEntryId:'remove-king',reason:'Se eligió la carta equivocada.'}));assert.deepEqual(undone.state.observed,state.observed);assert.deepEqual(undone.state.assumptions,state.assumptions);
});

test('OBS01d explicit scenario discard remains a correction with unchanged cards and never resets growth',()=>{
 const state=withGrowth(),deck=known({cards:cards(state)});assert.equal(success(prepareBasicObservation(state,{deck,discardSavedScenarios:true})).changed,false);
 state.assumptions.probes=[{probeId:'saved-king',label:'Hipótesis anterior',playedCardIds:['KS'],discardsRemaining:3,role:'favorable'}];
 const before=structuredClone(state),result=success(prepareBasicObservation(state,{deck,discardSavedScenarios:true}));
 assert.equal(result.changed,true);assert.deepEqual(result.patch,{deck:state.observed.deck});assert.deepEqual(state,before);
 const memory=new MemoryStorage(),store=createConfirmedStore(()=>memory);success(store.initialize(state));
 const saved=success(store.correct({confirmationId:'discard-old-scenarios',confirmed:true,expected:analysisBinding(state),updatedAt:time,patch:result.patch,reason:result.description,discardSavedScenarios:true}));
 assert.deepEqual(saved.state.assumptions.probes,[]);assert.deepEqual(saved.state.observed,state.observed);
});

test('OBS01d real held-card references cannot be discarded with hypothetical scenarios',()=>{
 const base=fixture(),state={...base,phase:'in_round' as const,phaseData:{blind:unknown<{ante:number;kind:'small'|'big'|'boss'}>(),handsRemaining:known(5),discardsRemaining:known(3),score:known(0),heldCardIds:known(['KS'])}};
 const before=structuredClone(state),deck=known({cards:cards(state).filter(c=>c.instanceId!=='KS')}),result=prepareBasicObservation(state,{deck,discardSavedScenarios:true});
 assert.ok(!result.ok);assert.ok(result.errors.some(e=>e.code==='unknown_reference'));assert.deepEqual(state,before);
});

test('OBS01d deck save, load, quota failure, stale revision and undo keep one atomic observed history',()=>{
 const state=withGrowth(),memory=new MemoryStorage(),store=createConfirmedStore(()=>memory);success(store.initialize(state));
 const list=cards(state);list.find(c=>c.instanceId==='KS')!.enhancement='steel';const prepared=success(prepareBasicObservation(state,{deck:known({cards:list})}));
 const request={confirmationId:'observed-steel',confirmed:true,expected:analysisBinding(state),updatedAt:time,patch:prepared.patch,reason:prepared.description},raw=memory.getItem(CONFIRMED_STORAGE_KEY);
 memory.failWrite=true;assert.equal(store.correct(request).ok,false);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);memory.failWrite=false;
 const saved=success(store.correct(request));assert.equal(saved.state.revision,1);assert.equal(saved.history.length,1);assert.equal(saved.history[0]!.kind,'correction');assert.equal(saved.history[0]!.action,null);assert.deepEqual(success(store.load()),saved);assert.equal(cards(saved.state).find(c=>c.instanceId==='KS')!.enhancement,'steel');assert.equal(cards(saved.state).length,52);assertGrowth(saved.state.observed.jokers,['vampire']);
 const savedRaw=memory.getItem(CONFIRMED_STORAGE_KEY);assert.equal(store.correct({...request,confirmationId:'stale-deck'}).ok,false);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),savedRaw);
 const undone=success(store.undoLatest({confirmationId:'undo-observed-steel',confirmed:true,expected:analysisBinding(saved.state),updatedAt:time,targetEntryId:'observed-steel',reason:'Carta equivocada.'}));assert.deepEqual(undone.state.observed,state.observed);assert.deepEqual(undone.state.assumptions,state.assumptions);
});

test('OBS01d legacy files retain their schema and unknown full observations can be explicitly completed',()=>{
 const state=s01(),memory=new MemoryStorage(),store=createConfirmedStore(()=>memory);success(store.initialize(state));const list=cards(state);list.find(c=>c.instanceId==='KS')!.enhancement='steel';
 const result=success(prepareBasicObservation(state,{deck:known({cards:list})})),saved=success(store.correct({confirmationId:'legacy-steel',confirmed:true,expected:analysisBinding(state),updatedAt:time,patch:result.patch,reason:result.description}));assert.equal(saved.state.schemaVersion,'0.1');assert.deepEqual(saved.state.observed.money,state.observed.money);
 const unknownState=fixture();unknownState.observed.deck=unknown();const completed=success(prepareBasicObservation(unknownState,{deck:known({cards:list})}));assert.deepEqual(completed.patch.deck,known({cards:list}));
});
