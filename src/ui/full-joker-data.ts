import {CONSUMABLE_KINDS} from '../catalog/generation-jokers.js';
import {HAND_BASES} from '../catalog/initial.js';
import type {HandId} from '../catalog/initial.js';
import type {Fact,GameState} from '../state/model.js';
import type {Consumable,FullJokerContext} from '../rules/full-joker-contract.js';
const node=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',className='')=>{const e=document.createElement(tag);e.textContent=text;e.className=className;return e;};
const known=<T>(value:T):Fact<T>=>({status:'known',value,source:'manual'});
const unknown=(label:string)=>({status:'unknown' as const,reason:label+' todavía sin registrar.'});
const handNames:Record<HandId,string>={high_card:'Carta alta',pair:'Pareja',two_pair:'Doble pareja',three_kind:'Trío',straight:'Escalera',flush:'Color',full_house:'Full',four_kind:'Póquer',straight_flush:'Escalera de color',five_kind:'Cinco iguales',flush_house:'Full de color',flush_five:'Cinco iguales de color'};
const HANDS=Object.keys(HAND_BASES) as HandId[];
function factValue<T>(fact:Fact<T>|undefined){return fact?.status==='known'?fact.value:undefined;}
function number(input:HTMLInputElement,label:string){const n=Number(input.value);if(!Number.isSafeInteger(n)||n<0)throw new Error(label+': escribe un entero no negativo o déjalo vacío si es desconocido.');return n;}
function labelInput(label:string,type='number'){const host=node('label',label),input=node('input');input.type=type;input.setAttribute('aria-label',label);if(type==='number'){input.min='0';input.step='1';input.placeholder='Desconocido';}host.append(input);return {host,input};}
function subdetails(host:HTMLElement,title:string){const d=node('details');d.append(node('summary',title));host.append(d);return d;}
const consumableName=(id:string)=>id.replace(/^c_/,'').replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());

