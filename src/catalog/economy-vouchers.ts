/** L05: inspected 1.0.1o executable, not observed in a played run. */
export const ECONOMY_VOUCHERS=['v_seed_money','v_money_tree'] as const;
export function supportedEconomyVouchers(ids:readonly string[]){return ids.every(id=>ECONOMY_VOUCHERS.some(v=>v===id))&&new Set(ids).size===ids.length&&(!ids.includes('v_money_tree')||ids.includes('v_seed_money'));}
export function interestCap(ids:readonly string[]){return ids.includes('v_money_tree')?20:ids.includes('v_seed_money')?10:5;}
