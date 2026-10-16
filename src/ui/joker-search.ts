import {filterCollection} from '../catalog/collection.js';
import type {JokerCollection,JokerReference} from '../catalog/collection.js';
let loading:Promise<JokerReference[]>|undefined;
function catalogue(){return loading??=fetch('./web/assets/jokers/catalog.json').then(async r=>{if(!r.ok)throw Error();const data=await r.json() as JokerCollection;if(data.schemaVersion!==1||data.jokers.length!==150)throw Error();return data.jokers;}).catch(e=>{loading=undefined;throw e;});}
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='')=>{const n=document.createElement(tag);n.textContent=text;return n;};
/** Search is read-only until the user explicitly chooses an implemented effect. */
export function attachJokerSearch(select:HTMLSelectElement){
 const host=el('div');host.className='joker-search-control';
 const label=el('label','Buscar entre los 150 comodines'),input=el('input');input.type='search';input.id=select.id+'-search';input.placeholder='Nombre en español, inglés o efecto';label.htmlFor=input.id;label.append(input);
 const status=el('small','Busca una ficha; los resultados indican si admite cálculo con jugadas.'),results=el('div');status.setAttribute('role','status');results.className='joker-search-results';
 const more=el('button','Mostrar más');more.type='button';more.hidden=true;
 const link=el('a','Ver colección completa');link.href='#collection';
 host.append(label,status,results,more,link);select.closest('label')!.before(host);
 let version=0,limit=8;
 const render=async()=>{
  const revision=++version,query=input.value.trim();results.replaceChildren();more.hidden=true;
  if(!query){status.textContent='Busca una ficha; los resultados indican si admite cálculo con jugadas.';return;}
  status.textContent='Buscando…';
  try{
   const data=await catalogue();if(revision!==version||!host.isConnected)return;
   const matches=filterCollection(data,query);status.textContent=matches.length?`${matches.length} coincidencias · ${matches.filter(j=>j.engineId).length} admiten cálculo con jugadas`:'Sin coincidencias';
   for(const j of matches.slice(0,limit)){
    const row=el('div'),name=el('strong',`${j.names.es} · ${j.names.en}`),description=el('small',j.localization.es.description);row.className='joker-search-result';
    row.append(name,description);
    if(j.engineId&&Array.from(select.options).some(o=>o.value===j.engineId)){
     const choose=el('button','Seleccionar');choose.type='button';choose.setAttribute('aria-label','Seleccionar '+j.names.en);
     choose.onclick=()=>{select.value=j.engineId!;select.dispatchEvent(new Event('change',{bubbles:true}));select.dispatchEvent(new Event('input',{bubbles:true}));input.value='';version++;results.replaceChildren();more.hidden=true;status.textContent=`Seleccionado: ${j.names.es}`;select.focus();};row.append(choose);
    }else row.append(el('span','Solo catálogo · efecto aún sin cálculo'));
    results.append(row);
   }
   more.hidden=matches.length<=limit;
  }catch{if(revision===version)status.textContent='No se pudo cargar el catálogo. Vuelve a escribir para reintentar; el selector sigue disponible.';}
 };
 // Searching doesn't mark the run as edited or invalidate a recommendation.
 input.addEventListener('input',event=>{event.stopPropagation();limit=8;void render();});
 more.onclick=event=>{event.stopPropagation();limit+=8;void render();};
 input.addEventListener('keydown',event=>{if(event.key==='Enter')event.preventDefault();if(event.key==='Escape'){input.value='';void render();}});
}
