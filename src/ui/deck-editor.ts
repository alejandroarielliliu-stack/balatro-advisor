import {startingComposition} from '../catalog/decks.js';
import {RANKS} from '../catalog/initial.js';
import {resolveDeckCards,summarizeDeckCards} from '../state/deck-material.js';
import type {Card} from '../catalog/initial.js';
import type {GameState} from '../state/model.js';
type DeckFact=GameState['observed']['deck'];
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='')=>{const n=document.createElement(tag);n.textContent=text;return n;};
const unknown=():DeckFact=>({status:'unknown',reason:'Composición actual sin transcribir.'});
export function mountDeckEditor(host:HTMLElement,initial:DeckFact,deckId:()=>string,changed:()=>void,useInitialTemplate=false){
 let data=structuredClone(initial);
 let templateActive=useInitialTemplate&&data.status==='known'&&'preset' in data.value;
 const root=el('details');root.id='deck-editor';const summary=el('summary'),body=el('div'),cardsHost=el('div');cardsHost.className='deck-card-grid';
 const btn=(label:string,fn:()=>void)=>{const b=el('button',label);b.type='button';b.onclick=()=>{fn();render();changed();};return b;};
 const current=()=>resolveDeckCards(data,{status:'known',source:'manual',value:deckId()});
 const explicit=()=>{const cards=current();if(!cards)throw new Error('Primero registra una composición completa; una carta aislada no reconstruye el mazo.');templateActive=false;data={status:'known',source:'manual',value:{cards}};return cards;};
 const note=el('p');note.className='muted';
 const material=el('small');material.id='deck-material-summary';
 const newCard=el('dialog');newCard.id='deck-new-card';newCard.setAttribute('aria-label','Añadir carta observada');
 const add=btn('Añadir carta observada',()=>{
  newCard.replaceChildren(el('h3','Carta que añadiste'));const fields=el('div');fields.className='grid';
  const choose=(label:string,options:readonly string[],initial='')=>{const wrap=el('label',label),select=el('select');select.setAttribute('aria-label',label+' nueva carta');if(!initial){const empty=el('option','Elegir');empty.value='';select.append(empty);}for(const value of options){const option=el('option',value);option.value=value;select.append(option);}select.value=initial;wrap.append(select);fields.append(wrap);return select;};
  const rank=choose('Rango',RANKS),suit=choose('Palo',['S','H','D','C']);
  const enhancement=choose('Mejora',['none','bonus','mult','wild','glass','steel','stone','gold','lucky'],'none');
  const seal=choose('Sello',['none','red','blue','gold','purple'],'none'),edition=choose('Edición',['base','foil','holographic','polychrome'],'base');
  const chipLabel=el('label','Fichas adicionales'),chips=el('input');chips.type='number';chips.min='0';chips.step='1';chips.value='0';chips.setAttribute('aria-label','Fichas adicionales nueva carta');chipLabel.append(chips);fields.append(chipLabel);
  const debuffLabel=el('label','Debilitada'),debuff=el('input');debuff.type='checkbox';debuff.setAttribute('aria-label','Debilitada nueva carta');debuffLabel.prepend(debuff);fields.append(debuffLabel);
  const error=el('p');error.className='error';error.setAttribute('role','alert');
  const confirm=el('button','Añadir esta carta');confirm.type='button';confirm.id='deck-new-confirm';confirm.onclick=()=>{
   if(!rank.value||!suit.value){error.textContent='Elige rango y palo de la carta real.';return;}
   const extraChips=Number(chips.value);if(chips.validity.badInput||!chips.value.trim()||!Number.isSafeInteger(extraChips)||extraChips<0){error.textContent='Las fichas adicionales deben ser un entero no negativo.';return;}
   if(!current()||current()!.length>=200){error.textContent='No hay una composición completa compatible para añadir la carta.';return;}
   explicit().push({instanceId:'c-'+crypto.randomUUID(),rank:rank.value as Card['rank'],suit:suit.value as Card['suit'],edition:edition.value,enhancement:enhancement.value,seal:seal.value,extraChips,...(debuff.checked?{debuff:true}:{})});
   newCard.close();render();changed();
  };
  const cancel=el('button','Cancelar');cancel.type='button';cancel.onclick=()=>newCard.close();newCard.append(fields,error,confirm,cancel);newCard.showModal();rank.focus();
 });add.id='deck-add-observed';
 // New-card fields are a draft until the user adds that complete card.
 for(const type of ['input','change','focusout'])newCard.addEventListener(type,event=>event.stopPropagation());
 newCard.addEventListener('keydown',event=>{event.stopPropagation();if(event.key==='Enter'&&!(event.target instanceof HTMLButtonElement))event.preventDefault();});
 root.append(newCard);
 body.append(note,material,btn('Usar composición inicial que confirmé',()=>{const template=startingComposition(deckId());if(template.status==='known')data={status:'known',source:'confirmedPreset',value:{cards:template.cards}};else data=unknown();}),btn('Marcar composición desconocida',()=>{data=unknown();}),cardsHost,
 add);
 const resetLabel=el('label','Retirar escenarios guardados anteriores (se conservan en el historial)'),reset=el('input');reset.type='checkbox';reset.id='discard-saved-scenarios';resetLabel.prepend(reset);body.append(resetLabel);
 root.append(summary,body);host.append(root);
 function refreshSummary(){
  const cards=current();summary.textContent=`Mazo actual · ${!cards?'desconocido':cards.length+' cartas'}${templateActive?' · inicial':''}`;
  note.textContent=deckId()==='erratic'?'Errática: registra cada carta real. No hay plantilla aleatoria.':templateActive?'Plantilla inicial de la baraja seleccionada. Si cambió tu mazo, edita las cartas; las notas usan esta composición.':'Edita las cartas que cambiaron. Se guardan al terminar la edición si ya registraste la partida.';
  const counts=cards?summarizeDeckCards(cards):undefined;
  material.textContent=counts?`${counts.usable.ranks.K} reyes activos · ${counts.full.enhancements.steel??0} Acero · ${counts.full.enhancements.gold??0} Oro · ${counts.full.seals.blue??0} sellos azules`:'Composición desconocida: no se suponen cero cartas de cada tipo.';
  material.dataset.kings=counts?String(counts.usable.ranks.K):'';material.dataset.steel=counts?String(counts.full.enhancements.steel??0):'';
  add.disabled=!cards||cards.length>=200;
 }
 function render(){
  const cards=current();refreshSummary();
  cardsHost.replaceChildren();
  for(const card of cards??[]){
   const row=el('div');row.className='deck-card-editor';row.dataset.cardId=card.instanceId;
   const controls=el('div');
   const select=(label:string,options:readonly string[],value:string,write:(value:string)=>void)=>{const l=el('label',label),s=el('select');s.setAttribute('aria-label',label+' '+card.instanceId);for(const v of options){const o=el('option',v);o.value=v;s.append(o);}s.value=value;s.onchange=()=>{write(s.value);refreshSummary();changed();};l.append(s);return l;};
   const find=()=>explicit().find(c=>c.instanceId===card.instanceId)!;
   controls.append(select('Rango',RANKS,card.rank,v=>{find().rank=v as Card['rank'];}),select('Palo',['S','H','D','C'],card.suit,v=>{find().suit=v as Card['suit'];}));
   controls.append(select('Mejora',['none','bonus','mult','wild','glass','steel','stone','gold','lucky'],card.enhancement,v=>{find().enhancement=v;}));
   controls.append(select('Sello',['none','red','blue','gold','purple'],card.seal,v=>{find().seal=v;}),select('Edición',['base','foil','holographic','polychrome'],card.edition,v=>{find().edition=v;}));
   const remove=btn('Quitar',()=>{const cs=explicit(),i=cs.findIndex(c=>c.instanceId===card.instanceId);cs.splice(i,1);});remove.setAttribute('aria-label','Quitar del mazo '+card.instanceId);
   row.append(controls,el('small',card.instanceId),remove);cardsHost.append(row);
  }
 }
 render();
 return {discardSavedScenarios:()=>reset.checked,clearDiscardSavedScenarios:()=>{reset.checked=false;},read:():DeckFact=>structuredClone(data),changeDeck:()=>{
  if(templateActive){const template=startingComposition(deckId());data=template.status==='known'?{status:'known',source:'manual',value:{cards:template.cards}}:unknown();}
  else if(data.status==='known'&&'preset' in data.value&&['abandoned','checkered','erratic'].includes(deckId()))data=unknown();
  render();
 }};
}
