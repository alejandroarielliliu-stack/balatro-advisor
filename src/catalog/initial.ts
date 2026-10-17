import {ALL_JOKER_FACTS} from './all-joker-facts.js';
import {ADVANCED_JOKERS} from './advanced-jokers.js';
import {SIMPLE_JOKERS} from './simple-jokers.js';
/** Closed catalogue. Values are provisional; evidence lives outside the state schema. */
export const ENGINE_RULESET = 'balatro-pc-1.0.1o-blue-white-v1';
export const ENGINE_VERSION = '0.9.0';
export const GAME_VERSION = '1.0.1o-FULL';
const jokers = {
  ...ALL_JOKER_FACTS,
  ...SIMPLE_JOKERS,
  ...ADVANCED_JOKERS,
  joker: { price: 2, sell: 1 }, half_joker: { price: 5, sell: 2 },
  abstract_joker: { price: 4, sell: 2 }, even_steven: { price: 4, sell: 2 },
  scholar: { price: 4, sell: 2 }, banner: { price: 5, sell: 2 },
  green_joker: { price: 4, sell: 2 }, golden_joker: { price: 6, sell: 3 }
} as const;
export type JokerId = keyof typeof jokers;
/** Shared numerical effects: scoring and conservative bounds use the same catalogue. */
export const SCORING_EFFECTS = Object.freeze({
  jokerMult: 4, halfMult: 20, halfMaxCards: 3, abstractPerJoker: 3,
  evenMult: 4, scholarChips: 20, scholarMult: 4, bannerPerDiscard: 30,
  greenPerPlay: 1, greenPerDiscard: 1
});
export function jokerDefinition(id: string) { return Object.hasOwn(jokers, id) ? jokers[id as JokerId] : undefined; }
export const HAND_BASES = Object.freeze({
  high_card: [5, 1], pair: [10, 2], two_pair: [20, 2], three_kind: [30, 3],
  straight: [30, 4], flush: [35, 4], full_house: [40, 4], four_kind: [60, 7], straight_flush: [100, 8], five_kind: [120, 12], flush_house: [140, 14], flush_five: [160, 16]
} as const);
export type HandId = keyof typeof HAND_BASES;
export const RANKS = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'] as const;
export interface Card { instanceId: string; rank: typeof RANKS[number]; suit: 'S'|'H'|'D'|'C'; edition: string; enhancement: string; seal: string; extraChips: number;debuff?:boolean }
export function standardDeck(): Card[] {
  return (['S','H','D','C'] as const).flatMap(suit => RANKS.map(rank => ({
    instanceId: rank + suit, rank, suit, edition: 'base', enhancement: 'none', seal: 'none', extraChips: 0
  })));
}
export const rankValue = (card: Card) => card.enhancement==='stone'?0:RANKS.indexOf(card.rank) + 2;
export const cardChips = (card: Card) => (card.enhancement==='stone'?50:(card.rank==='A'?11:Math.min(10,rankValue(card)))+(card.enhancement==='bonus'?30:0))+card.extraChips;
export const blindBase = (ante: number): number | undefined => [300,800,2000,5000,11000,20000,35000,50000][ante - 1];

/** Hidden categories are included in bounds only when composition permits them. */
export function possibleHandIds(cards:readonly Card[]):HandId[]{
 const counts=(xs:readonly Card[])=>Object.values(xs.reduce<Record<string,number>>((a,c)=>{a[c.rank]=(a[c.rank]??0)+1;return a;},{})).sort((a,b)=>b-a);
 const rank=counts(cards),suited=['S','H','D','C'].map(s=>counts(cards.filter(c=>c.suit===s)));
 return (Object.keys(HAND_BASES) as HandId[]).filter(h=>h==='five_kind'?(rank[0]??0)>=5:h==='flush_five'?suited.some(c=>(c[0]??0)>=5):h==='flush_house'?suited.some(c=>(c[0]??0)>=3&&(c[1]??0)>=2):true);
}
