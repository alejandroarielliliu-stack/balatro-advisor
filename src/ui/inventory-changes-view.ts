import type {ConfirmedRecord} from '../storage/confirmed-store.js';
import {inventoryCards,inventoryReference} from '../state/inventory-changes.js';
import type {InventoryChangeRequest,CardOperation,ConsumableOperation} from '../state/inventory-changes.js';
import {RANKS} from '../catalog/initial.js';
import {CONSUMABLE_KINDS} from '../catalog/generation-jokers.js';
import {consumableLabel as title} from './consumable-labels.js';
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',cl='')=>{const e=document.createElement(tag);e.textContent=text;e.className=cl;return e;};
const select=(id:string,label:string,choices:Record<string,string>,value:string)=>{const wrap=el('label'),input=el('select');input.id=id;wrap.htmlFor=id;for(const [v,name]of Object.entries(choices)){const option=el('option',name);option.value=v;input.append(option);}input.value=value;wrap.append(el('span',label),input);return {wrap,input};};
const choices=(values:readonly string[])=>Object.fromEntries(values.map(v=>[v,v]));
const checkbox=(id:string,label:string)=>{const wrap=el('label','','check'),input=el('input');input.type='checkbox';input.id=id;wrap.append(input,el('span',label));return {wrap,input};};
const number=(id:string,label:string,value:string)=>{const wrap=el('label'),input=el('input');input.id=id;input.type='number';input.step='1';input.value=value;wrap.append(el('span',label),input);return {wrap,input};};
interface Options {record:ConfirmedRecord|null;dirty:boolean;writable:boolean;open:(title:string,body:HTMLElement,accept:string,callback:()=>boolean)=>void;submit:(request:InventoryChangeRequest)=>boolean;error:(text:string)=>void}
/** Queue observed changes locally; submitting is the only operation that writes. */
export function renderInventoryChanges(host:HTMLElement,options:Options){
 host.replaceChildren();host.hidden=!options.record||options.record.state.phase==='finished';if(!options.record||host.hidden)return;
 host.className='inventory-changes-toolbar';const record=options.record;
 for(const target of ['deck','consumables']as const){
  const button=el('button',target==='deck'?'Cambios de cartas':'Mis consumibles','secondary');button.id=target==='deck'?'inventory-deck':'inventory-consumables';button.type='button';button.dataset.write='true';button.dataset.localDisabled=String(options.dirty);button.disabled=!options.writable||options.dirty;host.append(button);
  button.onclick=()=>{
   const source=inventoryReference(record,target),cards=source?inventoryCards(source):undefined;
   const context=source?.observed.jokerContext,items=context?.status==='known'&&context.value.consumables?.status==='known'?context.value.consumables.value:undefined;
   const body=el('div','','inventory-change-dialog'),editor=el('div','','inventory-change-fields'),queue=el('ol','','inventory-change-queue');
   const pending:(CardOperation|ConsumableOperation)[]=[];
   const ref=el('small',source?`Referencia: revisión ${source.revision} · ${target==='deck'?(cards?.length??'?')+' cartas':(items?.length??'?')+' consumibles'}.`:'Sin lista completa de referencia. No se reconstruye a partir de objetos aislados.');
   const isOld=source&&source.revision!==record.state.revision;
   if(isOld)ref.textContent+=' Esta copia anterior solo será válida si confirmas que el resto sigue igual.';
   body.append(ref,el('small',target==='deck'?'Registra las cartas tal como quedaron. Esto no ejecuta un Tarot.':'Registra lo que tienes ahora. Retirar una carta no calcula su uso, venta ni sus ingresos.'));
   const modes=target==='deck'?{update:'Modificar carta',add:'Añadir carta',remove:'Retirar carta'}:{add:'Añadir consumible',update:'Modificar edición o venta',remove:'Ya no está',confirm_empty:'Confirmo que no tengo consumibles'};
   const mode=select('inventory-mode','Cambio observado',modes,target==='deck'?'update':items?.length?'remove':'add');body.append(mode.wrap,editor);
   let read:()=>CardOperation|ConsumableOperation;
   const draw=()=>{
    editor.replaceChildren();const action=mode.input.value;
    if(target==='deck'){
     const list=cards??[],card=select('inventory-object','Carta',Object.fromEntries(list.map((c,i)=>[c.instanceId,`${i+1}. ${c.rank}${({S:'♠',H:'♥',D:'♦',C:'♣'}as const)[c.suit]} · ${c.enhancement} · ${c.instanceId}`])),list[0]?.instanceId??'');
     if(action!=='add')editor.append(card.wrap);
     const grid=el('div','','inventory-fields-grid');
     const rank=select('inventory-rank','Rango',choices(RANKS),'2'),suit=select('inventory-suit','Palo',{S:'♠ Picas',H:'♥ Corazones',D:'♦ Diamantes',C:'♣ Tréboles'},'S');
     const enhancement=select('inventory-enhancement','Mejora',{none:'Sin mejora',bonus:'Bonificación',mult:'Mult',wild:'Comodín',glass:'Cristal',steel:'Acero',stone:'Piedra',gold:'Oro',lucky:'Suerte'},'none');
     const edition=select('inventory-edition','Edición',choices(['base','foil','holographic','polychrome']),'base'),seal=select('inventory-seal','Sello',{none:'Sin sello',red:'Rojo',blue:'Azul',gold:'Dorado',purple:'Morado'},'none'),chips=number('inventory-chips','Fichas extra','0'),debuff=checkbox('inventory-debuff','Actualmente debilitada');
     grid.append(rank.wrap,suit.wrap,enhancement.wrap,edition.wrap,seal.wrap,chips.wrap,debuff.wrap);if(action!=='remove')editor.append(grid);
     const fill=()=>{const c=list.find(c=>c.instanceId===card.input.value);if(!c)return;rank.input.value=c.rank;suit.input.value=c.suit;enhancement.input.value=c.enhancement;edition.input.value=c.edition;seal.input.value=c.seal;chips.input.value=String(c.extraChips);debuff.input.checked=!!c.debuff;};card.input.onchange=fill;if(action!=='add')fill();
     read=()=>{if(action!=='add'&&!card.input.value)throw Error('No hay una carta de referencia que seleccionar.');if(action==='remove')return {type:'remove',instanceId:card.input.value};
      const n=Number(chips.input.value);if(!chips.input.value.trim()||!Number.isSafeInteger(n))throw Error('Fichas extra: introduce un entero observado.');
      const values={rank:rank.input.value as typeof RANKS[number],suit:suit.input.value as 'S'|'H'|'D'|'C',enhancement:enhancement.input.value,edition:edition.input.value,seal:seal.input.value,extraChips:n,debuff:debuff.input.checked};
      return action==='add'?{type:'add',card:{...values,instanceId:'card-'+crypto.randomUUID()}}:{type:'update',instanceId:card.input.value,changes:values};
     };
    }else{
     const list=items??[],item=select('inventory-object','Consumible',Object.fromEntries(list.map((c,i)=>[c.instanceId,`${i+1}. ${title(c.catalogId)} · ${c.edition}`])),list[0]?.instanceId??'');if(action==='remove'||action==='update')editor.append(item.wrap);
     const catalog=select('inventory-consumable','Carta',Object.fromEntries(Object.keys(CONSUMABLE_KINDS).filter(id=>id!=='c_locked').map(id=>[id,({tarot:'Tarot',planet:'Planeta',spectral:'Espectral'}as const)[CONSUMABLE_KINDS[id]!]+ ' · '+title(id)])),'c_fool');
     const edition=select('inventory-edition','Edición',{base:'Base',negative:'Negativa'},'base'),sell=number('inventory-sell','Valor de venta que ves ($)','');
     if(action==='add')editor.append(catalog.wrap);if(action==='add'||action==='update')editor.append(edition.wrap,sell.wrap);
     const fill=()=>{const c=list.find(c=>c.instanceId===item.input.value);if(c){edition.input.value=c.edition;sell.input.value=String(c.sellValue);}};item.input.onchange=fill;if(action==='update')fill();
     read=()=>{if(action==='confirm_empty')return {type:'confirm_empty'};if(action==='remove'){if(!item.input.value)throw Error('Selecciona el consumible que ya no está.');return {type:'remove',instanceId:item.input.value};}
      const n=Number(sell.input.value);if(!sell.input.value.trim()||!Number.isSafeInteger(n)||n<0)throw Error('Indica el valor de venta observado, sin estimarlo.');
      if(action==='update'){if(!item.input.value)throw Error('Selecciona el consumible.');return {type:'update',instanceId:item.input.value,changes:{edition:edition.input.value as 'base'|'negative',sellValue:n}};}
      return {type:'add',item:{instanceId:'consumable-'+crypto.randomUUID(),catalogId:catalog.input.value,kind:CONSUMABLE_KINDS[catalog.input.value]!,edition:edition.input.value as 'base'|'negative',sellValue:n}};
     };
    }
   };
   mode.input.onchange=draw;draw();
   const drawQueue=()=>{queue.replaceChildren();pending.forEach((op,index)=>{const li=el('li',`${index+1}. ${op.type==='add'?'Añadir '+('card'in op?op.card.rank+op.card.suit:title(op.item.catalogId)):op.type==='confirm_empty'?'Lista vacía':(op.type==='remove'?'Retirar ':'Modificar ')+op.instanceId} `),remove=el('button','Quitar de la lista','secondary');remove.type='button';remove.onclick=()=>{pending.splice(index,1);drawQueue();};li.append(remove);queue.append(li);});};
   const add=el('button','Añadir cambio a la lista','secondary');add.type='button';add.id='inventory-queue-add';add.onclick=()=>{try{pending.push(read());drawQueue();}catch(e){options.error(e instanceof Error?e.message:'Revisa el cambio.');}};
   body.append(add,queue);
   const unchanged=checkbox('inventory-unchanged','Confirmo que los demás objetos y datos conservados siguen igual'),discard=checkbox('inventory-discard-scenarios','Retirar escenarios guardados que ya no sirven (quedan en el historial)');body.append(unchanged.wrap);if(target==='deck')body.append(discard.wrap);
   options.open(target==='deck'?'Cambios observados del mazo':'Inventario observado de consumibles',body,'Registrar cambios',()=>{
    try{
     const common={expectedRevision:record.state.revision,confirmUnchangedOthers:unchanged.input.checked,discardSavedScenarios:discard.input.checked,...(source?{referenceRevision:source.revision}:{})};
     return options.submit(target==='deck'?{...common,target,operations:pending as CardOperation[]}:{...common,target,operations:pending as ConsumableOperation[]});
    }catch(e){options.error(e instanceof Error?e.message:'Revisa los cambios.');return false;}
   });
  };
 }
}
