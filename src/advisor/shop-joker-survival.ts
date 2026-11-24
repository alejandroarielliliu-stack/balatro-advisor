import {blindRequirement} from '../catalog/blinds.js';
import {valueFact} from '../rules/core.js';
import {projectNextRoundCashout} from '../rules/economy.js';
import {applyShopAction,shopPurchaseInstanceId} from '../rules/shop.js';
import type {Fact,GameState,GameStateV02} from '../state/model.js';
import {estimateBlindSurvival} from './next-blind-survival.js';
import type {BlindSurvivalEstimate} from './next-blind-survival.js';

export interface ShopJokerPreference {
 offerId:string;
 reason:string;
 improvesSurvival:boolean;
 moneyAfter:number;
}

export type ShopJokerAssessment=
 |{status:'ready';preference:ShopJokerPreference|null}
 |{status:'unavailable';reason:string};

type Estimate=Extract<BlindSurvivalEstimate,{status:'estimated'}>;
interface Purchase {
 offerId:string;
 estimate:Estimate;
 moneyAfter:number;
 cashoutBalance:number|null;
}

const value=<T>(fact:Fact<T>|undefined)=>fact?.status==='known'?fact.value:undefined;
const unavailable=(reason:string):ShopJokerAssessment=>({status:'unavailable',reason});
const kept:ShopJokerAssessment={status:'ready',preference:null};
const survive=(estimate:Estimate)=>estimate.reachedCount+estimate.margin!.rescuedCount;

function compareSurvival(a:Estimate,b:Estimate):number {
 return survive(a)-survive(b)
  ||a.reachedCount-b.reachedCount
  ||a.margin!.winsWithSpareHand-b.margin!.winsWithSpareHand
  ||b.margin!.meanRelativeDeficit-a.margin!.meanRelativeDeficit;
}

function projectedRound(state:GameStateV02):GameStateV02|string {
 const blind=value(state.observed.nextBlind),deck=value(state.observed.deckId);
 if(!blind||!deck)return 'Faltan los datos de la próxima ciega o del mazo.';
 const visible=value(state.observed.visibleBoss);
 const sameBoss=blind.kind==='boss'&&visible?.kind==='boss'&&visible.ante===blind.ante?visible:undefined;
 const boss=value(blind.bossId)??(blind.kind==='boss'?value(sameBoss?.bossId):'none');
 if(!boss)return 'Registra el próximo jefe para comparar los comodines.';
 const requirement=blindRequirement(blind.ante,blind.kind,boss,deck);
 if(!requirement.ok)return requirement.error.message;
 const target=value(blind.target)??value(sameBoss?.target)??requirement.target;
 const reward=value(blind.reward)??value(sameBoss?.reward)??requirement.reward;
 return {...state,observed:{...state.observed,nextBlind:valueFact({...blind,bossId:valueFact(boss),target:valueFact(target),reward:valueFact(reward)})}};
}

/** Compare individual, directly affordable purchases with the same simulated deck orders. */
export function assessShopJokers(state:GameState):ShopJokerAssessment {
 if(state.schemaVersion!=='0.2'||state.phase!=='shop')return unavailable('La estimación necesita una tienda abierta con el estado actual de la partida.');
 const owned=value(state.observed.jokers),shop=value(state.observed.shop);
 const offers=shop?.cardOffers.filter(offer=>offer.kind==='joker')??[];
 if(!offers.length)return kept;
 if(!owned||value(state.observed.money)===undefined)return unavailable('Falta el saldo o el inventario para comparar las compras.');

 const mutation={expectedRevision:state.revision,updatedAt:state.updatedAt};
 const candidates:{offerId:string;state:GameStateV02;moneyAfter:number}[]=[];
 for(const offer of offers){
  const result=applyShopAction(state,{type:'buy',offerId:offer.offerId,instanceId:shopPurchaseInstanceId(offer.offerId,owned)},mutation);
  if(!result.ok){
   const issue=result.errors[0]!;
   if(issue.code==='insufficient_money'||issue.code==='no_slots')continue;
   return unavailable(issue.message);
  }
  const purchased=result.value.state,moneyAfter=value(purchased.observed.money);
  if(purchased.schemaVersion!=='0.2'||moneyAfter===undefined)return unavailable('Falta calcular el saldo después de comprar.');
  candidates.push({offerId:offer.offerId,state:purchased,moneyAfter});
 }
 if(!candidates.length)return kept;

 const project=(input:GameStateV02)=>{
  const round=projectedRound(input);
  if(typeof round==='string')return {estimate:{status:'unavailable' as const,reason:round},cashoutBalance:null};
  const estimate=estimateBlindSurvival(round,{sampling:'comparison',enteringFromShop:true});
  const cashout=estimate.status==='estimated'?projectNextRoundCashout(round,false):null;
  return {estimate,cashoutBalance:cashout?.ok?cashout.value.balanceAfter:null};
 };
 const baseline=project(state).estimate;
 if(baseline.status==='unavailable')return unavailable(baseline.reason);
 const purchases:Purchase[]=[];
 for(const candidate of candidates){
  const {estimate,cashoutBalance}=project(candidate.state);
  if(estimate.status==='unavailable')return unavailable(estimate.reason);
  purchases.push({offerId:candidate.offerId,estimate,moneyAfter:candidate.moneyAfter,cashoutBalance});
 }
 // Compare cashout only when the same economy model can evaluate every purchase.
 const cashoutComparable=purchases.every(purchase=>purchase.cashoutBalance!==null);
 const compare=(a:Purchase,b:Purchase)=>compareSurvival(a.estimate,b.estimate)
  ||(cashoutComparable? a.cashoutBalance!-b.cashoutBalance!:0)
  ||a.moneyAfter-b.moneyAfter;
 purchases.sort((a,b)=>compare(b,a));
 const [best,other]=purchases;
 if(!best||other&&compare(best,other)===0||compareSurvival(best.estimate,baseline)<0)return kept;

 const estimate=best.estimate,improvesSurvival=compareSurvival(estimate,baseline)>0;
 const survived=survive(estimate),withoutPurchase=survive(baseline);
 const reason=survived>withoutPurchase
  ?`Superas la próxima ciega en ${survived} de ${estimate.sampleCount} pruebas, frente a ${withoutPurchase} sin comprar.`
  :survived===0?'Con esta compra, la simulación aún queda por debajo de la meta.'
  :improvesSurvival?'Te deja más margen para superar la próxima ciega.'
  :'Es la compra mejor situada para la próxima ciega con el saldo actual.';
 return {status:'ready',preference:{offerId:best.offerId,reason,improvesSurvival,moneyAfter:best.moneyAfter}};
}
