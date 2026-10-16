import {handPatterns,suitMatches,fourDistinctSuits} from './hand-patterns.js';
import type {Card} from '../catalog/initial.js';
import type {SimpleJoker} from '../catalog/simple-jokers.js';
import type {GameState} from '../state/model.js';
import {inventory,need,safe} from './core.js';
export const simpleRule='jokers.simple';
export function cardMatches(d:SimpleJoker,c:Card,smeared=false){return d.condition==='suit'?suitMatches(c,d.suit!,smeared):d.condition==='ranks'?c.enhancement!=='stone'&&d.ranks!.includes(c.rank):false;}
/** Contains a pattern, not merely the category finally named. */
function matches(d:SimpleJoker,played:readonly Card[],scored:readonly Card[],discards:number,ids:readonly string[]){
 const counts=Object.values(played.reduce<Record<string,number>>((a,c)=>{a[c.rank]=(a[c.rank]??0)+1;return a;},{})).sort((a,b)=>b-a);
 switch(d.condition){
  case 'pair':return (counts[0]??0)>=2;
  case 'three':return (counts[0]??0)>=3;
  case 'four':return (counts[0]??0)>=4;
  case 'two_pair':return (counts[0]??0)>=2&&(counts[1]??0)>=2;
  case 'straight':return handPatterns(played,ids).straight.length>0;
  case 'flush':return handPatterns(played,ids).flush.length>0;
  case 'zero_discards':return discards===0;
  case 'flower_pot':return fourDistinctSuits(scored,ids.includes('smeared'));
  case 'seeing_double':return scored.some(c=>suitMatches(c,'C',ids.includes('smeared')))&&scored.some(c=>!suitMatches(c,'C',ids.includes('smeared')));
  default:return true;
 }
}
export function mainBonus(d:SimpleJoker,state:GameState,instanceId:string,played:readonly Card[],scored:readonly Card[],discards:number,upper=false){
 if(!upper&&!matches(d,played,scored,discards,inventory(state).map(j=>j.catalogId)))return {chips:0,mult:0,xmult:1};
 let chips=d.chips,mult=d.mult;
 if(d.condition==='money_chips'||d.condition==='money_mult'){
  const balance=need(state.observed.money,'$.observed.money');
  if(d.condition==='money_chips')chips=safe(Math.max(0,balance)*d.chips);
  else mult=safe(Math.max(0,Math.floor(balance/5))*d.mult);
 }
 if(d.condition==='sell_mult')mult=safe(inventory(state).filter(j=>j.instanceId!==instanceId).reduce((sum,j)=>sum+need(j.sellValue,'$.observed.jokers.'+j.instanceId+'.sellValue'),0));
 return {chips,mult,xmult:d.xmult};
}
