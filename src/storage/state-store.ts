import type { GameState, Result } from '../state/model.js';
import { parseState, serializeState } from '../state/validation.js';

/** setItem must be atomic on failure, as in the browser Storage API. */
export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export const STATE_STORAGE_KEY = 'balatro-advisor.state.v0.1';
export interface StateStore {
  load(): Result<GameState | null>;
  save(input: unknown): Result<GameState>;
  importJson(json: string): Result<GameState>;
  exportJson(input: unknown): Result<string>;
}

export function createStateStore(getStorage: () => StoragePort): StateStore {
  const save = (input: unknown): Result<GameState> => {
    const serialized = serializeState(input);
    if (!serialized.ok) return serialized;
    try { getStorage().setItem(STATE_STORAGE_KEY, serialized.value); }
    catch { return { ok: false, errors: [{ path: '$storage', code: 'storage_write',
      message: 'No se pudo guardar: almacenamiento bloqueado o sin espacio. Conserva una exportación JSON.' }] }; }
    return parseState(serialized.value);
  };
  return {
    save,
    load() {
      let json: string | null;
      try { json = getStorage().getItem(STATE_STORAGE_KEY); }
      catch { return { ok: false, errors: [{ path: '$storage', code: 'storage_read',
        message: 'No se pudo leer el almacenamiento. No se ha eliminado ni reemplazado la partida.' }] }; }
      return json === null ? { ok: true, value: null } : parseState(json);
    },
    importJson(json) {
      const parsed = parseState(json);
      return parsed.ok ? save(parsed.value) : parsed;
    },
    exportJson: serializeState
  };
}

/** Access is deferred and caught by the store (private mode, blocked origin, missing window). */
export function createBrowserStateStore(): StateStore {
  return createStateStore(() => window.localStorage);
}
