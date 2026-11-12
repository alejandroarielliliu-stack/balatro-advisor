import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {parseState} from '../src/state/validation.js';
import {createNewRun} from '../src/run/start.js';
import {applyRunProgress} from '../src/run/progress.js';
import type {RunProgressCommand} from '../src/run/progress.js';
import type {GameStateV02} from '../src/state/model.js';
import type {ShopSnapshot} from '../src/advisor/shop-context.js';
import {normalizeShopSnapshot} from '../src/rules/shop-offer-prices.js';
import {createConfirmedStore,analysisBinding} from '../src/storage/confirmed-store.js';
import {createShopSessionStore} from '../src/storage/shop-session.js';
import {known,MemoryStorage,success} from './helpers.js';

const time='2026-11-12T05:00:00Z';
const start=()=>success(createNewRun({runId:'price-tags',updatedAt:time,deckId:'red',profileConfirmed:true}));
const progress=(state:GameStateV02,command:RunProgressCommand)=>success(applyRunProgress(state,command,{expectedRevision:state.revision,updatedAt:time,inventory:{unchanged:true}})).state;
const queue=(state:GameStateV02)=>{const ctx=state.observed.jokerContext;const tags=ctx?.status==='known'?ctx.value.tags:undefined;return tags?.status==='known'?tags.value:undefined;};
const shelf=(state:GameStateV02):ShopSnapshot=>({id:state.observed.shop.status==='known'?state.observed.shop.value.shopId:'observed-shop',jokers:[],vouchers:[],packs:[],rerollCost:null});
const item=(offerId:string,catalogId='red_card',edition='base'):ShopSnapshot['jokers'][number]=>({offerId,catalogId,edition,stickers:[],price:null});

