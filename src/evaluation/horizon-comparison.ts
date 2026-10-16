import {applyShopAction,enumerateActions} from '../rules/shop.js';
import type {Mutation,ShopAction,ShopChange} from '../rules/shop.js';
import {run,stateInput,fail} from '../rules/core.js';
import type {EngineOptions,EngineResult} from '../rules/core.js';
import type {GameState,Issue,JokerInstance} from '../state/model.js';
import type {AnalysisGate} from '../rules/evidence.js';
import {orderShopCandidates} from './shop-candidates.js';
import {mergeEvidence} from './plan.js';
import {evaluateHorizon,validateHorizon} from './horizon.js';
import type {HorizonEvaluation,HorizonPlan} from './horizon.js';
export interface HorizonAlternative {id:string;action:ShopAction;netCost:number|null;shop:EngineResult<ShopChange>;evaluation:EngineResult<HorizonEvaluation>|null;sacrificed:JokerInstance[]}
export interface HorizonComparison {
 inputRevision:number;moneyBefore:number|null;horizon:HorizonPlan;alternatives:HorizonAlternative[];enumerationErrors:Issue[];
 coverage:{included:string[];excluded:string[];exhaustive:false};
}
export function compareShopHorizon(input:unknown,horizonInput:unknown,mutation:Mutation,options:EngineOptions={}):EngineResult<HorizonComparison>{
 const gates:AnalysisGate[]=[];const result=run<HorizonComparison>([],options,()=>{
  const state=stateInput(input),checked=validateHorizon(horizonInput);if(!checked.ok){const e=checked.errors[0]!;fail(e.path,e.code,e.message);}
  if(!mutation||mutation.expectedRevision!==state.revision)fail('$.revision','stale_revision','Revisión antigua; vuelve a calcular.');
  const candidates=enumerateActions(state,mutation,options);gates.push(candidates.evidence);
  const actions:ShopAction[]=candidates.ok?orderShopCandidates(candidates.value.map(c=>c.action)):[{type:'hold'}];
  const js=state.observed.jokers;
  const alternatives=actions.map((action,i)=>{
   const shop=applyShopAction(state,action,mutation,options);gates.push(shop.evidence);
   const evaluation=shop.ok?evaluateHorizon(shop.value.state,checked.value,mutation.updatedAt,options):null;if(evaluation)gates.push(evaluation.evidence);
   const soldId=action.type==='sell'?action.instanceId:action.type==='replace'?action.sellInstanceId:null;
   const before=money(state),after=shop.ok?money(shop.value.state):null;
   return {id:`alternative-${i}`,action,netCost:before!==null&&after!==null?before-after:null,shop,evaluation,sacrificed:js.status==='known'?structuredClone(js.value.filter(j=>j.instanceId===soldId)):[]};
  });
  return {inputRevision:state.revision,moneyBefore:money(state),horizon:checked.value,alternatives,enumerationErrors:candidates.ok?[]:candidates.errors,
   coverage:{included:['conservar','una compra inicial','una venta inicial','un reemplazo inicial','1–3 rondas consecutivas explícitas'],excluded:['operaciones entre rondas','ofertas futuras','robos aleatorios','adaptar planes por alternativa','después del ante 8'],exhaustive:false}};
 });result.evidence=mergeEvidence([result.evidence,...gates]);return result;
}
export const money=(s:GameState)=>s.observed.money.status==='known'?s.observed.money.value:null;
