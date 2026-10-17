import {jokerArt} from './collection.js';
import type {JokerCollection,JokerReference} from '../catalog/collection.js';
import type {PreviewRenderer} from './joker-bay.js';
import type {GameState} from '../state/model.js';
import {VOUCHER_CATALOG} from '../catalog/voucher-catalog.js';
import {BOOSTER_CATALOG} from '../catalog/booster-catalog.js';
import {inspectShopDecision} from '../advisor/decision.js';
import type {ShopDecision,OperationStatus} from '../advisor/decision.js';
import type {ShopSnapshot} from '../advisor/shop-context.js';
import {ALL_JOKER_FACTS} from '../catalog/all-joker-facts.js';
import type {AdvisorScenario} from '../advisor/advisor.js';
import {renderImmediateConsequences,renderScenarioConsequences} from './consequences-view.js';

const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',cl='')=>{const e=document.createElement(tag);e.textContent=text;e.className=cl;return e;};
const known=<T>(value:T)=>({status:'known' as const,source:'manual' as const,value});
const priceValue=(input:HTMLInputElement)=>input.value.trim()===''?null:Number(input.value);
export interface ShopContext {
 state:()=>GameState;recordedState?:()=>GameState|undefined;ante:()=>number;changed?:()=>void;
 scenarios?:()=>AdvisorScenario[];
 /** Transcribe visible joker offers; this is not an acquisition. */
 observe?:(snapshot:ShopSnapshot,scope?:'all'|'voucher')=>string|null;
 /** Opens the explicit performed-action confirmation, separate from consultation. */
 confirm?:(offerId:string,replacementId:string)=>string|null;
 confirmVoucher?:(offerId:string)=>string|null;
 undo?:()=>string|null;canUndo?:()=>boolean;status?:()=>string|null;
 controlsChanged?:()=>void;
}
interface ListedJoker {joker:JokerReference;offerId:string;sellId:string;price:number|null;edition:string;stickers:string[]}
// Recorded joker/voucher shelf; packs, other cards and replacement choices remain hypothetical.
const candidates:ListedJoker[]=[],voucherOffers:ShopSnapshot['vouchers']=[],packOffers:ShopSnapshot['packs']=[],otherOffers:NonNullable<ShopSnapshot['others']>=[];
let rerollCost:number|null=null,binding:string|undefined,shelfBinding:string|undefined,mountId=0,shopId='mesa-shop';
const catalogId=(joker:JokerReference)=>Object.keys(ALL_JOKER_FACTS).find(id=>ALL_JOKER_FACTS[id]!.artId===joker.id)??joker.id;
export const readShopSnapshot=():ShopSnapshot=>({id:shopId,jokers:candidates.map(c=>({offerId:c.offerId,catalogId:catalogId(c.joker),price:c.price,edition:c.edition,stickers:[...c.stickers],...(c.sellId?{replacementId:c.sellId}:{})})),vouchers:structuredClone(voucherOffers),packs:structuredClone(packOffers),others:structuredClone(otherOffers),rerollCost});
let invalidate=()=>{};let timer:ReturnType<typeof setTimeout>|undefined;
export function invalidateCandidates(){invalidate();}
export function mountCandidates(host:HTMLElement,preview:PreviewRenderer,replacements:()=>{id:string;name:string}[],context?:ShopContext){
 const mounted=++mountId;
 let hydrated=false,vouchersHydrated=false;
 const loadingMessage='La tienda se está recuperando. Inténtalo de nuevo en un momento.';
 clearTimeout(timer);host.id='joker-candidates';host.className='candidate-panel storefront';
 host.addEventListener('click',e=>e.stopPropagation());host.addEventListener('input',e=>e.stopPropagation());host.addEventListener('change',e=>e.stopPropagation());
 // A price edit must never submit the real-state form through implicit Enter.
 host.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target instanceof HTMLInputElement)e.preventDefault();});
 const changed=()=>context?.changed?.();
 candidates.length=0;voucherOffers.length=0;shopId='mesa-shop';
 try{const state=context?.recordedState?.()??context?.state(),id=state?.runId,nextShop=state?.observed.shop.status==='known'?state.observed.shop.value.shopId:undefined;if(binding&&id&&binding!==id||shelfBinding!==undefined&&shelfBinding!==nextShop){voucherOffers.length=0;packOffers.length=0;otherOffers.length=0;rerollCost=null;}binding=id;shelfBinding=nextShop;if(nextShop)shopId=nextShop;voucherOffers.push(...(state?.schemaVersion==='0.2'&&state.observed.shop.status==='known'?state.observed.shop.value.voucherOffers??[]:[]).filter(v=>VOUCHER_CATALOG.some(entry=>entry.id===v.catalogId)).map(v=>({offerId:v.offerId,catalogId:v.catalogId,price:v.price.status==='known'?v.price.value:null})));vouchersHydrated=!!state;}catch{ /* Data errors remain visible in the advice. */ }
 const heading=el('div','','section-title');heading.append(el('h2','Tienda'));
 const status=el('p','','muted');status.id='shop-session-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
 const showStatus=(message:string|null,error=false)=>{status.textContent=message??'';status.className=error?'error':'muted';};
 const write=(button:HTMLButtonElement)=>{button.dataset.write='';return button;};
 const localDisabled=(control:HTMLButtonElement,disabled:boolean)=>{control.dataset.localDisabled=String(disabled);control.disabled=disabled;};
 const undo=write(el('button','Deshacer','secondary'));undo.type='button';undo.id='shop-undo';
 const refreshUndo=()=>{undo.hidden=!context?.undo;localDisabled(undo,!context?.canUndo?.());context?.controlsChanged?.();};
 undo.onclick=()=>{const error=context?.undo?.()??null;if(error)showStatus(error,true);refreshUndo();};heading.append(undo);refreshUndo();
 // A failed observation restores the cache. Opening details and evaluating never call this.
 const observe=(mutate:()=>void,scope:'all'|'voucher'='all'):string|null=>{if(!(scope==='voucher'?vouchersHydrated:hydrated)){showStatus(loadingMessage,true);return loadingMessage;}const before=candidates.map(c=>({item:c,values:{...c,stickers:[...c.stickers]}})),beforeVouchers=structuredClone(voucherOffers);mutate();let error:string|null=null;try{error=context?.observe?.(readShopSnapshot(),scope)??null;}catch{error='No se pudieron guardar las ofertas. Se conserva la versión anterior.';}if(error){for(const previous of before)Object.assign(previous.item,previous.values);candidates.splice(0,candidates.length,...before.map(previous=>previous.item));voucherOffers.splice(0,voucherOffers.length,...beforeVouchers);showStatus(error,true);return error;}showStatus(context?.observe?'Ofertas guardadas.':null);changed();refreshUndo();return null;};
 const search=el('button','Buscar comodín','store-search');search.type='button';search.id='store-joker-add';search.onclick=()=>{const input=document.getElementById('bay-search') as HTMLInputElement;input?.scrollIntoView({block:'center',behavior:'smooth'});input?.focus({preventScroll:true});};
 const suggestion=el('button','Registra las ofertas','shop-recommendation');suggestion.type='button';suggestion.id='shop-recommendation';suggestion.setAttribute('aria-haspopup','dialog');
 const layout=el('div','','store-layout'),controls=el('div','','store-controls'),cards=el('div','','store-card-well');controls.append(search,suggestion);
 const grid=el('div','','candidate-grid'),otherShelf=el('div','','store-other-shelf'),extras=el('div','','store-extras');cards.append(grid,otherShelf);layout.append(controls,cards,extras);
 const adviceDialog=el('dialog','','shop-advice-dialog');adviceDialog.id='shop-advice-dialog';adviceDialog.setAttribute('aria-label','Decisión de tienda');
 const editor=el('dialog','','store-item-editor');editor.id='store-item-editor';editor.setAttribute('aria-label','Registrar oferta');
 host.append(heading,status,layout,adviceDialog,editor);
 let report:ShopDecision['context']|null=null,decision:ShopDecision|null=null,useScenarios=false,scenarioError='';
 const snapshot=readShopSnapshot;
 const renderAdvice=()=>{
  adviceDialog.replaceChildren();const close=el('button','Cerrar','secondary');close.type='button';close.onclick=()=>adviceDialog.close();const header=el('div','','section-title');header.append(el('h2','Decisión de tienda'),close);adviceDialog.append(header);
  if(!report){adviceDialog.append(el('p','Revisa los datos de la partida.'));return;}
  const contextual=el('div');contextual.append(el('h3',report.recommendation.title));for(const text of report.recommendation.reasons)contextual.append(el('p',text));
  if(useScenarios&&decision&&decision.scenarioConsequences.status!=='not_assessed'){const details=el('details');details.append(el('summary','Valoración por composición'),contextual);adviceDialog.append(details);}else adviceDialog.append(contextual);
  const scenarioControls=el('div','','toolbar'),toggle=el('button',useScenarios?'Solo valoración':'Comparar escenarios de Análisis','secondary');toggle.type='button';toggle.id='store-scenarios';toggle.onclick=()=>{useScenarios=!useScenarios;refreshAdvice();};const edit=el('a','Editar escenarios');edit.href='#evaluation';edit.onclick=()=>adviceDialog.close();scenarioControls.append(toggle,edit);adviceDialog.append(scenarioControls);
  if(scenarioError)adviceDialog.append(el('p',scenarioError,'error'));
  if(decision)adviceDialog.append(renderScenarioConsequences(decision.scenarioConsequences,action=>{
   if(action.type==='hold')return 'Conservar';if(action.type==='sell'){const sold=decision?.actions.find(a=>a.action.type==='sell'&&a.action.instanceId===action.instanceId)?.consequences?.removed[0];return 'Vender '+(sold?ALL_JOKER_FACTS[sold.catalogId]?.name??sold.catalogId:action.instanceId);}
   return (action.type==='replace'?'Reemplazar por ':'Comprar ')+(report?.options.find(o=>o.id===action.offerId)?.title??action.offerId);
  }));
  if(decision?.questions.length){const details=el('details');details.id='decision-questions';details.append(el('summary',`Datos pendientes · ${decision.questions.length}`));for(const question of decision.questions)details.append(el('p',question.message));adviceDialog.append(details);}
  for(const option of report.options){if(option.kind==='reroll')continue;const row=el('article','','store-advice-option');row.dataset.adviceOffer=option.id;row.dataset.kind=option.kind;row.dataset.affordability=option.affordability;row.dataset.coverage=option.coverage;row.dataset.recommended=String(report.recommendation.status!=='abstain'&&report.recommendation.offerIds.includes(option.id));row.append(el('b',option.title));
   if(option.moneyAfter!==null)row.append(el('small',`Saldo $${option.moneyAfter}${option.price!==null?' · coste $'+option.price:''}`));const changes=(option.kind==='voucher'?decision?.voucherActions:decision?.actions)?.find(a=>a.optionId===option.id)?.consequences;if(changes)row.append(renderImmediateConsequences(changes));for(const reason of option.reasons)row.append(el('p',reason));
   {const d=el('details');d.append(el('summary','Cobertura'));const action=(option.kind==='voucher'?decision?.voucherActions:decision?.actions)?.find(a=>a.optionId===option.id),labels:Record<OperationStatus,string>={available:'Validación disponible',provisional:'H2: cálculo provisional',missing_data:'H2: faltan datos',pending_evidence:'H2: falta evidencia de partida',illegal:'H2: acción ilegal',unsupported:'H2: fuera de cobertura',invalid:'H2: datos inválidos'};
    const capability=el('p',action?labels[action.status]+(action.confirmation==='explicit_confirmation_required'?' · Registrar requiere confirmación.':' · No se puede confirmar esta acción.'):'La adquisición de esta categoría no está integrada.');capability.dataset.operationStatus=action?.status??'unsupported';d.append(capability);
    if(option.fit)d.append(el('p','Encaje heurístico; no es puntuación de una mano.'));for(const reason of option.limitations)d.append(el('p',reason));row.append(d);}adviceDialog.append(row);
  }
  if(report.limitations.length){const d=el('details');d.append(el('summary','Límites de esta comparación'));for(const text of report.limitations)d.append(el('p',text));adviceDialog.append(d);}for(const error of report.errors)adviceDialog.append(el('p',error.message,'error'));
 };
 const refreshAdvice=()=>{const hasOffers=candidates.length+voucherOffers.length+packOffers.length+otherOffers.length>0;suggestion.disabled=!hasOffers;try{if(!context)throw Error();let scenarios:AdvisorScenario[]|undefined;scenarioError='';if(useScenarios)try{scenarios=context.scenarios?.();if(!scenarios?.length)throw Error('No hay escenarios. Configúralos en Análisis; la valoración rápida sigue disponible.');}catch(e){scenarios=undefined;scenarioError=e instanceof Error?e.message:'Revisa los escenarios de Análisis.';}const inspected=inspectShopDecision(context.state(),snapshot(),{ante:context.ante(),...(scenarios?{scenarios}:{})});if(!inspected.ok)throw Error();decision=inspected.value;report=decision.context;suggestion.textContent=hasOffers?report.recommendation.title:'Consejo de tienda';suggestion.dataset.status=hasOffers?report.recommendation.status:'abstain';}catch{report=null;decision=null;suggestion.textContent='Revisa los datos';suggestion.dataset.status='abstain';}if(adviceDialog.open)renderAdvice();};
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
  const updateDescription=()=>{const v=VOUCHER_CATALOG.find(v=>v.id===select.value),p=BOOSTER_CATALOG.find(p=>p.id===select.value);description.textContent=kind==='voucher'?v?.description??'':kind==='pack'&&p?`${p.offered} cartas · elige ${p.choose}. Contenido desconocido antes de abrir.`:'Efecto sin valoración automática en esta entrega.';};
  editor.append(el('p',kind==='voucher'?'Registrar la oferta no la compra. Confirma «Compré» solo después de hacerlo en Balatro.':'Solo consulta en esta sesión; no registra compras de estos artículos.','muted'));
  const error=el('p','','error');error.id='store-item-error';error.setAttribute('role','status');
  const save=el('button',old?'Guardar oferta':'Registrar oferta',old?'secondary':'');save.id='store-item-save';save.type='button';
  const confirmed=write(el('button','Compré'));confirmed.type='button';confirmed.dataset.voucherConfirm=offerId??'';
  const confirmationNote=el('p','','muted'),consequences=el('div');confirmationNote.id='voucher-confirm-note';confirmed.setAttribute('aria-describedby',confirmationNote.id);
  const refreshConfirm=()=>{
   if(kind!=='voucher')return;refreshAdvice();
   const probe=decision?.voucherActions.find(v=>v.optionId===offerId);
   const saved=!!old&&'catalogId'in old&&select.value===old.catalogId&&priceValue(price.input)===old.price;
   const reason=!saved?'Guarda la oferta antes de confirmar la compra.':context?.status?.()??(!context?.confirmVoucher?'La confirmación no está disponible.':probe?.confirmation!=='explicit_confirmation_required'?(probe?.errors.map(e=>e.message).join(' ')||'Revisa los datos de esta oferta.'):null);
   localDisabled(confirmed,!!reason);confirmationNote.textContent=reason??'Compra provisional por inspección del ejecutable; falta contraste en partida.';
   consequences.replaceChildren();if(probe?.consequences&&saved)consequences.append(renderImmediateConsequences(probe.consequences));context?.controlsChanged?.();
  };
  select.onchange=()=>{price.input.value=kind==='voucher'?'10':String(BOOSTER_CATALOG.find(p=>p.id===select.value)?.basePrice??'');updateDescription();refreshConfirm();};price.input.oninput=refreshConfirm;updateDescription();
  save.onclick=()=>{const amount=priceValue(price.input);if(amount!==null&&(!Number.isSafeInteger(amount)||amount<0)){error.textContent='Introduce un precio entero no negativo o déjalo desconocido.';return;}const id=offerId??crypto.randomUUID();
   if(kind==='voucher'){
    if(!VOUCHER_CATALOG.some(v=>v.id===select.value)){error.textContent='Elige el vale.';return;}
    const failure=observe(()=>{const index=voucherOffers.findIndex(o=>o.offerId===id),offer={offerId:id,catalogId:select.value,price:amount};if(index<0)voucherOffers.push(offer);else voucherOffers[index]=offer;},'voucher');
    if(failure){error.textContent=failure;refreshConfirm();return;}
   }else if(kind==='pack'){const p=BOOSTER_CATALOG.find(p=>p.id===select.value);if(!p){error.textContent='Elige el sobre.';return;}const index=packOffers.findIndex(o=>o.offerId===id),offer={offerId:id,family:p.family,size:p.size,price:amount};if(index<0)packOffers.push(offer);else packOffers[index]=offer;}
   else{if(!name.value.trim()){error.textContent='Introduce el nombre.';return;}const index=otherOffers.findIndex(o=>o.offerId===id),offer={offerId:id,kind:type.value as NonNullable<ShopSnapshot['others']>[number]['kind'],name:name.value.trim(),price:amount};if(index<0)otherOffers.push(offer);else otherOffers[index]=offer;}
   editor.close();if(kind!=='voucher'){showStatus('Sobres y otras cartas: solo consulta en esta sesión.');changed();}renderExtras();refreshAdvice();context?.controlsChanged?.();
  };
  confirmed.onclick=()=>{const failure=context?.confirmVoucher?.(offerId!)??null;if(failure)error.textContent=failure;refreshUndo();};
  editor.append(error);if(kind==='voucher'){select.dataset.write='';price.input.dataset.write='';save.dataset.write='';const actions=el('div','','toolbar');actions.append(save,confirmed);editor.append(consequences,confirmationNote,actions);refreshConfirm();}else editor.append(save);
  editor.showModal();context?.controlsChanged?.();
 };
 const renderExtras=()=>{
  extras.replaceChildren();otherShelf.replaceChildren();grid.querySelectorAll('.store-extra-tile[data-store-kind="other"],.candidate-placeholder').forEach(e=>e.remove());const voucherWell=el('div','','store-voucher-well'),packWell=el('div','','store-pack-well'),voucherShelf=el('div','','store-extra-shelf'),packShelf=el('div','','store-extra-shelf');voucherWell.append(voucherShelf);packWell.append(packShelf);extras.append(voucherWell,packWell,el('small','Vales guardados · sobres y otras cartas temporales.','muted'));
  const listed:[string,string,number|null,HTMLElement,()=>void,()=>void][]=[];
  for(const o of voucherOffers){const v=VOUCHER_CATALOG.find(v=>v.id===o.catalogId),art=el('span','','voucher-art '+o.catalogId);art.setAttribute('aria-label',v?.name??o.catalogId);listed.push([o.offerId,'voucher',o.price,art,()=>editExtra('voucher',o.offerId),()=>{observe(()=>{voucherOffers.splice(voucherOffers.indexOf(o),1);},'voucher');}]);}
  for(const o of packOffers){const p=BOOSTER_CATALOG.find(p=>p.family===o.family&&p.size===o.size),art=el('span','','booster-art pack-'+o.family+'-'+o.size);art.setAttribute('aria-label',p?.name??'Sobre');listed.push([o.offerId,'pack',o.price,art,()=>editExtra('pack',o.offerId),()=>{packOffers.splice(packOffers.indexOf(o),1);}]);}
  for(const o of otherOffers){const art=el('span',({tarot:'☾',planet:'✦',spectral:'♧',playing_card:'♠'})[o.kind],'store-other-art');art.setAttribute('aria-label',o.name);listed.push([o.offerId,'other',o.price,art,()=>editExtra('other',o.offerId),()=>{otherOffers.splice(otherOffers.indexOf(o),1);}]);}
  for(const [id,kind,price,art,edit,remove] of listed){const tile=el('article','','store-extra-tile');tile.dataset.storeKind=kind;tile.dataset.offerId=id;const inspect=el('button','','store-extra-inspect');inspect.type='button';inspect.append(art);const text=el('span','','store-extra-info');text.append(el('b',art.getAttribute('aria-label')??''),el('strong',`$${price??'?'}`));inspect.append(text);inspect.onclick=edit;const del=el('button','×','candidate-remove');del.type='button';if(kind==='voucher')del.dataset.write='';del.setAttribute('aria-label','Quitar oferta');del.onclick=()=>{remove();changed();renderExtras();refreshAdvice();};tile.append(inspect,del);(kind==='voucher'?voucherShelf:kind==='pack'?packShelf:grid).append(tile);}
  for(let i=candidates.length+otherOffers.length;i<2;i++){const slot=el('button','','candidate-placeholder');slot.type='button';slot.setAttribute('aria-label',`Buscar oferta ${i+1}`);slot.append(el('span','＋'),el('small','Comodín'));slot.onclick=search.onclick;grid.append(slot);}
  for(const [kind,label,id,shelf,min] of [['voucher','＋ Vale','store-voucher-add',voucherShelf,1],['pack','＋ Sobre','store-pack-add',packShelf,2],['other','＋ Otra carta','store-other-add',otherShelf,0]] as const){const b=el('button',label,'store-add-offer');b.type='button';if(kind==='voucher')b.dataset.write='';b.id=id;b.onclick=()=>editExtra(kind);shelf.append(b);if(kind!=='other')for(let i=shelf.querySelectorAll('.store-extra-tile').length+1;i<min;i++){const slot=el('button',label,'store-add-offer store-empty-offer');slot.type='button';slot.onclick=()=>editExtra(kind);shelf.append(slot);}}
 };
 const render=(calculate:boolean)=>{
  if(calculate)clearTimeout(timer);grid.replaceChildren();
  for(const c of candidates){const card=el('article','','candidate-card');card.dataset.candidate=c.joker.id;card.dataset.offerId=c.offerId;const hero=el('div','','candidate-hero'),info=el('div','','candidate-info'),cost=el('small',`$${c.price??'?'}`,'store-joker-price');info.append(el('h4',c.joker.names.es),cost);hero.append(jokerArt(c.joker.id,c.joker.names.es),info);
   const select=el('select');select.setAttribute('aria-label','Reemplazo para '+c.joker.names.es);const empty=el('option','Comprar sin vender');empty.value='';select.append(empty);for(const r of replacements()){const o=el('option','Vender '+r.name);o.value=r.id;select.append(o);}if(host.isConnected&&!replacements().some(r=>r.id===c.sellId))c.sellId='';select.value=c.sellId;
   const remove=write(el('button','×','candidate-remove'));remove.type='button';remove.setAttribute('aria-label','Quitar candidato');remove.title='Quitar oferta';remove.onclick=()=>{observe(()=>candidates.splice(candidates.indexOf(c),1));render(true);};
   const details=el('dialog','','candidate-dialog');details.setAttribute('aria-label',c.joker.names.es);const close=el('button','Cerrar','secondary');close.type='button';close.onclick=()=>details.close();const head=el('div','','section-title');head.append(el('h2',c.joker.names.es),close);const detailHero=el('div','','candidate-detail-hero'),detailArt=el('span','','candidate-detail-art');detailArt.append(jokerArt(c.joker.id,c.joker.names.es));detailHero.append(detailArt,el('p',c.joker.localization.es.description));
   const price=numeric(c.price,'store-price-'+c.offerId),edition=el('select');price.input.dataset.write='';edition.dataset.write='';edition.id='store-edition-'+c.offerId;edition.setAttribute('aria-label','Edición de la oferta');for(const [id,label] of [['base','Base'],['foil','Laminada'],['holographic','Holográfica'],['polychrome','Policroma'],['negative','Negativa'],['unknown','Desconocida']]){const o=el('option',label);o.value=id!;edition.append(o);}edition.value=c.edition;const resultHost=el('div');
   const confirmed=write(el('button',c.sellId?'Vendí y compré':'Compré'));confirmed.type='button';confirmed.dataset.shopConfirm=c.offerId;const confirmNote=el('small','','muted');confirmNote.id='shop-confirm-note-'+c.offerId;confirmNote.setAttribute('role','status');confirmed.setAttribute('aria-describedby',confirmNote.id);
   const refreshConfirm=()=>{confirmed.textContent=c.sellId?'Vendí y compré':'Compré';const reason=context?.status?.();localDisabled(confirmed,!context?.confirm||!!reason);confirmNote.textContent=reason??'Registra solo si ya lo hiciste en el juego.';context?.controlsChanged?.();};
   confirmed.onclick=()=>{const error=context?.confirm?.(c.offerId,c.sellId)??null;if(error){showStatus(error,true);confirmNote.textContent=error;}refreshUndo();};
   const renderLocal=()=>{cost.textContent=`$${c.price??'?'}`;info.querySelector('.fit-score')?.remove();const offer={price:c.price===null?{status:'unknown' as const,reason:'Precio sin transcribir.'}:known(c.price),edition:c.edition==='unknown'?{status:'unknown' as const,reason:'Edición sin transcribir.'}:known(c.edition),stickers:c.stickers.includes('unknown')?{status:'unknown' as const,reason:'Pegatinas sin transcribir.'}:known(c.stickers)};const result=calculate?preview(c.joker,c.sellId,undefined,offer):el('p','Calculando…','candidate-pending');card.dataset.previewStatus=calculate?result.dataset.previewStatus??'unavailable':'updating';resultHost.replaceChildren(result);if(result.dataset.fitLabel){const badge=el('strong',result.dataset.fitLabel,'fit-score '+(result.dataset.fitTone??'unknown'));badge.title=result.dataset.fitReason??'';info.append(badge);card.dataset.fitLabel=result.dataset.fitLabel;}};
   const recalculate=()=>{calculate=true;renderLocal();refreshAdvice();refreshConfirm();};
   const editError=el('p','','error');editError.setAttribute('role','status');
   // Persist on committed changes, never on each keystroke. Keep this dialog and focus intact.
   price.input.onchange=()=>{const amount=priceValue(price.input);if(amount!==null&&(!Number.isSafeInteger(amount)||amount<0)){const error='Introduce un precio entero no negativo o déjalo desconocido.';showStatus(error,true);editError.textContent=error;price.input.value=String(c.price??'');return;}const previous=c.price;const error=observe(()=>{c.price=amount;});if(error)c.price=previous;editError.textContent=error??'';price.input.value=String(c.price??'');recalculate();};
   edition.onchange=()=>{const previous=c.edition;const error=observe(()=>{c.edition=edition.value;});if(error)c.edition=previous;editError.textContent=error??'';edition.value=c.edition;recalculate();};
   select.onchange=()=>{c.sellId=select.value;recalculate();};details.append(head,detailHero,price.label,edition,editError,select,resultHost,confirmed,confirmNote);renderLocal();refreshConfirm();hero.tabIndex=0;hero.setAttribute('role','button');hero.setAttribute('aria-label','Ver '+c.joker.names.es);hero.setAttribute('aria-haspopup','dialog');
   const open=()=>{clearTimeout(timer);calculate=true;select.replaceChildren(empty);for(const r of replacements()){const o=el('option','Vender '+r.name);o.value=r.id;select.append(o);}if(c.sellId&&!replacements().some(r=>r.id===c.sellId))c.sellId='';select.value=c.sellId;renderLocal();refreshAdvice();refreshConfirm();details.showModal();};
   hero.onclick=open;hero.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();open();}};details.addEventListener('close',()=>hero.focus({preventScroll:true}));card.append(hero,remove,details);grid.append(card);
  }
  renderExtras();refreshAdvice();refreshUndo();context?.controlsChanged?.();
 };
 const reset=write(el('button','Vaciar ofertas visibles','secondary store-reset'));reset.type='button';reset.id='store-new-shop';reset.title='Vaciar únicamente las ofertas representadas; conserva las incompatibles del registro';reset.onclick=()=>{const error=observe(()=>{candidates.length=0;voucherOffers.length=0;});if(!error){packOffers.length=0;otherOffers.length=0;rerollCost=null;}render(true);};localDisabled(reset,true);heading.append(reset);
 invalidate=()=>{clearTimeout(timer);render(false);timer=setTimeout(()=>render(true),220);};render(false);invalidate();
 // The parent finishes mounting form inputs before the first live-state read.
 queueMicrotask(()=>{if(mounted===mountId)refreshAdvice();});
 void fetch('./web/assets/jokers/catalog.json').then(r=>{if(!r.ok)throw Error();return r.json();}).then((catalog:JokerCollection)=>{
  if(mounted!==mountId)return;if(!Array.isArray(catalog.jokers)||catalog.jokers.length!==150)throw Error();
  const state=context?.state(),shop=state?.observed.shop;
  voucherOffers.splice(0,voucherOffers.length,...(state?.schemaVersion==='0.2'&&state.observed.shop.status==='known'?state.observed.shop.value.voucherOffers??[]:[]).filter(v=>VOUCHER_CATALOG.some(entry=>entry.id===v.catalogId)).map(v=>({offerId:v.offerId,catalogId:v.catalogId,price:v.price.status==='known'?v.price.value:null})));
  hydrated=true;vouchersHydrated=!!state;localDisabled(reset,false);if(status.textContent===loadingMessage)showStatus(null);if(shop?.status!=='known'){render(true);return;}
  const replacementByOffer=new Map(candidates.map(c=>[c.offerId,c.sellId]));shopId=shop.value.shopId;const restoredOffers:ListedJoker[]=[];let unmapped=0;
  for(const offer of shop.value.cardOffers){if(offer.kind!=='joker')continue;const artId=ALL_JOKER_FACTS[offer.catalogId]?.artId??offer.catalogId,joker=catalog.jokers.find(j=>j.id===artId);if(!joker){unmapped++;continue;}restoredOffers.push({joker,offerId:offer.offerId,sellId:replacementByOffer.get(offer.offerId)??'',price:offer.price.status==='known'?offer.price.value:null,edition:offer.edition.status==='known'?offer.edition.value:'unknown',stickers:offer.stickers.status==='known'?[...offer.stickers.value]:['unknown']});}
  candidates.splice(0,candidates.length,...restoredOffers);render(true);if(unmapped)showStatus(`${unmapped} ofertas sin referencia visual compatible. Conserva sus datos en el registro.`,true);
 }).catch(()=>{if(mounted===mountId)showStatus('No se pudo cargar el catálogo de comodines. Los vales se consultan por separado; recarga para reintentar el catálogo.',true);});
 return (joker:JokerReference):string|null=>{if(candidates.length>=4)return 'Máximo 4 artículos de comodín. Quita una oferta para registrar otra.';const error=observe(()=>{candidates.push({joker,offerId:crypto.randomUUID(),sellId:'',price:joker.basePrice,edition:'base',stickers:[]});});render(true);return error;};
}
