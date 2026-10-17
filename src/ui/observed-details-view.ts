import type {GameState,Fact} from '../state/model.js';
import type {ObservedDetailOperation,ObservedDetailRequest} from '../state/observed-details.js';
import {observedHandBases} from '../state/observed-details.js';
import {observationCounterSpecs} from '../state/observations.js';
import {ALL_JOKER_FACTS} from '../catalog/all-joker-facts.js';
import type {HandId} from '../catalog/initial.js';
import {handNames} from './full-joker-data.js';
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',cl='')=>{const e=document.createElement(tag);e.textContent=text;e.className=cl;return e;};
const known=<T>(value:T)=>({status:'known' as const,source:'manual' as const,value});
const unknown=()=>({status:'unknown' as const,reason:'El usuario indicó que no conoce este valor actual.'});
const value=<T>(f:Fact<T>|undefined)=>f?.status==='known'?f.value:undefined;
function select(host:HTMLElement,id:string,label:string,values:Record<string,string>,selected?:string){const wrap=el('label'),input=el('select');input.id=id;wrap.append(el('span',label),input);for(const [id,text]of Object.entries(values))input.append(new Option(text,id));if(selected!==undefined)input.value=selected;host.append(wrap);return input;}
function check(host:HTMLElement,id:string,label:string){const wrap=el('label','','check'),input=el('input');input.id=id;input.type='checkbox';wrap.append(input,el('span',label));host.append(wrap);return input;}
function number(host:HTMLElement,id:string,label:string,n:number|undefined,min=0,max?:number){const wrap=el('label'),input=el('input');input.id=id;input.type='number';input.step='1';input.min=String(min);if(max!==undefined)input.max=String(max);input.value=n===undefined?'':String(n);input.placeholder='Sin registrar';wrap.append(el('span',label),input);host.append(wrap);return ()=>{const n=Number(input.value);if(!input.value.trim()||!Number.isSafeInteger(n)||n<min||max!==undefined&&n>max)throw Error(label+': introduce un entero dentro del rango indicado.');return n;};}
interface Options {state:GameState;dirty:boolean;writable:boolean;open:(title:string,body:HTMLElement,accept:string,callback:()=>boolean)=>void;submit:(request:ObservedDetailRequest)=>boolean;error:(message:string)=>void}
/** One narrow correction workflow, with a local list and explicit unknown values. */
export function appendObservedDetailsControl(host:HTMLElement,options:Options){
 const state=options.state;if(state.phase==='finished')return;
 const button=el('button','Comodines y manos','secondary');button.type='button';button.id='observed-details';button.dataset.write='true';button.dataset.localDisabled=String(options.dirty);button.disabled=options.dirty||!options.writable;host.append(button);
 button.onclick=()=>{
  const body=el('div','','inventory-change-dialog');body.append(el('small',`Revisión ${state.revision}. Transcribe los valores actuales. No se ejecutan ventas, consumibles ni jugadas.`));
  const target=select(body,'detail-target','Qué cambió',{joker:'Un comodín',hand:'Base de una mano',history:'Historial parcial'}),editor=el('div','','inventory-change-fields'),queue=el('ol','','inventory-change-queue');body.append(editor);
  const pending:ObservedDetailOperation[]=[];let read:()=>ObservedDetailOperation,description='';
  const draw=()=>{
   editor.replaceChildren();
   if(target.value==='joker'){
    const jokers=value(state.observed.jokers);
    if(!jokers?.length){editor.append(el('p',jokers?'No tienes comodines registrados.':'Primero confirma qué comodines tienes desde Mesa. No se recuperan identidades de un inventario antiguo.'));read=()=>{throw Error('No hay un comodín actual que editar.');};return;}
    const object=select(editor,'detail-joker','Comodín',Object.fromEntries(jokers.map((j,i)=>[j.instanceId,`${i+1}. ${ALL_JOKER_FACTS[j.catalogId]?.name??j.catalogId} · ${j.instanceId}`]))),fieldHost=el('div','','inventory-change-fields');editor.append(fieldHost);
    const drawJoker=()=>{
     fieldHost.replaceChildren();const j=jokers.find(j=>j.instanceId===object.value)!,specs=observationCounterSpecs(j);
     const field=select(fieldHost,'detail-field','Dato',{sale:'Valor de venta ($)',edition:'Edición',stickers:'Pegatinas',...Object.fromEntries(Object.entries(specs).map(([key,spec])=>['counter:'+key,spec.label]))}),values=el('div','','inventory-change-fields');fieldHost.append(values);
     const drawField=()=>{
      values.replaceChildren();const unknownInput=check(values,'detail-unknown','No conozco el valor actual'),name=ALL_JOKER_FACTS[j.catalogId]?.name??j.catalogId;description=name+' · '+field.selectedOptions[0]!.textContent;
      const f=field.value;
      if(f==='sale'||f.startsWith('counter:')){const key=f.slice(8),spec=specs[key],getter=number(values,'detail-number',f==='sale'?'Valor de venta ($)':spec!.label,value(f==='sale'?j.sellValue:j.counters[key]),f==='sale'?0:spec!.min,spec?.max);read=()=>f==='sale'?{kind:'joker_sell',instanceId:j.instanceId,value:unknownInput.checked?unknown():known(getter())}:{kind:'joker_counter',instanceId:j.instanceId,key,value:unknownInput.checked?unknown():known(getter())};}
      else if(f==='edition'){const input=select(values,'detail-edition','Edición',{'':'Selecciona la que ves',base:'Normal',foil:'Laminada',holographic:'Holográfica',polychrome:'Polícroma',negative:'Negativa'},value(j.edition)??'');read=()=>{if(!unknownInput.checked&&!input.value)throw Error('Selecciona la edición observada.');return {kind:'joker_edition',instanceId:j.instanceId,value:unknownInput.checked?unknown():known(input.value as 'base'|'foil'|'holographic'|'polychrome'|'negative')};};}
      else{const current=value(j.stickers),inputs=['eternal','perishable','rental'].map((key,i)=>{const input=check(values,'detail-sticker-'+key,['Eterno','Perecedero','Alquiler'][i]!);input.checked=current?.includes(key)??false;return {key,input};});values.append(el('small','Ninguna marcada declara que no tiene pegatinas. No calcula caducidad ni alquiler.'));read=()=>({kind:'joker_stickers',instanceId:j.instanceId,value:unknownInput.checked?unknown():known(inputs.filter(x=>x.input.checked).map(x=>x.key as 'eternal'|'perishable'|'rental'))});}
     };field.onchange=drawField;drawField();
    };object.onchange=drawJoker;drawJoker();
   }else if(target.value==='hand'){
    const hand=select(editor,'detail-hand','Mano',handNames),fields=el('div','','inventory-fields-grid');editor.append(fields);const drawHand=()=>{fields.replaceChildren();const f=observedHandBases(state)[hand.value as HandId],base=value(f);description=handNames[hand.value as HandId];const level=number(fields,'detail-level','Nivel observado',base?.level),chips=number(fields,'detail-chips','Fichas base observadas',base?.chips),mult=number(fields,'detail-mult','Mult base observado',base?.mult);const missing=check(fields,'detail-unknown','No conozco esta base');read=()=>({kind:'hand_base',handId:hand.value as HandId,value:missing.checked?unknown():known({level:level(),chips:chips(),mult:mult()})});};hand.onchange=drawHand;drawHand();editor.append(el('small','Copia los tres valores de la pantalla de manos. El nivel solo no determina la base; no se aplica ninguna fórmula.'));
   }else{
    const scope=select(editor,'detail-history','Contador',{run:'Veces jugada · partida',round:'Veces jugada · ronda actual',tarots:'Tarots usados · partida'}),fields=el('div','','inventory-change-fields');editor.append(fields);
    const drawHistory=()=>{fields.replaceChildren();const ctx=value(state.observed.jokerContext),hand=scope.value==='tarots'?null:select(fields,'detail-hand','Mano',handNames);const drawCount=()=>{fields.querySelector('[data-history-value]')?.remove();const cell=el('div','','inventory-change-fields');cell.dataset.historyValue='true';fields.append(cell);const scopeValue=scope.value as 'run'|'round'|'tarots',id=hand?.value as HandId;const current=scopeValue==='tarots'?ctx?.tarotsUsed:ctx?.[scopeValue==='run'?'handCounts':'roundHandCounts']?.[id];description=scope.selectedOptions[0]!.textContent+(hand?' · '+handNames[id]:'');const getter=number(cell,'detail-number','Total observado',value(current)),missing=check(cell,'detail-unknown','No conozco este contador');read=()=>scopeValue==='tarots'?{kind:'tarots_used',value:missing.checked?unknown():known(getter())}:{kind:'hand_history',scope:scopeValue,handId:id,value:missing.checked?unknown():known(getter())};};if(hand)hand.onchange=drawCount;drawCount();};scope.onchange=drawHistory;drawHistory();editor.append(el('small','Registra un total visible, no un incremento. Los demás contadores conservan su estado; desconocido no significa cero.'));
   }
  };target.onchange=draw;draw();
  const descriptions:string[]=[];const drawQueue=()=>{queue.replaceChildren();pending.forEach((op,i)=>{const text=op.value.status==='unknown'?'Desconocido':typeof op.value.value==='object'?JSON.stringify(op.value.value):String(op.value.value);const li=el('li',descriptions[i]+': '+text+' '),remove=el('button','Quitar','secondary');remove.type='button';remove.onclick=()=>{pending.splice(i,1);descriptions.splice(i,1);drawQueue();};li.append(remove);queue.append(li);});};
  const feedback=el('p','','error');feedback.id='detail-editor-error';feedback.setAttribute('role','alert');
  const add=el('button','Añadir dato a la lista','secondary');add.id='detail-queue-add';add.type='button';add.onclick=()=>{try{pending.push(read());descriptions.push(description);feedback.textContent='';drawQueue();}catch(e){feedback.textContent=e instanceof Error?e.message:'Revisa el dato.';options.error(feedback.textContent);}};body.append(add,feedback,queue);const confirm=check(body,'detail-unchanged','Confirmo que los demás datos conservados siguen igual');
  options.open('Datos observados',body,'Registrar datos',()=>options.submit({expectedRevision:state.revision,confirmUnchangedOthers:confirm.checked,operations:pending}));
 };
}
