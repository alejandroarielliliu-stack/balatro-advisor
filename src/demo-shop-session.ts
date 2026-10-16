import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateShopContext} from './advisor/shop-context.js';
import {parseState} from './state/validation.js';
import type {Fact,GameState,Result} from './state/model.js';
import {analysisBinding,createConfirmedStore,CONFIRMED_STORAGE_KEY} from './storage/confirmed-store.js';
import {createShopSessionStore} from './storage/shop-session.js';
import type {StoragePort} from './storage/state-store.js';

/** Local demonstration only. No browser, external storage or random observations. */
const known=<T>(value:T):Fact<T>=>({status:'known',source:'manual',value});
const ok=<T>(result:Result<T>):T=>{
  if(!result.ok)throw new Error(JSON.stringify(result.errors));return result.value;
};
const value=<T>(fact:Fact<T>):T=>{
  if(fact.status!=='known')throw new Error(fact.reason);return fact.value;
};
const code=(result:Result<unknown>,expected:string)=>{
  assert.equal(result.ok,false);if(result.ok)throw new Error('Se esperaba rechazo.');
  assert.equal(result.errors[0]!.code,expected);return result.errors[0]!.code;
};
class MemoryPort implements StoragePort {
  values=new Map<string,string>();writes=0;
  getItem(key:string){return this.values.get(key)??null;}
  setItem(key:string,data:string){this.values.set(key,data);this.writes++;}
}
const time='2026-10-15T12:00:00Z';
const header=(state:GameState,id:string)=>({confirmationId:id,confirmed:true,expected:analysisBinding(state),updatedAt:time});
const summary=(state:GameState)=>({revision:state.revision,money:value(state.observed.money),
  jokers:value(state.observed.jokers).map(j=>({instanceId:j.instanceId,catalogId:j.catalogId})),
  offers:value(state.observed.shop).cardOffers.map(o=>({offerId:o.offerId,catalogId:o.catalogId,price:value(o.price)}))});

const state=ok(parseState(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8')));
state.observed.money=known(25);
const memory=new MemoryPort();
ok(createConfirmedStore(()=>memory).initialize(state));
const session=createShopSessionStore(()=>memory);
const recorded=ok(session.observeJokerOffers({...header(state,'visible-offers'),shopId:'demo-observed-shop',offers:[{
  offerId:'observed-joker',catalogId:'joker',label:'Joker',kind:'joker',price:known(2),edition:known('base'),stickers:known([])
}]}));

const writesBeforeAdvice=memory.writes,rawBeforeAdvice=memory.getItem(CONFIRMED_STORAGE_KEY);
const advice=evaluateShopContext(recorded.state,{id:'demo-observed-shop',
  jokers:[{offerId:'observed-joker',catalogId:'joker',price:2,edition:'base',stickers:[]}],vouchers:[],packs:[],rerollCost:null},{ante:1});
assert.equal(memory.writes,writesBeforeAdvice);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),rawBeforeAdvice);
const consultationWrites=memory.writes-writesBeforeAdvice;

const request={...header(recorded.state,'performed-buy'),action:{type:'buy' as const,offerId:'observed-joker',instanceId:'acquired-joker'}};
const bought=ok(session.confirm(request));
assert.equal(value(bought.state.observed.money),23);
assert.equal(value(bought.state.observed.jokers).length,1);assert.equal(value(bought.state.observed.shop).cardOffers.length,0);
assert.deepEqual(bought.state.assumptions,state.assumptions);assert.deepEqual(bought.state.observed.deck,state.observed.deck);
const reload=ok(createShopSessionStore(()=>memory).load());assert.deepEqual(reload,bought);
const stale=code(session.confirm({...header(recorded.state,'old-analysis'),action:{type:'hold'}}),'stale_revision');
const duplicate=code(session.confirm(request),'duplicate_confirmation');
const undo=ok(session.undo({...header(bought.state,'undo-record'),targetEntryId:'performed-buy',reason:'Registro equivocado: no compré el comodín.'}));
assert.equal(value(undo.state.observed.money),25);assert.deepEqual(undo.state.observed,recorded.state.observed);

console.log(JSON.stringify({
  demo:'SHOP03a · observación y confirmación separadas',
  consultation:{recommendation:advice.recommendation,storageWrites:consultationWrites},
  before:summary(recorded.state),after:summary(bought.state),reloaded:summary(reload!.state),
  rejections:{oldRecommendation:stale,duplicateConfirmation:duplicate},
  undo:summary(undo.state),
  preserved:{deck:true,savedScenarios:true},
  evidence:'La compra registra una acción confirmada bajo H2. No es una nueva comprobación en Balatro; no se adquieren proyecciones del consejo.'
},null,2));
