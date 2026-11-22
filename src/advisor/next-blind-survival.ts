import {HAND_BASES,cardChips} from '../catalog/initial.js';
import {handCapacityForBoss} from '../catalog/blinds.js';
import type {Card} from '../catalog/initial.js';
import {blindInfo,deckCards,run} from '../rules/core.js';
import {suitMatches} from '../rules/hand-patterns.js';
import {applyRoundEvent,beginRound} from '../rules/round.js';
import type {RoundEvent,RoundState} from '../rules/round.js';
import {classifyHand,scoreInternal} from '../rules/scoring.js';
import type {HandScore} from '../rules/scoring.js';
import {currentDeckCards} from '../state/deck-material.js';
import type {GameStateV02} from '../state/model.js';

export type BlindSurvivalEstimate={status:'estimated';target:number;hands:number;pointsPerHand:number;estimatedPoints:number;sampleCount:number;reachedCount:number}
 |{status:'unavailable';reason:string};

const samples=8,maxHandSize=10,maxActions=18;
const unavailable=(reason:string):BlindSurvivalEstimate=>({status:'unavailable',reason});

/** Fixed, independent shuffles for repeatable comparisons. Never reads the run's seed. */
function shuffledDeck(cards:readonly Card[],sample:number):string[]{
 const order=cards.map(card=>card.instanceId);
 let seed=Math.imul(sample+1,0x9e3779b9)>>>0;
 for(let i=order.length-1;i>0;i--){
  seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
  const j=Math.floor((seed>>>0)/0x100000000*(i+1));
  [order[i],order[j]]=[order[j]!,order[i]!];
 }
 return order;
}

interface Candidate {ids:string[];hand:string;priority:number}

/** Rough ordering only. Every shortlisted play is scored by H2 with the actual held cards. */
function shortlist(round:RoundState,held:readonly Card[],psychic:boolean):Candidate[]{
 const jokers=round.game.observed.jokers;
 const jokerIds=jokers.status==='known'?jokers.value.map(joker=>joker.catalogId):[];
 const bases=round.game.observed.handBases,options=new Map<string,Candidate>();
 const cards:Card[]=[];
 const enumerate=(start:number)=>{
  if(cards.length>0&&(!psychic||cards.length===5)){
   const {hand,scoring}=classifyHand(cards,jokerIds);
   const base=bases.status==='known'&&'values'in bases.value?bases.value.values[hand]:undefined;
   const [chips,mult]=base?.status==='known'?[base.value.chips,base.value.mult]:HAND_BASES[hand];
   const hits=jokerIds.includes('splash')?cards:scoring;
   const priority=(chips+hits.reduce((sum,card)=>sum+(card.debuff?0:cardChips(card)),0))*mult;
   // Retain alternatives of different sizes; Half Joker and Square Joker
   // can favour a smaller play, and surplus cards can be used to dig.
   const key=hand+':'+cards.length;
   const old=options.get(key);
   if(!old||priority>old.priority)options.set(key,{ids:cards.map(card=>card.instanceId),hand,priority});
  }
  if(cards.length===5)return;
  for(let i=start;i<held.length;i++){
   cards.push(held[i]!);enumerate(i+1);cards.pop();
  }
 };
 enumerate(0);
 const ranked=[...options.values()].sort((a,b)=>b.priority-a.priority||b.ids.length-a.ids.length);
 const selected:Candidate[]=[];
 // Try several categories as well as the best size variants; a developed
 // Pair can outscore a superficially stronger hand.
 for(const candidate of ranked){
  if(!selected.some(item=>item.hand===candidate.hand))selected.push(candidate);
  if(selected.length===4)break;
 }
 for(const candidate of ranked){
  if(selected.length===6)break;
  if(!selected.includes(candidate))selected.push(candidate);
 }
 return selected;
}

function rankPlays(round:RoundState,candidates:readonly Candidate[]){
 return run<HandScore>([],{},()=>{
  let best:HandScore|undefined;
  for(const candidate of candidates){
   const cardIds=candidate.ids;
   // Round creation already validated the snapshot. The selected action is
   // then applied by H2 with its usual validation, evidence and events.
   const score=scoreInternal(round.game,{cardIds,discardsRemaining:round.discardsLeft,
    heldCardIds:round.hand.filter(id=>!cardIds.includes(id)),remainingCardIds:round.remaining,
    handsRemaining:round.handsLeft-1,handsUsed:round.initialHands-round.handsLeft,
    discardsUsed:round.initialDiscards-round.discardsLeft,roundInitialHands:round.initialHands,
    roundInitialDiscards:round.initialDiscards,generatedHandIds:round.generatedHandIds,
    capacityOverflow:round.capacityOverflow},[],()=>{});
   if(!best||score.score>best.score||score.score===best.score&&round.remaining.length>0&&cardIds.length>best.playedCardIds.length)best=score;
  }
  return best!; // Only used when the shortlist has at least one candidate.
 });
}

