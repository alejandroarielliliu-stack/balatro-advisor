import type {Fact,GameState} from '../state/model.js';
import type {Card} from '../catalog/initial.js';
import {inventoryCards} from '../state/inventory-changes.js';
import type {TarotAction} from '../state/tarot-contract.js';
import {applyTarotAction,tarotDefinition} from '../rules/tarot.js';
import type {TarotChange} from '../rules/tarot.js';
import {consumableLabel} from './consumable-labels.js';
import {evaluateComposition} from '../advisor/composition.js';

const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',cls='')=>{const node=document.createElement(tag);node.textContent=text;node.className=cls;return node;};
const value=<T>(fact:Fact<T>|undefined)=>fact?.status==='known'?fact.value:undefined;
const suits={S:'♠',H:'♥',D:'♦',C:'♣'};
const enhancements:Record<string,string>={none:'Sin mejora',bonus:'Bonificación',mult:'Mult',wild:'Comodín',glass:'Cristal',steel:'Acero',stone:'Piedra',gold:'Oro',lucky:'Suerte'};
const marks:Record<string,string>={bonus:'+30',mult:'+4',wild:'♦♣',glass:'×2',steel:'Ac',stone:'+50',gold:'$',lucky:'?'};
const cardLabel=(card:Card)=>`${card.rank}${suits[card.suit]} · ${enhancements[card.enhancement]??card.enhancement}`;
function cardButton(card:Card){
 const button=el('button','','playing-card tarot-card');button.type='button';button.classList.toggle('red-suit',['H','D'].includes(card.suit));
 button.append(el('span',card.enhancement==='stone'?'◆':card.rank),el('b',card.enhancement==='stone'?'':suits[card.suit]));button.title=cardLabel(card)+' · '+card.instanceId;button.setAttribute('aria-label',button.title);button.dataset.enhancement=card.enhancement;
 if(marks[card.enhancement])button.append(el('small',marks[card.enhancement],'tarot-card-mark'));
 return button;
}
export {cardButton as tarotCardButton,cardLabel as tarotCardLabel};
/** Render only the supplied H2 changes; no Tarot formula or projected score. */
export function renderTarotOutcome(change:TarotChange,showLimits=true){
 const host=el('div','','tarot-outcome');
 for(const c of change.cardChanges){const before=c.before,after=c.after;host.append(el('small',`${before.rank}${suits[before.suit]} · ${enhancements[before.enhancement]??before.enhancement} → ${after.rank}${suits[after.suit]} · ${enhancements[after.enhancement]??after.enhancement}`));}
 if(change.cardChanges.length&&value(change.state.observed.jokerContext)?.tarotsUsed?.status!=='known')host.append(el('small','Total de Tarot usados desconocido; Fortune Teller no tiene una bonificación exacta.','notice'));
 if(showLimits&&change.limitations.length){const details=el('details');details.append(el('summary','Reglas provisionales y límites'));for(const limitation of new Set(change.limitations))details.append(el('small',limitation,'muted'));host.append(details);}
 return host;
}
export interface TarotViewOptions {state:GameState|null;writable:boolean;dirty:boolean;confirm:(action:TarotAction)=>string|null;editConsumables:()=>void;controlsChanged:()=>void}

