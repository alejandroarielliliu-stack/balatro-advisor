import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createNewRun} from '../src/run/start.js';
import {applyRunProgress} from '../src/run/progress.js';
import {projectSkipBlind,selectionScenarioState} from '../src/rules/tags.js';
import {compareBlindChoices,blindDecisionIsCurrent} from '../src/advisor/blind-decision.js';
import {projectCashout} from '../src/rules/economy.js';
import {evaluateRoundPlan} from '../src/evaluation/plan.js';
import {getEngineRuleRegistry} from '../src/rules/engine-evidence.js';
import {known,success} from './helpers.js';
import type {GameState,Fact} from '../src/state/model.js';
import type {AdvisorScenario} from '../src/advisor/advisor.js';
const now='2026-10-16T20:00:00Z',unknown={status:'unknown' as const,reason:'No observado.'};
function selection(money:Fact<number>=known(4),tag='tag_economy'){
 const state=success(createNewRun({runId:'synthetic-blind-decision',updatedAt:now,deckId:'blue',profileConfirmed:true}));
 state.observed.money=money;if(state.phase==='blind_select')state.phaseData.skipTag=known(tag);return state;
}
const card=(cardId:string)=>({cardId,knowledge:'hypothetical' as const,basis:'Escenario sintético explícito; no predicción de robo.'});
function scenario(id='royal',pair=false):AdvisorScenario{return {role:'representative',plan:{schemaVersion:'scenario-1',planId:id,description:id,initialHand:(pair?['8S','8H','2S','3S','4H','5D','6C','7D']:['AS','KS','QS','JS','10S','2H','3D','4C']).map(card),events:[{type:'play',cardIds:pair?['8S','8H']:['AS','KS','QS','JS','10S'],drawIfContinues:(pair?['9S','9H']:['5S','6S','7S','8S','9S']).map(card)}],assumptions:{noMoneyChangesDuringRound:true}}};}
// Independent literal oracles: owned game.lua/tag.lua and state_events.lua (documented L09).
// Economy: min(40,max(0,money)); Investment: 25/tag, on boss eval, not added to interest basis.
test('TAG01b Economy límites, deuda y saldo conocido; no modifica estado, revisión ni historial real',()=>{
 for(const [before,income,after]of [[-4,0,-4],[0,0,0],[4,4,8],[39,39,78],[40,40,80],[61,40,101]]){
  const s=selection(known(before!)),copy=structuredClone(s),r=projectSkipBlind(s);assert.ok(r.ok);assert.equal(r.value.immediateIncome,income);assert.equal(r.value.moneyAfter,after);assert.equal(r.value.state.phase,'blind_select');assert.equal(r.value.state.revision,0);assert.deepEqual(r.value.state.observed.lastCleared,s.observed.lastCleared);assert.equal(r.value.state.recentRounds,undefined);assert.equal(r.value.state.observed.shop.status,'unknown');assert.deepEqual(s,copy);assert.equal(r.projected,true);assert.equal(r.evidence.verifiedAgainstGame,false);
 }
 const overflow=projectSkipBlind(selection(known(Number.MAX_SAFE_INTEGER)));assert.ok(!overflow.ok);assert.equal(overflow.errors[0]!.code,'numeric_range');
});
test('TAG01b Investment crea obligación pendiente de25 sin anticipar efectivo, incluso con saldo desconocido',()=>{
 const s=selection(unknown,'tag_investment'),r=projectSkipBlind(s);assert.ok(r.ok);assert.equal(r.value.moneyAfter,null);assert.equal(r.value.immediateIncome,0);assert.equal(r.value.deferredIncome?.dollars,25);assert.equal(r.value.state.observed.money.status,'unknown');
 if(r.value.state.observed.jokerContext?.status==='known'){assert.deepEqual(r.value.state.observed.jokerContext.value.tags,known(['tag_investment']));assert.deepEqual(r.value.state.observed.jokerContext.value.blindsSkipped,known(1));}
 const missing=projectSkipBlind(selection(unknown));assert.ok(!missing.ok);assert.equal(missing.errors[0]!.code,'unknown_data');
});
test('TAG01b Double y etiquetas inmediatas no se omiten; unknown/unsupported solo limitan salto',()=>{
 for(const tags of [known(['tag_double']),known(['tag_orbital']),unknown]){const s=selection();s.observed.jokerContext=known({tags});assert.equal(projectSkipBlind(s).ok,false);}
 const s=selection(known(4),'tag_buffoon'),r=success(compareBlindChoices(s,{playScenarios:[scenario()]}));assert.equal(r.skip.ok,false);assert.equal(r.play?.ok,true);assert.equal(r.differences[0]?.score,1208);assert.equal(r.recommendation.preferred,null);
 const d=selection();d.observed.jokerContext=known({tags:known(['tag_double']),blindsSkipped:known(0)});const report=success(compareBlindChoices(d,{playScenarios:[scenario()]}));assert.equal(report.skip.ok,false);assert.equal(report.differences[0]?.status,'reached');
});
test('TAG01b fase, jefe, perfil y versión se validan; strict conserva evidencia pendiente',()=>{
 const s=selection();s.observed.nextBlind=known({ante:1,kind:'boss',bossId:known('the_psychic'),target:known(600),reward:known(5)});const boss=projectSkipBlind(s);assert.ok(!boss.ok);assert.equal(boss.errors[0]!.code,'illegal_skip');
 assert.equal(projectSkipBlind(selectionScenarioState(selection())).ok,false);
 const mods=selection();mods.observed.modsPresent=known(true);assert.equal(projectSkipBlind(mods).ok,false);
 const strict=projectSkipBlind(selection(),{requireObserved:true});assert.ok(!strict.ok);assert.equal(strict.errors[0]!.code,'pending_rule');
 assert.equal(getEngineRuleRegistry()['tags.economy']?.status,'provisional');assert.deepEqual(getEngineRuleRegistry()['tags.investment']?.evidenceIds,['L09']);
});
test('TAG01b referencia siguiente y bases por catálogo; jefe no observado no se inventa',()=>{
 const s=selection(),r=projectSkipBlind(s);assert.ok(r.ok);if(r.value.state.observed.nextBlind.status==='known'){assert.equal(r.value.state.observed.nextBlind.value.kind,'big');assert.equal(r.value.state.observed.nextBlind.value.target.status==='known'?r.value.state.observed.nextBlind.value.target.value:0,450);}
 s.observed.nextBlind=known({ante:2,kind:'big',bossId:known('none'),target:known(1200),reward:known(4)});const boss=projectSkipBlind(s);assert.ok(boss.ok);if(boss.value.state.observed.nextBlind.status==='known'){assert.equal(boss.value.state.observed.nextBlind.value.kind,'boss');assert.equal(boss.value.state.observed.nextBlind.value.bossId.status,'unknown');}
});
function shop():GameState{return JSON.parse(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8'));}
test('TAG01b Investment pago múltiple de50, interés anterior1 y saldo66; sin ingreso en Small/Big o derrota',()=>{
 const s=shop();s.observed.jokerContext=known({tags:known(['tag_investment','tag_double','tag_investment'])});const before=structuredClone(s),assumptions={handsRemaining:3,won:true,noMoneyChangesDuringRound:true};
 const normal=projectCashout(s,assumptions);assert.ok(normal.ok);assert.equal(normal.value.tagIncome,undefined);assert.equal(normal.value.balanceAfter,15);
 s.observed.nextBlind=known({ante:1,kind:'boss',bossId:known('the_psychic'),target:known(600),reward:known(5)});
 const boss=projectCashout(s,assumptions);assert.ok(boss.ok);assert.equal(boss.value.tagIncome,50);assert.equal(boss.value.interest,1);assert.equal(boss.value.balanceAfter,66);assert.equal(boss.value.earned,59);assert.equal(boss.trace.find(t=>t.ruleId==='tags.investment')?.values.count,2);
 const lost=projectCashout(s,{...assumptions,won:false});assert.ok(lost.ok);assert.equal(lost.value.tagIncome,undefined);assert.equal(lost.value.balanceAfter,7);assert.deepEqual(s.observed.jokerContext,before.observed.jokerContext);
});
test('TAG01b fin de ronda consume Investment una vez y preserva Double; plan termina temprano',()=>{
 const s=shop();s.observed.jokerContext=known({tags:known(['tag_investment','tag_double','tag_investment'])});s.observed.nextBlind=known({ante:1,kind:'boss',bossId:known('the_psychic'),target:known(600),reward:known(5)});
 const p=scenario().plan;p.events.push(...structuredClone(p.events));const r=evaluateRoundPlan(s,p,now);assert.ok(r.ok);assert.equal(r.value.events.length,1);assert.ok(r.value.settlement?.ok);assert.equal(r.value.settlement.value.cashout?.balanceAfter,67);assert.equal(r.value.settlement.value.cashout?.tagIncome,50);const ctx=r.value.finalState.observed.jokerContext;assert.ok(ctx?.status==='known');assert.deepEqual(ctx.value.tags,known(['tag_double']));
 if(s.observed.jokerContext?.status==='known')assert.equal(s.observed.jokerContext.value.tags?.status==='known'?s.observed.jokerContext.value.tags.value.length:0,3);
});
test('TAG01b sin planes solo hay efecto inmediato; no diagnostica supervivencia ni guarda proyección',()=>{
 const s=selection(),copy=structuredClone(s),r=success(compareBlindChoices(s));assert.equal(r.recommendation.status,'abstain');assert.equal(r.play,null);assert.equal(r.afterSkip,null);assert.equal(r.differences.length,0);assert.equal(r.skip.ok,true);assert.deepEqual(s,copy);
 const real=success(applyRunProgress(s,{type:'skip_blind',atNextSelection:true},{expectedRevision:0,updatedAt:now,inventory:{unchanged:true}}));assert.equal(real.state.observed.money.status,'unknown');assert.equal(real.state.observed.jokerContext?.status==='known'?real.state.observed.jokerContext.value.tags?.status:null,'unknown');
});
test('TAG01b jugar condicional: royal1208, $11 frente8 sin precio ficticio de tienda',()=>{
 const s=selection(),copy=structuredClone(s),r=success(compareBlindChoices(s,{playScenarios:[scenario()]}));assert.equal(r.differences[0]?.score,1208);assert.equal(r.differences[0]?.moneyAfterPlay,11);assert.equal(r.differences[0]?.moneyAfterSkip,8);assert.equal(r.differences[0]?.playMinusSkip,3);assert.equal(r.recommendation.status,'conditional');assert.equal(r.recommendation.preferred,'play');assert.deepEqual(s,copy);
 const preset=selection();preset.observed.deck=known({preset:'standard52-unmodified'});assert.equal(success(compareBlindChoices(preset,{playScenarios:[scenario()]})).recommendation.status,'conditional');
});
test('TAG01b salto con más dinero deja intercambio; Investment no se cuenta disponible',()=>{
 const r=success(compareBlindChoices(selection(known(20)),{playScenarios:[scenario()]}));assert.equal(r.differences[0]?.moneyAfterPlay,31);assert.equal(r.differences[0]?.moneyAfterSkip,40);assert.equal(r.differences[0]?.playMinusSkip,-9);assert.equal(r.recommendation.status,'tradeoff');assert.equal(r.recommendation.preferred,null);
 const invest=success(compareBlindChoices(selection(known(4),'tag_investment'),{playScenarios:[scenario()]}));assert.equal(invest.skip.ok&&invest.skip.value.moneyAfter,4);assert.equal(invest.recommendation.status,'tradeoff');
});
test('TAG01b plan insuficiente no significa derrota; varios escenarios sin promedio',()=>{
 const r=success(compareBlindChoices(selection(),{playScenarios:[scenario(),scenario('pair',true)]}));assert.deepEqual(r.differences.map(d=>d.status),['reached','not_reached']);assert.equal(r.differences[1]?.score,52);assert.equal(r.differences[1]?.moneyAfterPlay,null);assert.equal(r.recommendation.status,'abstain');assert.equal('winProbability'in r,false);
});
test('TAG01b planes siguientes solo con petición explícita, sin reciclar cartas de la ronda omitida',()=>{
 const s=selection(),current=success(compareBlindChoices(s,{playScenarios:[scenario()]}));assert.equal(current.afterSkip,null);
 const future=success(compareBlindChoices(s,{afterSkipScenarios:[scenario()]}));assert.equal(future.play,null);assert.equal(future.differences.length,0);assert.ok(future.afterSkip?.ok);assert.equal(future.afterSkip.value.scenarioConsequences.alternatives[0]?.outcomes[0]?.metrics?.score,1208);assert.equal(future.recommendation.preferred,null);
});
test('TAG01b crecimiento Green se muestra, Throwback cambia total, no se cambian contadores en salto',()=>{
 const s=selection();s.observed.nextBlind=known({ante:2,kind:'small',bossId:known('none'),target:known(800),reward:known(3)});s.observed.jokers=known([{instanceId:'green',catalogId:'green_joker',edition:known('base'),stickers:known([]),sellValue:known(2),counters:{greenMult:known(7)}}]);const r=success(compareBlindChoices(s,{playScenarios:[scenario()]}));assert.equal(r.differences[0]?.consequences?.counters[0]?.key,'greenMult');assert.deepEqual(r.differences[0]?.consequences?.counters[0]?.after,known(8));assert.equal(r.skipConsequences?.counters.length,0);assert.equal(r.recommendation.status,'conditional');
 s.observed.jokers=known([{instanceId:'tb',catalogId:'throwback',edition:known('base'),stickers:known([]),sellValue:known(3),counters:{}}]);const t=success(compareBlindChoices(s,{playScenarios:[scenario()]}));assert.equal(t.recommendation.preferred,null);assert.ok(t.sacrifices.some(x=>x.includes('Throwback')));
});
test('TAG01b opciones inválidas, planes incompatibles, reglas pendientes y consejos caducados',()=>{
 const s=selection();assert.equal(compareBlindChoices(s,{requireObserved:'yes'} as never).ok,false);assert.equal(compareBlindChoices(s,{unexpected:true} as never).ok,false);
 const invalid=scenario();invalid.plan.initialHand[0]!.cardId='NOT-A-CARD';const r=success(compareBlindChoices(s,{playScenarios:[invalid]}));assert.equal(r.recommendation.preferred,null);assert.ok(r.errors.length||r.differences.some(d=>d.status==='unavailable'||d.status==='incompatible'));
 const strict=success(compareBlindChoices(s,{playScenarios:[scenario()],requireObserved:true}));assert.equal(strict.skip.ok,false);assert.equal(strict.recommendation.preferred,null);
 const options={playScenarios:[scenario()]},report=success(compareBlindChoices(s,options));assert.equal(blindDecisionIsCurrent(report,s,options),true);s.observed.money=known(5);assert.equal(blindDecisionIsCurrent(report,s,options),false);s.observed.money=known(4);assert.equal(blindDecisionIsCurrent(report,s,{}),false);
});

test('TAG01b modficadores económicos: Investment no se multiplica por To the Moon; Verde no genera interés',()=>{
 const s=shop();s.observed.jokers=known([{instanceId:'moon',catalogId:'to_the_moon',edition:known('base'),stickers:known([]),sellValue:known(3),counters:{}}]);s.observed.jokerContext=known({tags:known(['tag_investment'])});s.observed.nextBlind=known({ante:1,kind:'boss',bossId:known('the_psychic'),target:known(600),reward:known(5)});
 const r=projectCashout(s,{handsRemaining:3,won:true,noMoneyChangesDuringRound:true});assert.ok(r.ok);assert.equal(r.value.interest,2);assert.equal(r.value.tagIncome,25);assert.equal(r.value.balanceAfter,42);
 const green=success(createNewRun({runId:'green-tags',updatedAt:now,deckId:'green',profileConfirmed:true}));green.observed.jokerContext=known({tags:known(['tag_investment'])});green.observed.nextBlind=known({ante:2,kind:'boss',bossId:known('the_psychic'),target:known(1600),reward:known(5)});
 const g=projectCashout(selectionScenarioState(green),{handsRemaining:3,discardsRemaining:3,won:true,noMoneyChangesDuringRound:true});assert.ok(g.ok);assert.equal(g.value.interest,0);assert.equal(g.value.tagIncome,25);assert.equal(g.value.balanceAfter,43);
});

test('TAG01b preferencia acotada a ocho efectos retenidos; descenso de Green o familias no comparadas no se ocultan',()=>{
 for(const id of ['joker','half_joker','banner','abstract_joker','even_steven','scholar','golden_joker','green_joker']){
  const s=selection();s.observed.nextBlind=known({ante:2,kind:'small',bossId:known('none'),target:known(800),reward:known(3)});s.observed.jokers=known([{instanceId:'owned',catalogId:id,edition:known('base'),stickers:known([]),sellValue:known(id==='joker'?1:id==='golden_joker'?3:2),counters:id==='green_joker'?{greenMult:known(7)}:{}}]);
  const r=success(compareBlindChoices(s,{playScenarios:[scenario()]}));assert.equal(r.recommendation.preferred,'play',id);
  if(id==='green_joker'){
   const discard=scenario('two-discards');discard.plan.events.unshift({type:'discard',cardIds:['2H'],drawIfContinues:[card('5H')]},{type:'discard',cardIds:['3D'],drawIfContinues:[card('6H')]});
   const d=success(compareBlindChoices(s,{playScenarios:[discard]}));assert.equal(d.recommendation.status,'tradeoff');assert.deepEqual(d.differences[0]?.consequences?.counters[0]?.after,known(6));
  }
 }
 const s=selection();s.observed.jokers=known([{instanceId:'photograph',catalogId:'photograph',edition:known('base'),stickers:known([]),sellValue:known(2),counters:{}}]);
 const r=success(compareBlindChoices(s,{playScenarios:[scenario()]}));assert.equal(r.differences[0]?.status,'reached');assert.equal(r.recommendation.status,'abstain');assert.match(r.recommendation.reason,/regla de preferencia/);
});
