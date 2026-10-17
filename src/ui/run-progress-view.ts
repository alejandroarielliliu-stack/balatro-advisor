import {blindComparisonButton} from './blind-decision-view.js';
import type {AdvisorScenario} from '../advisor/advisor.js';
import {TAGS,tagDefinition} from '../catalog/tags.js';
import type {GameState,Fact} from '../state/model.js';
import type {ConfirmedRecord} from '../storage/confirmed-store.js';
import type {RunProgressCommand,InventoryConfirmation,BlindInfo} from '../run/progress.js';
import {nextBlindAfter,inventoryGroups} from '../run/progress.js';
import {DECK_PROFILES,deckDefinition} from '../catalog/decks.js';
import {blindRequirement} from '../catalog/blinds.js';

const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',cl='')=>{const e=document.createElement(tag);e.textContent=text;e.className=cl;return e;};
const value=<T>(f:Fact<T>|undefined)=>f?.status==='known'?f.value:undefined;
const unknown=()=>({status:'unknown',reason:'Todavía no observado.'} as const);
const manual=<T>(value:T)=>({status:'known' as const,source:'manual' as const,value});
const preset=<T>(value:T)=>({status:'known' as const,source:'confirmedPreset' as const,value});
const kindName={small:'Ciega pequeña',big:'Ciega grande',boss:'Ciega jefe'};
export interface JourneyOptions {
  record:ConfirmedRecord|null;dirty:boolean;writable:boolean;
  open:(title:string,body:HTMLElement,accept:string,submit:()=>boolean)=>void;
  submit:(command:RunProgressCommand,inventory:InventoryConfirmation)=>boolean;
  start:(deckId:string,profile:boolean)=>boolean;undo:()=>void;export:()=>void;migrate:()=>void;
  error:(text:string)=>void;comparisonState?:()=>GameState;scenarios?:()=>AdvisorScenario[];
}
const field=(id:string,label:string,initial='',type='number')=>{const wrap=el('label'),input=el('input');wrap.htmlFor=id;input.id=id;input.type=type;input.value=initial;if(type==='number'){input.step='1';input.inputMode='numeric';}wrap.append(el('span',label),input);return {wrap,input};};
const select=(id:string,label:string,choices:Record<string,string>,selected:string)=>{const wrap=el('label'),input=el('select');input.id=id;wrap.htmlFor=id;for(const [value,label]of Object.entries(choices)){const option=el('option',label);option.value=value;input.append(option);}input.value=selected;wrap.append(el('span',label),input);return {wrap,input};};
const check=(id:string,label:string)=>{const wrap=el('label','','check'),input=el('input');input.id=id;input.type='checkbox';wrap.append(input,el('span',label));return {wrap,input};};
const number=(input:HTMLInputElement,min:number,optional=false)=>{if(optional&&!input.value.trim())return undefined;const n=Number(input.value);if(!input.value.trim()||!Number.isSafeInteger(n)||n<min)throw Error('Revisa «'+(input.labels?.[0]?.querySelector('span')?.textContent??input.id)+'»: usa un entero'+(min!==Number.MIN_SAFE_INTEGER?' de al menos '+min:'')+'.');return n;};

