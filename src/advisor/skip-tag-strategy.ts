import {blindRequirement,implementedBossEffects} from '../catalog/blinds.js';
import {bossDefinition} from '../catalog/bosses.js';
import {HAND_BASES} from '../catalog/initial.js';
import type {Card,HandId} from '../catalog/initial.js';
import {simpleJoker} from '../catalog/simple-jokers.js';
import type {SimpleJoker} from '../catalog/simple-jokers.js';
import {valueFact} from '../rules/core.js';
import {handPatterns,suitMatches} from '../rules/hand-patterns.js';
import {face} from '../rules/joker-context.js';
import {selectionScenarioState} from '../rules/tags.js';
import {currentDeckCards} from '../state/deck-material.js';
import type {Fact,GameStateV02} from '../state/model.js';
import {estimateBlindSurvival} from './next-blind-survival.js';
import type {BlindSurvivalEstimate} from './next-blind-survival.js';

const value=<T>(fact:Fact<T>|undefined)=>fact?.status==='known'?fact.value:undefined;
const handIds=Object.keys(HAND_BASES) as HandId[];
const suits=['S','H','D','C'] as const;
const suitedHands:ReadonlySet<HandId>=new Set(['flush','straight_flush','flush_house','flush_five']);
const minimumCards:Record<HandId,number>={high_card:1,pair:2,two_pair:4,three_kind:3,straight:5,flush:5,full_house:5,four_kind:4,straight_flush:5,five_kind:5,flush_house:5,flush_five:5};

function minimumFor(hand:HandId,fourFingers:boolean):number{
 return fourFingers&&['straight','flush','straight_flush'].includes(hand)?4:minimumCards[hand];
}

function rankCounts(cards:readonly Card[]):number[]{
 const counts=new Map<Card['rank'],number>();
 for(const card of cards)counts.set(card.rank,(counts.get(card.rank)??0)+1);
 return [...counts.values()].sort((a,b)=>b-a);
}

/** Checks whether the recorded card pool can support a category, not how often a player draws it. */
function feasibleHands(cards:readonly Card[],jokers:readonly string[],size:number|undefined):ReadonlySet<HandId>{
 const ranked=cards.filter(card=>card.enhancement!=='stone'), [first=0,second=0]=rankCounts(ranked);
 const fourFingers=jokers.includes('four_fingers'),smeared=jokers.includes('smeared');
 const suitPools=suits.map(suit=>ranked.filter(card=>suitMatches(card,suit,smeared)));
 const patterns=handPatterns(ranked,jokers);
 const result:Record<HandId,boolean>={
  high_card:cards.length>0,pair:first>=2,two_pair:second>=2,three_kind:first>=3,
  straight:patterns.straight.length>0,flush:patterns.flush.length>0,full_house:first>=3&&second>=2,
  four_kind:first>=4,straight_flush:suitPools.some(pool=>handPatterns(pool,jokers).straight.length>0),
  five_kind:first>=5,flush_house:suitPools.some(pool=>{const [a=0,b=0]=rankCounts(pool);return a>=3&&b>=2;}),
  flush_five:suitPools.some(pool=>(rankCounts(pool)[0]??0)>=5)
 };
 return new Set(handIds.filter(hand=>result[hand]&&(size===undefined||size>=minimumFor(hand,fourFingers))));
}

function bestObserved(hands:readonly HandId[],metric:(hand:HandId)=>number|undefined):HandId[]{
 let largest=0;
 let best:HandId[]=[];
 for(const hand of hands){
  const score=metric(hand);
  if(score===undefined||score<=0||score<largest)continue;
  if(score>largest){largest=score;best=[];}
  best.push(hand);
 }
 return best;
}

const jokerHand:Readonly<Partial<Record<SimpleJoker['condition'],HandId>>>={
 pair:'pair',three:'three_kind',two_pair:'two_pair',straight:'straight',flush:'flush',four:'four_kind'
};

/** Deliberate hand upgrades take precedence over played hands, Joker synergies
 * and the distribution of suits in the current deck. */
