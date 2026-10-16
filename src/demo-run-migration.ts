import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseState} from './state/validation.js';
import type {Fact,Result} from './state/model.js';
import {analysisBinding,createConfirmedStore,CONFIRMED_STORAGE_KEY} from './storage/confirmed-store.js';
import type {StoragePort} from './storage/state-store.js';

/** A format demonstration in memory; it never reads or writes a real browser run. */
const ok=<T>(r:Result<T>):T=>{if(!r.ok)throw new Error(JSON.stringify(r.errors));return r.value;};
const value=<T>(f:Fact<T>):T=>{if(f.status!=='known')throw new Error(f.reason);return f.value;};
const values=new Map<string,string>();let writes=0;
const memory:StoragePort={getItem:key=>values.get(key)??null,setItem:(key,data)=>{values.set(key,data);writes++;}};
const store=createConfirmedStore(()=>memory);
const state=ok(parseState(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8')));
state.observed.money={status:'known',value:25,source:'manual'};
const initial=ok(store.initialize(state));
const bought=ok(store.confirm({confirmed:true,confirmationId:'actual-buy',expected:analysisBinding(initial.state),
  updatedAt:'2026-10-16T12:00:00Z',action:{type:'buy',offerId:'o1',instanceId:'my-joker'}}));
assert.equal(value(bought.state.observed.money),23);
// Deliberate indentation/newline proves that the backup preserves the original raw file.
memory.setItem(CONFIRMED_STORAGE_KEY,JSON.stringify(bought,null,2)+'\n');
const originalRaw=values.get(CONFIRMED_STORAGE_KEY)!;
const oldBinding=analysisBinding(bought.state),writesBeforePreview=writes;
const preview=ok(store.prepareMigration());assert.equal(writes,writesBeforePreview);
const previewWrites=writes-writesBeforePreview;
const migrated=ok(store.migrateToCurrent({confirmed:true,expectedRaw:preview.expectedRaw}));
assert.equal(migrated.state.revision,bought.state.revision);
assert.equal(migrated.history.length,1);assert.equal(migrated.history[0]!.before.schemaVersion,'0.2');
assert.equal(ok(store.exportMigrationBackup()),originalRaw);
assert.deepEqual(ok(createConfirmedStore(()=>memory).load()),migrated);
const stale=store.confirm({confirmed:true,confirmationId:'old-analysis',expected:oldBinding,
  updatedAt:'2026-10-16T12:01:00Z',action:{type:'hold'}});
assert.equal(stale.ok,false);if(stale.ok)throw new Error('El análisis antiguo debía rechazarse.');
assert.equal(stale.errors[0]!.code,'stale_revision');
const undone=ok(store.undoLatest({confirmed:true,confirmationId:'actual-undo',expected:analysisBinding(migrated.state),
  updatedAt:'2026-10-16T12:02:00Z',targetEntryId:'actual-buy',reason:'La compra se registró por error.'}));
assert.equal(value(undone.state.observed.money),25);
const recovered=new Map<string,string>();
const recovery=createConfirmedStore(()=>({getItem:key=>recovered.get(key)??null,setItem:(key,data)=>{recovered.set(key,data);}}));
const restored=ok(recovery.restoreJson(ok(store.exportMigrationBackup()),{confirmed:true,expectedRaw:null}));
assert.equal(restored.schemaVersion,'confirmed-1');assert.deepEqual(restored,bought);
console.log(JSON.stringify({demo:'RUN01a · migración explícita y recuperable',
  before:{format:bought.schemaVersion,state:bought.state.schemaVersion,revision:bought.state.revision,money:23},
  preview:{writes:previewWrites,snapshots:2+preview.record.history.length*2},
  after:{format:migrated.schemaVersion,state:migrated.state.schemaVersion,phase:migrated.state.phase,
    revision:migrated.state.revision,money:value(migrated.state.observed.money),history:migrated.history.length},
  backup:{exactOriginal:true,restoredFormat:restored.schemaVersion},
  oldAnalysis:stale.errors[0]!.code,undo:{money:value(undone.state.observed.money),revision:undone.state.revision},
  limit:'No avanza ciegas ni reconstruye la fase de un borrador. No aporta observaciones nuevas del juego.'},null,2));
