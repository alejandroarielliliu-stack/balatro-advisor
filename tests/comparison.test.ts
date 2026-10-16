import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseState } from '../src/state/validation.js';
import { comparisonDemoScenarios } from '../src/demo-scenarios.js';
import { compareShopAlternatives } from '../src/evaluation/comparison.js';
import type { Alternative } from '../src/evaluation/comparison.js';
import { evaluateRoundPlan, validateRoundPlan } from '../src/evaluation/plan.js';
import type { RoundPlan } from '../src/evaluation/plan.js';
import type { GameState } from '../src/state/model.js';
import { known, success } from './helpers.js';

// Literal oracles derived independently in docs/evidencia/t07b-oraculos.md.
const scenarios = () => comparisonDemoScenarios(success(parseState(readFileSync(new URL('../../examples/shop-purchase.json', import.meta.url), 'utf8'))));
const mutation = (s: GameState) => ({ expectedRevision: s.revision, updatedAt: '2026-10-10T12:00:00Z' });
const evaluation = (a: Alternative) => { assert.ok(a.evaluation); return success(a.evaluation); };
const draw = (...ids: string[]): RoundPlan['initialHand'] => ids.map(cardId => ({ cardId, knowledge: 'hypothetical', basis: 'Caso sintético.' }));
function freeze(value: unknown) { if (value && typeof value === 'object') { Object.freeze(value); for (const x of Object.values(value)) freeze(x); } }

test('A: mismo plan, Half vence antes; conservar agota el plan con tres manos aún disponibles', () => {
  const { state, plan } = scenarios()[0]!;
  const r = success(compareShopAlternatives(state, plan, mutation(state)));
  const [hold, joker, half] = r.alternatives;
  assert.deepEqual(r.alternatives.map(a => a.action.type), ['hold','buy','buy']);
  assert.deepEqual(r.alternatives.map(a => evaluation(a).score), [80,240,572]);
  assert.deepEqual(evaluation(hold!).events.map(e => e.handScore?.score), [52,28]);
  assert.equal(evaluation(hold!).outcome, 'plan_exhausted'); assert.equal(evaluation(hold!).round.handsLeft, 3);
  assert.equal(evaluation(joker!).targetReached, false);
  assert.equal(evaluation(half!).outcome, 'reached_target'); assert.equal(evaluation(half!).round.handsLeft, 4);
  assert.deepEqual(evaluation(half!).unexecutedEventIndices, [1]);
  assert.deepEqual(evaluation(half!).events[0]!.skippedDraws, plan.events[0]!.drawIfContinues);
  assert.deepEqual(evaluation(half!).events[0]!.drawn, []);
  assert.deepEqual(evaluation(hold!).events[0]!.drawn, plan.events[0]!.drawIfContinues);
  assert.equal(hold!.moneyAfterRound, null); assert.equal(half!.moneyAfterRound, 10);
  assert.equal(r.differences[1]!.settledMoneyDelta, null); assert.equal(r.recommendation, null);
  assert.equal(r.coverage.exhaustive, false);
});

test('B: ambas vencen; más puntos con Joker, conservar deja tres dólares más tras cobro', () => {
  const { state, plan } = scenarios()[1]!;
  const r = success(compareShopAlternatives(state, plan, mutation(state)));
  assert.deepEqual(r.alternatives.map(a => evaluation(a).score), [1080,1620]);
  assert.deepEqual(r.alternatives.map(a => a.moneyAfterShop), [25,23]);
  assert.deepEqual(r.alternatives.map(a => a.moneyAfterRound), [37,34]);
  assert.deepEqual(r.alternatives.map(a => evaluation(a).handsUsed), [1,1]);
  assert.equal(r.differences[0]!.scoreDelta, 540); assert.equal(r.differences[0]!.settledMoneyDelta, -3);
  const cashout = evaluation(r.alternatives[1]!).settlement;
  assert.ok(cashout?.ok); assert.deepEqual(cashout.value.cashout,
    { balanceBefore:23, blindReward:3, unusedHands:4, goldenIncome:0, interest:4, earned:11, balanceAfter:34 });
});

