import type {Card} from '../catalog/initial.js';
import type {GameStateV02} from '../state/model.js';
import {tarotActionSchema} from '../state/tarot-contract.js';
import type {TarotAction} from '../state/tarot-contract.js';
import {checkJsonValue} from '../state/schema.js';
import {validateState} from '../state/validation.js';
import {deckCards,fail,need,run,safe,stateInput,valueFact} from './core.js';
import type {EngineOptions,EngineResult,Trace} from './core.js';
import type {Mutation} from './shop.js';
import type {Consumable} from './full-joker-contract.js';
import {applyMoneyTarotUse,moneyTarotDefinition,recordTarotUse} from './tarot-money.js';
import type {MoneyTarotChange} from './tarot-money.js';
import {bossDisabled} from './history-jokers.js';

export type TarotTargetDefinition={catalogId:string;name:string;maxTargets:number}&(
 {effect:'enhancement';enhancement:string}|{effect:'suit';suit:Card['suit']}
);
/** L12: static inspection of 1.0.1o-FULL, not a played-game observation. */
export const TAROT_TARGETS:readonly TarotTargetDefinition[]=Object.freeze([
 {catalogId:'c_magician',name:'El Mago',maxTargets:2,effect:'enhancement',enhancement:'lucky'},
 {catalogId:'c_empress',name:'La Emperatriz',maxTargets:2,effect:'enhancement',enhancement:'mult'},
 {catalogId:'c_hierophant',name:'El Hierofante',maxTargets:2,effect:'enhancement',enhancement:'bonus'},
 {catalogId:'c_lovers',name:'Los Enamorados',maxTargets:1,effect:'enhancement',enhancement:'wild'},
 {catalogId:'c_chariot',name:'El Carro',maxTargets:1,effect:'enhancement',enhancement:'steel'},
 {catalogId:'c_justice',name:'La Justicia',maxTargets:1,effect:'enhancement',enhancement:'glass'},
 {catalogId:'c_devil',name:'El Diablo',maxTargets:1,effect:'enhancement',enhancement:'gold'},
 {catalogId:'c_tower',name:'La Torre',maxTargets:1,effect:'enhancement',enhancement:'stone'},
 {catalogId:'c_star',name:'La Estrella',maxTargets:3,effect:'suit',suit:'D'},
 {catalogId:'c_moon',name:'La Luna',maxTargets:3,effect:'suit',suit:'C'},
 {catalogId:'c_sun',name:'El Sol',maxTargets:3,effect:'suit',suit:'H'},
 {catalogId:'c_world',name:'El Mundo',maxTargets:3,effect:'suit',suit:'S'}
].map(item=>Object.freeze(item)) as TarotTargetDefinition[]);
export function tarotDefinition(catalogId:string):TarotTargetDefinition|undefined{
 return TAROT_TARGETS.find(definition=>definition.catalogId===catalogId);
}
export const tarotUseDefinition=(id:string)=>tarotDefinition(id)??moneyTarotDefinition(id);
export interface TarotCardChange{cardId:string;before:Card;after:Card}
export interface TarotChange{state:GameStateV02;limitations:string[];cardChanges:TarotCardChange[];steps:GameStateV02[];moneyChange?:MoneyTarotChange}

