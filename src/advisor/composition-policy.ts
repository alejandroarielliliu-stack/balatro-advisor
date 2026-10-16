/** Editorial preparation index. These weights/references are product choices,
 * not empirical game formulas, unit conversions or probabilities of winning. */
export const COMPOSITION_POLICY={
 id:'composition-1',decimals:1,barReference:100,
 scoring:{additionalRole:10,roles:['chips','mult','xmult','retrigger'] as const},
 economy:{reserveReference:25,reserveUnits:70,effectWeight:0.30},
 synergy:{supportUnits:100,conflictUnits:50,preparationReference:3},
 deck:{supportUnits:100,preparationReference:3},
 growth:{handsReference:4,extraHandUnits:10,lastAnte:8,anteSpan:7,
  handDevelopers:['j_green_joker','j_runner','j_square','j_trousers','j_ride_the_bus','j_wee'] as const},
 resources:{hands:{reference:4,weight:0.4},discards:{reference:3,weight:0.2},handSize:{reference:8,weight:0.25},jokerSlots:{reference:5,weight:0.15}},
 aggregation:'equal-mean-applicable'
} as const;
export const compositionRound=(n:number):number=>Number(n.toFixed(COMPOSITION_POLICY.decimals));
