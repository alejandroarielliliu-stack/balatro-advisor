import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseState} from '../src/state/validation.js';
import {known,success} from './helpers.js';
import {DECKS} from '../src/catalog/decks.js';
import type {SupportedDeck} from '../src/catalog/decks.js';
import {resources} from '../src/rules/core.js';
import {scoreHand} from '../src/rules/scoring.js';
import {projectCashout} from '../src/rules/economy.js';
function fixture(deck:SupportedDeck){
 const s=success(parseState(readFileSync('examples/shop-purchase.json','utf8')));
 s.observed.deckId=known(deck);s.observed.resources.handsPerRound=known(DECKS[deck].hands);s.observed.resources.discardsPerRound=known(DECKS[deck].discards);
 s.observed.nextBlind=known({ante:1,kind:'small',bossId:known('none'),target:known(300),reward:known(3)});
 s.observed.resources.handSize=known(DECKS[deck].handSize);s.observed.resources.jokerSlots=known(DECKS[deck].jokerSlots);
 s.observed.money=known(10);s.observed.jokers=known([]);return s;
}
test('Barajas: bases independientes y Banner refleja el descarte extra de Roja',()=>{
 for(const [deck,h,d,expected] of [['blue',5,3,232],['red',4,4,292],['yellow',4,3,232]] as const){
  const s=fixture(deck);assert.deepEqual(resources(s),{hands:h,discards:d,handSize:8});
  s.observed.jokers=known([{instanceId:'banner',catalogId:'banner',edition:known('base'),stickers:known([]),sellValue:known(2),counters:{}}]);
  // Pair of eights: (10 + 8 + 8 + 30*discards) * 2.
  assert.equal(success(scoreHand(s,{cardIds:['8S','8H'],discardsRemaining:d})).score,expected);
 }
});
test('Azul cobra una mano sobrante más; Amarilla no regenera sus $10 iniciales',()=>{
 for(const [deck,remaining,expected] of [['blue',4,19],['red',3,18],['yellow',3,18]] as const){
  const s=fixture(deck),original=structuredClone(s);
  // balance 10 + small blind 3 + unused hands + interest 2.
  assert.equal(success(projectCashout(s,{handsRemaining:remaining,won:true,noMoneyChangesDuringRound:true})).balanceAfter,expected);
  assert.deepEqual(s,original);
 }
 assert.equal(DECKS.yellow.startingMoney,14);
});
test('Recursos incompatibles y barajas no implementadas bloquean en vez de asumir Azul',()=>{
 const s=fixture('red');s.observed.resources.handsPerRound=known(5);
 const bad=scoreHand(s,{cardIds:['8S','8H'],discardsRemaining:3});assert.ok(!bad.ok);assert.equal(bad.errors[0]!.code,'unsupported_resources');
 s.observed.deckId=known('ghost');const unsupported=scoreHand(s,{cardIds:['8S','8H'],discardsRemaining:3});assert.ok(!unsupported.ok);assert.equal(unsupported.errors[0]!.code,'unsupported_context');
});

// Independent source-derived oracles, NOT observed gameplay (L03).
import {DECK_PROFILES,resolveDeck,startingComposition,startingShopDistribution} from '../src/catalog/decks.js';
import {interestOnBalance} from '../src/rules/economy.js';
import {beginRound,applyRoundEvent,finishRound} from '../src/rules/round.js';
import {applyShopAction} from '../src/rules/shop.js';
import {evaluateRoundPlan} from '../src/evaluation/plan.js';
import {boundRoundScore} from '../src/rules/upper-bound.js';

