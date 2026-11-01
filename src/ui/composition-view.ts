import type {CompositionReport,CompositionSection} from '../advisor/composition.js';
import {FIT_INDEX_POLICY} from '../advisor/fit-index.js';

const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',className='')=>{const node=document.createElement(tag);node.textContent=text;node.className=className;return node;};
type Score=Pick<CompositionSection,'value'|'range'|'status'|'reasons'>;
const number=(n:number)=>n.toFixed(1);
const label=(s:Score)=>s.value!==null?number(s.value):s.status==='not-applicable'?'—':s.range?s.range[1]===null?`≥${number(s.range[0])}`:`${number(s.range[0])}–${number(s.range[1])}`:'—';
const tone=(s:Score)=>s.value===null?'unknown':s.value>=FIT_INDEX_POLICY.positive?'positive':s.value<=FIT_INDEX_POLICY.negative?'negative':'neutral';

/** Read-only presentation. No inference, scoring formula, storage or action. */
export function mountComposition(host:HTMLElement){
 host.id='composition-overview';host.className='composition-panel';host.setAttribute('aria-labelledby','composition-title');
 const title=el('h2','Tu composición');title.id='composition-title';
 const content=el('div','','composition-content'),global=el('button','','composition-global');global.type='button';global.id='composition-score';
 const output=el('strong','—');output.setAttribute('aria-live','polite');global.append(output);
 const bars=el('div','','composition-bars'),dialog=el('dialog','','composition-dialog');dialog.id='composition-details';dialog.setAttribute('aria-labelledby','composition-detail-title');
 host.append(title,content,dialog);content.append(global,bars);
 const renderedBars=new Map<string,{button:HTMLButtonElement;name:HTMLSpanElement;value:HTMLElement;fill:HTMLSpanElement}>();
 let report:CompositionReport|null=null,topic='global',opener:HTMLButtonElement=global;
 const explain=()=>{
  dialog.replaceChildren();const heading=el('h2',topic==='global'?'Encaje global':report?.sections.find(s=>s.id===topic)?.label??'Composición');heading.id='composition-detail-title';dialog.append(heading);
  const selected=topic==='global'?report?.global:report?.sections.find(s=>s.id===topic);
  if(selected){dialog.append(el('strong',label(selected),'composition-detail-value'));for(const reason of selected.reasons)dialog.append(el('p',reason));}
  else dialog.append(el('p','Revisa los datos de la partida.'));
  // Evidence stays behind an intentional click; the table is only a score and bars.
  const findings=topic==='synergy'?report?.synergies:topic==='global'?[...(report?.weaknesses??[]),...(report?.priorities??[])]:[];
  if(findings?.length){const more=el('details');more.append(el('summary','Condiciones'));for(const f of findings){const row=el('div');row.append(el('b',f.title),el('p',f.detail));more.append(row);}dialog.append(more);}
  if(report?.vouchers.length){const more=el('details');more.append(el('summary','Vales'));for(const f of report.vouchers){more.append(el('b',f.title),el('p',f.detail));}dialog.append(more);}
  if(report?.limitations.length){const more=el('details');more.append(el('summary','Alcance'));for(const text of report.limitations)more.append(el('p',text));dialog.append(more);}
  const close=el('button','Cerrar','secondary');close.type='button';close.onclick=e=>{e.stopPropagation();dialog.close();opener.focus();};dialog.append(close);
 };
 const inspect=(event:MouseEvent,button:HTMLButtonElement,id:string)=>{event.stopPropagation();topic=id;opener=button;explain();dialog.showModal();};
 global.onclick=e=>inspect(e,global,'global');dialog.addEventListener('cancel',()=>{opener.focus();});
 const render=(next:CompositionReport)=>{
  report=next;output.textContent=label(next.global);global.dataset.score=next.global.value===null?'':String(next.global.value);global.dataset.status=next.global.status;global.dataset.format=next.global.value===null&&next.global.range?.[1]!==null?'range':'number';global.className='composition-global '+tone(next.global);global.setAttribute('aria-label',`Encaje global ${label(next.global)}. Ver cálculo`);
  // Keep the clicked controls stable when leaving a field refreshes the report.
  for(const [id,entry]of renderedBars)if(!next.sections.some(section=>section.id===id)){entry.button.remove();renderedBars.delete(id);}
  for(const section of next.sections){
   let entry=renderedBars.get(section.id);
   if(!entry){
    const button=el('button');button.type='button';button.dataset.section=section.id;
    const heading=el('span','','composition-bar-heading'),name=el('span'),value=el('strong');heading.append(name,value);
    const track=el('span','','composition-track'),fill=el('span','','composition-fill');track.append(fill);track.setAttribute('aria-hidden','true');
    button.append(heading,track);button.onclick=e=>inspect(e,button,section.id);bars.append(button);entry={button,name,value,fill};renderedBars.set(section.id,entry);
   }
   const {button,name,value,fill}=entry;button.className='composition-bar '+tone(section);button.dataset.status=section.status;button.dataset.score=section.value===null?'':String(section.value);
   name.textContent=section.label;value.textContent=label(section);
   const reference=section.value??section.range?.[0]??0;fill.style.width=`${Math.max(0,Math.min(100,reference))}%`;
   button.setAttribute('aria-label',`${section.label} ${label(section)}. Ver cálculo`);
  }
  if(dialog.open)explain();
 };
 const clear=()=>{report=null;output.textContent='—';global.className='composition-global unknown';global.dataset.score='';global.dataset.status='partial';bars.replaceChildren();renderedBars.clear();if(dialog.open)explain();};
 return {render,clear};
}
