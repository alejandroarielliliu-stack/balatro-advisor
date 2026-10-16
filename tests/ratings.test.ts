import test from 'node:test';
import assert from 'node:assert/strict';
import {contextRatings} from '../src/advisor/ratings.js';
import type {Advice} from '../src/advisor/advisor.js';
import type {Metrics} from '../src/advisor/policy.js';
const metric=(patch:Partial<Metrics>={}):Metrics=>({scenarioId:'s1',reached:true,score:400,margin:100,handsUsed:1,discardsUsed:0,moneyAfterShop:20,moneyAfterRound:25,terminalGoal:false,persistentBenefits:[],...patch});
// Isolated rubric fixtures. Not game simulations or source-derived engine expectations.
function fixture(base:Metrics[],candidate:Metrics[],active=true):Advice{
 const row=(id:string,metrics:Metrics[],type:string)=>({id,action:{type},legal:true,complete:true,scenarios:metrics.map(m=>({scenarioId:m.scenarioId,metrics:m,activatedEffects:active?[{trace:[{ruleId:'fixture.effect'}]}]:[]}))});
 return {inputRevision:7,scenarios:base.map(m=>({plan:{planId:m.scenarioId}})),alternatives:[row('hold',base,'hold'),row('buy',candidate,'buy')]} as unknown as Advice;
}
test('Encaje 0–10: rúbrica explícita, ahorro frente a exceso de puntos',()=>{
 const advice=fixture([metric()],[metric({score:900,margin:600,moneyAfterShop:15,moneyAfterRound:20})]);
 const ratings=contextRatings(advice);
 // Both win, equal resources, active effects, no persistent change. Spending lowers economy only.
 assert.deepEqual(ratings[0]!.scenarios[0]!.axes.map(a=>a.value),[2,1,1,2,1]);
 assert.deepEqual(ratings[1]!.scenarios[0]!.axes.map(a=>a.value),[2,1,0,2,1]);
 assert.deepEqual(ratings.map(r=>r.range),[[7,7],[6,6]]);
 assert.equal(ratings[1]!.scenarios[0]!.scoreDelta,500);
 assert.equal(ratings[1]!.revision,7);
});
test('Objetivo, recursos y beneficios se explican sin atribuir puntuación a un contador',()=>{
 const r=contextRatings(fixture([metric({reached:false,score:80,margin:-220,handsUsed:2})],[metric({moneyAfterShop:15,handsUsed:1,persistentBenefits:['green-applied']})]))[1]!;
 assert.deepEqual(r.scenarios[0]!.axes.map(a=>a.value),[2,2,0,2,2]);
 assert.deepEqual(r.range,[8,8]);assert.equal(r.scenarios[0]!.scoreDelta,null);
});
test('Escenarios sensibles producen intervalo, sin promedio y sin mutaciones',()=>{
 const a=fixture([metric(),metric({scenarioId:'s2'})],[metric(),metric({scenarioId:'s2',reached:false,margin:-10,score:290})]);
 const before=JSON.stringify(a);const r=contextRatings(a)[1]!;
 assert.deepEqual(r.range,[5,7]);assert.equal(JSON.stringify(a),before);
 a.alternatives[1]!.scenarios.reverse();assert.deepEqual(contextRatings(a)[1]!.range,[5,7]);
});
test('Datos incompletos, acciones ilegales y ausencia de referencia no se convierten en cero',()=>{
 const a=fixture([metric()],[metric({moneyAfterRound:null})]);assert.equal(contextRatings(a)[1]!.range,null);
 a.alternatives[1]!.legal=false;assert.equal(contextRatings(a)[1]!.scenarios[0]!.value,null);
 a.alternatives.shift();assert.equal(contextRatings(a)[0]!.range,null);
 assert.deepEqual(contextRatings({...a,alternatives:[]}),[]);
});
test('Un conflicto de recursos es neutral, una pérdida persistente penaliza continuidad',()=>{
 const a=fixture([metric({handsUsed:2,persistentBenefits:['golden-income']})],[metric({handsUsed:1,discardsUsed:1})],false);
 const axes=contextRatings(a)[1]!.scenarios[0]!.axes;
 assert.equal(axes.find(a=>a.id==='resources')!.value,1);
 assert.equal(axes.find(a=>a.id==='continuity')!.value,0);
 assert.equal(axes.find(a=>a.id==='activation')!.value,0);
});
