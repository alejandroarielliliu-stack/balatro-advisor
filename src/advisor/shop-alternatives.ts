import type {GameState,Issue,JokerInstance,Result} from '../state/model.js';
import {validateState} from '../state/validation.js';
import {boolean,checkJsonValue,isObject,object} from '../state/schema.js';
import {enumerateActions,shopPurchaseInstanceId} from '../rules/shop.js';
import type {ShopAction} from '../rules/shop.js';
import type {VoucherPurchaseAction} from '../rules/voucher-shop.js';
import type {PackAction} from '../state/pack-contract.js';
import {ALL_JOKER_FACTS} from '../catalog/all-joker-facts.js';
import {decisionIsCurrent,inspectShopDecision} from './decision.js';
import type {ActionCapability,OperationStatus,PackCapability,ShopDecision,VoucherCapability} from './decision.js';
import {evaluateShopContext,validateShopSnapshot} from './shop-context.js';
import type {ShopOption,ShopSnapshot} from './shop-context.js';

export const SHOP_ALTERNATIVE_LIMIT=50;
export interface ShopAlternativeOptions {requireObserved?:boolean}
type Capability=ActionCapability|VoucherCapability|PackCapability;
export type ShopAlternativeAction=ShopAction|VoucherPurchaseAction|Extract<PackAction,{type:'buy_pack'}>;
export interface ShopAlternative {
 id:string;kind:ShopAlternativeAction['type'];action:ShopAlternativeAction;
 offerId:string|null;soldInstanceId:string|null;title:string;status:OperationStatus;
 moneyBefore:number|null;moneyAfter:number|null;netCost:number|null;
 removed:JokerInstance[];consequences:Capability['consequences'];
 errors:Issue[];evidence:Capability['evidence'];trace:Capability['trace'];
 confirmation:Capability['confirmation'];confirmationErrors:Issue[];
 /** A contextual description of this branch, never its ranking against all branches. */
 contextOption?:ShopOption;
 limitations:string[];
}
export interface ShopAlternativesReport {
 contract:'shop-alternatives-1';alternatives:ShopAlternative[];
 /** Existing contextual advice keeps its original, narrower universe of choices. */
 baseDecision:ShopDecision;requireObserved:boolean;
 coverage:{knownInventory:boolean;count:number;limit:number;completeSingleActionSet:boolean;excludedOfferIds:string[]};
 limitations:string[];projected:true;exhaustive:false;
}
const value=<T>(fact:{status:'known';value:T}|{status:'unknown'}|undefined):T|null=>fact?.status==='known'?fact.value:null;
const issue=(code:string,message:string,path='$shopAlternatives'):Result<never>=>({ok:false,errors:[{path,code,message}]});
const name=(id:string)=>ALL_JOKER_FACTS[id]?.name??id;
const encode=(id:string)=>encodeURIComponent(id);

