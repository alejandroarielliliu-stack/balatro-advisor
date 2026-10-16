import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseState } from '../src/state/validation.js';
import { comparisonDemoScenarios } from '../src/demo-scenarios.js';
import { adviseShop } from '../src/advisor/advisor.js';
import { compareShopAlternatives } from '../src/evaluation/comparison.js';
import type { AdvisorScenario } from '../src/advisor/advisor.js';
import type { GameState } from '../src/state/model.js';
import { known, success } from './helpers.js';
const demos=()=>comparisonDemoScenarios(success(parseState(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8'))));
const mutation=(s:GameState)=>({expectedRevision:s.revision,updatedAt:'2026-10-10T18:00:00Z'});
const one=(plan:AdvisorScenario['plan']):AdvisorScenario[]=>[{role:'representative',plan}];

test('H3 compra necesaria: Half cubre 450, 572 frente a 80/240; prioridad visible y coste conservado',()=>{
  const {state,plan}=demos()[0]!;const r=success(adviseShop(state,one(plan),mutation(state)));
  assert.equal(r.recommendation.status,'conditional');assert.deepEqual(r.recommendation.action,{type:'buy',offerId:'o2',instanceId:'new:o2'});
  assert.ok(r.recommendation.ruleIds.includes('H-COVERAGE'));
  assert.equal(r.alternatives[2]!.scenarios[0]!.metrics!.margin,122);
  assert.equal(r.alternatives[2]!.scenarios[0]!.calculation.netCost,5);
  assert.deepEqual(r.tiers[0],['alternative-2']);
});
test('H3 ahorro: todos vencen, mantener 37 frente a 34 pese a 1080 frente a 1620',()=>{
  const {state,plan}=demos()[1]!;const r=success(adviseShop(state,one(plan),mutation(state)));
  assert.deepEqual(r.recommendation.action,{type:'hold'});assert.ok(r.recommendation.ruleIds.includes('H-ECONOMY'));
  assert.deepEqual(r.alternatives.map(a=>a.scenarios[0]!.metrics!.moneyAfterRound),[37,34]);
  assert.deepEqual(r.alternatives.map(a=>a.scenarios[0]!.metrics!.score),[1080,1620]);
});
test('H3 sinergia activada: Banner con Even gana donde Joker aislado no basta; trazas, no fórmula duplicada',()=>{
  const {state,plan}=demos()[0]!;plan.events=plan.events.slice(0,1);
  state.observed.jokers=known([{instanceId:'even',catalogId:'even_steven',edition:known('base'),stickers:known([]),sellValue:known(2),counters:{}}]);
  if(state.observed.shop.status==='known'){const offer=state.observed.shop.value.cardOffers[1]!;offer.catalogId='banner';offer.label='Banner';}
  const r=success(adviseShop(state,one(plan),mutation(state)));
  assert.deepEqual(r.recommendation.action,{type:'buy',offerId:'o2',instanceId:'new:o2'});
  const banner=r.alternatives.find(a=>a.action.type==='buy' && a.action.offerId==='o2')!;
  const joker=r.alternatives.find(a=>a.action.type==='buy' && a.action.offerId==='o1')!;
  assert.equal(banner.scenarios[0]!.metrics!.score,1160);assert.equal(joker.scenarios[0]!.metrics!.score,364);
  const effects=banner.scenarios[0]!.activatedEffects.flatMap(e=>e.trace.map(t=>t.ruleId));
  assert.ok(effects.includes('even_steven.effect'));assert.ok(effects.includes('banner.effect'));
  assert.ok(banner.conditions.some(c=>c.includes('descartes')));
});
test('H3 crecimiento: evidencia aplicada por mano, venta sacrifica contador y recursos no son dólares',()=>{
  const {state,plan}=demos()[2]!;const r=success(adviseShop(state,one(plan),mutation(state)));
  const hold=r.alternatives[0]!,replacement=r.alternatives.find(a=>a.action.type==='replace')!;
  assert.deepEqual(hold.scenarios[0]!.growth[0]!.before,known(10));assert.deepEqual(hold.scenarios[0]!.growth[0]!.after,known(12));
  assert.deepEqual(replacement.sacrificed[0]!.counters.greenMult,known(10));
  assert.ok(hold.conditions.some(c=>c.includes('no se valora solo')));
  assert.equal(r.recommendation.status,'tie'); // dinero de hold y manos ahorradas por reemplazo son compromisos.
});
test('H3 incertidumbre: una rama calculable no basta para recomendar si las demás desconocen Green',()=>{
  const {state,plan}=demos()[3]!;const r=success(adviseShop(state,one(plan),mutation(state)));
  assert.equal(r.recommendation.status,'abstain');assert.equal(r.recommendation.action,null);
  assert.ok(r.alternatives.find(a=>a.action.type==='replace')!.complete);
});
test('H3 escenarios cruzados: Half en pareja, Banner en escalera; sin promedio ni preferencia única',()=>{
  const {state,plan}=demos()[0]!;plan.events=plan.events.slice(0,1);
  if(state.observed.shop.status==='known') {const offers=state.observed.shop.value.cardOffers;offers[0]!.catalogId='banner';offers[0]!.price=known(5);offers[0]!.label='Banner';}
  const other=structuredClone(plan);other.planId='straight';
  other.initialHand=['2S','3H','4D','5C','6S','KS','QH','JD'].map(cardId=>({cardId,knowledge:'hypothetical',basis:'Caso sintético'}));
  other.events=[{type:'play',cardIds:['2S','3H','4D','5C','6S'],drawIfContinues:['7S','7H','8D','9C','10S'].map(cardId=>({cardId,knowledge:'hypothetical',basis:'Caso sintético'}))}];
  const scenarios:AdvisorScenario[]=[{role:'favorable',plan},{role:'adverse',plan:other}];
  const r=success(adviseShop(state,scenarios,mutation(state)));
  assert.equal(r.recommendation.status,'tie');assert.deepEqual(r.tiers[0],['alternative-1','alternative-2']);
  assert.deepEqual(r.alternatives[1]!.scenarios.map(s=>s.metrics!.reached),[false,true]);
  assert.deepEqual(r.alternatives[2]!.scenarios.map(s=>s.metrics!.reached),[true,false]);
  assert.deepEqual(r.alternatives[1]!.scenarios.map(s=>s.metrics!.score),[232,560]);
  assert.deepEqual(r.alternatives[2]!.scenarios.map(s=>s.metrics!.score),[572,200]);
  assert.deepEqual(success(adviseShop(state,[...scenarios].reverse(),mutation(state))).tiers,r.tiers);
});
test('H3 empate real de dos ofertas equivalentes; orden de oferta no decide ganador',()=>{
  const {state,plan}=demos()[0]!;
  if(state.observed.shop.status==='known'){const offers=state.observed.shop.value.cardOffers;offers[0]={...structuredClone(offers[1]!),offerId:'o1'};}
  const r=success(adviseShop(state,one(plan),mutation(state)));
  assert.equal(r.recommendation.status,'tie');assert.deepEqual(r.tiers[0],['alternative-1','alternative-2']);
});
test('H3 sin escenarios o ninguno suficiente: abstenerse, no diagnosticar derrota',()=>{
  const {state,plan}=demos()[0]!;
  assert.equal(success(adviseShop(state,[],mutation(state))).recommendation.status,'abstain');
  state.observed.money=known(0);
  const r=success(adviseShop(state,one(plan),mutation(state)));
  assert.equal(r.recommendation.status,'abstain');assert.ok(r.recommendation.reason.includes('no se infiere'));
  assert.equal(r.alternatives.filter(a=>!a.legal).length,2);
});
test('H3 cobro desconocido conserva mejora de cobertura, pero impide decidir ahorro entre ganadores',()=>{
  const a=demos()[0]!, b=demos()[1]!;
  for(const {state} of [a,b])if(state.observed.nextBlind.status==='known')state.observed.nextBlind.value.reward={status:'unknown',reason:'No transcrita'};
  assert.equal(success(adviseShop(a.state,one(a.plan),mutation(a.state))).recommendation.status,'conditional');
  assert.equal(success(adviseShop(b.state,one(b.plan),mutation(b.state))).recommendation.status,'tie');
});
test('H3 selección explícita de acciones T07b se declara y se valida; no permite ofertas inventadas',()=>{
  const {state,plan}=demos()[0]!;const comp=success(compareShopAlternatives(state,plan,mutation(state)));
  const actions=[comp.alternatives[0]!.action,comp.alternatives[2]!.action];
  const r=success(adviseShop(state,one(plan),mutation(state),{actions}));
  assert.equal(r.alternatives.length,2);assert.ok(r.limitations.some(l=>l.includes('subconjunto')));
  const bad=adviseShop(state,one(plan),mutation(state),{actions:[{type:'buy',offerId:'fake',instanceId:'x'}]});assert.ok(!bad.ok);
});
test('H3 inmutable, determinista y trazable a T07b; evidencia local no se convierte en observación',()=>{
  const {state,plan}=demos()[0]!;const before=JSON.stringify({state,plan});
  const r=adviseShop(state,one(plan),mutation(state));assert.ok(r.ok);
  assert.deepEqual(r,adviseShop(state,one(plan),mutation(state)));assert.equal(JSON.stringify({state,plan}),before);
  const c=success(compareShopAlternatives(state,plan,mutation(state)));
  assert.deepEqual(r.value.alternatives.map(a=>a.scenarios[0]!.calculation),c.alternatives);
  assert.equal(r.evidence.verifiedAgainstGame,false);assert.equal(r.evidence.status,'limited');
  const strict=adviseShop(state,one(plan),mutation(state),{requireObserved:true});assert.ok(!strict.ok);assert.equal(strict.errors[0]!.code,'pending_rule');
});
test('H3 entrada malformada, IDs repetidos y precio desconocido no producen un consejo firme',()=>{
  const {state,plan}=demos()[0]!;
  assert.ok(!adviseShop(state,[{role:'inventado',plan}],mutation(state)).ok);
  assert.ok(!adviseShop(state,[...one(plan),...one(plan)],mutation(state)).ok);
  if(state.observed.shop.status==='known')state.observed.shop.value.cardOffers[0]!.price={status:'unknown',reason:'Falta precio'};
  assert.equal(success(adviseShop(state,one(plan),mutation(state))).recommendation.status,'abstain');
});
test('H3 Green aplicado frente a ahorro: compromiso explícito, no tratar crecimiento como puntos gratis',()=>{
  const {state,plan}=demos()[1]!;
  if(state.observed.shop.status==='known'){const offer=state.observed.shop.value.cardOffers[0]!;offer.catalogId='green_joker';offer.price=known(4);offer.label='Green';}
  const r=success(adviseShop(state,one(plan),mutation(state)));
  assert.equal(r.recommendation.status,'tie');assert.deepEqual(r.tiers[0],['alternative-0','alternative-1']);
  assert.equal(r.alternatives[1]!.scenarios[0]!.metrics!.score,1215);
  assert.equal(r.alternatives[1]!.scenarios[0]!.metrics!.moneyAfterRound,32);
  assert.deepEqual(r.alternatives[1]!.scenarios[0]!.metrics!.persistentBenefits,['green-applied']);
  assert.ok(r.limitations.some(l=>l.includes('H-PERSISTENCE')));
});
test('H3 errores de jefe y enumeración incompleta se propagan; no fabrican supervivencia',()=>{
  const {state,plan}=demos()[0]!;
  state.observed.nextBlind={status:'unknown',reason:'No registrada'};
  const r=success(adviseShop(state,one(plan),mutation(state)));assert.equal(r.recommendation.status,'abstain');
  assert.ok(r.alternatives.every(a=>!a.complete));
  const b=demos()[1]!;b.state.observed.shop={status:'unknown',reason:'No transcrita'};
  const r2=success(adviseShop(b.state,one(b.plan),mutation(b.state)));assert.equal(r2.recommendation.status,'abstain');
  assert.equal(r2.errors[0]!.code,'unknown_data');assert.equal(r2.alternatives[0]!.scenarios[0]!.metrics!.score,1080);
});
test('H3 demo ejecutable conserva estados conditional/tie/abstain y versión de política',()=>{
  const output=execFileSync(process.execPath,[fileURLToPath(new URL('../src/demo-advisor.js',import.meta.url))],{encoding:'utf8'});
  for(const text of ['h3-2','conditional','tie','abstain','H-COVERAGE','H-ECONOMY'])assert.ok(output.includes(text));
});
