import {array,boolean,checkJsonValue,enumeration,integer,object,text,union} from './schema.js';
import {cardSchema,jokerSchema,consumableSchema} from './model.js';
import type {EffectChoice} from '../rules/full-joker-contract.js';
import type {Result} from './model.js';
export const effectChoiceSchema=object({key:text(1000),kind:enumeration('boolean','integer','card','joker','consumable','target'),value:union(boolean,union(integer(),union(text(1000),union(cardSchema,union(jokerSchema,consumableSchema))))),knowledge:enumeration('known','hypothetical'),basis:text(2000)});
export function validateEffectChoices(input:unknown):Result<EffectChoice[]>{
 const errors=checkJsonValue(input);if(!errors.length)array(effectChoiceSchema,2000).check(input,'$choices',errors);
 if(errors.length)return {ok:false,errors};
 const choices=structuredClone(input) as EffectChoice[];
 if(new Set(choices.map(c=>c.key)).size!==choices.length)return {ok:false,errors:[{path:'$choices',code:'duplicate_outcome',message:'Un efecto tiene dos resultados para el mismo evento.'}]};
 return {ok:true,value:choices};
}
