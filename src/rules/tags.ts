import type {Fact,GameState,GameStateV02} from '../state/model.js';
import {validateState} from '../state/validation.js';
import {TAG_EFFECTS} from '../catalog/tag-effects.js';
import {tagDefinition} from '../catalog/tags.js';
import {blindRequirement} from '../catalog/blinds.js';
import {nextBlindAfter} from '../run/progress.js';
import {bankBalance} from './economic-jokers.js';
import {fail,need,run,stateInput,valueFact} from './core.js';
import type {EngineOptions,Trace} from './core.js';
const unknown=<T>(reason:string):Fact<T>=>({status:'unknown',reason});
/** H2's shop-shaped scoring input, ONLY inside a hypothetical query; never persisted.
 * Empty offers mean no shop actions are being modelled, not a predicted empty shop. */
export function selectionScenarioState(state:GameStateV02):GameStateV02{
 if(state.phase!=='blind_select')fail('$.phase','wrong_phase','El adaptador solo recibe selección de ciega.');
 const clone=structuredClone(state);
 return {...clone,phase:'shop',phaseData:{origin:unknown('Adaptador de escenario de selección; no es una tienda observada.')},observed:{...clone.observed,shop:valueFact({shopId:'blind-scenario-only',cardOffers:[],ignoredOtherOffers:[]})}};
}
export interface SkipProjection {
 state:GameStateV02;tagId:string;moneyBefore:number|null;moneyAfter:number|null;immediateIncome:number;
 deferredIncome:{dollars:number;condition:string}|null;limitations:string[];
}
/** Two supported skip rewards only. Pure projection, never a confirmed run transition. */
export function projectSkipBlind(input:unknown,options:EngineOptions={}){
 return run<SkipProjection>(['tags.skip'],options,(trace,use)=>{
  const checked=validateState(input);if(!checked.ok){const e=checked.errors[0]!;fail(e.path,e.code,e.message);}
  if(checked.value.schemaVersion!=='0.2'||checked.value.phase!=='blind_select')fail('$.phase','wrong_phase','Compara un salto desde selección de ciega, en formato 0.2.');
  const state=checked.value;stateInput(selectionScenarioState(state),use);
  const blind=need(state.observed.nextBlind,'$.observed.nextBlind');
  if(blind.ante<1||blind.ante>8||blind.kind==='boss')fail('$.observed.nextBlind','illegal_skip','Solo se saltan Pequeña o Grande en los antes 1–8.');
  const tag=need(state.phaseData.skipTag,'$.phaseData.skipTag');
  if(tag!==TAG_EFFECTS.economy.id&&tag!==TAG_EFFECTS.investment.id)fail('$.phaseData.skipTag','unsupported_tag','Esta comparación solo calcula Economía e Inversión; registra otros saltos como observaciones.');
  if(!state.observed.jokerContext)fail('$.observed.jokerContext','unknown_data','Confirma la cola de etiquetas pendientes.');
  const context=need(state.observed.jokerContext,'$.observed.jokerContext');
  if(!context.tags)fail('$.observed.jokerContext.tags','unknown_data','Confirma las etiquetas pendientes; no se supone una cola vacía.');
  const queue=need(context.tags,'$.observed.jokerContext.tags');
  for(const id of queue){const t=tagDefinition(id);if(!t||['tag_add','immediate','new_blind_choice'].includes(t.trigger))fail('$.observed.jokerContext.tags','unsupported_tag','No se proyecta este salto con la etiqueta pendiente '+id+'; sus efectos o duplicación quedan fuera del lote.');}
  const before=state.observed.money.status==='known'?bankBalance(state.observed.money.value):null;
  let immediateIncome=0,deferredIncome:SkipProjection['deferredIncome']=null;
  if(tag===TAG_EFFECTS.economy.id){use('tags.economy');if(before===null)fail('$.observed.money','unknown_data','Economía necesita el saldo actual.');immediateIncome=Math.min(TAG_EFFECTS.economy.cap,Math.max(0,before));state.observed.money=valueFact(bankBalance(before+immediateIncome));}
  else {use('tags.investment');context.tags=valueFact([...queue,tag]);deferredIncome={dollars:TAG_EFFECTS.investment.dollars,condition:'Al superar una ciega jefe y cobrar; no es dinero disponible ahora ni una victoria garantizada.'};}
  const skips=context.blindsSkipped;context.blindsSkipped=skips?.status==='known'?valueFact(skips.value+1):unknown('No se conoce el total previo de saltos.');
  state.observed.jokerContext=valueFact(context);
  const next=nextBlindAfter(state,{ante:blind.ante,kind:blind.kind})!;
  const bases=blindRequirement(next.ante,next.kind,next.bossId.status==='known'?next.bossId.value:'',need(state.observed.deckId,'$.observed.deckId'));
  if(bases.ok){use('blind.effects');if(next.target.status==='unknown')next.target={status:'known',source:'confirmedPreset',value:bases.target};if(next.reward.status==='unknown')next.reward={status:'known',source:'confirmedPreset',value:bases.reward};}
  state.observed.nextBlind=valueFact(next);state.observed.shop=unknown('El salto no incluye tienda.');
  state.phaseData={skipTag:unknown('No se conoce la siguiente etiqueta.')};
  trace.push({ruleId:'tags.skip',label:'Salto hipotético, sin ronda ganada ni tienda',values:{tag,from:blind.kind,to:next.kind,ante:blind.ante}});
  trace.push({ruleId:tag===TAG_EFFECTS.economy.id?'tags.economy':'tags.investment',label:'Efecto de etiqueta condicionado',values:{incomeNow:immediateIncome,balanceBefore:before??'unknown',balanceAfter:state.observed.money.status==='known'?state.observed.money.value:'unknown',deferred:deferredIncome?.dollars??0}});
  const valid=validateState(state);if(!valid.ok){const e=valid.errors[0]!;fail(e.path,e.code,e.message);}
  return {state,tagId:tag,moneyBefore:before,moneyAfter:state.observed.money.status==='known'?state.observed.money.value:null,immediateIncome,deferredIncome,
   limitations:['Proyección sin manos jugadas, cobro de ronda ni tienda. No registra lo ocurrido en Balatro.','No predice robos ni preparación para la siguiente ciega; Throwback usa el total de saltos mediante H2, sin asignarle un valor en dólares.']};
 });
}
/** Extra settlement dollars only at a boss victory. No new interest timing formula. */
export function investmentIncome(state:GameState,won:boolean,trace:Trace[],use:(id:string)=>void){
 if(!won||state.observed.nextBlind.status!=='known'||state.observed.nextBlind.value.kind!=='boss')return 0;
 const ctx=state.observed.jokerContext;if(ctx?.status!=='known'||ctx.value.tags?.status!=='known')return 0; // resources() guards explicit unknowns
 const count=ctx.value.tags.value.filter(id=>id===TAG_EFFECTS.investment.id).length;if(!count)return 0;
 use('tags.investment');const dollars=count*TAG_EFFECTS.investment.dollars;trace.push({ruleId:'tags.investment',label:'Etiquetas de inversión tras superar al jefe',values:{count,perTag:TAG_EFFECTS.investment.dollars,dollars}});return dollars;
}
export function consumeInvestments(state:GameState,won:boolean,boss:boolean){
 const ctx=state.observed.jokerContext;
 if(won&&boss&&ctx?.status==='known'&&ctx.value.tags?.status==='known')ctx.value.tags=valueFact(ctx.value.tags.value.filter(id=>id!==TAG_EFFECTS.investment.id));
}
