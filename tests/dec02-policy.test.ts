import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createNewRun} from '../src/run/start.js';
import {freshJokerInstance} from '../src/rules/shop.js';
import {evaluateShopContext} from '../src/advisor/shop-context.js';
import type {ShopSnapshot} from '../src/advisor/shop-context.js';
import {comparePreparedOffers} from '../src/advisor/shop-comparison.js';
import {inspectShopDecision} from '../src/advisor/decision.js';
import {buildShopAdviceSummary} from '../src/ui/shop-advice-summary.js';
import type {GameState} from '../src/state/model.js';
import {known,success} from './helpers.js';

// Contract safeguards, not new gameplay observations or an optimum oracle.
// Expected costs and own Mult are literals: 25-2=23, 25-4=21; Joker+4,
// Abstract3 with one physical joker /6 with two. No engine output is an expected.
function fixture(money=25){
 const state=success(createNewRun({runId:'dec02-policy',updatedAt:'2026-11-01T12:00:00Z',deckId:'blue',profileConfirmed:true}));
 state.phase='shop';state.phaseData={origin:known({ante:1,kind:'small'})};state.observed.money=known(money);
 state.observed.shop=known({shopId:'visible',cardOffers:[],voucherOffers:[],packOffers:[],ignoredOtherOffers:[]});return state;
}
const offer=(catalogId:string,price:number,offerId=catalogId)=>({offerId,catalogId,price,edition:'base',stickers:[] as string[]});
const pair=():ShopSnapshot=>({id:'visible',jokers:[offer('joker',2),offer('abstract_joker',4,'abstract')],vouchers:[],packs:[],rerollCost:5});
function recorded(state:ReturnType<typeof fixture>,shop:ShopSnapshot){
 state.observed.shop=known({shopId:shop.id,cardOffers:[
  ...shop.jokers.map(o=>({offerId:o.offerId,catalogId:o.catalogId,label:o.catalogId,kind:'joker' as const,price:known(o.price!),edition:known(o.edition),stickers:known(o.stickers)})),
  ...(shop.others??[]).map(o=>({offerId:o.offerId,catalogId:'unmodeled:'+o.offerId,label:o.name,kind:'unsupported' as const,price:known(o.price!),edition:known('base'),stickers:known([])}))
 ],voucherOffers:shop.vouchers.map(o=>({offerId:o.offerId,catalogId:o.catalogId,price:known(o.price!)})),packOffers:shop.packs.map(o=>({offerId:o.offerId,catalogId:o.family+'-'+o.size,price:known(o.price!)})),ignoredOtherOffers:[]});
}

test('DEC02 safe current-component preference keeps literal costs and future limitations visible',()=>{
 const state=fixture(),shop=pair();recorded(state,shop);const before=structuredClone({state,shop});
 const r=evaluateShopContext(state,shop),comparison=r.comparisons?.[0];assert.ok(comparison);
 assert.equal(r.policy,'quick-shop-3');assert.equal(r.recommendation.status,'conditional');assert.deepEqual(r.recommendation.offerIds,['joker']);
 assert.deepEqual(comparison.values,{preferredMult:4,otherMult:3,preferredNetCost:2,otherNetCost:4});
 assert.equal(comparison.preferredId,'joker');assert.equal(comparison.otherId,'abstract');
 assert.equal(r.options.find(o=>o.id==='joker')?.moneyAfter,23);assert.equal(r.options.find(o=>o.id==='abstract')?.moneyAfter,21);
 assert.match(comparison.conditions.join(' '),/inventario actual vacío/);assert.match(comparison.conditions.join(' '),/Abstract puede aportar más/);
 assert.match(comparison.conditions.join(' '),/no acredita puntuación total, supervivencia/);assert.equal(r.exhaustive,false);
 const summary=buildShopAdviceSummary(success(inspectShopDecision(state,shop)));assert.match(summary.benefit!,/\+4.*\$2.*\+3.*\$4/);
 assert.deepEqual({state,shop},before);
});

