import {DECK_PROFILES,deckDefinition,deckProfile} from '../catalog/decks.js';
import type {Fact,GameState} from '../state/model.js';
import {deckArt,stakeArt} from './deck-art.js';
import {layoutPoint} from './orientation.js';
import type {RunStartBridge} from './run-start-bridge.js';

const deckOrder=['red','blue','yellow','green','black','magic','nebula','ghost','abandoned','checkered','zodiac','painted','anaglyph','plasma','erratic'] as const;
const decks=deckOrder.map(id=>[id,DECK_PROFILES[id]] as const);
const stakes=[['white','Blanca'],['red','Roja'],['green','Verde'],['black','Negra'],['blue','Azul'],['purple','Morada'],['orange','Naranja'],['gold','Dorada']] as const;
type Tab='new'|'continue'|'challenges';
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',className='')=>{const e=document.createElement(tag);e.textContent=text;e.className=className;return e;};
const known=<T>(fact:Fact<T>|undefined)=>fact?.status==='known'?fact.value:undefined;

function deckPanel(){
 const panel=el('div','','setup-deck-focus'),portrait=el('div','','setup-deck-portrait'),info=el('div','','setup-deck-info');
 const name=el('h2'),body=el('div','','setup-deck-body');
 info.append(name,body);panel.append(portrait,info);
 return {panel,portrait,name,body};
}
function stakePanel(){
 const panel=el('div','','setup-stake-focus'),chip=el('div','','setup-stake-portrait'),info=el('div','','setup-stake-info');
 const side=el('span','Apuesta','setup-stake-caption'),name=el('h2'),effect=el('p');
 side.setAttribute('aria-hidden','true');info.append(name,effect);panel.append(side,chip,info);
 return {panel,chip,name,effect};
}
function deckDescription(effect:string){
 const description=el('p','','setup-deck-description');
 for(const part of effect.replace(' (peso 2)','').split(/([+−]\$?\d+)/)){
  description.append(/^[+−]/.test(part)?el('b',part):document.createTextNode(part));
 }
 return description;
}
function savedPreview(state:GameState){
 const deck=deckPanel(),stake=stakePanel(),id=known(state.observed.deckId)??'',name=deckProfile(id)?.name??'Baraja desconocida';
 deck.name.textContent=name;deck.portrait.append(deckArt(id,name));
 const stakeId=known(state.observed.stakeId),stakeName=stakes.find(([id])=>id===stakeId)?.[1];
 stake.name.textContent=stakeName?'Apuesta '+stakeName.toLowerCase():'Apuesta desconocida';
 stake.effect.textContent=stakeId==='white'?'Dificultad base':stakeName?'Apuesta '+stakeName.toLowerCase():'Sin registrar';
 stake.chip.append(stakeArt(stakeId??'',stake.name.textContent));
 const rail=el('div','','setup-stake-rail');rail.setAttribute('aria-hidden','true');
 for(const [id] of stakes){const dot=el('i');dot.classList.toggle('selected',id===stakeId);rail.append(dot);}deck.panel.append(rail);
 const observed=state.observed,upcoming=known(observed.nextBlind);
 const origin=state.schemaVersion==='0.2'&&state.phase==='shop'?known(state.phaseData.origin):
  state.schemaVersion==='0.2'&&state.phase==='open_pack'?known(state.phaseData.context?.shopOrigin):
  state.schemaVersion==='0.2'&&(state.phase==='in_round'||state.phase==='cashout')?known(state.phaseData.blind):
  state.schemaVersion==='0.1'&&state.phase==='shop'?known(observed.lastCleared):undefined;
 const blind=origin??upcoming,skipped=known(known(observed.jokerContext)?.blindsSkipped);
 const round=blind&&skipped!==undefined?Math.max(0,(blind.ante-1)*3+({small:0,big:1,boss:2}[blind.kind])-skipped+(origin?1:0)):undefined;
 const money=known(observed.money),stats=el('dl','','setup-save-stats');
 for(const [label,value,tone] of [['Ronda',round,'round'],['Ante',blind?.ante,'ante'],['Dinero',money===undefined?undefined:'$'+money,'money'],['Mejor mano',undefined,'hand']] as const){
  const term=el('dt',label),detail=el('dd',String(value??'—'),tone);
  if(tone==='hand')detail.title='La partida no registra la puntuación de su mejor mano.';
  stats.append(term,detail);
 }
 deck.body.append(stats);
 const deckStage=el('div','','setup-deck-stage'),stakeStage=el('div','','setup-stake-stage');deckStage.append(deck.panel);stakeStage.append(stake.panel);
 const parts:HTMLElement[]=[deckStage,stakeStage];
 if(state.schemaVersion==='0.2'&&state.seed)parts.push(el('p','Semilla: '+state.seed,'setup-saved-seed'));
 return parts;
}

