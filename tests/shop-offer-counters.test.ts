import test from 'node:test';
import assert from 'node:assert/strict';
import {createNewRun} from '../src/run/start.js';
import {applyShopAction,freshJokerInstance} from '../src/rules/shop.js';
import {inspectShopDecision} from '../src/advisor/decision.js';
import {createConfirmedStore,analysisBinding} from '../src/storage/confirmed-store.js';
import {createShopSessionStore} from '../src/storage/shop-session.js';
import type {ShopSnapshot} from '../src/advisor/shop-context.js';
import {validateState} from '../src/state/validation.js';
import {known,MemoryStorage,success} from './helpers.js';

const updatedAt='2026-11-11T17:00:00Z';
const greenOffer=(mult:number)=>({offerId:'visible-green',catalogId:'green_joker',label:'Green Joker',kind:'joker' as const,price:known(4),edition:known('base'),stickers:known([] as string[]),counters:{greenMult:known(mult)}});
function fixture(){
 const state=success(createNewRun({runId:'offer-counters',updatedAt,deckId:'blue',profileConfirmed:true}));
 state.phase='shop';state.phaseData={origin:known({ante:1,kind:'small'})};state.observed.money=known(25);
 return state;
}
test('observed offer counters survive saving and reload, then belong to the purchased copy',()=>{
 const state=fixture(),storage=new MemoryStorage();
 success(createConfirmedStore(()=>storage).initialize(state));
 const session=createShopSessionStore(()=>storage),offer=greenOffer(12),input={confirmationId:'observe',confirmed:true,expected:analysisBinding(state),updatedAt,shopId:'shelf',offers:[offer]};
 const saved=success(session.observeJokerOffers(input));
 const reread=success(createShopSessionStore(()=>storage).load())!;
 assert.deepEqual(reread.state,saved.state);assert.deepEqual(reread.state.observed.money,known(25));
 const bought=success(applyShopAction(reread.state,{type:'buy',offerId:'visible-green',instanceId:'new-green'},{expectedRevision:reread.state.revision,updatedAt}));
 assert.equal(bought.state.observed.jokers.status,'known');
 if(bought.state.observed.jokers.status==='known')assert.deepEqual(bought.state.observed.jokers.value[0]!.counters,{greenMult:known(12)});
 assert.deepEqual(reread.state.observed.money,known(25));
});
test('replacement takes the offered value and never inherits the sold copy',()=>{
 const state=fixture(),old=freshJokerInstance('green_joker','old');
 old.counters.greenMult=known(24);state.observed.jokers=known([old]);
 state.observed.shop=known({shopId:'shelf',cardOffers:[greenOffer(7)],ignoredOtherOffers:[]});
 const bought=success(applyShopAction(state,{type:'replace',sellInstanceId:'old',offerId:'visible-green',instanceId:'new'},{expectedRevision:state.revision,updatedAt}));
 assert.equal(bought.state.observed.jokers.status,'known');
 if(bought.state.observed.jokers.status==='known')assert.deepEqual(bought.state.observed.jokers.value[0]!.counters,{greenMult:known(7)});
 const ordinary=fixture(),withoutCounters=greenOffer(0);delete (withoutCounters as {counters?:unknown}).counters;
 ordinary.observed.shop=known({shopId:'shelf',cardOffers:[withoutCounters],ignoredOtherOffers:[]});
 const fresh=success(applyShopAction(ordinary,{type:'buy',offerId:'visible-green',instanceId:'fresh'},{expectedRevision:ordinary.revision,updatedAt}));
 if(fresh.state.observed.jokers.status==='known')assert.deepEqual(fresh.state.observed.jokers.value[0]!.counters,{greenMult:known(0)});
});
test('advice uses the offered counter and rejects an unsaved counter change',()=>{
 const state=fixture();state.observed.shop=known({shopId:'shelf',cardOffers:[greenOffer(12)],ignoredOtherOffers:[]});
 const snapshot:ShopSnapshot={id:'shelf',jokers:[{offerId:'visible-green',catalogId:'green_joker',price:4,edition:'base',stickers:[],counters:{greenMult:known(12)}}],vouchers:[],packs:[],rerollCost:null};
 const decision=success(inspectShopDecision(state,snapshot)),option=decision.context.options.find(item=>item.id==='visible-green')!;
 assert.equal(option.fit?.readiness,'ready');assert.match(option.fit!.signals.find(s=>s.id==='preparation')!.text,/12/);
 snapshot.jokers[0]!.counters!.greenMult=known(15);
 const changed=success(inspectShopDecision(state,snapshot));
 assert.ok(changed.actions.find(action=>action.optionId==='visible-green')!.errors.some(error=>error.code==='unrecorded_offer'));
});
test('invalid counter ranges are rejected while old offers preserve their original contract',()=>{
 const state=fixture();state.observed.shop=known({shopId:'shelf',cardOffers:[greenOffer(-1)],ignoredOtherOffers:[]});
 const invalid=validateState(state);assert.equal(invalid.ok,false);
 if(!invalid.ok)assert.ok(invalid.errors.some(error=>error.code==='invalid_counter'));
 const legacy={...state,schemaVersion:'0.1',phase:'shop'} as Record<string,unknown>;delete legacy.phaseData;
 assert.equal(validateState(legacy).ok,false);
});