test('C: reemplazo ejecuta venta→compra y pierde Green 10; no hereda crecimiento', () => {
  const { state, plan } = scenarios()[2]!;
  const r = success(compareShopAlternatives(state, plan, mutation(state)));
  const [hold, buy, replace] = r.alternatives;
  assert.deepEqual(r.alternatives.map(a => a.netCost), [0,5,3,-2]);
  // Selling Green leaves base three-kind 54*3 + pair 14*2 = 190; plan does not win.
  assert.deepEqual(r.alternatives.map(a => evaluation(a).score), [952,1836,1242,190]);
  assert.deepEqual(r.alternatives.map(a => a.moneyAfterRound), [18,13,15,null]);
  const g = evaluation(hold!).finalState.observed.jokers; assert.ok(g.status === 'known');
  assert.deepEqual(g.value[0]!.counters.greenMult, known(12));
  const kept = evaluation(buy!).finalState.observed.jokers; assert.ok(kept.status === 'known');
  assert.deepEqual(kept.value[0]!.counters.greenMult, known(11));
  assert.ok(replace!.shop.ok); assert.equal(replace!.shop.value.steps.length, 2);
  assert.deepEqual(replace!.shop.value.steps.map(s => s.observed.money), [known(12),known(7)]);
  const js = evaluation(replace!).finalState.observed.jokers; assert.ok(js.status === 'known');
  assert.equal(js.value[0]!.catalogId, 'half_joker'); assert.deepEqual(js.value[0]!.counters, {});
  assert.ok(r.differences[1]!.statements.some(s => s.includes('crecimiento')));
});

test('D: Green desconocido bloquea esas manos, no la rama que lo vende', () => {
  const { state, plan } = scenarios()[3]!;
  const r = success(compareShopAlternatives(state, plan, mutation(state)));
  assert.deepEqual(r.alternatives.map(a => evaluation(a).outcome), ['incompatible','incompatible','reached_target','plan_exhausted']);
  assert.equal(evaluation(r.alternatives[0]!).errors[0]!.code, 'unknown_data');
  assert.equal(r.differences[1]!.scoreDelta, null); assert.equal(r.recommendation, null);
  assert.ok(!r.alternatives[2]!.evidence.limitations.some(l => l.ruleId === 'green.timing'));
});

test('inmutabilidad y equivalencia: entradas congeladas, planes idénticos, ramas independientes y deterministas', () => {
  const { state, plan } = scenarios()[2]!;
  const before = JSON.stringify({ state, plan }); freeze(state); freeze(plan);
  const a = success(compareShopAlternatives(state, plan, mutation(state)));
  assert.equal(JSON.stringify({ state, plan }), before);
  assert.deepEqual(a, success(compareShopAlternatives(state, plan, mutation(state))));
  for (const branch of a.alternatives) assert.deepEqual(evaluation(branch).plan, plan);
  evaluation(a.alternatives[0]!).finalState.runId = 'edited-result';
  assert.notEqual(evaluation(a.alternatives[1]!).finalState.runId, 'edited-result');
  assert.equal(JSON.stringify({ state, plan }), before);
});

test('legalidad por rama: robos condicionales incompletos no se reparan; una rama terminal no los necesita', () => {
  const { state, plan } = scenarios()[0]!; plan.events[0]!.drawIfContinues = [];
  const r = success(compareShopAlternatives(state, plan, mutation(state)));
  assert.equal(evaluation(r.alternatives[0]!).outcome, 'incompatible');
  assert.equal(evaluation(r.alternatives[0]!).errors[0]!.code, 'invalid_draws');
  assert.equal(evaluation(r.alternatives[0]!).handsUsed, 0);
  assert.equal(evaluation(r.alternatives[2]!).outcome, 'reached_target');
});

