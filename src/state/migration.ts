import type { GameStateV02, Result } from './model.js';
import { validateCurrentState, validateState } from './validation.js';

/** Pure explicit format migration; never a game action or reconstruction of missing facts. */
export function migrateState(input: unknown): Result<GameStateV02> {
  const result = validateState(input);
  if (!result.ok) return result;
  const state = result.value;
  if (state.schemaVersion === '0.2') return { ok: true, value: state };
  const { phase, schemaVersion: _oldVersion, ...unchanged } = state;
  return validateCurrentState(phase === 'shop'
    ? { ...unchanged, schemaVersion: '0.2', phase: 'shop', phaseData: {
      origin: { status: 'unknown', reason: 'La partida 0.1 no registra qué ciega originó esta tienda.' }
    } }
    : { ...unchanged, schemaVersion: '0.2', phase: 'unknown', phaseData: {
      reason: 'La fase draft de 0.1 no identifica un momento del ciclo de partida.'
    } });
}
