import {ALL_JOKER_FACTS} from '../catalog/all-joker-facts.js';
import {attachSynergies} from './synergies.js';
import {filterCollection,rarityNames} from '../catalog/collection.js';
import type {JokerCollection,JokerReference} from '../catalog/collection.js';
import {BOSS_CATALOG} from '../catalog/bosses.js';
import {implementedBossEffects} from '../catalog/blinds.js';
import {collectionArt,COLLECTION_TAROT,COLLECTION_PLANETS,COLLECTION_SPECTRAL,COLLECTION_BOOSTERS,COLLECTION_ENHANCEMENTS,COLLECTION_SEALS,COLLECTION_EDITIONS,COLLECTION_DECKS,COLLECTION_VOUCHERS,COLLECTION_TAGS,COLLECTION_BLINDS} from './collection-data.js';
import type {CollectionEntry} from './collection-data.js';
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',className='')=>{const e=document.createElement(tag);e.textContent=text;e.className=className;return e;};
export function jokerArt(id:string,name=''){
 const art=el('span','','joker-art art-'+id);art.setAttribute('role','img');art.setAttribute('aria-label',name||id);return art;
}
export const engineArt:Record<string,string>=Object.fromEntries(Object.entries(ALL_JOKER_FACTS).map(([id,d])=>[id,d.artId]));
type Category='joker'|'deck'|'voucher'|'tarot'|'planet'|'spectral'|'enhancement'|'seal'|'edition'|'pack'|'tag'|'blind';
const names:Record<Category,string>={joker:'Comodines',deck:'Barajas',voucher:'Vales',tarot:'Cartas de tarot',planet:'Cartas de planeta',spectral:'Cartas espectrales',enhancement:'Cartas mejoradas',seal:'Sellos',edition:'Ediciones',pack:'Paquetes',tag:'Etiquetas',blind:'Ciegas'};
const catalogues:Record<Exclude<Category,'joker'>,readonly CollectionEntry[]>={deck:COLLECTION_DECKS,voucher:COLLECTION_VOUCHERS,tarot:COLLECTION_TAROT,planet:COLLECTION_PLANETS,spectral:COLLECTION_SPECTRAL,enhancement:COLLECTION_ENHANCEMENTS,seal:COLLECTION_SEALS,edition:COLLECTION_EDITIONS,pack:COLLECTION_BOOSTERS,tag:COLLECTION_TAGS,blind:COLLECTION_BLINDS};
const pageSizes:Partial<Record<Category,number>>={joker:15,tarot:11,spectral:9,voucher:8,pack:8,deck:1};
/** Read-only reference browser. Categories/pages are local UI state, never run data. */
export function mountCollection(){
 const host=document.getElementById('collection-view') as HTMLDialogElement;
 const stage=el('div','','collection-stage'),panel=el('section','','collection-panel'),note=el('p','','collection-note');panel.tabIndex=-1;stage.append(panel,note);
 const jokerDialog=el('dialog','','joker-detail collection-detail');jokerDialog.id='joker-detail';
 const itemDialog=el('dialog','','collection-detail');itemDialog.id='collection-detail';
 const bossDialog=el('dialog','','collection-detail boss-catalogue-dialog');bossDialog.id='boss-catalogue-detail';
 host.className='collection-overlay';host.setAttribute('aria-label','Colección');host.replaceChildren(stage,jokerDialog,itemDialog,bossDialog);
 let data:JokerCollection|null=null,pending:Promise<void>|null=null,category:Category|null=null,page=0,returnCategory:Category='joker';
 let detailTrigger:HTMLElement|null=null;
 for(const dialog of [jokerDialog,itemDialog,bossDialog])dialog.addEventListener('close',()=>{if(host.open&&detailTrigger?.isConnected)detailTrigger.focus({preventScroll:true});});
 const resize=()=>{const frame=document.getElementById('app-viewport');if(frame)stage.style.setProperty('--collection-scale',String(Math.min(frame.clientWidth/1280,frame.clientHeight/600)));};
 window.addEventListener('resize',resize);if(typeof ResizeObserver!=='undefined')new ResizeObserver(resize).observe(document.getElementById('app-viewport')!);
 const button=(text:string,className:string,action:()=>void)=>{const b=el('button',text,className);b.type='button';b.onclick=action;return b;};
 const finishDetail=(dialog:HTMLDialogElement,title:string,art:HTMLElement,info:HTMLElement,trigger:HTMLElement)=>{
  detailTrigger=trigger;const close=button('Volver','collection-detail-back',()=>dialog.close()),heading=el('div','','section-title');const h=el('h2',title);h.id=dialog.id+'-title';heading.append(h,close);dialog.setAttribute('aria-labelledby',h.id);
  const body=el('div','','joker-detail-body');body.append(art,info);dialog.replaceChildren(heading,body);dialog.showModal();close.focus({preventScroll:true});
 };
 const showJoker=(j:JokerReference,trigger:HTMLElement)=>{
  const info=el('div'),badges=el('div','','toolbar');badges.append(el('span',rarityNames[j.rarity],'tag'),el('span',`Precio base $${j.basePrice}`,'tag'));
  info.append(el('p',j.names.en,'muted'),badges,el('p',j.localization.es.description,'effect-description'),el('p',j.engineId?'Puede calcular puntos con jugadas de prueba en Análisis; reglas provisionales.':'Solo catálogo de cálculo exacto · No se confirma su integración de manos.','coverage-status'),el('p','Valora su encaje con tu construcción en la Mesa. Esta colección es de referencia.','quick-rating-status'));
  const flags=el('dl','','joker-properties');for(const [label,value] of [['Blueprint',j.compatibility.blueprint],['Eterno',j.compatibility.eternal],['Perecedero',j.compatibility.perishable],['Desbloqueado inicialmente',j.initiallyUnlocked]] as const)flags.append(el('dt',label),el('dd',value?'Sí':'No'));info.append(flags);attachSynergies(info,j.id);
  if(!j.initiallyUnlocked){const unlock=el('details');unlock.append(el('summary','Desbloqueo'));for(const line of j.localization.es.unlockTemplate)unlock.append(el('p',line.replace(/\{[^}]*\}/g,'').replace(/#\d+#/g,'[ver condición]')));unlock.append(el('pre',JSON.stringify(j.unlockCondition,null,2)));info.append(unlock);}
  const english=el('details');english.append(el('summary','Texto en inglés'),el('p',j.localization.en.description));info.append(english);
  const technical=el('details');technical.append(el('summary','Datos y procedencia'),el('p','1.0.1o-FULL · Inspección estática; no observación en partida. Los contadores actuales y objetivos variables dependen de la partida. Probabilidades con valor normal 1.'),el('pre',JSON.stringify({id:j.id,config:j.config,poolRestrictions:j.poolRestrictions},null,2)));
  const source=el('a','Fuente de las ilustraciones');source.href='https://github.com/Jofr3/balatro-source/tree/f081d0e41508d9dcc7a01cba5bffcccfbb115af1';source.target='_blank';source.rel='noopener noreferrer';technical.append(source,el('p','Arte y textos: LocalThunk / Playstack.'));info.append(technical);finishDetail(jokerDialog,j.names.es,jokerArt(j.id,j.names.es),info,trigger);
 };
 const showItem=(entry:CollectionEntry,trigger:HTMLElement)=>{
  const boss=BOSS_CATALOG.find(b=>b.id===entry.id||b.artId===entry.id),info=el('div');info.append(el('p',entry.nameEn,'muted'),el('p',entry.description,'effect-description'));if(entry.meta)info.append(el('p',entry.meta));
  if(boss)info.append(el('strong',`Objetivo ×${boss.multiplier} · premio base $${boss.reward}`),el('p',boss.showdown?'Jefe final del ante 8.':`Puede aparecer desde el ante ${boss.minAnte}.`));
  const source=el('details');source.append(el('summary','Datos y procedencia'),el('p','1.0.1o-FULL · Catálogo de referencia por inspección estática del juego. Consultar esta ficha no ejecuta su efecto ni modifica la partida.'));
  if(boss)source.append(el('p',implementedBossEffects(boss.id)?'Efecto disponible dentro del alcance actual del motor.':'Objetivo y premio disponibles; su efecto sobre las manos todavía está fuera del motor.'));
  if(entry.descriptionEn)source.append(el('p',entry.descriptionEn));source.append(el('small','Arte y textos: LocalThunk / Playstack.'));info.append(source);finishDetail(boss?bossDialog:itemDialog,entry.name,collectionArt(entry),info,trigger);
 };
 const backButton=()=>{const b=button('Volver','collection-back',()=>back());b.id='collection-back';return b;};
 const categoryButton=(id:Category)=>{
  const total=id==='joker'?150:catalogues[id].length,b=button('','collection-category tone-'+id,()=>{
   returnCategory=id;
   if(id==='joker'&&!data){b.disabled=true;b.setAttribute('aria-busy','true');b.querySelector('span')!.textContent='Cargando…';void load().then(()=>{if(host.open&&b.isConnected)renderCategory(id);}).catch(()=>{}).finally(()=>{b.disabled=false;b.removeAttribute('aria-busy');b.querySelector('span')!.textContent=names[id];});return;}
   renderCategory(id);
  });b.dataset.collectionCategory=id;b.setAttribute('aria-label',`${names[id]} · ${total} fichas`);b.append(el('span',names[id],'collection-category-name'));
  if(id!=='enhancement'&&id!=='seal')b.append(el('small',String(total),'collection-category-count'));return b;
 };
 function renderHome(focus=true){
  category=null;page=0;host.setAttribute('aria-label','Colección');panel.dataset.category='home';panel.setAttribute('aria-label','Categorías de la colección');note.hidden=true;
  const home=el('div','','collection-home'),left=el('div','','collection-column'),right=el('div','','collection-column'),consumables=el('div','','collection-consumables');
  left.append(categoryButton('joker'),categoryButton('deck'),categoryButton('voucher'));consumables.append(el('span','CONSUMIBLES','collection-consumables-label'),categoryButton('tarot'),categoryButton('planet'),categoryButton('spectral'));left.append(consumables);
  for(const id of ['enhancement','seal','edition','pack','tag','blind'] as const)right.append(categoryButton(id));home.append(left,right);panel.replaceChildren(home,backButton());
  if(focus)panel.querySelector<HTMLElement>(`[data-collection-category="${returnCategory}"]`)?.focus({preventScroll:true});
 }
 function back(){if(category)renderHome();else location.hash='menu';}
 function renderCategory(id:Category){
  category=id;page=0;panel.dataset.category=id;panel.setAttribute('aria-label',names[id]);host.setAttribute('aria-label','Colección · '+names[id]);note.hidden=!['enhancement','seal','edition'].includes(id);note.textContent='Cada carta puede tener una mejora, una edición y un sello.';
  const well=el('div','','collection-well'),grid=el('div','','collection-grid');grid.id='collection-grid';well.append(grid);
  const pagination=el('div','','collection-pagination'),prev=button('‹','collection-arrow',()=>turn(-1)),next=button('›','collection-arrow',()=>turn(1)),label=el('span','','collection-page');prev.id='collection-prev';next.id='collection-next';prev.setAttribute('aria-label',id==='deck'?'Baraja anterior':'Página anterior');next.setAttribute('aria-label',id==='deck'?'Baraja siguiente':'Página siguiente');label.id='collection-page';label.setAttribute('role','status');pagination.append(prev,label,next);
  let filtered=data?.jokers??[];
  const size=pageSizes[id]??100,total=()=>id==='joker'?filtered.length:catalogues[id as Exclude<Category,'joker'>].length;
  const draw=()=>{
   const pages=Math.max(1,Math.ceil(total()/size));page=((page%pages)+pages)%pages;grid.replaceChildren();panel.dataset.collectionPage=String(page+1);panel.dataset.collectionPages=String(pages);label.textContent=`Página ${page+1}/${pages}`;
   pagination.hidden=id==='deck'||pages<=1;grid.dataset.category=id;
   if(id==='joker'){
    for(const j of filtered.slice(page*size,(page+1)*size)){const b=button('','collection-item collection-card',()=>showJoker(j,b));b.dataset.collectionItem=j.id;b.dataset.joker=j.id;b.dataset.rarity=String(j.rarity);b.setAttribute('aria-label',`${j.names.es} · ${j.names.en}`);b.title=j.names.es;const art=el('span','','collection-item-art');art.append(jokerArt(j.id,j.names.es));b.append(art);grid.append(b);}
    if(!filtered.length)grid.append(el('p','Sin coincidencias.','empty'));
   }else if(id==='deck'){
    const entry=COLLECTION_DECKS[page]!;const content=el('div','','collection-deck-content'),copy=el('div','','collection-deck-copy'),dots=el('div','','collection-deck-dots');content.dataset.collectionItem=entry.id;copy.append(el('h2',entry.name),el('p',entry.description));content.append(collectionArt(entry),copy);grid.append(content);for(const [i,deck] of COLLECTION_DECKS.entries()){const dot=el('span');dot.setAttribute('aria-label',deck.name);if(i===page)dot.setAttribute('aria-current','true');dots.append(dot);}panel.querySelector('.collection-deck-dots')?.remove();panel.append(dots);
   }else{
    for(const entry of catalogues[id].slice(page*size,(page+1)*size)){const b=button('','collection-item collection-card',()=>showItem(entry,b));b.dataset.collectionItem=entry.id;b.setAttribute('aria-label',`${entry.name} · ${entry.nameEn}`);b.title=entry.name;
     if(id==='blind'){const boss=BOSS_CATALOG.find(item=>item.id===entry.id||item.artId===entry.id);if(boss){b.dataset.bossCatalogId=boss.id;b.classList.add('boss-catalogue-card');}}
     const art=el('span','','collection-item-art');art.append(collectionArt(entry));b.append(art);grid.append(b);
    }
   }
  };
  function turn(delta:number){page+=delta;draw();}
  panel.replaceChildren(well,pagination,backButton());
  if(id==='deck'){well.className='collection-deck-carousel';well.replaceChildren(prev,grid,next);}
  if(id==='joker'){
   const filters=el('details','','collection-filters');filters.id='collection-filters';filters.append(el('summary','Buscar'));
   const tools=el('div','','collection-filter-controls'),searchLabel=el('label','Buscar comodín'),search=el('input');search.id='joker-search';search.type='search';search.placeholder='Nombre o efecto';searchLabel.append(search);
   const rarityLabel=el('label','Rareza'),rarity=el('select');rarity.id='joker-rarity';for(const [value,text] of [['','Todas'],...Object.entries(rarityNames)]){const option=el('option',text);option.value=value!;rarity.append(option);}rarityLabel.append(rarity);
   const supportLabel=el('label','Tipo de ficha'),support=el('select');support.id='joker-support';for(const [value,text] of [['','Todos'],['implemented','Cálculo con jugadas'],['catalog-only','Solo catálogo']]){const option=el('option',text);option.value=value!;support.append(option);}supportLabel.append(support);
   const count=el('span','','collection-filter-count');count.id='collection-count';count.setAttribute('role','status');count.textContent='150 / 150';tools.append(searchLabel,rarityLabel,supportLabel,count,el('small','Colección de referencia · sin puntuación de encaje.'));
   const synergies=el('div');attachSynergies(synergies);tools.append(synergies);filters.append(tools);panel.append(filters);
   const filter=()=>{filtered=filterCollection(data?.jokers??[],search.value,rarity.value,support.value);count.textContent=`${filtered.length} / 150`;page=0;draw();};search.oninput=filter;rarity.onchange=filter;support.onchange=filter;
  }
  if(id==='blind'){
   const table=el('table','','collection-blind-table');table.setAttribute('aria-label','Base de las ciegas por ante');const header=el('tr');header.append(el('th','ANTE'),el('th','BASE'));const head=el('thead'),body=el('tbody');head.append(header);
   // Rounded reference values shown in the collection; no extension to run rules.
   for(const [i,base] of ['300','800','2.000','5.000','11.000','20.000','35.000','50.000','110.000','560.000','7.200.000','300.000.000','47.000.000.000','2,900e13','7,700e16','8,600e20'].entries()){const row=el('tr');row.append(el('td',String(i+1)),el('td',base));body.append(row);}table.append(head,body);well.prepend(table);
  }
  draw();panel.querySelector<HTMLElement>('[data-collection-item] button,button.collection-item')?.focus({preventScroll:true});
  if(id==='deck')prev.focus({preventScroll:true});
 }
 const load=async()=>{
  if(data)return;if(pending)return pending;
  pending=(async()=>{const response=await fetch('./web/assets/jokers/catalog.json');if(!response.ok)throw Error('catalog');const parsed=await response.json() as JokerCollection;if(parsed.schemaVersion!==1||parsed.jokers.length!==150)throw Error('catalog');data=parsed;})().finally(()=>{pending=null;});return pending;
 };
 const sync=()=>{
  if(location.hash!=='#collection'){for(const dialog of [jokerDialog,itemDialog,bossDialog])if(dialog.open)dialog.close();if(host.open)host.close();return;}
  host.hidden=false;resize();if(!host.open){renderHome(false);host.showModal();panel.querySelector<HTMLElement>('[data-collection-category]')?.focus({preventScroll:true});}
  void load().then(()=>{if(host.open&&category==='joker'&&!panel.querySelector('[data-joker]'))renderCategory('joker');else if(host.open&&panel.querySelector(':scope > .error'))renderHome();}).catch(()=>{if(!host.open)return;category=null;panel.dataset.category='home';const retry=button('Reintentar','collection-category',()=>sync());panel.replaceChildren(el('p','No se pudo cargar la colección.','error'),retry,backButton());retry.focus();});
 };
 host.addEventListener('cancel',event=>{event.preventDefault();back();});
 host.addEventListener('close',()=>{if(location.hash==='#collection')location.hash='menu';else if(location.hash==='#menu')document.getElementById('menu-collection')?.focus({preventScroll:true});});
 window.addEventListener('hashchange',sync);sync();
}
