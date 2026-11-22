import {estimateBlindSurvival} from '../advisor/next-blind-survival.js';
import type {BlindSurvivalEstimate} from '../advisor/next-blind-survival.js';
import type {EvaluateBlindSurvival} from '../advisor/skip-tag-strategy.js';

export type BlindSurvivalJob=Parameters<EvaluateBlindSurvival>;

const worker=self as unknown as {
 onmessage:((message:MessageEvent<BlindSurvivalJob>)=>void)|null;
 postMessage(estimate:BlindSurvivalEstimate):void;
};

worker.onmessage=({data:[state,context]})=>{
 const estimate=context==='boss'
  ?estimateBlindSurvival(state,{sampling:'adaptive'})
  :estimateBlindSurvival(state);
 worker.postMessage(estimate);
};
