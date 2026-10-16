import {createUnknownState} from '../state/model.js';
import type {Fact,GameStateV02,Result} from '../state/model.js';
import {validateCurrentState} from '../state/validation.js';
import {boolean,checkJsonValue,object,text} from '../state/schema.js';
import {deckDefinition,resolveDeck,startingComposition} from '../catalog/decks.js';
import {blindRequirement} from '../catalog/blinds.js';
import {ENGINE_RULESET,GAME_VERSION} from '../catalog/initial.js';

const preset=<T>(value:T):Fact<T>=>({status:'known',source:'confirmedPreset',value});
const missing=(reason:string)=>({status:'unknown',reason} as const);
const request=object({runId:text(),updatedAt:text(),deckId:text(),profileConfirmed:boolean});
/** Initial conditions only, after an explicit NEW game declaration; never patches an existing run. */
export function createNewRun(input:unknown):Result<GameStateV02>{
  const errors=checkJsonValue(input);if(!errors.length)request.check(input,'$newRun',errors);
  if(errors.length)return {ok:false,errors};
  const r=input as {runId:string;updatedAt:string;deckId:string;profileConfirmed:boolean};
  const fail=(code:string,message:string,path='$newRun'):Result<never>=>({ok:false,errors:[{path,code,message}]});
  if(!r.profileConfirmed)return fail('profile_required','Confirma Steam 1.0.1o-FULL sin mods y White Stake antes de iniciar.');
  if(!deckDefinition(r.deckId))return fail('unsupported_deck','Esta baraja aún no admite el inicio de una partida en este recorrido.','$newRun.deckId');
  const state=createUnknownState(r.runId,r.updatedAt),deck=resolveDeck(r.deckId),composition=startingComposition(r.deckId);
  const blind=blindRequirement(1,'small','none',r.deckId);if(!blind.ok)return {ok:false,errors:[blind.error]};
  const result:GameStateV02={...state,rulesetId:ENGINE_RULESET,phase:'blind_select',phaseData:{skipTag:missing('El tag de esta ciega no se ha transcrito.')}};
  result.observed={...state.observed,gameVersion:preset(GAME_VERSION),gamePlatform:preset('pc-steam'),modsPresent:preset(false),
    deckId:preset(r.deckId),stakeId:preset('white'),money:preset(deck.startingMoney),
    nextBlind:preset({ante:1,kind:'small',bossId:preset('none'),target:preset(blind.target),reward:preset(blind.reward)}),
    resources:{handsPerRound:preset(deck.hands),discardsPerRound:preset(deck.discards),handSize:preset(deck.handSize),jokerSlots:preset(deck.jokerSlots)},
    deck:composition.status==='known'?preset({cards:composition.cards}):missing(composition.reason),
    handBases:preset({preset:'all-standard-level1'}),jokers:preset([]),
    shop:missing('Todavía no se ha observado una tienda en esta partida.'),
    outOfScope:preset({vouchers:[],consumables:[],pendingTags:[],otherModifiers:[]}),
    jokerContext:preset({startingDeckSize:preset(composition.status==='known'?composition.cards.length:composition.count),blindsSkipped:preset(0),
      tarotsUsed:preset(0),planetsUsed:preset([]),consumables:preset([]),consumableSlots:preset(deck.consumableSlots)})};
  return validateCurrentState(result);
}
