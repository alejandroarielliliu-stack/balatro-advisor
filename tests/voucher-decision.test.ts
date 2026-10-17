import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {inspectShopDecision,decisionIsCurrent} from '../src/advisor/decision.js';
import type {ShopSnapshot} from '../src/advisor/shop-context.js';
import type {AdvisorScenario} from '../src/advisor/advisor.js';
import type {GameStateV01,GameStateV02,Fact} from '../src/state/model.js';
import {createConfirmedStore,CONFIRMED_STORAGE_KEY} from '../src/storage/confirmed-store.js';
import {known,MemoryStorage,success} from './helpers.js';

const missing={status:'unknown',reason:'Dato aún no observado.'} as const;
const fixture=():GameStateV02=>{
 const legacy=JSON.parse(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8')) as GameStateV01;
 const state:GameStateV02={...legacy,schemaVersion:'0.2',phase:'shop',phaseData:{origin:missing}};
 state.observed.money=known(40);
 state.observed.resources={handsPerRound:known(5),discardsPerRound:known(3),handSize:known(8),jokerSlots:known(5)};
 assert.ok(state.observed.shop.status==='known');state.observed.shop.value.voucherOffers=[
  {offerId:'grabber',catalogId:'v_grabber',price:known(10)},{offerId:'seed',catalogId:'v_seed_money',price:known(10)}
 ];
 return state;
};
const value=<T>(fact:Fact<T>)=>fact.status==='known'?fact.value:undefined;
const shelf=(state:GameStateV02)=>{assert.ok(state.observed.shop.status==='known');return state.observed.shop.value;};
const snapshot=(state:GameStateV02):ShopSnapshot=>({id:shelf(state).shopId,
 jokers:shelf(state).cardOffers.map(offer=>({offerId:offer.offerId,catalogId:offer.catalogId,price:value(offer.price)??null,edition:value(offer.edition)??'unknown',stickers:value(offer.stickers)??['unknown']})),
 vouchers:(shelf(state).voucherOffers??[]).map(offer=>({offerId:offer.offerId,catalogId:offer.catalogId,price:value(offer.price)??null})),packs:[],rerollCost:null});
const card=(cardId:string)=>({cardId,knowledge:'hypothetical' as const,basis:'Plan sintético fijo; no predice el robo.'});
const scenarios=():AdvisorScenario[]=>[{role:'representative',plan:{schemaVersion:'scenario-1',planId:'pair-eight',description:'Una pareja de ochos observada solo como plan.',
 initialHand:['8S','8H','2S','3S','4H','5D','6C','7D'].map(card),events:[{type:'play',cardIds:['8S','8H'],drawIfContinues:['9S','9H'].map(card)}],assumptions:{noMoneyChangesDuringRound:true}}}];

test('SHOP02a DEC00 prueba vales por separado:40→30 y manos5→6, sin gastar en secuencia ni mutar registro',()=>{
 const state=fixture(),shop=snapshot(state),before=structuredClone({state,shop}),memory=new MemoryStorage();
 success(createConfirmedStore(()=>memory).initialize(state));const raw=memory.getItem(CONFIRMED_STORAGE_KEY),writes=memory.writes;
 const decision=success(inspectShopDecision(state,shop));
 assert.deepEqual(decision.voucherActions.map(action=>action.action),[{type:'buy_voucher',offerId:'grabber'},{type:'buy_voucher',offerId:'seed'}]);
 assert.deepEqual(decision.voucherActions.map(action=>action.moneyAfter),[30,30]);
 assert.ok(decision.voucherActions.every(action=>action.status==='provisional'&&action.confirmation==='explicit_confirmation_required'));
 const grabber=decision.voucherActions[0]!,seed=decision.voucherActions[1]!;
 assert.deepEqual(grabber.consequences!.money,{before:40,after:30,delta:-10});
 assert.deepEqual(grabber.consequences!.resources.find(resource=>resource.field==='handsPerRound')!.change,{before:5,after:6,delta:1});
 assert.ok(grabber.consequences!.resources.filter(resource=>resource.field!=='handsPerRound').every(resource=>resource.change.delta===0));
 assert.ok(seed.consequences!.resources.every(resource=>resource.change.delta===0));
 assert.deepEqual(grabber.consequences!.occupiedJokerSlots,{before:0,after:0,delta:0});assert.deepEqual(grabber.consequences!.added,[]);assert.deepEqual(grabber.consequences!.removed,[]);
 assert.deepEqual(decision.actions.map(action=>action.moneyAfter),[40,38,35]);
 assert.equal(decision.projected,true);assert.equal(decision.exhaustive,false);
 assert.deepEqual({state,shop},before);assert.equal(memory.writes,writes);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);
});