test('rechaza cartas inexistentes, duplicadas, fuera de mano y robos ya usados', () => {
  for (const kind of ['unknown','duplicate','not-in-hand','used-draw']) {
    const { state, plan } = scenarios()[0]!;
    if (kind === 'unknown') plan.initialHand[0]!.cardId = 'ASX';
    if (kind === 'duplicate') plan.initialHand[1]!.cardId = plan.initialHand[0]!.cardId;
    if (kind === 'not-in-hand') plan.events[0]!.cardIds = ['AS'];
    if (kind === 'used-draw') plan.events[0]!.drawIfContinues = draw('8S','2S');
    const r = evaluateRoundPlan(state, plan, mutation(state).updatedAt);
    if (kind === 'unknown' || kind === 'duplicate') { assert.ok(!r.ok); assert.ok(r.errors.length); }
    else { assert.ok(r.ok); assert.equal(r.value.outcome, 'incompatible'); assert.equal(r.value.handsUsed, 0); }
  }
});

test('descartar actualiza Green antes de la siguiente mano y conserva procedencia declarada de cartas', () => {
  const { state, plan } = scenarios()[2]!;
  if (state.observed.jokers.status === 'known') state.observed.jokers.value[0]!.counters.greenMult = known(2);
  plan.initialHand[0]!.knowledge = 'known'; plan.initialHand[0]!.basis = 'Transcripción de una mano observada para reproducir el escenario.';
  plan.events = [{ type:'discard',cardIds:['4C'],drawIfContinues:draw('2C') }, plan.events[0]!];
  const r = success(evaluateRoundPlan(state, plan, mutation(state).updatedAt));
  assert.equal(r.score, 270); assert.equal(r.handsUsed, 1); assert.equal(r.discardsUsed, 1);
  assert.equal(r.round.discardsLeft, 2); assert.equal(r.events[0]!.handScore, null);
  assert.equal(r.plan.initialHand[0]!.knowledge, 'known'); assert.equal(r.events[0]!.drawn[0]!.knowledge, 'hypothetical');
  assert.deepEqual(r.finalState.observed.jokers.status === 'known' && r.finalState.observed.jokers.value[0]!.counters.greenMult, known(2));
});

test('cuarto descarte incompatible; no consume recursos ni cambia el plan para salvarlo', () => {
  const { state, plan } = scenarios()[0]!;
  plan.events = ['4C','2C','3C','4S'].map((id,i) => ({ type:'discard',cardIds:[id],drawIfContinues:draw(['2C','3C','4S','5C'][i]!) }));
  const r = success(evaluateRoundPlan(state, plan, mutation(state).updatedAt));
  assert.equal(r.outcome, 'incompatible'); assert.equal(r.discardsUsed, 3); assert.equal(r.handsUsed, 0);
  assert.equal(r.errors[0]!.code, 'no_discards'); assert.deepEqual(r.unexecutedEventIndices, [3]);
});

test('agotamiento real de cinco manos se distingue de plan agotado; no ejecuta eventos posteriores', () => {
  const { state, plan } = scenarios()[0]!;
  const ids = ['KS','QH','JD','8S','8H','4C'];
  plan.events = ids.map((id,i) => ({ type:'play',cardIds:[id],drawIfContinues:draw(['2S','2H','3S','3H','4S','5H'][i]!) }));
  const r = success(evaluateRoundPlan(state, plan, mutation(state).updatedAt));
  assert.equal(r.outcome, 'hands_exhausted'); assert.equal(r.handsUsed, 5); assert.equal(r.score, 71);
  assert.deepEqual(r.unexecutedEventIndices, [5]); assert.equal(r.round.handsLeft, 0);
  assert.ok(r.settlement?.ok); assert.equal(r.settlement.value.cashout?.earned, 0);
});

