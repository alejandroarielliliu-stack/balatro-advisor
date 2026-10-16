import assert from 'node:assert/strict';
import test from 'node:test';
import {inventoryChanges,inventoryCards,inventoryReference} from '../src/state/inventory-changes.js';
import {createNewRun} from '../src/run/start.js';
import {createConfirmedStore,analysisBinding,CONFIRMED_STORAGE_KEY,validateConfirmedRecord} from '../src/storage/confirmed-store.js';
import {known,success,MemoryStorage,s01} from './helpers.js';
const date='2026-10-16T12:00:00Z';
const unknown={status:'unknown' as const,reason:'No registrado.'};
function fixture(){const memory=new MemoryStorage(),store=createConfirmedStore(()=>memory),state=success(createNewRun({runId:'observed-inventory',updatedAt:date,deckId:'blue',profileConfirmed:true}));return {memory,store,record:success(store.initialize(state))};}
const req=(record:ReturnType<typeof fixture>['record'],operations:readonly unknown[],extra={})=>({target:'deck',expectedRevision:record.state.revision,confirmUnchangedOthers:true,discardSavedScenarios:false,operations,...extra});
const card={instanceId:'new-copy',rank:'K',suit:'S',edition:'base',enhancement:'steel',seal:'red',extraChips:0};
const fool={instanceId:'fool-a',catalogId:'c_fool',kind:'tarot',edition:'base',sellValue:1};
function apply(f:ReturnType<typeof fixture>,operations:readonly unknown[],extra={}){const changed=success(inventoryChanges(f.record,req(f.record,operations,extra)));return success(f.store.correct({confirmationId:'change',confirmed:true,expected:analysisBinding(f.record.state),updatedAt:date,patch:changed.patch,discardSavedScenarios:changed.discardSavedScenarios,reason:changed.description}));}

