import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import type {GameState} from '../src/state/model.js';
import type {ShopSnapshot} from '../src/advisor/shop-context.js';
import type {AdvisorScenario} from '../src/advisor/advisor.js';
import {inspectShopDecision} from '../src/advisor/decision.js';
import {known,success} from './helpers.js';
function fixture():GameState{return JSON.parse(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8')) as GameState;}
function snapshot(s:GameState):ShopSnapshot{assert.equal(s.observed.shop.status,'known');if(s.observed.shop.status!=='known')throw Error('fixture');return {id:s.observed.shop.value.shopId,jokers:s.observed.shop.value.cardOffers.map(o=>({offerId:o.offerId,catalogId:o.catalogId,price:o.price.status==='known'?o.price.value:null,edition:'base',stickers:[]})),vouchers:[],packs:[],rerollCost:null};}
const card=(cardId:string)=>({cardId,knowledge:'hypothetical' as const,basis:'Caso sintético de contrato; no predice robos.'});
function plan(id:string,initial:string[],events:{ids:string[];draws:string[]}[]):AdvisorScenario{return {role:'representative',plan:{schemaVersion:'scenario-1',planId:id,description:id,initialHand:initial.map(card),events:events.map(e=>({type:'play',cardIds:e.ids,drawIfContinues:e.draws.map(card)})),assumptions:{noMoneyChangesDuringRound:true}}};}
const pair=()=>plan('pareja',['8S','8H','2S','3S','4H','5D','6C','7D'],[{ids:['8S','8H'],draws:['9S','9H']}]);
const royal=()=>plan('escalera-color',['AS','KS','QS','JS','10S','2H','3D','4C'],[{ids:['AS','KS','QS','JS','10S'],draws:['5S','6S','7S','8S','9S']}]);

test('DEC01 consecuencias inmediatas independientes sin planes: $7→5/2, recursos conservados, sin diagnóstico',()=>{
 const state=fixture(),before=structuredClone(state),r=success(inspectShopDecision(state,snapshot(state)));assert.deepEqual(r.actions[1]!.consequences!.money,{before:7,after:5,delta:-2});assert.deepEqual(r.actions[2]!.consequences!.money,{before:7,after:2,delta:-5});assert.deepEqual(r.actions[1]!.consequences!.freeJokerSlots,{before:5,after:4,delta:-1});assert.ok(r.actions[1]!.consequences!.resources.every(r=>r.change.delta===0));assert.equal(r.scenarioConsequences.status,'not_assessed');assert.equal(r.scenarioConsequences.recommendation,null);assert.deepEqual(state,before);
});
test('SURV01 pareja fija: 52/156/572, objetivo solo Half, diferencias de puntos con recursos equivalentes',()=>{
 const state=fixture(),r=success(inspectShopDecision(state,snapshot(state),{scenarios:[pair()]})),a=r.scenarioConsequences.alternatives;
 assert.deepEqual(a.map(x=>x.status),['reaches_none','reaches_none','reaches_all']);assert.deepEqual(a.map(x=>x.outcomes[0]!.metrics!.score),[52,156,572]);assert.equal(a[2]!.outcomes[0]!.versusHold.scoreDelta,520);assert.equal(a[2]!.outcomes[0]!.versusHold.goalChange,'gained');assert.equal(a[2]!.outcomes[0]!.versusHold.moneyAfterRoundDelta,null);assert.equal(r.scenarioConsequences.recommendation?.action?.type,'buy');
 assert.ok(r.scenarios?.ok);if(r.scenarios?.ok)assert.deepEqual(r.scenarioConsequences.recommendation,r.scenarios.value.recommendation);
});
test('SURV01 todos superan: 1208/1812/1208; puntuación extra no sustituye la ventaja económica de conservar',()=>{
 const state=fixture(),r=success(inspectShopDecision(state,snapshot(state),{scenarios:[royal()]})),a=r.scenarioConsequences.alternatives;assert.ok(a.every(a=>a.status==='reaches_all'));assert.deepEqual(a.map(a=>a.outcomes[0]!.metrics!.score),[1208,1812,1208]);assert.equal(a[1]!.outcomes[0]!.versusHold.moneyAfterShopDelta,-2);assert.equal(a[1]!.outcomes[0]!.versusHold.moneyAfterRoundDelta,-2);assert.equal(a[2]!.outcomes[0]!.versusHold.moneyAfterRoundDelta,-6);assert.equal(r.scenarioConsequences.recommendation?.action?.type,'hold');
});
test('SURV01 parada temprana: no resta 572−1260 como potencia; conserva recursos propios por rama',()=>{
 const state=fixture(),p=plan('dos-jugadas',['8S','8H','AS','KS','QS','JS','10S','2H'],[{ids:['8S','8H'],draws:['3H','4H']},{ids:['AS','KS','QS','JS','10S'],draws:['5S','6S','7S','9S','2D']}]);const r=success(inspectShopDecision(state,snapshot(state),{scenarios:[p]})),a=r.scenarioConsequences.alternatives;
 assert.equal(a[0]!.outcomes[0]!.metrics!.score,1260);assert.equal(a[0]!.outcomes[0]!.metrics!.handsUsed,2);assert.equal(a[2]!.outcomes[0]!.metrics!.score,572);assert.equal(a[2]!.outcomes[0]!.metrics!.handsUsed,1);assert.equal(a[2]!.outcomes[0]!.versusHold.scoreDelta,null);assert.equal(a[2]!.outcomes[0]!.versusHold.scoreComparison,'different_resources');assert.equal(a[2]!.outcomes[0]!.versusHold.handsUsedDelta,-1);assert.equal(a[2]!.outcomes[0]!.versusHold.moneyAfterRoundDelta,-5);
});
test('SURV01 sensibilidad conservada por escenario, sin promedio ni porcentaje de éxito',()=>{
 const state=fixture(),low=plan('carta-baja',['2S','3S','4H','5D','6C','7D','8S','8H'],[{ids:['2S'],draws:['9S']}]);const r=success(inspectShopDecision(state,snapshot(state),{scenarios:[pair(),low]})),half=r.scenarioConsequences.alternatives[2]!;assert.equal(half.status,'reaches_some');assert.equal(half.sensitiveToScenario,true);assert.deepEqual(half.outcomes.map(o=>o.status),['reached','not_reached']);assert.equal(half.outcomes[1]!.metrics!.score,147);assert.equal('winProbability'in half,false);
});
test('DEC01 reemplazo pierde la identidad y Green7; no transfiere crecimiento al Joker comprado',()=>{
 const state=fixture();state.observed.jokers=known([{instanceId:'green',catalogId:'green_joker',edition:known('base'),stickers:known([]),sellValue:known(2),counters:{greenMult:known(7)}}]);const shop=snapshot(state);shop.jokers[0]!.replacementId='green';const before=structuredClone(state),r=success(inspectShopDecision(state,shop)),c=r.actions[1]!.consequences!;
 assert.deepEqual(c.money,{before:7,after:7,delta:0});assert.equal(c.removed[0]!.instanceId,'green');assert.deepEqual(c.removed[0]!.counters,{greenMult:known(7)});assert.equal(c.added[0]!.catalogId,'joker');assert.deepEqual(c.added[0]!.counters,{});c.removed[0]!.counters.greenMult=known(999);assert.deepEqual(state,before);
});
test('SURV01 Juggler cambia mano8→9: plan con8 incompatible, no se completa con una carta inventada',()=>{
 const state=fixture();if(state.observed.shop.status==='known'){state.observed.shop.value.cardOffers[0]!.catalogId='juggler';state.observed.shop.value.cardOffers[0]!.price=known(4);}const r=success(inspectShopDecision(state,snapshot(state),{scenarios:[pair()]})),c=r.actions[1]!.consequences!,a=r.scenarioConsequences.alternatives[1]!;assert.deepEqual(c.resources.find(r=>r.field==='handSize')!.change,{before:8,after:9,delta:1});assert.equal(a.status,'incomplete');assert.equal(a.outcomes[0]!.metrics,null);assert.equal(a.outcomes[0]!.versusHold.scoreDelta,null);assert.equal(r.scenarioConsequences.recommendation?.status,'abstain');
});
test('SURV01 contadores del escenario muestran Green7→8 sin sustituir los datos reales',()=>{
 const state=fixture();state.observed.jokers=known([{instanceId:'green',catalogId:'green_joker',edition:known('base'),stickers:known([]),sellValue:known(2),counters:{greenMult:known(7)}}]);const r=success(inspectShopDecision(state,snapshot(state),{scenarios:[royal()]})),changes=r.scenarioConsequences.alternatives[0]!.outcomes[0]!.counters;assert.equal(changes[0]!.key,'greenMult');assert.deepEqual(changes[0]!.before,known(7));assert.deepEqual(changes[0]!.after,known(8));if(state.observed.jokers.status==='known')assert.deepEqual(state.observed.jokers.value[0]!.counters.greenMult,known(7));
});
test('SURV01 ausencia/vacío de planes no da falsa derrota ni error de candidatos; estricto no emite cifras',()=>{
 const state=fixture(),empty=success(inspectShopDecision(state,snapshot(state),{scenarios:[]}));assert.equal(empty.scenarioConsequences.status,'not_assessed');assert.equal(empty.scenarioConsequences.recommendation?.status,'abstain');assert.ok(empty.scenarios?.ok);
 const strict=success(inspectShopDecision(state,snapshot(state),{scenarios:[pair()],requireObserved:true}));assert.equal(strict.scenarioConsequences.status,'incomplete');assert.equal(strict.scenarioConsequences.alternatives.length,0);assert.ok(strict.actions.every(a=>a.consequences===null));
});
