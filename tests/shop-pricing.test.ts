import assert from 'node:assert/strict';
import test from 'node:test';
import type {Fact,GameStateV02} from '../src/state/model.js';
import {createNewRun} from '../src/run/start.js';
import {quoteShopPrice,repriceShopOffers} from '../src/rules/shop-pricing.js';
import {applyShopAction,freshJokerInstance} from '../src/rules/shop.js';
import {applyVoucherPurchase} from '../src/rules/voucher-shop.js';
import {growSell} from '../src/rules/economic-jokers.js';
import {known,success} from './helpers.js';

const timestamp='2026-11-11T15:00:00Z';
const missing={status:'unknown',reason:'No observado.'} as const;
function fixture(vouchers:string[]=[]):GameStateV02{
 const state=success(createNewRun({runId:'calculated-shop-prices',updatedAt:timestamp,deckId:'blue',profileConfirmed:true}));
 state.phase='shop';state.phaseData={origin:known({ante:1,kind:'small'})};
 state.observed.money=known(25);
 state.observed.outOfScope=known({vouchers,consumables:[],pendingTags:[],otherModifiers:[]});
 state.observed.shop=known({shopId:'prices',cardOffers:[],voucherOffers:[],packOffers:[],ignoredOtherOffers:[]});
 return state;
}
function number(fact:Fact<number>):number{
 if(fact.status!=='known')assert.fail(fact.reason);
 return fact.value;
}
const quote=(state:GameStateV02,edition='base',stickers:readonly string[]=[],couponed=false)=>quoteShopPrice(state,{kind:'joker',catalogId:'red_card',edition,stickers,couponed});
const buy=(state:GameStateV02)=>applyShopAction(state,{type:'buy',offerId:'red',instanceId:'acquired-red'},{expectedRevision:state.revision,updatedAt:timestamp});
function addRed(state:GameStateV02,price:number,edition='base',stickers:string[]=[],couponed=false):void{
 assert.equal(state.observed.shop.status,'known');
 if(state.observed.shop.status==='known')state.observed.shop.value.cardOffers=[{offerId:'red',catalogId:'red_card',label:'Red Card',kind:'joker',price:known(price),edition:known(edition),stickers:known(stickers),couponed}];
}

// Independent literal oracle: installed 1.0.1o-FULL Card:set_cost,
// .browser-runtime/balatro-api/mods/lovely/game-dump/card.lua:369-383.
// In particular the +0.5 belongs before the voucher multiplier; couponing is
// after sell_cost, and Rental overrides the discounted purchase price.
test('Los precios base y las ediciones usan los importes literales del juego sin mutar la partida',()=>{
 const state=fixture(),before=structuredClone(state);
 for(const [edition,price,sell] of [['base',5,2],['foil',7,3],['holographic',8,4],['polychrome',10,5],['negative',10,5]] as const){
  const result=quote(state,edition);assert.equal(number(result.price),price,edition);assert.equal(number(result.sellValue),sell,edition);
 }
 assert.equal(number(quoteShopPrice(state,{kind:'joker',catalogId:'joker'}).price),2);
 assert.equal(number(quoteShopPrice(state,{kind:'voucher',catalogId:'v_blank'}).price),10);
 for(const [catalogId,price] of [['buffoon-normal',4],['buffoon-jumbo',6],['buffoon-mega',8]] as const)assert.equal(number(quoteShopPrice(state,{kind:'pack',catalogId}).price),price);
 assert.deepEqual(state,before);
});

test('Clearance aplica 25%, Liquidation lo reemplaza por 50% y conserva el redondeo nativo',()=>{
 const clearance=fixture(['v_clearance_sale']),liquidation=fixture(['v_clearance_sale','v_liquidation']);
 // floor(5.5 * .75) is $4, which differs from truncating 5 * .75.
 assert.equal(number(quote(clearance).price),4);assert.equal(number(quote(clearance).sellValue),2);
 assert.equal(number(quote(clearance,'negative').price),7);assert.equal(number(quote(clearance,'negative').sellValue),3);
 assert.equal(number(quote(liquidation).price),2);assert.equal(number(quote(liquidation,'negative').price),5);
 for(const [state,voucher,normal,jumbo,mega] of [[clearance,7,3,4,6],[liquidation,5,2,3,4]] as const){
  assert.equal(number(quoteShopPrice(state,{kind:'voucher',catalogId:'v_blank'}).price),voucher);
  for(const [catalogId,price] of [['buffoon-normal',normal],['buffoon-jumbo',jumbo],['buffoon-mega',mega]] as const)assert.equal(number(quoteShopPrice(state,{kind:'pack',catalogId}).price),price);
 }
 assert.equal(number(quoteShopPrice(liquidation,{kind:'joker',catalogId:'credit_card'}).price),1,'A discounted nonfree card keeps the $1 minimum');
});

