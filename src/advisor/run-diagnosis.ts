import {BOOSTER_CATALOG} from '../catalog/booster-catalog.js';
import {deckDefinition} from '../catalog/decks.js';
import {interestCap} from '../catalog/economy-vouchers.js';
import {nextBlindAfter} from '../run/progress.js';
import {valueFact} from '../rules/core.js';
import {creditLimit} from '../rules/economic-jokers.js';
import {applyPackAction} from '../rules/pack-shop.js';
import {applyShopAction,shopPurchaseInstanceId} from '../rules/shop.js';
import {selectionScenarioState} from '../rules/tags.js';
import {applyVoucherPurchase} from '../rules/voucher-shop.js';
import type {Fact,GameState,GameStateV02} from '../state/model.js';
import {canonical} from '../storage/confirmed-record.js';
import {estimateBlindSurvival} from './next-blind-survival.js';
import type {BlindSurvivalEstimate,BlindSurvivalTrial} from './next-blind-survival.js';
import {projectUpcomingRound} from './shop-joker-survival.js';

export const RUN_DIAGNOSIS_POLICY='run-diagnosis-1';
export type RunPriority='survival'|'consistency'|'economy'|'scaling'|'optimization';
type Samples=32|64|128;
type Estimate=Extract<BlindSurvivalEstimate,{status:'estimated'}>;

export interface RoundDiagnosis {
 samples:number;
 wins:number;
 rescues:number;
 winsWithSpareHand:number;
 meanDeficit:number;
 meanHandsLeft:number|null;
 meanCashoutBalance:number|null;
 cashouts:number;
}

export interface RunDiagnosis {
 priority:RunPriority|null;
 reason:string;
 next:RoundDiagnosis|null;
 later:{ante:number;kind:'small'|'big'|'boss';estimate:RoundDiagnosis}|null;
 limitations:string[];
}

export type ShopRecommendation=
 |{kind:'buy';offerKind:'joker'|'voucher';offerId:string;moneyAfter:number;reason:string}
 |{kind:'hold'|'compare';reason:string}
 |{kind:'pack';offerId:string;reason:string};

export interface RunAssessment {
 diagnosis:RunDiagnosis;
 shop:ShopRecommendation|null;
}

type EstimateRound=(state:GameStateV02,options:{sampling:'comparison';comparisonSamples:Samples;enteringFromShop:boolean})=>BlindSurvivalEstimate;
type Candidate={kind:'hold';state:GameStateV02}|{kind:'joker'|'voucher';offerId:string;state:GameStateV02};
type Evaluated={candidate:Candidate;estimate:Estimate;metrics:RoundDiagnosis};
const value=<T>(fact:Fact<T>|undefined)=>fact?.status==='known'?fact.value:undefined;
const mean=(numbers:readonly number[])=>numbers.length?numbers.reduce((sum,n)=>sum+n,0)/numbers.length:null;
const survived=(metrics:RoundDiagnosis)=>metrics.wins+metrics.rescues;
const stable=(metrics:RoundDiagnosis)=>metrics.wins===metrics.samples&&metrics.winsWithSpareHand>=metrics.samples*.75;

function summarize(estimate:Estimate):RoundDiagnosis {
 const trials=estimate.trials??[];
 const wins=trials.filter(trial=>trial.outcome==='win');
 const cashouts=wins.flatMap(trial=>trial.balanceAfter===null?[]:[trial.balanceAfter]);
 return {samples:estimate.sampleCount,wins:estimate.reachedCount,rescues:estimate.margin?.rescuedCount??0,
  winsWithSpareHand:estimate.margin?.winsWithSpareHand??0,meanDeficit:estimate.margin?.meanRelativeDeficit??0,
  meanHandsLeft:mean(wins.map(trial=>trial.handsLeft)),
  meanCashoutBalance:cashouts.length===wins.length?mean(cashouts):null,cashouts:cashouts.length};
}

