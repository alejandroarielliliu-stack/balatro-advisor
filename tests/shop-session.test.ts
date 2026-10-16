import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {parseState} from '../src/state/validation.js';
import {createConfirmedStore,analysisBinding,CONFIRMED_STORAGE_KEY} from '../src/storage/confirmed-store.js';
import {createShopSessionStore} from '../src/storage/shop-session.js';
import type {ShopOffer} from '../src/storage/shop-session.js';
import {applyShopAction} from '../src/rules/shop.js';
import type {GameState,Result} from '../src/state/model.js';
import {known,MemoryStorage,success} from './helpers.js';

const time='2026-10-15T12:00:00Z';
const fixture=()=>{
  const state=success(parseState(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8')));
  state.observed.money=known(25);return state;
};
const header=(state:GameState,id:string)=>({confirmationId:id,confirmed:true,expected:analysisBinding(state),updatedAt:time});
const offer=(id='sale-joker',catalogId='joker',price=2):ShopOffer=>({offerId:id,catalogId,label:catalogId,kind:'joker',price:known(price),edition:known('base'),stickers:known([])});
function setup(state=fixture()) {
  const memory=new MemoryStorage();success(createConfirmedStore(()=>memory).initialize(state));
  return {memory,state,session:createShopSessionStore(()=>memory)};
}
function errorCode(result:Result<unknown>) {assert.ok(!result.ok);return result.errors[0]!.code;}

test('SHOP03a transcribir y recargar preserva ofertas, datos ajenos e hipótesis sin aplicarlas',()=>{
  const state=fixture();state.observed.jokerContext=known({tarotsUsed:known(7),blindsSkipped:known(2)});
  const {memory,session}=setup(state),original=structuredClone(state);
  const offers=[offer(),offer('catalog-only','unknown_effect',8)];
  const input={...header(state,'observe'),shopId:'visual-shop',offers};const before=JSON.stringify(input);
  const record=success(session.observeJokerOffers(input));
  assert.equal(record.state.revision,1);assert.equal(record.history.length,1);assert.equal(record.history[0]!.kind,'correction');
  assert.equal(record.state.observed.shop.status,'known');
  if(record.state.observed.shop.status==='known')assert.deepEqual(record.state.observed.shop.value.cardOffers,offers);
  assert.deepEqual(record.state.observed.jokerContext,state.observed.jokerContext);
  assert.deepEqual(record.state.assumptions,state.assumptions);
  assert.deepEqual(record.state.observed.money,known(25));assert.deepEqual(record.state.observed.deck,state.observed.deck);
  assert.deepEqual(state,original);assert.equal(JSON.stringify(input),before);
  assert.deepEqual(success(createShopSessionStore(()=>memory).load()),record);
  offers[0]!.label='Changed outside store';record.state.observed.money=known(999);
  assert.deepEqual(success(session.load())!.state.observed.money,known(25));
  const persisted=success(session.load())!.state.observed.shop;
  if(persisted.status==='known')assert.equal(persisted.value.cardOffers[0]!.label,'joker');
});

test('SHOP03a consulta y compra hipotética no escriben; compra confirmada $25−$2=$23 y undo recupera',()=>{
  const {state,session,memory}=setup();
  const observed=success(session.observeJokerOffers({...header(state,'observe'),shopId:'visual-shop',offers:[offer()]}));
  const writes=memory.writes,raw=memory.getItem(CONFIRMED_STORAGE_KEY);
  const loaded=success(session.load())!;
  success(applyShopAction(loaded.state,{type:'buy',offerId:'sale-joker',instanceId:'hypothetical'},{expectedRevision:loaded.state.revision,updatedAt:time}));
  assert.equal(memory.writes,writes);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);
  const bought=success(session.confirm({...header(observed.state,'buy'),action:{type:'buy',offerId:'sale-joker',instanceId:'real'}}));
  assert.deepEqual(bought.state.observed.money,known(23));assert.equal(bought.state.revision,2);
  if(bought.state.observed.jokers.status==='known')assert.deepEqual(bought.state.observed.jokers.value.map(j=>j.instanceId),['real']);
  if(bought.state.observed.shop.status==='known')assert.deepEqual(bought.state.observed.shop.value.cardOffers,[]);
  assert.deepEqual(success(createShopSessionStore(()=>memory).load()),bought);
  assert.deepEqual(bought.state.assumptions,state.assumptions);assert.deepEqual(bought.state.observed.deck,state.observed.deck);
  const undo=success(session.undo({...header(bought.state,'undo'),targetEntryId:'buy',reason:'No hice esta compra.'}));
  assert.equal(undo.state.revision,3);assert.deepEqual(undo.state.observed,observed.state.observed);
  assert.equal(undo.history.length,3);assert.equal(undo.history[2]!.kind,'undo');
});

test('SHOP03a venta sola conserva oferta; reemplazo valida ambos pasos antes de una escritura',()=>{
  const state=fixture();state.observed.jokers=known([{instanceId:'old',catalogId:'joker',edition:known('base'),stickers:known([]),sellValue:known(1),counters:{}}]);
  state.observed.shop=known({shopId:'shelf',cardOffers:[offer()],ignoredOtherOffers:[]});
  const one=setup(state);const sold=success(one.session.confirm({...header(state,'sale'),action:{type:'sell',instanceId:'old'}}));
  assert.deepEqual(sold.state.observed.money,known(26));assert.deepEqual(sold.state.observed.jokers,known([]));
  assert.deepEqual(sold.state.observed.shop,state.observed.shop);
  const two=setup(state),writes=two.memory.writes;
  const replaced=success(two.session.confirm({...header(state,'replace'),action:{type:'replace',sellInstanceId:'old',offerId:'sale-joker',instanceId:'new'}}));
  assert.deepEqual(replaced.state.observed.money,known(24));assert.equal(replaced.state.revision,2);
  assert.equal(two.memory.writes,writes+1);assert.equal(replaced.history.length,1);
  assert.deepEqual(replaced.history[0]!.trace.map(step=>step.label),['Venta','Compra']);
  const three=setup(state),raw=three.memory.getItem(CONFIRMED_STORAGE_KEY);
  assert.equal(errorCode(three.session.confirm({...header(state,'replace'),action:{type:'replace',sellInstanceId:'old',offerId:'missing',instanceId:'new'}})),'missing_offer');
  assert.equal(three.memory.getItem(CONFIRMED_STORAGE_KEY),raw);
});

test('SHOP03a fondos insuficientes y espacios llenos conservan estado e historial',()=>{
  const state=fixture();state.observed.money=known(1);state.observed.shop=known({shopId:'shelf',cardOffers:[offer()],ignoredOtherOffers:[]});
  const a=setup(state),raw=a.memory.getItem(CONFIRMED_STORAGE_KEY);
  assert.equal(errorCode(a.session.confirm({...header(state,'buy'),action:{type:'buy',offerId:'sale-joker',instanceId:'new'}})),'insufficient_money');
  assert.equal(a.memory.getItem(CONFIRMED_STORAGE_KEY),raw);
  const full=fixture();full.observed.shop=state.observed.shop;
  full.observed.jokers=known(Array.from({length:5},(_,n)=>({instanceId:`j${n}`,catalogId:'joker',edition:known('base'),stickers:known([] as string[]),sellValue:known(1),counters:{}})));
  const b=setup(full),fullRaw=b.memory.getItem(CONFIRMED_STORAGE_KEY);
  assert.equal(errorCode(b.session.confirm({...header(full,'buy'),action:{type:'buy',offerId:'sale-joker',instanceId:'new'}})),'no_slots');
  assert.equal(b.memory.getItem(CONFIRMED_STORAGE_KEY),fullRaw);
});

test('SHOP03a oferta incompatible persiste y solo bloquea su propia compra',()=>{
  const {state,session,memory}=setup();
  const saved=success(session.observeJokerOffers({...header(state,'observe'),shopId:'shelf',offers:[offer(),offer('other','effect_not_implemented',8)]}));
  const raw=memory.getItem(CONFIRMED_STORAGE_KEY);
  assert.equal(errorCode(session.confirm({...header(saved.state,'bad-buy'),action:{type:'buy',offerId:'other',instanceId:'new'}})),'unsupported_offer');
  assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);
  const bought=success(session.confirm({...header(saved.state,'good-buy'),action:{type:'buy',offerId:'sale-joker',instanceId:'new'}}));
  assert.deepEqual(bought.state.observed.money,known(23));
  if(bought.state.observed.shop.status==='known')assert.deepEqual(bought.state.observed.shop.value.cardOffers.map(o=>o.offerId),['other']);
});

