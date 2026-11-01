import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import type {GameState,Result} from '../src/state/model.js';
import {validateState} from '../src/state/validation.js';
import {currentDeckCards} from '../src/state/deck-material.js';
import {evaluateShopContext,validateShopSnapshot} from '../src/advisor/shop-context.js';
import type {ShopSnapshot} from '../src/advisor/shop-context.js';
import {inspectShopDecision} from '../src/advisor/decision.js';
import {applyShopAction} from '../src/rules/shop.js';
import {applyVoucherPurchase} from '../src/rules/voucher-shop.js';
import {beginRound} from '../src/rules/round.js';
import {scoreHand} from '../src/rules/scoring.js';
import {interestOnBalance,projectCashout} from '../src/rules/economy.js';

// Expectations were frozen before the first evaluator execution. The JSON also
// records qualitative review criteria; these tests enforce the public minimum
// and literal mechanics, not natural-language equivalence or strategic efficacy.
interface FixtureCase {
 id:string;state:GameState;snapshot:ShopSnapshot;decisionOptions:{ante:number};
 mechanicalOracles:Record<string,unknown>&{moneyAfterByOption:Record<string,number>};
 recommendationOracle:{acceptedStatuses:string[];requiredPreferredOfferIds:string[];forbiddenPreferredOfferIds?:string[];requiredConsideredOfferIds?:string[];requiredPendingOfferIds?:string[]};
}
const fixtureBytes=readFileSync(new URL('../../evaluation/fixtures/dec02-development.json',import.meta.url));
const bank=JSON.parse(fixtureBytes.toString('utf8')) as {cases:FixtureCase[]};
const frozenHash='b9ad6643331c67d9caf4efc7a850cd27e4c5e6f0f31687640a0732918fdf1cd0';
const at=(id:string)=>{const c=bank.cases.find(c=>c.id===id);assert.ok(c);return c;};
function success<T>(r:Result<T>):T {assert.ok(r.ok,JSON.stringify(r));return r.value;}
function known<T>(f:{status:'known';value:T}|{status:'unknown'}):T {assert.equal(f.status,'known');return (f as {status:'known';value:T}).value;}
function project(c:FixtureCase,id:string):GameState {
 const mutation={expectedRevision:c.state.revision,updatedAt:c.state.updatedAt};
 if(id==='hold')return success(applyShopAction(c.state,{type:'hold'},mutation)).state;
 const voucher=c.snapshot.vouchers.find(o=>o.offerId===id);
 if(voucher)return success(applyVoucherPurchase(c.state,{type:'buy_voucher',offerId:id},mutation)).state;
 const offer=c.snapshot.jokers.find(o=>o.offerId===id);assert.ok(offer);
 const action=offer.replacementId?{type:'replace' as const,sellInstanceId:offer.replacementId,offerId:id,instanceId:c.id+':new:'+id}:{type:'buy' as const,offerId:id,instanceId:c.id+':new:'+id};
 return success(applyShopAction(c.state,action,mutation)).state;
}
function simpleMult(state:GameState,discardsRemaining=3):number {
 return success(scoreHand(state,{cardIds:['2S'],heldCardIds:[],discardsRemaining})).mult;
}

test('DEC02 acceptance bytes remain the independent six-case freeze',()=>{
 const freeze=JSON.parse(readFileSync(new URL('../../evaluation/fixtures/dec02-freeze.json',import.meta.url),'utf8')) as {fixtures:{sha256:string;caseCount:number}[]};
 assert.equal(createHash('sha256').update(fixtureBytes).digest('hex'),frozenHash);
 assert.equal(freeze.fixtures[0]?.sha256,frozenHash);
 assert.equal(freeze.fixtures[0]?.caseCount,6);
 assert.deepEqual(bank.cases.map(c=>c.id),['DEC02-01','DEC02-02','DEC02-03','DEC02-04','DEC02-05','DEC02-06']);
});

for(const c of bank.cases){
 test(c.id+' recorded state, offers and exact H2 money are independently legal',()=>{
  success(validateState(c.state));success(validateShopSnapshot(c.snapshot));
  const original=structuredClone(c.state);
  for(const [id,expected] of Object.entries(c.mechanicalOracles.moneyAfterByOption))assert.equal(known(project(c,id).observed.money),expected,id);
  assert.deepEqual(c.state,original);
 });
 test(c.id+' recommendation meets the frozen minimum public contract',()=>{
  const before=structuredClone(c.state),shopBefore=structuredClone(c.snapshot);
  const r=evaluateShopContext(c.state,c.snapshot,c.decisionOptions),o=c.recommendationOracle;
  assert.ok(o.acceptedStatuses.includes(r.recommendation.status),JSON.stringify(r.recommendation));
  for(const id of o.requiredPreferredOfferIds)assert.ok(r.recommendation.offerIds.includes(id),JSON.stringify(r.recommendation));
  for(const id of o.forbiddenPreferredOfferIds??[])assert.ok(!r.recommendation.offerIds.includes(id),JSON.stringify(r.recommendation));
  for(const id of o.requiredConsideredOfferIds??[])assert.ok(r.options.some(option=>option.id===id));
  for(const id of o.requiredPendingOfferIds??[])assert.equal(r.options.find(option=>option.id===id)?.coverage,'unknown');
  assert.ok(r.recommendation.reasons.length>0);
  assert.equal(r.exhaustive,false);assert.deepEqual(c.state,before);assert.deepEqual(c.snapshot,shopBefore);
 });
}

