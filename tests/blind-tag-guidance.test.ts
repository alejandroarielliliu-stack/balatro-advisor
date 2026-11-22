import test from 'node:test';
import assert from 'node:assert/strict';
import {guideBlindChoice} from '../src/advisor/blind-guidance.js';
import {createNewRun} from '../src/run/start.js';
import type {HandId,Card} from '../src/catalog/initial.js';
import {known,success} from './helpers.js';

function state(deckId='red'){
 const run=success(createNewRun({runId:'blind-tags',updatedAt:'2026-11-21T12:00:00Z',deckId,profileConfirmed:true}));
 if(run.phase!=='blind_select')throw Error('Expected selection');
 return run;
}

function setBlind(run:ReturnType<typeof state>,ante:number,kind:'small'|'big',tag:string){
 run.phaseData.skipTag=known(tag);
 run.observed.nextBlind=known({ante,kind,bossId:known('none'),target:known(kind==='small'?300:450),reward:known(kind==='small'?3:4)});
}

const recommend=(run:ReturnType<typeof state>)=>success(guideBlindChoice(run)).recommendation;

test('fixed tags and exact ante boundaries apply even when survival, queue and resources are unknown',()=>{
 const run=state();
 run.observed.deck={status:'unknown',reason:'No hay mazo.'};
 run.observed.jokers={status:'unknown',reason:'Sin inventario.'};
 run.observed.jokerContext={status:'unknown',reason:'Sin cola.'};
 run.observed.resources.jokerSlots=known(0);
 const forecast=(tag:string,ante:number,kind:'small'|'big')=>{
  setBlind(run,ante,kind,tag);
  const before=structuredClone(run),report=success(guideBlindChoice(run,{risk:'tight',nextBlindPlan:'need_shop'}));
  assert.equal(report.recommendation.ruleId,'BG-SKIP-TAG-RULE');
  assert.equal(report.nextBlindEstimate,undefined);
  assert.equal(report.bossEstimate,undefined);
  assert.equal(report.askRisk,false);
  assert.ok(report.recommendation.reason.length>0);
  assert.deepEqual(run,before);
  return report.recommendation.preferred;
 };
 for(const tag of ['tag_foil','tag_polychrome','tag_handy','tag_rare','tag_meteor','tag_juggle','tag_standard','tag_charm']){
  assert.equal(forecast(tag,1,'small'),'play',tag);
  assert.equal(forecast(tag,8,'big'),'play',tag);
 }
 for(const tag of ['tag_buffoon','tag_top_up']){
  for(const [ante,kind] of [[1,'small'],[1,'big'],[2,'small']] as const)assert.equal(forecast(tag,ante,kind),'skip',tag);
  assert.equal(forecast(tag,2,'big'),'play',tag);
  assert.equal(forecast(tag,3,'small'),'play',tag);
 }
 assert.equal(forecast('tag_coupon',2,'big'),'skip');
 assert.equal(forecast('tag_coupon',3,'small'),'play');
 assert.equal(forecast('tag_uncommon',1,'small'),'skip');
 assert.equal(forecast('tag_uncommon',1,'big'),'play');
 assert.equal(forecast('tag_uncommon',2,'small'),'play');
});

test('known tags still answer when the current blind has not been transcribed',()=>{
 const run=state();
 run.observed.nextBlind={status:'unknown',reason:'Sin ciega registrada.'};
 run.phaseData.skipTag=known('tag_foil');
 assert.equal(recommend(run).preferred,'play');assert.match(recommend(run).reason,/laminada/);
 run.phaseData.skipTag=known('tag_coupon');
 assert.equal(recommend(run).preferred,'play');assert.match(recommend(run).reason,/ante/);
});

