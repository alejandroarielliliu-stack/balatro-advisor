import {ALL_JOKER_FACTS} from '../catalog/all-joker-facts.js';
import {BOOSTER_CATALOG} from '../catalog/booster-catalog.js';
import {VOUCHER_CATALOG} from '../catalog/voucher-catalog.js';
import type {Fact,GameState} from '../state/model.js';

export interface ShopPriceRequest {
 kind:'joker'|'voucher'|'pack'|'planet'|'tarot'|'spectral'|'playing_card';
 catalogId:string;edition?:string;stickers?:readonly string[];couponed?:boolean;extraSell?:number;
}
export interface ShopPriceQuote {price:Fact<number>;sellValue:Fact<number>;breakdown:string[]}
const known=(value:number):Fact<number>=>({status:'known',source:'confirmedPreset',value});
const unknown=(reason:string):Fact<number>=>({status:'unknown',reason});
const value=<T>(fact:Fact<T>|undefined):T|undefined=>fact?.status==='known'?fact.value:undefined;
const editionCosts:Readonly<Record<string,number>>={base:0,foil:2,holo:3,holographic:3,polychrome:5,negative:5};

/** Card:set_cost, native 1.0.1o-FULL card.lua:369-383. Cupón changes the
 * purchase price after resale has been calculated; Rental overrides discounts. */
export function quoteShopPrice(state:GameState,request:ShopPriceRequest):ShopPriceQuote {
 const couponed=request.couponed===true&&request.kind!=='voucher';
 const missing=(reason:string):ShopPriceQuote=>({price:couponed?known(0):unknown(reason),sellValue:unknown(reason),breakdown:[reason]});
 const joker=ALL_JOKER_FACTS[request.catalogId]??Object.values(ALL_JOKER_FACTS).find(item=>item.artId===request.catalogId);
 const pack=BOOSTER_CATALOG.find(item=>item.id===request.catalogId);
 const base=request.kind==='joker'?joker?.price:request.kind==='pack'?pack?.basePrice:
  request.kind==='voucher'?VOUCHER_CATALOG.some(item=>item.id===request.catalogId)?10:undefined:
  ['planet','tarot'].includes(request.kind)?3:request.kind==='spectral'?4:request.kind==='playing_card'?1:undefined;
 if(base===undefined)return missing('Falta identificar el artículo de la tienda.');
 const edition=request.edition??'base',editionExtra=editionCosts[edition],stickers=request.stickers??[],rental=stickers.includes('rental');
 const celestial=request.kind==='planet'||request.kind==='pack'&&pack?.family==='celestial';
 const jokers=celestial?value(state.observed.jokers):undefined;
 const astronomer=jokers?.some(item=>item.catalogId==='astronomer'||item.catalogId==='j_astronomer')??false;
 const fixed=rental||astronomer;
 if(!fixed&&(editionExtra===undefined||stickers.some(sticker=>!['eternal','perishable','rental'].includes(sticker))))return missing('Confirma la edición y las pegatinas.');
 const modifiers=value(state.observed.outOfScope);
 if(!fixed&&!modifiers)return missing('Faltan los vales y modificadores de la partida.');
 if(!fixed&&modifiers?.otherModifiers.length)return missing('Hay reglas de reto o modificadores de precio sin representar.');
 if(celestial&&!jokers&&!rental)return missing('Falta confirmar si tienes Astrónomo.');
 const discount=modifiers?.vouchers.includes('v_liquidation')?50:modifiers?.vouchers.includes('v_clearance_sale')?25:0;
 let cost=rental?1:astronomer?0:Math.max(1,Math.floor((base+editionExtra!+0.5)*(100-discount)/100));
 const breakdown=[`Precio base $${base}.`];
 if(editionExtra)breakdown.push(`Edición +$${editionExtra}.`);
 if(discount)breakdown.push(`Descuento del ${discount}%.`);
 if(astronomer&&!rental)breakdown.push('Astrónomo deja este artículo gratis.');
 if(rental)breakdown.push('Alquiler fija el precio en $1.');
 const extra=request.extraSell??0;
 if(!Number.isSafeInteger(extra)||extra<0)return missing('Falta un valor adicional de venta válido.');
 const sellValue=Math.max(1,Math.floor(cost/2))+extra;
 if(couponed){cost=0;breakdown.push('La etiqueta deja esta oferta gratis.');}
 return {price:known(cost),sellValue:known(sellValue),breakdown};
}

/** Re-evaluate only known physical articles after a persistent price effect
 * changes. No offers or random content are created here. */
export function repriceShopOffers(state:GameState):void {
 if(state.schemaVersion==='0.2'&&state.observed.shop.status==='known'){
  const shop=state.observed.shop.value;
  for(const offer of shop.cardOffers){
   if(offer.kind!=='joker')continue;
   offer.price=quoteShopPrice(state,{kind:'joker',catalogId:offer.catalogId,edition:value(offer.edition)??'unknown',stickers:value(offer.stickers)??['unknown'],couponed:offer.couponed??false}).price;
  }
  for(const offer of shop.voucherOffers??[])offer.price=quoteShopPrice(state,{kind:'voucher',catalogId:offer.catalogId}).price;
  for(const offer of shop.packOffers??[])offer.price=quoteShopPrice(state,{kind:'pack',catalogId:offer.catalogId,couponed:offer.couponed??false}).price;
 }
 if(state.observed.jokers.status==='known')for(const joker of state.observed.jokers.value){
  const extra=joker.counters.extraSell?value(joker.counters.extraSell):0;
  joker.sellValue=extra===undefined?unknown('Falta el valor adicional de venta del comodín.'):quoteShopPrice(state,{kind:'joker',catalogId:joker.catalogId,edition:value(joker.edition)??'unknown',stickers:value(joker.stickers)??['unknown'],extraSell:extra}).sellValue;
 }
}
