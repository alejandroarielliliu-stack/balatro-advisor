import test from 'node:test';
import assert from 'node:assert/strict';
import {estimateBlindSurvival} from '../src/advisor/next-blind-survival.js';
import type {Card} from '../src/catalog/initial.js';
import type {GameStateV02,JokerInstance} from '../src/state/model.js';
import {createNewRun} from '../src/run/start.js';
import {selectionScenarioState} from '../src/rules/tags.js';
import {beginRound} from '../src/rules/round.js';
import {known,success} from './helpers.js';

function fixture(ante=1):GameStateV02{
 const state=success(createNewRun({runId:'survival-fixture',updatedAt:'2026-11-21T12:00:00Z',deckId:'blue',profileConfirmed:true}));
 const cards:Card[]=Array.from({length:8},(_,index)=>({instanceId:'ace-'+index,rank:'A',suit:'S',enhancement:'none',seal:'none',edition:'base',extraChips:0}));
 state.observed.deck=known({cards});
 state.observed.nextBlind=known({ante,kind:'big',bossId:known('none'),target:known(ante===1?450:75000),reward:known(4)});
 return selectionScenarioState(state);
}

test('sampled rounds are repeatable and stop once five suited aces meet the target',()=>{
 const state=fixture(),before=structuredClone(state);
 const first=estimateBlindSurvival(state);
 assert.deepEqual(first,{status:'estimated',target:450,hands:5,pointsPerHand:688,pointsPerPlayedHand:3440,estimatedPoints:3440,
  medianPoints:3440,p10Points:3440,p90Points:3440,sampleCount:8,reachedCount:8});
 // 3440 = (160 base chips + 55 for the aces) × 16; unused hands remain in the budget.
 assert.deepEqual(estimateBlindSurvival(state),first);
 assert.deepEqual(state,before);
});

test('later weak hands contribute their actual score, using each copy only once',()=>{
 const survival=estimateBlindSurvival(fixture(8));
 // After five aces score 3440, only three remain. Their three-of-a-kind adds 189.
 assert.deepEqual(survival,{status:'estimated',target:75000,hands:5,pointsPerHand:725.8,pointsPerPlayedHand:1814.5,estimatedPoints:3629,
  medianPoints:3629,p10Points:3629,p90Points:3629,sampleCount:8,reachedCount:0});
});

test('adaptive sampling tests alternative plays that retain Steel and uses the lower budget far from target',()=>{
 const state=fixture();
 state.observed.deck=known({cards:[
  {instanceId:'ace',rank:'A',suit:'S',enhancement:'steel',edition:'base',seal:'none',extraChips:0},
  {instanceId:'king',rank:'K',suit:'H',enhancement:'none',edition:'base',seal:'none',extraChips:0}
 ]});
 const baseline=estimateBlindSurvival(state),adaptive=estimateBlindSurvival(state,{sampling:'adaptive'});
 assert.equal(baseline.status,'estimated');assert.equal(adaptive.status,'estimated');
 assert.equal(baseline.estimatedPoints,16);
 assert.equal(adaptive.estimatedPoints,38);
 assert.equal(adaptive.pointsPerPlayedHand,19);
 assert.equal(adaptive.sampleCount,32);
});

test('adaptive sampling grows to its cap at the scoring threshold',()=>{
 const state=fixture();
 state.observed.deck=known({cards:[{instanceId:'ace',rank:'A',suit:'S',enhancement:'none',edition:'base',seal:'none',extraChips:434}]});
 const adaptive=estimateBlindSurvival(state,{sampling:'adaptive'});
 assert.equal(adaptive.status,'estimated');
 assert.equal(adaptive.estimatedPoints,450);
 assert.equal(adaptive.medianPoints,450);
 assert.equal(adaptive.sampleCount,128);
 assert.equal(adaptive.reachedCount,128);
});

test('The Hook samples its own discard and scores only the Steel card left in hand',()=>{
 const state=fixture();
 if(state.observed.deck.status!=='known'||!('cards' in state.observed.deck.value))throw Error('Fixture needs cards');
 state.observed.deck=known({cards:state.observed.deck.value.cards.map(card=>({...card,enhancement:'steel'}))});
 state.observed.nextBlind=known({ante:1,kind:'boss',bossId:known('the_hook'),target:known(600),reward:known(5)});
 const before=structuredClone(state),estimate=estimateBlindSurvival(state);
 assert.equal(estimate.status,'estimated');
 assert.equal(estimate.estimatedPoints,5160);
 assert.equal(estimate.pointsPerPlayedHand,5160);
 assert.equal(estimate.reachedCount,estimate.sampleCount);
 assert.deepEqual(estimateBlindSurvival(state),estimate);
 assert.deepEqual(state,before);
});

test('unmodelled random joker outcomes and unknown decks stay unavailable',()=>{
 const state=fixture();
 const misprint:JokerInstance={instanceId:'uncertain',catalogId:'misprint',edition:known('base'),stickers:known([]),sellValue:known(2),counters:{}};
 state.observed.jokers=known([misprint]);
 const random=estimateBlindSurvival(state);
 assert.equal(random.status,'unavailable');
 if(random.status==='unavailable')assert.match(random.reason,/resultado explícito.*misprint/i);
 state.observed.deck={status:'unknown',reason:'Mazo sin registrar.'};
 const missing=estimateBlindSurvival(state);
 assert.equal(missing.status,'unavailable');
 if(missing.status==='unavailable')assert.match(missing.reason,/mazo/i);
});

test('a skip does not trigger Perkeo by simulating another shop exit',()=>{
 const state=fixture();
 state.observed.jokers=known([{instanceId:'perkeo',catalogId:'perkeo',edition:known('base'),stickers:known([]),sellValue:known(10),counters:{}}]);
 const context=state.observed.jokerContext;
 assert.ok(context?.status==='known');
 context.value.consumables=known([{instanceId:'death',catalogId:'c_death',kind:'tarot',edition:'base',sellValue:1}]);
 const afterShop=beginRound(state,Array.from({length:8},(_,index)=>'ace-'+index));
 assert.equal(afterShop.ok,false);
 if(!afterShop.ok)assert.match(afterShop.errors[0]!.message,/perkeo/i);
 const estimate=estimateBlindSurvival(state);
 assert.equal(estimate.status,'estimated');
 assert.equal(context.value.consumables.status==='known'&&context.value.consumables.value.length,1);
});
