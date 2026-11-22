import assert from 'node:assert/strict';
import test from 'node:test';
import {applyRunProgress} from '../src/run/progress.js';
import type {RunProgressCommand} from '../src/run/progress.js';
import {createNewRun} from '../src/run/start.js';
import {contextWithObservedRerollQuote,observedRerollQuote} from '../src/rules/reroll-quote.js';
import {applyShopAction,freshJokerInstance} from '../src/rules/shop.js';
import {quoteShopPrice} from '../src/rules/shop-pricing.js';
import {applyVoucherPurchase} from '../src/rules/voucher-shop.js';
import type {Fact,GameStateV02} from '../src/state/model.js';
import {createConfirmedStore,analysisBinding} from '../src/storage/confirmed-store.js';
import {createShopSessionStore} from '../src/storage/shop-session.js';
import {MemoryStorage,known,success} from './helpers.js';

const time='2026-11-22T10:00:00Z';
const start=()=>success(createNewRun({runId:'reroll-quote',updatedAt:time,deckId:'red',profileConfirmed:true}));
const mutation=(state:GameStateV02)=>({expectedRevision:state.revision,updatedAt:time});
const options=(state:GameStateV02)=>({...mutation(state),inventory:{unchanged:true as const}});
const advance=(state:GameStateV02,command:RunProgressCommand)=>success(applyRunProgress(state,command,options(state))).state;
function atShop(state=start()){
 return advance(advance(state,{type:'enter_round'}),{type:'record_cashout',amount:50,jokerUpdates:[]});
}
function read<T>(fact:Fact<T>|undefined):T {
 assert.ok(fact?.status==='known');return fact.value;
}
function addShelf(state:GameStateV02){
 const current=state.observed.shop;
 if(current.status==='unknown')state.observed.shop=known({shopId:'observed',cardOffers:[],ignoredOtherOffers:[]});
 return read(state.observed.shop);
}
function buyVoucher(state:GameStateV02,catalogId:string):GameStateV02 {
 addShelf(state).voucherOffers=[{offerId:catalogId,catalogId,price:known(10)}];
 const result=success(applyVoucherPurchase(state,{type:'buy_voucher',offerId:catalogId},mutation(state))).state;
 assert.equal(result.schemaVersion,'0.2');return result;
}

test('cada tienda registrada empieza en $5, solo se renuevan cartas y avanza $1 por uso pagado',()=>{
 const state=atShop(),shelf=addShelf(state);
 shelf.voucherOffers=[{offerId:'v',catalogId:'v_blank',price:known(10)}];
 shelf.packOffers=[{offerId:'p',catalogId:'buffoon-normal',price:known(0),couponed:true}];
 shelf.pricingTags=['tag_coupon'];
 shelf.cardOffers=[{offerId:'j',catalogId:'joker',label:'Joker',kind:'joker',price:known(0),edition:known('base'),stickers:known([]),couponed:true}];
 const before=structuredClone(state);
 assert.equal(observedRerollQuote(state),5);
 const first=advance(state,{type:'record_reroll'});
 assert.equal(read(first.observed.money),49);assert.equal(observedRerollQuote(first),6);
 assert.equal(read(first.observed.shop).shopId,shelf.shopId);
 assert.deepEqual(read(first.observed.shop).cardOffers,[]);
 assert.deepEqual(read(first.observed.shop).pricingTags,[]);
 assert.deepEqual(read(first.observed.shop).voucherOffers,shelf.voucherOffers);
 assert.deepEqual(read(first.observed.shop).packOffers,shelf.packOffers);
 assert.deepEqual(state,before);
 const second=advance(first,{type:'record_reroll'});
 assert.equal(observedRerollQuote(second),7);assert.equal(read(second.observed.money),43);
 assert.equal(observedRerollQuote(atShop(advance(second,{type:'leave_shop'}))),5);
});

test('Chaos acumula usos por copia física, Flash crece y el precio pagado permanece igual hasta agotar gratis',()=>{
 const state=start();state.observed.jokers=known([freshJokerInstance('chaos','a'),freshJokerInstance('chaos','b'),freshJokerInstance('blueprint','bp'),freshJokerInstance('flash','flash')]);
 let shop=atShop(state);
 for(const free of [1,0]){
  assert.equal(observedRerollQuote(shop),0);
  shop=advance(shop,{type:'record_reroll'});
  assert.equal(read(read(shop.observed.jokerContext).freeRerolls),free);
  assert.equal(read(shop.observed.money),54);
 }
 assert.equal(read(read(shop.observed.jokers).find(joker=>joker.catalogId==='flash')!.counters.mult),4);
 assert.equal(observedRerollQuote(shop),5);
});

