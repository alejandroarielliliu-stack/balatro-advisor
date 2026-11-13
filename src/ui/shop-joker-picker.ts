import {filterCollection,normalizeSearch,rarityNames} from '../catalog/collection.js';
import type {JokerCollection,JokerReference} from '../catalog/collection.js';
import {ALL_JOKER_FACTS} from '../catalog/all-joker-facts.js';
import {counterSpecs,initialCounters} from '../catalog/joker-counters.js';
import type {CounterSpec} from '../catalog/joker-counters.js';
import type {Fact} from '../state/model.js';
import {jokerArt} from './collection.js';
import {COLLECTION_EDITIONS,collectionArt} from './collection-data.js';
import {jokerStickerArt} from './joker-sticker-art.js';

export interface ShopJokerDraft {
 offerId:string;catalogId:string;price:number|null;edition:string;stickers:string[];
 counters?:Record<string,Fact<number>>;
}
export interface ShopJokerPickerOptions {
 offer?:ShopJokerDraft;
 canWrite():boolean;
 quote(offer:ShopJokerDraft):{price:number|null;reason?:string};
 save(offer:ShopJokerDraft):string|null;
 remove?():string|null;
 buy?():string|null;
}
const editions:Record<string,string>={base:'Base',foil:'Laminada',holographic:'Holográfica',polychrome:'Policroma',negative:'Negativa',unknown:'Desconocida'};
const stickerNames:Record<string,string>={eternal:'Eterno',perishable:'Perecedero',rental:'Alquiler',unknown:'Desconocidas'};
const engineIds=new Map(Object.entries(ALL_JOKER_FACTS).map(([id,joker])=>[joker.artId,id]));
const element=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',className='')=>{
 const node=document.createElement(tag);node.textContent=text;node.className=className;return node;
};
const button=(text:string,className:string,click:()=>void)=>{
 const node=element('button',text,className);node.type='button';node.onclick=click;return node;
};
const specsFor=(id:string):Record<string,CounterSpec>=>id==='green_joker'?{greenMult:{label:'Mult actual',initial:0,min:0}}:counterSpecs(id);
let catalogPromise:Promise<JokerCollection>|undefined;
function catalog(){
 catalogPromise??=fetch('./web/assets/jokers/catalog.json').then(async response=>{
  if(!response.ok)throw Error('No se pudo cargar la colección.');
  const data=await response.json() as JokerCollection;
  if(data.schemaVersion!==1||data.jokers.length!==150)throw Error('No se pudo cargar la colección.');
  return data;
 }).catch(error=>{catalogPromise=undefined;throw error;});
 return catalogPromise;
}

function jokerInfo(joker:JokerReference,offer:ShopJokerDraft){
 const info=element('div','','shop-joker-info'),name=element('h2',joker.names.es),description=element('p',joker.localization.es.description.replace(/\((?:Actualmente|Currently)[^)]*\)/gi,'').replace('cualquierpaquete','cualquier paquete').trim(),'shop-joker-description');
 const defaults=offer.catalogId==='green_joker'?{greenMult:{status:'known' as const,source:'manual' as const,value:0}}:initialCounters(offer.catalogId);
 const counters={...defaults,...offer.counters},values=Object.entries(specsFor(offer.catalogId)).flatMap(([key,spec])=>{
  const fact=counters[key];if(fact?.status!=='known')return [];
  if(key==='x100')return [`Actualmente ×${(fact.value/100).toLocaleString('es')} Mult`];
  if(key==='mult'||key==='greenMult')return [`Actualmente +${fact.value} Mult`];
  return [`${spec.label}: ${fact.value}`];
 });
 if(values.length)description.append(element('span','('+values.join(' · ')+')','shop-joker-current'));
 const rarity=element('span',rarityNames[joker.rarity]??'','shop-joker-rarity');rarity.dataset.rarity=String(joker.rarity);
 info.append(name,description,rarity);return info;
}

