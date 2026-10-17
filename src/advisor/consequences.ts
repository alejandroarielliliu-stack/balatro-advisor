import type {Fact,GameState,JokerInstance,Issue} from '../state/model.js';
import type {ShopAction} from '../rules/shop.js';
import type {EngineResult} from '../rules/core.js';
import type {Advice} from './advisor.js';
import type {Metrics} from './policy.js';
import {canonical,equal} from '../storage/confirmed-record.js';
const value=<T>(fact:Fact<T>|undefined):T|null=>fact?.status==='known'?fact.value:null;
export interface NumericChange {before:number|null;after:number|null;delta:number|null}
const numeric=(before:number|null,after:number|null):NumericChange=>({before,after,delta:before===null||after===null?null:after-before});
export interface CounterChange {instanceId:string;catalogId:string;key:string;before:Fact<number>|null;after:Fact<number>|null}
export interface ImmediateConsequences {
 money:NumericChange;occupiedJokerSlots:NumericChange;freeJokerSlots:NumericChange;resources:{field:keyof GameState['observed']['resources'];change:NumericChange}[];
 removed:JokerInstance[];added:JokerInstance[];counters:CounterChange[];
}
function counterChanges(before:GameState,after:GameState):CounterChange[]{
 const result:CounterChange[]=[],old=value(before.observed.jokers),current=value(after.observed.jokers);if(!old||!current)return result;
 for(const j of old){const retained=current.find(c=>c.instanceId===j.instanceId);if(!retained)continue;
  for(const key of new Set([...Object.keys(j.counters),...Object.keys(retained.counters)])){const b=j.counters[key]??null,a=retained.counters[key]??null;if(!equal(b,a))result.push({instanceId:j.instanceId,catalogId:j.catalogId,key,before:structuredClone(b),after:structuredClone(a)});}
 }return result;
}
/** Differences between supplied H2 snapshots only. No rules or benefit weights. */
export function immediateConsequences(before:GameState,after:GameState):ImmediateConsequences{
 const old=value(before.observed.jokers),current=value(after.observed.jokers),slotsBefore=value(before.observed.resources.jokerSlots),slotsAfter=value(after.observed.resources.jokerSlots);
 return {money:numeric(value(before.observed.money),value(after.observed.money)),occupiedJokerSlots:numeric(old?.length??null,current?.length??null),freeJokerSlots:numeric(old&&slotsBefore!==null?slotsBefore-old.length:null,current&&slotsAfter!==null?slotsAfter-current.length:null),resources:(Object.keys(before.observed.resources) as (keyof GameState['observed']['resources'])[]).map(field=>({field,change:numeric(value(before.observed.resources[field]),value(after.observed.resources[field]))})),
  removed:old&&current?structuredClone(old.filter(j=>!current.some(c=>c.instanceId===j.instanceId))):[],added:old&&current?structuredClone(current.filter(j=>!old.some(c=>c.instanceId===j.instanceId))):[],counters:counterChanges(before,after)};
}
export interface ScenarioConsequence {
 scenarioId:string;status:'reached'|'not_reached'|'incompatible'|'unavailable';metrics:Metrics|null;
 versusHold:{scoreDelta:number|null;scoreComparison:'same_resources'|'different_resources'|'unavailable';moneyAfterShopDelta:number|null;moneyAfterRoundDelta:number|null;handsUsedDelta:number|null;discardsUsedDelta:number|null;goalChange:'gained'|'lost'|'same'|'unknown'};
 counters:CounterChange[];errors:Issue[];limitations:string[];
}
export interface ScenarioAlternative {
 id:string;action:ShopAction;status:'not_assessed'|'reaches_all'|'reaches_some'|'reaches_none'|'incomplete';
 outcomes:ScenarioConsequence[];sensitiveToScenario:boolean;sacrificed:JokerInstance[];
}
export interface ScenarioConsequences {
 status:'not_assessed'|'evaluated'|'incomplete';plans:{id:string;description:string;role:string}[];
 alternatives:ScenarioAlternative[];recommendation:Advice['recommendation']|null;errors:Issue[];limitations:string[];
}
export const actionIdentity=(action:ShopAction)=>JSON.stringify(canonical(action));
/** Presentation contract over H3/T07b, retaining outcomes/errors and avoiding probability language. */
export function scenarioConsequences(result:EngineResult<Advice>|null):ScenarioConsequences{
 const limitations=['Solo estos planes fijos; no predicen robos ni permiten estimar la probabilidad de ganar.','No alcanzar el objetivo con este plan no demuestra que la partida se pierda.','Compara comodines y conservar; los planes no eligen entre vales, sobres y contenidos desconocidos.','Un contador que cambia no demuestra crecimiento útil; revisa las activaciones de la rama.'];
 if(!result)return {status:'not_assessed',plans:[],alternatives:[],recommendation:null,errors:[],limitations};
 if(!result.ok)return {status:'incomplete',plans:[],alternatives:[],recommendation:null,errors:structuredClone(result.errors),limitations};
 const advice=result.value,hold=advice.alternatives.find(a=>a.action.type==='hold');
 const alternatives=advice.alternatives.map(a=>{
  const outcomes:ScenarioConsequence[]=a.scenarios.map(s=>{
   const base=hold?.scenarios.find(b=>b.scenarioId===s.scenarioId)?.metrics??null,m=s.metrics,calc=s.calculation,evaluation=calc.evaluation?.ok?calc.evaluation.value:null;
   const comparable=!!base&&!!m,same=comparable&&m.handsUsed===base.handsUsed&&m.discardsUsed===base.discardsUsed;
   const moneyComparable=comparable&&m.reached&&base.reached;
   const errors=[...(!calc.shop.ok?calc.shop.errors:[]),...(calc.evaluation&&!calc.evaluation.ok?calc.evaluation.errors:evaluation?.errors??[])];
   const economic=evaluation?.economicLimitation;
   return {scenarioId:s.scenarioId,status:m?(m.reached?'reached':'not_reached'):evaluation?.outcome==='incompatible'?'incompatible':'unavailable',metrics:structuredClone(m),
    versusHold:{scoreDelta:same?m.score-base.score:null,scoreComparison:!comparable?'unavailable':same?'same_resources':'different_resources',moneyAfterShopDelta:comparable?numeric(base.moneyAfterShop,m.moneyAfterShop).delta:null,moneyAfterRoundDelta:moneyComparable?numeric(base.moneyAfterRound,m.moneyAfterRound).delta:null,handsUsedDelta:comparable?m.handsUsed-base.handsUsed:null,discardsUsedDelta:comparable?m.discardsUsed-base.discardsUsed:null,goalChange:!comparable?'unknown':m.reached===base.reached?'same':m.reached?'gained':'lost'},
    counters:evaluation&&evaluation.outcome!=='incompatible'&&calc.shop.ok?counterChanges(calc.shop.value.state,evaluation.finalState):[],errors:structuredClone(errors),limitations:[...(economic?[economic]:[]),...(!same&&comparable?['No se resta puntuación de ramas que consumieron distintas manos o descartes; compara sus recursos y el objetivo.']:[])]};
  });
  const reached=outcomes.filter(o=>o.status==='reached').length,missing=!a.complete||outcomes.some(o=>o.status==='incompatible'||o.status==='unavailable');
  return {id:a.id,action:structuredClone(a.action),status:!outcomes.length?'not_assessed':missing?'incomplete':reached===outcomes.length?'reaches_all':reached?'reaches_some':'reaches_none',outcomes,sensitiveToScenario:outcomes.some(o=>o.status==='reached')&&outcomes.some(o=>o.status==='not_reached'),sacrificed:structuredClone(a.sacrificed)} as ScenarioAlternative;
 });
 return {status:!advice.scenarios.length?'not_assessed':alternatives.some(a=>a.status==='incomplete')||advice.errors.length?'incomplete':'evaluated',plans:advice.scenarios.map(s=>({id:s.plan.planId,description:s.plan.description,role:s.role})),alternatives,recommendation:structuredClone(advice.recommendation),errors:structuredClone(advice.errors),limitations:[...limitations,...advice.limitations]};
}
