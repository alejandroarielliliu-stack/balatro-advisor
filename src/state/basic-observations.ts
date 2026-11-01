import type {Fact,GameState,JokerInstance,Result} from './model.js';
import {cardSchema,jokerSchema} from './model.js';
import {validateState} from './validation.js';
import {array,boolean,checkJsonValue,fact,integer,isObject,object,text,union} from './schema.js';
import type {Infer} from './schema.js';
import {currentDeckCards} from './deck-material.js';
import {invalidateDeckGrowth} from './inventory-changes.js';
import type {ObservedDeckChanges} from './inventory-changes.js';

const requestSchema=object({}, {
 money:fact(integer()),jokers:fact(array(jokerSchema,100)),voucherIds:array(text(),32),
 deck:fact(union(object({preset:text()}),object({cards:array(cardSchema,200)}))),discardSavedScenarios:boolean,
 resources:object({}, {handsPerRound:fact(integer(0)),discardsPerRound:fact(integer(0)),handSize:fact(integer(0)),jokerSlots:fact(integer(0))})
});
export type BasicObservationRequest=Infer<typeof requestSchema>;
interface BasicObservation {patch:Partial<GameState['observed']>;changed:boolean;description:string}

/** Fact provenance is preserved when an observation has the same meaning. */
function semantic(value:unknown):unknown {
 if(Array.isArray(value))return value.map(semantic);
 if(!isObject(value))return value;
 if(value.status==='unknown')return {status:'unknown'};
 if(value.status==='known')return {status:'known',value:semantic(value.value)};
 return Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,entry])=>[key,semantic(entry)]));
}
const same=(a:unknown,b:unknown)=>JSON.stringify(semantic(a))===JSON.stringify(semantic(b));
const retain=<T>(before:Fact<T>|undefined,after:Fact<T>):Fact<T>=>structuredClone(before&&same(before,after)?before:after);

function preserveJokers(before:GameState['observed']['jokers'],after:GameState['observed']['jokers']):GameState['observed']['jokers'] {
 if(before.status!=='known'||after.status!=='known')return retain(before,after);
 const old=new Map(before.value.map(j=>[j.instanceId,j]));
 const jokers: JokerInstance[]=after.value.map(j=>{
  const prior=old.get(j.instanceId);
  // A newly identified effect never inherits development from the old effect.
  if(!prior||prior.catalogId!==j.catalogId)return structuredClone(j);
  const counters=structuredClone(prior.counters);
  for(const [key,value] of Object.entries(j.counters))counters[key]=retain(prior.counters[key],value);
  return {...structuredClone(j),edition:retain(prior.edition,j.edition),stickers:retain(prior.stickers,j.stickers),sellValue:retain(prior.sellValue,j.sellValue),counters};
 });
 return retain(before,{...after,value:jokers});
}

function observedDeckChanges(state:GameState,deck:GameState['observed']['deck']):ObservedDeckChanges{
 const before=currentDeckCards(state),after=currentDeckCards({...state,observed:{...state.observed,deck}});
 // Without both complete baselines, no event history or growth is reconstructed.
 if(!before||!after)return {added:true,removed:true,changed:true};
 const old=new Map(before.map(card=>[card.instanceId,card])),next=new Map(after.map(card=>[card.instanceId,card]));
 const added=after.some(card=>!old.has(card.instanceId)),removed=before.some(card=>!next.has(card.instanceId));
 // Replacing a whole baseline can conceal modifications as well as additions/removals.
 const reset=before.length>0&&after.length>0&&!after.some(card=>old.has(card.instanceId));
 return {added,removed,changed:reset||after.some(card=>old.has(card.instanceId)&&!same(old.get(card.instanceId),card))};
}

/** Prepare a narrow correction, not a purchase, phase transition or projection.
 * No revision, time, persistence or resource effects are manufactured here. */
export function prepareBasicObservation(input:unknown,requestInput:unknown):Result<BasicObservation> {
 const checked=validateState(input);if(!checked.ok)return checked;
 const errors=checkJsonValue(requestInput);if(!errors.length)requestSchema.check(requestInput,'$basicObservations',errors);
 if(errors.length)return {ok:false,errors};
 const state=checked.value,request=requestInput as BasicObservationRequest,patch:Partial<GameState['observed']>={},groups:string[]=[];
 if(request.money&&!same(state.observed.money,request.money)){patch.money=retain(state.observed.money,request.money);groups.push('dinero');}
 if(request.jokers){const jokers=preserveJokers(state.observed.jokers,request.jokers);if(!same(state.observed.jokers,jokers)){patch.jokers=jokers;groups.push('comodines');}}
 if(request.deck&&!same(state.observed.deck,request.deck)){
  patch.deck=retain(state.observed.deck,request.deck);groups.push('mazo');
  const finalJokers=patch.jokers??state.observed.jokers,jokers=invalidateDeckGrowth(finalJokers,observedDeckChanges(state,patch.deck));
  if(!same(finalJokers,jokers)){patch.jokers=jokers;if(!groups.includes('comodines'))groups.push('comodines');}
 }
 if(request.voucherIds){
  const original=state.observed.outOfScope;
  if(original.status!=='known')return {ok:false,errors:[{path:'$basicObservations.voucherIds',code:'unknown_modifier_context',message:'Los demás modificadores son desconocidos. Completa ese contexto antes de cambiar los vales; no se suponen listas vacías.'}]};
  if(!same(original.value.vouchers,request.voucherIds)){
   patch.outOfScope={status:'known',source:'manual',value:{...structuredClone(original.value),vouchers:structuredClone(request.voucherIds)}};groups.push('vales');
  }
 }
 if(request.resources){
  const resources=structuredClone(state.observed.resources);
  for(const key of Object.keys(request.resources) as (keyof typeof resources)[])resources[key]=retain(resources[key],request.resources[key]!);
  if(!same(state.observed.resources,resources)){patch.resources=resources;groups.push('recursos');}
 }
 // The caller forwards this explicit flag to T09b. A retained deck patch lets
 // the existing correction API record scenario removal even with unchanged cards.
 if(request.discardSavedScenarios&&(state.assumptions.probes.length||state.assumptions.roundPlans.length)){
  patch.deck??=structuredClone(state.observed.deck);groups.push('escenarios guardados retirados');
 }
 const changed=Object.keys(patch).length>0;
 if(changed){const assumptions=request.discardSavedScenarios?{...state.assumptions,probes:[],roundPlans:[]}:state.assumptions;
  const valid=validateState({...state,assumptions,observed:{...state.observed,...patch}});if(!valid.ok)return valid;}
 return {ok:true,value:{patch,changed,description:changed?'Datos observados actualizados: '+groups.join(', ')+'.':'Sin cambios en los datos observados.'}};
}
