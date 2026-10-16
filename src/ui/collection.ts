import {ALL_JOKER_FACTS} from '../catalog/all-joker-facts.js';
import {attachSynergies} from './synergies.js';
import {filterCollection,rarityNames} from '../catalog/collection.js';
import type {JokerCollection,JokerReference} from '../catalog/collection.js';
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',className='')=>{const e=document.createElement(tag);e.textContent=text;e.className=className;return e;};
export function jokerArt(id:string,name=''){
 const art=el('span','','joker-art art-'+id);art.setAttribute('role','img');art.setAttribute('aria-label',name||id);return art;
}
export const engineArt:Record<string,string>=Object.fromEntries(Object.entries(ALL_JOKER_FACTS).map(([id,d])=>[id,d.artId]));
export function mountCollection(){
 const host=document.getElementById('collection-view')!;
 let loaded=false;
 const load=async()=>{
  if(location.hash!=='#collection'||loaded)return;loaded=true;
  host.replaceChildren(el('p','Cargando colección…','muted'));
  try{
   const response=await fetch('./web/assets/jokers/catalog.json');if(!response.ok)throw new Error();
   const data=await response.json() as JokerCollection;
   if(data.schemaVersion!==1||data.jokers.length!==150)throw new Error();
   const tools=el('div','','collection-tools'),searchLabel=el('label','Buscar comodín'),search=el('input');search.id='joker-search';search.type='search';search.placeholder='Nombre o efecto';searchLabel.append(search);
   const rarityLabel=el('label','Rareza'),rarity=el('select');rarity.id='joker-rarity';for(const [value,text] of [['','Todas'],...Object.entries(rarityNames)]){const o=el('option',text);o.value=value!;rarity.append(o);}rarityLabel.append(rarity);
   const supportLabel=el('label','Tipo de ficha'),support=el('select');support.id='joker-support';for(const [value,text] of [['','Todos'],['implemented','Cálculo con jugadas'],['catalog-only','Solo catálogo']]){const o=el('option',text);o.value=value!;support.append(o);}supportLabel.append(support);
   const count=el('span','','tag');count.id='collection-count';count.setAttribute('role','status');
   tools.append(searchLabel,rarityLabel,supportLabel,count);
   const note=el('p',`${data.jokers.length} comodines · ${data.jokers.filter(j=>j.engineId).length} compatibles con cálculo de jugadas. Encaje contextual en la Mesa.`,'muted');
   const grid=el('div','','collection-grid');grid.id='joker-collection';
   const dialog=el('dialog','','joker-detail');dialog.id='joker-detail';
   const show=(j:JokerReference)=>{
    dialog.replaceChildren();const close=el('button','Cerrar','secondary');close.type='button';close.onclick=()=>dialog.close();
    const title=el('h2',j.names.es);title.id='joker-detail-title';dialog.setAttribute('aria-labelledby',title.id);
    const heading=el('div','','section-title');heading.append(title,close);
    const content=el('div','','joker-detail-body'),info=el('div'),badges=el('div','','toolbar');badges.append(el('span',rarityNames[j.rarity],'tag'),el('span',`Precio base $${j.basePrice}`,'tag'));
    info.append(el('p',j.names.en,'muted'),badges,el('p',j.localization.es.description,'effect-description'),el('p',j.engineId?'Puede calcular puntos con jugadas de prueba en Análisis; reglas provisionales.':'Solo catálogo de cálculo exacto · No se confirma su integración de manos.','coverage-status'),el('p','Valora su encaje con tu construcción en la Mesa. Esta colección es de referencia.','quick-rating-status'));
    const flags=el('dl','','joker-properties');for(const [label,value] of [['Blueprint',j.compatibility.blueprint],['Eterno',j.compatibility.eternal],['Perecedero',j.compatibility.perishable],['Desbloqueado inicialmente',j.initiallyUnlocked]] as const){flags.append(el('dt',label),el('dd',value?'Sí':'No'));}info.append(flags);attachSynergies(info,j.id);
    if(!j.initiallyUnlocked){const unlock=el('details');unlock.append(el('summary','Desbloqueo'));for(const line of j.localization.es.unlockTemplate)unlock.append(el('p',line.replace(/\{[^}]*\}/g,'').replace(/#\d+#/g,'[ver condición]')));unlock.append(el('pre',JSON.stringify(j.unlockCondition,null,2)));info.append(unlock);}
    const english=el('details');english.append(el('summary','Texto en inglés'),el('p',j.localization.en.description));info.append(english);
    const technical=el('details');technical.append(el('summary','Datos y procedencia'),el('p','1.0.1o-FULL · Inspección estática; no observación en partida. Los contadores actuales y objetivos variables dependen de la partida. Probabilidades descritas con valor normal 1, sin modificadores. Configuración inicial del juego:'),el('pre',JSON.stringify({id:j.id,config:j.config,poolRestrictions:j.poolRestrictions},null,2)));
    const source=el('a','Fuente de las ilustraciones');source.href='https://github.com/Jofr3/balatro-source/tree/f081d0e41508d9dcc7a01cba5bffcccfbb115af1';source.target='_blank';source.rel='noopener noreferrer';technical.append(source,el('p','Arte y textos: LocalThunk / Playstack.'));info.append(technical);
    content.append(jokerArt(j.id,j.names.es),info);dialog.append(heading,content);dialog.showModal();close.focus();
   };
   const render=()=>{
    const filtered=filterCollection(data.jokers,search.value,rarity.value,support.value);count.textContent=`${filtered.length} / 150`;grid.replaceChildren();
    for(const j of filtered){const button=el('button','','collection-card');button.type='button';button.dataset.joker=j.id;button.dataset.rarity=String(j.rarity);button.setAttribute('aria-label',`${j.names.es} · ${j.names.en}`);button.append(jokerArt(j.id,j.names.es),el('span',j.names.es,'collection-name'),el('small',j.names.en),el('span',`${rarityNames[j.rarity]} · $${j.basePrice}`,'collection-price'),el('span',j.engineId?'Cálculo con jugadas':'Solo catálogo','collection-support'));button.onclick=()=>show(j);grid.append(button);}
    if(!filtered.length)grid.append(el('p','Sin coincidencias.','empty'));
   };
   search.oninput=render;rarity.onchange=render;support.onchange=render;
   const synergyHost=el('div');attachSynergies(synergyHost);host.replaceChildren(tools,note,synergyHost,grid,dialog);render();
  }catch{loaded=false;const retry=el('button','Reintentar');retry.onclick=()=>void load();host.replaceChildren(el('p','No se pudo cargar la colección.','error'),retry);}
 };
 window.addEventListener('hashchange',()=>void load());void load();
}
