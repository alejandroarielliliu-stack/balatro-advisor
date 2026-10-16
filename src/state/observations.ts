import type {GameState,Result,JokerInstance} from './model.js';
import {validateState} from './validation.js';
import {array,checkJsonValue,integer,object,text} from './schema.js';
import {counterSpecs} from '../catalog/joker-counters.js';
import type {CounterSpec} from '../catalog/joker-counters.js';
import {ALL_JOKER_FACTS} from '../catalog/all-joker-facts.js';

export type ObservationTarget={kind:'counter';instanceId:string;key:string}|{kind:'sell';instanceId:string}|{kind:'resource';key:keyof GameState['observed']['resources']}|{kind:'money'};
export interface ObservationNeed {id:string;label:string;reason:string;affects:string[];min:number;max?:number;target:ObservationTarget;revision:number}
export interface ObservationAnswer {needId:string;value:number}
export type ObservationPatch=Partial<GameState['observed']>;
const specs=(j:JokerInstance):Readonly<Record<string,CounterSpec>>=>j.catalogId==='green_joker'?{greenMult:{label:'Mult actual',min:0,initial:0}}:counterSpecs(j.catalogId);
const id=(target:ObservationTarget)=>JSON.stringify(target);
const resources={handsPerRound:'Manos por ronda',discardsPerRound:'Descartes por ronda',handSize:'Tamaño de mano',jokerSlots:'Espacios de comodín'};
const fail=(code:string,message:string,path='$observations'):Result<never>=>({ok:false,errors:[{path,code,message}]});

/** Requests only implemented numeric facts that are absent for the current inventory/context. */
export function observationNeeds(input:unknown):Result<ObservationNeed[]>{
 const validated=validateState(input);if(!validated.ok)return validated;const s=validated.value,needs:ObservationNeed[]=[];
 if(s.phase==='finished')return {ok:true,value:needs};
 const add=(target:ObservationTarget,label:string,reason:string,affects:string[],min:number,max?:number)=>needs.push({id:id(target),target,label,reason,affects,min,...(max===undefined?{}:{max}),revision:s.revision});
 if(s.observed.jokers.status==='known')for(const [index,j] of s.observed.jokers.value.entries()){
  if(!ALL_JOKER_FACTS[j.catalogId])continue;const name=`${ALL_JOKER_FACTS[j.catalogId]!.name} · posición ${index+1}`;
  for(const [key,spec]of Object.entries(specs(j)))if(j.counters[key]?.status!=='known')add({kind:'counter',instanceId:j.instanceId,key},`${name} · ${spec.label}`,
   'El resumen no determina este valor. Introduce el que muestra el comodín; vacío sigue desconocido.',
   [key==='dollars'?'economía':'efecto del comodín','valoración contextual'],spec.min,spec.max);
  if(j.sellValue.status==='unknown'&&s.phase==='shop')add({kind:'sell',instanceId:j.instanceId},`${name} · valor de venta ($)`,'Necesario para comparar vender o reemplazar; no se deduce del precio original.',['venta','reemplazo'],0);
 }
 if(s.phase==='shop'||s.phase==='blind_select'){
  if(s.observed.money.status==='unknown')add({kind:'money'},'Dinero actual ($)','Sin saldo observado no se puede comprobar el presupuesto.',['compras','economía'],Number.MIN_SAFE_INTEGER);
  for(const [key,label]of Object.entries(resources))if(s.observed.resources[key as keyof typeof resources].status==='unknown')add({kind:'resource',key:key as keyof typeof resources},label,'Confirma el recurso actual; los vales y comodines pueden modificarlo.',['recursos',key==='jokerSlots'?'compras':'evaluación de ronda'],0);
 }
 return {ok:true,value:needs};
}

/** A narrow observed-data correction; never accepts a projected state or replays game effects. */
export function observationPatch(input:unknown,answersInput:unknown,expectedRevision:number):Result<ObservationPatch>{
 const validated=validateState(input);if(!validated.ok)return validated;const state=validated.value;
 if(state.revision!==expectedRevision)return fail('stale_revision','La partida cambió. Recarga los datos pendientes antes de responder.');
 const errors=checkJsonValue(answersInput);if(!errors.length)array(object({needId:text(1000),value:integer()}),200).check(answersInput,'$answers',errors);
 if(errors.length)return {ok:false,errors};const answers=answersInput as ObservationAnswer[];
 if(!answers.length)return fail('empty_answers','Introduce al menos un dato observado.');
 const listed=observationNeeds(state);if(!listed.ok)return listed;const needs=new Map(listed.value.map(n=>[n.id,n])),seen=new Set<string>(),patch:ObservationPatch={};
 for(const answer of answers){
  const need=needs.get(answer.needId);if(!need||seen.has(answer.needId))return fail('invalid_need','El dato ya no está pendiente, no está implementado o se repitió.');seen.add(answer.needId);
  if(answer.value<need.min||need.max!==undefined&&answer.value>need.max)return fail('out_of_range',`${need.label}: valor fuera del rango admitido.`);
  const known={status:'known' as const,source:'manual' as const,value:answer.value},target=need.target;
  if(target.kind==='money')patch.money=known;
  else if(target.kind==='resource'){patch.resources??=structuredClone(state.observed.resources);patch.resources[target.key]=known;}
  else{
   if(state.observed.jokers.status!=='known')return fail('missing_inventory','Confirma primero el inventario actual.');
   patch.jokers??=structuredClone(state.observed.jokers);if(patch.jokers.status!=='known')return fail('missing_inventory','Falta el inventario.');
   const j=patch.jokers.value.find(j=>j.instanceId===target.instanceId)!;
   if(target.kind==='sell')j.sellValue=known;else j.counters[target.key]=known;
  }
 }
 const checked=validateState({...state,observed:{...state.observed,...patch}});return checked.ok?{ok:true,value:patch}:checked;
}
