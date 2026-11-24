import test from 'node:test';
import assert from 'node:assert/strict';
import {assessShopJokers} from '../src/advisor/shop-joker-survival.js';
import {standardDeck} from '../src/catalog/initial.js';
import {applyRunProgress} from '../src/run/progress.js';
import {createNewRun} from '../src/run/start.js';
import type {CurrentShopOffer, GameStateV02, JokerInstance} from '../src/state/model.js';
import {known, success} from './helpers.js';

const updatedAt = '2026-11-24T00:00:00Z';
const pending = {status:'unknown', reason:'Pendiente de registrar.'} as const;

function offer(catalogId:string, price:number, offerId=catalogId):CurrentShopOffer {
  return {offerId, catalogId, label:catalogId, kind:'joker', price:known(price), edition:known('base'), stickers:known([])};
}

function shop(offers:CurrentShopOffer[], {money=25, ante=5, rank='K'}={}):GameStateV02 {
  const initial = success(createNewRun({runId:'shop-joker-survival', updatedAt, deckId:'red', profileConfirmed:true}));
  const mutation = {updatedAt, inventory:{unchanged:true} as const};
  const inRound = success(applyRunProgress(initial, {type:'enter_round'}, {...mutation, expectedRevision:initial.revision})).state;
  const state = success(applyRunProgress(inRound, {type:'record_cashout', amount:money-4, jokerUpdates:[]}, {...mutation, expectedRevision:inRound.revision})).state;
  assert.equal(state.schemaVersion,'0.2');
  assert.equal(state.phase,'shop');
  assert.equal(state.observed.nextBlind.status,'known');
  assert.equal(state.observed.nextBlind.value.target.status,'unknown');
  if (ante!==1) {
    state.phaseData.origin = known({ante, kind:'small'});
    state.observed.nextBlind = known({ante, kind:'big', bossId:known('none'), target:pending, reward:pending});
  }
  state.observed.money = known(money);
  state.observed.shop = known({shopId:'observed-offers', cardOffers:offers, ignoredOtherOffers:[]});
  const card = standardDeck().find(card=>card.rank===rank)!;
  state.observed.deck = known({cards:Array.from({length:5}, (_, index)=>({...card, instanceId:'deck-'+index}))});
  return state;
}

function joker(catalogId:string):JokerInstance {
  return {instanceId:'owned-'+catalogId, catalogId, edition:known('base'), stickers:known([]), sellValue:known(2), counters:{}};
}

function preference(state:GameStateV02) {
  const advice = assessShopJokers(state);
  assert.equal(advice.status,'ready',JSON.stringify(advice));
  return advice.preference;
}

test('PhotoChad wins the upcoming blind from an ordinary shop snapshot',()=>{
  const state = shop([offer('joker',2), offer('hanging_chad',4)]);
  state.observed.jokers = known([joker('photograph')]);
  const before = structuredClone(state);
  const result = preference(state);
  assert.equal(result?.offerId,'hanging_chad');
  assert.equal(result.improvesSurvival,true);
  assert.equal(result.moneyAfter,21);
  assert.deepEqual(state,before);
});

test('the same shop prefers cheaper Mult when the deck has no faces or Photograph is missing',()=>{
  const offers = [offer('joker',2), offer('hanging_chad',4)];
  const aces = shop(offers,{rank:'A'});
  aces.observed.jokers = known([joker('photograph')]);
  assert.equal(preference(aces)?.offerId,'joker');
  assert.equal(preference(shop(offers))?.offerId,'joker');
});

test('the stronger combo gets no preference when the player cannot afford it',()=>{
  const state = shop([offer('joker',2), offer('hanging_chad',4)], {money:4});
  state.observed.jokers = known([joker('photograph')]);
  assert.equal(preference(state)?.offerId,'hanging_chad');
  state.observed.money = known(3);
  assert.equal(preference(state)?.offerId,'joker');
});

test('no direct purchase is preferred with all the joker slots occupied',()=>{
  const state = shop([offer('joker',2), offer('hanging_chad',4)]);
  state.observed.jokers = known(['photograph','golden_joker','abstract_joker','joker','half_joker'].map(joker));
  assert.equal(preference(state),null);
});

test('a safe next blind allows a modeled income advantage to break a scoring tie',()=>{
  const state = shop([offer('golden_joker',6), offer('abstract_joker',4)], {ante:1, rank:'A'});
  const result = preference(state);
  assert.equal(result?.offerId,'golden_joker');
  assert.equal(result.improvesSurvival,false);
  assert.equal(result.moneyAfter,19);
});

test('an exact tie and an unresolved competitor each keep the shop unmarked',()=>{
  const state = shop([offer('joker',2,'first'), offer('joker',2,'second')]);
  assert.equal(preference(state),null);
  state.observed.shop = known({
    shopId:'observed-offers',
    cardOffers:[offer('joker',2), {...offer('hanging_chad',4), price:pending}],
    ignoredOtherOffers:[]
  });
  const result = assessShopJokers(state);
  assert.equal(result.status==='ready'?result.preference:null,null);
});
