import type {GameState,Fact} from '../state/model.js';
import {blindRequirement} from '../catalog/blinds.js';
import {TAGS,tagDefinition} from '../catalog/tags.js';
import type {HandId} from '../catalog/initial.js';
import {DECK_PROFILES} from '../catalog/decks.js';
import {createBlindGuidanceView} from './blind-guidance-client.js';
import {compactBlindGuidance,currentBlindAnswers,pendingBlindAdvice} from './blind-decision-view.js';
import {jokerArt,engineArt} from './collection.js';
import {deckArt} from './deck-art.js';
import {blindArt,tagArt} from './blind-art.js';
import {mountMenuBackground} from './menu-background.js';
import {BOSS_CATALOG,bossDefinition} from '../catalog/bosses.js';
import {ALL_JOKER_FACTS} from '../catalog/all-joker-facts.js';
import {VOUCHER_CATALOG} from '../catalog/voucher-catalog.js';
import {BOOSTER_CATALOG} from '../catalog/booster-catalog.js';
import {mountRoundCashout} from './round-cashout-view.js';
import type {RoundCashoutSubmission} from './round-cashout-view.js';
import {mountGameShop} from './game-shop-view.js';
import {currentShopPlan,openShopPlan} from './shop-plan-view.js';
import {observedRerollQuote} from '../rules/reroll-quote.js';
import {observedOrbitalHand} from '../run/progress.js';
import {handNames} from './full-joker-data.js';
import type {RunDiagnosisView} from './run-diagnosis-client.js';

