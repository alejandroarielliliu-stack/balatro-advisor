import assert from 'node:assert/strict';
import test from 'node:test';
import { createDraft, createUnknownState } from '../src/state/model.js';
import type { GameStateV01, GameStateV02, PhaseData } from '../src/state/model.js';
import { migrateState } from '../src/state/migration.js';
import { parseState, serializeState, validateCurrentState, validateLegacyState, validateState } from '../src/state/validation.js';
import { known, s01, success } from './helpers.js';

const missing = { status: 'unknown', reason: 'No se ha observado.' } as const;
const legacyShop = () => s01() as GameStateV01;
const currentShop = (): GameStateV02 => ({
  ...legacyShop(), schemaVersion: '0.2', phase: 'shop', phaseData: { origin: missing }
});

test('RUN01 acepta las siete fases discriminadas sin ejecutar reglas ni añadir observaciones', () => {
  // Independent literal payloads: these are structural fixtures, not transition output.
  const cases: { [P in keyof PhaseData]: PhaseData[P] } = {
    unknown: { reason: 'El archivo anterior no identifica la fase.' },
    blind_select: { skipTag: missing },
    in_round: { blind: missing, handsRemaining: missing, discardsRemaining: missing, score: missing, heldCardIds: missing },
    cashout: { blind: missing, amount: missing },
    shop: { origin: missing },
    open_pack: { packId: missing, returnTo: 'blind_select' },
    finished: { outcome: 'stopped', reason: missing }
  };
  for (const [phase, phaseData] of Object.entries(cases)) {
    const candidate = { ...currentShop(), phase, phaseData };
    const before = structuredClone(candidate);
    const value = success(validateCurrentState(candidate));
    assert.deepEqual(value, before);
    assert.deepEqual(candidate, before);
    assert.deepEqual(success(parseState(success(serializeState(candidate)))), before);
  }
});

test('RUN01 carga y validación conservan la versión 0.1; la migración es explícita', () => {
  const legacy = legacyShop(), before = structuredClone(legacy);
  const loaded = success(parseState(success(serializeState(legacy))));
  assert.equal(loaded.schemaVersion, '0.1');
  assert.ok(!Object.hasOwn(loaded, 'phaseData'));
  assert.deepEqual(legacy, before);
  assert.deepEqual(success(validateLegacyState(legacy)), before);
  assert.ok(!validateCurrentState(legacy).ok);
  assert.ok(!validateLegacyState(currentShop()).ok);
});

test('RUN01 migra tienda legacy manteniendo identidad, revisión, fecha y todos los datos', () => {
  const legacy = legacyShop();
  legacy.revision = 19;
  legacy.updatedAt = '2026-10-11T14:09:08.123Z';
  const before = structuredClone(legacy);
  const migrated = success(migrateState(legacy));
  assert.deepEqual(migrated, { ...before, schemaVersion: '0.2', phase: 'shop', phaseData: {
    origin: { status: 'unknown', reason: 'La partida 0.1 no registra qué ciega originó esta tienda.' }
  } });
  assert.deepEqual(legacy, before);
  assert.notEqual(migrated.observed, legacy.observed);
  assert.notEqual(migrated.assumptions, legacy.assumptions);
});

test('RUN01 draft legacy migra a fase desconocida y no infiere observaciones desde hipótesis', () => {
  const legacy = legacyShop();
  legacy.phase = 'draft';
  legacy.assumptions.cashflow.assumeRoundWon = true;
  legacy.assumptions.cashflow.noMoneyChangesDuringRound = true;
  legacy.assumptions.cashflow.handsUsedByRound = [1];
  const before = structuredClone(legacy);
  const migrated = success(migrateState(legacy));
  assert.equal(migrated.phase, 'unknown');
  assert.deepEqual(migrated.phaseData, {
    reason: 'La fase draft de 0.1 no identifica un momento del ciclo de partida.'
  });
  assert.deepEqual(migrated.observed, before.observed);
  assert.deepEqual(migrated.assumptions, before.assumptions);
  assert.deepEqual(legacy, before);
});

test('RUN01 migración actual es idempotente, desprendida y no cambia revisión ni fecha', () => {
  const current = currentShop();
  current.revision = 27;
  const once = success(migrateState(current)), twice = success(migrateState(once));
  assert.deepEqual(twice, current);
  assert.notEqual(twice, once);
  assert.notEqual(once.observed, current.observed);
  once.assumptions.probes.length = 0;
  assert.notDeepEqual(once.assumptions, current.assumptions);
  assert.deepEqual(twice, current);
});

test('RUN01 el contrato 0.1 queda congelado y los campos de fase 0.2 son estrictos', () => {
  const legacy = legacyShop();
  assert.ok(!validateState({ ...legacy, phaseData: { origin: missing } }).ok);
  assert.ok(!validateState({ ...legacy, phase: 'blind_select' }).ok);
  const { phaseData: _data, ...missingData } = currentShop();
  const result = validateCurrentState(missingData);
  assert.ok(!result.ok && result.errors.some(error => error.path === '$.phaseData' && error.code === 'required'));
  assert.ok(!validateState({ ...currentShop(), phase: 'draft' }).ok);
  assert.ok(!validateState({ ...currentShop(), phaseData: { origin: missing, predictedVictory: true } }).ok);
  assert.ok(!validateState({ ...currentShop(), phase: 'cashout', phaseData: { origin: missing } }).ok);
  assert.ok(!validateState({ ...currentShop(), phase: 'blind_select', phaseData: { skipTag: missing, nextBlind: missing } }).ok);
  assert.ok(!validateState({ ...currentShop(), phase: 'open_pack', phaseData: { packId: missing, returnTo: 'cashout' } }).ok);
});

