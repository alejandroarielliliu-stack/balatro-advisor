import assert from 'node:assert/strict';
import test from 'node:test';
import { createDraft } from '../src/state/model.js';
import { MAX_STATE_BYTES, parseState, serializeState, validateState } from '../src/state/validation.js';
import { known, s01, success } from './helpers.js';

test('S01 documental conserva todos los datos y no comparte referencias con el resultado', () => {
  const state = s01();
  const result = success(validateState(state));
  assert.deepEqual(result, state);
  result.runId = 'otro';
  assert.equal(state.runId, 'synthetic-s01');
  assert.deepEqual(success(parseState(success(serializeState(state)))), state);
});

test('borrador vacío conserva unknown, no inventa versión, recursos ni contadores', () => {
  const draft = createDraft('draft-1', '2026-10-08T12:00:00Z');
  assert.deepEqual(success(validateState(draft)), draft);
  assert.equal(draft.observed.money.status, 'unknown');
  assert.equal(draft.observed.resources.jokerSlots.status, 'unknown');
  assert.notEqual(draft.observed.money, draft.observed.gameVersion);
});

test('estructura admite otras builds, mods, deuda, duplicados de catálogo y recursos distintos', () => {
  const state = s01();
  state.rulesetId = 'experimental-not-verified';
  state.observed.gameVersion = known('otra-build');
  state.observed.modsPresent = known(true);
  state.observed.money = known(-10);
  state.observed.resources.jokerSlots = known(7);
  state.observed.jokers = known(Array.from({ length: 7 }, (_, index) => ({
    instanceId: `j${index}`, catalogId: 'green_joker', edition: known('negative'),
    stickers: known(['rental']), sellValue: known(1), counters: {}
  })));
  assert.deepEqual(success(validateState(state)), state);
});

test('contadores desconocidos, otros contadores e inventario ordenado sobreviven JSON', () => {
  const state = s01();
  state.observed.jokers = known([
    { instanceId: 'g1', catalogId: 'green_joker', edition: known('base'), stickers: known([]),
      sellValue: known(2), counters: { greenMult: known(7) } },
    { instanceId: 'x1', catalogId: 'outside_catalog', edition: known('base'), stickers: known([]),
      sellValue: { status: 'unknown', reason: 'No mirado' },
      counters: { valueUnknown: { status: 'unknown', reason: 'No transcrito' }, futureCounter: known(-3) } }
  ]);
  assert.deepEqual(success(parseState(success(serializeState(state)))), state);
});

test('tipos incorrectos y campos ausentes tienen ruta y mensaje claros, sin coerción', () => {
  const state: unknown = { ...s01(), revision: '1', observed: { ...s01().observed, money: { status: 'known', value: '7', source: 'manual' } } };
  const result = validateState(state);
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.some(e => e.path === '$.revision' && e.code === 'integer'));
    assert.ok(result.errors.some(e => e.path === '$.observed.money.value'));
    assert.ok(result.errors.every(e => e.message.length > 0));
  }
  const missing = validateState({ schemaVersion: '0.1' });
  assert.ok(!missing.ok && missing.errors.some(e => e.path === '$.observed' && e.code === 'required'));
});

test('known y unknown no se mezclan y campos nuevos no desaparecen silenciosamente', () => {
  const state = s01();
  const mixed = validateState({ ...state, observed: { ...state.observed, money: { status: 'unknown', reason: 'falta', value: 0 } } });
  assert.ok(!mixed.ok && mixed.errors.some(e => e.code === 'unexpected_field'));
  const extra = validateState({ ...state, inventedWinRate: 99 });
  assert.ok(!extra.ok && extra.errors.some(e => e.path === '$.inventedWinRate'));
});

test('JSON malformado, documentos futuros, timestamps imposibles y fracciones fallan', () => {
  assert.ok(!parseState('{broken').ok);
  const future = validateState({ ...s01(), schemaVersion: '99.0' });
  assert.ok(!future.ok && future.errors[0]?.code === 'unsupported_schema');
  assert.ok(!validateState({ ...s01(), updatedAt: '2026-02-30T12:00:00Z' }).ok);
  assert.ok(!validateState({ ...s01(), revision: 1.2 }).ok);
  assert.ok(!validateState({ ...s01(), revision: -1 }).ok);
});

test('IDs de instancia y referencias a mazo explícito son consistentes', () => {
  const state = s01();
  const card = { instanceId: '8S', rank: '8' as const, suit: 'S' as const, edition: 'base', enhancement: 'none', seal: 'none', extraChips: 0 };
  state.observed.deck = known({ cards: [card, { ...card }] });
  const duplicate = validateState(state);
  assert.ok(!duplicate.ok && duplicate.errors.some(e => e.code === 'duplicate_id'));
  state.observed.deck = known({ cards: [card] });
  const missing = validateState(state);
  assert.ok(!missing.ok && missing.errors.some(e => e.code === 'unknown_reference' && e.message.includes('8H')));
});

test('un mazo alterado con IDs únicos es guardable; no se exige 52 ni ausencia de mejoras', () => {
  const state = s01();
  state.assumptions.probes = [];
  state.observed.deck = known({ cards: ['a', 'b'].map(instanceId => ({
    instanceId, rank: 'A' as const, suit: 'S' as const, edition: 'foil', enhancement: 'steel', seal: 'red', extraChips: 5
  })) });
  assert.ok(validateState(state).ok);
});

test('rechaza claves peligrosas, ciclos, NaN, undefined, getters y arrays con huecos', () => {
  assert.ok(!parseState('{"schemaVersion":"0.1","__proto__":{"polluted":true}}').ok);
  const cycle: { self?: unknown } = {}; cycle.self = cycle;
  for (const value of [cycle, { bad: NaN }, { bad: undefined }, { bad: Infinity }, { bad: new Date() }, { bad: -0 }]) {
    assert.ok(!validateState(value).ok);
  }
  let getterInvoked = false;
  const getter = Object.defineProperty({}, 'value', { enumerable: true, get() { getterInvoked = true; return 1; } });
  assert.ok(!validateState(getter).ok);
  assert.equal(getterInvoked, false);
  const sparse = new Array(2); sparse[1] = 'x';
  Object.assign(sparse, { extra: 'y' });
  assert.ok(!validateState({ bad: sparse }).ok);
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
});

test('importación limita bytes y profundidad sin sobrescribir ni lanzar RangeError', () => {
  const huge = parseState(' '.repeat(MAX_STATE_BYTES + 1));
  assert.ok(!huge.ok && huge.errors[0]?.code === 'size');
  let deep: unknown = {};
  for (let i = 0; i < 100; i++) deep = { nested: deep };
  const result = validateState(deep);
  assert.ok(!result.ok && result.errors.some(e => e.code === 'complexity'));
});
