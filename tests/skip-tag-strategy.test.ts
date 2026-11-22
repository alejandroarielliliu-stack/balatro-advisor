import test from 'node:test';
import assert from 'node:assert/strict';
import {assessBossMatchup,assessBossScore,inferPrimaryHand} from '../src/advisor/skip-tag-strategy.js';
import {blindRequirement} from '../src/catalog/blinds.js';
import {HAND_BASES,standardDeck} from '../src/catalog/initial.js';
import type {Card,HandId} from '../src/catalog/initial.js';
import {beginRound} from '../src/rules/round.js';
import {scoreHand} from '../src/rules/scoring.js';
import {selectionScenarioState} from '../src/rules/tags.js';
import {createNewRun} from '../src/run/start.js';
import type {GameStateV02} from '../src/state/model.js';
import {known,success} from './helpers.js';

function fixture(ante=1,bossId='the_psychic'):GameStateV02{
 const state=success(createNewRun({runId:'skip-strategy-fixture',updatedAt:'2026-11-21T12:00:00Z',deckId:'blue',profileConfirmed:true}));
 const requirements=blindRequirement(ante,'boss',bossId,'blue');
 assert.ok(requirements.ok);
 state.observed.nextBlind=known({ante,kind:'small',bossId:known('none'),target:known(requirements.base),reward:known(3)});
 state.observed.visibleBoss=known({ante,kind:'boss',bossId:known(bossId),target:known(requirements.target),reward:known(requirements.reward)});
 return state;
}

function aces():Card[]{
 return Array.from({length:8},(_,index)=>({instanceId:'ace-'+index,rank:'A',suit:'S',enhancement:'none',seal:'none',edition:'base',extraChips:0}));
}
function setHandLevels(state:GameStateV02,levels:Partial<Record<HandId,number>>){
 const bases=Object.fromEntries(Object.entries(HAND_BASES).map(([hand,[chips,mult]])=>[hand,known({level:levels[hand as HandId]??1,chips,mult})]));
 state.observed.handBases=known({values:bases as Extract<Extract<GameStateV02['observed']['handBases'],{status:'known'}>['value'],{values:unknown}>['values']});
}
function setJokers(state:GameStateV02,ids:string[]){
 state.observed.jokers=known(ids.map(catalogId=>({instanceId:catalogId,catalogId,edition:known('base'),stickers:known([]),sellValue:known(2),counters:{}})));
}
function bossProjection(state:GameStateV02){const projected=selectionScenarioState(state);projected.observed.nextBlind=structuredClone(projected.observed.visibleBoss);return projected;}

test('Orbital can compare against a feasible developed hand and rejects an unproven strategy',()=>{
 const state=fixture(2,'the_water');
 assert.equal(inferPrimaryHand(state),null);
 const context=state.observed.jokerContext;
 assert.ok(context?.status==='known');
 context.value.handCounts={pair:known(12),flush:known(5)};
 setHandLevels(state,{flush:5,pair:2});
 assert.equal(inferPrimaryHand(state),'flush');
 state.observed.deck=known({cards:standardDeck().filter(card=>['2','4'].includes(card.rank)&&card.suit!=='C')});
 assert.equal(inferPrimaryHand(state),'pair','A developed category still needs enough compatible cards');
 state.observed.deck={status:'unknown',reason:'Sin mazo confirmado'};
 assert.equal(inferPrimaryHand(state),null);
});

test('A hand-specific Joker can identify the main hand if the deck supports its condition',()=>{
 const state=fixture();
 setJokers(state,['droll','crafty']);
 assert.equal(inferPrimaryHand(state),'flush');
 setJokers(state,['droll','jolly']);
 assert.equal(inferPrimaryHand(state),null);
 state.observed.deck=known({cards:standardDeck().filter(card=>['2','4'].includes(card.rank)&&card.suit!=='C')});
 assert.equal(inferPrimaryHand(state),'pair');
});

test('Orbital recognizes the Flush composition of Checkered before hand upgrades',()=>{
 const state=success(createNewRun({runId:'checkered-orbital',updatedAt:'2026-11-21T12:00:00Z',deckId:'checkered',profileConfirmed:true}));
 assert.equal(inferPrimaryHand(state),'flush');
 setHandLevels(state,{pair:3});
 assert.equal(inferPrimaryHand(state),'pair','recorded strategy takes precedence over inferred composition');
});

test('boss strength distinguishes supported wins, supported shortfalls and unavailable estimates',()=>{
 const strong=fixture();strong.observed.deck=known({cards:aces()});
 const before=structuredClone(strong),won=assessBossScore(strong);
 assert.equal(won.status,'sufficient');
 assert.equal(won.estimate?.status,'estimated');
 assert.deepEqual(strong,before);
 const weak=fixture(2,'the_needle');
 const ids=new Set(['2S','4H','6D','8C','10S','QS','AH','3D']);
 weak.observed.deck=known({cards:standardDeck().filter(card=>ids.has(card.instanceId))});
 const lost=assessBossScore(weak);
 assert.equal(lost.status,'insufficient');
 assert.equal(lost.estimate?.status,'estimated');
 if(lost.estimate?.status==='estimated'){assert.equal(lost.estimate.hands,1);assert.equal(lost.estimate.target,800);}
 const unsupported=fixture(1,'the_window');
 assert.equal(assessBossScore(unsupported).status,'unknown');
 unsupported.observed.visibleBoss={status:'unknown',reason:'Jefe oculto'};
 assert.match(assessBossScore(unsupported).reason,/Registra el jefe/);
});

test('Boss tag uses direct evidence of a suit or joker being countered',()=>{
 const flush=fixture(1,'the_goad');
 setHandLevels(flush,{flush:4});
 flush.observed.deck=known({cards:standardDeck().filter(card=>card.suit==='S'||card.rank==='A')});
 assert.equal(assessBossMatchup(flush).harmful,true);
 assert.match(assessBossMatchup(flush).reason,/palo/);
 setJokers(flush,['chicot']);
 assert.equal(assessBossMatchup(flush).harmful,false);
 const psychic=fixture();setJokers(psychic,['half_joker']);
 assert.match(assessBossMatchup(psychic).reason,/Half Joker/);
 const water=fixture(2,'the_water');setJokers(water,['banner']);
 assert.equal(assessBossMatchup(water).harmful,true);
});

test('Needle starts from one hand, adds Burglar, and restores the ordinary base with Chicot',()=>{
 const state=fixture(2,'the_needle'),cards=standardDeck().slice(0,8).map(card=>card.instanceId);
 setJokers(state,['burglar']);
 assert.equal(success(beginRound(bossProjection(state),cards)).handsLeft,4);
 setJokers(state,['burglar','chicot']);
 assert.equal(success(beginRound(bossProjection(state),cards)).handsLeft,8);
});

test('Manacle limits cards in hand and Flint rounds the halved bases before scoring cards',()=>{
 const manacle=fixture(1,'the_manacle'),cards=standardDeck().slice(0,8).map(card=>card.instanceId);
 const projected=bossProjection(manacle);
 assert.equal(success(beginRound(projected,cards.slice(0,7))).hand.length,7);
 assert.equal(beginRound(projected,cards).ok,false);
 assert.equal(assessBossScore(manacle).estimate?.status,'estimated');
 const flint=bossProjection(fixture(2,'the_flint'));
 const hand=success(scoreHand(flint,{cardIds:['AS'],heldCardIds:[],discardsRemaining:3}));
 assert.equal(hand.chips,14,'High card base 5 rounds up to 3 before adding 11 for the ace');
 assert.equal(hand.mult,1);
 assert.equal(hand.score,14);
});