test('Investment and Holographic use the registered boss and reverse their scoring test',()=>{
 const run=state();
 run.observed.visibleBoss=known({ante:1,kind:'boss',bossId:known('the_psychic'),target:known(600),reward:known(5)});
 const cards=(count:number):Card[]=>Array.from({length:count},(_,i)=>({instanceId:'a'+i,rank:'A',suit:'S',enhancement:'none',seal:'none',edition:'base',extraChips:0}));
 for(const {size,investment,holographic} of [{size:8,investment:'skip',holographic:'play'},{size:4,investment:'play',holographic:'skip'}] as const){
  run.observed.deck=known({cards:cards(size)});
  setBlind(run,1,'small','tag_investment');assert.equal(recommend(run).preferred,investment);
  setBlind(run,1,'big','tag_holo');assert.equal(recommend(run).preferred,holographic);
 }
 run.observed.visibleBoss={status:'unknown',reason:'Jefe desconocido.'};
 assert.equal(recommend(run).preferred,'play','unknown score is not a shortage');
 setBlind(run,2,'big','tag_holo');assert.equal(recommend(run).preferred,'play');
 setBlind(run,2,'big','tag_investment');assert.equal(recommend(run).preferred,'play');
});

test('Orbital uses the observed hand for this blind and the principal feasible hand',()=>{
 const run=state();
 setBlind(run,2,'small','tag_orbital');
 run.observed.jokerContext=known({handCounts:{pair:known(6),two_pair:known(1)}});
 assert.equal(recommend(run).preferred,'play');
 run.blindTags=[{ante:2,kind:'big',tag:known('tag_orbital'),orbitalHand:known('pair' as HandId)}];
 assert.equal(recommend(run).preferred,'play','upcoming Big is a distinct observation');
 run.blindTags[0]={ante:2,kind:'small',tag:known('tag_orbital'),orbitalHand:known('flush')};
 assert.equal(recommend(run).preferred,'play');
 run.blindTags[0].orbitalHand=known('pair');
 const report=recommend(run);assert.equal(report.preferred,'skip');assert.match(report.reason,/tres niveles.*Pareja/);
});

test('Negative uses exactly the Double count; Double looks for a concrete Anaglyph use',()=>{
 for(const count of [0,1,2,3]){
  const run=state();
  setBlind(run,8,'big','tag_negative');
  run.observed.jokerContext=known({tags:known([...Array<string>(count).fill('tag_double'),'tag_coupon'])});
  assert.equal(recommend(run).preferred,count>=2?'skip':'play');
 }
 for(const [deck,preferred] of [['red','play'],['anaglyph','skip']] as const){
  const run=state(deck);
  setBlind(run,2,'small','tag_double');
  run.observed.jokerContext=known({tags:known(['tag_double'])});
  assert.equal(recommend(run).preferred,'play','unknown upcoming reward');
  run.blindTags=[{ante:2,kind:'big',tag:known('tag_negative')}];
  assert.equal(recommend(run).preferred,preferred);
 }
});

test('Boss skips an adverse observed matchup and budget results reach the visible decision',()=>{
 const run=state('checkered');
 setBlind(run,1,'small','tag_boss');
 const red=(target:string)=>({ante:1,kind:'boss' as const,bossId:known(target),target:known(600),reward:known(5)});
 run.observed.visibleBoss=known(red('the_head'));
 run.observed.jokerContext=known({handCounts:{flush:known(7)}});
 // The whole observed mazo uses hearts, so Head hits the primary suit.
 if(run.observed.deck.status==='known'&&'cards'in run.observed.deck.value){
  const hearts=run.observed.deck.value.cards.filter(card=>card.suit==='H');
  run.observed.deck=known({cards:hearts});
 }
 assert.equal(recommend(run).preferred,'skip');
 run.observed.visibleBoss=known(red('the_window'));assert.equal(recommend(run).preferred,'play');
 for(const [tag,minimum] of [['tag_voucher',35],['tag_d_six',50]] as const){
  setBlind(run,1,'big',tag);
  run.observed.visibleBoss={status:'unknown',reason:'Sin jefe visible.'};
  run.observed.money=known(minimum-1);assert.equal(recommend(run).preferred,'play');
  run.observed.money=known(minimum);assert.equal(recommend(run).preferred,'skip');
 }
});
