import type {Fact,GameState} from './model.js';
import {RANKS,standardDeck} from '../catalog/initial.js';
import type {Card} from '../catalog/initial.js';
import {deckProfile,resolveDeck} from '../catalog/decks.js';

/** Current recorded cards, never a reconstruction from the initial deck name.
 * The legacy standard preset is usable only when its known profile agrees.
 * Return an independent copy so an inspector cannot edit the registered run. */
export function currentDeckCards(state:GameState):Card[]|undefined {
 return resolveDeckCards(state.observed.deck,state.observed.deckId);
}
export function resolveDeckCards(deck:GameState['observed']['deck'],id:Fact<string>):Card[]|undefined {
 if(deck.status!=='known')return undefined;
 if('cards' in deck.value)return structuredClone(deck.value.cards);
 if(deck.value.preset!=='standard52-unmodified'||id.status!=='known'||!deckProfile(id.value)||resolveDeck(id.value).composition!=='standard52')return undefined;
 return standardDeck();
}

export interface CardMaterialCounts {
 total:number;ranks:Record<Card['rank'],number>;suits:Record<Card['suit'],number>;
 enhancements:Record<string,number>;seals:Record<string,number>;faces:number;steelKings:number;
}
export interface DeckMaterial {
 /** Full deck: independent deck-count effects include temporarily debuffed cards. */
 full:CardMaterialCounts;
 /** Cards without a recorded debuff: potential scoring/held support, not a draw prediction. */
 usable:CardMaterialCounts;
}
function countCards(cards:readonly Card[]):CardMaterialCounts {
 const ranks=Object.fromEntries(RANKS.map(rank=>[rank,0])) as CardMaterialCounts['ranks'];
 const suits:CardMaterialCounts['suits']={S:0,H:0,D:0,C:0};
 const enhancements=new Map<string,number>(),seals=new Map<string,number>();let faces=0,steelKings=0;
 for(const card of cards){
  // Stone has no effective rank/suit. Pareidolia never manufactures real kings.
  if(card.enhancement!=='stone'){ranks[card.rank]++;suits[card.suit]++;if(['J','Q','K'].includes(card.rank))faces++;}
  if(card.enhancement==='steel'&&card.rank==='K')steelKings++;
  enhancements.set(card.enhancement,(enhancements.get(card.enhancement)??0)+1);
  seals.set(card.seal,(seals.get(card.seal)??0)+1);
 }
 return {total:cards.length,ranks,suits,enhancements:Object.fromEntries(enhancements),seals:Object.fromEntries(seals),faces,steelKings};
}
/** Structural counts only. Wild/Smeared/Pareidolia and actual hand conditions
 * remain in their effect-specific inspectors instead of altering these facts. */
export function summarizeDeckCards(cards:readonly Card[]):DeckMaterial {
 return {full:countCards(cards),usable:countCards(cards.filter(card=>!card.debuff))};
}
export function inspectDeckMaterial(state:GameState):DeckMaterial|undefined {
 const cards=currentDeckCards(state);return cards?summarizeDeckCards(cards):undefined;
}