/** Only renders and submits explicit observations. No game hook or scoring formula lives here. */
export function renderRunJourney(host:HTMLElement,options:JourneyOptions){
 host.replaceChildren();host.className='run-journey';const record=options.record,state=record?.state;
 const toolbar=el('div','','journey-actions');
 const action=(id:string,label:string,fn:()=>void,primary=false)=>{const b=el('button',label,primary?'':'secondary');b.id=id;b.type='button';b.dataset.write='true';b.dataset.localDisabled=String(options.dirty);b.disabled=!options.writable||options.dirty;b.onclick=fn;toolbar.append(b);return b;};
 const open=(title:string,body:HTMLElement,accept:string,submit:()=>boolean)=>options.open(title,body,accept,()=>{try{return submit();}catch(e){options.error(e instanceof Error?e.message:'Revisa los datos.');return false;}});
 const inventory=(body:HTMLElement)=>{
  const box=check('progress-inventory-unchanged','Cartas, comodines, vales, niveles y recursos sin cambios');
  const groups=el('details');groups.id='progress-changes';groups.append(el('summary','Indicar qué cambió'));
  const labels={deck:'Cartas del mazo',jokers:'Inventario de comodines',handBases:'Niveles de manos',outOfScope:'Vales y otros modificadores',resources:'Recursos',jokerContext:'Consumibles e historial'};
  const choices=inventoryGroups.map(group=>{const choice=check('progress-changed-'+group,labels[group]);groups.append(choice.wrap);return {group,input:choice.input};});
  box.input.onchange=()=>groups.hidden=box.input.checked;
  const note=el('small','Marca solo los grupos que cambiaron; confirmas que los demás siguen igual. Los contadores que el resumen no determina se pedirán por separado.');
  body.append(box.wrap,groups,note);return ():InventoryConfirmation=>{
   if(box.input.checked)return {unchanged:true};
   const changedGroups=choices.filter(c=>c.input.checked).map(c=>c.group);
   if(!changedGroups.length){groups.open=true;throw Error('Confirma que no hubo cambios o marca únicamente los grupos que cambiaron.');}
   return {reconcile:{changedGroups}};
  };
 };
 const queueEditor=(body:HTMLElement,initial:Fact<string[]>|undefined)=>{
  const verified=check('progress-tags-known','He revisado las etiquetas pendientes (vacío = ninguna)');verified.input.checked=initial?.status==='known';
  const ids=[...(value(initial)??[])],list=el('div','','journey-actions');list.id='progress-tags-list';
  const choice=select('progress-tag-choice','Añadir etiqueta pendiente',Object.fromEntries(TAGS.map(t=>[t.id,t.name])),TAGS[0]!.id);
  const add=el('button','Añadir','secondary');add.type='button';add.id='progress-tag-add';
  const render=()=>{list.replaceChildren();ids.forEach((id,index)=>{const b=el('button',(tagDefinition(id)?.name??id)+' ×','secondary');b.type='button';b.setAttribute('aria-label','Quitar '+(tagDefinition(id)?.name??id));b.onclick=()=>{ids.splice(index,1);render();};list.append(b);});};
  add.onclick=()=>{if(ids.length>=100){options.error('Como máximo 100 etiquetas.');return;}ids.push(choice.input.value);render();};render();
  body.append(verified.wrap,list,choice.wrap,add,el('small','Transcribe la cola que muestra el juego, incluidos duplicados. No se simulan sus efectos.'));
  return ():Fact<string[]>=>verified.input.checked?manual([...ids]):{status:'unknown',reason:'No se revisó la cola de etiquetas pendientes.'};
 };
 const submit=(command:RunProgressCommand,readInventory:()=>InventoryConfirmation)=>options.submit(command,readInventory());
 const newGame=()=>{
  const body=el('div','','journey-dialog'),decks=Object.fromEntries(Object.entries(DECK_PROFILES).filter(([id])=>!!deckDefinition(id)).map(([id,d])=>[id,d.name]));
  const deck=select('progress-deck','Baraja',decks,'blue'),profile=check('progress-profile','Steam 1.0.1o-FULL · sin mods · White Stake');
  if(record){body.append(el('p','La nueva partida sustituirá esta copia y su historial. Exporta la actual si quieres conservarla.','notice'));const backup=el('button','Exportar partida actual','secondary');backup.type='button';backup.onclick=options.export;body.append(backup);}
  body.append(deck.wrap,profile.wrap,el('small','Se aplican las condiciones iniciales de la baraja. Las cartas de Errática, el jefe y la etiqueta visible seguirán desconocidos.'));
  open('Empecé una partida nueva',body,'Registrar nueva partida',()=>options.start(deck.input.value,profile.input.checked));
 };
 const title=el('div','','journey-heading');
 if(!state){title.append(el('h2','Partida nueva'),el('small','O importa una copia desde Registro.'));host.append(title,toolbar);action('run-new','Empecé una partida',newGame,true);return;}
 const blind=value(state.observed.nextBlind),name=blind?`Ante ${blind.ante} · ${kindName[blind.kind]}`:'Ciega sin registrar';
 title.append(el('h2',state.phase==='finished'?'Partida terminada':name));
 const step=el('ol','','journey-steps');step.setAttribute('aria-label','Ciegas del ante');for(const [kind,label]of Object.entries(kindName)){const li=el('li',label.replace('Ciega ',''));if(blind?.kind===kind)li.setAttribute('aria-current','step');step.append(li);}title.append(step);host.append(title,toolbar);
 if(state.schemaVersion==='0.1'){
  title.append(el('small','Actualiza el formato para registrar el recorrido.'));action('run-journey-migrate','Actualizar formato',options.migrate);return;
 }
 const openCommand=(title:string,label:string,command:RunProgressCommand)=>{
  const body=el('div','','journey-dialog');body.append(el('p',title+'. Se registrará lo que ocurrió en Balatro.'));
  const readInventory=inventory(body);open(title,body,label,()=>submit(command,readInventory));
 };
 if(state.phase==='unknown'){
  title.append(el('small','Indica dónde estás para continuar con esta partida.'));
  action('run-locate','Retomar partida',()=>{
   const body=el('div','','journey-dialog'),phase=select('progress-phase','Estoy en',{blind_select:'Selección de ciega',in_round:'Jugando la ciega',shop:'Tienda'},'blind_select'),ante=field('progress-ante','Ante',String(blind?.ante??1)),kind=select('progress-blind','Ciega',{small:'Pequeña',big:'Grande',boss:'Jefe'},blind?.kind??'small'),money=field('progress-money','Dinero actual ($)');
   const note=el('small','Si estás en tienda, indica la ciega que viene después. No se deduce qué ciega originó esa tienda.');body.append(phase.wrap,ante.wrap,kind.wrap,money.wrap,note);
   const readInventory=inventory(body);open('Retomé esta partida',body,'Registrar posición',()=>{const a=number(ante.input,1)!;if(a>8)throw Error('Este recorrido termina en ante 8.');return submit({type:'locate',phase:phase.input.value as 'blind_select'|'in_round'|'shop',blind:makeBlind(a,kind.input.value as BlindInfo['kind'],state),money:number(money.input,Number.MIN_SAFE_INTEGER)!},readInventory);});
  },true);
 }else if(state.phase==='blind_select'){
  action('run-enter-round','Entré en la ciega',()=>openCommand('Entré en la ciega','Registrar entrada',{type:'enter_round'}),true);
  if(blind&&blind.kind!=='boss'){
   toolbar.append(blindComparisonButton({open:options.open,state:options.comparisonState??(()=>structuredClone(state)),scenarios:options.scenarios??(()=>[])}));
   const current=value(state.phaseData.skipTag);title.append(el('small',current?(tagDefinition(current)?.name??current):'Etiqueta de salto sin registrar'));
   action('run-observe-tag','Etiqueta visible',()=>{
    const body=el('div','','journey-dialog'),knownTag=check('progress-tag-known','Conozco la etiqueta visible');knownTag.input.checked=!!current;
    const tag=select('progress-visible-tag','Etiqueta',Object.fromEntries(TAGS.map(t=>[t.id,t.name])),current??TAGS[0]!.id);body.append(knownTag.wrap,tag.wrap);
    open('Etiqueta de esta ciega',body,'Registrar etiqueta',()=>options.submit({type:'observe_skip_tag',tag:knownTag.input.checked?manual(tag.input.value):unknown()},{unchanged:true}));
   });
   action('run-skip-blind','Salté esta ciega',()=>{
    const body=el('div','','journey-dialog'),done=check('progress-skip-resolved','Ya resolví los efectos y estoy en la siguiente selección'),money=field('progress-money','Saldo actual ($) · opcional');
    body.append(done.wrap,money.wrap,el('small','No cobras una ronda ni visitas una tienda. Indica cambios después de resolver sobres y recompensas en Balatro.'));
    const readInventory=inventory(body),details=el('details');details.append(el('summary','Etiquetas pendientes después del salto'));const readTags=queueEditor(details,undefined);body.append(details);
    open('Registré el salto',body,'Registrar salto',()=>{
     if(!done.input.checked)throw Error('Termina los efectos en Balatro y confirma que estás en la siguiente selección.');
     const moneyValue=number(money.input,Number.MIN_SAFE_INTEGER,true),next=nextBlindAfter(state,blind);
     return submit({type:'skip_blind',atNextSelection:true,tags:readTags(),...(moneyValue===undefined?{}:{money:moneyValue}),...(next&&next.kind!=='boss'?{nextBlind:completeBlind(next,state)}:{})},readInventory);
    });
   });
  }
 }else if(state.phase==='in_round'){
  action('run-report-result','Terminé la ciega',()=>{
   const body=el('div','','journey-dialog'),outcome=select('progress-outcome','Resultado observado',{won:'Superé la ciega',lost:'Perdí la partida'},'won');
   body.append(outcome.wrap);const extra=el('details');extra.append(el('summary','Rendimiento de esta ronda · opcional'));const grid=el('div','','journey-fields'),score=field('progress-score','Puntuación final'),hands=field('progress-hands','Manos usadas'),discards=field('progress-discards','Descartes usados');grid.append(score.wrap,hands.wrap,discards.wrap);extra.append(grid);body.append(extra);
   const readInventory=inventory(body);body.append(el('small','No se reconstruyen las jugadas ni los ingresos. Una victoria en el jefe de ante 8 cierra este recorrido.'));
   open('Resultado de la ciega',body,'Registrar resultado',()=>{
    const s=number(score.input,0,true),h=number(hands.input,0,true),d=number(discards.input,0,true);
    return submit({type:'report_result',outcome:outcome.input.value as 'won'|'lost',...(s===undefined?{}:{score:s}),...(h===undefined?{}:{handsUsed:h}),...(d===undefined?{}:{discardsUsed:d})},readInventory);
   });
  },true);
 }else if(state.phase==='cashout'){
  action('run-collect','Ya cobré',()=>{
   const body=el('div','','journey-dialog'),money=field('progress-money','Dinero total después de cobrar ($)');body.append(money.wrap,el('small','Saldo que muestra el juego, incluido todo el cobro. No se suma otra vez al dinero anterior.'));
   const readInventory=inventory(body);open('Registré el cobro',body,'Registrar saldo y tienda',()=>{
    const ref=state.phase==='cashout'&&state.phaseData.blind.status==='known'?state.phaseData.blind.value:undefined;
    const next=ref?nextBlindAfter(state,ref):null;
    return submit({type:'collect_cashout',money:number(money.input,Number.MIN_SAFE_INTEGER)!,...(next?{nextBlind:completeBlind(next,state)}:{})},readInventory);
   });
  },true);
 }else if(state.phase==='shop'){
  action('run-leave-shop','Salí de la tienda',()=>openCommand('Salí de la tienda','Registrar salida',{type:'leave_shop'}),true);
 }else if(state.phase==='open_pack')title.append(el('small','El registro de elecciones de sobres todavía no está disponible. Se conserva el estado actual.'));
 else if(state.phase==='finished'){
  title.append(el('small',state.phaseData.outcome==='won'?'Objetivo ante 8 completado':state.phaseData.outcome==='lost'?'Derrota registrada':'Partida detenida'));action('run-new','Empecé otra partida',newGame,true);
 }
 if(state.phase!=='finished'&&state.phase!=='unknown'){
  const context=value(state.observed.jokerContext),tags=context?.tags;
  action('run-observe-tags','Etiquetas pendientes',()=>{
   const body=el('div','','journey-dialog'),readTags=queueEditor(body,tags);
   open('Etiquetas pendientes',body,'Registrar cola',()=>options.submit({type:'observe_tag_queue',tags:readTags()},{unchanged:true}));
  });
 }
 const last=record.history.at(-1);if(last&&last.kind!=='undo'){
  const undo=action('run-undo','Deshacer registro',options.undo);undo.title='Corrige el registro local. No deshace acciones dentro de Balatro.';
 }
 if(state.phase!=='finished')action('run-stop','Dejé la partida',()=>{
  const body=el('div','','journey-dialog'),reason=field('progress-stop-reason','Motivo','Dejé de jugar','text');body.append(reason.wrap,el('small','Se conserva la última instantánea registrada. Esto no reconstruye cambios que no hayas comunicado.'));
  open('Dejé esta partida',body,'Registrar fin',()=>options.submit({type:'end_run',reason:reason.input.value},{unchanged:true}));
 });
 if(options.dirty)host.append(el('small','Hay una transcripción sin guardar. Guárdala en Registro o recarga antes de avanzar.','journey-pending'));
}
function makeBlind(ante:number,kind:BlindInfo['kind'],state:GameState):BlindInfo{
 const old=value(state.observed.nextBlind),boss=value(state.observed.visibleBoss);
 if(old?.ante===ante&&old.kind===kind)return structuredClone(old);
 if(kind==='boss'&&boss?.ante===ante)return structuredClone(boss);
 return completeBlind({ante,kind,bossId:kind==='boss'?unknown():manual('none'),target:unknown(),reward:unknown()},state);
}
function completeBlind(blind:BlindInfo,state:GameState):BlindInfo{
 const result=structuredClone(blind),requirements=blindRequirement(result.ante,result.kind,value(result.bossId)??'',value(state.observed.deckId)??'');
 if(requirements.ok){if(result.target.status==='unknown')result.target=preset(requirements.target);if(result.reward.status==='unknown')result.reward=preset(requirements.reward);}return result;
}
