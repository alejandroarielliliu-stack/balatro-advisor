import {effectChoiceSchema} from '../state/effect-choices.js';
import { array, boolean, checkJsonValue, enumeration, object, text } from '../state/schema.js';
import type { Infer } from '../state/schema.js';
import type { GameState, Issue, Result } from '../state/model.js';
import { fail, run, stateInput } from '../rules/core.js';
import type { EngineOptions, EngineResult, Trace } from '../rules/core.js';
import type { AnalysisGate } from '../rules/evidence.js';
import { beginRound, applyRoundEvent, finishRound } from '../rules/round.js';
import type { RoundState, RoundFinish } from '../rules/round.js';
import { scoreHand } from '../rules/scoring.js';
import type { HandScore } from '../rules/scoring.js';

// Separate scenario contract: never silently upgrade H1's unlabelled roundPlans to observations.
const card = object({ cardId: text(), knowledge: enumeration('known', 'hypothetical'), basis: text(1000) });
const planSchema = object({
  schemaVersion: enumeration('scenario-1'), planId: text(), description: text(1000),
  initialHand: array(card, 30),
  events: array(object({ type: enumeration('play', 'discard','sell_joker'), cardIds: array(text(), 5), drawIfContinues: array(card, 5) },{instanceId:text(),choices:array(effectChoiceSchema,2000)}), 100),
  assumptions: object({ noMoneyChangesDuringRound: boolean })
},{startChoices:array(effectChoiceSchema,2000),endChoices:array(effectChoiceSchema,2000)});
export type RoundPlan = Infer<typeof planSchema>;
export function validateRoundPlan(input: unknown): Result<RoundPlan> {
  const errors = checkJsonValue(input);
  if (!errors.length) planSchema.check(input, '$plan', errors);
  if (errors.length) return { ok: false, errors };
  const plan = structuredClone(input) as RoundPlan;
  if (plan.initialHand.length<1 || plan.initialHand.length>30) errors.push({ path: '$plan.initialHand', code: 'initial_hand_size', message: 'El escenario admite entre 1 y 30 cartas iniciales; se contrastan con el tamaño de mano de la partida.' });
  if (!plan.events.length) errors.push({ path: '$plan.events', code: 'empty_plan', message: 'Indica al menos un evento.' });
  for (const [i, e] of plan.events.entries()) if (!e.cardIds.length&&e.type!=='sell_joker') errors.push({ path: `$plan.events[${i}].cardIds`, code: 'empty_action', message: 'Selecciona al menos una carta.' });
  return errors.length ? { ok: false, errors } : { ok: true, value: plan };
}
export function mergeEvidence(gates: AnalysisGate[]): AnalysisGate {
  const limitations = new Map(gates.flatMap(g => g.limitations).map(l => [l.ruleId, l]));
  return { status: gates.some(g => g.status === 'abstain') ? 'abstain' : gates.some(g => g.status === 'limited') ? 'limited' : 'documented',
    limitations: [...limitations.values()], verifiedAgainstGame: gates.length > 0 && gates.every(g => g.verifiedAgainstGame) };
}
export interface EvaluatedEvent {
  eventIndex: number; type: 'play' | 'discard'|'sell_joker'; playedOrDiscarded: string[];
  drawn: RoundPlan['initialHand']; skippedDraws: RoundPlan['initialHand'];
  handScore: HandScore | null; accumulatedScore: number; handsLeft: number; discardsLeft: number;
  trace: Trace[]; evidence: AnalysisGate;
}
export interface PlanEvaluation {
  plan: RoundPlan; outcome: 'reached_target' | 'plan_exhausted' | 'hands_exhausted' | 'rescued' | 'incompatible';
  targetReached: boolean; events: EvaluatedEvent[]; unexecutedEventIndices: number[];
  handsUsed: number; discardsUsed: number; score: number; round: RoundState; finalState: GameState;
  settlement: EngineResult<RoundFinish> | null; economicLimitation: string | null; errors: Issue[];
}

