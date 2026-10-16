import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {parseState} from '../src/state/validation.js';
import {validateRoundPlan} from '../src/evaluation/plan.js';
import {compareShopAlternatives} from '../src/evaluation/comparison.js';
import {compareShopBounds} from '../src/evaluation/shop-bounds.js';
import {adviseShop} from '../src/advisor/advisor.js';
import {known,success} from './helpers.js';
import type {GameState,JokerInstance} from '../src/state/model.js';
const fixture=()=>success(parseState(readFileSync(new URL('../../examples/sale-psychic.json',import.meta.url),'utf8')));
const plan=()=>success(validateRoundPlan(JSON.parse(readFileSync(new URL('../../examples/sale-psychic-plan.json',import.meta.url),'utf8'))));
const mutation={expectedRevision:0,updatedAt:'2026-10-10T18:00:00Z'};
const scenarios=(p=plan())=>[{role:'representative' as const,plan:p}];
const j=(catalogId:string,green=10):JokerInstance=>({instanceId:catalogId,catalogId,edition:known('base'),stickers:known([]),sellValue:known(catalogId==='golden_joker'?3:2),counters:catalogId==='green_joker'?{greenMult:known(green)}:{}});
function small(s:GameState){s.observed.nextBlind=known({ante:1,kind:'small',bossId:known('none'),target:known(300),reward:known(3)});}
function pair(){const p=plan();p.planId='pair';p.events[0]!.cardIds=['8S','8H'];p.events[0]!.drawIfContinues=p.events[0]!.drawIfContinues.slice(0,2);return p;}

