import type {Card,HandId} from '../catalog/initial.js';
import {CONSUMABLE_KINDS} from '../catalog/generation-jokers.js';
import type {GameState,JokerInstance} from '../state/model.js';
import {validateState} from '../state/validation.js';
import {deckCards,fail,inventory,need,run,safe,stateInput,valueFact} from './core.js';
import type {EngineOptions,Trace} from './core.js';
import type {Mutation} from './shop.js';
import type {Consumable,EffectChoice,FullEventInput} from './full-joker-contract.js';
import {effectiveJokers} from './joker-context.js';
import {levelUp} from './random-jokers.js';
import {generationCardsAdded,generationCardsDestroyed,generationEvent,generationShopInventoryChanged,generationUseReroll} from './generation-jokers.js';

type KnownValue<T>=T extends {status:'known';value:infer V}?V:never;
/** Explicit observed correction of the consumable's own effect; never filled from a scenario. */
export interface ConsumableCorrection {
 basis:string;money?:number;cards?:Card[];jokers?:JokerInstance[];
 handBases?:KnownValue<GameState['observed']['handBases']>;consumables?:Consumable[];
 resources?:Partial<Record<'handsPerRound'|'discardsPerRound'|'handSize'|'jokerSlots',number>>;
}
export type GameEvent =
 | {type:'reroll';newShop?:KnownValue<GameState['observed']['shop']>;choices?:EffectChoice[]}
 | {type:'skip_pack';packId:string;choices?:EffectChoice[]}
 | {type:'open_pack';packId:string;choices?:EffectChoice[]}
 | {type:'use_consumable';instanceId:string;targetCardIds?:string[];correction?:ConsumableCorrection;choices?:EffectChoice[]}
 | {type:'sell_consumable';instanceId:string;choices?:EffectChoice[]}
 | {type:'end_shop';choices?:EffectChoice[]}
 | {type:'add_cards';cards:Card[];basis:string;choices?:EffectChoice[]}
 | {type:'destroy_cards';cardIds:string[];shatteredIds?:string[];basis:string;choices?:EffectChoice[]};
