import test from 'node:test';
import assert from 'node:assert/strict';
import {createNewRun} from '../src/run/start.js';
import {freshJokerInstance} from '../src/rules/shop.js';
import {evaluateShopContext} from '../src/advisor/shop-context.js';
import type {ShopSnapshot} from '../src/advisor/shop-context.js';
import {scoreHand} from '../src/rules/scoring.js';
import {known} from './helpers.js';

// Literal rules and arithmetic, not gameplay or a strategic optimum oracle.
function state(money=12,deckId='blue'){
 const r=createNewRun({runId:'quick-shop-regression',updatedAt:'2026-10-18T12:00:00Z',deckId,profileConfirmed:true});assert.ok(r.ok);
 const s=r.value;s.phase='shop';s.phaseData={origin:known({ante:1,kind:'small'})};s.observed.money=known(money);
 s.observed.shop=known({shopId:'observed',cardOffers:[],voucherOffers:[],packOffers:[],ignoredOtherOffers:[]});return s;
}
const snapshot=():ShopSnapshot=>({id:'visible',jokers:[],vouchers:[],packs:[],rerollCost:5});
const offer=(catalogId:string,price:number,offerId='new')=>({catalogId,price,offerId,edition:'base',stickers:[] as string[]});

test('same-role Abstract own +6 is shared with H2; independent Flush literals are 520 and 910',()=>{
 const s=state(),shop=snapshot();s.observed.jokers=known([freshJokerInstance('joker','owned','base')]);shop.jokers=[offer('abstract_joker',4)];
 const before=structuredClone(s),report=evaluateShopContext(s,shop,{ante:1});
 assert.deepEqual(report.recommendation.offerIds,['new']);assert.equal(report.options[1]!.findings?.find(f=>f.ruleId==='S-ADDITIONAL-SCORING')?.values?.ownMult,6);
 assert.equal(report.options[1]!.moneyAfter,8);
 const hand={cardIds:['2S','4S','6S','8S','10S'],heldCardIds:['3H','5C','7D'],discardsRemaining:3};
 const a=scoreHand(s,hand);assert.ok(a.ok,JSON.stringify(a));assert.equal(a.value.score,520); // (35+30)*(4+4)
 const projected=structuredClone(s);assert.ok(s.observed.jokers.status==='known');projected.observed.jokers=known([...s.observed.jokers.value,freshJokerInstance('abstract_joker','added','base')]);
 const b=scoreHand(projected,hand);assert.ok(b.ok);assert.equal(b.value.score,910); // 65*(4+4+3*2)
 assert.deepEqual(s,before);assert.equal(s.revision,0);
});
test('a lower editorial index at ante4 is not a universal veto on +4 Mult',()=>{
 const s=state(),shop=snapshot();s.observed.jokers=known([freshJokerInstance('abstract_joker','owned','base')]);shop.jokers=[offer('joker',2)];
 const r=evaluateShopContext(s,shop,{ante:4});assert.ok(r.options[1]!.fit!.score!<70);assert.deepEqual(r.recommendation.offerIds,['new']);assert.equal(r.recommendation.status,'conditional');
});
test('Seed Money interest 7→6 is a conditional opportunity cost, never paid into the real balance',()=>{
 const s=state(35),shop=snapshot();s.observed.outOfScope=known({vouchers:['v_seed_money'],consumables:[],pendingTags:[],otherModifiers:[]});shop.jokers=[offer('joker',2)];const prior=structuredClone(s),r=evaluateShopContext(s,shop),i=r.options[1]!.economics!.interest;
 assert.deepEqual([i.before,i.after,i.change],[7,6,-1]);assert.equal(r.options[1]!.moneyAfter,33);assert.ok(i.provisional);assert.match(i.assumptions.join(' '),/Superar.*conservar/);assert.deepEqual(s,prior);
});
test('Green preserves reserve value but has zero conditional interest on both balances',()=>{
 const s=state(25,'green'),shop=snapshot();shop.jokers=[offer('half_joker',5)];const r=evaluateShopContext(s,shop),i=r.options[1]!.economics!.interest;
 assert.deepEqual([i.before,i.after,i.change],[0,0,0]);assert.match(r.options[1]!.reasons.join(' '),/otras compras/);
});
test('temporary Popcorn4 is replaceable at net zero, with its lost effect and no inherited counter',()=>{
 const s=state(15),shop=snapshot(),old=freshJokerInstance('popcorn','old','base');old.counters.mult=known(4);old.sellValue=known(2);s.observed.jokers=known([old]);shop.jokers=[{...offer('joker',2),replacementId:'old'}];
 const prior=structuredClone(s),r=evaluateShopContext(s,shop);assert.equal(r.options[1]!.fit!.purchase.status,'legal');assert.equal(r.options[1]!.moneyAfter,15);assert.equal(r.recommendation.status,'tie');assert.deepEqual(r.recommendation.offerIds,['hold','new']);assert.match(r.options[1]!.reasons.join(' '),/temporal restante/);assert.match(r.options[1]!.reasons.join(' '),/No se heredan/);assert.deepEqual(s,prior);
});
test('spending last cash on Golden remains a tradeoff; Credit Card without financing need is not preferred',()=>{
 const s=state(6),shop=snapshot();shop.jokers=[offer('golden_joker',6)];const r=evaluateShopContext(s,shop);assert.equal(r.options[1]!.moneyAfter,0);assert.equal(r.recommendation.status,'tie');assert.ok(r.recommendation.offerIds.includes('hold'));assert.match(r.options[1]!.reasons.join(' '),/Sin reserva/);
 shop.jokers=[offer('credit_card',1)];const credit=evaluateShopContext(state(100),shop);assert.deepEqual(credit.recommendation.offerIds,['hold']);assert.match(credit.options[1]!.reasons.join(' '),/no crea efectivo/i);
});
test('a loss of Bull/Stencil support is kept as a tradeoff rather than a pure scoring gain',()=>{
 for(const id of ['bull','stencil']){const s=state(25),shop=snapshot();s.observed.jokers=known([freshJokerInstance(id,'owned','base')]);shop.jokers=[offer('joker',2)];const r=evaluateShopContext(s,shop);assert.equal(r.recommendation.status,'tie');assert.ok(r.recommendation.offerIds.includes('hold'));}
});
test('shop phase and H2 coverage gate joker and voucher purchases independently',()=>{
 const s=state(),shop=snapshot();shop.jokers=[offer('joker',2)];shop.vouchers=[{offerId:'voucher',catalogId:'v_grabber',price:10}];s.phase='in_round';s.phaseData={blind:known({ante:1,kind:'small'}),handsRemaining:known(5),discardsRemaining:known(3),score:known(0),heldCardIds:{status:'unknown',reason:'Sin mano'}};
 const r=evaluateShopContext(s,shop);assert.deepEqual(r.errors,[]);assert.ok(!r.recommendation.offerIds.includes('new'));assert.ok(!r.recommendation.offerIds.includes('voucher'));assert.match(r.options[1]!.reasons.join(' '),/fase no permite/);
});
test('uncertain offers remain visible alongside known tradeoffs and never become free',()=>{
 const s=state(25),shop=snapshot();shop.jokers=[offer('golden_joker',6),{...offer('joker',2,'unknown'),price:null}];const r=evaluateShopContext(s,shop);assert.equal(r.recommendation.status,'tie');assert.match(r.recommendation.reasons.join(' '),/Otras ofertas tienen datos pendientes/);assert.equal(r.options.find(o=>o.id==='unknown')!.moneyAfter,null);
});
test('unknown shop is not a known empty shop and requests only its visible offers',()=>{
 const s=state(),shop=snapshot();s.observed.shop={status:'unknown',reason:'No transcrita'};const r=evaluateShopContext(s,shop);assert.equal(r.recommendation.status,'abstain');assert.match(r.recommendation.title,/ofertas visibles.*precios/);
});
test('a supported current-format voucher uses actual H2 price, and advice is a reserve tradeoff',()=>{
 const s=state(40),shop=snapshot();shop.vouchers=[{offerId:'seed',catalogId:'v_seed_money',price:10}];const before=structuredClone(s),r=evaluateShopContext(s,shop);assert.equal(r.options[1]!.coverage,'modeled');assert.deepEqual(r.recommendation.offerIds,['hold','seed']);assert.deepEqual([r.options[1]!.economics!.interest.before,r.options[1]!.economics!.interest.after],[5,6]);assert.deepEqual(s,before);
 shop.vouchers[0]!.price=0;const unsupported=evaluateShopContext(s,shop);assert.equal(unsupported.recommendation.status,'abstain');assert.equal(unsupported.options[1]!.coverage,'limited');assert.match(unsupported.options[1]!.limitations.join(' '),/precio base/);
});
