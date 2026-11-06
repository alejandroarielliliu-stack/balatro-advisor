import type {GameState} from '../state/model.js';
import type {AdvisorScenario} from '../advisor/advisor.js';
import {compareBlindChoices} from '../advisor/blind-decision.js';
import type {BlindDecision} from '../advisor/blind-decision.js';
import type {ShopDecision} from '../advisor/decision.js';
import type {Result} from '../state/model.js';
import {tagDefinition} from '../catalog/tags.js';
import {guideBlindChoice} from '../advisor/blind-guidance.js';
import type {BlindGuidance,BlindRisk} from '../advisor/blind-guidance.js';
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',cl='')=>{const e=document.createElement(tag);e.textContent=text;e.className=cl;return e;};
const amount=(n:number|null)=>n===null?'Sin dato':'$'+n;
const signed=(n:number)=>n>0?'+'+n:String(n);
export interface BlindViewOptions {
 open:(title:string,body:HTMLElement,accept:string,submit:()=>boolean)=>void;
 state:()=>GameState;scenarios:()=>AdvisorScenario[];
}
function route(host:HTMLElement,title:string,decision:Result<ShopDecision>|null){
 if(!decision)return;const section=el('section','','blind-route');section.append(el('h4',title));
 if(!decision.ok){for(const e of decision.errors)section.append(el('p',e.message,'error'));host.append(section);return;}
 const report=decision.value.scenarioConsequences;
 for(const e of report.errors)section.append(el('p',e.message,'error'));
 for(const alt of report.alternatives)for(const s of alt.outcomes){
  const row=el('div','','blind-plan');row.dataset.blindOutcome=s.status;
  row.append(el('strong',report.plans.find(p=>p.id===s.scenarioId)?.description??s.scenarioId),el('span',{reached:'Objetivo alcanzado',not_reached:'El plan no llega',incompatible:'Plan incompatible',unavailable:'Sin cálculo'}[s.status]));
  if(s.metrics)row.append(el('small',`${s.metrics.score} puntos · ${s.metrics.handsUsed} manos · ${s.metrics.discardsUsed} descartes · saldo tras cobro ${amount(s.metrics.moneyAfterRound)}`));
  for(const c of s.counters)row.append(el('small',`${c.catalogId} · ${c.key}: ${c.before?.status==='known'?c.before.value:'?'} → ${c.after?.status==='known'?c.after.value:'?'} · solo este escenario`));
  for(const e of s.errors)row.append(el('small',e.message));for(const l of s.limitations)row.append(el('small',l));section.append(row);
 }
 host.append(section);
}
export function renderBlindGuidance(guidance:BlindGuidance):HTMLElement{
 const host=el('section','','blind-guidance');host.id='blind-guidance';host.dataset.status=guidance.recommendation.status;host.dataset.preferred=guidance.recommendation.preferred??'none';host.dataset.rule=guidance.recommendation.ruleId;
 host.append(el('small','Orientación · heurística'),el('h3',guidance.recommendation.title),el('p',guidance.recommendation.reason));
 if(guidance.tag.profile)host.append(el('p',guidance.tag.name+' · '+guidance.tag.profile.benefit,'blind-tag-benefit'));
 else if(guidance.recommendation.status!=='abstain')host.append(el('p','El beneficio de esta etiqueta sigue sin valorar y podría cambiar el consejo.','muted'));
 const condition=guidance.conditions.find(c=>c.includes('capacidad de superar'));
 if(condition)host.append(el('p',condition,'muted'));
 const detail=el('details');detail.append(el('summary','Motivos y condiciones'));
 for(const [label,items]of [['A favor y contexto',guidance.reasons],['Sacrificios',guidance.sacrifices],['Condiciones',guidance.conditions],['Límites',guidance.limitations]] as const){
  if(!items.length)continue;detail.append(el('h4',label));for(const text of items)detail.append(el('p',text));
 }
 if(guidance.cashflowReference){const ref=guidance.cashflowReference;detail.append(el('h4','Cobro condicionado · sin predecir manos'),el('small',`Ingreso inmediato al saltar: $${ref.skipImmediateIncome}`));for(const row of ref.rows)detail.append(el('small',`${row.handsRemaining} manos sobrantes → cobro $${row.earned} → saldo $${row.balanceAfter}`));for(const text of ref.assumptions)detail.append(el('small',text));}
 host.append(detail);return host;
}
export function renderBlindDecision(report:BlindDecision,state:GameState,guidance?:BlindGuidance):HTMLElement{
 const host=el('div','','blind-comparison');host.id='blind-comparison-result';host.dataset.recommendation=report.recommendation.status;
 const blind=state.observed.nextBlind.status==='known'?state.observed.nextBlind.value:null;
 const tag=state.schemaVersion==='0.2'&&state.phase==='blind_select'&&state.phaseData.skipTag.status==='known'?state.phaseData.skipTag.value:null;
 host.append(el('small',`Revisión ${report.binding.revision} · ${tag?tagDefinition(tag)?.name??tag:'Etiqueta sin registrar'}`));
 const grid=el('div','','blind-choice-grid'),play=el('section'),skip=el('section');play.append(el('h3','Jugar'),el('p',blind?.reward.status==='known'?`Premio registrado: $${blind.reward.value}, si superas la ciega.`:'Premio sin registrar.'),el('small','Conservas la visita a tienda y los efectos de jugar esta ronda. No se inventan ofertas.'));
 const single=report.differences.length===1?report.differences[0]:undefined;
 if(single?.moneyAfterPlay!==null&&single?.moneyAfterPlay!==undefined)play.insertBefore(el('strong',amount(state.observed.money.status==='known'?state.observed.money.value:null)+' → '+amount(single.moneyAfterPlay),'blind-balance'),play.children[1]??null);
 skip.append(el('h3','Saltar'));
 if(report.skip.ok){const s=report.skip.value;skip.append(el('strong',amount(s.moneyBefore)+' → '+amount(s.moneyAfter),'blind-balance'),el('small',`Ingreso inmediato ${amount(s.immediateIncome)} · sin cobro de ronda ni tienda.`));if(s.deferredIncome)skip.append(el('p',`$${s.deferredIncome.dollars} pendientes: ${s.deferredIncome.condition}`));}
 else for(const e of report.skip.errors)skip.append(el('p',e.message,'error'));
 grid.append(play,skip);if(guidance)host.append(renderBlindGuidance(guidance));host.append(grid);
 if(!guidance||report.recommendation.status!=='abstain')host.append(el('p','Comparación calculada: '+report.recommendation.reason,'notice'));
 for(const d of report.differences)if(d.playMinusSkip!==null){const label=report.play?.ok?report.play.value.scenarioConsequences.plans.find(p=>p.id===d.scenarioId)?.description:d.scenarioId;host.append(el('small',`${label??d.scenarioId}: jugar deja ${signed(d.playMinusSkip)} $ frente al saldo inmediato del salto, antes de gastar en tienda.`));}
 route(host,'Ciega actual · planes al jugar',report.play);route(host,'Ciega siguiente · planes después del salto',report.afterSkip);
 for(const e of report.errors)host.append(el('small',e.message,'error'));
 const details=el('details');details.append(el('summary','Sacrificios, cálculos y límites'));for(const s of report.sacrifices)details.append(el('p',s));
 if(report.skip.ok)for(const t of report.skip.trace)details.append(el('small',t.label+': '+Object.entries(t.values).map(([k,v])=>k+'='+v).join(', ')));
 for(const l of report.limitations)details.append(el('p',l));host.append(details,el('small','Proyección · reglas provisionales por inspección del ejecutable. Consultar no registra acciones.'));
 return host;
}
export function blindComparisonButton(options:BlindViewOptions):HTMLButtonElement{
 const button=el('button','Jugar / saltar','secondary');button.id='run-compare-blind';button.type='button';
 button.onclick=()=>{
  const body=el('div','','journey-dialog blind-choice-dialog'),label=el('label'),scope=el('select');scope.id='blind-plan-scope';label.htmlFor=scope.id;label.append(el('span','Jugadas de Análisis · opcional'));
  for(const [id,text]of [['none','Sin jugadas'],['play','Evaluar contra la ciega actual'],['skip','Evaluar contra la siguiente tras saltar']]){const o=el('option',text);o.value=id!;scope.append(o);}label.append(scope);
  const strictLabel=el('label','','check'),strict=el('input');strict.type='checkbox';strict.id='blind-strict';strictLabel.append(strict,el('span','Exigir reglas observadas en partida'));
  const riskLabel=el('label'),risk=el('select');risk.id='blind-risk';riskLabel.htmlFor=risk.id;riskLabel.append(el('span','¿Cómo llegas a esta ciega? · opcional'));
  for(const [id,text]of [['unknown','No lo sé'],['comfortable','La suelo superar'],['tight','Voy justo']]){const o=el('option',text);o.value=id!;risk.append(o);}riskLabel.append(risk);
  const result=el('div'),advanced=el('div','','blind-plan-controls');advanced.append(label,strictLabel);body.append(riskLabel,result,advanced);
  let evaluatedState='';
  const calculate=()=>{result.replaceChildren();try{
   const state=options.state(),stateToken=JSON.stringify(state),scenarios=scope.value==='none'?undefined:options.scenarios();
   if(evaluatedState&&evaluatedState!==stateToken)risk.value='unknown';evaluatedState=stateToken;
   const guidance=guideBlindChoice(state,{requireObserved:strict.checked,risk:risk.value as BlindRisk});
   if(scopesNeedPlan(scope.value)&&!scenarios?.length){result.append(el('p','Añade jugadas en Análisis y declara sus cartas y robos.','error'));return;}
   const report=compareBlindChoices(state,{requireObserved:strict.checked,...(scope.value==='play'?{playScenarios:scenarios!}:scope.value==='skip'?{afterSkipScenarios:scenarios!}:{})});
   if(report.ok)result.append(renderBlindDecision(report.value,state,guidance.ok?guidance.value:undefined));else{if(guidance.ok)result.append(renderBlindGuidance(guidance.value));for(const e of report.errors)result.append(el('p',e.message,'error'));}
  }catch(e){result.append(el('p',e instanceof Error?e.message:'Revisa los datos.','error'));}};
  scope.onchange=calculate;strict.onchange=calculate;risk.onchange=calculate;
  const link=el('a','Editar jugadas en Análisis →');link.href='#evaluation';link.onclick=()=>document.querySelector<HTMLDialogElement>('#confirmation')?.close();body.append(link);
  calculate();options.open('Jugar o saltar',body,'Cerrar',()=>true);
 };
 return button;
}
const scopesNeedPlan=(scope:string)=>scope==='play'||scope==='skip';
