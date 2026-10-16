import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseState,serializeState,validateState} from '../src/state/validation.js';
import type {GameState,JokerInstance} from '../src/state/model.js';
import {adviseShop} from '../src/advisor/advisor.js';
import type {AdvisedAlternative} from '../src/advisor/advisor.js';
import {applyShopAction} from '../src/rules/shop.js';
import type {ShopAction} from '../src/rules/shop.js';
import {scoreHand} from '../src/rules/scoring.js';
import {interestOnBalance} from '../src/rules/economy.js';
import {validateHorizon} from '../src/evaluation/horizon.js';
import {adviseHorizon} from '../src/advisor/horizon-advisor.js';
import {compareShopBounds} from '../src/evaluation/shop-bounds.js';
import type {RoundPlan} from '../src/evaluation/plan.js';
import {known,success} from './helpers.js';

// Literal prices, targets and expected results come from docs/escenarios-v0.1.md,
// not catalogue lookups or the outputs being tested. Synthetic, no game observation.
const read=(file:string)=>readFileSync(new URL(`../../examples/${file}.json`,import.meta.url),'utf8');
const base=()=>success(parseState(read('shop-purchase')));
const mutation={expectedRevision:0,updatedAt:'2026-10-10T23:00:00Z'};
const joker=(catalogId:string,green=0):JokerInstance=>({instanceId:catalogId,catalogId,edition:known('base'),stickers:known([]),sellValue:known(catalogId==='joker'?1:catalogId==='golden_joker'?3:2),counters:catalogId==='green_joker'?{greenMult:known(green)}:{}});
function setup(money:number,ids:string[],offers:[string,number][],ante:number,kind:'small'|'big'|'boss',target:number,bossId='none'){
 const s=base();s.observed.money=known(money);s.observed.jokers=known(ids.map(id=>joker(id)));
 s.observed.lastCleared=known({ante:kind==='small'?ante-1:ante,kind:kind==='small'?'boss':kind==='big'?'small':'big'});
 s.observed.nextBlind=known({ante,kind,bossId:known(bossId),target:known(target),reward:known(kind==='small'?3:kind==='big'?4:5)});
 s.observed.visibleBoss={status:'unknown',reason:'No informado en este escenario.'};
 s.observed.shop=known({shopId:'audit-shop',cardOffers:offers.map(([catalogId,price])=>({offerId:catalogId,catalogId,label:catalogId,kind:'joker',price:known(price),edition:known('base'),stickers:known([])})),ignoredOtherOffers:[]});return s;
}
const cards=(ids:string[])=>ids.map(cardId=>({cardId,knowledge:'hypothetical' as const,basis:'Escenario documental sintético; sin probabilidad asignada.'}));
function plan(id:string,played:string[]):RoundPlan {
 const fillers=['KS','QH','JD','4C','5S','6H','3C','9D'];const initial=[...played,...fillers.filter(c=>!played.includes(c))].slice(0,8);
 const draws=['2S','2H','3S','3H','4S','4H','5H'].filter(c=>!initial.includes(c)).slice(0,played.length);
 return {schemaVersion:'scenario-1',planId:id,description:id,initialHand:cards(initial),events:[{type:'play',cardIds:played,drawIfContinues:cards(draws)}],assumptions:{noMoneyChangesDuringRound:true}};
}
const advise=(s:GameState,plans:RoundPlan[])=>success(adviseShop(s,plans.map((plan,i)=>({role:i===0?'representative' as const:'adverse' as const,plan})),mutation));
const pick=(as:AdvisedAlternative[],type:ShopAction['type'],id?:string)=>as.find(a=>a.action.type===type&&(id===undefined||a.action.type==='buy'&&a.action.offerId===id||a.action.type==='sell'&&a.action.instanceId===id||a.action.type==='replace'&&a.action.sellInstanceId===id))!;
const scores=(a:AdvisedAlternative)=>a.scenarios.map(s=>s.metrics!.score);
const after=(s:GameState,a:ShopAction)=>success(applyShopAction(s,a,mutation)).state;
const buy=(id:string):ShopAction=>({type:'buy',offerId:id,instanceId:'new:'+id});

