import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {migrateState} from '../src/state/migration.js';
import {parseState,validateCurrentState} from '../src/state/validation.js';
import {analysisBinding,CONFIRMED_STORAGE_KEY,createConfirmedStore} from '../src/storage/confirmed-store.js';
import {applyShopAction} from '../src/rules/shop.js';
import {scoreHand} from '../src/rules/scoring.js';
import {beginRound,applyRoundEvent,finishRound} from '../src/rules/round.js';
import {comparisonDemoScenarios} from '../src/demo-scenarios.js';
import {compareShopAlternatives} from '../src/evaluation/comparison.js';
import {evaluateHorizon,validateHorizon} from '../src/evaluation/horizon.js';
import {compareShopHorizon} from '../src/evaluation/horizon-comparison.js';
import {known,MemoryStorage,success} from './helpers.js';
import type {GameState} from '../src/state/model.js';

const time='2026-10-16T12:00:00Z';
const fixture=()=>success(parseState(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8')));
const json=(name:string):unknown=>JSON.parse(readFileSync(new URL(`../../examples/${name}.json`,import.meta.url),'utf8'));
const horizon=()=>success(validateHorizon(json('horizon-golden')));
const mutation=(state:GameState)=>({expectedRevision:state.revision,updatedAt:time});
const hand={cardIds:['8S','8H'],discardsRemaining:3};
function frozen<T>(value:T):T {if(value && typeof value==='object'){Object.freeze(value);for(const child of Object.values(value))frozen(child);}return value;}

// Literal numeric oracles are independently documented in h2-oraculos.md and
// t07b-oraculos.md. V1/V2 parity checks below test software compatibility only;
// they are not additional observations of Balatro or proof of strategic quality.
test('RUN01a H2 V2 carga/compra/puntuación conserva oráculos 52→572 y no persiste hipótesis',()=>{
  const memory=new MemoryStorage(),store=createConfirmedStore(()=>memory);success(store.initialize(fixture()));
  const record=success(store.migrateToCurrent({confirmed:true,expectedRaw:memory.getItem(CONFIRMED_STORAGE_KEY)!}));
  const state=frozen(record.state),before=structuredClone(state),raw=memory.getItem(CONFIRMED_STORAGE_KEY),writes=memory.writes;
  assert.equal(success(scoreHand(state,hand)).score,52);
  const bought=success(applyShopAction(state,{type:'buy',offerId:'o2',instanceId:'hypothetical-half'},mutation(state)));
  assert.equal(success(scoreHand(bought.state,hand)).score,572);
  assert.deepEqual(bought.state.observed.money,known(2));assert.equal(bought.occupiedSlots,1);assert.equal(bought.freeSlots,4);
  success(validateCurrentState(bought.state));assert.equal(bought.state.schemaVersion,'0.2');
  assert.deepEqual(state,before);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);assert.equal(memory.writes,writes);
  assert.deepEqual(success(store.load()),record);assert.deepEqual(analysisBinding(state),{runId:state.runId,revision:0,rulesetId:state.rulesetId,schemaVersion:'0.2'});
});

test('RUN01a H2 termina ronda V2 con fase desconocida válida y no hereda datos de tienda',()=>{
  const {state:legacy,plan}=comparisonDemoScenarios(fixture())[0]!;
  const state=success(migrateState(legacy));
  const bought=success(applyShopAction(state,{type:'buy',offerId:'o2',instanceId:'half'},mutation(state))).state;
  const before=structuredClone(bought),round=success(beginRound(bought,plan.initialHand.map(card=>card.cardId)));
  const played=success(applyRoundEvent(round,{type:'play',cardIds:['8S','8H'],drawnCardIds:[]},mutation(round.game))).round;
  const beforeFinish=structuredClone(played),settled=success(finishRound(frozen(played),mutation(played.game)));
  assert.equal(played.score,572);assert.equal(played.handsLeft,4);assert.equal(settled.outcome,'won');
  assert.deepEqual(settled.cashout,{balanceBefore:2,blindReward:4,unusedHands:4,goldenIncome:0,interest:0,earned:8,balanceAfter:10});
  const final=success(validateCurrentState(settled.state));
  assert.equal(final.phase,'unknown');assert.ok('reason' in final.phaseData);
  assert.equal(final.observed.nextBlind.status,'unknown');assert.equal(final.observed.shop.status,'unknown');
  assert.deepEqual(final.observed.lastCleared,known({ante:1,kind:'big'}));
  assert.deepEqual(bought,before);assert.deepEqual(played,beforeFinish);assert.equal(state.phase,'shop');
});

test('RUN01a T07b V2 mismo plan: oráculos 80/240/572, finalización temprana y recursos por alternativa',()=>{
  const {state:legacy,plan}=comparisonDemoScenarios(fixture())[0]!;
  const state=success(migrateState(legacy)),input=structuredClone({state,plan});
  const result=success(compareShopAlternatives(frozen(state),frozen(plan),mutation(state)));
  const branches=result.alternatives.map(alternative=>{assert.ok(alternative.evaluation);return success(alternative.evaluation);});
  assert.deepEqual(branches.map(branch=>branch.score),[80,240,572]);
  assert.deepEqual(branches.map(branch=>branch.handsUsed),[2,2,1]);
  assert.deepEqual(result.alternatives.map(alternative=>alternative.moneyAfterRound),[null,null,10]);
  assert.deepEqual(branches[0]!.events.map(event=>event.handScore!.score),[52,28]);
  assert.equal(branches[0]!.outcome,'plan_exhausted');assert.equal(branches[0]!.round.handsLeft,3);
  assert.deepEqual(branches[2]!.unexecutedEventIndices,[1]);assert.deepEqual(branches[2]!.events[0]!.drawn,[]);
  assert.equal(branches[2]!.finalState.phase,'unknown');
  for(const branch of branches){success(validateCurrentState(branch.finalState));assert.deepEqual(branch.plan,plan);}
  assert.deepEqual({state,plan},input);assert.equal(result.coverage.exhaustive,false);
});

test('RUN01a T07b V2 conserva crecimiento, pérdida por reemplazo e incertidumbre localizada',()=>{
  const examples=comparisonDemoScenarios(fixture()),scenario=examples[2]!;
  const state=success(migrateState(scenario.state)),before=structuredClone({state,plan:scenario.plan});
  const result=success(compareShopAlternatives(frozen(state),frozen(scenario.plan),mutation(state)));
  const branches=result.alternatives.map(alternative=>{assert.ok(alternative.evaluation);return success(alternative.evaluation);});
  assert.deepEqual(branches.map(branch=>branch.score),[952,1836,1242,190]);
  assert.deepEqual(result.alternatives.map(alternative=>alternative.moneyAfterRound),[18,13,15,null]);
  const green=branches[0]!.finalState.observed.jokers,replaced=branches[2]!.finalState.observed.jokers;
  assert.equal(green.status,'known');if(green.status==='known')assert.deepEqual(green.value[0]!.counters.greenMult,known(12));
  assert.equal(replaced.status,'known');if(replaced.status==='known'){assert.equal(replaced.value[0]!.catalogId,'half_joker');assert.deepEqual(replaced.value[0]!.counters,{});}
  assert.deepEqual({state,plan:scenario.plan},before);
  const unknown=success(migrateState(examples[3]!.state));
  const incomplete=success(compareShopAlternatives(unknown,examples[3]!.plan,mutation(unknown)));
  assert.deepEqual(incomplete.alternatives.map(alternative=>{assert.ok(alternative.evaluation);return success(alternative.evaluation).outcome;}),['incompatible','incompatible','reached_target','plan_exhausted']);
  assert.equal(incomplete.recommendation,null);
});

test('RUN01a horizonte V2 mantiene oráculos de dos rondas y distingue instantáneas hipotéticas',()=>{
  const legacy=success(parseState(JSON.stringify(json('horizon-golden-state'))));
  const state=success(migrateState(legacy)),plan=horizon(),before=structuredClone({state,plan});
  const result=success(compareShopHorizon(frozen(state),frozen(plan),mutation(state)));
  const branches=result.alternatives.slice(0,2).map(alternative=>{assert.ok(alternative.evaluation);return success(alternative.evaluation);});
  assert.deepEqual(branches.map(branch=>branch.stages.map(stage=>success(stage.result).score)),[[2552,2552],[2552,2552]]);
  assert.deepEqual(branches.map(branch=>branch.stages.map(stage=>success(success(stage.result).settlement!).cashout!.balanceAfter)),[[37,50],[33,50]]);
  for(const branch of branches){
    assert.equal(branch.outcome,'completed');assert.equal(branch.roundsReached,2);success(validateCurrentState(branch.finalState));assert.equal(branch.finalState.phase,'unknown');
    const continuation=success(validateCurrentState(branch.stages[1]!.stateBefore));
    assert.equal(continuation.phase,'shop');assert.deepEqual(continuation.phaseData,{origin:{status:'unknown',reason:'Instantánea hipotética del horizonte; no registra una visita real a tienda.'}});
    assert.equal(continuation.observed.shop.status,'unknown');
    for(const stage of branch.stages){success(validateCurrentState(stage.stateBefore));success(validateCurrentState(success(stage.result).finalState));}
  }
  assert.deepEqual({state,plan},before);
});

test('RUN01a paridad V1/V2 es consistencia de versión, sin elevar el grado de evidencia',()=>{
  const legacy=success(parseState(JSON.stringify(json('horizon-golden-state')))),current=success(migrateState(legacy)),plan=horizon();
  const old=compareShopHorizon(legacy,plan,mutation(legacy)),newer=compareShopHorizon(current,plan,mutation(current));
  assert.equal(old.ok,true);assert.equal(newer.ok,true);assert.deepEqual(newer.evidence,old.evidence);
  const summarize=(state:GameState)=>success(compareShopHorizon(state,plan,mutation(state))).alternatives.map(alternative=>({action:alternative.action,netCost:alternative.netCost,moneyAfterShop:alternative.shop.ok?alternative.shop.value.state.observed.money:null,evaluation:alternative.evaluation?.ok?{
    outcome:alternative.evaluation.value.outcome,roundsReached:alternative.evaluation.value.roundsReached,
    stages:alternative.evaluation.value.stages.map(stage=>{const result=success(stage.result);return {score:result.score,handsUsed:result.handsUsed,discardsUsed:result.discardsUsed,targetReached:result.targetReached,money:result.finalState.observed.money};})
  }:null}));
  assert.deepEqual(summarize(current),summarize(legacy));
  const strictOld=evaluateHorizon(legacy,plan,time,{requireObserved:true}),strictNew=evaluateHorizon(current,plan,time,{requireObserved:true});
  assert.equal(strictOld.ok,false);assert.equal(strictNew.ok,false);assert.deepEqual(strictNew.evidence,strictOld.evidence);
});

test('RUN01a fase desconocida válida no se convierte silenciosamente en tienda para calcular',()=>{
  const {state:legacy,plan}=comparisonDemoScenarios(fixture())[1]!,state=success(migrateState(legacy));
  const initial=success(compareShopAlternatives(state,plan,mutation(state)));
  const evaluation=initial.alternatives[0]!.evaluation;assert.ok(evaluation);const finished=success(evaluation).finalState;
  assert.equal(finished.phase,'unknown');success(validateCurrentState(finished));const before=structuredClone(finished);
  for(const result of [scoreHand(finished,hand),applyShopAction(finished,{type:'hold'},mutation(finished)),evaluateHorizon(finished,horizon(),time)]){
    assert.ok(!result.ok);assert.equal(result.errors[0]!.code,'wrong_phase');
  }
  assert.deepEqual(finished,before);
});
