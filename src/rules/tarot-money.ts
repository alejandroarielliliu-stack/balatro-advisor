import type {Card} from '../catalog/initial.js';
import type {GameStateV02} from '../state/model.js';
import type {Consumable} from './full-joker-contract.js';
import type {Trace} from './core.js';
import {fail,need,safe,valueFact} from './core.js';
import {bankBalance} from './economic-jokers.js';
import {generationEvent} from './generation-jokers.js';

/** L14: primary static source, not an observed game session. */
export const MONEY_TAROTS=[
 {catalogId:'c_hermit',name:'El Ermitaño',maxTargets:0,effect:'money',cap:20},
 {catalogId:'c_temperance',name:'La Templanza',maxTargets:0,effect:'money',cap:50}
] as const;
export const moneyTarotDefinition=(id:string)=>MONEY_TAROTS.find(item=>item.catalogId===id);
export interface MoneyTarotChange {catalogId:string;before:number;income:number;after:number;sellValues:{instanceId:string;value:number}[]}

/** The same use hook for targeted and money Tarot. Unknown history stays unknown. */
export function recordTarotUse(state:GameStateV02,used:Consumable,cards:Card[],trace:Trace[],use:(id:string)=>void,limitations:string[]){
 const context=state.observed.jokerContext?.status==='known'?state.observed.jokerContext.value:undefined;
 if(context?.tarotsUsed?.status==='known'){
  safe(context.tarotsUsed.value+1,'$.observed.jokerContext.tarotsUsed');
  generationEvent({state,stage:'use_consumable',cards,consumable:used,trace,use});
 }else limitations.push('El total previo de Tarot usados no está registrado; sigue desconocido. No se deriva una bonificación de Fortune Teller a partir de este uso.');
}

/** Caller owns a detached state and validates source/phase/removal/revision. */
export function applyMoneyTarotUse(state:GameStateV02,used:Consumable,targets:readonly string[],trace:Trace[],use:(id:string)=>void,limitations:string[]):MoneyTarotChange{
 use('tarot.money');
 const definition=moneyTarotDefinition(used.catalogId);
 if(!definition||used.kind!=='tarot')fail('$action.instanceId','unsupported_tarot','Este efecto admite Ermitaño y Templanza.');
 if(used.handId!==undefined)fail('$action.instanceId','incompatible_consumable','Un Tarot no puede identificar una mano Planet.');
 if(targets.length)fail('$action.targetCardIds','unexpected_targets','Este Tarot de dinero no utiliza cartas objetivo.');
 const before=bankBalance(need(state.observed.money,'$.observed.money')),sellValues:MoneyTarotChange['sellValues']=[];
 let income:number;
 if(used.catalogId==='c_hermit')income=Math.max(0,Math.min(before,definition.cap));
 else{
  const missing:string[]=[];
  for(const joker of need(state.observed.jokers,'$.observed.jokers')){
   if(joker.sellValue.status==='known')sellValues.push({instanceId:joker.instanceId,value:joker.sellValue.value});
   else missing.push(joker.instanceId);
  }
  // Capped accumulation avoids overflow without asking the UI to reproduce the payout.
  income=sellValues.reduce((sum,joker)=>Math.min(definition.cap,sum+joker.value),0);
  if(missing.length&&income<definition.cap)fail('$.observed.jokers.'+missing[0]+'.sellValue','unknown_data','Templanza necesita los valores de venta pendientes: '+missing.join(', ')+'.');
  if(missing.length)limitations.push('Las ventas conocidas ya alcanzan el tope $50; los valores desconocidos no se convierten en cero ni cambian este ingreso limitado.');
 }
 const after=bankBalance(before+income);
 recordTarotUse(state,used,[],trace,use,limitations);state.observed.money=valueFact(after);
 trace.push({ruleId:'tarot.money',label:definition.name+' · ingreso inmediato',values:{catalogId:used.catalogId,before,income,after,cap:definition.cap}});
 limitations.push('Ingreso inmediato respaldado por inspección del ejecutable, sin observación directa en partida. No se cobra interés ni recompensa de ciega.', 'Templanza usa los valores de venta observados de los comodines físicos, sin venderlos, copiar efectos o anticipar crecimiento.');
 return {catalogId:used.catalogId,before,income,after,sellValues};
}
