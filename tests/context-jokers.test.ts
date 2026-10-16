import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseState} from '../src/state/validation.js';
import {known,success} from './helpers.js';
import {scoreHand} from '../src/rules/scoring.js';
import {applyShopAction} from '../src/rules/shop.js';
import {beginRound} from '../src/rules/round.js';
import {boundRoundScore} from '../src/rules/upper-bound.js';
import {standardDeck,jokerDefinition} from '../src/catalog/initial.js';
import {ADVANCED_JOKERS} from '../src/catalog/advanced-jokers.js';
import {JOKER_COUNTERS} from '../src/catalog/joker-counters.js';
import {jokerResourceDelta} from '../src/catalog/joker-resources.js';
import {evaluateRoundPlan} from '../src/evaluation/plan.js';
import {projectCashout,interestOnBalance} from '../src/rules/economy.js';
function fixture(ids:string[]){const s=success(parseState(readFileSync('examples/shop-purchase.json','utf8')));s.observed.jokers=known(ids.map((id,i)=>({instanceId:'j'+i,catalogId:id,edition:known('base'),stickers:known([]),sellValue:known(jokerDefinition(id)!.sell),counters:{}})));const d=jokerResourceDelta(ids);s.observed.resources.handsPerRound=known(5+d.hands);s.observed.resources.discardsPerRound=known(3+d.discards);s.observed.resources.handSize=known(8+d.handSize);return s;}
const cases:[string[],string[],string[],number][]=[
 [['hanging_chad'],['8S','8H'],[],84], [['hack'],['2S','2H'],[],36],
 [['sock_and_buskin'],['KS','KH'],[],100],[['photograph'],['KS','KH'],[],120],
 [['triboulet'],['KS','KH'],[],240],[['photograph','hanging_chad'],['KS','KH'],[],800],
 [['mime','baron'],['8S','8H'],['KS'],117],[['raised_fist'],['8S','8H'],['QS','KS'],572],
 [['shoot_the_moon'],['8S','8H'],['QS'],390],[['blackboard'],['8S','8H'],['KS'],156],
 [['stencil'],['8S','8H'],[],260],[['pareidolia','scary_face'],['8S','8H'],[],172],
 [['blueprint','joker'],['8S','8H'],[],260],[['joker','brainstorm'],['8S','8H'],[],260],
 [['blueprint','brainstorm'],['8S','8H'],[],52],[['acrobat'],['8S','8H'],[],156],
 [['dusk'],['8S','8H'],[],84],[['blue_joker'],['8S','8H'],[],60],
 [['stuntman'],['8S','8H'],[],552],
];
for(const [ids,cards,held,expected] of cases)test('CAT03 literal '+ids.join('+'),()=>{
 const s=fixture(ids),before=structuredClone(s);const result=scoreHand(s,{cardIds:cards,discardsRemaining:3,heldCardIds:held,remainingCardIds:['2C','3C'],handsRemaining:0});
 assert.equal(success(result).score,expected);assert.deepEqual(s,before);assert.ok(result.evidence.limitations.some(e=>e.ruleId==='jokers.context'));assert.equal(result.evidence.verifiedAgainstGame,false);
});
test('Acero+Mime+Baron conserva fracciones y redondea únicamente el total',()=>{
 const s=fixture(['mime','baron']),cards=standardDeck();cards.find(c=>c.instanceId==='KS')!.enhancement='steel';s.observed.deck=known({cards});
 const result=success(scoreHand(s,{cardIds:['8S','8H'],discardsRemaining:3,heldCardIds:['KS']}));
 assert.equal(result.mult,10.125);assert.equal(result.score,263);assert.equal(boundRoundScore(s).ok,false);
 assert.equal(scoreHand(s,{cardIds:['8S','8H'],discardsRemaining:3}).ok,false);
});
test('Contexto ausente o ilegal se rechaza; vacío explícito sí se evalúa',()=>{
 for(const id of ['blackboard','mime','raised_fist','shoot_the_moon','baron','blue_joker','dusk','acrobat'])assert.equal(scoreHand(fixture([id]),{cardIds:['8S','8H'],discardsRemaining:3}).ok,false);
 assert.equal(success(scoreHand(fixture(['blackboard']),{cardIds:['8S','8H'],discardsRemaining:3,heldCardIds:[]})).score,156);
 assert.equal(scoreHand(fixture(['baron']),{cardIds:['8S','8H'],discardsRemaining:3,heldCardIds:['8S']}).ok,false);
 assert.equal(scoreHand(fixture(['baron']),{cardIds:['8S','8H'],discardsRemaining:3,heldCardIds:['KS'],remainingCardIds:['KS']}).ok,false);
});
test('Recursos físicos: compra y venta reversibles, sin copiar pasivos',()=>{
 for(const [id,size,hands,discards] of [['juggler',9,5,3],['drunkard',8,5,4],['troubadour',10,4,3],['merry_andy',7,5,6],['stuntman',6,5,3]] as const){
  const s=fixture([]);s.observed.money=known(20);s.observed.shop=known({shopId:'s',ignoredOtherOffers:[],cardOffers:[{offerId:'o',kind:'joker',catalogId:id,label:id,price:known(jokerDefinition(id)!.price),edition:known('base'),stickers:known([])}]});
  const bought=success(applyShopAction(s,{type:'buy',offerId:'o',instanceId:'new'},{expectedRevision:s.revision,updatedAt:s.updatedAt})).state;
  assert.deepEqual(bought.observed.resources.handSize,known(size));assert.deepEqual(bought.observed.resources.handsPerRound,known(hands));assert.deepEqual(bought.observed.resources.discardsPerRound,known(discards));
  assert.equal(beginRound(bought,standardDeck().slice(0,size).map(c=>c.instanceId)).ok,true);
  const sold=success(applyShopAction(bought,{type:'sell',instanceId:'new'},{expectedRevision:bought.revision,updatedAt:s.updatedAt})).state;assert.deepEqual(sold.observed.resources,s.observed.resources);
 }
 assert.equal(success(scoreHand(fixture(['blueprint','juggler']),{cardIds:['8S','8H'],discardsRemaining:3})).score,52);
});
test('Comparador usa retenidas reales del plan, preview y acción final coinciden',()=>{
 const s=fixture(['baron','mime']);const plan={schemaVersion:'scenario-1',planId:'p',description:'Caso sintético',initialHand:['8S','8H','KS','2C','3C','4C','5C','6C'].map(cardId=>({cardId,knowledge:'hypothetical',basis:'prueba'})),events:[{type:'play',cardIds:['8S','8H'],drawIfContinues:['AS','AH'].map(cardId=>({cardId,knowledge:'hypothetical',basis:'prueba'}))}],assumptions:{noMoneyChangesDuringRound:true}};
 const result=success(evaluateRoundPlan(s,plan,s.updatedAt));assert.equal(result.events[0]!.handScore!.score,117);
 const cat03Counters=['runner','square','wee','trousers','ride_the_bus','ice_cream','popcorn','selzer','ramen','hit_the_road','yorick'];
 assert.ok(cat03Counters.every(id=>Object.hasOwn(JOKER_COUNTERS,id)));
 assert.deepEqual(new Set(Object.keys(ADVANCED_JOKERS)),new Set([...cases.flatMap(c=>c[0]).filter(id=>!['joker','scary_face'].includes(id)),'juggler','drunkard','troubadour','merry_andy',...cat03Counters,'four_fingers','shortcut','smeared','steel_joker','drivers_license','cloud_9','to_the_moon','delayed_grat']));
});
test('Four Fingers, Shortcut y Smeared: patrones contienen subconjuntos y conservan orden',()=>{
 const cases:[string[],string[],number][]=[
  [['four_fingers','order'],['2S','3H','4D','5C'],528],
  [['four_fingers'],['2S','4S','6S','8S','AH'],220],
  [['shortcut'],['2S','4H','6D','8C','10S'],240],
  [['four_fingers'],['2H','3H','4H','9H','5C'],984],
  [['smeared','lusty_joker'],['2H','4D','6H','8D','10H'],1235],
  [['smeared','flower_pot','splash'],['8H','8D','2S','3C'],186]
 ];
 for(const [ids,cards,expected] of cases)assert.equal(success(scoreHand(fixture(ids),{cardIds:cards,discardsRemaining:3})).score,expected);
});
test('Steel Joker cuenta el mazo completo; Driver’s License usa mejoras reales',()=>{
 for(const [id,expected] of [['steel_joker',218],['drivers_license',156]] as const){
  const s=fixture([id]),cards=standardDeck();cards.slice(0,16).forEach(c=>c.enhancement='steel');s.observed.deck=known({cards});
  assert.equal(success(scoreHand(s,{cardIds:['8S','8H'],heldCardIds:[],discardsRemaining:3})).score,expected);
 }
});
test('Cloud 9, Delayed Gratification y To the Moon: cobro y límite multiplicado',()=>{
 const s=fixture(['cloud_9','delayed_grat','to_the_moon']);s.observed.money=known(30);
 const c=success(projectCashout(s,{won:true,handsRemaining:4,discardsRemaining:3,noMoneyChangesDuringRound:true}));
 // Four nines $4 + three unused discards $6 + Big $4 + four hands $4 + interest $10.
 assert.equal(c.otherJokerIncome,10);assert.equal(c.interest,10);assert.equal(c.earned,28);
 assert.equal(success(projectCashout(s,{won:true,handsRemaining:4,discardsRemaining:2,noMoneyChangesDuringRound:true})).otherJokerIncome,4);
 assert.equal(success(interestOnBalance(s)),10);
 s.observed.deckId=known('green');s.observed.resources.handsPerRound=known(4);assert.equal(success(interestOnBalance(s)),0);
});