/** Retain the best made hand or a promising visible flush draw, without knowing the next card. */
function discardCards(round:RoundState,held:readonly Card[],best:HandScore):string[]{
 const jokers=round.game.observed.jokers;
 const smeared=jokers.status==='known'&&jokers.value.some(joker=>joker.catalogId==='smeared');
 const suited=(['S','H','D','C'] as const).map(suit=>held.filter(card=>!card.debuff&&suitMatches(card,suit,smeared)))
  .sort((a,b)=>b.length-a.length)[0]!;
 const keep=new Set(best.scoringCardIds);
 if(suited.length>=3&&suited.length<5&&suited.length>=keep.size){
  keep.clear();for(const card of suited)keep.add(card.instanceId);
 }
 for(const card of held)if(card.enhancement==='steel'&&!card.debuff)keep.add(card.instanceId);
 return round.hand.filter(id=>!keep.has(id)).slice(0,Math.min(5,round.remaining.length));
}

/** Compare legal rounds from a scoring-ready, hypothetical shop-shaped state.
 * Samples stop on a win, at budget exhaustion or when no legal play remains.
 * The points per hand are normalized by all available hands, including hands
 * saved on early wins, so multiplying yields the sampled mean total. */
export function estimateBlindSurvival(state:GameStateV02):BlindSurvivalEstimate {
 const cards=currentDeckCards(state);
 if(!cards?.length)return unavailable('Registra el mazo actual para estimar los robos de la siguiente ciega.');
 if(cards.some(card=>card.debuff))return unavailable('Confirma qué cartas estarán activas en la siguiente ciega; el mazo registra debilitamientos.');
 const {handSize}=state.observed.resources;
 if(handSize.status!=='known')return unavailable('Registra el tamaño de mano para estimar la siguiente ciega.');
 if(handSize.value<1||handSize.value>maxHandSize)return unavailable(`La estimación admite tamaños de mano entre 1 y ${maxHandSize}.`);
 const next=state.observed.nextBlind,jokers=state.observed.jokers;
 const bossId=next.status==='known'&&next.value.bossId.status==='known'?next.value.bossId.value:'none';
 const disablesBoss=jokers.status==='known'&&jokers.value.some(joker=>joker.catalogId==='chicot');
 const initialSize=handCapacityForBoss(handSize.value,disablesBoss?'none':bossId);
 let target=0,hands=0,reachedCount=0,estimatedPoints=0;
 for(let trial=0;trial<samples;trial++){
  const order=shuffledDeck(cards,trial);
  // A skipped blind has no intervening shop; do not replay end-of-shop events.
  const started=beginRound(state,order.slice(0,initialSize),{enteringFromShop:false});
  if(!started.ok)return unavailable(started.errors[0]!.message);
  let round=started.value;
  const blind=blindInfo(round.game);
  if(trial===0){target=blind.target;hands=round.handsLeft;}
  if(target!==blind.target||hands!==round.handsLeft||hands<1||hands+round.discardsLeft>maxActions)
   return unavailable('El objetivo o los recursos cambian entre rondas o exceden el límite de la estimación.');
  for(let action=0;round.status==='active'&&round.hand.length&&action<maxActions;action++){
   if(round.hand.length>maxHandSize)return unavailable('Un efecto supera el tamaño de mano admitido por la estimación.');
   const deck=new Map(deckCards(round.game).map(card=>[card.instanceId,card]));
   const held=round.hand.map(id=>deck.get(id)!);
   const candidates=shortlist(round,held,blindInfo(round.game).boss==='the_psychic');
   if(!candidates.length)break; // A minimum-card requirement prevents any further legal play.
   const preview=rankPlays(round,candidates);
   if(!preview.ok)return unavailable(preview.errors[0]!.message);
   const best=preview.value;
   const pace=(target-round.score)/round.handsLeft;
   const discarded=round.discardsLeft>0&&round.remaining.length>0&&best.score<pace?discardCards(round,held,best):[];
   const cardIds=discarded.length?discarded:best.playedCardIds;
   const type=discarded.length?'discard':'play';
   const terminal=type==='play'&&(round.score+best.score>=target||round.handsLeft===1);
   const size=round.game.observed.resources.handSize;
   if(size.status!=='known')return unavailable(size.reason);
   const capacity=handCapacityForBoss(size.value,blindInfo(round.game).boss);
   const draws=terminal?0:Math.max(0,Math.min(round.remaining.length,capacity-round.hand.length+cardIds.length));
   const remaining=new Set(round.remaining);
   const event:RoundEvent={type,cardIds,drawnCardIds:order.filter(id=>remaining.has(id)).slice(0,draws)};
   const applied=applyRoundEvent(round,event,{expectedRevision:round.game.revision,updatedAt:round.game.updatedAt});
   if(!applied.ok)return unavailable(applied.errors[0]!.code==='invalid_draws'
    ?'Un efecto cambia las cartas o el tamaño de mano durante la ronda; esta estimación no puede resolver sus robos.'
    :applied.errors[0]!.message);
   round=applied.value.round;
   if(round.remaining.some(id=>!order.includes(id)))return unavailable('Un efecto añade cartas en una posición que la estimación no puede resolver.');
  }
  if(round.score>=target)reachedCount++;
  estimatedPoints+=round.score/samples;
 }
 return {status:'estimated',target,hands,pointsPerHand:estimatedPoints/hands,estimatedPoints,sampleCount:samples,reachedCount};
}
