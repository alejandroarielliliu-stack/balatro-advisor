import {assessRun,cachedRunEstimator} from '../advisor/run-diagnosis.js';
import type {RunAssessment} from '../advisor/run-diagnosis.js';
import type {GameState} from '../state/model.js';

export interface RunDiagnosisRequest {requestId:number;key:string;state:GameState}
export interface RunDiagnosisResponse {requestId:number;key:string;result:RunAssessment}

const worker=self as unknown as {
 onmessage:((message:MessageEvent<RunDiagnosisRequest>)=>void)|null;
 postMessage(response:RunDiagnosisResponse):void;
};
const estimate=cachedRunEstimator();

worker.onmessage=({data:{requestId,key,state}})=>worker.postMessage({requestId,key,result:assessRun(state,estimate)});
