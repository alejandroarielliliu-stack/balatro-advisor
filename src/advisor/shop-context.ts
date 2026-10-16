import type {Fact,GameState,Issue,JokerInstance,Result} from '../state/model.js';
import {validateState} from '../state/validation.js';
import {array,checkJsonValue,enumeration,integer,object,text} from '../state/schema.js';
import type {Schema} from '../state/schema.js';
import {ALL_JOKER_FACTS} from '../catalog/all-joker-facts.js';
import {BOOSTER_CATALOG} from '../catalog/booster-catalog.js';
import {VOUCHER_CATALOG} from '../catalog/voucher-catalog.js';
import {supportsVoucher,voucherResources} from '../catalog/vouchers.js';
import {deckProfile,resolveDeck} from '../catalog/decks.js';
import {evaluateComposition} from './composition.js';
import type {CompositionReport} from './composition.js';
import {FIT_INDEX_POLICY,FIT_MAGNITUDE_COUNTERS} from './fit-index.js';
import {evaluateJokerFit} from './quick-fit.js';
import type {QuickFit} from './quick-fit.js';

/** Visible manual offers. null is an unknown price, never a free offer. */
export interface ShopSnapshot {
 id:string;
 jokers:{offerId:string;catalogId:string;price:number|null;edition:string;stickers:string[];replacementId?:string}[];
 vouchers:{offerId:string;catalogId:string;price:number|null}[];
 packs:{offerId:string;family:'arcana'|'celestial'|'standard'|'spectral'|'buffoon';size:'normal'|'jumbo'|'mega';price:number|null}[];
 rerollCost:number|null;
 others?:{offerId:string;kind:'tarot'|'planet'|'spectral'|'playing_card';name:string;price:number|null}[];
}
export interface ShopOption {
 id:string;kind:'hold'|'joker'|'voucher'|'pack'|'reroll'|'other';title:string;
 price:number|null;moneyAfter:number|null;affordability:'affordable'|'unaffordable'|'unknown';
 coverage:'modeled'|'limited'|'unknown';fit?:QuickFit;reasons:string[];limitations:string[];
 /** Projected totals, not acquired resources or a score delta. */
 resourceChanges?:Record<string,number>;
}
export interface ShopContextResult {
 recommendation:{status:'conditional'|'tie'|'abstain';title:string;offerIds:string[];reasons:string[]};
 options:ShopOption[];limitations:string[];errors:Issue[];exhaustive:false;
}
const value=<T>(fact:Fact<T>|undefined):T|undefined=>fact?.status==='known'?fact.value:undefined;
const known=<T>(data:T):Fact<T>=>({status:'known',value:data,source:'manual'});
const unknown=(reason:string):Fact<number>=>({status:'unknown',reason});
const key=(id:string)=>Object.hasOwn(ALL_JOKER_FACTS,id)?id:Object.keys(ALL_JOKER_FACTS).find(k=>ALL_JOKER_FACTS[k]!.artId===id);
const nullablePrice:Schema<number|null>={check:(input,path,errors)=>input===null||integer(0).check(input,path,errors)};
const snapshotSchema=object({
 id:text(),
 jokers:array(object({offerId:text(),catalogId:text(),price:nullablePrice,edition:text(),stickers:array(text(),100)},{replacementId:text()}),100),
 vouchers:array(object({offerId:text(),catalogId:text(),price:nullablePrice}),100),
 packs:array(object({offerId:text(),family:enumeration('arcana','celestial','standard','spectral','buffoon'),size:enumeration('normal','jumbo','mega'),price:nullablePrice}),100),
 rerollCost:nullablePrice
},{others:array(object({offerId:text(),kind:enumeration('tarot','planet','spectral','playing_card'),name:text(),price:nullablePrice}),100)});

