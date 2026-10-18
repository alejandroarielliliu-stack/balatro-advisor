import type {GameState,Fact,JokerInstance,Issue} from '../state/model.js';
import {validateState} from '../state/validation.js';
import {ALL_JOKER_FACTS} from '../catalog/all-joker-facts.js';
import {standardDeck,jokerDefinition} from '../catalog/initial.js';
import type {Card} from '../catalog/initial.js';
import {initialCounters,counterSpecs} from '../catalog/joker-counters.js';
import {applyShopAction} from '../rules/shop.js';
import {FIT_PROFILES} from './fit-profiles.js';
import type {FitProfile,FitRole} from './fit-profiles.js';
import {inspectCompositions} from './composition-signals.js';
import {FIT_INDEX_POLICY,FIT_MAGNITUDE_COUNTERS,indexRound,stageValue,materialValue,scarceStageCap,magnitudeValue} from './fit-index.js';

/** Editorial index, never a hand score, probability, survival verdict or tier list. */
export const FIT_POLICY=FIT_INDEX_POLICY.id;
export const FIT_AXES={stage:4,readiness:3,integration:3} as const;
/** Editorial bands of known deck composition, never probabilities of draws. */
export const FIT_MATERIAL_BANDS={moderate:1/4,strong:1/2} as const;
export interface FitOptions {ante?:number;instanceId?:string;purchase?:boolean;replacementId?:string;intendedHand?:string;requireObserved?:boolean;offer?:{price:Fact<number>;edition:Fact<string>;stickers:Fact<string[]>}}
export interface FitSignal {id:string;kind:'fact'|'heuristic'|'potential'|'conflict';text:string}
export interface QuickFit {
 id:string;instanceId?:string;policy:string;score:number|null;range:[number,number|null]|null;
 magnitude:{bonus:number|null;reason:string};
 stage:'early'|'middle'|'late'|'unknown';readiness:'ready'|'potential'|'unavailable'|'unknown';roles:FitRole[];
 axes:{key:keyof typeof FIT_AXES;value:number|null;max:number;reason:string}[];signals:FitSignal[];limitations:string[];
 purchase:{status:'legal'|'illegal'|'unknown'|'not-requested';netCost?:number;moneyAfter?:number;errors:Issue[];limitations:string[]};
}
const v=<T>(fact:Fact<T>|undefined):T|undefined=>fact?.status==='known'?fact.value:undefined;
const k=<T>(value:T):Fact<T>=>({status:'known',source:'manual',value});
const engineId=(id:string)=>Object.hasOwn(ALL_JOKER_FACTS,id)?id:Object.keys(ALL_JOKER_FACTS).find(key=>ALL_JOKER_FACTS[key]!.artId===id);
const artId=(id:string)=>ALL_JOKER_FACTS[engineId(id)??'']?.artId??id;
function cardsOf(state:GameState):Card[]|undefined {
 const deck=v(state.observed.deck);if(!deck)return undefined;
 if('cards' in deck)return deck.cards;
 if(deck.preset!=='standard52-unmodified'||['abandoned','checkered','erratic'].includes(v(state.observed.deckId)??''))return undefined;
 return standardDeck();
}
interface Preparation {value:number|null;status:QuickFit['readiness'];reason:string;signal?:FitSignal;materialRatio?:number}
const ready=(reason:string):Preparation=>({value:3,status:'ready',reason});
const possible=(reason:string):Preparation=>({value:2,status:'potential',reason});
const missing=(reason:string):Preparation=>({value:null,status:'unknown',reason});
const absent=(reason:string):Preparation=>({value:0,status:'unavailable',reason});
const future=(reason:string):Preparation=>({value:1,status:'potential',reason});
function preparation(state:GameState,profile:FitProfile,instance:JokerInstance|undefined,options:FitOptions):Preparation {
 const id=profile.id,cards=cardsOf(state),owned=v(state.observed.jokers),has=(key:string)=>owned?.some(j=>artId(j.catalogId)===key)??false;
 const usable=cards?.filter(c=>!c.debuff),count=(predicate:(c:Card)=>boolean)=>usable?.filter(predicate).length;
 const material=(n:number|undefined,label:string):Preparation=>{
  if(n===undefined||!cards?.length)return missing('Falta la composición actual del mazo.');
  if(n===0)return absent('Sin '+label+' en el mazo.');
  const ratio=n/cards.length,band=ratio>=FIT_MATERIAL_BANDS.strong?'abundante':ratio>=FIT_MATERIAL_BANDS.moderate?'moderado':'escaso';
  return {value:materialValue(ratio),materialRatio:ratio,status:'potential',reason:`${n}/${cards.length} ${label}; soporte ${band}. Requiere robarlas y utilizarlas.`};
 };
 const faces=count(c=>has('j_pareidolia')||c.enhancement!=='stone'&&['J','Q','K'].includes(c.rank));
 if(id==='j_stencil'){
  const slots=v(state.observed.resources.jokerSlots);if(!owned||slots===undefined)return missing('Falta capacidad o inventario para contar huecos.');
  const count=owned.filter(j=>artId(j.catalogId)==='j_stencil').length+(instance?0:1),occupied=owned.length+(instance?0:1),factor=slots-occupied+count;
  return factor>1?ready(`Stencil tiene soporte de ${slots-occupied} huecos y ${count} Stencil; llenar huecos lo reduce.`):absent('Sin huecos útiles: Stencil no multiplica por encima de ×1.');
 }
 if(id==='j_riff_raff'){
  const slots=v(state.observed.resources.jokerSlots);
  if(!owned||slots===undefined)return missing('Falta inventario o capacidad para comprobar los huecos después de añadir Riff-Raff.');
  // H2's capacity already includes Negative's extra slot. Every physical card
  // occupies one place; excluding Negative again would count its slot twice.
  const occupied=owned.length+(instance?0:1),room=slots-occupied,maximum=Math.min(2,room);
  return room<=0?absent(`Sin huecos ${instance?'en el inventario actual':'tras esta adquisición'}: Riff-Raff necesita liberar espacio antes de activarse. No se supone una venta ni una destrucción futura.`):
   possible(`Hasta ${maximum} ${maximum===1?'comodín común cabría':'comodines comunes cabrían'} al seleccionar la ciega con este inventario. Su identidad y utilidad siguen desconocidas; no son dinero ni puntuación garantizados.`);
 }
 if(id==='j_credit_card'){
  const money=v(state.observed.money);
  if(money===undefined)return missing('Falta el saldo para conocer la necesidad de crédito; Credit Card no añade dinero ni ingresos.');
  const inUse=!!instance&&money<0;
  const p=inUse?ready(`Saldo $${money}: el crédito poseído respalda deuda ya registrada. No es ingreso ni saldo disponible.`):
   possible(`Saldo $${money}: Credit Card permite hasta $20 de deuda adicional, pero falta demostrar una compra útil que necesite esa financiación. No añade dinero ni puntuación.`);
  p.signal={id:'credit-need',kind:inUse?'fact':'heuristic',text:p.reason};return p;
 }
 if(id==='j_baseball'){
  if(!owned)return missing('Falta el inventario para contar comodines inusuales.');
  const n=owned.filter(j=>ALL_JOKER_FACTS[j.catalogId]?.rarity===2).length;
  return n?ready(`${n} comodines inusuales físicos apoyan Baseball.`):absent('Sin comodines inusuales que Baseball pueda potenciar.');
 }
 if(id==='j_swashbuckler'){
  if(!owned||owned.filter(j=>j.instanceId!==instance?.instanceId).some(j=>v(j.sellValue)===undefined))return missing('Faltan los valores de venta de los otros comodines.');
  const n=owned.filter(j=>j.instanceId!==instance?.instanceId).reduce((sum,j)=>sum+v(j.sellValue)!,0);
  return n?ready(`Otros comodines suman $${n} de venta: soporte de Swashbuckler.`):absent('Sin valor de venta de otros comodines que aporte Mult.');
 }
 if(id==='j_drivers_license'){
  const n=cards?.filter(c=>c.enhancement!=='none').length;
  return n===undefined?missing('Falta contar las mejoras del mazo completo.'):n<16?absent(`${n}/16 cartas mejoradas: no cumple el requisito.`):ready(`${n}/16 cartas mejoradas: requisito del mazo cumplido.`);
 }
 if(id==='j_stone'){
  const n=cards?.filter(c=>c.enhancement==='stone').length;
  return n===undefined?missing('Falta contar Piedra en el mazo completo.'):n?ready(`${n} cartas de Piedra en el mazo completo.`):absent('Sin Piedra en el mazo.');
 }
 if(id==='j_seeing_double'){
  const clubs=count(c=>c.enhancement!=='stone'&&(c.suit==='C'||c.enhancement==='wild'||has('j_smeared')&&c.suit==='S'));
  const other=count(c=>c.enhancement!=='stone'&&(c.suit!=='C'||c.enhancement==='wild'||has('j_smeared')));
  return clubs===undefined||other===undefined?missing('Falta comprobar tréboles y otro palo en el mazo.'):clubs===0||other===0?absent('Seeing Double necesita un trébol y otra carta de otro palo.'):possible('Hay material para trébol y otro palo; deben puntuar dos cartas distintas.');
 }
 if(id==='j_vagabond'){
  const money=v(state.observed.money);return money===undefined?missing('Falta el saldo: Vagabond exige $4 o menos.'):money>4?absent(`Saldo $${money}: supera el límite $4 de Vagabond.`):possible(`Saldo $${money} cumple; generar Tarot también requiere jugar y espacio de consumibles.`);
 }
 if(id==='j_mystic_summit'){
  const n=v(state.observed.resources.discardsPerRound);return has('j_burglar')||n===0?ready('Cero descartes al iniciar la ciega: Cumbre mística tiene soporte.'):n===undefined?missing('Falta conocer los descartes disponibles.'):possible('Cumbre mística exige agotar los descartes; no se supone que lo harás.');
 }
 if(['j_burnt','j_trading','j_delayed_grat'].includes(id)&&has('j_burglar'))return absent('Ladrón elimina los descartes; pierde la condición basada en usar o conservar descartes.');
 if(id==='j_mime'){
  const steel=count(c=>c.enhancement==='steel');
  const supported=count(c=>c.enhancement==='steel'||c.enhancement==='gold'||c.seal==='blue'||has('j_baron')&&c.enhancement!=='stone'&&c.rank==='K'||has('j_shoot_the_moon')&&c.enhancement!=='stone'&&c.rank==='Q');
  const p=material(supported,'cartas con soporte de retención');p.signal={id:'steel-held',kind:'potential',text:steel===undefined?'Acero retenido: composición desconocida.':`${steel} Acero en el mazo. Mimo exige conservar la carta en mano; no repite Steel Joker.`};return p;
 }
 if(id==='j_steel_joker'){
  const n=cards?.filter(c=>c.enhancement==='steel').length;
  return n===undefined?missing('Falta el número de cartas de Acero del mazo completo.'):n===0?absent('Sin Acero: no aumenta su multiplicador.'):ready(`${n} cartas de Acero en el mazo completo; no exige retenerlas.`);
 }
 if(id==='j_erosion'){
  const initial=v(v(state.observed.jokerContext)?.startingDeckSize),current=cards?.length;
  const p=initial===undefined||current===undefined?missing('Falta el tamaño inicial o actual del mazo; no se supone 52.'):
   current<initial?ready(`Mazo reducido: ${current} cartas de ${initial} iniciales.`):absent(`Mazo ${current}/${initial}: sin reducción que active Erosión.`);
  p.signal={id:'erosion-size',kind:p.status==='ready'?'fact':'potential',text:p.reason};return p;
 }
 if(id==='j_walkie_talkie')return material(count(c=>['4','10'].includes(c.rank)),'cuatros o dieces');
 if(id==='j_hack')return material(count(c=>['2','3','4','5'].includes(c.rank)&&c.enhancement!=='stone'),'rangos 2, 3, 4 o 5');
 if(id==='j_cloud_9'){
  const n=cards?.filter(c=>c.rank==='9'&&c.enhancement!=='stone').length;
  return n===undefined?missing('Falta contar nueves del mazo completo.'):n?ready(`${n} nueves registrados apoyan su ingreso; sigue condicionado al final de ronda.`):absent('Sin nueves en el mazo.');
 }
 if(id==='j_ride_the_bus'&&has('j_pareidolia'))return absent('Pareidolia convierte las cartas puntuadas en figuras y reinicia Ride the Bus al jugar.');
 if(id==='j_triboulet')return material(count(c=>['Q','K'].includes(c.rank)&&c.enhancement!=='stone'),'reinas o reyes');
 if(id==='j_baron')return material(count(c=>c.rank==='K'&&c.enhancement!=='stone'),'reyes que podrías conservar');
 if(id==='j_shoot_the_moon')return material(count(c=>c.rank==='Q'&&c.enhancement!=='stone'),'reinas que podrías conservar');
 if(id==='j_raised_fist')return cards?possible('Depende de la carta de menor rango que conserves en mano.'):missing('Falta el mazo; no se conoce la carta que conservarás.');
 if(id==='j_banner'&&has('j_burglar'))return absent('Ladrón elimina los descartes al seleccionar la ciega; Estandarte pierde ese soporte.');
 if(id==='j_photograph')return material(faces,'figuras puntuables');
 if(id==='j_cavendish')return v(v(state.observed.jokerContext)?.grosMichelExtinct)===true?ready('Gros Michel extinto registrado; todavía puede destruirse.'):missing('Falta confirmar Gros Michel extinto; no se presupone su disponibilidad.');
 const context=v(state.observed.jokerContext);
 switch(profile.condition){
  case 'always':return ready(profile.detail);
  case 'suit_spades':case 'suit_hearts':case 'suit_clubs':case 'suit_diamonds':{
   const suit=({suit_spades:'S',suit_hearts:'H',suit_clubs:'C',suit_diamonds:'D'} as const)[profile.condition],sameColor=(s:string)=>['S','C'].includes(s)===['S','C'].includes(suit);
   return material(count(c=>c.enhancement!=='stone'&&(c.suit===suit||c.enhancement==='wild'||has('j_smeared')&&sameColor(c.suit))),'cartas que pueden cumplir el palo requerido');
  }
  case 'faces':return material(faces,'figuras puntuables');
  case 'no_faces':return faces===undefined?missing('Falta la composición del mazo.'):faces===0?ready('El mazo no tiene figuras puntuables.'):possible(`${faces} figuras: debes evitar puntuarlas para mantener el efecto.`);
  case 'even':return material(count(c=>['2','4','6','8','10'].includes(c.rank)&&c.enhancement!=='stone'),'rangos pares');
  case 'odd':return material(count(c=>['A','3','5','7','9'].includes(c.rank)&&c.enhancement!=='stone'),'rangos impares');
  case 'ace':return material(count(c=>c.rank==='A'&&c.enhancement!=='stone'),'ases');
  case 'fibonacci':return material(count(c=>['A','2','3','5','8'].includes(c.rank)&&c.enhancement!=='stone'),'rangos Fibonacci');
  case 'steel':return material(count(c=>c.enhancement==='steel'),'cartas de Acero');
  case 'gold':return material(count(c=>c.enhancement==='gold'),'cartas de Oro');
  case 'stone':return material(count(c=>c.enhancement==='stone'),'cartas de Piedra');
  case 'enhanced':return material(count(c=>c.enhancement!=='none'),'cartas mejoradas');
  case 'small_hand':return possible('Puedes jugar tres cartas o menos; su utilidad depende de las manos que elijas.');
  case 'pair':case 'three_kind':case 'two_pair':case 'four_kind':case 'straight':case 'flush':{
   if(!cards)return missing('Falta el mazo para valorar el material de la mano requerida.');
   const ranks=new Map<string,number>();for(const c of usable??[])if(c.enhancement!=='stone')ranks.set(c.rank,(ranks.get(c.rank)??0)+1);
   const counts=[...ranks.values()],required=profile.condition==='four_kind'?4:profile.condition==='three_kind'?3:2;
   if(['pair','three_kind','four_kind'].includes(profile.condition)&&!counts.some(n=>n>=required))return absent('Sin suficientes copias de un rango para la condición.');
   if(profile.condition==='two_pair'&&counts.filter(n=>n>=2).length<2)return absent('Sin dos rangos con parejas disponibles.');
   if(profile.condition==='flush'&&!(['S','H','D','C'] as const).some(s=>(usable??[]).filter(c=>c.enhancement!=='stone'&&(c.suit===s||c.enhancement==='wild')).length>=5))return absent('Sin cinco cartas de un palo para un color normal.');
   if(profile.condition==='straight'){
    const ranksInOrder=['A','2','3','4','5','6','7','8','9','10','J','Q','K','A'];let supported=false;
    for(let i=0;i<10;i++)if(ranksInOrder.slice(i,i+5).every(r=>ranks.has(r)))supported=true;
    if(!supported&&!has('j_four_fingers')&&!has('j_shortcut'))return absent('Sin una escalera normal disponible en la composición.');
   }
   return possible(`Material para ${profile.condition}${options.intendedHand?' · intención '+options.intendedHand:''}; no demuestra poder robar esa mano.`);
  }
  case 'money':{
   const money=v(state.observed.money);if(money===undefined)return missing('Falta el dinero actual.');
   if(id==='j_bootstraps'&&money<5||id==='j_bull'&&money<=0)return absent(`Saldo $${money}: no aporta por dinero ahora.`);
   return ready(`Saldo registrado $${money}; depende de conservar dinero.`);
  }
  case 'counter':{
   const key=engineId(id)!;
   const counters=instance?.counters??(!options.instanceId?key==='green_joker'?{greenMult:k(0)}:initialCounters(key):undefined);
   if(!counters)return missing('Falta el contador actual del comodín poseído.');
   const entries=Object.entries(counters);if(!entries.length||entries.some(([,f])=>f.status==='unknown'))return missing('Falta el contador actual; no se supone cero.');
   if(id==='j_loyalty_card'||id==='j_invisible')return possible('Progreso registrado, activación periódica o venta condicionada: '+entries.map(([name,f])=>`${name}=${v(f)}`).join(', '));
   if(id==='j_selzer')return (v(counters.hands)??0)>0?ready(`${v(counters.hands)} manos de repetición restantes; beneficio temporal.`):absent('Sin manos de repetición restantes.');
   const positive=entries.some(([name,f])=>['greenMult','chips','mult','x100','dollars','hSize'].includes(name)&&v(f)!>(name==='x100'?100:0));
   return positive?ready('Aporte registrado: '+entries.map(([name,f])=>`${name==='greenMult'?'Mult actual':counterSpecs(key)[name]?.label??name}: ${v(f)}`).join(', ')):future('Sin aporte acumulado todavía; necesita acciones para desarrollarse.');
  }
  case 'discard':{
   const n=v(state.observed.resources.discardsPerRound);return n===undefined?missing('Faltan los descartes por ronda.'):n===0?absent('Sin descartes disponibles por ronda.'):possible(`${n} descartes por ronda; el aporte depende de cuántos uses o conserves.`);
  }
  case 'deck_reduced':return missing('Este perfil exige conocer el tamaño inicial y la reducción real del mazo.');
  case 'consumables':return context?.consumables?.status==='known'?possible('Consumibles registrados; hacen falta sus objetivos y uso concreto.'):missing('Faltan los consumibles y las condiciones concretas del efecto.');
  case 'history':return missing('Requiere historial u objetivo específico: '+profile.detail);
  case 'copy':{
   if(owned===undefined)return missing('Falta el inventario y su orden.');
   const peers=owned.filter(j=>j.instanceId!==instance?.instanceId),eligible=peers.filter(j=>ALL_JOKER_FACTS[j.catalogId]?.blueprint);
   if(!eligible.length)return absent('Sin otro comodín compatible que pueda copiar.');
   if(instance){const i=owned.findIndex(j=>j.instanceId===instance.instanceId),target=id==='j_blueprint'?owned[i+1]:owned[0];
    if(!target||target.instanceId===instance.instanceId||!ALL_JOKER_FACTS[target.catalogId]?.blueprint)return absent('La posición actual no tiene un objetivo de copia compatible.');
    return possible(`Objetivo por orden: ${ALL_JOKER_FACTS[target.catalogId]!.name}. Su efecto y condiciones siguen siendo necesarios.`);
   }
   return possible(`${eligible.length} objetivos compatibles; requiere colocarlo en la posición adecuada y satisfacer las condiciones del objetivo.`);
  }
  case 'held':return cards?possible('Requiere cartas específicas conservadas en mano: '+profile.detail):missing('Falta el mazo y las cartas que conservarás en mano.');
  case 'last_hand':return possible('Solo se activa en una mano concreta de la ronda; no se supone que la necesitarás.');
  case 'random':return possible('Efecto con azar: se describe el potencial, sin generar un resultado ni una probabilidad de victoria.');
 }
}

