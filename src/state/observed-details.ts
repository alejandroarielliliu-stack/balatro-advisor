import type {GameState,JokerInstance,Result} from './model.js';
import {array,boolean,checkJsonValue,enumeration,fact,integer,object,text,union} from './schema.js';
import type {Infer} from './schema.js';
import {validateState} from './validation.js';
import {HAND_BASES} from '../catalog/initial.js';
import type {HandId} from '../catalog/initial.js';
import {observationCounterSpecs} from './observations.js';
const hand=enumeration(...Object.keys(HAND_BASES) as [HandId,...HandId[]]);
const counter=object({kind:enumeration('joker_counter'),instanceId:text(),key:text(),value:fact(integer())});
const edition=object({kind:enumeration('joker_edition'),instanceId:text(),value:fact(enumeration('base','foil','holographic','polychrome','negative'))});
const sale=object({kind:enumeration('joker_sell'),instanceId:text(),value:fact(integer(0))});
const stickers=object({kind:enumeration('joker_stickers'),instanceId:text(),value:fact(array(enumeration('eternal','perishable','rental'),3))});
const base=object({kind:enumeration('hand_base'),handId:hand,value:fact(object({level:integer(0),chips:integer(0),mult:integer(0)}))});
const history=object({kind:enumeration('hand_history'),scope:enumeration('run','round'),handId:hand,value:fact(integer(0))});
const tarots=object({kind:enumeration('tarots_used'),value:fact(integer(0))});
const operation=union(counter,union(edition,union(sale,union(stickers,union(base,union(history,tarots))))));
const schema=object({expectedRevision:integer(0),confirmUnchangedOthers:boolean,operations:array(operation,100)});
export type ObservedDetailOperation=Infer<typeof operation>;
export type ObservedDetailRequest=Infer<typeof schema>;
export interface ObservedDetailResult {patch:Partial<GameState['observed']>;description:string}
const known=<T>(value:T)=>({status:'known' as const,source:'manual' as const,value});
const unknown=()=>({status:'unknown' as const,reason:'Valor no observado. No se deduce de niveles, usos ni jugadas.'});
const fail=(code:string,message:string):Result<never>=>({ok:false,errors:[{path:'$observedDetails',code,message}]});
const normalize=<T>(value:{status:'known';value:T}|{status:'unknown';reason:string})=>value.status==='known'?known(structuredClone(value.value)):{status:'unknown' as const,reason:value.reason};

/** Expand only the declared level-one preset; unknown hands stay unknown. No level formula. */
type HandValues=Extract<Extract<GameState['observed']['handBases'],{status:'known'}>['value'],{values:unknown}>['values'];
export function observedHandBases(state:GameState):HandValues{
 const f=state.observed.handBases;
 if(f.status==='known'&&'values'in f.value)return structuredClone(f.value.values);
 return Object.fromEntries(Object.entries(HAND_BASES).map(([id,[chips,mult]])=>[id,f.status==='known'&&'preset'in f.value&&f.value.preset==='all-standard-level1'?known({level:1,chips,mult}):unknown()])) as ReturnType<typeof observedHandBases>;
}

/** Correct current observed facts only. Never replays actions or restores old context. */
export function observedDetails(input:unknown,requestInput:unknown):Result<ObservedDetailResult>{
 const validated=validateState(input);if(!validated.ok)return validated;const state=validated.value;
 const errors=checkJsonValue(requestInput);if(!errors.length)schema.check(requestInput,'$request',errors);if(errors.length)return {ok:false,errors};
 const r=requestInput as ObservedDetailRequest;
 if(state.revision!==r.expectedRevision)return fail('stale_revision','La partida cambió. Abre otra vez los datos observados.');
 if(!r.confirmUnchangedOthers)return fail('confirmation_required','Confirma que los demás datos conservados siguen igual.');
 if(!r.operations.length)return fail('empty_changes','Añade al menos un dato observado.');
 const patch:Partial<GameState['observed']>={},seen=new Set<string>();
 for(const op of r.operations){
  const identity=op.kind.startsWith('joker_')?op.kind+':'+('instanceId'in op?op.instanceId:'')+('key'in op?':'+op.key:''):op.kind+('handId'in op?':'+op.handId:'')+('scope'in op?':'+op.scope:'');
  if(seen.has(identity))return fail('duplicate_observation','El mismo dato aparece dos veces. Retira una entrada de la lista.');seen.add(identity);
  if(op.kind==='hand_base'){
   patch.handBases??=known({values:observedHandBases(state)});
   if(patch.handBases.status!=='known'||!('values'in patch.handBases.value))return fail('invalid_base','No se pudo preparar la base de manos.');
   patch.handBases.value.values[op.handId]=normalize(op.value);
  }else if(op.kind==='hand_history'||op.kind==='tarots_used'){
   patch.jokerContext??=known(state.observed.jokerContext?.status==='known'?structuredClone(state.observed.jokerContext.value):{});
   if(patch.jokerContext.status!=='known')return fail('invalid_context','No se pudo preparar el contexto.');
   const ctx=patch.jokerContext.value;
   if(op.kind==='tarots_used')ctx.tarotsUsed=normalize(op.value);
   else{const key=op.scope==='run'?'handCounts':'roundHandCounts';ctx[key]??={};ctx[key][op.handId]=normalize(op.value);}
  }else{
   if(state.observed.jokers.status!=='known')return fail('unknown_jokers','Confirma primero qué comodines tienes; no se restaura un inventario antiguo.');
   patch.jokers??=structuredClone(state.observed.jokers);if(patch.jokers.status!=='known')return fail('unknown_jokers','Falta inventario actual.');
   const j=patch.jokers.value.find(j=>j.instanceId===op.instanceId);if(!j)return fail('missing_joker','Ese comodín ya no está en el inventario registrado.');
   if(op.kind==='joker_counter'){
    const spec=observationCounterSpecs(j as JokerInstance)[op.key];if(!spec)return fail('unsupported_counter','Este contador no está implementado para el comodín seleccionado.');
    if(op.value.status==='known'&&(op.value.value<spec.min||spec.max!==undefined&&op.value.value>spec.max))return fail('out_of_range',spec.label+': valor fuera del rango admitido.');
    j.counters[op.key]=normalize(op.value);
   }else if(op.kind==='joker_edition')j.edition=normalize(op.value);
   else if(op.kind==='joker_sell')j.sellValue=normalize(op.value);
   else{if(op.value.status==='known'&&new Set(op.value.value).size!==op.value.value.length)return fail('duplicate_sticker','No repitas pegatinas.');j.stickers=normalize(op.value);}
  }
 }
 // A round count is a subset of the run total. Check only histories being edited.
 if(patch.jokerContext?.status==='known')for(const op of r.operations)if(op.kind==='hand_history'){
  const ctx=patch.jokerContext.value,run=ctx.handCounts?.[op.handId],round=ctx.roundHandCounts?.[op.handId];
  if(run?.status==='known'&&round?.status==='known'&&round.value>run.value)return fail('inconsistent_history','Las veces jugadas en esta ronda no pueden superar el total de la partida. Corrige ambos datos o marca el que no conoces.');
 }
 const checked=validateState({...state,observed:{...state.observed,...patch}});if(!checked.ok)return checked;
 return {ok:true,value:{patch,description:`Corrección puntual de ${r.operations.length} datos observados. No aplica ventas, consumibles ni jugadas; no calcula bases a partir del nivel. Los demás datos se declararon sin cambios.`}};
}
