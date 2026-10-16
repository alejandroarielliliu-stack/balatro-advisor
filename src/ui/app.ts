import {ALL_JOKER_FACTS} from '../catalog/all-joker-facts.js';
import {evaluateJokerFit,evaluateOwnedFits} from '../advisor/quick-fit.js';
import {renderQuickFit,fitLabel,fitReason,fitTone} from './quick-fit-view.js';
import {evaluateComposition} from '../advisor/composition.js';
import {mountComposition} from './composition-view.js';
import {markPreview,previewIssueStatus} from './preview-state.js';
import {historyResourceDelta} from '../rules/history-jokers.js';
import {mountCounterFields} from './joker-counters.js';
import {jokerResourceDelta} from '../catalog/joker-resources.js';
import {cataloguedVouchers,voucherResources} from '../catalog/vouchers.js';
import {mountVouchers} from './vouchers.js';
import {invalidateCandidates,readShopSnapshot} from './storefront.js';
import {blindRequirement} from '../catalog/blinds.js';
import {previewJoker} from '../evaluation/joker-preview.js';
import {contextRatings} from '../advisor/ratings.js';
import type {JokerReference} from '../catalog/collection.js';
import {mountDeckEditor} from './deck-editor.js';
import {DECK_PROFILES,resolveDeck,deckDefinition} from '../catalog/decks.js';
import {mountCollection} from './collection.js';
import {createConfirmedStore,CONFIRMED_STORAGE_KEY,analysisBinding,MAX_RECORD_BYTES,validateConfirmedRecord} from '../storage/confirmed-store.js';
import type {ConfirmedRecord} from '../storage/confirmed-store.js';
import {createShopSessionStore} from '../storage/shop-session.js';
import type {ShopOffer} from '../storage/shop-session.js';
import type {ShopSnapshot} from '../advisor/shop-context.js';
import {createDraft} from '../state/model.js';
import type {GameState,Fact,Result,Issue,JokerInstance} from '../state/model.js';
import {validateState,parseState} from '../state/validation.js';
import {ENGINE_RULESET,GAME_VERSION,jokerDefinition,HAND_BASES,standardDeck} from '../catalog/initial.js';
import {enumerateActions,applyShopAction} from '../rules/shop.js';
import type {ShopAction} from '../rules/shop.js';
import {adviseShop} from '../advisor/advisor.js';
import type {Advice,AdvisorScenario} from '../advisor/advisor.js';
import {validateRoundPlan,evaluateRoundPlan} from '../evaluation/plan.js';
import type {RoundPlan} from '../evaluation/plan.js';
import {comparisonDemoScenarios} from '../demo-scenarios.js';
import {WriterLock} from './writer.js';
import {compareShopBounds} from '../evaluation/shop-bounds.js';
import {mountHorizon} from './horizon-ui.js';
import {mountWorkspace,organizeRecord,decorateJoker,attachCardPreview,comparisonOverview,fillJokerSlots} from './workspace.js';

const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const node=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',className='')=>{const n=document.createElement(tag);n.textContent=text;n.className=className;return n;};
const known=<T>(value:T):Fact<T>=>({status:'known',source:'manual',value});
const unknown=()=>({status:'unknown',reason:'No transcrito.'} as const);
const value=<T>(f:Fact<T>|undefined):T|undefined=>f?.status==='known'?f.value:undefined;
const now=()=>new Date().toISOString();
const uuid=()=>crypto.randomUUID();
const names:Record<string,string>=Object.fromEntries(Object.entries(ALL_JOKER_FACTS).map(([id,d])=>[id,d.name]));
const handNames:Record<string,string>={five_kind:'Cinco iguales',flush_house:'Flush House',flush_five:'Flush Five',high_card:'Carta alta',pair:'Pareja',two_pair:'Doble pareja',three_kind:'Trío',straight:'Escalera',flush:'Color',full_house:'Full',four_kind:'Póquer',straight_flush:'Escalera de color'};
const bossNames={none:'Sin efecto de jefe',the_psychic:'The Psychic',the_water:'The Water',the_wall:'The Wall',violet_vessel:'Violet Vessel'};
let record:ConfirmedRecord|null=null,seenRaw:string|null=null,loadFailed=false,advice:Advice|null=null,demoMode=false,dirty=false;
let scenarioReaders:(()=>AdvisorScenario)[]=[];
let refreshCashout=()=>{};let cashoutTimer:ReturnType<typeof setTimeout>|undefined;
let readLiveState:((quick?:boolean)=>GameState)|null=null;let quietRead=false;
let refreshOwnedFits=()=>{};
let handRequest=0;
function liveState(quick=false){quietRead=true;try{if(!readLiveState)throw new Error('Completa los datos de la partida.');return readLiveState(quick);}finally{quietRead=false;}}
let dialogAction:(()=>boolean)|null=null;
const lock=new WriterLock(()=>updateOwnership());
const store=createConfirmedStore(()=>({getItem:k=>localStorage.getItem(k),setItem:(k,v)=>{lock.assert();localStorage.setItem(k,v);}}));
const shopSession=createShopSessionStore(()=>({getItem:k=>localStorage.getItem(k),setItem:(k,v)=>{lock.assert();localStorage.setItem(k,v);}}));
function message(text:string,error=false){$('message').textContent=text;$('message').className=error?'error':'';}
function problem(errors:Issue[]){message(errors.map(e=>`${e.message} (${e.path})`).join(' '),true);}
function field(id:string,label:string,type='text',initial=''){
  const wrap=node('label');wrap.htmlFor=id;wrap.append(node('span',label));
  const input=node('input');input.id=id;input.type=type;input.value=initial;if(type==='number'){input.step='1';input.inputMode='numeric';}
  const error=node('span','','error');error.id=id+'-error';input.setAttribute('aria-describedby',error.id);wrap.append(input,error);return {wrap,input,error};
}
function select(id:string,label:string,choices:Record<string,string>,selected=''){
  const wrap=node('label');wrap.htmlFor=id;wrap.append(node('span',label));const input=node('select');input.id=id;
  for(const [key,labelText] of Object.entries(choices)){const o=node('option',labelText);o.value=key;input.append(o);}input.value=selected;
  const error=node('span','','error');error.id=id+'-error';input.setAttribute('aria-describedby',error.id);wrap.append(input,error);return {wrap,input,error};
}
function checkbox(id:string,label:string,checked=false){const wrap=node('label','','check');const input=node('input');input.type='checkbox';input.id=id;input.checked=checked;wrap.append(input,node('span',label));return {wrap,input};}
function button(text:string,fn:()=>void,className='secondary'){const b=node('button',text,className);b.type='button';b.onclick=fn;return b;}
function details(title:string,data:unknown){const d=node('details');d.append(node('summary',title),node('pre',typeof data==='string'?data:JSON.stringify(data,null,2)));return d;}
function invalidate(text='Los datos cambiaron. Vuelve a consultar las recomendaciones.',refreshShop=true) {handRequest++;if(refreshShop)invalidateCandidates();refreshOwnedFits();$('hand-results')?.replaceChildren();clearTimeout(cashoutTimer);cashoutTimer=setTimeout(()=>refreshCashout(),230);$('draft-status').hidden=!dirty;advice=null;demoMode=false;$('advice').replaceChildren(node('p',text,'empty'));$('bounds')?.replaceChildren();$('horizon-results')?.replaceChildren();$('exit-demo').hidden=true;updateMigrationButton();}
function canWrite(){
  if(!lock.owned){message('Esta pestaña es de lectura. Solicita el control para guardar.',true);return false;}
  try{if(localStorage.getItem(CONFIRMED_STORAGE_KEY)!==seenRaw){reload();message('La partida cambió. Revisa los datos y vuelve a calcular.',true);return false;}}
  catch{message('No se pudo leer el almacenamiento. No se guardó nada.',true);return false;}
  return true;
}
function commit<T>(operation:()=>Result<T>):boolean{
  if(!canWrite())return false;
  const result=operation();if(!result.ok){problem(result.errors);return false;}
  reload();message('Guardado confirmado. Estado e historial actualizados juntos.');return true;
}
function updateOwnership(){
  const area=$('ownership');if(!area)return;area.replaceChildren();
  const badge=document.querySelector('.local-badge');if(badge)badge.textContent=lock.owned?'● Local':'◌ Solo lectura';
  area.append(node('span',!lock.supported?'Solo lectura: este navegador no ofrece Web Locks en este origen. Usa un navegador compatible en localhost.':lock.owned?'Esta pestaña tiene el control de escritura.':lock.waiting?'Esperando control: libera la pestaña escritora o ciérrala.':'Modo lectura: otra pestaña puede tener el control de escritura.'));
  area.append(button(lock.owned?'Liberar control':lock.waiting?'Cancelar solicitud':'Solicitar control',()=>lock.owned||lock.waiting?lock.release():lock.acquire(true)));
  if(!lock.owned && $('confirmation')?.hasAttribute('open')){$<HTMLDialogElement>('confirmation').close();dialogAction=null;}
  document.querySelectorAll<HTMLButtonElement>('[data-write]').forEach(b=>b.disabled=!lock.owned||loadFailed||b.dataset.localDisabled==='true');
  // Import can explicitly replace a corrupt document, with validation and confirmation.
  $<HTMLInputElement>('import-file').disabled=!lock.owned;
}
function openDialog(title:string,body:HTMLElement,acceptText:string,action:()=>boolean){
  $('dialog-title').textContent=title;$('dialog-body').replaceChildren(body);$('dialog-error').textContent='';
  $('dialog-accept').textContent=acceptText;$<HTMLButtonElement>('dialog-accept').disabled=false;dialogAction=action;$<HTMLDialogElement>('confirmation').showModal();
}
$('dialog-cancel').onclick=()=>{$<HTMLDialogElement>('confirmation').close();dialogAction=null;};
$('dialog-accept').onclick=()=>{if(!dialogAction)return;const b=$<HTMLButtonElement>('dialog-accept');b.disabled=true;try{if(dialogAction()){dialogAction=null;$<HTMLDialogElement>('confirmation').close();}else $('dialog-error').textContent=$('message').textContent??'No se guardó.';}finally{b.disabled=false;}};
$<HTMLDialogElement>('confirmation').addEventListener('cancel',()=>{dialogAction=null;});

