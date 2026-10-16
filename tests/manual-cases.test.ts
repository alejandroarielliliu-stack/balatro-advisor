import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getRuleRegistry } from '../src/rules/evidence.js';

interface ManualCase { id: string; ruleIds: string[]; status: string; observed: unknown; basis: string; hypothesisExpected: unknown }
const manifest = JSON.parse(readFileSync(new URL('../../tests/fixtures/manual-rule-cases.json', import.meta.url), 'utf8')) as {
  expectationOrigin: { protocol: string; method: string }; cases: ManualCase[];
};
test('casos manuales mantienen procedencia externa al código y no fingen observaciones', () => {
  assert.equal(manifest.cases.length, 10);
  assert.equal(new Set(manifest.cases.map(c => c.id)).size, 10);
  assert.ok(manifest.expectationOrigin.protocol.includes('t01-reglas'));
  assert.ok(manifest.expectationOrigin.method.includes('antes de implementar H1'));
  for (const c of manifest.cases) {
    assert.equal(c.observed, null);
    assert.equal(c.status, 'pending_game_observation');
    assert.ok(c.basis.length > 0 && c.hypothesisExpected);
    assert.ok(c.ruleIds.every(id => Object.hasOwn(getRuleRegistry(), id)));
  }
});
// These are reminders, not passing tests of Balatro, and do not invoke a game implementation.
for (const c of manifest.cases) test.todo(`Contra el juego: ${c.id} — requiere build y evidencia directa`);
