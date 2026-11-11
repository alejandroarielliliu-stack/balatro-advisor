import type {Fact,GameState} from '../state/model.js';
import type {ShopSnapshot} from '../advisor/shop-context.js';
import {ALL_JOKER_FACTS} from '../catalog/all-joker-facts.js';
import {VOUCHER_CATALOG} from '../catalog/voucher-catalog.js';
import {BOOSTER_CATALOG} from '../catalog/booster-catalog.js';
import {engineArt,jokerArt} from './collection.js';
import {inspectShopDecision} from '../advisor/decision.js';
import {buildShopAdviceSummary,comparedShopPurchase} from './shop-advice-summary.js';
import {currentShopPlan} from './shop-plan-view.js';
import {observedRerollQuote} from '../rules/reroll-quote.js';

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
export function mountGameShop(stage:HTMLElement,options:GameShopOptions){
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
 const editor=el('dialog','','game-shop-editor');editor.id='game-shop-editor';editor.setAttribute('aria-label','Oferta observada en la tienda');section.append(editor);
 let state:GameState|null=null,snapshot:ShopSnapshot={id:crypto.randomUUID(),jokers:[],vouchers:[],packs:[],rerollCost:null},writable=false,rendered='';
 let returnOffer='',returnKind:Kind='joker';
 let advice:ReturnType<typeof buildShopAdviceSummary>|null=null,preferred:ReturnType<typeof comparedShopPurchase>=null;
 const fail=(message:string|null)=>{error.textContent=message??'';};
 next.onclick=()=>{if(!state||!writable)return;fail(options.next({runId:state.runId,revision:state.revision}));};
 reroll.onclick=()=>{if(state&&writable)options.reroll({runId:state.runId,revision:state.revision});};
 editor.addEventListener('click',event=>{if(event.target===editor){const r=editor.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)editor.close();}});
 editor.addEventListener('close',()=>{const target=returnOffer?section.querySelector<HTMLElement>(`[data-game-shop-offer="${CSS.escape(returnOffer)}"]`):section.querySelector<HTMLElement>(`[data-game-shop-kind="${returnKind}"][data-game-shop-empty="true"]`);(target??next).focus({preventScroll:true});});
 const readSnapshot=(current:GameState):ShopSnapshot=>{
  const shop=current.observed.shop.status==='known'?current.observed.shop.value:undefined,extras=current.schemaVersion==='0.2'&&current.observed.shop.status==='known'?current.observed.shop.value:undefined;
  return {id:shop?.shopId??snapshot.id,jokers:(shop?.cardOffers??[]).filter(offer=>offer.kind==='joker').map(offer=>({offerId:offer.offerId,catalogId:offer.catalogId,price:value(offer.price)??null,edition:value(offer.edition)??'unknown',stickers:[...(value(offer.stickers)??['unknown'])]})),
   vouchers:(extras?.voucherOffers??[]).map(offer=>({offerId:offer.offerId,catalogId:offer.catalogId,price:value(offer.price)??null})),
   packs:(extras?.packOffers??[]).flatMap(offer=>{const definition=BOOSTER_CATALOG.find(pack=>pack.id===offer.catalogId);return definition?[{offerId:offer.offerId,family:definition.family,size:definition.size,price:value(offer.price)??null}]:[];}),
   rerollCost:observedRerollQuote(current)};
 };
 function inspect(kind:Kind,offer?:JokerOffer|VoucherOffer|PackOffer){
  if(!state)return;
  const binding={runId:state.runId,revision:state.revision},shelf=structuredClone(snapshot),offerId=offer?.offerId??crypto.randomUUID();
  returnOffer=offer?.offerId??'';returnKind=kind;editor.replaceChildren();
  const title=el('h2',kind==='joker'?'Comodín de la tienda':kind==='voucher'?'Vale de la tienda':'Sobre de la tienda');title.id='game-shop-editor-title';editor.setAttribute('aria-labelledby',title.id);
  const close=el('button','Cerrar','game-shop-editor-close');close.type='button';close.id='game-shop-close';close.onclick=()=>editor.close();
  const heading=el('div','','game-shop-editor-heading');heading.append(title,close);editor.append(heading);
  const catalogLabel=el('label',kind==='joker'?'Comodín':kind==='voucher'?'Vale':'Sobre'),catalog=el('select');catalog.id='game-shop-catalog';catalog.setAttribute('aria-label',catalogLabel.textContent!);const empty=el('option','Seleccionar');empty.value='';catalog.append(empty);
  const choices=kind==='joker'?Object.entries(ALL_JOKER_FACTS).map(([id,entry])=>({id,name:entry.name})):kind==='voucher'?VOUCHER_CATALOG:BOOSTER_CATALOG;
  for(const choice of choices){const option=el('option',choice.name);option.value=choice.id;catalog.append(option);}catalogLabel.append(catalog);editor.append(catalogLabel);
  catalog.value=offer?('catalogId'in offer?offer.catalogId:offer.family+'-'+offer.size):'';
  const priceLabel=el('label','Precio observado ($)'),price=el('input');price.id='game-shop-price';price.type='number';price.inputMode='numeric';price.step='1';price.min='0';price.value=offer?.price===null||!offer?'':String(offer.price);price.placeholder='Desconocido';priceLabel.append(price);editor.append(priceLabel);
  const editionLabel=el('label','Edición'),edition=el('select');edition.id='game-shop-edition';edition.setAttribute('aria-label','Edición de la oferta');
  for(const [id,name]of [['base','Base'],['foil','Laminada'],['holographic','Holográfica'],['polychrome','Policroma'],['negative','Negativa'],['unknown','Desconocida']]){const option=el('option',name);option.value=id!;edition.append(option);}edition.value=offer&&'edition'in offer?offer.edition:'base';editionLabel.append(edition);
  const stickerBox=el('fieldset','','game-shop-stickers');stickerBox.append(el('legend','Pegatinas observadas'));const stickers=new Map<string,HTMLInputElement>();
  for(const [id,name]of [['eternal','Eterno'],['perishable','Perecedero'],['rental','Alquiler'],['unknown','Desconocidas']]){const label=el('label'),input=el('input');input.type='checkbox';input.value=id!;input.checked=!!offer&&'stickers'in offer&&offer.stickers.includes(id!);label.append(input,el('span',name));stickerBox.append(label);stickers.set(id!,input);}
  if(kind==='joker')editor.append(editionLabel,stickerBox);
  const note=el('p','Registrar una oferta no compra el artículo. Introduce lo que ves en Balatro.','game-shop-editor-note');
  const why=el('p','','game-shop-editor-note');why.hidden=true;
  const editorError=el('p','','game-shop-editor-error');editorError.id='game-shop-editor-error';editorError.setAttribute('role','alert');
  const actions=el('div','','game-shop-editor-actions'),save=el('button','Guardar oferta'),buy=el('button',kind==='pack'?'Abrir sobre':'Comprar'),remove=el('button','Quitar oferta','game-shop-editor-remove');
  save.id='game-shop-save';buy.id='game-shop-buy';remove.id='game-shop-remove';for(const button of [save,buy,remove])button.type='button';
  const originalCatalog=catalog.value,originalPrice=price.value,originalEdition=edition.value,originalStickers=JSON.stringify([...stickers].filter(([,input])=>input.checked).map(([key])=>key));
  const updateControls=()=>{
   save.disabled=!writable;remove.disabled=!writable||!offer;
   const changed=catalog.value!==originalCatalog||price.value!==originalPrice||kind==='joker'&&(edition.value!==originalEdition||JSON.stringify([...stickers].filter(([,input])=>input.checked).map(([key])=>key))!==originalStickers);
   buy.disabled=!writable||!offer||changed;buy.title=changed?'Guarda la oferta antes de registrar su compra.':!offer?'Guarda primero la oferta.':'';
   why.hidden=changed||!preferred||preferred.offerId!==offerId||state?.revision!==binding.revision||state?.runId!==binding.runId;
   why.textContent=why.hidden?'':preferred!.reason;
  };
  editor.oninput=updateControls;editor.onchange=updateControls;
  const observe=(changed:ShopSnapshot)=>{const problem=options.observe(changed,binding);if(problem){editorError.textContent=problem;updateControls();return;}editor.close();};
  save.onclick=()=>{
   const amount=price.value.trim()===''?null:Number(price.value);if(amount!==null&&(!Number.isSafeInteger(amount)||amount<0)){editorError.textContent='Introduce un precio entero no negativo o déjalo desconocido.';price.focus();return;}
   if(!choices.some(choice=>choice.id===catalog.value)){editorError.textContent='Selecciona el artículo que ves en la tienda.';catalog.focus();return;}
   const changed=structuredClone(shelf);
   if(kind==='joker'){const checked=[...stickers].filter(([,input])=>input.checked).map(([key])=>key);if(checked.includes('unknown')&&checked.length>1){editorError.textContent='Indica las pegatinas que conoces o marca Desconocidas.';return;}const item:JokerOffer={offerId,catalogId:catalog.value,price:amount,edition:edition.value,stickers:checked};const index=changed.jokers.findIndex(item=>item.offerId===offerId);if(index<0)changed.jokers.push(item);else changed.jokers[index]=item;}
   else if(kind==='voucher'){const item:VoucherOffer={offerId,catalogId:catalog.value,price:amount},index=changed.vouchers.findIndex(item=>item.offerId===offerId);if(index<0)changed.vouchers.push(item);else changed.vouchers[index]=item;}
   else {const pack=BOOSTER_CATALOG.find(pack=>pack.id===catalog.value)!;const item:PackOffer={offerId,family:pack.family,size:pack.size,price:amount},index=changed.packs.findIndex(item=>item.offerId===offerId);if(index<0)changed.packs.push(item);else changed.packs[index]=item;}
   observe(changed);
  };
  remove.onclick=()=>{const changed=structuredClone(shelf);if(kind==='joker')changed.jokers=changed.jokers.filter(item=>item.offerId!==offerId);else if(kind==='voucher')changed.vouchers=changed.vouchers.filter(item=>item.offerId!==offerId);else changed.packs=changed.packs.filter(item=>item.offerId!==offerId);observe(changed);};
  buy.onclick=()=>{const problem=options.confirm(kind,offerId,binding);if(problem){editorError.textContent=problem;return;}editor.close();};
  actions.append(save);if(offer)actions.append(buy,remove);editor.append(note,why,editorError,actions);updateControls();editor.showModal();catalog.focus({preventScroll:true});
 }
 const tile=(kind:Kind,offer?:JokerOffer|VoucherOffer|PackOffer)=>{
  const button=el('button','','game-shop-offer');button.type='button';button.dataset.gameShopKind=kind;button.dataset.gameShopEmpty=String(!offer);
  if(!offer){const label=kind==='joker'?'Comodín':kind==='voucher'?'Vale':'Sobre';button.classList.add('game-shop-empty');button.append(el('span','＋'),el('small',label));button.setAttribute('aria-label','Registrar '+label.toLowerCase()+' de la tienda');button.disabled=!writable;}
  else {
   button.dataset.gameShopOffer=offer.offerId;let name='',art:HTMLElement;
   if(kind==='joker'){const joker=offer as JokerOffer,definition=ALL_JOKER_FACTS[joker.catalogId];name=definition?.name??joker.catalogId;art=definition?jokerArt(engineArt[joker.catalogId]!,name):el('span','?','game-shop-unknown-art');}
   else if(kind==='voucher'){const item=offer as VoucherOffer;name=VOUCHER_CATALOG.find(entry=>entry.id===item.catalogId)?.name??item.catalogId;art=el('span','','voucher-art '+item.catalogId);art.setAttribute('role','img');art.setAttribute('aria-label',name);}
   else {const pack=offer as PackOffer;name=BOOSTER_CATALOG.find(entry=>entry.family===pack.family&&entry.size===pack.size)?.name??'Sobre';art=el('span','','booster-art pack-'+pack.family+'-'+pack.size);art.setAttribute('role','img');art.setAttribute('aria-label',name);}
   const portrait=el('span','','game-shop-offer-art');portrait.append(art);const price=el('strong',offer.price===null?'$?':'$'+offer.price,'game-shop-price-tag');button.append(price,portrait);button.setAttribute('aria-label',`${name} · ${offer.price===null?'precio desconocido':'$'+offer.price}`);button.title=name;
   if(preferred?.offerId===offer.offerId){
    button.dataset.offerPreference=preferred.partial?'conditional':'compared';button.title=preferred.reason;
    button.setAttribute('aria-description','Comodín preferido entre las compras comparadas. '+preferred.reason);
    const mark=el('span',preferred.partial?'?':'✓','game-shop-preferred-mark');mark.setAttribute('aria-hidden','true');button.append(mark);
   }
  }
  button.onclick=()=>inspect(kind,offer);return button;
 };
 function refresh(current:GameState,canWrite:boolean,dirty:boolean){
  state=current;writable=canWrite&&current.phase==='shop';next.disabled=!writable;reroll.disabled=!writable;
  section.querySelectorAll<HTMLButtonElement>('[data-game-shop-empty="true"]').forEach(button=>button.disabled=!writable);
  if(editor.open)editor.dispatchEvent(new Event('input'));
  const plan=currentShopPlan(current),token=JSON.stringify([current,dirty,plan]);if(token===rendered)return;rendered=token;snapshot=readSnapshot(current);
  const saved=current.observed.shop.status==='known'?current.observed.shop.value:undefined;
  const hasOffers=snapshot.jokers.length||snapshot.vouchers.length||snapshot.packs.length||saved?.cardOffers.length||saved?.ignoredOtherOffers.length||
   (current.schemaVersion==='0.2'&&current.observed.shop.status==='known'&&current.observed.shop.value.packOffers?.length);
  const result=!dirty&&(hasOffers||plan)?inspectShopDecision(current,snapshot,plan?{shopPlan:plan}:{}):null;
  advice=result?.ok?buildShopAdviceSummary(result.value):null;
  preferred=result?.ok?comparedShopPurchase(result.value):null;
  if(editor.open)editor.dispatchEvent(new Event('input'));
  const choice=advice?.choices.length===1&&advice.status==='conditional'?advice.choices[0]?.id:null;
  for(const [button,id] of [[reroll,'reroll'],[next,'hold']] as const){
   button.toggleAttribute('data-advised-action',choice===id);
   if(choice===id)button.setAttribute('aria-description',advice?.planReason??advice!.title);else button.removeAttribute('aria-description');
  }
  error.textContent='';rerollPrice.textContent=snapshot.rerollCost===null?'$—':'$'+snapshot.rerollCost;reroll.title=snapshot.rerollCost===null?'Coste de renovación sin registrar. Transcribe lo que ocurrió en Balatro.':'Registrar una renovación realizada en Balatro; coste observado $'+snapshot.rerollCost;
  cardShelf.replaceChildren();voucherShelf.replaceChildren();packShelf.replaceChildren();
  for(const offer of snapshot.jokers)cardShelf.append(tile('joker',offer));for(let i=snapshot.jokers.length;i<2;i++)cardShelf.append(tile('joker'));
  for(const offer of snapshot.vouchers)voucherShelf.append(tile('voucher',offer));if(!snapshot.vouchers.length)voucherShelf.append(tile('voucher'));
  for(const offer of snapshot.packs)packShelf.append(tile('pack',offer));for(let i=snapshot.packs.length;i<2;i++)packShelf.append(tile('pack'));
  const origin=current.schemaVersion==='0.2'&&current.phase==='shop'?value(current.phaseData.origin):undefined;voucherCaption.textContent=(origin?'ANTE '+origin.ante+' · ':'')+'VALE';
 }
 return {refresh,focus:()=>next.focus({preventScroll:true}),advice:()=>advice};
}
