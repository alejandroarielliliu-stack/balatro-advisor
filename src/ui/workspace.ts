import {mountCandidates} from './storefront.js';
import type {ShopContext} from './storefront.js';
import {attachJokerDrag} from './joker-drag.js';
import {mountJokerBay} from './joker-bay.js';
import type {PreviewRenderer,AddJoker,OwnedSale} from './joker-bay.js';
import {attachJokerSearch} from './joker-search.js';
import type {Card} from '../catalog/initial.js';
import {contextRatings} from '../advisor/ratings.js';
/** Presentation only. Moving existing nodes preserves their listeners and form ownership. */
import {jokerArt,engineArt} from './collection.js';
import type {Advice} from '../advisor/advisor.js';
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',className='')=>{const e=document.createElement(tag);e.textContent=text;e.className=className;return e;};
export function mountWorkspace(){
 const screens={collection:['150 COMODINES · 1.0.1o','Colección'],table:['ENCAJE EN VIVO','Mesa'],evaluation:['MANOS Y ESCENARIOS','Análisis'],archive:['PARTIDA REGISTRADA','Registro y copias']} as const;
 const show=()=>{const hash=location.hash.slice(1);const screen=Object.hasOwn(screens,hash)?hash as keyof typeof screens:'table';
  document.querySelectorAll<HTMLElement>('[data-page]').forEach(e=>e.hidden=e.dataset.page!==screen);
  document.querySelectorAll<HTMLElement>('[data-screen]').forEach(e=>{if(e.dataset.screen===screen)e.setAttribute('aria-current','page');else e.removeAttribute('aria-current');});
  document.getElementById('view-kicker')!.textContent=screens[screen][0];document.getElementById('view-title')!.textContent=screens[screen][1];
  const next=document.getElementById('next-view') as HTMLAnchorElement;next.hidden=screen==='archive'||screen==='collection';next.href=screen==='table'?'#evaluation':'#table';next.textContent=screen==='table'?'Calcular manos →':'← Volver a la mesa';next.onclick=null;
 };
 window.addEventListener('hashchange',()=>{show();document.getElementById('main')!.focus({preventScroll:true});window.scrollTo(0,0);});show();
}
export function organizeRecord(host:HTMLElement,_existing=false,preview?:PreviewRenderer,replacements:()=>{id:string;name:string}[]=()=>[],addJoker?:AddJoker,vouchers?:HTMLElement,composition?:HTMLElement,ownedSale?:OwnedSale,shopContext?:ShopContext){
 const fs=host.querySelector('fieldset');if(!fs)return;
 const children=Array.from(fs.children);const headings=children.filter(e=>e.tagName==='H3');const ownedTitle=headings[0],shopTitle=headings[1];if(!ownedTitle||!shopTitle)return;
 const ownedIndex=children.indexOf(ownedTitle),shopIndex=children.indexOf(shopTitle);
 const layout=el('div','','record-layout'),context=el('div','','blind-panel'),board=el('div','','board'),owned=el('div','','inventory-panel'),shop=el('div','','shop-panel'),save=el('div','','save-bar');
 const heading=el('div','','section-title');heading.append(el('h2','Partida'),el('span','White Stake','tag'));context.append(heading);
 // Main inputs first; compatibility and unknown-value help follow, not before the task.
 const base=children.slice(0,ownedIndex),grid=base.find(e=>e.classList.contains('grid')),resources=base.find(e=>e.tagName==='DETAILS');
 if(grid){context.append(grid);const deckEditor=grid.querySelector('#deck-editor'),deckConditions=grid.querySelector('#deck-conditions');if(deckEditor)context.append(deckEditor);if(deckConditions)context.append(deckConditions);}
 if(resources)context.append(resources);
 const coverage=base.find(e=>e.querySelector('#coverage'));
 const meta=el('details','','coverage-note');meta.append(el('summary','Cobertura para cálculos exactos'));if(coverage)meta.append(coverage);base.filter(e=>e!==grid&&e!==resources&&e!==coverage).forEach(e=>meta.append(e));context.append(meta);
 const exact=el('details','','hand-calculation-data'),exactBody=el('div');exact.append(el('summary','Ciega y cobro · cálculo de manos'),exactBody);grid?.querySelectorAll(':scope > .target-control, :scope > #cashout-preview, :scope > label:has(#boss)').forEach(control=>exactBody.append(control));context.append(exact);
 children.slice(ownedIndex,shopIndex).forEach(e=>owned.append(e));
 const remaining=children.slice(shopIndex);const saveStart=remaining.findIndex(e=>e.hasAttribute('data-save-control'));
 remaining.slice(0,saveStart).forEach(e=>shop.append(e));remaining.slice(saveStart).forEach(e=>save.append(e));
 ownedTitle.textContent='Tus comodines';shopTitle.textContent='En la tienda';
 const ownedList=owned.querySelector('div:not(.check)');ownedList?.classList.add('joker-shelf');
 const shopList=shop.querySelector('div:not(.check)');shopList?.classList.add('joker-shelf','offer-shelf');
 const advanced=el('details','','registered-offers');advanced.append(el('summary','Ofertas registradas · avanzado'),shop);shopTitle.textContent='Ofertas registradas';context.append(advanced);
 const candidates=el('section');
 let catalogue:HTMLElement|undefined;
 if(preview&&addJoker){const addCandidate=mountCandidates(candidates,preview,replacements,shopContext);mountJokerBay(owned,preview,replacements,addJoker,addCandidate,ownedSale);
  catalogue=el('section','','catalogue-dock');catalogue.id='catalogue-dock';const title=el('div','','section-title');title.append(el('h2','Buscar comodines'),el('span','150 cartas','tag'));catalogue.append(title,owned.querySelector('.joker-bay')!);
  const tools=el('div','','inventory-tools'),jump=el('button','＋ Buscar','secondary');jump.type='button';jump.onclick=e=>{e.stopPropagation();catalogue!.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});catalogue!.querySelector<HTMLInputElement>('#bay-search')?.focus({preventScroll:true});};tools.append(jump);owned.prepend(tools);
 }
 const settings=el('section','','run-settings'),settingsGrid=el('div','','run-settings-grid');settings.append(el('h2','Recursos y condiciones'),settingsGrid);context.querySelectorAll(':scope > details:not(#deck-editor)').forEach(d=>settingsGrid.append(d));
 // On a phone the player can fold the inputs to keep the actual table in view.
 // Values come from the existing inputs; this summary never computes or persists.
 const hudInputs=el('div','','hud-inputs');hudInputs.id='run-inputs';Array.from(context.children).filter(e=>e!==heading).forEach(e=>hudInputs.append(e));
 const hudSummary=el('div','','hud-summary');hudSummary.hidden=true;const fold=el('button','Reducir','secondary hud-fold-toggle');fold.type='button';fold.setAttribute('aria-controls',hudInputs.id);fold.setAttribute('aria-expanded','true');fold.setAttribute('aria-label','Reducir datos de la partida');
 const sync=()=>{hudSummary.replaceChildren();for(const [id,label] of [['money','Dinero'],['ante','Ante'],['target','Objetivo']]){const value=(document.getElementById(id!) as HTMLInputElement)?.value,cell=el('div','','hud-mini '+id);cell.append(el('small',label),el('b',value?`${id==='money'?'$':''}${Number(value).toLocaleString('es')}`:'—'));hudSummary.append(cell);}};
 fold.onclick=e=>{e.stopPropagation();const compact=!hudInputs.hidden;hudInputs.hidden=compact;hudSummary.hidden=!compact;fold.textContent=compact?'Editar':'Reducir';fold.setAttribute('aria-expanded',String(!compact));fold.setAttribute('aria-label',compact?'Editar datos de la partida':'Reducir datos de la partida');sync();};heading.append(fold);context.append(hudSummary,hudInputs);context.addEventListener('input',sync);context.addEventListener('change',sync);sync();
 matchMedia('(max-width:720px)').addEventListener('change',e=>{if(!e.matches&&hudInputs.hidden)fold.click();});
 save.prepend(el('small','Guardar conserva esta transcripción y su historial. La valoración de la Mesa no necesita guardado.'));board.append(owned);if(composition)board.append(composition);board.append(candidates);if(vouchers)board.append(vouchers);if(catalogue)board.append(catalogue);board.append(settings);layout.append(context,board);fs.replaceChildren(layout);
 save.querySelectorAll('input,select,textarea,button').forEach(control=>control.setAttribute('form','run-form'));document.getElementById('record-save')?.append(save);
}
const faces:Record<string,[string,string,string]>={joker:['✦','Mult','coral'],half_joker:['½','Manos pequeñas','coral'],abstract_joker:['▧','Inventario','violet'],even_steven:['8','Pares','blue'],scholar:['A','Ases','blue'],banner:['⚑','Descartes','blue'],green_joker:['↗','Crecimiento','green'],golden_joker:['$','Economía','gold']};
export function decorateJoker(row:HTMLElement,select:HTMLSelectElement,offer=false,collapsed=false){
 attachJokerSearch(select);
 row.classList.add('joker-editor');const portrait=el('div','','joker-portrait');portrait.setAttribute('role','button');portrait.tabIndex=0;portrait.setAttribute('aria-label','Ver comodín');const inspect=()=>{if(offer)settings.open=!settings.open;else {row.parentElement?.querySelectorAll('.joker-editor').forEach(r=>{r.classList.toggle('selected-joker',r===row);r.querySelector('.joker-portrait')?.setAttribute('aria-pressed',String(r===row));});row.dispatchEvent(new CustomEvent('inspect-joker',{bubbles:true,detail:{id:select.value,instanceId:row.dataset.instanceId}}));}};portrait.onclick=inspect;portrait.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();inspect();}};
 const settings=el('details','','card-settings'),summary=el('summary');settings.open=offer&&!collapsed;settings.addEventListener('toggle',()=>{if(settings.open)row.closest('.inventory-panel,.shop-panel')?.querySelectorAll<HTMLDetailsElement>('.card-settings[open]').forEach(d=>{if(d!==settings)d.open=false;});});
 const controls=Array.from(row.children),drawer=offer?el('div','','joker-edit-drawer'):el('dialog','','joker-edit-drawer');drawer.append(...controls);const close=el('button','Cerrar edición','secondary');close.type='button';close.onclick=e=>{e.stopPropagation();settings.open=false;};drawer.prepend(close);settings.append(summary,drawer);row.replaceChildren(portrait,settings);
 if(drawer instanceof HTMLDialogElement){drawer.setAttribute('aria-label','Editar comodín registrado');settings.addEventListener('toggle',()=>{if(settings.open&&!drawer.open)drawer.showModal();else if(!settings.open&&drawer.open)drawer.close();});drawer.addEventListener('cancel',()=>{settings.open=false;});drawer.addEventListener('close',()=>{settings.open=false;summary.focus();});}
 const update=()=>{const tone=faces[select.value]?.[2]??'gray';row.dataset.tone=tone;portrait.classList.add('real-art');portrait.replaceChildren(jokerArt(engineArt[select.value]??'j_joker',select.selectedOptions[0]?.textContent??''));portrait.setAttribute('aria-label',`Ver ${select.selectedOptions[0]?.textContent??'comodín'}`);
  const price=row.querySelector<HTMLInputElement>('input[id^="price-"],input[id^="sell-"]');summary.replaceChildren(el('span',select.selectedOptions[0]?.textContent??'Comodín'),el('small',`${offer?'Compra':'Venta'} $${price?.value||'?'}`));
 };
 select.addEventListener('change',update);row.addEventListener('input',update);update();if(!offer){portrait.setAttribute('aria-pressed','false');attachJokerDrag(row,portrait);}
}
/** Card previews reflect the input verbatim; legality remains the engine's responsibility. */
export function attachCardPreview(input:HTMLInputElement,host:HTMLElement,resolveCards?:()=>Card[]){
 const preview=el('div','','hand-preview');host.append(preview);
 const render=()=>{preview.replaceChildren();for(const [i,id] of input.value.trim().split(/[\s,]+/).filter(Boolean).entries()){
  const found=resolveCards?.().find(c=>c.instanceId===id);const match=found?['',found.rank,found.suit]:resolveCards?null:/^(10|[2-9JQKA])([SHDC])$/.exec(id),suit=match?.[2]??'',symbol=({S:'♠',H:'♥',D:'♦',C:'♣'} as Record<string,string>)[suit];
  const card=el('button','','playing-card');card.type='button';card.classList.toggle('red-suit',suit==='H'||suit==='D');card.setAttribute('aria-label',`Quitar carta ${id}, posición ${i+1}`);card.title=`Quitar ${id}`;
  card.append(el('span',match?.[1]??id),el('b',symbol??'?'));card.onclick=()=>{const ids=input.value.trim().split(/[\s,]+/).filter(Boolean);ids.splice(i,1);input.value=ids.join(' ');input.dispatchEvent(new Event('input',{bubbles:true}));};preview.append(card);
 }};input.addEventListener('input',render);render();
}

