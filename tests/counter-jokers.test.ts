import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseState} from '../src/state/validation.js';
import {known,success} from './helpers.js';
import {scoreHand} from '../src/rules/scoring.js';
import {beginRound,applyRoundEvent,finishRound} from '../src/rules/round.js';
import {initialCounters} from '../src/catalog/joker-counters.js';
import {jokerDefinition} from '../src/catalog/initial.js';
function fixture(ids:string[]){const s=success(parseState(readFileSync('examples/shop-purchase.json','utf8')));s.observed.jokers=known(ids.map((id,i)=>({instanceId:'j'+i,catalogId:id,edition:known('base'),stickers:known([]),sellValue:known(jokerDefinition(id)!.sell),counters:initialCounters(id)})));return s;}
const cases:[string,string[],number,string,number][]=[
 ['runner',['2S','3H','4D','5C','6S'],260,'chips',15],
 ['square',['8S','8H','2S','3H'],60,'chips',4],
 ['trousers',['8S','8H','2S','2H'],160,'mult',2],
 ['ride_the_bus',['8S','8H'],78,'mult',1],
 ['wee',['2S','2H'],60,'chips',16],['ice_cream',['8S','8H'],252,'chips',100],
 ['popcorn',['8S','8H'],572,'mult',20],['selzer',['8S','8H'],84,'hands',10],
 ['ramen',['8S','8H'],104,'x100',200],['hit_the_road',['8S','8H'],52,'x100',100],['yorick',['8S','8H'],52,'x100',100]
];
for(const [id,cards,score,key,after] of cases)test('CAT03 contador literal '+id,()=>{
 const s=fixture([id]),before=structuredClone(s),result=success(scoreHand(s,{cardIds:cards,discardsRemaining:3}));assert.equal(result.score,score);assert.deepEqual(result.countersAfter.j0?.[key],known(after));assert.deepEqual(s,before);
});
test('Wee + Hack repite crecimiento; Blueprint copia el efecto sin duplicar el crecimiento',()=>{
 assert.equal(success(scoreHand(fixture(['wee','hack']),{cardIds:['2S','2H'],discardsRemaining:3})).score,100);
 assert.equal(success(scoreHand(fixture(['blueprint','wee']),{cardIds:['2S','2H'],discardsRemaining:3})).score,92);
 const bus=fixture(['ride_the_bus']);if(bus.observed.jokers.status==='known')bus.observed.jokers.value[0]!.counters.mult=known(10);
 assert.equal(success(scoreHand(bus,{cardIds:['KS','KH'],discardsRemaining:3})).score,60);
});
test('Se consumen tras puntuar; el contador desconocido nunca se convierte en cero',()=>{
 const s=fixture(['ice_cream']);if(s.observed.jokers.status==='known')s.observed.jokers.value[0]!.counters.chips=known(5);
 const round=success(beginRound(s,['8S','8H','AS','AH','2S','2H','3S','3H']));
 const played=success(applyRoundEvent(round,{type:'play',cardIds:['8S','8H'],drawnCardIds:['4S','4H']},{expectedRevision:s.revision,updatedAt:s.updatedAt}));assert.equal(played.handScore!.score,62);assert.deepEqual(played.round.game.observed.jokers,known([]));
 const unknown=fixture(['runner']);if(unknown.observed.jokers.status==='known')unknown.observed.jokers.value[0]!.counters={};assert.equal(scoreHand(unknown,{cardIds:['8S','8H'],discardsRemaining:3}).ok,false);
 const pop=fixture(['popcorn']);const first=success(beginRound(pop,['8S','8H','AS','AH','2S','2H','3S','3H']));const won=success(applyRoundEvent(first,{type:'play',cardIds:['8S','8H'],drawnCardIds:[]},{expectedRevision:pop.revision,updatedAt:pop.updatedAt})).round;
 const final=success(finishRound(won,{expectedRevision:won.game.revision,updatedAt:pop.updatedAt}));assert.equal(final.state.observed.jokers.status==='known'&&final.state.observed.jokers.value[0]!.counters.mult?.status==='known'&&final.state.observed.jokers.value[0]!.counters.mult.value,16);
});
test('Descartes por carta: Ramen, Hit the Road, Yorick; sin mutación de la entrada',()=>{
 const s=fixture(['ramen','hit_the_road','yorick']);if(s.observed.jokers.status==='known')s.observed.jokers.value[2]!.counters.remaining=known(1);
 const r=success(beginRound(s,['JS','JH','AS','AH','2S','2H','3S','3H'])),before=structuredClone(r);
 const next=success(applyRoundEvent(r,{type:'discard',cardIds:['JS','JH'],drawnCardIds:['4S','4H']},{expectedRevision:s.revision,updatedAt:s.updatedAt})).round;
 const js=next.game.observed.jokers;if(js.status!=='known')throw Error();assert.deepEqual(js.value[0]!.counters.x100,known(198));assert.deepEqual(js.value[1]!.counters.x100,known(200));assert.deepEqual(js.value[2]!.counters.x100,known(200));assert.deepEqual(js.value[2]!.counters.remaining,known(22));assert.deepEqual(r,before);
});
