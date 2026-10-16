import type {Advice,AdvisedAlternative} from './advisor.js';
export const RATING_POLICY=Object.freeze({version:'fit-0-10-v1',axisMaximum:2,maximum:10});
export interface RatingAxis {id:string;label:string;value:0|1|2;reason:string}
export interface ScenarioRating {scenarioId:string;value:number|null;axes:RatingAxis[];reason:string;scoreDelta:number|null}
export interface ContextRating {alternativeId:string;revision:number;range:[number,number]|null;scenarios:ScenarioRating[]}
/** Presentation rubric over H2/H3 results. Does not replace strategic ordering. */
export function contextRatings(advice:Advice):ContextRating[]{
 const baseline=advice.alternatives.find(a=>a.action.type==='hold');
 const valid=(a:AdvisedAlternative)=>a.legal&&a.complete&&a.scenarios.length===advice.scenarios.length&&a.scenarios.length>0;
 return advice.alternatives.map(a=>{
  const scenarios:ScenarioRating[]=a.scenarios.map(s=>{
   const m=s.metrics,b=baseline?.scenarios.find(x=>x.scenarioId===s.scenarioId)?.metrics;
   const unknown:ScenarioRating={scenarioId:s.scenarioId,value:null,axes:[],reason:'Sin evaluar: falta comparación completa, saldo o soporte de reglas.',scoreDelta:null};
   if(!baseline||!valid(a)||!valid(baseline)||!m||!b||m.moneyAfterShop===null||b.moneyAfterShop===null)return unknown;
   const cashout=m.reached&&b.reached&&!(m.terminalGoal&&b.terminalGoal);
   if(cashout&&(m.moneyAfterRound===null||b.moneyAfterRound===null))return unknown;
   // Grade directions rather than adding incompatible units. Mixed tradeoffs are neutral.
   const direction=(deltas:number[]):0|1|2=>deltas.every(x=>x>=0)&&deltas.some(x=>x>0)?2:deltas.every(x=>x<=0)&&deltas.some(x=>x<0)?0:1;
   const money=[m.moneyAfterShop-b.moneyAfterShop];if(cashout)money.push(m.moneyAfterRound!-b.moneyAfterRound!);
   const resources=direction([b.handsUsed-m.handsUsed,b.discardsUsed-m.discardsUsed]);
   const active=s.activatedEffects.some(e=>e.trace.length>0)||m.persistentBenefits.includes('golden-income');
   const lost=b.persistentBenefits.filter(x=>!m.persistentBenefits.includes(x));
   const added=m.persistentBenefits.filter(x=>!b.persistentBenefits.includes(x));
   const axes:RatingAxis[]=[
    {id:'goal',label:'Objetivo',value:m.reached?2:m.margin>b.margin?1:0,reason:m.reached?'El plan supera esta ciega.':m.margin>b.margin?'Se acerca más que conservar, pero no supera la ciega.':'El plan no supera la ciega ni mejora su margen frente a conservar.'},
    {id:'resources',label:'Recursos',value:resources,reason:resources===2?'Consume menos recursos sin empeorar manos o descartes.':resources===0?'Consume más recursos sin mejorar la otra dimensión.':'Consumo igual o intercambio entre manos y descartes.'},
    {id:'economy',label:'Economía',value:direction(money),reason:cashout?'Compara dinero tras tienda y tras cobro con conservar.':'Compara saldo tras tienda; el cobro no es comparable o la partida termina en el objetivo.'},
    {id:'activation',label:'Activación',value:active?2:0,reason:active?'Hay efectos positivos en las trazas o ingreso Golden calculado. No mide su magnitud ni atribuye todo a la compra.':'No hay contribuciones positivas identificadas por las trazas compatibles.'},
    {id:'continuity',label:'Continuidad',value:lost.length?0:added.length?2:1,reason:lost.length?'Pierde beneficios persistentes demostrados: '+lost.join(', '):added.length?'Añade beneficios persistentes demostrados: '+added.join(', '):'Sin beneficio persistente nuevo demostrado; no presupone crecimiento futuro.'}
   ];
   const same=m.handsUsed===b.handsUsed&&m.discardsUsed===b.discardsUsed;
   return {scenarioId:s.scenarioId,value:axes.reduce((sum,x)=>sum+x.value,0),axes,reason:'Rúbrica heurística provisional; compara este plan con conservar. No es probabilidad ni nota universal.',scoreDelta:same?m.score-b.score:null};
  });
  const values=scenarios.map(s=>s.value);const range:ContextRating['range']=values.length===advice.scenarios.length&&values.length>0&&values.every((v):v is number=>v!==null)?[Math.min(...values),Math.max(...values)]:null;
  return {alternativeId:a.id,revision:advice.inputRevision,range,scenarios};
 });
}