function reload(){
  dirty=false;
  const loaded=store.load();loadFailed=!loaded.ok;record=loaded.ok?loaded.value:null;
  try{seenRaw=localStorage.getItem(CONFIRMED_STORAGE_KEY);}catch{loadFailed=true;}
  if(!loaded.ok)problem(loaded.errors);
  invalidate();renderRecord();renderHistory();renderActions();renderMigrationControls();updateOwnership();
  document.querySelectorAll('[data-card-picker]').forEach(e=>e.dispatchEvent(new Event('refreshcards')));
  document.querySelectorAll('[data-composition-preview]').forEach(e=>e.dispatchEvent(new Event('input')));
}
function formError(id:string,text:string){if(quietRead)return;const error=$(id+'-error'),input=$(id);if(error)error.textContent=text;if(input)input.setAttribute('aria-invalid','true');}
function resetFormErrors(){document.querySelectorAll('.form-error,.error[id$="-error"]').forEach(e=>e.textContent='');document.querySelectorAll('[aria-invalid]').forEach(e=>e.removeAttribute('aria-invalid'));}
function unsupportedForEditor(s:GameState){
  const o=s.observed;
  if(s.phase!=='shop')return true;
  if(s.rulesetId!==ENGINE_RULESET || value(o.gameVersion)!==GAME_VERSION || value(o.modsPresent)!==false || !deckDefinition(value(o.deckId)??'') || value(o.stakeId)!=='white' || value(o.gamePlatform)!=='pc-steam')return true;
  const d=value(o.deck),extra=value(o.outOfScope);
  if(d && ('preset'in d?d.preset!=='standard52-unmodified':d.cards.some(c=>!['base','foil','holographic','polychrome'].includes(c.edition)||!['none','bonus','mult','wild','glass','steel','stone','gold','lucky'].includes(c.enhancement)||!['none','red','blue','gold','purple'].includes(c.seal)||c.extraChips<0)) || extra && (!cataloguedVouchers(extra.vouchers)||extra.consumables.length||extra.pendingTags.length||extra.otherModifiers.length))return true;
  // Shop observations are preserved even when a particular offer cannot be
  // rendered or purchased. H2 limits that operation, not the whole editor.
  return !!value(o.jokers)?.some(j=>!names[j.catalogId]||!['base','foil','holographic','polychrome','negative'].includes(value(j.edition)??'')||(value(j.stickers)?.some(s=>s!=='eternal')??true));
}
function renderRecord(){
  $('revision').textContent=record?`Revisión ${record.state.revision}`:'Sin copia guardada';
  const phases:Record<string,string>={shop:'Tienda',draft:'Fase sin registrar',unknown:'Fase sin registrar',blind_select:'Selección de ciega',in_round:'Ronda',cashout:'Cobro',open_pack:'Sobre abierto',finished:'Partida terminada'};
  const progress=$('run-progress');progress.hidden=!record;progress.textContent=record?phases[record.state.phase]??record.state.phase:'';
  progress.title=record?.state.schemaVersion==='0.2'&&record.state.phase==='unknown'?record.state.phaseData.reason:'';
  const summary=$('summary');summary.replaceChildren();const host=$('state-form');host.replaceChildren();$('record-save')?.querySelector('.save-bar')?.remove();
  if(loadFailed){host.append(node('p','No se pudo cargar el registro. No se ha sobrescrito. Puedes importar una copia validada en «Copias».','error'));return;}
  readLiveState=null;refreshOwnedFits=()=>{};const s=record?.state;
  const deckDisplay=$('active-deck');deckDisplay.textContent=s?(deckDefinition(value(s.observed.deckId)??'')?.name??`Baraja ${value(s.observed.deckId)??'desconocida'} · sin soporte`):'15 barajas · 10 con cálculo';
  if(s && unsupportedForEditor(s)){
    const text=s.schemaVersion==='0.2'&&s.phase==='unknown'?`Fase sin registrar. ${s.phaseData.reason}`:s.phase!=='shop'?'Los datos de esta fase se conservan. Su seguimiento se conectará en la siguiente entrega.':'Copia fuera del formulario compatible. Se conserva íntegra; el análisis indicará sus límites.';
    host.append(node('p',text,'notice'),details('Datos importados, sin cambios',s));return;
  }
  const form=node('form');form.id='run-form';form.noValidate=true;const fieldset=node('fieldset');form.append(fieldset);host.append(form);
  const coverage=checkbox('coverage','Partida compatible · datos confirmados',!!s);
  coverage.input.setAttribute('aria-describedby','coverage-description');
  const coverageDescription=node('p','Steam 1.0.1o-FULL sin mods, baraja seleccionada / White Stake; composición, cartas y modificadores transcritos. Vales compatibles. Los efectos aleatorios necesitan resultados explícitos de escenario. Vacío = desconocido. Transcribe los precios del juego.','muted');coverageDescription.id='coverage-description';
  fieldset.append(coverage.wrap,coverageDescription);
  const grid=node('div','','grid');fieldset.append(grid);const blind=value(s?.observed.nextBlind);
  const money=field('money','Dinero ($)','number',String(value(s?.observed.money)??''));
  const ante=field('ante','Ante','number',String(blind?.ante??1));ante.input.min='1';ante.input.max='8';
  const kind=select('blind-kind','Próxima ciega',{'':'Desconocida',small:'Small Blind',big:'Big Blind',boss:'Boss Blind'},blind?.kind??'');
  const boss=select('boss','Jefe (solo para Boss)',{'':'Desconocido',...Object.fromEntries(Object.entries(bossNames).filter(([id])=>id!=='none'))},value(blind?.bossId)??'');
  const target=field('target','Objetivo (fichas)','number',String(value(blind?.target)??''));
  const reward=field('reward','Premio de ciega ($)','number',String(value(blind?.reward)??''));
  const startingDeck=select('starting-deck','Baraja inicial',Object.fromEntries(Object.entries(DECK_PROFILES).map(([id,d])=>[id,d.name+(d.engine?'':' · catálogo')])),value(s?.observed.deckId)??'blue');
  const calculateTarget=()=>blindRequirement(Number(ante.input.value),kind.input.value,kind.input.value==='boss'?boss.input.value:'none',startingDeck.input.value);
  const initialTarget=calculateTarget();
  const manualReward=checkbox('reward-manual','Corregir premio de ciega',!!s&&(!initialTarget.ok||value(blind?.reward)!==initialTarget.reward));
  const rewardBlock=node('div','','target-control');rewardBlock.append(reward.wrap,manualReward.wrap);
  let rewardCalculated=blind?.reward.status==='known'&&blind.reward.source==='confirmedPreset';
  const updateReward=(initial=false)=>{const expected=calculateTarget();reward.input.readOnly=!manualReward.input.checked;if(!manualReward.input.checked&&(!initial||!s)){reward.input.value=expected.ok?String(expected.reward):'';rewardCalculated=true;}};
  manualReward.input.onchange=()=>updateReward();for(const control of [ante.input,kind.input,boss.input,startingDeck.input])control.addEventListener('input',()=>updateReward());updateReward(true);
  const savedVouchers=value(s?.observed.outOfScope)?.vouchers??[];
  let priorVouchers=[...savedVouchers];
  let priorResourceDelta=jokerResourceDelta((value(s?.observed.jokers)??[]).map(j=>j.catalogId));
  const vouchers=mountVouchers(savedVouchers,ids=>{
   const changed=(keys:string[])=>keys.some(id=>ids.includes(id)!==priorVouchers.includes(id));
   updateVoucherResources();
   if(ids.includes('v_hieroglyph')&&changed(['v_hieroglyph','v_grabber','v_nacho_tong']))$<HTMLInputElement>('hands').value='';
   if(ids.includes('v_petroglyph')&&changed(['v_petroglyph','v_wasteful','v_recyclomancy']))$<HTMLInputElement>('discards').value='';
   priorVouchers=[...ids];dirty=true;invalidate('Vales actualizados.');
  });
  const updateVoucherResources=()=>{const ids=vouchers.read(),r=voucherResources(startingDeck.input.value,ids),delta=jokerResourceDelta(Array.from(ownedHost.querySelectorAll<HTMLSelectElement>('select[id^=joker-]')).map(s=>s.value));r.hands+=delta.hands;r.discards+=delta.discards;r.handSize+=delta.handSize;try{r.handSize+=historyResourceDelta(Array.from(ownedHost.querySelectorAll<HTMLElement>(':scope > .joker-editor')).map(row=>ownedReaders.get(row)!())).handSize;}catch{return;}r.jokerSlots+=Array.from(ownedHost.querySelectorAll<HTMLSelectElement>('select[id^=edition-]')).filter(s=>s.value==='negative').length;for(const [id,n] of [['hands',r.hands],['discards',r.discards],['size',r.handSize],['slots',r.jokerSlots]] as const){const limited=id==='hands'&&ids.includes('v_hieroglyph')||id==='discards'&&ids.includes('v_petroglyph');if(!limited)$<HTMLInputElement>(id).value=String(n);else if(id==='hands'&&delta.hands!==priorResourceDelta.hands||id==='discards'&&delta.discards!==priorResourceDelta.discards)$<HTMLInputElement>(id).value='';}priorResourceDelta=delta;fillJokerSlots(ownedHost,r.jokerSlots);};
  const cashoutBox=node('details');cashoutBox.id='cashout-preview';cashoutBox.append(node('summary','Cobro de ronda · automático'));
  const cashoutRows=node('div');cashoutRows.id='cashout-results';cashoutBox.append(cashoutRows);
  const manualCashout=checkbox('cashout-manual','Corregir total por cartas u otros efectos');const cashoutOverride=field('cashout-override','Total manual de referencia ($)','number');cashoutOverride.wrap.hidden=true;
  cashoutBox.append(manualCashout.wrap,cashoutOverride.wrap,node('small','La corrección del total es una referencia de esta sesión; no cambia el dinero ni las comparaciones.'));
  manualCashout.input.onchange=()=>cashoutOverride.wrap.hidden=!manualCashout.input.checked;
  refreshCashout=()=>{cashoutRows.replaceChildren();try{
    if(manualCashout.input.checked){const raw=cashoutOverride.input.value,n=Number(raw);cashoutRows.append(node('p',raw!==''&&Number.isSafeInteger(n)&&n>=0?`Total manual: $${n}`:'Introduce el total manual.'));return;}
    const current=liveState();quietRead=true;const scenarios=scenarioReaders.map(read=>read()).filter(Boolean);if(!scenarios.length){cashoutRows.append(node('p','Añade cartas y jugadas de prueba para calcular manos sobrantes y cobro.'));return;}
    for(const scenario of scenarios){const evaluated=evaluateRoundPlan(current,scenario.plan,current.updatedAt);const row=node('div');row.append(node('strong',scenario.plan.description));
      if(!evaluated.ok){row.append(node('p',evaluated.errors.map(e=>e.message).join(' ')));}
      else{const settlement=evaluated.value.settlement,cash=settlement?.ok?settlement.value.cashout:null;
        if(cash){row.append(node('p',`Cobro: $${cash.earned} · saldo final: $${cash.balanceAfter}`),node('small',`Ciega $${cash.blindReward} + manos $${cash.unusedHands} + descartes $${cash.unusedDiscards??0} + Golden Joker $${cash.goldenIncome} + otros comodines $${cash.otherJokerIncome??0} + intereses $${cash.interest}.`));}
        else row.append(node('p',settlement&&!settlement.ok?settlement.errors.map(e=>e.message).join(' '):evaluated.value.targetReached?'Ante 8 completado: sin proyectar cobros posteriores.':'El plan no supera la ciega; no se concede un cobro.'));
      }cashoutRows.append(row);
    }cashoutRows.append(node('small','Proyección por escenario · reglas provisionales.'));
  }catch(e){cashoutRows.append(node('p',e instanceof Error?e.message:'Completa los datos del escenario.'));}finally{quietRead=false;}};
  const manualTarget=checkbox('target-manual','Introducir objetivo manualmente',!!s&&(!initialTarget.ok||value(blind?.target)!==initialTarget.target));
  const targetNote=node('small');targetNote.id='target-calculation';target.input.setAttribute('aria-describedby',target.error.id+' '+targetNote.id);
  const targetBlock=node('div','','target-control blind-target');const targetDetails=node('details','','target-formula');targetDetails.append(node('summary','Ver cálculo'),targetNote);targetBlock.append(target.wrap,manualTarget.wrap,targetDetails);let targetCalculated=blind?.target.status==='known'&&blind.target.source==='confirmedPreset';
  const updateTarget=(initial=false)=>{
    const expected=calculateTarget();target.input.readOnly=!manualTarget.input.checked;
    if(manualTarget.input.checked){targetNote.textContent=expected.ok?`Modelo: ${expected.target.toLocaleString('es')} fichas. Se conserva tu valor manual.`:'Valor manual; cálculo automático no disponible.';return;}
    if(!initial||!s){target.input.value=expected.ok?String(expected.target):'';targetCalculated=true;}
    targetNote.textContent=expected.ok?`${expected.base.toLocaleString('es')} × ${expected.multiplier}${expected.deckMultiplier!==1?' × '+expected.deckMultiplier+' (baraja)':''} = ${expected.target.toLocaleString('es')} · White · regla provisional`:expected.error.message;
  };
  manualTarget.input.addEventListener('change',()=>updateTarget());
  for(const control of [ante.input,kind.input,boss.input,startingDeck.input])control.addEventListener('input',()=>updateTarget());
  updateTarget(true);
  const deckNote=node('p','','muted');const deckDetails=node('details');deckDetails.id='deck-conditions';const deckFacts=node('div');deckDetails.append(node('summary','Condiciones de esta baraja'),deckFacts);
  const deckEditor=mountDeckEditor(grid,s?.observed.deck??known({preset:'standard52-unmodified'}),()=>startingDeck.input.value,()=>{dirty=true;invalidate('Mazo editado. Candidatos recalculados con la composición actual.');},!s);
  const showDeck=()=>{const d=resolveDeck(startingDeck.input.value);deckNote.textContent=`${d.effect} Inicio: $${d.startingMoney}. El saldo actual se transcribe; cambiar de baraja no lo repone. ${d.engine?'':d.limitation}`;
    const w=d.shopWeights,total=Object.values(w).reduce((a,b)=>a+b,0);
    deckFacts.replaceChildren(deckNote,node('p',`${d.hands} manos · ${d.discards} descartes · mano de ${d.handSize} · ${d.jokerSlots} comodines · ${d.consumableSlots} consumibles`),node('p',`Tienda inicial: ${d.shopSlots} espacios. Pesos: comodín ${w.joker}, Tarot ${w.tarot}, planeta ${w.planet}, espectral ${w.spectral}; total ${total}.`),node('small','Pesos para espacios normales de tienda, sin otros modificadores. No describen los sobres ni predicen la siguiente tienda.'));
    if(d.scoring==='floor_average')deckFacts.append(node('p','Después de los efectos: fichas = Mult = suelo((fichas + Mult) / 2). Objetivo de ciega ×2.'));
    if(d.composition==='random_rank_suit')deckFacts.append(node('p','La composición real debe transcribirse; no se genera desde el nombre de baraja.'));
    deckFacts.append(node('small','1.0.1o-FULL · lectura del ejecutable; pendiente contraste en partida.'));
  };showDeck();
  grid.append(startingDeck.wrap,money.wrap,ante.wrap,kind.wrap,boss.wrap,targetBlock,rewardBlock,cashoutBox,deckDetails,grid.querySelector('#deck-editor')!);
  const updateBoss=()=>{boss.input.disabled=kind.input.value!=='boss';boss.wrap.hidden=boss.input.disabled;};kind.input.addEventListener('change',updateBoss);updateBoss();
  const context=node('details');context.append(node('summary','Recursos y bases de manos'));fieldset.append(context);
  const resources=node('div','','grid');context.append(resources);
  const selectedDeck=resolveDeck(startingDeck.input.value);
  const resourceFields=[['hands','Manos por ronda',s?value(s.observed.resources.handsPerRound):selectedDeck.hands],['discards','Descartes por ronda',s?value(s.observed.resources.discardsPerRound):selectedDeck.discards],['size','Tamaño de mano',s?value(s.observed.resources.handSize):8],['slots','Espacios de comodín',s?value(s.observed.resources.jokerSlots):5]] as const;
  resourceFields.forEach(([id,label,v])=>resources.append(field(id,label,'number',String(v??'')).wrap));
  startingDeck.input.addEventListener('change',()=>{const ids=vouchers.read(),d=voucherResources(startingDeck.input.value,ids);for(const [id,n] of [['hands',d.hands],['discards',d.discards],['size',d.handSize],['slots',d.jokerSlots]] as const)$<HTMLInputElement>(id).value=id==='hands'&&ids.includes('v_hieroglyph')||id==='discards'&&ids.includes('v_petroglyph')?'':String(n);updateVoucherResources();showDeck();deckEditor.changeDeck();dirty=true;invalidate('Baraja inicial cambiada. Candidatos recalculados con sus condiciones.');});
  const base=value(s?.observed.handBases);const levels=select('levels','Bases de manos',{'unknown':'Desconocidas','preset':'Todas estándar, nivel 1','manual':'Transcribir niveles, fichas y Mult'},base && 'values'in base?'manual':s && !base?'unknown':'preset');context.append(levels.wrap);
  const handRows=node('div');context.append(handRows);handRows.hidden=levels.input.value!=='manual';levels.input.onchange=()=>handRows.hidden=levels.input.value!=='manual';
  for(const [id,basePair] of Object.entries(HAND_BASES)){const v=base && 'values'in base?value(base.values[id as keyof typeof HAND_BASES]):undefined;const missing=base && 'values'in base && !v;const row=node('div','','row');row.append(node('h3',handNames[id]!));const g=node('div','','grid');g.append(field('level-'+id,'Nivel','number',missing?'':String(v?.level??1)).wrap,field('chips-'+id,'Fichas base','number',missing?'':String(v?.chips??basePair[0])).wrap,field('mult-'+id,'Mult base','number',missing?'':String(v?.mult??basePair[1])).wrap);row.append(g);handRows.append(row);}
  fieldset.append(node('h3','Comodines que posees, en orden'));
  fieldset.append(node('p','150 comodines en el catálogo. Los disponibles para comparar se indican en sus detalles; algunos necesitan contadores o datos del escenario.','muted'));
  const jokerKnown=checkbox('jokers-known','Conozco mi inventario (sin filas = ningún comodín)',s?s.observed.jokers.status==='known':true);fieldset.append(jokerKnown.wrap);
  const ownedHost=node('div');fieldset.append(ownedHost);ownedHost.addEventListener('change',event=>{if((event.target as HTMLElement).matches('select[id^=joker-]'))updateVoucherResources();});const ownedReaders=new Map<HTMLElement,()=>JokerInstance>();
  function addOwned(j?:JokerInstance){const id=j?.instanceId??uuid();const row=node('div','','row');const g=node('div','','grid');const name=select('joker-'+id,'Comodín',names,j?.catalogId??'joker');const ed=select('edition-'+id,'Edición',{base:'Base',foil:'Foil',holographic:'Holográfica',polychrome:'Policroma',negative:'Negativa'},j?value(j.edition)??'base':'base');ed.input.addEventListener('change',()=>updateVoucherResources());const stickers=j?.stickers??known([]);const sell=field('sell-'+id,'Valor de venta ($)','number',String(j?value(j.sellValue)??'':jokerDefinition('joker')!.sell));const counter=field('green-'+id,'Green: Mult actual','number',String(j?value(j.counters.greenMult)??'':''));counter.wrap.hidden=name.input.value!=='green_joker';name.input.onchange=()=>{sell.input.value=String(jokerDefinition(name.input.value)!.sell);counter.wrap.hidden=name.input.value!=='green_joker';};g.append(name.wrap,ed.wrap,sell.wrap,counter.wrap);const readCounters=mountCounterFields(g,name.input,j);row.append(g,button('Quitar fila',()=>{row.remove();updateVoucherResources();fillJokerSlots(ownedHost,Math.min(6,Number($<HTMLInputElement>('slots').value)||0));}));decorateJoker(row,name.input,false,!!j);ownedHost.append(row);fillJokerSlots(ownedHost,Math.min(6,Number($<HTMLInputElement>('slots').value)||0));
    ownedReaders.set(row,()=>({instanceId:id,catalogId:name.input.value,edition:known(ed.input.value),stickers,sellValue:numFact(sell.input,0),counters:name.input.value==='green_joker'?{greenMult:numFact(counter.input,0)}:readCounters()}));
    const order=node('div','','joker-order');for(const [label,offset] of [['← Mover',-1],['Mover →',1]] as const){const b=button(label,()=>{const rows=Array.from(ownedHost.querySelectorAll<HTMLElement>(':scope > .joker-editor')),index=rows.indexOf(row),other=rows[index+offset];if(other){if(offset<0)ownedHost.insertBefore(row,other);else ownedHost.insertBefore(other,row);fillJokerSlots(ownedHost,Math.min(6,Number($<HTMLInputElement>('slots').value)||0));}});b.setAttribute('aria-label',offset<0?'Mover comodín a la izquierda':'Mover comodín a la derecha');order.append(b);}row.querySelector('.joker-edit-drawer')!.append(order);fillJokerSlots(ownedHost,Math.min(6,Number($<HTMLInputElement>('slots').value)||0));
  }
  (value(s?.observed.jokers)??[]).forEach(addOwned);fillJokerSlots(ownedHost,Number($<HTMLInputElement>('slots').value)||0);
  const addFromGallery=(j:JokerReference):string|null=>{
    const engine=j.engineId??Object.keys(ALL_JOKER_FACTS).find(id=>ALL_JOKER_FACTS[id]!.artId===j.id);
    if(!engine||!jokerDefinition(engine))return 'Este comodín no tiene un perfil registrado.';
    if(!jokerKnown.input.checked)return 'Marca que conoces tu inventario antes de añadir.';
    const slotsInput=$<HTMLInputElement>('slots'),slots=Number(slotsInput.value),rows=Array.from(ownedHost.querySelectorAll<HTMLElement>(':scope > .joker-editor'));
    if(!slotsInput.value.trim()||!Number.isSafeInteger(slots)||slots<0)return 'Indica cuántos espacios de comodín tienes.';
    if(rows.length>=slots)return 'No quedan espacios. Quita un comodín antes de añadir otro.';

    addOwned({instanceId:uuid(),catalogId:engine,edition:known('base'),stickers:known([]),sellValue:known(jokerDefinition(engine)!.sell),counters:engine==='green_joker'?{greenMult:unknown()}:{}});
    updateVoucherResources();dirty=true;invalidate('Comodín añadido a la vista actual. Candidatos recalculados automáticamente.');return null;
  };
  fieldset.append(node('h3','Ofertas de la tienda'));
  const shopReadout=node('p','Registra los comodines en la Tienda de la Mesa. Esas mismas ofertas se utilizan en Análisis.','muted');fieldset.append(shopReadout);
  const reason=s?field('edit-reason','Motivo de corrección o actualización'):null;if(reason){reason.wrap.dataset.saveControl='true';fieldset.append(reason.wrap);}
  const submit=node('button',s?'Guardar actualización que transcribí':'Crear y guardar mi partida');submit.type='submit';submit.dataset.write='true';submit.dataset.saveControl='true';fieldset.append(submit);
  form.oninput=event=>{if((event.target as HTMLElement).dataset.counter==='hSize')updateVoucherResources();fillJokerSlots(ownedHost,Math.min(6,Number($<HTMLInputElement>('slots').value)||0));dirty=true;invalidate('Vista actual modificada. Candidatos en actualización.');};
  form.addEventListener('click',e=>{if((e.target as HTMLElement).closest('button[type=button]')){dirty=true;invalidate('Inventario modificado. Candidatos en actualización.');}});
  const workingBase=s?structuredClone(s):createDraft(uuid(),now());
  readLiveState=(quick=false)=>{
    if(!quick&&!deckDefinition(startingDeck.input.value))throw new Error('Baraja fuera del cálculo compatible.');
    if(!quick&&!coverage.input.checked)throw new Error('Confirma la cobertura de tu partida.');
    const state=structuredClone(workingBase);state.rulesetId=ENGINE_RULESET;
    // Only legacy drafts need this editor projection. A current state keeps its
    // discriminated phase; editing fields never records a game transition.
    if(state.schemaVersion==='0.1')state.phase='shop';
    const o=state.observed;o.gameVersion=coverage.input.checked?known(GAME_VERSION):unknown();o.gamePlatform=coverage.input.checked?known('pc-steam'):unknown();o.modsPresent=coverage.input.checked?known(false):unknown();o.deckId=known(startingDeck.input.value);o.stakeId=coverage.input.checked?known('white'):unknown();o.deck=deckEditor.read();o.outOfScope=known({vouchers:vouchers.read(),consumables:[],pendingTags:[],otherModifiers:[]});o.money=numFact(money.input,-20);
    o.resources={handsPerRound:numFact($<HTMLInputElement>('hands'),0),discardsPerRound:numFact($<HTMLInputElement>('discards'),0),handSize:numFact($<HTMLInputElement>('size'),0),jokerSlots:numFact($<HTMLInputElement>('slots'),0)};
    if(kind.input.value){const a=number(ante.input,1);if(a>8)throwField('ante','Solo se admiten antes 1 a 8.');o.nextBlind=known({ante:a,kind:kind.input.value as 'small'|'big'|'boss',bossId:kind.input.value==='boss'?(boss.input.value?known(boss.input.value):unknown()):known('none'),target:!manualTarget.input.checked&&targetCalculated&&target.input.value!==''?{status:'known',source:'confirmedPreset',value:number(target.input,1)}:numFact(target.input,1),reward:!manualReward.input.checked&&rewardCalculated&&reward.input.value!==''?{status:'known',source:'confirmedPreset',value:number(reward.input,0)}:numFact(reward.input,0)});}else o.nextBlind=unknown();
    o.jokers=jokerKnown.input.checked?known(Array.from(ownedHost.querySelectorAll<HTMLElement>(':scope > .joker-editor')).map(row=>ownedReaders.get(row)!())):unknown();
    o.shop=structuredClone(record?.state.runId===workingBase.runId?record.state.observed.shop:workingBase.observed.shop);
    if(levels.input.value==='unknown')o.handBases=unknown();else if(levels.input.value==='preset')o.handBases=known({preset:'all-standard-level1'});else {const values=Object.fromEntries(Object.keys(HAND_BASES).map(id=>{const inputs=['level-','chips-','mult-'].map(prefix=>$<HTMLInputElement>(prefix+id));return [id,inputs.some(input=>input.value.trim()==='')?unknown():known({level:number(inputs[0]!,1),chips:number(inputs[1]!,1),mult:number(inputs[2]!,1)})];}));o.handBases=known({values} as Exclude<NonNullable<ReturnType<typeof value<GameState['observed']['handBases'] extends Fact<infer T>?T:never>>>,{preset:string}>);}
    if(deckEditor.discardSavedScenarios()){state.assumptions.probes=[];state.assumptions.roundPlans=[];}
    const valid=validateState(state);if(!valid.ok)throw new Error(valid.errors.map(e=>e.message).join(' '));return valid.value;
  };
  form.onsubmit=e=>{e.preventDefault();resetFormErrors();try{
    if(!deckDefinition(startingDeck.input.value)){message(resolveDeck(startingDeck.input.value).limitation+' No se ha cambiado la partida.',true);return;}
    if(!coverage.input.checked){message('Confirma la cobertura antes de guardar; no se asumen modificadores ausentes.',true);coverage.input.focus();return;}
    const state=readLiveState!(),o=state.observed;
    if(s){const reasonText=reason?.input.value??'';if(!reasonText.trim())throwField('edit-reason','Describe por qué actualizas los datos.');commit(()=>store.correct({confirmationId:uuid(),confirmed:true,expected:analysisBinding(record?.state??s),updatedAt:now(),patch:o,reason:reasonText,discardSavedScenarios:deckEditor.discardSavedScenarios()}));}
    else commit(()=>store.initialize(state));
  }catch(err){if(err instanceof Error)message(err.message,true);}};
  const observeShelf=(snapshot:ShopSnapshot):string|null=>{
    if(record&&dirty)return 'Hay otros datos editados sin guardar. Guarda la transcripción o recárgala antes de registrar ofertas.';
    if(demoMode)return 'Sal de la demostración antes de registrar ofertas reales.';
    if(!canWrite())return $('message').textContent??'No se pudo guardar.';
    try{
      const previous=value(record?.state.observed.shop),previousOffers=previous?.cardOffers??[];
      const offers:ShopOffer[]=snapshot.jokers.map(offer=>{
        const old=previousOffers.find(o=>o.offerId===offer.offerId);
        const catalogId=ALL_JOKER_FACTS[offer.catalogId]?offer.catalogId:Object.keys(ALL_JOKER_FACTS).find(id=>ALL_JOKER_FACTS[id]!.artId===offer.catalogId)??offer.catalogId;
        return {offerId:offer.offerId,catalogId,label:names[catalogId]??old?.label??catalogId,kind:'joker',
          price:offer.price===null?(old?.price.status==='unknown'?structuredClone(old.price):unknown()):known(offer.price),
          edition:offer.edition==='unknown'?(old?.edition.status==='unknown'?structuredClone(old.edition):unknown()):known(offer.edition??'base'),
          stickers:old?structuredClone(old.stickers):known(offer.stickers??[])};
      });
      // Unsupported/unrenderable observations are never silently discarded by
      // an editor that can only display the known catalogue.
      const rendered=(offer:ShopOffer)=>offer.kind==='joker'&&(!!ALL_JOKER_FACTS[offer.catalogId]||Object.values(ALL_JOKER_FACTS).some(j=>j.artId===offer.catalogId));
      offers.push(...previousOffers.filter(o=>!rendered(o)&&!offers.some(visible=>visible.offerId===o.offerId)).map(o=>structuredClone(o)));
      let saved:Result<ConfirmedRecord>;
      const initialized=record===null;
      if(!record){
        const initial=liveState();
        initial.observed.shop=known({shopId:uuid(),cardOffers:offers,ignoredOtherOffers:['Vales, sobres y otras cartas: solo consulta de esta sesión.']});
        saved=store.initialize(initial);
      }else saved=shopSession.observeJokerOffers({confirmationId:uuid(),confirmed:true,expected:analysisBinding(record.state),updatedAt:now(),shopId:previous?.shopId??uuid(),offers});
      if(!saved.ok){problem(saved.errors);return saved.errors.map(e=>e.message).join(' ');}
      record=saved.value;Object.assign(workingBase,structuredClone(record.state));
      try{seenRaw=localStorage.getItem(CONFIRMED_STORAGE_KEY);}catch{loadFailed=true;}
      $('revision').textContent=`Revisión ${record.state.revision}`;
      invalidate('Ofertas observadas guardadas. Vuelve a consultar Análisis.',false);renderHistory();renderActions();updateOwnership();
      message('Ofertas de comodines guardadas. Comprar requiere confirmar que lo hiciste.');
      if(initialized)setTimeout(()=>reload(),0);
      return null;
    }catch(error){return error instanceof Error?error.message:'No se pudo registrar la oferta. La copia anterior se conserva.';}
  };
  const compositionHost=node('section');
  organizeRecord(host,!!s,renderJokerPreview,()=>{try{return (value(liveState(true).observed.jokers)??[]).map(j=>({id:j.instanceId,name:names[j.catalogId]??j.catalogId}));}catch{return [];}},addFromGallery,vouchers.host,compositionHost,{
   edit:id=>{const row=Array.from(ownedHost.querySelectorAll<HTMLElement>(':scope > .joker-editor')).find(row=>row.dataset.instanceId===id);const settings=row?.querySelector<HTMLDetailsElement>('.card-settings');if(settings)settings.open=true;},
   describe:id=>{try{const j=value(liveState(true).observed.jokers)?.find(j=>j.instanceId===id);return {price:value(j?.sellValue)??null,...(value(j?.stickers)?.includes('eternal')?{blocked:'Eternal: no se puede vender.'}:{})};}catch{return {price:null};}},
   sell:id=>requestMesaAction({type:'sell',instanceId:id})
  },{state:()=>liveState(true),ante:()=>Number(ante.input.value),changed:()=>{handRequest++;$('hand-results')?.replaceChildren();},
    observe:observeShelf,confirm:(offerId,sellId)=>requestMesaAction(sellId?{type:'replace',sellInstanceId:sellId,offerId,instanceId:uuid()}:{type:'buy',offerId,instanceId:uuid()}),
    // Ownership is applied centrally by updateOwnership; do not cache it as a
    // local disabled reason or gaining the lock would leave these buttons inert.
    status:()=>dirty?'Guarda o recarga los otros datos editados antes de confirmar.':!record?'Configura y registra tu partida antes de confirmar acciones.':null,
    canUndo:()=>!!record&&record.history.length>0&&record.history.at(-1)?.kind!=='undo',undo:undoMesaChange,controlsChanged:updateOwnership});
  const compositionView=mountComposition(compositionHost);
  refreshOwnedFits=()=>{
   const rows=Array.from(ownedHost.querySelectorAll<HTMLElement>(':scope > .joker-editor'));let fits:ReturnType<typeof evaluateOwnedFits>=[];
   try{const state=liveState(true),options={ante:Number(ante.input.value)};fits=evaluateOwnedFits(state,options);compositionView.render(evaluateComposition(state,options));}catch{compositionView.clear();}
   for(const row of rows){const id=row.querySelector<HTMLSelectElement>('select[id^="joker-"]')?.id.slice(6),fit=fits.find(f=>f.instanceId===id);row.dataset.instanceId=id??'';let badge=row.querySelector<HTMLElement>(':scope > .fit-badge');if(!badge){badge=node('span','','fit-badge');row.append(badge);}badge.replaceChildren(node('strong',fit?fitLabel(fit):'Revisa datos','fit-score'));badge.className='fit-badge '+(fit?fitTone(fit):'unknown');badge.title=fit?fitReason(fit):'Revisa los datos de la partida.';badge.setAttribute('aria-label',`Encaje ${fit?fitLabel(fit):'sin evaluar'}. ${fit?fitReason(fit):''}`);row.dataset.fitLabel=fit?fitLabel(fit):'';}
  };refreshOwnedFits();
}
function renderJokerPreview(j:JokerReference,sellId:string,ownedId?:string,offer?:{price:Fact<number>;edition:Fact<string>;stickers:Fact<string[]>}){
 try{return renderQuickFit(evaluateJokerFit(liveState(true),j.id,{ante:Number($<HTMLInputElement>('ante').value),...(ownedId?{instanceId:ownedId}:{purchase:true}),...(sellId?{replacementId:sellId}:{}),...(offer?{offer}:{})}));}
 catch(e){const host=node('div');markPreview(host,'needs-data','Revisa datos');host.append(node('p',e instanceof Error?e.message:'Revisa los datos básicos.'));return host;}
}
function renderHandPreview(j:JokerReference,sellId:string,inputState?:GameState,inputScenarios?:AdvisorScenario[],offer?:{price:Fact<number>;edition:Fact<string>;stickers:Fact<string[]>}){
 const host=node('div');
 if(!j.engineId){markPreview(host,'unsupported','Solo catálogo');host.append(node('p','Sin puntuación: efecto aún no implementado.'));return host;}
 let state:GameState;try{state=inputState??liveState();}catch(e){markPreview(host,'needs-data','Completa la partida');host.append(node('p',e instanceof Error?e.message:'Completa los datos de la partida.'));return host;}
 let scenarios:AdvisorScenario[];
 try{quietRead=true;scenarios=inputScenarios??scenarioReaders.map(read=>read()).filter(Boolean);}catch{markPreview(host,'needs-plan','Revisa las jugadas');host.append(node('p','Completa las cartas y jugadas de prueba.'));return host;}finally{quietRead=false;}
 if(!scenarios.length){markPreview(host,'needs-plan','Sin jugadas: no hay puntos');host.append(node('p','Puntos sin calcular. Añade cartas y jugadas de prueba para comparar puntuaciones.'));return host;}
 const result=previewJoker(state,j.engineId,scenarios,sellId,offer);
 if(!result.ok){const status=previewIssueStatus(result.errors);markPreview(host,status.status,status.label);host.append(node('p',result.errors.map(e=>e.message).join(' ')));return host;}
 const advice=result.value,baseline=advice.alternatives.find(a=>a.action.type==='hold'),candidate=advice.alternatives.find(a=>a.action.type!=='hold');
 if(!candidate||!candidate.legal){const issues=candidate?.scenarios.flatMap(s=>s.calculation.shop.ok?[]:s.calculation.shop.errors)??[];const status=previewIssueStatus(issues);markPreview(host,status.status,status.label);host.append(node('p',issues.map(e=>e.message).join(' ')||'No es una compra legal. Revisa dinero y espacios.'));return host;}
 const issues=[...(baseline?.scenarios??[]),...candidate.scenarios].flatMap(s=>s.calculation.evaluation&&!s.calculation.evaluation.ok?s.calculation.evaluation.errors:s.calculation.evaluation?.ok?s.calculation.evaluation.value.errors:[]);const status=previewIssueStatus(issues),complete=candidate.complete&&!!baseline?.complete;markPreview(host,complete?'calculated':issues.length?status.status:'partial',complete?'Puntos calculados':issues.length?status.label:'Comparación incompleta');
 const rating=contextRatings(advice).find(r=>r.alternativeId===candidate.id);
 host.append(node('small',`Vista actual · escenario hipotético · no es una acción realizada`));
 for(const scenario of scenarios){
  const before=baseline?.scenarios.find(s=>s.scenarioId===scenario.plan.planId)?.metrics,after=candidate.scenarios.find(s=>s.scenarioId===scenario.plan.planId),m=after?.metrics,r=rating?.scenarios.find(s=>s.scenarioId===scenario.plan.planId);
  const row=node('section','','bay-score');row.append(node('strong',scenario.plan.description));
  if(!before||!m||!after?.calculation.evaluation?.ok||after.calculation.evaluation.value.outcome==='incompatible'){row.append(node('p','Sin evaluación completa: '+(after?.calculation.evaluation?.ok===false?after.calculation.evaluation.errors.map(e=>e.message).join(' '):'faltan datos o el plan es incompatible.')));}
  else{
   row.dataset.scoreDelta=String(m.score-before.score);row.dataset.before=String(before.score);row.dataset.after=String(m.score);row.dataset.scenario=scenario.plan.description;
   row.append(node('small','Antes → después de comprar'),node('p',`${before.score.toLocaleString('es')} → ${m.score.toLocaleString('es')} puntos`,'bay-score-value'),node('p',`${m.reached?'Alcanza la ciega':'El plan no alcanza la ciega'} · ${m.handsUsed} ${m.handsUsed===1?'mano':'manos'} · ${m.discardsUsed} ${m.discardsUsed===1?'descarte':'descartes'}`),node('p',`Dinero tras compra: $${m.moneyAfterShop} · Encaje en este escenario: ${r?.value==null?'sin evaluar':r.value+'/10'}`));
   if(before.handsUsed!==m.handsUsed||before.discardsUsed!==m.discardsUsed)row.append(node('small','Distinto consumo: la ronda termina al alcanzar la ciega.'));
   const explain=node('details');explain.append(node('summary','Ver cálculo'));
   if(after?.calculation.evaluation?.ok)for(const event of after.calculation.evaluation.value.events){if(event.handScore)explain.append(node('p',`Mano ${event.eventIndex+1}: ${event.handScore.chips} × ${event.handScore.mult} = ${event.handScore.score}`));for(const t of event.trace)explain.append(node('small',`${t.label}: ${Object.entries(t.values).map(([k,v])=>k+'='+v).join(', ')}`));}
   for(const axis of r?.axes??[])explain.append(node('p',`${axis.label}: ${axis.value}/2 · ${axis.reason}`));row.append(explain);
  }host.append(row);
 }
 host.append(node('small','Precio base y planes fijos. Encaje heurístico, no probabilidad de ganar. Reglas provisionales.'));
 return host;
}
function throwField(id:string,text:string):never{formError(id,text);if(!quietRead)$(id)?.focus();throw new Error(text);}
function number(input:HTMLInputElement,min:number){const n=Number(input.value);if(input.value.trim()===''||!Number.isSafeInteger(n)||n<min)throwField(input.id,`Introduce un entero de al menos ${min}.`);return n;}
function numFact(input:HTMLInputElement,min:number):Fact<number>{return input.value.trim()===''?unknown():known(number(input,min));}

