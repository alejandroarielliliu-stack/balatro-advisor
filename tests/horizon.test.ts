import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseState} from '../src/state/validation.js';
import {validateHorizon,evaluateHorizon} from '../src/evaluation/horizon.js';
import {adviseHorizon} from '../src/advisor/horizon-advisor.js';
import {compareShopHorizon} from '../src/evaluation/horizon-comparison.js';
import {createConfirmedStore,analysisBinding} from '../src/storage/confirmed-store.js';
import {known,success,MemoryStorage} from './helpers.js';
const load=(name:string):unknown=>JSON.parse(readFileSync(new URL(`../../examples/${name}.json`,import.meta.url),'utf8'));
const state=()=>success(parseState(JSON.stringify(load('horizon-golden-state'))));
const horizon=()=>success(validateHorizon(load('horizon-golden')));
const mutation={expectedRevision:0,updatedAt:'2026-10-10T20:00:00Z'};
const cards=(ids:string[])=>ids.map(cardId=>({cardId,knowledge:'hypothetical' as const,basis:'Caso sintético con oráculo literal independiente.'}));

test('horizonte S03: oráculos documentales 25→37→50 y 19→33→50; escenarios equivalentes e inmutables',()=>{
 const s=state(),h=horizon(),before=structuredClone({s,h});const result=success(adviseHorizon(s,h,mutation));
 assert.deepEqual(result.assessments.slice(0,2).map(a=>a.metrics.map(m=>m.moneyAfterRound)),[[37,50],[33,50]]);
 assert.deepEqual(result.assessments.slice(0,2).map(a=>a.metrics.map(m=>m.score)),[[2552,2552],[2552,2552]]); // (10+16+90)*(2+20)
 assert.deepEqual(result.assessments.slice(0,2).map(a=>a.metrics.map(m=>m.handsUsed)),[[1,1],[1,1]]);
 assert.equal(result.recommendation.status,'tie');assert.deepEqual(result.recommendation.candidates,['alternative-0','alternative-1']);
 assert.equal(result.comparison.moneyBefore,25);assert.deepEqual(result.comparison.alternatives.map(a=>a.netCost),[0,6,4,4,-2,-2]);
 const branches=result.comparison.alternatives.slice(0,2).map(a=>success(a.evaluation!));
 assert.deepEqual(branches[0]!.stages.map(s=>success(s.result).plan),branches[1]!.stages.map(s=>success(s.result).plan));
 assert.equal(branches[0]!.stages[1]!.stateBefore.observed.shop.status,'unknown');
 assert.deepEqual({s,h},before);branches[0]!.finalState.runId='mutated-output';assert.deepEqual({s,h},before);
});

test('horizonte no continúa tras un plan insuficiente ni inventa derrota definitiva',()=>{
 const r=success(compareShopHorizon(state(),horizon(),mutation));const sold=r.alternatives.find(a=>a.action.type==='sell'&&a.action.instanceId==='banner')!;
 const e=success(sold.evaluation!);assert.equal(e.outcome,'plan_stopped');assert.equal(e.roundsReached,0);assert.deepEqual(e.unexecutedRoundIndices,[1]);
 const p=success(e.stages[0]!.result);assert.equal(p.score,572);assert.equal(p.round.handsLeft,4);assert.equal(p.settlement,null);
 assert.match(e.stopReason!,/otras jugadas/);
});

test('horizonte detiene la cadena cuando falta supuesto económico, sin perder puntuación calculada',()=>{
 const h=horizon();h.firstPlan.assumptions.noMoneyChangesDuringRound=false;const e=success(evaluateHorizon(state(),h,mutation.updatedAt));
 assert.equal(e.outcome,'settlement_missing');assert.equal(e.roundsReached,1);assert.equal(e.stages.length,1);assert.equal(success(e.stages[0]!.result).score,2552);
 assert.equal(success(adviseHorizon(state(),h,mutation)).recommendation.status,'abstain');
});

