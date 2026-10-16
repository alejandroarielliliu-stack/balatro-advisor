import { gameStateSchema as legacyGameStateSchema } from './legacy-model.js';
import type { GameState as LegacyGameState } from './legacy-model.js';
import { array, enumeration, fact, integer, isObject, issue, object, text, union } from './schema.js';
import type { Infer, Schema } from './schema.js';

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
  open_pack: object({ packId: fact(text()), returnTo: enumeration('blind_select', 'shop') }),
  finished: object({ outcome: enumeration('won', 'lost', 'stopped'), reason: fact(text(1000)) })
};

export type RunPhase = keyof typeof phaseDataSchemas;
export type PhaseData = { [P in RunPhase]: Infer<(typeof phaseDataSchemas)[P]> };
type PhaseState = { [P in RunPhase]: { phase: P; phaseData: PhaseData[P] } }[RunPhase];
export type GameStateV02 = Omit<GameStateV01, 'schemaVersion' | 'phase'> & {
  schemaVersion: '0.2';
} & PhaseState;
export type GameState = GameStateV01 | GameStateV02;

const phase = enumeration('unknown', 'blind_select', 'in_round', 'cashout', 'shop', 'open_pack', 'finished');

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
    const base = { ...value, schemaVersion: '0.1', phase: value.phase === 'shop' ? 'shop' : 'draft' };
    delete (base as Record<string, unknown>).phaseData;
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
