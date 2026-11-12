import {filterCollection,normalizeSearch,rarityNames} from '../catalog/collection.js';
import type {JokerCollection,JokerReference} from '../catalog/collection.js';
import {ALL_JOKER_FACTS} from '../catalog/all-joker-facts.js';
import {counterSpecs,initialCounters} from '../catalog/joker-counters.js';
import type {CounterSpec} from '../catalog/joker-counters.js';
import type {Fact} from '../state/model.js';
import {jokerArt} from './collection.js';

export interface ShopJokerDraft {
 offerId:string;catalogId:string;price:number|null;edition:string;stickers:string[];
 counters?:Record<string,Fact<number>>;
}
export interface ShopJokerPickerOptions {
 offer?:ShopJokerDraft;
 canWrite():boolean;
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

/** Selecting, paging, and editing keep a local draft until the offer is saved. */
export function openShopJokerPicker(options:ShopJokerPickerOptions,trigger?:HTMLElement):void {
 if(document.getElementById('shop-joker-picker'))return;
 const dialog=element('dialog','','shop-joker-picker');dialog.id='shop-joker-picker';
 dialog.setAttribute('aria-label','Comodines de la tienda');
 const stage=element('div','','shop-joker-stage'),panel=element('section','','shop-joker-panel');
 panel.tabIndex=-1;stage.append(panel);dialog.append(stage);
 const original=options.offer?structuredClone(options.offer):undefined;
 let draft:ShopJokerDraft=original?structuredClone(original):{offerId:crypto.randomUUID(),catalogId:'',price:null,edition:'base',stickers:[]};
 let data:JokerCollection|null=null,page=0,query='',chosen:JokerReference|undefined,modifier:'edition'|'stickers'|'counters'|null=null;
 let price:HTMLInputElement|undefined,error:HTMLElement|undefined;
 const initialHash=location.hash;
 const resize=()=>{
  const frame=document.getElementById('app-viewport');
  if(frame)stage.style.setProperty('--shop-picker-scale',String(Math.min(frame.clientWidth/1280,frame.clientHeight/600)));
 };
 const onRoute=()=>{if(location.hash!==initialHash)dialog.close();};
 const close=()=>dialog.close();
 const showError=(message:string|null)=>{if(error)error.textContent=message??'';};
 const currentCounters=()=>{
  const defaults=draft.catalogId==='green_joker'?{greenMult:{status:'known' as const,source:'manual' as const,value:0}}:initialCounters(draft.catalogId);
  return {...defaults,...draft.counters};
 };
 const readPrice=()=>{
  if(!price)return true;
  const amount=price.value.trim()===''?null:Number(price.value);
  if(amount!==null&&(!Number.isSafeInteger(amount)||amount<0)){showError('Introduce un precio entero desde $0.');price.focus();return false;}
  draft.price=amount;return true;
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
  draft.catalogId=id;chosen=joker;modifier=null;renderDetail();
 };
 function renderGallery(){
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
  panel.replaceChildren(heading,grid,pagination,back);
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
  const joker=chosen,specs=specsFor(draft.catalogId);
  panel.className='shop-joker-panel shop-joker-detail';panel.id='shop-joker-detail';
  const closeButton=button('Cerrar','shop-joker-close',close);closeButton.id='game-shop-close';
  const portrait=element('div','','shop-joker-portrait shop-joker-art');portrait.dataset.jokerEdition=draft.edition;portrait.append(jokerArt(joker.id,joker.names.es));
  const info=element('div','','shop-joker-info'),name=element('h2',joker.names.es),description=element('p',joker.localization.es.description.replace(/\((?:Actualmente|Currently)[^)]*\)/gi,'').trim(),'shop-joker-description');
  const current=element('p','','shop-joker-current');
  const values=Object.entries(specs).map(([key,spec])=>{
   const fact=currentCounters()[key],amount=fact?.status==='known'?fact.value:undefined;
   return amount===undefined?null:key==='x100'?`×${(amount/100).toLocaleString('es')}`:`${spec.label}: ${amount}`;
  }).filter(Boolean);
  current.textContent=values.join(' · ');current.hidden=!values.length;
  const rarity=element('span',rarityNames[joker.rarity]??'','shop-joker-rarity');rarity.dataset.rarity=String(joker.rarity);
  info.append(name,description,current,rarity);
  const tools=element('div','','shop-joker-tools');
  const slot=(id:string,label:string,selected:boolean,action:()=>void)=>{
   const node=button('+','shop-joker-slot',action);node.id=id;node.setAttribute('aria-label',label);node.setAttribute('aria-expanded',String(modifier===id.replace('shop-joker-','')));node.dataset.selected=String(selected);tools.append(node);return node;
  };
  const editionButton=slot('shop-joker-edition','Edición · '+(editions[draft.edition]??draft.edition),draft.edition!=='base',()=>openModifier('edition'));
  editionButton.title='Edición';if(draft.edition!=='base')editionButton.textContent=draft.edition==='unknown'?'?':editions[draft.edition]!.slice(0,1);
  const stickerButton=slot('shop-joker-stickers','Pegatinas'+(draft.stickers.length?' · '+draft.stickers.map(id=>stickerNames[id]??id).join(', '):''),draft.stickers.length>0,()=>openModifier('stickers'));
  stickerButton.title='Pegatinas';if(draft.stickers.length)stickerButton.textContent=draft.stickers.includes('unknown')?'?':'✓';
  if(Object.keys(specs).length){const pencil=slot('shop-joker-counters','Editar valores actuales',!!draft.counters,()=>openModifier('counters'));pencil.textContent='✎';pencil.title='Valores actuales';}
  const priceLabel=element('label','Precio ($)','shop-joker-price');price=element('input');price.id='game-shop-price';price.type='number';price.min='0';price.step='1';price.inputMode='numeric';price.placeholder='Desconocido';price.value=draft.price===null?'':String(draft.price);priceLabel.append(price);
  error=element('p','','shop-joker-error');error.id='game-shop-editor-error';error.setAttribute('role','alert');
  const actions=element('div','','shop-joker-actions'),save=button('Guardar oferta','shop-joker-save',()=>{if(readPrice())finish(()=>options.save(structuredClone(draft)));});save.id='game-shop-save';save.disabled=!options.canWrite()||!!modifier;actions.append(save);
  if(original&&options.buy){const buy=button('Compré','shop-joker-buy',()=>finish(()=>options.buy!()));buy.id='game-shop-buy';buy.disabled=!options.canWrite()||!unchanged()||!!modifier;actions.append(buy);price.oninput=()=>{if(readPrice())buy.disabled=!options.canWrite()||!unchanged()||!!modifier;};}
  if(original&&options.remove){const remove=button('Quitar oferta','shop-joker-remove',()=>finish(()=>options.remove!()));remove.id='game-shop-remove';remove.disabled=!options.canWrite()||!!modifier;actions.append(remove);}
  const back=button('Volver a comodines','shop-joker-back',()=>{if(readPrice())renderGallery();});back.id='shop-joker-back';
  panel.replaceChildren(closeButton,portrait,info,tools,priceLabel,error,actions,back);
  if(modifier)renderModifier();
  else price.focus({preventScroll:true});
 }
 function openModifier(kind:'edition'|'stickers'|'counters'){
  if(!readPrice())return;modifier=kind;renderDetail();
 }
 function renderModifier(){
  if(!modifier)return;
  const kind=modifier,box=element('section','','shop-joker-modifier'),heading=element('h3',kind==='edition'?'Edición':kind==='stickers'?'Pegatinas':'Valores actuales');
  for(const node of panel.children)if(node instanceof HTMLElement&&!node.classList.contains('shop-joker-close'))node.inert=true;
  box.setAttribute('aria-label',heading.textContent!);box.append(heading);
  const fields=new Map<string,HTMLInputElement>(),edition=element('select');edition.id='game-shop-edition';edition.setAttribute('aria-label','Edición de la oferta');
  if(kind==='edition'){
   for(const [id,name]of Object.entries(editions)){const option=element('option',name);option.value=id;edition.append(option);}edition.value=draft.edition;box.append(edition);
  }else if(kind==='stickers'){
   const stickers=element('div','','game-shop-stickers');
   for(const [id,name]of Object.entries(stickerNames)){const label=element('label'),input=element('input');input.type='checkbox';input.value=id;input.checked=draft.stickers.includes(id);fields.set(id,input);label.append(input,element('span',name));stickers.append(label);}box.append(stickers);
  }else{
   for(const [key,spec]of Object.entries(specsFor(draft.catalogId))){
    const label=element('label',key==='x100'?'Multiplicador actual (×)':spec.label),input=element('input'),fact=currentCounters()[key],divisor=key==='x100'?100:1;
    input.type='number';input.dataset.counter=key;input.min=String(spec.min/divisor);if(spec.max!==undefined)input.max=String(spec.max/divisor);input.step=divisor===100?'0.01':'1';input.inputMode='decimal';input.placeholder='Desconocido';input.value=fact?.status==='known'?String(fact.value/divisor):'';input.setAttribute('aria-label',label.textContent!);label.append(input);fields.set(key,input);box.append(label);
   }
  }
  const modifierError=element('p','','shop-joker-error');modifierError.setAttribute('role','alert');
  const modifierActions=element('div','','shop-joker-modifier-actions');
  const apply=button('Aplicar','shop-joker-save',()=>{
   if(kind==='edition')draft.edition=edition.value;
   else if(kind==='stickers'){
    const checked=[...fields].filter(([,input])=>input.checked).map(([id])=>id);
    if(checked.includes('unknown')&&checked.length>1){modifierError.textContent='Marca las pegatinas conocidas o Desconocidas.';return;}
    draft.stickers=checked;
   }else{
    const counters:Record<string,Fact<number>>={};
    for(const [key,input]of fields){
     if(!input.value.trim()){counters[key]={status:'unknown',reason:'Valor actual sin registrar.'};continue;}
     const spec=specsFor(draft.catalogId)[key]!,amount=Number(input.value)*(key==='x100'?100:1),rounded=Math.round(amount);
     if(!Number.isSafeInteger(rounded)||Math.abs(amount-rounded)>1e-8||rounded<spec.min||(spec.max!==undefined&&rounded>spec.max)){modifierError.textContent='Revisa el valor de '+(key==='x100'?'Multiplicador actual':spec.label)+'.';input.focus();return;}
     counters[key]={status:'known',source:'manual',value:rounded};
    }
    draft.counters=counters;
   }
   modifier=null;renderDetail();
  });apply.id='shop-joker-apply-modifier';
  modifierActions.append(apply,button('Cancelar','shop-joker-cancel-modifier',()=>{modifier=null;renderDetail();}));box.append(modifierError,modifierActions);panel.append(box);
  (kind==='edition'?edition:fields.values().next().value)?.focus({preventScroll:true});
 }
 dialog.addEventListener('cancel',event=>{if(modifier){event.preventDefault();modifier=null;renderDetail();}});
 dialog.addEventListener('close',()=>{
  window.removeEventListener('resize',resize);window.removeEventListener('hashchange',onRoute);dialog.remove();
  if(location.hash!==initialHash)return;
  const fallback=document.querySelector<HTMLElement>(`[data-game-shop-offer="${CSS.escape(draft.offerId)}"]`)??document.querySelector<HTMLElement>('[data-game-shop-kind="joker"][data-game-shop-empty="true"]');
  const target=trigger?.isConnected?trigger:fallback;
  if(target?.getClientRects().length)target.focus({preventScroll:true});
 },{once:true});
 (document.getElementById('app-shell')??document.body).append(dialog);resize();window.addEventListener('resize',resize);window.addEventListener('hashchange',onRoute);dialog.showModal();
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
