import {Hand} from './vendor/efhiii-sim.js';
import {GAME_VERSION,HAND_BASES,RANKS} from '../catalog/initial.js';
import type {Card,HandId} from '../catalog/initial.js';
import type {Fact,GameState,JokerInstance} from '../state/model.js';
import type {HandInput} from '../rules/scoring.js';
import {deckCards} from '../rules/core.js';
import {HAND_LEVEL_DELTAS} from '../rules/random-jokers.js';

export const EFHIII_SOURCE='EFHIII/balatro-calculator@55322d59197ba08c16874a54b59ac0d443c8ab32 (MIT)';
export interface EfhiiiScore {supported:boolean;score?:number;chips?:number;mult?:number;reason?:string;source:string}
/** Explicit deterministic overlap. Other jokers continue through the local game/event engine. */
export const EFHIII_JOKER_IDS:Readonly<Record<string,number>>={
 joker:0,half_joker:7,abstract_joker:33,even_steven:38,scholar:63,banner:21,green_joker:112,golden_joker:29,
 greedy_joker:16,lusty_joker:17,wrathful_joker:18,gluttenous_joker:19,jolly:2,zany:3,mad:4,crazy:5,droll:6,
 sly:140,wily:141,clever:142,devious:143,crafty:144,fibonacci:51,scary_face:32,odd_todd:39,smiley:156,walkie_talkie:158,
 duo:45,trio:46,family:47,order:48,tribe:49,seeing_double:44,flower_pot:60,splash:106,
 stencil:52,mime:14,dusk:74,raised_fist:28,hack:25,pareidolia:36,blackboard:102,baron:126,photograph:132,
 juggler:10,drunkard:11,acrobat:12,sock_and_buskin:13,troubadour:20,hanging_chad:69,blueprint:30,
 merry_andy:8,stuntman:68,brainstorm:77,shoot_the_moon:62,ride_the_bus:61,runner:103,ice_cream:104,
 square:119,popcorn:151,trousers:154,ramen:152,selzer:153,wee:40,hit_the_road:58,yorick:85,
 four_fingers:66,steel_joker:27,shortcut:123,smeared:64,drivers_license:70,blue_joker:107,baseball:146
};
const CATEGORIES:HandId[]=['flush_five','flush_house','five_kind','straight_flush','four_kind','full_house','flush','straight','three_kind','two_pair','pair','high_card'];
const SUITS={H:0,C:1,D:2,S:3} as const;
const EDITIONS:Readonly<Record<string,number>>={base:0,foil:1,holo:2,holographic:2,polychrome:3,negative:4};
const ENHANCEMENTS:Readonly<Record<string,number>>={none:0,bonus:1,mult:2,wild:3,steel:5,stone:6,gold:7};
function factValue<T>(fact:Fact<T>|undefined,label:string):T {
 if(!fact||fact.status!=='known')throw new Error(`EFHIII necesita ${label} conocido.`);return fact.value;
}
function finite(value:number,label:string):number {
 if(!Number.isFinite(value)||value<0||value>Number.MAX_SAFE_INTEGER)throw new Error(`EFHIII: ${label} fuera del rango numérico compatible.`);return value;
}
function counter(j:JokerInstance,key:string):number {return finite(factValue(j.counters[key],`${j.catalogId}.${key}`),key);}
function units(value:number,unit:number,label:string):number {
 const n=value/unit;if(!Number.isSafeInteger(n))throw new Error(`EFHIII no representa exactamente el contador ${label}.`);return n;
}
function encodeCard(card:Card):number[] {
 const rank=RANKS.indexOf(card.rank),edition=EDITIONS[card.edition],enhancement=ENHANCEMENTS[card.enhancement];
 if(rank<0||edition===undefined||enhancement===undefined)throw new Error(`EFHIII fuera de cobertura para ${card.instanceId}: ${card.enhancement}/${card.edition}.`);
 if(!['none','red'].includes(card.seal))throw new Error(`EFHIII: sello ${card.seal} pendiente de equivalencia en este adaptador.`);
 return [rank,SUITS[card.suit],edition,enhancement,card.seal==='red'?2:0,finite(card.extraChips,'fichas permanentes'),card.debuff?1:0];
}
function jokerValue(j:JokerInstance,physical:readonly JokerInstance[],deck:readonly Card[],state:GameState,input:HandInput):number {
 const final=()=>{if(!Number.isSafeInteger(input.handsRemaining)||input.handsRemaining!<0)throw new Error('EFHIII necesita manos restantes después de jugar.');return input.handsRemaining===0?1:0;};
 switch(j.catalogId){
  case 'banner':return input.discardsRemaining;
  case 'green_joker':return counter(j,'greenMult');
  case 'acrobat':case 'dusk':return final();
  case 'stencil':return Math.max(1,factValue(state.observed.resources.jokerSlots,'espacios de comodín')-physical.length+physical.filter(j=>j.catalogId==='stencil').length)-1;
  case 'steel_joker':return deck.filter(c=>c.enhancement==='steel').length;
  case 'drivers_license':return deck.filter(c=>c.enhancement!=='none').length;
  case 'ride_the_bus':case 'popcorn':case 'trousers':{
   const mult=counter(j,'mult');return j.catalogId==='popcorn'?units(20-mult,4,'Popcorn'):j.catalogId==='trousers'?units(mult,2,'Trousers'):mult;
  }
  case 'runner':return units(counter(j,'chips'),15,'Runner');
  case 'square':return units(counter(j,'chips'),4,'Square');
  case 'wee':return units(counter(j,'chips'),8,'Wee');
  case 'ice_cream':return units(100-counter(j,'chips'),5,'Ice Cream');
  case 'ramen':return 200-counter(j,'x100');
  case 'hit_the_road':return units(counter(j,'x100')-100,50,'Hit the Road');
  case 'yorick':return counter(j,'x100')/100;
  case 'selzer':return 10-counter(j,'hands');
  case 'blue_joker':if(!input.remainingCardIds)throw new Error('EFHIII necesita las cartas restantes en el mazo de robo.');return input.remainingCardIds.length-52;
  default:return 0;
 }
}
/**
 * Real, local reuse of the pinned MIT engine. No fetch/eval/Worker RNG. Input is the snapshot
 * BEFORE local before-hand effects; both engines independently include compatible growth.
 * The caller retains local events/state/trace and may select this score only after agreement.
 */
