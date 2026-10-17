import {packContextSchema,packOfferSchema} from './pack-contract.js';
import type {PackOffer} from './pack-contract.js';
import { gameStateSchema as legacyGameStateSchema } from './legacy-model.js';
import type { GameState as LegacyGameState } from './legacy-model.js';
import { array, enumeration, fact, integer, isObject, issue, object, text, union } from './schema.js';
import type { Infer, Schema, Fact } from './schema.js';

export type { Fact, Issue, Result } from './schema.js';
export type { JokerInstance, Probe } from './legacy-model.js';
export { cardSchema, jokerSchema, consumableSchema, createDraft } from './legacy-model.js';

/** 0.1 stays readable and is never promoted implicitly by validation or loading. */
export type GameStateV01 = LegacyGameState;
export type GameStateLegacy = GameStateV01;

const count = integer(0);
const blindRef = object({ ante: integer(1), kind: enumeration('small', 'big', 'boss') });

/** These are recorded facts, not a rule engine, prediction or automatic transition. */
export const phaseDataSchemas = {
  unknown: object({ reason: text(1000) }),
  blind_select: object({ skipTag: fact(text()) }),
  in_round: object({
    blind: fact(blindRef), handsRemaining: fact(count), discardsRemaining: fact(count),
    score: fact(count), heldCardIds: fact(array(text(), 100))
  }),
  cashout: object({ blind: fact(blindRef), amount: fact(integer()) }),
  shop: object({ origin: fact(blindRef) }),
  open_pack: object({ packId: fact(text()), returnTo: enumeration('blind_select', 'shop') },{context:packContextSchema}),
  finished: object({ outcome: enumeration('won', 'lost', 'stopped'), reason: fact(text(1000)) })
};

export type RunPhase = keyof typeof phaseDataSchemas;
export type PhaseData = { [P in RunPhase]: Infer<(typeof phaseDataSchemas)[P]> };
type PhaseState = { [P in RunPhase]: { phase: P; phaseData: PhaseData[P] } }[RunPhase];
export const voucherOfferSchema=object({offerId:text(),catalogId:text(),price:fact(integer(0))});
export type VoucherOffer=Infer<typeof voucherOfferSchema>;
type LegacyShop=Extract<GameStateV01['observed']['shop'],{status:'known'}>['value'];
export type CurrentShop=LegacyShop & {voucherOffers?:VoucherOffer[];packOffers?:PackOffer[]};
export type GameStateV02 = Omit<GameStateV01, 'schemaVersion' | 'phase' | 'observed'> & {
  schemaVersion: '0.2';
  observed:Omit<GameStateV01['observed'],'shop'> & {shop:Fact<CurrentShop>};
} & PhaseState;
export type GameState = GameStateV01 | GameStateV02;

const phase = enumeration('unknown', 'blind_select', 'in_round', 'cashout', 'shop', 'open_pack', 'finished');

/** Project only declared 0.2 extensions for the frozen legacy structural checks. */
export function legacyShape(value:Record<string,unknown>):Record<string,unknown>{
 const base={...value,schemaVersion:'0.1',phase:value.phase==='shop'?'shop':'draft'};
 delete (base as Record<string,unknown>).phaseData;
 if(isObject(value.observed)&&isObject(value.observed.shop)&&value.observed.shop.status==='known'&&isObject(value.observed.shop.value)){
  const shop={...value.observed.shop.value};delete shop.voucherOffers;delete shop.packOffers;
  Object.assign(base,{observed:{...value.observed,shop:{...value.observed.shop,value:shop}}});
 }
 return base;
}
/** Reuse the frozen base instead of allowing 0.2 additions to change the 0.1 contract. */
export const currentGameStateSchema: Schema<GameStateV02> = {
  check(value, path, errors) {
    if (!isObject(value)) return issue(errors, path, 'object', 'Se requiere un objeto.');
    let valid = enumeration('0.2').check(value.schemaVersion, `${path}.schemaVersion`, errors);
    if (!phase.check(value.phase, `${path}.phase`, errors)) valid = false;
    else {
      const phaseName = value.phase as RunPhase;
      if (!Object.hasOwn(value, 'phaseData')) {
        issue(errors, `${path}.phaseData`, 'required', 'La versión 0.2 requiere los datos propios de la fase.');
        valid = false;
      } else if (!phaseDataSchemas[phaseName].check(value.phaseData, `${path}.phaseData`, errors)) valid = false;
    }
    if(isObject(value.observed)&&isObject(value.observed.shop)&&value.observed.shop.status==='known'&&isObject(value.observed.shop.value)&&Object.hasOwn(value.observed.shop.value,'voucherOffers')){
      if(!array(voucherOfferSchema,100).check(value.observed.shop.value.voucherOffers,`${path}.observed.shop.value.voucherOffers`,errors))valid=false;
    }
    if(isObject(value.observed)&&isObject(value.observed.shop)&&value.observed.shop.status==='known'&&isObject(value.observed.shop.value)&&Object.hasOwn(value.observed.shop.value,'packOffers')){
      if(!array(packOfferSchema,100).check(value.observed.shop.value.packOffers,`${path}.observed.shop.value.packOffers`,errors))valid=false;
    }
    const base=legacyShape(value);
    if (!legacyGameStateSchema.check(base, path, errors)) valid = false;
    return valid;
  }
};

export const gameStateSchema: Schema<GameState> = union(legacyGameStateSchema, currentGameStateSchema);

/** A new unknown cycle has no implicit deck, phase, resource values or observations. */
export function createUnknownState(runId: string, updatedAt: string): GameStateV02 {
  const unknown = () => ({ status: 'unknown', reason: 'Todavía no registrado.' } as const);
  return {
    schemaVersion: '0.2', rulesetId: 'unselected', runId, revision: 0, updatedAt,
    phase: 'unknown', phaseData: { reason: 'Todavía no se ha registrado la fase de la partida.' },
    observed: {
      gameVersion: unknown(), gamePlatform: unknown(), deckId: unknown(), stakeId: unknown(), modsPresent: unknown(),
      money: unknown(), lastCleared: unknown(), nextBlind: unknown(), visibleBoss: unknown(),
      resources: { handsPerRound: unknown(), discardsPerRound: unknown(), handSize: unknown(), jokerSlots: unknown() },
      deck: unknown(), handBases: unknown(), jokers: unknown(), shop: unknown(), outOfScope: unknown()
    },
    assumptions: { probes: [], roundPlans: [], horizonRounds: 1,
      cashflow: { assumeRoundWon: false, handsUsedByRound: [], noSpendingBetweenRounds: false, noMoneyChangesDuringRound: false } }
  };
}
