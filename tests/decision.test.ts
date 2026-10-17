import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import type {GameState} from '../src/state/model.js';
import {inspectShopDecision,decisionIsCurrent} from '../src/advisor/decision.js';
import type {DecisionOptions} from '../src/advisor/decision.js';
import {evaluateShopContext} from '../src/advisor/shop-context.js';
import type {ShopSnapshot} from '../src/advisor/shop-context.js';
import {catalogCapabilities,listCatalogCapabilities} from '../src/catalog/capabilities.js';
import {analysisBinding,createConfirmedStore,CONFIRMED_STORAGE_KEY} from '../src/storage/confirmed-store.js';
import {known,MemoryStorage,success} from './helpers.js';
const unknown={status:'unknown' as const,reason:'No se transcribió.'};
function fixture():GameState{return JSON.parse(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8')) as GameState;}
function shop(state:GameState):ShopSnapshot{assert.equal(state.observed.shop.status,'known');if(state.observed.shop.status!=='known')throw Error('fixture');return {id:state.observed.shop.value.shopId,jokers:state.observed.shop.value.cardOffers.map(o=>({offerId:o.offerId,catalogId:o.catalogId,price:o.price.status==='known'?o.price.value:null,edition:'base',stickers:[]})),vouchers:[],packs:[],rerollCost:null};}
const hand={cardIds:['8S','8H'],discardsRemaining:3};
const card=(cardId:string)=>({cardId,knowledge:'hypothetical' as const,basis:'Fixture sintético; no predice robos.'});
const scenarios=[{role:'representative' as const,plan:{schemaVersion:'scenario-1' as const,planId:'pair8',description:'Un plan fijo sintético',initialHand:['8S','8H','2S','3S','4H','5D','6C','7D'].map(card),events:[{type:'play' as const,cardIds:['8S','8H'],drawIfContinues:['9S','9H'].map(card)}],assumptions:{noMoneyChangesDuringRound:true}}}];

test('CAP01a matriz completa212: catálogo150/vales32/sobres15/barajas15; no equipara perfiles con reglas',()=>{
 const all=listCatalogCapabilities();assert.equal(all.length,212);for(const [kind,n]of [['joker',150],['voucher',32],['pack',15],['deck',15]]as const)assert.equal(all.filter(c=>c.kind===kind).length,n);
 const joker=catalogCapabilities('joker','baron')!;assert.equal(joker.operations.show.status,'available');assert.equal(joker.operations.rate.basis,'heuristic');assert.equal(joker.operations.score.status,'conditional');assert.equal(joker.operations.confirm.status,'conditional');assert.equal(catalogCapabilities('voucher','v_grabber')!.operations.apply.status,'conditional');assert.equal(catalogCapabilities('pack','arcana-normal')!.operations.confirm.status,'unimplemented');assert.equal(catalogCapabilities('deck','erratic')!.operations.score.status,'conditional');assert.equal(catalogCapabilities('deck','magic')!.operations.score.status,'unimplemented');
 assert.equal(catalogCapabilities('joker','__proto__'),null);assert.equal(catalogCapabilities('joker','invented'),null);joker.operations.show.reason='edited';assert.notEqual(catalogCapabilities('joker','baron')!.operations.show.reason,'edited');
});
test('DEC00 mismo estado independiente: $7→$5 o$2, mano52, sin gastar en secuencia ni mutar entradas',()=>{
 const state=fixture(),snapshot=shop(state),before=structuredClone({state,snapshot}),r=success(inspectShopDecision(state,snapshot,{hand}));assert.deepEqual(r.actions.map(a=>a.moneyAfter),[7,5,2]);assert.ok(r.actions.every(a=>a.status==='provisional'&&a.confirmation==='explicit_confirmation_required'));assert.ok(r.hand?.ok);if(r.hand?.ok)assert.equal(r.hand.value.score,52);assert.deepEqual({state,snapshot},before);assert.equal(r.projected,true);assert.equal(r.exhaustive,false);assert.equal(r.scenarios,null);
});
test('DEC00 reutiliza exactamente el consejo contextual, sin nuevo ranking ni pesos',()=>{
 const state=fixture(),snapshot=shop(state);const r=success(inspectShopDecision(state,snapshot));assert.deepEqual(r.context,evaluateShopContext(state,snapshot));assert.ok(r.limitations.some(l=>l.includes('Sin escenarios')));
});
test('DEC00 dato de dinero ausente limita compra, pero hold y mano concreta siguen calculándose',()=>{
 const state=fixture();state.observed.money=unknown;const r=success(inspectShopDecision(state,shop(state),{hand}));assert.equal(r.actions[0]!.status,'provisional');assert.equal(r.actions[1]!.status,'missing_data');assert.ok(r.hand?.ok);if(r.hand?.ok)assert.equal(r.hand.value.score,52);assert.equal(r.questions.length,1);assert.equal(r.questions[0]!.path,'$.observed.money');assert.deepEqual(r.questions[0]!.operationIds,['action:1','action:2']);assert.equal(r.actions[1]!.confirmation,'unavailable');
});
test('DEC00 dinero insuficiente es ilegal y no se convierte en pregunta ni bloqueo del resto',()=>{
 const state=fixture();state.observed.money=known(3);const r=success(inspectShopDecision(state,shop(state)));assert.equal(r.actions[1]!.status,'provisional');assert.equal(r.actions[1]!.moneyAfter,1);assert.equal(r.actions[2]!.status,'illegal');assert.equal(r.actions[2]!.errors[0]!.code,'insufficient_money');assert.equal(r.questions.length,0);
});
test('DEC00 descuento manual queda fuera de H2; la aritmética contextual no declara una transacción',()=>{
 const state=fixture();if(state.observed.shop.status==='known')state.observed.shop.value.cardOffers[0]!.price=known(1);const r=success(inspectShopDecision(state,shop(state)));assert.equal(r.actions[1]!.status,'unsupported');assert.equal(r.actions[1]!.confirmation,'unavailable');assert.equal(r.actions[1]!.moneyAfter,null);assert.equal(r.context.options.find(o=>o.id==='o1')!.moneyAfter,6);assert.equal(r.actions[2]!.status,'provisional');
});
test('DEC00 oferta temporal distinta: no aplica precio guardado ni usa su rama en H3',()=>{
 const state=fixture(),snapshot=shop(state);snapshot.jokers[0]!.price=1;const r=success(inspectShopDecision(state,snapshot,{scenarios}));assert.equal(r.actions[1]!.status,'missing_data');assert.equal(r.actions[1]!.errors[0]!.code,'unrecorded_offer');assert.equal(r.actions[1]!.moneyAfter,null);assert.equal(r.actions[2]!.status,'provisional');assert.ok(r.scenarios&&!r.scenarios.ok);if(r.scenarios&&!r.scenarios.ok)assert.equal(r.scenarios.errors[0]!.code,'unrecorded_offer');
});
test('DEC00 modo estricto conserva evidencia pendiente; las etiquetas heurísticas no la promueven',()=>{
 const state=fixture(),r=success(inspectShopDecision(state,shop(state),{requireObserved:true,hand}));assert.ok(r.actions.every(a=>a.status==='pending_evidence'&&a.confirmation==='unavailable'));assert.ok(r.hand&&!r.hand.ok);if(r.hand)assert.equal(r.hand.evidence.verifiedAgainstGame,false);assert.equal(r.questions.length,0);assert.equal(r.catalogue[0]!.capabilities!.operations.rate.basis,'heuristic');
});
test('DEC00 planes fijos reutilizan H3: conservar52, comprar Joker156, Half572 alcanza450',()=>{
 const state=fixture(),r=success(inspectShopDecision(state,shop(state),{scenarios}));assert.ok(r.scenarios?.ok,JSON.stringify(r.scenarios));if(!r.scenarios?.ok)return;const alternatives=r.scenarios.value.alternatives;
 const hold=alternatives.find(a=>a.action.type==='hold')!,joker=alternatives.find(a=>a.action.type==='buy'&&a.action.offerId==='o1')!,half=alternatives.find(a=>a.action.type==='buy'&&a.action.offerId==='o2')!;
 assert.equal(hold.scenarios[0]!.metrics!.score,52);assert.equal(joker.scenarios[0]!.metrics!.score,156);assert.equal(half.scenarios[0]!.metrics!.score,572);assert.equal(hold.scenarios[0]!.metrics!.reached,false);assert.equal(half.scenarios[0]!.metrics!.reached,true);assert.equal(r.scenarios.value.recommendation.action?.type,'buy');assert.deepEqual(r.scenarios.value.scenarios,scenarios);
});
test('DEC00 resultados hipotéticos permiten explorar pero nunca habilitan confirmar',()=>{
 const state=fixture(),action={type:'hold' as const,choices:[{key:'unused',kind:'boolean' as const,value:true,knowledge:'hypothetical' as const,basis:'Ejemplo de rama no observada.'}]},r=success(inspectShopDecision(state,shop(state),{actions:[action]}));assert.equal(r.actions[0]!.status,'provisional');assert.equal(r.actions[0]!.confirmation,'unavailable');assert.equal(r.actions[0]!.confirmationErrors[0]!.code,'hypothetical_confirmation');
});
test('DEC00 fases reales se conservan: fuera de tienda no se inventa una transición para H2',()=>{
 const state=fixture();state.phase='draft';const r=success(inspectShopDecision(state,shop(state),{hand}));assert.equal(r.phase,'draft');assert.ok(r.actions.every(a=>a.status==='illegal'));assert.equal(r.questions.length,0);assert.ok(r.hand&&!r.hand.ok);
});
test('DEC00 vigencia incluye revisión, datos sin guardar, fase, ofertas temporales y escenarios/opciones',()=>{
 const state=fixture(),snapshot=shop(state),options={hand},r=success(inspectShopDecision(state,snapshot,options));assert.equal(decisionIsCurrent(r,state,snapshot,options),true);assert.equal(decisionIsCurrent(r,{...state,revision:1},snapshot,options),false);
 const changed=structuredClone(state);changed.observed.money=known(99);assert.equal(decisionIsCurrent(r,changed,snapshot,options),false);changed.observed.money=state.observed.money;changed.phase='draft';assert.equal(decisionIsCurrent(r,changed,snapshot,options),false);
 const offers=structuredClone(snapshot);offers.jokers[0]!.price=0;assert.equal(decisionIsCurrent(r,state,offers,options),false);assert.equal(decisionIsCurrent(r,state,snapshot,{hand:{...hand,discardsRemaining:2}}),false);assert.equal(decisionIsCurrent(r,state,snapshot),false);
});
test('DEC00 conservar, venta y reemplazo explícitos se prueban separadamente; Eternal solo limita su acción',()=>{
 const state=fixture();state.observed.jokers=known([{instanceId:'owned',catalogId:'joker',edition:known('base'),stickers:known(['eternal']),sellValue:known(1),counters:{}}]);
 const r=success(inspectShopDecision(state,shop(state),{actions:[{type:'hold'},{type:'sell',instanceId:'owned'},{type:'buy',offerId:'o2',instanceId:'new'}]}));assert.equal(r.actions[0]!.status,'provisional');assert.equal(r.actions[1]!.status,'illegal');assert.equal(r.actions[1]!.errors[0]!.code,'eternal_joker');assert.equal(r.actions[2]!.moneyAfter,2);
 if(state.observed.jokers.status==='known')state.observed.jokers.value[0]!.stickers=known([]);const snapshot=shop(state);snapshot.jokers[0]!.replacementId='owned';const replaced=success(inspectShopDecision(state,snapshot));assert.equal(replaced.actions[1]!.action.type,'replace');assert.equal(replaced.actions[1]!.moneyAfter,6);
});
test('DEC00 validar opciones/IDs sin coerción, rechazar duplicados y no asumir que sobrenombre es identidad',()=>{
 const state=fixture(),snapshot=shop(state);for(const options of [{requireObserved:'false'},{ante:0},{actions:[{type:'hold'},{type:'hold'}]},{extra:true},{actions:[{type:'invented'}]}])assert.equal(inspectShopDecision(state,snapshot,options as DecisionOptions).ok,false);
 const duplicate=structuredClone(snapshot);duplicate.jokers[1]!.offerId='o1';assert.equal(inspectShopDecision(state,duplicate).ok,false);assert.equal(inspectShopDecision({schemaVersion:'fake'},snapshot).ok,false);
});
test('DEC00 consultar informe no escribe registro; T09b sigue siendo la única confirmación real',()=>{
 const state=fixture(),memory=new MemoryStorage(),store=createConfirmedStore(()=>memory);success(store.initialize(state));const before=memory.getItem(CONFIRMED_STORAGE_KEY),writes=memory.writes;const r=success(inspectShopDecision(state,shop(state),{hand,scenarios}));assert.equal(memory.writes,writes);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),before);
 const action=r.actions.find(a=>a.optionId==='o1')!.action;const saved=success(store.confirm({confirmationId:'real-buy',confirmed:true,expected:analysisBinding(state),updatedAt:'2026-10-16T12:00:00Z',action}));assert.equal(saved.state.observed.money.status==='known'&&saved.state.observed.money.value,5);assert.equal(saved.state.observed.jokers.status==='known'&&saved.state.observed.jokers.value.length,1);assert.deepEqual(saved.state.assumptions,state.assumptions);assert.equal(decisionIsCurrent(r,saved.state,shop(state),{hand,scenarios}),false);
});
test('DEC00 mazo desconocido: se puede financiar Baron/Mime pero la preparación pregunta por material',()=>{
 const state=fixture();state.observed.money=known(25);state.observed.deck=unknown;
 if(state.observed.shop.status==='known'){state.observed.shop.value.cardOffers[0]!.catalogId='baron';state.observed.shop.value.cardOffers[0]!.price=known(8);state.observed.shop.value.cardOffers[1]!.catalogId='mime';state.observed.shop.value.cardOffers[1]!.price=known(5);}
 const r=success(inspectShopDecision(state,shop(state)));assert.ok(r.actions.every(a=>a.status==='provisional'));assert.ok(r.questions.some(q=>q.operationIds.includes('fit:o1')));assert.ok(r.questions.some(q=>q.operationIds.includes('fit:o2')));assert.equal(r.hand,null);
});