const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',className='')=>{const e=document.createElement(tag);e.textContent=text;e.className=className;return e;};
const value=<T>(f:Fact<T>|undefined)=>f?.status==='known'?f.value:undefined;
const labels={small:'Ciega pequeña',big:'Ciega grande',boss:'Ciega jefe'};
const priorities={survival:'Supervivencia',consistency:'Consistencia',economy:'Economía',scaling:'Escalabilidad',optimization:'Optimización'};
type Kind=keyof typeof labels;
type ObservationBinding=Pick<GameState,'runId'|'revision'>;
export interface BlindScreenOptions {
 snapshot():{state:GameState|null;writable:boolean;dirty:boolean};
 diagnosis():RunDiagnosisView;
 observeTag(kind:'small'|'big',tag:string|null,binding:ObservationBinding,orbitalHand?:HandId):string|null;
 observeBoss(id:string,binding:ObservationBinding):string|null;
 select(binding:ObservationBinding):string|null;
 cashout(submission:RoundCashoutSubmission,binding:ObservationBinding):string|null;
 shop:Parameters<typeof mountGameShop>[1];
 compareBlind():void;
 lost():void;skip():void;options():void;
}
/** A presentation of recorded observations. Opening it never plays or skips a blind. */
export function mountBlindScreen(options:BlindScreenOptions){
 const host=el('main','','blind-screen');host.id='blind-screen';host.dataset.page='blind';host.hidden=true;host.tabIndex=-1;host.setAttribute('aria-label','Selección de ciega');
 const backgroundCanvas=el('canvas');backgroundCanvas.id='blind-background';backgroundCanvas.setAttribute('aria-hidden','true');
 const stage=el('div','','blind-stage');host.append(backgroundCanvas,stage);document.getElementById('app-shell')!.append(host);
 const background=mountMenuBackground(backgroundCanvas),motion=matchMedia('(prefers-reduced-motion: reduce)');
 const applyMotion=()=>{let preference='system';try{preference=localStorage.getItem('balatro-advisor.menu-motion.v1')??'system';}catch{/* A visual preference does not block the table. */}background.setMotion(preference==='on'||preference==='system'&&!motion.matches);};
 motion.addEventListener('change',applyMotion);document.querySelector('#menu-settings')?.addEventListener('close',applyMotion);applyMotion();
 const side=el('aside','','blind-sidebar'),advisor=el('section','','blind-advisor'),avatar=el('div','','blind-advisor-avatar'),bubble=el('div','','blind-speech');
 avatar.append(jokerArt('j_joker','Comodín asesor'));const title=el('strong'),reason=el('p'),need=el('small');need.id='run-diagnosis-priority';title.setAttribute('aria-live','polite');bubble.append(title,reason);advisor.append(avatar,bubble);
 const compare=el('button','Ver motivos','blind-compare');compare.type='button';compare.id='blind-compare';compare.hidden=true;compare.onclick=options.compareBlind;bubble.append(compare);
 const plan=el('button','Orientar mi compra','blind-compare');plan.type='button';plan.id='game-shop-plan';plan.hidden=true;plan.setAttribute('aria-haspopup','dialog');bubble.append(plan);
 plan.onclick=()=>openShopPlan({state:()=>options.snapshot().state!,quote:()=>{const state=options.snapshot().state;return state?observedRerollQuote(state):null;},observeQuote:options.shop.observeQuote,changed:refresh},plan);
 document.addEventListener('shop-plan-change',refresh);
 const info=el('a','Info\npartida','blind-hud-button blind-info');info.href='#table';info.id='blind-run-info';
 const settings=el('button','Opciones','blind-hud-button blind-options');settings.type='button';settings.onclick=options.options;
 const stats=el('div','','blind-hud');const stat=(label:string,id:string,tone='')=>{const box=el('div','','blind-stat '+tone);box.append(el('span',label));const n=el('b');n.id=id;box.append(n);return {box,n};};
 const hands=stat('Manos','blind-hands','hands'),discards=stat('Descartes','blind-discards','discards'),money=stat('','blind-money','money'),ante=stat('Ante','blind-ante','ante'),round=stat('Ronda','blind-round');stats.append(hands.box,discards.box,money.box,ante.box,round.box);side.append(advisor,info,settings,stats);
 const tray=el('a','','blind-joker-tray');tray.href='#table';tray.setAttribute('aria-label','Ver y editar mis comodines');tray.id='blind-jokers';const jokerCount=el('span','','blind-tray-count');tray.append(jokerCount);
 const consumables=el('a','','blind-consumable-tray');consumables.href='#table';consumables.setAttribute('aria-label','Ver y editar consumibles');const consumableCount=el('span','','blind-tray-count');consumables.append(consumableCount);
 const cards=el('div','','blind-cards'),deck=el('a','','blind-deck');deck.href='#table';deck.id='blind-deck';deck.setAttribute('aria-label','Ver y editar cartas del mazo');const deckCount=el('span');deck.append(deckCount);
 const error=el('p','','blind-screen-error');error.id='blind-screen-error';error.setAttribute('role','alert');
 const menu=el('a','Menú','blind-menu-link');menu.href='#menu';stage.append(side,tray,consumables,cards,deck,error,menu);
 const cashout=mountRoundCashout(stage,{submit:options.cashout,lost:options.lost}),cashoutPanel=stage.querySelector<HTMLElement>('#round-cashout')!;cashoutPanel.hidden=true;
 const shop=mountGameShop(stage,options.shop),shopPanel=stage.querySelector<HTMLElement>('#game-shop')!;shopPanel.hidden=true;
 const picker=el('dialog','','blind-picker');picker.id='blind-picker';const heading=el('h2'),close=el('button','Volver','blind-picker-back');heading.id='blind-picker-title';heading.tabIndex=-1;picker.setAttribute('aria-labelledby',heading.id);close.type='button';const grid=el('div','','blind-picker-grid'),pickerError=el('p','','error');pickerError.setAttribute('role','alert');picker.append(heading,grid,pickerError,close);host.append(picker);close.onclick=()=>picker.close();
 picker.addEventListener('click',e=>{if(e.target===picker){const r=picker.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)picker.close();}});
 let returnFocus:HTMLElement|null=null,returnSelector='';picker.addEventListener('close',()=>{if(returnFocus?.isConnected)returnFocus.focus();else host.querySelector<HTMLElement>(returnSelector||'[data-tag-slot],#blind-boss-picker')?.focus();});
 function openPicker(kind:Kind,button:HTMLElement,state:GameState){
  const pickerTitle=kind==='boss'?'Jefe que aparece en tu partida':'Etiqueta de la ciega '+(kind==='small'?'pequeña':'grande');
  returnFocus=button;returnSelector=kind==='boss'?'#blind-boss-picker':`[data-tag-slot=${kind}]`;grid.replaceChildren();pickerError.textContent='';heading.textContent=pickerTitle;close.onclick=()=>picker.close();
  const binding={runId:state.runId,revision:state.revision};
  const choose=(id:string|null,orbitalHand?:HandId)=>{const problem=kind==='boss'?options.observeBoss(id??'',binding):options.observeTag(kind,id,binding,orbitalHand);if(problem){pickerError.textContent=problem;return;}picker.close();refresh();};
  const reference=value(state.observed.nextBlind),eligible=(id:string)=>!!reference&&blindRequirement(reference.ante,'boss',id,value(state.observed.deckId)??'').ok;
  if(kind==='boss')for(const boss of [...BOSS_CATALOG].sort((a,b)=>Number(eligible(b.id))-Number(eligible(a.id)))){const b=el('button','','blind-picker-item boss-picker-item');b.type='button';b.dataset.bossChoice=boss.id;const text=el('span','','boss-picker-copy'),current=value(state.observed.nextBlind),required=current?blindRequirement(current.ante,'boss',boss.id,value(state.observed.deckId)??''):null;
   text.append(el('strong',boss.name),el('span',boss.description),el('small',`Objetivo ×${boss.multiplier} · premio $${boss.reward} · ${boss.showdown?'jefe final':`ante ${boss.minAnte}+`}`));if(required?.ok)text.append(el('small',`${required.target.toLocaleString('es')} fichas en este ante`));else if(required&&!required.ok){b.disabled=true;b.title=required.error.message;}
   b.append(blindArt(boss.artId,boss.name),text);b.onclick=()=>choose(boss.id);grid.append(b);}
  else {
   const renderOrbitalHands=()=>{
    grid.replaceChildren();pickerError.textContent='';heading.textContent='Mano de la etiqueta orbital';close.onclick=renderTags;
    const selected=reference?observedOrbitalHand(state,{ante:reference.ante,kind}):undefined;
    const choice=(hand?:HandId)=>{
     const b=el('button',hand?handNames[hand]:'Sin registrar','blind-picker-item');b.type='button';b.dataset.orbitalHand=hand??'unknown';
     b.setAttribute('aria-pressed',String(hand===selected));b.onclick=()=>choose('tag_orbital',hand);grid.append(b);
    };
    for(const hand of Object.keys(handNames) as HandId[])choice(hand);
    choice();heading.focus({preventScroll:true});picker.scrollTop=0;
   };
   const renderTags=()=>{
    grid.replaceChildren();pickerError.textContent='';heading.textContent=pickerTitle;close.onclick=()=>picker.close();
    const clear=el('button','Sin registrar','blind-picker-item');clear.type='button';clear.onclick=()=>choose(null);grid.append(clear);
    for(const tag of TAGS){const b=el('button','','blind-picker-item');b.type='button';b.dataset.tagChoice=tag.id;b.append(tagArt(tag.id,tag.name),el('span',tag.name));b.onclick=tag.id==='tag_orbital'?renderOrbitalHands:()=>choose(tag.id);grid.append(b);}
    if(picker.open)heading.focus({preventScroll:true});picker.scrollTop=0;
   };
   renderTags();
  }
  picker.showModal();heading.focus({preventScroll:true});picker.scrollTop=0;
 }
 let rendered='',transitionTimer:ReturnType<typeof setTimeout>|undefined,blindTransitionTimer:ReturnType<typeof setTimeout>|undefined;
 const finishShopTransition=()=>{cashoutPanel.hidden=true;host.classList.remove('cashout-to-shop');};
 shopPanel.addEventListener('animationend',event=>{if(event.target===shopPanel&&event.animationName==='game-shop-rise')finishShopTransition();});
 const focusCurrentBlind=()=>{if(location.hash==='#blind'&&host.dataset.mode==='select')cards.querySelector<HTMLButtonElement>('[data-active="true"] .blind-select:not(:disabled)')?.focus({preventScroll:true});};
 const finishBlindTransition=()=>{shopPanel.hidden=true;host.classList.remove('shop-to-blind');cards.inert=host.dataset.mode!=='select';focusCurrentBlind();};
 cards.addEventListener('animationend',event=>{if(event.target===cards&&event.animationName==='game-blinds-rise')finishBlindTransition();});
 const adviceView=createBlindGuidanceView();
 function refreshAdvice(){
  const state=options.snapshot().state;
  if(location.hash!=='#blind'||state?.phase!=='blind_select'){adviceView.cancel();bubble.removeAttribute('aria-busy');return;}
  const {guidance,pending}=adviceView.read(state,currentBlindAnswers(state),refreshAdvice);
  const summary=!pending&&guidance.ok?compactBlindGuidance(guidance.value):null;
  bubble.setAttribute('aria-busy',String(pending));
  title.textContent=pending?pendingBlindAdvice:summary?.title??'Revisa la ciega';
  reason.textContent=pending?'':summary?.reason??'Registra los datos de esta ciega.';
 }
 function refreshDiagnosis(){
  const snapshot=options.snapshot(),state=snapshot.state;
  if(location.hash!=='#blind')return;
  const view=options.diagnosis(),result=view.status==='ready'?view.result:null;
  const priority=result?.diagnosis.priority;
  const visible=!snapshot.dirty&&(state?.phase==='shop'||state?.phase==='blind_select');
  if(visible&&priority&&state?.phase==='shop'){
   need.textContent='Prioridad · '+priorities[priority];
   need.title=result?.diagnosis.reason??'';
   if(!need.isConnected)bubble.insertBefore(need,compare);
  }else need.remove();
  bubble.dataset.diagnosisState=visible?view.status:'idle';
  if(!visible||!priority)delete bubble.dataset.runPriority;
  else bubble.dataset.runPriority=priority;
  if(state?.phase!=='shop')return;
  const advice=shop.advice(),plan=currentShopPlan(state);
  const choice=advice?.status==='conditional'&&advice.choices.length===1?advice.choices[0]:null;
  const shelf=state.schemaVersion==='0.2'?value(state.observed.shop):undefined;
  const hasOffers=Boolean(shelf?.cardOffers.length||shelf?.voucherOffers?.length||shelf?.packOffers?.length);
  const pending=view.status==='pending'&&!snapshot.dirty&&plan?.need!=='save';
  const manual=!snapshot.dirty&&!pending&&!!plan&&(plan.need==='save'||!result?.shop);
  const recommendation=!snapshot.dirty&&!pending&&!manual&&hasOffers?result?.shop??null:null;
  shop.paintAdvice(recommendation,pending,manual);
  bubble.setAttribute('aria-busy',String(pending));
  if(snapshot.dirty){title.textContent='Guarda los cambios';reason.textContent='Actualiza los datos para ver el consejo.';}
  else if(pending){title.textContent=pendingBlindAdvice;reason.textContent='';}
  else if(recommendation?.kind==='buy'){
   const offer=shelf?.cardOffers.find(item=>item.offerId===recommendation.offerId);
   const voucher=shelf?.voucherOffers?.find(item=>item.offerId===recommendation.offerId);
   const name=offer?ALL_JOKER_FACTS[offer.catalogId]?.name??offer.label:VOUCHER_CATALOG.find(entry=>entry.id===voucher?.catalogId)?.name??'el vale';
   title.textContent='Compra '+name;
   reason.textContent=recommendation.reason+` Te quedan $${recommendation.moneyAfter}.`;
  }
  else if(recommendation?.kind==='hold'){title.textContent='Ahorra';reason.textContent=recommendation.reason;}
  else if(recommendation?.kind==='compare'){title.textContent='Compara las ofertas';reason.textContent=recommendation.reason;}
  else if(recommendation?.kind==='pack'){
   const offer=shelf?.packOffers?.find(item=>item.offerId===recommendation.offerId);
   title.textContent='Considera '+(BOOSTER_CATALOG.find(pack=>pack.id===offer?.catalogId)?.name??'el sobre');
   reason.textContent=recommendation.reason;
  }
  else if(manual&&choice?.id==='hold'){title.textContent='Ahorra';reason.textContent=advice?.planReason??'Conserva el dinero para otra tienda.';}
  else if(manual&&choice?.id==='reroll'){title.textContent='Renueva';reason.textContent=`Cuesta $${choice.price} y quedarían $${choice.moneyAfter} para comprar.`;}
  else if(manual&&choice){
   title.textContent='Compra '+choice.title;reason.textContent=choice.moneyAfter===null?'Encaja con tu equipo.':`Encaja con tu equipo. Te quedan $${choice.moneyAfter}.`;
  }
  else if(!hasOffers){title.textContent='Registra las ofertas';reason.textContent=result?.diagnosis.reason??'Añade las cartas que ves en la tienda.';}
  else {title.textContent='Compara las ofertas';reason.textContent=view.status==='unavailable'?view.reason:result?.diagnosis.reason??'Faltan datos para comparar la próxima ciega.';}
  bubble.scrollTop=0;
 }
 function refresh(){
  const snapshot=options.snapshot(),state=snapshot.state;
  if(location.hash!=='#blind'){shop.cancelAdvice();rendered='';return;}
  if(state?.phase!=='shop')shop.cancelAdvice();
  if(state&&!['blind_select','in_round','cashout','shop'].includes(state.phase)){adviceView.cancel();if(location.hash==='#blind')location.hash=state.phase==='open_pack'?'pack':'table';return;}
  const answers=state?currentBlindAnswers(state):undefined;
  const token=JSON.stringify([snapshot,answers,state?currentShopPlan(state):null]);if(token===rendered)return;rendered=token;
  compare.hidden=true;
  plan.hidden=state?.phase!=='shop';
  error.textContent='';if(!state){refreshAdvice();title.textContent='Elige una baraja';reason.textContent='Inicia la partida desde el menú.';cards.replaceChildren();return;}
  const settling=state.phase==='in_round'||state.phase==='cashout',shopping=state.phase==='shop',selecting=state.phase==='blind_select',previousMode=host.dataset.mode,animate=settling&&previousMode==='select',enteringShop=shopping&&previousMode==='cashout'&&!motion.matches,enteringBlinds=selecting&&previousMode==='shop'&&!motion.matches;
  host.dataset.mode=shopping?'shop':settling?'cashout':'select';host.setAttribute('aria-label',shopping?'Tienda':settling?'Cobro de la ronda':'Selección de ciega');
  if(!selecting){clearTimeout(blindTransitionTimer);host.classList.remove('shop-to-blind');}
  shopPanel.hidden=!shopping&&!host.classList.contains('shop-to-blind');shopPanel.inert=!shopping;cards.inert=!selecting||host.classList.contains('shop-to-blind');
  if(enteringShop){clearTimeout(transitionTimer);host.classList.add('cashout-to-shop');cashoutPanel.hidden=false;cashoutPanel.inert=true;transitionTimer=setTimeout(()=>{if(!shopPanel.getAnimations().some(animation=>animation.playState==='paused'))finishShopTransition();},1500);}
  else if(!shopping||!host.classList.contains('cashout-to-shop')){clearTimeout(transitionTimer);host.classList.remove('cashout-to-shop');cashoutPanel.hidden=!settling;cashoutPanel.inert=!settling;}
  if(enteringBlinds){clearTimeout(blindTransitionTimer);host.classList.add('shop-to-blind');shopPanel.hidden=false;cards.inert=true;blindTransitionTimer=setTimeout(()=>{if(!cards.getAnimations().some(animation=>animation.playState==='paused'))finishBlindTransition();},1500);}
  if(animate)host.classList.add('blind-to-cashout');else if(!settling)host.classList.remove('blind-to-cashout');
  const current=value(state.observed.nextBlind),origin=state.schemaVersion==='0.2'&&state.phase==='shop'?value(state.phaseData.origin):undefined,anteValue=origin?.ante??current?.ante,deckId=value(state.observed.deckId)??'',writable=snapshot.writable&&!snapshot.dirty;
  compare.hidden=!selecting||!current||current.kind==='boss';
  refreshAdvice();
  if(settling){title.textContent='Cobro';reason.textContent='Introduce cuánto ganaste.';}
  bubble.dataset.basis='heuristic';
  hands.n.textContent=String(state.phase==='in_round'?value(state.phaseData.handsRemaining)??'—':settling?'—':value(state.observed.resources.handsPerRound)??'—');discards.n.textContent=String(state.phase==='in_round'?value(state.phaseData.discardsRemaining)??'—':settling?'—':value(state.observed.resources.discardsPerRound)??'—');money.n.textContent=value(state.observed.money)===undefined?'$—':'$'+value(state.observed.money);money.box.title=settling?'Último saldo registrado. Introduce el saldo actual al cobrar.':'';ante.n.textContent=(anteValue??'—')+'/8';
  const skipped=value(value(state.observed.jokerContext)?.blindsSkipped),roundRef=origin??current;round.n.textContent=roundRef&&skipped!==undefined?String(Math.max(0,(roundRef.ante-1)*3+({small:0,big:1,boss:2}[roundRef.kind])-skipped+(settling||origin?1:0))):'—';round.box.title='Ciegas anteriores menos saltos registrados, incluida la ronda actual al seleccionarla. Desconocido si falta el total de saltos.';
  tray.querySelectorAll('.blind-owned-card').forEach(e=>e.remove());const owned=value(state.observed.jokers);for(const j of owned??[]){const card=el('span','','blind-owned-card');card.append(jokerArt(engineArt[j.catalogId]??'j_joker',j.catalogId));tray.append(card);}jokerCount.textContent=(owned?.length??'—')+'/'+(value(state.observed.resources.jokerSlots)??'—');
  const context=value(state.observed.jokerContext);consumableCount.textContent=(value(context?.consumables)?.length??'—')+'/'+(value(context?.consumableSlots)??'—');
  deck.querySelector('.deck-art')?.remove();deck.prepend(deckArt(deckId,DECK_PROFILES[deckId as keyof typeof DECK_PROFILES]?.name??'Baraja'));const composition=value(state.observed.deck);deckCount.textContent=composition?String('cards'in composition?composition.cards.length:52):'—';
  if(shopping){
   shop.refresh(state,writable,snapshot.dirty);refreshDiagnosis();
   if(picker.open)picker.close();
   if(snapshot.dirty)error.textContent='Termina la edición pendiente antes de registrar la tienda.';
   return;
  }
  refreshDiagnosis();
  if(settling){cashout.refresh(state,writable);if(picker.open)picker.close();if(snapshot.dirty)error.textContent='Termina la edición pendiente antes de registrar el cobro.';return;}
  cards.replaceChildren();const boss=value(state.observed.visibleBoss),visibleBoss=boss?.ante===anteValue?boss:current?.kind==='boss'?current:undefined;
  for(const kind of ['small','big','boss'] as const){
   const active=current?.kind===kind,past=!!current&&(['small','big','boss'].indexOf(kind)<['small','big','boss'].indexOf(current.kind)),id=kind==='boss'?value(visibleBoss?.bossId):kind,definition=kind==='boss'&&id?bossDefinition(id):undefined,name=kind==='boss'?(definition?.name??id??'Ciega jefe'):labels[kind];
   const card=el('section','','blind-card blind-card-'+kind);card.dataset.kind=kind;card.dataset.active=String(active);card.dataset.past=String(past);
   const select=el('button',past?'Pasada':active?'Seleccionar':'Próximamente','blind-select');select.type='button';select.id='blind-select-'+kind;select.disabled=!active||!writable;select.title=active?'Registrar que seleccionaste esta ciega en Balatro':'';select.onclick=()=>{const problem=options.select({runId:state.runId,revision:state.revision});if(problem){error.textContent=problem;return;}cashout.focus();};
   const band=el('div',name,'blind-name'),portrait=kind==='boss'?el('button','','blind-boss-portrait'):el('div','','blind-chip');
   if(portrait instanceof HTMLButtonElement){portrait.type='button';portrait.id='blind-boss-picker';portrait.disabled=!writable||!current;portrait.setAttribute('aria-label',id?'Cambiar jefe: '+name:'Introducir jefe');portrait.onclick=()=>openPicker('boss',portrait,state);}
   if(id)portrait.append(blindArt(definition?.artId??id,name));else portrait.append(el('span','','blind-pixel-plus'));
   const amounts=el('div','','blind-amounts');let target:number|undefined,reward:number|undefined;
   if(active){target=value(current.target);reward=value(current.reward);}else if(kind==='boss'){target=value(visibleBoss?.target);reward=value(visibleBoss?.reward);}else if(anteValue!==undefined){const requirement=blindRequirement(anteValue,kind,'none',deckId);if(requirement.ok){target=requirement.target;reward=requirement.reward;}}
   if(kind==='boss'&&id){const calculated=anteValue===undefined?null:blindRequirement(anteValue,'boss',id,deckId);if(calculated?.ok){target??=calculated.target;reward??=calculated.reward;}if(definition){const effect=el('p',definition.shortDescription,'blind-boss-effect');effect.title=definition.description;amounts.append(effect);}else amounts.append(el('p','Jefe fuera del catálogo.','blind-boss-effect'));}
   const amount=el('strong',target===undefined?'—':target.toLocaleString('es'),'blind-score-target');amount.dataset.target=target===undefined?'unknown':String(target);amounts.append(el('span','Puntúa al menos'),amount,el('span','Premio: '+(reward===undefined?'—':reward<=8?'$'.repeat(reward):'$'+reward.toLocaleString('es')),'blind-reward'));
   card.append(select,band,portrait,amounts);
   if(kind!=='boss'){
    const row=el('div','','blind-skip-row'),slot=el('button','','blind-tag-slot');slot.type='button';slot.dataset.tagSlot=kind;
    const saved=state.schemaVersion==='0.2'?state.blindTags?.find(t=>t.ante===anteValue&&t.kind===kind)?.tag:undefined;
    const tag=active&&state.schemaVersion==='0.2'&&state.phase==='blind_select'?value(state.phaseData.skipTag):value(saved);
    const orbital=tag==='tag_orbital'&&anteValue!==undefined?observedOrbitalHand(state,{ante:anteValue,kind}):undefined;
    const tagName=tag?tagDefinition(tag)?.name??tag:'';
    const tagLabel=orbital?`${tagName} · ${handNames[orbital]}`:tagName;
    slot.dataset.empty=String(!tag);slot.setAttribute('aria-label',tag?'Cambiar '+tagLabel:'Introducir etiqueta: '+labels[kind]);slot.title=tagLabel||'Introducir etiqueta';slot.disabled=!writable||past||!current;slot.append(tag?tagArt(tag,tagLabel):el('span','','blind-pixel-plus'));slot.onclick=()=>openPicker(kind,slot,state);
    const skip=el('button','Saltar ciega','blind-skip');skip.type='button';skip.id='blind-skip-'+kind;skip.disabled=!active||!writable;skip.title='Registrar un salto que ya realizaste en Balatro';skip.onclick=options.skip;row.append(slot,skip);card.append(el('div','o','blind-or'),row);
   }else {const next=el('div','','blind-up-ante');next.append(el('strong','Sube el ante'),el('span','Aumentan las ciegas'),el('span','Renueva las ciegas'));card.append(next);}
   cards.append(card);
  }
  if(previousMode==='shop'&&!enteringBlinds)focusCurrentBlind();
  if(snapshot.dirty)error.textContent='Termina la edición pendiente para registrar etiquetas o avanzar.';
 }
 const touchLayout=matchMedia('(pointer: coarse)');
 const resize=()=>{
  const frame=document.getElementById('app-viewport')!;
  const width=frame.clientWidth,height=frame.clientHeight;
  if(!width||!height)return;
  // Fit one uniformly scaled table. The desktop reference uses a 16:10 board;
  // the mobile reference uses the wider 1280×600 landscape composition.
  const desktop=width>=960&&height>=540&&!touchLayout.matches;
  const scale=Math.min(width/(desktop?960:1280),height/600);
  stage.dataset.layout=desktop?'desktop':'compact';
  stage.style.setProperty('--blind-scale',String(scale));
  stage.style.setProperty('--blind-stage-height',`${height/scale}px`);
 };
 touchLayout.addEventListener('change',resize);
 const observer=new ResizeObserver(resize);observer.observe(document.getElementById('app-viewport')!);window.addEventListener('hashchange',()=>{
  const active=location.hash==='#blind';
  background.setActive(active);
  if(active){
   refresh();resize();
   refreshDiagnosis();
   if(options.snapshot().state?.phase!=='shop')refreshAdvice();
  }else{
   if(picker.open)picker.close();
   shop.cancelAdvice();rendered='';
   refreshAdvice();
  }
 });resize();
 return {refresh,refreshDiagnosis};
}