test('horizonte conserva incertidumbre por ronda y modo estricto sin fabricar reglas observadas',()=>{
 const h=horizon();h.continuations[0]!.blind.target={status:'unknown',reason:'No transcrito'};
 const r=evaluateHorizon(state(),h,mutation.updatedAt),e=success(r);assert.equal(e.outcome,'incompatible');assert.equal(e.roundsReached,1);assert.equal(e.stages.length,2);
 assert.equal(e.stages[1]!.result.ok,false);assert.equal(success(adviseHorizon(state(),h,mutation)).recommendation.status,'abstain');
 assert.ok(r.evidence.limitations.length>0);assert.equal(adviseHorizon(state(),horizon(),mutation,{requireObserved:true}).ok,false);
});

test('horizonte rechaza saltos, cartas repetidas/ausentes y cambios intermedios fuera del contrato',()=>{
 const h=horizon();h.continuations[0]!.blind.kind='small';assert.equal(evaluateHorizon(state(),h,mutation.updatedAt).ok,false);
 const h2=horizon();h2.continuations[0]!.plan.initialHand[1]=structuredClone(h2.continuations[0]!.plan.initialHand[0]!);
 const e=success(evaluateHorizon(state(),h2,mutation.updatedAt));assert.equal(e.outcome,'incompatible');assert.equal(e.roundsReached,1);
 const h3=horizon();h3.continuations[0]!.plan.events[0]!.cardIds=['AS'];assert.equal(success(evaluateHorizon(state(),h3,mutation.updatedAt)).outcome,'incompatible');
 const h4=horizon();h4.assumptions.noBetweenRoundActions=false;assert.equal(validateHorizon(h4).ok,false);
 assert.equal(validateHorizon({...horizon(),continuations:Array(3).fill(horizon().continuations[0])}).ok,false);
 assert.equal(compareShopHorizon(state(),horizon(),{...mutation,expectedRevision:1}).ok,false);
});

test('horizonte Green: incremento persiste, recursos reinician y cada rama termina a su tiempo',()=>{
 const s=state(),h=horizon();s.observed.money=known(10);if(s.observed.jokers.status==='known')s.observed.jokers.value=s.observed.jokers.value.filter(j=>j.catalogId==='banner');
 if(s.observed.shop.status==='known')s.observed.shop.value.cardOffers=['green_joker','joker'].map((catalogId,i)=>({offerId:catalogId,catalogId,label:catalogId,kind:'joker',price:known(i===0?4:2),edition:known('base'),stickers:known([])}));
 const p=h.firstPlan;p.initialHand=cards(['KS','QH','JD','10C','9S','2H','3D','4C']);
 p.events=['KS','QH','JD','10C','9S'].map((id,i)=>({type:'play',cardIds:[id],drawIfContinues:cards([['2S','3S','4S','5S','6S'][i]!])}));h.continuations[0]!.plan=structuredClone(p);
 const r=success(adviseHorizon(s,h,mutation));
 const get=(id:string)=>r.comparison.alternatives.find(a=>a.action.type==='buy'&&a.action.offerId===id)!;
 const green=success(get('green_joker').evaluation!),joker=success(get('joker').evaluation!);
 assert.deepEqual(green.stages.map(s=>success(s.result).score),[945,1890]);assert.deepEqual(joker.stages.map(s=>success(s.result).score),[1050,1575]);
 assert.deepEqual(green.stages.map(s=>success(s.result).handsUsed),[3,3]);assert.deepEqual(joker.stages.map(s=>success(s.result).handsUsed),[2,3]);
 assert.deepEqual(green.stages.map(s=>success(s.result).settlement!.ok&&success(success(s.result).settlement!).cashout!.balanceAfter),[12,20]);
 assert.equal(green.finalState.observed.jokers.status,'known');if(green.finalState.observed.jokers.status==='known')assert.deepEqual(green.finalState.observed.jokers.value.find(j=>j.catalogId==='green_joker')!.counters.greenMult,known(6));
 assert.equal(r.assessments.find(a=>a.id===get('joker').id)!.moneyAfterHorizon,24);
 assert.ok(!r.preferences.some(p=>p.preferred===get('joker').id&&p.over===get('green_joker').id));
 // Second round: discard three cards in ONE event. Green 3→2 and Banner 90→60.
 const next=h.continuations[0]!.plan;next.events.unshift({type:'discard',cardIds:['2H','3D','4C'],drawIfContinues:cards(['8S','8H','8D'])});
 const changed=success(compareShopHorizon(s,h,mutation));const g=success(changed.alternatives.find(a=>a.action.type==='buy'&&a.action.offerId==='green_joker')!.evaluation!);
 const second=success(g.stages[1]!.result);assert.equal(second.score,1650); // 75*(4+5+6+7)
 assert.equal(second.discardsUsed,1);assert.equal(second.handsUsed,4);assert.equal(success(second.settlement!).cashout!.balanceAfter,19);
});