/** Shared H2 projection for a validated state and canonical engine ID. It never
 * writes the original, confirms an action or substitutes arithmetic for H2. */
export function projectJokerPurchase(state:GameState,id:string,options:FitOptions):QuickFit['purchase']&{projectedState?:GameState} {
 const none:QuickFit['purchase']={status:'not-requested',errors:[],limitations:[]};if(!options.purchase)return none;
 const definition=jokerDefinition(id);if(!definition)return {status:'unknown',errors:[],limitations:['La transacción de este efecto queda fuera de H2.']};
 const copy=structuredClone(state);let instanceId='hypothetical:quick-fit';while(v(copy.observed.jokers)?.some(j=>j.instanceId===instanceId))instanceId='_'+instanceId;
 copy.observed.shop=k({shopId:'hypothetical:quick-fit',cardOffers:[{offerId:'quick-fit',catalogId:id,label:ALL_JOKER_FACTS[id]!.name,kind:'joker',price:structuredClone(options.offer?.price??k(definition.price)),edition:structuredClone(options.offer?.edition??k('base')),stickers:structuredClone(options.offer?.stickers??k([]))}],ignoredOtherOffers:[]});
 const result=applyShopAction(copy,options.replacementId?{type:'replace',sellInstanceId:options.replacementId,offerId:'quick-fit',instanceId}:{type:'buy',offerId:'quick-fit',instanceId},{expectedRevision:copy.revision,updatedAt:copy.updatedAt},{requireObserved:!!options.requireObserved});
 const limits=result.evidence.limitations.map(item=>item.message);
 if(!result.ok)return {status:result.errors.some(e=>['insufficient_money','no_slots','eternal_joker','missing_joker'].includes(e.code))?'illegal':'unknown',errors:result.errors,limitations:limits};
 const after=v(result.value.state.observed.money),before=v(state.observed.money);
 return {status:'legal',errors:[],limitations:limits,projectedState:result.value.state,...(after!==undefined?{moneyAfter:after}:{}),...(before!==undefined&&after!==undefined?{netCost:before-after}:{})};
}

