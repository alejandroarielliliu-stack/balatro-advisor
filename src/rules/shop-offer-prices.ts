import type {GameState} from '../state/model.js';
import type {ShopSnapshot} from '../advisor/shop-context.js';
import {ALL_JOKER_FACTS} from '../catalog/all-joker-facts.js';
import {pricingTagsForShop} from './price-tags.js';
import {quoteShopPrice} from './shop-pricing.js';

/** Assign each recorded tag to its physical offer once, then quote that offer.
 * No consultation consumes the queue; the returned changes commit with the shelf. */
export function normalizeShopSnapshot(state:GameState,input:ShopSnapshot):{snapshot:ShopSnapshot;pricingTags:string[];consumedPricingTags:string[]} {
 const snapshot=structuredClone(input),pricingTags=state.schemaVersion==='0.2'?pricingTagsForShop(state,input.id):[],consumedPricingTags:string[]=[];
 const saved=state.schemaVersion==='0.2'&&state.observed.shop.status==='known'&&state.observed.shop.value.shopId===input.id?state.observed.shop.value:undefined;
 const consume=(id:string)=>{const at=pricingTags.indexOf(id);if(at>=0){pricingTags.splice(at,1);consumedPricingTags.push(id);return true;}return false;};
 const coupon=pricingTags.includes('tag_coupon');
 if(coupon&&!saved?.pricingTags)consumedPricingTags.push('tag_coupon');
 for(const offer of snapshot.jokers){
  const old=saved?.cardOffers.find(item=>item.offerId===offer.offerId&&item.catalogId===offer.catalogId);
  let free=old?.couponed;
  if(free===undefined){
   const definition=ALL_JOKER_FACTS[offer.catalogId]??Object.values(ALL_JOKER_FACTS).find(item=>item.artId===offer.catalogId);
   const rarityTag=definition?.rarity===2?'tag_uncommon':definition?.rarity===3?'tag_rare':undefined;
   const editionTag=({negative:'tag_negative',foil:'tag_foil',holo:'tag_holo',holographic:'tag_holo',polychrome:'tag_polychrome'} as Record<string,string>)[offer.edition];
   const rarityFree=rarityTag?consume(rarityTag):false,editionFree=editionTag?consume(editionTag):false;
   free=coupon||rarityFree||editionFree;
  }
  if(state.schemaVersion==='0.2')offer.couponed=free;else delete offer.couponed;
  const quote=quoteShopPrice(state,{kind:'joker',catalogId:offer.catalogId,edition:offer.edition,stickers:offer.stickers,couponed:free});
  offer.price=quote.price.status==='known'?quote.price.value:null;
 }
 for(const offer of snapshot.vouchers){const quote=quoteShopPrice(state,{kind:'voucher',catalogId:offer.catalogId});offer.price=quote.price.status==='known'?quote.price.value:null;}
 for(const offer of snapshot.packs){
  const old=saved?.packOffers?.find(item=>item.offerId===offer.offerId&&item.catalogId===offer.family+'-'+offer.size);
  offer.couponed=old?.couponed??coupon;
  const quote=quoteShopPrice(state,{kind:'pack',catalogId:offer.family+'-'+offer.size,couponed:offer.couponed});offer.price=quote.price.status==='known'?quote.price.value:null;
 }
 return {snapshot,pricingTags,consumedPricingTags};
}
