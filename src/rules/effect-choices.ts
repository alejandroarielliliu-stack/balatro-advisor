import type {GameState} from '../state/model.js';
import type {EffectChoice} from './full-joker-contract.js';
import type {Trace} from './core.js';
import {fail,need} from './core.js';

export const randomRule='jokers.random';
export interface ChoiceInput {state:GameState;choices?:readonly EffectChoice[];trace:Trace[];use:(id:string)=>void}
/** Choices are scoped to one event/hand. Activation starts at 1 and includes retriggers. */
export function effectKey(stage:string,catalogId:string,instanceId:string,cardId='-',activation=1):string {
  return [stage,catalogId,instanceId,cardId,activation].join(':');
}
function findChoice(input:ChoiceInput,key:string):EffectChoice|undefined {
  const choices=input.choices?.filter(choice=>choice.key===key)??[];
  if(choices.length>1)fail('$choices.'+key,'duplicate_outcome','El resultado de un efecto está indicado más de una vez.');
  const choice=choices[0];
  if(choice&&(!['known','hypothetical'].includes(choice.knowledge)||typeof choice.basis!=='string'||!choice.basis.trim()))
    fail('$choices.'+key,'invalid_outcome','Indica si el resultado es conocido o hipotético y su evidencia o supuesto.');
  return choice;
}
export function requireChoice(input:ChoiceInput,key:string,kind:EffectChoice['kind']):EffectChoice {
  input.use(randomRule);
  const choice=findChoice(input,key);
  if(!choice)fail('$choices.'+key,'needs_outcome',`Falta un resultado explícito de ${kind} para ${key}; no se sustituye por un promedio ni se genera azar.`);
  if(choice.kind!==kind)fail('$choices.'+key,'invalid_outcome',`Este efecto necesita un resultado ${kind}.`);
  input.trace.push({ruleId:randomRule,label:'Resultado explícito de efecto',values:{key,kind,knowledge:choice.knowledge,basis:choice.basis}});
  return choice;
}
/** Oops doubles probability numerators, including destruction risks; never changes Misprint's integer range. */
export function probabilityMultiplier(state:GameState):number {
  return 2**need(state.observed.jokers,'$.observed.jokers').filter(j=>j.catalogId==='oops').length;
}
/** An uncertain effect needs a concrete boolean branch. Certain effects need no branch. */
export function booleanChance(input:ChoiceInput,key:string,denominator:number):boolean {
  if(!Number.isSafeInteger(denominator)||denominator<1)fail('$choices.'+key,'invalid_probability','El denominador de una probabilidad debe ser un entero positivo.');
  input.use(randomRule);
  const numerator=probabilityMultiplier(input.state), certain=numerator>=denominator;
  const supplied=findChoice(input,key);
  let value:boolean;
  if(certain){
    if(supplied&&(supplied.kind!=='boolean'||supplied.value!==true))fail('$choices.'+key,'contradictory_outcome','El efecto es seguro con los modificadores actuales; un fallo sería incompatible.');
    value=true;
  }else{
    const choice=requireChoice(input,key,'boolean');
    if(typeof choice.value!=='boolean')fail('$choices.'+key,'invalid_outcome','El resultado de esta tirada debe ser true o false.');
    value=choice.value;
  }
  input.trace.push({ruleId:randomRule,label:'Rama concreta de efecto aleatorio',values:{key,numerator,denominator,result:value?'success':'failure',source:certain?'certain':supplied!.knowledge}});
  return value;
}
