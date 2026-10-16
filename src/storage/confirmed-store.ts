import {effectChoiceSchema} from '../state/effect-choices.js';
import { createStateStore } from './state-store.js';
import type { StoragePort } from './state-store.js';
import { validateState } from '../state/validation.js';
import type { GameState, Result } from '../state/model.js';
import { array, boolean, checkJsonValue, enumeration, integer, object, text, union } from '../state/schema.js';
import type { Schema, Infer } from '../state/schema.js';
import { applyShopAction } from '../rules/shop.js';
import type { EngineOptions, Trace } from '../rules/core.js';

export const CONFIRMED_STORAGE_KEY='balatro-advisor.confirmed.v1';
export const MAX_RECORD_BYTES=8*1024*1024;
const nullable=<T>(s:Schema<T>):Schema<T|null>=>({check(v,p,e){return v===null || s.check(v,p,e);}});
const stateSchema:Schema<GameState>={check(v,p,e){const r=validateState(v);if(!r.ok)e.push(...r.errors.map(x=>({...x,path:p+x.path.slice(1)})));return r.ok;}};
const actionSchema=union(union(object({type:enumeration('hold')},{choices:array(effectChoiceSchema,2000)}),object({type:enumeration('sell'),instanceId:text()},{choices:array(effectChoiceSchema,2000)})),
  union(object({type:enumeration('buy'),offerId:text(),instanceId:text()},{choices:array(effectChoiceSchema,2000)}),object({type:enumeration('replace'),sellInstanceId:text(),offerId:text(),instanceId:text()},{choices:array(effectChoiceSchema,2000)})));
const bindingSchema=object({runId:text(),revision:integer(0),rulesetId:text()});
export type AnalysisBinding=Infer<typeof bindingSchema>;
export const analysisBinding=(state:GameState):AnalysisBinding=>({runId:state.runId,revision:state.revision,rulesetId:state.rulesetId});
const evidenceSchema=object({status:enumeration('documented','limited','abstain'),verifiedAgainstGame:boolean,
  limitations:array(object({ruleId:text(),status:enumeration('confirmed','provisional','pending','missing'),evidenceIds:array(text()),message:text(2000)}))});
const traceSchema:Schema<Trace[]>={check(v,p,e){
  if(!Array.isArray(v)) {e.push({path:p,code:'trace',message:'Traza inválida.'});return false;}
  for(const t of v)if(!t || typeof t!=='object' || typeof t.ruleId!=='string' || typeof t.label!=='string' || !t.values || typeof t.values!=='object' || Array.isArray(t.values) || Object.keys(t).some(k=>!['ruleId','label','values'].includes(k)) || Object.values(t.values).some(x=>typeof x!=='string' && typeof x!=='number')) {e.push({path:p,code:'trace',message:'Paso de traza inválido.'});return false;}
  return true;
}};
const entrySchema=object({id:text(),kind:enumeration('action','correction','undo'),before:stateSchema,after:stateSchema,
  action:nullable(actionSchema),reason:text(2000),targetEntryId:nullable(text()),evidence:nullable(evidenceSchema),trace:traceSchema});
