import { array, boolean, enumeration, fact, integer, object, record, text, union } from './schema.js';
import type { Infer, Schema } from './schema.js';
export type { Fact, Issue, Result } from './schema.js';

const id = text();
const count = integer(0);
const strings = array(text());
const timestamp: Schema<string> = {
  check(value, path, errors) {
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value)
      && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === (value.includes('.') ? value : value.replace('Z', '.000Z'))) return true;
    errors.push({ path, code: 'timestamp', message: 'Usa una fecha UTC real: YYYY-MM-DDTHH:mm:ssZ (milisegundos opcionales).'});
    return false;
  }
};
const blindRef = { ante: integer(), kind: enumeration('small', 'big', 'boss') };
const blind = object({ ...blindRef, bossId: fact(id), target: fact(integer(1)), reward: fact(count) });
const card = object({
  instanceId: id, rank: enumeration('2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'),
  suit: enumeration('S', 'H', 'D', 'C'), edition: text(), enhancement: text(), seal: text(), extraChips: integer()
}, {debuff:boolean});
const hand = fact(object({ level: count, chips: count, mult: count }));
const handBases = union(object({ preset: id }), object({ values: object({
  high_card: hand, pair: hand, two_pair: hand, three_kind: hand, straight: hand,
  flush: hand, full_house: hand, four_kind: hand, straight_flush: hand
}, {five_kind:hand,flush_house:hand,flush_five:hand}) }));
const joker = object({
  instanceId: id, catalogId: id, edition: fact(text()), stickers: fact(strings),
  sellValue: fact(count), counters: record(fact(integer()))
});
const offer = object({
  offerId: id, catalogId: id, label: text(), kind: enumeration('joker', 'unsupported'),
  price: fact(count), edition: fact(text()), stickers: fact(strings)
});
const probe = object({
  probeId: id, label: text(), playedCardIds: array(id, 100), discardsRemaining: count,
  role: enumeration('favorable', 'adverse', 'representative')
}, { greenMultBeforePlay: integer() });
const plan = object({
  planId: id, initialHandCardIds: array(id, 100),
  events: array(object({ type: enumeration('discard', 'play'), cardIds: array(id, 100), drawnCardIds: array(id, 100) }), 100)
});

const consumable = object({instanceId:id,catalogId:id,kind:enumeration('tarot','planet','spectral'),edition:enumeration('base','negative'),sellValue:count},{handId:enumeration('high_card','pair','two_pair','three_kind','straight','flush','full_house','four_kind','straight_flush','five_kind','flush_house','flush_five')});
const jokerContext = object({}, {
 grosMichelExtinct:fact(boolean),tags:fact(strings),visibleHands:fact(array(enumeration('high_card','pair','two_pair','three_kind','straight','flush','full_house','four_kind','straight_flush','five_kind','flush_house','flush_five'))),
 handCounts:record(fact(count)),roundHandCounts:record(fact(count)),tarotsUsed:fact(count),planetsUsed:fact(strings),
 startingDeckSize:fact(count),blindsSkipped:fact(count),consumables:fact(array(consumable,100)),consumableSlots:fact(count),
 rerollCost:fact(count),freeRerolls:fact(count),bossDisabled:fact(boolean)
});

export const cardSchema=card, jokerSchema=joker, consumableSchema=consumable;
export const gameStateSchema = object({
  schemaVersion: enumeration('0.1'), rulesetId: id, runId: id, revision: count,
  updatedAt: timestamp, phase: enumeration('shop', 'draft'),
  observed: object({
    gameVersion: fact(text()), gamePlatform: fact(text()), deckId: fact(id), stakeId: fact(id), modsPresent: fact(boolean),
    money: fact(integer()), lastCleared: fact(object(blindRef)), nextBlind: fact(blind), visibleBoss: fact(blind),
    resources: object({ handsPerRound: fact(count), discardsPerRound: fact(count), handSize: fact(count), jokerSlots: fact(count) }),
    deck: fact(union(object({ preset: id }), object({ cards: array(card) }))), handBases: fact(handBases),
    jokers: fact(array(joker, 100)),
    shop: fact(object({ shopId: id, cardOffers: array(offer, 100), ignoredOtherOffers: strings })),
    outOfScope: fact(object({ vouchers: strings, consumables: strings, pendingTags: strings, otherModifiers: strings }))
  }, {jokerContext:fact(jokerContext)}),
  assumptions: object({
    probes: array(probe, 20), roundPlans: array(plan, 20), horizonRounds: integer(1, 3),
    cashflow: object({ assumeRoundWon: boolean, handsUsedByRound: array(count, 3),
      noSpendingBetweenRounds: boolean, noMoneyChangesDuringRound: boolean })
  })
}, {
  recentRounds: array(object({
    blind: object(blindRef), target: integer(1), score: count, handsUsed: count,
    discardsUsed: count, inventoryRevision: count
  }), 100)
});

export type GameState = Infer<typeof gameStateSchema>;
export type JokerInstance = Infer<typeof joker>;
export type Probe = Infer<typeof probe>;

/** Creating an empty draft does not assert a game version or preset. No wall clock read. */
export function createDraft(runId: string, updatedAt: string): GameState {
  const unknown = () => ({ status: 'unknown', reason: 'Todavía no registrado.' } as const);
  return {
    schemaVersion: '0.1', rulesetId: 'unselected', runId, revision: 0, updatedAt, phase: 'draft',
    observed: {
      gameVersion: unknown(), gamePlatform: unknown(), deckId: unknown(), stakeId: unknown(), modsPresent: unknown(),
      money: unknown(), lastCleared: unknown(), nextBlind: unknown(), visibleBoss: unknown(),
      resources: { handsPerRound: unknown(), discardsPerRound: unknown(), handSize: unknown(), jokerSlots: unknown() },
      deck: unknown(), handBases: unknown(), jokers: unknown(), shop: unknown(), outOfScope: unknown()
    },
    assumptions: { probes: [], roundPlans: [], horizonRounds: 1,
      cashflow: { assumeRoundWon: false, handsUsedByRound: [], noSpendingBetweenRounds: false, noMoneyChangesDuringRound: false } }
  };
}
