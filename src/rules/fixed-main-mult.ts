import {SCORING_EFFECTS} from '../catalog/initial.js';

/** Own main-phase bonus only. Not a net score delta, activation or survival claim. */
export function fixedMainMult(catalogId:string,physicalJokers:number):number|null {
 if(catalogId==='joker')return SCORING_EFFECTS.jokerMult;
 if(catalogId==='abstract_joker')return SCORING_EFFECTS.abstractPerJoker*physicalJokers;
 return null;
}