test('SHOP03a colección de150 puede transcribirse sin que engineId sea filtro de persistencia',()=>{
  const catalog=JSON.parse(readFileSync(new URL('../../web/assets/jokers/catalog.json',import.meta.url),'utf8')) as {jokers:{id:string;engineId:string|null;basePrice:number;names:{es:string}}[]};
  assert.equal(catalog.jokers.length,150);
  for(const [index,j] of catalog.jokers.entries()) {
    const {session,state}=setup();
    const saved=success(session.observeJokerOffers({...header(state,`observe-${index}`),shopId:'shelf',offers:[{...offer('visible',j.engineId??j.id,j.basePrice),label:j.names.es}]}));
    const current=saved.state;
    if(current.observed.shop.status==='known')assert.equal(current.observed.shop.value.cardOffers[0]!.catalogId,j.engineId??j.id);
  }
});

test('SHOP03a revisiones antiguas, ID duplicado y binding ajeno se rechazan sin escribir',()=>{
  const {state,session,memory}=setup();
  const observed=success(session.observeJokerOffers({...header(state,'observe'),shopId:'shelf',offers:[offer()]}));
  assert.equal(errorCode(session.confirm({...header(state,'old-analysis'),action:{type:'buy',offerId:'sale-joker',instanceId:'new'}})),'stale_revision');
  const request={...header(observed.state,'buy'),action:{type:'buy' as const,offerId:'sale-joker',instanceId:'new'}};
  const bought=success(session.confirm(request)),raw=memory.getItem(CONFIRMED_STORAGE_KEY);
  assert.equal(errorCode(session.confirm(request)),'duplicate_confirmation');
  assert.equal(errorCode(session.observeJokerOffers({...header(state,'stale-observe'),shopId:'shelf',offers:[]})),'stale_revision');
  assert.equal(errorCode(session.observeJokerOffers({...header({...bought.state,runId:'foreign'},'foreign'),shopId:'shelf',offers:[]})),'stale_revision');
  assert.equal(errorCode(session.observeJokerOffers({...header(bought.state,'observe'),shopId:'shelf',offers:[]})),'duplicate_confirmation');
  assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);
});

