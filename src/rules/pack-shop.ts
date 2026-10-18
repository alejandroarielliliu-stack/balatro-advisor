import {BOOSTER_CATALOG} from '../catalog/booster-catalog.js';
import {ALL_JOKER_FACTS} from '../catalog/all-joker-facts.js';
import {counterSpecs} from '../catalog/joker-counters.js';
import type {GameStateV02,JokerInstance} from '../state/model.js';
import {packActionSchema} from '../state/pack-contract.js';
import type {PackAction,PackContext,PackEntry} from '../state/pack-contract.js';
import {checkJsonValue} from '../state/schema.js';
import {validateState} from '../state/validation.js';
import {bankBalance,creditLimit} from './economic-jokers.js';
import {deckCards,fail,inventory,need,run,safe,stateInput,synchronizeResourceFacts,valueFact} from './core.js';
import type {EngineOptions,EngineResult} from './core.js';
import type {Mutation} from './shop.js';
import {acquireObservedJoker,freshJokerInstance,sellObservedJoker} from './shop.js';
import {effectiveJokers} from './joker-context.js';
import {generationEvent,generationShopPrice} from './generation-jokers.js';
import {applyPlanetUse,PLANET_HANDS} from './planet.js';
import {applyTargetedTarotUse,tarotDefinition} from './tarot.js';
import type {TarotCardChange} from './tarot.js';