test('comprar y vender Chaos ajusta los usos de esta tienda; ambos vales bajan la base y el precio actual',()=>{
 let shop=atShop();
 shop=buyVoucher(shop,'v_reroll_surplus');assert.equal(observedRerollQuote(shop),3);
 shop=buyVoucher(shop,'v_reroll_glut');assert.equal(observedRerollQuote(shop),1);
 addShelf(shop).cardOffers=[{offerId:'chaos',catalogId:'chaos',label:'Chaos',kind:'joker',price:quoteShopPrice(shop,{kind:'joker',catalogId:'chaos'}).price,edition:known('base'),stickers:known([])}];
 let changed=success(applyShopAction(shop,{type:'buy',offerId:'chaos',instanceId:'owned-chaos'},mutation(shop))).state;
 assert.equal(changed.schemaVersion,'0.2');assert.equal(observedRerollQuote(changed),0);
 changed=success(applyShopAction(changed,{type:'sell',instanceId:'owned-chaos'},{expectedRevision:changed.revision,updatedAt:time})).state;
 assert.equal(observedRerollQuote(changed),1);
});

test('D6 consume una copia por tienda y ganar un vale durante D6 deja intacto el incremento nominal',()=>{
 const state=start();
 read(state.observed.jokerContext).tags=known(['tag_d_six','tag_d_six']);
 read(state.observed.outOfScope).vouchers=['v_reroll_surplus'];
 let shop=atShop(state);
 assert.deepEqual(read(read(shop.observed.jokerContext).tags),['tag_d_six']);
 assert.deepEqual(read(shop.observed.shop).pricingTags,['tag_d_six']);
 assert.equal(observedRerollQuote(shop),0);
 const memory=new MemoryStorage(),confirmed=createConfirmedStore(()=>memory);
 success(confirmed.initialize(shop));
 const observedStore=createShopSessionStore(()=>memory);
 const observed=success(observedStore.observeJokerOffers({confirmationId:'offers',confirmed:true,expected:analysisBinding(shop),updatedAt:time,
  shopId:read(shop.observed.shop).shopId,offers:[],pricingTags:['tag_d_six'],ignoredOtherOffers:[]})).state;
 assert.equal(observed.schemaVersion,'0.2');shop=observed;
 for(const quote of [1,2,3]){
  shop=advance(shop,{type:'record_reroll'});assert.equal(observedRerollQuote(shop),quote);
 }
 shop=buyVoucher(shop,'v_reroll_glut');assert.equal(observedRerollQuote(shop),1);
 const before=read(shop.observed.money);
 shop=advance(shop,{type:'record_reroll'});assert.equal(read(shop.observed.money),before-1);assert.equal(observedRerollQuote(shop),4);
 shop=atShop(advance(shop,{type:'leave_shop'}));assert.equal(observedRerollQuote(shop),0);assert.deepEqual(read(read(shop.observed.jokerContext).tags),[]);
 assert.equal(observedRerollQuote(atShop(advance(shop,{type:'leave_shop'}))),1);
});

test('el guardado antiguo al inicio puede recuperar el precio, pero una renovación ambigua pide saldo observado',()=>{
 const old=atShop();addShelf(old);
 const context=read(old.observed.jokerContext);
 delete context.rerollCost;delete context.freeRerolls;delete context.visibleRerollCost;
 assert.equal(observedRerollQuote(old),5);
 context.rerollCost={status:'unknown',reason:'Precio anterior no registrado.'};
 assert.equal(observedRerollQuote(old),null);
 const unknown=applyRunProgress(old,{type:'record_reroll'},options(old));
 assert.ok(!unknown.ok);assert.equal(unknown.errors[0]!.code,'unknown_data');
 const recovered=advance(old,{type:'record_reroll',money:38,nextPrice:9});
 assert.equal(read(recovered.observed.money),38);assert.equal(observedRerollQuote(recovered),9);
 assert.equal(observedRerollQuote(advance(recovered,{type:'record_reroll'})),10);
 const fixed=atShop();fixed.observed.jokerContext=known(contextWithObservedRerollQuote(fixed,0));
 assert.equal(observedRerollQuote(fixed),0);assert.equal(read(fixed.observed.jokerContext).freeRerolls?.status,'unknown');
});

test('una renovación de $0 funciona en deuda y Credit Card permite pagar hasta su límite',()=>{
 const state=start();state.observed.jokers=known([freshJokerInstance('chaos','free'),freshJokerInstance('credit_card','credit')]);
 let shop=atShop(state);shop.observed.money=known(-15);
 shop=advance(shop,{type:'record_reroll'});assert.equal(read(shop.observed.money),-15);
 shop=advance(shop,{type:'record_reroll'});assert.equal(read(shop.observed.money),-20);
 const blocked=applyRunProgress(shop,{type:'record_reroll'},options(shop));
 assert.ok(!blocked.ok);assert.equal(blocked.errors[0]!.code,'insufficient_money');
});