test('recompensa desconocida y supuesto económico ausente limitan cobro, no puntuación', () => {
  const { state, plan } = scenarios()[1]!;
  if (state.observed.nextBlind.status === 'known') state.observed.nextBlind.value.reward = { status:'unknown',reason:'No transcrita' };
  const r = success(compareShopAlternatives(state, plan, mutation(state)));
  assert.deepEqual(r.alternatives.map(a => evaluation(a).score), [1080,1620]);
  assert.deepEqual(r.alternatives.map(a => a.moneyAfterRound), [null,null]);
  const e = evaluation(r.alternatives[0]!); assert.equal(e.outcome, 'reached_target'); assert.ok(e.settlement && !e.settlement.ok);
  assert.equal(e.settlement.errors[0]!.code, 'unknown_data');
  plan.assumptions.noMoneyChangesDuringRound = false;
  const e2 = success(evaluateRoundPlan(state, plan, mutation(state).updatedAt));
  assert.equal(e2.score, 1080); assert.equal(e2.settlement, null); assert.ok(e2.economicLimitation);
});

test('evidencia provisional propagada, modo estricto conserva abstención, sin Green no hay dependencia Green', () => {
  const { state, plan } = scenarios()[0]!;
  const r = compareShopAlternatives(state, plan, mutation(state)); assert.ok(r.ok);
  assert.equal(r.evidence.status, 'limited'); assert.equal(r.evidence.verifiedAgainstGame, false);
  assert.ok(r.evidence.limitations.some(l => l.evidenceIds.includes('L01')));
  assert.ok(!r.value.alternatives[0]!.evidence.limitations.some(l => l.ruleId.startsWith('interest.')));
  assert.ok(!r.evidence.limitations.some(l => l.ruleId.startsWith('green.')));
  const strict = compareShopAlternatives(state, plan, mutation(state), { requireObserved: true });
  assert.ok(!strict.ok); assert.equal(strict.errors[0]!.code, 'pending_rule'); assert.equal(strict.evidence.status, 'abstain');
});

test('acciones ilegales se conservan con causa; tienda desconocida permite hold y declara enumeración incompleta', () => {
  const { state, plan } = scenarios()[0]!; state.observed.money = known(0);
  const r = success(compareShopAlternatives(state, plan, mutation(state)));
  assert.equal(r.alternatives[0]!.shop.ok, true);
  for (const a of r.alternatives.slice(1)) { assert.ok(!a.shop.ok); assert.equal(a.shop.errors[0]!.code, 'insufficient_money'); assert.equal(a.evaluation, null); }
  state.observed.shop = { status:'unknown',reason:'No transcrita' };
  const r2 = success(compareShopAlternatives(state, plan, mutation(state)));
  assert.equal(r2.alternatives.length, 1); assert.equal(r2.enumerationErrors[0]!.code, 'unknown_data'); assert.equal(evaluation(r2.alternatives[0]!).score, 80);
});

test('validación de escenario: sin procedencia, vacío, con campos extra, arrays dispersos o ciclos', () => {
  assert.ok(!validateRoundPlan({}).ok);
  const { state, plan } = scenarios()[0]!;
  assert.ok(!validateRoundPlan({ ...plan, events: [] }).ok);
  assert.ok(!validateRoundPlan({ ...plan, chanceToWin: 1 }).ok);
  assert.ok(!validateRoundPlan({ ...plan, initialHand: new Array(8) }).ok);
  const circular: Record<string,unknown> = {}; circular.self = circular;
  assert.ok(!compareShopAlternatives(state, circular, mutation(state)).ok);
  assert.ok(!validateRoundPlan({ ...plan, initialHand: plan.initialHand.map(c => ({cardId:c.cardId})) }).ok);
});

test('demo de comparación ejecutable, cuatro casos y ausencia explícita de ranking', () => {
  const output = execFileSync(process.execPath, [fileURLToPath(new URL('../src/demo-comparison.js', import.meta.url))], { encoding:'utf8' });
  for (const title of ['A. Comprar','B. Más puntos','C. Reemplazar','D. Contador']) assert.ok(output.includes(title));
  assert.ok(output.includes('Sin orden heurístico')); assert.ok(output.includes('plan_exhausted'));
});