export function verifyOrScoreEfhiii(state:GameState,input:HandInput):EfhiiiScore {
 try{
  if(factValue(state.observed.gameVersion,'versión')!==GAME_VERSION||factValue(state.observed.modsPresent,'mods'))throw new Error('EFHIII: versión o mods fuera de la cobertura contrastada.');
  const blind=factValue(state.observed.nextBlind,'ciega'),boss=factValue(blind.bossId,'jefe');
  if(!['none','the_wall','the_water','the_psychic','violet_vessel'].includes(boss))throw new Error(`EFHIII: jefe ${boss} requiere equivalencia específica; The Flint está excluido por discrepancia reproducida.`);
  if(input.choices?.length)throw new Error('EFHIII: esta entrega no adapta resultados aleatorios/eventos explícitos.');
  const physical=factValue(state.observed.jokers,'comodines');
  for(const j of physical)if(!Object.hasOwn(EFHIII_JOKER_IDS,j.catalogId))throw new Error(`EFHIII: ${j.catalogId} se evalúa en el motor local; su familia/eventos no están habilitados en el adaptador.`);
  const deck=deckCards(state);
  const select=(ids:readonly string[],label:string)=>{
   if(new Set(ids).size!==ids.length)throw new Error(`EFHIII: ${label} contiene cartas repetidas.`);
   return ids.map(id=>{const found=deck.find(c=>c.instanceId===id);if(!found)throw new Error(`EFHIII: carta desconocida ${id}.`);return found;});
  };
  if(!input.cardIds.length||input.cardIds.length>5)throw new Error('EFHIII: se necesita una mano legal de una a cinco cartas.');
  if(!Number.isSafeInteger(input.discardsRemaining)||input.discardsRemaining<0)throw new Error('EFHIII: faltan descartes restantes legales.');
  const played=select(input.cardIds,'mano jugada');
  const needsHeld=physical.some(j=>['mime','raised_fist','baron','shoot_the_moon','blackboard'].includes(j.catalogId))||deck.some(c=>c.enhancement==='steel');
  if(needsHeld&&!input.heldCardIds)throw new Error('EFHIII necesita las cartas retenidas explícitas; no presupone una mano vacía.');
  const held=select(input.heldCardIds??[],'mano retenida');
  if(held.some(c=>played.some(p=>p.instanceId===c.instanceId)))throw new Error('EFHIII: una carta no puede estar jugada y retenida.');
  if(held.length+played.length>factValue(state.observed.resources.handSize,'tamaño de mano'))throw new Error('EFHIII: cartas jugadas y retenidas superan el tamaño de mano.');
  if(input.remainingCardIds){const remaining=select(input.remainingCardIds,'mazo de robo');if(remaining.some(c=>[...played,...held].some(p=>p.instanceId===c.instanceId)))throw new Error('EFHIII: una carta no puede estar a la vez en mano y en el mazo de robo.');}
  const bases=factValue(state.observed.handBases,'niveles de mano');
  if('preset' in bases&&bases.preset!=='all-standard-level1')throw new Error('EFHIII: preset de niveles incompatible.');
  const hands=CATEGORIES.map(id=>{
   if('preset' in bases)return [1,0,0,0];
   const observed=bases.values[id];
   // A placeholder only fills an impossible category; it never supplies a possible hand's unknown level.
   if(!observed){
    const counts=Object.values(played.filter(c=>c.enhancement!=='stone').reduce<Record<string,number>>((a,c)=>{a[c.rank]=(a[c.rank]??0)+1;return a;},{})).sort((a,b)=>b-a);
    const possible=id==='flush_house'?(counts[0]??0)>=3&&(counts[1]??0)>=2:(counts[0]??0)>=5;
    if(!['five_kind','flush_house','flush_five'].includes(id)||possible)throw new Error('EFHIII: falta el nivel de '+id);return [1,0,0,0];
   }
   const base=factValue(observed,'nivel de '+id),[chips,mult]=HAND_BASES[id],[dc,dm]=HAND_LEVEL_DELTAS[id];
   if(!Number.isSafeInteger(base.level)||base.level<1||base.chips!==chips+dc*(base.level-1)||base.mult!==mult+dm*(base.level-1))throw new Error(`EFHIII: factores personalizados de ${id} no coinciden con su nivel.`);
   return [base.level,0,0,0];
  });
  const jokers=physical.map(j=>{
   const edition=EDITIONS[factValue(j.edition,'edición de '+j.catalogId)];if(edition===undefined||factValue(j.stickers,'stickers').length)throw new Error('EFHIII: edición o stickers fuera de equivalencia.');
   return [EFHIII_JOKER_IDS[j.catalogId]!,jokerValue(j,physical,deck,state,input),edition,0,factValue(j.sellValue,'venta de '+j.catalogId)];
  });
  const model=new Hand({cards:played.map(encodeCard),cardsInHand:held.map(encodeCard),jokers,hands,TheFlint:false,TheEye:false,PlasmaDeck:factValue(state.observed.deckId,'baraja')==='plasma',Observatory:false});
  model.randomMode=1;model.compileAll();
  const result=model.simulate(),scoreFloat=finite(result[0]*10**result[1],'puntuación'),score=Math.floor(scoreFloat);
  const chips=finite(Array.isArray(result[2])?result[2][0]*10**result[2][1]:result[2],'fichas');
  const mult=finite(result[3][0]*10**result[3][1],'Mult');
  if(!Number.isSafeInteger(score))throw new Error('EFHIII: puntuación fuera del rango de enteros seguros.');
  return {supported:true,score,chips,mult,source:EFHIII_SOURCE};
 }catch(error){return {supported:false,reason:error instanceof Error?error.message:'EFHIII no pudo evaluar esta mano compatible.',source:EFHIII_SOURCE};}
}