export function validateShopSnapshot(input:unknown):Result<ShopSnapshot> {
 const errors=checkJsonValue(input);if(errors.length)return {ok:false,errors};
 if(!snapshotSchema.check(input,'$shop',errors))return {ok:false,errors};
 const snapshot=input as ShopSnapshot,seen=new Set(['hold','reroll']);
 for(const field of ['jokers','vouchers','packs','others'] as const){
  for(const [index,offer] of (snapshot[field]??[]).entries()){
   if(seen.has(offer.offerId))errors.push({path:`$shop.${field}[${index}].offerId`,code:'duplicate_id',message:`ID de oferta repetido o reservado: ${offer.offerId}.`});
   seen.add(offer.offerId);
  }
 }
 return errors.length?{ok:false,errors}:{ok:true,value:structuredClone(snapshot)};
}

const limitations=[
 'Consejo condicionado sobre la tienda transcrita; no es una búsqueda exhaustiva de compras, órdenes o reemplazos.',
 'No compara un índice global antes/después ni convierte dólares, recursos e índice de encaje en una puntuación común.',
 'El índice de encaje es editorial; no son puntos de mano, probabilidad de ganar ni garantía de superar una ciega.',
 'Sobres cerrados y ofertas posteriores a renovar tienen contenido desconocido. No se generan cartas, ingresos ni crecimiento futuro.',
 'Consultar no compra, vende, abre, renueva ni guarda adquisiciones. Evidencia estática 1.0.1o-FULL, docs/evidencia/tienda-investigacion.md.'
];
function result(errors:Issue[]=[]):ShopContextResult {
 return {recommendation:{status:'abstain',title:'Completa los datos de la tienda',offerIds:[],reasons:['Faltan datos para comparar las opciones.']},options:[],limitations:[...limitations],errors,exhaustive:false};
}
function debtLimit(jokers:JokerInstance[]|undefined):number|null {
 return jokers?jokers.filter(j=>key(j.catalogId)==='credit_card').length*20:null;
}
function cost(state:GameState,price:number|null,sale:number|null=0,peers=value(state.observed.jokers)):Pick<ShopOption,'price'|'moneyAfter'|'affordability'> {
 const money=value(state.observed.money),after=money===undefined||price===null||sale===null?null:money+sale-price;
 const moneyAfter=after!==null&&Number.isSafeInteger(after)?after:null,credit=debtLimit(peers);
 return {price,moneyAfter,affordability:moneyAfter===null?'unknown':moneyAfter>=0?'affordable':credit===null?'unknown':moneyAfter>=-credit?'affordable':'unaffordable'};
}
function costReasons(option:ShopOption,state:GameState,sale=0):void {
 const money=value(state.observed.money);
 if(option.price===null)option.limitations.push('Precio actual sin transcribir; no se sustituye por el precio base.');
 if(money===undefined)option.limitations.push('Saldo actual desconocido; no se supone $0.');
 if(option.moneyAfter!==null)option.reasons.push(`Saldo hipotético: $${money}${sale?` + $${sale} de venta`:''} − $${option.price} = $${option.moneyAfter}. Es aritmética del precio visto, no una transacción confirmada.`);
 if(option.affordability==='unaffordable')option.reasons.push('El saldo posterior excede el crédito conocido; no puede financiar esta opción.');
 if(option.moneyAfter!==null&&option.moneyAfter<0&&option.affordability==='affordable')option.reasons.push('Usaría deuda dentro del límite de Credit Card de los comodines conservados.');
 const ids=value(state.observed.jokers)?.map(j=>key(j.catalogId));
 if((option.price??0)>sale&&(ids?.includes('bull')||ids?.includes('bootstraps')))option.reasons.push('Gastar reduce el soporte de Bull/Bootstraps; no se resta esa pérdida como puntos.');
 if(option.moneyAfter!==null&&money!==undefined&&option.moneyAfter<money)option.reasons.push('Ahorrar conserva dinero e interés potencial al cierre; aquí no se cobra ni se pierde interés de forma inmediata.');
}
interface Evaluated {option:ShopOption;eligible:boolean;uncertain:boolean}
function evaluateJoker(state:GameState,offer:ShopSnapshot['jokers'][number],report:CompositionReport,ante:number|undefined,requireObserved:boolean):Evaluated {
 const owned=value(state.observed.jokers),sold=offer.replacementId?owned?.find(j=>j.instanceId===offer.replacementId):undefined;
 const peers=owned?.filter(j=>j.instanceId!==offer.replacementId),sale=offer.replacementId?value(sold?.sellValue)??null:0;
 const option:ShopOption={id:offer.offerId,kind:'joker',title:ALL_JOKER_FACTS[key(offer.catalogId)??'']?.name??offer.catalogId,...cost(state,offer.price,sale,peers),coverage:'unknown',reasons:[],limitations:[]};
 const opts={purchase:true,requireObserved,offer:{price:offer.price===null?unknown('Precio de oferta no transcrito'):known(offer.price),edition:known(offer.edition),stickers:known(offer.stickers)},...(ante===undefined?{}:{ante}),...(offer.replacementId?{replacementId:offer.replacementId}:{})};
 let fit=evaluateJokerFit(state,offer.catalogId,opts);
 const replacementBlocked=!!offer.replacementId&&owned!==undefined&&(!sold||value(sold.stickers)?.includes('eternal')===true);
 const replacementUnknown=!!offer.replacementId&&(owned===undefined||!sold||value(sold.sellValue)===undefined||value(sold.stickers)===undefined||value(sold.edition)===undefined);
 if(replacementBlocked){option.moneyAfter=null;option.reasons.push(sold?'Eternal impide vender el reemplazo seleccionado.':'El reemplazo seleccionado no existe en el inventario.');}
 // A discounted observed price can fall outside H2 while its cash arithmetic
 // remains useful to inspect conditions. Keep the original failed transaction.
 if(fit.purchase.status==='unknown'&&option.affordability==='affordable'&&!replacementBlocked&&!replacementUnknown&&option.moneyAfter!==null){
  const hypothetical=structuredClone(state);hypothetical.observed.money=known(option.moneyAfter);
  if(peers)hypothetical.observed.jokers=known(peers);
  const contextual=evaluateJokerFit(hypothetical,offer.catalogId,ante===undefined?{}:{ante});
  fit={...contextual,purchase:fit.purchase,limitations:[...new Set([...contextual.limitations,...fit.limitations,'Condiciones inspeccionadas con el saldo aritmético del precio manual; H2 no valida esta compra.'])]};
 }
 option.fit=fit;option.coverage=fit.score===null?'unknown':fit.purchase.status==='legal'?'modeled':'limited';
 option.reasons.push(...fit.signals.filter(s=>s.id==='preparation'||s.kind==='conflict'||s.id.startsWith('composition-')).map(s=>s.text));
 option.limitations.push(...fit.limitations,...fit.purchase.limitations,...fit.purchase.errors.map(e=>e.message));
 if(fit.purchase.status==='unknown')option.limitations.push('H2 conserva compra desconocida; el saldo aritmético no amplía su cobertura.');
 const pendingRule=fit.purchase.errors.some(e=>e.code==='pending_rule');
 if(pendingRule)option.limitations.push('Modo estricto: faltan observaciones de partida para las reglas requeridas por H2. El perfil heurístico documentado no sustituye esa evidencia.');
 const slots=value(state.observed.resources.jokerSlots),free=slots===undefined?undefined:slots-(sold&&value(sold.edition)==='negative'?1:0),negative=offer.edition==='negative';
 const capacityUnknown=peers===undefined||free===undefined;
 const capacityBlocked=!negative&&peers!==undefined&&free!==undefined&&peers.length>=free;
 if(capacityBlocked)option.reasons.push('Inventario lleno: selecciona un comodín vendible para liberar el espacio antes de comprar.');
 if(capacityUnknown)option.limitations.push('Falta inventario o capacidad para comprobar el espacio de la compra.');
 const peerFits=report.fits.filter(f=>f.instanceId!==offer.replacementId);
 const missingRoles=fit.roles.filter(role=>owned!==undefined&&!peerFits.some(f=>f.roles.includes(role)&&f.readiness!=='unavailable'));
 if(missingRoles.length)option.reasons.push('Aporta un rol sin soporte actual: '+missingRoles.join(', ')+'. Contar roles no demuestra consistencia.');
 const materialSynergy=fit.signals.some(s=>s.kind==='potential'&&s.id.startsWith('composition-'));
 const grownKey=sold?FIT_MAGNITUDE_COUNTERS[key(sold.catalogId)??'']:undefined;
 const growthUnknown=!!sold&&!!grownKey&&value(sold.counters[grownKey])===undefined;
 const growthProtected=!!sold&&!!grownKey&&value(sold.counters[grownKey])!>(grownKey==='x100'?100:0);
 if(sold)option.reasons.push(`Vender ${ALL_JOKER_FACTS[key(sold.catalogId)??'']?.name??sold.catalogId} pierde su efecto y sus contadores actuales (${Object.entries(sold.counters).map(([name,f])=>`${name}=${value(f)??'desconocido'}`).join(', ')||'sin contador'}). No se heredan en la compra.`);
 if(growthProtected)option.reasons.push('Conserva el desarrollo registrado: no se demuestra que este reemplazo compense perderlo.');
 if(growthUnknown)option.limitations.push('Contador del comodín que se vendería desconocido; no se supone que no tenga desarrollo.');
 const prepared=fit.score!==null&&fit.score>=FIT_INDEX_POLICY.positive&&['ready','potential'].includes(fit.readiness);
 const improved=missingRoles.length>0||materialSynergy;
 if(!prepared&&fit.score!==null)option.reasons.push(`No alcanza la referencia editorial de encaje preparado (${FIT_INDEX_POLICY.positive}); no se recomienda gastar solo por una nota.`);
 if(!improved&&owned!==undefined)option.reasons.push('No identifica un rol faltante ni una relación con soporte actual que justifique mejorar la composición.');
 costReasons(option,state,sale??0);
 const blocked=replacementBlocked||capacityBlocked||growthProtected||fit.purchase.status==='illegal'||option.affordability==='unaffordable';
 const uncertain=!blocked&&(pendingRule||fit.score===null||fit.readiness==='unknown'||option.affordability==='unknown'||capacityUnknown||replacementUnknown||growthUnknown);
 return {option,eligible:!blocked&&!uncertain&&prepared&&improved,uncertain};
}

