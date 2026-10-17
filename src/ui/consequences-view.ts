import type {ImmediateConsequences,ScenarioConsequences} from '../advisor/consequences.js';
import type {ShopAction} from '../rules/shop.js';
import {ALL_JOKER_FACTS} from '../catalog/all-joker-facts.js';
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',cl='')=>{const e=document.createElement(tag);e.textContent=text;e.className=cl;return e;};
const signed=(n:number|null)=>n===null?'?':n>0?'+'+n:String(n);
const name=(id:string)=>ALL_JOKER_FACTS[id]?.name??id;
export function renderImmediateConsequences(c:ImmediateConsequences):HTMLElement{
 const host=el('div','','immediate-consequences');host.append(el('small',`H2 · dinero ${c.money.before??'?'} → ${c.money.after??'?'} (${signed(c.money.delta)} $)`));
 if(c.freeJokerSlots.delta!==0)host.append(el('small',`Huecos libres ${c.freeJokerSlots.before??'?'} → ${c.freeJokerSlots.after??'?'}`));
 const labels={handsPerRound:'Manos',discardsPerRound:'Descartes',handSize:'Tamaño de mano',jokerSlots:'Espacios'};
 for(const r of c.resources)if(r.change.delta!==0)host.append(el('small',`${labels[r.field]} ${r.change.before??'?'} → ${r.change.after??'?'}`));
 for(const j of c.removed)host.append(el('small','Pierdes '+name(j.catalogId)+(Object.keys(j.counters).length?' · '+Object.entries(j.counters).map(([key,f])=>key+'='+ (f.status==='known'?f.value:'?')).join(', '):'')+'. No se heredan sus contadores.'));
 return host;
}
export function renderScenarioConsequences(report:ScenarioConsequences,title:(action:ShopAction)=>string):HTMLElement{
 const host=el('section','','scenario-consequences');host.id='store-scenario-results';
 if(report.status==='not_assessed'){host.append(el('small','Supervivencia sin evaluar · no hay planes comparados.'));return host;}
 host.append(el('h3','Comparación con tus planes'),el('small','Planes fijos · comodines y conservar · no predice robos.'));
 if(report.recommendation){const r=report.recommendation;host.append(el('p',r.status==='conditional'&&r.action?'Preferencia en estos planes: '+title(r.action):r.status==='tie'?'Empate o compromiso entre estos planes.':'Sin recomendación concluyente en estos planes.'));}
 for(const error of report.errors)host.append(el('p',error.message,'error'));
 for(const plan of report.plans){host.append(el('h4',plan.description));const wrap=el('div','','table-wrap'),table=el('table'),head=el('thead'),row=el('tr');for(const label of ['Opción','Objetivo','Puntos','Manos / descartes','Δ$ tienda'])row.append(el('th',label));head.append(row);table.append(head);const body=el('tbody');
  for(const a of report.alternatives)for(const s of a.outcomes.filter(s=>s.scenarioId===plan.id)){const tr=el('tr');tr.dataset.scenarioAction=a.id;tr.dataset.scenarioOutcome=s.status;for(const text of [title(a.action),{reached:'Alcanzado',not_reached:'Plan insuficiente',incompatible:'Plan incompatible',unavailable:'Sin cálculo'}[s.status],s.metrics?String(s.metrics.score):'—',s.metrics?`${s.metrics.handsUsed} / ${s.metrics.discardsUsed}`:'—',signed(s.versusHold.moneyAfterShopDelta)])tr.append(el('td',text));body.append(tr);}
  table.append(body);wrap.append(table);host.append(wrap);
 }
 for(const a of report.alternatives){const details=el('details');details.append(el('summary',title(a.action)+(a.sensitiveToScenario?' · cambia según el plan':'')));
  for(const s of a.outcomes){const label=report.plans.find(p=>p.id===s.scenarioId)?.description??s.scenarioId;details.append(el('p',label+': '+(s.versusHold.scoreComparison==='same_resources'?'Δ puntos '+signed(s.versusHold.scoreDelta):s.versusHold.scoreComparison==='different_resources'?'Sin Δ de puntos: consume recursos distintos.':'Sin comparación completa con conservar.')+' · Δ$ tras cobro '+signed(s.versusHold.moneyAfterRoundDelta)));
   for(const c of s.counters)details.append(el('small',`${name(c.catalogId)} · ${c.key}: ${c.before?.status==='known'?c.before.value:'?'} → ${c.after?.status==='known'?c.after.value:'?'} (solo este escenario)`));for(const e of s.errors)details.append(el('p',e.message,'error'));for(const text of s.limitations)details.append(el('small',text));
  }for(const j of a.sacrificed)details.append(el('p','Se pierde '+name(j.catalogId)+' y sus contadores.'));host.append(details);
 }host.append(el('small','Un plan insuficiente no demuestra derrota; pueden quedar otras jugadas. No estima victoria hasta ante 8.'));return host;
}
