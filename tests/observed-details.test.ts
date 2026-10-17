import assert from 'node:assert/strict';
import test from 'node:test';
import {observedDetails,observedHandBases} from '../src/state/observed-details.js';
import {createNewRun} from '../src/run/start.js';
import {createConfirmedStore,analysisBinding,CONFIRMED_STORAGE_KEY,validateConfirmedRecord} from '../src/storage/confirmed-store.js';
import {observationNeeds} from '../src/state/observations.js';
import {MemoryStorage,known,success,s01} from './helpers.js';
const date='2026-10-16T18:00:00Z',unknown={status:'unknown' as const,reason:'Sin observar.'};
function fixture(){const state=success(createNewRun({runId:'observed-details',updatedAt:date,deckId:'blue',profileConfirmed:true}));state.observed.jokers=known([
 {instanceId:'green-a',catalogId:'green_joker',edition:known('base'),stickers:known([]),sellValue:known(2),counters:{greenMult:known(7)}},
 {instanceId:'green-b',catalogId:'green_joker',edition:known('base'),stickers:known([]),sellValue:known(2),counters:{greenMult:known(9)}}]);return state;}
const req=(state:ReturnType<typeof fixture>,operations:unknown[],extra={})=>({expectedRevision:state.revision,confirmUnchangedOthers:true,operations,...extra});

