import assert from 'node:assert/strict';
import test from 'node:test';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmdirSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createBrowserStateStore, createStateStore, STATE_STORAGE_KEY } from '../src/storage/state-store.js';
import { known, MemoryStorage, s01, success } from './helpers.js';

test('guardar/cargar desde otra instancia conserva todos los campos y deja otras claves intactas', () => {
  const memory = new MemoryStorage();
  memory.values.set('otro-proyecto', 'intacto');
  const state = s01();
  state.observed.money = { status: 'unknown', reason: 'Sin transcribir' };
  state.observed.jokers = known([{ instanceId: 'g', catalogId: 'green_joker', edition: known('base'),
    stickers: known([]), sellValue: known(2), counters: { greenMult: known(17) } }]);
  const first = createStateStore(() => memory);
  assert.equal(success(first.load()), null);
  success(first.save(state));
  const second = createStateStore(() => memory);
  assert.deepEqual(success(second.load()), state);
  assert.deepEqual(success(second.importJson(success(first.exportJson(state)))), state);
  assert.equal(memory.values.get('otro-proyecto'), 'intacto');
});

test('guardar/importar datos inválidos no escribe ni pierde la partida anterior', () => {
  const memory = new MemoryStorage(), store = createStateStore(() => memory);
  const state = s01(); success(store.save(state));
  const raw = memory.values.get(STATE_STORAGE_KEY);
  for (const result of [store.save({}), store.importJson('{'), store.importJson(JSON.stringify({ ...state, schemaVersion: '2.0' }))]) {
    assert.equal(result.ok, false);
  }
  assert.equal(memory.writes, 1);
  assert.equal(memory.values.get(STATE_STORAGE_KEY), raw);
  assert.deepEqual(success(store.load()), state);
});

test('fallos de cuota y de acceso no declaran éxito; la partida previa permanece', () => {
  const memory = new MemoryStorage(), store = createStateStore(() => memory);
  const state = s01(); success(store.save(state));
  memory.failWrite = true;
  const failure = store.save({ ...state, revision: 1 });
  assert.ok(!failure.ok && failure.errors[0]?.code === 'storage_write');
  memory.failWrite = false;
  assert.deepEqual(success(store.load()), state);
  memory.failRead = true;
  const read = store.load();
  assert.ok(!read.ok && read.errors[0]?.code === 'storage_read');
  const unavailable = createStateStore(() => { throw new Error('security'); });
  assert.equal(unavailable.save(state).ok, false);
  assert.equal(unavailable.load().ok, false);
  assert.ok(unavailable.exportJson(state).ok);
});

test('guardado corrupto no se elimina, se repara ni se reemplaza por un borrador', () => {
  const memory = new MemoryStorage(); memory.values.set(STATE_STORAGE_KEY, '{corrupt');
  const result = createStateStore(() => memory).load();
  assert.ok(!result.ok && result.errors[0]?.code === 'invalid_json');
  assert.equal(memory.values.get(STATE_STORAGE_KEY), '{corrupt');
  assert.equal(memory.writes, 0);
});

test('adaptador navegador captura el error cuando window no está disponible', () => {
  const store = createBrowserStateStore();
  assert.equal(store.load().ok, false);
  assert.equal(store.save(s01()).ok, false);
  assert.ok(store.exportJson(s01()).ok);
});

test('Web Storage real de Node conserva la partida al terminar y recrear el proceso', () => {
  // Not a Chrome/Android test: this verifies the native Storage contract across processes.
  const folder = mkdtempSync(join(tmpdir(), 'balatro-h1-storage-'));
  const storageFile = join(folder, 'storage');
  const moduleUrl = new URL('../src/storage/state-store.js', import.meta.url).href;
  const state = s01();
  const script = `import { createStateStore } from ${JSON.stringify(moduleUrl)};
    const store = createStateStore(() => globalThis.localStorage);
    const result = process.env.BSA_TEST_STATE ? store.save(JSON.parse(process.env.BSA_TEST_STATE)) : store.load();
    if (!result.ok) throw new Error(JSON.stringify(result.errors));
    process.stdout.write(JSON.stringify(result.value));`;
  const args = ['--experimental-webstorage', `--localstorage-file=${storageFile}`, '--input-type=module', '-e', script];
  try {
    const write = execFileSync(process.execPath, args, { env: { ...process.env, BSA_TEST_STATE: JSON.stringify(state) }, encoding: 'utf8' });
    const read = execFileSync(process.execPath, args, { env: { ...process.env, BSA_TEST_STATE: '' }, encoding: 'utf8' });
    assert.deepEqual(JSON.parse(write), state);
    assert.deepEqual(JSON.parse(read), state);
  } finally {
    // Delete only direct files in the exact test-created directory; never recursive deletion.
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const path = resolve(folder, entry.name);
      if (entry.isFile() && path.startsWith(resolve(folder) + '\\')) unlinkSync(path);
      else if (entry.isFile() && path.startsWith(resolve(folder) + '/')) unlinkSync(path);
    }
    rmdirSync(folder);
  }
});
