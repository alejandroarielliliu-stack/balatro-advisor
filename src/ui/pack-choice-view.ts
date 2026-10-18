import type {GameState} from '../state/model.js';
import type {HandId} from '../catalog/initial.js';
import {PLANET_HANDS} from '../rules/planet.js';
import {comparePackChoices} from '../advisor/pack-choices.js';
import type {PackChoiceOption,PackChoiceReport} from '../advisor/pack-choices.js';
import {consumableLabel} from './consumable-labels.js';

const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',cls='')=>{const node=document.createElement(tag);node.textContent=text;node.className=cls;return node;};
const handNames:Record<HandId,string>={high_card:'Carta alta',pair:'Pareja',two_pair:'Doble pareja',three_kind:'Trío',straight:'Escalera',flush:'Color',full_house:'Full',four_kind:'Póquer',straight_flush:'Escalera de color',five_kind:'Cinco iguales',flush_house:'Flush House',flush_five:'Flush Five'};
const preferences=new Map<string,HandId>();
const number=(n:number)=>n.toFixed(1);
const sign=(n:number)=>n>0?'▲ +'+number(n):n<0?'▼ '+number(n):'◆ 0.0';

/** Read-only presentation of H2 projections and the advisor's separate policy.
 * A declared hand is session-only evaluation context, never a recorded fact. */
export function mountPackComparison(host:HTMLElement,state:GameState){
 const panel=el('section','','pack-comparison');panel.id='pack-comparison';panel.setAttribute('aria-label','Comparación de opciones visibles');
 const heading=el('div','','pack-comparison-heading'),title=el('h3','Qué elegir'),status=el('p','','pack-choice-status');status.id='pack-choice-status';status.setAttribute('aria-live','polite');
 heading.append(title);panel.append(heading,el('small','Encaje heurístico · próxima elección','muted'),status);host.append(panel);
 const details=el('details','','pack-comparison-details'),body=el('div');details.append(el('summary','Criterios y límites'),body);panel.append(details);
 const entryHosts=new Map<string,HTMLElement>();let report:PackChoiceReport|null=null;
 let intendedHand=preferences.get(state.runId);
 if(state.schemaVersion==='0.2'&&state.phase==='open_pack'&&state.phaseData.context?.catalogId.startsWith('celestial-')){
  const label=el('label','Mano que buscas'),select=el('select');select.id='pack-intended-hand';select.setAttribute('aria-label','Mano que buscas');
  const empty=el('option','Sin preferencia');empty.value='';select.append(empty);
  for(const id of Object.values(PLANET_HANDS)){const option=el('option',handNames[id]);option.value=id;select.append(option);}
  select.value=intendedHand??'';label.append(select);heading.append(label);
  select.onchange=()=>{intendedHand=select.value?select.value as HandId:undefined;if(intendedHand)preferences.set(state.runId,intendedHand);else preferences.delete(state.runId);refresh();};
 }
 const entry=(id:string,target:HTMLElement)=>{
  target.replaceChildren();const option=report?.options.find(o=>o.id==='entry:'+id);if(!option)return;
  const score=el('div','','pack-choice-rating');score.dataset.packRating=id;target.append(score);
  if(option.handChanges.length){
   for(const change of option.handChanges){const b=change.before,a=change.after;if(b.status==='known'&&a.status==='known')score.append(el('span',`${handNames[change.handId]} · ${b.value.chips} × ${b.value.mult} → ${a.value.chips} × ${a.value.mult}`));}
  }else if(option.composition){
   const c=option.composition,b=c.before.global.value,a=c.after.global.value;
   score.textContent=b!==null&&a!==null?`Composición ${number(b)} → ${number(a)}`:'Composición: datos incompletos';
   if(c.globalDelta!==null){score.append(el('strong',sign(c.globalDelta),c.globalDelta>0?'positive':c.globalDelta<0?'negative':'neutral'));}
  }else score.textContent=option.projection.ok?'Sin cambio de composición calculado':'Sin cálculo';
  if(option.fit?.readiness==='unavailable'){
   score.dataset.readiness='unavailable';const reason=option.fit.axes.find(a=>a.key==='readiness')?.reason;target.append(el('small',reason??'Sin soporte actual en la composición registrada.','pack-choice-warning'));
  }
  const why=el('details','','pack-choice-reasons');why.dataset.packCompareEntry=id;why.append(el('summary','Ver comparación'));
  if(option.fit){const fit=option.fit;why.append(el('p',`Encaje del comodín: ${fit.score===null?'sin datos suficientes':number(fit.score)}. Índice heurístico; no son fichas.`));for(const axis of fit.axes)why.append(el('small',axis.reason));for(const signal of fit.signals)why.append(el('small',signal.text));}
  if(option.composition){
   const bars=el('div','','pack-choice-bars');for(const section of option.composition.sections.filter(s=>option.fit||s.delta!==null&&s.delta!==0)){const row=el('div');row.append(el('span',section.label),el('strong',section.before===null||section.after===null?'—':`${number(section.before)} → ${number(section.after)}`));bars.append(row);}if(bars.childElementCount)why.append(bars);
  }
  for(const text of option.errors.map(e=>e.message))why.append(el('small',text,'error'));
  for(const text of option.limitations)why.append(el('small',text));
  why.append(el('small','Los cambios de bases no son la puntuación de una mano. No se simulan robos ni se estima supervivencia.'));
  target.append(why);
 };
 const explain=(next:PackChoiceReport)=>{
  const r=next.recommendation,names=r.optionIds.map(id=>consumableLabel(next.options.find(o=>o.id===id)?.label??id)).join(' / ');
  status.dataset.kind=r.kind;status.textContent=r.kind==='conditional'?`${names} · preferencia condicional`:r.kind==='tie'?`Empate${names?': '+names:''}`:r.kind==='tradeoff'?'Hay ventajas distintas; no hay una opción dominante.':'Sin recomendación concluyente.';
  body.replaceChildren();for(const reason of r.reasons)body.append(el('p',reason));
  for(const option of next.options.filter(o=>!o.projection.ok))body.append(el('small',`${consumableLabel(option.label)}: ${option.errors.map(e=>e.message).join(' ')}`));
  const skip=next.options.find(o=>o.id==='skip');if(skip)appendSkip(body,skip);
  for(const limitation of next.limitations)body.append(el('small',limitation));
 };
 const refresh=()=>{
  const result=comparePackChoices(state,intendedHand?{intendedHand}:{});
  body.replaceChildren();report=result.ok?result.value:null;
  if(report)explain(report);else{status.dataset.kind='abstain';status.textContent='Sin comparación disponible.';for(const error of result.ok?[]:result.errors)body.append(el('small',error.message));}
  for(const [id,target]of entryHosts)entry(id,target);
 };
 refresh();
 return {addEntry(id:string,target:HTMLElement){entryHosts.set(id,target);entry(id,target);}};
}

function appendSkip(host:HTMLElement,option:PackChoiceOption){
 host.append(el('b','Si omites lo restante'));
 if(!option.projection.ok){for(const error of option.errors)host.append(el('small',error.message));return;}
 const changes=option.consequences;if(changes){host.append(el('small','El precio pagado no se devuelve.'));for(const c of changes.counters){const b=c.before,a=c.after;if(b?.status==='known'&&a?.status==='known')host.append(el('small',`${c.catalogId} · ${c.key}: ${b.value} → ${a.value}`));}}
 if(option.composition){const {before,after}=option.composition;if(before.global.value!==null&&after.global.value!==null)host.append(el('small',`Composición ${number(before.global.value)} → ${number(after.global.value)}`));}
}
