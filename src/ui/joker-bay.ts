import {jokerArt} from './collection.js';
import {filterCollection,rarityNames} from '../catalog/collection.js';
import type {JokerCollection,JokerReference} from '../catalog/collection.js';
import type {Fact} from '../state/model.js';
import {FIT_PROFILES} from '../advisor/fit-profiles.js';
import {ALL_JOKER_FACTS} from '../catalog/all-joker-facts.js';
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',cl='')=>{const n=document.createElement(tag);n.textContent=text;n.className=cl;return n;};
export type PreviewRenderer=(joker:JokerReference,sellId:string,ownedId?:string,offer?:{price:Fact<number>;edition:Fact<string>;stickers:Fact<string[]>})=>HTMLElement;
export type AddJoker=(joker:JokerReference)=>string|null;
export interface OwnedSale {describe:(id:string)=>{price:number|null;blocked?:string};sell:(id:string)=>string|null;edit:(id:string)=>void}
export function mountJokerBay(panel:HTMLElement,preview:PreviewRenderer,replacements:()=>{id:string;name:string}[],addJoker:AddJoker,addCandidate:AddJoker,ownedSale?:OwnedSale){
 const host=el('section','','joker-bay');host.setAttribute('aria-label','Explorar comodines');
 // Browsing and inspecting never mark the real-state form dirty.
 host.addEventListener('click',e=>e.stopPropagation());host.addEventListener('input',e=>e.stopPropagation());
 const toolbar=el('div','','bay-toolbar'),label=el('label','Buscar comodín'),search=el('input');search.type='search';search.id='bay-search';search.placeholder='Nombre o efecto';label.htmlFor=search.id;label.append(search);
 toolbar.append(label);
 const selectedRarities=new Set<number>(),selectedPrices=new Set<number>();
 const filters=el('div','','bay-filters');
 const makeFilters=(label:string,values:[number,string][],selected:Set<number>,kind:string)=>{
  const group=el('div','','bay-filter-group');group.setAttribute('role','group');group.setAttribute('aria-label',label);group.append(el('small',label));
  for(const [value,name] of values){const b=el('button',name,'bay-filter-chip');b.type='button';b.dataset.filterKind=kind;b.dataset.filterValue=String(value);b.setAttribute('aria-pressed','false');b.onclick=()=>{if(selected.has(value))selected.delete(value);else selected.add(value);b.setAttribute('aria-pressed',String(selected.has(value)));render();};group.append(b);}return group;
 };
 filters.append(makeFilters('Rareza',Object.entries(rarityNames).map(([id,name])=>[Number(id),name]),selectedRarities,'rarity'));
 const count=el('small','Cargando…'),grid=el('div','','bay-grid');grid.id='bay-grid';count.setAttribute('role','status');host.append(toolbar,filters,count,grid);
 const dialog=el('dialog','','bay-dialog');dialog.id='bay-dialog';dialog.setAttribute('aria-labelledby','bay-title');host.append(dialog);panel.append(host);
 let entries:JokerReference[]=[];
 const show=(j:JokerReference,ownedId?:string)=>{
  dialog.replaceChildren();const head=el('div','','bay-detail-heading'),title=el('h2',j.names.es);title.id='bay-title';const close=el('button','Cerrar','secondary');close.type='button';close.onclick=()=>dialog.close();head.append(title);
  if(ownedId&&ownedSale){const edit=el('button','Editar','secondary');edit.type='button';edit.id='bay-edit';edit.onclick=()=>{dialog.close();ownedSale.edit(ownedId);};head.append(edit);}
  head.append(close);
  const hero=el('div','','bay-detail-hero'),info=el('div');info.append(el('small',j.names.en),el('p',j.localization.es.description),el('span',FIT_PROFILES[j.id]?'Encaje contextual':'Solo catálogo','tag'));hero.append(jokerArt(j.id,j.names.es),info);
  const add=el('button','Añadir a mis comodines','bay-add');add.type='button';add.id='bay-add';add.disabled=!FIT_PROFILES[j.id];
  const addNote=el('small',FIT_PROFILES[j.id]?'Se añade a tu vista y actualiza el encaje.':'No se puede añadir: falta el perfil.');addNote.id='bay-add-note';addNote.setAttribute('role','status');add.setAttribute('aria-describedby',addNote.id);
  add.onclick=()=>{const error=addJoker(j);if(error){addNote.textContent=error;return;}dialog.close();panel.querySelector<HTMLElement>('.joker-editor:last-of-type .joker-portrait')?.focus();};
  if(ownedId&&ownedSale){
   const sale=ownedSale.describe(ownedId);add.id='bay-sell';add.textContent=`Vendí · $${sale.price??'?'}`;add.disabled=!!sale.blocked;
   addNote.textContent=sale.blocked??'Registra la venta que realizaste. Se guardará al confirmar.';
   add.onclick=()=>{const error=ownedSale.sell(ownedId);if(error){addNote.textContent=error;return;}dialog.close();panel.querySelector<HTMLElement>('.joker-portrait')?.focus();};
  }
  const addSection=el('div','','bay-add-section');addSection.append(add,addNote);
  const compare=el('button','Poner en tienda');compare.type='button';compare.id='bay-candidate';const candidateNote=el('small');candidateNote.setAttribute('role','status');candidateNote.id='candidate-note';compare.onclick=()=>{const error=addCandidate(j);if(error){candidateNote.textContent=error;return;}dialog.close();document.getElementById('joker-candidates')?.scrollIntoView({block:'start'});};addSection.append(compare,candidateNote);
  const controls=el('div','','bay-preview-controls'),replacement=el('select');replacement.setAttribute('aria-label','Comodín que reemplazarías');const keep=el('option','Añadir sin vender');keep.value='';replacement.append(keep);for(const r of replacements()){const o=el('option','Vender '+r.name);o.value=r.id;replacement.append(o);}
  controls.append(el('strong',ownedId?'Comodín poseído':`Compra hipotética · $${j.basePrice}`),replacement);replacement.hidden=!!ownedId;
  const result=el('div','','bay-preview');result.id='bay-preview';const render=()=>result.replaceChildren(preview(j,replacement.value,ownedId));replacement.onchange=render;
  const link=el('a','Calcular manos →');link.href='#evaluation';link.onclick=()=>dialog.close();
  dialog.append(head,hero,addSection,controls,result,link);render();dialog.showModal();close.focus();
 };
 const render=()=>{const matches=filterCollection(entries,search.value).filter(j=>(!selectedRarities.size||selectedRarities.has(j.rarity))&&(!selectedPrices.size||selectedPrices.has(j.basePrice)));count.textContent=`${matches.length} comodines · pulsa una carta`;grid.replaceChildren();for(const j of matches){const b=el('button','','bay-mini');b.type='button';b.dataset.bayJoker=j.id;b.setAttribute('aria-label',j.names.es+' · '+j.names.en);b.title=j.names.es;b.append(jokerArt(j.id,j.names.es));if(j.engineId)b.classList.add('calculable');b.onclick=()=>show(j);grid.append(b);}if(!matches.length)grid.append(el('p','Sin coincidencias.'));};
 search.oninput=render;search.onkeydown=e=>{if(e.key==='Enter')e.preventDefault();};
 panel.addEventListener('inspect-joker',e=>{const detail=(e as CustomEvent<string|{id:string;instanceId?:string}>).detail,id=typeof detail==='string'?detail:detail.id,j=entries.find(j=>j.engineId===id||j.id===ALL_JOKER_FACTS[id]?.artId);if(j)show(j,typeof detail==='string'?undefined:detail.instanceId);});
 void fetch('./web/assets/jokers/catalog.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then((d:JokerCollection)=>{if(d.jokers.length!==150)throw Error();entries=d.jokers;filters.append(makeFilters('Precio base',[...new Set(entries.map(j=>j.basePrice))].sort((a,b)=>a-b).map(p=>[p,'$'+p]),selectedPrices,'price'));render();}).catch(()=>{count.textContent='No se pudo cargar la galería. Recarga para reintentar.';});
}