export function inferPrimaryHand(state:GameStateV02):HandId|null{
 const cards=currentDeckCards(state);
 if(!cards?.length)return null;
 const jokers=value(state.observed.jokers)?.map(joker=>joker.catalogId)??[];
 const active=cards.filter(card=>!card.debuff);
 const feasible=feasibleHands(active,jokers,value(state.observed.resources.handSize));
 const candidates=[...feasible],bases=value(state.observed.handBases);
 const counts=value(state.observed.jokerContext)?.handCounts;
 const upgraded=bestObserved(candidates,hand=>bases&&'values'in bases?(value(bases.values[hand])?.level??1)-1:undefined);
 if(upgraded.length===1)return upgraded[0]!;
 const rated=upgraded.length?upgraded:candidates;
 const played=bestObserved(rated,hand=>value(counts?.[hand]));
 if(played.length===1)return played[0]!;
 const eligible=played.length?played:rated;
 const supported=new Set<HandId>();
 for(const id of jokers){
  const condition=simpleJoker(id)?.condition;
  const hand=condition===undefined?undefined:jokerHand[condition];
  if(hand&&eligible.includes(hand))supported.add(hand);
 }
 if(supported.size===1)return [...supported][0]!;
 if(supported.size>1||upgraded.length||played.length)return null;
 if(eligible.length===1)return eligible[0]!;
 // A suit that makes up at least half the deck supports a Flush strategy even
 // before the player upgrades a hand (for example, the Checkered Deck).
 if(feasible.has('flush')&&!feasible.has('five_kind')&&!jokers.includes('half_joker')){
  const ranked=active.filter(card=>card.enhancement!=='stone'),smeared=jokers.includes('smeared');
  if(suits.some(suit=>ranked.filter(card=>suitMatches(card,suit,smeared)).length*2>=ranked.length))return 'flush';
 }
 return null;
}

function currentBoss(state:GameStateV02){
 const current=value(state.observed.nextBlind),visible=value(state.observed.visibleBoss);
 const blind=current?.kind==='boss'?current:visible?.kind==='boss'&&visible.ante===current?.ante?visible:undefined;
 const id=value(blind?.bossId);
 const boss=id===undefined?undefined:bossDefinition(id);
 return blind&&boss?{blind,boss}:null;
}

export interface BossScoreAssessment{
 status:'sufficient'|'insufficient'|'unknown';
 reason:string;
 estimate?:BlindSurvivalEstimate;
}

export type EvaluateBlindSurvival=(state:GameStateV02,context:'boss'|'next_blind')=>BlindSurvivalEstimate;

let recentBossScore:{key:string;result:BossScoreAssessment}|undefined;

/** Score the registered boss with the current build, without assuming purchases or the tag payout. */
export function assessBossScore(state:GameStateV02,evaluate?:EvaluateBlindSurvival):BossScoreAssessment{
 const context=currentBoss(state),deckId=value(state.observed.deckId);
 if(!context||state.phase!=='blind_select')return {status:'unknown',reason:'Registra el jefe de este ante para calcular la puntuación.'};
 if(deckId===undefined)return {status:'unknown',reason:'Registra tu baraja para calcular la puntuación contra el jefe.'};
 const {blind,boss}=context;
 const definition=blindRequirement(blind.ante,'boss',boss.id,deckId);
 if(!definition.ok)return {status:'unknown',reason:definition.error.message};
 if(evaluate&&!implementedBossEffects(boss.id)){
  const reason=`La estimación de puntuación aún no incluye el efecto de ${boss.name}.`;
  return {status:'unknown',reason,estimate:{status:'unavailable',reason}};
 }
 const key=evaluate?null:JSON.stringify(state);
 if(key!==null&&recentBossScore?.key===key)return structuredClone(recentBossScore.result);
 const projected=selectionScenarioState(state);
 projected.observed.nextBlind=valueFact({
  ...blind,target:blind.target.status==='known'?blind.target:valueFact(definition.target),
  reward:blind.reward.status==='known'?blind.reward:valueFact(definition.reward)
 });
 const estimate=evaluate?evaluate(projected,'boss'):estimateBlindSurvival(projected);
 let result:BossScoreAssessment;
 if(estimate.status==='unavailable')result={status:'unknown',reason:estimate.reason,estimate};
 else if(estimate.estimatedPoints>=estimate.target)result={status:'sufficient',reason:`La puntuación media estimada alcanza la meta de ${boss.name}.`,estimate};
 else result={status:'insufficient',reason:`La puntuación media estimada queda por debajo de la meta de ${boss.name}.`,estimate};
 if(key!==null)recentBossScore={key,result:structuredClone(result)};
 return result;
}

type BossMatchup={harmful:boolean|null;reason:string};
const suitBoss:Readonly<Record<string,Card['suit']>>={the_club:'C',the_goad:'S',the_window:'D',the_head:'H'};
const knownHarm=(reason:string):BossMatchup=>({harmful:true,reason});

