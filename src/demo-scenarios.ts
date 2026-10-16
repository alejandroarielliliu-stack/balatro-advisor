import type { GameState, Fact } from './state/model.js';
import type { RoundPlan } from './evaluation/plan.js';
const known = <T>(value: T): Fact<T> => ({ status: 'known', source: 'manual', value });
const cards = (ids: string[]) => ids.map(cardId => ({ cardId, knowledge: 'hypothetical' as const, basis: 'Escenario sintético; no observación ni predicción del robo.' }));
function anteTwo(state: GameState) {
  state.observed.lastCleared = known({ ante: 1, kind: 'boss' });
  state.observed.nextBlind = known({ ante: 2, kind: 'small', bossId: known('none'), target: known(800), reward: known(3) });
  state.observed.visibleBoss = { status: 'unknown', reason: 'No necesario para esta Small; registrar antes de evaluar el jefe.' };
}
export function comparisonDemoScenarios(base: GameState): { title: string; state: GameState; plan: RoundPlan }[] {
  const pair: RoundPlan = { schemaVersion: 'scenario-1', planId: 'pair-two-plays', description: 'Pareja de ochos y después pareja de doses si la ronda continúa.',
    initialHand: cards(['8S','8H','KS','QH','JD','4C','5S','6H']),
    events: [ { type: 'play', cardIds: ['8S','8H'], drawIfContinues: cards(['2S','2H']) },
      { type: 'play', cardIds: ['2S','2H'], drawIfContinues: cards(['3S','3H']) } ], assumptions: { noMoneyChangesDuringRound: true } };
  const a = structuredClone(base);
  const b = structuredClone(base); anteTwo(b); b.observed.money = known(25);
  if (b.observed.shop.status === 'known') b.observed.shop.value.cardOffers = b.observed.shop.value.cardOffers.filter(o => o.catalogId === 'joker');
  const flush: RoundPlan = { schemaVersion: 'scenario-1', planId: 'straight-flush', description: 'Escalera de color 5–9; ambas ramas vencen en una mano.',
    initialHand: cards(['5S','6S','7S','8S','9S','KS','QH','JD']),
    events: [{ type: 'play', cardIds: ['5S','6S','7S','8S','9S'], drawIfContinues: cards(['2S','2H','3S','3H','4S']) }], assumptions: { noMoneyChangesDuringRound: true } };
  const c = structuredClone(base); anteTwo(c); c.observed.money = known(10);
  c.observed.jokers = known([{ instanceId: 'g', catalogId: 'green_joker', edition: known('base'), stickers: known([]), sellValue: known(2), counters: { greenMult: known(10) } }]);
  if (c.observed.shop.status === 'known') c.observed.shop.value.cardOffers = c.observed.shop.value.cardOffers.filter(o => o.catalogId === 'half_joker');
  const d = structuredClone(c);
  if (d.observed.jokers.status === 'known') d.observed.jokers.value[0]!.counters.greenMult = { status: 'unknown', reason: 'Contador no transcrito.' };
  const three = structuredClone(pair); three.planId = 'three-then-pair'; three.description = 'Trío de ochos, seguido de pareja de doses si hace falta.';
  three.initialHand = cards(['8S','8H','8D','KS','QH','JD','4C','6H']);
  three.events[0] = { type:'play',cardIds:['8S','8H','8D'],drawIfContinues:cards(['2S','2H','3S']) };
  three.events[1]!.drawIfContinues = cards(['3H','4S']);
  return [{ title: 'A. Comprar permite alcanzar el objetivo del escenario', state: a, plan: pair },
    { title: 'B. Más puntos, pero conservar dinero deja mayor saldo', state: b, plan: flush },
    { title: 'C. Reemplazar Green elimina su crecimiento acumulado', state: c, plan: three },
    { title: 'D. Contador desconocido: comparación incompleta', state: d, plan: structuredClone(three) }];
}
