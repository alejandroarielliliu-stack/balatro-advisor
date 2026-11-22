import {TAG_EFFECTS} from '../catalog/tag-effects.js';
import {tagDefinition} from '../catalog/tags.js';
import type {TagId} from '../catalog/tags.js';
import {HAND_NAMES} from '../catalog/initial.js';
import {observedOrbitalHand} from '../run/progress.js';
import type {BlindInfo} from '../run/progress.js';
import type {Fact,GameStateV02} from '../state/model.js';
import {assessSkipBudget} from './skip-tag-budget.js';
import {assessBossMatchup,assessBossScore,inferPrimaryHand} from './skip-tag-strategy.js';
import type {EvaluateBlindSurvival} from './skip-tag-strategy.js';
import type {BlindSurvivalEstimate} from './next-blind-survival.js';

const fixedPlayReasons:Readonly<Partial<Record<TagId,string>>>={
 tag_foil:'Juega y conserva la tienda. La etiqueta laminada solo añade fichas a un joker futuro.',
 tag_polychrome:'Juega y conserva la tienda. La edición polícroma llega con un joker futuro.',
 tag_handy:'Handy solo aporta dinero. Juega para cobrar y visitar la tienda.',
 tag_rare:'El joker raro llegará en otra tienda y su efecto es incierto. Juega esta ciega.',
 tag_meteor:'Los planetas del sobre son inciertos. Juega para cobrar y elegir qué comprar.',
 tag_juggle:'Las tres cartas extra duran una ronda. Juega para conservar la tienda.',
 tag_standard:'Juega para cobrar y ver la tienda. El salto solo da un sobre de cartas.',
 tag_charm:'Juega para cobrar y ver la tienda. El contenido del sobre de tarot es incierto.'
};

/** Speed and Garbage keep their previous automatic play rule. */
export const AUTO_PLAY_BLIND_TAGS:ReadonlySet<TagId>=new Set(['tag_skip','tag_garbage']);

export function isAutomaticPlayTag(tagId:string|null):boolean {
 const definition=tagId?tagDefinition(tagId):undefined;
 return definition!==undefined&&AUTO_PLAY_BLIND_TAGS.has(definition.id);
}

export interface ConfiguredSkipTagDecision {
 skip:boolean;
 reason:string;
 bossEstimate?:BlindSurvivalEstimate;
}

const value=<T>(fact:Fact<T>|undefined):T|null=>fact?.status==='known'?fact.value:null;
const play=(reason:string):ConfiguredSkipTagDecision=>({skip:false,reason});
const skip=(reason:string):ConfiguredSkipTagDecision=>({skip:true,reason});
const early=(blind:BlindInfo)=>blind.ante===1||blind.ante===2&&blind.kind==='small';
const timingUnknown='Registra el ante y la ciega para saber si la etiqueta está en su ventana de salto.';

function decideDouble(state:GameStateV02,blind:BlindInfo|null):ConfiguredSkipTagDecision {
 if(value(state.observed.deckId)!=='anaglyph')return play('Double exige otro salto. Conserva el cobro y la tienda.');
 const tags=value(value(state.observed.jokerContext)?.tags);
 if(tags===null)return play('Confirma tus etiquetas dobles antes de decidir si te conviene acumular otra.');
 // Only plan around a reward already visible, and do not presume a future roll.
 const upcoming=blind?.kind==='small'?state.blindTags?.find(tag=>tag.ante===blind.ante&&tag.kind==='big'):undefined;
 const nextTag=value(upcoming?.tag);
 const doubles=tags.filter(tag=>tag==='tag_double').length;
 if(nextTag==='tag_negative'&&doubles===1&&blind&&blind.ante<8){
  return skip('Pasas a dos Double Tags para la Negativa visible en la siguiente ciega.');
 }
 if(upcoming&&nextTag==='tag_orbital'){
  const orbital=observedOrbitalHand(state,upcoming);
  if(orbital&&inferPrimaryHand(state)===orbital)return skip(`Otra etiqueta doble añade tres niveles de ${HAND_NAMES[orbital]} con la Orbital visible.`);
 }
 return play('Anaglifo gana una Double al vencer al jefe. Conserva la tienda hasta ver cómo aprovechar otra.');
}

/** User policy. No next-blind simulation or risk override for rules that only
 * depend on a tag, a recorded ante, or the number of Double Tags. */
