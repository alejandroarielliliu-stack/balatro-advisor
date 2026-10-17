import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {validateState} from '../src/state/validation.js';
import {createConfirmedStore,analysisBinding,CONFIRMED_STORAGE_KEY,validateConfirmedRecord} from '../src/storage/confirmed-store.js';
import {createShopSessionStore} from '../src/storage/shop-session.js';
import type {ShopOffer} from '../src/storage/shop-session.js';
import type {Fact,GameState,GameStateV01,GameStateV02,Result,VoucherOffer} from '../src/state/model.js';
import {known,MemoryStorage,success} from './helpers.js';

const time='2026-10-17T15:00:00Z';
const missing={status:'unknown',reason:'No observado en esta tienda.'} as const;
const legacyFixture=():GameStateV01=>JSON.parse(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8')) as GameStateV01;
const voucher=(offerId='grabber',catalogId='v_grabber',price:Fact<number>=known(10)):VoucherOffer=>({offerId,catalogId,price});
const cards=():ShopOffer[]=>[
 {offerId:'joker-offer',catalogId:'joker',label:'Joker',kind:'joker',price:known(2),edition:known('base'),stickers:known([])},
 {offerId:'opaque-card',catalogId:'unmapped-card',label:'Otra carta observada',kind:'unsupported',price:missing,edition:missing,stickers:missing}
];
/** Literal input and manual expected balances/resources; no H2 projection builds the oracle. */
const fixture=():GameStateV02=>{
 const state:GameStateV02={...legacyFixture(),schemaVersion:'0.2',phase:'shop',phaseData:{origin:missing}};
 state.observed.money=known(40);
 state.observed.resources={handsPerRound:known(5),discardsPerRound:known(3),handSize:known(8),jokerSlots:known(5)};
 state.observed.shop=known({shopId:'voucher-shelf',cardOffers:cards(),ignoredOtherOffers:['Sobre Arcano: contenido sin observar.'],voucherOffers:[
  voucher(),voucher('seed','v_seed_money'),voucher('future','v_future_voucher'),voucher('unknown-price','v_blank',missing)
 ]});
 return state;
};
const header=(state:GameState,id:string)=>({confirmationId:id,confirmed:true,expected:analysisBinding(state),updatedAt:time});
const purchase=(state:GameState,id='buy-grabber',offerId='grabber')=>({...header(state,id),action:{type:'buy_voucher' as const,offerId}});
const errorCode=(result:Result<unknown>)=>{assert.ok(!result.ok,JSON.stringify(result));assert.ok(result.errors[0]!.message);return result.errors[0]!.code;};
const current=(state:GameState):GameStateV02=>{assert.equal(state.schemaVersion,'0.2');return state as GameStateV02;};
const shelf=(state:GameState)=>{const shop=current(state).observed.shop;assert.ok(shop.status==='known');return shop.value;};
const owned=(state:GameState)=>{const extra=state.observed.outOfScope;assert.ok(extra.status==='known');return extra.value.vouchers;};
function setup(state:GameState=fixture()){
 const memory=new MemoryStorage(),store=createConfirmedStore(()=>memory);
 success(store.initialize(state));
 return {state,memory,store,session:createShopSessionStore(()=>memory)};
}

test('SHOP02a ofertas de vales0.2 conservan identidad y hechos conocidos/desconocidos sin inferir cobertura',()=>{
 const state=fixture(),original=structuredClone(state),checked=success(validateState(state));
 assert.deepEqual(checked,state);assert.deepEqual(state,original);
 assert.deepEqual(shelf(checked).voucherOffers,[voucher(),voucher('seed','v_seed_money'),voucher('future','v_future_voucher'),voucher('unknown-price','v_blank',missing)]);
 const {store,memory}=setup(state),raw=memory.getItem(CONFIRMED_STORAGE_KEY);
 const loaded=success(createConfirmedStore(()=>memory).load())!;
 assert.deepEqual(loaded.state,state);assert.equal(loaded.schemaVersion,'confirmed-2');
 shelf(loaded.state).voucherOffers![0]!.catalogId='changed-outside-store';
 assert.equal(shelf(success(store.load())!.state).voucherOffers![0]!.catalogId,'v_grabber');
 assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);
 for(const malformed of [
  {...voucher(),price:known(-1)}, {...voucher(),price:known(1.5)}, {...voucher(),price:{status:'known',value:10}},
  {...voucher(),price:{status:'unknown'}}, {...voucher(),invented:true}
 ]){
  const input=structuredClone(state);
  (shelf(input) as unknown as {voucherOffers:unknown[]}).voucherOffers=[malformed];
  assert.ok(!validateState(input).ok);
 }
});