function priority(state:GameStateV02,next:RoundDiagnosis,later:RunDiagnosis['later']):Pick<RunDiagnosis,'priority'|'reason'> {
 if(survived(next)<next.samples*.75)return {priority:'survival',reason:`La próxima ciega se supera en ${survived(next)} de ${next.samples} pruebas.`};
 if(!stable(next))return {priority:'consistency',reason:'La próxima ciega todavía depende de robos favorables o de gastar todas las manos.'};
 if(later&&!stable(later.estimate))return {priority:'scaling',reason:'Con el equipo actual, la ciega posterior tiene menos margen.'};
 const deck=deckDefinition(value(state.observed.deckId)??''),money=value(state.observed.money),vouchers=value(state.observed.outOfScope)?.vouchers;
 const reserve=vouchers&&deck?.income.interest?interestCap(vouchers)*5:undefined;
 if(money!==undefined&&(money<5||reserve!==undefined&&money<reserve)){
  return {priority:'economy',reason:'Hay margen para ganar y conservar dinero para las próximas tiendas.'};
 }
 return {priority:'optimization',reason:'La próxima ciega se supera con margen en la simulación.'};
}

/** Current-build stress test. Each assessment starts a fresh blind with the
 * registered build. Future effects, cashouts and upgrades are not presumed. */
function followingBlind(state:GameStateV02,estimate:EstimateRound,limitations:string[]):RunDiagnosis['later'] {
 const blind=value(state.observed.nextBlind);
 if(!blind)return null;
 const following=nextBlindAfter(state,blind);
 if(!following)return null;
 const projected=projectUpcomingRound({...state,observed:{...state.observed,nextBlind:valueFact(following)}});
 if(typeof projected==='string'){limitations.push('La ciega posterior todavía no se puede evaluar.');return null;}
 const result=estimate(projected,{sampling:'comparison',comparisonSamples:32,enteringFromShop:false});
 if(result.status==='unavailable'){limitations.push('La ciega posterior todavía no se puede evaluar.');return null;}
 return {ante:following.ante,kind:following.kind,estimate:summarize(result)};
}

function enumerate(state:GameStateV02):{candidates:Candidate[];unresolved:boolean} {
 const shop=value(state.observed.shop);
 const candidates:Candidate[]=[{kind:'hold',state}];
 if(!shop)return {candidates,unresolved:false};
 const owned=value(state.observed.jokers)??[];
 const money=value(state.observed.money);
 const limit=money!==undefined&&state.observed.jokers.status==='known'?money+creditLimit(state):undefined;
 const mutation={expectedRevision:state.revision,updatedAt:state.updatedAt};
 const tooExpensive=(price:Fact<number>)=>limit!==undefined&&price.status==='known'&&price.value>limit;
 let unresolved=shop.cardOffers.some(offer=>offer.kind!=='joker'&&!tooExpensive(offer.price));
 for(const offer of shop.cardOffers){
  if(offer.kind!=='joker'||tooExpensive(offer.price))continue;
  const result=applyShopAction(state,{type:'buy',offerId:offer.offerId,instanceId:shopPurchaseInstanceId(offer.offerId,owned)},mutation);
  if(result.ok&&result.value.state.schemaVersion==='0.2')candidates.push({kind:'joker',offerId:offer.offerId,state:result.value.state});
  else if(!result.ok&&!result.errors.every(error=>['insufficient_money','no_slots'].includes(error.code)))unresolved=true;
 }
 for(const offer of shop.voucherOffers??[]){
  if(tooExpensive(offer.price))continue;
  const result=applyVoucherPurchase(state,{type:'buy_voucher',offerId:offer.offerId},mutation);
  if(result.ok&&result.value.state.schemaVersion==='0.2')candidates.push({kind:'voucher',offerId:offer.offerId,state:result.value.state});
  else if(!result.ok&&!result.errors.every(error=>['insufficient_money','voucher_already_owned','missing_prerequisite'].includes(error.code)))unresolved=true;
 }
 return {candidates,unresolved};
}

const winsNormally=(trial:BlindSurvivalTrial)=>trial.outcome==='win';
const reachesNext=(trial:BlindSurvivalTrial)=>trial.outcome!=='loss';
const hasSpareHand=(trial:BlindSurvivalTrial)=>winsNormally(trial)&&trial.handsLeft>0;

/** Use paired draws and withhold narrow advantages. This is a comparison
 * rule for the simulator, not a calibrated confidence level for human play. */