export interface PackChange {state:GameStateV02;limitations:string[];cardChanges:TarotCardChange[];steps:GameStateV02[]}
type Definition=typeof BOOSTER_CATALOG[number];
function definition(id:string):Definition{
 const pack=BOOSTER_CATALOG.find(item=>item.id===id);
 if(!pack||!['buffoon','celestial','arcana'].includes(pack.family))fail('$pack.catalogId','unsupported_pack','Solo se admite abrir Buffoon, Celestial y Arcana en este lote.');
 return pack;
}
function opened(state:GameStateV02):PackContext{
 if(state.phase!=='open_pack')fail('$.phase','wrong_phase','Primero compra y abre el sobre observado.');
 if(!state.phaseData.context)fail('$.phaseData.context','missing_pack_context','Esta apertura antigua no tiene contexto de compra y elecciones. Corrige sus datos explícitamente; no se reconstruye el pago.');
 const context=state.phaseData.context;
 if(state.phaseData.returnTo!=='shop'||need(state.phaseData.packId,'$.phaseData.packId')!==context.offerId)fail('$.phaseData','incompatible_pack_context','La apertura no coincide con la oferta original de la tienda.');
 const shop=need(state.observed.shop,'$.observed.shop');
 if(shop.shopId!==context.shopId)fail('$.observed.shop','incompatible_pack_context','La tienda registrada no corresponde al sobre abierto.');
 if(shop.packOffers?.some(offer=>offer.offerId===context.offerId))fail('$.observed.shop.packOffers','incompatible_pack_context','La oferta del sobre abierto todavía figura disponible; corrige el registro antes de continuar.');
 const pack=definition(context.catalogId);
 if(context.remainingChoices<1||context.remainingChoices>pack.choose||context.selectedEntryIds.length+context.remainingChoices!==pack.choose)fail('$.phaseData.context','incompatible_pack_context','Las elecciones restantes no coinciden con el tamaño del sobre.');
 return context;
}
function close(state:GameStateV02,context:PackContext){
 Object.assign(state,{phase:'shop',phaseData:{origin:structuredClone(context.shopOrigin)}});
}
function validateContents(contents:PackEntry[],pack:Definition){
 if(contents.length!==pack.offered)fail('$action.contents','incomplete_pack_contents',`Transcribe las ${pack.offered} entradas visibles del sobre; no se genera su contenido.`);
 const entries=new Set<string>(),instances=new Set<string>();
 for(const entry of contents){
  if(entries.has(entry.entryId))fail('$action.contents','duplicate_id','Cada entrada del sobre necesita un ID único.');entries.add(entry.entryId);
  if(entry.kind==='unsupported')continue;
  if(pack.family==='buffoon'&&entry.kind!=='joker'||pack.family==='celestial'&&entry.kind!=='planet'||pack.family==='arcana'&&entry.kind!=='tarot')fail('$action.contents','incompatible_pack_item','El tipo de carta no coincide con la familia del sobre.');
  if(entry.kind==='planet'&&!PLANET_HANDS[entry.catalogId])fail('$action.contents','unsupported_planet','Registra este contenido como no compatible; no es uno de los doce Planet implementados.');
  if(entry.kind==='tarot'&&!tarotDefinition(entry.catalogId))fail('$action.contents','unsupported_tarot','Registra este contenido como no compatible; no es uno de los doce Tarot dirigidos implementados.');
  if(entry.kind==='joker'){
   if(instances.has(entry.joker.instanceId))fail('$action.contents','duplicate_id','Dos comodines del sobre no pueden tener la misma instancia.');instances.add(entry.joker.instanceId);
  }
 }
}
function packHand(state:GameStateV02,cardIds:readonly string[],path='$action.cardIds'){
 const cards=deckCards(state),available=new Set(cards.map(card=>card.instanceId));
 if(new Set(cardIds).size!==cardIds.length)fail(path,'duplicate_id','Cada carta de la mano del sobre debe tener un ID distinto.');
 for(const id of cardIds)if(!available.has(id))fail(path,'unknown_card','La carta observada no existe en el mazo registrado: '+id+'.');
 const size=state.observed.resources.handSize;
 if(size.status==='known'){
  if(cardIds.length>size.value)fail(path,'hand_too_large','La mano del sobre supera el tamaño registrado. Corrige los datos explícitamente.');
  // SHOP-origin Arcana draws once from the returned full deck. These twelve
  // effects neither draw nor destroy cards, so Mega keeps this exact count.
  const expected=Math.min(cards.length,size.value);
  if(cardIds.length!==expected)fail(path,'incomplete_pack_hand',`Registra las ${expected} cartas visibles de la mano de Arcana; se recibieron ${cardIds.length}. No se completan con robos hipotéticos.`);
 }
}
function freshObserved(joker:JokerInstance){
 if(!ALL_JOKER_FACTS[joker.catalogId])fail('$joker.catalogId','unsupported_joker','Comodín fuera del catálogo.');
 if(ALL_JOKER_FACTS[joker.catalogId]!.rarity===4)fail('$joker.catalogId','unsupported_pack_item','Los legendarios no pertenecen a la generación Buffoon normal de este alcance.');
 if(need(joker.stickers,'$joker.stickers').length)fail('$joker.stickers','unsupported_modifier','Los Buffoon de White Stake de este alcance no generan pegatinas.');
 const expected=freshJokerInstance(joker.catalogId,joker.instanceId,need(joker.edition,'$joker.edition'));
 if(need(joker.sellValue,'$joker.sellValue')!==need(expected.sellValue,'$expected.sellValue'))fail('$joker.sellValue','unsupported_price','El valor de venta observado no coincide con una instancia nueva sin descuentos.');
 for(const key of Object.keys(joker.counters))if(!Object.hasOwn(expected.counters,key)&&key!=='extraSell')fail('$joker.counters.'+key,'unsupported_counter','Contador no compatible con un comodín nuevo.');
 for(const [key,fact] of Object.entries(expected.counters)){
  const actual=joker.counters[key];if(!actual)fail('$joker.counters.'+key,'unknown_data','Falta el contador inicial observado '+key+'.');
  if(fact.status==='known'){
   if(need(actual,'$joker.counters.'+key)!==fact.value)fail('$joker.counters.'+key,'nonfresh_joker','El comodín del sobre tiene crecimiento previo incompatible con una adquisición nueva.');
  }else if(actual.status==='known'){
   const spec=counterSpecs(joker.catalogId)[key];
   if(!spec||actual.value<spec.min||spec.max!==undefined&&actual.value>spec.max)fail('$joker.counters.'+key,'invalid_counter','Objetivo observado fuera del rango admitido.');
  }
 }
 if(joker.counters.extraSell&&need(joker.counters.extraSell,'$joker.counters.extraSell')!==0)fail('$joker.counters.extraSell','nonfresh_joker','Un comodín nuevo no tiene crecimiento de venta previo.');
}

