import {applyPackAction} from '../rules/pack-shop.js';
import {applyVoucherPurchase} from '../rules/voucher-shop.js';
import {createStateStore} from './state-store.js';
import type {StoragePort} from './state-store.js';
import {validateState} from '../state/validation.js';
import type {GameState,Result} from '../state/model.js';
import {array,boolean,checkJsonValue,integer,object,text,enumeration} from '../state/schema.js';
import type {Schema,Infer} from '../state/schema.js';
import {applyShopAction} from '../rules/shop.js';
import type {EngineOptions} from '../rules/core.js';
import {currentActionSchema,bindingSchema,analysisBinding,validateConfirmedRecord,MAX_RECORD_BYTES,equal} from './confirmed-record.js';
import type {ConfirmedRecord,EntryInput} from './confirmed-record.js';
import {migrateConfirmedRecord} from './record-migration.js';
import {applyRunProgress,inventoryConfirmationSchema,runProgressCommandSchema} from '../run/progress.js';
export {analysisBinding,validateConfirmedRecord,MAX_RECORD_BYTES} from './confirmed-record.js';
export type {AnalysisBinding,ConfirmedRecord,ConfirmedEntry} from './confirmed-record.js';

export const CONFIRMED_STORAGE_KEY='balatro-advisor.confirmed.v1';
export const CONFIRMED_MIGRATION_BACKUP_KEY='balatro-advisor.confirmed.migration-backup.v1';
const issue=<T>(code:string,message:string,path='$confirmation'):Result<T>=>({ok:false,errors:[{code,message,path}]});
function check<T>(schema:Schema<T>,input:unknown):Result<T>{
 const errors=checkJsonValue(input);if(!errors.length)schema.check(input,'$',errors);
 return errors.length?{ok:false,errors}:{ok:true,value:structuredClone(input) as T};
}
export interface PreparedMigration {record:ConfirmedRecord;expectedRaw:string;requiresMigration:boolean}

const header={confirmationId:text(),confirmed:boolean,expected:bindingSchema,updatedAt:text()};
// The observed balance has the same integer domain as H1. H2, not the receipt
// schema, determines whether a negative balance is legal (e.g. Credit Card).
const receiptSchema=object({money:integer(),jokerIds:array(text(),100),offerIds:array(text(),100)},{voucherOfferIds:array(text(),100),voucherIds:array(text(),32),packOfferIds:array(text(),100),phase:enumeration('unknown','blind_select','in_round','cashout','shop','open_pack','finished')});
const confirmSchema=object({...header,action:currentActionSchema},{observedAfter:receiptSchema});
const undoSchema=object({...header,targetEntryId:text(),reason:text(2000)});
const observedFields=['gameVersion','gamePlatform','deckId','stakeId','modsPresent','money','lastCleared','nextBlind','visibleBoss','resources','deck','handBases','jokers','shop','outOfScope','jokerContext'];
const patchSchema:Schema<Partial<GameState['observed']>>={check(v,p,e){
  if(!v || typeof v!=='object' || Array.isArray(v) || !Object.keys(v).length || Object.keys(v).some(k=>!observedFields.includes(k))){e.push({path:p,code:'invalid_patch',message:'Transcribe campos observados explícitos; no se admiten estados completos ni escenarios.'});return false;}return true;
}};
const correctSchema=object({...header,patch:patchSchema,reason:text(2000)},{targetEntryId:text(),discardSavedScenarios:boolean});
const progressSchema=object({...header,command:runProgressCommandSchema,inventory:inventoryConfirmationSchema});
export type ConfirmRequest=Infer<typeof confirmSchema>;
export type CorrectionRequest=Infer<typeof correctSchema>;
export type UndoRequest=Infer<typeof undoSchema>;
export type ProgressRequest=Infer<typeof progressSchema>;

