import {createNewRun} from '../run/start.js';
import type {GameStateV02} from '../state/model.js';
import {validateCurrentState} from '../state/validation.js';
import {text} from '../state/schema.js';
import type {Issue} from '../state/model.js';
import type {ConfirmedRecord} from '../storage/confirmed-store.js';

export interface RunStartRequest {
  deckId:string;
  profileConfirmed:boolean;
  /** A manual label. The adviser never generates or inspects a seeded game. */
  seed?:string;
}
export interface RunStartSnapshot {
  record:ConfirmedRecord|null;
  writable:boolean;
  dirty:boolean;
  loadFailed:boolean;
}
interface RunStartContext extends RunStartSnapshot {raw:string|null}
export interface RunStartBridge {
  snapshot():RunStartSnapshot;
  /** null means accepted/pending confirmation; onStarted runs only after save. */
  requestStart(request:RunStartRequest,onStarted:()=>void):string|null;
  exportCurrent():void;
}
export interface RunStartDependencies {
  context():RunStartContext;
  save(state:GameStateV02,expectedRaw:string|null,replacing:boolean):boolean;
  confirmStart(options:{replacing:boolean;profileRequired:boolean},confirm:(profileConfirmed:boolean)=>boolean):void;
  exportCurrent():void;
  reportError(text:string):void;
  error():string;
  runId():string;
  now():string;
}

/** UI transaction boundary. State creation/validation/storage keep their own rules. */
export function createRunStartBridge(dependencies:RunStartDependencies):RunStartBridge {
  const fail=(text:string)=>{dependencies.reportError(text);return text;};
  const blocked=(context:RunStartContext)=>context.loadFailed?'No se pudo leer la partida. Recupera o importa la copia antes de sustituirla.'
    :!context.writable?'Esta pestaña no tiene el control de escritura. Solicítalo en Registro.'
    :context.dirty?'Hay una transcripción pendiente. Termínala o recarga antes de iniciar otra partida.':null;
  return {
    snapshot(){
      const context=dependencies.context();
      return {record:structuredClone(context.record),writable:context.writable,dirty:context.dirty,loadFailed:context.loadFailed};
    },
    requestStart(request,onStarted){
      const context=dependencies.context(),reason=blocked(context);if(reason)return fail(reason);
      const seed=request.seed===undefined?undefined:typeof request.seed==='string'?request.seed.trim():request.seed;
      if(seed!==undefined){const errors:Issue[]=[];text(64).check(seed,'$newRun.seed',errors);if(errors.length)return fail(errors.map(error=>error.message).join(' '));}
      let saved=false;
      const save=(profileConfirmed:boolean)=>{
        if(saved){fail('Esta selección ya se registró. No se inicia una segunda partida.');return false;}
        const current=dependencies.context(),unavailable=blocked(current);
        if(unavailable){fail(unavailable);return false;}
        if(current.raw!==context.raw){fail('La partida cambió desde que abriste esta selección. Vuelve a revisarla.');return false;}
        if(!profileConfirmed){fail('Confirma Steam 1.0.1o-FULL sin mods y White Stake antes de iniciar.');return false;}
        const created=createNewRun({runId:dependencies.runId(),updatedAt:dependencies.now(),deckId:request.deckId,profileConfirmed});
        if(!created.ok){fail(created.errors.map(error=>error.message).join(' '));return false;}
        const valid=validateCurrentState({...created.value,...(seed===undefined?{}:{seed})});
        if(!valid.ok){fail(valid.errors.map(error=>error.message).join(' '));return false;}
        if(!dependencies.save(valid.value,context.raw,context.record!==null))return false;
        saved=true;onStarted();return true;
      };
      if(context.record||!request.profileConfirmed){dependencies.confirmStart({replacing:context.record!==null,profileRequired:!request.profileConfirmed},save);return null;}
      return save(true)?null:dependencies.error()||'No se pudo guardar la nueva partida. La copia anterior se conserva.';
    },
    exportCurrent:()=>dependencies.exportCurrent()
  };
}
