import {guideBlindChoice} from '../advisor/blind-guidance.js';
import type {BlindGuidanceOptions} from '../advisor/blind-guidance.js';
import type {BlindSurvivalEstimate} from '../advisor/next-blind-survival.js';
import type {GameState} from '../state/model.js';
import {canonical} from '../storage/confirmed-record.js';
import type {BlindSurvivalJob} from './blind-survival-worker.js';

interface PendingJob {
 worker:Worker;
 listeners:Set<()=>void>;
 timer:ReturnType<typeof setTimeout>;
}

const running=new Map<string,PendingJob>();
const completed=new Map<string,BlindSurvivalEstimate>();
const unavailable:BlindSurvivalEstimate={status:'unavailable',reason:'La estimación de puntuación no está disponible en este momento.'};
const provisional:BlindSurvivalEstimate={status:'unavailable',reason:'Calculando consejo…'};

function scoringKey([state,context]:BlindSurvivalJob):string {
 return JSON.stringify(canonical([context,state.rulesetId,state.observed]),(_key,value:unknown)=>{
  if(value&&typeof value==='object'&&'status' in value&&value.status==='known'&&'source' in value&&'value' in value)
   return {status:'known',value:value.value};
  return value;
 });
}

function stop(key:string,job:PendingJob){
 running.delete(key);
 clearTimeout(job.timer);
 job.worker.terminate();
}

function start(key:string,input:BlindSurvivalJob):PendingJob|undefined {
 let worker:Worker;
 try{worker=new Worker(new URL('./blind-survival-worker.js',import.meta.url),{type:'module'});}
 catch{return undefined;}
 const finish=(estimate:BlindSurvivalEstimate)=>{
  if(running.get(key)!==job)return;
  stop(key,job);
  // Keep failures for this snapshot as well. A repaint must not retry forever.
  completed.set(key,estimate);
  if(completed.size>8)completed.delete(completed.keys().next().value!);
  for(const callback of job.listeners)callback();
 };
 const job:PendingJob={worker,listeners:new Set(),timer:setTimeout(()=>finish(unavailable),15_000)};
 running.set(key,job);
 worker.onmessage=({data}:MessageEvent<BlindSurvivalEstimate>)=>finish(data);
 worker.onerror=event=>{event.preventDefault();finish(unavailable);};
 worker.onmessageerror=()=>finish(unavailable);
 try{worker.postMessage(input);}
 catch{stop(key,job);return undefined;}
 return job;
}

/** Each view has one subscription. The same scoring inputs share a worker and cache. */
export function createBlindGuidanceView(){
 let generation=0;
 let release:(()=>void)|undefined;
 return {
  read(state:GameState,options:BlindGuidanceOptions|undefined,refresh:()=>void,visible=true){
   const request=++generation,previous=release;
   release=undefined;
   let pending=false;
   try{
    const guidance=guideBlindChoice(state,options,(projected,context)=>{
     const input:BlindSurvivalJob=[projected,context];
     const key=scoringKey(input);
     const cached=completed.get(key);
     if(cached)return cached;
     if(!visible){pending=true;return provisional;}
     const job=running.get(key)??start(key,input);
     if(!job)return unavailable;
     const listener=()=>{if(request===generation)refresh();};
     job.listeners.add(listener);
     release=()=>{
      job.listeners.delete(listener);
      if(!job.listeners.size&&running.get(key)===job)stop(key,job);
     };
     pending=true;
     return provisional;
    });
    return {guidance,pending};
   }finally{previous?.();}
  },
  cancel(){generation++;release?.();release=undefined;}
 };
}
