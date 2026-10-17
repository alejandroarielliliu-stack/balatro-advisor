import type {Fact,GameState,GameStateV02,Result,Issue} from '../state/model.js';
import {validateState} from '../state/validation.js';
import {boolean,checkJsonValue,object} from '../state/schema.js';
import {analysisBinding,canonical,equal} from '../storage/confirmed-record.js';
import type {AnalysisBinding} from '../storage/confirmed-record.js';
import {projectSkipBlind,selectionScenarioState} from '../rules/tags.js';
import type {SkipProjection} from '../rules/tags.js';
import type {EngineResult} from '../rules/core.js';
import {deckCards} from '../rules/core.js';
import {inspectShopDecision} from './decision.js';
import type {ShopDecision} from './decision.js';
import type {AdvisorScenario} from './advisor.js';
import {immediateConsequences} from './consequences.js';
import type {ImmediateConsequences} from './consequences.js';
export const BLIND_POLICY={version:'blind-1',incomplete:'B-INCOMPLETE',cash:'B-CASH-CONDITIONAL',tradeoff:'B-TRADEOFF',cashEligibleJokers:['joker','half_joker','banner','abstract_joker','even_steven','scholar','golden_joker','green_joker']} as const;
export interface BlindOptions {requireObserved?:boolean;playScenarios?:AdvisorScenario[];afterSkipScenarios?:AdvisorScenario[]}
export interface BlindPlanDifference {
 scenarioId:string;status:'reached'|'not_reached'|'incompatible'|'unavailable';score:number|null;handsUsed:number|null;discardsUsed:number|null;
 moneyAfterPlay:number|null;moneyAfterSkip:number|null;playMinusSkip:number|null;consequences:ImmediateConsequences|null;
}
export interface BlindDecision {
 contract:'blind-decision-1';policyVersion:string;binding:AnalysisBinding;stateToken:string;optionsToken:string;
 skip:EngineResult<SkipProjection>;play:Result<ShopDecision>|null;afterSkip:Result<ShopDecision>|null;
 differences:BlindPlanDifference[];skipConsequences:ImmediateConsequences|null;
 recommendation:{status:'conditional'|'tradeoff'|'abstain';preferred:'play'|null;ruleId:string;reason:string};
 sacrifices:string[];limitations:string[];errors:Issue[];projected:true;exhaustive:false;
}
const value=<T>(f:Fact<T>|undefined)=>f?.status==='known'?f.value:null;
const token=(input:unknown)=>JSON.stringify(canonical(input));
function retainedJokers(before:GameStateV02,after:GameState):boolean{
 const a=value(before.observed.jokers),b=value(after.observed.jokers);if(!a||!b||a.length!==b.length)return false;
 return a.every((j,i)=>{const end=b[i]!;
  if(!(BLIND_POLICY.cashEligibleJokers as readonly string[]).includes(j.catalogId))return false;
  const physical=(x:typeof j)=>({id:x.instanceId,catalog:x.catalogId,edition:value(x.edition),stickers:value(x.stickers),sell:value(x.sellValue)});
  if(!equal(physical(j),physical(end)))return false;
  return [...new Set([...Object.keys(j.counters),...Object.keys(end.counters)])].every(key=>{
   const first=value(j.counters[key]),last=value(end.counters[key]);
   return key==='greenMult'&&first!==null&&last!==null&&last>=first;
  });
 });
}
function assess(state:GameStateV02,scenarios:AdvisorScenario[]|undefined,requireObserved:boolean):Result<ShopDecision>|null{
 if(!scenarios?.length&&Array.isArray(scenarios))return null;
 if(scenarios===undefined)return null;
 return inspectShopDecision(selectionScenarioState(state),{id:'blind-scenario-only',jokers:[],vouchers:[],packs:[],rerollCost:null},{scenarios,actions:[{type:'hold'}],requireObserved});
}
/** Decision report for two different paths. Never averages or prices future shops/growth. */
export function compareBlindChoices(input:unknown,options:BlindOptions={}):Result<BlindDecision>{
 const checked=validateState(input);if(!checked.ok)return checked;
 const invalid=(code:string,message:string):Result<never>=>({ok:false,errors:[{path:'$blindDecision',code,message}]});
 if(checked.value.schemaVersion!=='0.2'||checked.value.phase!=='blind_select')return invalid('wrong_phase','Compara jugar/saltar desde una selección registrada en formato 0.2.');
 const errors=checkJsonValue(options);if(errors.length)return {ok:false,errors};
 if(!options||typeof options!=='object'||Array.isArray(options)||Object.keys(options).some(k=>!['requireObserved','playScenarios','afterSkipScenarios'].includes(k)))return invalid('invalid_options','Opciones de comparación de ciega no reconocidas.');
 const optionErrors:Issue[]=[];object({},{requireObserved:boolean}).check(Object.fromEntries(Object.entries(options).filter(([key])=>key==='requireObserved')),'$options',optionErrors);if(optionErrors.length)return {ok:false,errors:optionErrors};
 const state=checked.value,strict=options.requireObserved??false,skip=projectSkipBlind(state,{requireObserved:strict});
 // Each branch is a clone. No current hand, shop, draw or simulated balance is saved.
 const play=assess(structuredClone(state),options.playScenarios,strict);
 const afterSkip=skip.ok?assess(structuredClone(skip.value.state),options.afterSkipScenarios,strict):null;
 const comparisons=play?.ok&&play.value.scenarios?.ok?play.value.scenarios.value.alternatives.find(a=>a.action.type==='hold')?.scenarios??[]:[];
 const differences:BlindPlanDifference[]=comparisons.map(s=>{
  const m=s.metrics,e=s.calculation.evaluation?.ok?s.calculation.evaluation.value:null;
  const moneyAfterPlay=m?.reached?m.moneyAfterRound:null,moneyAfterSkip=skip.ok?skip.value.moneyAfter:null;
  return {scenarioId:s.scenarioId,status:m?(m.reached?'reached':'not_reached'):e?.outcome==='incompatible'?'incompatible':'unavailable',score:m?.score??null,handsUsed:m?.handsUsed??null,discardsUsed:m?.discardsUsed??null,
   moneyAfterPlay,moneyAfterSkip,playMinusSkip:moneyAfterPlay===null||moneyAfterSkip===null?null:moneyAfterPlay-moneyAfterSkip,
   consequences:e?.settlement?.ok?immediateConsequences(state,e.settlement.value.state):null};
 });
 const allClear=!!options.playScenarios?.length&&differences.length===options.playScenarios.length&&differences.every(d=>d.status==='reached'&&d.playMinusSkip!==null);
 // Sufficient condition only: retained initial-eight effects, no degraded Green, no unpriced pending reward.
 // A broader tradeoff never becomes a weighted sum of dollars, points and counters.
 const queue=value(value(state.observed.jokerContext)?.tags);
 const plain=skip.ok&&!skip.value.deferredIncome&&queue?.length===0&&comparisons.every(s=>{
  const evaluation=s.calculation.evaluation?.ok?s.calculation.evaluation.value:null;
  const settlement=evaluation?.settlement;
  if(!settlement?.ok)return false;
  const after=settlement.value.state;
  return equal(deckCards(state).map(c=>({...c,debuff:c.debuff??false})),deckCards(after).map(c=>({...c,debuff:c.debuff??false})))&&retainedJokers(state,after)&&
   Object.keys(state.observed.resources).every(key=>{const k=key as keyof GameStateV02['observed']['resources'];return value(state.observed.resources[k])===value(after.observed.resources[k]);});
 });
 let recommendation:BlindDecision['recommendation']={status:'abstain',preferred:null,ruleId:BLIND_POLICY.incomplete,reason:'Faltan efectos compatibles o planes completos de la ciega actual; no se diagnostica supervivencia.'};
 if(skip.ok&&allClear){
  if(plain&&differences.every(d=>d.playMinusSkip!>0))recommendation={status:'conditional',preferred:'play',ruleId:BLIND_POLICY.cash,reason:'Jugar deja más dinero en todos estos planes completos y conserva la oportunidad de tienda. Depende de poder ejecutar esas jugadas; no predice victoria.'};
  else if(!plain&&value(state.observed.jokers)?.some(j=>!(BLIND_POLICY.cashEligibleJokers as readonly string[]).includes(j.catalogId)&&j.catalogId!=='throwback'))recommendation={status:'abstain',preferred:null,ruleId:BLIND_POLICY.incomplete,reason:'Los planes aportan resultados, pero la regla de preferencia no compara todavía los efectos persistentes de esta composición.'};
  else recommendation={status:'tradeoff',preferred:null,ruleId:BLIND_POLICY.tradeoff,reason:'Hay un intercambio entre saldo, recompensa pendiente, desarrollo u oportunidad de tienda. No se asigna un precio ficticio a esos beneficios.'};
 }
 const issues:Issue[]=[];
 const collect=(report:Result<ShopDecision>|null)=>{if(!report)return;if(!report.ok){issues.push(...report.errors);return;}if(report.value.scenarios){const r=report.value.scenarios;issues.push(...(r.ok?r.value.errors:r.errors));if(r.ok)for(const c of r.value.comparisons)if(!c.ok)issues.push(...c.errors);}};
 collect(play);collect(afterSkip);
 const jokers=value(state.observed.jokers)??[];
 return {ok:true,value:{contract:'blind-decision-1',policyVersion:BLIND_POLICY.version,binding:analysisBinding(state),stateToken:token(state),optionsToken:token(options),skip,play,afterSkip,differences,
  skipConsequences:skip.ok?immediateConsequences(state,skip.value.state):null,recommendation,
  sacrifices:['Saltar omite el premio y los ingresos de esta ronda, que solo se cobran si se supera.','Saltar omite la visita a tienda posterior a esta ronda; no se inventan sus ofertas ni su valor.',...(jokers.some(j=>j.catalogId==='throwback')?['Saltar aumenta el total usado por Throwback; su utilidad necesita manos futuras viables, no un precio en dólares.']:[]),...(jokers.some(j=>Object.keys(j.counters).length)?['Jugar puede crecer, consumir o cambiar contadores. Consulta las consecuencias calculadas de cada plan, sin extrapolarlas.']:[])],
  limitations:['Las dos rutas no son la misma ronda: jugar evalúa la ciega actual; los planes tras salto evalúan explícitamente la siguiente. No se restan sus puntuaciones.','El horizonte económico termina tras el cobro de la ronda actual (antes de gastar en tienda) o inmediatamente tras saltar. Los efectos futuros y la tienda no están valorados.','Los planes son escenarios fijos; no predicen robos, consistencia del mazo ni probabilidades de victoria. Un plan que no llega al objetivo no demuestra derrota.','Economía e Inversión son provisionales por inspección del ejecutable, sin observación en partida. Double y los restantes premios de salto no se proyectan.','La preferencia monetaria cubre los ocho efectos iniciales retenidos y Green sin reducción. Otros efectos pueden calcularse en H2 sin recibir esa preferencia.','Las recomendaciones de H3 dentro de cada ruta solo comparan conservar el inventario; no son una recomendación global jugar/saltar.'],errors:issues,projected:true,exhaustive:false}};
}
export function blindDecisionIsCurrent(report:BlindDecision,input:unknown,options:BlindOptions={}):boolean{
 const checked=validateState(input);if(checkJsonValue(options).length)return false;
 return checked.ok&&report.stateToken===token(checked.value)&&report.optionsToken===token(options)&&equal(report.binding,analysisBinding(checked.value));
}