test('SHOP02a IDs de vales repetidos o compartidos con cartas se rechazan sin guardar',()=>{
 const {state,session,memory}=setup(),raw=memory.getItem(CONFIRMED_STORAGE_KEY),writes=memory.writes;
 for(const voucherOffers of [[voucher(),voucher()],[voucher('joker-offer')]]){
  const input=structuredClone(state);shelf(input).voucherOffers=voucherOffers;
  assert.equal(errorCode(validateState(input)),'duplicate_id');
  assert.equal(errorCode(session.observeJokerOffers({...header(state,'invalid-ids'),shopId:'voucher-shelf',offers:cards(),voucherOffers})),'duplicate_id');
 }
 assert.equal(memory.writes,writes);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);
});

test('SHOP02a observar y recargar vales guarda solo la tienda y devuelve copias independientes',()=>{
 const state=fixture();delete shelf(state).voucherOffers;
 const {memory,session}=setup(state),original=structuredClone(state),voucherOffers=[voucher(),voucher('unknown-price','v_blank',missing),voucher('future','v_future_voucher')];
 const input={...header(state,'observe-vouchers'),shopId:'voucher-shelf',offers:cards(),voucherOffers},before=structuredClone(input);
 const saved=success(session.observeJokerOffers(input));
 assert.equal(saved.state.revision,1);assert.equal(saved.history.length,1);assert.equal(saved.history[0]!.kind,'correction');
 assert.deepEqual(shelf(saved.state).voucherOffers,voucherOffers);assert.deepEqual(shelf(saved.state).cardOffers,cards());
 assert.deepEqual(shelf(saved.state).ignoredOtherOffers,shelf(state).ignoredOtherOffers);
 assert.deepEqual(saved.state.observed.outOfScope,state.observed.outOfScope);assert.deepEqual(saved.state.observed.resources,state.observed.resources);
 assert.deepEqual(saved.state.observed.money,known(40));assert.deepEqual(saved.state.assumptions,state.assumptions);
 assert.deepEqual(input,before);assert.deepEqual(state,original);
 assert.deepEqual(success(createShopSessionStore(()=>memory).load()),saved);
 const writes=memory.writes;
 const same=success(session.observeJokerOffers({...header(saved.state,'unused-observation'),shopId:'voucher-shelf',offers:cards(),voucherOffers}));
 assert.deepEqual(same,saved);assert.equal(memory.writes,writes);
 voucherOffers[0]!.catalogId='external-change';shelf(saved.state).voucherOffers!.length=0;
 assert.equal(shelf(success(session.load())!.state).voucherOffers![0]!.catalogId,'v_grabber');
});

test('SHOP02a omitir vales conserva la misma tienda; lista vacía los borra y tienda nueva no los hereda',()=>{
 const {state,session}=setup();
 const preserved=success(session.observeJokerOffers({...header(state,'edit-joker'),shopId:'voucher-shelf',offers:cards().slice(0,1)}));
 assert.deepEqual(shelf(preserved.state).voucherOffers,shelf(state).voucherOffers);
 const cleared=success(session.observeJokerOffers({...header(preserved.state,'clear-vouchers'),shopId:'voucher-shelf',offers:cards().slice(0,1),voucherOffers:[]}));
 assert.deepEqual(shelf(cleared.state).voucherOffers,[]);assert.deepEqual(shelf(cleared.state).cardOffers,cards().slice(0,1));
 const two=setup();
 const fresh=success(two.session.observeJokerOffers({...header(two.state,'new-shop'),shopId:'next-voucher-shelf',offers:cards()}));
 assert.deepEqual(shelf(fresh.state).voucherOffers??[],[]);
 assert.equal(shelf(fresh.state).shopId,'next-voucher-shelf');
});

