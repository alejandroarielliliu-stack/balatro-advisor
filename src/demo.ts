/** CLI boundary only. The engine does not import Node, storage, or this file. */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseState } from './state/validation.js';
import { createStateStore } from './storage/state-store.js';
import { applyShopAction } from './rules/shop.js';
import { scoreHand } from './rules/scoring.js';
import { formatTrace } from './rules/round.js';
import type { Result } from './state/model.js';

function unwrap<T>(result: Result<T>): T { if (!result.ok) throw new Error(JSON.stringify(result.errors)); return result.value; }
try {
  const filename = process.argv[2] ?? fileURLToPath(new URL('../../examples/shop-purchase.json', import.meta.url));
  const loaded = unwrap(parseState(readFileSync(filename, 'utf8')));
  // Reuses the H1 store. This demo does not overwrite the user's active game or browser storage.
  const memory = new Map<string,string>();
  const store = createStateStore(() => ({ getItem: key => memory.get(key) ?? null, setItem: (key,value) => { memory.set(key,value); } }));
  unwrap(store.save(loaded));
  const state = unwrap(store.load());
  if (!state) throw new Error('No se recuperó el estado.');
  const hand = { cardIds: ['8S','8H'], discardsRemaining: 3 };
  const before = scoreHand(state, hand);
  const action = applyShopAction(state, { type: 'buy', offerId: 'o2', instanceId: 'purchase-half' },
    { expectedRevision: state.revision, updatedAt: '2026-10-09T18:00:00Z' });
  if (!before.ok) throw new Error(JSON.stringify(before.errors));
  if (!action.ok) throw new Error(JSON.stringify(action.errors));
  const after = scoreHand(action.value.state, hand);
  if (!after.ok) throw new Error(JSON.stringify(after.errors));
  console.log('DEMOSTRACIÓN SINTÉTICA — MODELO PROVISIONAL 1.0.1o; no observación de Balatro');
  console.log('Estado cargado y recuperado mediante H1:\n' + JSON.stringify(state, null, 2));
  console.log('\nAntes de comprar:\n' + formatTrace(before.trace));
  console.log('\nAcción:\n' + formatTrace(action.trace));
  console.log('\nEstado proyectado después:\n' + JSON.stringify(action.value.state, null, 2));
  console.log('\nDespués de comprar:\n' + formatTrace(after.trace));
  console.log(`\nResumen: ${before.value.score} → ${after.value.score} puntos; espacios ${action.value.occupiedSlots}/5.`);
  console.log('Limitaciones:\n' + JSON.stringify(after.evidence, null, 2));
  console.log('Entrada conservada: ' + (JSON.stringify(loaded) === JSON.stringify(state)));
} catch (error) { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; }
