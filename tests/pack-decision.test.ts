import assert from 'node:assert/strict';
import test from 'node:test';
import {inspectShopDecision,decisionIsCurrent} from '../src/advisor/decision.js';
import type {ShopSnapshot} from '../src/advisor/shop-context.js';
import type {AdvisorScenario} from '../src/advisor/advisor.js';
import {createNewRun} from '../src/run/start.js';
import type {GameStateV02} from '../src/state/model.js';
import {CONFIRMED_STORAGE_KEY,createConfirmedStore} from '../src/storage/confirmed-store.js';
import {known,MemoryStorage,success} from './helpers.js';

const date='2026-10-17T18:00:00Z',unknown={status:'unknown',reason:'No observado.'} as const;
// Prices are literal expectations from the inspected executable's pack definitions.
// Neither the catalogue nor H2 supplies the expected balances or scenario scores.
const packs=[['buffoon-normal','buffoon','normal',4],['buffoon-jumbo','buffoon','jumbo',6],['buffoon-mega','buffoon','mega',8],['celestial-normal','celestial','normal',4],['celestial-jumbo','celestial','jumbo',6],['celestial-mega','celestial','mega',8]] as const;
function fixture():GameStateV02{
 const state:GameStateV02={...success(createNewRun({runId:'pack-decisions',updatedAt:date,deckId:'blue',profileConfirmed:true})),phase:'shop',phaseData:{origin:known({ante:1,kind:'small'})}};
 state.observed.money=known(40);
 state.observed.nextBlind=known({ante:1,kind:'big',bossId:known('none'),target:known(450),reward:known(4)});
 state.observed.shop=known({shopId:'recorded-shop',cardOffers:[{offerId:'joker',catalogId:'joker',label:'Joker',kind:'joker',price:known(2),edition:known('base'),stickers:known([])},{offerId:'half',catalogId:'half_joker',label:'Half Joker',kind:'joker',price:known(5),edition:known('base'),stickers:known([])}],ignoredOtherOffers:[],packOffers:packs.map(([catalogId,,,price])=>({offerId:catalogId,catalogId,price:known(price)}))});
 return state;
}
const shelf=(state:GameStateV02)=>{assert.ok(state.observed.shop.status==='known');return state.observed.shop.value;};
const snapshot=(state:GameStateV02):ShopSnapshot=>({id:shelf(state).shopId,jokers:shelf(state).cardOffers.map(offer=>({offerId:offer.offerId,catalogId:offer.catalogId,price:offer.price.status==='known'?offer.price.value:null,edition:'base',stickers:[]})),vouchers:[],packs:packs.map(([catalogId,family,size])=>{const offer=shelf(state).packOffers?.find(o=>o.offerId===catalogId);return {offerId:catalogId,family,size,price:offer?.price.status==='known'?offer.price.value:null};}),rerollCost:null});
const hypothetical=(cardId:string)=>({cardId,knowledge:'hypothetical' as const,basis:'Plan fijo de prueba; no predice el robo.'});
const scenarios=():AdvisorScenario[]=>[{role:'representative',plan:{schemaVersion:'scenario-1',planId:'pair-eight',description:'Pareja fija de ochos',initialHand:['8S','8H','2S','3S','4H','5D','6C','7D'].map(hypothetical),events:[{type:'play',cardIds:['8S','8H'],drawIfContinues:['9S','9H'].map(hypothetical)}],assumptions:{noMoneyChangesDuringRound:true}}}];

