import type {Fact,GameState} from '../state/model.js';
import type {ShopSnapshot} from '../advisor/shop-context.js';
import type {ShopJokerAssessment,ShopJokerPreference} from '../advisor/shop-joker-survival.js';
import {ALL_JOKER_FACTS} from '../catalog/all-joker-facts.js';
import {VOUCHER_CATALOG} from '../catalog/voucher-catalog.js';
import {BOOSTER_CATALOG} from '../catalog/booster-catalog.js';
import {engineArt,jokerArt} from './collection.js';
import {inspectShopDecision} from '../advisor/decision.js';
import {buildShopAdviceSummary} from './shop-advice-summary.js';
import {currentShopPlan} from './shop-plan-view.js';
import {observedRerollQuote} from '../rules/reroll-quote.js';
import {openShopJokerPicker,previewShopJoker} from './shop-joker-picker.js';
import {normalizeShopSnapshot} from '../rules/shop-offer-prices.js';
import {quoteShopPrice} from '../rules/shop-pricing.js';
import {jokerStickerArt} from './joker-sticker-art.js';
import {openShopCatalogPicker} from './shop-catalog-picker.js';

const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',className='')=>{const e=document.createElement(tag);e.textContent=text;e.className=className;return e;};
const value=<T>(fact:Fact<T>|undefined)=>fact?.status==='known'?fact.value:undefined;
type Binding=Pick<GameState,'runId'|'revision'>;
type Kind='joker'|'voucher'|'pack';
type JokerOffer=ShopSnapshot['jokers'][number];
type VoucherOffer=ShopSnapshot['vouchers'][number];
type PackOffer=ShopSnapshot['packs'][number];
interface GameShopOptions {
 observe(snapshot:ShopSnapshot,binding:Binding):string|null;
 observeQuote(price:number|null,binding:Binding,complete?:boolean):string|null;
 confirm(kind:Kind,offerId:string,binding:Binding):string|null;
 next(binding:Binding):string|null;
 reroll(binding:Binding):void;
 details():void;
}

