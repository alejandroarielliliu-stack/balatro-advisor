import type {GameState} from '../state/model.js';
import {observationNeeds} from '../state/observations.js';
import type {ObservationAnswer} from '../state/observations.js';
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',cl='')=>{const n=document.createElement(tag);n.textContent=text;n.className=cl;return n;};
export function renderObservationRequests(host:HTMLElement,state:GameState|null,options:{writable:boolean;dirty:boolean;submit:(answers:ObservationAnswer[])=>boolean;error:(message:string)=>void}){
 host.replaceChildren();host.hidden=true;if(!state)return;
 const listed=observationNeeds(state);if(!listed.ok||!listed.value.length)return;host.hidden=false;host.className='observation-panel';
 const details=el('details'),summary=el('summary',`Datos pendientes · ${listed.value.length}`);details.append(summary);
 const form=el('form');form.noValidate=true;const grid=el('div','','observation-grid');
 const inputs=listed.value.map(need=>{const cell=el('div'),label=el('label'),input=el('input');label.append(el('span',need.label));input.type='number';input.step='1';input.min=String(need.min);if(need.max!==undefined)input.max=String(need.max);input.placeholder='Sin registrar';input.dataset.needId=need.id;input.setAttribute('aria-label',need.label);label.append(input);const why=el('details');why.append(el('summary','Para: '+need.affects.join(', ')),el('small',need.reason));cell.append(label,why);grid.append(cell);return {need,input};});
 form.append(grid);const submit=el('button','Registrar valores observados');submit.type='submit';submit.dataset.write='true';submit.dataset.localDisabled=String(options.dirty);submit.disabled=!options.writable||options.dirty;
 form.append(el('small','Introduce solo los valores que ves en el juego. Los campos vacíos permanecen pendientes.'),submit);
 form.onsubmit=e=>{e.preventDefault();const answers:ObservationAnswer[]=[];
  for(const {need,input}of inputs){if(!input.value.trim())continue;const n=Number(input.value);if(!Number.isSafeInteger(n)||n<need.min||need.max!==undefined&&n>need.max){options.error(need.label+': valor fuera del rango admitido.');input.focus();return;}answers.push({needId:need.id,value:n});}
  if(!answers.length){options.error('Introduce al menos un valor observado.');return;}options.submit(answers);
 };
 details.append(form);host.append(details);
}
