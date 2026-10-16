import {HAND_BASES} from '../catalog/initial.js';
import type {Card,HandId} from '../catalog/initial.js';
import {randomJoker} from '../catalog/random-jokers.js';
import type {GameState,JokerInstance} from '../state/model.js';
import {fail,need,safe,valueFact} from './core.js';
import {booleanChance,effectKey,randomRule,requireChoice} from './effect-choices.js';
import type {Consumable,EffectBonus,FullEventInput,FullJokerInput} from './full-joker-contract.js';

/** game.lua 2002–2013: chips/Mult added per hand level. */
export const HAND_LEVEL_DELTAS:Readonly<Record<HandId,readonly [number,number]>>={
  high_card:[10,1],pair:[15,1],two_pair:[20,1],three_kind:[20,2],straight:[30,3],flush:[15,2],
  full_house:[25,2],four_kind:[30,3],straight_flush:[40,4],five_kind:[35,3],flush_house:[40,4],flush_five:[50,3]
};
function jokerContext(state:GameState) {
  const fact=state.observed.jokerContext;
  if(!fact)fail('$.observed.jokerContext','unknown_data','Falta el contexto de consumibles del comodín.');
  return need(fact,'$.observed.jokerContext');
}
function isFace(card:Card,physical:readonly JokerInstance[]):boolean {
  return physical.some(j=>j.catalogId==='pareidolia')||card.enhancement!=='stone'&&['J','Q','K'].includes(card.rank);
}
function isHeart(card:Card,physical:readonly JokerInstance[]):boolean {
  return card.enhancement!=='stone'&&(card.enhancement==='wild'||card.suit==='H'||card.suit==='D'&&physical.some(j=>j.catalogId==='smeared'));
}
export function levelUp(state:GameState,hand:HandId):void {
  const bases=need(state.observed.handBases,'$.observed.handBases');
  const base=(id:HandId)=>{const [chips,mult]=HAND_BASES[id];return valueFact({level:1,chips,mult});};
  const values='preset' in bases
    ?{high_card:base('high_card'),pair:base('pair'),two_pair:base('two_pair'),three_kind:base('three_kind'),straight:base('straight'),flush:base('flush'),full_house:base('full_house'),four_kind:base('four_kind'),straight_flush:base('straight_flush'),five_kind:base('five_kind'),flush_house:base('flush_house'),flush_five:base('flush_five')}
    :bases.values;
  if('preset' in bases&&bases.preset!=='all-standard-level1')fail('$.observed.handBases','unsupported_preset','Space Joker requiere niveles de mano explícitos o el preset nivel 1.');
  const selected=values[hand];
  if(!selected)fail('$.observed.handBases.values.'+hand,'unknown_data','Falta el nivel de la mano que subiría Space Joker.');
  const old=need(selected,'$.observed.handBases.values.'+hand), [baseChips,baseMult]=HAND_BASES[hand], [deltaChips,deltaMult]=HAND_LEVEL_DELTAS[hand];
  if(old.chips!==Math.max(0,baseChips+(old.level-1)*deltaChips)||old.mult!==Math.max(1,baseMult+(old.level-1)*deltaMult))
    fail('$.observed.handBases.values.'+hand,'inconsistent_hand_level','El nivel y los factores registrados no coinciden con la progresión del juego; corrige esos datos antes de subir el nivel.');
  const level=safe(old.level+1);
  values[hand]=valueFact({level,chips:safe(baseChips+(level-1)*deltaChips),mult:safe(baseMult+(level-1)*deltaMult)});
  // Both branches contain all nine required categories; optional hidden categories stay optional on explicit input.
  state.observed.handBases=valueFact({values});
}
const TAROTS=new Set(['c_fool','c_magician','c_high_priestess','c_empress','c_emperor','c_hierophant','c_lovers','c_chariot','c_justice','c_hermit','c_wheel_of_fortune','c_strength','c_hanged_man','c_death','c_temperance','c_devil','c_tower','c_star','c_moon','c_sun','c_judgement','c_world']);
function concreteTarot(input:FullJokerInput,key:string,current:readonly Consumable[]):Consumable {
  const choice=requireChoice(input,key,'consumable'),c=choice.value;
  if(typeof c!=='object'||!('kind' in c)||c.kind!=='tarot'||!('catalogId' in c)||!TAROTS.has(c.catalogId)||!('instanceId' in c)||typeof c.instanceId!=='string'||!c.instanceId.trim()||!('edition' in c)||c.edition!=='base'||!('sellValue' in c)||!Number.isSafeInteger(c.sellValue)||c.sellValue<0)
    fail('$choices.'+key,'invalid_generated_consumable','8 Ball necesita un Tarot concreto base con ID único y valor de venta válido.');
  if(current.some(existing=>existing.instanceId===c.instanceId)||input.physical.some(j=>j.instanceId===c.instanceId))
    fail('$choices.'+key,'duplicate_generated_id','El Tarot generado no puede reutilizar un ID existente.');
  return structuredClone(c);
}