function distinctIds(ids:readonly string[],path:string){
 if(new Set(ids).size!==ids.length)fail(path,'duplicate_id','Selecciona cada carta una sola vez.');
}
function heldCards(state:Extract<GameStateV02,{phase:'in_round'}>):string[]{
 const held=need(state.phaseData.heldCardIds,'$.phaseData.heldCardIds');distinctIds(held,'$.phaseData.heldCardIds');
 const available=new Set(deckCards(state).map(card=>card.instanceId));
 for(const id of held)if(!available.has(id))fail('$.phaseData.heldCardIds','unknown_card','La carta de la mano no existe en el mazo: '+id+'.');
 const size=state.observed.resources.handSize;
 if(size.status==='known'&&held.length>size.value)fail('$.phaseData.heldCardIds','hand_too_large','La mano observada supera el tamaño registrado. Corrige los datos explícitamente.');
 return held;
}
/** Every enhancement/suit change refreshes Blind:debuff_card in L12. Never retain a stale flag. */
function guardDebuffRefresh(state:Extract<GameStateV02,{phase:'in_round'}>){
 const active=need(state.phaseData.blind,'$.phaseData.blind');
 if(active.kind!=='boss'){
  // The active phase already establishes a Small/Big blind. Unknown target,
  // reward, or the entire nextBlind observation cannot create a boss here.
  const observed=state.observed.nextBlind;
  if(observed.status==='known'&&observed.value.bossId.status==='known'&&observed.value.bossId.value!=='none')fail('$.observed.nextBlind.bossId','invalid_blind','Una ciega pequeña o grande no puede tener un jefe activo.');
  return;
 }
 const context=need(state.observed.jokerContext!,'$.observed.jokerContext');
 if(context.bossDisabled?.status==='known'&&context.bossDisabled.value)return;
 const blind=need(state.observed.nextBlind,'$.observed.nextBlind');
 // These four bosses never debuff cards, regardless of their enabled status.
 if(blind.bossId.status==='known'&&['the_psychic','the_water','the_wall','violet_vessel'].includes(blind.bossId.value))return;
 if(context.bossDisabled){
  if(need(context.bossDisabled,'$.observed.jokerContext.bossDisabled'))return;
 }else if(bossDisabled(state,need(state.observed.jokers,'$.observed.jokers')))return;
 need(blind.bossId,'$.observed.nextBlind.bossId');
 fail('$.observed.nextBlind.bossId','unsupported_debuff_refresh','Este jefe puede cambiar el debilitamiento al transformar cartas. Falta implementar esa actualización; puedes registrar la mano sin usar el Tarot.');
}

/** Shared exact effect. The caller owns a detached state, the real source,
 * legal phase/debuff context, source removal, and its single revision update.
 * A pack source is event metadata only: it is never inserted into inventory. */
export function applyTargetedTarotUse(state:GameStateV02,used:Consumable,targetCardIds:readonly string[],availableCardIds:readonly string[],trace:Trace[],use:(id:string)=>void,limitations:string[]):TarotCardChange[]{
 use('tarot.targets');
 const definition=tarotDefinition(used.catalogId);
 if(!definition||used.kind!=='tarot')fail('$action.instanceId','unsupported_tarot','Esta acción solo admite los doce Tarot dirigidos de DECK04a.');
 if(used.handId!==undefined)fail('$action.instanceId','incompatible_consumable','Un Tarot no puede identificar una mano Planet.');
 distinctIds(targetCardIds,'$action.targetCardIds');distinctIds(availableCardIds,'$hand.cardIds');
 if(targetCardIds.length<1||targetCardIds.length>definition.maxTargets)fail('$action.targetCardIds','invalid_target_count',definition.name+' necesita entre 1 y '+definition.maxTargets+' cartas objetivo.');
 const cards=deckCards(state),byId=new Map(cards.map(card=>[card.instanceId,card])),available=new Set(availableCardIds);
 for(const id of available)if(!byId.has(id))fail('$hand.cardIds','unknown_card','La carta de mano no existe en el mazo: '+id+'.');
 for(const id of targetCardIds){
  if(!byId.has(id))fail('$action.targetCardIds','unknown_card','La carta no existe en el mazo: '+id+'.');
  if(!available.has(id))fail('$action.targetCardIds','card_not_held','La carta '+id+' no figura en la mano observada. No se puede elegir una carta arbitraria del mazo.');
 }
 recordTarotUse(state,used,targetCardIds.map(id=>byId.get(id)!),trace,use,limitations);
 const changes:TarotCardChange[]=[];
 for(const id of targetCardIds){
  const card=byId.get(id)!,before=structuredClone(card);
  if(definition.effect==='enhancement')card.enhancement=definition.enhancement;
  else card.suit=definition.suit;
  card.debuff=false;
  changes.push({cardId:id,before,after:structuredClone(card)});
  trace.push({ruleId:'tarot.targets',label:definition.name+' · transformación de carta',values:{instanceId:used.instanceId,cardId:id,property:definition.effect,before:definition.effect==='enhancement'?before.enhancement:before.suit,after:definition.effect==='enhancement'?card.enhancement:card.suit,debuffBefore:String(before.debuff??false),debuffAfter:'false'}});
 }
 state.observed.deck=valueFact({cards});
 limitations.push('Transformaciones respaldadas por inspección del ejecutable; todavía sin contraste directo en partida.','Se conservaron identidad, rango, edición, sello y fichas permanentes; cambiar mejora sustituye la anterior. El uso no puntúa una mano ni cobra efectos al final de ronda.');
 return changes;
}