/** Stable identities for alternatives, independent of real offer/instance identities. */
export function shopAlternativeId(action:ShopAlternativeAction):string {
 switch(action.type){
  case 'hold':return 'hold';
  case 'buy':return 'buy:'+encode(action.offerId);
  case 'sell':return 'sell:'+encode(action.instanceId);
  case 'replace':return 'replace:'+encode(action.offerId)+':'+encode(action.sellInstanceId);
  case 'buy_voucher':return 'voucher:'+encode(action.offerId);
  case 'buy_pack':return 'pack:'+encode(action.offerId);
 }
}
function optionErrors(options:unknown):Issue[]{
 const errors=checkJsonValue(options);if(errors.length)return errors;
 if(!isObject(options)||Object.keys(options).some(key=>key!=='requireObserved'))return [{path:'$options',code:'invalid_options',message:'Opciones de alternativas no reconocidas.'}];
 object({},{requireObserved:boolean}).check(options,'$options',errors);return errors;
}
function structurallyRequested(state:GameState,snapshot:ShopSnapshot):ShopAction[]{
 const owned=value(state.observed.jokers)??[];
 const requested:ShopAction[]=[{type:'hold'},...owned.map(j=>({type:'sell' as const,instanceId:j.instanceId}))];
 for(const offer of snapshot.jokers){
  const instanceId=shopPurchaseInstanceId(offer.offerId,owned);
  requested.push({type:'buy',offerId:offer.offerId,instanceId});
  for(const joker of owned)requested.push({type:'replace',offerId:offer.offerId,sellInstanceId:joker.instanceId,instanceId});
 }
 return requested;
}
function branchContext(state:GameState,snapshot:ShopSnapshot,action:ShopAction,base:ShopDecision,requireObserved:boolean):ShopOption|undefined {
 if(action.type!=='buy'&&action.type!=='replace')return action.type==='hold'?base.context.options.find(o=>o.id==='hold'):undefined;
 const offer=snapshot.jokers.find(o=>o.offerId===action.offerId);if(!offer)return undefined;
 const replacement=action.type==='replace'?action.sellInstanceId:undefined;
 if(offer.replacementId===replacement)return base.context.options.find(o=>o.id===offer.offerId);
 const {replacementId:_old,...observedOffer}=offer;
 // Only the selected offer's description is extracted. Its local recommendation
 // is intentionally discarded: it cannot rank the complete action universe.
 const local:ShopSnapshot={id:snapshot.id,jokers:[{...observedOffer,...(replacement?{replacementId:replacement}:{})}],vouchers:[],packs:[],rerollCost:null};
 return evaluateShopContext(state,local,{requireObserved}).options.find(o=>o.id===offer.offerId);
}
function alternative(state:GameState,snapshot:ShopSnapshot,capability:Capability,base:ShopDecision,requireObserved:boolean):ShopAlternative {
 const action=capability.action,offerId='offerId'in action?action.offerId:null;
 const soldInstanceId=action.type==='sell'?action.instanceId:action.type==='replace'?action.sellInstanceId:null;
 const sold=soldInstanceId?(value(state.observed.jokers)??[]).find(j=>j.instanceId===soldInstanceId):undefined;
 const contextOption=action.type==='buy_voucher'||action.type==='buy_pack'?base.context.options.find(o=>o.id===action.offerId):branchContext(state,snapshot,action,base,requireObserved);
 const offer=offerId?snapshot.jokers.find(o=>o.offerId===offerId):undefined;
 const purchased=offer?name(offer.catalogId):contextOption?.title??offerId??'';
 const title=action.type==='hold'?'Conservar':action.type==='sell'?'Vender '+name(sold?.catalogId??soldInstanceId??''):
  action.type==='replace'?'Vender '+name(sold?.catalogId??soldInstanceId??'')+' → comprar '+purchased:
  action.type==='buy'?'Comprar '+purchased:contextOption?.title??'Comprar '+purchased;
 const delta=capability.consequences?.money.delta;
 return {id:shopAlternativeId(action),kind:action.type,action:structuredClone(action),offerId,soldInstanceId,title,status:capability.status,
  moneyBefore:value(state.observed.money),moneyAfter:capability.moneyAfter,netCost:delta===undefined||delta===null?null:delta===0?0:-delta,
  removed:structuredClone(capability.consequences?.removed??[]),consequences:structuredClone(capability.consequences),errors:structuredClone(capability.errors),evidence:structuredClone(capability.evidence),trace:structuredClone(capability.trace),
  confirmation:capability.confirmation,confirmationErrors:structuredClone(capability.confirmationErrors),...(contextOption?{contextOption:structuredClone(contextOption)}:{}),
  limitations:[...(contextOption?.limitations??[]),...(action.type==='sell'?['El ingreso por vender no demuestra que convenga perder ese efecto o su crecimiento.']:[]),...(action.type==='replace'?['Se valida venta y compra desde la misma copia; los contadores vendidos no se heredan.']:[]),'La ficha contextual de esta alternativa no constituye una preferencia frente a todas las ventas y reemplazos.']};
}