/** Real confirmation belongs to T09b; this pure projection never generates pack contents. */
export function applyPackAction(input:unknown,action:PackAction,mutation:Mutation,options:EngineOptions={}):EngineResult<PackChange>{
 return run<PackChange>(['shop.actions'],options,(trace,use)=>{
  const checked=checkJsonValue(action);if(!checked.length)packActionSchema.check(action,'$action',checked);if(checked.length){const e=checked[0]!;fail(e.path,e.code,e.message);}
  const loaded=stateInput(input,use,['shop','open_pack']);
  if(loaded.schemaVersion!=='0.2')fail('$.schemaVersion','unsupported_schema','La apertura registrada de sobres requiere el formato 0.2; migra explícitamente.');
  const state=loaded;
  if(!mutation||mutation.expectedRevision!==state.revision)fail('$.revision','stale_revision','La partida cambió; recarga antes de registrar esta acción.');
  const limitations=['Contenido transcrito por el usuario; no se generó azar ni se predijo el resultado del sobre.','Efectos respaldados por inspección del ejecutable, todavía sin comprobación directa en partida.'],cardChanges:TarotCardChange[]=[];
  if(action.type==='buy_pack'){
   if(state.phase!=='shop')fail('$.phase','wrong_phase','Solo puedes comprar un sobre desde la tienda.');
   use('packs.purchase');use('shop.prices');
   const physical=inventory(state);
   const shop=need(state.observed.shop,'$.observed.shop'),offers=shop.packOffers??[],index=offers.findIndex(offer=>offer.offerId===action.offerId);
   if(index<0)fail('$action.offerId','missing_offer','La oferta de sobre ya no existe.');
   const offer=offers[index]!,pack=definition(offer.catalogId),price=need(offer.price,'$.observed.shop.packOffers.'+offer.offerId+'.price');
   const expected=generationShopPrice(state,pack.family==='celestial'?'celestial_pack':'other_pack',pack.basePrice);
   if(expected===0)use('jokers.generation');
   if(price!==expected)fail('$action.offerId','unsupported_price',`El precio observado no coincide con el precio admitido ($${expected}); no se sustituye.`);
   const before=bankBalance(need(state.observed.money,'$.observed.money')),after=bankBalance(before-price);
   if(after< -creditLimit(state))fail('$action','insufficient_money',`Dinero insuficiente: ${before}, precio ${price}.`);
   if(after<0)use('jokers.economy');
   const origin=structuredClone(state.phaseData.origin);
   state.observed.money=valueFact(after);offers.splice(index,1);
   const context:PackContext={offerId:offer.offerId,shopId:shop.shopId,catalogId:offer.catalogId,paid:price,remainingChoices:pack.choose,contents:{status:'unknown',reason:'El sobre se abrió; todavía no se transcribieron sus cartas visibles.'},selectedEntryIds:[],shopOrigin:origin};
   if(pack.family==='arcana'){
    use('packs.arcana');
    context.heldCardIds={status:'unknown',reason:'Todavía no se transcribieron las cartas que el juego robó al abrir el sobre Arcana.'};
    limitations.push('La mano de Arcana se roba en el juego. El asesor no elige sus cartas ni copia una mano de ronda anterior.');
   }
   Object.assign(state,{phase:'open_pack',phaseData:{packId:valueFact(offer.offerId),returnTo:'shop',context}});
   generationEvent({state,stage:'open_pack',cards:[],trace,use,...(action.choices?{choices:action.choices}:{})},effectiveJokers(physical));
   trace.push({ruleId:'packs.purchase',label:'Sobre comprado y abierto',values:{offerId:offer.offerId,catalogId:offer.catalogId,before,spent:price,after,choices:pack.choose}});
  }else{
   const context=opened(state),pack=definition(context.catalogId);
   if(action.type==='observe_pack'){
    use('packs.contents');
    if(context.selectedEntryIds.length)fail('$action.contents','pack_already_selected','Después de elegir no se sustituye el contenido restante; corrige explícitamente el registro equivocado.');
    validateContents(action.contents,pack);context.contents=valueFact(structuredClone(action.contents));
    trace.push({ruleId:'packs.contents',label:'Contenido visible transcrito',values:{offerId:context.offerId,count:action.contents.length}});
   }else if(action.type==='observe_pack_hand'){
    use('packs.arcana');
    if(pack.family!=='arcana')fail('$action','incompatible_pack_action','Solo los sobres Arcana de este lote registran una mano de cartas objetivo.');
    if(context.selectedEntryIds.length)fail('$action.cardIds','pack_already_selected','Después de elegir no se sustituye la mano del sobre. Corrige el registro mediante deshacer.');
    packHand(state,action.cardIds);context.heldCardIds=valueFact(structuredClone(action.cardIds));
    if(state.observed.resources.handSize.status==='unknown')limitations.push('Tamaño de mano desconocido: se registraron las cartas visibles sin comprobar la cantidad total que debía robar el juego.');
    limitations.push('Mano transcrita del sobre real; no se predijo el orden de robo ni se dedujo de una jugada hipotética.');
    trace.push({ruleId:'packs.arcana',label:'Mano visible de Arcana registrada',values:{offerId:context.offerId,cardIds:action.cardIds.join(', '),count:action.cardIds.length}});
   }else if(action.type==='choose_pack_item'){
    use('packs.choose');
    const contents=need(context.contents,'$.phaseData.context.contents');validateContents(contents,pack);
    if(context.selectedEntryIds.includes(action.entryId))fail('$action.entryId','already_selected','Esta entrada ya fue elegida.');
    const entry=contents.find(item=>item.entryId===action.entryId);if(!entry)fail('$action.entryId','missing_pack_item','La carta elegida no figura en el contenido observado.');
    if(entry.kind==='unsupported')fail('$action.entryId','unsupported_pack_item','Esta carta se conserva como observada, pero su elección todavía no está implementada. Puedes omitir el resto del sobre.');
    if(entry.kind!=='tarot'&&action.targetCardIds!==undefined)fail('$action.targetCardIds','unexpected_targets','Esta elección no usa cartas objetivo.');
    if(entry.kind==='joker'){
     freshObserved(entry.joker);acquireObservedJoker(state,entry.joker,trace,use);synchronizeResourceFacts(state);inventory(state);
    }else if(entry.kind==='planet'){
     use('packs.planet');
     applyPlanetUse(state,{instanceId:context.offerId+':'+entry.entryId,catalogId:entry.catalogId,kind:'planet',edition:'base',sellValue:1},trace,use);
    }else{
     use('packs.arcana');
     if(pack.family!=='arcana')fail('$action.entryId','incompatible_pack_item','Un Tarot directo requiere un sobre Arcana observado.');
     if(!context.heldCardIds)fail('$.phaseData.context.heldCardIds','unknown_data','Falta registrar la mano que robó el juego al abrir Arcana.');
     const held=need(context.heldCardIds,'$.phaseData.context.heldCardIds');
     if(!action.targetCardIds)fail('$action.targetCardIds','missing_targets','Elige las cartas de la mano observada sobre las que usaste el Tarot.');
     packHand(state,held,'$.phaseData.context.heldCardIds');
     if(state.observed.resources.handSize.status==='unknown')limitations.push('Tamaño de mano desconocido: no se pudo comprobar que la mano observada incluya todas las cartas robadas. Solo se usan objetivos que sí registraste visibles.');
     // This pack was bought from the shop: Blind:defeat clears the old active
     // blind before cashout. nextBlind is future context, not an active debuff.
     cardChanges.push(...applyTargetedTarotUse(state,{instanceId:context.offerId+':'+entry.entryId,catalogId:entry.catalogId,kind:'tarot',edition:'base',sellValue:1},action.targetCardIds,held,trace,use,limitations));
     limitations.push('Uso directo de una carta observada del sobre; no ocupó ni se insertó en el inventario de consumibles. La misma mano permanece para la segunda elección Mega.');
    }
    context.selectedEntryIds.push(entry.entryId);context.remainingChoices--;
    trace.push({ruleId:'packs.choose',label:'Carta del sobre elegida',values:{entryId:entry.entryId,kind:entry.kind,remaining:context.remainingChoices}});
    if(!context.remainingChoices)close(state,context);
   }else if(action.type==='skip_open_pack'){
    if(pack.family==='arcana'){
     use('packs.arcana');
     const held=context.heldCardIds,size=state.observed.resources.handSize;
     if(held?.status==='known'&&!held.value.length&&size.status==='known'&&size.value>0)fail('$action','pack_hand_not_ready','El juego no habilita omitir Arcana con una mano vacía y tamaño positivo. Registra la mano visible cuando termine el robo.');
     if(held?.status!=='known'||context.contents.status!=='known')limitations.push('No se comprobó que el botón omitir estuviera habilitado: faltan la mano o el contenido. Esta proyección solo registra la acción que confirmas haber realizado.');
    }
    use('packs.skip');generationEvent({state,stage:'skip_pack',cards:[],trace,use,...(action.choices?{choices:action.choices}:{})},effectiveJokers(need(state.observed.jokers,'$.observed.jokers')));
    trace.push({ruleId:'packs.skip',label:'Resto del sobre omitido',values:{offerId:context.offerId,remaining:context.remainingChoices,previouslySelected:context.selectedEntryIds.length}});close(state,context);
   }else{
    sellObservedJoker(state,action.instanceId,action.choices??[],trace,use,options);synchronizeResourceFacts(state);inventory(state);
   }
  }
  state.revision=safe(state.revision+1,'$.revision');state.updatedAt=mutation.updatedAt;
  const valid=validateState(state);if(!valid.ok){const e=valid.errors[0]!;fail(e.path,e.code,e.message);}
  return {state:valid.value as GameStateV02,limitations,cardChanges,steps:[structuredClone(valid.value as GameStateV02)]};
 });
}
