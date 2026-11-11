import test from 'node:test';
import assert from 'node:assert/strict';
import {createNewRun} from '../src/run/start.js';
import {inspectShopDecision,decisionIsCurrent} from '../src/advisor/decision.js';
import {observedRerollQuote} from '../src/rules/reroll-quote.js';
import {buildShopAdviceSummary,comparedShopPurchase} from '../src/ui/shop-advice-summary.js';
import type {ShopSnapshot,ShopPlan} from '../src/advisor/shop-context.js';
import {known,success} from './helpers.js';

const offer=(catalogId:string,price:number)=>({catalogId,price,offerId:catalogId,edition:'base',stickers:[] as string[]});
function fixture(money=25){
 const state=success(createNewRun({runId:'shop-guide',updatedAt:'2026-11-11T12:00:00Z',deckId:'blue',profileConfirmed:true}));
 state.phase='shop';state.phaseData={origin:known({ante:1,kind:'small'})};state.observed.money=known(money);
 state.observed.shop=known({shopId:'seen',cardOffers:[],voucherOffers:[],packOffers:[],ignoredOtherOffers:[]});
 const snapshot:ShopSnapshot={id:'seen',jokers:[],vouchers:[],packs:[],rerollCost:5};
 return {state,snapshot};
}
function inspect(f:ReturnType<typeof fixture>,shopPlan?:ShopPlan){
 f.state.observed.shop=known({shopId:'seen',cardOffers:f.snapshot.jokers.map(o=>({...o,label:o.catalogId,kind:'joker' as const,price:o.price===null?{status:'unknown' as const,reason:'Precio pendiente'}:known(o.price),edition:known(o.edition),stickers:known(o.stickers)})),voucherOffers:[],packOffers:[],ignoredOtherOffers:[]});
 return success(inspectShopDecision(f.state,f.snapshot,shopPlan?{shopPlan}:{}));
}
test('guide prioritizes first scoring over deferred income, and can choose income when requested',()=>{
 const f=fixture(8);f.snapshot.jokers=[offer('joker',2),offer('golden_joker',6)];
 const first=inspect(f);assert.deepEqual(first.context.recommendation.offerIds,['joker']);
 assert.match(first.context.recommendation.planReason!,/primer comodín/);
 assert.equal(comparedShopPurchase(first)?.offerId,'joker');
 const income=inspect(f,{need:'economy'});assert.deepEqual(income.context.recommendation.offerIds,['golden_joker']);
 assert.match(income.context.recommendation.planReason!,/\$4/);assert.equal(comparedShopPurchase(income)?.offerId,'golden_joker');
});
test('saving defeats a preferred purchase and removes its green mark',()=>{
 const f=fixture();f.snapshot.jokers=[offer('joker',2),offer('abstract_joker',4)];
 const decision=inspect(f,{need:'save'});
 assert.deepEqual(decision.context.recommendation.offerIds,['hold']);assert.equal(comparedShopPurchase(decision),null);
});
test('paid search keeps purchase money available and rechecks on each new price',()=>{
 const f=fixture(13);f.snapshot.jokers=[offer('steel_joker',7)];
 const plan:ShopPlan={need:'score',purchaseReserve:8};
 const first=inspect(f,plan);assert.deepEqual(first.context.recommendation.offerIds,['reroll']);
 const summary=buildShopAdviceSummary(first);assert.match(summary.sacrifice!,/\$5.*\$8/);
 f.snapshot.rerollCost=6;
 const costly=inspect(f,plan);assert.deepEqual(costly.context.recommendation.offerIds,['hold']);
 assert.equal(decisionIsCurrent(first,f.state,f.snapshot,{shopPlan:plan}),false);
});
test('unknown price and an unknown offer cannot justify paying for new stock',()=>{
 const f=fixture();f.snapshot.jokers=[offer('steel_joker',7)];f.snapshot.rerollCost=null;
 const unknown=inspect(f,{need:'score',purchaseReserve:8});assert.equal(unknown.context.recommendation.status,'abstain');
 f.snapshot.rerollCost=5;f.snapshot.jokers.push({...offer('joker',2),price:null});
 assert.ok(!inspect(f,{need:'score',purchaseReserve:8}).context.recommendation.offerIds.includes('reroll'));
});
test('free renewal can be considered without an invented purchase reserve',()=>{
 const f=fixture(8);f.snapshot.jokers=[offer('steel_joker',7)];f.snapshot.rerollCost=0;
 assert.deepEqual(inspect(f).context.recommendation.offerIds,['reroll']);
 const plan:ShopPlan={need:'score'};const before=structuredClone(f);
 const result=success(inspectShopDecision(f.state,f.snapshot,{shopPlan:plan}));
 assert.deepEqual(result.context.recommendation.offerIds,['reroll']);assert.deepEqual(f,before);
});
test('quote distinguishes a displayed zero from the paid rate and missing free uses',()=>{
 const {state}=fixture();state.observed.jokerContext=known({rerollCost:known(5)});
 assert.equal(observedRerollQuote(state),null);
 state.observed.jokerContext=known({rerollCost:known(5),freeRerolls:known(1)});
 assert.equal(observedRerollQuote(state),0);
 state.observed.jokerContext=known({rerollCost:known(5),visibleRerollCost:known(0)});
 assert.equal(observedRerollQuote(state),0);
 state.observed.jokerContext=known({rerollCost:known(6),freeRerolls:known(0)});
 assert.equal(observedRerollQuote(state),6);
});