/** Independent single-action probes; no new scoring, ranking or persistence. */
export function inspectShopAlternatives(input:unknown,snapshotInput:unknown,options:ShopAlternativeOptions={}):Result<ShopAlternativesReport> {
 const checked=validateState(input);if(!checked.ok)return checked;
 const validated=validateShopSnapshot(snapshotInput);if(!validated.ok)return validated;
 const errors=optionErrors(options);if(errors.length)return {ok:false,errors};
 const state=checked.value,snapshot=validated.value,knownInventory=state.observed.jokers.status==='known',owned=value(state.observed.jokers)??[];
 const count=1+owned.length+snapshot.jokers.length*(1+owned.length)+snapshot.vouchers.length+snapshot.packs.length;
 if(count>SHOP_ALTERNATIVE_LIMIT)return issue('too_many_alternatives',`Se solicitarían ${count} alternativas; el límite es ${SHOP_ALTERNATIVE_LIMIT}. Reduce el grupo de ofertas: no se evaluó un subconjunto oculto.`);
 const requested=structurallyRequested(state,snapshot),mutation={expectedRevision:state.revision,updatedAt:state.updatedAt};
 // Reuse H2's enumeration when available, including illegal branches. Its legal
 // flags are not promoted to strict evidence; DEC00 probes every final action
 // with the caller's actual evidence requirement below.
 const enumeration=enumerateActions(state,mutation),enumerated=enumeration.ok?new Map(enumeration.value.map(item=>[shopAlternativeId(item.action),item.action])):null;
 const actions=requested.map(action=>structuredClone(enumerated?.get(shopAlternativeId(action))??action));
 const requireObserved=options.requireObserved??false;
 const result=inspectShopDecision(state,snapshot,{requireObserved,actions});if(!result.ok)return result;
 const decision=result.value,alternatives=[...decision.actions,...decision.voucherActions,...decision.packActions].map(capability=>alternative(state,snapshot,capability,decision,requireObserved));
 const represented=new Set(alternatives.flatMap(a=>a.offerId?[a.offerId]:[]));
 const excludedOfferIds=[...new Set([...(snapshot.others??[]).map(o=>o.offerId),...decision.context.options.filter(o=>o.kind!=='hold'&&o.kind!=='reroll'&&!represented.has(o.id)).map(o=>o.id)])];
 return {ok:true,value:{contract:'shop-alternatives-1',alternatives,baseDecision:decision,requireObserved,
  coverage:{knownInventory,count:alternatives.length,limit:SHOP_ALTERNATIVE_LIMIT,completeSingleActionSet:knownInventory&&excludedOfferIds.length===0,excludedOfferIds},
  limitations:[...decision.limitations,...(!knownInventory?['Inventario desconocido: no se enumeran ventas ni reemplazos y el conjunto individual es parcial.']:[]),
   'Se enumeran conservar, compras y ventas individuales, cada venta→compra de comodín y los vales/sobres solicitados. No se buscan múltiples ventas/compras ni órdenes completos.',
   ...(excludedOfferIds.length?['Hay ofertas sin acción compatible en este conjunto: '+excludedOfferIds.join(', ')+'. Se conserva su incertidumbre en el consejo contextual.']:[]),
   'El consejo contextual existente conserva su conjunto anterior de opciones; no clasifica automáticamente las nuevas ventas ni todos los reemplazos.',
   'Un sobre cerrado conserva contenido desconocido; no se simula su resultado.'],projected:true,exhaustive:false}};
}

/** Revision, facts, observed shop and strict mode all participate in freshness. */
export function shopAlternativesAreCurrent(report:ShopAlternativesReport,input:unknown,snapshot:unknown,options:ShopAlternativeOptions={}):boolean {
 if(optionErrors(options).length||report.requireObserved!==(options.requireObserved??false))return false;
 return decisionIsCurrent(report.baseDecision,input,snapshot,{requireObserved:report.requireObserved,actions:report.baseDecision.actions.map(a=>a.action)});
}
