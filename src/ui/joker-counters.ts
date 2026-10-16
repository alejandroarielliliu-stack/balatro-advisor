import {counterSpecs} from '../catalog/joker-counters.js';
import type {JokerInstance} from '../state/model.js';
/** Owned counters are observations, never the purchase defaults. */
export function mountCounterFields(host:HTMLElement,select:HTMLSelectElement,initial?:JokerInstance){
 const box=document.createElement('div');box.className='joker-counters';host.append(box);
 const fields=new Map<string,HTMLInputElement>();
 const render=(saved?:JokerInstance)=>{box.replaceChildren();fields.clear();for(const [key,spec] of Object.entries(counterSpecs(select.value))){
  const label=document.createElement('label'),input=document.createElement('input');label.textContent=spec.label;input.type='number';input.min=String(spec.min);if(spec.max!==undefined)input.max=String(spec.max);input.step='1';input.setAttribute('aria-label',spec.label);input.dataset.counter=key;
  const fact=saved?.counters[key];input.value=fact?.status==='known'?String(fact.value):'';input.placeholder='Desconocido';label.append(input);box.append(label);fields.set(key,input);
 }};
 select.addEventListener('change',()=>render());render(initial);
 return ()=>Object.fromEntries([...fields].map(([key,input])=>{
  if(!input.value.trim())return [key,{status:'unknown' as const,reason:'Contador todavía sin registrar.'}];
  const value=Number(input.value),spec=counterSpecs(select.value)[key]!;
  if(!Number.isSafeInteger(value)||value<spec.min||(spec.max!==undefined&&value>spec.max))throw new Error(spec.label+': valor fuera del rango admitido.');
  return [key,{status:'known' as const,source:'manual' as const,value}];
 }));
}