test('SHOP02a confirmar Grabber40−10=30 y manos5→6; recargar y deshacer recuperan la oferta y todos los datos',()=>{
 const {state,memory,session}=setup(),original=structuredClone(state),writes=memory.writes;
 const bought=success(session.confirm(purchase(state)));
 assert.deepEqual(bought.state.observed.money,known(30));assert.deepEqual(bought.state.observed.resources.handsPerRound,known(6));
 assert.deepEqual(bought.state.observed.resources.discardsPerRound,known(3));assert.deepEqual(bought.state.observed.resources.handSize,known(8));assert.deepEqual(bought.state.observed.resources.jokerSlots,known(5));
 assert.deepEqual(owned(bought.state),['v_grabber']);assert.equal(bought.state.revision,1);assert.equal(memory.writes,writes+1);
 assert.deepEqual(shelf(bought.state).voucherOffers,shelf(state).voucherOffers!.slice(1));
 assert.deepEqual(shelf(bought.state).cardOffers,cards());assert.deepEqual(shelf(bought.state).ignoredOtherOffers,shelf(state).ignoredOtherOffers);
 assert.deepEqual(bought.state.observed.jokers,state.observed.jokers);assert.deepEqual(bought.state.observed.deck,state.observed.deck);
 assert.deepEqual(bought.state.assumptions,state.assumptions);assert.deepEqual(current(bought.state).phaseData,current(state).phaseData);
 assert.equal(bought.history.length,1);assert.deepEqual(bought.history[0]!.action,{type:'buy_voucher',offerId:'grabber'});
 assert.ok(bought.history[0]!.evidence);assert.deepEqual(state,original);
 const reloaded=createShopSessionStore(()=>memory);assert.deepEqual(success(reloaded.load()),bought);
 const undone=success(reloaded.undo({...header(bought.state,'undo-grabber'),targetEntryId:'buy-grabber',reason:'No realicé esta compra.'}));
 assert.deepEqual(undone.state.observed,state.observed);assert.equal(undone.state.revision,2);
 assert.equal(undone.history.length,2);assert.equal(undone.history[1]!.kind,'undo');assert.equal(undone.history[1]!.targetEntryId,'buy-grabber');
 assert.deepEqual(success(createConfirmedStore(()=>memory).load()),undone);
});

test('SHOP02a dos compras distintas son legítimas: Grabber40→30 y Seed30→20 conservando manos6',()=>{
 const {state,session,memory}=setup();
 const first=success(session.confirm(purchase(state,'buy-grabber')));
 const second=success(session.confirm(purchase(first.state,'buy-seed','seed')));
 assert.deepEqual(second.state.observed.money,known(20));assert.deepEqual(second.state.observed.resources.handsPerRound,known(6));
 assert.deepEqual(owned(second.state),['v_grabber','v_seed_money']);assert.equal(second.state.revision,2);
 assert.deepEqual(second.history.map(entry=>entry.id),['buy-grabber','buy-seed']);
 assert.deepEqual(second.history.map(entry=>entry.action),[{type:'buy_voucher',offerId:'grabber'},{type:'buy_voucher',offerId:'seed'}]);
 assert.deepEqual(shelf(second.state).voucherOffers,[voucher('future','v_future_voucher'),voucher('unknown-price','v_blank',missing)]);
 assert.deepEqual(shelf(second.state).cardOffers,cards());assert.deepEqual(success(createShopSessionStore(()=>memory).load()),second);
 success(validateConfirmedRecord(second));
});

test('SHOP02a cuota al observar/comprar/deshacer conserva documento entero y permite reintentar los mismos IDs',()=>{
 const state=fixture();delete shelf(state).voucherOffers;
 const {session,memory}=setup(state),initial=memory.getItem(CONFIRMED_STORAGE_KEY);
 const observation={...header(state,'observe'),shopId:'voucher-shelf',offers:cards(),voucherOffers:[voucher()]};
 memory.failWrite=true;assert.equal(errorCode(session.observeJokerOffers(observation)),'storage_write');assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),initial);
 memory.failWrite=false;const observed=success(session.observeJokerOffers(observation)),observedRaw=memory.getItem(CONFIRMED_STORAGE_KEY);
 const buy=purchase(observed.state),input=structuredClone(buy);
 memory.failWrite=true;assert.equal(errorCode(session.confirm(buy)),'storage_write');assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),observedRaw);
 assert.deepEqual(success(session.load()),observed);assert.deepEqual(buy,input);
 memory.failWrite=false;const bought=success(session.confirm(buy)),boughtRaw=memory.getItem(CONFIRMED_STORAGE_KEY);
 const undo={...header(bought.state,'undo'),targetEntryId:'buy-grabber',reason:'Compra transcrita por error.'};
 memory.failWrite=true;assert.equal(errorCode(session.undo(undo)),'storage_write');assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),boughtRaw);
 assert.deepEqual(success(createConfirmedStore(()=>memory).load()),bought);
 memory.failWrite=false;const undone=success(session.undo(undo));assert.deepEqual(undone.state.observed,observed.state.observed);
});