function voucherProjection(state:GameState,id:string,ids:string[],option:ShopOption):void {
 const deckId=value(state.observed.deckId),profile=deckId?deckProfile(deckId):undefined;
 if(!deckId||!profile){option.limitations.push('Baraja desconocida: falta proyectar los recursos del vale.');return;}
 const before=voucherResources(deckId,ids),after=voucherResources(deckId,[...ids,id]),changes:Record<string,number>={};
 for(const [key,field] of [['hands','handsPerRound'],['discards','discardsPerRound'],['handSize','handSize'],['jokerSlots','jokerSlots']] as const){
  const delta=after[key]-before[key];if(!delta)continue;
  const current=value(state.observed.resources[field]);
  if(current===undefined)option.limitations.push(`Recurso ${field} desconocido: efecto persistente +${delta}, total sin calcular.`);
  else if(Number.isSafeInteger(current+delta)){changes[field]=current+delta;option.reasons.push(`Proyección factual de ${field}: ${current} + ${delta} = ${current+delta}; no se adquiere al consultar.`);}
 }
 if(id==='v_seed_money'||id==='v_money_tree'){
  const interest=resolveDeck(deckId).income.interest;
  changes.interestCap=interest?(id==='v_money_tree'?20:10):0;
  option.reasons.push(interest?`Tope de interés proyectado $${changes.interestCap}; el ingreso depende del saldo al cierre y de completar la ronda. No añade dinero ahora.`:'Baraja verde no cobra interés; aumentar su tope no genera ingreso.');
 }
 option.resourceChanges=changes;
}
function evaluateVoucher(state:GameState,offer:ShopSnapshot['vouchers'][number],requireObserved:boolean):Evaluated {
 const entry=VOUCHER_CATALOG.find(v=>v.id===offer.catalogId),ids=value(state.observed.outOfScope)?.vouchers;
 const option:ShopOption={id:offer.offerId,kind:'voucher',title:entry?.name??offer.catalogId,...cost(state,offer.price),coverage:entry?'limited':'unknown',reasons:entry?[entry.description]:[],limitations:[]};
 costReasons(option,state);
 if(!entry){option.limitations.push('Vale no identificado; no se atribuye un efecto.');return {option,eligible:false,uncertain:option.affordability!=='unaffordable'};}
 if(!ids){option.limitations.push('Vales adquiridos desconocidos; faltan comprobar requisito y adquisición previa.');return {option,eligible:false,uncertain:option.affordability!=='unaffordable'};}
 const already=ids.includes(entry.id),missing=entry.requires.filter(id=>!ids.includes(id));
 if(already)option.reasons.push('Este vale ya está adquirido; no se recomienda volver a comprarlo.');
 if(missing.length)option.reasons.push('Falta el vale base requerido: '+missing.join(', ')+'. Revisa la transcripción de la oferta y las adquisiciones.');
 if(already||missing.length)return {option,eligible:false,uncertain:false};
 option.limitations.push('Oferta visible registrada; no reconstruye desbloqueos del perfil. Esta proyección no implementa una transacción de vale en H2.');
 if(!supportsVoucher(entry.id)){
  option.limitations.push('Efecto documental sin integración en H2; no modifica precios, recursos, cartas ni ofertas futuras.');
  option.reasons.push('Puede tener utilidad según el plan real; su nombre y descripción no cuantifican una mejora de la composición.');
  return {option,eligible:false,uncertain:option.affordability==='unknown'};
 }
 option.coverage=requireObserved?'limited':'modeled';voucherProjection(state,entry.id,ids,option);
 if(requireObserved)option.limitations.push('Modo estricto: L06 y vouchers.resources tienen inspección estática, sin observación de partida. La proyección documental del vale no habilita recomendar su compra con evidencia observada.');
 let useful=Object.keys(option.resourceChanges??{}).some(k=>k!=='interestCap');
 if(entry.id==='v_antimatter'){
  const slots=value(state.observed.resources.jokerSlots),owned=value(state.observed.jokers);
  useful=slots!==undefined&&owned!==undefined&&owned.length>=slots;
  option.reasons.push(useful?'El espacio adicional permitiría considerar una compra con inventario lleno.':'Sin inventario lleno registrado, no demuestra necesidad inmediata de otro espacio.');
 }
 if(entry.id==='v_blank')option.reasons.push('Blank no aporta un efecto a esta partida; no se supone que Antimatter aparecerá después.');
 if(entry.id==='v_seed_money'||entry.id==='v_money_tree'){
  const previous=ids.includes('v_money_tree')?20:ids.includes('v_seed_money')?10:5;
  useful=(option.resourceChanges?.interestCap??0)>previous&&option.moneyAfter!==null&&option.moneyAfter>=(previous+1)*5;
  if(!useful)option.reasons.push('El saldo posterior no demuestra aprovechar ahora el tope mayor; conservar dinero puede convenir.');
 }
 return {option,eligible:!requireObserved&&useful&&option.affordability==='affordable',uncertain:option.affordability!=='unaffordable'&&(requireObserved||option.affordability==='unknown'||!option.resourceChanges)};
}

