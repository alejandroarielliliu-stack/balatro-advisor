import {DECK_PROFILES,deckDefinition} from '../catalog/decks.js';
import {deckArt,stakeArt} from './deck-art.js';
import {layoutPoint} from './orientation.js';
import type {RunStartBridge} from './run-start-bridge.js';

const deckOrder=['red','blue','yellow','green','black','magic','nebula','ghost','abandoned','checkered','zodiac','painted','anaglyph','plasma','erratic'] as const;
const decks=deckOrder.map(id=>[id,DECK_PROFILES[id]] as const);
const stakes=[['white','Blanca'],['red','Roja'],['green','Verde'],['black','Negra'],['blue','Azul'],['purple','Morada'],['orange','Naranja'],['gold','Dorada']] as const;
type Tab='new'|'continue'|'challenges';
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',className='')=>{const e=document.createElement(tag);e.textContent=text;e.className=className;return e;};

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
 const neighborDecks=el('div','','setup-deck-neighbors');const focus=el('div','','setup-deck-focus');
 const portrait=el('div','','setup-deck-portrait'),info=el('div','','setup-deck-info');
 const deckName=el('h2'),deckEffect=el('p');deckName.id='setup-deck-name';deckEffect.id='setup-deck-effect';info.append(deckName,deckEffect);focus.append(portrait,info);deckStage.append(neighborDecks,focus);
 const deckDots=el('div','','setup-dots');deckDots.id='setup-deck-dots';deckDots.setAttribute('role','radiogroup');deckDots.setAttribute('aria-label','Elegir baraja');
 const stakeStage=el('div','','setup-stake-stage');stakeStage.id='setup-stakes';stakeStage.setAttribute('role','group');stakeStage.setAttribute('aria-label','Dificultad');
 const neighborStakes=el('div','','setup-stake-neighbors'),stakeFocus=el('div','','setup-stake-focus'),chip=el('div','','setup-stake-portrait'),stakeInfo=el('div','','setup-stake-info');
 const stakeName=el('h2'),stakeEffect=el('p');stakeName.id='setup-stake-name';stakeEffect.id='setup-stake-effect';stakeInfo.append(stakeName,stakeEffect);stakeFocus.append(chip,stakeInfo);stakeStage.append(neighborStakes,stakeFocus);
 const stakeDots=el('div','','setup-dots');stakeDots.id='setup-stake-dots';stakeDots.setAttribute('role','radiogroup');stakeDots.setAttribute('aria-label','Elegir dificultad');
 const seedRow=el('label','','setup-seed-input');seedRow.htmlFor='setup-seed';const seedLabel=el('span','Semilla','sr-only');
 const seed=el('input');seed.id='setup-seed';seed.type='text';seed.maxLength=64;seed.placeholder='Introducir semilla';seed.autocomplete='off';seed.spellcheck=false;seed.setAttribute('aria-describedby','setup-seed-help');
 const seedHelp=el('small','Solo referencia');seedHelp.id='setup-seed-help';seedRow.append(seedLabel,seed,seedHelp);fresh.append(deckStage,deckDots,stakeStage,stakeDots,seedRow);
 const summary=el('div','','setup-summary');summary.id='setup-summary';summary.setAttribute('aria-live','polite');content.append(fresh,summary);
 const seedToggle=el('label','','setup-seed-toggle');seedToggle.htmlFor='setup-seeded';const seedText=el('span','Con semilla');const seeded=el('input');seeded.id='setup-seeded';seeded.type='checkbox';seeded.setAttribute('aria-controls',seedRow.id='setup-seed-row');const mark=el('span','','setup-check');mark.setAttribute('aria-hidden','true');seedToggle.append(seedText,seeded,mark);
 seeded.onchange=()=>{render();if(seeded.checked)seed.focus();};
 const play=el('button','JUGAR','setup-play');play.id='setup-play';play.type='button';
 const back=el('a','Volver','setup-back');back.id='setup-back';back.href='#menu';
 const error=el('p','','setup-error');error.id='setup-error';error.setAttribute('role','alert');
 const replaceRow=el('label','','setup-replace'),replace=el('input');replace.type='checkbox';replace.id='setup-replace';replaceRow.append(replace,el('span','Sustituir la partida guardada'));replace.onchange=()=>render();
 const actions=el('div','','setup-start-row');actions.append(seedToggle,play);panel.append(tabs,content,replaceRow,actions,back,error);
 let open=false,tab:Tab='new',deck=0,stake=0,initialized=false;
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
  const snapshot=bridge.snapshot();error.textContent='';
  for(const [id,b] of buttons){const active=id===tab;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;}content.setAttribute('aria-labelledby','setup-tab-'+tab);
  fresh.hidden=tab!=='new';summary.hidden=tab==='new';seedToggle.hidden=tab!=='new';
  replaceRow.hidden=tab!=='new'||!snapshot.record;
  seedRow.hidden=!seeded.checked;seed.disabled=!seeded.checked;
  play.textContent='JUGAR';play.disabled=false;
  if(tab==='new'){
   const [id,p]=decks[deck]!;portrait.replaceChildren(deckArt(id,p.name));deckName.textContent=p.name;deckEffect.textContent=p.effect.replace(' (peso 2)','');
   const [stakeId,name]=stakes[stake]!;chip.replaceChildren(stakeArt(stakeId,name));stakeName.textContent='Dificultad '+name.toLowerCase();stakeEffect.textContent=stake===0?'Dificultad base':'Aún no compatible';
   dotInputs.deck.forEach((input,index)=>input.checked=index===deck);dotInputs.stake.forEach((input,index)=>input.checked=index===stake);
   const limitation=!deckDefinition(id)?'Esta baraja todavía no permite iniciar una partida.':stake!==0?'Esta dificultad todavía no permite iniciar una partida.':snapshot.loadFailed?'Recupera la copia de la partida desde Continuar.':snapshot.dirty?'Hay cambios pendientes en la partida actual.':!snapshot.writable?'Esta pestaña está en modo de lectura.':'';
   play.disabled=!!limitation||!!snapshot.record&&!replace.checked;error.textContent=limitation;play.setAttribute('aria-describedby','setup-error');
  }else{
   summary.replaceChildren();
   if(tab==='challenges'){summary.append(el('h2','Retos'),el('p','Aún no disponibles en el asesor.'));play.disabled=true;}
   else if(!snapshot.record){summary.append(el('h2',snapshot.loadFailed?'No se pudo leer la partida':'Sin partida guardada'));const recover=el('a','Importar una copia','setup-import');recover.href='#archive';summary.append(recover);play.disabled=true;}
   else{const state=snapshot.record.state,id=state.observed.deckId.status==='known'?state.observed.deckId.value:'',profile=DECK_PROFILES[id as keyof typeof DECK_PROFILES];summary.append(deckArt(id,profile?.name??'Baraja desconocida'),el('h2',profile?.name??'Partida guardada'));const blind=state.observed.nextBlind;const money=state.observed.money;summary.append(el('p',`Ante ${blind.status==='known'?blind.value.ante:'—'} · $${money.status==='known'?money.value:'—'}`));if(state.schemaVersion==='0.2'&&state.seed)summary.append(el('p','Semilla: '+state.seed));}
  }
 }
 play.onclick=()=>{
  error.textContent='';if(tab==='continue'){const state=bridge.snapshot().record?.state;if(state)location.hash=state.phase==='blind_select'?'blind':'table';else render();return;}if(tab!=='new'||play.disabled)return;
  if(seeded.checked&&!seed.value.trim()){error.textContent='Introduce la semilla o desmarca «Con semilla».';seed.focus();return;}
  const [deckId]=decks[deck]!;const problem=bridge.requestStart({deckId,profileConfirmed:true,replaceConfirmed:replace.checked,...(seeded.checked?{seed:seed.value.trim()}: {})},()=>{location.hash='blind';});if(problem)error.textContent=problem;
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
 const resize=()=>{if(!open)return;const frame=document.getElementById('app-viewport')!;panel.style.setProperty('--setup-scale',String(Math.min(1,(frame.clientWidth-24)/540,(frame.clientHeight-18)/540)));};
 const observer=new ResizeObserver(resize);observer.observe(menu);
 return {setOpen(value:boolean){if(open===value)return;open=value;host.hidden=!value;for(const child of Array.from(menu.children))if(child!==host&&child instanceof HTMLElement&&!child.matches('canvas,.menu-vignette,.menu-scanlines'))child.inert=value;menu.dataset.setupOpen=String(value);if(value){tab='new';if(!initialized){const current=bridge.snapshot().record?.state.observed.deckId;if(current?.status==='known'){const index=decks.findIndex(([id])=>id===current.value);if(index>=0)deck=index;}initialized=true;}render();resize();buttons.get(tab)!.focus({preventScroll:true});}},focus(){buttons.get(tab)!.focus({preventScroll:true});}};
}