export interface GameEventChange {state:GameState;event:GameEvent;limitations:string[]}
const PLANET_HANDS:Readonly<Record<string,HandId>>={c_mercury:'pair',c_venus:'three_kind',c_earth:'full_house',c_mars:'four_kind',c_jupiter:'flush',c_saturn:'straight',c_uranus:'two_pair',c_neptune:'straight_flush',c_pluto:'high_card',c_planet_x:'five_kind',c_ceres:'flush_house',c_eris:'flush_five'};
const CORRECTION_FIELDS=new Set(['basis','money','cards','jokers','handBases','consumables','resources']);
const REQUIRED_CORRECTION:Readonly<Record<string,readonly (keyof ConsumableCorrection)[]>>={
 c_fool:['consumables'],c_high_priestess:['consumables'],c_emperor:['consumables'],c_hermit:['money'],c_temperance:['money'],c_judgement:['jokers'],c_wheel_of_fortune:['jokers'],
 c_magician:['cards'],c_empress:['cards'],c_hierophant:['cards'],c_lovers:['cards'],c_chariot:['cards'],c_justice:['cards'],c_strength:['cards'],c_hanged_man:['cards'],c_death:['cards'],c_devil:['cards'],c_tower:['cards'],c_star:['cards'],c_moon:['cards'],c_sun:['cards'],c_world:['cards'],
 c_familiar:['cards'],c_grim:['cards'],c_incantation:['cards'],c_talisman:['cards'],c_aura:['cards'],c_sigil:['cards'],c_ouija:['cards','resources'],c_ectoplasm:['jokers','resources'],c_immolate:['cards','money'],c_ankh:['jokers'],c_deja_vu:['cards'],c_hex:['jokers'],c_trance:['cards'],c_medium:['cards'],c_cryptid:['cards'],c_soul:['jokers'],c_black_hole:['handBases']
};
function context(state:GameState){const fact=state.observed.jokerContext;if(!fact)fail('$.observed.jokerContext','unknown_data','Falta inventario/contexto de consumibles.');return need(fact,'$.observed.jokerContext');}
function consumables(state:GameState){const fact=context(state).consumables;if(!fact)fail('$.observed.jokerContext.consumables','unknown_data','Falta inventario de consumibles.');return need(fact,'$.observed.jokerContext.consumables');}
function basis(value:unknown,path:string){if(typeof value!=='string'||!value.trim())fail(path,'missing_basis','Indica qué cambio se observó en el juego.');}
function choicesValid(choices:unknown){if(choices===undefined)return;if(!Array.isArray(choices))fail('$event.choices','invalid_outcome','Los resultados deben ser una lista.');const keys=new Set<string>();for(const c of choices){if(!c||typeof c!=='object'||typeof c.key!=='string'||!c.key||!['boolean','integer','card','joker','consumable','target'].includes(c.kind)||!['known','hypothetical'].includes(c.knowledge)||typeof c.basis!=='string'||!c.basis.trim())fail('$event.choices','invalid_outcome','Cada resultado requiere clave, tipo, conocimiento y fundamento.');if(keys.has(c.key))fail('$event.choices','duplicate_outcome','Clave de resultado repetida.');keys.add(c.key);}}
function ids(value:unknown,path:string):string[]{if(!Array.isArray(value)||!value.length||value.some(id=>typeof id!=='string'||!id)||new Set(value).size!==value.length)fail(path,'invalid_card_ids','Indica una lista no vacía de IDs únicos.');return value;}
function selectedCards(state:GameState,list:readonly string[]){const cards=deckCards(state);return list.map(id=>{const card=cards.find(c=>c.instanceId===id);if(!card)fail('$event.cardIds','unknown_card','Carta fuera del mazo: '+id+'.');return card;});}
function validateCorrection(c:ConsumableCorrection|undefined,used:Consumable){
 const fields=REQUIRED_CORRECTION[used.catalogId];if(!fields)fail('$event.correction','unsupported_consumable','No se conoce el ámbito de corrección de este consumible.');
 if(!c)fail('$event.correction','needs_consumable_effect','El efecto propio de '+used.catalogId+' necesita sus datos finales observados: '+fields.join(', ')+'. La acción no se registra hasta aportarlos.');
 if(typeof c!=='object'||Array.isArray(c))fail('$event.correction','invalid_correction','La corrección debe ser un objeto de datos finales.');
 basis(c.basis,'$event.correction.basis');
 if(Object.keys(c).some(k=>!CORRECTION_FIELDS.has(k)))fail('$event.correction','unsupported_correction','La corrección solo admite campos de partida explícitos.');
 for(const f of fields)if(c[f]===undefined)fail('$event.correction.'+f,'incomplete_consumable_effect','Falta el resultado observado '+f+' de '+used.catalogId+'.');
 if(c.resources!==undefined&&(!c.resources||typeof c.resources!=='object'||Array.isArray(c.resources)||!Object.keys(c.resources).length||Object.keys(c.resources).some(k=>!['handsPerRound','discardsPerRound','handSize','jokerSlots'].includes(k))||Object.values(c.resources).some(n=>!Number.isSafeInteger(n)||n!<0)))fail('$event.correction.resources','invalid_resource','Recursos finales enteros no negativos, con campos explícitos.');
 for(const f of ['cards','jokers','consumables'] as const)if(c[f]!==undefined&&!Array.isArray(c[f]))fail('$event.correction.'+f,'invalid_correction','El campo '+f+' debe ser una lista.');
 if(c.money!==undefined&&!Number.isSafeInteger(c.money))fail('$event.correction.money','invalid_correction','El saldo final debe ser un entero seguro.');
 if(c.handBases!==undefined&&(!c.handBases||typeof c.handBases!=='object'||Array.isArray(c.handBases)))fail('$event.correction.handBases','invalid_correction','Indica las bases de manos finales.');
}
function applyCorrection(state:GameState,c:ConsumableCorrection,trace:Trace[]){
 if(c.money!==undefined)state.observed.money=valueFact(c.money);
 if(c.cards!==undefined)state.observed.deck=valueFact({cards:structuredClone(c.cards)});
 if(c.jokers!==undefined)state.observed.jokers=valueFact(structuredClone(c.jokers));
 if(c.handBases!==undefined)state.observed.handBases=valueFact(structuredClone(c.handBases));
 if(c.consumables!==undefined)context(state).consumables=valueFact(structuredClone(c.consumables));
 if(c.resources!==undefined)for(const key of ['handsPerRound','discardsPerRound','handSize','jokerSlots'] as const)if(c.resources[key]!==undefined)state.observed.resources[key]=valueFact(c.resources[key]!);
 trace.push({ruleId:'jokers.generation',label:'Efecto propio del consumible registrado mediante corrección explícita',values:{basis:c.basis,fields:Object.keys(c).filter(k=>k!=='basis').join(', ')}});
}
function correctedStructure(state:GameState){
 // References to removed cards are pruned below; validate new data before any effect reads it.
 const check=structuredClone(state);check.assumptions.probes=[];check.assumptions.roundPlans=[];const valid=validateState(check);if(!valid.ok){const e=valid.errors[0]!;fail(e.path,e.code,e.message);}
}
function pruneScenarios(state:GameState,limitations:string[],trace:Trace[]){
 if(state.observed.deck.status==='unknown')return;const d=state.observed.deck.value;if('preset'in d)return;const ids=new Set(d.cards.map(c=>c.instanceId));
 const probes=state.assumptions.probes.length,plans=state.assumptions.roundPlans.length;
 state.assumptions.probes=state.assumptions.probes.filter(p=>p.playedCardIds.every(id=>ids.has(id)));
 state.assumptions.roundPlans=state.assumptions.roundPlans.filter(p=>p.initialHandCardIds.every(id=>ids.has(id))&&p.events.every(e=>[...e.cardIds,...e.drawnCardIds].every(id=>ids.has(id))));
 const removedProbes=probes-state.assumptions.probes.length,removedPlans=plans-state.assumptions.roundPlans.length;
 if(removedProbes||removedPlans){limitations.push('Se invalidaron '+removedProbes+' pruebas y '+removedPlans+' planes que referían cartas retiradas. Recalcula los escenarios.');trace.push({ruleId:'jokers.generation',label:'Escenarios incompatibles retirados',values:{probes:removedProbes,plans:removedPlans}});}
}