test('SHOP02a compras ilegales, datos pendientes y falta de consentimiento no cambian estado ni historial',()=>{
 const cases:[GameStateV02,string,string][]=[];
 const poor=fixture();poor.observed.money=known(9);cases.push([poor,'grabber','insufficient_money']);
 const prerequisite=fixture();shelf(prerequisite).voucherOffers=[voucher('upgrade','v_nacho_tong')];cases.push([prerequisite,'upgrade','missing_prerequisite']);
 const ownedState=fixture();ownedState.observed.outOfScope=known({vouchers:['v_seed_money'],consumables:[],pendingTags:[],otherModifiers:[]});cases.push([ownedState,'seed','voucher_already_owned']);
 cases.push([fixture(),'unknown-price','unknown_data'],[fixture(),'future','unsupported_voucher'],[fixture(),'missing','missing_offer']);
 for(const [state,offerId,code] of cases){
  const {session,memory}=setup(state),raw=memory.getItem(CONFIRMED_STORAGE_KEY),writes=memory.writes;
  assert.equal(errorCode(session.confirm(purchase(state,'illegal',offerId))),code);
  assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);assert.equal(memory.writes,writes);assert.deepEqual(success(session.load())!.state,state);
 }
 const {state,session,memory}=setup(),raw=memory.getItem(CONFIRMED_STORAGE_KEY);
 assert.equal(errorCode(session.confirm({...purchase(state),confirmed:false})),'confirmation_required');
 assert.equal(errorCode(session.confirm(purchase(state),{requireObserved:true})),'pending_rule');
 assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);
});

test('SHOP02a revisión/binding antiguos y confirmación duplicada se rechazan incluso después de deshacer',()=>{
 const {state,session,memory}=setup(),firstRequest=purchase(state),first=success(session.confirm(firstRequest)),raw=memory.getItem(CONFIRMED_STORAGE_KEY);
 assert.equal(errorCode(session.confirm(firstRequest)),'duplicate_confirmation');
 assert.equal(errorCode(session.confirm(purchase(state,'stale','seed'))),'stale_revision');
 assert.equal(errorCode(session.confirm(purchase({...first.state,runId:'another-run'},'foreign','seed'))),'stale_revision');
 assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);
 const undone=success(session.undo({...header(first.state,'undo'),targetEntryId:'buy-grabber',reason:'No ocurrió.'})),undoneRaw=memory.getItem(CONFIRMED_STORAGE_KEY);
 assert.equal(errorCode(session.confirm(purchase(undone.state,'buy-grabber'))),'duplicate_confirmation');
 assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),undoneRaw);
 const retried=success(session.confirm(purchase(undone.state,'new-confirmation')));
 assert.deepEqual(retried.state.observed.money,known(30));assert.deepEqual(owned(retried.state),['v_grabber']);
});

test('SHOP02a recibos contrastan saldo, cartas, ofertas y vales; los tres campos anteriores siguen válidos',()=>{
 const {state,session,memory}=setup(),raw=memory.getItem(CONFIRMED_STORAGE_KEY),writes=memory.writes;
 const receipt={money:30,jokerIds:[],offerIds:['joker-offer','opaque-card'],voucherOfferIds:['seed','future','unknown-price'],voucherIds:['v_grabber']};
 for(const mismatch of [{money:29},{jokerIds:['phantom']},{offerIds:[]},{voucherOfferIds:['grabber','seed','future','unknown-price']},{voucherIds:[]}]){
  const result=session.confirm({...purchase(state),observedAfter:{...receipt,...mismatch}});
  assert.equal(errorCode(result),'model_discrepancy');
  assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);assert.equal(memory.writes,writes);
 }
 const saved=success(session.confirm({...purchase(state),observedAfter:receipt}));assert.deepEqual(saved.state.observed.money,known(30));
 const old=setup();
 const compatible=success(old.session.confirm({...purchase(old.state),observedAfter:{money:30,jokerIds:[],offerIds:['joker-offer','opaque-card']}}));
 assert.deepEqual(compatible.state.observed.money,known(30));assert.deepEqual(owned(compatible.state),['v_grabber']);
});