export function decideConfiguredSkipTag(state:GameStateV02,blind:BlindInfo|null,tagId:string|null,evaluate?:EvaluateBlindSurvival):ConfiguredSkipTagDecision|null {
 if(!tagId||blind?.kind==='boss')return null;
 const tag=tagDefinition(tagId);
 if(!tag)return null;
 const fixed=Object.hasOwn(fixedPlayReasons,tag.id)?fixedPlayReasons[tag.id]:undefined;
 if(fixed)return play(fixed);

 switch(tag.id){
  case 'tag_coupon':
   if(!blind)return play(timingUnknown);
   return blind.ante<=2?skip('El Cupón hace gratis las cartas y los sobres iniciales de la próxima tienda.')
    :play('El Cupón se reserva para los antes 1 y 2. Juega para conservar esta tienda.');
  case 'tag_buffoon':
   if(!blind)return play(timingUnknown);
   return early(blind)?skip('El Mega Bufón ofrece jokers para reforzarte antes de la siguiente ciega.')
    :play('Ya pasó la Pequeña del ante 2. Conserva el cobro y busca jokers en la tienda.');
  case 'tag_top_up':
   if(!blind)return play(timingUnknown);
   return early(blind)?skip('Top-up puede dar hasta dos jokers comunes antes de la siguiente ciega.')
    :play('Ya pasó la Pequeña del ante 2. Juega para cobrar y visitar la tienda.');
  case 'tag_uncommon':
   if(!blind)return play(timingUnknown);
   return blind.ante===1&&blind.kind==='small'?skip('Un joker inusual gratis en la próxima tienda puede arrancar tu partida.')
    :play('Solo se salta por Uncommon en la Pequeña del ante 1. Conserva esta tienda.');
  case 'tag_investment':
  case 'tag_holo': {
   if(!blind)return play(timingUnknown);
   const investment=tag.id==='tag_investment';
   if(!early(blind))return play(`La ventana de ${investment?'Inversión':'Holográfica'} termina en la Pequeña del ante 2. Conserva esta tienda.`);
   const boss=assessBossScore(state,evaluate);
   if(boss.status==='unknown'){
    const emptyJokers=value(state.observed.jokers)?.length===0;
    return {
     ...play(emptyJokers?'Cobra y busca tu primer comodín en la tienda.':'Aprovecha esta tienda para reforzarte antes del jefe.'),
     ...(boss.estimate?{bossEstimate:boss.estimate}:{})
    };
   }
   const decision=investment
    ?boss.status==='sufficient'?skip(`Tu puntuación alcanza para el jefe. Si lo vences, cobras $${TAG_EFFECTS.investment.dollars}.`)
     :play(`Tu puntuación queda corta para el jefe. Refuérzate antes de buscar los $${TAG_EFFECTS.investment.dollars}.`)
    :boss.status==='insufficient'?skip(blind.kind==='big'
     ?'Te falta puntuación para el jefe. La edición de +10 multi llega en la tienda después del jefe.'
     :'Te falta puntuación para el jefe. La edición holográfica aporta +10 multi en la próxima tienda.')
     :play('Tu puntuación alcanza para el jefe. Juega para conservar el cobro y la tienda.');
   return {...decision,...(boss.estimate?{bossEstimate:boss.estimate}:{})};
  }
  case 'tag_voucher':
  case 'tag_d_six':
   return assessSkipBudget(state,tag.id);
  case 'tag_orbital': {
   const target=observedOrbitalHand(state),primary=inferPrimaryHand(state);
   if(!target)return play('Registra qué mano sube Orbital para comprobar si le sirve a tu mazo.');
   if(!primary)return play('Faltan jugadas o niveles que identifiquen tu mano principal. Conserva la tienda.');
   if(primary===target)return skip(`Orbital sube tres niveles de ${HAND_NAMES[target]}, tu mano principal.`);
   return play(`Orbital sube ${HAND_NAMES[target]}. Tu mano principal es ${HAND_NAMES[primary]}.`);
  }
  case 'tag_boss': {
   const matchup=assessBossMatchup(state,evaluate);
   return {skip:matchup.harmful===true,reason:matchup.reason};
  }
  case 'tag_negative': {
   const tags=value(value(state.observed.jokerContext)?.tags);
   if(tags===null)return play('Confirma cuántas Double Tags tienes acumuladas antes de saltar por Negativa.');
   const doubles=tags.filter(tag=>tag==='tag_double').length;
   return doubles>=2?skip(`Tienes ${doubles} Double Tags. Puedes multiplicar la recompensa de Negativa.`)
    :play(`Tienes ${doubles} Double Tags. Negativa requiere al menos dos para recomendar el salto.`);
  }
  case 'tag_double':
   return decideDouble(state,blind);
  default:
   return null;
 }
}

/** Previous contextual behavior for the two remaining tags. */
export function assessBlindTag(state:GameStateV02,tagId:string):{reason:string;conditions:string[];preferPlay:boolean}|null {
 const blind=value(state.observed.nextBlind);
 if(state.phase!=='blind_select'||!blind||blind.kind==='boss')return null;
 if(tagId==='tag_ethereal')return {
  reason:'Abre un Sobre Espectral. Valóralo si puedes aprovechar una modificación fuerte del mazo o de la composición antes de la próxima ciega.',
  conditions:['Es una elección entre dos cartas desconocidas; algunas pueden tener costes para el mazo o el saldo.'],preferPlay:false
 };
 if(tagId!=='tag_economy')return null;
 const money=value(state.observed.money);
 const total=money===null?null:Math.min(TAG_EFFECTS.economy.cap,Math.max(0,money));
 if(total===null)return {
  reason:'Economía aporta un ingreso inmediato ligado al saldo. Registra el saldo para compararlo con el cobro de jugar.',
  conditions:['El dinero del salto no abre una tienda.'],preferPlay:false
 };
 if(total===0)return {reason:'Economía aportaría $0 con el saldo registrado.',conditions:[],preferPlay:true};
 return {
  reason:`Economía aportaría $${total} inmediatamente. Compáralo con el cobro al ganar y el valor de pasar por la tienda.`,
  conditions:['La cifra corresponde a una sola copia de la etiqueta.'],preferPlay:false
 };
}