function magnitude(profile:FitProfile,key:string,instance:JokerInstance|undefined):QuickFit['magnitude'] {
 const counter=FIT_MAGNITUDE_COUNTERS[key];
 if(profile.condition!=='counter'||!counter)return {bonus:0,reason:'Sin ajuste de magnitud implementado para este efecto; sus datos siguen en los motivos.'};
 const counters=instance?.counters??(key==='green_joker'?{greenMult:k(0)}:initialCounters(key)),value=v(counters[counter]);
 if(value===undefined)return {bonus:null,reason:'Falta el aporte actual de puntuación; no se inventa un máximo para su desarrollo.'};
 const reference=FIT_INDEX_POLICY.magnitudeReferences[counter],bonus=magnitudeValue(counter,value);
 const current=counter==='x100'?`×${value/100}`:`+${value} ${counter==='chips'?'Fichas':'Mult'}`;
 return {bonus,reason:`Aporte registrado ${current}; ajuste editorial ${FIT_INDEX_POLICY.magnitudeUnits}·log₂(1+aporte/${reference})${counter==='x100'?' sobre la ganancia en centésimas por encima de ×1':''}. Las condiciones de activación siguen aplicando; no equivale a puntos de mano.`};
}

export function evaluateJokerFit(input:GameState,catalogId:string,options:FitOptions={}):QuickFit {
 const key=engineId(catalogId),id=artId(catalogId),profile=FIT_PROFILES[id];
 const result:QuickFit={id,policy:FIT_POLICY,score:null,range:null,magnitude:{bonus:0,reason:'Sin datos evaluados.'},stage:'unknown',readiness:'unknown',roles:profile?.roles??[],axes:[],signals:[],limitations:['Índice heurístico sin validación de eficacia; no son puntos ni probabilidad de ganar. Una décima muestra resolución del modelo, no precisión predictiva.','Mecánicas respaldadas por inspección estática 1.0.1o; no observación nueva del juego.'],purchase:{status:'not-requested',errors:[],limitations:[]},...(options.instanceId?{instanceId:options.instanceId}:{})};
 const checked=validateState(input);if(!checked.ok){result.limitations.push(...checked.errors.map(e=>e.message));return result;}
 if(!profile||!key){result.limitations.push('Sin perfil estratégico para este identificador.');return result;}
 const state=checked.value,owned=v(state.observed.jokers),instance=options.instanceId?owned?.find(j=>j.instanceId===options.instanceId):undefined;
 if(options.instanceId&&options.purchase){result.purchase.status='unknown';result.limitations.push('No combines una instancia poseída con una compra nueva. Valora cada alternativa por separado; la compra usa sus contadores iniciales.');return result;}
 if(options.replacementId&&!options.purchase){result.purchase.status='unknown';result.limitations.push('Un reemplazo requiere solicitar la compra y validar la secuencia venta→compra con H2.');return result;}
 if(options.instanceId&&!instance){result.limitations.push('La instancia poseída no existe o el inventario es desconocido.');return result;}
 if(instance&&engineId(instance.catalogId)!==key){result.limitations.push('La instancia poseída no corresponde al comodín solicitado.');return result;}
 const ante=options.ante??v(state.observed.nextBlind)?.ante;
 const index=ante===undefined||!Number.isInteger(ante)||ante<1||ante>8?-1:ante<=2?0:ante<=5?1:2;
 result.stage=index===0?'early':index===1?'middle':index===2?'late':'unknown';
 const {projectedState,...purchase}=projectJokerPurchase(state,key,options);result.purchase=purchase;
 const effective=structuredClone(state);if(options.replacementId&&owned)effective.observed.jokers=k(owned.filter(j=>j.instanceId!==options.replacementId));
 if(projectedState){effective.observed.money=structuredClone(projectedState.observed.money);effective.observed.resources=structuredClone(projectedState.observed.resources);effective.observed.deck=structuredClone(projectedState.observed.deck);}
 const p=preparation(effective,profile,instance,options);result.readiness=p.status;if(p.signal)result.signals.push(p.signal);
 let stage=stageValue(ante,profile.stage),integration=owned===undefined?null:1;
 if(stage!==null&&p.materialRatio!==undefined&&p.materialRatio<FIT_INDEX_POLICY.scarceRatio&&!profile.growth){
  const cap=scarceStageCap(p.materialRatio);stage=Math.min(stage,cap);result.signals.push({id:'scarce-material',kind:'heuristic',text:`${p.reason} Poco material: limita el aporte de etapa a ${indexRound(cap*FIT_INDEX_POLICY.unitsPerBand)} de índice hasta preparar la construcción.`});
 }
 const peerProfiles=owned?.filter(j=>j.instanceId!==options.instanceId&&j.instanceId!==options.replacementId).map(j=>FIT_PROFILES[artId(j.catalogId)]).filter((p):p is FitProfile=>!!p);
 if(peerProfiles&&profile.roles.some(role=>!peerProfiles.some(p=>p.roles.includes(role))))integration=2;
 const has=(wanted:string)=>peerProfiles?.some(p=>p.id===wanted)??false;
 const cards=cardsOf(state),faces=cards?.filter(c=>!c.debuff&&(has('j_pareidolia')||c.enhancement!=='stone'&&['J','Q','K'].includes(c.rank))).length;
 if((id==='j_photograph'&&has('j_hanging_chad')||id==='j_hanging_chad'&&has('j_photograph'))&&faces!==undefined&&faces>0){
  integration=3;result.signals.push({id:'photo-chad',kind:'potential',text:'Fotografía + Chad: potencial al repetir la primera figura puntuada; hacen falta esa carta y el orden de juego.'});
 }
 if(id==='j_mime'&&cards?.some(c=>c.enhancement==='steel')||id==='j_baron'&&has('j_mime')&&cards?.some(c=>c.rank==='K'))integration=3;
 if((id==='j_banner'&&has('j_burglar'))||(id==='j_burglar'&&has('j_banner'))){integration=0;result.signals.push({id:'banner-burglar',kind:'conflict',text:'Ladrón elimina los descartes al seleccionar la ciega: Estandarte pierde su aporte por descartes.'});}
 if(['j_dna','j_marble'].includes(id)&&has('j_erosion')){integration=0;result.signals.push({id:'erosion-growth-conflict',kind:'conflict',text:'Añadir cartas aumenta el mazo y reduce el soporte de Erosión; no invalida los otros beneficios de la compra.'});}
 if((id==='j_midas_mask'&&has('j_vampire'))||(id==='j_vampire'&&has('j_midas_mask'))){integration=3;result.signals.push({id:'midas-vampire',kind:'potential',text:'Midas puede proporcionar mejoras a Vampiro; depende de figuras puntuadas y del orden de comodines.'});}
 const compositions=inspectCompositions(effective,id);result.signals.push(...compositions);
 if(compositions.some(s=>s.kind==='conflict'))integration=0;
 else if(p.status!=='unavailable'&&compositions.some(s=>s.kind==='potential'))integration=3;
 if(profile.growth){
  result.signals.push({id:'growth-horizon',kind:'heuristic',text:instance&&p.status==='ready'?'Conserva el crecimiento registrado. '+profile.growth:index===2?'Pocas ciegas hasta ante8: menos oportunidades para desarrollar una compra nueva. '+profile.growth:'Más horizonte para desarrollar el efecto, condicionado a sus acciones. '+profile.growth});
  if(instance&&p.status==='ready'&&stage!==null)stage=Math.max(stage,2);
 }
 if(v(state.observed.deckId)==='plasma'){
  result.signals.push({id:'plasma-balance',kind:'heuristic',text:'Plasma equilibra Fichas y Mult. Sin medir esos aportes no se prioriza automáticamente un rol de puntuación.'});
  if(profile.roles.some(r=>['chips','mult','xmult'].includes(r)))integration=null;
 }
 result.axes=[{key:'stage',value:stage,max:4,reason:index<0?'Indica un ante entre1 y8.':`Ante ${ante}; perfil interpolado entre los anclajes 1, 4 y 8. ${profile.detail}`},{key:'readiness',value:p.value,max:3,reason:p.reason},{key:'integration',value:integration,max:3,reason:integration===null?'Falta inventario o balance de puntuación para valorar la integración.':integration===0?'Conflicto identificado.':integration===3?'Relación potencial con soporte documentado.':integration===2?'Añade una función ausente del inventario.':'Función presente, sin relación específica demostrada.'}];
 result.signals.unshift({id:'preparation',kind:p.status==='ready'?'fact':p.status==='unavailable'?'conflict':'potential',text:p.reason});
 result.magnitude=magnitude(profile,key,instance);
 if(p.status==='unavailable')result.magnitude={bonus:0,reason:'Condición no disponible: el aporte registrado no elimina este bloqueo.'};
 const lower=result.axes.reduce((sum,a)=>sum+(a.value??0)*FIT_INDEX_POLICY.unitsPerBand,0)+(result.magnitude.bonus??0);
 const upper=result.magnitude.bonus===null?null:result.axes.reduce((sum,a)=>sum+(a.value??a.max)*FIT_INDEX_POLICY.unitsPerBand,0)+result.magnitude.bonus;
 const cap=p.status==='unavailable'?FIT_INDEX_POLICY.unavailableCap:null;
 result.range=[indexRound(cap===null?lower:Math.min(cap,lower)),upper===null?(cap===null?null:cap):indexRound(cap===null?upper:Math.min(cap,upper))];
 if(result.axes.every(a=>a.value!==null)&&result.magnitude.bonus!==null)result.score=result.range[0];
 if(p.status==='unknown')result.limitations.push(p.reason);
 if(options.purchase&&result.purchase.status==='legal'){
  if(owned?.some(j=>['bull','bootstraps'].includes(j.catalogId))&&(result.purchase.netCost??0)>0)result.signals.push({id:'spending-money-scalers',kind:'conflict',text:`Gastar $${result.purchase.netCost} reduce el soporte económico de Bull/Bootstraps; saldo posterior $${result.purchase.moneyAfter}. La nota no suma esa pérdida como puntos.`});
  if(options.replacementId){const sold=owned?.find(j=>j.instanceId===options.replacementId);if(sold)result.signals.push({id:'replacement-loss',kind:'conflict',text:`Vender ${ALL_JOKER_FACTS[sold.catalogId]?.name??sold.catalogId} sacrifica su efecto y sus contadores (${Object.entries(sold.counters).map(([name,f])=>name+'='+ (v(f)??'desconocido')).join(', ')||'sin contador registrado'}). La compra no hereda ese desarrollo.`});}
 }
 if(result.purchase.status==='unknown')result.limitations.push('Encaje descriptivo; la transacción no se pudo validar con H2.');
 return result;
}
export function evaluateOwnedFits(state:GameState,options:Pick<FitOptions,'ante'|'intendedHand'>={}):QuickFit[] {
 return (v(state.observed.jokers)??[]).map(j=>evaluateJokerFit(state,j.catalogId,{...options,instanceId:j.instanceId}));
}
