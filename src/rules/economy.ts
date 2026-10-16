import {bankBalance} from './economic-jokers.js';
import {generationRoundIncome} from './generation-jokers.js';
import {interestCap} from '../catalog/economy-vouchers.js';
import {deckDefinition} from '../catalog/decks.js';
import type { GameState } from '../state/model.js';
import { blindInfo, deckCards, fail, inventory, need, resources, run, safe, stateInput } from './core.js';
import type { EngineOptions, Trace } from './core.js';

export interface Cashout { balanceBefore: number; blindReward: number; unusedHands: number; unusedDiscards?: number; goldenIncome: number; otherJokerIncome?:number; interest: number; earned: number; balanceAfter: number }
export function interestInternal(balance: number, trace: Trace[], cap=5): number {
  bankBalance(balance);
  const interest = Math.min(cap, Math.max(0,Math.floor(balance / 5)));
  trace.push({ ruleId: 'interest.formula', label: 'Interés de un saldo explícito (tope aplicable)', values: { balance, unit: 5, cap, interest } });
  return interest;
}
/** No claim about when the supplied balance is available. Timing belongs to cashout. */
export function interestOnBalance(input: unknown, options: EngineOptions = {}) {
  return run<number>([], options, (trace,use) => {
    const state=stateInput(input,use),balance=need(state.observed.money,'$.observed.money');bankBalance(balance);
    if (!deckDefinition(need(state.observed.deckId,'$.observed.deckId'))!.income.interest) {
      use('deck.green');trace.push({ruleId:'deck.green',label:'Baraja sin intereses',values:{balance,interest:0}});return 0;
    }
    use('interest.formula');const vouchers=need(state.observed.outOfScope,'$.observed.outOfScope').vouchers;if(vouchers.some(id=>['v_seed_money','v_money_tree'].includes(id)))use('vouchers.interest');const moons=inventory(state).filter(j=>j.catalogId==='to_the_moon').length;return interestInternal(balance,trace,interestCap(vouchers))*(1+moons);
  });
}
export function cashoutInternal(state: GameState, handsRemaining: number, won: boolean, trace: Trace[], use: (id: string) => void, discardsRemaining?: number,settings:{saved?:boolean;initialHands?:number;initialDiscards?:number;additionalJokerIncome?:number}={}): Cashout {
  const before = bankBalance(need(state.observed.money, '$.observed.money'));
  const bases=resources(state),r={...bases,hands:settings.initialHands??bases.hands,discards:settings.initialDiscards??bases.discards};
  if (!Number.isSafeInteger(handsRemaining) || handsRemaining < 0 || handsRemaining >= r.hands) fail('$round.handsRemaining', 'invalid_hands', `El cobro requiere entre 0 y ${r.hands-1} manos sobrantes tras jugar al menos una.`);
  if (!won) return { balanceBefore: before, blindReward: 0, unusedHands: 0, goldenIncome: 0, interest: 0, earned: 0, balanceAfter: before };
  use('blind.effects'); use('base.configuration');
  const blind = blindInfo(state);
  if (blind.kind === 'boss' && blind.ante === 8) fail('$round', 'outside_goal', 'No se proyectan ingresos posteriores a ganar el ante 8.');
  const recordedReward=need(blind.reward,'$.observed.nextBlind.reward');const reward=settings.saved?0:recordedReward;
  if (recordedReward !== blind.expectedReward) fail('$.observed.nextBlind.reward', 'reward_mismatch', 'Recompensa distinta del catálogo base.');
  const income=deckDefinition(need(state.observed.deckId,'$.observed.deckId'))!.income;
  let unusedDiscards=0;
  if (!income.interest) {
    use('deck.green');
    const maxDiscards=blind.boss==='the_water'?0:r.discards;
    if (discardsRemaining===undefined) fail('$round.discardsRemaining','unknown_data','Verde necesita los descartes sobrantes para calcular el cobro.');
    if (!Number.isSafeInteger(discardsRemaining) || discardsRemaining<0 || discardsRemaining>maxDiscards) fail('$round.discardsRemaining','invalid_discards','Descartes sobrantes incompatibles con la baraja y ciega.');
    unusedDiscards=discardsRemaining*income.perDiscard;
  } else {use('interest.timing');use('interest.formula');}
  let goldenIncome = 0;
  for (const joker of inventory(state)) if (joker.catalogId === 'golden_joker') {
    use('golden_joker.effect'); goldenIncome += 4;
    trace.push({ ruleId: 'golden_joker.effect', label: 'Golden al cobro', values: { instanceId: joker.instanceId, dollars: 4 } });
  }
  const vouchers=need(state.observed.outOfScope,'$.observed.outOfScope').vouchers;if(income.interest&&vouchers.some(id=>['v_seed_money','v_money_tree'].includes(id)))use('vouchers.interest');
  let otherJokerIncome=generationRoundIncome(state)+(settings.additionalJokerIncome??0);
  for(const j of inventory(state)){
    let dollars=0;
    if(j.catalogId==='cloud_9')dollars=deckCards(state).filter(c=>c.rank==='9').length;
    if(j.catalogId==='delayed_grat'){
      const max=blind.boss==='the_water'?0:r.discards;
      if(!Number.isSafeInteger(discardsRemaining)||discardsRemaining!<0||discardsRemaining!>max)fail('$round.discardsRemaining','unknown_data','Delayed Gratification requiere los descartes restantes.');
      if(discardsRemaining===max)dollars=2*discardsRemaining;
    }
    otherJokerIncome+=dollars;if(dollars)trace.push({ruleId:'jokers.context',label:j.catalogId+' al cobro',values:{instanceId:j.instanceId,dollars}});
  }
  const moons=inventory(state).filter(j=>j.catalogId==='to_the_moon').length;
  const baseInterest=income.interest?interestInternal(before,trace,interestCap(vouchers)):0;
  const interest=baseInterest*(1+moons);
  if(moons)trace.push({ruleId:'jokers.context',label:'To the Moon',values:{baseInterest,moons,interest}});
  const unusedHands=handsRemaining*income.perHand;
  const earned = safe(reward + unusedHands + unusedDiscards + goldenIncome + otherJokerIncome + interest), balanceAfter = bankBalance(before + earned);
  trace.push({ ruleId: 'round.cashout', label: 'Cobro condicionado a victoria, sin dinero durante la ronda',
    values: { before, reward, handsRemaining, perHand:income.perHand, unusedHands, unusedDiscards, goldenIncome, ...(otherJokerIncome?{otherJokerIncome}:{}), interest, earned, balanceAfter } });
  return { balanceBefore: before, blindReward: reward, unusedHands, ...(income.perDiscard?{unusedDiscards}:{}), goldenIncome, ...(otherJokerIncome?{otherJokerIncome}:{}), interest, earned, balanceAfter };
}
/** Explicit conditional projection; this function does not assert that the round was actually won. */
export function projectCashout(input: unknown, assumptions: { discardsRemaining?: number; handsRemaining: number; won: boolean; noMoneyChangesDuringRound: boolean }, options: EngineOptions = {}) {
  return run<Cashout>(['round.cashout', 'round.resources'], options, (trace,use) => {
    if (!assumptions || typeof assumptions.won !== 'boolean' || assumptions.noMoneyChangesDuringRound !== true) fail('$assumptions', 'unsupported_cashflow', 'Indica victoria/derrota y confirma que no cambia el dinero durante la ronda.');
    return cashoutInternal(stateInput(input,use), assumptions.handsRemaining, assumptions.won, trace, use, assumptions.discardsRemaining);
  });
}