test('SHOP02b DEC00 seis aperturas independientes4/6/8; solo saldo cambia y consultar no registra contenidos ni adquisiciones',()=>{
 const state=fixture(),shop=snapshot(state),original=structuredClone({state,shop}),memory=new MemoryStorage();success(createConfirmedStore(()=>memory).initialize(state));const raw=memory.getItem(CONFIRMED_STORAGE_KEY),writes=memory.writes;
 const result=success(inspectShopDecision(state,shop));
 assert.deepEqual(result.packActions.map(a=>a.moneyAfter),[36,34,32,36,34,32]);assert.deepEqual(result.packActions.map(a=>a.action),packs.map(([offerId])=>({type:'buy_pack',offerId})));
 assert.ok(result.packActions.every(a=>a.status==='provisional'&&a.confirmation==='explicit_confirmation_required'));
 for(const [index,action]of result.packActions.entries()){
  const cost=[4,6,8,4,6,8][index]!;assert.deepEqual(action.consequences!.money,{before:40,after:40-cost,delta:-cost});
  assert.ok(action.consequences!.resources.every(r=>r.change.delta===0));assert.deepEqual(action.consequences!.occupiedJokerSlots,{before:0,after:0,delta:0});assert.deepEqual(action.consequences!.freeJokerSlots,{before:5,after:5,delta:0});
  assert.deepEqual(action.consequences!.added,[]);assert.deepEqual(action.consequences!.removed,[]);assert.deepEqual(action.consequences!.counters,[]);assert.equal(action.evidence!.verifiedAgainstGame,false);
 }
 assert.deepEqual(result.actions.map(a=>a.moneyAfter),[40,38,35]);assert.equal(result.hand,null);assert.equal(result.scenarios,null);assert.equal(result.exhaustive,false);assert.equal(result.projected,true);
 assert.ok(result.limitations.some(l=>l.includes('contenido desconocido')));assert.deepEqual({state,shop},original);assert.equal(memory.writes,writes);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);
});

test('SHOP02b DEC00 null de precio coincide con unknown guardado y pregunta sin falso unrecorded_offer',()=>{
 const state=fixture();shelf(state).packOffers![0]!.price=unknown;const shop=snapshot(state),result=success(inspectShopDecision(state,shop)),missing=result.packActions[0]!;
 assert.equal(shop.packs[0]!.price,null);assert.equal(missing.status,'missing_data');assert.equal(missing.errors[0]!.code,'unknown_data');assert.equal(missing.moneyAfter,null);assert.equal(missing.consequences,null);assert.equal(missing.confirmation,'unavailable');
 assert.ok(result.questions.some(q=>q.operationIds.includes('pack:buffoon-normal')&&q.path.includes('price')));assert.equal(result.packActions[1]!.moneyAfter,34);assert.ok(result.actions.every(a=>a.status==='provisional'));
 const noMoney=fixture();noMoney.observed.money=unknown;const unknownBalance=success(inspectShopDecision(noMoney,snapshot(noMoney)));
 assert.ok(unknownBalance.packActions.every(a=>a.status==='missing_data'&&a.moneyAfter===null));assert.ok(unknownBalance.questions.some(q=>q.path==='$.observed.money'&&q.operationIds.includes('pack:celestial-mega')));
});

test('SHOP02b DEC00 identidad, ID, tamaño o precio distintos limitan solo la oferta no registrada',()=>{
 for(const patch of [{offerId:'unregistered'},{family:'celestial' as const},{size:'mega' as const},{price:3}]){
  const state=fixture(),shop=snapshot(state);Object.assign(shop.packs[0]!,patch);const original=structuredClone({state,shop}),result=success(inspectShopDecision(state,shop,{scenarios:scenarios()})),changed=result.packActions[0]!;
  assert.equal(changed.status,'missing_data');assert.equal(changed.errors[0]!.code,'unrecorded_offer');assert.equal(changed.confirmation,'unavailable');assert.equal(changed.consequences,null);assert.equal(changed.moneyAfter,null);
  assert.ok(result.packActions.slice(1).every(a=>a.status==='provisional'));assert.ok(result.actions.every(a=>a.status==='provisional'));assert.ok(result.scenarios?.ok,JSON.stringify(result.scenarios));assert.deepEqual({state,shop},original);
 }
});

test('SHOP02b DEC00 una tienda diferente no puede aplicar ofertas con iguales IDs y precios',()=>{
 const state=fixture(),shop=snapshot(state);shop.id='another-shop';const result=success(inspectShopDecision(state,shop));
 assert.ok(result.packActions.every(a=>a.errors[0]!.code==='unrecorded_offer'&&a.confirmation==='unavailable'&&a.moneyAfter===null));assert.equal(result.actions[0]!.status,'provisional');
});

test('SHOP02b DEC00 modo estricto conserva límites de evidencia sin resultados calculados de compra',()=>{
 const state=fixture(),result=success(inspectShopDecision(state,snapshot(state),{requireObserved:true}));
 assert.ok(result.packActions.every(a=>a.status==='pending_evidence'&&a.errors[0]!.code==='pending_rule'&&a.confirmation==='unavailable'&&a.moneyAfter===null&&a.consequences===null));
 assert.ok(result.packActions.every(a=>a.evidence?.verifiedAgainstGame===false));assert.ok(result.actions.every(a=>a.status==='pending_evidence'));
});

