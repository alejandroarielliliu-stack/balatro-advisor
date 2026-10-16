import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseState} from '../src/state/validation.js';
import {known,success} from './helpers.js';
import {scoreHand} from '../src/rules/scoring.js';
import {boundRoundScore} from '../src/rules/upper-bound.js';
import {applyShopAction} from '../src/rules/shop.js';
import {SIMPLE_JOKERS} from '../src/catalog/simple-jokers.js';
function fixture(ids:string[]){const s=success(parseState(readFileSync('examples/shop-purchase.json','utf8')));s.observed.money=known(10);s.observed.jokers=known(ids.map((id,i)=>({instanceId:'owned-'+i,catalogId:id,edition:known('base'),stickers:known([]),sellValue:known(SIMPLE_JOKERS[id]?.sell??1),counters:{}})));return s;}
// Literal source-derived arithmetic oracles. No output of the motor builds this table.
const cases:[string,string[],number][]=[
 ['greedy_joker',['8D','8S'],130],['lusty_joker',['8H','8S'],130],['wrathful_joker',['8S','8H'],130],['gluttenous_joker',['8C','8H'],130],
 ['jolly',['8S','8H'],260],['zany',['8S','8H','8D'],810],['mad',['8S','8H','2S','2H'],480],['crazy',['2S','3H','4D','5C','6S'],800],['droll',['2S','4S','6S','8S','10S'],910],
 ['sly',['8S','8H'],152],['wily',['8S','8H','8D'],462],['clever',['8S','8H','2S','2H'],240],['devious',['2S','3H','4D','5C','6S'],600],['crafty',['2S','4S','6S','8S','10S'],580],
 ['odd_todd',['3S','3H'],156],['scary_face',['KS','KH'],180],['smiley',['KS','KH'],360],['fibonacci',['8S','8H'],468],['walkie_talkie',['4S','4H'],380],['arrowhead',['8S','8H'],152],['onyx_agate',['8C','8H'],234],
 ['duo',['8S','8H'],104],['trio',['8S','8H','8D'],486],['family',['8S','8H','8D','8C'],2576],['order',['2S','3H','4D','5C','6S'],600],['tribe',['2S','4S','6S','8S','10S'],520],
 ['bull',['8S','8H'],92],['bootstraps',['8S','8H'],156],['swashbuckler',['8S','8H'],52],
 ['flower_pot',['2S','3H','4D','5C','6S'],600],['seeing_double',['8C','8H'],104],['mystic_summit',['8S','8H'],442],['splash',['8S','8H','AS'],74]
];
for(const [id,cards,score] of cases)test('CAT02 '+id+': resultado literal, compra legal, inmutabilidad y cota',()=>{
 const s=fixture([id]),before=structuredClone(s);const result=scoreHand(s,{cardIds:cards,discardsRemaining:id==='mystic_summit'?0:3});
 assert.equal(success(result).score,score);assert.ok(result.evidence.limitations.some(l=>l.ruleId==='jokers.simple'));assert.deepEqual(s,before);
 assert.ok(success(boundRoundScore(s)).scorePerHandUpper>=score);
 const empty=fixture([]),d=SIMPLE_JOKERS[id]!;empty.observed.shop=known({shopId:'shop',cardOffers:[{offerId:'offer',catalogId:id,label:d.name,kind:'joker',price:known(d.price),edition:known('base'),stickers:known([])}],ignoredOtherOffers:[]});
 const bought=success(applyShopAction(empty,{type:'buy',offerId:'offer',instanceId:'new'},{expectedRevision:empty.revision,updatedAt:empty.updatedAt}));assert.deepEqual(bought.state.observed.money,known(10-d.price));
});
test('33 nuevos tienen oráculo literal; los IDs ajenos al catálogo siguen rechazados',()=>{
 assert.deepEqual(new Set(cases.map(c=>c[0])),new Set(Object.keys(SIMPLE_JOKERS)));
 assert.ok(!scoreHand(fixture(['not-a-catalog-joker']),{cardIds:['8S','8H'],discardsRemaining:3}).ok);
 assert.ok(!scoreHand(fixture(['duo']),{cardIds:['8S','8H'],discardsRemaining:3},{requireObserved:true}).ok);
});
test('Contiene patrones: full house activa pareja, trío y doble pareja',()=>{
 // Full house eights/twos: 40+24+4=68 chips, base Mult4.
 for(const [id,score] of [['jolly',816],['zany',1088],['mad',952]] as const)assert.equal(success(scoreHand(fixture([id]),{cardIds:['8S','8H','8D','2S','2H'],discardsRemaining:3})).score,score);
});
test('No activaciones: descartes, rangos, palos, patrones; cartas no puntuadas no disparan efectos',()=>{
 for(const id of ['greedy_joker','lusty_joker','wrathful_joker','gluttenous_joker','odd_todd','scary_face','smiley','fibonacci','walkie_talkie','arrowhead','onyx_agate']){
  // Pair of sixes in hearts/diamonds: exclude suit matching checks separately below.
  if(['greedy_joker','lusty_joker'].includes(id))continue;
  assert.equal(success(scoreHand(fixture([id]),{cardIds:['6H','6D','AS'],discardsRemaining:3})).score,44);
 }
 for(const id of ['jolly','zany','mad','crazy','droll','sly','wily','clever','devious','crafty','duo','trio','family','order','tribe','flower_pot','seeing_double','mystic_summit'])assert.equal(success(scoreHand(fixture([id]),{cardIds:['8S'],discardsRemaining:3})).score,13);
});
test('Orden real de XMult; Splash activa efectos en cartas adicionales',()=>{
 // (10+16)*(2+4)*2=312 versus (10+16)*(2*2+4)=208.
 assert.equal(success(scoreHand(fixture(['joker','duo']),{cardIds:['8S','8H'],discardsRemaining:3})).score,312);
 assert.equal(success(scoreHand(fixture(['duo','joker']),{cardIds:['8S','8H'],discardsRemaining:3})).score,208);
 // Splash adds Ace chips and Scholar +20/+4: (10+16+11+20)*(2+4)=342.
 assert.equal(success(scoreHand(fixture(['splash','scholar']),{cardIds:['8S','8H','AS'],discardsRemaining:3})).score,342);
});
test('Dinero posterior a compra y venta: Bull, Bootstraps y Swashbuckler no congelan beneficios',()=>{
 const s=fixture(['bull']);s.observed.money=known(4);assert.equal(success(scoreHand(s,{cardIds:['8S','8H'],discardsRemaining:3})).score,68);
 const b=fixture(['bootstraps']);b.observed.money=known(4);assert.equal(success(scoreHand(b,{cardIds:['8S','8H'],discardsRemaining:3})).score,52);b.observed.money=known(5);assert.equal(success(scoreHand(b,{cardIds:['8S','8H'],discardsRemaining:3})).score,104);
 const sw=fixture(['swashbuckler','joker']);assert.equal(success(scoreHand(sw,{cardIds:['8S','8H'],discardsRemaining:3})).score,182); // Mult2+sell1+Joker4.
 const sold=success(applyShopAction(sw,{type:'sell',instanceId:'owned-1'},{expectedRevision:sw.revision,updatedAt:sw.updatedAt}));assert.equal(success(scoreHand(sold.state,{cardIds:['8S','8H'],discardsRemaining:3})).score,52);
 s.observed.money={status:'unknown',reason:'Sin registrar'};assert.ok(!scoreHand(s,{cardIds:['8S','8H'],discardsRemaining:3}).ok);
});

