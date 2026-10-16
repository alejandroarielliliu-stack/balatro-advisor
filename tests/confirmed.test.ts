import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createConfirmedStore,analysisBinding,CONFIRMED_STORAGE_KEY,validateConfirmedRecord} from '../src/storage/confirmed-store.js';
import {createStateStore,STATE_STORAGE_KEY} from '../src/storage/state-store.js';
import {parseState} from '../src/state/validation.js';
import {adviseShop} from '../src/advisor/advisor.js';
import {comparisonDemoScenarios} from '../src/demo-scenarios.js';
import {known,MemoryStorage,success} from './helpers.js';
import type {GameState} from '../src/state/model.js';
const fixture=()=>success(parseState(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8')));
const time='2026-10-10T20:00:00Z';
const header=(s:GameState,id='c1')=>({confirmationId:id,confirmed:true,expected:analysisBinding(s),updatedAt:time});
function setup(state=fixture()){const memory=new MemoryStorage();success(createStateStore(()=>memory).save(state));const store=createConfirmedStore(()=>memory);success(store.migrateLegacy());return {state,memory,store};}
test('T09b migración explícita sin tocar H1; consejo no guarda y acción no recomendada sí puede confirmarse',()=>{
  const {state,memory,store}=setup();const raw=memory.values.get(CONFIRMED_STORAGE_KEY),legacy=memory.values.get(STATE_STORAGE_KEY);
  const plan=comparisonDemoScenarios(state)[0]!.plan;
  const advice=success(adviseShop(state,[{role:'representative',plan}],{expectedRevision:0,updatedAt:time}));
  assert.equal(advice.recommendation.action?.type,'buy');assert.equal(memory.values.get(CONFIRMED_STORAGE_KEY),raw);
  const saved=success(store.confirm({...header(state),action:{type:'buy',offerId:'o1',instanceId:'j'}}));
  assert.deepEqual(saved.state.observed.money,known(5));assert.equal(saved.state.revision,1);assert.equal(saved.history.length,1);
  assert.deepEqual(success(createConfirmedStore(()=>memory).load()),saved);assert.equal(memory.values.get(STATE_STORAGE_KEY),legacy);
  assert.deepEqual(saved.state.assumptions,state.assumptions);assert.deepEqual(saved.state.observed.nextBlind,state.observed.nextBlind);
  assert.deepEqual(saved.state.observed.deck,state.observed.deck);assert.equal(saved.history[0]!.evidence!.verifiedAgainstGame,false);
});
test('T09b revisión antigua, runId ajeno y confirmación duplicada se rechazan; compras distintas son legítimas',()=>{
  const s=fixture();s.observed.money=known(20);const {store,memory,state}=setup(s);
  const first={...header(state),action:{type:'buy',offerId:'o1',instanceId:'j'}};
  const a=success(store.confirm(first));const raw=memory.values.get(CONFIRMED_STORAGE_KEY);
  const duplicate=store.confirm(first);assert.ok(!duplicate.ok);assert.equal(duplicate.errors[0]!.code,'duplicate_confirmation');
  const stale=store.confirm({...header(state,'c2'),action:{type:'buy',offerId:'o2',instanceId:'h'}});assert.ok(!stale.ok);assert.equal(stale.errors[0]!.code,'stale_revision');
  assert.equal(memory.values.get(CONFIRMED_STORAGE_KEY),raw);
  const foreign=store.confirm({...header({...a.state,runId:'other'},'c2'),action:{type:'hold'}});assert.ok(!foreign.ok);
  const b=success(store.confirm({...header(a.state,'c2'),action:{type:'buy',offerId:'o2',instanceId:'h'}}));
  assert.equal(b.history.length,2);assert.deepEqual(b.state.observed.money,known(13));
});
test('T09b venta sola no compra; reemplazo completo es atómico y contiene ambas trazas',()=>{
  const s=comparisonDemoScenarios(fixture())[2]!.state;const a=setup(s);
  const sold=success(a.store.confirm({...header(s),action:{type:'sell',instanceId:'g'}}));
  assert.deepEqual(sold.state.observed.money,known(12));assert.deepEqual(sold.state.observed.jokers,known([]));
  assert.deepEqual(sold.state.observed.shop,s.observed.shop);
  const b=setup(s);const replaced=success(b.store.confirm({...header(s),action:{type:'replace',sellInstanceId:'g',offerId:'o2',instanceId:'h'}}));
  assert.equal(replaced.state.revision,2);assert.equal(replaced.history.length,1);assert.deepEqual(replaced.state.observed.money,known(7));
  assert.deepEqual(replaced.history[0]!.trace.map(t=>t.label),['Venta','Compra']);
  const c=setup(s),raw=c.memory.values.get(CONFIRMED_STORAGE_KEY);
  assert.ok(!c.store.confirm({...header(s),action:{type:'replace',sellInstanceId:'g',offerId:'absent',instanceId:'h'}}).ok);
  assert.equal(c.memory.values.get(CONFIRMED_STORAGE_KEY),raw);
});
test('T09b confirmación explícita, acción ilegal y payload de escenario no escriben',()=>{
  const {state,store,memory}=setup();const raw=memory.values.get(CONFIRMED_STORAGE_KEY);
  for(const request of [
    {...header(state),confirmed:false,action:{type:'hold'}},
    {...header(state),action:{type:'sell',instanceId:'missing'}},
    {...header(state),action:{type:'hold'},projectedState:state},
    {...header(state),action:{type:'hold'},updatedAt:'invalid'}
  ])assert.ok(!store.confirm(request).ok);
  assert.equal(memory.values.get(CONFIRMED_STORAGE_KEY),raw);
  const strict=store.confirm({...header(state),action:{type:'hold'}},{requireObserved:true});assert.ok(!strict.ok);assert.equal(strict.errors[0]!.code,'pending_rule');
});
test('T09b discrepancia no declara éxito; corrección manual explícita conserva motivo, revisión y formato H1',()=>{
  const {state,store,memory}=setup();const raw=memory.values.get(CONFIRMED_STORAGE_KEY);
  const mismatch=store.confirm({...header(state),action:{type:'buy',offerId:'o1',instanceId:'j'},observedAfter:{money:6,jokerIds:['j'],offerIds:['o2']}});
  assert.ok(!mismatch.ok);assert.equal(mismatch.errors[0]!.code,'model_discrepancy');assert.equal(memory.values.get(CONFIRMED_STORAGE_KEY),raw);
  const corrected=success(store.correct({...header(state,'manual1'),patch:{money:known(6)},reason:'Transcribí mal el saldo; corrección manual, no compra calculada.'}));
  assert.equal(corrected.history[0]!.kind,'correction');assert.equal(corrected.history[0]!.evidence,null);assert.deepEqual(corrected.state.observed.money,known(6));
  assert.ok(!store.correct({...header(corrected.state,'manual2'),patch:{money:known(-1.5)},reason:'Error'}).ok);
});
test('T09b undo conserva historial y revisiones crecientes; el ID original sigue protegido',()=>{
  const {state,store}=setup();const request={...header(state),action:{type:'buy',offerId:'o1',instanceId:'j'}};
  const a=success(store.confirm(request));
  const undone=success(store.undoLatest({...header(a.state,'undo1'),targetEntryId:'c1',reason:'Compra registrada por error; no se realizó.'}));
  assert.equal(undone.state.revision,2);assert.deepEqual(undone.state.observed,state.observed);assert.equal(undone.history.length,2);
  assert.deepEqual(undone.history[1]!.before,a.state);assert.equal(undone.history[1]!.targetEntryId,'c1');
  assert.ok(!store.confirm({...request,expected:analysisBinding(undone.state)}).ok);
  assert.ok(!store.undoLatest({...header(undone.state,'undo2'),targetEntryId:'c1',reason:'Otra vez'}).ok);
  const again=success(store.confirm({...request,...header(undone.state,'c2')}));assert.equal(again.state.revision,3);
});
test('T09b fallo de cuota/lectura/corrección/undo conserva el documento entero y permite reintentar',()=>{
  const {state,store,memory}=setup();const request={...header(state),action:{type:'buy',offerId:'o1',instanceId:'j'}};
  const raw=memory.values.get(CONFIRMED_STORAGE_KEY);memory.failWrite=true;
  assert.ok(!store.confirm(request).ok);assert.equal(memory.values.get(CONFIRMED_STORAGE_KEY),raw);
  assert.ok(!store.correct({...header(state),patch:{money:known(8)},reason:'Transcripción'}).ok);
  memory.failWrite=false;const a=success(store.confirm(request));const next=memory.values.get(CONFIRMED_STORAGE_KEY);memory.failWrite=true;
  assert.ok(!store.undoLatest({...header(a.state,'undo1'),targetEntryId:'c1',reason:'Error'}).ok);assert.equal(memory.values.get(CONFIRMED_STORAGE_KEY),next);
  memory.failWrite=false;memory.failRead=true;assert.ok(!store.load().ok);assert.ok(!store.confirm({...header(a.state,'x'),action:{type:'hold'}}).ok);
});
test('T09b corrupción e historial inconsistente no se reparan silenciosamente; exportación recuperable',()=>{
  const {state,store,memory}=setup();const a=success(store.confirm({...header(state),action:{type:'hold'}}));assert.equal(a.state.revision,1);
  const exported=success(store.exportJson());assert.deepEqual(success(validateConfirmedRecord(JSON.parse(exported))),a);
  a.state.revision=55;assert.ok(!validateConfirmedRecord(a).ok);
  memory.values.set(CONFIRMED_STORAGE_KEY,'{bad');assert.ok(!store.load().ok);assert.ok(!store.migrateLegacy().ok);assert.equal(memory.values.get(CONFIRMED_STORAGE_KEY),'{bad');
});
test('T09b recibo coincidente, revisión con campos reordenados y entradas inmutables',()=>{
  const {state,store}=setup();const before=JSON.stringify(state);
  const request={...header(state),expected:{revision:0,rulesetId:state.rulesetId,runId:state.runId},action:{type:'buy',offerId:'o1',instanceId:'j'},observedAfter:{money:5,jokerIds:['j'],offerIds:['o2']}};
  const requestBefore=JSON.stringify(request);const saved=success(store.confirm(request));
  assert.equal(JSON.stringify(state),before);assert.equal(JSON.stringify(request),requestBefore);
  saved.state.runId='mutated';assert.equal(success(store.load())!.state.runId,state.runId);
});
test('T09b demo ejecutable muestra actualización, rechazos y corrección',()=>{
  const output=execFileSync(process.execPath,[fileURLToPath(new URL('../src/demo-confirmation.js',import.meta.url))],{encoding:'utf8'});
  for(const text of ['stale_revision','duplicate_confirmation','undo','Dinero registrado: 5','Revisión final: 2'])assert.ok(output.includes(text));
});
test('T09b conflicto antes de escribir no sobrescribe otra actualización',()=>{
  const {state,memory}=setup();let reads=0;
  const concurrent=JSON.parse(memory.values.get(CONFIRMED_STORAGE_KEY)!);
  concurrent.initialState.updatedAt=time;concurrent.state.updatedAt=time;const otherRaw=JSON.stringify(concurrent);
  const store=createConfirmedStore(()=>({getItem:(key:string)=>{if(key===CONFIRMED_STORAGE_KEY && ++reads===2)memory.values.set(key,otherRaw);return memory.getItem(key);},setItem:(key:string,value:string)=>memory.setItem(key,value)}));
  const r=store.confirm({...header(state),action:{type:'buy',offerId:'o1',instanceId:'j'}});
  assert.ok(!r.ok);assert.equal(r.errors[0]!.code,'stale_revision');assert.equal(memory.values.get(CONFIRMED_STORAGE_KEY),otherRaw);
});
test('T09b migración fallida no modifica el archivo previo y no reinicia un registro existente',()=>{
  const memory=new MemoryStorage(),store=createConfirmedStore(()=>memory);assert.ok(!store.migrateLegacy().ok);
  success(createStateStore(()=>memory).save(fixture()));const raw=memory.values.get(STATE_STORAGE_KEY);memory.failWrite=true;
  assert.ok(!store.migrateLegacy().ok);assert.equal(memory.values.get(CONFIRMED_STORAGE_KEY),undefined);assert.equal(memory.values.get(STATE_STORAGE_KEY),raw);
  memory.failWrite=false;success(store.migrateLegacy());assert.ok(!store.migrateLegacy().ok);
});

test('T10 inicializar valida, no sobrescribe y devuelve copias independientes',()=>{
  const memory=new MemoryStorage(),store=createConfirmedStore(()=>memory),s=fixture();
  assert.ok(!store.initialize({...s,revision:-1}).ok);assert.equal(memory.writes,0);
  const saved=success(store.initialize(s));saved.state.observed.money=known(99);
  assert.deepEqual(success(store.load())!.state,s);
  assert.ok(!store.initialize(s).ok);assert.equal(memory.writes,1);
});
test('T10 importar H1 o historial exige autorización y token actual; corrupción no borra datos',()=>{
  const {store,memory,state}=setup();const original=memory.getItem(CONFIRMED_STORAGE_KEY)!;
  for(const [json,authorization] of [
    [original,{confirmed:false,expectedRaw:original}],
    ['{bad',{confirmed:true,expectedRaw:original}],
    ['{}',{confirmed:true,expectedRaw:original}],
    [original,{confirmed:true,expectedRaw:null}]
  ] as const)assert.ok(!store.restoreJson(json,authorization).ok);
  assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),original);
  const imported=success(store.restoreJson(JSON.stringify(state),{confirmed:true,expectedRaw:original}));
  assert.deepEqual(imported.state,state);assert.deepEqual(imported.history,[]);
  const purchased=success(store.confirm({...header(state),action:{type:'buy',offerId:'o1',instanceId:'j'}}));
  const copy=success(store.exportJson());
  const other=new MemoryStorage(),destination=createConfirmedStore(()=>other);
  assert.deepEqual(success(destination.restoreJson(copy,{confirmed:true,expectedRaw:null})),purchased);
  other.values.set(CONFIRMED_STORAGE_KEY,'{corrupt');assert.ok(!destination.load().ok);
  assert.ok(!destination.restoreJson(copy,{confirmed:true,expectedRaw:null}).ok);
  assert.deepEqual(success(destination.restoreJson(copy,{confirmed:true,expectedRaw:'{corrupt'})),purchased);
});
test('T10 importación fallida por cuota conserva estado e historial anteriores',()=>{
  const {store,memory,state}=setup();const before=memory.getItem(CONFIRMED_STORAGE_KEY)!;
  state.observed.money=known(10);memory.failWrite=true;
  assert.ok(!store.restoreJson(JSON.stringify(state),{confirmed:true,expectedRaw:before}).ok);
  assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),before);
});
test('T10 transcripción de progreso valida estructuras e invalida análisis sin copiar hipótesis',()=>{
  const {store,memory,state}=setup();const before=memory.getItem(CONFIRMED_STORAGE_KEY);
  assert.ok(!store.correct({...header(state),reason:'Error',patch:{resources:{status:'known',value:-1}}}).ok);
  assert.ok(!store.correct({...header(state),reason:'Escenario',patch:{assumptions:state.assumptions}}).ok);
  assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),before);
  const changed=success(store.correct({...header(state),reason:'Nueva tienda transcrita',patch:{nextBlind:{status:'unknown',reason:'No transcrito'},handBases:{status:'unknown',reason:'No transcrito'}}}));
  assert.equal(changed.state.revision,1);assert.deepEqual(changed.state.assumptions,state.assumptions);
  assert.deepEqual(changed.state.observed.nextBlind,{status:'unknown',reason:'No transcrito'});
  assert.ok(!store.confirm({...header(state,'stale'),action:{type:'hold'}}).ok);
  const undone=success(store.undoLatest({...header(changed.state,'undo'),targetEntryId:'c1',reason:'Transcripción equivocada'}));
  assert.deepEqual(undone.state.observed,state.observed);assert.equal(undone.state.revision,2);
});