/** A view of existing metrics, not a new ranking or weighted score. */
export function comparisonOverview(advice:Advice,label:(id:string)=>string,onSelect:(id:string,reveal:boolean)=>void){
 const ratings=contextRatings(advice);
 const host=el('div','','comparison-overview'),controls=el('div','','comparison-controls');
 const scenarioLabel=el('label','Escenario mostrado'),select=el('select');select.id='comparison-scenario';
 for(const s of advice.scenarios){const option=el('option',s.plan.description);option.value=s.plan.planId;select.append(option);}scenarioLabel.append(select);controls.append(scenarioLabel,el('span','Prioridad estratégica · encaje 0–10','muted'));host.append(controls);
 const table=el('table');table.setAttribute('aria-label','Comparación por escenario');const caption=el('caption','Encaje heurístico, no probabilidad. La prioridad de superar la ciega prevalece sobre la nota. Saldos y cobro con reglas provisionales.');table.append(caption);
 const head=el('thead'),header=el('tr');for(const text of ['Alternativa','Objetivo','Puntos','Tras tienda','Tras cobro','Manos / desc.']){const th=el('th',text);th.scope='col';header.append(th);}head.append(header);table.append(head);const body=el('tbody');table.append(body);host.append(table);
 const fmt=(n:number|null|undefined)=>n==null?'—':new Intl.NumberFormat('es').format(n);
 const render=()=>{body.replaceChildren();for(const id of advice.orderedAlternativeIds){const a=advice.alternatives.find(a=>a.id===id)!,s=a.scenarios.find(s=>s.scenarioId===select.value),m=s?.metrics,c=s?.calculation;
  const row=el('tr');row.dataset.tier=String(a.tier??'');const name=el('th');name.scope='row';const b=el('button',label(id),'compare-action');b.type='button';b.dataset.alternative=id;b.setAttribute('aria-label','Ver '+label(id));b.setAttribute('aria-pressed','false');b.onclick=e=>{host.querySelectorAll('[aria-pressed]').forEach(e=>e.setAttribute('aria-pressed',String(e===b)));onSelect(id,e.isTrusted);};name.append(b);const rating=ratings.find(r=>r.alternativeId===id),selected=rating?.scenarios.find(r=>r.scenarioId===select.value);const info=el('details','','fit-rating');const interval=rating?.range;info.append(el('summary',selected?.value==null?'Encaje: sin evaluar':`Encaje ${selected.value}/10${interval&&interval[0]!==interval[1]?` · rango ${interval[0]}–${interval[1]}`:''}`));info.append(el('p',selected?.reason??'Sin escenario comparable.'));for(const axis of selected?.axes??[])info.append(el('p',`${axis.label} ${axis.value}/2 · ${axis.reason}`));if(selected?.scoreDelta!=null)info.append(el('p',`Diferencia de puntos frente a conservar: ${selected.scoreDelta>0?'+':''}${fmt(selected.scoreDelta)} en este plan.`));else info.append(el('p','Diferencia de puntos no comparable: distinto consumo o datos incompletos.'));name.append(info);row.append(name);
  const cells=[m?m.reached?'Alcanzado':'No alcanza':'Sin evaluar',fmt(m?.score),c?.moneyAfterShop==null?'—':'$'+fmt(c.moneyAfterShop),c?.moneyAfterRound==null?'—':'$'+fmt(c.moneyAfterRound),m?`${m.handsUsed} / ${m.discardsUsed}`:'—'];
  cells.forEach((text,i)=>{const td=el('td',text);td.dataset.label=['Objetivo','Puntos','Tras tienda','Tras cobro','Manos / desc.'][i];if(i===0)td.className=m?.reached?'goal-met':'goal-missed';row.append(td);});body.append(row);
 }};select.onchange=()=>{render();const first=body.querySelector<HTMLButtonElement>('button');first?.click();};render();return host;
}

export function fillJokerSlots(host:HTMLElement,capacity:number){
 host.querySelectorAll('.empty-slot').forEach(e=>e.remove());const rows=Array.from(host.querySelectorAll('.joker-editor')),count=rows.length;
 rows.forEach((row,i)=>{const left=row.querySelector<HTMLButtonElement>('[aria-label="Mover comodín a la izquierda"]'),right=row.querySelector<HTMLButtonElement>('[aria-label="Mover comodín a la derecha"]');if(left)left.disabled=i===0;if(right)right.disabled=i===count-1;});
 host.dataset.capacity=`${count} / ${capacity}`;host.setAttribute('aria-label',`Comodines: ${count} de ${capacity}. Orden de izquierda a derecha.`);
}