function pairedGap(a:Estimate,b:Estimate,signal:(trial:BlindSurvivalTrial)=>boolean):number {
 const trialsA=a.trials??[],trialsB=b.trials??[];
 if(trialsA.length!==a.sampleCount||trialsB.length!==b.sampleCount||trialsA.length!==trialsB.length)return 0;
 let difference=0,disagreements=0;
 for(const [index,trial] of trialsA.entries()){
  const other=trialsB[index]!;
  if(trial.trial!==other.trial)return 0;
  const step=Number(signal(trial))-Number(signal(other));
  difference+=step;
  disagreements+=Math.abs(step);
 }
 if(!disagreements)return 0;
 return Math.abs(difference)>=Math.max(2,2*Math.sqrt(disagreements))?difference:0;
}

function safetyGap(a:RoundDiagnosis,b:RoundDiagnosis):number {
 return survived(a)-survived(b)||a.wins-b.wins||a.winsWithSpareHand-b.winsWithSpareHand;
}

function needsMore(a:Evaluated,b:Evaluated):boolean {
 for(const [difference,signal] of [
  [survived(a.metrics)-survived(b.metrics),reachesNext],
  [a.metrics.wins-b.metrics.wins,winsNormally],
  [a.metrics.winsWithSpareHand-b.metrics.winsWithSpareHand,hasSpareHand]
 ] as const){
  if(difference)return pairedGap(a.estimate,b.estimate,signal)===0;
 }
 // Equal totals can hide a meaningful disagreement on the paired deals.
 const first=a.estimate.trials,second=b.estimate.trials;
 if(!first||!second)return false;
 if(first.some((trial,index)=>{
  const other=second[index];
  return !other||trial.outcome!==other.outcome||hasSpareHand(trial)!==hasSpareHand(other);
 }))return true;
 if(a.metrics.wins!==a.metrics.samples||a.metrics.meanCashoutBalance===null||b.metrics.meanCashoutBalance===null)return false;
 const deltas=first.map((trial,index)=>trial.balanceAfter!-second[index]!.balanceAfter!);
 const difference=mean(deltas)??0;
 if(!difference)return false;
 const error=Math.sqrt(deltas.reduce((sum,delta)=>sum+(delta-difference)**2,0)/(deltas.length*(deltas.length-1)));
 return Math.abs(difference)<=2*error;
}

function rank(a:Evaluated,b:Evaluated):number {
 const x=a.metrics,y=b.metrics;
 const safety=safetyGap(x,y);
 if(safety)return safety;
 if(x.wins===x.samples&&y.wins===y.samples&&x.meanCashoutBalance!==null&&y.meanCashoutBalance!==null)
  return x.meanCashoutBalance-y.meanCashoutBalance||(value(a.candidate.state.observed.money)??0)-(value(b.candidate.state.observed.money)??0);
 if(survived(x)===0)return y.meanDeficit-x.meanDeficit;
 return (value(a.candidate.state.observed.money)??0)-(value(b.candidate.state.observed.money)??0);
}

function conditionalPack(state:GameStateV02):ShopRecommendation|null {
 const shop=value(state.observed.shop);
 const mutation={expectedRevision:state.revision,updatedAt:state.updatedAt};
 for(const offer of shop?.packOffers??[]){
  const definition=BOOSTER_CATALOG.find(pack=>pack.id===offer.catalogId);
  if(definition?.family!=='celestial'||!applyPackAction(state,{type:'buy_pack',offerId:offer.offerId},mutation).ok)continue;
  return {kind:'pack',offerId:offer.offerId,reason:'Puede ayudarte si trae un planeta para una mano que juegas con frecuencia.'};
 }
 return null;
}