import {adviseShop} from '../src/advisor/advisor.js';
import {comparisonDemoScenarios} from '../src/demo-scenarios.js';
test('H3 compara compra nueva: Fibonacci supera 450 con 468, conservar solo llega a 80',()=>{
 const s=fixture([]),before=structuredClone(s);s.observed.shop=known({shopId:'shop',cardOffers:[{offerId:'fib',catalogId:'fibonacci',label:'Fibonacci',kind:'joker',price:known(8),edition:known('base'),stickers:known([])}],ignoredOtherOffers:[]});
 const snapshot=structuredClone(s),plan=comparisonDemoScenarios(s)[0]!.plan;
 const advice=success(adviseShop(s,[{role:'favorable',plan}],{expectedRevision:s.revision,updatedAt:s.updatedAt}));
 assert.equal(advice.recommendation.action?.type,'buy');const buy=advice.alternatives.find(a=>a.action.type==='buy')!;assert.equal(buy.scenarios[0]!.metrics!.score,468);assert.ok(buy.scenarios[0]!.activatedEffects.some(e=>e.trace.length>0));assert.deepEqual(s,snapshot);assert.deepEqual(s.observed.money,before.observed.money);
});
test('Flower Pot y Seeing Double miran cartas puntuadas; Splash puede habilitar Flower Pot',()=>{
 assert.equal(success(scoreHand(fixture(['flower_pot']),{cardIds:['8S','8H','2D','3C'],discardsRemaining:3})).score,52);
 assert.equal(success(scoreHand(fixture(['seeing_double']),{cardIds:['8S','8H','2C'],discardsRemaining:3})).score,52);
 assert.equal(success(scoreHand(fixture(['splash','flower_pot']),{cardIds:['8S','8H','2D','3C'],discardsRemaining:3})).score,186);
 assert.equal(success(scoreHand(fixture(['greedy_joker']),{cardIds:['6H','6C','AD'],discardsRemaining:3})).score,44);
 assert.equal(success(scoreHand(fixture(['lusty_joker']),{cardIds:['6S','6C','AH'],discardsRemaining:3})).score,44);
});