function evaluatePack(state:GameState,offer:ShopSnapshot['packs'][number],report:CompositionReport):ShopOption {
 const pack=BOOSTER_CATALOG.find(p=>p.family===offer.family&&p.size===offer.size)!;
 const option:ShopOption={id:offer.offerId,kind:'pack',title:pack.name,...cost(state,offer.price),coverage:'unknown',reasons:[`Sobre cerrado: muestra ${pack.offered} cartas y permite hasta ${pack.choose} elecciones. Contenido actual desconocido. Precio base de referencia $${pack.basePrice}; prevalece el precio transcrito.`],limitations:['Abrir y elegir son eventos distintos. No se simula contenido, selección, uso, omisión ni crecimiento. No produce una mejora exacta ni valor esperado.']};
 const has=(id:string)=>value(state.observed.jokers)?.some(j=>key(j.catalogId)===id)??false;
 switch(offer.family){
  case 'arcana':
   option.reasons.push('Oportunidad de modificar material con Tarot; depende de la carta y sus objetivos. No se presupone añadir un consumible al inventario.');
   if(has('baron')&&report.material.kings===0)option.reasons.push('Barón no tiene reyes en el mazo actual. Solo interesa preparar ese material si el Tarot visible permite hacerlo; abrir no crea un rey.');
   if(has('mime')&&report.material.steel===0&&report.material.gold===0&&report.material.blueSeals===0)option.reasons.push('Mimo carece de Acero, Oro y sellos azules registrados. Un Tarot compatible podría preparar retención; no se garantiza que esté en este sobre.');
   if(has('fortune_teller'))option.reasons.push('Fortune Teller requiere usar el Tarot; abrir un sobre no suma su contador.');
   if(value(state.observed.outOfScope)?.vouchers.includes('v_omen_globe'))option.reasons.push('Omen Globe permite contenido Spectral; no garantiza Tarot ni una carta específica.');break;
  case 'celestial':option.reasons.push('Oportunidad de mejorar una mano con un planeta que todavía no se conoce. Telescope necesita historial de manos jugadas; no se promete el planeta por nivel o intención.');if(has('astronomer'))option.reasons.push('Astronomer puede hacer gratuito Celestial; usa el precio visto, no se infiere su utilidad por ser gratis.');if(has('constellation'))option.reasons.push('Constelación crece al usar un planeta; verlo o abrir el sobre no acredita esa activación.');break;
  case 'standard':option.reasons.push('Oportunidad de añadir material; una carta nueva también diluye el mazo. Abrir no añade una carta ni desarrolla Holograma.');if(has('hologram'))option.reasons.push('Holograma tiene un mecanismo compatible con añadir cartas. Su beneficio depende de una elección real; no se incrementa su XMult por este consejo.');if(has('erosion'))option.reasons.push('Añadir cartas puede reducir el soporte de Erosión; hacen falta las elecciones reales.');break;
  case 'spectral':option.reasons.push('Oportunidad de transformar la composición con costes y objetivos específicos; el efecto permanece desconocido mientras esté cerrado.');break;
  case 'buffoon':{const owned=value(state.observed.jokers),slots=value(state.observed.resources.jokerSlots);option.reasons.push(report.roles.some(r=>r.status==='missing')?'Puede buscar un rol sin soporte actual, sin asegurar que aparezca.':'Puede buscar otro comodín, sin asegurar un reemplazo mejor.');if(owned&&slots!==undefined&&owned.length>=slots)option.reasons.push('Inventario lleno: elegir un comodín normal exige venta previa; abrir no libera un espacio y la edición negativa no se presume.');break;}
 }
 if(has('hallucination')||has('red_card')||has('hologram'))option.limitations.push('Los eventos de abrir, omitir o añadir carta son distintos: no se activan automáticamente los comodines relacionados.');
 costReasons(option,state);return option;
}

