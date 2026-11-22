import {HAND_BASES,cardChips} from '../catalog/initial.js';
import {handCapacityForBoss} from '../catalog/blinds.js';
import type {Card,HandId} from '../catalog/initial.js';
import {simpleJoker} from '../catalog/simple-jokers.js';
import {blindInfo,deckCards,run} from '../rules/core.js';
import {suitMatches} from '../rules/hand-patterns.js';
import {face} from '../rules/joker-context.js';
import {applyRoundEvent,beginRound,previewProjectedRoundPlay} from '../rules/round.js';
import type {RoundEvent,RoundState} from '../rules/round.js';
import {classifyHand,scoreInternal} from '../rules/scoring.js';
import type {HandScore} from '../rules/scoring.js';
import {cardMatches} from '../rules/simple-jokers.js';
import {currentDeckCards} from '../state/deck-material.js';
import type {GameStateV02} from '../state/model.js';

export type BlindSurvivalEstimate={status:'estimated';target:number;hands:number;pointsPerHand:number;pointsPerPlayedHand:number|null;
 estimatedPoints:number;medianPoints:number;p10Points:number;p90Points:number;sampleCount:number;reachedCount:number}
 |{status:'unavailable';reason:string};

export interface BlindSurvivalOptions {sampling?:'adaptive'}

const samples=8,initialAdaptiveSamples=32,maxAdaptiveSamples=128,maxHandSize=10,maxActions=18;
const unavailable=(reason:string):BlindSurvivalEstimate=>({status:'unavailable',reason});

function shuffledIds(ids:readonly string[],seed:number):string[]{
 const order=[...ids];
 seed=seed>>>0||0x9e3779b9;
 for(let i=order.length-1;i>0;i--){
  seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;
  const j=Math.floor((seed>>>0)/0x100000000*(i+1));
  [order[i],order[j]]=[order[j]!,order[i]!];
 }
 return order;
}

/** Fixed, independent shuffles for repeatable comparisons. Never reads the run's seed. */
function shuffledDeck(cards:readonly Card[],sample:number):string[]{
 return shuffledIds(cards.map(card=>card.instanceId),Math.imul(sample+1,0x9e3779b9));
}

function hookDiscardOrder(hand:readonly string[],sample:number,action:number,stream:number):string[]{
 const seed=Math.imul(sample+1,0x85ebca6b)^Math.imul(action+1,0xc2b2ae35)^Math.imul(stream+1,0x27d4eb2f);
 return shuffledIds(hand,seed);
}

function hookDiscarded(order:readonly string[],played:readonly string[]):string[]{
 return order.filter(id=>!played.includes(id)).slice(0,2);
}

interface Candidate {ids:string[];hand:string;priority:number}

/** A cheap shortlist hint only. H2 evaluates the real Mult and joker order. */
function adaptiveCardModifiers(round:RoundState,held:readonly Card[]){
 const physical=round.game.observed.jokers;
 const jokers=physical.status==='known'?physical.value:[];
 const definitions=jokers.flatMap(joker=>{
  const definition=simpleJoker(joker.catalogId);
  return definition?.stage==='card'?[definition]:[];
 });
 const mime=jokers.some(joker=>joker.catalogId==='mime');
 const baron=jokers.some(joker=>joker.catalogId==='baron');
 const smeared=jokers.some(joker=>joker.catalogId==='smeared');
 return new Map(held.map(card=>{
  let chips=0,mult=0,xmult=1,heldXmult=1;
  if(!card.debuff){
   for(const definition of definitions){
    const matches=['Scary Face','Smiley Face'].includes(definition.name)?face(card,jokers):cardMatches(definition,card,smeared);
    if(matches){chips+=definition.chips;mult+=definition.mult;}
   }
   if(card.enhancement==='mult')mult+=4;
   if(card.enhancement==='glass')xmult*=2;
   if(card.edition==='foil')chips+=50;
   if(['holo','holographic'].includes(card.edition))mult+=10;
   if(card.edition==='polychrome')xmult*=1.5;
   const heldTriggers=Number(card.enhancement==='steel')+Number(baron&&card.rank==='K');
   heldXmult=1.5**(heldTriggers*(1+Number(card.seal==='red')+Number(mime)));
  }
  return [card,{chips,mult,xmult,heldXmult}] as const;
 }));
}