/** Manual facts only. Untouched imports preserve unknown reasons and source metadata. */
export function mountFullJokerData(host:HTMLElement,initial:GameState['observed']['jokerContext']|undefined,changed:()=>void){
 const original=initial?structuredClone(initial):undefined,ctx:FullJokerContext=initial?.status==='known'?structuredClone(initial.value):{};
 let touched=false;const notify=()=>{touched=true;changed();};
 const panel=node('details','','full-joker-data');panel.dataset.fullJokerData='true';panel.append(node('summary','Datos de tus comodines'));host.append(panel);
 const controls=node('div','','grid'),numbers=new Map<string,{input:HTMLInputElement;dirty:boolean;label:string}>();panel.append(controls);
 const defs=[['tarotsUsed','Tarots usados'],['startingDeckSize','Cartas al iniciar la partida'],['blindsSkipped','Ciegas saltadas'],['consumableSlots','Espacios de consumibles'],['rerollCost','Próximo reroll pagado ($)'],['freeRerolls','Rerolls gratis restantes']] as const;
 for(const [key,label] of defs){const f=labelInput(label),value=factValue(ctx[key]);f.input.dataset.context=key;f.input.value=value===undefined?'':String(value);const entry={input:f.input,dirty:false,label};f.input.addEventListener('input',()=>{entry.dirty=true;notify();});numbers.set(key,entry);controls.append(f.host);}
 const histories=new Map<'handCounts'|'roundHandCounts',Map<HandId,{input:HTMLInputElement;dirty:boolean}>>();
 for(const [key,title,suffix] of [['handCounts','Manos jugadas · partida','veces en la partida'],['roundHandCounts','Manos jugadas · ronda','veces en esta ronda']] as const){
  const detail=subdetails(panel,title),grid=node('div','','grid'),fields=new Map<HandId,{input:HTMLInputElement;dirty:boolean}>();detail.append(grid);
  for(const id of HANDS){const f=labelInput(handNames[id]+' · '+suffix);f.input.dataset.context=key+'.'+id;const value=factValue(ctx[key]?.[id]);f.input.value=value===undefined?'':String(value);const entry={input:f.input,dirty:false};f.input.addEventListener('input',()=>{entry.dirty=true;notify();});fields.set(id,entry);grid.append(f.host);}
  histories.set(key,fields);
 }
 const lists=new Map<'planetsUsed'|'tags',{input:HTMLInputElement;dirty:boolean;label:string}>();
 const listBox=subdetails(panel,'Planetas usados y tags'),listGrid=node('div','','grid');listBox.append(listGrid);
 for(const [key,label,placeholder] of [['planetsUsed','Planetas distintos usados','c_mercury, c_mars'],['tags','Tags pendientes','tag_double']] as const){const f=labelInput(label,'text'),values=factValue(ctx[key]);f.input.value=values?.join(', ')??'';f.input.placeholder=placeholder;f.input.dataset.context=key;const entry={input:f.input,dirty:false,label};f.input.addEventListener('input',()=>{entry.dirty=true;notify();});lists.set(key,entry);listGrid.append(f.host);}
 // An explicit checkbox distinguishes a known empty list from no observation.
 const knownLists=new Map<'planetsUsed'|'tags',HTMLInputElement>();
 for(const [key,title] of [['planetsUsed','Conozco los planetas usados'],['tags','Conozco los tags pendientes']] as const){const label=node('label',title,'check'),check=node('input');check.type='checkbox';check.checked=ctx[key]?.status==='known';check.dataset.context=key+'Known';label.prepend(check);listGrid.append(label);knownLists.set(key,check);check.addEventListener('change',()=>{lists.get(key)!.dirty=true;notify();});}
 const visibleBox=subdetails(panel,'Manos visibles'),visibleKnownLabel=node('label','Conozco las manos visibles','check'),visibleKnown=node('input');visibleKnown.type='checkbox';visibleKnown.checked=ctx.visibleHands?.status==='known';visibleKnownLabel.prepend(visibleKnown);visibleBox.append(visibleKnownLabel);
 let visibleDirty=false;const visibleGrid=node('div','','grid'),visibleInputs=new Map<HandId,HTMLInputElement>(),savedVisible=factValue(ctx.visibleHands);visibleBox.append(visibleGrid);
 for(const id of HANDS){const label=node('label',handNames[id],'check'),check=node('input');check.type='checkbox';check.checked=savedVisible?savedVisible.includes(id):HANDS.indexOf(id)<9;check.disabled=!visibleKnown.checked;check.setAttribute('aria-label',handNames[id]+' visible');label.prepend(check);visibleGrid.append(label);visibleInputs.set(id,check);check.addEventListener('change',()=>{visibleDirty=true;notify();});}
 visibleKnown.addEventListener('change',()=>{visibleDirty=true;for(const c of visibleInputs.values())c.disabled=!visibleKnown.checked;notify();});
 const inventoryBox=subdetails(panel,'Consumibles'),knownInventoryLabel=node('label','Conozco mis consumibles','check'),knownInventory=node('input');knownInventory.type='checkbox';knownInventory.checked=ctx.consumables?.status==='known';knownInventoryLabel.prepend(knownInventory);inventoryBox.append(knownInventoryLabel);
 const rows=node('div'),add=node('button','Añadir consumible','secondary');add.type='button';add.disabled=!knownInventory.checked;inventoryBox.append(rows,add);let inventoryDirty=false;
 type Row={host:HTMLElement;instanceId:string;catalog:HTMLSelectElement;edition:HTMLSelectElement;sell:HTMLInputElement};const readers:Row[]=[];
 const row=(item?:Consumable)=>{
  const box=node('div','','row'),grid=node('div','','grid'),catalogLabel=node('label','Consumible'),catalog=node('select');catalog.setAttribute('aria-label','Consumible');catalog.append(new Option('Selecciona un consumible',''));
  for(const kind of ['tarot','planet','spectral'] as const){const group=node('optgroup');group.label=kind==='tarot'?'Tarot':kind==='planet'?'Planetas':'Espectrales';for(const [id,type] of Object.entries(CONSUMABLE_KINDS))if(type===kind)group.append(new Option(consumableName(id),id));catalog.append(group);}catalog.value=item?.catalogId??'';catalogLabel.append(catalog);
  const editionLabel=node('label','Edición'),edition=node('select');edition.setAttribute('aria-label','Edición de consumible');edition.append(new Option('Normal','base'),new Option('Negativa','negative'));edition.value=item?.edition??'base';editionLabel.append(edition);
  const sell=labelInput('Venta de consumible ($)');sell.input.value=item?String(item.sellValue):'';const remove=node('button','Quitar','secondary');remove.type='button';grid.append(catalogLabel,editionLabel,sell.host);box.append(grid,remove);rows.append(box);
  const data={host:box,instanceId:item?.instanceId??crypto.randomUUID(),catalog,edition,sell:sell.input};readers.push(data);
  for(const e of [catalog,edition,sell.input]){e.disabled=!knownInventory.checked;e.addEventListener('input',()=>{inventoryDirty=true;notify();});}
  remove.disabled=!knownInventory.checked;remove.onclick=()=>{readers.splice(readers.indexOf(data),1);box.remove();inventoryDirty=true;notify();};
 };
 for(const c of factValue(ctx.consumables)??[])row(c);
 add.onclick=()=>{row();inventoryDirty=true;notify();};knownInventory.addEventListener('change',()=>{inventoryDirty=true;add.disabled=!knownInventory.checked;for(const r of readers){r.catalog.disabled=r.edition.disabled=r.sell.disabled=!knownInventory.checked;for(const b of r.host.querySelectorAll('button'))b.disabled=!knownInventory.checked;}notify();});
 const read=():GameState['observed']['jokerContext']|undefined=>{
  if(!touched)return original?structuredClone(original):undefined;
  const result:FullJokerContext=structuredClone(ctx);
  for(const [key,e] of numbers)if(e.dirty){const fact=e.input.value.trim()?known(number(e.input,e.label)):unknown(e.label);Object.assign(result,{[key]:fact});}
  for(const [key,fields] of histories){if(![...fields.values()].some(f=>f.dirty))continue;const values=structuredClone(result[key]??{});for(const [id,e] of fields)if(e.dirty)values[id]=e.input.value.trim()?known(number(e.input,handNames[id])):unknown(handNames[id]);result[key]=values;}
  for(const [key,e] of lists)if(e.dirty){if(!knownLists.get(key)!.checked)result[key]=unknown(e.label);else {const values=e.input.value.split(/[\s,;]+/).map(s=>s.trim()).filter(Boolean);if(new Set(values).size!==values.length)throw new Error(e.label+': hay IDs repetidos.');if(key==='planetsUsed'&&values.some(id=>CONSUMABLE_KINDS[id]!=='planet'))throw new Error('Planetas usados: utiliza IDs como c_mercury o c_mars.');result[key]=known(values);}}
  if(visibleDirty)result.visibleHands=visibleKnown.checked?known([...visibleInputs].filter(([,c])=>c.checked).map(([id])=>id)):unknown('Manos visibles');
  if(inventoryDirty){if(!knownInventory.checked)result.consumables=unknown('Consumibles');else result.consumables=known(readers.map((r,index)=>{if(!r.catalog.value||!CONSUMABLE_KINDS[r.catalog.value])throw new Error('Consumible '+(index+1)+': selecciona una carta.');if(!r.sell.value.trim())throw new Error('Consumible '+(index+1)+': falta su valor de venta.');return {instanceId:r.instanceId,catalogId:r.catalog.value,kind:CONSUMABLE_KINDS[r.catalog.value]!,edition:r.edition.value as 'base'|'negative',sellValue:number(r.sell,'Venta de consumible')};}));}
  return known(result);
 };
 return {read};
}
