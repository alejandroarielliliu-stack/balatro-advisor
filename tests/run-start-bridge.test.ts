import assert from 'node:assert/strict';
import test from 'node:test';
import {createNewRun} from '../src/run/start.js';
import {createDraft,legacyShape} from '../src/state/model.js';
import type {GameStateV02} from '../src/state/model.js';
import {validateCurrentState,validateLegacyState} from '../src/state/validation.js';
import {createConfirmedStore,CONFIRMED_STORAGE_KEY,analysisBinding} from '../src/storage/confirmed-store.js';
import {createRunStartBridge} from '../src/ui/run-start-bridge.js';
import type {RunStartRequest} from '../src/ui/run-start-bridge.js';
import {MemoryStorage,success} from './helpers.js';

const time='2026-11-07T12:00:00Z';
const initial=()=>success(createNewRun({runId:'existing-manual-run',updatedAt:time,deckId:'blue',profileConfirmed:true}));
function harness(state?:GameStateV02){
  const storage=new MemoryStorage(),store=createConfirmedStore(()=>storage);
  if(state)success(store.initialize(state));
  let error='',exports=0,ids=0;
  let pending:{options:{replacing:boolean;profileRequired:boolean};confirm:(profile:boolean)=>boolean}|null=null;
  const flags={writable:true,dirty:false,loadFailed:false};
  const bridge=createRunStartBridge({
    context:()=>({record:success(store.load()),raw:storage.values.get(CONFIRMED_STORAGE_KEY)??null,...flags}),
    save:(next,expectedRaw,replacing)=>{
      const saved=replacing?store.restoreJson(JSON.stringify(next),{confirmed:true,expectedRaw}):store.initialize(next);
      if(!saved.ok){error=saved.errors.map(issue=>issue.message).join(' ');return false;}return true;
    },
    confirmStart:(options,confirm)=>{pending={options,confirm};},
    exportCurrent:()=>{exports++;},reportError:text=>{error=text;},error:()=>error,runId:()=>`new-manual-run-${++ids}`,now:()=>time
  });
  return {storage,store,flags,bridge,get error(){return error;},get exports(){return exports;},get ids(){return ids;},get pending(){if(!pending)throw Error('Confirmation not opened');return pending;}};
}
const request:RunStartRequest={deckId:'blue',profileConfirmed:true};

// UI/persistence contracts only: these are not observed game or RNG tests.
test('run selector stores manual seed atomically in current state and initial snapshot',()=>{
  const h=harness();let started=0;
  assert.equal(h.bridge.requestStart({...request,seed:'  manual-reference  '},()=>{started++;}),null);
  assert.equal(started,1);assert.equal(h.storage.writes,1);
  const saved=success(h.store.load())!;assert.equal(saved.schemaVersion,'confirmed-2');
  assert.equal(saved.state.schemaVersion,'0.2');assert.equal(saved.initialState.schemaVersion,'0.2');
  if(saved.state.schemaVersion!=='0.2'||saved.initialState.schemaVersion!=='0.2')assert.fail('Current schema');
  assert.equal(saved.state.seed,'manual-reference');assert.equal(saved.initialState.seed,'manual-reference');assert.deepEqual(saved.history,[]);
  assert.deepEqual(saved.state.observed,initial().observed,'The label never changes generated observations');
  assert.deepEqual(saved.state.assumptions,initial().assumptions,'The label never creates hypothetical inputs');
  const reloaded=createConfirmedStore(()=>h.storage);assert.equal(success(reloaded.load())?.state.schemaVersion,'0.2');
  assert.deepEqual(success(reloaded.load()),saved);
});

test('run selector preserves old documents without seed; frozen0.1 reader does not acquire field',()=>{
  const current=initial();assert.equal(validateCurrentState(current).ok,true);
  assert.equal(Object.hasOwn(current,'seed'),false);
  const seeded={...current,seed:'referencia / manual'};
  assert.equal(validateCurrentState(seeded).ok,true,'Manual text is bounded without inventing a game seed alphabet');
  const projected=legacyShape(seeded as unknown as Record<string,unknown>);assert.equal(Object.hasOwn(projected,'seed'),false);
  assert.equal(validateLegacyState(projected).ok,true);
  const old=createDraft('legacy-run',time);assert.equal(validateLegacyState(old).ok,true);
  assert.equal(validateLegacyState({...old,seed:'label'}).ok,false);
  for(const seed of ['', ' '.repeat(3),'x'.repeat(65),42,null,undefined]){
    const invalid=validateCurrentState({...current,seed});assert.equal(invalid.ok,false);
    if(!invalid.ok)assert.ok(invalid.errors.some(error=>error.path==='$.seed'));
  }
  assert.equal(validateCurrentState({...current,seed:'x'.repeat(64)}).ok,true);
});