function recommend(state:GameStateV02,baseline:Evaluated,all:Evaluated[],unresolved:boolean,later:RunDiagnosis['later']):ShopRecommendation {
 if(unresolved)return {kind:'compare',reason:'Hay ofertas que aún no se pueden comparar con la misma evidencia.'};
 const buys=all.filter(item=>item.candidate.kind!=='hold').sort((a,b)=>rank(b,a));
 const [best,second]=buys;
 const base=baseline.metrics;
 if(!best||rank(best,baseline)<=0){
  if(!stable(base))return conditionalPack(state)??{kind:'compare',reason:'Las ofertas evaluadas no aportan el refuerzo que pide la próxima ciega.'};
  if(later&&!stable(later.estimate))return {kind:'compare',reason:'Tienes margen para esta ciega. Con el equipo actual, la posterior todavía pide un refuerzo.'};
  return {kind:'hold',reason:'Con tu equipo actual ya tienes margen para ganar. Conserva el dinero.'};
 }
 if(best.candidate.kind==='hold')return {kind:'hold',reason:'Conserva el saldo para otra tienda.'};
 const metrics=best.metrics;
 if((second&&(!rank(best,second)||needsMore(best,second)))||needsMore(best,baseline))
  return {kind:'compare',reason:'La simulación deja las opciones muy parejas.'};
 if(!survived(metrics))return conditionalPack(state)??{kind:'compare',reason:'La mejor mejora de la tienda todavía queda por debajo de la meta.'};
 const reason=survived(metrics)>survived(base)
  ?`Superas la próxima ciega en ${survived(metrics)} de ${metrics.samples} pruebas, frente a ${survived(base)} sin comprar.`
  :safetyGap(metrics,base)>0?'La compra da más margen para ganar la próxima ciega.'
  :'El cobro simulado queda mejor con esta compra y mantienes el margen para ganar.';
 return {kind:'buy',offerKind:best.candidate.kind,offerId:best.candidate.offerId,
  moneyAfter:value(best.candidate.state.observed.money)!,reason};
}

export function assessRun(state:GameState,estimate:EstimateRound=estimateBlindSurvival):RunAssessment {
 const unavailable=(reason:string):RunAssessment=>({diagnosis:{priority:null,reason,next:null,later:null,limitations:[reason]},shop:null});
 if(state.schemaVersion!=='0.2'||state.phase!=='shop'&&state.phase!=='blind_select')return unavailable('La estimación necesita una próxima ciega registrada.');
 const fromShop=state.phase==='shop',initial=fromShop?state:selectionScenarioState(state);
 const projected=projectUpcomingRound(initial);
 if(typeof projected==='string')return unavailable(projected);
 const {candidates,unresolved:initialUnresolved}=fromShop?enumerate(initial):{candidates:[{kind:'hold',state:initial} as const],unresolved:false};
 let baseline:Evaluated|undefined,evaluated:Evaluated[]=[],unresolved=initialUnresolved;
 for(const samples of [32,64,128] as const){
  const held=estimate(projected,{sampling:'comparison',comparisonSamples:samples,enteringFromShop:fromShop});
  if(held.status==='unavailable')return unavailable(held.reason);
  baseline={candidate:candidates[0]!,estimate:held,metrics:summarize(held)};
  evaluated=[baseline];
  for(const candidate of candidates.slice(1)){
   const round=projectUpcomingRound(candidate.state);
   const result=typeof round==='string'?null:estimate(round,{sampling:'comparison',comparisonSamples:samples,enteringFromShop:true});
   if(!result||result.status==='unavailable'){unresolved=true;continue;}
   evaluated.push({candidate,estimate:result,metrics:summarize(result)});
  }
  const [first,second]=[...evaluated].sort((a,b)=>rank(b,a));
  if(unresolved||!first||!second||(!needsMore(first,second)&&!needsMore(first,baseline)))break;
  if(samples===64&&evaluated.length>3)break;
 }
 const metrics=baseline!.metrics,limitations:string[]=[];
 if(unresolved)limitations.push('Hay ofertas o efectos sin una simulación comparable.');
 if(metrics.cashouts<metrics.wins)limitations.push('Falta calcular el cobro de algunas victorias.');
 if(value(state.observed.shop)?.packOffers?.length)limitations.push('El contenido de los sobres cerrados todavía es desconocido.');
 const later=stable(metrics)?followingBlind(projected,estimate,limitations):null;
 return {diagnosis:{...priority(state,metrics,later),next:metrics,later,limitations},
  shop:fromShop?recommend(state,baseline!,evaluated,unresolved,later):null};
}

/** The scoring cache is separate from the offer list. Preserve the original
 * facts in the key when they carry information about engine coverage. */
export function cachedRunEstimator():EstimateRound {
 const cache=new Map<string,BlindSurvivalEstimate>();
 return (state,options)=>{
  const {shop:_offers,...observed}=state.observed;
  const key=JSON.stringify(canonical([RUN_DIAGNOSIS_POLICY,state.rulesetId,state.schemaVersion,state.phase,observed,options]));
  const saved=cache.get(key);
  if(saved)return saved;
  const result=estimateBlindSurvival(state,options);
  cache.set(key,result);
  if(cache.size>24)cache.delete(cache.keys().next().value!);
  return result;
 };
}
