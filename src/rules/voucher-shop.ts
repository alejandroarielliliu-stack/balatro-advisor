import {VOUCHER_CATALOG} from '../catalog/voucher-catalog.js';
import {supportsVoucher,voucherResources,VOUCHER_EFFECTS} from '../catalog/vouchers.js';
import {jokerResourceDelta} from '../catalog/joker-resources.js';
import {checkJsonValue,isObject} from '../state/schema.js';
import {validateState} from '../state/validation.js';
import type {JokerInstance} from '../state/model.js';
import {bankBalance,creditLimit} from './economic-jokers.js';
import {historyResourceDelta} from './history-jokers.js';
import {fail,guardPendingTags,inventory,need,run,safe,stateInput,valueFact} from './core.js';
import type {EngineOptions,EngineResult} from './core.js';
import type {Mutation,ShopChange} from './shop.js';

export interface VoucherPurchaseAction {type:'buy_voucher';offerId:string}
export type VoucherPurchaseChange=Omit<ShopChange,'occupiedSlots'|'freeSlots'> & {occupiedSlots:number|null;freeSlots:number|null};

/** Redeem one observed offer. Purchase projections never create a new observation. */
export function applyVoucherPurchase(input:unknown,action:VoucherPurchaseAction,mutation:Mutation,options:EngineOptions={}):EngineResult<VoucherPurchaseChange>{
 return run<VoucherPurchaseChange>(['shop.actions','vouchers.purchase','base.configuration'],options,(trace,use)=>{
  const state=stateInput(input,use);
  if(state.schemaVersion!=='0.2')fail('$.schemaVersion','unsupported_schema','Comprar vales requiere el formato 0.2; migra la partida explícitamente.');
  const errors=checkJsonValue(action);
  if(errors.length){const error=errors[0]!;fail('$action'+error.path.slice(1),error.code,error.message);}
  if(!isObject(action)||action.type!=='buy_voucher'||typeof action.offerId!=='string'||!action.offerId.trim()||action.offerId.length>200||Object.keys(action).some(key=>key!=='type'&&key!=='offerId')){
   fail('$action','invalid_action','La compra necesita type buy_voucher y un offerId no vacío.');
  }
  if(!mutation||mutation.expectedRevision!==state.revision)fail('$.revision','stale_revision','Revisión obsoleta; vuelve a cargar la partida.');

  const shop=need(state.observed.shop,'$.observed.shop');
  const offers=shop.voucherOffers??[],index=offers.findIndex(offer=>offer.offerId===action.offerId);
  if(index<0)fail('$action.offerId','missing_offer','La oferta de vale ya no existe.');
  const offer=offers[index]!,definition=VOUCHER_CATALOG.find(voucher=>voucher.id===offer.catalogId);
  if(!definition||!supportsVoucher(offer.catalogId))fail('$action.offerId','unsupported_voucher',`Vale sin compra implementada: ${offer.catalogId}.`);
  const owned=need(state.observed.outOfScope,'$.observed.outOfScope').vouchers;
  if(owned.includes(offer.catalogId))fail('$action.offerId','voucher_already_owned','El vale ya está adquirido; las compras repetidas de Blank del pool global agotado quedan fuera de este primer lote.');
  if(!definition.requires.every(id=>owned.includes(id)))fail('$action.offerId','missing_prerequisite','Adquiere primero el vale requerido por el catálogo.');

  const price=need(offer.price,`$.observed.shop.voucherOffers.${offer.offerId}.price`);
  use('shop.prices');
  if(price!==10)fail('$action.offerId','unsupported_price','Solo se admite el precio base de $10; no se reemplaza el precio observado.');
  const before=bankBalance(need(state.observed.money,'$.observed.money')),after=bankBalance(before-price);
  const effect=VOUCHER_EFFECTS[offer.catalogId]!;
  const roundField=effect.hands?'handsPerRound':effect.discards?'discardsPerRound':effect.handSize?'handSize':undefined;
  let jokers:JokerInstance[]|undefined;
  if(state.observed.jokers.status==='known'||roundField||effect.jokerSlots||after<0){
   const physical=need(state.observed.jokers,'$.observed.jokers');
   if(effect.jokerSlots)need(state.observed.resources.jokerSlots,'$.observed.resources.jokerSlots');
   if(state.observed.resources.jokerSlots.status==='known')jokers=inventory(state);
   else{
    const expected=voucherResources(need(state.observed.deckId,'$.observed.deckId'),owned).jokerSlots+physical.filter(joker=>need(joker.edition,'$.jokers.edition')==='negative').length;
    // This derived capacity is used only to validate physical compatibility.
    // The unknown observed capacity stays unknown in the returned projection.
    jokers=inventory({...state,observed:{...state.observed,resources:{...state.observed.resources,jokerSlots:valueFact(expected)}}});
   }
  }
  const credit=after<0?creditLimit(state):0;
  if(after < -credit)fail('$action','insufficient_money',`Dinero insuficiente: ${before}, precio ${price}.`);
  if(after<0&&credit>0)use('jokers.economy');

  let roundBefore=0;
  // Check only the changed persistent total. Grabber does not need Turtle Bean's
  // hand-size counter, and interest/Blank do not depend on round resources.
  if(roundField){
   guardPendingTags(state,'resources');
   const base=voucherResources(need(state.observed.deckId,'$.observed.deckId'),owned);
   const delta=jokerResourceDelta(jokers!.map(joker=>joker.catalogId));
   const expected=roundField==='handsPerRound'?base.hands+delta.hands:roundField==='discardsPerRound'?base.discards+delta.discards:base.handSize+delta.handSize+historyResourceDelta(jokers!).handSize;
   roundBefore=need(state.observed.resources[roundField],'$.observed.resources.'+roundField);
   if(roundBefore!==expected)fail('$.observed.resources.'+roundField,'unsupported_resources',`El total previo debe coincidir con H2: ${expected}.`);
   if(roundField==='handSize'&&jokers!.some(joker=>joker.catalogId==='turtle_bean'))use('jokers.history');
  }
  if(effect.jokerSlots||roundField)use('vouchers.resources');
  if(offer.catalogId==='v_seed_money'||offer.catalogId==='v_money_tree')use('vouchers.interest');

  owned.push(offer.catalogId);
  if(roundField)state.observed.resources[roundField]=valueFact(safe(roundBefore+1));
  else if(effect.jokerSlots){
   // inventory already verified the old deck/voucher/negative-edition total.
   // Changing capacity alone must not require Turtle Bean's hand-size counter.
   state.observed.resources.jokerSlots=valueFact(safe(need(state.observed.resources.jokerSlots,'$.observed.resources.jokerSlots')+effect.jokerSlots));
  }
  offers.splice(index,1);
  state.observed.money=valueFact(after);
  state.revision=safe(state.revision+1,'$.revision');
  state.updatedAt=mutation.updatedAt;
  const valid=validateState(state);
  if(!valid.ok){const error=valid.errors[0]!;fail(error.path,error.code,error.message);}
  const occupiedSlots=jokers?.length??null;
  const freeSlots=jokers&&state.observed.resources.jokerSlots.status==='known'?state.observed.resources.jokerSlots.value-jokers.length:null;
  trace.push({ruleId:'vouchers.purchase',label:'Compra de vale',values:{offerId:offer.offerId,catalogId:offer.catalogId,before,spent:price,after,occupied:occupiedSlots??'unknown',free:freeSlots??'unknown'}});
  return {state:valid.value,occupiedSlots,freeSlots,steps:[structuredClone(valid.value)]};
 });
}