/** Rough ordering only. Every shortlisted play is scored by H2 with the actual held cards. */
function shortlist(round:RoundState,held:readonly Card[],psychic:boolean,adaptive:boolean):Candidate[]{
 const jokers=round.game.observed.jokers;
 const jokerIds=jokers.status==='known'?jokers.value.map(joker=>joker.catalogId):[];
 const bases=round.game.observed.handBases,options=new Map<string,Candidate>();
 const expanded:Candidate[]=[];
 const modifiers=adaptive&&held.length>4?adaptiveCardModifiers(round,held):null;
 const alternatives=new Map<string,Candidate>();
 const cards:Card[]=[];
 const enumerate=(start:number)=>{
  if(cards.length>0&&(!psychic||cards.length===5)){
   const {hand,scoring}=classifyHand(cards,jokerIds);
   const base=bases.status==='known'&&'values'in bases.value?bases.value.values[hand]:undefined;
   const [chips,mult]=base?.status==='known'?[base.value.chips,base.value.mult]:HAND_BASES[hand];
   const hits=jokerIds.includes('splash')?cards:scoring;
   const totalChips=chips+hits.reduce((sum,card)=>sum+(card.debuff?0:cardChips(card)),0);
   const priority=totalChips*mult;
   // Retain alternatives of different sizes; Half Joker and Square Joker
   // can favour a smaller play, and surplus cards can be used to dig.
   const key=hand+':'+cards.length;
   const old=options.get(key);
   if(adaptive&&held.length<=4)expanded.push({ids:cards.map(card=>card.instanceId),hand,priority});
   if(!old||priority>old.priority)options.set(key,{ids:cards.map(card=>card.instanceId),hand,priority});
   if(modifiers){
    let scoreChips=totalChips,scoreMult=mult,xmult=1;
    for(const card of hits){
     const bonus=modifiers.get(card)!;
     scoreChips+=bonus.chips;scoreMult+=bonus.mult;xmult*=bonus.xmult;
    }
    for(const card of held)if(!cards.includes(card))xmult*=modifiers.get(card)!.heldXmult;
    const effectPriority=scoreChips*scoreMult*xmult,previous=alternatives.get(key);
    if(!previous||effectPriority>previous.priority)alternatives.set(key,{ids:cards.map(card=>card.instanceId),hand,priority:effectPriority});
   }
  }
  if(cards.length===5)return;
  for(let i=start;i<held.length;i++){
   cards.push(held[i]!);enumerate(i+1);cards.pop();
  }
 };
 enumerate(0);
 if(expanded.length)return expanded;
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
 if(adaptive)for(const candidate of [...alternatives.values()].sort((a,b)=>b.priority-a.priority)){
  if(selected.length===12)break;
  if(!selected.some(play=>play.ids.length===candidate.ids.length&&play.ids.every((id,index)=>id===candidate.ids[index])))selected.push(candidate);
 }
 return selected;
}

interface RankedPlay { hand:HandScore; expectedScore:number }

