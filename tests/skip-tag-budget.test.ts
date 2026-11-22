import assert from 'node:assert/strict';
import test from 'node:test';
import {assessSkipBudget} from '../src/advisor/skip-tag-budget.js';
import {createNewRun} from '../src/run/start.js';
import {projectCashout} from '../src/rules/economy.js';
import {selectionScenarioState} from '../src/rules/tags.js';
import type {JokerInstance} from '../src/state/model.js';
import {known,success} from './helpers.js';

function run(){
 return success(createNewRun({runId:'skip-tag-budget',updatedAt:'2026-11-21T12:00:00Z',deckId:'red',profileConfirmed:true}));
}

const joker=(id:string,counters:JokerInstance['counters']={}):JokerInstance=>({
 instanceId:id,catalogId:id,edition:known('base'),stickers:known([]),sellValue:known(1),counters
});

test('el vale requiere $35 actuales y D6 puede decidir con $50 sin proyectar otra ciega',()=>{
 const state=run();
 state.observed.money=known(34);
 assert.equal(assessSkipBudget(state,'tag_voucher').skip,false);
 state.observed.money=known(35);
 assert.equal(assessSkipBudget(state,'tag_voucher').skip,true);
 state.observed.nextBlind={status:'unknown',reason:'Siguiente ciega sin registrar.'};
 state.observed.money=known(49);
 assert.equal(assessSkipBudget(state,'tag_d_six').skip,false);
 state.observed.money=known(50);
 assert.equal(assessSkipBudget(state,'tag_d_six').skip,true);
});

test('D6 cuenta el cobro tras una victoria y el ingreso de Golden Joker o Cloud 9',()=>{
 const state=run();
 state.observed.money=known(37);
 // Ciega Grande +$4, interés +$5. Cero manos sobrantes da $46 antes de ingresos de Jokers.
 const withoutJokers=assessSkipBudget(state,'tag_d_six');
 assert.equal(withoutJokers.skip,false);
 assert.match(withoutJokers.reason,/\$46/);
 for(const id of ['golden_joker','cloud_9']){
  state.observed.jokers=known([joker(id)]);
  const before=structuredClone(state);
  const result=assessSkipBudget(state,'tag_d_six');
  assert.equal(result.skip,true,id);
  assert.match(result.reason,/llegarías a \$50, incluidos \$4 de jokers/,id);
  assert.deepEqual(state,before,'La proyección no deposita dinero ni cambia la partida.');
 }
});

test('D6 reconoce el pago de Rocket después del jefe y deja el importe desconocido sin inferir',()=>{
 const state=run();
 state.observed.money=known(37);
 state.observed.nextBlind=known({ante:1,kind:'big',bossId:known('none'),target:known(450),reward:known(4)});
 state.observed.visibleBoss=known({ante:1,kind:'boss',bossId:known('the_psychic'),target:known(600),reward:known(5)});
 state.observed.jokers=known([joker('rocket',{dollars:known(1)})]);
 const before=structuredClone(state);
 const payout=assessSkipBudget(state,'tag_d_six');
 assert.equal(payout.skip,true);
 // $37 + $5 del jefe + $5 de intereses + ($1 inicial de Rocket + $2 del jefe).
 assert.match(payout.reason,/llegarías a \$50, incluidos \$3 de jokers/);
 assert.deepEqual(state,before);
 state.observed.jokers=known([joker('rocket',{dollars:{status:'unknown',reason:'Pago de Rocket sin registrar.'}})]);
 const pending=assessSkipBudget(state,'tag_d_six');
 assert.equal(pending.skip,false);
 assert.match(pending.reason,/\$47.*Falta el pago de Rocket/);
});

test('D6 no cuenta el cobro posterior al jefe final ni presupone el saldo',()=>{
 const state=run();
 state.observed.money=known(49);
 state.observed.nextBlind=known({ante:8,kind:'big',bossId:known('none'),target:known(75_000),reward:known(4)});
 state.observed.visibleBoss=known({ante:8,kind:'boss',bossId:known('violet_vessel'),target:known(300_000),reward:known(8)});
 assert.equal(assessSkipBudget(state,'tag_d_six').skip,false);
 state.observed.money={status:'unknown',reason:'Saldo sin registrar.'};
 for(const tagId of ['tag_d_six','tag_voucher'] as const){
  const result=assessSkipBudget(state,tagId);
  assert.equal(result.skip,false);
  assert.match(result.reason,/Registra el saldo/);
 }
});

test('D6 calcula el premio de un jefe catalogado aunque H2 no puntúe sus manos',()=>{
 const state=run();
 state.observed.money=known(41);
 state.observed.nextBlind=known({ante:1,kind:'big',bossId:known('none'),target:known(450),reward:known(4)});
 state.observed.visibleBoss=known({ante:1,kind:'boss',bossId:known('the_head'),target:known(600),reward:known(5)});
 const before=structuredClone(state);
 const result=assessSkipBudget(state,'tag_d_six');
 assert.equal(result.skip,true);
 assert.match(result.reason,/Si ganas.*\$51/);
 assert.deepEqual(state,before);
 const shop=selectionScenarioState(state);
 shop.observed.nextBlind=state.observed.visibleBoss;
 const legacy=projectCashout(shop,{handsRemaining:0,discardsRemaining:0,won:true,noMoneyChangesDuringRound:true});
 assert.equal(legacy.ok,false);
 if(!legacy.ok)assert.equal(legacy.errors[0]?.code,'unsupported_blind');
});

test('D6 condiciona al triunfo sin descartar cuando Delayed Gratification completa el presupuesto',()=>{
 const state=run();
 state.observed.money=known(35);
 state.observed.jokers=known([joker('delayed_grat')]);
 const before=structuredClone(state);
 const result=assessSkipBudget(state,'tag_d_six');
 assert.equal(result.skip,true);
 assert.match(result.reason,/ganas la siguiente ciega sin descartar.*\$52, incluidos \$8 de jokers/);
 assert.deepEqual(state,before);

 state.observed.jokers=known([joker('delayed_grat'),joker('burglar')]);
 assert.equal(assessSkipBudget(state,'tag_d_six').skip,false);
 state.observed.jokers=known([joker('delayed_grat')]);
 state.observed.nextBlind=known({ante:2,kind:'big',bossId:known('none'),target:known(1200),reward:known(4)});
 state.observed.visibleBoss=known({ante:2,kind:'boss',bossId:known('the_water'),target:known(1600),reward:known(5)});
 assert.equal(assessSkipBudget(state,'tag_d_six').skip,false);
});

test('D6 no presupone que El buey o El diente dejarán intacto el saldo',()=>{
 const state=run();
 state.observed.money=known(41);
 state.observed.nextBlind=known({ante:6,kind:'big',bossId:known('none'),target:known(30_000),reward:known(4)});
 for(const bossId of ['the_ox','the_tooth']){
  state.observed.visibleBoss=known({ante:6,kind:'boss',bossId:known(bossId),target:known(40_000),reward:known(5)});
  state.observed.jokers=known([]);
  assert.equal(assessSkipBudget(state,'tag_d_six').skip,false,bossId);
  state.observed.jokers=known([joker('chicot')]);
  assert.equal(assessSkipBudget(state,'tag_d_six').skip,true,bossId);
 }
});