/** Relate the actual boss restriction to the available deck, jokers and ranked hand strategy. */
export function assessBossMatchup(state:GameStateV02,evaluate?:EvaluateBlindSurvival):BossMatchup{
 const context=currentBoss(state);
 if(!context)return {harmful:null,reason:'Registra el jefe para valorar su efecto contra tu estrategia.'};
 const {boss}=context,jokers=value(state.observed.jokers),ids=jokers?.map(joker=>joker.catalogId)??[];
 if(ids.includes('chicot'))return {harmful:false,reason:'Chicot anula el efecto del jefe.'};
 const cards=currentDeckCards(state)?.filter(card=>!card.debuff),primary=inferPrimaryHand(state);
 const resources=state.observed.resources,size=value(resources.handSize),hands=value(resources.handsPerRound);
 const discards=value(resources.discardsPerRound),smeared=ids.includes('smeared');
 const suit=suitBoss[boss.id];
 if(suit&&cards?.length){
  const disabled=cards.filter(card=>suitMatches(card,suit,smeared));
  const suitScorer=ids.some(id=>{
   const wanted=id==='bloodstone'?'H':simpleJoker(id)?.suit;
   if(wanted===undefined)return false;
   const matches=cards.filter(card=>suitMatches(card,wanted,smeared));
   return matches.length>0&&matches.every(card=>disabled.includes(card));
  });
  const dominant=disabled.length*2>=cards.length;
  const suitStrategy=primary!==null&&suitedHands.has(primary);
  if(disabled.length===cards.length||dominant&&(suitStrategy||suitScorer)||suitStrategy&&suitScorer)
   return knownHarm(`${boss.name} debilita las cartas que sostienen tu estrategia de palo.`);
 }
 if(boss.id==='the_plant'&&cards?.length){
  const figures=cards.filter(card=>face(card,jokers??[]));
  const reliesOnFigures=ids.some(id=>{
   if(id==='triboulet')return figures.some(card=>card.rank==='K'||card.rank==='Q');
   if(id==='baron')return figures.some(card=>card.rank==='K');
   if(id==='shoot_the_moon')return figures.some(card=>card.rank==='Q');
   return ['photograph','sock_and_buskin','smiley','scary_face'].includes(id);
  });
  if(figures.length===cards.length||figures.length>0&&reliesOnFigures)return knownHarm(`${boss.name} debilita las figuras que activan tus comodines.`);
 }
 if(boss.id==='the_hook'&&cards?.length&&ids.some(id=>['baron','mime','blackboard','shoot_the_moon'].includes(id)))
  return knownHarm(`${boss.name} descarta al azar cartas que tu estrategia necesita mantener en mano.`);
 if(boss.id==='the_eye'&&primary!==null&&(hands??0)>1&&(value(value(state.observed.jokerContext)?.handCounts?.[primary])??0)>1)
  return knownHarm(`${boss.name} impide repetir el tipo de mano que más aprovechas.`);
 if(boss.id==='the_psychic'&&ids.includes('half_joker'))return knownHarm(`${boss.name} exige cinco cartas y anula el bono de Half Joker.`);
 if(boss.id==='the_water'&&(discards??0)>0&&ids.includes('banner'))return knownHarm(`${boss.name} elimina los descartes y las fichas de Banner.`);
 if(boss.id==='the_manacle'&&primary!==null&&size!==undefined&&size-1<minimumFor(primary,ids.includes('four_fingers')))
  return knownHarm(`${boss.name} deja la mano demasiado pequeña para tu jugada principal.`);
 if(boss.id==='verdant_leaf'&&jokers&&jokers.every(joker=>value(joker.stickers)?.includes('eternal')))
  return knownHarm(`${boss.name} debilita todas las cartas y no tienes un comodín que puedas vender.`);

 // Only these unresolved boss matchups can change their advice from a score.
 if(evaluate&&boss.id!=='the_wall'&&boss.id!=='violet_vessel'&&boss.id!=='the_needle')
  return {harmful:null,reason:`No se detectó un perjuicio significativo de ${boss.name} para tu estrategia.`};
 const score=assessBossScore(state,evaluate);
 if(score.status==='sufficient')return {harmful:false,reason:`La puntuación media estimada alcanza la meta de ${boss.name}.`};
 if(score.estimate?.status==='estimated'){
  const {estimatedPoints,target}=score.estimate;
  if((boss.id==='the_wall'||boss.id==='violet_vessel')&&estimatedPoints<target&&estimatedPoints>=target*2/boss.multiplier)
   return knownHarm(`${boss.name} sube la meta por encima de la puntuación que alcanza tu composición.`);
  if(boss.id==='the_needle'&&score.status==='insufficient'&&primary!==null&&(hands??0)>1)
   return knownHarm(`${boss.name} te deja una sola mano y la estimación queda corta.`);
 }
 return {harmful:null,reason:score.status==='insufficient'
  ? `Falta puntuación contra ${boss.name}, pero no se confirmó que su efecto sea el problema.`
  : `No se confirmó que ${boss.name} perjudique significativamente tu estrategia.`};
}
