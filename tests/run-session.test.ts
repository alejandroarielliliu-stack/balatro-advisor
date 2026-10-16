import assert from 'node:assert/strict';
import test from 'node:test';
import {createUnknownState} from '../src/state/model.js';
import type {GameState,GameStateV02,Result} from '../src/state/model.js';
import {createConfirmedStore,CONFIRMED_STORAGE_KEY,analysisBinding,validateConfirmedRecord} from '../src/storage/confirmed-store.js';
import {createDraft} from '../src/state/model.js';
import {known,MemoryStorage,success} from './helpers.js';
const time='2026-10-16T18:00:00Z';
const blind={ante:1,kind:'small' as const,bossId:known('none'),target:known(300),reward:known(3)};
const inventory={unchanged:true as const};
const header=(s:GameState,id:string)=>({confirmationId:id,confirmed:true,expected:analysisBinding(s),updatedAt:time});
function setup(){const memory=new MemoryStorage(),store=createConfirmedStore(()=>memory),state=createUnknownState('synthetic-run-session',time);success(store.initialize(state));return {memory,store,state};}
function errorCode(r:Result<unknown>){assert.ok(!r.ok);return r.errors[0]!.code;}
function locate(store:ReturnType<typeof createConfirmedStore>,state:GameState,id='locate'){
  return success(store.progress({...header(state,id),command:{type:'locate',phase:'blind_select',blind},inventory}));
}
test('RUN01b progresar persiste estado e historial juntos y export/reload conserva payload y límites',()=>{
  const {memory,store,state}=setup(),initial=structuredClone(state);const saved=locate(store,state);
  assert.equal(saved.schemaVersion,'confirmed-2');assert.equal(saved.state.revision,1);assert.equal(saved.history.length,1);assert.equal(saved.history[0]!.kind,'progress');
  assert.deepEqual(saved.history[0]!.before,initial);assert.deepEqual(saved.history[0]!.after,saved.state);
  assert.ok('progress' in saved.history[0]!&&saved.history[0].progress!.limitations.length>0);
  assert.deepEqual(success(createConfirmedStore(()=>memory).load()),saved);
  const restored=createConfirmedStore(()=>new MemoryStorage());assert.deepEqual(success(restored.restoreJson(success(store.exportJson()),{confirmed:true,expectedRaw:null})),saved);success(validateConfirmedRecord(saved));
});
test('RUN01b acción obsoleta y doble confirmación no escriben; dos avances legítimos distintos sí',()=>{
  const {memory,store,state}=setup();const first={...header(state,'locate'),command:{type:'locate',phase:'blind_select',blind},inventory};
  const current=success(store.progress(first)),raw=memory.getItem(CONFIRMED_STORAGE_KEY),writes=memory.writes;
  assert.equal(errorCode(store.progress(first)),'duplicate_confirmation');
  assert.equal(errorCode(store.progress({...header(state,'old'),command:{type:'enter_round'},inventory})),'stale_revision');
  assert.equal(memory.writes,writes);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);
  const next=success(store.progress({...header(current.state,'enter'),command:{type:'enter_round'},inventory}));assert.equal(next.state.phase,'in_round');assert.equal(next.history.length,2);
});
test('RUN01b confirmar false, inventario omitido, acción ilegal y timestamp inválido no escriben',()=>{
  const {memory,store,state}=setup();const raw=memory.getItem(CONFIRMED_STORAGE_KEY),writes=memory.writes;
  for(const request of [
    {...header(state,'a'),confirmed:false,command:{type:'locate',phase:'shop',blind},inventory},
    {...header(state,'b'),command:{type:'locate',phase:'shop',blind}},
    {...header(state,'c'),command:{type:'collect_cashout',money:10},inventory},
    {...header(state,'d'),updatedAt:'invalid',command:{type:'locate',phase:'shop',blind},inventory},
    {...header(state,'e'),command:{type:'locate',phase:'shop',blind},inventory,projectedState:state}
  ])assert.ok(!store.progress(request).ok);
  assert.equal(memory.writes,writes);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);
});
test('RUN01b quota deja intactos estado, historial y revisión, permite reintento mismo ID',()=>{
  const {memory,store,state}=setup(),raw=memory.getItem(CONFIRMED_STORAGE_KEY);memory.failWrite=true;
  assert.equal(errorCode(store.progress({...header(state,'locate'),command:{type:'locate',phase:'blind_select',blind},inventory})),'storage_write');
  assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);memory.failWrite=false;assert.equal(locate(store,state).state.revision,1);
});
test('RUN01b undoLatest recupera avance anterior sin borrar historial y necesita nueva revisión',()=>{
  const {store,state}=setup(),saved=locate(store,state);
  const undone=success(store.undoLatest({...header(saved.state,'undo'),targetEntryId:'locate',reason:'La fase estaba mal.'}));
  assert.equal(undone.state.phase,'unknown');assert.equal(undone.state.revision,2);assert.equal(undone.history.length,2);assert.deepEqual(undone.state.observed,state.observed);
  assert.equal(errorCode(store.progress({...header(state,'stale'),command:{type:'locate',phase:'shop',blind},inventory})),'stale_revision');success(validateConfirmedRecord(undone));
});
test('RUN01b confirmed-1 sigue legible y necesita migración explícita para el progreso',()=>{
  const memory=new MemoryStorage(),store=createConfirmedStore(()=>memory),state=createDraft('legacy',time);success(store.initialize(state));const raw=memory.getItem(CONFIRMED_STORAGE_KEY);
  assert.equal(errorCode(store.progress({...header(state,'a'),command:{type:'locate',phase:'shop',blind},inventory})),'migration_required');assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);
  const prepared=success(store.prepareMigration()),migrated=success(store.migrateToCurrent({confirmed:true,expectedRaw:prepared.expectedRaw}));
  assert.equal(errorCode(store.progress({...header(state,'old-binding'),command:{type:'locate',phase:'shop',blind},inventory})),'stale_revision');assert.equal(locate(store,migrated.state).state.phase,'blind_select');
});
test('RUN01b progreso solo pertenece a confirmed-2 y payload no puede disfrazarse de corrección',()=>{
  const {store,state}=setup(),saved=locate(store,state);
  const missing=structuredClone(saved) as unknown as {history:Record<string,unknown>[]};delete missing.history[0]!.progress;assert.ok(!validateConfirmedRecord(missing).ok);
  const wrong=structuredClone(saved) as unknown as {history:Record<string,unknown>[]};wrong.history[0]!.kind='correction';assert.ok(!validateConfirmedRecord(wrong).ok);
  const future=structuredClone(saved) as unknown as {history:{progress:{command:Record<string,unknown>}}[]};future.history[0]!.progress.command.type='skip';assert.ok(!validateConfirmedRecord(future).ok);
});
test('RUN01b un ciclo observado cobra saldo literal sin registrar ingresos o robos proyectados',()=>{
  const {store,state}=setup();let record=locate(store,state);
  record=success(store.progress({...header(record.state,'enter'),command:{type:'enter_round'},inventory}));
  record=success(store.progress({...header(record.state,'result'),command:{type:'report_result',outcome:'won',score:400,handsUsed:2,discardsUsed:0},inventory}));
  const cashout=record.state as GameStateV02;assert.equal(cashout.phase,'cashout');assert.equal(cashout.observed.money.status,'unknown');
  record=success(store.progress({...header(record.state,'cashout'),command:{type:'collect_cashout',money:27},inventory}));
  assert.deepEqual(record.state.observed.money,known(27));assert.equal(record.state.phase,'shop');assert.equal(record.state.observed.shop.status,'unknown');assert.equal(record.state.observed.deck.status,'unknown');assert.deepEqual(record.state.observed.lastCleared,known({ante:1,kind:'small'}));
});
