import type {GameState,Result} from './model.js';
import {cardSchema,consumableSchema} from './model.js';
import {validateState} from './validation.js';
import {validateConfirmedRecord} from '../storage/confirmed-record.js';
import type {ConfirmedRecord} from '../storage/confirmed-record.js';
import {array,boolean,checkJsonValue,enumeration,integer,object,text,union} from './schema.js';
import type {Infer} from './schema.js';
import {RANKS,standardDeck} from '../catalog/initial.js';
import type {Card} from '../catalog/initial.js';
import {CONSUMABLE_KINDS} from '../catalog/generation-jokers.js';
const fields=object({},{rank:enumeration(...RANKS),suit:enumeration('S','H','D','C'),edition:text(),enhancement:text(),seal:text(),extraChips:integer(),debuff:boolean});
const cardOperation=union(object({type:enumeration('add'),card:cardSchema}),union(object({type:enumeration('remove'),instanceId:text()}),object({type:enumeration('update'),instanceId:text(),changes:fields})));
const consumableOperation=union(object({type:enumeration('add'),item:consumableSchema}),union(object({type:enumeration('remove'),instanceId:text()}),union(object({type:enumeration('update'),instanceId:text(),changes:object({},{edition:enumeration('base','negative'),sellValue:integer(0)})}),object({type:enumeration('confirm_empty')}))));
export type CardOperation=Infer<typeof cardOperation>;
export type ConsumableOperation=Infer<typeof consumableOperation>;
const common={expectedRevision:integer(0),confirmUnchangedOthers:boolean,discardSavedScenarios:boolean};
const requestSchema=union(object({...common,target:enumeration('deck'),operations:array(cardOperation,200)},{referenceRevision:integer(0)}),object({...common,target:enumeration('consumables'),operations:array(consumableOperation,100)},{referenceRevision:integer(0)}));
export type InventoryChangeRequest=Infer<typeof requestSchema>;
export interface InventoryChangeResult {patch:Partial<GameState['observed']>;discardSavedScenarios:boolean;description:string}
const fail=(code:string,message:string):Result<never>=>({ok:false,errors:[{path:'$inventory',code,message}]});
const known=<T>(value:T)=>({status:'known' as const,source:'manual' as const,value});
export function inventoryReference(record:ConfirmedRecord,target:'deck'|'consumables'):GameState|undefined{
 const all=[record.initialState,...record.history.map(e=>e.after),record.state];
 const found=[...all].reverse().find(s=>target==='deck'?s.observed.deck.status==='known':s.observed.jokerContext?.status==='known'&&s.observed.jokerContext.value.consumables?.status==='known');return found?structuredClone(found):undefined;
}
export function inventoryCards(state:GameState):Card[]|undefined{
 const fact=state.observed.deck;if(fact.status!=='known')return;
 if('cards'in fact.value)return structuredClone(fact.value.cards);
 if(fact.value.preset==='standard52-unmodified'&&state.observed.deckId.status==='known'&&!['abandoned','checkered','erratic'].includes(state.observed.deckId.value))return standardDeck();
}
/** A reconciliation of observed objects, not the execution of a Tarot, sale or purchase. */
export function inventoryChanges(input:unknown,requestInput:unknown):Result<InventoryChangeResult>{
 const record=validateConfirmedRecord(input);if(!record.ok)return record;
 const errors=checkJsonValue(requestInput);if(!errors.length)requestSchema.check(requestInput,'$request',errors);if(errors.length)return {ok:false,errors};
 const request=requestInput as InventoryChangeRequest,current=record.value.state;
 if(request.expectedRevision!==current.revision)return fail('stale_revision','La partida cambió. Abre otra vez la edición de inventario.');
 if(!request.confirmUnchangedOthers)return fail('confirmation_required','Confirma que los demás objetos y datos conservados siguen igual.');
 if(!request.operations.length)return fail('empty_changes','Añade al menos un cambio observado.');
 const sources=[record.value.initialState,...record.value.history.flatMap(e=>[e.before,e.after]),current];
 const source=request.referenceRevision===undefined?current:sources.find(s=>s.revision===request.referenceRevision);
 if(!source)return fail('missing_reference','La revisión elegida no existe en el historial de esta partida.');
 const patch:Partial<GameState['observed']>={};
 if(request.target==='deck'){
  const cards=inventoryCards(source);if(!cards)return fail('unknown_deck','No conocemos el mazo de referencia. Una carta aislada no permite reconstruir las restantes.');
  for(const op of request.operations){
   if(op.type==='add'){if(cards.some(c=>c.instanceId===op.card.instanceId))return fail('duplicate_id','La carta añadida necesita un ID nuevo.');cards.push(structuredClone(op.card));}
   else{const index=cards.findIndex(c=>c.instanceId===op.instanceId);if(index<0)return fail('missing_card','La carta no existe en el mazo de referencia ni en los cambios anteriores.');
    if(op.type==='remove')cards.splice(index,1);else{if(!Object.keys(op.changes).length)return fail('empty_changes','Indica qué cambió en la carta.');Object.assign(cards[index]!,structuredClone(op.changes));}}
  }
  patch.deck=known({cards});
  if(current.observed.jokers.status==='known'){
   const added=request.operations.some(o=>o.type==='add'),removed=request.operations.some(o=>o.type==='remove'),changed=request.operations.some(o=>o.type==='update');
   const affected=current.observed.jokers.value.filter(j=>j.catalogId==='hologram'&&added||['caino','glass'].includes(j.catalogId)&&removed||j.catalogId==='vampire'&&changed);
   if(affected.length){patch.jokers=structuredClone(current.observed.jokers);for(const j of patch.jokers.value)if(affected.some(a=>a.instanceId===j.instanceId))j.counters.x100={status:'unknown',reason:'El cambio de cartas podría afectar este crecimiento. Transcribe el contador observado; no se reconstruye su causa.'};}
  }
 }else{
  const empty=request.operations.some(o=>o.type==='confirm_empty');
  if(empty&&request.operations.length!==1)return fail('invalid_sequence','Confirmar una lista vacía debe hacerse sin otras operaciones.');
  const ctx=source.observed.jokerContext,items=empty?[]:ctx?.status==='known'&&ctx.value.consumables?.status==='known'?structuredClone(ctx.value.consumables.value):undefined;
  if(!items)return fail('unknown_consumables','No se conoce el inventario de referencia. Confirma una lista vacía solo si realmente no tienes consumibles.');
  if(new Set(items.map(c=>c.instanceId)).size!==items.length)return fail('duplicate_id','El inventario de referencia contiene IDs repetidos; no se puede distinguir qué copia cambió.');
  for(const op of request.operations){
   if(op.type==='confirm_empty')continue;
   if(op.type==='add'){if(items.some(c=>c.instanceId===op.item.instanceId))return fail('duplicate_id','El consumible añadido necesita un ID nuevo.');items.push(structuredClone(op.item));}
   else{const index=items.findIndex(c=>c.instanceId===op.instanceId);if(index<0)return fail('missing_consumable','El consumible ya no existe en esta lista.');
    if(op.type==='remove')items.splice(index,1);else{if(!Object.keys(op.changes).length)return fail('empty_changes','Indica qué cambió en el consumible.');Object.assign(items[index]!,structuredClone(op.changes));}}
  }
  const ids=new Set<string>();for(const c of items){if(ids.has(c.instanceId))return fail('duplicate_id','Hay consumibles con el mismo ID.');ids.add(c.instanceId);if(c.catalogId==='c_locked'||CONSUMABLE_KINDS[c.catalogId]!==c.kind)return fail('unsupported_consumable','El consumible o su tipo no coincide con el catálogo actual.');}
  const context=current.observed.jokerContext?.status==='known'?structuredClone(current.observed.jokerContext.value):{};
  context.consumables=known(items);patch.jokerContext=known(context);
 }
 const assumptions=request.discardSavedScenarios?{...current.assumptions,probes:[],roundPlans:[]}:current.assumptions;
 const checked=validateState({...current,assumptions,observed:{...current.observed,...patch}});if(!checked.ok)return checked;
 return {ok:true,value:{patch,discardSavedScenarios:request.discardSavedScenarios,description:`Cambios observados en ${request.target==='deck'?'cartas del mazo':'inventario de consumibles'}: ${request.operations.length}. Referencia: revisión ${source.revision}. Los demás datos se declararon sin cambios; no se aplicaron compras, ventas ni efectos de uso.`}};
}
