import {compareShopHorizon,money} from '../evaluation/horizon-comparison.js';
import type {HorizonAlternative,HorizonComparison} from '../evaluation/horizon-comparison.js';
import type {EngineOptions,EngineResult} from '../rules/core.js';
import type {Mutation,ShopAction} from '../rules/shop.js';
import {prefer} from './policy.js';
import type {Metrics,Preference} from './policy.js';

export const HORIZON_POLICY=Object.freeze({version:'horizon-policy-1',progress:'HH-PREFIX'});
export interface HorizonAssessment {id:string;comparable:boolean;metrics:Metrics[];roundsReached:number;moneyAfterShop:number|null;moneyAfterHorizon:number|null}
export interface HorizonAdvice {
 policyVersion:string;comparison:HorizonComparison;assessments:HorizonAssessment[];preferences:Preference[];tiers:string[][];
 recommendation:{status:'conditional'|'tie'|'abstain';action:ShopAction|null;candidates:string[];reason:string};limitations:string[];
}
function assess(a:HorizonAlternative):HorizonAssessment {
 const e=a.evaluation?.ok?a.evaluation.value:null;
 const metrics:Metrics[]=e?.stages.flatMap(s=>{
  if(!s.result.ok)return [];const p=s.result.value;
  const blind=s.stateBefore.observed.nextBlind;
  const target=blind.status==='known'&&blind.value.target.status==='known'?blind.value.target.value:null;
  if(target===null)return [];
  const terminalGoal=!!(p.settlement?.ok&&p.settlement.value.goalReached);
  const persistentBenefits:string[]=[];
  if(!terminalGoal){
   if(p.events.some(ev=>ev.trace.some(t=>t.ruleId==='green.timing'&&Number(t.values.addMult)>0)))persistentBenefits.push('green-applied');
   if(p.settlement?.ok&&(p.settlement.value.cashout?.goldenIncome??0)>0)persistentBenefits.push('golden-income');
  }
  return [{scenarioId:`round-${s.index}`,reached:p.targetReached,score:p.score,margin:p.score-target,handsUsed:p.handsUsed,discardsUsed:p.discardsUsed,
   moneyAfterShop:money(s.stateBefore),moneyAfterRound:p.settlement?.ok?money(p.settlement.value.state):null,terminalGoal,persistentBenefits}];
 })??[];
 return {id:a.id,comparable:!!e&&['completed','plan_stopped'].includes(e.outcome)&&metrics.length===e.stages.length,
  metrics,roundsReached:e?.roundsReached??0,moneyAfterShop:a.shop.ok?money(a.shop.value.state):null,
  moneyAfterHorizon:e?.outcome==='completed'?money(e.finalState):null};
}
/** One explicit trajectory, no probabilities or averaging of successive rounds. */
export function adviseHorizon(input:unknown,horizon:unknown,mutation:Mutation,options:EngineOptions={}):EngineResult<HorizonAdvice>{
 const result=compareShopHorizon(input,horizon,mutation,options);if(!result.ok)return result;
 const comparison=result.value,assessments=comparison.alternatives.map(assess),eligible=assessments.filter(a=>a.comparable);
 const preferences:Preference[]=[];
 for(const a of eligible)for(const b of eligible)if(a!==b){
  if(a.roundsReached>b.roundsReached)preferences.push({preferred:a.id,over:b.id,ruleId:HORIZON_POLICY.progress,scenarioIds:a.metrics.map(m=>m.scenarioId),explanation:'Supera un prefijo consecutivo más largo de esta secuencia explícita. No estima victorias con otras cartas ni con decisiones adaptadas.'});
  else if(a.roundsReached===b.roundsReached&&a.metrics.length===b.metrics.length){const p=prefer(a.metrics,b.metrics);if(p)preferences.push({preferred:a.id,over:b.id,...p});}
 }
 const tiers:string[][]=[];let remaining=eligible.map(a=>a.id);
 while(remaining.length){const front=remaining.filter(id=>!preferences.some(p=>p.over===id&&remaining.includes(p.preferred)));if(!front.length)break;tiers.push(front);remaining=remaining.filter(id=>!front.includes(id));}
 // Only independently proven illegal actions may be excluded without an uncertainty warning.
 const illegalCodes=new Set(['insufficient_money','no_slots','missing_joker','missing_offer','invalid_id']);
 const uncertain=comparison.enumerationErrors.length>0||comparison.alternatives.some((a,i)=>a.shop.ok?!assessments[i]!.comparable:a.shop.errors.some(e=>!illegalCodes.has(e.code)));
 const top=tiers[0]??[],blocked=uncertain||remaining.length>0||!eligible.some(a=>a.roundsReached>0);
 const recommendation:HorizonAdvice['recommendation']=blocked?{status:'abstain',action:null,candidates:top,reason:'Faltan evaluaciones comparables o ningún plan supera la primera ciega. Consulta dónde se detiene cada rama; no significa que la partida esté perdida.'}
  :top.length===1?{status:'conditional',action:comparison.alternatives.find(a=>a.id===top[0])!.action,candidates:top,reason:'Preferencia limitada a esta secuencia, sus cartas y la ausencia de operaciones intermedias. Revisa los sacrificios y el saldo disponible en cada ronda.'}
  :{status:'tie',action:null,candidates:top,reason:'Empate o compromiso entre liquidez, recursos y beneficios persistentes. No se les asigna un precio arbitrario.'};
 return {...result,value:{policyVersion:HORIZON_POLICY.version,comparison,assessments,preferences,tiers,recommendation,limitations:[
  'Una trayectoria de 1–3 rondas con planes fijos; no predice robos, consistencia ni probabilidad de ganar.',
  'Las rondas siguientes solo se evalúan si la anterior vence y puede cerrarse. No se inventan tiendas ni acciones intermedias.',
  'A igual progreso se reutiliza H3: compara dinero y recursos por ronda, y protege Green aplicado/ingreso Golden demostrado. Un contador por sí solo no recibe valor.',
  'Los resultados completos y sus reglas provisionales se conservan por ronda; inspección estática y contraste externo no equivalen a observación en partida.',
  'Los estados futuros son proyecciones. Solo una acción inicial realmente realizada puede confirmarse por T09b; no se guarda este estado final.',
  'Sin valor residual calculado de comodines ni beneficios posteriores al horizonte; los sacrificios figuran en cada alternativa.'
 ]}};
}