test('S01 integrado: potencia, liquidez, mano adversa y jefe posterior explícito',()=>{
 const s=base(),r=advise(s,[plan('pair8',['8S','8H']),plan('king',['KS'])]);
 assert.deepEqual(r.alternatives.map(scores),[[52,15],[156,75],[572,315]]);
 assert.deepEqual(r.recommendation.action,{type:'buy',offerId:'o2',instanceId:'new:o2'});
 assert.deepEqual(r.alternatives.map(a=>a.scenarios[0]!.calculation.moneyAfterShop),[7,5,2]);
 assert.deepEqual(r.alternatives.map(a=>success(interestOnBalance(success(a.scenarios[0]!.calculation.shop).state))),[1,1,0]);
 assert.deepEqual(r.alternatives[2]!.scenarios.map(s=>s.metrics!.reached),[true,false]);
 assert.ok(r.limitations.some(t=>t.includes('the_psychic')));
});

test('S02 integrado: ahorro condicionado a descartes; tres descartes reales cambian el consejo',()=>{
 const s=setup(25,['half_joker','banner'],[['joker',2]],2,'small',800);
 const r=advise(s,[plan('pair8',['8S','8H']),plan('king',['KS'])]);
 assert.deepEqual(scores(pick(r.alternatives,'hold')),[2552,2205]);assert.deepEqual(scores(pick(r.alternatives,'buy','joker')),[3016,2625]);
 assert.deepEqual(r.recommendation.action,{type:'hold'});
 assert.equal(pick(r.alternatives,'hold').scenarios[0]!.metrics!.moneyAfterRound,37);assert.equal(pick(r.alternatives,'buy','joker').scenarios[0]!.metrics!.moneyAfterRound,34);
 const p=plan('without-discards',['8S','8H']);p.events.unshift(...[['KS','2D'],['QH','3D'],['JD','4D']].map(([old,next])=>({type:'discard' as const,cardIds:[old!],drawIfContinues:cards([next!])})));
 const depleted=advise(s,[p]);assert.equal(pick(depleted.alternatives,'hold').scenarios[0]!.metrics!.score,572);assert.equal(pick(depleted.alternatives,'buy','joker').scenarios[0]!.metrics!.score,676);
 assert.equal(depleted.recommendation.status,'abstain');assert.equal(pick(depleted.alternatives,'hold').scenarios[0]!.metrics!.discardsUsed,3);
});

test('S03 integrado: dos cobros con Golden, sin convertir amortización en recomendación firme',()=>{
 const s=success(parseState(read('horizon-golden-state'))),h=success(validateHorizon(JSON.parse(read('horizon-golden'))));
 const r=success(adviseHorizon(s,h,mutation));assert.deepEqual(r.assessments.slice(0,2).map(a=>[a.moneyAfterShop,...a.metrics.map(m=>m.moneyAfterRound)]),[[25,37,50],[19,33,50]]);
 assert.equal(r.recommendation.status,'tie');assert.equal(r.comparison.alternatives[1]!.netCost,6);
});

test('S04 integrado: ases frente a pares y cartas que no puntúan; no adjudica consistencia',()=>{
 const s=setup(10,['half_joker'],[['scholar',4],['even_steven',4]],2,'big',1200);
 s.observed.visibleBoss=known({ante:2,kind:'boss',bossId:known('the_wall'),target:known(3200),reward:known(5)});
 const r=advise(s,[plan('aces',['AS','AH']),plan('eights',['8S','8H']),plan('four-played',['AS','AH','2D','7C'])]);
 assert.deepEqual(scores(pick(r.alternatives,'hold')),[704,572,64]);assert.deepEqual(scores(pick(r.alternatives,'buy','scholar')),[2160,572,720]);assert.deepEqual(scores(pick(r.alternatives,'buy','even_steven')),[704,780,64]);
 assert.deepEqual(pick(r.alternatives,'buy','scholar').scenarios.map(s=>s.metrics!.reached),[true,false,false]);
 assert.ok(pick(r.alternatives,'buy','scholar').conditions.some(t=>t.includes('4 ases')));assert.ok(r.limitations.some(t=>t.includes('the_wall')));
 assert.equal(pick(r.alternatives,'buy','scholar').scenarios[2]!.activatedEffects.flatMap(e=>e.trace).filter(t=>t.ruleId==='scholar.effect').length,2);
});