function rankPlays(round:RoundState,candidates:readonly Candidate[],hookOrders:readonly string[][]){
 return run<RankedPlay>([],{},()=>{
  let best:RankedPlay|undefined;
  for(const candidate of candidates){
   const cardIds=candidate.ids;
   let hand:HandScore,expectedScore:number;
   if(hookOrders.length){
    const scores=hookOrders.map(order=>previewProjectedRoundPlay(round,{cardIds,bossDiscardedCardIds:hookDiscarded(order,cardIds)},[],()=>{}));
    hand=scores[0]!;
    expectedScore=scores.reduce((total,outcome)=>total+outcome.score/scores.length,0);
   }else{
    // The selected action is applied with H2's full round validation and events.
    hand=scoreInternal(round.game,{cardIds,discardsRemaining:round.discardsLeft,
     heldCardIds:round.hand.filter(id=>!cardIds.includes(id)),remainingCardIds:round.remaining,
     handsRemaining:round.handsLeft-1,handsUsed:round.initialHands-round.handsLeft,
     discardsUsed:round.initialDiscards-round.discardsLeft,roundInitialHands:round.initialHands,
     roundInitialDiscards:round.initialDiscards,generatedHandIds:round.generatedHandIds,
     capacityOverflow:round.capacityOverflow},[],()=>{});
    expectedScore=hand.score;
   }
   if(!best||expectedScore>best.expectedScore||expectedScore===best.expectedScore&&round.remaining.length>0&&cardIds.length>best.hand.playedCardIds.length)
    best={hand,expectedScore};
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

function chanceToDrawEnough(total:number,hits:number,draws:number,needed:number):number {
 if(needed===0)return 1;
 if(Math.min(hits,draws)<needed)return 0;
 let distribution=[1];
 for(let draw=0;draw<draws;draw++){
  const next=Array<number>(distribution.length+1).fill(0);
  for(const [found,probability]of distribution.entries())if(probability){
   const match=(hits-found)/(total-draw);
   next[found]=next[found]!+probability*(1-match);
   next[found+1]=next[found+1]!+probability*match;
  }
  distribution=next;
 }
 return distribution.slice(needed).reduce((sum,p)=>sum+p,0);
}

/** Choose which group to keep using the unseen card counts, never trial order.
 * Ranks and suits compete with the made hand at their recorded hand levels. */
function adaptiveDiscardCards(round:RoundState,held:readonly Card[],best:HandScore,deck:ReadonlyMap<string,Card>):string[]{
 const jokers=round.game.observed.jokers,bases=round.game.observed.handBases;
 const ids=jokers.status==='known'?jokers.value.map(joker=>joker.catalogId):[];
 const smeared=ids.includes('smeared');
 const remaining=round.remaining.map(id=>deck.get(id)!);
 const steel=held.filter(card=>card.enhancement==='steel'&&!card.debuff);
 const modifiers=adaptiveCardModifiers(round,held);
 const discard=(keep:readonly Card[])=>round.hand.filter(id=>!keep.some(card=>card.instanceId===id)&&!steel.some(card=>card.instanceId===id))
  .slice(0,Math.min(5,remaining.length));
 const chips=(card:Card)=>card.debuff?0:cardChips(card);
 const hint=(hand:HandId,cards:readonly Card[],extraChips=0)=>{
  const base=bases.status==='known'&&'values'in bases.value?bases.value.values[hand]:undefined;
  const [baseChips,baseMult]=base?.status==='known'?[base.value.chips,base.value.mult]:HAND_BASES[hand];
  let totalChips=baseChips+extraChips,mult=baseMult,xmult=1;
  for(const card of cards){
   const bonus=modifiers.get(card)!;
   totalChips+=chips(card)+bonus.chips;mult+=bonus.mult;xmult*=bonus.xmult;
  }
  for(const card of steel)if(!cards.includes(card))xmult*=modifiers.get(card)!.heldXmult;
  return totalChips*mult*xmult;
 };
 const made=held.filter(card=>best.scoringCardIds.includes(card.instanceId));
 let choice=discard(made),priority=hint(best.hand,made);
 const consider=(group:Card[],support:Card[],hand:HandId,required:number)=>{
  const discarded=discard(group),needed=required-group.length;
  if(!discarded.length||needed<0)return;
  const chance=chanceToDrawEnough(remaining.length,support.length,discarded.length,needed);
  if(!chance)return;
  const fallback=classifyHand(group,ids);
  const futureChips=needed?support.reduce((sum,card)=>sum+chips(card),0)/support.length*needed:0;
  const expected=chance*hint(hand,group,futureChips)+(1-chance)*hint(fallback.hand,fallback.scoring);
  if(expected>priority){choice=discarded;priority=expected;}
 };
 for(const suit of ['S','H','D','C']as const){
  const group=held.filter(card=>suitMatches(card,suit,smeared));
  if(group.length>=2)consider(group,remaining.filter(card=>suitMatches(card,suit,smeared)),'flush',ids.includes('four_fingers')?4:5);
 }
 const rankGroups=new Map<Card['rank'],Card[]>();
 for(const card of held)if(card.enhancement!=='stone'){
  const group=rankGroups.get(card.rank)??[];
  group.push(card);rankGroups.set(card.rank,group);
 }
 const sets=[['pair',2],['three_kind',3],['four_kind',4],['five_kind',5]]as const;
 for(const [rank,group]of rankGroups){
  const support=remaining.filter(card=>card.rank===rank&&card.enhancement!=='stone');
  for(const [hand,count]of sets)consider(group,support,hand,count);
 }
 return choice;
}

function quantile(sorted:readonly number[],p:number):number {
 const index=(sorted.length-1)*p,lower=Math.floor(index),upper=Math.ceil(index);
 return sorted[lower]!+(sorted[upper]!-sorted[lower]!)*(index-lower);
}

/** Expand a close or mixed sample. This selects a computation budget, not a
 * confidence claim or a second condition on the decision. */
function needsMoreSamples(totals:readonly number[],reachedCount:number,target:number):boolean {
 const count=totals.length,mean=totals.reduce((sum,score)=>sum+score/count,0);
 const meanError=Math.sqrt(totals.reduce((sum,score)=>sum+(score-mean)**2,0)/(count*(count-1)));
 return Math.abs(mean-target)<=Math.max(target*.05,2*meanError)||count===initialAdaptiveSamples&&reachedCount>0&&reachedCount<count;
}

/** Compare legal rounds from a scoring-ready, hypothetical shop-shaped state.
 * Samples stop on a win, at budget exhaustion or when no legal play remains.
 * The points per hand are normalized by all available hands, including hands
 * saved on early wins, so multiplying yields the sampled mean total. */
export function estimateBlindSurvival(state:GameStateV02,options:BlindSurvivalOptions={}):BlindSurvivalEstimate {
 const adaptive=options.sampling==='adaptive';
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
 let target=0,hands=0,reachedCount=0,playedHands=0;
 const totals:number[]=[];
 for(let trial=0;trial<(adaptive?maxAdaptiveSamples:samples);trial++){
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
   const boss=blindInfo(round.game).boss;
   const candidates=shortlist(round,held,boss==='the_psychic',adaptive);
   if(!candidates.length)break; // A minimum-card requirement prevents any further legal play.
   // Compare hypothetical discards independently of the actual Hook outcome.
   const hook=boss==='the_hook';
   const inventory=round.game.observed.jokers;
   // With no jokers or held effects, the random discard cannot change this
   // hand's score. The boss event still removes the actual cards below.
   const plainHook=hook&&inventory.status==='known'&&inventory.value.length===0&&held.every(card=>card.enhancement!=='steel'&&card.seal!=='purple');
   const hookOrders=hook?[hookDiscardOrder(round.hand,trial,action,0)]:[];
   if(hook&&!plainHook)hookOrders.push(hookDiscardOrder(round.hand,trial,action,1));
   const preview=rankPlays(round,candidates,hookOrders);
   if(!preview.ok)return unavailable(preview.errors[0]!.message);
   const {hand:best,expectedScore}=preview.value;
   const pace=(target-round.score)/round.handsLeft;
   const discarded=round.discardsLeft>0&&round.remaining.length>0&&expectedScore<pace
    ?adaptive?adaptiveDiscardCards(round,held,best,deck):discardCards(round,held,best):[];
   const cardIds=discarded.length?discarded:best.playedCardIds;
   const type=discarded.length?'discard':'play';
   const bossDiscardedCardIds=hook&&type==='play'?hookDiscarded(hookDiscardOrder(round.hand,trial,action,2),cardIds):undefined;
   let playScore=best.score;
   if(bossDiscardedCardIds&&!plainHook){
    const outcome=run([],{},(trace,use)=>previewProjectedRoundPlay(round,{cardIds,bossDiscardedCardIds},trace,use));
    if(!outcome.ok)return unavailable(outcome.errors[0]!.message);
    playScore=outcome.value.score;
   }
   const terminal=type==='play'&&(round.score+playScore>=target||round.handsLeft===1);
   const size=round.game.observed.resources.handSize;
   if(size.status!=='known')return unavailable(size.reason);
   const capacity=handCapacityForBoss(size.value,boss);
   const removedCount=cardIds.length+(bossDiscardedCardIds?.length??0);
   const draws=terminal?0:Math.max(0,Math.min(round.remaining.length,capacity-round.hand.length+removedCount));
   const remaining=new Set(round.remaining);
   const event:RoundEvent={type,cardIds,drawnCardIds:order.filter(id=>remaining.has(id)).slice(0,draws),
    ...(bossDiscardedCardIds?{bossDiscardedCardIds}:{})};
   const applied=applyRoundEvent(round,event,{expectedRevision:round.game.revision,updatedAt:round.game.updatedAt});
   if(!applied.ok)return unavailable(applied.errors[0]!.code==='invalid_draws'
    ?'Un efecto cambia las cartas o el tamaño de mano durante la ronda; esta estimación no puede resolver sus robos.'
    :applied.errors[0]!.message);
   round=applied.value.round;
   if(type==='play')playedHands++;
   if(round.remaining.some(id=>!order.includes(id)))return unavailable('Un efecto añade cartas en una posición que la estimación no puede resolver.');
  }
  if(round.score>=target)reachedCount++;
  totals.push(round.score);
  if(adaptive&&(totals.length===initialAdaptiveSamples||totals.length===2*initialAdaptiveSamples)&&
     !needsMoreSamples(totals,reachedCount,target))break;
 }
 const sampleCount=totals.length,estimatedPoints=totals.reduce((sum,score)=>sum+score/sampleCount,0);
 const sorted=[...totals].sort((a,b)=>a-b);
 return {status:'estimated',target,hands,pointsPerHand:estimatedPoints/hands,
  pointsPerPlayedHand:playedHands?estimatedPoints/(playedHands/sampleCount):null,estimatedPoints,
  medianPoints:quantile(sorted,.5),p10Points:quantile(sorted,.1),p90Points:quantile(sorted,.9),sampleCount,reachedCount};
}