test('SHOP02b DEC00 otro pack, descuento e insuficiencia son limitaciones locales y no bloquean compras de comodines',()=>{
 const unsupported=fixture(),unsupportedShop=snapshot(unsupported);shelf(unsupported).packOffers![0]!.catalogId='spectral-normal';unsupportedShop.packs[0]!.family='spectral';
 const discounted=fixture(),discountedShop=snapshot(discounted);shelf(discounted).packOffers![0]!.price=known(3);discountedShop.packs[0]!.price=3;
 const poor=fixture();poor.observed.money=known(5);
 for(const [state,shop,index,error]of [[unsupported,unsupportedShop,0,'unsupported_pack'],[discounted,discountedShop,0,'unsupported_price'],[poor,snapshot(poor),1,'insufficient_money']] as const){
  const original=structuredClone({state,shop}),result=success(inspectShopDecision(state,shop)),action=result.packActions[index]!;
  assert.equal(action.errors[0]!.code,error);assert.equal(action.confirmation,'unavailable');assert.equal(action.moneyAfter,null);assert.equal(action.consequences,null);assert.ok(result.actions.every(a=>a.status==='provisional'),error);assert.deepEqual({state,shop},original);
 }
});

test('SHOP02b DEC00 Astronomer físico hace Celestial gratis; Buffoon mantiene4/6/8 y no se cobra ingreso futuro',()=>{
 const state=fixture();state.observed.jokers=known([{instanceId:'astronomer-owned',catalogId:'astronomer',edition:known('base'),stickers:known([]),sellValue:known(4),counters:{}}]);
 for(const offer of shelf(state).packOffers!)if(offer.catalogId.startsWith('celestial-'))offer.price=known(0);
 const result=success(inspectShopDecision(state,snapshot(state)));
 assert.deepEqual(result.packActions.map(a=>a.moneyAfter),[36,34,32,40,40,40]);assert.ok(result.packActions.every(a=>a.status==='provisional'));
 for(const action of result.packActions.slice(3)){assert.deepEqual(action.consequences!.money,{before:40,after:40,delta:0});assert.deepEqual(action.consequences!.added,[]);assert.deepEqual(action.consequences!.counters,[]);}
});

test('SHOP02b DEC00 apertura cerrada no entra en ranking H3 ni mejora puntuación de planes con cartas desconocidas',()=>{
 const state=fixture(),shop=snapshot(state),plans=scenarios(),original=structuredClone({state,shop,plans}),result=success(inspectShopDecision(state,shop,{scenarios:plans}));
 assert.equal(result.packActions.length,6);assert.ok(result.scenarios?.ok,JSON.stringify(result.scenarios));if(!result.scenarios?.ok)return;
 assert.deepEqual(result.scenarios.value.alternatives.map(a=>a.action.type),['hold','buy','buy']);assert.deepEqual(result.scenarios.value.alternatives.map(a=>a.scenarios[0]!.metrics!.score),[52,156,572]);assert.deepEqual(result.scenarios.value.alternatives.map(a=>a.scenarios[0]!.metrics!.moneyAfterShop),[40,38,35]);
 assert.deepEqual(result.scenarioConsequences.alternatives.map(a=>a.action.type),['hold','buy','buy']);assert.ok(result.limitations.some(l=>l.includes('sobres')&&l.includes('H3')));assert.deepEqual({state,shop,plans},original);
});

test('SHOP02b DEC00 vigencia observa sobres guardados, temporales y desconocidos aunque la revisión no cambie',()=>{
 const state=fixture(),shop=snapshot(state),result=success(inspectShopDecision(state,shop));assert.equal(decisionIsCurrent(result,state,shop),true);
 const changed=structuredClone(state);shelf(changed).packOffers![0]!.price=known(3);assert.equal(changed.revision,state.revision);assert.equal(decisionIsCurrent(result,changed,shop),false);
 const changedShop=structuredClone(shop);changedShop.packs[0]!.price=3;assert.equal(decisionIsCurrent(result,state,changedShop),false);
 changedShop.packs=shop.packs.slice(1);assert.equal(decisionIsCurrent(result,state,changedShop),false);
 const unknownContents=structuredClone(state);shelf(unknownContents).packOffers![0]!.price=unknown;assert.equal(decisionIsCurrent(result,unknownContents,shop),false);
});
