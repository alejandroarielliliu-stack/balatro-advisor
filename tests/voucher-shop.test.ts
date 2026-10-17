import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import type {GameStateV01,GameStateV02,JokerInstance} from '../src/state/model.js';
import {applyVoucherPurchase} from '../src/rules/voucher-shop.js';
import type {VoucherPurchaseAction} from '../src/rules/voucher-shop.js';
import {interestOnBalance} from '../src/rules/economy.js';
import {known,success} from './helpers.js';

const missing={status:'unknown',reason:'Dato no observado.'} as const;
const timestamp='2026-10-17T15:00:00Z';
type Totals=readonly [number,number,number,number];
const fixture=(catalogId='v_grabber',owned:string[]=[],totals:Totals=[5,3,8,5]):GameStateV02=>{
 // Literal H2 input; expected effects below are independent manual totals.
 const legacy=JSON.parse(readFileSync('examples/shop-purchase.json','utf8')) as GameStateV01;
 const state:GameStateV02={...legacy,schemaVersion:'0.2',phase:'shop',phaseData:{origin:missing}};
 state.revision=8;
 state.observed.money=known(20);
 state.observed.outOfScope=known({vouchers:[...owned],consumables:[],pendingTags:[],otherModifiers:[]});
 state.observed.resources={handsPerRound:known(totals[0]),discardsPerRound:known(totals[1]),handSize:known(totals[2]),jokerSlots:known(totals[3])};
 if(state.observed.shop.status==='known')state.observed.shop.value.voucherOffers=[
  {offerId:'voucher-main',catalogId,price:known(10)},
  {offerId:'voucher-other',catalogId:'v_blank',price:known(10)}
 ];
 return state;
};
const buy=(state:GameStateV02,offerId='voucher-main')=>applyVoucherPurchase(state,{type:'buy_voucher',offerId},{expectedRevision:state.revision,updatedAt:timestamp});
const totals=(state:GameStateV02)=>{
 const resource=state.observed.resources;
 return [resource.handsPerRound,resource.discardsPerRound,resource.handSize,resource.jokerSlots].map(fact=>{
  assert.equal(fact.status,'known');return fact.status==='known'?fact.value:undefined;
 });
};
const joker=(id:string,edition='base',counters:JokerInstance['counters']={}):JokerInstance=>({instanceId:id,catalogId:id,edition:known(edition),stickers:known([]),sellValue:missing,counters});
const rejected=(state:GameStateV02,code:string)=>{
 const before=structuredClone(state),result=buy(state);
 assert.ok(!result.ok,JSON.stringify(result));
 assert.equal(result.errors[0]?.code,code);
 assert.deepEqual(state,before);
};