test('SHOP03a corrección explícita de dinero y contexto acepta transcripción completa y conserva los demás datos',()=>{
  const original=fixture();original.observed.jokerContext=known({tarotsUsed:known(3),blindsSkipped:known(2)});
  const {state,store}=setup(original);
  const before=structuredClone(state),context=known({tarotsUsed:known(4),blindsSkipped:known(2)});
  const corrected=success(store.correct({...header(state,'context-edit'),
    patch:{...state.observed,money:known(12),jokerContext:context},reason:'Transcribí el saldo y un Tarot utilizado.'}));
  assert.equal(corrected.state.revision,state.revision+1);
  assert.deepEqual(corrected.state.observed.money,known(12));assert.deepEqual(corrected.state.observed.jokerContext,context);
  const {money:_oldMoney,jokerContext:_oldContext,...oldFields}=before.observed;
  const {money:_newMoney,jokerContext:_newContext,...newFields}=corrected.state.observed;
  assert.deepEqual(newFields,oldFields);assert.deepEqual(corrected.state.assumptions,before.assumptions);
  assert.deepEqual(state,before);assert.equal(corrected.history.length,1);assert.equal(corrected.history[0]!.kind,'correction');
  assert.equal(corrected.history[0]!.evidence,null);assert.deepEqual(success(store.load()),corrected);
});