/** Hover/focus describes the recorded card without changing the shop. */
let stopActivePreview:(()=>void)|undefined;
export function previewShopJoker(offer:ShopJokerDraft,trigger:HTMLElement):()=>void {
 stopActivePreview?.();
 let active=true,preview:HTMLElement|undefined;
 void catalog().then(data=>{
  if(!active||!trigger.isConnected||document.getElementById('shop-joker-inline'))return;
  const joker=data.jokers.find(item=>(engineIds.get(item.id)??item.engineId??item.id)===offer.catalogId);if(!joker)return;
  preview=jokerInfo(joker,offer);preview.classList.add('shop-joker-preview');preview.id='shop-joker-preview';preview.setAttribute('role','tooltip');
  trigger.setAttribute('aria-describedby',preview.id);trigger.parentElement?.append(preview);
 }).catch(()=>{/* A failed preview never blocks selecting or recording an offer. */});
 const stop=()=>{active=false;preview?.remove();trigger.removeAttribute('aria-describedby');if(stopActivePreview===stop)stopActivePreview=undefined;};
 stopActivePreview=stop;return stop;
}

/** Gallery choices record base offers; existing offers are edited on their shelf. */
export function openShopJokerPicker(options:ShopJokerPickerOptions,trigger?:HTMLElement):void {
 stopActivePreview?.();
 const inline=!!options.offer&&!!trigger;
 if(!inline&&document.getElementById('shop-joker-picker'))return;
 const previous=document.getElementById('shop-joker-inline') as HTMLDialogElement|null;
 const same=previous?.open&&previous.dataset.offerId===options.offer?.offerId;previous?.close();if(inline&&same)return;
 const dialog=element('dialog','',inline?'shop-joker-inline':'shop-joker-picker');dialog.id=inline?'shop-joker-inline':'shop-joker-picker';
 if(options.offer)dialog.dataset.offerId=options.offer.offerId;
 dialog.setAttribute('aria-label','Comodines de la tienda');
 const stage=element('div','','shop-joker-stage'),panel=element('section','','shop-joker-panel');
 panel.tabIndex=-1;stage.append(panel);dialog.append(stage);
 const original=options.offer?structuredClone(options.offer):undefined;
 let draft:ShopJokerDraft=original?structuredClone(original):{offerId:crypto.randomUUID(),catalogId:'',price:null,edition:'base',stickers:[]};
 let data:JokerCollection|null=null,page=0,query='',chosen:JokerReference|undefined,modifier:'edition'|'stickers'|'counters'|null=null;
 let error:HTMLElement|undefined;
 let modifierPicker:HTMLDialogElement|undefined;
 const initialHash=location.hash;
 const resize=()=>{
  if(inline)return;
  const frame=document.getElementById('app-viewport');
  if(!frame)return;
  const detail=dialog.dataset.mode==='detail',desktop=detail&&document.querySelector<HTMLElement>('.blind-stage')?.dataset.layout==='desktop';
  const width=desktop?960:1280,scale=Math.min(frame.clientWidth/width,frame.clientHeight/600);
  stage.dataset.layout=desktop?'desktop':'compact';
  stage.style.width=width+'px';stage.style.height=(detail?frame.clientHeight/scale:600)+'px';
  stage.style.setProperty('--shop-picker-scale',String(scale));
 };
 const onRoute=()=>{if(location.hash!==initialHash)dialog.close();};
 const close=()=>dialog.close();
 const showError=(message:string|null)=>{if(error)error.textContent=message??'';};
 const currentCounters=()=>{
  const defaults=draft.catalogId==='green_joker'?{greenMult:{status:'known' as const,source:'manual' as const,value:0}}:initialCounters(draft.catalogId);
  return {...defaults,...draft.counters};
 };
 const calculatePrice=()=>{
  const quote=options.quote(structuredClone(draft));
  draft.price=quote.price;
  return quote;
 };
 const unchanged=()=>!!original&&JSON.stringify(draft)===JSON.stringify(original);
 const finish=(operation:()=>string|null)=>{
  if(!options.canWrite()){showError('Esta tienda está en modo lectura.');return;}
  const problem=operation();if(problem){showError(problem);return;}
  dialog.close();
 };
 const select=(joker:JokerReference)=>{
  const id=engineIds.get(joker.id)??joker.engineId??joker.id;
  if(draft.catalogId!==id){delete draft.counters;draft.price=null;draft.edition='base';draft.stickers=[];}
  draft.catalogId=id;chosen=joker;modifier=null;calculatePrice();
  finish(()=>options.save(structuredClone(draft)));
 };
 function renderGallery(){
  dialog.dataset.mode='gallery';resize();
  modifier=null;panel.className='shop-joker-panel shop-joker-gallery';panel.removeAttribute('id');
  const heading=element('div','','shop-joker-heading'),title=element('h2','Comodines');
  heading.append(title,button('Cerrar','shop-joker-close',close));heading.lastElementChild!.id='game-shop-close';
  const search=element('input');search.id='shop-joker-search';search.type='search';search.value=query;search.placeholder='Buscar nombre o efecto';search.setAttribute('aria-label','Buscar comodín');
  heading.insertBefore(search,heading.lastElementChild);
  const grid=element('div','','shop-joker-grid');grid.setAttribute('aria-label','Comodines de la colección');
  const pagination=element('div','','shop-joker-pagination'),previous=button('‹','shop-joker-arrow',()=>{page--;draw();}),next=button('›','shop-joker-arrow',()=>{page++;draw();}),pageLabel=element('span','','shop-joker-page');
  previous.id='shop-joker-prev';next.id='shop-joker-next';pageLabel.id='shop-joker-page';pageLabel.setAttribute('role','status');
  previous.setAttribute('aria-label','Página anterior');next.setAttribute('aria-label','Página siguiente');pagination.append(previous,pageLabel,next);
  const back=button('Volver','shop-joker-back',close);
  error=element('p','','shop-joker-error');error.id='game-shop-editor-error';error.setAttribute('role','alert');
  panel.replaceChildren(heading,grid,pagination,back,error);
  function draw(){
   const matching=filterCollection(data?.jokers??[]).filter(joker=>normalizeSearch([joker.id,engineIds.get(joker.id),joker.names.es,joker.names.en,joker.localization.es.description,joker.localization.en.description].join(' ')).includes(normalizeSearch(query).trim()));
   const pages=Math.max(1,Math.ceil(matching.length/15));page=(page+pages)%pages;grid.replaceChildren();pageLabel.textContent=`Página ${page+1}/${pages}`;
   previous.disabled=next.disabled=pages===1;
   for(const joker of matching.slice(page*15,(page+1)*15)){
    const card=button('','shop-joker-card',()=>select(joker));card.dataset.shopJoker=engineIds.get(joker.id)??joker.engineId??joker.id;
    card.setAttribute('aria-label',joker.names.es+' · '+joker.names.en);card.append(jokerArt(joker.id,joker.names.es));grid.append(card);
   }
   if(!matching.length)grid.append(element('p','Sin coincidencias.','shop-joker-empty'));
  }
  search.oninput=()=>{query=search.value;page=0;draw();};draw();
  panel.querySelector<HTMLElement>('[data-shop-joker]')?.focus({preventScroll:true});
 }
 function renderDetail(){
  if(!chosen)return;
  dialog.dataset.mode='detail';resize();
  const joker=chosen,specs=specsFor(draft.catalogId);
  const quote=calculatePrice();
  panel.className='shop-joker-panel shop-joker-detail';panel.id='shop-joker-detail';
  const closeButton=button('×','shop-joker-close',close);closeButton.id='game-shop-close';closeButton.setAttribute('aria-label','Cerrar ficha');
  const portrait=element('div','','shop-joker-portrait shop-joker-art');portrait.dataset.jokerEdition=draft.edition;portrait.append(jokerArt(joker.id,joker.names.es));
  const info=jokerInfo(joker,draft);
  const tools=element('div','','shop-joker-tools');
  const slot=(id:string,label:string,selected:boolean,action:()=>void)=>{
   const node=button('+','shop-joker-slot',action);node.id=id;node.setAttribute('aria-label',label);node.setAttribute('aria-expanded',String(modifier===id.replace('shop-joker-','')));node.dataset.selected=String(selected);tools.append(node);return node;
  };
  const editionButton=slot('shop-joker-edition','Edición · '+(editions[draft.edition]??draft.edition),draft.edition!=='base',()=>openModifier('edition'));
  editionButton.title='Edición';if(draft.edition!=='base')editionButton.textContent=draft.edition==='unknown'?'?':editions[draft.edition]!.slice(0,1);
  const stickerButton=slot('shop-joker-stickers','Pegatinas'+(draft.stickers.length?' · '+draft.stickers.map(id=>stickerNames[id]??id).join(', '):''),draft.stickers.length>0,()=>openModifier('stickers'));
  stickerButton.title='Pegatinas';if(draft.stickers.length)stickerButton.textContent=draft.stickers.includes('unknown')?'?':'✓';
  const pencil=slot('shop-joker-counters','Editar valores actuales',!!draft.counters,()=>openModifier('counters'));pencil.textContent='✎';pencil.disabled=!Object.keys(specs).length;pencil.title=pencil.disabled?'Este comodín no tiene valores variables.':'Valores actuales';
  for(const control of [editionButton,stickerButton,pencil])control.disabled||=!options.canWrite();
  const priceLabel=element('div','','shop-joker-price'),price=element('output',draft.price===null?'$—':'$'+draft.price);
  price.id='game-shop-price';price.setAttribute('aria-label','Precio calculado');price.setAttribute('aria-live','polite');
  priceLabel.append(element('span','Precio'),price);
  error=element('p','','shop-joker-error');error.id='game-shop-editor-error';error.setAttribute('role','alert');
  const actions=element('div','','shop-joker-actions');
  if(original&&options.buy){const buy=button('Comprar','shop-joker-buy',()=>finish(()=>options.buy!()));buy.id='game-shop-buy';buy.disabled=!options.canWrite()||!unchanged()||!!modifier;actions.append(buy);}
  const remove=original&&options.remove?button('×','shop-joker-remove',()=>finish(()=>options.remove!())):null;
  if(remove){remove.id='game-shop-remove';remove.title='Quitar oferta de la tienda';remove.setAttribute('aria-label',remove.title);remove.disabled=!options.canWrite()||!!modifier;}
  panel.replaceChildren(closeButton,info,tools,priceLabel,error,actions);if(!inline)panel.prepend(portrait);if(remove)panel.append(remove);
  if(draft.price===null&&quote.reason)showError(quote.reason);
  if(modifier)renderModifier();
  else trigger?.focus({preventScroll:true});
 }
 function openModifier(kind:'edition'|'stickers'|'counters'){
  modifier=kind;renderDetail();
 }
 function renderModifier(){
  if(!modifier)return;
  if(modifier!=='counters'){renderModifierCollection(modifier);return;}
  const box=element('section','','shop-joker-modifier'),heading=element('h3','Valores actuales');
  for(const node of panel.children)if(node instanceof HTMLElement&&!node.classList.contains('shop-joker-close'))node.inert=true;
  box.setAttribute('aria-label',heading.textContent!);box.append(heading);
  const fields=new Map<string,HTMLInputElement>();
   for(const [key,spec]of Object.entries(specsFor(draft.catalogId))){
    const label=element('label',key==='x100'?'Multiplicador actual (×)':spec.label),input=element('input'),fact=currentCounters()[key],divisor=key==='x100'?100:1;
    input.type='number';input.dataset.counter=key;input.min=String(spec.min/divisor);if(spec.max!==undefined)input.max=String(spec.max/divisor);input.step=divisor===100?'0.01':'1';input.inputMode='decimal';input.placeholder='Desconocido';input.value=fact?.status==='known'?String(fact.value/divisor):'';input.setAttribute('aria-label',label.textContent!);label.append(input);fields.set(key,input);box.append(label);
   }
  const modifierError=element('p','','shop-joker-error');modifierError.setAttribute('role','alert');
  const modifierActions=element('div','','shop-joker-modifier-actions');
  const apply=button('Aplicar','shop-joker-save',()=>{
   if(!options.canWrite()){modifierError.textContent='Esta tienda está en modo lectura.';return;}
   const before=structuredClone(draft);
    const counters:Record<string,Fact<number>>={};
    for(const [key,input]of fields){
     if(!input.value.trim()){counters[key]={status:'unknown',reason:'Valor actual sin registrar.'};continue;}
     const spec=specsFor(draft.catalogId)[key]!,amount=Number(input.value)*(key==='x100'?100:1),rounded=Math.round(amount);
     if(!Number.isSafeInteger(rounded)||Math.abs(amount-rounded)>1e-8||rounded<spec.min||(spec.max!==undefined&&rounded>spec.max)){modifierError.textContent='Revisa el valor de '+(key==='x100'?'Multiplicador actual':spec.label)+'.';input.focus();return;}
     counters[key]={status:'known',source:'manual',value:rounded};
    }
    draft.counters=counters;
   calculatePrice();const problem=options.save(structuredClone(draft));
   if(problem){draft=before;modifierError.textContent=problem;return;}
   dialog.close();
  });apply.id='shop-joker-apply-modifier';
  modifierActions.append(apply,button('Cancelar','shop-joker-cancel-modifier',()=>{modifier=null;renderDetail();}));box.append(modifierError,modifierActions);panel.append(box);
  fields.values().next().value?.focus({preventScroll:true});
 }
 function renderModifierCollection(kind:'edition'|'stickers'){
  for(const node of panel.children)if(node instanceof HTMLElement&&!node.classList.contains('shop-joker-close'))node.inert=true;
  const picker=element('dialog','','collection-overlay shop-modifier-picker');picker.id='shop-joker-modifier-picker';modifierPicker=picker;
  picker.setAttribute('aria-label',kind==='edition'?'Elegir edición':'Elegir pegatinas');
  const stage=element('div','','collection-stage'),body=element('section','','collection-panel shop-modifier-panel');body.dataset.category=kind==='edition'?'edition':'stickers';
  const title=element('h2',kind==='edition'?'Ediciones':'Pegatinas','shop-modifier-title');
  const well=element('div','','collection-well'),grid=element('div','','collection-grid');well.append(grid);
  const problem=element('p','','shop-modifier-error');problem.setAttribute('role','alert');
  const save=(candidate:ShopJokerDraft)=>{
   if(!options.canWrite()){problem.textContent='Esta tienda está en modo lectura.';return;}
   const before=draft;draft=candidate;calculatePrice();const failure=options.save(structuredClone(draft));
   if(failure){draft=before;problem.textContent=failure;return;}
   modifier=null;picker.close();dialog.close();
  };
  const option=(id:string,name:string,art:HTMLElement,selected:boolean)=>{
   const card=button('','collection-item collection-card',()=>{
    const candidate=structuredClone(draft);
    if(kind==='edition')candidate.edition=id;
    else candidate.stickers=id==='none'?[]:id==='unknown'?['unknown']:candidate.stickers.includes(id)?candidate.stickers.filter(sticker=>sticker!==id):[...candidate.stickers.filter(sticker=>sticker!=='unknown'),id];
    save(candidate);
   });
   if(kind==='edition')card.dataset.shopEdition=id;else card.dataset.shopSticker=id;
   card.setAttribute('aria-label',name);card.setAttribute('aria-pressed',String(selected));card.title=name;card.disabled=!options.canWrite();
   const portrait=element('span','','collection-item-art');portrait.append(art);card.append(portrait,element('span',name,'shop-modifier-label'));return card;
  };
  if(kind==='edition'){
   for(const entry of COLLECTION_EDITIONS){const id=entry.edition==='holo'?'holographic':entry.edition!;grid.append(option(id,entry.name,collectionArt(entry),draft.edition===id));}
  }else{
   for(const id of ['none','eternal','perishable','rental']){
    const art=collectionArt(COLLECTION_EDITIONS[0]!),sticker=jokerStickerArt(id),name=id==='none'?'Sin pegatinas':stickerNames[id]!;
    const card=option(id,name,art,id==='none'?!draft.stickers.length:draft.stickers.includes(id));if(sticker)card.querySelector('.collection-item-art')!.append(sticker);grid.append(card);
   }
  }
  const unknown=button(kind==='edition'?'Edición desconocida':'Pegatinas desconocidas','shop-modifier-unknown',()=>{
   const candidate=structuredClone(draft);if(kind==='edition')candidate.edition='unknown';else candidate.stickers=draft.stickers.includes('unknown')?[]:['unknown'];save(candidate);
  });
  if(kind==='edition')unknown.dataset.shopEdition='unknown';else unknown.dataset.shopSticker='unknown';
  unknown.setAttribute('aria-pressed',String(kind==='edition'?draft.edition==='unknown':draft.stickers.includes('unknown')));unknown.disabled=!options.canWrite();
  const back=button('Volver','collection-back',()=>picker.close());back.id='shop-modifier-back';
  body.append(title,well,unknown,problem,back);stage.append(body);picker.append(stage);
  const resizePicker=()=>{const frame=document.getElementById('app-viewport');if(frame)stage.style.setProperty('--collection-scale',String(Math.min(frame.clientWidth/1280,frame.clientHeight/600)));};
  picker.addEventListener('click',event=>{if(event.target===picker||event.target===stage)picker.close();});
  picker.addEventListener('close',()=>{
   window.removeEventListener('resize',resizePicker);picker.remove();if(modifierPicker===picker)modifierPicker=undefined;
   if(dialog.open&&modifier===kind){modifier=null;renderDetail();panel.querySelector<HTMLElement>('#shop-joker-'+kind)?.focus({preventScroll:true});}
  },{once:true});
  (document.getElementById('app-shell')??document.body).append(picker);resizePicker();window.addEventListener('resize',resizePicker);picker.showModal();
  grid.querySelector<HTMLElement>('[aria-pressed="true"]')?.focus({preventScroll:true});
 }
 dialog.addEventListener('cancel',event=>{if(modifier){event.preventDefault();modifier=null;renderDetail();}});
 dialog.addEventListener('click',event=>{if(dialog.dataset.mode==='detail'&&(event.target===dialog||event.target===stage||event.target===panel))dialog.close();});
 dialog.addEventListener('close',()=>{
  modifierPicker?.close();
  window.removeEventListener('resize',resize);window.removeEventListener('hashchange',onRoute);document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);dialog.remove();
  const wrapper=trigger?.closest('.game-shop-joker');if(!wrapper?.querySelector('dialog[open]'))wrapper?.classList.remove('is-selected');
  if(location.hash!==initialHash)return;
  const fallback=document.querySelector<HTMLElement>(`[data-game-shop-offer="${CSS.escape(draft.offerId)}"]`)??document.querySelector<HTMLElement>('[data-game-shop-kind="joker"][data-game-shop-empty="true"]');
  const target=trigger?.isConnected?trigger:fallback;
  if(target?.getClientRects().length)target.focus({preventScroll:true});
 },{once:true});
 const outside=(event:PointerEvent)=>{if(inline&&!modifierPicker?.open&&!dialog.contains(event.target as Node)&&!trigger?.contains(event.target as Node))dialog.close();};
 const escape=(event:KeyboardEvent)=>{if(inline&&event.key==='Escape'&&!modifierPicker?.open){event.preventDefault();if(modifier){modifier=null;renderDetail();}else dialog.close();}};
 if(inline){trigger!.parentElement!.append(dialog);trigger!.closest('.game-shop-joker')?.classList.add('is-selected');dialog.show();document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);}
 else {(document.getElementById('app-shell')??document.body).append(dialog);dialog.showModal();}
 resize();window.addEventListener('resize',resize);window.addEventListener('hashchange',onRoute);
 panel.append(element('p','Cargando comodines…','shop-joker-loading'),button('Cerrar','shop-joker-back',close));
 const load=()=>{panel.replaceChildren(element('p','Cargando comodines…','shop-joker-loading'),button('Cerrar','shop-joker-back',close));void catalog().then(collection=>{
  if(!dialog.open)return;data=collection;
  const selected=original?data.jokers.find(joker=>(engineIds.get(joker.id)??joker.engineId??joker.id)===original.catalogId):undefined;
  if(selected){chosen=selected;renderDetail();}else renderGallery();
 }).catch(()=>{
  if(!dialog.open)return;panel.replaceChildren(element('p','No se pudo cargar la colección.','shop-joker-error'),button('Reintentar','shop-joker-back',load),button('Cerrar','shop-joker-back',close));
 });};
 load();
}
