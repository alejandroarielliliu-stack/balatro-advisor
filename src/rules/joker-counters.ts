import {counterSpecs} from '../catalog/joker-counters.js';
import type {GameState,JokerInstance} from '../state/model.js';
import {fail,need,safe,valueFact} from './core.js';
import type {Trace} from './core.js';
import {contextRule} from './joker-context.js';
export function counterValue(j:JokerInstance,key:string){
 const spec=counterSpecs(j.catalogId)[key],fact=j.counters[key];
 if(!spec||!fact)fail('$.observed.jokers.'+j.instanceId+'.counters.'+key,'unknown_data','Falta el contador '+(spec?.label??key));
 const n=need(fact,'$.observed.jokers.'+j.instanceId+'.counters.'+key);
 if(!Number.isSafeInteger(n)||n<spec.min||(spec.max!==undefined&&n>spec.max))fail('$.observed.jokers.'+j.instanceId+'.counters.'+key,'invalid_counter','Contador fuera del rango compatible.');
 return n;
}
export function updateCounter(j:JokerInstance,key:string,n:number,trace:Trace[]){const before=counterValue(j,key);j.counters[key]=valueFact(safe(n));trace.push({ruleId:contextRule,label:j.catalogId+' · '+key,values:{instanceId:j.instanceId,before,after:n}});}
/** End-of-hand decay happens after scoring; food disappears instead of lingering at zero. */
export function decayJokers(state:GameState,phase:'hand'|'round',trace:Trace[]){
 const physical=need(state.observed.jokers,'$.observed.jokers');
 for(const j of [...physical]){
  let key='',amount=0;
  if(phase==='hand'&&j.catalogId==='ice_cream'){key='chips';amount=5;}
  if(phase==='hand'&&j.catalogId==='selzer'){key='hands';amount=1;}
  if(phase==='round'&&j.catalogId==='popcorn'){key='mult';amount=4;}
  if(phase==='round'&&j.catalogId==='hit_the_road')updateCounter(j,'x100',100,trace);
  if(key){const before=counterValue(j,key);if(before<=amount){physical.splice(physical.indexOf(j),1);trace.push({ruleId:contextRule,label:'Comodín consumido',values:{instanceId:j.instanceId,before}});}else updateCounter(j,key,before-amount,trace);}
 }
}
