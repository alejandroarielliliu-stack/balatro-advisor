import {array,boolean,checkJsonValue,enumeration,fact,integer,object,text} from '../state/schema.js';
import type {Infer,Schema} from '../state/schema.js';
import type {GameState,Result,Issue} from '../state/model.js';
import {fail,need,run,stateInput,valueFact} from '../rules/core.js';
import type {EngineOptions,EngineResult} from '../rules/core.js';
import type {AnalysisGate} from '../rules/evidence.js';
import {evaluateRoundPlan,mergeEvidence,validateRoundPlan} from './plan.js';
import type {RoundPlan,PlanEvaluation} from './plan.js';

const planSchema:Schema<RoundPlan>={check(input,path,errors){const r=validateRoundPlan(input);if(!r.ok)errors.push(...r.errors.map(e=>({...e,path:path+e.path.replace('$plan','')})));return r.ok;}};
const blindSchema=object({ante:integer(1,8),kind:enumeration('small','big','boss'),bossId:fact(text()),target:fact(integer(1)),reward:fact(integer(0))});
const horizonSchema=object({schemaVersion:enumeration('horizon-1'),horizonId:text(),description:text(1000),firstPlan:planSchema,
  continuations:array(object({blind:blindSchema,knowledge:enumeration('known','hypothetical'),basis:text(1000),plan:planSchema}),2),
  assumptions:object({noBetweenRoundActions:boolean,unchangedDeckAndHandBases:boolean})});
export type HorizonPlan=Infer<typeof horizonSchema>;
export function validateHorizon(input:unknown):Result<HorizonPlan>{
  const errors=checkJsonValue(input);if(!errors.length)horizonSchema.check(input,'$horizon',errors);
  if(!errors.length){const h=input as HorizonPlan;if(!h.assumptions.noBetweenRoundActions||!h.assumptions.unchangedDeckAndHandBases)errors.push({path:'$horizon.assumptions',code:'unsupported_transition',message:'Este alcance exige no comprar/vender/usar consumibles entre rondas y conservar mazo/bases.'});}
  return errors.length?{ok:false,errors}:{ok:true,value:structuredClone(input) as HorizonPlan};
}
export interface HorizonStage {index:number;stateBefore:GameState;result:EngineResult<PlanEvaluation>}
export interface HorizonEvaluation {
  horizon:HorizonPlan;stages:HorizonStage[];roundsReached:number;requestedRounds:number;
  outcome:'completed'|'plan_stopped'|'incompatible'|'settlement_missing';
  stopReason:string|null;finalState:GameState;unexecutedRoundIndices:number[];errors:Issue[];
}
/** Hypothetical transitions only: no store imports and no future shop generation. */
export function evaluateHorizon(input:unknown,horizonInput:unknown,updatedAt:string,options:EngineOptions={}):EngineResult<HorizonEvaluation>{
  const gates:AnalysisGate[]=[];
  const result=run<HorizonEvaluation>([],options,trace=>{
    let state=stateInput(input);const checked=validateHorizon(horizonInput);
    if(!checked.ok){const e=checked.errors[0]!;fail(e.path,e.code,e.message);}const horizon=checked.value;
    let previous=need(state.observed.nextBlind,'$.observed.nextBlind');
    for(const [i,next] of horizon.continuations.entries()){
      if(previous.ante===8&&previous.kind==='boss')fail(`$horizon.continuations[${i}]`,'outside_goal','No hay rondas después del jefe del ante 8.');
      const kind=previous.kind==='small'?'big':previous.kind==='big'?'boss':'small';
      const ante=previous.ante+(previous.kind==='boss'?1:0);
      if(next.blind.kind!==kind||next.blind.ante!==ante)fail(`$horizon.continuations[${i}].blind`,'invalid_sequence','Las ciegas deben ser consecutivas, sin saltos ni retrocesos.');
      previous=next.blind;
    }
    const plans=[horizon.firstPlan,...horizon.continuations.map(c=>c.plan)];
    const stages:HorizonStage[]=[],errors:Issue[]=[];let roundsReached=0;
    let outcome:HorizonEvaluation['outcome']='completed',stopReason:string|null=null;
    for(const [index,plan] of plans.entries()){
      if(index>0){
        // Only data declared in the scenario are supplied. Carry every endogenous value from this branch.
        const next=horizon.continuations[index-1]!;
        state=structuredClone(state);state.phase='shop';state.observed.nextBlind=valueFact(structuredClone(next.blind));
        state.observed.visibleBoss=next.blind.kind==='boss'?valueFact(structuredClone(next.blind)):{status:'unknown',reason:'El horizonte no declara otro jefe visible.'};
        state.observed.shop={status:'unknown',reason:'Ofertas futuras no modeladas; se asume no operar en la tienda.'};
      }
      const before=structuredClone(state);const evaluated=evaluateRoundPlan(state,plan,updatedAt,options);gates.push(evaluated.evidence);
      stages.push({index,stateBefore:before,result:evaluated});
      if(!evaluated.ok){errors.push(...evaluated.errors);outcome='incompatible';stopReason=evaluated.errors.map(e=>e.message).join(' ');break;}
      trace.push(...evaluated.trace);const e=evaluated.value;state=structuredClone(e.finalState);
      if(e.outcome==='incompatible'){errors.push(...e.errors);outcome='incompatible';stopReason='El plan deja de ser legal; no se adapta a la alternativa.';break;}
      if(!e.targetReached){outcome='plan_stopped';stopReason='El plan no supera esta ciega; no se evalúan rondas posteriores ni se afirma que no existan otras jugadas.';break;}
      roundsReached++;
      if(!e.settlement?.ok){outcome='settlement_missing';stopReason=e.economicLimitation??'Falta cierre de ronda para enlazar el estado contable.';break;}
      if(e.settlement.value.goalReached)break;
    }
    return {horizon,stages,roundsReached,requestedRounds:plans.length,outcome,stopReason,finalState:state,
      unexecutedRoundIndices:plans.map((_,i)=>i).slice(stages.length),errors};
  });result.evidence=mergeEvidence([result.evidence,...gates]);return result;
}