const journalSchema=object({schemaVersion:enumeration('confirmed-1'),initialState:stateSchema,state:stateSchema,history:array(entrySchema,1000)});
export type ConfirmedRecord=Infer<typeof journalSchema>;
export type ConfirmedEntry=ConfirmedRecord['history'][number];
const issue=<T>(code:string,message:string,path='$confirmation'):Result<T>=>({ok:false,errors:[{code,message,path}]});
function canonical(v:unknown):unknown {return Array.isArray(v) ? v.map(canonical) : v && typeof v==='object' ? Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b)).map(([k,x])=>[k,canonical(x)])) : v;}
const equal=(a:unknown,b:unknown)=>JSON.stringify(canonical(a))===JSON.stringify(canonical(b));
function check<T>(schema:Schema<T>,input:unknown):Result<T>{
  const errors=checkJsonValue(input);if(!errors.length)schema.check(input,'$',errors);
  return errors.length ? {ok:false,errors} : {ok:true,value:structuredClone(input) as T};
}
export function validateConfirmedRecord(input:unknown):Result<ConfirmedRecord>{
  const result=check(journalSchema,input);if(!result.ok)return result;
  const d=result.value;let previous=d.initialState;const ids=new Set<string>();
  for(const entry of d.history){
    const increment=entry.kind==='action' && entry.action?.type==='replace' ? 2 : 1;
    if(ids.has(entry.id) || !equal(entry.before,previous) || entry.after.runId!==previous.runId || entry.after.rulesetId!==previous.rulesetId || entry.after.revision!==previous.revision+increment)
      return issue('invalid_history','Historial discontinuo, ID duplicado o revisión no creciente.','$history');
    if(entry.kind==='action' ? entry.action===null || entry.evidence===null || entry.targetEntryId!==null : entry.action!==null || entry.evidence!==null)
      return issue('invalid_history','Tipo de entrada inconsistente.','$history');
    if(entry.targetEntryId!==null && !ids.has(entry.targetEntryId))return issue('invalid_history','La corrección apunta a una entrada inexistente.','$history');
    ids.add(entry.id);previous=entry.after;
  }
  if(!equal(previous,d.state))return issue('invalid_history','El estado y la última entrada no coinciden.','$state');
  if(new TextEncoder().encode(JSON.stringify(d)).byteLength>MAX_RECORD_BYTES)return issue('size','El registro supera 8 MiB. Exporta el archivo; no se elimina historial automáticamente.');
  return result;
}
const header={confirmationId:text(),confirmed:boolean,expected:bindingSchema,updatedAt:text()};
// The observed balance has the same integer domain as H1. H2, not the receipt
// schema, determines whether a negative balance is legal (e.g. Credit Card).
const receiptSchema=object({money:integer(),jokerIds:array(text(),100),offerIds:array(text(),100)});
const confirmSchema=object({...header,action:actionSchema},{observedAfter:receiptSchema});
const undoSchema=object({...header,targetEntryId:text(),reason:text(2000)});
const observedFields=['gameVersion','gamePlatform','deckId','stakeId','modsPresent','money','lastCleared','nextBlind','visibleBoss','resources','deck','handBases','jokers','shop','outOfScope','jokerContext'];
const patchSchema:Schema<Partial<GameState['observed']>>={check(v,p,e){
  if(!v || typeof v!=='object' || Array.isArray(v) || !Object.keys(v).length || Object.keys(v).some(k=>!observedFields.includes(k))){e.push({path:p,code:'invalid_patch',message:'Transcribe campos observados explícitos; no se admiten estados completos ni escenarios.'});return false;}return true;
}};
const correctSchema=object({...header,patch:patchSchema,reason:text(2000)},{targetEntryId:text(),discardSavedScenarios:boolean});
export type ConfirmRequest=Infer<typeof confirmSchema>;
export type CorrectionRequest=Infer<typeof correctSchema>;
export type UndoRequest=Infer<typeof undoSchema>;