/** Pure advice: validates H1 and a copied snapshot, never mutates either. */
export function evaluateShopContext(input:GameState,snapshotInput:ShopSnapshot,options:{ante?:number;requireObserved?:boolean}={}):ShopContextResult {
 const checked=validateState(input),snapshot=validateShopSnapshot(snapshotInput);
 if(!checked.ok||!snapshot.ok)return result([...(checked.ok?[]:checked.errors),...(snapshot.ok?[]:snapshot.errors)]);
 const state=checked.value,shop=snapshot.value,report=evaluateComposition(state,options),ante=options.ante??value(state.observed.nextBlind)?.ante;
 const output=result(),hold:ShopOption={id:'hold',kind:'hold',title:'Ahorrar',price:0,moneyAfter:value(state.observed.money)??null,affordability:'affordable',coverage:'modeled',reasons:['Conserva saldo y los comodines actuales. No supone ingresos futuros ni espera una oferta específica.'],limitations:[]};
 const requireObserved=options.requireObserved??false;
 const assessed=[...shop.jokers.map(offer=>evaluateJoker(state,offer,report,ante,requireObserved)),...shop.vouchers.map(offer=>evaluateVoucher(state,offer,requireObserved))];
 const packs=shop.packs.map(offer=>evaluatePack(state,offer,report));
 const reroll:ShopOption={id:'reroll',kind:'reroll',title:'Renovar ofertas',...cost(state,shop.rerollCost),coverage:'unknown',reasons:['El coste actual solo compra información nueva: las ofertas posteriores son desconocidas y no se garantiza una mejora. Renueva el área de cartas; conserva sobres y vale.'],limitations:['No genera nuevo stock ni aplica eventos de reroll. El siguiente precio y los rerolls gratuitos necesitan observación real.']};
 costReasons(reroll,state);
 const others=(shop.others??[]).map(offer=>{const option:ShopOption={id:offer.offerId,kind:'other',title:offer.name,...cost(state,offer.price),coverage:'unknown',reasons:[`Oferta manual ${offer.kind}: ${offer.name}. Se conserva el nombre transcrito, sin inferir un efecto por su texto.`],limitations:['No se puntúa: falta identidad mecánica, objetivos y evento de compra/uso compatible. Puede cambiar la elección; no se ignora al comparar.']};costReasons(option,state);return option;});
 output.options=[hold,...assessed.map(a=>a.option),...packs,reroll,...others];
 if(shop.jokers.length+(shop.others?.length??0)>2){
  output.limitations.push('Hay más de dos ofertas de cartas transcritas. Puede corresponder a modificadores reales; no habilita en H2 una tienda ampliada.');
  for(const evaluated of assessed.filter(a=>a.option.kind==='joker')){
   evaluated.option.coverage='limited';
   evaluated.option.limitations.push('H2 valida la oferta aislada; no certifica esta tienda ampliada ni sus modificadores.');
  }
 }
 const candidates=assessed.filter(a=>a.eligible).map(a=>a.option),uncertain=assessed.filter(a=>a.uncertain).map(a=>a.option);
 const unscored=others.filter(o=>o.affordability!=='unaffordable');
 if(unscored.length){
  output.recommendation={status:'abstain',title:'Falta valorar las otras cartas visibles',offerIds:[...candidates,...unscored].map(o=>o.id),reasons:['Hay ofertas manuales sin efecto evaluado que pueden cambiar la elección. Registra su identidad y objetivos antes de preferir una compra.']};
 }else if(candidates.length>1){
  output.recommendation={status:'tie',title:'Hay varias compras condicionadas',offerIds:candidates.map(o=>o.id),reasons:['Estas ofertas atienden necesidades conocidas; no hay una escala común para decidir entre sus efectos y costes. Elige según la condición que puedas usar y el saldo que quieras conservar.']};
 }else if(candidates.length===1){
  const candidate=candidates[0]!;output.recommendation={status:'conditional',title:`Considera ${candidate.title}`,offerIds:[candidate.id],reasons: [candidate.kind==='joker'?`Encaje preparado respecto a la referencia ${FIT_INDEX_POLICY.positive}, con rol faltante o relación apoyada por el estado actual.`:'Aporta un recurso persistente pertinente al estado registrado.',...candidate.reasons]};
  if(candidate.fit?.purchase.status==='unknown')output.recommendation.reasons.push('La recomendación depende de comprobar la transacción real: H2 conserva su estado desconocido.');
  if(uncertain.length)output.recommendation.reasons.push('Otras ofertas tienen datos pendientes y podrían cambiar la elección: '+uncertain.map(o=>o.title).join(', ')+'.');
 }else if(uncertain.length){
  output.recommendation={status:'abstain',title:'Faltan datos para decidir una compra',offerIds:uncertain.map(o=>o.id),reasons:['No se convierte dinero, capacidad, material, contador o transacción desconocidos en una mejora. Conserva los límites de cada oferta y completa esos datos.']};
 }else{
  output.recommendation={status:'conditional',title:'Ahorra mientras no haya una mejora conocida',offerIds:['hold'],reasons:['Las ofertas conocidas no muestran una compra preparada que cubra una necesidad actual sin sacrificar desarrollo útil. Ahorrar conserva saldo y opciones.',...(packs.length?['El contenido de los sobres sigue desconocido; abrirlos depende de un objetivo concreto.']:[]),'Renovar tiene coste conocido o pendiente y stock futuro desconocido; no promete una oferta mejor.']};
 }
 if(packs.some(o=>o.affordability!=='unaffordable')||reroll.affordability!=='unaffordable')output.recommendation.reasons.push('Sobres y renovación permanecen alternativas condicionadas con contenido desconocido; no se demuestra una elección óptima.');
 return output;
}