test('Compra los diez vales integrados con efectos literales, consume solo su oferta y proyecta una revisión',()=>{
 const cases:[string,string[],Totals,Totals][]=[
  ['v_grabber',[],[5,3,8,5],[6,3,8,5]],
  ['v_nacho_tong',['v_grabber'],[6,3,8,5],[7,3,8,5]],
  ['v_wasteful',[],[5,3,8,5],[5,4,8,5]],
  ['v_recyclomancy',['v_wasteful'],[5,4,8,5],[5,5,8,5]],
  ['v_paint_brush',[],[5,3,8,5],[5,3,9,5]],
  ['v_palette',['v_paint_brush'],[5,3,9,5],[5,3,10,5]],
  ['v_blank',[],[5,3,8,5],[5,3,8,5]],
  ['v_antimatter',['v_blank'],[5,3,8,5],[5,3,8,6]],
  ['v_seed_money',[],[5,3,8,5],[5,3,8,5]],
  ['v_money_tree',['v_seed_money'],[5,3,8,5],[5,3,8,5]]
 ];
 for(const [catalogId,owned,prior,expected] of cases){
  const state=fixture(catalogId,owned,prior),before=structuredClone(state),result=buy(state),change=success(result);
  assert.equal(change.state.schemaVersion,'0.2');
  const next=change.state as GameStateV02;
  assert.deepEqual(totals(next),expected,catalogId);
  assert.deepEqual(next.observed.money,known(10));
  assert.deepEqual(next.observed.outOfScope,known({vouchers:[...owned,catalogId],consumables:[],pendingTags:[],otherModifiers:[]}));
  assert.equal(next.revision,9);assert.equal(next.updatedAt,timestamp);
  assert.equal(next.phase,'shop');assert.deepEqual(next.phaseData,state.phaseData);
  assert.equal(change.occupiedSlots,0);assert.equal(change.freeSlots,expected[3]);
  assert.equal(next.observed.shop.status,'known');
  if(next.observed.shop.status==='known'&&state.observed.shop.status==='known'){
   assert.deepEqual(next.observed.shop.value.cardOffers,state.observed.shop.value.cardOffers);
   assert.deepEqual(next.observed.shop.value.ignoredOtherOffers,state.observed.shop.value.ignoredOtherOffers);
   assert.deepEqual(next.observed.shop.value.voucherOffers,[{offerId:'voucher-other',catalogId:'v_blank',price:known(10)}]);
  }
  assert.deepEqual(change.steps,[next]);assert.notEqual(change.steps[0],next);
  assert.deepEqual(state,before);
  assert.ok(result.ok&&result.projected);
  assert.ok(result.evidence.limitations.some(item=>item.ruleId==='vouchers.purchase'&&item.status==='provisional'));
 }
});

test('Prerrequisitos, duplicados y ofertas ajenas se rechazan sin mutación',()=>{
 for(const id of ['v_nacho_tong','v_recyclomancy','v_palette','v_antimatter','v_money_tree'])rejected(fixture(id),'missing_prerequisite');
 for(const id of ['v_blank','v_seed_money'])rejected(fixture(id,[id]),'voucher_already_owned');
 for(const id of ['v_clearance_sale','v_observatory','v_future_voucher'])rejected(fixture(id),'unsupported_voucher');
 const noOffers=fixture();if(noOffers.observed.shop.status==='known')delete noOffers.observed.shop.value.voucherOffers;
 rejected(noOffers,'missing_offer');
 const cardOnly=fixture();const before=structuredClone(cardOnly),result=buy(cardOnly,'o1');
 assert.ok(!result.ok&&result.errors[0]?.code==='missing_offer');assert.deepEqual(cardOnly,before);
});

test('El precio observado debe ser conocido y exactamente $10, sin inferencias de catálogo',()=>{
 for(const price of [0,7,9,11,15]){
  const state=fixture();if(state.observed.shop.status==='known')state.observed.shop.value.voucherOffers![0]!.price=known(price);
  rejected(state,'unsupported_price');
 }
 const unknown=fixture();if(unknown.observed.shop.status==='known')unknown.observed.shop.value.voucherOffers![0]!.price=missing;
 rejected(unknown,'unknown_data');
});

test('Compra con $10 exactos y Credit Card permite hasta -$20 por instancia física',()=>{
 const exact=fixture();exact.observed.money=known(10);
 assert.deepEqual(success(buy(exact)).state.observed.money,known(0));
 const poor=fixture();poor.observed.money=known(9);rejected(poor,'insufficient_money');
 const credit=fixture();credit.observed.jokers=known([joker('credit_card')]);credit.observed.money=known(-10);
 const credited=buy(credit);assert.deepEqual(success(credited).state.observed.money,known(-20));
 assert.ok(credited.evidence.limitations.some(item=>item.ruleId==='jokers.economy'));
 credit.observed.money=known(-11);rejected(credit,'insufficient_money');
 const copied=fixture();copied.observed.jokers=known([joker('credit_card'),joker('blueprint')]);copied.observed.money=known(-11);
 rejected(copied,'insufficient_money');
});

