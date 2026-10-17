import type {HandId} from '../catalog/initial.js';
import type {GameState} from '../state/model.js';
import type {Consumable,EffectChoice} from './full-joker-contract.js';
import type {Trace} from './core.js';
import {fail} from './core.js';
import {generationEvent} from './generation-jokers.js';
import {levelUp} from './random-jokers.js';

export const PLANET_HANDS:Readonly<Record<string,HandId>>={c_mercury:'pair',c_venus:'three_kind',c_earth:'full_house',c_mars:'four_kind',c_jupiter:'flush',c_saturn:'straight',c_uranus:'two_pair',c_neptune:'straight_flush',c_pluto:'high_card',c_planet_x:'five_kind',c_ceres:'flush_house',c_eris:'flush_five'};
/** A Planet's own effect and use hooks; the caller owns source removal and revision. */
export function applyPlanetUse(state:GameState,used:Consumable,trace:Trace[],use:(id:string)=>void,choices?:EffectChoice[]):void{
 const hand=PLANET_HANDS[used.catalogId];
 if(used.kind!=='planet'||!hand||used.handId!==undefined&&used.handId!==hand)fail('$planet','incompatible_planet','La identidad del Planet no coincide con la mano que mejora.');
 generationEvent({state,stage:'use_consumable',cards:[],consumable:used,trace,use,...(choices?{choices}:{})});
 use('jokers.random');levelUp(state,hand);
 trace.push({ruleId:'jokers.random',label:'Planet mejora la mano indicada por su identidad',values:{catalogId:used.catalogId,hand,levelsAdded:1}});
}