/** Pure projected clone. Only T09b may persist a user-confirmed action. */
export function applyTarotAction(input:unknown,action:TarotAction,mutation:Mutation,options:EngineOptions={}):EngineResult<TarotChange>{
 return run<TarotChange>([],options,(trace,use)=>{
  const checked=checkJsonValue(action);if(!checked.length)tarotActionSchema.check(action,'$action',checked);
  if(checked.length){const first=checked[0]!;fail(first.path,first.code,first.message);}
  const loaded=stateInput(input,use,['in_round','shop']);
  if(loaded.schemaVersion!=='0.2')fail('$.schemaVersion','unsupported_schema','La mano observada y los Tarot dirigidos requieren el formato 0.2.');
  const state=loaded;
  if(!mutation||mutation.expectedRevision!==state.revision)fail('$.revision','stale_revision','La partida cambió; recarga antes de registrar la acción.');
  const limitations:string[]=[],cardChanges:TarotCardChange[]=[];
  let moneyChange:MoneyTarotChange|undefined;
  if(action.type==='observe_round_hand'){
   if(state.phase!=='in_round')fail('$.phase','wrong_phase','Registra la mano durante una ronda.');
   const cards=deckCards(state),byId=new Map(cards.map(card=>[card.instanceId,card]));
   distinctIds(action.cardIds,'$action.cardIds');
   for(const id of action.cardIds)if(!byId.has(id))fail('$action.cardIds','unknown_card','La carta no existe en el mazo registrado: '+id+'.');
   const size=state.observed.resources.handSize;
   if(size.status==='known'&&action.cardIds.length>size.value)fail('$action.cardIds','hand_too_large','La mano observada supera el tamaño registrado. Corrige los datos explícitamente.');
   if(size.status==='unknown')limitations.push('Tamaño de mano desconocido: no se comprobó su límite; se registran únicamente las cartas que confirmaste visibles.');
   state.phaseData.heldCardIds=valueFact(structuredClone(action.cardIds));
   trace.push({ruleId:'state.observation',label:'Cartas visibles de la mano registradas',values:{cardIds:action.cardIds.join(', '),count:action.cardIds.length}});
   limitations.push('La observación no infiere robos, orden de robo, cartas jugadas ni cartas descartadas.');
  }else{
   const fact=state.observed.jokerContext;if(!fact)fail('$.observed.jokerContext','unknown_data','Falta el inventario de consumibles.');
   const context=need(fact,'$.observed.jokerContext');
   if(!context.consumables)fail('$.observed.jokerContext.consumables','unknown_data','Falta el inventario de consumibles.');
   const items=need(context.consumables,'$.observed.jokerContext.consumables'),index=items.findIndex(item=>item.instanceId===action.instanceId);
   if(index<0)fail('$action.instanceId','missing_consumable','El Tarot indicado no está en el inventario registrado.');
   const used=items[index]!;
   if(moneyTarotDefinition(used.catalogId))moneyChange=applyMoneyTarotUse(state,used,action.targetCardIds,trace,use,limitations);
   else{
    if(state.phase!=='in_round')fail('$.phase','wrong_phase','Los Tarot dirigidos propios requieren una mano observada en ronda.');
    const held=heldCards(state);guardDebuffRefresh(state);
    cardChanges.push(...applyTargetedTarotUse(state,used,action.targetCardIds,held,trace,use,limitations));
   }
   items.splice(index,1);
   trace.push({ruleId:moneyChange?'tarot.money':'tarot.targets',label:'Tarot propio usado y retirado',values:{instanceId:used.instanceId,catalogId:used.catalogId,targets:action.targetCardIds.length}});
  }
  state.revision=safe(state.revision+1,'$.revision');state.updatedAt=mutation.updatedAt;
  const validated=validateState(state);if(!validated.ok){const first=validated.errors[0]!;fail(first.path,first.code,first.message);}
  return{state:validated.value as GameStateV02,limitations,cardChanges,steps:[structuredClone(validated.value as GameStateV02)],...(moneyChange?{moneyChange}:{})};
 });
}
