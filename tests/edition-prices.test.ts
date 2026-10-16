import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {applyShopAction,editionPrice} from '../src/rules/shop.js';
import {parseState} from '../src/state/validation.js';
import type {Fact,GameState,JokerInstance} from '../src/state/model.js';
import {known,success} from './helpers.js';

const fixture=()=>success(parseState(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8')));
const mutation=(s:GameState)=>({expectedRevision:s.revision,updatedAt:s.updatedAt});
function value<T>(fact:Fact<T>):T{assert.ok(fact.status==='known');return fact.value;}

// Independent static oracle, never calculated with editionPrice or another engine function:
// Balatro.exe ZIP 1.0.1o-FULL, card.lua:372–375 (+2 Foil, +3 Holo, +5 Poly/Negative),
// card.lua:382 (sale floor(cost/2), minimum1, then extra value), game.lua:368/384/403
// (Joker $2, Half $5, Abstract $4). See docs/evidencia/tienda-investigacion.md.
// No inflation, discount, rental, or coupon; this is software evidence, not a played run.
const editions=['base','foil','holographic','polychrome','negative'] as const;
const documentaryCases=[
 {id:'joker',prices:[2,4,5,7,7],sales:[1,2,2,3,3]},
 {id:'half_joker',prices:[5,7,8,10,10],sales:[2,3,4,5,5]},
 {id:'abstract_joker',prices:[4,6,7,9,9],sales:[2,3,3,4,4]}
] as const;

for(const {id,prices,sales} of documentaryCases)for(const [index,edition] of editions.entries()){
 const price=prices[index]!,sale=sales[index]!;
 test(`Oráculo estático ${id} ${edition}: compra $${price}, venta $${sale}`,()=>{
  assert.equal(editionPrice(id,edition),price);
  const s=fixture();s.observed.money=known(20);
  s.observed.shop=known({shopId:'edition-oracle',cardOffers:[{offerId:'offer',catalogId:id,label:id,kind:'joker',edition:known(edition),stickers:known([]),price:known(price)}],ignoredOtherOffers:[]});
  const original=structuredClone(s),buyResult=applyShopAction(s,{type:'buy',offerId:'offer',instanceId:'owned'},mutation(s)),bought=success(buyResult);
  assert.equal(value(bought.state.observed.money),20-price);
  assert.equal(value(bought.state.observed.shop).cardOffers.length,0);
  const owned=value(bought.state.observed.jokers)[0]!;
  assert.equal(value(owned.edition),edition);assert.equal(value(owned.sellValue),sale);
  assert.equal(value(bought.state.observed.resources.jokerSlots),edition==='negative'?6:5);
  assert.equal(buyResult.evidence.verifiedAgainstGame,false);
  assert.deepEqual(s,original);
  const beforeSale=structuredClone(bought.state),sold=success(applyShopAction(bought.state,{type:'sell',instanceId:'owned'},mutation(bought.state)));
  assert.equal(value(sold.state.observed.money),20-price+sale);
  assert.equal(value(sold.state.observed.jokers).length,0);
  assert.equal(value(sold.state.observed.resources.jokerSlots),5);
  assert.deepEqual(bought.state,beforeSale);
 });
}

test('Alias interno holo comparte el suplemento documental +3',()=>{
 assert.equal(editionPrice('joker','holo'),5);
 assert.equal(editionPrice('half_joker','holo'),8);
});

test('Precio transcrito distinto, descuento o antiguo suplemento conserva unsupported_price',()=>{
 // Holo Joker $5 and Poly Half $10 are the static prices. $4/$8 are the former bugs;
 // lower or higher observed prices can be legitimate game modifiers outside this contract.
 for(const [id,edition,prices] of [['joker','holographic',[0,1,4,6]],['half_joker','polychrome',[5,8,11]]] as const){
  for(const price of prices){
   const s=fixture();s.observed.money=known(20);
   s.observed.shop=known({shopId:'manual-price',cardOffers:[{offerId:'offer',catalogId:id,label:id,kind:'joker',edition:known(edition),stickers:known([]),price:known(price)}],ignoredOtherOffers:[]});
   const original=structuredClone(s),result=applyShopAction(s,{type:'buy',offerId:'offer',instanceId:'owned'},mutation(s));
   assert.ok(!result.ok);assert.equal(result.errors[0]!.code,'unsupported_price');
   assert.deepEqual(s,original);assert.equal(value(value(s.observed.shop).cardOffers[0]!.price),price);
  }
 }
});

test('Venta con antiguo suplemento Holo/Poly queda fuera de cobertura sin mutar',()=>{
 for(const [catalogId,edition,sellValue] of [['half_joker','holographic',3],['joker','polychrome',2]] as const){
  const s=fixture(),owned:JokerInstance={instanceId:'owned',catalogId,edition:known(edition),stickers:known([]),sellValue:known(sellValue),counters:{}};
  s.observed.jokers=known([owned]);const original=structuredClone(s);
  const result=applyShopAction(s,{type:'sell',instanceId:'owned'},mutation(s));
  assert.ok(!result.ok);assert.equal(result.errors[0]!.code,'unsupported_price');assert.deepEqual(s,original);
 }
});

test('Holo Half vende $4 base más $3 de crecimiento observado',()=>{
 const s=fixture();s.observed.jokers=known([{instanceId:'owned',catalogId:'half_joker',edition:known('holographic'),stickers:known([]),sellValue:known(7),counters:{extraSell:known(3)}}]);
 const original=structuredClone(s),sold=success(applyShopAction(s,{type:'sell',instanceId:'owned'},mutation(s)));
 assert.equal(value(sold.state.observed.money),14);assert.deepEqual(s,original);
});