test('OBS01b K acero: conserva ID, otras51 cartas, dinero, vales, contexto y supuestos',()=>{
 const f=fixture(),before=structuredClone(f.record),changed=success(inventoryChanges(f.record,req(f.record,[{type:'update',instanceId:'KS',changes:{enhancement:'steel'}}])));
 const expected=inventoryCards(f.record.state)!;expected.find(c=>c.instanceId==='KS')!.enhancement='steel';assert.deepEqual(changed.patch,{deck:known({cards:expected})});assert.deepEqual(f.record,before);
});
test('OBS01b dos cartas idénticas conservan identidad y un lote añade/retira sin tocar la otra copia',()=>{
 const f=fixture(),saved=apply(f,[{type:'add',card},{type:'remove',instanceId:'2S'},{type:'update',instanceId:'KS',changes:{seal:'gold'}}]);const cards=inventoryCards(saved.state)!;
 assert.equal(cards.length,52);assert.equal(cards.filter(c=>c.rank==='K'&&c.suit==='S').length,2);assert.equal(cards.find(c=>c.instanceId==='new-copy')!.seal,'red');assert.equal(cards.find(c=>c.instanceId==='KS')!.seal,'gold');assert.equal(cards.some(c=>c.instanceId==='2S'),false);
 assert.deepEqual(saved.state.observed.money,f.record.state.observed.money);assert.deepEqual(saved.state.assumptions,f.record.state.assumptions);
});
test('OBS01b lote inválido es atómico: duplicados, carta ausente, campo extra, vacío, sin confirmar y revisión vieja',()=>{
 const f=fixture(),before=structuredClone(f.record);for(const request of [req(f.record,[{type:'add',card},{type:'remove',instanceId:'missing'}]),req(f.record,[{type:'add',card:{...card,instanceId:'KS'}}]),req(f.record,[{type:'update',instanceId:'KS',changes:{instanceId:'alien'}}]),req(f.record,[]),req(f.record,[{type:'update',instanceId:'KS',changes:{}}]),req(f.record,[{type:'add',card}],{confirmUnchangedOthers:false}),req(f.record,[{type:'add',card}],{expectedRevision:8})])assert.equal(inventoryChanges(f.record,request).ok,false);
 assert.deepEqual(f.record,before);assert.equal(f.memory.writes,1);
});
test('OBS01b mazo desconocido no se inventa; referencia real anterior exige revisión explícita',()=>{
 const f=fixture(),old=f.record;f.record=success(f.store.correct({confirmationId:'unknown-deck',confirmed:true,expected:analysisBinding(old.state),updatedAt:date,patch:{deck:unknown},reason:'Cambió el mazo.'}));
 assert.equal(inventoryChanges(f.record,req(f.record,[{type:'add',card}])).ok,false);
 const source=inventoryReference(f.record,'deck')!;assert.equal(source.revision,0);source.observed.money=known(999);assert.notDeepEqual(source.observed.money,old.state.observed.money);
 const changed=success(inventoryChanges(f.record,req(f.record,[{type:'update',instanceId:'KS',changes:{enhancement:'steel'}}],{referenceRevision:0})));assert.equal(changed.patch.deck?.status,'known');assert.equal(changed.patch.money,undefined);
 assert.equal(inventoryChanges(f.record,req(f.record,[{type:'add',card}],{referenceRevision:99})).ok,false);
});
test('OBS01b presets heredados compatibles se expanden; Erratic y presets ajenos no fabrican52 cartas',()=>{
 const state=s01();assert.equal(inventoryCards(state)!.length,52);state.observed.deckId=known('erratic');assert.equal(inventoryCards(state),undefined);state.observed.deckId=known('blue');state.observed.deck=known({preset:'unknown-shape'});assert.equal(inventoryCards(state),undefined);
});
test('OBS01b referencias hipotéticas colgantes rechazan cambios salvo retirada explícita recuperable',()=>{
 const f=fixture();f.record=success(f.store.correct({confirmationId:'scenarios',confirmed:true,expected:analysisBinding(f.record.state),updatedAt:date,patch:{money:known(4)},reason:'Observación.'}));
 const state=f.record.state;state.assumptions.probes=[{probeId:'test',label:'Hipótesis',playedCardIds:['KS'],discardsRemaining:3,role:'favorable'}];f.record.initialState.assumptions=structuredClone(state.assumptions);for(const e of f.record.history){e.before.assumptions=structuredClone(state.assumptions);e.after.assumptions=structuredClone(state.assumptions);}
 assert.equal(inventoryChanges(f.record,req(f.record,[{type:'remove',instanceId:'KS'}])).ok,false);const result=success(inventoryChanges(f.record,req(f.record,[{type:'remove',instanceId:'KS'}],{discardSavedScenarios:true})));assert.equal(result.discardSavedScenarios,true);assert.equal(f.record.state.assumptions.probes.length,1);
});
test('OBS01b consumibles: añadir, edición y retirar no calculan uso ni dinero ni contador histórico',()=>{
 const f=fixture(),saved=apply(f,[{type:'add',item:fool},{type:'update',instanceId:'fool-a',changes:{edition:'negative',sellValue:3}}],{target:'consumables'});const ctx=saved.state.observed.jokerContext;assert.equal(ctx?.status,'known');if(ctx?.status==='known'){assert.deepEqual(ctx.value.consumables,known([{...fool,edition:'negative',sellValue:3}]));assert.deepEqual(ctx.value.tarotsUsed,f.record.state.observed.jokerContext?.status==='known'?f.record.state.observed.jokerContext.value.tarotsUsed:undefined);}
 const removed=success(inventoryChanges(saved,req(saved,[{type:'remove',instanceId:'fool-a'}],{target:'consumables'})));assert.equal(removed.patch.money,undefined);assert.deepEqual(removed.patch.jokerContext?.status==='known'&&removed.patch.jokerContext.value.consumables,known([]));
});
test('OBS01b consumibles desconocidos: vacío explícito; no restaura historia obsoleta desde la referencia',()=>{
 const f=fixture();f.record=success(f.store.correct({confirmationId:'unknown-context',confirmed:true,expected:analysisBinding(f.record.state),updatedAt:date,patch:{jokerContext:unknown},reason:'Contexto cambió.'}));
 assert.equal(inventoryChanges(f.record,req(f.record,[{type:'add',item:fool}],{target:'consumables'})).ok,false);
 const empty=success(inventoryChanges(f.record,req(f.record,[{type:'confirm_empty'}],{target:'consumables'})));assert.deepEqual(empty.patch,{jokerContext:known({consumables:known([])})});
 const restored=success(inventoryChanges(f.record,req(f.record,[{type:'add',item:fool}],{target:'consumables',referenceRevision:0})));assert.deepEqual(restored.patch.jokerContext,known({consumables:known([fool])}));
});
test('OBS01b consumibles incompatibles, IDs duplicados, lista vacía mezclada y retirada ausente se rechazan',()=>{
 const f=fixture();for(const ops of [[{type:'add',item:{...fool,kind:'spectral'}}],[{type:'add',item:{...fool,catalogId:'c_locked'}}],[{type:'add',item:fool},{type:'add',item:fool}],[{type:'confirm_empty'},{type:'add',item:fool}],[{type:'remove',instanceId:'missing'}]])assert.equal(inventoryChanges(f.record,req(f.record,ops,{target:'consumables'})).ok,false);
});
test('OBS01b los crecimientos potencialmente afectados quedan pendientes, sin ejecutar efectos',()=>{
 const f=fixture();f.record.state.observed.jokers=known(['hologram','caino','glass','vampire','joker'].map(catalogId=>({instanceId:catalogId,catalogId,edition:known('base'),stickers:known([]),sellValue:known(1),counters:{x100:known(200)}})));f.record.initialState=structuredClone(f.record.state);
 for(const [ops,affected]of [[[{type:'add',card}],['hologram']],[[{type:'remove',instanceId:'2S'}],['caino','glass']],[[{type:'update',instanceId:'KS',changes:{enhancement:'steel'}}],['vampire']]]as const){const changed=success(inventoryChanges(f.record,req(f.record,structuredClone(ops))));assert.equal(changed.patch.jokers?.status,'known');if(changed.patch.jokers?.status==='known')for(const j of changed.patch.jokers.value)assert.equal(j.counters.x100!.status,affected.includes(j.catalogId as never)?'unknown':'known');}
});
test('OBS01b guardado, cuota, duplicado y deshacer conservan estado e historial sincronizados',()=>{
 const f=fixture(),changed=success(inventoryChanges(f.record,req(f.record,[{type:'update',instanceId:'KS',changes:{enhancement:'steel'}}]))),request={confirmationId:'steel',confirmed:true,expected:analysisBinding(f.record.state),updatedAt:date,patch:changed.patch,reason:changed.description};const raw=f.memory.getItem(CONFIRMED_STORAGE_KEY);
 f.memory.failWrite=true;assert.equal(f.store.correct(request).ok,false);assert.equal(f.memory.getItem(CONFIRMED_STORAGE_KEY),raw);f.memory.failWrite=false;const saved=success(f.store.correct(request));assert.deepEqual(success(f.store.load()),saved);assert.equal(saved.history.length,1);assert.equal(saved.state.revision,1);assert.equal(f.store.correct(request).ok,false);const undone=success(f.store.undoLatest({confirmationId:'undo-steel',confirmed:true,expected:analysisBinding(saved.state),updatedAt:date,targetEntryId:'steel',reason:'Carta equivocada.'}));assert.deepEqual(undone.state.observed,f.record.state.observed);assert.equal(undone.state.revision,2);success(validateConfirmedRecord(undone));
});
test('OBS01b no retira una carta de mano conocida dejando referencias reales colgantes',()=>{
 const f=fixture(),s=f.record.state;assert.equal(s.schemaVersion,'0.2');if(s.schemaVersion!=='0.2')return;
 f.record.state={...s,phase:'in_round',phaseData:{blind:unknown,handsRemaining:known(5),discardsRemaining:known(3),score:known(0),heldCardIds:known(['KS'])}};f.record.initialState=structuredClone(f.record.state);
 success(validateConfirmedRecord(f.record));assert.equal(inventoryChanges(f.record,req(f.record,[{type:'remove',instanceId:'KS'}],{discardSavedScenarios:true})).ok,false);
});
test('OBS01b guardar desde H1 legado conserva esquema, y no copia planes a los datos observados',()=>{
 const memory=new MemoryStorage(),store=createConfirmedStore(()=>memory),state=s01(),record=success(store.initialize(state));
 const result=success(inventoryChanges(record,req(record,[{type:'update',instanceId:'KS',changes:{seal:'red'}}])));
 const saved=success(store.correct({confirmationId:'legacy-card',confirmed:true,expected:analysisBinding(state),updatedAt:date,patch:result.patch,reason:result.description}));assert.equal(saved.state.schemaVersion,'0.1');assert.equal(saved.schemaVersion,record.schemaVersion);assert.deepEqual(saved.state.assumptions,state.assumptions);assert.deepEqual(saved.state.observed.money,state.observed.money);success(validateConfirmedRecord(saved));
});
