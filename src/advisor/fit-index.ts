/** Editorial index units, NOT scoring rules or a utility conversion between
 * dollars, Chips and Mult. All tunable choices of quick-fit-2 live here. */
export const FIT_INDEX_POLICY={
 id:'quick-fit-2',unitsPerBand:10,decimals:1,
 stageAnchors:[1,4,8] as const,
 scarceRatio:1/4,scarceStageFloor:2,
 unavailableCap:20,positive:70,negative:30,
 magnitudeUnits:10,
 magnitudeReferences:{chips:100,mult:20,greenMult:20,x100:100} as const
} as const;

/** Explicit scoring-counter whitelist; other counters remain descriptive.
 * Ref: existing CAT04 counter contracts, not an observation in a game. */
export const FIT_MAGNITUDE_COUNTERS:Readonly<Record<string,'chips'|'mult'|'greenMult'|'x100'>>={
 green_joker:'greenMult',runner:'chips',square:'chips',wee:'chips',castle:'chips',ice_cream:'chips',
 trousers:'mult',ride_the_bus:'mult',popcorn:'mult',ceremonial:'mult',red_card:'mult',flash:'mult',
 ramen:'x100',hit_the_road:'x100',yorick:'x100',madness:'x100',obelisk:'x100',
 vampire:'x100',hologram:'x100',lucky_cat:'x100',glass:'x100',caino:'x100',constellation:'x100',campfire:'x100'
};

export function indexRound(value:number):number {return Number(value.toFixed(FIT_INDEX_POLICY.decimals));}
export function stageValue(ante:number|undefined,profile:readonly [number,number,number]):number|null {
 if(ante===undefined||!Number.isInteger(ante)||ante<1||ante>8)return null;
 const [a,b,c]=FIT_INDEX_POLICY.stageAnchors;
 return ante<=b?profile[0]+(profile[1]-profile[0])*(ante-a)/(b-a):profile[1]+(profile[2]-profile[1])*(ante-b)/(c-b);
}
/** Continuous support in the recorded deck, never a chance of drawing it. */
export function materialValue(ratio:number):number {return 1+2*ratio;}
export function scarceStageCap(ratio:number):number {
 return FIT_INDEX_POLICY.scarceStageFloor+(4-FIT_INDEX_POLICY.scarceStageFloor)*Math.min(1,ratio/FIT_INDEX_POLICY.scarceRatio);
}
/** Diminishing editorial bonus. References only define this index's resolution;
 * they do not assert +100 Chips = +20 Mult = x2, nor predict activation. */
export function magnitudeValue(key:keyof typeof FIT_INDEX_POLICY.magnitudeReferences,value:number):number {
 const contribution=Math.max(0,value-(key==='x100'?100:0));
 return FIT_INDEX_POLICY.magnitudeUnits*Math.log2(1+contribution/FIT_INDEX_POLICY.magnitudeReferences[key]);
}