test('S05 integrado: fin temprano cambia ingresos y crecimiento; no se cuentan manos no ejecutadas',()=>{
 const s=setup(10,['banner'],[['green_joker',4],['joker',2]],2,'small',800),p=plan('five-high-cards',['KS']);
 p.initialHand=cards(['KS','QH','JD','10C','9S','2H','3D','4C']);p.events=['KS','QH','JD','10C','9S'].map((id,i)=>({type:'play',cardIds:[id],drawIfContinues:cards([['2S','3S','4S','5S','6S'][i]!])}));
 const r=advise(s,[p]),hold=pick(r.alternatives,'hold'),green=pick(r.alternatives,'buy','green_joker'),fixed=pick(r.alternatives,'buy','joker');
 assert.deepEqual([hold,green,fixed].map(a=>scores(a)[0]),[524,945,1050]);assert.deepEqual([hold,green,fixed].map(a=>a.scenarios[0]!.metrics!.handsUsed),[5,3,2]);
 assert.deepEqual([green,fixed].map(a=>a.scenarios[0]!.metrics!.moneyAfterRound),[12,15]);assert.deepEqual(green.scenarios[0]!.growth[0]!.after,known(3));assert.equal(r.recommendation.status,'tie');
});

test('S06 integrado: Water apaga Banner, reemplazo conserva dinero y registra beneficio sacrificado',()=>{
 const s=setup(8,['half_joker','banner'],[['scholar',4]],2,'boss',1600,'the_water');const r=advise(s,[plan('aces',['AS','AH'])]);
 const relevant=[pick(r.alternatives,'hold'),pick(r.alternatives,'buy','scholar'),pick(r.alternatives,'sell','banner'),pick(r.alternatives,'replace','banner')];
 assert.deepEqual(relevant.map(a=>scores(a)[0]),[704,2160,704,2160]);assert.deepEqual(relevant.map(a=>a.scenarios[0]!.metrics!.moneyAfterShop),[8,4,10,6]);
 assert.deepEqual(relevant.map(a=>success(interestOnBalance(success(a.scenarios[0]!.calculation.shop).state))),[1,0,2,1]);
 assert.equal(relevant[3]!.sacrificed[0]!.catalogId,'banner');assert.match(relevant[3]!.limitations.join(' '),/futuras rondas/);
 assert.ok(relevant[1]!.scenarios[0]!.activatedEffects.every(e=>e.trace.every(t=>t.ruleId!=='banner.effect')));
});

test('S07 integrado: capacidad llena, cada venta, Abstract se cuenta y sensibilidad con ases',()=>{
 const s=setup(3,['joker','half_joker','banner','golden_joker','scholar'],[['abstract_joker',4]],4,'small',5000);
 const r=advise(s,[plan('eights',['8S','8H']),plan('aces',['AS','AH'])]);assert.equal(r.alternatives.length,12);
 assert.equal(pick(r.alternatives,'buy','abstract_joker').legal,false);assert.equal(r.alternatives.filter(a=>a.action.type==='sell').length,5);
 const relevant=[pick(r.alternatives,'hold'),pick(r.alternatives,'replace','joker'),pick(r.alternatives,'replace','golden_joker'),pick(r.alternatives,'replace','scholar'),pick(r.alternatives,'sell','joker')];
 assert.deepEqual(relevant.map(a=>scores(a)[0]),[3016,4292,4756,4756,2552]);
 assert.deepEqual(relevant.map(a=>a.scenarios[0]!.metrics!.moneyAfterShop),[3,0,2,1,4]);
 assert.deepEqual(relevant.slice(1,4).map(a=>scores(a)[1]),[7290,7938,5002]);
 assert.ok(relevant.slice(1,4).every(a=>success(a.scenarios[0]!.calculation.shop).occupiedSlots===5));
 assert.ok(relevant[2]!.sacrificed.some(j=>j.catalogId==='golden_joker'));assert.ok(relevant[3]!.sacrificed.some(j=>j.catalogId==='scholar'));
 const replaced=success(relevant[1]!.scenarios[0]!.calculation.shop).state;const sold=success(applyShopAction(replaced,{type:'sell',instanceId:'golden_joker'},{...mutation,expectedRevision:replaced.revision})).state;
 assert.equal(success(scoreHand(sold,{cardIds:['8S','8H'],discardsRemaining:3})).score,3944); // 116*(2+20+12)
});