test('DEC02-01 Burglar confirms 8/0 round resources while persistent Blue bases stay 5/3; no kings means no Baron factor',()=>{
 const c=at('DEC02-01'),o=c.mechanicalOracles,cards=currentDeckCards(c.state);assert.ok(cards);
 assert.equal(cards.length,o.deckCards);assert.equal(cards.filter(card=>card.rank==='K').length,o.kings);
 assert.equal(known(c.state.observed.resources.handsPerRound),o.persistentHands);
 assert.equal(known(c.state.observed.resources.discardsPerRound),o.persistentDiscards);
 const round=success(beginRound(c.state,['2S','3S','4S','5S','6S','7S','8S','9S']));
 assert.equal(round.handsLeft,o.resultingRoundHands);assert.equal(round.discardsLeft,o.resultingRoundDiscards);
 const before=simpleMult(c.state,0),summit=simpleMult(project(c,'summit'),0),baron=simpleMult(project(c,'baron'),0);
 assert.equal(summit-before,o.summitOwnMainMult);assert.equal(baron/before,o.baronHeldFactorWithoutKings);
});

test('DEC02-02 Seed Money spends 10 and raises only a future cap; the remaining 10 still earns an isolated 2',()=>{
 const c=at('DEC02-02'),o=c.mechanicalOracles,after=project(c,'seed');
 assert.equal(success(interestOnBalance(c.state)),o.isolatedInterestOnHoldBalance);
 assert.equal(success(interestOnBalance(after)),o.isolatedInterestOnBuyBalanceWithSeed);
 const noSeed=structuredClone(after);assert.equal(noSeed.observed.outOfScope.status,'known');
 if(noSeed.observed.outOfScope.status==='known')noSeed.observed.outOfScope.value.vouchers=[];
 assert.equal(success(interestOnBalance(noSeed)),o.isolatedInterestOnBuyBalanceWithoutSeed);
 assert.equal(success(interestOnBalance(after))-success(interestOnBalance(noSeed)),o.incrementFromRaisedCapOnBuyBalance);
});

test('DEC02-03 selected replacement loses Riff-Raff, preserves four actual instances and adds fresh Abstract +15',()=>{
 const c=at('DEC02-03'),o=c.mechanicalOracles,after=project(c,'abstract'),inventory=known(after.observed.jokers);
 assert.equal(known(c.state.observed.jokers).length,o.physicalJokersBefore);
 assert.equal(inventory.length,o.physicalJokersAfter);assert.equal(known(after.observed.resources.jokerSlots),o.jokerCapacity);
 assert.ok(!inventory.some(j=>j.instanceId===o.removedInstanceId));
 assert.deepEqual(inventory.filter(j=>j.catalogId!=='abstract_joker').map(j=>j.instanceId),o.preservedInstanceIds);
 assert.deepEqual(inventory.find(j=>j.catalogId==='abstract_joker')?.counters,o.newAbstractCounters);
 assert.equal(simpleMult(after)-simpleMult(c.state),o.abstractOwnMainMultAfterReplacement);
 const fullRound=success(beginRound(c.state,['2S','3S','4S','5S','6S','7S','8S','9S']));
 assert.equal(known(fullRound.game.observed.jokers).length-known(c.state.observed.jokers).length,o.riffGeneratedAtNextSelectionIfUnchanged);
});

test('DEC02-04 scoring and won-round income retain separate units and conditions',()=>{
 const c=at('DEC02-04'),o=c.mechanicalOracles,scoring=project(c,'scoring'),income=project(c,'income');
 assert.equal(simpleMult(scoring)-simpleMult(c.state),o.jokerOwnMainMult);
 assert.equal(simpleMult(income)-simpleMult(c.state),o.goldenOwnMainMult);
 const cash=success(projectCashout(income,{handsRemaining:0,won:true,noMoneyChangesDuringRound:true}));
 assert.equal(cash.goldenIncome,o.goldenIncomePerWonRoundIfRetained);
 const lost=success(projectCashout(income,{handsRemaining:0,won:false,noMoneyChangesDuringRound:true}));
 assert.equal(lost.goldenIncome,o.immediateIncomeFromGoldenPurchase);
});

test('DEC02-05 current independent one-Joker inventories provide literal +4 versus +3 at costs 2 versus 4',()=>{
 const c=at('DEC02-05'),o=c.mechanicalOracles,a=project(c,'joker'),b=project(c,'abstract');
 assert.equal(known(a.observed.jokers).length,o.physicalJokersAfterEitherPurchase);
 assert.equal(known(b.observed.jokers).length,o.physicalJokersAfterEitherPurchase);
 assert.equal(simpleMult(a)-simpleMult(c.state),o.jokerOwnMainMult);
 assert.equal(simpleMult(b)-simpleMult(c.state),o.abstractOwnMainMult);
});

test('DEC02-06 ordinary two-card shop preserves the pending Tarot price without fabricating a modeled purchase',()=>{
 const c=at('DEC02-06'),o=c.mechanicalOracles,shop=known(c.state.observed.shop);
 assert.equal(shop.cardOffers.length,o.ordinaryVisibleCardOffers);
 assert.equal(c.snapshot.others?.[0]?.price,o.manualTarotObservedPrice);
 const decision=success(inspectShopDecision(c.state,c.snapshot,c.decisionOptions));
 assert.ok(decision.actions.some(a=>a.optionId==='joker'&&a.moneyAfter===o.moneyAfterByOption.joker));
 assert.ok(decision.actions.every(a=>a.optionId!=='manual-tarot'));
});