test('DEC02 +6 Mult for4 and +4 for2 remain a real tradeoff with an existing Joker',()=>{
 const state=fixture(),shop=pair();state.observed.jokers=known([freshJokerInstance('joker','retained')]);
 const r=evaluateShopContext(state,shop);assert.deepEqual(r.comparisons,[]);assert.equal(r.recommendation.status,'tie');assert.deepEqual(r.recommendation.offerIds,['joker','abstract']);
 assert.equal(r.options.find(o=>o.id==='abstract')?.findings?.find(f=>f.ruleId==='S-ADDITIONAL-SCORING')?.values?.ownMult,6);
 assert.equal(r.options.find(o=>o.id==='joker')?.findings?.find(f=>f.ruleId==='S-ADDITIONAL-SCORING')?.values?.ownMult,4);
 assert.equal(r.options.find(o=>o.id==='joker')?.moneyAfter,23);assert.equal(r.options.find(o=>o.id==='abstract')?.moneyAfter,21);
});

test('DEC02 comparison excludes retained sell-value/copy effects, editions, stickers, replacement and unsupported discounts',()=>{
 for(const catalogId of ['swashbuckler','blueprint','brainstorm']){const s=fixture();s.observed.jokers=known([freshJokerInstance(catalogId,'retained')]);assert.deepEqual(evaluateShopContext(s,pair()).comparisons,[],catalogId);}
 const foil=pair();foil.jokers.forEach((o,index)=>{o.edition='foil';o.price=index?6:4;});
 const eternal=pair();eternal.jokers.forEach(o=>{o.stickers=['eternal'];});
 for(const shop of [foil,eternal]){const r=evaluateShopContext(fixture(),shop);assert.ok(r.options.filter(o=>o.kind==='joker').every(o=>o.fit?.purchase.status==='legal'));assert.deepEqual(r.comparisons,[]);}
 const replaced=fixture(),replacement=pair();replaced.observed.jokers=known([freshJokerInstance('joker','old')]);replacement.jokers=replacement.jokers.map(o=>({...o,replacementId:'old'}));assert.deepEqual(evaluateShopContext(replaced,replacement).comparisons,[]);
 const discounted=pair();discounted.jokers[0]!.price=1;const r=evaluateShopContext(fixture(),discounted);assert.deepEqual(r.comparisons,[]);assert.equal(r.options.find(o=>o.id==='joker')?.fit?.purchase.status,'unknown');
 assert.ok(r.options.find(o=>o.id==='joker')?.fit?.purchase.errors.some(e=>e.code==='unsupported_price'));
});

test('DEC02 identical ordinary offers with Showman do not force a winner or use their order as preference',()=>{
 const state=fixture();state.observed.jokers=known([freshJokerInstance('ring_master','duplicates-allowed')]);
 const shop=pair();shop.jokers=[offer('joker',2,'first'),offer('joker',2,'second')];
 const a=evaluateShopContext(state,shop);shop.jokers.reverse();const b=evaluateShopContext(state,shop);
 assert.deepEqual(a.comparisons,[]);assert.deepEqual(b.comparisons,[]);assert.equal(a.recommendation.status,'tie');assert.equal(b.recommendation.status,'tie');
 assert.deepEqual(new Set(a.recommendation.offerIds),new Set(['first','second']));assert.deepEqual(new Set(b.recommendation.offerIds),new Set(['first','second']));
});

test('DEC02 returned comparisons own their values and conditions, without editing supplied options',()=>{
 const state=fixture(),shop=pair(),r=evaluateShopContext(state,shop),before=structuredClone({state,shop,options:r.options});
 const first=comparePreparedOffers(state,shop,r.options);assert.equal(first.length,1);first[0]!.values.preferredMult=999;first[0]!.conditions[0]='mutated result';
 const second=comparePreparedOffers(state,shop,r.options);assert.equal(second[0]!.values.preferredMult,4);assert.notEqual(second[0]!.conditions[0],'mutated result');
 assert.deepEqual({state,shop,options:r.options},before);
});