test('Eterno y perecedero no cobran extra, alquiler fija $1 y el cupón conserva la venta previa',()=>{
 for(const owned of [[],['v_clearance_sale'],['v_clearance_sale','v_liquidation']]){
  const state=fixture(owned),base=number(quote(state,'negative').price);
  assert.equal(number(quote(state,'negative',['eternal','perishable']).price),base);
  const rental=quote(state,'negative',['rental']);assert.equal(number(rental.price),1);assert.equal(number(rental.sellValue),1);
  const freeRental=quote(state,'negative',['rental'],true);assert.equal(number(freeRental.price),0);assert.equal(number(freeRental.sellValue),1);
 }
 const free=quote(fixture(),'base',[],true);assert.equal(number(free.price),0);assert.equal(number(free.sellValue),2,'Couponing is not a zero resale value');
 const discounted=quote(fixture(['v_clearance_sale']),'negative',[],true);assert.equal(number(discounted.price),0);assert.equal(number(discounted.sellValue),3);
 const extra=quoteShopPrice(fixture(),{kind:'joker',catalogId:'egg',extraSell:9});assert.equal(number(extra.price),4);assert.equal(number(extra.sellValue),11);
});

test('Astrónomo físico hace gratis planetas y Celestial, sin abaratar otros sobres o comodines',()=>{
 const state=fixture();state.observed.jokers=known([freshJokerInstance('astronomer','astronomer')]);
 assert.equal(number(quoteShopPrice(state,{kind:'planet',catalogId:'c_mercury'}).price),0);
 for(const catalogId of ['celestial-normal','celestial-jumbo','celestial-mega'])assert.equal(number(quoteShopPrice(state,{kind:'pack',catalogId}).price),0);
 assert.equal(number(quoteShopPrice(state,{kind:'pack',catalogId:'buffoon-normal'}).price),4);
 assert.equal(number(quote(state).price),5);
 state.observed.outOfScope=missing;
 assert.equal(number(quoteShopPrice(state,{kind:'pack',catalogId:'celestial-normal'}).price),0,'Astronomer overrides an unknown discount or inflation amount');
 state.observed.outOfScope=known({vouchers:[],consumables:[],pendingTags:[],otherModifiers:[]});
 state.observed.jokers=known([freshJokerInstance('blueprint','copy')]);
 assert.equal(number(quoteShopPrice(state,{kind:'pack',catalogId:'celestial-normal'}).price),4);
 state.observed.jokers=missing;
 assert.equal(quoteShopPrice(state,{kind:'pack',catalogId:'celestial-normal'}).price.status,'unknown');
 assert.equal(number(quote(state).price),5,'Unknown inventory is irrelevant to a Joker base price');
});

test('No inventa precio cuando faltan modificadores o edición, ni concede gratis por un tag pendiente sin aplicar',()=>{
 const state=fixture();
 for(const request of [{kind:'joker',catalogId:'missing'},{kind:'joker',catalogId:'red_card',edition:'unknown'},{kind:'joker',catalogId:'red_card',stickers:['unknown']}] as const){
  const result=quoteShopPrice(state,request);assert.equal(result.price.status,'unknown');assert.equal(result.sellValue.status,'unknown');
 }
 state.observed.outOfScope=missing;assert.equal(quote(state).price.status,'unknown');
 const explicitlyFree=quote(state,'base',[],true);assert.equal(number(explicitlyFree.price),0);assert.equal(explicitlyFree.sellValue.status,'unknown');
 assert.equal(quoteShopPrice(state,{kind:'voucher',catalogId:'v_blank',couponed:true}).price.status,'unknown','Coupon tags do not make vouchers free');
 const rental=quote(state,'negative',['rental']);assert.equal(number(rental.price),1);assert.equal(number(rental.sellValue),1,'The fixed rental override is independent of unknown voucher prices');
 const freeRental=quote(state,'negative',['rental'],true);assert.equal(number(freeRental.price),0);assert.equal(number(freeRental.sellValue),1);
 state.observed.outOfScope=known({vouchers:[],consumables:[],pendingTags:[],otherModifiers:['inflation']});assert.equal(quote(state).price.status,'unknown');
 state.observed.outOfScope=known({vouchers:[],consumables:[],pendingTags:['tag_coupon'],otherModifiers:[]});
 assert.equal(number(quote(state).price),5,'A pending reward is not proof this specific offer was couponed');
 state.observed.money=missing;assert.equal(number(quote(state).price),5,'A quote does not depend on a known bank balance');
});

