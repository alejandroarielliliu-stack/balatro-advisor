import type {GameState} from '../state/model.js';
import type {Card} from '../catalog/initial.js';
import {compareArcanaChoices,arcanaChoicesAreCurrent} from '../advisor/arcana-choices.js';
import type {ArcanaChoiceReport} from '../advisor/arcana-choices.js';
import {inventoryCards} from '../state/inventory-changes.js';
import {consumableLabel} from './consumable-labels.js';
import {tarotCardLabel} from './tarot-view.js';

const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',cls='')=>{const node=document.createElement(tag);node.textContent=text;node.className=cls;return node;};
const signed=(n:number)=>n>0?'▲ +'+n.toFixed(1):n<0?'▼ '+n.toFixed(1):'◆ 0.0';
// Retain only the last report. Re-rendering unchanged data must not repeat a
// bounded search, and a revision or same-revision correction invalidates it.
let cached:ArcanaChoiceReport|null=null;

/** Read-only next-choice projections. Applying targets selects a preview, never
 * confirms an action. The existing T09b button remains the only write path. */
export function mountArcanaComparison(host:HTMLElement,state:GameState){
 const panel=el('section','','pack-comparison arcana-comparison');panel.id='arcana-comparison';panel.dataset.inputRevision=String(state.revision);panel.setAttribute('aria-label','Comparación de objetivos de Arcana');
 const header=el('div','','pack-comparison-heading');header.append(el('h3','Objetivos para tu composición'));panel.append(header);
 const status=el('p','','pack-choice-status');status.id='arcana-choice-status';status.setAttribute('aria-live','polite');
 const coverage=el('small','','muted');coverage.id='arcana-choice-coverage';panel.append(status,coverage);
 const explanation=el('details','','pack-comparison-details'),body=el('div');explanation.append(el('summary','Criterios y límites'),body);panel.append(explanation);host.append(panel);
 const result=cached&&arcanaChoicesAreCurrent(cached,state)?{ok:true as const,value:cached}:compareArcanaChoices(state),report:ArcanaChoiceReport|null=result.ok?result.value:null;
 if(report)cached=report;
 const byOptionId=new Map(report?.options.map(o=>[o.id,o])??[]);
 const cards=inventoryCards(state)??[],byId=new Map(cards.map(c=>[c.instanceId,c]));
 const targetLabel=(id:string)=>{const card=byId.get(id);return card?tarotCardLabel(card):id;};
 if(!report){status.dataset.kind='abstain';status.textContent='Sin comparación disponible.';for(const error of result.ok?[]:result.errors)body.append(el('small',error.message));coverage.textContent='No se han evaluado objetivos.';}
 else{
  const recommendation=report.recommendation;status.dataset.kind=recommendation.kind;
  status.textContent=recommendation.kind==='conditional'?'Preferencia condicional según tu composición':recommendation.kind==='tie'?'Sin distinción en los apartados actuales':recommendation.kind==='tradeoff'?'Hay efectos distintos; revisa sus ventajas':'Sin recomendación concluyente';
  const c=report.coverage;coverage.textContent=`${c.enumerated}${c.theoreticalCount===null?'':` de ${c.theoreticalCount}`} alternativas de uso · próxima elección${c.truncated?' · búsqueda limitada':''}`;
  if(recommendation.kind==='abstain'&&recommendation.reasons[0])panel.append(el('small',recommendation.reasons[0],'pack-choice-warning'));
  if(recommendation.kind==='conditional'){
   const preferred=report.options.filter(o=>recommendation.optionIds.includes(o.id));
   const names=preferred.slice(0,2).map(o=>o.entryId===null?'Omitir lo restante':consumableLabel(o.label)+(o.targetCardIds.length?` → ${o.targetCardIds.map(targetLabel).join(', ')}`:' · sin cartas objetivo'));
   panel.append(el('small',names.join(' / ')+(preferred.length>2?` y ${preferred.length-2} opciones más`:''),'arcana-preferred'));
  }
  for(const reason of recommendation.reasons)body.append(el('p',reason));
  for(const limitation of report.limitations)body.append(el('small',limitation));
  const skip=report.options.find(o=>o.entryId===null);
  if(skip){body.append(el('b','Omitir lo restante'));if(skip.composition?.globalDelta!==null&&skip.composition?.globalDelta!==undefined)body.append(el('small',`Cambio del índice: ${signed(skip.composition.globalDelta)}. El precio pagado no se recupera.`));for(const error of skip.errors)body.append(el('small',error.message));for(const change of skip.consequences?.counters??[]){if(change.before?.status==='known'&&change.after?.status==='known')body.append(el('small',`${change.catalogId} · ${change.key}: ${change.before.value} → ${change.after.value}`));}}
 }
 return {addEntry(entryId:string,target:HTMLElement,selectTargets:(ids:string[])=>void){
  if(!report)return;
  const options=report.options.filter(o=>o.entryId===entryId),ordered=report.order.flatMap(id=>{const option=byOptionId.get(id);return option?.entryId===entryId?[option]:[];});
  if(!ordered.length){target.append(el('small','No hay objetivos calculados para esta carta. Registra la mano real completa.','muted'));return;}
  const details=el('details','','pack-choice-reasons arcana-entry-comparison');details.dataset.arcanaEntryComparison=entryId;details.append(el('summary',`Comparar objetivos · ${options.length}`));
  details.append(el('small','El índice puede no distinguir efectos distintos. El orden dentro del mismo grupo no desempata.','muted'));
  const list=el('div','','arcana-target-list'),more=el('button','Ver más objetivos','secondary');more.type='button';let shown=5;
  const refresh=()=>{
   list.replaceChildren();
   for(const option of ordered.slice(0,shown)){
    const row=el('div','','arcana-target-option');row.dataset.arcanaCandidate=option.id;
    row.append(el('b',option.targetCardIds.length?option.targetCardIds.map(targetLabel).join(' + '):'Sin cartas objetivo'));
    if(option.projection.ok&&option.projection.value.moneyChange){const change=option.projection.value.moneyChange;row.append(el('small',`Dinero $${change.before} → $${change.after} (+$${change.income})`));}
    if(option.composition){
     const changed=option.composition.sections.filter(s=>s.delta!==null&&s.delta!==0);
     row.append(el('small',changed.length?changed.map(s=>`${s.label} ${signed(s.delta!)}`).join(' · '):'Sin diferencia en los apartados','muted'));
    }
    for(const change of option.cardChanges){
     if(change.before.enhancement!==change.after.enhancement&&change.before.enhancement!=='none')row.append(el('small',`Sustituye ${targetLabel(change.cardId)} por ${tarotCardLabel(change.after as Card)}.`,'pack-choice-warning'));
    }
    if(option.projection.ok){
     const button=el('button','Ver estos objetivos','secondary');button.type='button';button.dataset.arcanaTargets=option.id;button.dataset.entryId=entryId;button.dataset.targetCardIds=JSON.stringify(option.targetCardIds);
     button.onclick=()=>selectTargets([...option.targetCardIds]);if(option.targetCardIds.length)row.append(button);
    }else for(const error of option.errors)row.append(el('small',error.message,'error'));
    list.append(row);
   }
   more.hidden=shown>=ordered.length;more.textContent=`Ver más objetivos (${Math.min(shown,ordered.length)}/${ordered.length})`;
  };
  more.onclick=()=>{shown+=20;refresh();};refresh();details.append(list,more,el('small','Seleccionar objetivos solo prepara la vista previa. Confirma su uso únicamente si lo hiciste en Balatro.','muted'));target.append(details);
 }};
}
