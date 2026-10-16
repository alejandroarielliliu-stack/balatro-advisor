import { gameStateSchema } from './model.js';
import type { GameState } from './model.js';
import { checkJsonValue, isObject, issue } from './schema.js';
import type { Issue, Result } from './schema.js';

export const MAX_STATE_BYTES = 1_048_576;

function unique(values: readonly string[], path: string, errors: Issue[]): void {
  const seen = new Set<string>();
  values.forEach((value, index) => {
    if (seen.has(value)) issue(errors, `${path}[${index}]`, 'duplicate_id', `Identificador repetido: ${value}.`);
    seen.add(value);
  });
}

export function validateState(input: unknown): Result<GameState> {
  const errors = checkJsonValue(input);
  if (errors.length) return { ok: false, errors };
  if (isObject(input) && Object.hasOwn(input, 'schemaVersion') && input.schemaVersion !== '0.1') {
    return { ok: false, errors: [{ path: '$.schemaVersion', code: 'unsupported_schema',
      message: 'Versión de documento no admitida. Conserva el archivo original; no se migrará automáticamente.' }] };
  }
  if (!gameStateSchema.check(input, '$', errors)) return { ok: false, errors };
  const state = input as GameState;
  const { jokers, shop, deck } = state.observed;
  if (jokers.status === 'known') unique(jokers.value.map(j => j.instanceId), '$.observed.jokers.value.instanceIds', errors);
  if (shop.status === 'known') unique(shop.value.cardOffers.map(o => o.offerId), '$.observed.shop.value.offerIds', errors);
  unique(state.assumptions.probes.map(p => p.probeId), '$.assumptions.probes.ids', errors);
  unique(state.assumptions.roundPlans.map(p => p.planId), '$.assumptions.roundPlans.ids', errors);
  let cardIds: Set<string> | undefined;
  if (deck.status === 'known' && 'cards' in deck.value) {
    unique(deck.value.cards.map(c => c.instanceId), '$.observed.deck.value.instanceIds', errors);
    cardIds = new Set(deck.value.cards.map(c => c.instanceId));
  }
  const refs = (ids: string[], path: string) => {
    unique(ids, path, errors);
    ids.forEach((id, index) => {
      if (cardIds && !cardIds.has(id)) issue(errors, `${path}[${index}]`, 'unknown_reference', `La carta ${id} no existe en el mazo explícito.`);
    });
  };
  state.assumptions.probes.forEach((probe, index) => refs(probe.playedCardIds, `$.assumptions.probes[${index}].playedCardIds`));
  state.assumptions.roundPlans.forEach((plan, index) => {
    refs(plan.initialHandCardIds, `$.assumptions.roundPlans[${index}].initialHandCardIds`);
    plan.events.forEach((event, n) => {
      refs(event.cardIds, `$.assumptions.roundPlans[${index}].events[${n}].cardIds`);
      refs(event.drawnCardIds, `$.assumptions.roundPlans[${index}].events[${n}].drawnCardIds`);
    });
  });
  // Timing, card availability over events, capacity, defaults, prices and compatibility belong to H2.
  if (new TextEncoder().encode(JSON.stringify(state)).byteLength > MAX_STATE_BYTES) {
    issue(errors, '$', 'size', 'La partida supera el límite de 1 MiB.');
  }
  return errors.length ? { ok: false, errors } : { ok: true, value: structuredClone(state) };
}

export function parseState(json: string): Result<GameState> {
  if (new TextEncoder().encode(json).byteLength > MAX_STATE_BYTES) return {
    ok: false, errors: [{ path: '$', code: 'size', message: 'El archivo supera el límite de 1 MiB.' }]
  };
  let input: unknown;
  try { input = JSON.parse(json) as unknown; }
  catch { return { ok: false, errors: [{ path: '$', code: 'invalid_json', message: 'JSON inválido: revisa comas, comillas y llaves.' }] }; }
  return validateState(input);
}

export function serializeState(input: unknown): Result<string> {
  const result = validateState(input);
  return result.ok ? { ok: true, value: JSON.stringify(result.value) } : result;
}
