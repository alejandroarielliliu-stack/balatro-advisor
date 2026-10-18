import type {ActionCapability,ShopDecision} from '../advisor/decision.js';
import type {ShopOption} from '../advisor/shop-context.js';
import {QUICK_SHOP_POLICY} from '../advisor/quick-shop-policy.js';
import {ALL_JOKER_FACTS} from '../catalog/all-joker-facts.js';

export interface ShopAdviceSummary {
 title:string;status:'conditional'|'tie'|'abstain';
 benefit:string|null;sacrifice:string|null;pending:string|null;scope:string;
 choices:{id:string;title:string;moneyAfter:number|null;price:number|null}[];
}
type Capability=Pick<ActionCapability,'id'|'optionId'|'status'|'errors'|'consequences'|'moneyAfter'>;
const resourceLabels:Record<string,string>={handsPerRound:'manos/ronda',discardsPerRound:'descartes/ronda',handSize:'cartas en mano',jokerSlots:'espacios de comodines',interestCap:'tope de interés ($)'};
const name=(id:string)=>ALL_JOKER_FACTS[id]?.name??Object.values(ALL_JOKER_FACTS).find(j=>j.artId===id)?.name??id;

function preparedBenefit(option:ShopOption):string|null {
 const own=option.findings?.find(f=>f.ruleId===QUICK_SHOP_POLICY.rules.additionalScoring)?.values?.ownMult;
 if(typeof own==='number')return `+${own} Mult propio; no es el cambio de puntuación total de la mano.`;
 const resources=Object.entries(option.resourceChanges??{});
 if(resources.length)return 'Totales tras comprar: '+resources.map(([field,n])=>`${n} ${resourceLabels[field]??field}`).join(', ')+'.';
 if(option.fit?.readiness==='ready')return option.fit.signals.find(s=>s.id==='preparation')?.text??null;
 if(option.fit?.readiness==='potential')return 'Puede aportar su efecto si se cumplen las condiciones indicadas.';
 return null;
}
function sacrifice(option:ShopOption,capability:Capability|undefined):string|null {
 const parts:string[]=[];
 // Only H2 transaction data supplies the net cost. Manual price arithmetic is
 // retained in choices, but never promoted to a validated replacement cost.
 const net=capability?.consequences?.money.delta;
 const netCost=net===null||net===undefined?option.fit?.purchase.status==='legal'?option.fit.purchase.netCost:undefined:-net;
 if(netCost!==undefined)parts.push(`Coste neto $${netCost}${capability?.moneyAfter!==null&&capability?.moneyAfter!==undefined?`; quedan $${capability.moneyAfter}`:option.fit?.purchase.moneyAfter!==undefined?`; quedan $${option.fit.purchase.moneyAfter}`:''}`);
 const removed=capability?.consequences?.removed??[];
 for(const joker of removed){
  const counters=Object.entries(joker.counters).map(([key,f])=>`${key}=${f.status==='known'?f.value:'desconocido'}`);
  parts.push(`pierdes ${name(joker.catalogId)}${counters.length?' ('+counters.join(', ')+')':''} y su efecto; sus contadores no se heredan`);
 }
 const interest=option.economics?.interest;
 if(interest&&interest.change!==0)parts.push(`interés aislado $${interest.before} → $${interest.after}, solo si ganas y mantienes esos saldos hasta cobrar`);
 return parts.length?parts.join('; ')+'.':null;
}