test('SHOP03a contexto mal formado se rechaza sin escribir estado ni historial',()=>{
  const {state,store,memory}=setup();const raw=memory.getItem(CONFIRMED_STORAGE_KEY),writes=memory.writes;
  for(const jokerContext of [
    known({tarotsUsed:known(-1)}),
    known({blindsSkipped:known(1.5)}),
    known({inventedEffect:known(100)}),
    {status:'known',value:{tarotsUsed:known(1)}}
  ]) {
    const result=store.correct({...header(state,'invalid-context'),patch:{jokerContext},reason:'Intento de transcripción inválida.'});
    assert.equal(result.ok,false);assert.equal(memory.writes,writes);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);
  }
  assert.deepEqual(success(store.load())!.state,state);
});

test('SHOP03a recibo admite deuda legal y sigue rechazando discrepancias sin guardar',()=>{
  const input=fixture();input.observed.money=known(0);
  input.observed.jokers=known([{instanceId:'credit',catalogId:'credit_card',edition:known('base'),stickers:known([]),sellValue:known(1),counters:{}}]);
  const {state,store,memory}=setup(input),raw=memory.getItem(CONFIRMED_STORAGE_KEY);
  const request={...header(state,'credit-purchase'),action:{type:'buy' as const,offerId:'o1',instanceId:'new'},
    observedAfter:{money:-3,jokerIds:['credit','new'],offerIds:['o2']}};
  const mismatch=store.confirm(request);assert.equal(mismatch.ok,false);if(!mismatch.ok)assert.equal(mismatch.errors[0]!.code,'model_discrepancy');
  assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);
  const result=success(store.confirm({...request,observedAfter:{...request.observedAfter,money:-2}}));
  // Existing Credit Card rule permits debt; the Joker costs $2: $0 − $2 = −$2.
  assert.deepEqual(result.state.observed.money,known(-2));assert.equal(result.history.length,1);
  assert.deepEqual(success(store.load()),result);
});

