import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import type {GameState,JokerInstance} from '../src/state/model.js';
import {evaluateShopContext,validateShopSnapshot} from '../src/advisor/shop-context.js';
import type {ShopSnapshot} from '../src/advisor/shop-context.js';
import {evaluateJokerFit} from '../src/advisor/quick-fit.js';
import {standardDeck} from '../src/catalog/initial.js';
import {VOUCHER_CATALOG} from '../src/catalog/voucher-catalog.js';
import {known} from './helpers.js';
import {migrateState} from '../src/state/migration.js';
import {voucherResources} from '../src/catalog/vouchers.js';

// Literal software oracles: SHOP03–08 and L06 documented before this module.
// These are not observations of a played game or evidence of strategy efficacy.
function fixture(money=25):GameState {
 const migrated=migrateState(JSON.parse(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8')));assert.ok(migrated.ok);const state=migrated.value;
 const totals=voucherResources('blue',[]);state.observed.resources.handsPerRound=known(totals.hands);state.observed.resources.discardsPerRound=known(totals.discards);state.observed.resources.handSize=known(totals.handSize);state.observed.resources.jokerSlots=known(totals.jokerSlots);
 state.assumptions.probes=[];state.assumptions.roundPlans=[];
 state.observed.money=known(money);return state;
}
function shop():ShopSnapshot{return {id:'manual-shop',jokers:[],vouchers:[],packs:[],rerollCost:5};}
function joker(catalogId:string,instanceId=catalogId,sell=1,counters:JokerInstance['counters']={}):JokerInstance {
 return {catalogId,instanceId,edition:known('base'),stickers:known([]),sellValue:known(sell),counters};
}
const offer=(catalogId:string,price:number|null,offerId=catalogId)=>({offerId,catalogId,price,edition:'base',stickers:[] as string[]});
function option(state:GameState,snapshot:ShopSnapshot,id:string){return evaluateShopContext(state,snapshot,{ante:1}).options.find(o=>o.id===id)!;}

test('shop context: literal $25 − $4 = $21 and purchase evaluation never mutate H1 or snapshot',()=>{
 const state=fixture(),snapshot=shop();snapshot.jokers=[offer('abstract_joker',4)];
 const before=structuredClone(state),shopBefore=structuredClone(snapshot),report=evaluateShopContext(state,snapshot,{ante:1});
 const buy=report.options.find(o=>o.id==='abstract_joker')!;
 assert.equal(buy.moneyAfter,21);assert.equal(buy.affordability,'affordable');
 assert.equal(buy.fit?.purchase.status,'legal');assert.equal(buy.fit?.purchase.netCost,4);
 assert.deepEqual(state,before);assert.deepEqual(snapshot,shopBefore);assert.equal(report.exhaustive,false);
});

test('shop context: empty known inventory can consider ready Joker at index 80',()=>{
 const state=fixture(),snapshot=shop();snapshot.jokers=[offer('joker',2,'basic')];
 const report=evaluateShopContext(state,snapshot,{ante:1}),buy=report.options.find(o=>o.id==='basic')!;
 assert.equal(buy.fit?.score,80);assert.equal(buy.fit?.readiness,'ready');
 assert.equal(report.recommendation.status,'conditional');assert.deepEqual(report.recommendation.offerIds,['basic']);
});

test('shop context: zero Steel cards cannot become a useful Steel Joker by purchasing it',()=>{
 const state=fixture(),snapshot=shop();snapshot.jokers=[offer('steel_joker',7,'steel')];
 const report=evaluateShopContext(state,snapshot,{ante:4}),buy=report.options.find(o=>o.id==='steel')!;
 assert.equal(buy.fit?.readiness,'unavailable');assert.equal(buy.fit?.score,20);
 assert.deepEqual(report.recommendation.offerIds,['hold']);assert.match(report.recommendation.title,/Ahorra/);
});

test('shop context: an existing role does not negate another prepared scoring effect',()=>{
 const state=fixture(),snapshot=shop();state.observed.jokers=known([joker('joker','owned-basic')]);
 snapshot.jokers=[offer('joker',2,'second-basic')];
 const report=evaluateShopContext(state,snapshot,{ante:1});
 assert.equal(report.options.find(o=>o.id==='second-basic')?.fit?.score,70);
 assert.deepEqual(report.recommendation.offerIds,['second-basic']);
 assert.match(report.recommendation.reasons.join(' '),/ya tengas ese rol/);
});

test('shop context: prepared distinct roles stay incomparable, even with unequal index and price',()=>{
 const state=fixture(),snapshot=shop();snapshot.jokers=[offer('joker',2,'mult'),offer('stuntman',7,'chips')];
 const report=evaluateShopContext(state,snapshot,{ante:1});
 assert.equal(report.recommendation.status,'tie');assert.deepEqual(report.recommendation.offerIds,['mult','chips']);
 assert.equal('global' in report,false);assert.equal('delta' in report,false);
});

test('shop context: real discounted price is retained; H2 unsupported_price is unknown, not successful or illegal',()=>{
 const state=fixture(),snapshot=shop();snapshot.jokers=[offer('joker',1,'discounted')];
 const buy=option(state,snapshot,'discounted');
 assert.equal(buy.price,1);assert.equal(buy.moneyAfter,24);assert.equal(buy.affordability,'affordable');
 assert.equal(buy.fit?.purchase.status,'unknown');assert.equal(buy.fit?.purchase.moneyAfter,undefined);
 assert.ok(buy.fit?.purchase.errors.some(e=>e.code==='unsupported_price'));assert.equal(buy.coverage,'limited');
});

test('shop context: actual price arithmetic feeds a known balance condition without certifying H2',()=>{
 const state=fixture(10),snapshot=shop();snapshot.jokers=[offer('vagabond',6,'vagabond')];
 const buy=option(state,snapshot,'vagabond');
 assert.equal(buy.moneyAfter,4);assert.equal(buy.fit?.purchase.status,'unknown');
 assert.equal(buy.fit?.readiness,'potential');assert.match(buy.reasons.join(' '),/Saldo \$4 cumple/);
 assert.equal(buy.fit?.purchase.moneyAfter,undefined);
});

test('quick fit observed offer: uses actual edition and sticker, without replacing legacy defaults',()=>{
 const state=fixture(25);
 const foil=evaluateJokerFit(state,'joker',{ante:1,purchase:true,offer:{price:known(4),edition:known('foil'),stickers:known(['eternal'])}});
 assert.equal(foil.purchase.status,'legal');assert.equal(foil.purchase.moneyAfter,21);
 const rental=evaluateJokerFit(state,'joker',{ante:1,purchase:true,offer:{price:known(2),edition:known('base'),stickers:known(['rental'])}});
 assert.equal(rental.purchase.status,'unknown');assert.ok(rental.purchase.errors.some(e=>e.code==='unsupported_modifier'));
 const legacy=evaluateJokerFit(state,'joker',{ante:1,purchase:true});
 assert.equal(legacy.purchase.status,'legal');assert.equal(legacy.purchase.moneyAfter,23);
});

test('shop context: selected replacement sells actual value; unsupported value is not normalized',()=>{
 const state=fixture(),snapshot=shop();state.observed.jokers=known([joker('joker','sell-target',4)]);
 snapshot.jokers=[{...offer('stuntman',7,'replacement'),replacementId:'sell-target'}];
 const buy=option(state,snapshot,'replacement');
 assert.equal(buy.moneyAfter,22);assert.equal(buy.fit?.purchase.status,'unknown');
 assert.ok(buy.fit?.purchase.errors.some(e=>e.code==='unsupported_price'));assert.match(buy.reasons.join(' '),/\$4 de venta/);
});

test('shop context: Eternal replacement is blocked and no sale money is invented',()=>{
 const state=fixture(),snapshot=shop(),eternal=joker('joker','eternal');eternal.stickers=known(['eternal']);
 state.observed.jokers=known([eternal]);snapshot.jokers=[{...offer('stuntman',7,'replacement'),replacementId:'eternal'}];
 const report=evaluateShopContext(state,snapshot,{ante:1}),buy=report.options.find(o=>o.id==='replacement')!;
 assert.equal(buy.fit?.purchase.status,'illegal');assert.equal(buy.moneyAfter,null);
 assert.ok(buy.fit?.purchase.errors.some(e=>e.code==='eternal_joker'));assert.deepEqual(report.recommendation.offerIds,['hold']);
});

test('shop context: a developed counter is a replacement sacrifice, not an automatic veto',()=>{
 const state=fixture(),snapshot=shop();state.observed.jokers=known([joker('green_joker','developed',2,{greenMult:known(20)})]);
 snapshot.jokers=[{...offer('stuntman',7,'replacement'),replacementId:'developed'}];
 const report=evaluateShopContext(state,snapshot,{ante:1}),buy=report.options.find(o=>o.id==='replacement')!;
 assert.equal(buy.moneyAfter,20);assert.match(buy.reasons.join(' '),/greenMult=20/);
 assert.match(buy.reasons.join(' '),/Conserva el desarrollo/);assert.deepEqual(report.recommendation.offerIds,['hold','replacement']);assert.equal(report.recommendation.status,'tie');
 assert.equal(state.observed.jokers.status==='known'&&state.observed.jokers.value[0]?.counters.greenMult?.status,'known');
});

test('shop context: cash affordability honors Credit Card debt and removing its credit line',()=>{
 const state=fixture(0),snapshot=shop();state.observed.jokers=known([joker('credit_card','credit')]);
 snapshot.jokers=[offer('joker',20,'at-limit'),offer('joker',21,'over-limit')];
 const report=evaluateShopContext(state,snapshot,{ante:1});
 assert.equal(report.options.find(o=>o.id==='at-limit')?.moneyAfter,-20);
 assert.equal(report.options.find(o=>o.id==='at-limit')?.affordability,'affordable');
 assert.equal(report.options.find(o=>o.id==='over-limit')?.affordability,'unaffordable');
 snapshot.jokers=[{...offer('joker',2,'sell-credit'),replacementId:'credit'}];
 assert.equal(option(state,snapshot,'sell-credit').moneyAfter,-1);assert.equal(option(state,snapshot,'sell-credit').affordability,'unaffordable');
});

test('shop context: unknown money, material and inventory remain unknown and cause abstention',()=>{
 for(const field of ['money','deck','jokers'] as const){
  const state=fixture(),snapshot=shop();state.observed[field]={status:'unknown',reason:'No transcrito'};
  snapshot.jokers=[offer(field==='deck'?'steel_joker':'joker',field==='deck'?7:2,'uncertain')];
  const report=evaluateShopContext(state,snapshot,{ante:4});assert.equal(report.recommendation.status,'abstain');
  if(field==='money')assert.equal(report.options.find(o=>o.id==='uncertain')?.moneyAfter,null);
  else assert.equal(report.options.find(o=>o.id==='uncertain')?.fit?.score,null);
 }
 const state=fixture(),snapshot=shop();snapshot.jokers=[offer('joker',null,'unknown-price')];
 const report=evaluateShopContext(state,snapshot,{ante:1});assert.equal(report.recommendation.status,'abstain');
 assert.equal(report.options.find(o=>o.id==='unknown-price')?.price,null);
});

test('shop context: selected replacement is never chosen automatically to resolve a full inventory',()=>{
 const state=fixture(),snapshot=shop();state.observed.jokers=known(Array.from({length:5},(_,i)=>joker('joker',`owned-${i}`)));
 snapshot.jokers=[offer('stuntman',7,'new-chips')];
 const report=evaluateShopContext(state,snapshot,{ante:1});
 assert.ok(report.options.find(o=>o.id==='new-chips')?.fit?.purchase.errors.some(e=>e.code==='no_slots'));
 assert.deepEqual(report.recommendation.offerIds,['hold']);assert.equal(report.options.filter(o=>o.kind==='joker').length,1);
});

test('shop context: voucher prerequisites and already acquired offers are checked separately from price',()=>{
 const state=fixture(),snapshot=shop();snapshot.vouchers=[{offerId:'upgrade',catalogId:'v_nacho_tong',price:10}];
 const missing=option(state,snapshot,'upgrade');assert.match(missing.reasons.join(' '),/v_grabber/);assert.equal(missing.resourceChanges,undefined);
 state.observed.outOfScope=known({vouchers:['v_grabber'],consumables:[],pendingTags:[],otherModifiers:[]});
 state.observed.resources.handsPerRound=known(6);
 const valid=option(state,snapshot,'upgrade');assert.equal(valid.resourceChanges?.handsPerRound,7);assert.equal(valid.moneyAfter,15);
 snapshot.vouchers=[{offerId:'owned',catalogId:'v_grabber',price:10}];
 const existing=option(state,snapshot,'owned');assert.match(existing.reasons.join(' '),/ya está adquirido/);assert.equal(existing.resourceChanges,undefined);
});

test('shop context: all 32 voucher descriptions are evaluated, exactly 10 effects have resource projections',()=>{
 let projections=0;
 for(const voucher of VOUCHER_CATALOG){
  const state=fixture(70),snapshot=shop();
  state.observed.outOfScope=known({vouchers:[...voucher.requires],consumables:[],pendingTags:[],otherModifiers:[]});
  const totals=voucherResources('blue',voucher.requires);state.observed.resources.handsPerRound=known(totals.hands);state.observed.resources.discardsPerRound=known(totals.discards);state.observed.resources.handSize=known(totals.handSize);state.observed.resources.jokerSlots=known(totals.jokerSlots);
  snapshot.vouchers=[{offerId:voucher.id,catalogId:voucher.id,price:10}];
  const evaluated=option(state,snapshot,voucher.id);
  assert.equal(evaluated.title,voucher.name);assert.equal(evaluated.moneyAfter,60);assert.equal(evaluated.fit,undefined);
  if(evaluated.resourceChanges){projections++;assert.equal(evaluated.coverage,'modeled');}
  else {assert.equal(evaluated.coverage,'limited');assert.match(evaluated.limitations.join(' '),/sin integración/);}
 }
 assert.equal(projections,10);
});

test('shop context: Seed Money changes a cap without creating cash and Green cannot receive interest',()=>{
 const state=fixture(20),snapshot=shop();snapshot.vouchers=[{offerId:'seed',catalogId:'v_seed_money',price:10}];
 const report=evaluateShopContext(state,snapshot,{ante:1}),seed=report.options.find(o=>o.id==='seed')!;
 assert.equal(seed.moneyAfter,10);assert.equal(seed.resourceChanges?.interestCap,10);assert.deepEqual(report.recommendation.offerIds,['hold']);
 assert.equal(state.observed.money.status==='known'&&state.observed.money.value,20);
 state.observed.deckId=known('green');assert.equal(option(state,snapshot,'seed').resourceChanges?.interestCap,0);
});

test('shop context: a free observed interest voucher keeps its cap projection without certifying an unsupported purchase',()=>{
 const seedShop=shop();seedShop.vouchers=[{offerId:'seed',catalogId:'v_seed_money',price:0}];
 const at26=fixture(26),at30=fixture(30);
 const belowBand=evaluateShopContext(at26,seedShop,{ante:1}),firstBand=evaluateShopContext(at30,seedShop,{ante:1});
 // floor(26/5)=5: the ordinary $5 cap already covers this balance.
 assert.equal(belowBand.recommendation.status,'abstain');
 assert.equal(belowBand.options.find(o=>o.id==='seed')?.moneyAfter,26);
 assert.equal(belowBand.options.find(o=>o.id==='seed')?.resourceChanges?.interestCap,10);
 // floor(30/5)=6: Seed permits an extra dollar only at a future eligible cashout.
 assert.deepEqual(firstBand.recommendation.offerIds,['seed']);assert.equal(firstBand.recommendation.status,'abstain');
 assert.match(firstBand.options.find(o=>o.id==='seed')!.limitations.join(' '),/precio base/);
 assert.equal(firstBand.options.find(o=>o.id==='seed')?.moneyAfter,30);
 assert.deepEqual(firstBand.options.find(o=>o.id==='seed')?.resourceChanges,{interestCap:10});
 assert.equal(at30.observed.money.status==='known'&&at30.observed.money.value,30);
 const treeShop=shop();treeShop.vouchers=[{offerId:'tree',catalogId:'v_money_tree',price:0}];
 for(const balance of [54,55]){
  const state=fixture(balance);state.observed.outOfScope=known({vouchers:['v_seed_money'],consumables:[],pendingTags:[],otherModifiers:[]});
  const report=evaluateShopContext(state,treeShop,{ante:1});
  assert.equal(report.recommendation.status,'abstain');
  assert.equal(report.options.find(o=>o.id==='tree')?.moneyAfter,balance);
 }
});

test('shop context: 15 closed pack combinations expose literal counts, never cards or score delta',()=>{
 const state=fixture(30),snapshot=shop();
 for(const family of ['arcana','celestial','standard','spectral','buffoon'] as const){
  for(const size of ['normal','jumbo','mega'] as const)snapshot.packs.push({offerId:`${family}-${size}`,family,size,price:size==='normal'?4:size==='jumbo'?6:8});
 }
 const report=evaluateShopContext(state,snapshot,{ante:1}),packs=report.options.filter(o=>o.kind==='pack');
 assert.equal(packs.length,15);
 for(const pack of packs){
  assert.equal(pack.coverage,'unknown');assert.equal(pack.fit,undefined);assert.equal(pack.resourceChanges,undefined);
  assert.equal('cards' in pack,false);assert.equal('delta' in pack,false);
 }
 assert.match(packs.find(p=>p.id==='arcana-mega')!.reasons.join(' '),/muestra 5 cartas.*2 elecciones/);
 assert.match(packs.find(p=>p.id==='spectral-normal')!.reasons.join(' '),/muestra 2 cartas.*1 elecciones/);
});

test('shop context: observed free Celestial stays free and is not extended to Arcana',()=>{
 const state=fixture(),snapshot=shop();state.observed.jokers=known([joker('astronomer','astronomer',4)]);
 snapshot.packs=[{offerId:'celestial',family:'celestial',size:'normal',price:0},{offerId:'arcana',family:'arcana',size:'normal',price:4}];
 const report=evaluateShopContext(state,snapshot,{ante:4});
 assert.equal(report.options.find(o=>o.id==='celestial')?.moneyAfter,25);
 assert.equal(report.options.find(o=>o.id==='arcana')?.moneyAfter,21);
 assert.equal(report.options.find(o=>o.id==='celestial')?.coverage,'unknown');
});

test('shop context: Buffoon with a full inventory explains selection capacity without fabricating Negative',()=>{
 const state=fixture(),snapshot=shop();state.observed.jokers=known(Array.from({length:5},(_,i)=>joker('joker',`owned-${i}`)));
 snapshot.packs=[{offerId:'buffoon',family:'buffoon',size:'mega',price:8}];
 const pack=option(state,snapshot,'buffoon');assert.match(pack.reasons.join(' '),/Inventario lleno.*venta previa/);
 assert.equal(pack.moneyAfter,17);assert.equal(pack.coverage,'unknown');
});

test('shop context: reroll costs current money without predicting new stock or consuming packs and voucher',()=>{
 const state=fixture(10),snapshot=shop();snapshot.rerollCost=3;
 snapshot.packs=[{offerId:'arcana',family:'arcana',size:'normal',price:4}];snapshot.vouchers=[{offerId:'blank',catalogId:'v_blank',price:10}];
 const before=structuredClone(snapshot),report=evaluateShopContext(state,snapshot,{ante:1}),reroll=report.options.find(o=>o.id==='reroll')!;
 assert.equal(reroll.moneyAfter,7);assert.equal(reroll.coverage,'unknown');assert.match(reroll.reasons.join(' '),/posteriores son desconocidas/);
 assert.equal('newOffers' in report,false);assert.deepEqual(snapshot,before);
 snapshot.rerollCost=null;assert.equal(option(state,snapshot,'reroll').moneyAfter,null);
});

test('shop context: an unmodeled future catalog ID preserves uncertainty instead of assigning a tier',()=>{
 const state=fixture(),snapshot=shop();snapshot.jokers=[offer('future-joker',2,'future')];
 const report=evaluateShopContext(state,snapshot,{ante:1}),future=report.options.find(o=>o.id==='future')!;
 assert.equal(future.fit?.score,null);assert.equal(future.coverage,'unknown');assert.equal(report.recommendation.status,'abstain');
});

test('shop context: manual other name is raw data, unscored, and can change a buy recommendation',()=>{
 const state=fixture(),snapshot=shop();snapshot.jokers=[offer('joker',2,'buy')];
 snapshot.others=[{offerId:'manual',kind:'tarot',name:'<b>The Fool?</b>',price:3}];
 const report=evaluateShopContext(state,snapshot,{ante:1}),other=report.options.find(o=>o.id==='manual')!;
 assert.equal(other.title,'<b>The Fool?</b>');assert.equal(other.moneyAfter,22);assert.equal(other.fit,undefined);
 assert.equal(other.coverage,'unknown');assert.equal(report.recommendation.status,'abstain');assert.ok(report.recommendation.offerIds.includes('manual'));
});

test('shop context: duplicate IDs across areas, reserved IDs and invalid typed prices are rejected',()=>{
 const snapshot=shop();snapshot.jokers=[offer('joker',2,'repeat')];snapshot.vouchers=[{offerId:'repeat',catalogId:'v_blank',price:10}];
 const duplicate=validateShopSnapshot(snapshot);assert.equal(duplicate.ok,false);if(!duplicate.ok)assert.ok(duplicate.errors.some(e=>e.code==='duplicate_id'));
 const report=evaluateShopContext(fixture(),snapshot);assert.equal(report.recommendation.status,'abstain');assert.equal(report.options.length,0);
 for(const price of [-1,1.5,Number.NaN,Number.MAX_SAFE_INTEGER+1,'4']){
  const invalid={...shop(),jokers:[{...offer('joker',2),price}]} as unknown as ShopSnapshot;
  assert.equal(validateShopSnapshot(invalid).ok,false);
 }
 const reserved=shop();reserved.jokers=[offer('joker',2,'hold')];assert.equal(validateShopSnapshot(reserved).ok,false);
 const valid=validateShopSnapshot(shop());assert.equal(valid.ok,true);
});

test('shop context: a valid supported material synergy uses actual deck composition',()=>{
 const state=fixture(),snapshot=shop();state.observed.jokers=known([joker('hanging_chad','chad',2)]);
 const cards=standardDeck();cards.forEach(c=>c.rank='K');state.observed.deck=known({cards});
 snapshot.jokers=[offer('photograph',5,'photo')];
 const report=evaluateShopContext(state,snapshot,{ante:4}),photo=report.options.find(o=>o.id==='photo')!;
 assert.ok(photo.fit?.signals.some(s=>s.id==='composition-photo-chad'&&s.kind==='potential'));
 assert.equal(report.recommendation.status,'conditional');assert.deepEqual(report.recommendation.offerIds,['photo']);
});

test('shop context: expanded visible stock keeps isolated H2 result but limits shop coverage and preserves snapshot',()=>{
 const state=fixture(),snapshot=shop();
 snapshot.jokers=[offer('joker',2,'ready'),offer('steel_joker',7,'no-steel'),offer('steel_joker',7,'another-no-steel')];
 const before=structuredClone(snapshot),report=evaluateShopContext(state,snapshot,{ante:1});
 const jokers=report.options.filter(o=>o.kind==='joker'),ready=jokers.find(o=>o.id==='ready')!;
 assert.equal(jokers.length,3);assert.ok(jokers.every(o=>o.coverage==='limited'));
 assert.ok(jokers.every(o=>o.limitations.includes('H2 valida la oferta aislada; no certifica esta tienda ampliada ni sus modificadores.')));
 assert.equal(ready.fit?.purchase.status,'legal');assert.equal(ready.moneyAfter,23);
 assert.equal(ready.affordability,'affordable');assert.equal(ready.fit?.score,80);
 assert.equal(report.recommendation.status,'conditional');assert.deepEqual(report.recommendation.offerIds,['ready']);
 assert.deepEqual(snapshot,before);
 snapshot.jokers=[offer('joker',2,'ready')];
 snapshot.others=[{offerId:'tarot',kind:'tarot',name:'Tarot manual',price:99},{offerId:'planet',kind:'planet',name:'Planeta manual',price:99}];
 const mixed=evaluateShopContext(state,snapshot,{ante:1});
 assert.equal(mixed.options.find(o=>o.id==='ready')?.coverage,'limited');
 assert.equal(mixed.recommendation.status,'conditional');
});

test('shop context: strict observed mode keeps price arithmetic and descriptive profiles while abstaining on pending H2 evidence',()=>{
 const state=fixture(),snapshot=shop();snapshot.jokers=[offer('joker',2,'basic')];
 snapshot.packs=[{offerId:'arcana',family:'arcana',size:'normal',price:4}];
 const strict=evaluateShopContext(state,snapshot,{ante:1,requireObserved:true});
 const buy=strict.options.find(o=>o.id==='basic')!,pack=strict.options.find(o=>o.id==='arcana')!;
 assert.equal(strict.recommendation.status,'abstain');assert.equal(buy.fit?.purchase.status,'unknown');
 assert.ok(buy.fit?.purchase.errors.some(e=>e.code==='pending_rule'));
 assert.equal(buy.price,2);assert.equal(buy.moneyAfter,23);assert.equal(buy.affordability,'affordable');
 assert.equal(buy.fit?.score,80);assert.equal(buy.fit?.purchase.moneyAfter,undefined);
 assert.match(buy.limitations.join(' '),/Modo estricto.*observaciones.*heurístico/);
 assert.equal(pack.moneyAfter,21);assert.equal(pack.coverage,'unknown');
 assert.equal(strict.options.find(o=>o.id==='hold')?.moneyAfter,25);
 const provisional=evaluateShopContext(state,snapshot,{ante:1,requireObserved:false});
 assert.equal(provisional.recommendation.status,'conditional');assert.deepEqual(provisional.recommendation.offerIds,['basic']);
 assert.equal(provisional.options.find(o=>o.id==='basic')?.fit?.purchase.status,'legal');
});

test('shop context: strict voucher projections retain factual costs but await observed L06 evidence',()=>{
 const state=fixture(),snapshot=shop();snapshot.vouchers=[{offerId:'grabber',catalogId:'v_grabber',price:10}];
 const strict=evaluateShopContext(state,snapshot,{ante:1,requireObserved:true}),voucher=strict.options.find(o=>o.id==='grabber')!;
 assert.equal(strict.recommendation.status,'abstain');assert.equal(voucher.coverage,'limited');
 assert.equal(voucher.moneyAfter,15);assert.equal(voucher.resourceChanges?.handsPerRound,6);
 assert.match(voucher.limitations.join(' '),/L06.*inspección estática.*sin observación/);
 const provisional=evaluateShopContext(state,snapshot,{ante:1,requireObserved:false});
 assert.equal(provisional.recommendation.status,'tie');assert.deepEqual(provisional.recommendation.offerIds,['hold','grabber']);assert.equal(provisional.options.find(o=>o.id==='grabber')?.coverage,'modeled');
});
