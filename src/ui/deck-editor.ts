import {startingComposition} from '../catalog/decks.js';
import {RANKS,standardDeck} from '../catalog/initial.js';
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
 const current=()=>data.status==='known'?('cards' in data.value?data.value.cards:standardDeck()):[];
 const explicit=()=>{templateActive=false;const cards=structuredClone(current());data={status:'known',source:'manual',value:{cards}};return cards;};
 const note=el('p');note.className='muted';
 body.append(note,btn('Usar composición inicial que confirmé',()=>{const template=startingComposition(deckId());if(template.status==='known')data={status:'known',source:'confirmedPreset',value:{cards:template.cards}};else data=unknown();}),btn('Marcar composición desconocida',()=>{data=unknown();}),cardsHost,
 btn('Añadir carta observada',()=>{const cards=explicit();if(cards.length<200)cards.push({instanceId:'c-'+crypto.randomUUID(),rank:'2',suit:'S',edition:'base',enhancement:'none',seal:'none',extraChips:0});}));
 const resetLabel=el('label','Retirar escenarios guardados anteriores (se conservan en el historial)'),reset=el('input');reset.type='checkbox';reset.id='discard-saved-scenarios';resetLabel.prepend(reset);body.append(resetLabel);
 root.append(summary,body);host.append(root);
 function refreshSummary(){
  const cards=current();summary.textContent=`Mazo actual · ${data.status==='unknown'?'desconocido':cards.length+' cartas'}${templateActive?' · inicial':''}`;
  note.textContent=deckId()==='erratic'?'Errática: registra cada carta real. No hay plantilla aleatoria.':templateActive?'Plantilla inicial de la baraja seleccionada. Si cambió tu mazo, edita las cartas; las notas usan esta composición.':'La composición debe coincidir con tu mazo actual. Editar aquí no guarda hasta confirmar la actualización.';
 }
 function render(){
  const cards=current();refreshSummary();
  cardsHost.replaceChildren();
  for(const card of cards){
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
 return {discardSavedScenarios:()=>reset.checked,read:():DeckFact=>structuredClone(data),changeDeck:()=>{
  if(templateActive){const template=startingComposition(deckId());data=template.status==='known'?{status:'known',source:'manual',value:{cards:template.cards}}:unknown();}
  else if(data.status==='known'&&'preset' in data.value&&['abandoned','checkered','erratic'].includes(deckId()))data=unknown();
  render();
 }};
}
