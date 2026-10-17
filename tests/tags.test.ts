import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createNewRun} from '../src/run/start.js';
import {applyRunProgress} from '../src/run/progress.js';
import type {RunProgressCommand,InventoryConfirmation} from '../src/run/progress.js';
import type {GameState,GameStateV02,Result} from '../src/state/model.js';
import {createConfirmedStore,analysisBinding,CONFIRMED_STORAGE_KEY} from '../src/storage/confirmed-store.js';
import {TAGS} from '../src/catalog/tags.js';
import {scoreHand} from '../src/rules/scoring.js';
import {projectCashout,interestOnBalance} from '../src/rules/economy.js';
import {applyShopAction} from '../src/rules/shop.js';
import {MemoryStorage,known,success} from './helpers.js';
const time='2026-10-16T20:00:00Z';
const unknown={status:'unknown' as const,reason:'No observado.'};
const start=()=>success(createNewRun({runId:'synthetic-tags',updatedAt:time,deckId:'yellow',profileConfirmed:true}));
const act=(s:GameStateV02,c:RunProgressCommand,inventory:InventoryConfirmation={unchanged:true})=>success(applyRunProgress(s,c,{expectedRevision:s.revision,updatedAt:time,inventory})).state;
const skip=(s:GameStateV02)=>act(s,{type:'skip_blind',atNextSelection:true});
const error=(r:Result<unknown>,code:string)=>{assert.ok(!r.ok,JSON.stringify(r));assert.equal(r.errors[0]!.code,code);};
// Phase/counter oracles: button_callbacks.lua:2740ff and card.lua:2429ff in owned
// 1.0.1o-FULL. Software tests, never presented as gameplay observation.
test('TAG01 catálogo 24 identidades únicas; metadatos no afirman efectos implementados',()=>{
 assert.equal(TAGS.length,24);assert.equal(new Set(TAGS.map(t=>t.id)).size,24);
 assert.equal(TAGS.find(t=>t.id==='tag_orbital')?.trigger,'immediate');assert.equal(TAGS.find(t=>t.id==='tag_juggle')?.trigger,'round_start_bonus');
});
test('TAG01 salto Pequeña → Grande → Jefe; no ronda, cobro, tienda ni ante extra; no muta entrada',()=>{
 const s=start(),before=structuredClone(s);s.observed.jokerContext=known({blindsSkipped:known(2),tags:known([])});const saved=structuredClone(s);
 const big=skip(s);assert.deepEqual(s,saved);assert.equal(big.phase,'blind_select');assert.equal(big.observed.nextBlind.status,'known');if(big.observed.nextBlind.status==='known')assert.deepEqual([big.observed.nextBlind.value.ante,big.observed.nextBlind.value.kind],[1,'big']);
 assert.equal(big.observed.money.status,'unknown');assert.equal(big.observed.shop.status,'unknown');assert.deepEqual(big.observed.lastCleared,before.observed.lastCleared);assert.equal(big.recentRounds,undefined);
 if(big.observed.jokerContext?.status==='known'){assert.deepEqual(big.observed.jokerContext.value.blindsSkipped,known(3));assert.equal(big.observed.jokerContext.value.tags?.status,'unknown');}else assert.fail();
 const boss=skip(big);if(boss.observed.nextBlind.status==='known')assert.equal(boss.observed.nextBlind.value.kind,'boss');else assert.fail();
 error(applyRunProgress(boss,{type:'skip_blind',atNextSelection:true},{expectedRevision:boss.revision,updatedAt:time,inventory:{unchanged:true}}),'illegal_skip');
});
test('TAG01 exige fin de efectos y fase válida; identifica datos incompatibles sin mutación',()=>{
 const s=start(),before=structuredClone(s),options={expectedRevision:0,updatedAt:time,inventory:{unchanged:true as const}};
 for(const c of [{type:'skip_blind'},{type:'skip_blind',atNextSelection:false},{type:'observe_skip_tag',tag:known('tag_fake')},{type:'observe_tag_queue',tags:known(['tag_fake'])},{type:'skip_blind',atNextSelection:true,tags:known(['tag_fake'])}])assert.equal(applyRunProgress(s,c,options).ok,false);
 const round=act(s,{type:'enter_round'});error(applyRunProgress(round,{type:'skip_blind',atNextSelection:true},{...options,expectedRevision:round.revision}),'wrong_phase');
 const next={ante:2,kind:'small',bossId:known('none'),target:known(800),reward:known(3)};
 error(applyRunProgress(s,{type:'skip_blind',atNextSelection:true,nextBlind:next},options),'wrong_blind');assert.deepEqual(s,before);
});
test('TAG01 saldo final absoluto admite cero; cola observada admite múltiples Double; no crea duplicados',()=>{
 let s=act(start(),{type:'observe_skip_tag',tag:known('tag_double')});
 s=act(s,{type:'skip_blind',atNextSelection:true,money:0,tags:known(['tag_double','tag_double'])});assert.deepEqual(s.observed.money,known(0));
 if(s.observed.jokerContext?.status==='known')assert.deepEqual(s.observed.jokerContext.value.tags,known(['tag_double','tag_double']));else assert.fail();
 s=act(s,{type:'observe_tag_queue',tags:known([])},{reconcile:{changedGroups:['jokerContext']}});if(s.observed.jokerContext?.status==='known')assert.deepEqual(s.observed.jokerContext.value.tags,known([]));
});
test('TAG01 no se reinician contadores al saltar; total previo desconocido no se convierte en uno',()=>{
 let s=start();s.observed.jokerContext=known({blindsSkipped:unknown,handCounts:{pair:known(4)}});s.observed.jokers=known([{instanceId:'g',catalogId:'green_joker',edition:known('base'),stickers:known([]),sellValue:known(2),counters:{greenMult:known(9)}}]);
 const owned=structuredClone(s.observed.jokers);s=skip(s);assert.deepEqual(s.observed.jokers,owned);if(s.observed.jokerContext?.status==='known'){assert.equal(s.observed.jokerContext.value.blindsSkipped?.status,'unknown');assert.deepEqual(s.observed.jokerContext.value.handCounts,{pair:known(4)});}
});
test('TAG01 Orbital invalida bases; jefe desconocido o Boss Tag invalida jefe anterior, no lo reutiliza',()=>{
 let s=start();s.observed.visibleBoss=known({ante:1,kind:'boss',bossId:known('the_hook'),target:known(600),reward:known(5)});
 s=act(s,{type:'observe_skip_tag',tag:known('tag_boss')});s=skip(s);assert.equal(s.observed.visibleBoss.status,'unknown');
 s=act(s,{type:'observe_skip_tag',tag:known('tag_orbital')});s=skip(s);assert.equal(s.observed.handBases.status,'unknown');
 assert.equal(s.observed.nextBlind.status,'known');if(s.observed.nextBlind.status==='known')assert.equal(s.observed.nextBlind.value.bossId.status,'unknown');
});
test('TAG01 cola y total sobreviven a conciliación de otro historial; lo demás queda pendiente',()=>{
 let s=act(start(),{type:'skip_blind',atNextSelection:true,tags:known(['tag_double'])},{reconcile:{changedGroups:['jokerContext','deck']}});
 assert.equal(s.observed.deck.status,'unknown');if(s.observed.jokerContext?.status==='known'){assert.deepEqual(s.observed.jokerContext.value.blindsSkipped,known(1));assert.deepEqual(s.observed.jokerContext.value.tags,known(['tag_double']));assert.equal(s.observed.jokerContext.value.tarotsUsed,undefined);}else assert.fail();
});
function shop():GameState {const s=JSON.parse(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8')) as GameState;s.observed.jokers=known([]);return s;}
const hand={cardIds:['8S','8H'],discardsRemaining:3};
test('TAG01 Investment limita cobro de jefe; puntuación y compra observada siguen disponibles',()=>{
 const s=shop();s.observed.jokerContext=known({tags:known(['tag_investment'])});
 const score=scoreHand(s,hand);assert.ok(score.ok);assert.equal(score.value.score,52); // (10+8+8)*2, no jokers
 assert.ok(projectCashout(s,{handsRemaining:3,won:true,noMoneyChangesDuringRound:true}).ok);
 const boss=structuredClone(s);boss.observed.nextBlind=known({ante:1,kind:'boss',bossId:known('the_hook'),target:known(600),reward:known(5)});
 const cash=projectCashout(boss,{handsRemaining:3,won:true,noMoneyChangesDuringRound:true});assert.ok(!cash.ok);assert.equal(cash.errors[0]!.code,'unsupported_tag');
 assert.ok(applyShopAction(s,{type:'buy',offerId:'o1',instanceId:'bought'},{expectedRevision:s.revision,updatedAt:time}).ok);
});
test('TAG01 Juggle/cola desconocida bloquean recursos afectados; interés de saldo no depende de etiquetas',()=>{
 for(const tags of [known(['tag_juggle']),unknown,known(['tag_fake']),known(['tag_orbital'])]){
  const s=shop();s.observed.jokerContext=known({tags});const score=scoreHand(s,hand);assert.ok(!score.ok);assert.ok(['unsupported_tag','unknown_data'].includes(score.errors[0]!.code));
  assert.ok(applyShopAction(s,{type:'buy',offerId:'o1',instanceId:'independent-buy'},{expectedRevision:s.revision,updatedAt:time}).ok);
  const interest=interestOnBalance(s);assert.ok(interest.ok);assert.equal(interest.value,1); // explicit $7, floor(7/5)
 }
 const s=shop();s.observed.jokerContext=known({tags:known(['tag_double','tag_rare'])});assert.ok(scoreHand(s,hand).ok);
});
test('TAG01 modo estricto y guardados anteriores mantienen su contrato; cola vacía no se invalida al entrar',()=>{
 let s=start();s=act(s,{type:'enter_round'});if(s.observed.jokerContext?.status==='known')assert.deepEqual(s.observed.jokerContext.value.tags,{status:'known',source:'confirmedPreset',value:[]});
 const legacy=shop();assert.ok(scoreHand(legacy,hand).ok);const strict=scoreHand(legacy,hand,{requireObserved:true});assert.ok(!strict.ok);assert.equal(strict.errors[0]!.code,'pending_rule');
});
test('TAG01 guardado atómico, cuota, recarga, revisión antigua, duplicado y deshacer',()=>{
 const memory=new MemoryStorage(),store=createConfirmedStore(()=>memory);let record=success(store.initialize(start()));
 const request={confirmationId:'skip-1',confirmed:true,expected:analysisBinding(record.state),updatedAt:time,command:{type:'skip_blind',atNextSelection:true,money:13,tags:known([])},inventory:{unchanged:true}};
 const raw=memory.getItem(CONFIRMED_STORAGE_KEY);memory.failWrite=true;assert.equal(store.progress(request).ok,false);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);memory.failWrite=false;
 record=success(store.progress(request));assert.equal(record.history.length,1);assert.equal(record.state.revision,1);assert.deepEqual(success(createConfirmedStore(()=>memory).load()),record);
 assert.equal(store.progress(request).ok,false);assert.equal(record.history.length,1);
 assert.equal(store.progress({...request,confirmationId:'stale'}).ok,false);
 record=success(store.undoLatest({confirmationId:'undo-skip',confirmed:true,expected:analysisBinding(record.state),updatedAt:time,targetEntryId:'skip-1',reason:'No había saltado.'}));assert.equal(record.state.revision,2);assert.deepEqual(record.state.observed.money,{status:'known',source:'confirmedPreset',value:14});if(record.state.observed.nextBlind.status==='known')assert.equal(record.state.observed.nextBlind.value.kind,'small');
});

// Pair (10+8+8)*2=52; Throwback 2 skips = ×1.5 ->78, 3 skips = ×1.75 ->91.
// Independent literal arithmetic using card.lua / documented Throwback rule, not model-generated oracle.
test('TAG01 total registrado alimenta Throwback sin fingir otra ronda ni crecimiento de Green',()=>{
 const real=start();real.observed.jokerContext=known({blindsSkipped:known(2),tags:known([])});
 const advanced=act(real,{type:'skip_blind',atNextSelection:true,tags:known([])});
 const before=shop();before.observed.jokers=known([{instanceId:'tb',catalogId:'throwback',edition:known('base'),stickers:known([]),sellValue:known(3),counters:{}}]);before.observed.jokerContext=known({blindsSkipped:known(2),tags:known([])});
 const after=structuredClone(before);assert.ok(advanced.observed.jokerContext);after.observed.jokerContext=advanced.observed.jokerContext;
 const a=scoreHand(before,hand),b=scoreHand(after,hand);assert.ok(a.ok);assert.ok(b.ok);assert.equal(a.value.score,78);assert.equal(b.value.score,91);
});