test('SHOP03a observar lo mismo no escribe ni consume revisión y conserva notas de la tienda',()=>{
  const {state,session,memory}=setup();assert.equal(state.observed.shop.status,'known');
  if(state.observed.shop.status!=='known')return;
  const {shopId,cardOffers,ignoredOtherOffers}=state.observed.shop.value,writes=memory.writes;
  const noOp=success(session.observeJokerOffers({...header(state,'unused'),shopId,offers:cardOffers}));
  assert.equal(noOp.state.revision,state.revision);assert.equal(memory.writes,writes);assert.equal(noOp.history.length,0);
  const changed=success(session.observeJokerOffers({...header(state,'same-id-can-now-record'),shopId,offers:cardOffers.slice(0,1)}));
  if(changed.state.observed.shop.status==='known')assert.deepEqual(changed.state.observed.shop.value.ignoredOtherOffers,ignoredOtherOffers);
  const fresh=success(session.observeJokerOffers({...header(changed.state,'new-shop'),shopId:'new-shop',offers:[]}));
  if(fresh.state.observed.shop.status==='known')assert.deepEqual(fresh.state.observed.shop.value.ignoredOtherOffers,['Vales, sobres y otras cartas no registrados en este flujo.']);
});

test('SHOP03a fallo al observar, comprar o deshacer conserva último documento y permite reintento',()=>{
  const {state,session,memory}=setup();const original=memory.getItem(CONFIRMED_STORAGE_KEY);
  memory.failWrite=true;
  const request={...header(state,'observe'),shopId:'shelf',offers:[offer()]};
  assert.equal(errorCode(session.observeJokerOffers(request)),'storage_write');assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),original);
  memory.failWrite=false;const observed=success(session.observeJokerOffers(request));const shelf=memory.getItem(CONFIRMED_STORAGE_KEY);
  const buy={...header(observed.state,'buy'),action:{type:'buy' as const,offerId:'sale-joker',instanceId:'real'}};
  memory.failWrite=true;assert.equal(errorCode(session.confirm(buy)),'storage_write');assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),shelf);
  memory.failWrite=false;const bought=success(session.confirm(buy)),purchased=memory.getItem(CONFIRMED_STORAGE_KEY);
  memory.failWrite=true;
  const undo={...header(bought.state,'undo'),targetEntryId:'buy',reason:'No se compró.'};
  assert.equal(errorCode(session.undo(undo)),'storage_write');assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),purchased);
  memory.failWrite=false;success(session.undo(undo));
});

