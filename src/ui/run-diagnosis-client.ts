import {RUN_DIAGNOSIS_POLICY} from '../advisor/run-diagnosis.js';
import type {RunAssessment} from '../advisor/run-diagnosis.js';
import type {GameState} from '../state/model.js';
import {analysisBinding,canonical} from '../storage/confirmed-record.js';
import type {RunDiagnosisResponse} from './run-diagnosis-worker.js';

export type RunDiagnosisView=
 |{status:'idle'|'pending'}
 |{status:'ready';result:RunAssessment}
 |{status:'unavailable';reason:string};

export function createRunDiagnosisController(changed:()=>void){
 let view:RunDiagnosisView={status:'idle'};
 let currentKey:string|null=null,requestId=0;
 let worker:Worker|undefined,debounce:ReturnType<typeof setTimeout>|undefined,timeout:ReturnType<typeof setTimeout>|undefined;
 let inFlight=false;

 function disposeWorker(){
  worker?.terminate();
  worker=undefined;
  inFlight=false;
  clearTimeout(timeout);
 }

 function update(state:GameState|null){
  const input=state&&(state.phase==='shop'||state.phase==='blind_select')?state:null;
  const key=input?JSON.stringify(canonical([RUN_DIAGNOSIS_POLICY,analysisBinding(input),input])):null;
  if(key===currentKey)return;
  currentKey=key;
  const request=++requestId;
  clearTimeout(debounce);
  // A running worker cannot process a cancellation message until its
  // simulation finishes. Stop it to let the newest state start immediately.
  if(inFlight)disposeWorker();
  if(!input||!key){view={status:'idle'};return;}
  view={status:'pending'};
  debounce=setTimeout(()=>{
   if(request!==requestId||key!==currentKey)return;
   const fail=()=>{
    if(request!==requestId||key!==currentKey)return;
    disposeWorker();
    view={status:'unavailable',reason:'La estimación no está disponible en este momento.'};
    changed();
   };
   try{worker??=new Worker(new URL('./run-diagnosis-worker.js',import.meta.url),{type:'module'});}
   catch{fail();return;}
   const active=worker;
   active.onmessage=({data}:MessageEvent<RunDiagnosisResponse>)=>{
    if(worker!==active||!inFlight||data.requestId!==requestId||data.key!==currentKey)return;
    clearTimeout(timeout);
    inFlight=false;
    view={status:'ready',result:data.result};
    changed();
   };
   active.onerror=event=>{event.preventDefault();if(worker===active)fail();};
   active.onmessageerror=()=>{if(worker===active)fail();};
   inFlight=true;
   timeout=setTimeout(fail,15_000);
   try{active.postMessage({requestId:request,key,state:input});}
   catch{fail();}
  },80);
 }

 return {update,read:()=>view};
}
