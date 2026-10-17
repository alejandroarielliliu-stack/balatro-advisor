import assert from 'node:assert/strict';
import {createNewRun} from './run/start.js';
import {compareBlindChoices} from './advisor/blind-decision.js';
import type {AdvisorScenario} from './advisor/advisor.js';
import type {Fact} from './state/model.js';
const known=<T>(value:T):Fact<T>=>({status:'known',source:'manual',value});
const card=(cardId:string)=>({cardId,knowledge:'hypothetical' as const,basis:'Caso sintético explícito; no predicción.'});
const scenario:AdvisorScenario={role:'representative',plan:{schemaVersion:'scenario-1',planId:'royal',description:'Escalera de color sintética',initialHand:['AS','KS','QS','JS','10S','2H','3D','4C'].map(card),events:[{type:'play',cardIds:['AS','KS','QS','JS','10S'],drawIfContinues:[]}],assumptions:{noMoneyChangesDuringRound:true}}};
for(const [money,tag]of [[4,'tag_economy'],[20,'tag_economy'],[4,'tag_investment']] as const){
 const created=createNewRun({runId:'synthetic-choice',deckId:'blue',updatedAt:'2026-10-16T20:00:00Z',profileConfirmed:true});assert.ok(created.ok);const state=created.value;state.observed.money=known(money);if(state.phase!=='blind_select')throw Error('selection');state.phaseData.skipTag=known(tag);const before=structuredClone(state),report=compareBlindChoices(state,{playScenarios:[scenario]});assert.ok(report.ok);assert.deepEqual(state,before);
 console.log(JSON.stringify({tag,money,skip:report.value.skip.ok?{moneyAfter:report.value.skip.value.moneyAfter,pending:report.value.skip.value.deferredIncome}:report.value.skip.errors,plans:report.value.differences,recommendation:report.value.recommendation,limits:report.value.limitations},null,2));
}
