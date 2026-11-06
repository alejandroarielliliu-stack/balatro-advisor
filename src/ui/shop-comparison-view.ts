import type {ShopAlternative,ShopAlternativesReport} from '../advisor/shop-alternatives.js';
import {describeShopOption} from './shop-advice-summary.js';
import {renderImmediateConsequences} from './consequences-view.js';
import {ALL_JOKER_FACTS} from '../catalog/all-joker-facts.js';

const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',className='')=>{const e=document.createElement(tag);e.textContent=text;e.className=className;return e;};
const dollars=(n:number|null)=>n===null?'—':`$${n}`;
const statuses={available:'Calculado',provisional:'Reglas provisionales',missing_data:'Faltan datos',pending_evidence:'Falta evidencia',illegal:'No disponible',unsupported:'Sin cálculo',invalid:'Datos inválidos'} as const;
const name=(id:string)=>ALL_JOKER_FACTS[id]?.name??id;
const removed=(a:ShopAlternative)=>a.removed.map(j=>{
 const counters=Object.entries(j.counters).map(([key,f])=>`${key}: ${f.status==='known'?f.value:'?'}`);
 return name(j.catalogId)+(counters.length?` (${counters.join(', ')})`:'');
}).join('; ');
function changes(a:ShopAlternative):string {
 if(a.kind==='hold')return 'Mantienes tu dinero y tus comodines.';
 if(a.errors.length)return a.errors.map(e=>e.message).join(' ');
 const description=describeShopOption(a.contextOption,{...a,optionId:a.offerId??a.id});
 const parts=[description.benefit];
 if(a.removed.length)parts.push('Sale '+removed(a)+'.');
 if(a.kind==='sell'&&a.consequences?.freeJokerSlots.delta!==null&&a.consequences?.freeJokerSlots.delta!==undefined)parts.push(`Espacios libres: ${a.consequences.freeJokerSlots.after??'?'}.`);
 if(!parts.some(Boolean)&&a.kind==='buy_pack')parts.push('Contenido del sobre todavía desconocido.');
 return parts.filter(Boolean).join(' ')||a.contextOption?.reasons[0]||'Consulta el efecto y las condiciones.';
}