function pending(decision:ShopDecision,selected:ShopOption[],capabilities:Capability[]):string|null {
 const selectedIds=new Set(selected.map(o=>o.id));
 const relevant=capabilities.filter(c=>selectedIds.has(c.optionId)||(decision.context.recommendation.status==='abstain'&&c.optionId!=='hold'));
 const conditions=selected.flatMap(option=>{
  const labels:string[]=[],fit=option.fit;
  const preparation=fit?.readiness==='potential'?fit.signals.find(s=>s.id==='preparation'):undefined;
  if(preparation)labels.push(preparation.text);
  const removed=capabilities.find(c=>c.optionId===option.id)?.consequences?.removed;
  labels.push(...(fit?.signals??[]).filter(s=>s.kind==='conflict'&&!(s.id==='replacement-loss'&&removed?.length)).map(s=>s.text));
  return [...new Set(labels)].map(text=>selected.length>1?`${option.title}: ${text}`:text);
 });
 const withConditions=(message:string|null)=>[...new Set([...(message?[message]:[]),...conditions])].join(' ')||null;
 if(relevant.some(c=>c.status==='pending_evidence'))return withConditions('Modo estricto: faltan observaciones en partida de las reglas necesarias; la transacción no está habilitada.');
 const illegal=relevant.find(c=>c.status==='illegal'||c.status==='invalid');
 if(illegal)return withConditions(illegal.errors.map(e=>e.message).join(' '));
 const unsupported=relevant.find(c=>c.status==='unsupported');
 if(unsupported)return withConditions('Fuera del cálculo compatible: '+unsupported.errors.map(e=>e.message).join(' '));
 const missing=relevant.find(c=>c.status==='missing_data');
 if(missing){
  const option=decision.context.options.find(o=>o.id===missing.optionId);
  if(option?.price===null)return withConditions(`Indica el precio actual de ${option.title}.`);
  const question=decision.questions.find(q=>q.operationIds.includes(missing.id));
  return withConditions(question?.message??missing.errors.map(e=>e.message).join(' '));
 }
 const unknownOffer=decision.context.options.find(o=>o.kind!=='hold'&&o.kind!=='reroll'&&o.kind!=='pack'&&o.affordability!=='unaffordable'&&(o.kind==='other'||o.fit?.purchase.status==='unknown'||o.fit?.readiness==='unknown'||o.price===null));
 if(unknownOffer){
  if(unknownOffer.price===null)return withConditions(`Falta el precio de ${unknownOffer.title}; podría cambiar la elección.`);
  const missingPreparation=unknownOffer.fit?.readiness==='unknown'?unknownOffer.fit.signals.find(s=>s.id==='preparation')?.text:null;
  return withConditions(missingPreparation?`${unknownOffer.title}: ${missingPreparation}`:`${unknownOffer.title} tiene datos o efectos sin evaluar y podría cambiar la elección.`);
 }
 const questions=decision.questions.filter(q=>q.operationIds.some(id=>relevant.some(c=>c.id===id)||selected.some(o=>id==='fit:'+o.id)));
 if(questions.length)return withConditions(questions[0]!.message);
 return withConditions(null);
}

/** Presentation only: preserve the policy's title, status and choice order.
 * No rule calculations, new ranking, state projection or persistence here. */
export function buildShopAdviceSummary(decision:ShopDecision):ShopAdviceSummary {
 const recommendation=decision.context.recommendation;
 const choices=recommendation.offerIds.flatMap(id=>{
  const option=decision.context.options.find(o=>o.id===id);
  return option?[{id:option.id,title:option.title,moneyAfter:option.moneyAfter,price:option.price}]:[];
 });
 const selected=choices.flatMap(choice=>{
  const option=decision.context.options.find(o=>o.id===choice.id);
  return option&&option.kind!=='hold'?[option]:[];
 });
 const capabilities:Capability[]=[...decision.actions,...decision.voucherActions,...decision.packActions];
 let benefit:string|null=null,cost:string|null=null;
 if(recommendation.status!=='abstain'){
  if(selected.length===1){const option=selected[0]!;benefit=preparedBenefit(option);cost=sacrifice(option,capabilities.find(c=>c.optionId===option.id));}
  else if(selected.length>1){benefit='Las compras ofrecen efectos distintos; el cálculo no demuestra una ganadora.';cost='Compara los saldos y lo que sustituye cada opción en sus detalles.';}
  else if(choices.some(o=>o.id==='hold')){const hold=choices.find(o=>o.id==='hold')!;benefit=hold.moneyAfter===null?'Conservas tus comodines actuales.':`Conservas $${hold.moneyAfter} y tus comodines actuales.`;}
 }
 const provisional=capabilities.some(c=>c.status==='provisional');
 const scope=(decision.scenarios===null?'Heurístico · supervivencia sin evaluar':'Heurístico · consulta los resultados de los planes fijos; no predicen la partida')+(provisional?' · reglas provisionales':'');
 return {title:recommendation.title,status:recommendation.status,benefit,sacrifice:cost,pending:pending(decision,selected,capabilities),scope,choices};
}