test('15 perfiles completos: cambios básicos, vales y consumibles iniciales sin duplicar efectos',()=>{
 assert.equal(Object.keys(DECK_PROFILES).length,15);
 assert.equal(resolveDeck('magic').consumableSlots,3);
 assert.deepEqual(resolveDeck('magic').initialItems,[{itemType:'voucher',id:'v_crystal_ball',count:1},{itemType:'tarot',id:'c_fool',count:2}]);
 assert.equal(resolveDeck('nebula').consumableSlots,1);
 assert.ok(resolveDeck('nebula').conditions.some(c=>c.kind==='most_played_visible'));
 assert.deepEqual(resolveDeck('ghost').initialItems,[{itemType:'spectral',id:'c_hex',count:1}]);
 assert.equal(resolveDeck('zodiac').shopSlots,3);
 assert.equal(resolveDeck('black').jokerSlots,6);assert.equal(resolveDeck('black').hands,3);
 assert.equal(resolveDeck('painted').handSize,10);assert.equal(resolveDeck('painted').jokerSlots,4);
 assert.ok(resolveDeck('anaglyph').conditions.some(c=>c.when==='boss_defeated'&&c.kind==='grant_tag'&&c.count===1));
 for(const id of Object.keys(DECK_PROFILES)){const p=resolveDeck(id);assert.ok(p.conditions.length);assert.equal(p.evidence.observedInGame,false);assert.equal(p.evidence.status,'provisional');}
 assert.throws(()=>resolveDeck('made-up'),/desconocida/);
 const p=resolveDeck('magic');p.initialItems.length=0;p.conditions.length=0;assert.equal(resolveDeck('magic').initialItems.length,2);
});
test('Distribuciones condicionales: Fantasma 2/30 espectrales; Zodíaco 9.6/39.2 Tarot',()=>{
 const g=startingShopDistribution('ghost'),z=startingShopDistribution('zodiac');
 assert.equal(g.spectral.weight,2);assert.equal(g.spectral.total,30);assert.equal(g.spectral.share,1/15);
 assert.equal(z.tarot.weight,9.6);assert.equal(z.tarot.total,39.2);assert.equal(z.tarot.share,9.6/39.2);
 assert.equal(z.planet.share,z.tarot.share);assert.equal(startingShopDistribution('blue').spectral.share,0);
});
test('Composición: Abandonada 40, Cuadriculada conserva identidades y Errática exige datos',()=>{
 const a=startingComposition('abandoned'),c=startingComposition('checkered');
 assert.equal(a.status,'known');if(a.status==='known'){assert.equal(a.cards.length,40);assert.ok(a.cards.every(c=>!['J','Q','K'].includes(c.rank)));}
 assert.equal(c.status,'known');if(c.status==='known'){assert.equal(c.cards.length,52);assert.equal(new Set(c.cards.map(x=>x.instanceId)).size,52);assert.equal(c.cards.filter(x=>x.suit==='S').length,26);assert.equal(c.cards.filter(x=>x.rank==='A'&&x.suit==='H').length,2);}
 assert.equal(startingComposition('erratic').status,'unknown');
});
test('Verde: $10 + ciega $3 + 2 manos×$2 + 3 descartes×$1 = $20, sin intereses',()=>{
 const s=fixture('green'),before=structuredClone(s);
 assert.equal(success(interestOnBalance(s)),0);
 const out=success(projectCashout(s,{handsRemaining:2,discardsRemaining:3,won:true,noMoneyChangesDuringRound:true}));
 assert.equal(out.balanceAfter,20);assert.equal(out.interest,0);assert.equal(out.unusedHands,4);assert.equal(out.unusedDiscards,3);
 const unknown=projectCashout(s,{handsRemaining:2,won:true,noMoneyChangesDuringRound:true});assert.ok(!unknown.ok);assert.equal(unknown.errors[0]!.code,'unknown_data');
 const strict=interestOnBalance(s,{requireObserved:true});assert.ok(!strict.ok);
 assert.deepEqual(s,before);
});
test('Plasma: pareja 26/2 → 14²=196; impar 7/1 → 4²=16, objetivo Small 600',()=>{
 const s=fixture('plasma');s.observed.nextBlind=known({ante:1,kind:'small',bossId:known('none'),target:known(600),reward:known(3)});
 const score=scoreHand(s,{cardIds:['8S','8H'],discardsRemaining:3});assert.equal(success(score).score,196);
 // High card 2: 5+2 chips and 1 Mult -> 4*4. High card 3: 8+1 -> floor(9/2)^2 =16.
 assert.equal(success(scoreHand(s,{cardIds:['3S'],discardsRemaining:3})).score,16);
 assert.ok(score.ok&&score.trace.some(t=>t.ruleId==='deck.plasma'));
 // Independent bound: (base chips 100 + 5*11 + base Mult 8) -> floor(163/2)^2 *4.
 assert.equal(success(boundRoundScore(s)).roundScoreUpper,26244);
});
test('Negra admite sexto comodín y Pintada rechaza quinto; compra no muta entrada',()=>{
 for(const [deck,n,legal] of [['black',5,true],['painted',4,false]] as const){
  const s=fixture(deck);s.observed.jokers=known(['joker','half_joker','abstract_joker','banner','golden_joker'].slice(0,n).map(id=>({instanceId:id,catalogId:id,edition:known('base'),stickers:known([]),sellValue:known(1),counters:{}})));
  s.observed.shop=known({shopId:'shop',cardOffers:[{label:'Scholar',offerId:'offer',catalogId:'scholar',kind:'joker',price:known(4),edition:known('base'),stickers:known([])}],ignoredOtherOffers:[]});
  const before=structuredClone(s),result=applyShopAction(s,{type:'buy',offerId:'offer',instanceId:'new-scholar'},{expectedRevision:s.revision,updatedAt:s.updatedAt});
  assert.equal(result.ok,legal);if(result.ok)assert.equal(result.value.freeSlots,0);else assert.equal(result.errors[0]!.code,'no_slots');assert.deepEqual(s,before);
 }
});
test('Pintada: plan de 10 cartas y reposición a 10 tras descartar; no se adapta un plan de 8',()=>{
 const s=fixture('painted'),ids=['AS','AH','2S','2H','3S','3H','4S','4H','5S','5H'];
 const before=structuredClone(s),round=success(beginRound(s,ids));
 const after=success(applyRoundEvent(round,{type:'discard',cardIds:['AS'],drawnCardIds:['6S']},{expectedRevision:s.revision,updatedAt:s.updatedAt}));assert.equal(after.round.hand.length,10);
 const plan={schemaVersion:'scenario-1',planId:'painted',description:'Escenario sintético',initialHand:ids.map(cardId=>({cardId,knowledge:'hypothetical',basis:'Prueba'})),events:[{type:'play',cardIds:['AS','AH'],drawIfContinues:['6S','6H'].map(cardId=>({cardId,knowledge:'hypothetical',basis:'Prueba'}))}],assumptions:{noMoneyChangesDuringRound:true}};
 assert.equal(success(evaluateRoundPlan(s,plan,s.updatedAt)).score,64);
 assert.ok(!evaluateRoundPlan(s,{...plan,initialHand:plan.initialHand.slice(0,8)},s.updatedAt).ok);assert.deepEqual(s,before);
});

test('Verde: evaluación y final de ronda conservan descartes para el cobro',()=>{
 const s=fixture('green'),initial=['10S','JS','QS','KS','AS','2H','3H','4H'];
 const round=success(beginRound(s,initial));
 const played=success(applyRoundEvent(round,{type:'play',cardIds:initial.slice(0,5),drawnCardIds:[]},{expectedRevision:s.revision,updatedAt:s.updatedAt}));
 const final=success(finishRound(played.round,{expectedRevision:played.round.game.revision,updatedAt:s.updatedAt}));
 // $10 + $3 reward + 3 hands*$2 + 3 discards*$1, no interest.
 assert.equal(final.cashout?.balanceAfter,22);
 assert.equal(final.cashout?.unusedDiscards,3);
});
