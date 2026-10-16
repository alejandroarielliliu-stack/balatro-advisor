import {GAME_VERSION} from '../catalog/initial.js';
import type {GameState,Issue} from '../state/model.js';
import {validateState} from '../state/validation.js';
import {applyShopAction} from '../rules/shop.js';
import type {Mutation} from '../rules/shop.js';

/** A Mesa draft transition, never a confirmation or storage write.
 * Unknown compatibility facts use the target model only for this calculation;
 * those assumptions are returned explicitly and never become observed facts.
 * Known incompatible facts, missing money and unsupported effects still fail H2.
 */
export function previewMesaSale(input:unknown,instanceId:string,mutation:Mutation){
 const checked=validateState(input);
 if(!checked.ok)return {ok:false as const,errors:checked.errors};
 const original=checked.value,model=structuredClone(original),assumptions:string[]=[];
 const o=model.observed;
 if(o.gameVersion.status==='unknown'){o.gameVersion={status:'known',source:'manual',value:GAME_VERSION};assumptions.push(`Modelo ${GAME_VERSION}; versión sin confirmar.`);}
 if(o.gamePlatform.status==='unknown'){o.gamePlatform={status:'known',source:'manual',value:'pc-steam'};assumptions.push('Modelo Steam PC; plataforma sin confirmar.');}
 if(o.stakeId.status==='unknown'){o.stakeId={status:'known',source:'manual',value:'white'};assumptions.push('Modelo White Stake; dificultad sin confirmar.');}
 if(o.modsPresent.status==='unknown'){o.modsPresent={status:'known',source:'manual',value:false};assumptions.push('Modelo sin mods; presencia de mods sin confirmar.');}
 const changed=applyShopAction(model,{type:'sell',instanceId},mutation);
 if(!changed.ok)return {ok:false as const,errors:changed.errors as Issue[]};
 const state:GameState=changed.value.state;
 for(const key of ['gameVersion','gamePlatform','stakeId','modsPresent'] as const){
  // Assign each separately to preserve the Fact<T> discriminated types.
  if(key==='modsPresent')state.observed.modsPresent=structuredClone(original.observed.modsPresent);
  else state.observed[key]=structuredClone(original.observed[key]);
 }
 return {ok:true as const,state,assumptions,trace:changed.trace,evidence:changed.evidence};
}