test('Totales de recursos previos incompatibles no se reparan al comprar el vale afectado',()=>{
 const hands=fixture();hands.observed.resources.handsPerRound=known(6);rejected(hands,'unsupported_resources');
 const discards=fixture('v_wasteful');discards.observed.resources.discardsPerRound=known(4);rejected(discards,'unsupported_resources');
 const size=fixture('v_paint_brush');size.observed.resources.handSize=known(9);rejected(size,'unsupported_resources');
 const capacity=fixture('v_antimatter',['v_blank']);capacity.observed.resources.jokerSlots=known(6);rejected(capacity,'unsupported_capacity');
});

test('Grabber conserva Troubadour/Juggler y una edición negativa sin recalcular efectos de puntuación',()=>{
 const state=fixture('v_grabber',[],[4,3,11,6]);
 state.observed.jokers=known([joker('troubadour'),joker('juggler','negative'),joker('green_joker','base',{greenMult:missing})]);
 state.observed.deck=missing;state.observed.handBases=missing;
 const before=structuredClone(state),change=success(buy(state));
 assert.deepEqual(totals(change.state as GameStateV02),[5,3,11,6]);
 assert.equal(change.occupiedSlots,3);assert.equal(change.freeSlots,3);
 assert.deepEqual(change.state.observed.jokers,before.observed.jokers);
 assert.deepEqual(state,before);
});

test('Manos y descartes no requieren hSize desconocido de Turtle Bean ni alteran campos ajenos',()=>{
 for(const id of ['v_grabber','v_wasteful']){
  const state=fixture(id);state.observed.jokers=known([joker('turtle_bean','base',{hSize:missing})]);
  state.observed.resources.handSize=missing;state.observed.deck=missing;state.observed.handBases=missing;
  const change=success(buy(state));
  assert.deepEqual(change.state.observed.resources.handSize,missing);
  assert.deepEqual(change.state.observed.resources.handsPerRound,known(id==='v_grabber'?6:5));
  assert.deepEqual(change.state.observed.resources.discardsPerRound,known(id==='v_wasteful'?4:3));
 }
 const size=fixture('v_paint_brush');size.observed.jokers=known([joker('turtle_bean','base',{hSize:missing})]);
 rejected(size,'unknown_data');
});

test('Tamaño de mano conserva Turtle Bean físico y descuentos de Stuntman/Merry Andy',()=>{
 const turtle=fixture('v_paint_brush',[],[5,3,11,5]);turtle.observed.jokers=known([joker('turtle_bean','base',{hSize:known(3)})]);
 assert.deepEqual(totals(success(buy(turtle)).state as GameStateV02),[5,3,12,5]);
 const passive=fixture('v_paint_brush',[],[5,6,5,5]);passive.observed.jokers=known([joker('merry_andy'),joker('stuntman')]);
 assert.deepEqual(totals(success(buy(passive)).state as GameStateV02),[5,6,6,5]);
});

test('Antimatter conserva negativos y permite tamaño de mano desconocido e inventario lleno',()=>{
 const state=fixture('v_antimatter',['v_blank'],[5,3,8,6]);
 state.observed.jokers=known([joker('turtle_bean','negative',{hSize:missing}),...Array.from({length:5},(_,n)=>({...joker('joker'),instanceId:'normal-'+n}))]);
 state.observed.resources.handsPerRound=missing;state.observed.resources.discardsPerRound=missing;state.observed.resources.handSize=missing;
 state.observed.deck=missing;
 const change=success(buy(state));assert.deepEqual(change.state.observed.resources.jokerSlots,known(7));
 assert.equal(change.occupiedSlots,6);assert.equal(change.freeSlots,1);
 assert.deepEqual(change.state.observed.resources.handSize,missing);
});

