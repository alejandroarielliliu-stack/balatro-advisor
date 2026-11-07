import type {GameState,Fact} from '../state/model.js';
import {blindRequirement} from '../catalog/blinds.js';
import {TAGS,tagDefinition} from '../catalog/tags.js';
import {DECK_PROFILES} from '../catalog/decks.js';
import {guideBlindChoice} from '../advisor/blind-guidance.js';
import {jokerArt,engineArt} from './collection.js';
import {deckArt} from './deck-art.js';
import {blindArt,tagArt} from './blind-art.js';
import {mountMenuBackground} from './menu-background.js';

const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',className='')=>{const e=document.createElement(tag);e.textContent=text;e.className=className;return e;};
const value=<T>(f:Fact<T>|undefined)=>f?.status==='known'?f.value:undefined;
const labels={small:'Ciega pequeña',big:'Ciega grande',boss:'Ciega jefe'};
type Kind=keyof typeof labels;
type ObservationBinding=Pick<GameState,'runId'|'revision'>;
// Display identities only. Selecting one does not implement its rule effects.
const bosses:Record<string,string>={the_hook:'El gancho',the_ox:'El buey',the_house:'La casa',the_wall:'La pared',the_wheel:'La rueda',the_arm:'El brazo',the_club:'El trébol',the_fish:'El pez',the_psychic:'El psíquico',the_goad:'La pica',the_water:'El agua',the_window:'La ventana',the_manacle:'El grillete',the_eye:'El ojo',the_mouth:'La boca',the_plant:'La planta',the_serpent:'La serpiente',the_pillar:'El pilar',the_needle:'La aguja',the_head:'La cabeza',the_tooth:'El diente',the_flint:'El pedernal',the_mark:'La marca',amber_acorn:'Bellota ámbar',verdant_leaf:'Hoja verde',violet_vessel:'Vasija violeta',crimson_heart:'Corazón carmesí',cerulean_bell:'Campana cerúlea'};
const bossEffects:Record<string,string>={the_psychic:'Debes jugar 5 cartas.',the_water:'Empiezas sin descartes.',the_wall:'Ciega de tamaño extra grande.',violet_vessel:'Ciega de tamaño muy grande.'};
export interface BlindScreenOptions {
 snapshot():{state:GameState|null;writable:boolean;dirty:boolean};
 observeTag(kind:'small'|'big',tag:string|null,binding:ObservationBinding):string|null;
 observeBoss(id:string,binding:ObservationBinding):string|null;
 select():void;skip():void;options():void;
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
 avatar.append(jokerArt('j_joker','Comodín asesor'));const title=el('strong'),reason=el('p'),limit=el('small','Orientación · supervivencia sin evaluar');bubble.append(title,reason,limit);advisor.append(avatar,bubble);
 const info=el('a','Info\npartida','blind-hud-button blind-info');info.href='#table';info.id='blind-run-info';
 const settings=el('button','Opciones','blind-hud-button blind-options');settings.type='button';settings.onclick=options.options;
 const stats=el('div','','blind-hud');const stat=(label:string,id:string,tone='')=>{const box=el('div','','blind-stat '+tone);box.append(el('span',label));const n=el('b');n.id=id;box.append(n);return {box,n};};
 const hands=stat('Manos','blind-hands','hands'),discards=stat('Descartes','blind-discards','discards'),money=stat('','blind-money','money'),ante=stat('Ante','blind-ante','ante'),round=stat('Ronda','blind-round');stats.append(hands.box,discards.box,money.box,ante.box,round.box);side.append(advisor,info,settings,stats);
 const tray=el('a','','blind-joker-tray');tray.href='#table';tray.setAttribute('aria-label','Ver y editar mis comodines');tray.id='blind-jokers';const jokerCount=el('span','','blind-tray-count');tray.append(jokerCount);
 const consumables=el('a','','blind-consumable-tray');consumables.href='#table';consumables.setAttribute('aria-label','Ver y editar consumibles');const consumableCount=el('span','','blind-tray-count');consumables.append(consumableCount);
 const cards=el('div','','blind-cards'),deck=el('a','','blind-deck');deck.href='#table';deck.id='blind-deck';deck.setAttribute('aria-label','Ver y editar cartas del mazo');const deckCount=el('span');deck.append(deckCount);
 const error=el('p','','blind-screen-error');error.id='blind-screen-error';error.setAttribute('role','alert');
 const menu=el('a','Menú','blind-menu-link');menu.href='#menu';stage.append(side,tray,consumables,cards,deck,error,menu);
 const picker=el('dialog','','blind-picker');picker.id='blind-picker';const heading=el('h2'),close=el('button','Volver','blind-picker-back');close.type='button';const grid=el('div','','blind-picker-grid'),pickerError=el('p','','error');pickerError.setAttribute('role','alert');picker.append(heading,grid,pickerError,close);host.append(picker);close.onclick=()=>picker.close();
 picker.addEventListener('click',e=>{if(e.target===picker){const r=picker.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)picker.close();}});
 let returnFocus:HTMLElement|null=null;picker.addEventListener('close',()=>{if(returnFocus?.isConnected)returnFocus.focus();else host.querySelector<HTMLElement>('[data-tag-slot],#blind-boss-picker')?.focus();});
 function openPicker(kind:Kind,button:HTMLElement,state:GameState){
  returnFocus=button;grid.replaceChildren();pickerError.textContent='';heading.textContent=kind==='boss'?'Jefe que aparece en tu partida':'Etiqueta de la ciega '+(kind==='small'?'pequeña':'grande');
  const binding={runId:state.runId,revision:state.revision};
  const choose=(id:string|null)=>{const problem=kind==='boss'?options.observeBoss(id??'',binding):options.observeTag(kind,id,binding);if(problem){pickerError.textContent=problem;return;}picker.close();refresh();};
  if(kind==='boss')for(const [id,name] of Object.entries(bosses)){const b=el('button','','blind-picker-item');b.type='button';b.dataset.bossChoice=id;b.append(blindArt(id,name),el('span',name));b.onclick=()=>choose(id);grid.append(b);}
  else {const clear=el('button','Sin registrar','blind-picker-item');clear.type='button';clear.onclick=()=>choose(null);grid.append(clear);for(const tag of TAGS){const b=el('button','','blind-picker-item');b.type='button';b.dataset.tagChoice=tag.id;b.append(tagArt(tag.id,tag.name),el('span',tag.name));b.onclick=()=>choose(tag.id);grid.append(b);}}
  picker.showModal();close.focus();
 }
 let rendered='';
 function refresh(){
  const snapshot=options.snapshot(),state=snapshot.state;
  if(state&&state.phase!=='blind_select'){if(location.hash==='#blind')location.hash='table';return;}
  const token=JSON.stringify(snapshot);if(token===rendered)return;rendered=token;
  error.textContent='';if(!state){title.textContent='Elige una baraja';reason.textContent='Inicia la partida desde el menú.';cards.replaceChildren();return;}
  if(state.phase!=='blind_select'){if(location.hash==='#blind')location.hash='table';return;}
  const current=value(state.observed.nextBlind),anteValue=current?.ante,deckId=value(state.observed.deckId)??'',writable=snapshot.writable&&!snapshot.dirty;
  const guidance=guideBlindChoice(state);title.textContent=guidance.ok?guidance.value.recommendation.title:'Revisa la partida';reason.textContent=guidance.ok?guidance.value.recommendation.reason:'Faltan datos para orientar esta decisión.';bubble.dataset.basis='heuristic';bubble.title=guidance.ok?[...guidance.value.conditions,...guidance.value.limitations].join('\n'):'';
  hands.n.textContent=String(value(state.observed.resources.handsPerRound)??'—');discards.n.textContent=String(value(state.observed.resources.discardsPerRound)??'—');money.n.textContent=value(state.observed.money)===undefined?'$—':'$'+value(state.observed.money);ante.n.textContent=(anteValue??'—')+'/8';
  const skipped=value(value(state.observed.jokerContext)?.blindsSkipped);round.n.textContent=current&&skipped!==undefined?String(Math.max(0,(current.ante-1)*3+({small:0,big:1,boss:2}[current.kind])-skipped)):'—';round.box.title='Ciegas anteriores menos saltos registrados. Desconocido si falta el total de saltos.';
  tray.querySelectorAll('.blind-owned-card').forEach(e=>e.remove());const owned=value(state.observed.jokers);for(const j of owned??[]){const card=el('span','','blind-owned-card');card.append(jokerArt(engineArt[j.catalogId]??'j_joker',j.catalogId));tray.append(card);}jokerCount.textContent=(owned?.length??'—')+'/'+(value(state.observed.resources.jokerSlots)??'—');
  const context=value(state.observed.jokerContext);consumableCount.textContent=(value(context?.consumables)?.length??'—')+'/'+(value(context?.consumableSlots)??'—');
  deck.querySelector('.deck-art')?.remove();deck.prepend(deckArt(deckId,DECK_PROFILES[deckId as keyof typeof DECK_PROFILES]?.name??'Baraja'));const composition=value(state.observed.deck);deckCount.textContent=composition?String('cards'in composition?composition.cards.length:52):'—';
  cards.replaceChildren();const boss=value(state.observed.visibleBoss),visibleBoss=boss?.ante===anteValue?boss:current?.kind==='boss'?current:undefined;
  for(const kind of ['small','big','boss'] as const){
   const active=current?.kind===kind,past=!!current&&(['small','big','boss'].indexOf(kind)<['small','big','boss'].indexOf(current.kind)),id=kind==='boss'?value(visibleBoss?.bossId):kind,name=kind==='boss'?(id?bosses[id]??id:'Ciega jefe'):labels[kind];
   const card=el('section','','blind-card blind-card-'+kind);card.dataset.kind=kind;card.dataset.active=String(active);card.dataset.past=String(past);
   const select=el('button',past?'Pasada':active?'Seleccionar':'Próximamente','blind-select');select.type='button';select.id='blind-select-'+kind;select.disabled=!active||!writable;select.title=active?'Registrar que seleccionaste esta ciega en Balatro':'';select.onclick=options.select;
   const band=el('div',name,'blind-name'),portrait=kind==='boss'?el('button','','blind-boss-portrait'):el('div','','blind-chip');
   if(portrait instanceof HTMLButtonElement){portrait.type='button';portrait.id='blind-boss-picker';portrait.disabled=!writable||!current;portrait.setAttribute('aria-label',id?'Cambiar jefe: '+name:'Introducir jefe');portrait.onclick=()=>openPicker('boss',portrait,state);}
   if(id)portrait.append(blindArt(id,name));else portrait.append(el('span','+','blind-pixel-plus'));
   const amounts=el('div','','blind-amounts');let target:number|undefined,reward:number|undefined;
   if(active){target=value(current.target);reward=value(current.reward);}else if(kind==='boss'){target=value(visibleBoss?.target);reward=value(visibleBoss?.reward);}else if(anteValue!==undefined){const requirement=blindRequirement(anteValue,kind,'none',deckId);if(requirement.ok){target=requirement.target;reward=requirement.reward;}}
   if(kind==='boss'&&id)amounts.append(el('p',bossEffects[id]??'Efecto no compatible.','blind-boss-effect'));
   const amount=el('strong',target===undefined?'—':target.toLocaleString('es'),'blind-score-target');amount.dataset.target=target===undefined?'unknown':String(target);amounts.append(el('span','Puntúa al menos'),amount,el('span','Premio: '+(reward===undefined?'—':reward<=8?'$'.repeat(reward):'$'+reward.toLocaleString('es')),'blind-reward'));
   card.append(select,band,portrait,amounts);
   if(kind!=='boss'){
    const row=el('div','','blind-skip-row'),slot=el('button','','blind-tag-slot');slot.type='button';slot.dataset.tagSlot=kind;
    const saved=state.schemaVersion==='0.2'?state.blindTags?.find(t=>t.ante===anteValue&&t.kind===kind)?.tag:undefined;
    const tag=active&&state.schemaVersion==='0.2'&&state.phase==='blind_select'?value(state.phaseData.skipTag):value(saved);
    slot.dataset.empty=String(!tag);slot.setAttribute('aria-label',tag?'Cambiar '+(tagDefinition(tag)?.name??tag):'Introducir etiqueta: '+labels[kind]);slot.title=tag?tagDefinition(tag)?.name??tag:'Introducir etiqueta';slot.disabled=!writable||past||!current;slot.append(tag?tagArt(tag,tagDefinition(tag)?.name??tag):el('span','+','blind-pixel-plus'));slot.onclick=()=>openPicker(kind,slot,state);
    const skip=el('button','Saltar ciega','blind-skip');skip.type='button';skip.id='blind-skip-'+kind;skip.disabled=!active||!writable;skip.title='Registrar un salto que ya realizaste en Balatro';skip.onclick=options.skip;row.append(slot,skip);card.append(el('div','o','blind-or'),row);
   }else {const next=el('div','','blind-up-ante');next.append(el('strong','Sube el ante'),el('span','Aumentan las ciegas'),el('span','Renueva las ciegas'));card.append(next);}
   cards.append(card);
  }
  if(snapshot.dirty)error.textContent='Termina la edición pendiente para registrar etiquetas o avanzar.';
 }
 const resize=()=>{const frame=document.getElementById('app-viewport')!;if(!frame.clientWidth||!frame.clientHeight)return;const scale=Math.min(frame.clientWidth/1280,frame.clientHeight/600);stage.style.setProperty('--blind-scale',String(scale));stage.style.setProperty('--blind-stage-height',`${Math.max(600,frame.clientHeight/scale)}px`);};
 const observer=new ResizeObserver(resize);observer.observe(document.getElementById('app-viewport')!);window.addEventListener('hashchange',()=>{const active=location.hash==='#blind';background.setActive(active);if(!active&&picker.open)picker.close();if(active){refresh();resize();}});resize();
 return {refresh};
}
