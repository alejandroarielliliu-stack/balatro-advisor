import type { GameState, Issue } from '../state/model.js';
import { applyShopAction, enumerateActions } from '../rules/shop.js';
import type { ShopAction, ShopChange, Mutation } from '../rules/shop.js';
import { fail, run, stateInput } from '../rules/core.js';
import type { EngineOptions, EngineResult } from '../rules/core.js';
import { evaluateRoundPlan, mergeEvidence, validateRoundPlan } from './plan.js';
import type { PlanEvaluation } from './plan.js';
import type { AnalysisGate } from '../rules/evidence.js';
import { orderShopCandidates } from './shop-candidates.js';

export interface Alternative {
  id: string; action: ShopAction; shop: EngineResult<ShopChange>; evaluation: EngineResult<PlanEvaluation> | null;
  moneyBefore: number | null; moneyAfterShop: number | null; netCost: number | null; moneyAfterRound: number | null;
  evidence: AnalysisGate;
}
export interface Difference {
  alternativeId: string; baselineId: string;
  scoreDelta: number | null; shopMoneyDelta: number | null; settledMoneyDelta: number | null;
  handsUsedDelta: number | null; discardsUsedDelta: number | null; statements: string[];
}
export interface Comparison {
  inputRevision: number; rulesetId: string; scenario: unknown; alternatives: Alternative[];
  enumerationErrors: Issue[]; coverage: { included: string[]; excluded: string[]; exhaustive: false };
  differences: Difference[]; recommendation: null; conclusion: string;
}
const money = (s: GameState): number | null => s.observed.money.status === 'known' ? s.observed.money.value : null;
const difference = (a: number | null, b: number | null) => a === null || b === null ? null : a - b;
function comparable(a: Alternative): PlanEvaluation | null {
  return a.evaluation?.ok && a.evaluation.value.outcome !== 'incompatible' ? a.evaluation.value : null;
}
function describe(a: Alternative, base: Alternative): Difference {
  const av = comparable(a), bv = comparable(base), statements: string[] = [];
  const scoreDelta = av && bv ? av.score - bv.score : null;
  const shopMoneyDelta = difference(a.moneyAfterShop, base.moneyAfterShop);
  const settledMoneyDelta = difference(a.moneyAfterRound, base.moneyAfterRound);
  if (!av || !bv) statements.push('Comparación de ronda incompleta: consultar errores y datos ausentes de ambas ramas.');
  else {
    statements.push(`Puntos acumulados: ${av.score} frente a ${bv.score}; eventos ejecutados: ${av.events.length} frente a ${bv.events.length}. No son una potencia máxima ni igual número de manos garantizado.`);
    statements.push(`Objetivo en este escenario: ${av.targetReached ? 'alcanzado' : 'no alcanzado'} frente a ${bv.targetReached ? 'alcanzado' : 'no alcanzado'}.`);
    if (av.outcome === 'plan_exhausted' || bv.outcome === 'plan_exhausted') statements.push('Un plan agotado con manos disponibles no demuestra que la partida se pierda.');
  }
  if (shopMoneyDelta !== null) statements.push(`Diferencia de saldo tras tienda: ${shopMoneyDelta}.`);
  if (settledMoneyDelta !== null) statements.push(`Diferencia de saldo tras cobro: ${settledMoneyDelta}; ambos cobros calculados por separado.`);
  else statements.push('No se comparan como equivalentes un saldo sin cobro y otro con cobro.');
  if ((a.action.type === 'replace' || a.action.type === 'sell') && base.shop.ok) {
    const js = base.shop.value.state.observed.jokers;
    const soldId = a.action.type==='sell' ? a.action.instanceId : a.action.sellInstanceId;
    const sold = js.status === 'known' ? js.value.find(j => j.instanceId === soldId) : undefined;
    if (sold) {
      statements.push(`Se vende ${sold.catalogId} (${sold.instanceId}); se pierde su efecto y sus contadores: ${JSON.stringify(sold.counters)}. No se transfieren a la compra.`);
      if (sold.catalogId === 'golden_joker') statements.push('Se renuncia al ingreso de Golden en las siguientes rondas ganadas; no se valora un horizonte futuro.');
      if (sold.catalogId === 'green_joker') statements.push('Se renuncia al crecimiento acumulado y futuro de esa instancia de Green.');
    }
  }
  return { alternativeId: a.id, baselineId: base.id, scoreDelta, shopMoneyDelta, settledMoneyDelta,
    handsUsedDelta: av && bv ? av.handsUsed - bv.handsUsed : null, discardsUsedDelta: av && bv ? av.discardsUsed - bv.discardsUsed : null, statements };
}
/** Single-action candidates only. No ranking, strategic preference or stochastic search. */
export function compareShopAlternatives(input: unknown, planInput: unknown, mutation: Mutation, options: EngineOptions = {}): EngineResult<Comparison> {
  const gates: AnalysisGate[] = [];
  const result = run<Comparison>([], options, () => {
    const state = stateInput(input);
    const checked = validateRoundPlan(planInput);
    if (!checked.ok) { const e = checked.errors[0]!; fail(e.path, e.code, e.message); }
    const plan = checked.value;
    const candidates = enumerateActions(state, mutation, options); gates.push(candidates.evidence);
    // Unknown shop does not prevent examining hold. Surface incomplete enumeration explicitly.
    const actions: ShopAction[] = candidates.ok ? orderShopCandidates(candidates.value.map(c => c.action)) : [{ type: 'hold' }];
    const alternatives = actions.map((action, i): Alternative => {
      const shop = applyShopAction(state, action, mutation, options); gates.push(shop.evidence);
      const evaluation = shop.ok ? evaluateRoundPlan(shop.value.state, plan, mutation.updatedAt, options) : null;
      if (evaluation) gates.push(evaluation.evidence);
      const before = money(state), after = shop.ok ? money(shop.value.state) : null;
      const settled = evaluation?.ok ? evaluation.value.settlement : null;
      return { id: `alternative-${i}`, action, shop, evaluation, moneyBefore: before, moneyAfterShop: after,
        netCost: difference(before, after), moneyAfterRound: settled?.ok && settled.value.cashout ? settled.value.cashout.balanceAfter : null,
        evidence: mergeEvidence([shop.evidence, ...(evaluation ? [evaluation.evidence] : [])]) };
    });
    const base = alternatives[0]!;
    return { inputRevision: state.revision, rulesetId: state.rulesetId, scenario: structuredClone(plan), alternatives,
      enumerationErrors: candidates.ok ? [] : candidates.errors,
      coverage: { included: ['conservar', 'una compra por oferta', 'una venta seguida de una compra por pareja instancia/oferta', 'una venta individual por comodín poseído'],
        excluded: ['varias compras o ventas', 'reordenar comodines', 'rerolls, paquetes, vales, consumibles', 'adaptar manos o robos por alternativa'], exhaustive: false },
      differences: alternatives.slice(1).map(a => describe(a, base)), recommendation: null,
      conclusion: 'Comparación condicional de un escenario explícito. Sin orden heurístico ni recomendación concluyente; revisar objetivo, dinero, recursos, contadores y límites por separado.' };
  });
  result.evidence = mergeEvidence([result.evidence, ...gates]);
  return result;
}
