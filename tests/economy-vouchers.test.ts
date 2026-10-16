import {readFileSync} from 'node:fs';
import {parseState} from '../src/state/validation.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {known,success} from './helpers.js';
import {interestOnBalance,projectCashout} from '../src/rules/economy.js';
const s01=()=>success(parseState(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8')));
test('Interés: topes 5/10/20, saldo explícito; sin mutación y evidencia provisional',()=>{
 for(const [ids,expected] of [[[],5],[['v_seed_money'],10],[['v_seed_money','v_money_tree'],20]] as [string[],number][]){
  const state=s01();state.observed.money=known(101);state.observed.outOfScope=known({vouchers:ids,consumables:[],pendingTags:[],otherModifiers:[]});const before=structuredClone(state);
  const result=interestOnBalance(state);assert.equal(success(result),expected);assert.deepEqual(state,before);
  if(ids.length){assert.ok(result.evidence.limitations.some(e=>e.ruleId==='vouchers.interest'));assert.equal(interestOnBalance(state,{requireObserved:true}).ok,false);}
 }
});
test('Cobro con Golden y vales no suma el premio al saldo que genera interés',()=>{
 const state=s01();state.observed.money=known(101);state.observed.jokers=known([{instanceId:'gold',catalogId:'golden_joker',edition:known('base'),stickers:known([]),sellValue:known(3),counters:{}}]);
 state.observed.outOfScope=known({vouchers:['v_seed_money','v_money_tree'],consumables:[],pendingTags:[],otherModifiers:[]});
 const result=success(projectCashout(state,{won:true,handsRemaining:3,noMoneyChangesDuringRound:true}));
 // Big $4 + three hands $3 + Golden $4 + capped interest $20 = $31.
 assert.equal(result.earned,31);assert.equal(result.balanceAfter,132);
 state.observed.deckId=known('green');state.observed.resources.handsPerRound=known(4);
 const green=success(projectCashout(state,{won:true,handsRemaining:3,discardsRemaining:3,noMoneyChangesDuringRound:true}));
 assert.equal(green.interest,0);assert.equal(green.earned,17);
});
test('Vales desconocidos, duplicados o Money Tree sin Seed quedan fuera de cobertura',()=>{
 for(const vouchers of [['v_observatory'],['v_money_tree'],['v_seed_money','v_seed_money']]){
 const state=s01();state.observed.outOfScope=known({vouchers,consumables:[],pendingTags:[],otherModifiers:[]});assert.equal(interestOnBalance(state).ok,false);
 }
});
