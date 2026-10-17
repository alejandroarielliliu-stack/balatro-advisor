import type {Fact,GameState,JokerInstance} from '../state/model.js';
import type {PackAction,PackEntry} from '../state/pack-contract.js';
import {applyPackAction} from '../rules/pack-shop.js';
import {freshJokerInstance} from '../rules/shop.js';
import {PLANET_HANDS} from '../rules/planet.js';
import {observedHandBases} from '../state/observed-details.js';
import {consumableLabel} from './consumable-labels.js';
import {BOOSTER_CATALOG} from '../catalog/booster-catalog.js';
import {ALL_JOKER_FACTS} from '../catalog/all-joker-facts.js';
import {counterSpecs} from '../catalog/joker-counters.js';
import {immediateConsequences} from '../advisor/consequences.js';
import {renderImmediateConsequences} from './consequences-view.js';
import {jokerArt} from './collection.js';

const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',cls='')=>{const e=document.createElement(tag);e.textContent=text;e.className=cls;return e;};
const known=<T>(value:T):Fact<T>=>({status:'known',source:'manual',value});
const value=<T>(f:Fact<T>|undefined)=>f?.status==='known'?f.value:undefined;
const hands:Record<string,string>={high_card:'Carta alta',pair:'Pareja',two_pair:'Doble pareja',three_kind:'Trío',straight:'Escalera',flush:'Color',full_house:'Full',four_kind:'Póquer',straight_flush:'Escalera de color',five_kind:'Cinco iguales',flush_house:'Flush House',flush_five:'Flush Five'};
const planets:Record<string,string>=Object.fromEntries([...Object.keys(PLANET_HANDS),'c_black_hole'].map(id=>[id,consumableLabel(id)+(id==='c_black_hole'?' · uso pendiente':'')]));
export const packEntryLabel=(entry:PackEntry)=>entry.kind==='joker'?ALL_JOKER_FACTS[entry.joker.catalogId]?.name??entry.joker.catalogId:consumableLabel(entry.catalogId);
/** Render H2's supplied before/after facts; no scoring or level formula here. */
export function renderPackOutcome(before:GameState,after:GameState){
 const changes=immediateConsequences(before,after),host=renderImmediateConsequences(changes),old=observedHandBases(before),current=observedHandBases(after);
 for(const key of Object.keys(current) as (keyof typeof current)[]){const b=value(old[key]),a=value(current[key]);if(b&&a&&(b.level!==a.level||b.chips!==a.chips||b.mult!==a.mult))host.append(el('small',`${hands[key]??key} · nivel ${b.level} → ${a.level} · ${b.chips} × ${b.mult} → ${a.chips} × ${a.mult}`));}
 for(const c of changes.counters){const b=value(c.before??undefined),a=value(c.after??undefined);if(b===undefined||a===undefined)continue;host.append(el('small',`${ALL_JOKER_FACTS[c.catalogId]?.name??c.catalogId} · ${c.key==='x100'?`×${b/100} → ×${a/100}`:`${counterSpecs(c.catalogId)[c.key]?.label??c.key}: ${b} → ${a}`}`));}
 return host;
}
const select=(choices:[string,string][],selected='')=>{const s=el('select');for(const [id,name]of choices){const o=el('option',name);o.value=id;s.append(o);}s.value=selected;return s;};
export interface PackViewOptions {state:GameState|null;writable:boolean;dirty:boolean;confirm:(action:PackAction)=>string|null;controlsChanged:()=>void}