/** Hand observations are facts; selecting targets and viewing projections are read-only. */
export function renderTarotView(host:HTMLElement,options:TarotViewOptions){
 host.replaceChildren();host.hidden=true;host.className='tarot-panel';const state=options.state;
 if(state?.schemaVersion!=='0.2'||state.phase!=='in_round')return;
 host.hidden=false;const header=el('div','','section-title'),manage=el('button','Mis consumibles','secondary');manage.type='button';manage.id='tarot-inventory';manage.dataset.write='';manage.dataset.localDisabled=String(options.dirty);manage.disabled=!options.writable||options.dirty;manage.onclick=options.editConsumables;header.append(el('h2','Tarot'),manage);host.append(header);
 const error=el('p','','error');error.id='tarot-error';error.setAttribute('role','status');host.append(error);
 const request=(action:TarotAction)=>{const issue=options.confirm(action);if(issue)error.textContent=issue;};
 const cards=inventoryCards(state),heldIds=value(state.phaseData.heldCardIds),held=heldIds?.flatMap(id=>{const card=cards?.find(c=>c.instanceId===id);return card?[card]:[];});
 const handEditor=el('details','','tarot-hand-editor');handEditor.id='tarot-hand-editor';handEditor.open=heldIds===undefined;
 handEditor.append(el('summary',heldIds===undefined?'Registrar cartas en mano':`Actualizar mano · ${heldIds.length} cartas registradas`));
 if(!cards)handEditor.append(el('small','Primero registra la composición actual del mazo desde Cambios de cartas.'));
 else{
  const picked=new Set(heldIds??[]),search=el('input');search.type='search';search.placeholder='Buscar rango, palo o mejora';search.id='tarot-hand-search';search.setAttribute('aria-label','Buscar carta para la mano observada');
  const count=el('small'),grid=el('div','','tarot-card-picker'),save=el('button','Registrar esta mano','secondary');save.type='button';save.id='tarot-observe-hand';save.dataset.write='';save.dataset.localDisabled=String(options.dirty);save.disabled=!options.writable||options.dirty;
  const countCards=()=>{const max=value(state.observed.resources.handSize);count.textContent=`${picked.size}${max===undefined?'':' / '+max} cartas · pulsa las que ves de izquierda a derecha`;} ;
  const redraw=()=>{grid.replaceChildren();const term=search.value.trim().toLocaleLowerCase();for(const card of cards){if(term&&!(`${cardLabel(card)} ${card.instanceId}`.toLocaleLowerCase().includes(term)))continue;const button=cardButton(card);button.dataset.tarotHandCard=card.instanceId;button.setAttribute('aria-pressed',String(picked.has(card.instanceId)));button.onclick=()=>{if(picked.has(card.instanceId))picked.delete(card.instanceId);else picked.add(card.instanceId);redraw();};grid.append(button);}countCards();};
  search.oninput=redraw;save.onclick=()=>request({type:'observe_round_hand',cardIds:[...picked]});redraw();handEditor.append(search,count,grid,save);
 }
 host.append(handEditor);
 const items=value(value(state.observed.jokerContext)?.consumables),tarots=items?.filter(item=>item.kind==='tarot')??[];
 if(!tarots.length){host.append(el('small',items===undefined?'Registra los consumibles que tienes.':'No hay Tarot registrado.','muted'));options.controlsChanged();return;}
 const label=el('label','Tarot que quieres evaluar'),select=el('select');select.id='tarot-consumable';select.setAttribute('aria-label','Tarot que quieres evaluar');for(const item of tarots){const option=el('option',consumableLabel(item.catalogId)+(tarotDefinition(item.catalogId)?'':' · uso pendiente'));option.value=item.instanceId;select.append(option);}label.append(select);host.append(label);
 const instruction=el('small'),targets=el('div','','tarot-targets'),preview=el('div','','tarot-preview'),use=el('button','Usé este Tarot');use.type='button';use.id='tarot-use';use.dataset.write='';host.append(instruction,targets,preview,use);
 let selected=new Set<string>();
 const action=():TarotAction=>({type:'use_tarot',instanceId:select.value,targetCardIds:(held??[]).filter(c=>selected.has(c.instanceId)).map(c=>c.instanceId)});
 const update=()=>{
  const item=tarots.find(c=>c.instanceId===select.value),definition=item?tarotDefinition(item.catalogId):undefined;
  instruction.textContent=definition?definition.maxTargets===1?'Elige 1 carta de tu mano registrada.':`Elige de 1 a ${definition.maxTargets} cartas de tu mano registrada.`:'Este Tarot aún no tiene transformación integrada.';
  targets.replaceChildren();for(const card of held??[]){const button=cardButton(card);button.dataset.tarotTarget=card.instanceId;button.setAttribute('aria-pressed',String(selected.has(card.instanceId)));button.onclick=()=>{if(selected.has(card.instanceId))selected.delete(card.instanceId);else selected.add(card.instanceId);update();};targets.append(button);}
  preview.replaceChildren();if(heldIds===undefined)preview.append(el('small','Registra primero las cartas que tienes en mano.'));
  const result=applyTarotAction(state,action(),{expectedRevision:state.revision,updatedAt:state.updatedAt});
  use.dataset.localDisabled=String(!result.ok||options.dirty);use.disabled=!result.ok||options.dirty||!options.writable;
  if(result.ok){
   preview.append(renderTarotOutcome(result.value));
   const before=evaluateComposition(state),after=evaluateComposition(result.value.state),detail=el('details');detail.append(el('summary','Efecto sobre tu composición'));
   if(before.global.value!==null&&after.global.value!==null)detail.append(el('p',`Índice heurístico ${before.global.value.toFixed(1)} → ${after.global.value.toFixed(1)}. No son fichas de una mano.`));
   for(const section of before.sections){const current=after.sections.find(s=>s.id===section.id);if(current&&section.value!==current.value)detail.append(el('small',`${section.label}: ${section.value??'—'} → ${current.value??'—'}`));}preview.append(detail);
  }else if(selected.size||!definition||heldIds===undefined)preview.append(el('small',result.errors.map(e=>e.message).join(' '),'error'));
  options.controlsChanged();
 };
 select.onchange=()=>{selected=new Set();update();};use.onclick=()=>request(action());update();
 host.append(el('small','Actualiza la mano si jugaste, descartaste o robaste. Consultar no usa el Tarot.','muted'));
}
