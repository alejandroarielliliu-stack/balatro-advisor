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
 assert.deepEqual(first,{status:'estimated',target:450,hands:5,pointsPerHand:688,estimatedPoints:3440,sampleCount:8,reachedCount:8});
 // 3440 = (160 base chips + 55 for the aces) × 16; unused hands remain in the budget.
 assert.deepEqual(estimateBlindSurvival(state),first);
 assert.deepEqual(state,before);
});

test('later weak hands contribute their actual score, using each copy only once',()=>{
 const survival=estimateBlindSurvival(fixture(8));
 // After five aces score 3440, only three remain. Their three-of-a-kind adds 189.
 assert.deepEqual(survival,{status:'estimated',target:75000,hands:5,pointsPerHand:725.8,estimatedPoints:3629,sampleCount:8,reachedCount:0});
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