/** Executes only the supplied scenario. It neither predicts draws nor searches for better plays. */
export function evaluateRoundPlan(input: unknown, planInput: unknown, updatedAt: string, options: EngineOptions = {}): EngineResult<PlanEvaluation> {
  const gates: AnalysisGate[] = [];
  const result = run<PlanEvaluation>([], options, trace => {
    const state = stateInput(input), checked = validateRoundPlan(planInput);
    if (!checked.ok) { const e = checked.errors[0]!; fail(e.path, e.code, e.message); }
    const plan=checked.value;
    const started = beginRound(state, plan.initialHand.map(c => c.cardId), options,plan.startChoices??[]); gates.push(started.evidence);
    if (!started.ok) { const e = started.errors[0]!; fail(e.path, e.code, e.message); }
    trace.push(...started.trace);
    let round = started.value;
    const initialHands = round.handsLeft, initialDiscards = round.discardsLeft;
    const events: EvaluatedEvent[] = [], errors: Issue[] = [];
    for (const [eventIndex, event] of plan.events.entries()) {
      if (round.status !== 'active') break;
      // H2 requires zero draws when terminal. Preview is pure; only applyRoundEvent commits counters.
      let terminal = false;
      if (event.type === 'play') {
        const preview = scoreHand(round.game, { cardIds: event.cardIds, discardsRemaining: round.discardsLeft,heldCardIds:round.hand.filter(id=>!event.cardIds.includes(id)),remainingCardIds:round.remaining,handsRemaining:round.handsLeft-1,handsUsed:round.initialHands-round.handsLeft,discardsUsed:round.initialDiscards-round.discardsLeft,roundInitialHands:round.initialHands,roundInitialDiscards:Math.max(round.initialDiscards,round.discardsLeft),generatedHandIds:round.generatedHandIds,capacityOverflow:round.capacityOverflow,...(event.choices?{choices:event.choices}:{} ) }, options);
        gates.push(preview.evidence);
        if (!preview.ok) { errors.push(...preview.errors); break; }
        const target = round.game.observed.nextBlind;
        terminal = round.handsLeft === 1 || (target.status === 'known' && target.value.target.status === 'known' && round.score + preview.value.score >= target.value.target.value);
      }
      const drawn = terminal||event.type==='sell_joker' ? [] : event.drawIfContinues;
      const applied = applyRoundEvent(round, { type: event.type, cardIds: event.cardIds, drawnCardIds: drawn.map(c => c.cardId),...(event.choices?{choices:event.choices}:{}),...(event.instanceId?{instanceId:event.instanceId}:{}) },
        { expectedRevision: round.game.revision, updatedAt }, options);
      gates.push(applied.evidence);
      if (!applied.ok) { errors.push(...applied.errors.map(e => ({ ...e, path: `$plan.events[${eventIndex}]${e.path.slice(1)}` }))); break; }
      round = applied.value.round;
      events.push({ eventIndex, type: event.type, playedOrDiscarded: [...event.cardIds], drawn: structuredClone(drawn),
        skippedDraws: terminal ? structuredClone(event.drawIfContinues) : [], handScore: applied.value.handScore,
        accumulatedScore: round.score, handsLeft: round.handsLeft, discardsLeft: round.discardsLeft, trace: applied.trace, evidence: applied.evidence });
      trace.push(...applied.trace);
    }
    let settlement: EngineResult<RoundFinish> | null = null;
    let economicLimitation: string | null = null;
    if (round.status === 'active') economicLimitation = 'La ronda no terminó en este escenario; no se supone victoria ni se anticipa un cobro.';
    else if (!plan.assumptions.noMoneyChangesDuringRound) economicLimitation = 'Falta sostener el saldo durante la ronda; se conserva la puntuación, sin calcular cobro.';
    else {
      settlement = finishRound(round, { expectedRevision: round.game.revision, updatedAt }, options,plan.endChoices??[]);
      gates.push(settlement.evidence);
      if (settlement.ok) trace.push(...settlement.trace);
      else economicLimitation = settlement.errors.map(e => e.message).join(' ');
    }
    return { plan, outcome: errors.length ? 'incompatible' : round.status === 'won' ? 'reached_target' : round.status === 'lost' ? 'hands_exhausted' : round.status==='rescued'?'rescued':'plan_exhausted',
      targetReached: round.status === 'won', events, unexecutedEventIndices: plan.events.map((_,i) => i).slice(events.length),
      handsUsed: initialHands - round.handsLeft, discardsUsed: initialDiscards - round.discardsLeft,
      score: round.score, round, finalState: settlement?.ok ? settlement.value.state : round.game, settlement, economicLimitation, errors };
  });
  result.evidence = mergeEvidence([result.evidence, ...gates]);
  return result;
}
