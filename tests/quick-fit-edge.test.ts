import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import type {GameState, JokerInstance} from '../src/state/model.js';
import {standardDeck} from '../src/catalog/initial.js';
import {evaluateJokerFit} from '../src/advisor/quick-fit.js';
import {known} from './helpers.js';

/**
 * Mechanical expectations are literal conditions documented before this
 * evaluator: catalogo-completo.md, cat04-history.md, cat04-economy.md and
 * cat04-generation.md. Policy expectations come from perfiles-encaje.md.
 * These checks are neither observed gameplay nor a validated tier list.
 */
function fixture():GameState {
  const state=JSON.parse(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8')) as GameState;
  state.assumptions.probes=[];
  state.assumptions.roundPlans=[];
  state.observed.money=known(30);
  return state;
}
function joker(catalogId:string,instanceId=catalogId,sellValue=1,counters:JokerInstance['counters']={}):JokerInstance {
  return {instanceId,catalogId,edition:known('base'),stickers:known([]),sellValue:known(sellValue),counters};
}
function own(state:GameState,...jokers:JokerInstance[]) {state.observed.jokers=known(jokers);}

test('Quick fit: Stencil uses actual slots and its own inclusion, not an invented counter',()=>{
  const state=fixture();
  own(state,joker('stencil','owned-stencil',4));
  const before=structuredClone(state);
  // Four empty slots plus Stencil itself support a factor greater than ×1.
  const open=evaluateJokerFit(state,'stencil',{ante:4,instanceId:'owned-stencil'});
  assert.equal(open.readiness,'ready');
  assert.notEqual(open.score,null);
  assert.deepEqual(state,before);
  // Full inventory leaves only Stencil's own inclusion: ×1 has no increase.
  own(state,joker('stencil','owned-stencil',4),joker('joker','j1'),joker('joker','j2'),joker('joker','j3'),joker('joker','j4'));
  const full=evaluateJokerFit(state,'stencil',{ante:4,instanceId:'owned-stencil'});
  assert.equal(full.readiness,'unavailable');
  state.observed.resources.jokerSlots={status:'unknown',reason:'Capacidad no introducida'};
  assert.equal(evaluateJokerFit(state,'stencil',{ante:4,instanceId:'owned-stencil'}).score,null);
});

test('Quick fit: Baseball counts physical Uncommon Jokers without needing a growth counter',()=>{
  const state=fixture();own(state,joker('baseball','owned-baseball',4),joker('joker'));
  const absent=evaluateJokerFit(state,'baseball',{ante:4,instanceId:'owned-baseball'});
  assert.equal(absent.readiness,'unavailable');
  // Pareidolia is physically Uncommon; Baseball is Rare and Joker Common.
  own(state,joker('baseball','owned-baseball',4),joker('pareidolia','uncommon',2));
  const supported=evaluateJokerFit(state,'baseball',{ante:4,instanceId:'owned-baseball'});
  assert.equal(supported.readiness,'ready');
  assert.notEqual(supported.score,null);
});

test('Quick fit: Swashbuckler uses other current sale values, excluding itself',()=>{
  const state=fixture();own(state,joker('swashbuckler','owned-swash',2));
  assert.equal(evaluateJokerFit(state,'swashbuckler',{ante:4,instanceId:'owned-swash'}).readiness,'unavailable');
  own(state,joker('swashbuckler','owned-swash',2),joker('joker','other',1));
  const supported=evaluateJokerFit(state,'swashbuckler',{ante:4,instanceId:'owned-swash'});
  assert.equal(supported.readiness,'ready');
  assert.notEqual(supported.score,null);
  const unknown=joker('joker','unknown-sale');unknown.sellValue={status:'unknown',reason:'Venta no transcrita'};
  own(state,joker('swashbuckler','owned-swash',2),unknown);
  assert.equal(evaluateJokerFit(state,'swashbuckler',{ante:4,instanceId:'owned-swash'}).score,null);
});

test('Quick fit: Vagabond needs at most $4 and cannot promise a consumable from money alone',()=>{
  const state=fixture();
  state.observed.jokerContext=known({consumables:known([]),consumableSlots:known(2)});
  state.observed.money=known(5);
  assert.equal(evaluateJokerFit(state,'vagabond',{ante:1}).readiness,'unavailable');
  state.observed.money=known(4);
  const available=evaluateJokerFit(state,'vagabond',{ante:1});
  assert.notEqual(available.readiness,'unavailable');
  assert.notEqual(available.score,null);
  state.observed.money={status:'unknown',reason:'Saldo no introducido'};
  assert.equal(evaluateJokerFit(state,'vagabond',{ante:1}).score,null);
});

test('Quick fit: Mystic Summit is available at zero discards; Burglar supplies that condition',()=>{
  const state=fixture();state.observed.resources.discardsPerRound=known(0);
  assert.equal(evaluateJokerFit(state,'mystic_summit',{ante:1}).readiness,'ready');
  state.observed.resources.discardsPerRound=known(3);
  assert.equal(evaluateJokerFit(state,'mystic_summit',{ante:1}).readiness,'potential');
  own(state,joker('burglar','owned-burglar',3));
  assert.equal(evaluateJokerFit(state,'mystic_summit',{ante:1}).readiness,'ready');
  assert.equal(evaluateJokerFit(state,'banner',{ante:1}).readiness,'unavailable');
  assert.equal(evaluateJokerFit(state,'burnt',{ante:1}).readiness,'unavailable');
  assert.equal(evaluateJokerFit(state,'trading',{ante:1}).readiness,'unavailable');
});

test('Quick fit: Driver\'s License requires sixteen Enhanced cards in the complete deck',()=>{
  const state=fixture(),cards=standardDeck();
  cards.slice(0,15).forEach(c=>c.enhancement='bonus');
  state.observed.deck=known({cards});
  const before=structuredClone(state),fifteen=evaluateJokerFit(state,'drivers_license',{ante:6});
  assert.equal(fifteen.readiness,'unavailable');
  assert.deepEqual(state,before);
  cards[15]!.enhancement='bonus';
  state.observed.deck=known({cards});
  assert.equal(evaluateJokerFit(state,'drivers_license',{ante:6}).readiness,'ready');
  state.observed.deck={status:'unknown',reason:'Mejoras no contabilizadas'};
  assert.equal(evaluateJokerFit(state,'drivers_license',{ante:6}).score,null);
});

test('Quick fit: replacing Pareidolia removes its face support before rating Photograph',()=>{
  const state=fixture();
  state.observed.deckId=known('abandoned');
  state.observed.resources.handsPerRound=known(4);
  state.observed.deck=known({cards:standardDeck().filter(c=>!['J','Q','K'].includes(c.rank))});
  own(state,joker('pareidolia','owned-pareidolia',2));
  const before=structuredClone(state);
  const keep=evaluateJokerFit(state,'photograph',{ante:4,purchase:true});
  assert.equal(keep.readiness,'potential');
  const replace=evaluateJokerFit(state,'photograph',{ante:4,purchase:true,replacementId:'owned-pareidolia'});
  assert.equal(replace.readiness,'unavailable');
  assert.equal(replace.purchase.status,'legal');
  // Literal catalog prices: sell Pareidolia $2; buy Photograph $5: $30 + $2 - $5 = $27.
  assert.equal(replace.purchase.netCost,3);
  assert.equal(replace.purchase.moneyAfter,27);
  assert.deepEqual(state,before);
});

test('Quick fit: Castle target suit is not accumulated Chips',()=>{
  const state=fixture();
  own(state,joker('castle','owned-castle',3,{chips:known(0),suit:known(3)}));
  const base=evaluateJokerFit(state,'castle',{ante:4,instanceId:'owned-castle'});
  assert.notEqual(base.readiness,'ready','Known target Clubs does not establish accumulated Chips');
  own(state,joker('castle','owned-castle',3,{chips:known(12),suit:known(3)}));
  assert.equal(evaluateJokerFit(state,'castle',{ante:4,instanceId:'owned-castle'}).readiness,'ready');
});

test('Quick fit: Yorick remaining-cycle count does not establish useful accumulated multiplication',()=>{
  const state=fixture();
  own(state,joker('yorick','owned-yorick',10,{x100:known(100),remaining:known(23)}));
  const fresh=evaluateJokerFit(state,'yorick',{ante:8,instanceId:'owned-yorick'});
  assert.notEqual(fresh.readiness,'ready','×1 is not developed multiplication; remaining23 is a requirement');
  own(state,joker('yorick','owned-yorick',10,{x100:known(200),remaining:known(23)}));
  assert.equal(evaluateJokerFit(state,'yorick',{ante:8,instanceId:'owned-yorick'}).readiness,'ready');
  own(state,joker('yorick','owned-yorick',10,{x100:{status:'unknown',reason:'Multiplicador no transcrito'},remaining:known(23)}));
  assert.equal(evaluateJokerFit(state,'yorick',{ante:8,instanceId:'owned-yorick'}).score,null);
});

test('Quick fit: Plasma retains an interval when the scoring balance is not measured',()=>{
  const state=fixture();state.observed.deckId=known('plasma');
  for(const id of ['joker','stuntman']){
    const fit=evaluateJokerFit(state,id,{ante:4});
    assert.equal(fit.score,null);
    assert.ok(fit.range);
    assert.notEqual(fit.range[1],null);assert.ok(fit.range[0]<fit.range[1]!);
    assert.ok(fit.signals.some(s=>s.id==='plasma-balance'));
  }
});

test('Quick fit: strict evidence and unsupported prices never invent a successful replacement',()=>{
  const state=fixture();own(state,joker('pareidolia','owned-pareidolia',2));
  const before=structuredClone(state);
  const strict=evaluateJokerFit(state,'photograph',{ante:4,purchase:true,replacementId:'owned-pareidolia',requireObserved:true});
  assert.notEqual(strict.purchase.status,'legal');
  assert.ok(strict.purchase.errors.some(e=>e.code==='pending_rule'));
  assert.equal(strict.purchase.moneyAfter,undefined);
  assert.deepEqual(state,before);
  // An observed sale value outside the current supported model is not silently normalized.
  own(state,joker('pareidolia','owned-pareidolia',3));
  const badPriceBefore=structuredClone(state);
  const unsupported=evaluateJokerFit(state,'photograph',{ante:4,purchase:true,replacementId:'owned-pareidolia'});
  assert.notEqual(unsupported.purchase.status,'legal');
  assert.ok(unsupported.purchase.errors.some(e=>e.code==='unsupported_price'));
  assert.equal(unsupported.purchase.moneyAfter,undefined);
  assert.deepEqual(state,badPriceBefore);
});
