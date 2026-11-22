import {blindRequirement} from '../catalog/blinds.js';
import {nextBlindAfter} from '../run/progress.js';
import {run,valueFact} from '../rules/core.js';
import {projectNextRoundCashout} from '../rules/economy.js';
import {historyEvent} from '../rules/history-jokers.js';
import {selectionScenarioState} from '../rules/tags.js';
import type {GameStateV02} from '../state/model.js';

const reserve=25;
const voucherCost=10;
const rerollBudget=15;
const jokerBudget=10;
const d6Budget=reserve+rerollBudget+jokerBudget;

/** One cashout on the path after skipping. No subsequent shop transactions or round actions. */
function projectNextShop(state:GameStateV02){
 if(state.phase!=='blind_select'||state.observed.nextBlind.status!=='known'||state.observed.deckId.status!=='known')return null;
 const next=nextBlindAfter(state,state.observed.nextBlind.value);
 if(!next||next.bossId.status!=='known')return null;
 const requirement=blindRequirement(next.ante,next.kind,next.bossId.value,state.observed.deckId.value);
 if(!requirement.ok)return null;
 if(next.reward.status==='unknown')next.reward=valueFact(requirement.reward);
 const projected=selectionScenarioState(state);
 projected.observed.nextBlind=valueFact(next);
 const cashout=projectNextRoundCashout(projected,false);
 if(!cashout.ok)return null;

 const jokers=projected.observed.jokers.status==='known'?projected.observed.jokers.value:[];
 // The round engine awards Rocket through its end-of-round hook, after any increase from a boss.
 // Run it on the hypothetical copy after the ordinary cashout calculation.
 const rocket=jokers.some(joker=>joker.catalogId==='rocket')
  ?run([],{},(trace,use)=>historyEvent({state:structuredClone(projected),stage:'end_round',cards:[],won:true,trace,use}).cashoutBonus)
  :null;
 const rocketIncome=rocket?.ok?rocket.value:0;
 let selectedCashout=cashout.value;
 let preserveDiscards=false;
 if(selectedCashout.balanceAfter+rocketIncome<d6Budget&&jokers.some(joker=>joker.catalogId==='delayed_grat')){
  const withDelayedGratification=projectNextRoundCashout(projected,true);
  if(withDelayedGratification.ok&&withDelayedGratification.value.balanceAfter+rocketIncome>=d6Budget){
   selectedCashout=withDelayedGratification.value;
   preserveDiscards=true;
  }
 }
 const balance=selectedCashout.balanceAfter+rocketIncome;
 if(!Number.isSafeInteger(balance))return null;
 const moons=jokers.filter(joker=>joker.catalogId==='to_the_moon').length;
 const moonIncome=selectedCashout.interest/(1+moons)*moons;
 const jokerIncome=selectedCashout.goldenIncome+(selectedCashout.otherJokerIncome??0)+rocketIncome+moonIncome;
 return {balance,jokerIncome,rocketPending:rocket?.ok===false,preserveDiscards};
}

export function assessSkipBudget(state:GameStateV02,tagId:'tag_voucher'|'tag_d_six'):{skip:boolean;reason:string}{
 const money=state.observed.money.status==='known'?state.observed.money.value:null;
 if(tagId==='tag_voucher'){
  if(money===null)return {skip:false,reason:`Registra el saldo para comprobar si puedes pagar $${voucherCost} y guardar $${reserve}.`};
  const skip=money>=reserve+voucherCost;
  return {skip,reason:skip?`Con $${money} puedes pagar el vale de $${voucherCost} y guardar $${reserve}.`
   :`Con $${money} no puedes pagar el vale de $${voucherCost} y guardar $${reserve}.`};
 }
 if(money===null)return {skip:false,reason:`Registra el saldo para comprobar si puedes reunir los $${d6Budget} del plan D6.`};
 if(money>=d6Budget)return {skip:true,reason:`Con $${money} puedes guardar $${reserve}, usar $${rerollBudget} en rerolls y $${jokerBudget} en jokers.`};
 const projection=projectNextShop(state);
 if(!projection)return {skip:false,reason:`Tienes $${money}. Falta calcular si el cobro de la próxima ciega te llevaría a $${d6Budget}.`};
 const {balance,jokerIncome,rocketPending,preserveDiscards}=projection;
 const income=jokerIncome>0?`, incluidos $${jokerIncome} de jokers`:'';
 if(balance>=d6Budget)return {skip:true,reason:`Si ganas la siguiente ciega${preserveDiscards?' sin descartar':''}, llegarías a $${balance}${income}. El plan D6 requiere $${d6Budget}.`};
 if(rocketPending)return {skip:false,reason:`El cobro calculado llega a $${balance}. Falta el pago de Rocket para comprobar si llegas a $${d6Budget}.`};
 return {skip:false,reason:`Si ganas la siguiente ciega, llegarías a $${balance}${income}. Faltan $${d6Budget-balance} para el plan D6.`};
}