test('DEC02 manual unknown article keeps its observed3 price and22 balance beside the conditional known purchase',()=>{
 const state=fixture(),shop=pair();shop.jokers=[offer('joker',2)];shop.others=[{offerId:'manual',kind:'tarot',name:'The Fool',price:3}];recorded(state,shop);
 const before=structuredClone({state,shop}),r=evaluateShopContext(state,shop),pending=r.options.find(o=>o.id==='manual')!;
 assert.equal(r.recommendation.status,'conditional');assert.deepEqual(r.recommendation.offerIds,['joker']);assert.equal(r.recommendation.scope,'evaluated-options');assert.deepEqual(r.recommendation.pendingOfferIds,['manual']);
 assert.equal(pending.price,3);assert.equal(pending.moneyAfter,22);assert.equal(pending.coverage,'unknown');assert.equal(r.options.filter(o=>o.id==='manual').length,1);
 const d=success(inspectShopDecision(state,shop)),summary=buildShopAdviceSummary(d);assert.match(summary.title,/Entre lo evaluado/);assert.match(summary.scope,/Comparación parcial/);assert.match(summary.pending!,/sin evaluar.*podría cambiar/);
 assert.ok(d.actions.every(a=>a.optionId!=='manual'));assert.deepEqual({state,shop},before);
});

test('DEC02 omitted saved competitors survive only for the same shop and represented IDs appear once',()=>{
 const state=fixture(),shop=pair();shop.jokers=[offer('joker',2)];recorded(state,shop);assert.equal(state.observed.shop.status,'known');
 if(state.observed.shop.status!=='known')return;state.observed.shop.value.cardOffers.push({offerId:'saved-other',catalogId:'c_unmodeled',label:'Observed unknown card',kind:'unsupported',price:known(3),edition:known('base'),stickers:known([])});
 const r=evaluateShopContext(state,shop);assert.equal(r.recommendation.status,'conditional');assert.deepEqual(r.recommendation.offerIds,['joker']);assert.deepEqual(r.recommendation.pendingOfferIds,['saved-other']);
 assert.equal(r.options.find(o=>o.id==='saved-other')?.price,3);assert.equal(r.options.find(o=>o.id==='saved-other')?.moneyAfter,22);assert.equal(r.options.filter(o=>o.id==='joker').length,1);
 const foreign=structuredClone(shop);foreign.id='different-shop';const other=evaluateShopContext(state,foreign);assert.ok(!other.options.some(o=>o.id==='saved-other'));assert.deepEqual(other.recommendation.pendingOfferIds,[]);
 const decision=success(inspectShopDecision(state,foreign));assert.ok(decision.actions.find(a=>a.optionId==='joker')?.errors.some(e=>e.code==='unrecorded_offer'));
});

test('DEC02 unknown-only advice abstains and unmodeled voucher/closed pack keep a partial known comparison',()=>{
 const state=fixture(),unknown=pair();unknown.jokers=[];unknown.others=[{offerId:'unknown',kind:'tarot',name:'Observed Tarot',price:3}];
 const a=evaluateShopContext(state,unknown);assert.equal(a.recommendation.status,'abstain');assert.deepEqual(a.comparisons,[]);assert.deepEqual(a.recommendation.pendingOfferIds,['unknown']);
 const shop=pair();shop.vouchers=[{offerId:'voucher',catalogId:'v_overstock_norm',price:10}];shop.packs=[{offerId:'pack',family:'arcana',size:'normal',price:4}];
 const r=evaluateShopContext(state,shop);assert.deepEqual(r.recommendation.offerIds,['joker']);assert.equal(r.recommendation.scope,'evaluated-options');
 for(const id of ['voucher','pack']){assert.ok(r.recommendation.pendingOfferIds?.includes(id));assert.ok(r.options.find(o=>o.id===id)!.limitations.length>0);}
 assert.equal(r.options.find(o=>o.id==='pack')?.coverage,'unknown');assert.match(r.options.find(o=>o.id==='pack')!.limitations.join(' '),/No se simula contenido/);
});

