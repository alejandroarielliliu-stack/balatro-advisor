import {counterSpecs} from '../catalog/joker-counters.js';
import type {CounterSpec} from '../catalog/joker-counters.js';
import {ALL_JOKER_FACTS} from '../catalog/all-joker-facts.js';
import type {Fact,Issue} from './model.js';

/** Offered values have the same units and ranges as the acquired Joker. */
export function validateOfferCounters(catalogId:string,counters:Record<string,Fact<number>>,path:string):Issue[]{
 const id=ALL_JOKER_FACTS[catalogId]?catalogId:Object.keys(ALL_JOKER_FACTS).find(key=>ALL_JOKER_FACTS[key]!.artId===catalogId)??catalogId;
 const specs:Readonly<Record<string,CounterSpec>>=id==='green_joker'?{greenMult:{label:'Mult actual',min:0,initial:0}}:counterSpecs(id);
 const errors:Issue[]=[];
 for(const [key,fact]of Object.entries(counters)){
  const spec=specs[key];
  if(!spec){errors.push({path:path+'.'+key,code:'invalid_counter',message:'Este comodín no tiene ese valor editable.'});continue;}
  if(fact.status==='known'&&(fact.value<spec.min||'max'in spec&&typeof spec.max==='number'&&fact.value>spec.max))errors.push({path:path+'.'+key,code:'invalid_counter',message:spec.label+': valor fuera del rango admitido.'});
 }
 return errors;
}
