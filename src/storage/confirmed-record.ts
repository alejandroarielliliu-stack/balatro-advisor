import {effectChoiceSchema} from '../state/effect-choices.js';
import {validateLegacyState,validateCurrentState} from '../state/validation.js';
import type {GameState,GameStateLegacy,GameStateV02,Result} from '../state/model.js';
import {array,boolean,checkJsonValue,enumeration,integer,object,text,union} from '../state/schema.js';
import type {Schema,Infer} from '../state/schema.js';
import type {Trace} from '../rules/core.js';
import {runProgressCommandSchema,inventoryConfirmationSchema} from '../run/progress.js';

export const MAX_RECORD_BYTES=8*1024*1024;
const nullable=<T>(schema:Schema<T>):Schema<T|null>=>({check:(v,p,e)=>v===null||schema.check(v,p,e)});
const stateSchema=<T extends GameState>(validate:(v:unknown)=>Result<T>):Schema<T>=>({check(v,p,e){const r=validate(v);if(!r.ok)e.push(...r.errors.map(x=>({...x,path:p+x.path.slice(1)})));return r.ok;}});
export const actionSchema=union(union(object({type:enumeration('hold')},{choices:array(effectChoiceSchema,2000)}),object({type:enumeration('sell'),instanceId:text()},{choices:array(effectChoiceSchema,2000)})),
  union(object({type:enumeration('buy'),offerId:text(),instanceId:text()},{choices:array(effectChoiceSchema,2000)}),object({type:enumeration('replace'),sellInstanceId:text(),offerId:text(),instanceId:text()},{choices:array(effectChoiceSchema,2000)})));
export const voucherActionSchema=object({type:enumeration('buy_voucher'),offerId:text()});
export const currentActionSchema=union(actionSchema,voucherActionSchema);
// Old bindings remain valid only for old documents. A migrated document needs
// its schema in the binding even when its numeric revision did not change.
export const bindingSchema=object({runId:text(),revision:integer(0),rulesetId:text()},{schemaVersion:enumeration('0.2')});
export type AnalysisBinding=Infer<typeof bindingSchema>;
export const analysisBinding=(state:GameState):AnalysisBinding=>({runId:state.runId,revision:state.revision,rulesetId:state.rulesetId,...(state.schemaVersion==='0.2'?{schemaVersion:'0.2' as const}:{})});
const evidenceSchema=object({status:enumeration('documented','limited','abstain'),verifiedAgainstGame:boolean,
  limitations:array(object({ruleId:text(),status:enumeration('confirmed','provisional','pending','missing'),evidenceIds:array(text()),message:text(2000)}))});
const traceSchema:Schema<Trace[]>={check(v,p,e){
  if(!Array.isArray(v)){e.push({path:p,code:'trace',message:'Traza inválida.'});return false;}
  for(const t of v)if(!t||typeof t!=='object'||typeof t.ruleId!=='string'||typeof t.label!=='string'||!t.values||typeof t.values!=='object'||Array.isArray(t.values)||Object.keys(t).some(k=>!['ruleId','label','values'].includes(k))||Object.values(t.values).some(x=>typeof x!=='string'&&typeof x!=='number')){e.push({path:p,code:'trace',message:'Paso de traza inválido.'});return false;}
  return true;
}};
const entrySchema=<T extends GameState>(state:Schema<T>)=>object({id:text(),kind:enumeration('action','correction','undo'),before:state,after:state,
  action:nullable(actionSchema),reason:text(2000),targetEntryId:nullable(text()),evidence:nullable(evidenceSchema),trace:traceSchema});
const legacyState=stateSchema<GameStateLegacy>(validateLegacyState),currentState=stateSchema<GameStateV02>(validateCurrentState);
const progressPayloadSchema=object({command:runProgressCommandSchema,inventory:inventoryConfirmationSchema,limitations:array(text(2000),100)});
const currentEntrySchema=object({id:text(),kind:enumeration('action','correction','undo','progress'),before:currentState,after:currentState,
  action:nullable(currentActionSchema),reason:text(2000),targetEntryId:nullable(text()),evidence:nullable(evidenceSchema),trace:traceSchema},{progress:progressPayloadSchema});
const legacyJournal=object({schemaVersion:enumeration('confirmed-1'),initialState:legacyState,state:legacyState,history:array(entrySchema(legacyState),1000)});
const currentJournal=object({schemaVersion:enumeration('confirmed-2'),initialState:currentState,state:currentState,history:array(currentEntrySchema,1000)});
const journalSchema=union(legacyJournal,currentJournal);
export type ConfirmedRecord=Infer<typeof journalSchema>;
export type ConfirmedEntry=ConfirmedRecord['history'][number];
export type EntryInput=Omit<Infer<typeof currentEntrySchema>,'before'|'after'>&{before:GameState;after:GameState};
export const canonical=(v:unknown):unknown=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,canonical(x)])):v;
export const equal=(a:unknown,b:unknown)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
export function validateConfirmedRecord(input:unknown):Result<ConfirmedRecord>{
  const errors=checkJsonValue(input);if(!errors.length)journalSchema.check(input,'$',errors);
  if(errors.length)return {ok:false,errors};
  const d=structuredClone(input) as ConfirmedRecord;let previous:GameState=d.initialState;const ids=new Set<string>();
  const invalid=(message:string):Result<never>=>({ok:false,errors:[{path:'$history',code:'invalid_history',message}]});
  for(const entry of d.history){
    const increment=entry.kind==='action'&&entry.action?.type==='replace'?2:1;
    if(ids.has(entry.id)||!equal(entry.before,previous)||entry.after.runId!==previous.runId||entry.after.rulesetId!==previous.rulesetId||entry.after.revision!==previous.revision+increment)return invalid('Historial discontinuo, ID duplicado o revisión no creciente.');
    if(entry.kind==='action'?entry.action===null||entry.evidence===null||entry.targetEntryId!==null:entry.action!==null||entry.evidence!==null)return invalid('Tipo de entrada inconsistente.');
    const progress='progress' in entry?entry.progress:undefined;
    if(entry.kind==='progress'?!progress||entry.targetEntryId!==null:progress!==undefined)return invalid('Solo el avance de partida puede contener un comando de progreso y debe identificarlo.');
    if(entry.targetEntryId!==null&&!ids.has(entry.targetEntryId))return invalid('La corrección apunta a una entrada inexistente.');
    ids.add(entry.id);previous=entry.after;
  }
  if(!equal(previous,d.state))return invalid('El estado y la última entrada no coinciden.');
  if(new TextEncoder().encode(JSON.stringify(d)).byteLength>MAX_RECORD_BYTES)return {ok:false,errors:[{path:'$',code:'size',message:'El registro supera 8 MiB. Exporta el archivo; no se elimina historial automáticamente.'}]};
  return {ok:true,value:d};
}
