import {applyPackAction} from '../rules/pack-shop.js';
import type {PackAction} from '../state/pack-contract.js';
import {applyVoucherPurchase} from '../rules/voucher-shop.js';
import type {VoucherPurchaseAction} from '../rules/voucher-shop.js';
import type {GameState,Issue,Result} from '../state/model.js';
import {validateState} from '../state/validation.js';
import {array,boolean,checkJsonValue,integer,isObject,object} from '../state/schema.js';
import {analysisBinding,actionSchema,canonical,equal} from '../storage/confirmed-record.js';
import type {AnalysisBinding} from '../storage/confirmed-record.js';
import {applyShopAction,shopPurchaseInstanceId} from '../rules/shop.js';
import type {ShopAction} from '../rules/shop.js';
import {scoreHand} from '../rules/scoring.js';
import type {HandInput,HandScore} from '../rules/scoring.js';
import type {EngineResult,Trace} from '../rules/core.js';
import {engineEvidence} from '../rules/engine-evidence.js';
import {ENGINE_VERSION} from '../catalog/initial.js';
import type {AnalysisGate} from '../rules/evidence.js';
import {evaluateShopContext,validateShopSnapshot} from './shop-context.js';
import type {ShopSnapshot,ShopContextResult} from './shop-context.js';
import {adviseShop} from './advisor.js';
import type {Advice,AdvisorScenario} from './advisor.js';
import {catalogCapabilities} from '../catalog/capabilities.js';
import type {CatalogCapabilities} from '../catalog/capabilities.js';
import {immediateConsequences,scenarioConsequences} from './consequences.js';
import type {ImmediateConsequences,ScenarioConsequences} from './consequences.js';
export type OperationStatus='available'|'provisional'|'missing_data'|'pending_evidence'|'illegal'|'unsupported'|'invalid';
export interface ActionCapability {
 id:string;optionId:string;action:ShopAction;status:OperationStatus;errors:Issue[];
 evidence:AnalysisGate|null;trace:Trace[];moneyAfter:number|null;
 confirmation:'explicit_confirmation_required'|'unavailable';confirmationErrors:Issue[];consequences:ImmediateConsequences|null;
}
export interface VoucherCapability extends Omit<ActionCapability,'action'>{action:VoucherPurchaseAction}
export interface PackCapability extends Omit<ActionCapability,'action'>{action:Extract<PackAction,{type:'buy_pack'}>}
export interface DecisionQuestion {path:string;message:string;operationIds:string[]}
export interface ShopDecision {
 contract:'shop-decision-1';binding:AnalysisBinding;phase:GameState['phase'];snapshotToken:string;stateToken:string;optionsToken:string;requireObserved:boolean;
 context:ShopContextResult;catalogue:{optionId:string;capabilities:CatalogCapabilities|null}[];
 actions:ActionCapability[];voucherActions:VoucherCapability[];packActions:PackCapability[];questions:DecisionQuestion[];
 hand:EngineResult<HandScore>|null;scenarios:EngineResult<Advice>|null;
 scenarioConsequences:ScenarioConsequences;
 limitations:string[];projected:true;exhaustive:false;
}
export interface DecisionOptions {ante?:number;requireObserved?:boolean;hand?:HandInput;scenarios?:AdvisorScenario[];actions?:ShopAction[]}
const fail=(code:string,message:string,path='$decision'):Result<never>=>({ok:false,errors:[{path,code,message}]});
const token=(snapshot:ShopSnapshot)=>JSON.stringify(canonical(snapshot));
const value=<T>(f:{status:'known';value:T}|{status:'unknown'}|undefined)=>f?.status==='known'?f.value:undefined;
export function operationStatus(errors:readonly Issue[],evidence?:AnalysisGate):OperationStatus{
 if(errors.some(e=>e.code==='pending_rule'))return 'pending_evidence';
 if(errors.some(e=>e.code==='unknown_data'||e.code==='unknown_context'||e.code==='unrecorded_offer'||e.code==='needs_outcome'))return 'missing_data';
 if(errors.some(e=>e.code.startsWith('unsupported_')||e.code==='explicit_composition_required'))return 'unsupported';
 if(errors.some(e=>['wrong_phase','insufficient_money','no_slots','eternal_joker','missing_offer','missing_joker','missing_prerequisite','voucher_already_owned'].includes(e.code)))return 'illegal';
 if(errors.length)return 'invalid';return evidence?.status==='limited'?'provisional':'available';
}
function matchesRecordedOffer(state:GameState,snapshot:ShopSnapshot,offerId:string){
 const manual=snapshot.jokers.find(o=>o.offerId===offerId),recorded=value(state.observed.shop)?.cardOffers.find(o=>o.offerId===offerId);
 return snapshot.id===value(state.observed.shop)?.shopId&&!!manual&&!!recorded&&recorded.kind==='joker'&&manual.catalogId===recorded.catalogId&&manual.price===value(recorded.price)&&manual.edition===value(recorded.edition)&&equal(manual.stickers,value(recorded.stickers));
}
/** One report, independent operation probes. No formula, policy, persistence or phase conversion here. */
export function inspectShopDecision(input:unknown,snapshotInput:unknown,options:DecisionOptions={}):Result<ShopDecision>{
 const checked=validateState(input);if(!checked.ok)return checked;const snapshot=validateShopSnapshot(snapshotInput);if(!snapshot.ok)return snapshot;
 const jsonErrors=checkJsonValue(options);if(jsonErrors.length)return {ok:false,errors:jsonErrors};
 if(!isObject(options as unknown)||Object.keys(options).some(k=>!['ante','requireObserved','hand','scenarios','actions'].includes(k)))return fail('invalid_options','Opciones de análisis no reconocidas.');
 const optionErrors:Issue[]=[];object({},{ante:integer(1),requireObserved:boolean}).check(Object.fromEntries(Object.entries(options).filter(([k])=>k==='ante'||k==='requireObserved')),'$options',optionErrors);
 if(options.actions!==undefined)array(actionSchema,50).check(options.actions,'$options.actions',optionErrors);
 if(optionErrors.length)return {ok:false,errors:optionErrors};
 const state=checked.value,shop=snapshot.value,requireObserved=options.requireObserved??false;
 const context=evaluateShopContext(state,shop,{...(options.ante===undefined?{}:{ante:options.ante}),requireObserved});
 const actions:ActionCapability[]=[],used=new Set<string>(),owned=value(state.observed.jokers)??[];
 let index=0;
 const probes:ShopAction[]=options.actions??[{type:'hold' as const},...shop.jokers.map(o=>{const instanceId=shopPurchaseInstanceId(o.offerId,owned);return o.replacementId?{type:'replace' as const,sellInstanceId:o.replacementId,offerId:o.offerId,instanceId}:{type:'buy' as const,offerId:o.offerId,instanceId};})];
 for(const action of probes){
  const id='action:'+index++,identity=JSON.stringify(canonical(action));if(used.has(identity))return fail('duplicate_action','La misma alternativa aparece dos veces.');used.add(identity);
  const optionId=action.type==='hold'?'hold':action.type==='sell'?'sell:'+action.instanceId:action.offerId;
  if((action.type==='buy'||action.type==='replace')&&!matchesRecordedOffer(state,shop,action.offerId)){
   const errors=[{path:'$.observed.shop',code:'unrecorded_offer',message:'La oferta comparada no coincide con la tienda registrada. Registra su identidad, precio y modificadores actuales antes de validar la transacción.'}];actions.push({id,optionId,action:structuredClone(action),status:'missing_data',errors,evidence:null,trace:[],moneyAfter:null,confirmation:'unavailable',confirmationErrors:errors,consequences:null});continue;
  }
  const result=applyShopAction(structuredClone(state),structuredClone(action),{expectedRevision:state.revision,updatedAt:state.updatedAt},{requireObserved});
  const confirmationErrors:Issue[]=!result.ok?result.errors:action.choices?.some(c=>c.knowledge!=='known')?[{path:'$action.choices',code:'hypothetical_confirmation',message:'La rama usa resultados hipotéticos. Registrar una acción real exige resultados observados, no los del escenario.'}]:[];
  actions.push({id,optionId,action:structuredClone(action),status:operationStatus(result.ok?[]:result.errors,result.evidence),errors:result.ok?[]:result.errors,evidence:result.evidence,trace:result.ok?result.trace:[],moneyAfter:result.ok?value(result.value.state.observed.money)??null:null,confirmation:result.ok&&!confirmationErrors.length?'explicit_confirmation_required':'unavailable',confirmationErrors,consequences:result.ok?immediateConsequences(state,result.value.state):null});
 }
 const voucherActions:VoucherCapability[]=shop.vouchers.map(offer=>{
  const action:VoucherPurchaseAction={type:'buy_voucher',offerId:offer.offerId},recorded=state.schemaVersion==='0.2'&&state.observed.shop.status==='known'?state.observed.shop.value.voucherOffers?.find(v=>v.offerId===offer.offerId):undefined;
  const mismatch=shop.id!==value(state.observed.shop)?.shopId||!recorded||recorded.catalogId!==offer.catalogId||(value(recorded.price)??null)!==offer.price;
  const result=mismatch?null:applyVoucherPurchase(structuredClone(state),action,{expectedRevision:state.revision,updatedAt:state.updatedAt},{requireObserved});
  const errors:Issue[]=mismatch?[{path:'$.observed.shop',code:'unrecorded_offer',message:'El vale comparado no coincide con una oferta guardada. Registra su identidad y precio antes de validar la compra.'}]:result&&!result.ok?result.errors:[];
  return {id:'voucher:'+offer.offerId,optionId:offer.offerId,action,status:operationStatus(errors,result?.evidence),errors,evidence:result?.evidence??null,trace:result?.ok?result.trace:[],moneyAfter:result?.ok?value(result.value.state.observed.money)??null:null,confirmation:result?.ok?'explicit_confirmation_required':'unavailable',confirmationErrors:errors,consequences:result?.ok?immediateConsequences(state,result.value.state):null};
 });
 const packActions:PackCapability[]=shop.packs.map(offer=>{
  const action:Extract<PackAction,{type:'buy_pack'}>={type:'buy_pack',offerId:offer.offerId},recorded=state.schemaVersion==='0.2'&&state.observed.shop.status==='known'?state.observed.shop.value.packOffers?.find(p=>p.offerId===offer.offerId):undefined;
  const mismatch=shop.id!==value(state.observed.shop)?.shopId||!recorded||recorded.catalogId!==offer.family+'-'+offer.size||(value(recorded.price)??null)!==offer.price;
  const result=mismatch?null:applyPackAction(structuredClone(state),action,{expectedRevision:state.revision,updatedAt:state.updatedAt},{requireObserved});
  const errors:Issue[]=mismatch?[{path:'$.observed.shop',code:'unrecorded_offer',message:'El sobre no coincide con una oferta guardada. Registra identidad y precio antes de validar su apertura.'}]:result&&!result.ok?result.errors:[];
  return {id:'pack:'+offer.offerId,optionId:offer.offerId,action,status:operationStatus(errors,result?.evidence),errors,evidence:result?.evidence??null,trace:result?.ok?result.trace:[],moneyAfter:result?.ok?value(result.value.state.observed.money)??null:null,confirmation:result?.ok?'explicit_confirmation_required':'unavailable',confirmationErrors:errors,consequences:result?.ok?immediateConsequences(state,result.value.state):null};
 });
 const hand=options.hand===undefined?null:scoreHand(structuredClone(state),structuredClone(options.hand),{requireObserved});
 // H3 uses exactly the same explicitly selected alternatives as the operation probes.
 const mismatch=actions.flatMap(a=>a.errors.filter(e=>e.code==='unrecorded_offer'));
 const scenarios:EngineResult<Advice>|null=options.scenarios===undefined?null:mismatch.length?{ok:false,errors:mismatch,evidence:engineEvidence(['version.compatibility'],requireObserved),engineVersion:ENGINE_VERSION}:adviseShop(structuredClone(state),structuredClone(options.scenarios),{expectedRevision:state.revision,updatedAt:state.updatedAt},Array.isArray(options.scenarios)&&!options.scenarios.length?{requireObserved}:{actions:probes,requireObserved});
 const questions=new Map<string,DecisionQuestion>();
 const labels:Record<string,string>={'$.observed.money':'Dinero actual ($)','$.observed.shop':'Ofertas actuales de tienda','$.observed.deck':'Cartas del mazo','$.observed.jokers':'Tus comodines','$.observed.handBases':'Bases de manos','$.observed.resources.jokerSlots':'Espacios de comodines','$.observed.resources.handsPerRound':'Manos por ronda','$.observed.resources.discardsPerRound':'Descartes por ronda','$.observed.resources.handSize':'Tamaño de mano'};
 const collect=(id:string,errors:readonly Issue[])=>{for(const error of errors)if(['unknown_data','unknown_context','unrecorded_offer'].includes(error.code)){const q=questions.get(error.path)??{path:error.path,message:(labels[error.path]??error.path)+': '+error.message,operationIds:[]};if(!q.operationIds.includes(id))q.operationIds.push(id);questions.set(error.path,q);}};
 for(const option of context.options)for(const axis of option.fit?.axes??[])if(axis.value===null){
  const path='$context.'+option.id+'.'+axis.key;labels[path]='Valoración de '+option.title;
  collect('fit:'+option.id,[{path,code:'unknown_context',message:axis.reason}]);
 }
 for(const action of [...actions,...voucherActions,...packActions])collect(action.id,action.errors);if(hand&&!hand.ok)collect('hand',hand.errors);
 if(scenarios){collect('scenarios',scenarios.ok?scenarios.value.errors:scenarios.errors);if(scenarios.ok)for(const comparison of scenarios.value.comparisons)if(!comparison.ok)collect('scenarios',comparison.errors);}
 return {ok:true,value:{contract:'shop-decision-1',binding:analysisBinding(state),phase:state.phase,snapshotToken:token(shop),stateToken:JSON.stringify(canonical(state)),optionsToken:JSON.stringify(canonical(options)),requireObserved,context,
  catalogue:[...shop.jokers.map(o=>({optionId:o.offerId,capabilities:catalogCapabilities('joker',o.catalogId)})),...shop.vouchers.map(o=>({optionId:o.offerId,capabilities:catalogCapabilities('voucher',o.catalogId)})),...shop.packs.map(o=>({optionId:o.offerId,capabilities:catalogCapabilities('pack',o.family+'-'+o.size)}))],
  actions,voucherActions,packActions,questions:[...questions.values()].sort((a,b)=>b.operationIds.length-a.operationIds.length||a.path.localeCompare(b.path)),hand,scenarios,scenarioConsequences:scenarioConsequences(scenarios),
  limitations:['Las capacidades del catálogo son rutas de análisis, no una certificación de todos los efectos.','Las preguntas describen los bloqueos encontrados; H2 puede revelar otros al completar el primero.','Las acciones son pruebas independientes desde el mismo estado, nunca una secuencia de compras. La búsqueda no es exhaustiva.','Las compras de vales y sobres tienen pruebas independientes de transacción y consecuencias; todavía no se incluyen en el ranking exacto de planes H3. Un sobre cerrado conserva contenido desconocido.','Sin escenarios explícitos no se evalúa supervivencia. Una mano concreta tampoco demuestra consistencia ni victoria de la partida.','El consejo contextual conserva su política heurística. Validar una transacción no demuestra que convenga comprar.','Un estado proyectado de H2/H3 nunca se convierte en la partida real. Confirmar requiere T09b, revisión, titularidad de escritura y declaración del usuario.'],projected:true,exhaustive:false}};
}
/** Also invalidate changes to a temporary shop that have not incremented the saved revision. */
export function decisionIsCurrent(decision:ShopDecision,input:unknown,snapshotInput:unknown,options:DecisionOptions={}):boolean{
 const state=validateState(input),snapshot=validateShopSnapshot(snapshotInput);if(checkJsonValue(options).length)return false;
 return state.ok&&snapshot.ok&&equal(decision.binding,analysisBinding(state.value))&&decision.phase===state.value.phase&&decision.snapshotToken===token(snapshot.value)&&decision.stateToken===JSON.stringify(canonical(state.value))&&decision.optionsToken===JSON.stringify(canonical(options));
}