/** Called after classification, before the hand's base factors are read. */
export function randomBefore(input:FullJokerInput):void {
  for(const j of input.effective)randomBeforeJoker(input,j);
}
/** Per-joker hook lets the caller preserve order alongside Vampire and Midas Mask. */
export function randomBeforeJoker(input:FullJokerInput,j:JokerInstance):void {
  if(j.catalogId==='space'){
    if(booleanChance(input,effectKey('before',j.catalogId,j.instanceId),4)){
      levelUp(input.state,input.hand);
      input.trace.push({ruleId:randomRule,label:'Space Joker sube la mano antes de puntuar',values:{instanceId:j.instanceId,hand:input.hand,levelsAdded:1}});
    }
  }
}
/** Activation is 1 for the original scoring and increments for each retrigger. */
export function randomCard(input:FullJokerInput,j:JokerInstance,card:Card,activation:number):EffectBonus {
  if(!randomJoker(j.catalogId))return {};
  if(j.catalogId==='business'&&isFace(card,input.physical))
    return booleanChance(input,effectKey('card',j.catalogId,j.instanceId,card.instanceId,activation),2)?{money:2}:{};
  if(j.catalogId==='bloodstone'&&isHeart(card,input.physical))
    return booleanChance(input,effectKey('card',j.catalogId,j.instanceId,card.instanceId,activation),2)?{xmult:1.5}:{};
  if(j.catalogId==='8_ball'&&card.rank==='8'&&card.enhancement!=='stone'){
    const ctx=jokerContext(input.state),consumables=ctx.consumables,slots=ctx.consumableSlots;
    if(!consumables||!slots)fail('$.observed.jokerContext','unknown_data','8 Ball necesita los consumibles y sus espacios para comprobar capacidad.');
    const current=need(consumables,'$.observed.jokerContext.consumables'),limit=need(slots,'$.observed.jokerContext.consumableSlots');
    if(current.filter(c=>c.edition!=='negative').length>=limit)return {};
    const key=effectKey('card',j.catalogId,j.instanceId,card.instanceId,activation);
    if(booleanChance(input,key,4)){
      const generated=concreteTarot(input,key+':created',current);
      ctx.consumables=valueFact([...current,generated]);
      input.trace.push({ruleId:randomRule,label:'8 Ball genera el Tarot explícito',values:{instanceId:j.instanceId,cardId:card.instanceId,catalogId:generated.catalogId,consumableId:generated.instanceId}});
    }
  }
  return {};
}
export function randomHeld(input:FullJokerInput,j:JokerInstance,card:Card,activation:number):EffectBonus {
  if(j.catalogId==='reserved_parking'&&isFace(card,input.physical))
    return booleanChance(input,effectKey('held',j.catalogId,j.instanceId,card.instanceId,activation),2)?{money:1}:{};
  return {};
}
/** Applied in the normal joker-main order, not in the per-card stage. */
export function randomMain(input:FullJokerInput,j:JokerInstance):EffectBonus {
  if(j.catalogId==='gros_michel'){input.use(randomRule);return {mult:15};}
  if(j.catalogId==='cavendish'){input.use(randomRule);return {xmult:3};}
  if(j.catalogId==='misprint'){
    const key=effectKey('main',j.catalogId,j.instanceId),choice=requireChoice(input,key,'integer');
    if(typeof choice.value!=='number'||!Number.isSafeInteger(choice.value)||choice.value<0||choice.value>23)
      fail('$choices.'+key,'invalid_outcome','Misprint necesita un entero explícito entre 0 y 23 inclusive.');
    return {mult:choice.value};
  }
  return {};
}
/** Destruction is physical and happens at end-round, never on a Blueprint copy. */
export function randomEvent(input:FullEventInput):void {
  if(input.stage!=='end_round')return;
  const physical=need(input.state.observed.jokers,'$.observed.jokers');
  const removed=new Set<string>();
  for(const j of physical)if(j.catalogId==='gros_michel'||j.catalogId==='cavendish'){
    const destroyed=booleanChance(input,effectKey('end_round',j.catalogId,j.instanceId),j.catalogId==='gros_michel'?6:1000);
    if(destroyed){
      removed.add(j.instanceId);
      if(j.catalogId==='gros_michel'){
        const fact=input.state.observed.jokerContext;
        const ctx=fact?need(fact,'$.observed.jokerContext'):{};
        ctx.grosMichelExtinct=valueFact(true);
        input.state.observed.jokerContext=valueFact(ctx);
      }
    }
    input.trace.push({ruleId:randomRule,label:destroyed?'Comodín destruido al terminar la ronda':'Comodín conservado al terminar la ronda',values:{catalogId:j.catalogId,instanceId:j.instanceId}});
  }
  if(removed.size)input.state.observed.jokers=valueFact(physical.filter(j=>!removed.has(j.instanceId)));
}