/** Read-only view. All transaction facts come from H2/DEC03, never from the DOM. */
export function mountShopComparison(host:HTMLElement,onConfirm:(alternative:ShopAlternative,source:ShopAlternativesReport)=>string|null,onControlsChanged:()=>void=()=>{}){
 host.id='shop-comparison';host.className='shop-comparison';host.setAttribute('aria-labelledby','shop-comparison-title');host.tabIndex=-1;
 const header=el('div','','comparison-heading'),title=el('h3','Comparar opciones'),count=el('small');title.id='shop-comparison-title';header.append(title,count);
 const filters=el('div','','comparison-filters');filters.setAttribute('role','group');filters.setAttribute('aria-label','Tipos de alternativas');
 const list=el('div','','comparison-list'),scope=el('small','','comparison-scope'),dialog=el('dialog','','comparison-dialog');dialog.id='shop-alternative-dialog';dialog.setAttribute('aria-labelledby','shop-alternative-title');
 host.append(header,filters,list,scope,dialog);
 let report:ShopAlternativesReport|null=null,filter='all',selected:ShopAlternative|null=null,source:ShopAlternativesReport|null=null;
 const group=(a:ShopAlternative)=>a.kind==='buy_voucher'||a.kind==='buy_pack'?'extras':a.kind;
 const restore=()=>{const button=Array.from(list.querySelectorAll<HTMLButtonElement>('[data-alternative]')).find(b=>b.dataset.alternative===selected?.id);(button??host).focus({preventScroll:true});};dialog.addEventListener('close',restore);
 const inspect=(a:ShopAlternative)=>{
  selected=a;source=report;dialog.replaceChildren();
  const head=el('div','','section-title'),heading=el('h2',a.title),close=el('button','Cerrar','secondary');heading.id='shop-alternative-title';close.type='button';close.onclick=()=>dialog.close();head.append(heading,close);dialog.append(head);
  const money=el('p',`Dinero: ${dollars(a.moneyBefore)} → ${dollars(a.moneyAfter)}`,'comparison-money');dialog.append(money,el('p',statuses[a.status]));
  if(a.consequences)dialog.append(renderImmediateConsequences(a.consequences));
  const description=describeShopOption(a.contextOption,{...a,optionId:a.offerId??a.id});
  if(description.benefit)dialog.append(el('p',description.benefit));if(description.sacrifice)dialog.append(el('p',description.sacrifice));
  for(const text of a.contextOption?.reasons??[])dialog.append(el('p',text));
  for(const e of a.errors)dialog.append(el('p',e.message,'error'));
  const limits=el('details');limits.append(el('summary','Condiciones y cobertura'));for(const text of [...a.limitations,...(a.contextOption?.limitations??[])])limits.append(el('p',text));dialog.append(limits);
  const error=el('p','','error');error.id='shop-alternative-error';error.setAttribute('role','status');dialog.append(error);
  if(a.kind!=='hold'){
   const confirm=el('button','Registrar lo que hice');confirm.type='button';confirm.id='shop-alternative-confirm';confirm.dataset.write='';confirm.dataset.localDisabled=String(a.confirmation!=='explicit_confirmation_required');confirm.disabled=a.confirmation!=='explicit_confirmation_required';
   confirm.onclick=()=>{if(!source)return;const problem=onConfirm(a,source);if(problem)error.textContent=problem;else dialog.close();};dialog.append(confirm,el('small','Solo si ya realizaste esta acción en Balatro.'));
  }
  dialog.showModal();close.focus();onControlsChanged();
 };
 const draw=()=>{
  const alternatives=report?.alternatives??[];
  if(filter!=='all'&&!alternatives.some(a=>group(a)===filter))filter='all';
  count.textContent=report?`${alternatives.length} alternativas`:'Sin cálculo';filters.replaceChildren();list.replaceChildren();
  for(const [id,text]of [['all','Todas'],['buy','Compras'],['sell','Ventas'],['replace','Reemplazos'],['extras','Vales y sobres']]){
   const size=id==='all'?alternatives.length:alternatives.filter(a=>group(a)===id).length;if(id!=='all'&&!size)continue;
   const b=el('button',`${text} · ${size}`,'secondary');b.type='button';b.dataset.alternativeFilter=id;b.setAttribute('aria-pressed',String(filter===id));b.onclick=()=>{filter=id!;draw();filters.querySelector<HTMLButtonElement>(`[data-alternative-filter="${id}"]`)?.focus({preventScroll:true});};filters.append(b);
  }
  const headings=el('div','','comparison-columns');headings.setAttribute('aria-hidden','true');headings.append(el('span','Acción'),el('span','Coste neto'),el('span','Saldo'),el('span','Qué cambia'));list.append(headings);
  for(const a of alternatives.filter(a=>a.kind==='hold'||filter==='all'||group(a)===filter)){
   const row=el('div','','comparison-row');row.dataset.alternativeId=a.id;row.dataset.actionKind=a.kind;row.dataset.operationStatus=a.status;
   const action=el('button',a.title,'comparison-action');action.type='button';action.dataset.alternative=a.id;action.setAttribute('aria-haspopup','dialog');action.onclick=()=>inspect(a);
   const money=el('span',a.netCost===null?'—':a.netCost<0?`+$${Math.abs(a.netCost)}`:dollars(a.netCost),'comparison-cost');money.setAttribute('aria-label',a.netCost!==null&&a.netCost<0?'Ingreso '+dollars(Math.abs(a.netCost)):'Coste neto '+dollars(a.netCost));
   money.dataset.flow=a.netCost!==null&&a.netCost<0?'income':'cost';
   const after=el('strong',dollars(a.moneyAfter),'comparison-after'),detail=el('span','','comparison-change');detail.append(el('span',changes(a)),el('small',statuses[a.status]));row.append(action,money,after,detail);list.append(row);
  }
  if(report){
   for(const id of report.coverage.excludedOfferIds){const option=report.baseDecision.context.options.find(o=>o.id===id),pending=el('p',(option?.title??id)+' · Sin acción compatible; su valor permanece pendiente.','comparison-pending');list.append(pending);}
   const noPriority=alternatives.some(a=>a.kind==='sell'||a.kind==='replace');
   scope.textContent=`Acciones individuales; ${noPriority?'ventas y variantes sin orden estratégico adicional. ':'sin secuencias de varias compras. '}${report.coverage.completeSingleActionSet?'':report.coverage.knownInventory?'Hay ofertas fuera de cobertura. ':'Inventario desconocido: cobertura parcial. '}Las cifras son consecuencias de tienda, no puntuaciones de manos.`;
  }
 };
 return {render(next:ShopAlternativesReport|null,error?:string){report=next;draw();if(!next){scope.textContent=error??'Completa los datos de la partida para comparar.';}if(dialog.open&&source!==next){const confirm=dialog.querySelector<HTMLButtonElement>('#shop-alternative-confirm');if(confirm){confirm.disabled=true;confirm.dataset.localDisabled='true';}const warning=dialog.querySelector('#shop-alternative-error');if(warning)warning.textContent='La partida o las ofertas cambiaron. Cierra y vuelve a comparar.';}},focus(){host.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});host.focus({preventScroll:true});}};
}