/** Atomic projected clone; persistence/confirmation remains the caller's responsibility. */
export function applyGameEvent(input:unknown,event:GameEvent,mutation:Mutation,options:EngineOptions={}){
 return run<GameEventChange>(['shop.actions'],options,(trace,use)=>{
  const state=stateInput(input,use);inventory(state);
  if(!mutation||mutation.expectedRevision!==state.revision)fail('$.revision','stale_revision','La partida cambió; recarga antes de registrar esta acción.');
  if(!event||typeof event!=='object'||!['reroll','skip_pack','open_pack','use_consumable','sell_consumable','end_shop','add_cards','destroy_cards'].includes(event.type))fail('$event','invalid_action','Evento no admitido.');
  choicesValid(event.choices);const limitations:string[]=[];
  use('jokers.generation');
  const scope=(stage:FullEventInput['stage'],cards:Card[]=[]):FullEventInput=>({state,stage,cards,...(event.choices?{choices:event.choices}:{}),trace,use});
  if(event.type==='reroll'){
   generationUseReroll(scope('reroll'));
   if(event.newShop!==undefined)state.observed.shop=valueFact(structuredClone(event.newShop));
   else {state.observed.shop={status:'unknown',reason:'La tienda cambió tras el reroll. Registra las nuevas ofertas.'};limitations.push('No se conocen las ofertas nuevas. El reroll no reutiliza las ofertas anteriores.');}
  }
  if(event.type==='open_pack'||event.type==='skip_pack'){
   if(typeof event.packId!=='string'||!event.packId.trim())fail('$event.packId','invalid_id','Indica qué sobre abriste u omitiste.');
   generationEvent(scope(event.type),effectiveJokers(need(state.observed.jokers,'$.observed.jokers')));
   limitations.push('Se registra '+(event.type==='open_pack'?'la apertura':'la omisión')+' del sobre '+event.packId+'. Su compra y contenido elegido necesitan datos explícitos independientes.');
  }
  if(event.type==='end_shop')generationEvent(scope('end_shop'),effectiveJokers(need(state.observed.jokers,'$.observed.jokers')));
  if(event.type==='use_consumable'||event.type==='sell_consumable'){
   const items=consumables(state),index=items.findIndex(c=>c.instanceId===event.instanceId);if(index<0)fail('$event.instanceId','missing_consumable','El consumible indicado no está registrado.');
   const used=items[index]!;if(CONSUMABLE_KINDS[used.catalogId]!==used.kind)fail('$event.instanceId','unsupported_consumable','El tipo de consumible no coincide con el catálogo de esta versión.');
   if(event.type==='sell_consumable'){
    const before=need(state.observed.money,'$.observed.money');items.splice(index,1);state.observed.money=valueFact(before+safe(used.sellValue));const e=scope('sell');e.consumable=used;generationEvent(e);
    trace.push({ruleId:'shop.actions',label:'Venta de consumible observado',values:{instanceId:used.instanceId,before,received:used.sellValue,after:before+used.sellValue}});
   }else{
    const ownHand=PLANET_HANDS[used.catalogId];
    if(used.kind==='planet'){
     if(!ownHand||used.handId!==undefined&&used.handId!==ownHand)fail('$event.instanceId','incompatible_planet','La identidad del Planet no coincide con la mano que mejora.');
     if(event.correction)fail('$event.correction','unnecessary_correction','El Planet tiene efecto determinista implementado; no sustituye sus bases por una corrección arbitraria.');
    }else validateCorrection(event.correction,used);
    const targets=event.targetCardIds?selectedCards(state,ids(event.targetCardIds,'$event.targetCardIds')):[];
    const beforeDeck=event.correction?.cards?deckCards(state).map(c=>structuredClone(c)):undefined,beforeJokers=structuredClone(need(state.observed.jokers,'$.observed.jokers'));
    items.splice(index,1);const e=scope('use_consumable',targets);e.consumable=used;generationEvent(e);
    if(ownHand){use('jokers.random');levelUp(state,ownHand);trace.push({ruleId:'jokers.random',label:'Planet mejora la mano indicada por su identidad',values:{catalogId:used.catalogId,hand:ownHand,levelsAdded:1}});}
    else {
     applyCorrection(state,event.correction!,trace);
     correctedStructure(state);
     if(beforeDeck){const after=deckCards(state),afterIds=new Set(after.map(c=>c.instanceId)),oldIds=new Set(beforeDeck.map(c=>c.instanceId));generationCardsAdded(state,after.filter(c=>!oldIds.has(c.instanceId)),trace,use);generationCardsDestroyed(state,beforeDeck.filter(c=>!afterIds.has(c.instanceId)),[],trace,use);}
     const newJokers=need(state.observed.jokers,'$.observed.jokers');for(const j of beforeJokers)if(!newJokers.some(n=>n.instanceId===j.instanceId))generationShopInventoryChanged(state,j,'remove',trace,use);for(const j of newJokers)if(!beforeJokers.some(old=>old.instanceId===j.instanceId))generationShopInventoryChanged(state,j,'add',trace,use);
     if(consumables(state).some(c=>c.instanceId===used.instanceId))fail('$event.correction.consumables','consumable_still_present','La corrección final conserva el consumible que se confirmó usado.');
     limitations.push('El efecto propio de '+used.catalogId+' procede de la corrección observada: '+event.correction!.basis+'. El motor aplica sus consecuencias de comodines, pero no verifica una transformación Tarot/Spectral completa.');
    }
    trace.push({ruleId:'jokers.generation',label:'Consumible usado y retirado',values:{instanceId:used.instanceId,catalogId:used.catalogId}});
   }
  }
  if(event.type==='add_cards'){
   basis(event.basis,'$event.basis');if(!Array.isArray(event.cards)||!event.cards.length)fail('$event.cards','invalid_cards','Indica las cartas nuevas observadas.');
   const current=deckCards(state),existing=new Set(current.map(c=>c.instanceId));
   for(const c of event.cards){if(!c||typeof c!=='object'||typeof c.instanceId!=='string'||existing.has(c.instanceId))fail('$event.cards','duplicate_card','Las cartas añadidas requieren IDs nuevos y únicos.');existing.add(c.instanceId);}
   state.observed.deck=valueFact({cards:[...current,...structuredClone(event.cards)]});generationCardsAdded(state,event.cards,trace,use);trace.push({ruleId:'jokers.generation',label:'Cartas nuevas registradas',values:{count:event.cards.length,basis:event.basis}});
  }
  if(event.type==='destroy_cards'){
   basis(event.basis,'$event.basis');const removed=selectedCards(state,ids(event.cardIds,'$event.cardIds'));
   const shattered=event.shatteredIds??[];if(!Array.isArray(shattered)||new Set(shattered).size!==shattered.length||shattered.some(id=>!removed.some(c=>c.instanceId===id&&c.enhancement==='glass')))fail('$event.shatteredIds','invalid_shattered','Solo Glass destruidas pueden marcarse shattered.');
   state.observed.deck=valueFact({cards:deckCards(state).filter(c=>!event.cardIds.includes(c.instanceId))});generationCardsDestroyed(state,removed,shattered,trace,use);trace.push({ruleId:'jokers.generation',label:'Cartas destruidas registradas',values:{count:removed.length,basis:event.basis}});
  }
  pruneScenarios(state,limitations,trace);state.revision=safe(state.revision+1);state.updatedAt=mutation.updatedAt;
  const valid=validateState(state);if(!valid.ok){const e=valid.errors[0]!;fail(e.path,e.code,e.message);}return {state:valid.value,event:structuredClone(event),limitations};
 });
}