test('horizonte desconocido Green no contamina rama que lo vende, pero fuerza abstención global',()=>{
 const s=state();if(s.observed.jokers.status==='known')s.observed.jokers.value.push({instanceId:'g',catalogId:'green_joker',edition:known('base'),stickers:known([]),sellValue:known(2),counters:{greenMult:{status:'unknown',reason:'Falta contador'}}});
 const r=success(adviseHorizon(s,horizon(),mutation));assert.equal(r.recommendation.status,'abstain');
 const sale=r.comparison.alternatives.find(a=>a.action.type==='sell'&&a.action.instanceId==='g')!;assert.equal(success(sale.evaluation!).outcome,'completed');
});

test('horizonte ante 8 finaliza sin cobro ni rondas posteriores y permite tres rondas como máximo',()=>{
 const s=state(),h=horizon();s.observed.lastCleared=known({ante:8,kind:'small'});s.observed.nextBlind=known({ante:8,kind:'big',bossId:known('none'),target:known(75000),reward:known(4)});
 h.continuations[0]!.blind={ante:8,kind:'boss',bossId:known('violet_vessel'),target:known(300000),reward:known(8)};
 // Deliberately extreme counter for a software boundary test, NOT a reachable S01–S09 fixture.
 // This isolates the terminal transition without asserting that the initial catalogue can reach this counter.
 if(s.observed.jokers.status==='known')s.observed.jokers.value.push({instanceId:'g',catalogId:'green_joker',edition:known('base'),stickers:known([]),sellValue:known(2),counters:{greenMult:known(10000)}});
 const e=success(evaluateHorizon(s,h,mutation.updatedAt));assert.equal(e.outcome,'completed');const finish=success(success(e.stages[1]!.result).settlement!);assert.equal(finish.goalReached,true);assert.equal(finish.cashout,null);
 h.continuations.push(structuredClone(h.continuations[0]!));assert.equal(evaluateHorizon(s,h,mutation.updatedAt).ok,false);
 const h3=horizon();const last=structuredClone(h3.continuations[0]!);last.blind={ante:2,kind:'boss',bossId:known('the_psychic'),target:known(1600),reward:known(5)};
 last.plan.events[0]!.cardIds=['8S','8H','KS','QH','JD'];last.plan.events[0]!.drawIfContinues=cards(['2S','2H','3S','3H','4S']);h3.continuations.push(last);
 const e3=success(evaluateHorizon(state(),h3,mutation.updatedAt));assert.equal(e3.stages.length,3);assert.equal(e3.outcome,'plan_stopped'); // Half no longer activates: 116*2=232.
 last.plan.initialHand=cards(['5S','6S','7S','8S','9S','KS','QH','JD']);last.plan.events[0]!.cardIds=['5S','6S','7S','8S','9S'];
 const won=success(evaluateHorizon(state(),h3,mutation.updatedAt));assert.equal(won.outcome,'completed');assert.equal(won.roundsReached,3);assert.equal(success(won.stages[2]!.result).score,1800); // (100+35+90)*8
});

test('horizonte nunca persiste efectivo o cartas proyectadas; T09b confirma únicamente compra inicial',()=>{
 const s=state(),storage=new MemoryStorage(),store=createConfirmedStore(()=>storage);success(store.initialize(s));const before=structuredClone(success(store.load()));
 const r=success(adviseHorizon(s,horizon(),mutation));assert.deepEqual(success(store.load()),before);
 const action=r.comparison.alternatives.find(a=>a.action.type==='buy')!.action;
 success(store.confirm({confirmationId:'real-purchase',confirmed:true,expected:analysisBinding(s),updatedAt:mutation.updatedAt,action}));
 const saved=success(store.load())!;assert.deepEqual(saved.state.observed.money,known(19));assert.deepEqual(saved.state.observed.nextBlind,s.observed.nextBlind);assert.equal(saved.history.length,1);
});
