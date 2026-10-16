import {relatedSynergies} from '../catalog/synergies.js';
import type {SynergyLibrary} from '../catalog/synergies.js';
import {normalizeSearch} from '../catalog/collection.js';
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',className='')=>{const e=document.createElement(tag);e.textContent=text;e.className=className;return e;};
let pending:Promise<SynergyLibrary>|undefined;
const load=()=>pending??=fetch('./web/assets/jokers/synergies.json').then(async r=>{if(!r.ok)throw new Error();const data=await r.json() as SynergyLibrary;if(data.schemaVersion!==1||data.gameVersion!=='1.0.1o-FULL'||!Array.isArray(data.synergies))throw new Error();return data;}).catch(e=>{pending=undefined;throw e;});
export function attachSynergies(host:HTMLElement,jokerId?:string){
 const group=el('details','','synergy-library'),summary=el('summary',jokerId?'Sinergias y conflictos':'Sinergias y mazo');group.append(summary);host.append(group);
 void load().then(library=>{
  const entries=jokerId?relatedSynergies(library,jokerId):library.synergies;
  summary.textContent=`${jokerId?'Sinergias y conflictos':'Sinergias y mazo'} · ${entries.length}`;
  group.append(el('p','Referencia documental · no evaluada para tu partida.','muted'));
  const results=el('div');
  const render=(query='')=>{results.replaceChildren();const found=entries.filter(s=>normalizeSearch(JSON.stringify([s.title,s.mechanism,s.conditions,s.risks])).includes(normalizeSearch(query.trim())));
   for(const s of found){const item=el('details','','synergy-entry');item.dataset.synergy=s.id;item.append(el('summary',s.title));item.append(el('span',s.kind==='synergy'?'Sinergia':s.kind==='conflict'?'Conflicto':'No se activa así','tag'),el('p',s.mechanism));
    const zoneNames={'held':'En mano al puntuar','held-end-round':'En mano al cerrar ronda','scoring':'Cartas que puntúan','played':'Cartas jugadas','full-deck':'Mazo completo'};
    if(s.deckRequirements.length)item.append(el('p',s.deckRequirements.map(d=>zoneNames[d.zone]).join(' · '),'synergy-zone'));
    const conditions=el('ul');s.conditions.forEach(c=>conditions.append(el('li',c)));item.append(conditions);
    if(!s.order.startsWith('Sin requisito'))item.append(el('p',s.order));
    const risks=el('ul','','synergy-risks');s.risks.forEach(c=>risks.append(el('li',c)));item.append(risks);
    const evidence=el('details');evidence.append(el('summary','Caso mínimo y evidencia'),el('p',s.example.setup),el('p',s.example.expected),el('small',s.example.basis),el('p',s.evidenceStatus==='static-supported'?'Sustento por inspección estática; pendiente observar en juego.':'Composición provisional de efectos documentados; interacción pendiente de validar.'));
    for(const id of s.sourceIds){const source=library.sources[id]!;if(source.url){const link=el('a',id);link.href=source.url;link.target='_blank';link.rel='noopener noreferrer';evidence.append(link,el('br'));}else evidence.append(el('small',`${id}: ${source.path}`),el('br'));if(source.note)evidence.append(el('p',source.note,'muted'));}item.append(evidence);results.append(item);
   }
   if(!found.length)results.append(el('p',entries.length?'Sin coincidencias.':'Todavía no hay relaciones documentadas para este comodín.','muted'));
  };
  if(!jokerId){const label=el('label','Buscar combinación o condición'),input=el('input');input.type='search';input.id='synergy-search';input.placeholder='Acero, Mimo, descarte…';input.oninput=()=>render(input.value);label.append(input);group.append(label);}
  group.append(results);render();
 }).catch(()=>{const retry=el('button','Reintentar');retry.onclick=()=>{group.remove();attachSynergies(host,jokerId);};group.append(el('p','No se pudieron cargar las sinergias.','error'),retry);});
}
