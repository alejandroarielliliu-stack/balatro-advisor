import type {Card} from '../catalog/initial.js';
import type {JokerInstance,GameState} from '../state/model.js';
import {ALL_JOKER_FACTS} from '../catalog/all-joker-facts.js';
import {deckCards,fail,need} from './core.js';
export const contextRule='jokers.context';
export interface ScoringContext {heldCardIds?:string[];remainingCardIds?:string[];handsRemaining?:number}
/** No unknown held card or draw is inferred from deck composition. */
export function scoringContext(state:GameState,played:readonly string[],input:ScoringContext){
 const deck=deckCards(state);
 const read=(key:'heldCardIds'|'remainingCardIds')=>{
  const ids=input[key];if(ids===undefined)return undefined;
  if(!Array.isArray(ids)||new Set(ids).size!==ids.length||ids.some(id=>played.includes(id)||!deck.some(c=>c.instanceId===id)))fail('$hand.'+key,'invalid_card_context','Las cartas del contexto deben ser distintas, del mazo y no jugadas.');
  return ids.map(id=>deck.find(c=>c.instanceId===id)!);
 };
 const held=read('heldCardIds'),remaining=read('remainingCardIds');
 if(held&&remaining&&held.some(c=>remaining.some(r=>r.instanceId===c.instanceId)))fail('$hand','invalid_card_context','Una carta no puede estar retenida y pendiente de robo.');
 return {held,remaining,deck};
}
export function requireCards(cards:Card[]|undefined,label:string){if(!cards)fail('$hand','unknown_data',`Falta ${label}; no se supone una mano vacía.`);return cards;}
/** Copied effects retain the target's counter; copies don't create additional physical jokers. */
export type EffectiveJoker=JokerInstance & {copiedFrom?:string};
export function effectiveJokers(jokers:JokerInstance[]):EffectiveJoker[]{
 const resolve=(index:number,seen:Set<number>):JokerInstance|null=>{
  if(index<0||index>=jokers.length||seen.has(index))return null;
  const j=jokers[index]!;if(!['blueprint','brainstorm'].includes(j.catalogId))return j;
  seen.add(index);const target=resolve(j.catalogId==='blueprint'?index+1:0,seen);
  if(!target)return null;
  const advanced=ALL_JOKER_FACTS[target.catalogId];
  if(advanced&&!advanced.blueprint || target.catalogId==='golden_joker')return null;
  return target;
 };
 return jokers.flatMap((_,i)=>{const j=resolve(i,new Set());return j?[j===jokers[i]?j:{...j,instanceId:jokers[i]!.instanceId,copiedFrom:j.instanceId}]:[];});
}
export const face=(card:Card,physical:readonly JokerInstance[])=>!card.debuff&&(physical.some(j=>j.catalogId==='pareidolia')||card.enhancement!=='stone'&&['J','Q','K'].includes(card.rank));
export function finalHand(input:ScoringContext,max:number){
 if(!Number.isSafeInteger(input.handsRemaining)||input.handsRemaining!<0||input.handsRemaining!>=max)fail('$hand.handsRemaining','unknown_data','Indica las manos restantes después de jugar esta mano.');
 return input.handsRemaining===0;
}
export function stencilMultiplier(state:GameState,physical:readonly JokerInstance[]){return Math.max(1,need(state.observed.resources.jokerSlots,'$.resources.jokerSlots')-physical.length+physical.filter(j=>j.catalogId==='stencil').length);}
