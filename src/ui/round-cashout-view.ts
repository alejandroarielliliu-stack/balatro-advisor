import type {Fact,GameState,JokerInstance} from '../state/model.js';
import {observationCounterSpecs} from '../state/observations.js';
import {ALL_JOKER_FACTS} from '../catalog/all-joker-facts.js';
import {bossDefinition} from '../catalog/bosses.js';
import {blindArt} from './blind-art.js';
import {engineArt,jokerArt} from './collection.js';

const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',className='')=>{const e=document.createElement(tag);e.textContent=text;e.className=className;return e;};
const value=<T>(fact:Fact<T>|undefined)=>fact?.status==='known'?fact.value:undefined;
const known=(value:number):Fact<number>=>({status:'known',source:'manual',value});
const unobserved=():Fact<number>=>({status:'unknown',reason:'No se transcribió el valor al terminar la ronda.'});

export interface RoundCashoutSubmission {
 amount:number;
 money:number;
 jokerUpdates:Array<{instanceId:string;counters:Record<string,Fact<number>>;sellValue?:Fact<number>;removed?:boolean}>;
}
interface CashoutOptions {
 submit(submission:RoundCashoutSubmission,binding:Pick<GameState,'runId'|'revision'>):string|null;
 lost():void;
}

/** Observed end-of-round facts only. Typing and rendering never advance the run. */
export function mountRoundCashout(host:HTMLElement,options:CashoutOptions){
 const section=el('section','','round-cashout');section.id='round-cashout';section.hidden=true;section.setAttribute('aria-label','Cobro de la ronda');
 const form=el('form','','round-cashout-form');form.noValidate=true;
 const header=el('div','','round-cashout-header'),submit=el('button','Cash Out:','round-cashout-submit');submit.id='round-cashout-submit';submit.type='submit';submit.setAttribute('aria-label','Registrar cobro y continuar');
 const amountLabel=el('label','','round-cashout-amount-label');amountLabel.append(el('span','$'));
 const amount=el('input','','round-cashout-amount');amount.id='round-cashout-amount';amount.type='number';amount.inputMode='numeric';amount.min='0';amount.step='1';amount.required=true;amount.placeholder='—';amount.setAttribute('aria-label','Cuánto ganaste en este cobro ($)');amount.title='Transcribe el total de Cash Out que muestra Balatro.';amountLabel.append(amount);header.append(submit,amountLabel);
 const summary=el('div','','round-cashout-blind');summary.id='round-cashout-blind';
 const balance=el('label','Saldo al cobrar','round-cashout-balance'),money=el('input');money.id='round-cashout-money';money.type='number';money.inputMode='numeric';money.step='1';money.required=true;money.placeholder='$—';money.setAttribute('aria-label','Saldo total después de cobrar ($)');money.title='Dinero total que muestra Balatro después del cobro; incluye el dinero que ya tenías.';balance.append(money);
 const body=el('div','','round-cashout-changes');body.id='round-cashout-jokers';
 const footer=el('div','','round-cashout-footer'),error=el('p','','round-cashout-error'),sync=el('button','Actualizar datos','round-cashout-lost'),lost=el('button','Perdí la ronda','round-cashout-lost');error.id='round-cashout-error';error.setAttribute('role','alert');sync.id='round-cashout-reload';sync.type='button';sync.hidden=true;sync.title='Descartar este borrador y cargar los datos actuales.';lost.id='round-cashout-lost';lost.type='button';lost.onclick=options.lost;footer.append(error,sync,lost);
 form.append(header,summary,balance,body,footer);section.append(form);host.append(section);
 let binding:Pick<GameState,'runId'|'revision'>|null=null,rendered='',canSubmit=false,latestState:GameState|null=null,latestWritable=false;
 sync.onclick=()=>{if(!latestState)return;rendered='';binding=null;refresh(latestState,latestWritable);amount.focus({preventScroll:true});};
 let readers:Array<()=>RoundCashoutSubmission['jokerUpdates'][number]>=[];
 const parse=(input:HTMLInputElement,label:string,min=Number.MIN_SAFE_INTEGER,max=Number.MAX_SAFE_INTEGER)=>{
  if(!input.value.trim()){input.focus();throw Error('Introduce '+label+'.');}
  const n=Number(input.value);if(!Number.isSafeInteger(n)||n<min||n>max){input.focus();throw Error(label+': introduce un número entero dentro del rango admitido.');}return n;
 };
 form.onsubmit=event=>{
  event.preventDefault();if(!binding||!canSubmit)return;
  error.textContent='';try{
   const submission={amount:parse(amount,'cuánto ganaste en el cobro',0),money:parse(money,'el saldo total después de cobrar'),jokerUpdates:readers.map(read=>read())};
   const problem=options.submit(submission,{...binding});if(problem)error.textContent=problem;
  }catch(problem){error.textContent=problem instanceof Error?problem.message:'Revisa los valores del cobro.';}
 };
 const counterInput=(labelText:string,fact:Fact<number>|undefined,min:number,max?:number)=>{
  const label=el('label',labelText),input=el('input');input.type='number';input.inputMode='numeric';input.step='1';input.min=String(min);if(max!==undefined)input.max=String(max);input.setAttribute('aria-label',labelText);const previous=value(fact);input.placeholder=previous===undefined?'Desconocido':'Antes: '+previous;label.append(input);
  return {label,input,read:():Fact<number>=>input.value.trim()?known(parse(input,labelText,min,max)):unobserved()};
 };
 const jokerEditor=(joker:JokerInstance,index:number,gift:boolean)=>{
  const specs=observationCounterSpecs(joker),sale=gift||joker.catalogId==='egg';if(!Object.keys(specs).length&&!sale)return;
  const row=el('fieldset','','round-cashout-joker');row.dataset.cashoutJoker=joker.instanceId;row.dataset.instanceId=joker.instanceId;row.dataset.catalogId=joker.catalogId;
  const name=ALL_JOKER_FACTS[joker.catalogId]?.name??joker.catalogId,legend=el('legend',`${name} · ${index+1}`),portrait=el('span','','round-cashout-joker-art');portrait.append(jokerArt(engineArt[joker.catalogId]??'j_joker',name));row.append(legend,portrait);
  const fields=el('div','','round-cashout-joker-fields'),inputs:HTMLInputElement[]=[],counterReaders:Array<readonly [string,()=>Fact<number>]> = [];
  for(const [key,spec]of Object.entries(specs)){
   const field=counterInput(spec.label,joker.counters[key],spec.min,spec.max);field.input.dataset.counter=key;field.input.dataset.instanceId=joker.instanceId;inputs.push(field.input);fields.append(field.label);counterReaders.push([key,field.read]);
  }
  const sell=sale?counterInput('Valor de venta ($)',joker.sellValue,0):undefined;if(sell){sell.input.dataset.sellValue=joker.instanceId;inputs.push(sell.input);fields.append(sell.label);}
  const removedLabel=el('label','','round-cashout-removed'),removed=el('input');removed.type='checkbox';removed.dataset.removedInstance=joker.instanceId;removed.setAttribute('aria-label','Ya no tengo '+name+' · '+(index+1));removedLabel.append(removed,el('span','Ya no lo tengo'));removed.onchange=()=>{inputs.forEach(input=>input.disabled=removed.checked||!canSubmit);row.dataset.removed=String(removed.checked);};fields.append(removedLabel);row.append(fields);body.append(row);
  readers.push(()=>removed.checked?{instanceId:joker.instanceId,counters:{},removed:true}:{instanceId:joker.instanceId,counters:Object.fromEntries(counterReaders.map(([key,read])=>[key,read()])),...(sell?{sellValue:sell.read()}: {})});
 };
 function refresh(state:GameState,writable:boolean){
  latestState=state;latestWritable=writable;canSubmit=writable&&(state.phase==='in_round'||state.phase==='cashout');submit.disabled=!canSubmit;lost.disabled=!canSubmit||state.phase!=='in_round';amount.disabled=!canSubmit;money.disabled=!canSubmit;
  const hasDraft=!!amount.value.trim()||!!money.value.trim()||Array.from(body.querySelectorAll<HTMLInputElement>('input')).some(input=>input.type==='checkbox'?input.checked:!!input.value.trim());
  if(binding?.runId===state.runId&&binding.revision!==state.revision&&hasDraft&&(state.phase==='in_round'||state.phase==='cashout')){
   error.textContent='La partida cambió. Conservamos tu borrador; actualiza los datos antes de cobrar.';sync.hidden=false;submit.disabled=true;body.querySelectorAll<HTMLInputElement>('input').forEach(input=>input.disabled=!canSubmit||(input.type!=='checkbox'&&input.closest<HTMLElement>('.round-cashout-joker')?.dataset.removed==='true'));return;
  }
  const token=JSON.stringify(state);if(token===rendered){body.querySelectorAll<HTMLInputElement>('input').forEach(input=>input.disabled=!canSubmit||(input.type!=='checkbox'&&input.closest<HTMLElement>('.round-cashout-joker')?.dataset.removed==='true'));return;}
  rendered=token;binding={runId:state.runId,revision:state.revision};error.textContent='';sync.hidden=true;amount.value='';money.value='';readers=[];summary.replaceChildren();body.replaceChildren();
  const current=value(state.observed.nextBlind),boss=current?.kind==='boss'?bossDefinition(value(current.bossId)??''):undefined,name=current?.kind==='small'?'Ciega pequeña':current?.kind==='big'?'Ciega grande':boss?.name??'Ciega jefe';
  if(current){summary.append(blindArt(boss?.artId??(current.kind==='boss'?value(current.bossId)??'unknown':current.kind),name));}
  const target=el('div','','round-cashout-target');target.append(el('span','Puntúa al menos'),el('strong',current?.target.status==='known'?current.target.value.toLocaleString('es'):'—'));
  const reward=value(current?.reward);summary.append(target,el('span',reward===undefined?'$—':'$'.repeat(Math.min(reward,8)),'round-cashout-reward'));summary.title=name+(reward===undefined?'':` · premio base $${reward}`);
  const owned=value(state.observed.jokers),gift=owned?.some(j=>j.catalogId==='gift')??false;
  for(const [index,joker]of (owned??[]).entries())jokerEditor(joker,index,gift);
  if(readers.length){const note=el('p','Valores al terminar la ronda. Vacío = desconocido.','round-cashout-changes-note');body.prepend(note);}
  body.dataset.empty=String(!readers.length);body.querySelectorAll<HTMLInputElement>('input').forEach(input=>input.disabled=!canSubmit);
 }
 return {refresh,focus:()=>amount.focus({preventScroll:true})};
}
