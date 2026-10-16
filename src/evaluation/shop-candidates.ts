import type { ShopAction } from '../rules/shop.js';
/** Preserve pre-sales candidate IDs for the same input; IDs are still analysis-local. */
export function orderShopCandidates(actions:readonly ShopAction[]):ShopAction[] {
  return [...actions.filter(a=>a.type!=='sell'),...actions.filter(a=>a.type==='sell')];
}