test('DEC02 strict evidence gate blocks comparison and certification while retaining supplied facts',()=>{
 const state=fixture(),shop=pair();recorded(state,shop);const before=structuredClone({state,shop});
 const r=evaluateShopContext(state,shop,{requireObserved:true});assert.deepEqual(r.comparisons,[]);assert.equal(r.recommendation.status,'abstain');
 for(const o of r.options.filter(o=>o.kind==='joker')){assert.notEqual(o.fit?.purchase.status,'legal');assert.ok(o.fit?.purchase.errors.some(e=>e.code==='pending_rule'));}
 const decision=success(inspectShopDecision(state,shop,{requireObserved:true}));for(const a of decision.actions.filter(a=>a.optionId!=='hold')){assert.equal(a.status,'pending_evidence');assert.equal(a.confirmation,'unavailable');}
 assert.deepEqual({state,shop},before);
});

const bank=JSON.parse(readFileSync(new URL('../../evaluation/fixtures/dec02-development.json',import.meta.url),'utf8')) as {cases:{id:string;state:GameState;snapshot:ShopSnapshot}[]};
test('DEC02 full Riff-Raff replacement stays conditional on occupancy and preserves future benefit as a sacrifice',()=>{
 const c=bank.cases.find(c=>c.id==='DEC02-03')!;const before=structuredClone(c),r=evaluateShopContext(c.state,c.snapshot),buy=r.options.find(o=>o.id==='abstract')!;
 assert.equal(r.recommendation.status,'tie');assert.deepEqual(r.recommendation.offerIds,['hold','abstract']);assert.equal(buy.moneyAfter,19);assert.equal(buy.fit?.purchase.netCost,1);
 const loss=buy.findings?.find(f=>f.ruleId==='S-GENERATION-LOSS');assert.ok(loss);assert.deepEqual(loss.values,{occupied:5,slots:5,unit:'joker-slots'});
 assert.match(loss.message,/Si esa ocupación se mantiene/);assert.match(loss.message,/generación futura si después liberas espacio/);assert.match(loss.message,/No se crean comodines/);
 assert.match(buy.reasons.join(' '),/No se heredan/);assert.deepEqual(c,before);assert.deepEqual(r.comparisons,[]);
});

test('DEC02 Seed Money is described as a future investment without manufacturing future balance or income',()=>{
 const c=bank.cases.find(c=>c.id==='DEC02-02')!,before=structuredClone(c),r=evaluateShopContext(c.state,c.snapshot),seed=r.options.find(o=>o.id==='seed')!;
 assert.deepEqual(r.recommendation.offerIds,['hold']);assert.equal(seed.moneyAfter,10);assert.equal(seed.resourceChanges?.interestCap,10);
 assert.deepEqual([seed.economics?.interest.before,seed.economics?.interest.after,seed.economics?.interest.change],[4,2,-2]);
 const explanation=seed.findings?.find(f=>f.ruleId==='S-FUTURE-INVESTMENT')?.message;assert.ok(explanation);assert.match(explanation,/inversión futura.*saldo útil.*completar una ronda/);assert.match(explanation,/no genera ingresos al comprar/);
 const summary=buildShopAdviceSummary(success(inspectShopDecision(c.state,c.snapshot)));assert.match(summary.benefit!,/\$20/);assert.match(summary.benefit!,/\$10.*no aprovecha el tope/);
 const green=structuredClone(c.state);green.observed.deckId=known('green');green.observed.resources.handsPerRound=known(4);
 const noInterest=evaluateShopContext(green,c.snapshot).options.find(o=>o.id==='seed')!;assert.ok(!noInterest.findings?.some(f=>f.ruleId==='S-FUTURE-INVESTMENT'));assert.match(noInterest.reasons.join(' '),/no cobra intereses.*aunque aumente el saldo/);
 assert.deepEqual(c,before);
});