test('Interés y Blank no requieren mazo, tamaño de Turtle Bean ni datos de puntuación ajenos',()=>{
 for(const [id,owned] of [['v_seed_money',[]],['v_money_tree',['v_seed_money']],['v_blank',[]]] as [string,string[]][]){
  const state=fixture(id,owned);
  state.observed.jokers=known([joker('turtle_bean','base',{hSize:missing}),joker('green_joker','base',{greenMult:missing})]);
  state.observed.deck=missing;state.observed.handBases=missing;state.observed.nextBlind=missing;state.observed.visibleBoss=missing;
  state.observed.jokerContext=missing;
  state.observed.resources.handsPerRound=missing;state.observed.resources.discardsPerRound=missing;state.observed.resources.handSize=missing;
  const before=structuredClone(state),next=success(buy(state)).state;
  assert.deepEqual(next.observed.resources,before.observed.resources);
  assert.deepEqual(next.observed.jokers,before.observed.jokers);
 }
});

test('Interés y Blank con dinero suficiente conservan inventario y capacidad desconocidos',()=>{
 for(const [id,owned] of [['v_seed_money',[]],['v_money_tree',['v_seed_money']],['v_blank',[]]] as [string,string[]][]){
  const state=fixture(id,owned);state.observed.jokers=missing;
  state.observed.resources={handsPerRound:missing,discardsPerRound:missing,handSize:missing,jokerSlots:missing};
  const before=structuredClone(state),change=success(buy(state));
  assert.deepEqual(change.state.observed.jokers,missing);
  assert.deepEqual(change.state.observed.resources,before.observed.resources);
  assert.equal(change.occupiedSlots,null);assert.equal(change.freeSlots,null);
  state.observed.money=known(9);rejected(state,'unknown_data');
 }
 const knownInventory=fixture('v_seed_money');knownInventory.observed.resources.jokerSlots=missing;
 const change=success(buy(knownInventory));assert.equal(change.occupiedSlots,0);assert.equal(change.freeSlots,null);
 assert.deepEqual(change.state.observed.resources.jokerSlots,missing);
 const knownCapacity=fixture('v_blank');knownCapacity.observed.jokers=missing;
 const independent=success(buy(knownCapacity));assert.equal(independent.occupiedSlots,null);assert.equal(independent.freeSlots,null);
 assert.deepEqual(independent.state.observed.resources.jokerSlots,known(5));
 const grabber=fixture('v_grabber');grabber.observed.resources.jokerSlots=missing;
 const increased=success(buy(grabber));assert.deepEqual(increased.state.observed.resources.handsPerRound,known(6));
 assert.deepEqual(increased.state.observed.resources.jokerSlots,missing);
});

test('Seed Money y Money Tree afectan después el tope de interés, sin producir interés en la compra',()=>{
 for(const [id,owned,expected] of [['v_seed_money',[],10],['v_money_tree',['v_seed_money'],20]] as [string,string[],number][]){
  const state=fixture(id,owned);state.observed.money=known(110);
  const next=success(buy(state)).state;
  assert.deepEqual(next.observed.money,known(100));assert.equal(success(interestOnBalance(next)),expected);
 }
});

test('Barajas Pintada y Negra conservan sus bases al adquirir vales',()=>{
 const painted=fixture('v_palette',['v_paint_brush'],[4,3,11,4]);painted.observed.deckId=known('painted');
 assert.deepEqual(totals(success(buy(painted)).state as GameStateV02),[4,3,12,4]);
 const black=fixture('v_grabber',[],[3,3,8,6]);black.observed.deckId=known('black');
 assert.deepEqual(totals(success(buy(black)).state as GameStateV02),[4,3,8,6]);
});

test('Datos necesarios desconocidos y modificadores no implementados producen errores claros',()=>{
 for(const key of ['money','shop','jokers','outOfScope'] as const){const state=fixture();state.observed[key]=missing;rejected(state,'unknown_data');}
 const slots=fixture('v_antimatter',['v_blank']);slots.observed.resources.jokerSlots=missing;rejected(slots,'unknown_data');
 const hands=fixture();hands.observed.resources.handsPerRound=missing;rejected(hands,'unknown_data');
 const unsupported=fixture();unsupported.observed.outOfScope=known({vouchers:['v_clearance_sale'],consumables:[],pendingTags:[],otherModifiers:[]});
 rejected(unsupported,'unsupported_modifier');
 const tags=fixture();tags.observed.jokerContext=known({tags:known(['tag_handy'])});rejected(tags,'unsupported_tag');
});