test('SHOP02a DEC00 precio desconocido coincide con oferta guardada y pide el precio sin falso unrecorded_offer',()=>{
 const state=fixture();shelf(state).voucherOffers![0]!.price=missing;
 const shop=snapshot(state);assert.equal(shop.vouchers[0]!.price,null);
 const decision=success(inspectShopDecision(state,shop)),grabber=decision.voucherActions[0]!;
 assert.equal(grabber.status,'missing_data');assert.equal(grabber.errors[0]!.code,'unknown_data');
 assert.ok(grabber.errors.every(error=>error.code!=='unrecorded_offer'));
 assert.equal(grabber.moneyAfter,null);assert.equal(grabber.consequences,null);assert.equal(grabber.confirmation,'unavailable');
 assert.ok(decision.questions.some(question=>question.operationIds.includes('voucher:grabber')&&question.path.includes('price')));
 assert.equal(decision.voucherActions[1]!.moneyAfter,30);assert.ok(decision.actions.every(action=>action.status==='provisional'));
});

test('SHOP02a DEC00 identidad, precio o ID transitorios distintos limitan solo el vale afectado',()=>{
 const state=fixture();
 for(const patch of [{catalogId:'v_blank'},{price:9},{offerId:'not-recorded'}]){
  const shop=snapshot(state);Object.assign(shop.vouchers[0]!,patch);
  const decision=success(inspectShopDecision(state,shop,{scenarios:scenarios()})),first=decision.voucherActions[0]!;
  assert.equal(first.status,'missing_data');assert.equal(first.errors[0]!.code,'unrecorded_offer');
  assert.equal(first.confirmation,'unavailable');assert.equal(first.consequences,null);assert.equal(first.moneyAfter,null);
  assert.equal(decision.voucherActions[1]!.status,'provisional');assert.ok(decision.actions.every(action=>action.status==='provisional'));
  assert.ok(decision.scenarios?.ok,JSON.stringify(decision.scenarios));
 }
});

test('SHOP02a DEC00 otra tienda no puede reutilizar IDs y precios de vales o comodines registrados',()=>{
 const state=fixture(),shop=snapshot(state),before=structuredClone(state);shop.id='another-shop';
 const decision=success(inspectShopDecision(state,shop,{scenarios:scenarios()}));
 assert.ok(decision.voucherActions.every(action=>action.errors[0]!.code==='unrecorded_offer'&&action.confirmation==='unavailable'));
 assert.ok(decision.actions.filter(action=>action.action.type==='buy').every(action=>action.errors[0]!.code==='unrecorded_offer'&&action.confirmation==='unavailable'));
 assert.equal(decision.actions[0]!.status,'provisional');
 assert.ok(decision.scenarios&&!decision.scenarios.ok);if(decision.scenarios&&!decision.scenarios.ok)assert.equal(decision.scenarios.errors[0]!.code,'unrecorded_offer');
 assert.deepEqual(state,before);
});

test('SHOP02a DEC00 modo estricto conserva evidencia provisional y no presenta cifras de compra',()=>{
 const state=fixture(),decision=success(inspectShopDecision(state,snapshot(state),{requireObserved:true}));
 assert.ok(decision.voucherActions.every(action=>action.status==='pending_evidence'&&action.confirmation==='unavailable'&&action.moneyAfter===null&&action.consequences===null));
 assert.ok(decision.voucherActions.every(action=>action.errors[0]!.code==='pending_rule'&&action.evidence?.verifiedAgainstGame===false));
 assert.ok(decision.actions.every(action=>action.status==='pending_evidence'));
});

