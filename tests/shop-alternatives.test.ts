import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import type {GameState} from '../src/state/model.js';
import type {ShopSnapshot} from '../src/advisor/shop-context.js';
import {inspectShopAlternatives,shopAlternativeId,shopAlternativesAreCurrent} from '../src/advisor/shop-alternatives.js';
import {known,success} from './helpers.js';
import {MemoryStorage} from './helpers.js';
import {migrateState} from '../src/state/migration.js';
import {CONFIRMED_STORAGE_KEY,createConfirmedStore} from '../src/storage/confirmed-store.js';

const unknown={status:'unknown' as const,reason:'No transcrito.'};
const fixture=():GameState=>{const state=JSON.parse(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8')) as GameState;
 // This unit fixture explicitly contains only its two Joker offers. Legacy
 // ignored offers are covered separately rather than silently assumed absent.
 if(state.observed.shop.status==='known')state.observed.shop.value.ignoredOtherOffers=[];return state;};
function snapshot(state:GameState):ShopSnapshot {
 assert.equal(state.observed.shop.status,'known');if(state.observed.shop.status!=='known')throw Error('fixture');
 return {id:state.observed.shop.value.shopId,jokers:state.observed.shop.value.cardOffers.map(o=>({offerId:o.offerId,catalogId:o.catalogId,price:o.price.status==='known'?o.price.value:null,edition:'base',stickers:[]})),vouchers:[],packs:[],rerollCost:null};
}
function owned(state:GameState){
 state.observed.jokers=known([{instanceId:'growth',catalogId:'green_joker',edition:known('base'),stickers:known([]),sellValue:known(2),counters:{greenMult:known(7)}},
  {instanceId:'plain',catalogId:'joker',edition:known('base'),stickers:known([]),sellValue:known(1),counters:{}}]);
 return state;
}

test('DEC03a acciones individuales coexisten con IDs propios y aritmética literal independiente',()=>{
 const state=owned(fixture()),shop=snapshot(state),before=structuredClone({state,shop}),report=success(inspectShopAlternatives(state,shop));
 assert.equal(report.alternatives.length,9);assert.equal(new Set(report.alternatives.map(a=>a.id)).size,9);assert.equal(report.coverage.completeSingleActionSet,true);
 const row=(id:string)=>{const r=report.alternatives.find(a=>a.id===id);assert.ok(r,id);return r;};
 // Literal fixture: $7, Joker $2, Half $5; observed resale Green $2/Joker $1.
 assert.deepEqual([row('hold').moneyAfter,row('buy:o1').moneyAfter,row('sell:growth').moneyAfter,row('replace:o1:growth').moneyAfter,row('replace:o2:plain').moneyAfter],[7,5,9,7,3]);
 assert.deepEqual([row('hold').netCost,row('buy:o1').netCost,row('sell:growth').netCost,row('replace:o1:growth').netCost,row('replace:o2:plain').netCost],[0,2,-2,0,4]);
 assert.equal(row('replace:o1:growth').offerId,'o1');assert.equal(row('buy:o1').offerId,'o1');
 const sacrificedCounter=row('sell:growth').removed[0]!.counters.greenMult!;assert.equal(sacrificedCounter.status,'known');
 if(sacrificedCounter.status==='known')assert.equal(sacrificedCounter.value,7);
 assert.deepEqual({state,shop},before);assert.equal(report.projected,true);assert.equal(report.exhaustive,false);
 assert.ok(report.alternatives.every(a=>a.status==='provisional'));
});

test('DEC03a inventario lleno conserva compra ilegal y reemplazos legales independientes',()=>{
 const state=owned(fixture());if(state.observed.jokers.status==='known')state.observed.jokers.value.push(...['banner','half_joker','scholar'].map((catalogId,i)=>({instanceId:'extra-'+i,catalogId,edition:known('base'),stickers:known([]),sellValue:known(1),counters:{}})));
 const report=success(inspectShopAlternatives(state,snapshot(state)));
 const buy=report.alternatives.find(a=>a.id==='buy:o1')!,replace=report.alternatives.find(a=>a.id==='replace:o1:plain')!;
 assert.equal(buy.status,'illegal');assert.equal(buy.errors[0]!.code,'no_slots');assert.equal(buy.moneyAfter,null);assert.equal(replace.status,'provisional');assert.equal(replace.moneyAfter,6);
 assert.equal(replace.consequences!.occupiedJokerSlots.after,5);assert.equal(replace.consequences!.added[0]!.catalogId,'joker');
});

test('DEC03a Eternos y precio desconocido limitan solo las alternativas afectadas',()=>{
 const state=owned(fixture());if(state.observed.jokers.status==='known')state.observed.jokers.value[0]!.stickers=known(['eternal']);
 if(state.observed.shop.status==='known')state.observed.shop.value.cardOffers[0]!.price=unknown;
 const report=success(inspectShopAlternatives(state,snapshot(state))),find=(id:string)=>report.alternatives.find(a=>a.id===id)!;
 assert.equal(find('sell:growth').status,'illegal');assert.equal(find('sell:growth').errors[0]!.code,'eternal_joker');
 assert.equal(find('replace:o2:growth').status,'illegal');assert.equal(find('buy:o1').status,'missing_data');assert.equal(find('buy:o1').moneyAfter,null);assert.equal(find('buy:o1').netCost,null);
 assert.equal(find('buy:o2').moneyAfter,2);assert.equal(find('sell:plain').moneyAfter,8);assert.equal(find('hold').moneyAfter,7);
});

test('DEC03a compra aislada y reemplazo tienen fichas diferentes sin heredar la selección',()=>{
 const state=owned(fixture()),shop=snapshot(state);shop.jokers[0]!.replacementId='growth';
 const report=success(inspectShopAlternatives(state,shop)),buy=report.alternatives.find(a=>a.id==='buy:o1')!,replacement=report.alternatives.find(a=>a.id==='replace:o1:growth')!;
 assert.equal(buy.contextOption?.fit?.purchase.netCost,2);assert.equal(replacement.contextOption?.fit?.purchase.netCost,0);
 assert.equal(buy.removed.length,0);assert.equal(replacement.removed[0]!.instanceId,'growth');assert.equal(shop.jokers[0]!.replacementId,'growth');
 assert.ok(replacement.contextOption?.findings?.some(f=>f.message.includes('greenMult=7')));
 assert.ok(report.limitations.some(l=>l.includes('no clasifica automáticamente')));
});

test('DEC03a la evidencia estricta sigue bloqueando todas las transacciones',()=>{
 const state=owned(fixture()),report=success(inspectShopAlternatives(state,snapshot(state),{requireObserved:true}));
 assert.equal(report.alternatives.length,9);assert.ok(report.alternatives.every(a=>a.status==='pending_evidence'&&a.confirmation==='unavailable'&&a.moneyAfter===null));
 assert.ok(report.alternatives.every(a=>a.evidence?.verifiedAgainstGame===false));
});

test('DEC03a inventario desconocido conserva conjunto parcial sin inventar ventas',()=>{
 const state=fixture();state.observed.jokers=unknown;const report=success(inspectShopAlternatives(state,snapshot(state)));
 assert.deepEqual(report.alternatives.map(a=>a.kind),['hold','buy','buy']);assert.equal(report.coverage.completeSingleActionSet,false);assert.ok(report.limitations.some(l=>l.includes('Inventario desconocido')));
});

test('DEC03a IDs con separadores no colisionan y la vigencia incluye datos y opciones',()=>{
 assert.notEqual(shopAlternativeId({type:'replace',offerId:'a:b',sellInstanceId:'c',instanceId:'new'}),shopAlternativeId({type:'replace',offerId:'a',sellInstanceId:'b:c',instanceId:'new'}));
 const state=owned(fixture()),shop=snapshot(state),report=success(inspectShopAlternatives(state,shop));assert.equal(shopAlternativesAreCurrent(report,state,shop),true);
 const changed=structuredClone(state);changed.observed.money=known(8);assert.equal(shopAlternativesAreCurrent(report,changed,shop),false);assert.equal(shopAlternativesAreCurrent(report,state,shop,{requireObserved:true}),false);
 const different=structuredClone(shop);different.jokers[0]!.price=1;assert.equal(shopAlternativesAreCurrent(report,state,different),false);
});

test('DEC03a límite explícito sin recorte y opciones inválidas producen errores claros',()=>{
 const state=owned(fixture()),shop=snapshot(state);shop.jokers=Array.from({length:17},(_,i)=>({...shop.jokers[0]!,offerId:'o'+i}));
 const tooMany=inspectShopAlternatives(state,shop);assert.equal(tooMany.ok,false);if(!tooMany.ok){assert.equal(tooMany.errors[0]!.code,'too_many_alternatives');assert.match(tooMany.errors[0]!.message,/54.*50/);}
 assert.equal(inspectShopAlternatives(state,snapshot(state),{requireObserved:'false'} as never).ok,false);
 assert.equal(inspectShopAlternatives(state,snapshot(state),{extra:true} as never).ok,false);
 assert.equal(inspectShopAlternatives({schemaVersion:'invented'},snapshot(state)).ok,false);
});

test('DEC03a vales y sobres conservan sus cálculos existentes sin predecir contenido',()=>{
 const state=success(migrateState(fixture()));state.observed.money=known(40);
 if(state.observed.shop.status!=='known')throw Error('fixture');
 state.observed.shop.value.voucherOffers=[{offerId:'grabber',catalogId:'v_grabber',price:known(10)}];
 state.observed.shop.value.packOffers=[{offerId:'buffoon',catalogId:'buffoon-normal',price:known(4)}];
 const shop=snapshot(state);shop.vouchers=[{offerId:'grabber',catalogId:'v_grabber',price:10}];shop.packs=[{offerId:'buffoon',family:'buffoon',size:'normal',price:4}];
 const before=structuredClone(state),report=success(inspectShopAlternatives(state,shop));
 const voucher=report.alternatives.find(a=>a.id==='voucher:grabber')!,pack=report.alternatives.find(a=>a.id==='pack:buffoon')!;
 // Inspected base prices, independent of the adapter: $40−$10 and $40−$4.
 assert.equal(voucher.kind,'buy_voucher');assert.equal(voucher.moneyAfter,30);assert.equal(voucher.netCost,10);
 assert.equal(voucher.consequences!.resources.find(r=>r.field==='handsPerRound')!.change.delta,1);
 assert.equal(pack.kind,'buy_pack');assert.equal(pack.moneyAfter,36);assert.equal(pack.netCost,4);assert.deepEqual(pack.consequences!.added,[]);
 assert.deepEqual(state,before);assert.ok(report.limitations.some(l=>l.includes('contenido desconocido')));
});

test('DEC03a consultar nunca escribe y los resultados de ramas no comparten inventarios',()=>{
 const state=owned(fixture()),shop=snapshot(state),memory=new MemoryStorage();success(createConfirmedStore(()=>memory).initialize(state));
 const original=memory.getItem(CONFIRMED_STORAGE_KEY),writes=memory.writes,report=success(inspectShopAlternatives(state,shop));
 const sale=report.alternatives.find(a=>a.id==='sell:growth')!,replacement=report.alternatives.find(a=>a.id==='replace:o1:growth')!;
 sale.removed[0]!.counters.greenMult=known(99);assert.deepEqual(replacement.removed[0]!.counters.greenMult,known(7));
 if(state.observed.jokers.status==='known')assert.deepEqual(state.observed.jokers.value[0]!.counters.greenMult,known(7));
 assert.equal(memory.writes,writes);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),original);
});

test('DEC03a una oferta sin acción integrada se declara fuera del conjunto',()=>{
 const state=fixture(),shop=snapshot(state);shop.others=[{offerId:'fool',kind:'tarot',name:'The Fool',price:3}];
 const report=success(inspectShopAlternatives(state,shop));assert.deepEqual(report.coverage.excludedOfferIds,['fool']);assert.equal(report.coverage.completeSingleActionSet,false);
 assert.ok(report.limitations.some(l=>l.includes('fool')));assert.ok(report.baseDecision.context.options.some(o=>o.id==='fool'));
});

test('DEC03a las ofertas omitidas por el formato antiguo no desaparecen del alcance',()=>{
 const state=fixture();if(state.observed.shop.status==='known')state.observed.shop.value.ignoredOtherOffers=['Un vale sin transcribir'];
 const report=success(inspectShopAlternatives(state,snapshot(state)));assert.equal(report.coverage.completeSingleActionSet,false);assert.equal(report.coverage.excludedOfferIds.length,1);
 assert.ok(report.baseDecision.context.options.some(o=>o.kind==='other'));
});