/** Synchronous single-writer store. One atomic setItem stores state AND history. */
export function createConfirmedStore(getStorage:()=>StoragePort){
  const read=():Result<{raw:string|null;record:ConfirmedRecord|null}>=>{
    let raw:string|null;try{raw=getStorage().getItem(CONFIRMED_STORAGE_KEY);}catch{return issue('storage_read','No se pudo leer el registro; no se cambió nada.','$storage');}
    if(raw===null)return {ok:true,value:{raw,record:null}};
    if(new TextEncoder().encode(raw).byteLength>MAX_RECORD_BYTES)return issue('size','Registro demasiado grande; conservar original.');
    let parsed:unknown;try{parsed=JSON.parse(raw);}catch{return issue('invalid_json','Registro corrupto: no se borra ni sustituye.');}
    const checked=validateConfirmedRecord(parsed);return checked.ok ? {ok:true,value:{raw,record:checked.value}} : checked;
  };
  const commit=(record:ConfirmedRecord,expectedRaw:string|null):Result<ConfirmedRecord>=>{
    const checked=validateConfirmedRecord(record);if(!checked.ok)return checked;
    let conflict=false;
    // H1 validates/serializes the state; its storage port wraps that write in the journal envelope.
    const saved=createStateStore(()=>({getItem:()=>null,setItem:(_key,stateJson)=>{
      const storage=getStorage();if(storage.getItem(CONFIRMED_STORAGE_KEY)!==expectedRaw){conflict=true;throw new Error('conflict');}
      storage.setItem(CONFIRMED_STORAGE_KEY,JSON.stringify({...checked.value,state:JSON.parse(stateJson)}));
    }})).save(checked.value.state);
    if(conflict)return issue('stale_revision','El registro cambió durante la operación; vuelve a cargar y recalcular.');
    return saved.ok ? {ok:true,value:JSON.parse(JSON.stringify(checked.value)) as ConfirmedRecord} : saved;
  };
  const prepare=(r:Infer<typeof undoSchema>|ConfirmRequest|CorrectionRequest):Result<{raw:string;record:ConfirmedRecord}>=>{
    if(r.confirmed!==true)return issue('confirmation_required','Confirma expresamente que realizaste la acción o corrección.');
    const loaded=read();if(!loaded.ok)return loaded;
    const {record,raw}=loaded.value;if(!record || raw===null)return issue('not_initialized','Migra explícitamente la partida H1 antes de confirmar.');
    if(record.history.some(e=>e.id===r.confirmationId))return issue('duplicate_confirmation','Este ID ya fue registrado, incluso si se corrigió después. No se aplica dos veces.');
    if(!equal(analysisBinding(record.state),r.expected))return issue('stale_revision','La partida cambió desde el análisis. Recarga y recalcula; no apliques automáticamente el consejo anterior.');
    return {ok:true,value:{raw,record}};
  };
  const append=(base:{raw:string;record:ConfirmedRecord},entry:ConfirmedEntry)=>commit({...base.record,state:entry.after,history:[...base.record.history,entry]},base.raw);
  return {
    load():Result<ConfirmedRecord|null>{const r=read();return r.ok ? {ok:true,value:r.value.record} : r;},
    initialize(input:unknown):Result<ConfirmedRecord>{
      const current=read();if(!current.ok)return current;if(current.value.record)return issue('already_initialized','Ya existe una partida; usa importación con reemplazo explícito.');
      const checked=validateState(input);if(!checked.ok)return checked;
      return commit({schemaVersion:'confirmed-1',initialState:checked.value,state:structuredClone(checked.value),history:[]},null);
    },
    restoreJson(json:string,authorization:{confirmed:boolean;expectedRaw:string|null}):Result<ConfirmedRecord>{
      if(!authorization || authorization.confirmed!==true)return issue('confirmation_required','Confirma la importación y el reemplazo si existe una partida.');
      if(typeof json!=='string' || new TextEncoder().encode(json).byteLength>MAX_RECORD_BYTES)return issue('size','Copia demasiado grande.');
      let input:unknown;try{input=JSON.parse(json);}catch{return issue('invalid_json','La copia no contiene JSON válido; no se cambió la partida.');}
      const checked=validateConfirmedRecord(input);
      if(checked.ok)return commit(checked.value,authorization.expectedRaw);
      const legacy=validateState(input);
      if(!legacy.ok)return checked;
      return commit({schemaVersion:'confirmed-1',initialState:legacy.value,state:structuredClone(legacy.value),history:[]},authorization.expectedRaw);
    },
    migrateLegacy():Result<ConfirmedRecord>{
      const current=read();if(!current.ok)return current;if(current.value.record)return issue('already_initialized','Ya existe un registro; no se sobrescribe mediante migración.');
      const old=createStateStore(getStorage).load();if(!old.ok)return old;if(!old.value)return issue('missing_legacy','No existe una partida H1 para migrar.');
      return commit({schemaVersion:'confirmed-1',initialState:old.value,state:structuredClone(old.value),history:[]},null);
    },
    confirm(input:unknown,options:EngineOptions={}):Result<ConfirmedRecord>{
      const request=check(confirmSchema,input);if(!request.ok)return request;const r=request.value;
      const base=prepare(r);if(!base.ok)return base;const before=base.value.record.state;
      if(r.action.choices?.some(c=>c.knowledge!=='known'))return {ok:false,errors:[{path:'$.action.choices',code:'hypothetical_confirmation',message:'La confirmación real necesita resultados observados, no ramas hipotéticas.'}]};
      const changed=applyShopAction(before,r.action,{expectedRevision:before.revision,updatedAt:r.updatedAt},options);if(!changed.ok)return {ok:false,errors:changed.errors};
      const after=changed.value.state;
      // Even a confirmed hold invalidates old analyses; replacement keeps H2's two increments.
      if(after.revision===before.revision)after.revision++;
      after.updatedAt=r.updatedAt;
      if(r.observedAfter){
        const m=after.observed.money,j=after.observed.jokers,s=after.observed.shop;
        if(m.status!=='known'||j.status!=='known'||s.status!=='known'||r.observedAfter.money!==m.value || !equal(r.observedAfter.jokerIds,j.value.map(x=>x.instanceId)) || !equal(r.observedAfter.offerIds,s.value.cardOffers.map(x=>x.offerId)))
          return issue('model_discrepancy','Lo observado no coincide con H2. No se guardó la transacción: registra una corrección manual con los datos reales y el motivo.');
      }
      return append(base.value,{id:r.confirmationId,kind:'action',before,after,action:r.action,reason:'El usuario confirmó que realizó esta acción. Efectos calculados bajo el modelo provisional, no observación validada de las reglas.',targetEntryId:null,evidence:changed.evidence,trace:changed.trace});
    },
    correct(input:unknown):Result<ConfirmedRecord>{
      const request=check(correctSchema,input);if(!request.ok)return request;const r=request.value;
      const base=prepare(r);if(!base.ok)return base;const before=base.value.record.state;
      if(r.targetEntryId && !base.value.record.history.some(e=>e.id===r.targetEntryId))return issue('missing_entry','No existe la entrada que se desea corregir.');
      const assumptions=r.discardSavedScenarios?{...before.assumptions,probes:[],roundPlans:[]}:before.assumptions;
      const checked=validateState({...before,assumptions,revision:before.revision+1,updatedAt:r.updatedAt,observed:{...before.observed,...r.patch}});if(!checked.ok)return checked;
      return append(base.value,{id:r.confirmationId,kind:'correction',before,after:checked.value,action:null,reason:r.reason+(r.discardSavedScenarios?' · Escenarios guardados retirados explícitamente; recuperables en historial.':''),targetEntryId:r.targetEntryId??null,evidence:null,trace:[]});
    },
    undoLatest(input:unknown):Result<ConfirmedRecord>{
      const request=check(undoSchema,input);if(!request.ok)return request;const r=request.value;
      const base=prepare(r);if(!base.ok)return base;const last=base.value.record.history.at(-1);
      if(!last || last.id!==r.targetEntryId || last.kind==='undo')return issue('not_latest','Solo se deshace la última acción/corrección. Para entradas anteriores transcribe una corrección manual.');
      const before=base.value.record.state,after={...structuredClone(last.before),revision:before.revision+1,updatedAt:r.updatedAt};
      return append(base.value,{id:r.confirmationId,kind:'undo',before,after,action:null,reason:r.reason,targetEntryId:last.id,evidence:null,trace:[]});
    },
    exportJson():Result<string>{const r=read();return !r.ok ? r : r.value.record ? {ok:true,value:JSON.stringify(r.value.record)} : issue('not_initialized','No hay registro para exportar.');}
  };
}
export function createBrowserConfirmedStore(){return createConfirmedStore(()=>window.localStorage);}
