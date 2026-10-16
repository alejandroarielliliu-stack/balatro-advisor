import assert from 'node:assert/strict';
import {createNewRun} from './run/start.js';
import {createConfirmedStore,analysisBinding} from './storage/confirmed-store.js';
import type {Result} from './state/model.js';
import type {RunProgressCommand} from './run/progress.js';
import {nextBlindAfter} from './run/progress.js';
import type {StoragePort} from './storage/state-store.js';

/** Synthetic confirmations in memory, not a real game, browser save or predicted round. */
const ok=<T>(r:Result<T>):T=>{if(!r.ok)throw Error(JSON.stringify(r.errors));return r.value;};
const values=new Map<string,string>();let writes=0;
const memory:StoragePort={getItem:key=>values.get(key)??null,setItem:(key,value)=>{values.set(key,value);writes++;}};
const store=createConfirmedStore(()=>memory);
let record=ok(store.initialize(ok(createNewRun({runId:'synthetic-run-progress',updatedAt:'2026-10-16T12:00:00Z',deckId:'yellow',profileConfirmed:true}))));
const steps:unknown[]=[];
const summary=()=>({revision:record.state.revision,phase:record.state.phase,money:record.state.observed.money,
  blind:record.state.observed.nextBlind,shop:record.state.observed.shop,history:record.history.length});
const act=(command:RunProgressCommand)=>{record=ok(store.progress({confirmationId:'real-event-'+steps.length,confirmed:true,
  expected:analysisBinding(record.state),updatedAt:'2026-10-16T12:01:00Z',command,inventory:{unchanged:true}}));steps.push(summary());};
steps.push(summary());
const rawBefore=ok(store.exportJson()),beforeWrites=writes;
// Reading a suggested successor is a pure query, never a transition.
nextBlindAfter(record.state,{ante:1,kind:'small'});assert.equal(writes,beforeWrites);assert.equal(ok(store.exportJson()),rawBefore);
act({type:'enter_round'});
act({type:'report_result',outcome:'won',score:412,handsUsed:2,discardsUsed:1});
assert.equal(summary().phase,'cashout');assert.equal(record.state.observed.money.status,'unknown');
act({type:'collect_cashout',money:22}); // Literal observed total; no claim about how $22 was earned.
assert.deepEqual(record.state.observed.money,{status:'known',source:'manual',value:22});
assert.equal(record.state.observed.shop.status,'unknown');
act({type:'leave_shop'});assert.equal(summary().phase,'blind_select');
assert.deepEqual(ok(createConfirmedStore(()=>memory).load()),record);
const stale=store.progress({confirmationId:'stale-report',confirmed:true,
  expected:{runId:record.state.runId,revision:0,rulesetId:record.state.rulesetId,schemaVersion:'0.2'},
  updatedAt:'2026-10-16T12:02:00Z',command:{type:'enter_round'},inventory:{unchanged:true}});
assert.equal(stale.ok,false);
const latest=record.history.at(-1)!;
record=ok(store.undoLatest({confirmationId:'undo-exit',confirmed:true,expected:analysisBinding(record.state),updatedAt:'2026-10-16T12:03:00Z',targetEntryId:latest.id,reason:'No había salido de la tienda.'}));
assert.equal(summary().phase,'shop');
console.log(JSON.stringify({demo:'RUN01b · recorrido observado',consultationWrites:0,steps,reloadPreserved:true,
  staleAnalysis:stale.ok?null:stale.errors[0]!.code,undo:summary(),
  limits:'No se juegan manos, calculan cobros, generan ofertas ni saltan ciegas. Valores de resumen y saldo declarados, no observados por esta herramienta.'},null,2));
