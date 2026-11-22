import {BOOSTER_CATALOG} from '../catalog/booster-catalog.js';
import {collectionArt,COLLECTION_BOOSTERS,COLLECTION_VOUCHERS} from './collection-data.js';
import {collectionOfferGallery,resizeCollectionStage} from './collection.js';

type Kind='voucher'|'pack';

// The shelf stores pack family and size. Each offer type uses its matching
// illustration from the full collection, which can show alternate wrappers.
const packs=COLLECTION_BOOSTERS.flatMap(entry=>{
 const pack=BOOSTER_CATALOG.find(definition=>definition.x===entry.art.x&&definition.y===entry.art.y);
 return pack?[{...entry,id:pack.id}]:[];
});

interface ShopCatalogPickerOptions {
 kind:Kind;
 offer?:{catalogId:string;price:number|null};
 canWrite():boolean;
 choose(catalogId:string):string|null;
 buy():string|null;
 remove():string|null;
 restoreFocus():void;
}

const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',className='')=>{
 const e=document.createElement(tag);e.textContent=text;e.className=className;return e;
};

export function openShopCatalogPicker(options:ShopCatalogPickerOptions):()=>void {
 const {offer,kind}=options,entries=kind==='voucher'?COLLECTION_VOUCHERS:packs;
 const item=entries.find(entry=>entry.id===offer?.catalogId);
 const label=kind==='voucher'?'Vales de la tienda':'Sobres de la tienda';
 const dialog=el('dialog'),error=el('p','','game-shop-editor-error');
 error.id='game-shop-editor-error';error.setAttribute('role','alert');
 const stage=el('div','','collection-stage'),initialHash=location.hash;
 let galleryOpen=false,focus:()=>void=()=>{};
 const operation=(perform:()=>string|null)=>{
  const problem=options.canWrite()?perform():'Esta tienda está en modo lectura.';
  if(problem)error.textContent=problem;else dialog.close();
 };
 function button(text:string,id:string,act:()=>void,className=''){
  const control=el('button',text,className);control.id=id;control.type='button';control.onclick=act;return control;
 }
 const sync=()=>{
  for(const control of dialog.querySelectorAll<HTMLButtonElement>('[data-shop-catalog-write]'))control.disabled=!options.canWrite();
 };
 function renderDetails(){
  if(!offer)return;
  galleryOpen=false;error.textContent='';error.classList.remove('shop-modifier-error');
  dialog.id='game-shop-editor';dialog.className='collection-detail shop-catalog-detail';
  const name=item?.name??offer.catalogId;dialog.setAttribute('aria-label',name);
  const heading=el('div','','section-title'),close=button('Cerrar','game-shop-close',()=>dialog.close(),'collection-detail-back');
  heading.append(el('h2',name),close);
  const detail=el('div','','collection-detail-body'),copy=el('div'),price=el('strong',offer.price===null?'Precio desconocido':'$'+offer.price);
  price.id='game-shop-price';copy.append(price);if(item)copy.append(el('p',item.description,'effect-description'));
  const actions=el('div','','game-shop-editor-actions');
  for(const control of [
   button(kind==='voucher'?'Comprar':'Abrir sobre','game-shop-buy',()=>operation(options.buy)),
   button('Cambiar oferta','game-shop-change',renderGallery),
   button('Quitar oferta','game-shop-remove',()=>operation(options.remove),'game-shop-editor-remove')
  ]){control.setAttribute('data-shop-catalog-write','');actions.append(control);}
  copy.append(actions,error);detail.append(item?collectionArt(item):el('span','?','game-shop-unknown-art'),copy);dialog.replaceChildren(heading,detail);
  focus=()=>close.focus({preventScroll:true});sync();focus();
 }
 function leaveGallery(){if(offer)renderDetails();else dialog.close();}
 function renderGallery(){
  galleryOpen=true;error.textContent='';error.classList.add('shop-modifier-error');
  dialog.id='shop-catalog-picker';dialog.className='collection-overlay';dialog.setAttribute('aria-label',label);
  const panel=el('section','','collection-panel');panel.setAttribute('aria-label',label);
  const gallery=collectionOfferGallery(panel,kind,entries,(entry)=>operation(()=>options.choose(entry.id)),'shop-catalog',offer?.catalogId);
  const back=button('Volver','shop-catalog-back',leaveGallery,'collection-back');
  panel.append(gallery.well,gallery.pagination,back,error);stage.replaceChildren(panel);dialog.replaceChildren(stage);
  focus=gallery.focus;resizeCollectionStage(stage);focus();
 }
 const resize=()=>{if(galleryOpen)resizeCollectionStage(stage);};
 const observer=new ResizeObserver(resize),viewport=document.getElementById('app-viewport');if(viewport)observer.observe(viewport);
 const route=()=>{if(location.hash!==initialHash)dialog.close();};
 window.addEventListener('hashchange',route);
 dialog.addEventListener('cancel',event=>{if(galleryOpen&&offer){event.preventDefault();renderDetails();}});
 dialog.addEventListener('click',event=>{
  if(galleryOpen){if(event.target===dialog||event.target===stage)leaveGallery();return;}
  if(event.target!==dialog)return;
  const rect=dialog.getBoundingClientRect();
  if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();
 });
 dialog.addEventListener('close',()=>{
  observer.disconnect();window.removeEventListener('hashchange',route);dialog.remove();
  if(location.hash===initialHash)options.restoreFocus();
 });
 if(offer)renderDetails();else renderGallery();
 (document.getElementById('app-shell')??document.body).append(dialog);dialog.showModal();resize();focus();
 return ()=>{if(dialog.open)sync();};
}