test('seed remains a reference through corrections, progress, undo and exported history',()=>{
  const h=harness();h.bridge.requestStart({...request,seed:'manual-reference'},()=>{});
  let record=success(h.store.load())!;
  record=success(h.store.correct({confirmationId:'observed-balance',confirmed:true,expected:analysisBinding(record.state),updatedAt:time,patch:{money:{status:'known',source:'manual',value:9}},reason:'Balance manually observed.'}));
  record=success(h.store.progress({confirmationId:'entered-blind',confirmed:true,expected:analysisBinding(record.state),updatedAt:time,command:{type:'enter_round'},inventory:{unchanged:true}}));
  assert.equal(record.state.phase,'in_round');
  record=success(h.store.undoLatest({confirmationId:'corrected-entry',confirmed:true,expected:analysisBinding(record.state),updatedAt:time,targetEntryId:'entered-blind',reason:'Correct the local record.'}));
  assert.equal(record.state.phase,'blind_select');
  for(const state of [record.initialState,record.state,...record.history.flatMap(entry=>[entry.before,entry.after])]){
    if(state.schemaVersion!=='0.2')assert.fail('Current snapshots required');assert.equal(state.seed,'manual-reference');
  }
  const importedStorage=new MemoryStorage(),restored=createConfirmedStore(()=>importedStorage);
  const imported=success(restored.restoreJson(success(h.store.exportJson()),{confirmed:true,expectedRaw:null}));
  assert.deepEqual(imported,record);assert.deepEqual(success(restored.load()),record);
});

test('profile is explicitly confirmed before a visitor gets a registered new run',()=>{
  const h=harness();let started=0;
  assert.equal(h.bridge.requestStart({...request,profileConfirmed:false,seed:'manual'},()=>{started++;}),null);
  assert.deepEqual(h.pending.options,{replacing:false,profileRequired:true});
  assert.equal(h.storage.writes,0);assert.equal(h.ids,0);assert.equal(success(h.store.load()),null);
  assert.equal(h.pending.confirm(false),false);assert.match(h.error,/Confirma Steam/);assert.equal(h.storage.writes,0);assert.equal(h.ids,0);
  assert.equal(h.pending.confirm(true),true);assert.equal(started,1);assert.equal(h.storage.writes,1);
  assert.equal(h.pending.confirm(true),false);assert.equal(h.storage.writes,1);assert.equal(started,1);
});

test('exploring snapshot and export does not mutate a saved run or history',()=>{
  const state=initial();state.seed='old-reference';const h=harness(state),before=h.storage.values.get(CONFIRMED_STORAGE_KEY),writes=h.storage.writes;
  const copy=h.bridge.snapshot();assert.equal(copy.record?.state.runId,state.runId);
  if(copy.record?.state.schemaVersion==='0.2')copy.record.state.seed='hypothetical';
  copy.record!.state.observed.money={status:'known',source:'manual',value:999};
  h.bridge.exportCurrent();assert.equal(h.exports,1);assert.equal(h.storage.writes,writes);
  assert.equal(h.storage.values.get(CONFIRMED_STORAGE_KEY),before);
});

test('replacement combines profile confirmation and expected saved record; cancellation writes nothing',()=>{
  const state=initial();state.seed='old-reference';const h=harness(state),before=h.storage.values.get(CONFIRMED_STORAGE_KEY),writes=h.storage.writes;let started=0;
  assert.equal(h.bridge.requestStart({...request,profileConfirmed:false,seed:'new-reference'},()=>{started++;}),null);
  assert.deepEqual(h.pending.options,{replacing:true,profileRequired:true});assert.equal(h.storage.values.get(CONFIRMED_STORAGE_KEY),before);assert.equal(h.storage.writes,writes);
  assert.equal(h.pending.confirm(false),false);assert.equal(h.storage.values.get(CONFIRMED_STORAGE_KEY),before);
  assert.equal(h.pending.confirm(true),true);assert.equal(h.storage.writes,writes+1);assert.equal(started,1);
  const saved=success(h.store.load())!;assert.equal(saved.state.runId,'new-manual-run-1');
  if(saved.state.schemaVersion!=='0.2')assert.fail('Current schema');assert.equal(saved.state.seed,'new-reference');assert.deepEqual(saved.history,[]);
});

