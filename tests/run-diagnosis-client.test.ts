import assert from 'node:assert/strict';
import test from 'node:test';
import {setTimeout as wait} from 'node:timers/promises';
import {createNewRun} from '../src/run/start.js';
import {createRunDiagnosisController} from '../src/ui/run-diagnosis-client.js';
import type {RunDiagnosisRequest,RunDiagnosisResponse} from '../src/ui/run-diagnosis-worker.js';
import {known,success} from './helpers.js';

test('rejects a stale worker result even when an imported state shares the same revision',async()=>{
 const jobs:{worker:FakeWorker;input:RunDiagnosisRequest}[]=[];
 class FakeWorker {
  onmessage?: (message:{data:RunDiagnosisResponse})=>void;
  terminated=false;
  postMessage(input:RunDiagnosisRequest){jobs.push({worker:this,input});}
  terminate(){this.terminated=true;}
 }
 const original=Object.getOwnPropertyDescriptor(globalThis,'Worker');
 Object.defineProperty(globalThis,'Worker',{configurable:true,value:FakeWorker});
 const changes:string[]=[];
 const controller=createRunDiagnosisController(()=>{
  const result=controller.read();
  if(result.status==='ready')changes.push(result.result.diagnosis.reason);
 });
 try{
  const first=success(createNewRun({runId:'same-revision-import',deckId:'red',profileConfirmed:true,updatedAt:'2026-11-27T12:00:00Z'}));
  const second=structuredClone(first);
  second.observed.money=known(20);
  controller.update(first);
  await wait(110);
  assert.equal(jobs.length,1);
  controller.update(second);
  await wait(110);
  assert.equal(jobs.length,2);
  assert.equal(jobs[0]!.worker.terminated,true);
  assert.notEqual(jobs[0]!.input.key,jobs[1]!.input.key);
  const complete=({worker,input}:typeof jobs[number],reason:string)=>worker.onmessage?.({data:{
   requestId:input.requestId,key:input.key,
   result:{shop:null,diagnosis:{reason,priority:'economy',next:null,later:null,limitations:[]}},
  }});
  complete(jobs[0]!,'stale');
  assert.equal(controller.read().status,'pending');
  complete(jobs[1]!,'current');
  assert.deepEqual(changes,['current']);
  controller.update(structuredClone(second));
  await wait(110);
  assert.equal(jobs.length,2);
  assert.equal(controller.read().status,'ready');
 }finally{
  controller.update(null);
  if(original)Object.defineProperty(globalThis,'Worker',original);
  else Reflect.deleteProperty(globalThis,'Worker');
 }
});