test('RUN01 la estructura no fija reglas económicas o recursos compatibles', () => {
  const cashout = { ...currentShop(), phase: 'cashout', phaseData: { blind: missing, amount: known(-2) } };
  assert.ok(validateCurrentState(cashout).ok, 'Importe negativo puede ser observado con otros modificadores; no es un cálculo económico.');
  assert.ok(!validateCurrentState({ ...cashout, phaseData: { blind: missing, amount: known(1.5) } }).ok);
  const inRound = { ...currentShop(), phase: 'in_round', phaseData: {
    blind: missing, handsRemaining: known(17), discardsRemaining: known(0), score: known(0), heldCardIds: missing
  } };
  assert.ok(validateCurrentState(inRound).ok);
  assert.ok(!validateCurrentState({ ...inRound, phaseData: { ...inRound.phaseData, score: known(-1) } }).ok);
});

test('RUN01 las cartas en mano necesitan IDs únicos existentes cuando el mazo es explícito', () => {
  const state = currentShop();
  state.observed.deck = known({ cards: [{ instanceId: 'card-a', rank: 'K', suit: 'H',
    edition: 'base', enhancement: 'none', seal: 'none', extraChips: 0 }] });
  state.assumptions.probes = [];
  state.assumptions.roundPlans = [];
  const inRound = { ...state, phase: 'in_round', phaseData: {
    blind: missing, handsRemaining: missing, discardsRemaining: missing, score: missing, heldCardIds: known(['card-a'])
  } };
  assert.ok(validateCurrentState(inRound).ok);
  const duplicate = validateCurrentState({ ...inRound, phaseData: { ...inRound.phaseData, heldCardIds: known(['card-a', 'card-a']) } });
  assert.ok(!duplicate.ok && duplicate.errors.some(error => error.code === 'duplicate_id'));
  const absent = validateCurrentState({ ...inRound, phaseData: { ...inRound.phaseData, heldCardIds: known(['not-in-deck']) } });
  assert.ok(!absent.ok && absent.errors.some(error => error.code === 'unknown_reference'));
  state.observed.deck = missing;
  assert.ok(validateCurrentState({ ...inRound, observed: state.observed,
    phaseData: { ...inRound.phaseData, heldCardIds: known(['observed-but-deck-unknown']) } }).ok);
});

test('RUN01 una referencia de ciega activa no puede contradecir la posición conocida', () => {
  const state = currentShop();
  state.observed.nextBlind = known({ ante: 2, kind: 'big', bossId: missing, target: missing, reward: missing });
  for (const phase of ['in_round', 'cashout'] as const) {
    const phaseData = phase === 'cashout' ? { blind: known({ ante: 2, kind: 'big' }), amount: missing }
      : { blind: known({ ante: 2, kind: 'big' }), handsRemaining: missing, discardsRemaining: missing, score: missing, heldCardIds: missing };
    assert.ok(validateCurrentState({ ...state, phase, phaseData }).ok);
    const conflict = validateCurrentState({ ...state, phase, phaseData: { ...phaseData, blind: known({ ante: 3, kind: 'boss' }) } });
    assert.ok(!conflict.ok && conflict.errors.some(error => error.code === 'conflicting_reference'));
    assert.ok(validateCurrentState({ ...state, phase, phaseData: { ...phaseData, blind: missing } }).ok);
  }
});

test('RUN01 factories separan borrador antiguo y estado actual sin inventar versión de juego', () => {
  const legacy = createDraft('legacy-new', '2026-10-16T00:00:00Z');
  assert.equal(legacy.schemaVersion, '0.1');
  assert.equal(legacy.phase, 'draft');
  const current = createUnknownState('current-new', '2026-10-16T00:00:00Z');
  assert.equal(current.schemaVersion, '0.2');
  assert.equal(current.phase, 'unknown');
  assert.equal(current.observed.money.status, 'unknown');
  assert.equal(current.observed.gameVersion.status, 'unknown');
  assert.equal(current.observed.nextBlind.status, 'unknown');
  assert.deepEqual(success(validateCurrentState(current)), current);
});

test('RUN01 migración rechaza entradas inválidas y no invoca getters ni acepta versiones futuras', () => {
  let reads = 0;
  const value = Object.defineProperty({}, 'schemaVersion', { enumerable: true, get() { reads++; return '0.2'; } });
  assert.ok(!migrateState(value).ok);
  assert.equal(reads, 0);
  assert.ok(!migrateState({ ...currentShop(), schemaVersion: '0.3' }).ok);
  assert.ok(!migrateState({ ...legacyShop(), revision: -1 }).ok);
  assert.ok(!migrateState({ ...currentShop(), phaseData: { origin: { status: 'unknown', reason: 'sin origen', value: 1 } } }).ok);
});
