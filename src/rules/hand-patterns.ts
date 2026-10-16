import type {Card} from '../catalog/initial.js';
import {rankValue} from '../catalog/initial.js';
export const suitMatches=(card:Card,suit:string,smeared=false)=>card.enhancement!=='stone'&&(card.enhancement==='wild'||card.suit===suit||(smeared&&(['S','C'].includes(card.suit)===['S','C'].includes(suit))));
/** Mirrors the rank walk in get_straight, including low Ace and a single missing rank per gap. */
export function handPatterns(cards:readonly Card[],ids:readonly string[]){
 const minimum=ids.includes('four_fingers')?4:5,smeared=ids.includes('smeared'),shortcut=ids.includes('shortcut');
 let run:Card[]=[],length=0,found=false,skipped=false;
 for(let rank=1;rank<=14;rank++){
  const group=cards.filter(c=>rankValue(c)===(rank===1?14:rank));
  if(group.length){length++;skipped=false;run.push(...group);}
  else if(shortcut&&!skipped&&rank!==14)skipped=true;
  else {length=0;skipped=false;if(found)break;run=[];}
  if(length>=minimum)found=true;
 }
 const straight=found?[...new Set(run)]:[];
 const flush=['S','H','C','D'].map(s=>cards.filter(c=>suitMatches(c,s,smeared))).find(cs=>cs.length>=minimum)??[];
 return {straight,flush};
}
export function fourDistinctSuits(cards:readonly Card[],smeared:boolean){
 const pick=(i:number,used:Set<number>):boolean=>i===4||cards.some((c,index)=>!used.has(index)&&suitMatches(c,['S','H','C','D'][i]!,smeared)&&pick(i+1,new Set([...used,index])));
 return pick(0,new Set());
}