test('S08 integrado: Psychic exige cinco cartas jugadas; Half no activa por puntuar solo dos',()=>{
 const s=setup(6,['half_joker','joker'],[['banner',5]],1,'boss',600,'the_psychic');const r=advise(s,[plan('five-played',['8S','8H','2D','5C','KS'])]);
 const relevant=[pick(r.alternatives,'hold'),pick(r.alternatives,'buy','banner'),pick(r.alternatives,'sell','half_joker'),pick(r.alternatives,'replace','half_joker')];
 assert.deepEqual(relevant.map(a=>scores(a)[0]),[156,696,156,696]);assert.deepEqual(relevant.map(a=>a.scenarios[0]!.metrics!.moneyAfterShop),[6,1,8,3]);
 assert.deepEqual(relevant.map(a=>success(interestOnBalance(success(a.scenarios[0]!.calculation.shop).state))),[1,0,1,0]);
 assert.equal(advise(s,[plan('illegal-two',['8S','8H'])]).recommendation.status,'abstain');assert.equal(relevant[3]!.sacrificed[0]!.catalogId,'half_joker');
});

test('S09 integrado: cotas insuficientes, no confundirlas con puntuación alcanzable o cobro futuro',()=>{
 const r=success(compareShopBounds(success(parseState(read('s09-bound'))),mutation));assert.equal(r.everyLegalEnumeratedInsufficient,true);
 assert.equal(success(r.alternatives[0]!.bound!).roundScoreUpper,151125);
 const replaced=r.alternatives.find(a=>a.action.type==='replace'&&a.action.sellInstanceId==='joker')!;assert.equal(success(replaced.bound!).roundScoreUpper,169000);
 assert.ok(r.alternatives.filter(a=>a.shop.ok).every(a=>success(a.bound!).roundScoreUpper<=175500));
});

test('fronteras integradas: desconocidos, fuera de cobertura, recursos inválidos y persistencia determinista',()=>{
 const s=base(),p=plan('pair',['8S','8H']),before=structuredClone(s);const r=advise(s,[p]);
 assert.deepEqual(advise(success(parseState(success(serializeState(s)))),[p]),r);assert.deepEqual(s,before);
 const unknown=base();if(unknown.observed.shop.status==='known')unknown.observed.shop.value.cardOffers[1]!.price={status:'unknown',reason:'Falta precio'};assert.equal(advise(unknown,[p]).recommendation.status,'abstain');
 const unsupported=base();unsupported.observed.jokers=known([joker('not-a-catalog-joker')]);assert.equal(advise(unsupported,[p]).recommendation.status,'abstain');
 const boss=base();boss.observed.nextBlind={status:'unknown',reason:'Falta ciega'};assert.equal(advise(boss,[p]).recommendation.status,'abstain');
 const future=base();if(future.observed.visibleBoss.status==='known')future.observed.visibleBoss.value.bossId=known('the_hook');
 const withFuture=advise(future,[p]);assert.equal(withFuture.recommendation.status,'conditional');assert.ok(withFuture.contextNotes.some(t=>t.includes('the_hook')));
 future.observed.visibleBoss={status:'unknown',reason:'No transcrito'};assert.ok(advise(future,[p]).contextNotes.some(t=>t.includes('no informado')));
 const outsideOffer=base();if(outsideOffer.observed.shop.status==='known')outsideOffer.observed.shop.value.cardOffers[0]!.catalogId='not-a-catalog-joker';
 const partial=advise(outsideOffer,[p]);assert.equal(partial.exhaustive,false);assert.equal(partial.alternatives[1]!.legal,false);assert.ok(partial.alternatives[1]!.limitations.some(t=>t.includes('compatible')));
 const negative=base();negative.observed.money=known(-1);assert.equal(validateState(negative).ok,true);assert.equal(applyShopAction(negative,{type:'buy',offerId:'o1',instanceId:'x'},mutation).ok,false);
 const over=base();over.observed.jokers=known(['joker','half_joker','banner','golden_joker','scholar','green_joker'].map(id=>joker(id)));assert.equal(validateState(over).ok,true);assert.equal(advise(over,[p]).recommendation.status,'abstain');
 assert.equal(success(interestOnBalance(after(setup(25,['half_joker','banner'],[['joker',2]],2,'small',800),buy('joker')))),4);
});