test('OBS01c corregir Green7 a11 conserva otra copia9, IDs, orden y el resto del estado',()=>{
 const state=fixture(),before=structuredClone(state),changed=success(observedDetails(state,req(state,[{kind:'joker_counter',instanceId:'green-a',key:'greenMult',value:known(11)}])));
 const expected=structuredClone(state.observed.jokers);if(expected.status==='known')expected.value[0]!.counters.greenMult=known(11);assert.deepEqual(changed.patch,{jokers:expected});assert.deepEqual(state,before);
});
test('OBS01c edición/venta/pegatinas son hechos observados: ni precio, dinero, orden ni recursos se recalculan',()=>{
 const state=fixture(),changed=success(observedDetails(state,req(state,[{kind:'joker_edition',instanceId:'green-a',value:known('negative')},{kind:'joker_sell',instanceId:'green-a',value:known(0)},{kind:'joker_stickers',instanceId:'green-a',value:known(['eternal'])}])));
 assert.equal(changed.patch.jokers?.status,'known');if(changed.patch.jokers?.status==='known'){const j=changed.patch.jokers.value[0]!;assert.deepEqual(j.edition,known('negative'));assert.deepEqual(j.sellValue,known(0));assert.deepEqual(j.stickers,known(['eternal']));assert.deepEqual(j.counters,{greenMult:known(7)});}
 assert.equal(changed.patch.money,undefined);assert.equal(changed.patch.resources,undefined);assert.equal(changed.patch.shop,undefined);
});
test('OBS01c no acepta contador ajeno, valores fuera de catálogo, pegatinas duplicadas ni identidad inexistente',()=>{
 const state=fixture();for(const op of [{kind:'joker_counter',instanceId:'green-a',key:'x100',value:known(200)},{kind:'joker_counter',instanceId:'green-a',key:'greenMult',value:known(-1)},{kind:'joker_sell',instanceId:'absent',value:known(3)},{kind:'joker_edition',instanceId:'green-a',value:known('forged')},{kind:'joker_stickers',instanceId:'green-a',value:known(['eternal','eternal'])}])assert.equal(observedDetails(state,req(state,[op])).ok,false);
 if(state.observed.jokers.status==='known')state.observed.jokers.value[0]!.catalogId='selzer';assert.equal(observedDetails(state,req(state,[{kind:'joker_counter',instanceId:'green-a',key:'hands',value:known(11)}])).ok,false);
});
test('OBS01c inventario desconocido no restaura comodines del pasado; manos independientes siguen editables',()=>{
 const state=fixture();state.observed.jokers=unknown;assert.equal(observedDetails(state,req(state,[{kind:'joker_counter',instanceId:'green-a',key:'greenMult',value:known(3)}])).ok,false);
 assert.equal(observedDetails(state,req(state,[{kind:'hand_base',handId:'pair',value:known({level:7,chips:123,mult:9})}])).ok,true);
});
test('OBS01c bases explícitas son literales y no una fórmula de nivel; otras11 manos conservadas',()=>{
 const state=fixture(),original=observedHandBases(state),changed=success(observedDetails(state,req(state,[{kind:'hand_base',handId:'pair',value:known({level:7,chips:123,mult:9})}])));
 assert.deepEqual(original.pair,{status:'known',source:'manual',value:{level:1,chips:10,mult:2}});const expected=structuredClone(original);expected.pair=known({level:7,chips:123,mult:9});assert.deepEqual(changed.patch,{handBases:known({values:expected})});
});
test('OBS01c base desconocida solo completa la mano observada, sin asumir nivel1 en las restantes',()=>{
 const state=fixture();state.observed.handBases=unknown;const result=success(observedDetails(state,req(state,[{kind:'hand_base',handId:'flush_five',value:known({level:2,chips:195,mult:19})}])));const updated={...state,observed:{...state.observed,...result.patch}},values=observedHandBases(updated);
 assert.deepEqual(values.flush_five,known({level:2,chips:195,mult:19}));assert.equal(Object.values(values).filter(v=>v.status==='unknown').length,11);assert.equal(result.patch.jokerContext,undefined);
});
test('OBS01c total de partida y de ronda distintos; no suma y no completa otras manos con cero',()=>{
 const state=fixture();state.observed.jokerContext=unknown;const changed=success(observedDetails(state,req(state,[{kind:'hand_history',scope:'run',handId:'pair',value:known(6)},{kind:'hand_history',scope:'round',handId:'pair',value:known(1)},{kind:'tarots_used',value:known(4)}])));
 assert.deepEqual(changed.patch,{jokerContext:known({handCounts:{pair:known(6)},roundHandCounts:{pair:known(1)},tarotsUsed:known(4)})});
});
test('OBS01c cambiar una entrada de historial conserva sus vecinos, consumibles y estadísticas existentes',()=>{
 const state=fixture();state.observed.jokerContext=known({handCounts:{pair:known(3),flush:unknown},roundHandCounts:{pair:known(0)},tarotsUsed:known(2),consumables:known([{instanceId:'f',catalogId:'c_fool',kind:'tarot',edition:'base',sellValue:1}])});const before=structuredClone(state),result=success(observedDetails(state,req(state,[{kind:'hand_history',scope:'run',handId:'pair',value:known(4)}])));
 const expected=structuredClone(state.observed.jokerContext);if(expected.status==='known')expected.value.handCounts!.pair=known(4);assert.deepEqual(result.patch,{jokerContext:expected});assert.deepEqual(state,before);
});
test('OBS01c desconocido explícito conserva motivo, dispara pregunta del contador y no equivale a cero',()=>{
 const state=fixture(),result=success(observedDetails(state,req(state,[{kind:'joker_counter',instanceId:'green-a',key:'greenMult',value:unknown}]))),updated={...state,observed:{...state.observed,...result.patch}};
 assert.equal(success(observationNeeds(updated)).filter(n=>n.target.kind==='counter').length,1);if(updated.observed.jokers.status==='known')assert.deepEqual(updated.observed.jokers.value[0]!.counters.greenMult,unknown);
});
test('OBS01c lote inválido no aplica mitad: duplicados, sin confirmar, revisión antigua, campos extra, nivel solo, NaN y fracciones',()=>{
 const state=fixture(),op={kind:'tarots_used',value:known(3)},before=structuredClone(state);for(const request of [req(state,[]),req(state,[op,op]),req(state,[op],{confirmUnchangedOthers:false}),req(state,[op],{expectedRevision:1}),req(state,[{...op,projectedState:state}]),req(state,[{kind:'hand_base',handId:'pair',value:known({level:2})}]),req(state,[{kind:'hand_history',scope:'run',handId:'fake',value:known(2)}]),req(state,[op,{kind:'tarots_used',value:known(NaN)}]),req(state,[{kind:'tarots_used',value:known(1.5)}])])assert.equal(observedDetails(state,request).ok,false);assert.deepEqual(state,before);
});
test('OBS01c metadatos manuales no heredan una fuente de preset enviada por el cliente',()=>{
 const state=fixture(),result=success(observedDetails(state,req(state,[{kind:'tarots_used',value:{status:'known',source:'confirmedPreset',value:8}}])));assert.deepEqual(result.patch.jokerContext?.status==='known'&&result.patch.jokerContext.value.tarotsUsed,known(8));
});
test('OBS01c guardado y deshacer atómicos: cuota, revisión antigua y duplicado no desincronizan historia',()=>{
 const state=fixture(),memory=new MemoryStorage(),store=createConfirmedStore(()=>memory),original=success(store.initialize(state)),changed=success(observedDetails(state,req(state,[{kind:'hand_base',handId:'pair',value:known({level:7,chips:123,mult:9})},{kind:'tarots_used',value:known(4)}]))),request={confirmationId:'details',confirmed:true,expected:analysisBinding(state),updatedAt:date,patch:changed.patch,reason:changed.description},raw=memory.getItem(CONFIRMED_STORAGE_KEY);
 memory.failWrite=true;assert.equal(store.correct(request).ok,false);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);memory.failWrite=false;const saved=success(store.correct(request));assert.deepEqual(success(store.load()),saved);assert.equal(saved.history.length,1);assert.equal(store.correct(request).ok,false);assert.equal(store.correct({...request,confirmationId:'old'}).ok,false);const undone=success(store.undoLatest({confirmationId:'undo',confirmed:true,expected:analysisBinding(saved.state),updatedAt:date,targetEntryId:'details',reason:'Datos mal transcritos.'}));assert.deepEqual(undone.state.observed,original.state.observed);assert.equal(undone.state.revision,2);success(validateConfirmedRecord(undone));
});
test('OBS01c copias0.1 conservan esquema y supuestos al registrar historial parcial',()=>{
 const state=s01(),before=structuredClone(state);const result=success(observedDetails(state,{expectedRevision:0,confirmUnchangedOthers:true,operations:[{kind:'tarots_used',value:known(0)}]}));assert.deepEqual(result.patch,{jokerContext:known({tarotsUsed:known(0)})});assert.deepEqual(state,before);
});
test('OBS01c ronda no supera partida cuando ambos totales están observados; unknown no se toma como0',()=>{
 const state=fixture();state.observed.jokerContext=known({handCounts:{pair:known(1)},roundHandCounts:{pair:known(1)}});
 assert.equal(observedDetails(state,req(state,[{kind:'hand_history',scope:'round',handId:'pair',value:known(2)}])).ok,false);
 assert.equal(observedDetails(state,req(state,[{kind:'hand_history',scope:'round',handId:'pair',value:known(2)},{kind:'hand_history',scope:'run',handId:'pair',value:known(3)}])).ok,true);
 assert.equal(observedDetails(state,req(state,[{kind:'hand_history',scope:'round',handId:'pair',value:known(2)},{kind:'hand_history',scope:'run',handId:'pair',value:unknown}])).ok,true);
});
