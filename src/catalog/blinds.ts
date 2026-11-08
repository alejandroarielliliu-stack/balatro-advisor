import {blindBase} from './initial.js';
import {deckDefinition} from './decks.js';
import {bossDefinition} from './bosses.js';

/** Numerical metadata does not establish implementation of the boss's effects. */
export const implementedBossEffects=(id:string):boolean=>['the_psychic','the_water','the_wall','violet_vessel'].includes(id);

/** White Stake / ante 1–8 targets and base rewards. Static evidence, not a game observation.
 * Exact scoring callers must separately check implementedBossEffects. */
export function blindRequirement(ante:number,kind:string,boss:string,deckId:string){
 const invalid=(code:string,message:string,path:string)=>({ok:false as const,error:{code,message,path}});
 const base=blindBase(ante);
 if(!Number.isInteger(ante)||base===undefined)return invalid('outside_goal','Solo antes 1–8.','$.observed.nextBlind.ante');
 const deck=deckDefinition(deckId);
 if(!deck)return invalid('unsupported_context','Baraja fuera del cálculo compatible.','$.observed.deckId');
 let multiplier:number,reward:number;
 if(kind==='boss'){
  const definition=bossDefinition(boss);
  if(!definition)return invalid('unsupported_blind','Selecciona un jefe del catálogo compatible o introduce el objetivo manualmente.','$.observed.nextBlind.bossId');
  if(definition.showdown?ante!==8:ante<definition.minAnte||ante===8)return invalid('invalid_blind','Este jefe no aparece en el ante indicado dentro del recorrido normal de antes 1–8.','$.observed.nextBlind');
  multiplier=definition.multiplier;reward=definition.reward;
 }else if(kind==='small'||kind==='big'){
  if(boss!=='none')return invalid('invalid_blind','Small/Big deben indicar bossId=none.','$.observed.nextBlind.bossId');
  multiplier=kind==='small'?1:1.5;reward=kind==='small'?3:4;
 }else return invalid('unknown_blind','Selecciona la próxima ciega.','$.observed.nextBlind.kind');
 return {ok:true as const,target:base*multiplier*deck.blindMultiplier,reward,base,multiplier,deckMultiplier:deck.blindMultiplier};
}