function scenarioCards(){let d;try{d=value(liveState().observed.deck);}catch{d=value(record?.state.observed.deck);}return d?('cards' in d?d.cards:standardDeck()):[];}
function cardField(id:string,label:string,ids:string[]=[]){
 const f=field(id,label,'text',ids.join(' '));f.input.placeholder='Ejemplo: 8S 8H';f.input.dataset.compositionPreview='true';
 const line=node('div','','card-input'),picker=select(id+'-picker','Añadir una carta',{'':'Elegir carta'},'');picker.input.dataset.cardPicker='true';
 const refresh=()=>{const chosen=picker.input.value;picker.input.replaceChildren();for(const [value,label] of [['','Elegir carta'],...scenarioCards().map(c=>[c.instanceId,`${c.rank} ${({S:'♠',H:'♥',D:'♦',C:'♣'})[c.suit]} · ${c.instanceId}`])]){const o=node('option',label);o.value=value!;picker.input.append(o);}picker.input.value=chosen;if(picker.input.selectedIndex<0)picker.input.value='';};
 picker.input.addEventListener('refreshcards',refresh);picker.input.addEventListener('focus',refresh);refresh();
 line.append(picker.wrap,button('Añadir',()=>{if(picker.input.value){f.input.value=[f.input.value,picker.input.value].filter(Boolean).join(' ');picker.input.value='';f.input.dispatchEvent(new Event('input',{bubbles:true}));}}));
 const wrap=node('div');wrap.append(f.wrap,line);attachCardPreview(f.input,wrap,scenarioCards);return {...f,wrap};
}
const splitCards=(input:HTMLInputElement)=>input.value.trim().split(/[\s,]+/).filter(Boolean);
function renderScenarios(){
  const host=$('scenario-form');host.replaceChildren();scenarioReaders=[];
  host.append(node('p','♠ S · ♥ H · ♦ D · ♣ C. Pulsa una carta para quitarla. Los planes no se guardan al recargar.','muted'));
  const list=node('div');host.append(list);
  function add(plan?:RoundPlan){
    if(list.children.length>=20){message('Máximo 20 escenarios.',true);return;}
    const id=uuid(),box=node('div','','scenario');box.append(node('p','ESCENARIO · NO ES LA PARTIDA REGISTRADA','eyebrow'));
    const description=field('description-'+id,'Nombre del escenario','text',plan?.description??'');const role=select('role-'+id,'Tipo de escenario',{representative:'Representativo (declarado)',favorable:'Favorable',adverse:'Adverso'},'representative');const grid=node('div','','grid two');grid.append(description.wrap,role.wrap);box.append(grid);
    const initial=cardField('initial-'+id,'Cartas iniciales (según tamaño de mano y vales)',plan?.initialHand.map(c=>c.cardId));box.append(initial.wrap);
    const initialKnown=checkbox('known-'+id,'Estas cartas iniciales fueron observadas; sin marcar son hipotéticas',false);box.append(initialKnown.wrap);
    const basis=field('basis-'+id,'Procedencia o supuesto de las cartas','text',plan?'Plantilla sintética: no predice los robos.':'');box.append(basis.wrap);
    const events=node('div');box.append(events);const readers:(()=>RoundPlan['events'][number]|null)[]=[];
    function addEvent(event?:RoundPlan['events'][number]){const eid=uuid(),row=node('div','','row');const type=select('event-'+eid,'Acción del plan',{play:'Jugar',discard:'Descartar'},event?.type??'play');const cards=cardField('cards-'+eid,'Cartas que juegas o descartas',event?.cardIds);const draws=cardField('draws-'+eid,'Robos solo si la ronda continúa',event?.drawIfContinues.map(c=>c.cardId));const drawKnown=checkbox('draw-known-'+eid,'Estos robos fueron observados; sin marcar son hipotéticos');row.append(type.wrap,cards.wrap,draws.wrap,drawKnown.wrap,button('Quitar evento',()=>row.remove()));events.append(row);readers.push(()=>row.isConnected?{type:type.input.value as 'play'|'discard',cardIds:splitCards(cards.input),drawIfContinues:splitCards(draws.input).map(cardId=>({cardId,knowledge:drawKnown.input.checked?'known':'hypothetical',basis:basis.input.value}))}:null);}
    (plan?.events??[undefined]).forEach(addEvent);box.append(button('Añadir mano o descarte',()=>addEvent()));
    const cash=checkbox('cash-'+id,'Supongo que el dinero no cambia durante esta ronda (necesario para proyectar el cobro)',plan?.assumptions.noMoneyChangesDuringRound??false);box.append(cash.wrap,button('Quitar escenario',()=>box.remove()));list.append(box);
    scenarioReaders.push(()=>{if(!box.isConnected)return null as unknown as AdvisorScenario;
      if(!description.input.value.trim())throwField(description.input.id,'Da un nombre al escenario.');if(!basis.input.value.trim())throwField(basis.input.id,'Indica la procedencia o el supuesto de cartas.');
      const p:RoundPlan={schemaVersion:'scenario-1',planId:id,description:description.input.value,initialHand:splitCards(initial.input).map(cardId=>({cardId,knowledge:initialKnown.input.checked?'known':'hypothetical',basis:basis.input.value})),events:readers.map(r=>r()).filter((e):e is RoundPlan['events'][number]=>e!==null),assumptions:{noMoneyChangesDuringRound:cash.input.checked}};
      const checked=validateRoundPlan(p);if(!checked.ok){formError(initial.input.id,checked.errors[0]!.message);throw new Error(checked.errors[0]!.message);}
      return {role:role.input.value as AdvisorScenario['role'],plan:p};
    });
  }
  const tools=node('div','','toolbar');tools.append(button('Añadir escenario vacío',()=>add()));
  tools.append(button('Añadir plantilla hipotética: dos parejas',()=>{void fetch('./examples/round-plan.json').then(r=>{if(!r.ok)throw new Error('No se pudo cargar la plantilla.');return r.json();}).then(p=>{add(p as RoundPlan);invalidate();}).catch(e=>message(String(e),true));}));host.append(tools);
  host.oninput=()=>invalidate('El escenario cambió. Vuelve a calcular con estos supuestos.');
  host.addEventListener('click',e=>{if((e.target as HTMLElement).closest('button'))invalidate('El escenario cambió. Vuelve a calcular con estos supuestos.');});
}

