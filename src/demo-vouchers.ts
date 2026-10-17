import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectShopDecision,decisionIsCurrent} from './advisor/decision.js';
import type {ShopSnapshot} from './advisor/shop-context.js';
import {parseState} from './state/validation.js';
import type {Fact,GameState,GameStateV02,Result} from './state/model.js';
import {analysisBinding,createConfirmedStore,CONFIRMED_STORAGE_KEY} from './storage/confirmed-store.js';
import {createShopSessionStore} from './storage/shop-session.js';
import type {StoragePort} from './storage/state-store.js';

const known=<T>(value:T):Fact<T>=>({status:'known',source:'manual',value});
const ok=<T>(result:Result<T>):T=>{if(!result.ok)throw new Error(JSON.stringify(result.errors));return result.value;};
const value=<T>(fact:Fact<T>):T=>{if(fact.status!=='known')throw new Error(fact.reason);return fact.value;};
const time='2026-10-17T15:00:00Z';
const header=(state:GameState,id:string)=>({confirmationId:id,confirmed:true,expected:analysisBinding(state),updatedAt:time});
class MemoryPort implements StoragePort {
 readonly values=new Map<string,string>();writes=0;
 getItem(key:string){return this.values.get(key)??null;}
 setItem(key:string,data:string){this.values.set(key,data);this.writes++;}
}
const summary=(state:GameState)=>({revision:state.revision,money:value(state.observed.money),handsPerRound:value(state.observed.resources.handsPerRound),
 acquiredVouchers:value(state.observed.outOfScope).vouchers,
 voucherOffers:state.schemaVersion==='0.2'?value(state.observed.shop).voucherOffers??[]:[]});

// Adapt a literal example explicitly; loading a real0.1 record never migrates it.
const legacy=ok(parseState(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8')));
if(legacy.schemaVersion!=='0.1')throw new Error('El ejemplo debe conservar su formato0.1.');
const state:GameStateV02={...legacy,schemaVersion:'0.2',phase:'shop',phaseData:{origin:{status:'unknown',reason:'Ejemplo sintético: no se observó la ciega anterior.'}}};
state.observed.money=known(40);
state.observed.resources.handsPerRound=known(5);
const memory=new MemoryPort(),store=createConfirmedStore(()=>memory);
ok(store.initialize(state));
const session=createShopSessionStore(()=>memory),cards=value(state.observed.shop).cardOffers;
const observed=ok(session.observeJokerOffers({...header(state,'observe-grabber'),shopId:'voucher-demo-shop',offers:cards,
 voucherOffers:[{offerId:'grabber',catalogId:'v_grabber',price:known(10)}]}));
if(observed.state.schemaVersion!=='0.2')throw new Error('Se requiere el registro0.2 del ejemplo.');
const shop=value(observed.state.observed.shop);
const snapshot:ShopSnapshot={id:shop.shopId,jokers:shop.cardOffers.map(offer=>({offerId:offer.offerId,catalogId:offer.catalogId,
 price:offer.price.status==='known'?offer.price.value:null,edition:value(offer.edition),stickers:value(offer.stickers)})),
 vouchers:[{offerId:'grabber',catalogId:'v_grabber',price:10}],packs:[],rerollCost:null};
const before=structuredClone({state:observed.state,snapshot}),raw=memory.getItem(CONFIRMED_STORAGE_KEY),writes=memory.writes;
const decision=ok(inspectShopDecision(observed.state,snapshot)),probe=decision.voucherActions[0]!;
assert.equal(probe.status,'provisional');assert.equal(probe.moneyAfter,30);
assert.deepEqual(probe.consequences!.resources.find(resource=>resource.field==='handsPerRound')!.change,{before:5,after:6,delta:1});
assert.equal(probe.confirmation,'explicit_confirmation_required');
assert.equal(decisionIsCurrent(decision,observed.state,snapshot),true);
assert.deepEqual({state:observed.state,snapshot},before);assert.equal(memory.writes,writes);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);

const bought=ok(session.confirm({...header(observed.state,'performed-grabber'),action:{type:'buy_voucher',offerId:'grabber'},
 observedAfter:{money:30,jokerIds:[],offerIds:cards.map(offer=>offer.offerId),voucherOfferIds:[],voucherIds:['v_grabber']}}));
assert.equal(value(bought.state.observed.money),30);assert.equal(value(bought.state.observed.resources.handsPerRound),6);
assert.deepEqual(value(bought.state.observed.outOfScope).vouchers,['v_grabber']);
assert.deepEqual(value(bought.state.observed.shop).cardOffers,cards);assert.deepEqual(bought.state.assumptions,state.assumptions);
assert.equal(decisionIsCurrent(decision,bought.state,snapshot),false);
const reloaded=ok(createShopSessionStore(()=>memory).load());assert.deepEqual(reloaded,bought);
const undone=ok(session.undo({...header(bought.state,'undo-grabber'),targetEntryId:'performed-grabber',reason:'Corrección del ejemplo: no compré el vale.'}));
assert.equal(value(undone.state.observed.money),40);assert.equal(value(undone.state.observed.resources.handsPerRound),5);
assert.deepEqual(undone.state.observed,observed.state.observed);assert.deepEqual(ok(createConfirmedStore(()=>memory).load()),undone);

console.log(JSON.stringify({demo:'SHOP02a · oferta y compra confirmada de Grabber',before:summary(observed.state),
 consultation:{status:probe.status,moneyAfter:probe.moneyAfter,consequences:probe.consequences,confirmation:probe.confirmation,storageWrites:0,inputsUnchanged:true},
 confirmed:summary(bought.state),reloaded:summary(reloaded!.state),undo:summary(undone.state),
 history:undone.history.map(entry=>({id:entry.id,kind:entry.kind,action:entry.action})),
 evidence:'Ejemplo sintético. Consultar conserva el registro; confirmar guarda una acción declarada bajo reglas provisionales. No acredita observación nueva en Balatro ni ranking de vales en H3.'
},null,2));
