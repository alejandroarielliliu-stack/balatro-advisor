import assert from 'node:assert/strict';
import test from 'node:test';
import { assessAnalysis, assessRuleEvidence, evidenceSources, getRuleRegistry } from '../src/rules/evidence.js';
import { known, s01 } from './helpers.js';

test('registro mantiene evidencia y distingue confirmación documental de observación real', () => {
  const registry = getRuleRegistry();
  for (const entry of Object.values(registry)) {
    assert.ok(entry.evidenceIds.length > 0);
    assert.ok(entry.evidenceIds.every(id => Object.hasOwn(evidenceSources, id)));
    assert.notEqual(entry.verification, 'observed');
  }
  assert.equal(registry['banner.effect']?.status, 'confirmed');
  assert.equal(registry['banner.effect']?.verification, 'documented');
  assert.equal(registry['interest.timing']?.status, 'pending');
  assert.equal(registry['green.timing']?.status, 'pending');
});

test('análisis dependientes de reglas pendientes se abstienen con causas y fuentes', () => {
  for (const kind of ['interest', 'green_joker'] as const) {
    const gate = assessAnalysis(s01(), kind);
    assert.equal(gate.status, 'abstain');
    assert.equal(gate.verifiedAgainstGame, false);
    assert.ok(gate.limitations.some(item => item.ruleId === (kind === 'interest' ? 'interest.timing' : 'green.timing')));
    assert.ok(gate.limitations.some(item => item.evidenceIds.length > 0));
  }
});

test('dependencia provisional avisa; una regla ajena pendiente no bloquea una consulta de evidencia', () => {
  const provisional = assessRuleEvidence(['interest.formula']);
  assert.equal(provisional.status, 'limited');
  assert.ok(provisional.limitations.length);
  const banner = assessRuleEvidence(['banner.effect']);
  assert.equal(banner.status, 'documented');
  assert.equal(banner.verifiedAgainstGame, false);
  assert.ok(banner.limitations[0]?.message.includes('no observación'));
});

test('regla ausente y versión desconocida no tienen fallback optimista', () => {
  assert.equal(assessRuleEvidence(['missing']).status, 'abstain');
  assert.equal(assessRuleEvidence(['constructor']).status, 'abstain');
  const state = s01(); state.observed.gameVersion = { status: 'unknown', reason: 'No mirado' };
  assert.equal(assessAnalysis(state, 'interest').status, 'abstain');
  state.observed.gameVersion = known('another-version');
  assert.ok(assessAnalysis(state, 'banner').limitations.some(l => l.message.includes('fuera del contrato')));
});

test('editar una copia del registro no promueve las reglas originales', () => {
  const copy = getRuleRegistry();
  const rule = copy['green.timing']; assert.ok(rule);
  rule.status = 'confirmed';
  assert.equal(getRuleRegistry()['green.timing']?.status, 'pending');
});
