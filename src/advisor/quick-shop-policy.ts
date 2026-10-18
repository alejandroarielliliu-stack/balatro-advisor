/** Rules select conditional candidates, never a sum of dollars, points and counters. */
export const QUICK_SHOP_POLICY={
 id:'quick-shop-2',
 scoringRoles:['chips','mult','xmult','retrigger'] as readonly string[],
 temporaryCounters:['popcorn','ice_cream','ramen'] as readonly string[],
 rules:{
  additionalScoring:'S-ADDITIONAL-SCORING',
  preparation:'S-PREPARATION',
  replacementLoss:'S-REPLACEMENT-LOSS',
  reserve:'S-RESERVE',
  interest:'S-INTEREST',
  utilityNeed:'S-UTILITY-NEED',
  scope:'S-SCOPE'
 }
} as const;

export interface ShopFinding {
 ruleId:string;message:string;
 /** Numbers keep their original units; they are not combined into a utility score. */
 values?:Record<string,number|string>;
}
