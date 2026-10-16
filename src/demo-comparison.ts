import { readFileSync } from 'node:fs';
import { parseState } from './state/validation.js';
import { compareShopAlternatives } from './evaluation/comparison.js';
import { comparisonDemoScenarios } from './demo-scenarios.js';

const loaded = parseState(readFileSync(new URL('../../examples/shop-purchase.json', import.meta.url), 'utf8'));
if (!loaded.ok) throw new Error(JSON.stringify(loaded.errors));
console.log('T07b: escenarios sintéticos; reglas provisionales por inspección estática, sin comprobación en partida. Sin recomendación ni porcentajes.');
for (const { title, state, plan } of comparisonDemoScenarios(loaded.value)) {
  const result = compareShopAlternatives(state, plan, { expectedRevision: state.revision, updatedAt: '2026-10-10T12:00:00Z' });
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  console.log('\n' + title);
  if (process.argv.includes('--json')) { console.log(JSON.stringify(result, null, 2)); continue; }
  console.table(result.value.alternatives.map(a => {
    const e = a.evaluation?.ok ? a.evaluation.value : null;
    return { id:a.id, accion:JSON.stringify(a.action), coste:a.netCost, saldoTienda:a.moneyAfterShop,
      manos:e?.events.filter(x=>x.handScore).map(x=>x.handScore!.score).join(' + '), total:e?.score,
      resultado:e?.outcome, manosRestantes:e?.round.handsLeft, descartesUsados:e?.discardsUsed, saldoCobro:a.moneyAfterRound };
  }));
  for (const a of result.value.alternatives) {
    const e = a.evaluation?.ok ? a.evaluation.value : null;
    const errors = !a.shop.ok ? a.shop.errors : a.evaluation && !a.evaluation.ok ? a.evaluation.errors : e?.errors;
    const js = e?.finalState.observed.jokers;
    console.log(a.id + ': ' + JSON.stringify({ errores:errors, limiteEconomico:e?.economicLimitation,
      cobro:e?.settlement?.ok ? e.settlement.value.cashout : null,
      contadores:js?.status === 'known' ? js.value.map(j=>({id:j.instanceId,contadores:j.counters})) : null,
      eventosNoEjecutados:e?.unexecutedEventIndices, evidencia:a.evidence.status }));
  }
  for (const d of result.value.differences) console.log(d.alternativeId + ': ' + d.statements.join(' '));
  console.log(result.value.conclusion);
}