/** Observed choices only. Every preview is detached; real actions go through T09b. */
export function renderPackView(host:HTMLElement,options:PackViewOptions){
 host.replaceChildren();host.hidden=true;host.className='pack-panel';
 const state=options.state;if(state?.schemaVersion!=='0.2'||state.phase!=='open_pack')return;
 host.hidden=false;const ctx=state.phaseData.context;
 if(!ctx){host.append(el('h2','Sobre abierto'),el('p','Esta copia no tiene el contexto del sobre. Conserva la copia o deshaz el último registro; no se reconstruye su contenido.','notice'));return;}
 const definition=BOOSTER_CATALOG.find(p=>p.id===ctx.catalogId),family=definition?.family;
 const header=el('div','','section-title'),title=el('div');title.append(el('h2',definition?.name??ctx.catalogId),el('small',`${ctx.remainingChoices} ${ctx.remainingChoices===1?'elección restante':'elecciones restantes'} · pagado $${ctx.paid}`));
 const art=el('span','','booster-art pack-'+ctx.catalogId);art.setAttribute('aria-label',definition?.name??ctx.catalogId);header.append(title,art);host.append(header);
 const error=el('p','','error');error.id='pack-error';error.setAttribute('role','status');host.append(error);
 const request=(action:PackAction)=>{const problem=options.confirm(action);if(problem)error.textContent=problem;};
 const write=(b:HTMLButtonElement,disabled=false)=>{b.type='button';b.dataset.write='';b.dataset.localDisabled=String(disabled||options.dirty);b.disabled=disabled||options.dirty||!options.writable;return b;};
 const probe=(action:PackAction)=>applyPackAction(state,action,{expectedRevision:state.revision,updatedAt:state.updatedAt});
 const skipResult=probe({type:'skip_open_pack'}),skip=write(el('button','Omití lo restante','secondary'),!skipResult.ok);skip.id='pack-skip';skip.onclick=()=>request({type:'skip_open_pack'});
 const toolbar=el('div','','toolbar');toolbar.append(skip);if(!skipResult.ok)host.append(el('small',skipResult.errors.map(e=>e.message).join(' '),'error'));
 const form=el('form');form.id='pack-content-form';form.noValidate=true;form.hidden=ctx.contents.status==='known';
 const contents=value(ctx.contents)??[];
 const buildForm=()=>{
  form.replaceChildren(el('h3','Cartas que ves'));
  const grid=el('div','','pack-observation-grid'),readers:(()=>PackEntry)[]=[];
  for(let index=0;index<(definition?.offered??0);index++){
   const old=contents[index],entryId=old?.entryId??crypto.randomUUID(),row=el('div','','pack-observation-card');row.append(el('b','Carta '+(index+1)));
   if(family==='buffoon'){
    const oldJoker=old?.kind==='joker'?old.joker:undefined,instanceId=oldJoker?.instanceId??crypto.randomUUID();
    const search=el('input');search.type='search';search.placeholder='Buscar comodín';search.setAttribute('aria-label','Buscar comodín '+(index+1));
    const choices:[string,string][]=[['','Seleccionar comodín'],...Object.entries(ALL_JOKER_FACTS).map(([id,j]):[string,string]=>[id,j.name])];
    const choice=select(choices,oldJoker?.catalogId??'');choice.dataset.packJokerIndex=String(index);choice.setAttribute('aria-label','Comodín '+(index+1));
    const edition=select([['base','Base'],['foil','Laminado'],['holographic','Holográfico'],['polychrome','Policromo'],['negative','Negativo']],value(oldJoker?.edition)??'base');edition.dataset.packEditionIndex=String(index);edition.setAttribute('aria-label','Edición '+(index+1));
    const preview=el('div','','pack-option-art'),details=el('details'),fields=el('div','','pack-counter-fields');details.append(el('summary','Valores observados'),fields);
    let current:JokerInstance|undefined,readFields:(()=>JokerInstance)|undefined;
    const refresh=()=>{
     preview.replaceChildren();fields.replaceChildren();readFields=undefined;current=undefined;if(!choice.value)return;
     const j=oldJoker?.catalogId===choice.value&&value(oldJoker.edition)===edition.value?structuredClone(oldJoker):freshJokerInstance(choice.value,instanceId,edition.value);current=j;
     preview.append(jokerArt(ALL_JOKER_FACTS[choice.value]!.artId,ALL_JOKER_FACTS[choice.value]!.name));
     const sale=el('input');sale.type='number';sale.min='0';sale.step='1';sale.value=String(value(j.sellValue)??'');sale.setAttribute('aria-label','Valor de venta '+(index+1));const saleLabel=el('label','Venta ($)');saleLabel.append(sale);fields.append(saleLabel);
     const counters=Object.entries(j.counters).map(([key,fact])=>{const input=el('input');input.type='number';input.step='1';input.value=String(value(fact)??'');input.setAttribute('aria-label',key+' '+(index+1));const l=el('label',counterSpecs(j.catalogId)[key]?.label??key);l.append(input);fields.append(l);return {key,input,fact};});
     const readNumber=(input:HTMLInputElement,prior:Fact<number>)=>{if(!input.value.trim())return prior.status==='unknown'?prior:{status:'unknown' as const,reason:'Valor sin transcribir.'};const n=Number(input.value);if(!Number.isSafeInteger(n)||n<0)throw Error('Usa valores enteros no negativos en los datos del comodín.');return known(n);};
     readFields=()=>({...structuredClone(j),sellValue:readNumber(sale,j.sellValue),counters:Object.fromEntries(counters.map(c=>[c.key,readNumber(c.input,c.fact)]))});
    };
    search.oninput=()=>{const selected=choice.value,term=search.value.toLocaleLowerCase();choice.replaceChildren();for(const [id,name]of choices)if(!id||id===selected||id.toLocaleLowerCase().includes(term)||name.toLocaleLowerCase().includes(term)){const o=el('option',name);o.value=id;choice.append(o);}choice.value=selected;};
    choice.onchange=refresh;edition.onchange=refresh;refresh();row.append(preview,search,choice,edition,details);
    readers.push(()=>{if(!current||!readFields)throw Error('Selecciona el comodín de la carta '+(index+1)+'.');return {entryId,kind:'joker',joker:readFields()};});
   }else{
    const choice=select([['','Seleccionar carta'],...Object.entries(planets)],old&&old.kind!=='joker'?old.catalogId:'');choice.dataset.packPlanetIndex=String(index);choice.setAttribute('aria-label','Planeta '+(index+1));row.append(el('span','✦','pack-planet-art'),choice);
    readers.push(()=>{if(!choice.value)throw Error('Selecciona la carta '+(index+1)+'.');return {entryId,kind:choice.value==='c_black_hole'?'unsupported':'planet',catalogId:choice.value};});
   }
   grid.append(row);
  }
  const save=write(el('button','Registrar opciones'));save.id='pack-observe';save.type='submit';form.append(grid,save);
  form.onsubmit=e=>{e.preventDefault();try{request({type:'observe_pack',contents:readers.map(read=>read())});}catch(err){error.textContent=err instanceof Error?err.message:'Revisa las cartas.';}};
 };
 if(ctx.selectedEntryIds.length===0){buildForm();host.append(form);if(ctx.contents.status==='known'){const edit=el('button','Corregir opciones','secondary');edit.type='button';edit.id='pack-edit-contents';edit.onclick=()=>{form.hidden=!form.hidden;options.controlsChanged();};toolbar.append(edit);}}
 if(ctx.contents.status==='unknown')host.append(el('small','Transcribe las opciones mostradas por Balatro. El asesor no genera el contenido.','muted'));
 else{
  const choices=el('div','','pack-choice-grid');
  for(const entry of ctx.contents.value){
   const card=el('article','','pack-choice');card.dataset.packEntry=entry.entryId;const selected=ctx.selectedEntryIds.includes(entry.entryId);card.dataset.selected=String(selected);
   if(entry.kind==='joker')card.append(jokerArt(ALL_JOKER_FACTS[entry.joker.catalogId]?.artId??entry.joker.catalogId,packEntryLabel(entry)));else card.append(el('span','✦','pack-planet-art'));
   const info=el('div','','pack-choice-info');info.append(el('h3',packEntryLabel(entry)));
   if(selected)info.append(el('small','Elegido'));else{
    const action:PackAction={type:'choose_pack_item',entryId:entry.entryId},result=probe(action),button=write(el('button',entry.kind==='planet'?'Usé esta carta':'Elegí esta carta'),!result.ok);button.dataset.packChoose=entry.entryId;button.onclick=()=>request(action);
    if(result.ok){
     info.append(renderPackOutcome(state,result.value.state));
    }else info.append(el('small',result.errors.map(e=>e.message).join(' '),'error'));
    info.append(button);
   }
   card.append(info);choices.append(card);
  }host.append(choices);
 }
 const owned=value(state.observed.jokers)??[];
 if(owned.length){const sale=el('details');sale.append(el('summary','Vender un comodín'));const choice=select(owned.map(j=>[j.instanceId,(ALL_JOKER_FACTS[j.catalogId]?.name??j.catalogId)+' · $'+(value(j.sellValue)??'?')]),owned[0]!.instanceId);choice.id='pack-sell-joker';choice.setAttribute('aria-label','Comodín que vendiste');const sell=write(el('button','Vendí este comodín','secondary'));sell.id='pack-sell';sell.onclick=()=>request({type:'sell_pack_joker',instanceId:choice.value});sale.append(choice,sell);host.append(sale);}
 host.append(toolbar,el('small','Reglas provisionales por inspección del ejecutable. Registrar cambia la copia local; no controla Balatro.','muted'));options.controlsChanged();
}