test('SHOP03a sin registro, observación inválida, falta de consentimiento e hipótesis no inicializan ni escriben',()=>{
  const memory=new MemoryStorage(),empty=createShopSessionStore(()=>memory),state=fixture();
  assert.equal(errorCode(empty.observeJokerOffers({...header(state,'observe'),shopId:'shelf',offers:[offer()]})),'not_initialized');
  assert.equal(success(empty.load()),null);assert.equal(memory.writes,0);
  const setupStore=setup(state),raw=setupStore.memory.getItem(CONFIRMED_STORAGE_KEY);
  for(const request of [
    {...header(state,'bad'),confirmed:false,shopId:'shelf',offers:[offer()]},
    {...header(state,'bad'),shopId:'shelf',offers:[offer(),offer()]},
    {...header(state,'bad'),shopId:'shelf',offers:[offer('x','joker',-1)]},
    {...header(state,'bad'),shopId:'shelf',offers:[offer()],projectedState:state},
    {...header(state,'bad'),shopId:'shelf',offers:[offer()],updatedAt:'not-a-date'},
    {...header(state,'bad'),shopId:'shelf',offers:'not-a-list'}
  ])assert.ok(!setupStore.session.observeJokerOffers(request).ok);
  assert.equal(setupStore.memory.getItem(CONFIRMED_STORAGE_KEY),raw);
});

test('SHOP03a modo estricto y cobertura de más2 ofertas se conservan como errores locales a H2',()=>{
  const {state,session,memory}=setup();
  const saved=success(session.observeJokerOffers({...header(state,'observe'),shopId:'shelf',offers:[offer('a'),offer('b'),offer('c')]}));
  const raw=memory.getItem(CONFIRMED_STORAGE_KEY);
  assert.equal(errorCode(session.confirm({...header(saved.state,'strict'),action:{type:'buy',offerId:'a',instanceId:'new'}},{requireObserved:true})),'pending_rule');
  assert.equal(errorCode(session.confirm({...header(saved.state,'capacity'),action:{type:'buy',offerId:'a',instanceId:'new'}})),'unsupported_shop');
  assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);
});