test('SHOP02a formato0.1 y su historial permanecen congelados y nunca aceptan ofertas o acciones de vale',()=>{
 const legacy=legacyFixture(),{memory,store,session}=setup(legacy),raw=memory.getItem(CONFIRMED_STORAGE_KEY),writes=memory.writes;
 const invalid=structuredClone(legacy);
 assert.ok(invalid.observed.shop.status==='known');Object.assign(invalid.observed.shop.value,{voucherOffers:[voucher()]});
 assert.equal(errorCode(validateState(invalid)),'unexpected_field');
 assert.ok(!session.observeJokerOffers({...header(legacy,'legacy-offer'),shopId:'s01-shop',offers:cards(),voucherOffers:[voucher()]}).ok);
 assert.ok(!session.confirm(purchase(legacy)).ok);
 assert.equal(memory.writes,writes);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);assert.deepEqual(success(store.load())!.state,legacy);
 const held=success(store.confirm({...header(legacy,'legacy-hold'),action:{type:'hold'}}));
 assert.equal(held.schemaVersion,'confirmed-1');assert.equal(held.state.schemaVersion,'0.1');
 const forged=structuredClone(held) as unknown as {history:{action:unknown}[]};forged.history[0]!.action={type:'buy_voucher',offerId:'grabber'};
 assert.ok(!validateConfirmedRecord(forged).ok);
});

test('SHOP02a migración explícita conserva todos los snapshots0.1 y permite añadir y comprar vales después',()=>{
 const legacy=legacyFixture(),{store,memory}=setup(legacy);
 const prior=success(store.confirm({...header(legacy,'legacy-hold'),action:{type:'hold'}}));
 const raw=memory.getItem(CONFIRMED_STORAGE_KEY)!,writes=memory.writes,prepared=success(store.prepareMigration());
 assert.equal(prepared.requiresMigration,true);assert.equal(memory.writes,writes);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);
 assert.deepEqual(success(createConfirmedStore(()=>memory).load()),prior);
 assert.equal(errorCode(store.migrateToCurrent({confirmed:false,expectedRaw:raw})),'confirmation_required');
 assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);
 const migrated=success(store.migrateToCurrent({confirmed:true,expectedRaw:raw}));
 assert.equal(migrated.schemaVersion,'confirmed-2');assert.equal(success(store.exportMigrationBackup()),raw);
 assert.equal(migrated.state.revision,prior.state.revision);assert.deepEqual(migrated.history.map(entry=>entry.action),[{type:'hold'}]);
 const expected=(state:GameState)=>({...structuredClone(state),schemaVersion:'0.2',phaseData:{origin:{status:'unknown',reason:'La partida 0.1 no registra qué ciega originó esta tienda.'}}});
 assert.deepEqual(migrated.initialState,expected(prior.initialState));assert.deepEqual(migrated.state,expected(prior.state));
 assert.deepEqual(migrated.history[0]!.before,expected(prior.history[0]!.before));assert.deepEqual(migrated.history[0]!.after,expected(prior.history[0]!.after));
 assert.equal(shelf(migrated.state).voucherOffers,undefined);
 const funded=success(store.correct({...header(migrated.state,'observed-funds'),patch:{money:known(40)},reason:'Saldo actual observado.'}));
 const session=createShopSessionStore(()=>memory),observed=success(session.observeJokerOffers({...header(funded.state,'current-vouchers'),shopId:'s01-shop',offers:shelf(funded.state).cardOffers,voucherOffers:[voucher()]}));
 const bought=success(session.confirm(purchase(observed.state)));
 assert.deepEqual(bought.state.observed.money,known(30));assert.deepEqual(bought.state.observed.resources.handsPerRound,known(6));
 assert.deepEqual(owned(bought.state),['v_grabber']);assert.equal(bought.history[0]!.id,'legacy-hold');
 assert.deepEqual(success(createConfirmedStore(()=>memory).load()),bought);assert.equal(success(store.exportMigrationBackup()),raw);
});