function actionText(a:ShopAction,state:GameState){const owned=value(state.observed.jokers)??[],offers=value(state.observed.shop)?.cardOffers??[];const name=(id:string)=>names[owned.find(j=>j.instanceId===id)?.catalogId??'']??id;const offer=(id:string)=>names[offers.find(o=>o.offerId===id)?.catalogId??'']??id;switch(a.type){case'hold':return 'Conservar, sin comprar';case'buy':return `Comprar ${offer(a.offerId)}`;case'sell':return `Vender ${name(a.instanceId)}`;case'replace':return `Vender ${name(a.sellInstanceId)} → comprar ${offer(a.offerId)}`;}}
function renderAdvice(result:Result<Advice>,state:GameState,isDemo=false){
  $('bounds')?.replaceChildren();
  $('horizon-results')?.replaceChildren();
  const host=$('advice');host.replaceChildren();if(!result.ok){problem(result.errors);host.append(node('p',result.errors.map(e=>e.message).join(' '),'error'));return;}
  advice=result.value;demoMode=isDemo;$('exit-demo').hidden=!isDemo;
  if(isDemo)host.append(node('p','DEMOSTRACIÓN INDEPENDIENTE · Estado sintético, no es tu partida. Ninguna acción de esta vista puede registrarse.','demo-banner'));
  const r=advice.recommendation;const status={conditional:'Preferencia condicional',tie:'Empate o compromiso',abstain:'Sin base suficiente para recomendar'};
  host.append(node('h3',status[r.status]),node('p',r.action?actionText(r.action,state):r.reason));
  if(r.action)host.append(node('p',r.reason,'muted'));
  advice.contextNotes.forEach(text=>host.append(node('p',text,'notice')));
  const selectAlternative=(id:string,reveal:boolean)=>{host.querySelectorAll<HTMLElement>('.alternative').forEach(card=>{card.hidden=card.dataset.alternative!==id;if(!card.hidden&&reveal){card.tabIndex=-1;card.focus({preventScroll:true});card.scrollIntoView({block:'nearest'});}});};
  const overview=comparisonOverview(advice,id=>actionText(advice!.alternatives.find(a=>a.id===id)!.action,state),selectAlternative);host.append(overview);
  for(const id of advice.orderedAlternativeIds){const a=advice.alternatives.find(x=>x.id===id)!;const card=node('article','',`alternative ${a.tier===1?'preferred':''}`);card.dataset.alternative=id;card.hidden=id!==advice.orderedAlternativeIds[0];card.append(node('h3',actionText(a.action,state)),node('p',a.tier?`Nivel ${a.tier} · ${a.complete?'Escenarios evaluables':'Evaluación incompleta'}`:'Acción ilegal o datos incompletos','muted'));
    for(const s of a.scenarios){const calc=s.calculation,m=s.metrics;card.append(node('p',advice.scenarios.find(x=>x.plan.planId===s.scenarioId)?.plan.description??s.scenarioId));
      if(m)card.append(node('p',`${m.reached?'Objetivo alcanzado en este plan':'Objetivo no alcanzado en este plan'} · ${m.score} puntos · margen ${m.margin} · ${m.handsUsed} manos y ${m.discardsUsed} descartes usados.`,'score-line'));
      const costLabel=a.action.type==='sell'?`Ingreso por venta: ${calc.netCost===null?'desconocido':-calc.netCost} $`:`Coste neto: ${calc.netCost??'desconocido'} $`;
      card.append(node('p',`${costLabel} · saldo tras tienda: ${calc.moneyAfterShop??'desconocido'} $ · saldo tras cobro: ${calc.moneyAfterRound??'no calculado'}.`,'economy-line'));
      if(s.growth.length)card.append(node('p','Crecimiento aplicado: '+s.growth.map(g=>`${value(g.before as Fact<number>)??'?'} → ${value(g.after as Fact<number>)??'?'}`).join(', ')+'; no se extrapola a futuras manos.'));
      card.append(details('Cálculos, activaciones, cartas y reglas provisionales',s));}
    if(a.sacrificed.length)card.append(node('p','Sacrificas: '+a.sacrificed.map(j=>names[j.catalogId]).join(', ')+'. Se pierden sus efectos y contadores.'));
    const reasons=new Map<string,{text:string;against:string[]}>();
    for(const p of advice.preferences.filter(p=>p.preferred===id)){
      const key=p.ruleId+'|'+p.explanation,group=reasons.get(key)??{text:`${p.ruleId} (heurística): ${p.explanation}`,against:[]};
      group.against.push(actionText(advice.alternatives.find(a=>a.id===p.over)!.action,state));reasons.set(key,group);
    }
    for(const group of reasons.values()){const compared=node('details');compared.append(node('summary',`Por qué se prefiere a ${group.against.length} ${group.against.length===1?'alternativa':'alternativas'}`),node('p',group.text,'preference-reason'));const list=node('ul');group.against.forEach(text=>list.append(node('li',text)));compared.append(list);card.append(compared);}
    if(!a.complete)a.limitations.forEach(text=>card.append(node('p',text,'error')));
    const d=node('details');d.append(node('summary','Condiciones y limitaciones'));for(const text of [...a.conditions,...a.limitations])d.append(node('p',text));card.append(d);
    if(!isDemo && a.legal){const confirm=button('Registrar que hice esta acción',()=>confirmAction(a.action,state));confirm.dataset.write='true';card.append(confirm);}host.append(card);
  }
  overview.querySelector<HTMLButtonElement>('button')?.setAttribute('aria-pressed','true');
  const limitations=node('details');limitations.append(node('summary','Supuestos y alcance del consejo'));advice.limitations.forEach(t=>limitations.append(node('p',t)));limitations.append(details('Escenarios usados',advice.scenarios));host.append(limitations);updateOwnership();
}
$('analyze').onclick=()=>{resetFormErrors();if(dirty){message('Hay datos de partida sin guardar. Guarda la actualización antes de analizar.',true);return;}if(!record){message('Primero registra una partida o abre la demostración independiente.',true);return;}try{const scenarios=scenarioReaders.map(r=>r()).filter(Boolean);const result=adviseShop(record.state,scenarios,{expectedRevision:record.state.revision,updatedAt:now()});renderAdvice(result,record.state);if(result.ok)message('Análisis hipotético generado. La partida registrada no cambió.');}catch(e){message(String(e),true);}};
$('demo').onclick=()=>{void fetch('./examples/shop-purchase.json').then(r=>r.text()).then(text=>{const loaded=parseState(text);if(!loaded.ok){problem(loaded.errors);return;}const demo=comparisonDemoScenarios(loaded.value)[0]!;renderAdvice(adviseShop(demo.state,[{role:'favorable',plan:demo.plan}],{expectedRevision:demo.state.revision,updatedAt:now()}),demo.state,true);}).catch(e=>message(String(e),true));};
$('exit-demo').onclick=()=>{invalidate('De vuelta a tu partida. Consulta con tus escenarios.');renderActions();};
function requestMesaAction(action:ShopAction):string|null{
  if(!record)return 'Configura y guarda la partida antes de registrar acciones reales. No se usa una hipótesis como partida.';
  return confirmAction(action,record.state);
}
function undoMesaChange():string|null{
  if(dirty)return 'Guarda o recarga los otros datos editados antes de deshacer.';
  if(!record)return 'No hay una partida registrada.';
  const current=record,last=current.history.at(-1);
  if(!last||last.kind==='undo')return 'No hay un último cambio que se pueda deshacer. Puedes corregir datos desde Registro.';
  return commit(()=>shopSession.undo({confirmationId:uuid(),confirmed:true,expected:analysisBinding(current.state),updatedAt:now(),targetEntryId:last.id,reason:'Deshacer el último registro desde la Mesa; no cambia Balatro.'}))?null:$('message').textContent??'No se pudo deshacer.';
}
function confirmAction(action:ShopAction,state:GameState):string|null{
  if(dirty){const text='Guarda o recarga los datos editados antes de confirmar una acción.';message(text,true);return text;}
  if(demoMode){const text='Sal de la demostración para registrar acciones de tu partida.';message(text,true);return text;}
  if(!canWrite())return $('message').textContent??'No se puede guardar.';
  const expected=analysisBinding(state);const preview=applyShopAction(state,action,{expectedRevision:state.revision,updatedAt:now()});if(!preview.ok){problem(preview.errors);return preview.errors.map(e=>e.message).join(' ');}
  const body=node('div');body.append(node('p',actionText(action,state)),node('p',`Saldo calculado tras la acción: $${value(preview.value.state.observed.money)??'desconocido'}. Se validará de nuevo al confirmar.`));
  if(action.type==='replace')body.append(node('p','Confirma solo si hiciste la venta Y la compra. Si solo vendiste, cancela y elige «Vender» en acciones manuales.'));
  const performed=checkbox('performed','Confirmo que realicé esta acción completa en Balatro, no solo que quiero hacerla.');body.append(performed.wrap);
  const balance=field('observed-balance','Saldo que ves después (opcional; verifica discrepancias)','number');body.append(balance.wrap);
  const id=uuid();openDialog('Registrar acción realizada',body,'Registrar que la hice',()=>{
    if(!performed.input.checked){message('Marca la confirmación de acción realizada.',true);return false;}
    const jokers=value(preview.value.state.observed.jokers),shop=value(preview.value.state.observed.shop);
    if(balance.input.value.trim()!=='' && (!jokers || !shop)){message('Completa inventario y tienda para contrastar el recibo; también puedes omitir el saldo opcional.',true);return false;}
    const receipt=balance.input.value.trim()===''?{}:{observedAfter:{money:Number(balance.input.value),jokerIds:jokers!.map(j=>j.instanceId),offerIds:shop!.cardOffers.map(o=>o.offerId)}};
    return commit(()=>shopSession.confirm({confirmationId:id,confirmed:true,expected,updatedAt:now(),action,...receipt}));
  });
  return null;
}
function renderActions(){const host=$('actions');host.replaceChildren();if(!record)return;const state=record.state;const actions=enumerateActions(state,{expectedRevision:state.revision,updatedAt:now()});const d=node('details');d.append(node('summary','Registrar otra acción de tienda (incluida venta sola)'));host.append(d);if(!actions.ok){d.append(node('p',actions.errors.map(e=>e.message).join(' '),'error'));return;}
  for(const a of actions.value){if(!a.legal){d.append(node('p',actionText(a.action,state)+': '+a.errors.map(e=>e.message).join(' '),'muted'));continue;}const b=button(actionText(a.action,state),()=>confirmAction(a.action,state));b.dataset.write='true';const row=node('div','','toolbar');row.append(b);d.append(row);}
}
function renderHistory(){const host=$('history-list');host.replaceChildren();if(!record || !record.history.length){host.append(node('p','Todavía no has confirmado acciones ni correcciones.','empty'));return;}
  const current=record;for(const e of [...current.history].reverse()){const d=node('details');d.append(node('summary',`${e.kind==='action'?'Acción':e.kind==='undo'?'Deshacer registro':'Corrección manual'} · revisión ${e.before.revision} → ${e.after.revision}`),node('p',e.reason),node('p',`Dinero: ${value(e.before.observed.money)??'?'} → ${value(e.after.observed.money)??'?'}.`),details('Cambios completos y evidencia',e));host.append(d);}
  const last=current.history.at(-1)!;if(last.kind!=='undo'){const b=button('Deshacer la última entrada',()=>{if(!canWrite())return;const body=node('div');body.append(node('p','Corrige el registro local; no deshace ninguna acción dentro de Balatro. Se conservará todo el historial.'));const reason=field('undo-reason','Motivo del error');body.append(reason.wrap);const id=uuid();openDialog('Deshacer registro equivocado',body,'Deshacer entrada',()=>{if(!reason.input.value.trim()){message('Indica el motivo de la corrección.',true);return false;}return commit(()=>store.undoLatest({confirmationId:id,confirmed:true,expected:analysisBinding(current.state),updatedAt:now(),targetEntryId:last.id,reason:reason.input.value}));});});b.dataset.write='true';host.append(b);}host.append(node('p','Para corregir una entrada anterior, transcribe los datos actuales en «Tu partida» e indica el motivo.','muted'));
}
function updateMigrationButton(){
  const button=$<HTMLButtonElement>('run-migrate');if(!button)return;
  const disabled=!record||record.schemaVersion==='confirmed-2'||dirty||loadFailed;
  button.dataset.localDisabled=String(disabled);button.disabled=disabled||!lock.owned;
}
function renderMigrationControls(){
  updateMigrationButton();
  $('run-format-status').textContent=record?.schemaVersion==='confirmed-2'?'Formato 0.2 actualizado. El respaldo permite recuperar la copia anterior.':record?'La copia actual sigue siendo compatible. Actualiza su formato para representar las fases de la partida.':'Registra o importa una partida para actualizar su formato.';
  $<HTMLButtonElement>('run-migration-backup').disabled=!store.exportMigrationBackup().ok;
}
$('run-migrate').onclick=()=>{
  if(dirty){message('Guarda o recarga la transcripción antes de actualizar el formato.',true);return;}
  if(!canWrite())return;
  const prepared=store.prepareMigration();if(!prepared.ok){problem(prepared.errors);return;}
  const migration=prepared.value;if(!migration.requiresMigration)return;
  const body=node('div');body.id='run-migration-preview';
  body.append(node('p','Estado 0.1 → 0.2 · registro confirmed-1 → confirmed-2'),
    node('p',`Revisión ${migration.record.state.revision} · ${migration.record.history.length} ${migration.record.history.length===1?'entrada':'entradas'} de historial · ${2+migration.record.history.length*2} instantáneas.`),
    node('p','Se conservan dinero, cartas, contadores, revisiones y evidencia. No se reproducen acciones ni se aplican resultados de escenarios.'),
    node('p',migration.record.state.phase==='unknown'?'La fase del antiguo borrador seguirá desconocida; no se deduce una ciega ni un resultado.':'La tienda conserva su fase; su ciega de origen permanece desconocida.'),
    node('p','Antes de sustituir la copia se guarda un respaldo íntegro. Sustituye el respaldo de una migración previa si existe; puedes descargarlo antes de continuar.'));
  openDialog('Actualizar formato de la partida',body,'Actualizar y conservar respaldo',()=>{
    if(!canWrite())return false;
    const result=store.migrateToCurrent({confirmed:true,expectedRaw:migration.expectedRaw});
    if(!result.ok){problem(result.errors);renderMigrationControls();return false;}
    reload();message('Formato actualizado. Estado e historial conservados; respaldo anterior disponible en Registro.');return true;
  });
};
$('run-migration-backup').onclick=()=>{
  const result=store.exportMigrationBackup();if(!result.ok){problem(result.errors);return;}
  const url=URL.createObjectURL(new Blob([result.value],{type:'application/json'})),a=node('a');a.href=url;a.download='balatro-respaldo-anterior.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  message('Respaldo anterior preparado. Para recuperarlo, impórtalo como copia de partida.');
};
$('export').onclick=()=>{const result=store.exportJson();if(!result.ok){problem(result.errors);return;}const url=URL.createObjectURL(new Blob([result.value],{type:'application/json'}));const a=node('a');a.href=url;a.download='balatro-partida.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);message('Copia validada preparada para descargar.');};
$<HTMLInputElement>('import-file').onchange=async()=>{
  const input=$<HTMLInputElement>('import-file'),file=input.files?.[0];input.value='';if(!file)return;
  if(!lock.owned){message('Solicita control antes de importar.',true);return;}if(file.size>MAX_RECORD_BYTES){message('La copia supera 8 MiB.',true);return;}
  try{const text=await file.text();let data:unknown;try{data=JSON.parse(text);}catch{message('JSON inválido. No se cambió la partida.',true);return;}
    const journal=validateConfirmedRecord(data),legacy=validateState(data);if(!journal.ok&&!legacy.ok){problem(journal.errors);return;}
    const raw=localStorage.getItem(CONFIRMED_STORAGE_KEY);const body=node('div');body.append(node('p',raw===null?'Se importará una partida validada.':'Esto reemplazará la partida y su historial actuales. Exporta primero si quieres conservarlos.'),node('p',journal.ok?`Formato: partida e historial ${journal.value.schemaVersion}.`:'Formato H1: se creará un registro sin historial previo.'));
    openDialog('Importar copia validada',body,raw===null?'Importar partida':'Sí, reemplazar partida',()=>{
      if(!lock.owned){message('No tienes control de escritura.',true);return false;}
      const restored=store.restoreJson(text,{confirmed:true,expectedRaw:raw});if(!restored.ok){problem(restored.errors);return false;}reload();message('Copia importada y guardada. Los consejos anteriores se invalidaron.');return true;
    });
  }catch{message('No se pudo leer la copia o el almacenamiento. No se anunció un guardado exitoso.',true);}
};
$('legacy').dataset.write='true';$('legacy').onclick=()=>commit(()=>store.migrateLegacy());
window.addEventListener('storage',e=>{if(e.key===CONFIRMED_STORAGE_KEY || e.key===null){reload();message('Se recibió un cambio de otra pestaña. Se invalidaron los consejos y formularios anteriores.');}});
window.addEventListener('pagehide',()=>lock.release());window.addEventListener('pageshow',()=>{if(!lock.owned)lock.acquire();});
const boundsHost=node('div');boundsHost.id='bounds';$('advice').after(boundsHost);
const boundsButton=button('Comprobar límite de puntuación',()=>{
  if(dirty){message('Guarda los datos transcritos antes de comprobar el límite.',true);return;}
  if(demoMode){message('Sal de la demostración para comprobar la partida registrada.',true);return;}
  if(!record){message('Primero registra una partida.',true);return;}
  const state=record.state;
  const result=compareShopBounds(state,{expectedRevision:state.revision,updatedAt:now()});
  boundsHost.replaceChildren(node('h3','Límite conservador de la próxima ronda'));
  boundsHost.append(node('p','Cota superior bajo reglas provisionales. No es una puntuación prevista, una probabilidad ni un orden de mejores compras. No requiere escenarios de robo.','notice'));
  if(!result.ok){boundsHost.append(node('p',result.errors.map(e=>e.message).join(' '),'error'));return;}
  boundsHost.append(node('p',result.value.conclusion));
  if(result.value.enumerationErrors.length)boundsHost.append(node('p',result.value.enumerationErrors.map(e=>e.message).join(' '),'error'));
  for(const a of result.value.alternatives){
    const row=node('article','','row');row.append(node('h4',actionText(a.action,state)));
    if(!a.shop.ok)row.append(node('p',a.shop.errors.map(e=>e.message).join(' '),'error'));
    else if(a.bound?.ok){
      const b=a.bound.value;row.append(node('p',`${b.hands} manos × ${b.chipsPerHandUpper} fichas × ${b.multPerHandUpper} Mult = ${b.roundScoreUpper} puntos como cota. Objetivo: ${b.target}.`),node('p',b.conclusion),details('Derivación y premisas',b),details('Reglas y evidencia de esta cota',a.bound.evidence));
    }else if(a.bound)row.append(node('p',a.bound.errors.map(e=>e.message).join(' '),'error'));
    boundsHost.append(row);
  }
  boundsHost.append(details('Acciones incluidas y excluidas',result.value.coverage));
  message('Cotas calculadas sobre la revisión registrada. No se guardó ni recomendó ninguna acción.');
});boundsButton.id='check-bounds';$('analyze').after(boundsButton);
const horizonHost=node('div');boundsHost.after(horizonHost);
mountHorizon(horizonHost,{state:()=>{if(dirty)throw new Error('Guarda los datos editados antes de evaluar el horizonte.');if(demoMode)throw new Error('Sal de la demostración antes de evaluar tu partida.');if(!record)throw new Error('Primero registra una partida.');return record.state;},plans:()=>scenarioReaders.map(r=>r()).filter(Boolean).map(s=>s.plan),actionText,message});
const handResults=node('div');handResults.id='hand-results';$('live-plans').after(handResults);
const handButton=button('Calcular manos del mazo y candidatos',()=>{
 const request=++handRequest;handResults.replaceChildren();let state:GameState,scenarios:AdvisorScenario[];
 try{state=liveState();scenarios=scenarioReaders.map(read=>read()).filter(Boolean);if(!scenarios.length)throw new Error('Añade una mano o una plantilla para este cálculo.');}
 catch(e){handResults.append(node('p',e instanceof Error?e.message:'Revisa la partida y las jugadas.','error'));return;}
 handResults.append(node('h3','Puntos de las jugadas indicadas'),node('small','Escenario explícito. No altera la partida ni la valoración rápida.'));
 for(const scenario of scenarios){const result=evaluateRoundPlan(state,scenario.plan,state.updatedAt),section=node('section','','bay-score');section.append(node('h4',scenario.plan.description));
  if(!result.ok)section.append(node('p',result.errors.map(e=>e.message).join(' '),'error'));
  else {const e=result.value;if(!e.errors.length||e.events.length)section.append(node('p',`${e.score.toLocaleString('es')} puntos${e.errors.length?' · resultado parcial':''} · ${e.handsUsed} manos · ${e.discardsUsed} descartes`,'bay-score-value'),node('p',e.targetReached?'Alcanza la ciega en este plan':e.errors.length?'Plan incompatible; no concluye la ronda':'Este plan no alcanza la ciega'));
   for(const event of e.events)if(event.handScore)section.append(node('p',`${event.handScore.chips} × ${event.handScore.mult} = ${event.handScore.score}`));
   if(e.errors.length)section.append(node('p',e.errors.map(error=>error.message).join(' '),'error'));section.append(details('Desglose y reglas',result));
  }handResults.append(section);
 }
 const selected=readShopSnapshot().jokers;
 if(selected.length)void fetch('./web/assets/jokers/catalog.json').then(r=>r.json()).then((catalog:{jokers:JokerReference[]})=>{if(request!==handRequest)return;for(const candidate of selected){const j=catalog.jokers.find(j=>j.id===candidate.catalogId||j.engineId===candidate.catalogId);if(j){const offer={price:candidate.price===null?unknown():known(candidate.price),edition:known(candidate.edition),stickers:known(candidate.stickers)};const section=node('section');section.append(node('h3',j.names.es),renderHandPreview(j,candidate.replacementId??'',state,scenarios,offer));handResults.append(section);}}}).catch(()=>{if(request===handRequest)handResults.append(node('p','No se pudo cargar el catálogo para comparar las ofertas.','error'));});
});handButton.id='calculate-hands';$('live-plans').append(handButton);
mountWorkspace();mountCollection();renderScenarios();reload();lock.acquire();