test('Una oferta antigua mantiene el contrato0.1 sin añadir metadatos de cupón0.2',()=>{
 const state=success(parseState(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8')));
 assert.equal(state.schemaVersion,'0.1');
 const input:ShopSnapshot={id:'legacy',jokers:[item('new','joker')],vouchers:[],packs:[],rerollCost:null};
 const quote=normalizeShopSnapshot(state,input);
 assert.equal(quote.snapshot.jokers[0]!.price,2);assert.equal('couponed'in quote.snapshot.jokers[0]!,false);assert.deepEqual(quote.consumedPricingTags,[]);
});

test('Doble duplica el próximo cupón y solo uno se aplica al entrar en cada tienda',()=>{
 let state=start();
 state=progress(state,{type:'observe_skip_tag',tag:known('tag_double')});state=progress(state,{type:'skip_blind',atNextSelection:true});
 assert.deepEqual(queue(state),['tag_double']);
 state=progress(state,{type:'observe_skip_tag',tag:known('tag_coupon')});state=progress(state,{type:'skip_blind',atNextSelection:true});
 assert.deepEqual(queue(state),['tag_coupon','tag_coupon']);
 state=progress(state,{type:'enter_round'});state=progress(state,{type:'record_cashout',amount:5,jokerUpdates:[]});
 assert.deepEqual(queue(state),['tag_coupon']);
 assert.equal(state.observed.shop.status,'known');
 if(state.observed.shop.status==='known')assert.deepEqual(state.observed.shop.value.pricingTags,['tag_coupon']);
 const input=shelf(state);input.jokers=[item('a'),item('b','joker')];input.vouchers=[{offerId:'v',catalogId:'v_blank',price:null}];input.packs=[{offerId:'p',family:'buffoon',size:'normal',price:null}];
 const before=structuredClone(state),quote=normalizeShopSnapshot(state,input);
 assert.deepEqual(quote.snapshot.jokers.map(item=>item.price),[0,0]);assert.equal(quote.snapshot.packs[0]!.price,0);assert.equal(quote.snapshot.vouchers[0]!.price,10);
 assert.deepEqual(quote.consumedPricingTags,[]);assert.deepEqual(state,before);assert.equal(input.jokers[0]!.price,null);
});

test('rareza y edición consumen una recompensa por oferta; consultar no modifica la cola',()=>{
 let state=progress(start(),{type:'enter_round'});state=progress(state,{type:'record_cashout',amount:5,jokerUpdates:[]});
 state.observed.jokerContext=known({tags:known(['tag_rare','tag_negative'])});
 const input=shelf(state);input.jokers=[item('a','blueprint','negative'),item('b','brainstorm','negative')];
 const before=structuredClone(state),quote=normalizeShopSnapshot(state,input);
 assert.deepEqual(quote.consumedPricingTags,['tag_rare','tag_negative']);assert.deepEqual(quote.pricingTags,[]);
 assert.equal(quote.snapshot.jokers[0]!.price,0);assert.equal(quote.snapshot.jokers[1]!.price,15);assert.deepEqual(state,before);
 const memory=new MemoryStorage();success(createConfirmedStore(()=>memory).initialize(state));const store=createShopSessionStore(()=>memory);
 const saved=success(store.observeJokerOffers({confirmationId:'tagged-offers',confirmed:true,expected:analysisBinding(state),updatedAt:time,shopId:input.id,
  offers:quote.snapshot.jokers.map(offer=>({offerId:offer.offerId,catalogId:offer.catalogId,label:offer.catalogId,kind:'joker',edition:known(offer.edition),stickers:known(offer.stickers),price:known(offer.price!),couponed:offer.couponed!})),pricingTags:quote.pricingTags,consumedPricingTags:quote.consumedPricingTags}));
 assert.equal(saved.state.schemaVersion,'0.2');if(saved.state.schemaVersion!=='0.2')throw Error();
 assert.deepEqual(queue(saved.state),[]);assert.equal(saved.state.revision,state.revision+1);
 const repeated=normalizeShopSnapshot(saved.state,quote.snapshot);assert.deepEqual(repeated.consumedPricingTags,[]);assert.deepEqual(repeated.snapshot,quote.snapshot);
 const undone=success(store.undo({confirmationId:'undo-tags',confirmed:true,expected:analysisBinding(saved.state),updatedAt:time,targetEntryId:'tagged-offers',reason:'Deshacer las ofertas y sus etiquetas.'}));
 assert.equal(undone.state.schemaVersion,'0.2');if(undone.state.schemaVersion==='0.2')assert.deepEqual(queue(undone.state),['tag_rare','tag_negative']);
});

test('cupón guardado sigue gratis, cartas renovadas recuperan precio y la cola mixta conserva etiquetas de precio',()=>{
 let state=progress(start(),{type:'enter_round'});state=progress(state,{type:'record_cashout',amount:5,jokerUpdates:[]});
 const input=shelf(state);input.jokers=[item('old'),item('new')];input.packs=[{offerId:'pack',family:'buffoon',size:'normal',price:null}];
 state.observed.shop=known({shopId:input.id,cardOffers:[{offerId:'old',catalogId:'red_card',label:'Red Card',kind:'joker',edition:known('base'),stickers:known([]),price:known(0),couponed:true}],packOffers:[{offerId:'pack',catalogId:'buffoon-normal',price:known(0),couponed:true}],ignoredOtherOffers:[],pricingTags:[]});
 state.observed.jokerContext=known({tags:known(['tag_coupon'])});
 const quote=normalizeShopSnapshot(state,input);
 assert.deepEqual(quote.snapshot.jokers.map(item=>item.price),[0,5]);assert.equal(quote.snapshot.packs[0]!.price,0);assert.deepEqual(quote.consumedPricingTags,[]);
 let mixed=start();mixed.observed.jokerContext=known({tags:known(['tag_coupon','tag_investment'])});mixed=progress(mixed,{type:'enter_round'});mixed=progress(mixed,{type:'record_cashout',amount:5,jokerUpdates:[]});
 assert.deepEqual(queue(mixed),['tag_investment']);assert.equal(mixed.observed.shop.status,'known');
});
