import {jokerArt} from './collection.js';
import type {JokerReference} from '../catalog/collection.js';
import type {PreviewRenderer} from './joker-bay.js';
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',cl='')=>{const e=document.createElement(tag);e.textContent=text;e.className=cl;return e;};
// Session-only shortlist. Never stored as shop offers or applied to the real run.
const candidates:{joker:JokerReference;sellId:string}[]=[];
let invalidate=()=>{};let timer:ReturnType<typeof setTimeout>|undefined;
export function invalidateCandidates(){invalidate();}
export function mountCandidates(host:HTMLElement,preview:PreviewRenderer,replacements:()=>{id:string;name:string}[]){
 clearTimeout(timer);host.id='joker-candidates';host.className='candidate-panel';
 host.addEventListener('click',e=>e.stopPropagation());host.addEventListener('input',e=>e.stopPropagation());
 const heading=el('div','','section-title'),title=el('h3','Candidatos'),count=el('small');heading.append(title,count);
 const refresh=el('button','Comparar candidatos');refresh.type='button';
 heading.append(refresh,count);refresh.textContent='Actualizar';heading.title='Índice contextual de cada candidato; no son puntos de una mano.';const grid=el('div','','candidate-grid');host.append(heading,grid,el('small','Índice de encaje · etapa, mazo y sinergias','candidate-legend'));
 const render=(calculate:boolean)=>{if(calculate)clearTimeout(timer);count.textContent=`${candidates.length} / 4`;grid.replaceChildren();refresh.disabled=!candidates.length;
  if(!candidates.length){for(let i=0;i<4;i++){const slot=el('button','','candidate-placeholder');slot.type='button';slot.setAttribute('aria-label',`Buscar candidato ${i+1}`);slot.append(el('span',String(i+1).padStart(2,'0')),el('small','Elegir candidato'));slot.onclick=()=>{const search=document.getElementById('bay-search') as HTMLInputElement;search?.scrollIntoView({block:'center'});search?.focus({preventScroll:true});};grid.append(slot);}return;}
  for(const c of candidates){const card=el('article','','candidate-card');card.dataset.candidate=c.joker.id;
   const hero=el('div','','candidate-hero'),info=el('div','','candidate-info');info.append(el('h4',c.joker.names.es));hero.append(jokerArt(c.joker.id,c.joker.names.es),info);
   const select=el('select');select.setAttribute('aria-label','Reemplazo para '+c.joker.names.es);const empty=el('option','Añadir sin vender');empty.value='';select.append(empty);
   for(const r of replacements()){const o=el('option','Vender '+r.name);o.value=r.id;select.append(o);}if(host.isConnected&&!replacements().some(r=>r.id===c.sellId))c.sellId='';select.value=c.sellId;
   select.onchange=()=>{c.sellId=select.value;render(true);Array.from(grid.querySelectorAll<HTMLElement>('.candidate-card')).find(e=>e.dataset.candidate===c.joker.id)?.querySelector<HTMLDialogElement>('dialog')?.showModal();};
   const remove=el('button','×','candidate-remove');remove.type='button';remove.setAttribute('aria-label','Quitar candidato');remove.title='Quitar candidato';remove.onclick=()=>{candidates.splice(candidates.indexOf(c),1);render(calculate);};
   const result=calculate?preview(c.joker,c.sellId):el('p','Datos cambiados. Pulsa «Comparar candidatos».','candidate-pending');
   card.dataset.previewStatus=calculate?result.dataset.previewStatus??'unavailable':'updating';const scores=Array.from(result.querySelectorAll<HTMLElement>('.bay-score'));
   if(result.dataset.fitLabel){const badge=el('strong',result.dataset.fitLabel,'fit-score '+(result.dataset.fitTone??'unknown'));badge.setAttribute('aria-label','Índice de encaje '+result.dataset.fitLabel);badge.title=result.dataset.fitReason??'';info.append(badge);const reason=el('small',result.dataset.fitReason??'','fit-reason');reason.title=reason.textContent??'';info.append(reason);card.dataset.fitLabel=result.dataset.fitLabel;
   }else if(scores.length){for(const score of scores){const delta=score.dataset.scoreDelta;
     const line=el('div','','candidate-score-line');if(scores.length>1)line.append(el('small',score.dataset.scenario??score.querySelector('strong')?.textContent??'Escenario'));
     if(delta===undefined)line.append(el('small',result.dataset.previewLabel??'Sin resultado','candidate-unavailable'));
     else {const n=Number(delta),badge=el('strong',`${n>0?'▲ +':n<0?'▼ −':'— '}${Math.abs(n).toLocaleString('es')}`,'candidate-delta '+(n>0?'positive':n<0?'negative':'neutral'));
      badge.title=`${score.dataset.before} → ${score.dataset.after} puntos · ${score.dataset.scenario}`;badge.setAttribute('aria-label',`${n>0?'Aumenta':n<0?'Disminuye':'Sin cambio'} ${Math.abs(n)} puntos. Antes ${score.dataset.before}; después ${score.dataset.after}. ${score.dataset.scenario}`);line.append(badge);}
     info.append(line);
   }}else {info.append(el('small',!calculate?'Calculando…':result.dataset.previewLabel??'Sin resultado',!calculate?'candidate-pending':'candidate-unavailable'));}
   const details=el('dialog','','candidate-dialog');details.setAttribute('aria-label',c.joker.names.es);
   const close=el('button','Cerrar','secondary');close.type='button';close.onclick=()=>details.close();
   const head=el('div','','section-title');head.append(el('h2',c.joker.names.es),close);
   const detailHero=el('div','','candidate-detail-hero'),detailArt=el('span','','candidate-detail-art'),detailInfo=el('div');detailArt.append(jokerArt(c.joker.id,c.joker.names.es));detailInfo.append(el('p',c.joker.localization.es.description),el('strong',`Compra · $${c.joker.basePrice}`));detailHero.append(detailArt,detailInfo);
   details.append(head,detailHero,select,result);
   hero.tabIndex=0;hero.setAttribute('role','button');hero.setAttribute('aria-label','Ver '+c.joker.names.es);hero.setAttribute('aria-haspopup','dialog');hero.title=c.joker.names.es;
   const open=()=>{render(true);Array.from(grid.querySelectorAll<HTMLElement>('.candidate-card')).find(e=>e.dataset.candidate===c.joker.id)?.querySelector<HTMLDialogElement>('dialog')?.showModal();};hero.onclick=open;hero.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}};details.addEventListener('close',()=>hero.focus({preventScroll:true}));
   card.append(hero,remove,details);grid.append(card);
  }
 };
 refresh.onclick=()=>render(true);invalidate=()=>{clearTimeout(timer);render(false);timer=setTimeout(()=>render(true),220);};render(false);invalidate();
 return (joker:JokerReference):string|null=>{if(candidates.some(c=>c.joker.id===joker.id))return 'Ese comodín ya está entre los candidatos.';if(candidates.length===4)return 'Máximo 4 candidatos. Quita uno para comparar otro.';candidates.push({joker,sellId:''});render(true);return null;};
}