test('Recalcular cambia ofertas y venta física sin gastar, crear cartas o alterar la revisión',()=>{
 const state=fixture(['v_clearance_sale']);addRed(state,5,'negative');
 if(state.observed.shop.status==='known'){
  state.observed.shop.value.voucherOffers=[{offerId:'blank',catalogId:'v_blank',price:known(10)}];
  state.observed.shop.value.packOffers=[{offerId:'pack',catalogId:'buffoon-jumbo',price:known(6)},{offerId:'free',catalogId:'buffoon-mega',price:known(0),couponed:true}];
 }
 const egg=freshJokerInstance('egg','egg');egg.counters.extraSell=known(9);state.observed.jokers=known([egg]);
 const before=structuredClone(state);repriceShopOffers(state);
 assert.equal(state.observed.shop.status,'known');assert.equal(state.observed.jokers.status,'known');
 if(state.observed.shop.status==='known'){
  assert.equal(number(state.observed.shop.value.cardOffers[0]!.price),7);
  assert.equal(number(state.observed.shop.value.voucherOffers![0]!.price),7);
  assert.deepEqual(state.observed.shop.value.packOffers!.map(offer=>number(offer.price)),[4,0]);
 }
 if(state.observed.jokers.status==='known')assert.equal(number(state.observed.jokers.value[0]!.sellValue),10);
 assert.deepEqual(state.observed.money,before.observed.money);assert.equal(state.revision,before.revision);assert.equal(state.phase,before.phase);
 assert.deepEqual(state.observed.resources,before.observed.resources);assert.deepEqual(state.observed.deck,before.observed.deck);
});

test('Comprar cobra el precio calculado, conserva la reventa de cupón y rechaza una cifra anterior',()=>{
 const discounted=fixture(['v_clearance_sale']);addRed(discounted,4);
 const before=structuredClone(discounted),after=success(buy(discounted)).state;
 assert.deepEqual(discounted,before);assert.equal(number(after.observed.money),21);
 assert.equal(after.observed.jokers.status,'known');if(after.observed.jokers.status==='known')assert.equal(number(after.observed.jokers.value[0]!.sellValue),2);
 const stale=fixture(['v_clearance_sale']);addRed(stale,5);const rejected=buy(stale);assert.ok(!rejected.ok);assert.equal(rejected.errors[0]!.code,'unsupported_price');assert.equal(number(stale.observed.money),25);
 const coupon=fixture();coupon.observed.money=known(0);addRed(coupon,0,'base',[],true);
 const free=success(buy(coupon)).state;assert.equal(number(free.observed.money),0);
 if(free.observed.jokers.status==='known')assert.equal(number(free.observed.jokers.value[0]!.sellValue),2);
 const rental=fixture(['v_clearance_sale']);addRed(rental,1,'negative',['rental']);
 const rented=success(buy(rental)).state;assert.equal(number(rented.observed.money),24);
 if(rented.observed.jokers.status==='known')assert.deepEqual(rented.observed.jokers.value[0]!.stickers,known(['rental']));
});

test('Comprar Clearance recalcula la tienda, y Liquidation usa su precio con 25% antes de sustituirlo por 50%',()=>{
 const state=fixture();addRed(state,5);
 if(state.observed.shop.status==='known'){
  state.observed.shop.value.voucherOffers=[{offerId:'discount',catalogId:'v_clearance_sale',price:known(10)},{offerId:'next-discount',catalogId:'v_liquidation',price:known(10)}];
  state.observed.shop.value.packOffers=[{offerId:'pack',catalogId:'buffoon-normal',price:known(4)}];
 }
 const before=structuredClone(state),first=success(applyVoucherPurchase(state,{type:'buy_voucher',offerId:'discount'},{expectedRevision:state.revision,updatedAt:timestamp})).state;
 assert.deepEqual(state,before);assert.equal(number(first.observed.money),15);assert.equal(first.revision,state.revision+1);
 if(first.schemaVersion==='0.2'&&first.observed.shop.status==='known'){
  assert.equal(number(first.observed.shop.value.cardOffers[0]!.price),4);
  assert.equal(number(first.observed.shop.value.voucherOffers![0]!.price),7);
  assert.equal(number(first.observed.shop.value.packOffers![0]!.price),3);
 }
 const second=success(applyVoucherPurchase(first,{type:'buy_voucher',offerId:'next-discount'},{expectedRevision:first.revision,updatedAt:timestamp})).state;
 assert.equal(number(second.observed.money),8);assert.equal(second.revision,state.revision+2);
 if(second.schemaVersion==='0.2'&&second.observed.shop.status==='known'){
  assert.equal(number(second.observed.shop.value.cardOffers[0]!.price),2);assert.equal(number(second.observed.shop.value.packOffers![0]!.price),2);
 }
});

test('Las instancias nuevas y el crecimiento de venta conservan edición y descuentos',()=>{
 const clearance=fixture(['v_clearance_sale']);
 assert.equal(number(freshJokerInstance('red_card','new-negative','negative',clearance).sellValue),3,'Negative Red Card costs $7 with Clearance, so resale is $3');
 const liquidation=fixture(['v_clearance_sale','v_liquidation']),gift=freshJokerInstance('gift','foil-gift','foil',liquidation);
 assert.equal(number(gift.sellValue),2,'Foil Gift Card costs $4 with Liquidation, so resale is $2');
 growSell(gift,1,[],liquidation);
 assert.equal(number(gift.sellValue),3);assert.equal(number(gift.counters.extraSell!),1,'Only the actual growth belongs in extraSell');
 liquidation.observed.jokers=known([gift]);repriceShopOffers(liquidation);
 if(liquidation.observed.jokers.status==='known')assert.equal(number(liquidation.observed.jokers.value[0]!.sellValue),3,'Repricing does not erase or double count the growth');
});
