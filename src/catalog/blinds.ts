import {blindBase} from './initial.js';
import {deckDefinition} from './decks.js';
/** Existing White Stake / ante 1–8 model. Static evidence, not a game observation. */
export function blindRequirement(ante:number,kind:string,boss:string,deckId:string){
 const invalid=(code:string,message:string,path:string)=>({ok:false as const,error:{code,message,path}});
 const base=blindBase(ante);
 if(!Number.isInteger(ante)||base===undefined)return invalid('outside_goal','Solo antes 1–8.','$.observed.nextBlind.ante');
 const deck=deckDefinition(deckId);
 if(!deck)return invalid('unsupported_context','Baraja fuera del cálculo compatible.','$.observed.deckId');
 let multiplier:number,reward:number;
 if(kind==='boss'){
  if(!['the_psychic','the_water','the_wall','violet_vessel'].includes(boss))return invalid('unsupported_blind','Selecciona un jefe compatible o introduce el objetivo manualmente.','$.observed.nextBlind.bossId');
  if((boss==='the_water'||boss==='the_wall')&&ante<2||(boss==='violet_vessel')!==(ante===8))return invalid('invalid_blind','Jefe fuera del ante admitido.','$.observed.nextBlind');
  multiplier=boss==='the_wall'?4:boss==='violet_vessel'?6:2;reward=boss==='violet_vessel'?8:5;
 }else if(kind==='small'||kind==='big'){
  if(boss!=='none')return invalid('invalid_blind','Small/Big deben indicar bossId=none.','$.observed.nextBlind.bossId');
  multiplier=kind==='small'?1:1.5;reward=kind==='small'?3:4;
 }else return invalid('unknown_blind','Selecciona la próxima ciega.','$.observed.nextBlind.kind');
 return {ok:true as const,target:base*multiplier*deck.blindMultiplier,reward,base,multiplier,deckMultiplier:deck.blindMultiplier};
}
