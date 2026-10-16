import {jokerArt} from './collection.js';
import type {JokerReference} from '../catalog/collection.js';
import type {PreviewRenderer} from './joker-bay.js';
import type {GameState} from '../state/model.js';
import {VOUCHER_CATALOG} from '../catalog/voucher-catalog.js';
import {BOOSTER_CATALOG} from '../catalog/booster-catalog.js';
import {evaluateShopContext} from '../advisor/shop-context.js';
import type {ShopSnapshot} from '../advisor/shop-context.js';

const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',cl='')=>{const e=document.createElement(tag);e.textContent=text;e.className=cl;return e;};
const known=<T>(value:T)=>({status:'known' as const,source:'manual' as const,value});
const priceValue=(input:HTMLInputElement)=>input.value.trim()===''?null:Number(input.value);
export interface ShopContext {state:()=>GameState;ante:()=>number;changed?:()=>void}
interface ListedJoker {joker:JokerReference;offerId:string;sellId:string;price:number|null;edition:string;stickers:string[]}
// Observed shelf transcription for this session, distinct from the stored run.
const candidates:ListedJoker[]=[],voucherOffers:ShopSnapshot['vouchers']=[],packOffers:ShopSnapshot['packs']=[],otherOffers:NonNullable<ShopSnapshot['others']>=[];
let rerollCost:number|null=null,binding:string|undefined;
export const readShopSnapshot=():ShopSnapshot=>({id:'mesa-shop',jokers:candidates.map(c=>({offerId:c.offerId,catalogId:c.joker.engineId??c.joker.id,price:c.price,edition:c.edition,stickers:[...c.stickers],...(c.sellId?{replacementId:c.sellId}:{})})),vouchers:structuredClone(voucherOffers),packs:structuredClone(packOffers),others:structuredClone(otherOffers),rerollCost});
let invalidate=()=>{};let timer:ReturnType<typeof setTimeout>|undefined;
export function invalidateCandidates(){invalidate();}
export function mountCandidates(host:HTMLElement,preview:PreviewRenderer,replacements:()=>{id:string;name:string}[],context?:ShopContext){
 clearTimeout(timer);host.id='joker-candidates';host.className='candidate-panel storefront';
 host.addEventListener('click',e=>e.stopPropagation());host.addEventListener('input',e=>e.stopPropagation());
 // A price edit must never submit the real-state form through implicit Enter.
 host.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target instanceof HTMLInputElement)e.preventDefault();});
 const changed=()=>context?.changed?.();
 try{const id=context?.state().runId;if(binding&&id&&binding!==id){candidates.length=0;voucherOffers.length=0;packOffers.length=0;otherOffers.length=0;rerollCost=null;}binding=id;}catch{ /* Data errors remain visible in the advice. */ }
 const heading=el('div','','section-title');heading.append(el('h2','Tienda'));
 const search=el('button','Buscar comodín','store-search');search.type='button';search.id='store-joker-add';search.onclick=()=>{const input=document.getElementById('bay-search') as HTMLInputElement;input?.scrollIntoView({block:'center',behavior:'smooth'});input?.focus({preventScroll:true});};
 const suggestion=el('button','Registra las ofertas','shop-recommendation');suggestion.type='button';suggestion.id='shop-recommendation';suggestion.setAttribute('aria-haspopup','dialog');
 const layout=el('div','','store-layout'),controls=el('div','','store-controls'),cards=el('div','','store-card-well');controls.append(search,suggestion);
 const grid=el('div','','candidate-grid'),otherShelf=el('div','','store-other-shelf'),extras=el('div','','store-extras');cards.append(grid,otherShelf);layout.append(controls,cards,extras);
 const adviceDialog=el('dialog','','shop-advice-dialog');adviceDialog.id='shop-advice-dialog';adviceDialog.setAttribute('aria-label','Decisión de tienda');
 const editor=el('dialog','','store-item-editor');editor.id='store-item-editor';editor.setAttribute('aria-label','Registrar oferta');
 host.append(heading,layout,adviceDialog,editor);
 let report:ReturnType<typeof evaluateShopContext>|null=null;
 const snapshot=readShopSnapshot;
 const renderAdvice=()=>{
  adviceDialog.replaceChildren();const close=el('button','Cerrar','secondary');close.type='button';close.onclick=()=>adviceDialog.close();const header=el('div','','section-title');header.append(el('h2','Decisión de tienda'),close);adviceDialog.append(header);
  if(!report){adviceDialog.append(el('p','Revisa los datos de la partida.'));return;}
  adviceDialog.append(el('h3',report.recommendation.title));for(const text of report.recommendation.reasons)adviceDialog.append(el('p',text));
  for(const option of report.options){if(option.kind==='reroll')continue;const row=el('article','','store-advice-option');row.dataset.adviceOffer=option.id;row.dataset.kind=option.kind;row.dataset.affordability=option.affordability;row.dataset.coverage=option.coverage;row.dataset.recommended=String(report.recommendation.status!=='abstain'&&report.recommendation.offerIds.includes(option.id));row.append(el('b',option.title));
   if(option.moneyAfter!==null)row.append(el('small',`Saldo $${option.moneyAfter}${option.price!==null?' · coste $'+option.price:''}`));for(const reason of option.reasons)row.append(el('p',reason));
   if(option.limitations.length){const d=el('details');d.append(el('summary','Cobertura'));for(const reason of option.limitations)d.append(el('p',reason));row.append(d);}adviceDialog.append(row);
  }
  if(report.limitations.length){const d=el('details');d.append(el('summary','Límites de esta comparación'));for(const text of report.limitations)d.append(el('p',text));adviceDialog.append(d);}for(const error of report.errors)adviceDialog.append(el('p',error.message,'error'));
 };
 const refreshAdvice=()=>{const hasOffers=candidates.length+voucherOffers.length+packOffers.length+otherOffers.length>0;suggestion.disabled=!hasOffers;try{if(!context)throw Error();report=evaluateShopContext(context.state(),snapshot(),{ante:context.ante()});suggestion.textContent=hasOffers?report.recommendation.title:'Consejo de tienda';suggestion.dataset.status=hasOffers?report.recommendation.status:'abstain';}catch{report=null;suggestion.textContent='Revisa los datos';suggestion.dataset.status='abstain';}if(adviceDialog.open)renderAdvice();};
 suggestion.onclick=()=>{refreshAdvice();renderAdvice();adviceDialog.showModal();};
 const numeric=(value:number|null,id:string)=>{const label=el('label','Precio que ves ($)'),input=el('input');input.type='number';input.min='0';input.step='1';input.value=String(value??'');input.id=id;label.htmlFor=id;label.append(input);return {label,input};};

 const editExtra=(kind:'voucher'|'pack'|'other',offerId?:string)=>{
  const old=kind==='voucher'?voucherOffers.find(o=>o.offerId===offerId):kind==='pack'?packOffers.find(o=>o.offerId===offerId):otherOffers.find(o=>o.offerId===offerId);
  editor.replaceChildren();const head=el('div','','section-title'),close=el('button','Cerrar','secondary');close.type='button';close.onclick=()=>editor.close();head.append(el('h2',kind==='voucher'?'Vale en la tienda':kind==='pack'?'Sobre en la tienda':'Otro artículo'),close);editor.append(head);
  const select=el('select');select.id='store-item-id';select.setAttribute('aria-label',kind==='voucher'?'Vale ofertado':'Sobre ofertado');const empty=el('option','Seleccionar');empty.value='';select.append(empty);
  if(kind==='voucher')for(const v of VOUCHER_CATALOG){const o=el('option',v.name);o.value=v.id;select.append(o);}if(kind==='pack')for(const p of BOOSTER_CATALOG){const o=el('option',p.name);o.value=p.id;select.append(o);}
  const type=el('select');type.id='store-item-kind';type.setAttribute('aria-label','Tipo de artículo');for(const [id,name] of [['tarot','Tarot'],['planet','Planeta'],['spectral','Espectral'],['playing_card','Carta de juego']]){const o=el('option',name);o.value=id!;type.append(o);}
  const name=el('input');name.id='store-item-name';name.placeholder='Nombre que aparece';name.setAttribute('aria-label','Nombre del artículo');
  if(kind==='other'){const other=old as NonNullable<ShopSnapshot['others']>[number]|undefined;type.value=other?.kind??'tarot';name.value=other?.name??'';editor.append(type,name);}else{if(old&&'catalogId'in old)select.value=old.catalogId;else if(old&&'family'in old)select.value=old.family+'-'+old.size;editor.append(select);}
  const price=numeric(old?.price??null,'store-item-price'),description=el('p','','muted');description.id='store-item-description';editor.append(description,price.label);
  const updateDescription=()=>{const v=VOUCHER_CATALOG.find(v=>v.id===select.value),p=BOOSTER_CATALOG.find(p=>p.id===select.value);description.textContent=kind==='voucher'?v?.description??'':kind==='pack'&&p?`${p.offered} cartas · elige ${p.choose}. Contenido desconocido antes de abrir.`:'Efecto sin valoración automática en esta entrega.';};select.onchange=()=>{price.input.value=kind==='voucher'?'10':String(BOOSTER_CATALOG.find(p=>p.id===select.value)?.basePrice??'');updateDescription();};updateDescription();
  const error=el('p','','error');error.id='store-item-error';const save=el('button','Registrar oferta');save.id='store-item-save';save.type='button';save.onclick=()=>{const amount=priceValue(price.input);if(amount!==null&&(!Number.isSafeInteger(amount)||amount<0)){error.textContent='Introduce un precio entero no negativo o déjalo desconocido.';return;}const id=offerId??crypto.randomUUID();
   if(kind==='voucher'){if(!VOUCHER_CATALOG.some(v=>v.id===select.value)){error.textContent='Elige el vale.';return;}const index=voucherOffers.findIndex(o=>o.offerId===id),offer={offerId:id,catalogId:select.value,price:amount};if(index<0)voucherOffers.push(offer);else voucherOffers[index]=offer;}
   else if(kind==='pack'){const p=BOOSTER_CATALOG.find(p=>p.id===select.value);if(!p){error.textContent='Elige el sobre.';return;}const index=packOffers.findIndex(o=>o.offerId===id),offer={offerId:id,family:p.family,size:p.size,price:amount};if(index<0)packOffers.push(offer);else packOffers[index]=offer;}
   else{if(!name.value.trim()){error.textContent='Introduce el nombre.';return;}const index=otherOffers.findIndex(o=>o.offerId===id),offer={offerId:id,kind:type.value as NonNullable<ShopSnapshot['others']>[number]['kind'],name:name.value.trim(),price:amount};if(index<0)otherOffers.push(offer);else otherOffers[index]=offer;}editor.close();changed();renderExtras();refreshAdvice();};editor.append(error,save);editor.showModal();
 };
 const renderExtras=()=>{
  extras.replaceChildren();otherShelf.replaceChildren();grid.querySelectorAll('.store-extra-tile[data-store-kind="other"],.candidate-placeholder').forEach(e=>e.remove());const voucherWell=el('div','','store-voucher-well'),packWell=el('div','','store-pack-well'),voucherShelf=el('div','','store-extra-shelf'),packShelf=el('div','','store-extra-shelf');voucherWell.append(voucherShelf);packWell.append(packShelf);extras.append(voucherWell,packWell);
  const listed:[string,string,number|null,HTMLElement,()=>void,()=>void][]=[];
  for(const o of voucherOffers){const v=VOUCHER_CATALOG.find(v=>v.id===o.catalogId),art=el('span','','voucher-art '+o.catalogId);art.setAttribute('aria-label',v?.name??o.catalogId);listed.push([o.offerId,'voucher',o.price,art,()=>editExtra('voucher',o.offerId),()=>{voucherOffers.splice(voucherOffers.indexOf(o),1);}]);}
  for(const o of packOffers){const p=BOOSTER_CATALOG.find(p=>p.family===o.family&&p.size===o.size),art=el('span','','booster-art pack-'+o.family+'-'+o.size);art.setAttribute('aria-label',p?.name??'Sobre');listed.push([o.offerId,'pack',o.price,art,()=>editExtra('pack',o.offerId),()=>{packOffers.splice(packOffers.indexOf(o),1);}]);}
  for(const o of otherOffers){const art=el('span',({tarot:'☾',planet:'✦',spectral:'♧',playing_card:'♠'})[o.kind],'store-other-art');art.setAttribute('aria-label',o.name);listed.push([o.offerId,'other',o.price,art,()=>editExtra('other',o.offerId),()=>{otherOffers.splice(otherOffers.indexOf(o),1);}]);}
  for(const [id,kind,price,art,edit,remove] of listed){const tile=el('article','','store-extra-tile');tile.dataset.storeKind=kind;tile.dataset.offerId=id;const inspect=el('button','','store-extra-inspect');inspect.type='button';inspect.append(art);const text=el('span','','store-extra-info');text.append(el('b',art.getAttribute('aria-label')??''),el('strong',`$${price??'?'}`));inspect.append(text);inspect.onclick=edit;const del=el('button','×','candidate-remove');del.type='button';del.setAttribute('aria-label','Quitar oferta');del.onclick=()=>{remove();changed();renderExtras();refreshAdvice();};tile.append(inspect,del);(kind==='voucher'?voucherShelf:kind==='pack'?packShelf:grid).append(tile);}
  for(let i=candidates.length+otherOffers.length;i<2;i++){const slot=el('button','','candidate-placeholder');slot.type='button';slot.setAttribute('aria-label',`Buscar oferta ${i+1}`);slot.append(el('span','＋'),el('small','Comodín'));slot.onclick=search.onclick;grid.append(slot);}
  for(const [kind,label,id,shelf,min] of [['voucher','＋ Vale','store-voucher-add',voucherShelf,1],['pack','＋ Sobre','store-pack-add',packShelf,2],['other','＋ Otra carta','store-other-add',otherShelf,0]] as const){const b=el('button',label,'store-add-offer');b.type='button';b.id=id;b.onclick=()=>editExtra(kind);shelf.append(b);if(kind!=='other')for(let i=shelf.querySelectorAll('.store-extra-tile').length+1;i<min;i++){const slot=el('button',label,'store-add-offer store-empty-offer');slot.type='button';slot.onclick=()=>editExtra(kind);shelf.append(slot);}}
 };
 const render=(calculate:boolean)=>{
  if(calculate)clearTimeout(timer);grid.replaceChildren();
  for(const c of candidates){const card=el('article','','candidate-card');card.dataset.candidate=c.joker.id;card.dataset.offerId=c.offerId;const hero=el('div','','candidate-hero'),info=el('div','','candidate-info'),cost=el('small',`$${c.price??'?'}`,'store-joker-price');info.append(el('h4',c.joker.names.es),cost);hero.append(jokerArt(c.joker.id,c.joker.names.es),info);
   const select=el('select');select.setAttribute('aria-label','Reemplazo para '+c.joker.names.es);const empty=el('option','Comprar sin vender');empty.value='';select.append(empty);for(const r of replacements()){const o=el('option','Vender '+r.name);o.value=r.id;select.append(o);}if(host.isConnected&&!replacements().some(r=>r.id===c.sellId))c.sellId='';select.value=c.sellId;
   const remove=el('button','×','candidate-remove');remove.type='button';remove.setAttribute('aria-label','Quitar candidato');remove.title='Quitar oferta';remove.onclick=()=>{candidates.splice(candidates.indexOf(c),1);changed();render(true);};
   const details=el('dialog','','candidate-dialog');details.setAttribute('aria-label',c.joker.names.es);const close=el('button','Cerrar','secondary');close.type='button';close.onclick=()=>details.close();const head=el('div','','section-title');head.append(el('h2',c.joker.names.es),close);const detailHero=el('div','','candidate-detail-hero'),detailArt=el('span','','candidate-detail-art');detailArt.append(jokerArt(c.joker.id,c.joker.names.es));detailHero.append(detailArt,el('p',c.joker.localization.es.description));
   const price=numeric(c.price,'store-price-'+c.offerId),edition=el('select');edition.id='store-edition-'+c.offerId;edition.setAttribute('aria-label','Edición de la oferta');for(const [id,label] of [['base','Base'],['foil','Laminada'],['holographic','Holográfica'],['polychrome','Policroma'],['negative','Negativa']]){const o=el('option',label);o.value=id!;edition.append(o);}edition.value=c.edition;const resultHost=el('div');
   const renderLocal=()=>{cost.textContent=`$${c.price??'?'}`;info.querySelector('.fit-score')?.remove();const offer={price:c.price===null?{status:'unknown' as const,reason:'Precio sin transcribir.'}:known(c.price),edition:known(c.edition),stickers:known(c.stickers)};const result=calculate?preview(c.joker,c.sellId,undefined,offer):el('p','Calculando…','candidate-pending');card.dataset.previewStatus=calculate?result.dataset.previewStatus??'unavailable':'updating';resultHost.replaceChildren(result);if(result.dataset.fitLabel){const badge=el('strong',result.dataset.fitLabel,'fit-score '+(result.dataset.fitTone??'unknown'));badge.title=result.dataset.fitReason??'';info.append(badge);card.dataset.fitLabel=result.dataset.fitLabel;}};
   const recalculate=()=>{calculate=true;changed();renderLocal();refreshAdvice();};price.input.oninput=()=>{c.price=priceValue(price.input);recalculate();};edition.onchange=()=>{c.edition=edition.value;recalculate();};select.onchange=()=>{c.sellId=select.value;recalculate();};details.append(head,detailHero,price.label,edition,select,resultHost);renderLocal();hero.tabIndex=0;hero.setAttribute('role','button');hero.setAttribute('aria-label','Ver '+c.joker.names.es);hero.setAttribute('aria-haspopup','dialog');
   const open=()=>{clearTimeout(timer);calculate=true;select.replaceChildren(empty);for(const r of replacements()){const o=el('option','Vender '+r.name);o.value=r.id;select.append(o);}if(c.sellId&&!replacements().some(r=>r.id===c.sellId))c.sellId='';select.value=c.sellId;renderLocal();refreshAdvice();details.showModal();};
   hero.onclick=open;hero.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}};details.addEventListener('close',()=>hero.focus({preventScroll:true}));card.append(hero,remove,details);grid.append(card);
  }
  renderExtras();refreshAdvice();
 };
 const reset=el('button','Vaciar ofertas','secondary store-reset');reset.type='button';reset.id='store-new-shop';reset.title='Vaciar únicamente la tienda transcrita';reset.onclick=()=>{candidates.length=0;voucherOffers.length=0;packOffers.length=0;otherOffers.length=0;rerollCost=null;changed();render(true);};heading.append(reset);
 invalidate=()=>{clearTimeout(timer);render(false);timer=setTimeout(()=>render(true),220);};render(false);invalidate();
 return (joker:JokerReference):string|null=>{if(candidates.length===4)return 'Máximo 4 artículos de comodín. Quita una oferta para registrar otra.';candidates.push({joker,offerId:crypto.randomUUID(),sellId:'',price:joker.basePrice,edition:'base',stickers:[]});changed();render(true);return null;};
}