/** A presentation draft. Only the explicit Play action may ask H1 to save a run. */
export function mountRunSetup(menu:HTMLElement,bridge:RunStartBridge){
 const host=el('section','','run-setup');host.id='run-setup';host.hidden=true;
 host.setAttribute('role','dialog');host.setAttribute('aria-modal','true');host.setAttribute('aria-label','Preparar partida');
 const panel=el('div','','run-setup-panel');panel.tabIndex=-1;host.append(panel);menu.append(host);
 const tabs=el('div','','run-setup-tabs');tabs.setAttribute('role','tablist');tabs.setAttribute('aria-label','Tipo de partida');
 const buttons=new Map<Tab,HTMLButtonElement>();
 const content=el('div','','run-setup-content');content.id='setup-tab-panel';content.setAttribute('role','tabpanel');
 for(const [id,label] of [['new','Nueva partida'],['continue','Continuar'],['challenges','Retos']] as const){
  const b=el('button',label);b.type='button';b.id='setup-tab-'+id;b.setAttribute('role','tab');b.setAttribute('aria-controls',content.id);
  b.onclick=()=>{tab=id;render();};b.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const order=[...buttons.keys()],index=order.indexOf(id);const next=event.key==='Home'?0:event.key==='End'?2:(index+(event.key==='ArrowRight'?1:2))%3;tab=order[next]!;render();buttons.get(tab)!.focus();};buttons.set(id,b);tabs.append(b);
 }
 const fresh=el('div','','setup-new');fresh.id='setup-new';
 const deckStage=el('div','','setup-deck-stage');deckStage.id='setup-decks';deckStage.setAttribute('role','group');deckStage.setAttribute('aria-label','Barajas');
 const neighborDecks=el('div','','setup-deck-neighbors'),{panel:focus,portrait,name:deckName,body:deckEffect}=deckPanel();
 deckName.id='setup-deck-name';deckEffect.id='setup-deck-effect';deckStage.append(neighborDecks,focus);
 const deckDots=el('div','','setup-dots');deckDots.id='setup-deck-dots';deckDots.setAttribute('role','radiogroup');deckDots.setAttribute('aria-label','Elegir baraja');
 const stakeStage=el('div','','setup-stake-stage');stakeStage.id='setup-stakes';stakeStage.setAttribute('role','group');stakeStage.setAttribute('aria-label','Dificultad');
 const neighborStakes=el('div','','setup-stake-neighbors'),{panel:stakeFocus,chip,name:stakeName,effect:stakeEffect}=stakePanel();
 stakeName.id='setup-stake-name';stakeEffect.id='setup-stake-effect';stakeStage.append(neighborStakes,stakeFocus);
 const stakeDots=el('div','','setup-dots');stakeDots.id='setup-stake-dots';stakeDots.setAttribute('role','radiogroup');stakeDots.setAttribute('aria-label','Elegir dificultad');
 const seedRow=el('div','','setup-seed-input');
 const seed=el('input');seed.id='setup-seed';seed.type='text';seed.maxLength=64;seed.placeholder='Introducir semilla';seed.autocomplete='off';seed.spellcheck=false;seed.setAttribute('aria-describedby','setup-seed-help');
 seed.setAttribute('aria-label','Semilla');
 const seedHelp=el('small','Sin desbloqueos ni descubrimientos');seedHelp.id='setup-seed-help';
 const paste=el('button','Pegar semilla','setup-paste');paste.id='setup-paste';paste.type='button';
 seedRow.append(seedHelp,seed,paste);focus.append(stakeDots);fresh.append(deckStage,deckDots,stakeStage,seedRow);
 const summary=el('div','','setup-summary');summary.id='setup-summary';summary.setAttribute('aria-live','polite');content.append(fresh,summary);
 const seedToggle=el('label','','setup-seed-toggle');seedToggle.htmlFor='setup-seeded';const seedText=el('span','Con semilla');const seeded=el('input');seeded.id='setup-seeded';seeded.type='checkbox';seeded.setAttribute('aria-controls',seedRow.id='setup-seed-row');const mark=el('span','','setup-check');mark.setAttribute('aria-hidden','true');seedToggle.append(seedText,seeded,mark);
 seeded.onchange=()=>{render();if(seeded.checked)seed.focus();};
 const play=el('button','JUGAR','setup-play');play.id='setup-play';play.type='button';
 const back=el('a','Volver','setup-back');back.id='setup-back';back.href='#menu';
 const error=el('p','','setup-error');error.id='setup-error';error.setAttribute('role','alert');
 const actions=el('div','','setup-start-row');actions.append(seedToggle,play);panel.append(tabs,content,actions,back,error);
 let open=false,tab:Tab='new',deck=0,stake=0,initialized=false,starting=false,pasteRevision=0;
 seed.oninput=()=>{pasteRevision++;if(!play.disabled)error.textContent='';};
 paste.onclick=async()=>{
  const revision=++pasteRevision;
  try{
   const value=(await navigator.clipboard.readText()).trim();
   if(revision!==pasteRevision)return;
   if(!value||value.length>seed.maxLength){error.textContent='Pega una semilla de 1 a 64 caracteres.';seed.focus();return;}
   seed.value=value;render();seed.focus();
  }catch{
   if(revision!==pasteRevision)return;
   error.textContent='Pega la semilla directamente en el campo.';seed.focus();seed.select();
  }
 };
 const dotInputs={deck:[] as HTMLInputElement[],stake:[] as HTMLInputElement[]};
 const choose=(kind:'deck'|'stake',index:number)=>{if(kind==='deck')deck=(index+decks.length)%decks.length;else stake=(index+stakes.length)%stakes.length;render();};
 for(const [kind,items,container] of [['deck',decks.map(([id,p])=>[id,p.name]),deckDots],['stake',stakes,stakeDots]] as const){
  items.forEach((item,index)=>{const label=el('label','','setup-dot'),input=el('input'),dot=el('span');input.type='radio';input.name='setup-'+kind;input.value=item[0];input.setAttribute('aria-label',item[1]);input.onchange=()=>choose(kind,index);dot.setAttribute('aria-hidden','true');label.append(input,dot);container.append(label);dotInputs[kind].push(input);});
  container.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const current=kind==='deck'?deck:stake,index=event.key==='Home'?0:event.key==='End'?items.length-1:current+(event.key==='ArrowRight'?1:-1);choose(kind,index);dotInputs[kind][kind==='deck'?deck:stake]!.focus();};
 }
 for(const [kind,container] of [['deck',neighborDecks],['stake',neighborStakes]] as const){
  for(const direction of [-1,1]){const b=el('button',direction<0?'‹':'›','setup-arrow');b.type='button';b.id=`setup-${kind}-${direction<0?'prev':'next'}`;b.dataset.direction=String(direction);b.setAttribute('aria-label',`${kind==='deck'?'Baraja':'Dificultad'} ${direction<0?'anterior':'siguiente'}`);b.setAttribute('aria-controls',kind==='deck'?'setup-deck-name':'setup-stake-name');b.onclick=()=>choose(kind,(kind==='deck'?deck:stake)+direction);container.append(b);}
 }
 function render(){
  pasteRevision++;const snapshot=bridge.snapshot();error.textContent='';
  for(const [id,b] of buttons){const active=id===tab;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;}content.setAttribute('aria-labelledby','setup-tab-'+tab);
  fresh.hidden=tab!=='new';summary.hidden=tab==='new';seedToggle.hidden=tab!=='new';
  seedRow.hidden=!seeded.checked;seed.disabled=!seeded.checked;
  play.textContent='JUGAR';play.disabled=false;
  if(tab==='new'){
   const [id,p]=decks[deck]!;portrait.replaceChildren(deckArt(id,p.name));deckName.textContent=p.name;deckEffect.replaceChildren(deckDescription(p.effect));
   const [stakeId,name]=stakes[stake]!;chip.replaceChildren(stakeArt(stakeId,name));stakeName.textContent='Apuesta '+name.toLowerCase();stakeEffect.textContent=stake===0?'Dificultad base':'Aún no compatible';
   dotInputs.deck.forEach((input,index)=>input.checked=index===deck);dotInputs.stake.forEach((input,index)=>input.checked=index===stake);
   const limitation=!deckDefinition(id)?'Esta baraja todavía no permite iniciar una partida.':stake!==0?'Esta dificultad todavía no permite iniciar una partida.':snapshot.loadFailed?'Recupera la copia de la partida desde Continuar.':snapshot.dirty?'Hay cambios pendientes en la partida actual.':!snapshot.writable?'Esta pestaña está en modo de lectura.':'';
   play.disabled=!!limitation;error.textContent=limitation;play.setAttribute('aria-describedby','setup-error');
  }else{
   summary.replaceChildren();
   if(tab==='challenges'){summary.append(el('h2','Retos'),el('p','Aún no disponibles en el asesor.'));play.disabled=true;}
   else if(!snapshot.record){summary.append(el('h2',snapshot.loadFailed?'No se pudo leer la partida':'Sin partida guardada'));const recover=el('a','Importar una copia','setup-import');recover.href='#archive';summary.append(recover);play.disabled=true;}
   else summary.append(...savedPreview(snapshot.record.state));
  }
 }
 play.onclick=()=>{
  error.textContent='';if(tab==='continue'){const state=bridge.snapshot().record?.state;if(state)location.hash=(['blind_select','in_round','cashout'].includes(state.phase)||state.schemaVersion==='0.2'&&state.phase==='shop')?'blind':state.phase==='open_pack'?'pack':'table';else render();return;}if(tab!=='new'||play.disabled)return;
  if(seeded.checked&&!seed.value.trim()){error.textContent='Introduce la semilla o desmarca «Con semilla».';seed.focus();return;}
  if(starting)return;
  starting=true;
  const [deckId]=decks[deck]!;const problem=bridge.requestStart({deckId,profileConfirmed:true,replaceConfirmed:true,...(seeded.checked?{seed:seed.value.trim()}: {})},()=>{location.hash='blind';});if(problem){starting=false;error.textContent=problem;}
 };
 let drag:{id:number;x:number;y:number;moved:boolean}|null=null,suppressClick=false;
 function gestures(stage:HTMLElement,kind:'deck'|'stake'){
  stage.addEventListener('pointerdown',event=>{if(event.button!==0)return;const point=layoutPoint(event.clientX,event.clientY);drag={id:event.pointerId,...point,moved:false};});
  stage.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;const point=layoutPoint(event.clientX,event.clientY);if(Math.abs(point.x-drag.x)>10){drag.moved=true;stage.setPointerCapture(event.pointerId);}});
  stage.addEventListener('pointerup',event=>{if(!drag||drag.id!==event.pointerId)return;const start=drag,point=layoutPoint(event.clientX,event.clientY);drag=null;const dx=point.x-start.x,dy=point.y-start.y;suppressClick=start.moved;if(Math.abs(dx)>24&&Math.abs(dx)>Math.abs(dy))choose(kind,(kind==='deck'?deck:stake)+(dx<0?1:-1));if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);});
  stage.addEventListener('click',event=>{if(suppressClick){event.stopImmediatePropagation();event.preventDefault();suppressClick=false;}},true);
  stage.addEventListener('pointercancel',()=>{drag=null;suppressClick=false;});
 }
 gestures(deckStage,'deck');gestures(stakeStage,'stake');
 host.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();location.hash='menu';}else if(event.key==='Tab'){const focusable=Array.from(panel.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled)')).filter(e=>e.getClientRects().length&&e.tabIndex>=0);const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}});
 const resize=()=>{
  if(!open)return;
  const {clientWidth:w,clientHeight:h}=document.getElementById('app-viewport')!;
  const compact=h<540||w<960||matchMedia('(pointer: coarse)').matches;
  const scale=compact?Math.min((w-24)/480,(h-18)/480):Math.min(w/640,h/600);
  panel.style.setProperty('--setup-scale',String(scale));
 };
 const observer=new ResizeObserver(resize);observer.observe(menu);
 return {setOpen(value:boolean){if(open===value)return;open=value;starting=false;pasteRevision++;host.hidden=!value;for(const child of Array.from(menu.children))if(child!==host&&child instanceof HTMLElement&&!child.matches('canvas,.menu-vignette,.menu-scanlines'))child.inert=value;menu.dataset.setupOpen=String(value);if(value){tab='new';if(!initialized){const current=bridge.snapshot().record?.state.observed.deckId;if(current?.status==='known'){const index=decks.findIndex(([id])=>id===current.value);if(index>=0)deck=index;}initialized=true;}render();resize();buttons.get(tab)!.focus({preventScroll:true});}},focus(){buttons.get(tab)!.focus({preventScroll:true});}};
}
