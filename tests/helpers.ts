import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import type { Fact, GameState, Result } from '../src/state/model.js';
import type { StoragePort } from '../src/storage/state-store.js';

// Independent literal fixture copied from the H0 document, not produced by the implementation.
export function s01(): GameState {
  return JSON.parse(readFileSync(new URL('../../tests/fixtures/state-s01.json', import.meta.url), 'utf8')) as GameState;
}
export const known = <T>(value: T): Fact<T> => ({ status: 'known', value, source: 'manual' });
export function success<T>(result: Result<T>): T {
  assert.ok(result.ok, JSON.stringify(result));
  return result.value;
}
export class MemoryStorage implements StoragePort {
  readonly values = new Map<string, string>();
  writes = 0;
  failRead = false;
  failWrite = false;
  getItem(key: string): string | null {
    if (this.failRead) throw new Error('blocked');
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    if (this.failWrite) throw new Error('quota');
    this.writes++;
    this.values.set(key, value);
  }
}