test('T08c venta útil: Half no activa con Psychic; 696 puntos y saldo final 21→23',()=>{
 const s=fixture(),p=plan(),original=structuredClone({s,p});const result=success(adviseShop(s,scenarios(p),mutation));
 assert.equal(result.policyVersion,'h3-2');assert.deepEqual(result.recommendation.action,{type:'sell',instanceId:'half_joker'});
 const sale=result.alternatives.find(a=>a.action.type==='sell'&&a.action.instanceId==='half_joker')!;
 assert.equal(sale.scenarios[0]!.metrics!.score,696);assert.equal(result.alternatives[0]!.scenarios[0]!.metrics!.moneyAfterRound,21);
 assert.equal(sale.scenarios[0]!.metrics!.moneyAfterShop,12);assert.equal(sale.scenarios[0]!.metrics!.moneyAfterRound,23);
 assert.equal(sale.scenarios[0]!.calculation.netCost,-2);assert.equal(sale.sacrificed[0]!.catalogId,'half_joker');
 assert.ok(result.recommendation.ruleIds.includes('H-ECONOMY'));assert.deepEqual({s,p},original);
 assert.deepEqual(success(compareShopAlternatives(s,p,mutation)).alternatives.map(a=>a.action.type),['hold','sell','sell','sell']);
});
test('T08c vender potencia necesaria pierde cobertura; no confunde efectivo con supervivencia',()=>{
 const result=success(adviseShop(fixture(),scenarios(),mutation));
 const soldBanner=result.alternatives.find(a=>a.action.type==='sell'&&a.action.instanceId==='banner')!;
 assert.equal(soldBanner.scenarios[0]!.metrics!.score,156);assert.equal(soldBanner.scenarios[0]!.metrics!.reached,false);
 assert.equal(soldBanner.scenarios[0]!.metrics!.moneyAfterShop,12);assert.equal(soldBanner.scenarios[0]!.metrics!.moneyAfterRound,null);
 assert.ok(result.preferences.some(p=>p.over===soldBanner.id&&p.ruleId==='H-COVERAGE'));
 assert.equal(success(soldBanner.scenarios[0]!.calculation.evaluation!).round.handsLeft,4);
});
test('T08c Golden: venta ingresa 3 pero sacrifica 4 de cobro; compromiso sin precio al futuro',()=>{
 const s=fixture();small(s);s.observed.money=known(25);s.observed.jokers=known([j('half_joker'),j('golden_joker')]);
 const result=success(adviseShop(s,scenarios(pair()),mutation,{actions:[{type:'hold'},{type:'sell',instanceId:'golden_joker'}]}));
 const hold=result.alternatives[0]!,sale=result.alternatives[1]!;
 assert.deepEqual(result.alternatives.map(a=>a.scenarios[0]!.metrics!.score),[572,572]);
 assert.equal(hold.scenarios[0]!.metrics!.moneyAfterRound,41);assert.equal(sale.scenarios[0]!.metrics!.moneyAfterShop,28);assert.equal(sale.scenarios[0]!.metrics!.moneyAfterRound,40);
 assert.equal(result.recommendation.status,'tie');assert.ok(!result.preferences.some(p=>p.preferred===sale.id&&p.over===hold.id));
 assert.ok(sale.limitations.some(x=>x.includes('golden_joker')));
 const difference=success(compareShopAlternatives(s,pair(),mutation)).differences.find(d=>d.statements.some(x=>x.includes('ingreso de Golden')))!;assert.ok(difference);
});
test('T08c Green: se conserva contador sacrificado y no se recomienda vender por liquidez sola',()=>{
 const s=fixture();small(s);s.observed.jokers=known([j('half_joker'),j('green_joker')]);
 const result=success(adviseShop(s,scenarios(pair()),mutation,{actions:[{type:'hold'},{type:'sell',instanceId:'green_joker'}]}));
 assert.equal(result.recommendation.status,'tie');assert.deepEqual(result.alternatives.map(a=>a.scenarios[0]!.metrics!.score),[858,572]);
 assert.deepEqual(result.alternatives.map(a=>a.scenarios[0]!.metrics!.moneyAfterRound),[19,21]);
 assert.deepEqual(result.alternatives[1]!.sacrificed[0]!.counters.greenMult,known(10));
 assert.deepEqual(result.alternatives[0]!.scenarios[0]!.growth[0]!.after,known(11));assert.deepEqual(result.alternatives[1]!.scenarios[0]!.growth,[]);
});
test('T08c incertidumbre aislada: vender Green desconocido sí puntúa; precio desconocido impide venta',()=>{
 const s=fixture();small(s);const g=j('green_joker');g.counters.greenMult={status:'unknown',reason:'Sin contador'};s.observed.jokers=known([j('half_joker'),g]);
 const r=success(adviseShop(s,scenarios(pair()),mutation));assert.equal(r.recommendation.status,'abstain');
 const sale=r.alternatives.find(a=>a.action.type==='sell'&&a.action.instanceId==='green_joker')!;assert.equal(sale.scenarios[0]!.metrics!.score,572);
 g.sellValue={status:'unknown',reason:'Sin precio'};
 const r2=success(adviseShop(s,scenarios(pair()),mutation));const blocked=r2.alternatives.find(a=>a.action.type==='sell'&&a.action.instanceId==='green_joker')!;
 assert.equal(blocked.legal,false);assert.equal(r2.recommendation.status,'abstain');assert.equal(blocked.scenarios[0]!.calculation.netCost,null);
});
test('T08c múltiples escenarios: venta pierde cobertura de un plan y conserva otro; sin promediar',()=>{
 const s=fixture();small(s);s.observed.jokers=known([j('half_joker')]);
 const p=pair(),flush=pair();flush.planId='straight-flush';flush.initialHand=['5S','6S','7S','8S','9S','KS','QH','JD'].map(cardId=>({cardId,knowledge:'hypothetical',basis:'Sintético'}));flush.events=[{type:'play',cardIds:['5S','6S','7S','8S','9S'],drawIfContinues:[]}];
 const result=success(adviseShop(s,[{role:'representative',plan:p},{role:'adverse',plan:flush}],mutation));
 assert.deepEqual(result.recommendation.action,{type:'hold'});
 assert.deepEqual(result.alternatives[1]!.scenarios.map(x=>x.metrics!.reached),[false,true]);
 assert.deepEqual(result.alternatives[1]!.scenarios.map(x=>x.metrics!.score),[52,1080]);
});
test('T08c ventas en cotas, selección ilegal, modo estricto e IDs estables',()=>{
 const s=fixture(),p=plan(),r=success(compareShopAlternatives(s,p,mutation));
 const bounds=success(compareShopBounds(s,mutation));assert.deepEqual(bounds.alternatives.map(a=>a.action),r.alternatives.map(a=>a.action));
 assert.equal(bounds.alternatives.filter(a=>a.action.type==='sell').length,3);
 assert.equal(success(bounds.alternatives[0]!.bound!).roundScoreUpper,14700); // (100+55+90)*(8+4)*5; Half off.
 assert.equal(success(bounds.alternatives[1]!.bound!).roundScoreUpper,14700);
 assert.ok(!adviseShop(s,scenarios(p),mutation,{actions:[{type:'sell',instanceId:'absent'}]}).ok);
 assert.ok(!adviseShop(s,scenarios(p),mutation,{actions:[{type:'sell',instanceId:'half_joker'},{type:'sell',instanceId:'half_joker'}]}).ok);
 assert.ok(!adviseShop(s,scenarios(p),mutation,{requireObserved:true}).ok);
 assert.deepEqual(adviseShop(s,scenarios(p),mutation),adviseShop(s,scenarios(p),mutation));
});
test('T08c demo ejecutable muestra venta, sacrificio y saldo sin guardar la partida',()=>{
 const text=execFileSync(process.execPath,[fileURLToPath(new URL('../src/demo-sales.js',import.meta.url))],{encoding:'utf8'});
 assert.match(text,/h3-2/);assert.match(text,/half_joker/);assert.match(text,/696/);assert.match(text,/23/);assert.match(text,/SINTÉTICO/);
});
