import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseState} from '../src/state/validation.js';
import {comparisonDemoScenarios} from '../src/demo-scenarios.js';
import {previewJoker} from '../src/evaluation/joker-preview.js';
import {known,success} from './helpers.js';
const fixture=()=>comparisonDemoScenarios(success(parseState(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8'))))[0]!;

test('Oferta real en manos: un precio manual incompatible no se reemplaza por el base',()=>{
 const {state,plan}=fixture(),before=structuredClone(state),offer={price:known(1),edition:known('base'),stickers:known([])};
 const advice=success(previewJoker(state,'half_joker',[{role:'representative',plan}],'',offer));
 const branch=advice.alternatives[1]!;assert.equal(branch.legal,false);assert.equal(branch.scenarios[0]!.metrics,null);
 const shop=branch.scenarios[0]!.calculation.shop;assert.equal(shop.ok,false);if(!shop.ok)assert.equal(shop.errors[0]!.code,'unsupported_price');
 assert.deepEqual(state,before);assert.deepEqual(offer.price,known(1));
});

test('Oferta real en manos: Half holográfica cuesta8, saldo10→2 y26*(2+20+10)=832',()=>{
 const {state,plan}=fixture();state.observed.money=known(10);const before=structuredClone(state);
 // Static card.lua price: Half5 + Holographic3 =8. First pair26chips.
 const advice=success(previewJoker(state,'half_joker',[{role:'representative',plan}],'',{price:known(8),edition:known('holographic'),stickers:known([])}));
 const branch=advice.alternatives[1]!;assert.equal(branch.legal,true);assert.equal(branch.scenarios[0]!.metrics!.moneyAfterShop,2);
 // Pair8s:10+8+8=26; Mult2+20(Half)+10(Holo)=32 =>832.
 assert.equal(branch.scenarios[0]!.metrics!.score,832);assert.deepEqual(state,before);
});
test('Vista catálogo: compra sintética conserva el registro y utiliza el mismo plan',()=>{
 const {state,plan}=fixture(),before=structuredClone(state);
 const advice=success(previewJoker(state,'half_joker',[{role:'representative',plan}]));
 assert.deepEqual(state,before);
 assert.equal(advice.alternatives.length,2);
 // Calculados a mano en el escenario H3: dos parejas separadas 52+28=80;
 // Half añade 20 Mult a la primera: 26*(2+20)=572, termina la ronda.
 assert.deepEqual(advice.alternatives.map(a=>a.scenarios[0]!.metrics!.score),[80,572]);
 assert.equal(advice.alternatives[1]!.scenarios[0]!.calculation.netCost,5);
 assert.equal(advice.alternatives[1]!.scenarios[0]!.metrics!.moneyAfterShop,2);
 assert.ok(advice.alternatives[1]!.scenarios[0]!.calculation.evidence);
});
test('Vista catálogo: dinero insuficiente y efecto no compatible no inventan resultado',()=>{
 const {state,plan}=fixture();state.observed.money=known(0);const before=structuredClone(state);
 const advice=success(previewJoker(state,'half_joker',[{role:'representative',plan}]));
 assert.equal(advice.alternatives[1]!.legal,false);
 assert.equal(advice.alternatives[1]!.scenarios[0]!.metrics,null);
 assert.equal(previewJoker(state,'mime',[]).ok,false);
 assert.deepEqual(state,before);
});
test('Vista catálogo: sin espacio requiere vender explícitamente y conserva originales',()=>{
 const {state,plan}=fixture();state.observed.resources.jokerSlots=known(5);
 state.observed.jokers=known(['joker','scholar','banner','even_steven','golden_joker'].map((catalogId,i)=>({instanceId:'j'+i,catalogId,edition:known('base'),stickers:known([]),sellValue:known([1,2,2,2,3][i]!),counters:{}})));
 const before=structuredClone(state),scenarios=[{role:'representative' as const,plan}];
 assert.equal(success(previewJoker(state,'half_joker',scenarios)).alternatives[1]!.legal,false);
 const replace=success(previewJoker(state,'half_joker',scenarios,'j0')).alternatives[1]!;
 assert.equal(replace.legal,true);assert.equal(replace.action.type,'replace');
 assert.equal(replace.scenarios[0]!.calculation.netCost,4);
 assert.deepEqual(state,before);
});