test('Formato, fase, revisión, fecha y acción inválidas no alteran la entrada',()=>{
 const state=fixture(),before=structuredClone(state);
 const {phaseData:_data,...base}=state;
 const legacyState=structuredClone({...base,schemaVersion:'0.1' as const});
 if(legacyState.observed.shop.status==='known')delete legacyState.observed.shop.value.voucherOffers;
 const legacy=applyVoucherPurchase(legacyState,{type:'buy_voucher',offerId:'voucher-main'},{expectedRevision:8,updatedAt:timestamp});
 assert.ok(!legacy.ok&&legacy.errors[0]?.code==='unsupported_schema');
 const wrong=applyVoucherPurchase({...state,phase:'blind_select',phaseData:{skipTag:missing}},{type:'buy_voucher',offerId:'voucher-main'},{expectedRevision:8,updatedAt:timestamp});
 assert.ok(!wrong.ok&&wrong.errors[0]?.code==='wrong_phase');
 const stale=applyVoucherPurchase(state,{type:'buy_voucher',offerId:'voucher-main'},{expectedRevision:7,updatedAt:timestamp});
 assert.ok(!stale.ok&&stale.errors[0]?.code==='stale_revision');
 const badDate=applyVoucherPurchase(state,{type:'buy_voucher',offerId:'voucher-main'},{expectedRevision:8,updatedAt:'2026-02-30T00:00:00Z'});
 assert.ok(!badDate.ok&&badDate.errors[0]?.code==='timestamp');
 for(const action of [null,{type:'buy_voucher'},{type:'buy_voucher',offerId:''},{type:'buy',offerId:'voucher-main'},{type:'buy_voucher',offerId:'voucher-main',price:10}]){
  const result=applyVoucherPurchase(state,action as VoucherPurchaseAction,{expectedRevision:8,updatedAt:timestamp});
  assert.ok(!result.ok&&result.errors[0]?.code==='invalid_action');
 }
 assert.deepEqual(state,before);
});

test('Desbordamientos de saldo y revisión se rechazan sin mutación',()=>{
 const money=fixture('v_blank');money.observed.money=known(Number.MIN_SAFE_INTEGER);rejected(money,'numeric_range');
 const revision=fixture();revision.revision=Number.MAX_SAFE_INTEGER;rejected(revision,'numeric_range');
});

test('Oferta comprada no se puede repetir y requireObserved mantiene la evidencia provisional',()=>{
 const state=fixture(),before=structuredClone(state),next=success(buy(state)).state as GameStateV02;
 const nextBefore=structuredClone(next),again=buy(next);
 assert.ok(!again.ok&&again.errors[0]?.code==='missing_offer');assert.deepEqual(next,nextBefore);
 const observed=applyVoucherPurchase(state,{type:'buy_voucher',offerId:'voucher-main'},{expectedRevision:8,updatedAt:timestamp},{requireObserved:true});
 assert.ok(!observed.ok&&observed.errors[0]?.code==='pending_rule');assert.deepEqual(state,before);
});

test('IDs de oferta duplicados o compartidos con cartas son inválidos y no se consumen',()=>{
 const duplicate=fixture();if(duplicate.observed.shop.status==='known')duplicate.observed.shop.value.voucherOffers![1]!.offerId='voucher-main';
 rejected(duplicate,'duplicate_id');
 const shared=fixture();if(shared.observed.shop.status==='known')shared.observed.shop.value.voucherOffers![0]!.offerId='o1';
 rejected(shared,'duplicate_id');
});