/** Synchronous single-writer store. One atomic setItem stores state AND history. */
export function createConfirmedStore(getStorage:()=>StoragePort){
  const read=():Result<{raw:string|null;record:ConfirmedRecord|null}>=>{
    let raw:string|null;try{raw=getStorage().getItem(CONFIRMED_STORAGE_KEY);}catch{return issue('storage_read','No se pudo leer el registro; no se cambió nada.','$storage');}
    if(raw===null)return {ok:true,value:{raw,record:null}};
    if(new TextEncoder().encode(raw).byteLength>MAX_RECORD_BYTES)return issue('size','Registro demasiado grande; conservar original.');
    let parsed:unknown;try{parsed=JSON.parse(raw);}catch{return issue('invalid_json','Registro corrupto: no se borra ni sustituye.');}
    const checked=validateConfirmedRecord(parsed);return checked.ok ? {ok:true,value:{raw,record:checked.value}} : checked;
  };
  const commit=(record:unknown,expectedRaw:string|null):Result<ConfirmedRecord>=>{
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
  const prepare=(r:Infer<typeof undoSchema>|ConfirmRequest|CorrectionRequest|ProgressRequest):Result<{raw:string;record:ConfirmedRecord}>=>{
    if(r.confirmed!==true)return issue('confirmation_required','Confirma expresamente que realizaste la acción o corrección.');
    const loaded=read();if(!loaded.ok)return loaded;
    const {record,raw}=loaded.value;if(!record || raw===null)return issue('not_initialized','Migra explícitamente la partida H1 antes de confirmar.');
    if(record.history.some(e=>e.id===r.confirmationId))return issue('duplicate_confirmation','Este ID ya fue registrado, incluso si se corrigió después. No se aplica dos veces.');
    if(!equal(analysisBinding(record.state),r.expected))return issue('stale_revision','La partida cambió desde el análisis. Recarga y recalcula; no apliques automáticamente el consejo anterior.');
    return {ok:true,value:{raw,record}};
  };
  const append=(base:{raw:string;record:ConfirmedRecord},entry:EntryInput)=>commit({...base.record,state:entry.after,history:[...base.record.history,entry]},base.raw);
  const prepareMigration=():Result<PreparedMigration>=>{
    const loaded=read();if(!loaded.ok)return loaded;
    const {raw,record}=loaded.value;if(raw===null||record===null)return issue('not_initialized','No hay una partida registrada para migrar.');
    const migrated=migrateConfirmedRecord(record);if(!migrated.ok)return migrated;
    return {ok:true,value:{record:migrated.value,expectedRaw:raw,requiresMigration:record.schemaVersion==='confirmed-1'}};
  };
  return {
    load():Result<ConfirmedRecord|null>{const r=read();return r.ok ? {ok:true,value:r.value.record} : r;},
    prepareMigration,
    migrateToCurrent(input:{confirmed:boolean;expectedRaw:string}):Result<ConfirmedRecord>{
      const request=check(object({confirmed:boolean,expectedRaw:text(MAX_RECORD_BYTES)}),input);if(!request.ok)return request;
      if(!request.value.confirmed)return issue('confirmation_required','Confirma la actualización del formato antes de guardar.');
      const prepared=prepareMigration();if(!prepared.ok)return prepared;
      const p=prepared.value;
      if(request.value.expectedRaw!==p.expectedRaw)return issue('stale_revision','La copia cambió desde la vista previa. Vuelve a preparar la migración.');
      if(!p.requiresMigration)return {ok:true,value:p.record};
      try{
        const storage=getStorage();
        if(storage.getItem(CONFIRMED_STORAGE_KEY)!==p.expectedRaw)return issue('stale_revision','La copia cambió antes de guardar el respaldo.');
        // Backup is a separate recoverable document. The active state and all
        // history are replaced together only after this write has succeeded.
        storage.setItem(CONFIRMED_MIGRATION_BACKUP_KEY,p.expectedRaw);
      }catch{return issue('migration_backup','No se pudo guardar el respaldo. La partida anterior no se sustituyó.','$storage');}
      return commit(p.record,p.expectedRaw);
    },
    exportMigrationBackup():Result<string>{
      let raw:string|null;try{raw=getStorage().getItem(CONFIRMED_MIGRATION_BACKUP_KEY);}catch{return issue('storage_read','No se pudo leer el respaldo de migración.','$storage');}
      if(raw===null)return issue('missing_backup','Todavía no existe un respaldo de migración.');
      if(new TextEncoder().encode(raw).byteLength>MAX_RECORD_BYTES)return issue('size','El respaldo supera el límite admitido; se conserva sin cambiar.');
      let parsed:unknown;try{parsed=JSON.parse(raw);}catch{return issue('invalid_json','El respaldo contiene JSON inválido; no se modifica.');}
      const valid=validateConfirmedRecord(parsed);return valid.ok?{ok:true,value:raw}:valid;
    },
    initialize(input:unknown):Result<ConfirmedRecord>{
      const current=read();if(!current.ok)return current;if(current.value.record)return issue('already_initialized','Ya existe una partida; usa importación con reemplazo explícito.');
      const checked=validateState(input);if(!checked.ok)return checked;
      return commit({schemaVersion:checked.value.schemaVersion==='0.2'?'confirmed-2':'confirmed-1',initialState:checked.value,state:structuredClone(checked.value),history:[]},null);
    },
    restoreJson(json:string,authorization:{confirmed:boolean;expectedRaw:string|null}):Result<ConfirmedRecord>{
      if(!authorization || authorization.confirmed!==true)return issue('confirmation_required','Confirma la importación y el reemplazo si existe una partida.');
      if(typeof json!=='string' || new TextEncoder().encode(json).byteLength>MAX_RECORD_BYTES)return issue('size','Copia demasiado grande.');
      let input:unknown;try{input=JSON.parse(json);}catch{return issue('invalid_json','La copia no contiene JSON válido; no se cambió la partida.');}
      const checked=validateConfirmedRecord(input);
      if(checked.ok)return commit(checked.value,authorization.expectedRaw);
      const legacy=validateState(input);
      if(!legacy.ok)return checked;
      return commit({schemaVersion:legacy.value.schemaVersion==='0.2'?'confirmed-2':'confirmed-1',initialState:legacy.value,state:structuredClone(legacy.value),history:[]},authorization.expectedRaw);
    },
    migrateLegacy():Result<ConfirmedRecord>{
      const current=read();if(!current.ok)return current;if(current.value.record)return issue('already_initialized','Ya existe un registro; no se sobrescribe mediante migración.');
      const old=createStateStore(getStorage).load();if(!old.ok)return old;if(!old.value)return issue('missing_legacy','No existe una partida H1 para migrar.');
      return commit({schemaVersion:old.value.schemaVersion==='0.2'?'confirmed-2':'confirmed-1',initialState:old.value,state:structuredClone(old.value),history:[]},null);
    },
    confirm(input:unknown,options:EngineOptions={}):Result<ConfirmedRecord>{
      const request=check(confirmSchema,input);if(!request.ok)return request;const r=request.value;
      const base=prepare(r);if(!base.ok)return base;const before=base.value.record.state;
      if('choices' in r.action&&r.action.choices?.some(c=>c.knowledge!=='known'))return {ok:false,errors:[{path:'$.action.choices',code:'hypothetical_confirmation',message:'La confirmación real necesita resultados observados, no ramas hipotéticas.'}]};
      const mutation={expectedRevision:before.revision,updatedAt:r.updatedAt};
      const a=r.action;
      const changed=a.type==='buy_voucher'?applyVoucherPurchase(before,a,mutation,options)
        :a.type==='buy_pack'||a.type==='observe_pack'||a.type==='choose_pack_item'||a.type==='skip_open_pack'||a.type==='sell_pack_joker'
          ?applyPackAction(before,a,mutation,options):applyShopAction(before,a,mutation,options);
      if(!changed.ok)return {ok:false,errors:changed.errors};
      const after=changed.value.state;
      // Even a confirmed hold invalidates old analyses; replacement keeps H2's two increments.
      if(after.revision===before.revision)after.revision++;
      after.updatedAt=r.updatedAt;
      if(r.observedAfter){
        const m=after.observed.money,j=after.observed.jokers,s=after.observed.shop;
        if(m.status!=='known'||j.status!=='known'||s.status!=='known'||r.observedAfter.money!==m.value || !equal(r.observedAfter.jokerIds,j.value.map(x=>x.instanceId)) || !equal(r.observedAfter.offerIds,s.value.cardOffers.map(x=>x.offerId)) || r.observedAfter.voucherOfferIds!==undefined&&!equal(r.observedAfter.voucherOfferIds,after.schemaVersion==='0.2'&&after.observed.shop.status==='known'?(after.observed.shop.value.voucherOffers??[]).map(x=>x.offerId):[]) || r.observedAfter.voucherIds!==undefined&&!equal(r.observedAfter.voucherIds,after.observed.outOfScope.status==='known'?after.observed.outOfScope.value.vouchers:[]) || r.observedAfter.packOfferIds!==undefined&&!equal(r.observedAfter.packOfferIds,after.schemaVersion==='0.2'&&after.observed.shop.status==='known'?(after.observed.shop.value.packOffers??[]).map(x=>x.offerId):[]) || r.observedAfter.phase!==undefined&&r.observedAfter.phase!==after.phase)
          return issue('model_discrepancy','Lo observado no coincide con H2. No se guardó la transacción: registra una corrección manual con los datos reales y el motivo.');
      }
      return append(base.value,{id:r.confirmationId,kind:'action',before,after,action:r.action,reason:'El usuario confirmó que realizó esta acción. Efectos calculados bajo el modelo provisional, no observación validada de las reglas.',targetEntryId:null,evidence:changed.evidence,trace:changed.trace});
    },
    progress(input:unknown):Result<ConfirmedRecord>{
      const request=check(progressSchema,input);if(!request.ok)return request;const r=request.value;
      const base=prepare(r);if(!base.ok)return base;
      if(base.value.record.schemaVersion!=='confirmed-2')return issue('migration_required','Actualiza explícitamente el formato de la partida antes de registrar su avance.');
      const before=base.value.record.state;
      const changed=applyRunProgress(before,r.command,{expectedRevision:before.revision,updatedAt:r.updatedAt,inventory:r.inventory});
      if(!changed.ok)return changed;
      return append(base.value,{id:r.confirmationId,kind:'progress',before,after:changed.value.state,action:null,reason:'Avance real declarado por el usuario; no se ejecutaron manos ni cobros hipotéticos.',targetEntryId:null,evidence:null,trace:changed.value.trace,progress:{command:r.command,inventory:r.inventory,limitations:changed.value.limitations}});
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