/** A view of manually observed offers. Rendering and opening an editor never acquire them. */
export function mountGameShop(stage:HTMLElement,options:GameShopOptions,onAdviceChanged:()=>void){
 const section=el('section','','game-shop');section.id='game-shop';section.hidden=true;section.setAttribute('aria-label','Tienda');
 const controls=el('div','','game-shop-controls'),next=el('button','Siguiente\nronda','game-shop-next'),reroll=el('button','','game-shop-reroll');
 next.id='game-shop-next';next.type='button';reroll.id='game-shop-reroll';reroll.type='button';
 const rerollLabel=el('span','Renovar'),rerollPrice=el('b','$—');reroll.append(rerollLabel,rerollPrice);controls.append(next,reroll);
 const cards=el('div','','game-shop-card-well'),cardShelf=el('div','','game-shop-shelf');cards.append(cardShelf);cards.setAttribute('aria-label','Comodines de la tienda');
 const voucher=el('div','','game-shop-voucher-well'),voucherCaption=el('span','VALE','game-shop-voucher-caption'),voucherShelf=el('div','','game-shop-shelf');voucher.append(voucherCaption,voucherShelf);voucher.setAttribute('aria-label','Vales de la tienda');
 const packs=el('div','','game-shop-pack-well'),packShelf=el('div','','game-shop-shelf');packs.append(packShelf);packs.setAttribute('aria-label','Sobres de la tienda');
 const detail=el('button','Ver análisis de tienda','game-shop-details');detail.type='button';detail.id='game-shop-details';detail.onclick=options.details;
 const error=el('p','','game-shop-error');error.id='game-shop-error';error.setAttribute('role','alert');
 section.append(controls,cards,voucher,packs,detail,error);stage.append(section);
 let state:GameState|null=null,snapshot:ShopSnapshot={id:crypto.randomUUID(),jokers:[],vouchers:[],packs:[],rerollCost:null},writable=false,rendered='';
 let syncCatalogControls=()=>{};
 let advice:ReturnType<typeof buildShopAdviceSummary>|null=null;
 let assessment:ShopJokerAssessment|{status:'pending'}|null=null;
 let releaseWorker:(()=>void)|undefined;

 function paintPreference(preference:ShopJokerPreference|null){
  for(const button of cardShelf.querySelectorAll<HTMLButtonElement>('[data-game-shop-offer]')){
   const selected=preference?.offerId===button.dataset.gameShopOffer;
   button.title=button.dataset.offerName??'';
   button.removeAttribute('data-offer-preference');
   button.removeAttribute('aria-description');
   button.querySelector('.game-shop-preferred-mark')?.remove();
   if(selected&&preference){
    button.dataset.offerPreference='compared';
    button.title=preference.reason;
    button.setAttribute('aria-description','Comodín recomendado. '+preference.reason);
    const mark=el('span','✓','game-shop-preferred-mark');mark.setAttribute('aria-hidden','true');button.append(mark);
   }
  }
 }

 function paintControlAdvice(){
  const comparing=assessment?.status==='pending'||(assessment?.status==='ready'&&assessment.preference!==null);
  const choice=!comparing&&advice?.choices.length===1&&advice.status==='conditional'?advice.choices[0]?.id:null;
  for(const [button,id] of [[reroll,'reroll'],[next,'hold']] as const){
   button.toggleAttribute('data-advised-action',choice===id);
   if(choice===id)button.setAttribute('aria-description',advice?.planReason??advice!.title);
   else button.removeAttribute('aria-description');
  }
 }

 function cancelAdvice(){
  releaseWorker?.();releaseWorker=undefined;
  assessment=null;rendered='';
  section.setAttribute('aria-busy','false');
  paintPreference(null);
 }

 function startAssessment(current:GameState){
  const unavailable:ShopJokerAssessment={status:'unavailable',reason:'La estimación no está disponible en este momento.'};
  let worker:Worker;
  try{worker=new Worker(new URL('./shop-joker-worker.js',import.meta.url),{type:'module'});}
  catch{assessment=unavailable;return;}
  const finish=(result:ShopJokerAssessment)=>{
   if(releaseWorker!==release)return;
   release();releaseWorker=undefined;
   assessment=result;
   section.setAttribute('aria-busy','false');
   paintPreference(result.status==='ready'?result.preference:null);
   paintControlAdvice();
   onAdviceChanged();
  };
  const timer=setTimeout(()=>finish(unavailable),15_000);
  const release=()=>{clearTimeout(timer);worker.terminate();};
  releaseWorker=release;
  assessment={status:'pending'};
  section.setAttribute('aria-busy','true');
  worker.onmessage=({data}:MessageEvent<ShopJokerAssessment>)=>finish(data);
  worker.onerror=event=>{event.preventDefault();finish(unavailable);};
  worker.onmessageerror=()=>finish(unavailable);
  try{worker.postMessage(current);}
  catch{finish(unavailable);}
 }
 const fail=(message:string|null)=>{error.textContent=message??'';};
 next.onclick=()=>{if(!state||!writable)return;fail(options.next({runId:state.runId,revision:state.revision}));};
 reroll.onclick=()=>{if(state&&writable)options.reroll({runId:state.runId,revision:state.revision});};
 const readSnapshot=(current:GameState):ShopSnapshot=>{
  const shop=current.observed.shop.status==='known'?current.observed.shop.value:undefined,extras=current.schemaVersion==='0.2'&&current.observed.shop.status==='known'?current.observed.shop.value:undefined;
  return normalizeShopSnapshot(current,{id:shop?.shopId??snapshot.id,jokers:(shop?.cardOffers??[]).filter(offer=>offer.kind==='joker').map(offer=>{
   const counters=extras?.cardOffers.find(item=>item.offerId===offer.offerId)?.counters;
   const extra=extras?.cardOffers.find(item=>item.offerId===offer.offerId);
   return {offerId:offer.offerId,catalogId:offer.catalogId,price:value(offer.price)??null,edition:value(offer.edition)??'unknown',stickers:[...(value(offer.stickers)??['unknown'])],...(counters?{counters:structuredClone(counters)}:{}),...(extra?.couponed===undefined?{}:{couponed:extra.couponed})};
  }),
   vouchers:(extras?.voucherOffers??[]).map(offer=>({offerId:offer.offerId,catalogId:offer.catalogId,price:value(offer.price)??null})),
   packs:(extras?.packOffers??[]).flatMap(offer=>{const definition=BOOSTER_CATALOG.find(pack=>pack.id===offer.catalogId);return definition?[{offerId:offer.offerId,family:definition.family,size:definition.size,price:value(offer.price)??null,...(offer.couponed===undefined?{}:{couponed:offer.couponed})}]:[];}),
   rerollCost:observedRerollQuote(current)}).snapshot;
 };
 function inspect(kind:Kind,offer?:JokerOffer|VoucherOffer|PackOffer,trigger?:HTMLElement){
  if(!state)return;
  const binding={runId:state.runId,revision:state.revision},shelf=structuredClone(snapshot),offerId=offer?.offerId??crypto.randomUUID();
  if(kind==='joker'){
   const existing=offer as JokerOffer|undefined,anchor=trigger??(document.activeElement instanceof HTMLElement?document.activeElement:undefined);
   section.querySelectorAll<HTMLElement>('.shop-joker-preview').forEach(node=>node.remove());
   const recorded=state.observed.shop.status==='known'?state.observed.shop.value.cardOffers.find(item=>item.offerId===existing?.offerId):undefined;
   openShopJokerPicker({
    ...(existing?{offer:{...structuredClone(existing),price:recorded?value(recorded.price)??null:existing.price}}:{}),
    canWrite:()=>writable,
    quote:item=>{const changed=structuredClone(shelf),index=changed.jokers.findIndex(previous=>previous.offerId===item.offerId);if(index<0)changed.jokers.push(item);else changed.jokers[index]=item;const offer=normalizeShopSnapshot(state!,changed).snapshot.jokers.find(offer=>offer.offerId===item.offerId)!;const quote=quoteShopPrice(state!,{kind:'joker',catalogId:offer.catalogId,edition:offer.edition,stickers:offer.stickers,couponed:offer.couponed??false});return {price:offer.price,...(quote.price.status==='unknown'?{reason:quote.price.reason}:{})};},
    save:item=>{
     const changed=structuredClone(shelf),index=changed.jokers.findIndex(previous=>previous.offerId===item.offerId);
     if(index<0)changed.jokers.push(item);else changed.jokers[index]=item;
     const problem=options.observe(changed,binding);
     if(!problem&&existing)setTimeout(()=>{
      const updated=snapshot.jokers.find(offer=>offer.offerId===item.offerId),target=section.querySelector<HTMLElement>(`[data-game-shop-offer="${CSS.escape(item.offerId)}"]`);
      if(updated&&target&&state?.phase==='shop'){target.focus({preventScroll:true});inspect('joker',updated);}
     },0);
     return problem;
    },
    ...(existing?{
     remove:()=>{const changed=structuredClone(shelf);changed.jokers=changed.jokers.filter(item=>item.offerId!==existing.offerId);return options.observe(changed,binding);},
     buy:()=>options.confirm('joker',existing.offerId,binding)
    }:{})
   },anchor);
   return;
  }
  if(document.getElementById('shop-catalog-picker')||document.getElementById('game-shop-editor'))return;
  const selected=offer?{catalogId:'catalogId'in offer?offer.catalogId:offer.family+'-'+offer.size,price:offer.price}:undefined;
  syncCatalogControls=openShopCatalogPicker({
   kind,...(selected?{offer:selected}:{}),canWrite:()=>writable,
   choose:catalogId=>{
    if(catalogId===selected?.catalogId)return null;
    const changed=structuredClone(shelf);
    if(kind==='voucher'){
     const index=changed.vouchers.findIndex(item=>item.offerId===offerId);
     changed.vouchers.splice(index<0?changed.vouchers.length:index,index<0?0:1,{offerId,catalogId,price:null});
    }else{
     const pack=BOOSTER_CATALOG.find(item=>item.id===catalogId);
     if(!pack)return 'No se encontró el sobre en el catálogo.';
     const index=changed.packs.findIndex(item=>item.offerId===offerId);
     changed.packs.splice(index<0?changed.packs.length:index,index<0?0:1,{offerId,family:pack.family,size:pack.size,price:null});
    }
    return options.observe(changed,binding);
   },
   buy:()=>options.confirm(kind,offerId,binding),
   remove:()=>{
    const changed=structuredClone(shelf);
    if(kind==='voucher')changed.vouchers=changed.vouchers.filter(item=>item.offerId!==offerId);
    else changed.packs=changed.packs.filter(item=>item.offerId!==offerId);
    return options.observe(changed,binding);
   },
   restoreFocus:()=>{
    const tile=section.querySelector<HTMLElement>(`[data-game-shop-offer="${CSS.escape(offerId)}"]`);
    const empty=section.querySelector<HTMLElement>(`[data-game-shop-kind="${kind}"][data-game-shop-empty="true"]`);
    (tile??(trigger?.isConnected?trigger:empty)??next).focus({preventScroll:true});
   }
  });
 }
 const tile=(kind:Kind,offer?:JokerOffer|VoucherOffer|PackOffer)=>{
  const button=el('button','','game-shop-offer');button.type='button';button.dataset.gameShopKind=kind;button.dataset.gameShopEmpty=String(!offer);
  if(!offer){const label=kind==='joker'?'Comodín':kind==='voucher'?'Vale':'Sobre';button.classList.add('game-shop-empty');button.append(el('span','＋'),el('small',label));button.setAttribute('aria-label','Registrar '+label.toLowerCase()+' de la tienda');button.disabled=!writable;}
  else {
   button.dataset.gameShopOffer=offer.offerId;let name='',art:HTMLElement;
   if(kind==='joker'){const joker=offer as JokerOffer,definition=ALL_JOKER_FACTS[joker.catalogId];name=definition?.name??joker.catalogId;art=definition?jokerArt(engineArt[joker.catalogId]!,name):el('span','?','game-shop-unknown-art');}
   else if(kind==='voucher'){const item=offer as VoucherOffer;name=VOUCHER_CATALOG.find(entry=>entry.id===item.catalogId)?.name??item.catalogId;art=el('span','','voucher-art '+item.catalogId);art.setAttribute('role','img');art.setAttribute('aria-label',name);}
   else {const pack=offer as PackOffer;name=BOOSTER_CATALOG.find(entry=>entry.family===pack.family&&entry.size===pack.size)?.name??'Sobre';art=el('span','','booster-art pack-'+pack.family+'-'+pack.size);art.setAttribute('role','img');art.setAttribute('aria-label',name);}
   const portrait=el('span','','game-shop-offer-art');
   if(kind==='joker'){portrait.classList.add('shop-joker-art');portrait.dataset.jokerEdition=(offer as JokerOffer).edition;}
   portrait.append(art);
   if(kind==='joker')for(const id of (offer as JokerOffer).stickers){const sticker=jokerStickerArt(id);if(sticker)portrait.append(sticker);}
   const price=el('strong',offer.price===null?'$?':'$'+offer.price,'game-shop-price-tag');button.append(price,portrait);button.setAttribute('aria-label',`${name} · ${offer.price===null?'precio desconocido':'$'+offer.price}`);button.title=name;
   button.dataset.offerName=name;
  }
  button.onclick=()=>inspect(kind,kind==='joker'&&offer?snapshot.jokers.find(item=>item.offerId===offer.offerId):offer,button);
  if(kind==='joker'&&offer){
   const wrapper=el('div','','game-shop-joker');wrapper.dataset.jokerOffer=offer.offerId;wrapper.append(button);
   let stopPreview:(()=>void)|undefined;
   const hide=()=>{stopPreview?.();stopPreview=undefined;};
   const show=()=>{hide();const current=snapshot.jokers.find(item=>item.offerId===offer.offerId);if(current&&!document.getElementById('shop-joker-inline'))stopPreview=previewShopJoker(current,button);};
   button.onpointerenter=event=>{if(event.pointerType!=='touch')show();};button.onpointerleave=hide;button.onfocus=show;button.onblur=hide;
   return wrapper;
  }
  return button;
 };
 function refresh(current:GameState,canWrite:boolean,dirty:boolean){
  state=current;writable=canWrite&&current.phase==='shop';next.disabled=!writable;reroll.disabled=!writable;
  section.querySelectorAll<HTMLButtonElement>('[data-game-shop-empty="true"]').forEach(button=>button.disabled=!writable);
  syncCatalogControls();
  const plan=currentShopPlan(current),token=JSON.stringify([current,dirty,plan]);if(token===rendered)return;
  cancelAdvice();rendered=token;snapshot=readSnapshot(current);
  const saved=current.observed.shop.status==='known'?current.observed.shop.value:undefined;
  const hasOffers=snapshot.jokers.length||snapshot.vouchers.length||snapshot.packs.length||saved?.cardOffers.length||saved?.ignoredOtherOffers.length||
   (current.schemaVersion==='0.2'&&current.observed.shop.status==='known'&&current.observed.shop.value.packOffers?.length);
  const result=!dirty&&(hasOffers||plan)?inspectShopDecision(current,snapshot,plan?{shopPlan:plan}:{}):null;
  advice=result?.ok?buildShopAdviceSummary(result.value):null;
  error.textContent='';rerollPrice.textContent=snapshot.rerollCost===null?'$—':'$'+snapshot.rerollCost;reroll.title=snapshot.rerollCost===null?'Registra la renovación con el saldo que ves en Balatro.':`Registrar renovación · $${snapshot.rerollCost}`;
  const selected=cardShelf.querySelector<HTMLElement>('.game-shop-joker.is-selected'),selectedId=selected?.dataset.jokerOffer;
  if(selected&&!snapshot.jokers.some(offer=>offer.offerId===selectedId))(selected.querySelector('dialog') as HTMLDialogElement|null)?.close();
  cardShelf.replaceChildren();voucherShelf.replaceChildren();packShelf.replaceChildren();
  for(const offer of snapshot.jokers){
   if(selected&&offer.offerId===selectedId){
    const price=selected.querySelector('.game-shop-price-tag'),art=selected.querySelector<HTMLElement>('.shop-joker-art');
    if(price)price.textContent=offer.price===null?'$?':'$'+offer.price;if(art)art.dataset.jokerEdition=offer.edition;
    art?.querySelectorAll('.joker-sticker-art').forEach(node=>node.remove());
    if(art)for(const id of offer.stickers){const sticker=jokerStickerArt(id);if(sticker)art.append(sticker);}
    cardShelf.append(selected);
   }else cardShelf.append(tile('joker',offer));
  }
  for(let i=snapshot.jokers.length;i<2;i++)cardShelf.append(tile('joker'));
  for(const offer of snapshot.vouchers)voucherShelf.append(tile('voucher',offer));if(!snapshot.vouchers.length)voucherShelf.append(tile('voucher'));
  for(const offer of snapshot.packs)packShelf.append(tile('pack',offer));for(let i=snapshot.packs.length;i<2;i++)packShelf.append(tile('pack'));
  const origin=current.schemaVersion==='0.2'&&current.phase==='shop'?value(current.phaseData.origin):undefined;voucherCaption.textContent=(origin?'ANTE '+origin.ante+' · ':'')+'VALE';
  if(!dirty&&current.phase==='shop'&&snapshot.jokers.length&&plan?.need!=='save')startAssessment(current);
  paintControlAdvice();
 }
 return {refresh,cancelAdvice,focus:()=>next.focus({preventScroll:true}),advice:()=>advice,assessment:()=>assessment};
}