test('SHOP02a DEC00 Seed conserva compra independiente con inventario y recursos desconocidos',()=>{
 const state=fixture();shelf(state).voucherOffers=shelf(state).voucherOffers!.slice(1);
 state.observed.jokers=missing;state.observed.deck=missing;state.observed.handBases=missing;
 state.observed.resources={handsPerRound:missing,discardsPerRound:missing,handSize:missing,jokerSlots:missing};
 const before=structuredClone(state),decision=success(inspectShopDecision(state,snapshot(state))),seed=decision.voucherActions[0]!;
 assert.equal(seed.status,'provisional');assert.equal(seed.moneyAfter,30);assert.equal(seed.confirmation,'explicit_confirmation_required');
 assert.deepEqual(seed.consequences!.money,{before:40,after:30,delta:-10});
 assert.deepEqual(seed.consequences!.occupiedJokerSlots,{before:null,after:null,delta:null});
 assert.deepEqual(seed.consequences!.freeJokerSlots,{before:null,after:null,delta:null});
 assert.ok(seed.consequences!.resources.every(resource=>resource.change.before===null&&resource.change.after===null&&resource.change.delta===null));
 assert.ok(decision.actions.every(action=>action.status==='missing_data'));
 assert.ok(decision.questions.every(question=>!question.operationIds.includes('voucher:seed')));assert.deepEqual(state,before);
});

test('SHOP02a DEC00 dinero, prerrequisitos, duplicados y cobertura del vale no bloquean comodines compatibles',()=>{
 const cases:[GameStateV02,string][]=[];
 const poor=fixture();poor.observed.money=known(9);cases.push([poor,'insufficient_money']);
 const prerequisite=fixture();shelf(prerequisite).voucherOffers![0]!.catalogId='v_nacho_tong';cases.push([prerequisite,'missing_prerequisite']);
 const duplicate=fixture();shelf(duplicate).voucherOffers![0]!.catalogId='v_blank';duplicate.observed.outOfScope=known({vouchers:['v_blank'],consumables:[],pendingTags:[],otherModifiers:[]});cases.push([duplicate,'voucher_already_owned']);
 const unsupported=fixture();shelf(unsupported).voucherOffers![0]!.catalogId='v_clearance_sale';cases.push([unsupported,'unsupported_voucher']);
 const discounted=fixture();shelf(discounted).voucherOffers![0]!.price=known(7);cases.push([discounted,'unsupported_price']);
 for(const [state,code] of cases){
  const before=structuredClone(state),decision=success(inspectShopDecision(state,snapshot(state))),voucher=decision.voucherActions[0]!;
  assert.equal(voucher.errors[0]!.code,code);assert.equal(voucher.confirmation,'unavailable');assert.equal(voucher.consequences,null);
  assert.ok(decision.actions.every(action=>action.status==='provisional'),code);assert.deepEqual(state,before);
 }
});

test('SHOP02a DEC00 H3 compara solo hold/comodines; vales no entran en ranking ni resultados de planes',()=>{
 const state=fixture(),shop=snapshot(state),plans=scenarios(),before=structuredClone({state,shop,plans});
 const decision=success(inspectShopDecision(state,shop,{scenarios:plans}));
 assert.equal(decision.voucherActions.length,2);assert.deepEqual(decision.voucherActions.map(action=>action.moneyAfter),[30,30]);
 assert.deepEqual(decision.actions.map(action=>action.action.type),['hold','buy','buy']);
 assert.ok(decision.scenarios?.ok,JSON.stringify(decision.scenarios));if(!decision.scenarios?.ok)return;
 const alternatives=decision.scenarios.value.alternatives;
 assert.equal(alternatives.length,3);assert.deepEqual(alternatives.map(alternative=>alternative.action.type),['hold','buy','buy']);
 assert.deepEqual(alternatives.map(alternative=>alternative.scenarios[0]!.metrics!.moneyAfterShop),[40,38,35]);
 assert.deepEqual(alternatives.map(alternative=>alternative.scenarios[0]!.metrics!.score),[52,156,572]);
 assert.deepEqual(decision.scenarioConsequences.alternatives.map(alternative=>alternative.action.type),['hold','buy','buy']);
 assert.ok(decision.limitations.some(limitation=>limitation.includes('vales')&&limitation.includes('H3')));
 assert.deepEqual({state,shop,plans},before);
});

test('SHOP02a DEC00 vigencia incluye vales guardados y temporales aun sin cambiar revisión',()=>{
 const state=fixture(),shop=snapshot(state),decision=success(inspectShopDecision(state,shop));
 assert.equal(decisionIsCurrent(decision,state,shop),true);
 const changedState=structuredClone(state);shelf(changedState).voucherOffers![0]!.price=known(9);
 assert.equal(changedState.revision,state.revision);assert.equal(decisionIsCurrent(decision,changedState,shop),false);
 const changedShop=structuredClone(shop);changedShop.vouchers[0]!.price=9;
 assert.equal(decisionIsCurrent(decision,state,changedShop),false);
 changedShop.vouchers=shop.vouchers.slice(1);assert.equal(decisionIsCurrent(decision,state,changedShop),false);
});