test('explicit inline replacement starts directly without a second confirmation callback',()=>{
  const state=initial();state.seed='previous-reference';
  const h=harness(state),writes=h.storage.writes;let started=0;
  assert.equal(h.bridge.requestStart({...request,replaceConfirmed:true,seed:'new-reference'},()=>{started++;}),null);
  assert.throws(()=>h.pending,/Confirmation not opened/,'Inline consent must bypass confirmStart');
  assert.equal(started,1);assert.equal(h.storage.writes,writes+1);
  const saved=success(h.store.load())!;
  assert.equal(saved.state.runId,'new-manual-run-1');assert.deepEqual(saved.history,[]);
  if(saved.state.schemaVersion!=='0.2')assert.fail('Current schema');
  assert.equal(saved.state.seed,'new-reference');
});

test('direct inline replacement keeps previous bytes on save failure and permits an explicit retry',()=>{
  const state=initial();state.seed='keep-this-reference';
  const h=harness(state),before=h.storage.values.get(CONFIRMED_STORAGE_KEY),writes=h.storage.writes;let started=0;
  h.storage.failWrite=true;
  assert.ok(h.bridge.requestStart({...request,replaceConfirmed:true,seed:'replacement'},()=>{started++;}));
  assert.throws(()=>h.pending,/Confirmation not opened/);
  assert.equal(started,0);assert.equal(h.storage.writes,writes);assert.equal(h.storage.values.get(CONFIRMED_STORAGE_KEY),before);assert.ok(h.error);
  h.storage.failWrite=false;
  assert.equal(h.bridge.requestStart({...request,replaceConfirmed:true,seed:'replacement'},()=>{started++;}),null);
  assert.throws(()=>h.pending,/Confirmation not opened/);
  assert.equal(started,1);assert.equal(h.storage.writes,writes+1);
  const saved=success(h.store.load())!;
  if(saved.state.schemaVersion!=='0.2')assert.fail('Current schema');
  assert.equal(saved.state.seed,'replacement');
});

test('stale replacement cannot overwrite a changed run',()=>{
  const state=initial(),h=harness(state);let started=0;
  h.bridge.requestStart({...request,seed:'replacement'},()=>{started++;});
  success(h.store.correct({confirmationId:'other-observation',confirmed:true,expected:analysisBinding(state),updatedAt:time,patch:{money:{status:'known',source:'manual',value:20}},reason:'Observed balance changed outside the selector.'}));
  const changed=h.storage.values.get(CONFIRMED_STORAGE_KEY),writes=h.storage.writes;
  assert.equal(h.pending.confirm(true),false);assert.match(h.error,/cambió/);assert.equal(started,0);assert.equal(h.storage.writes,writes);assert.equal(h.storage.values.get(CONFIRMED_STORAGE_KEY),changed);
});

test('save failure retains previous full record including its seed; retry saves once',()=>{
  const state=initial();state.seed='keep-me';const h=harness(state),before=h.storage.values.get(CONFIRMED_STORAGE_KEY),writes=h.storage.writes;let started=0;
  h.bridge.requestStart({...request,seed:'new-reference'},()=>{started++;});h.storage.failWrite=true;
  assert.equal(h.pending.confirm(true),false);assert.equal(started,0);assert.equal(h.storage.writes,writes);assert.equal(h.storage.values.get(CONFIRMED_STORAGE_KEY),before);assert.ok(h.error);
  h.storage.failWrite=false;assert.equal(h.pending.confirm(true),true);assert.equal(h.storage.writes,writes+1);assert.equal(started,1);
});

test('invalid seed, unsupported deck, reader, pending draft and load failure never write',()=>{
  for(const seed of ['', ' '.repeat(3),'x'.repeat(65)]){const h=harness();let started=0;assert.ok(h.bridge.requestStart({...request,seed},()=>{started++;}));assert.equal(h.storage.writes,0);assert.equal(started,0);}
  const unsupported=harness();assert.ok(unsupported.bridge.requestStart({...request,deckId:'ghost'},()=>assert.fail('Unsupported start')));assert.equal(unsupported.storage.writes,0);
  for(const flag of ['writable','dirty','loadFailed'] as const){const h=harness();h.flags[flag]=flag!=='writable';assert.ok(h.bridge.requestStart(request,()=>assert.fail('Blocked start')));assert.equal(h.storage.writes,0);}
  const h=harness(initial());h.bridge.requestStart(request,()=>assert.fail('Lost control'));h.flags.writable=false;const writes=h.storage.writes;assert.equal(h.pending.confirm(true),false);assert.equal(h.storage.writes,writes);
});
