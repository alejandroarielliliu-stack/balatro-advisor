import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseState} from '../src/state/validation.js';
import {known,success} from './helpers.js';
import {voucherResources,supportedVouchers,cataloguedVouchers} from '../src/catalog/vouchers.js';
import {VOUCHER_CATALOG} from '../src/catalog/voucher-catalog.js';
import {beginRound,applyRoundEvent} from '../src/rules/round.js';
import {scoreHand} from '../src/rules/scoring.js';
import {applyShopAction} from '../src/rules/shop.js';
import {validateRoundPlan} from '../src/evaluation/plan.js';
import {projectCashout} from '../src/rules/economy.js';
const fixture=()=>success(parseState(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8')));
const withVouchers=(ids:string[])=>{const s=fixture();s.observed.outOfScope=known({vouchers:ids,consumables:[],pendingTags:[],otherModifiers:[]});return s;};
const cards=['AS','AH','KS','KH','QS','QH','JS','JH','10S','10H','9S','9H'];
test('Vales documentales se pueden transcribir sin activar reglas H2, con requisitos y IDs válidos',()=>{
 assert.equal(cataloguedVouchers(['v_tarot_merchant']),true);
 assert.equal(cataloguedVouchers(['v_telescope','v_observatory']),true);
 for(const ids of [['v_observatory'],['unknown'],['v_tarot_merchant','v_tarot_merchant']])assert.equal(cataloguedVouchers(ids),false);
 assert.equal(supportedVouchers(['v_tarot_merchant']),false);
 const state=withVouchers(['v_tarot_merchant']),before=structuredClone(state);
 assert.equal(parseState(JSON.stringify(state)).ok,true);
 assert.equal(applyShopAction(state,{type:'hold'},{expectedRevision:state.revision,updatedAt:state.updatedAt}).ok,false);
 assert.equal(beginRound(state,cards.slice(0,8)).ok,false);
 assert.deepEqual(state,before);
});
test('L06 recursos literales por baraja, acumulación y prerrequisitos; 32 ilustraciones',()=>{
 assert.equal(VOUCHER_CATALOG.length,32);assert.equal(new Set(VOUCHER_CATALOG.map(v=>v.id)).size,32);
 assert.deepEqual(voucherResources('blue',['v_grabber','v_nacho_tong','v_wasteful','v_recyclomancy','v_paint_brush','v_palette','v_blank','v_antimatter']),{hands:7,discards:5,handSize:10,jokerSlots:6});
 assert.deepEqual(voucherResources('painted',['v_paint_brush','v_palette','v_blank','v_antimatter']),{hands:4,discards:3,handSize:12,jokerSlots:5});
 assert.deepEqual(voucherResources('black',['v_grabber']),{hands:4,discards:3,handSize:8,jokerSlots:6});
 for(const ids of [['v_palette'],['v_antimatter'],['v_grabber','v_grabber'],['v_observatory']])assert.equal(supportedVouchers(ids),false);
 assert.equal(supportedVouchers(['v_blank','v_antimatter']),true);
});
test('Grabber: una mano extra genera $1 adicional, no modifica dinero observado',()=>{
 const s=withVouchers(['v_grabber']);s.observed.resources.handsPerRound=known(6);s.observed.money=known(20);const before=structuredClone(s);
 const round=success(beginRound(s,cards.slice(0,8)));assert.equal(round.handsLeft,6);
 const cash=projectCashout(s,{won:true,handsRemaining:5,noMoneyChangesDuringRound:true});assert.equal(success(cash).earned,13); // Big 4 + unused hands 5 + interest 4
 assert.ok(cash.evidence.limitations.some(e=>e.ruleId==='vouchers.resources'));assert.deepEqual(s,before);
 assert.equal(beginRound(s,cards.slice(0,8),{requireObserved:true}).ok,false);
 s.observed.resources.handsPerRound=known(5);assert.equal(beginRound(s,cards.slice(0,8)).ok,false);
});
test('Wasteful activa Banner con cuatro descartes: (10+11+11+120)*2 = 304',()=>{
 const s=withVouchers(['v_wasteful']);s.observed.resources.discardsPerRound=known(4);
 s.observed.jokers=known([{instanceId:'banner',catalogId:'banner',edition:known('base'),stickers:known([]),sellValue:known(2),counters:{}}]);
 assert.equal(success(scoreHand(s,{cardIds:['AS','AH'],discardsRemaining:4})).score,304);
 const round=success(beginRound(s,cards.slice(0,8)));
 const next=success(applyRoundEvent(round,{type:'discard',cardIds:['JS'],drawnCardIds:['10S']},{expectedRevision:s.revision,updatedAt:s.updatedAt}));assert.equal(next.round.discardsLeft,3);
});
test('Tamaño 9/12 y huecos extra, sin adaptar ni inventar las cartas del plan',()=>{
 const s=withVouchers(['v_paint_brush']);s.observed.resources.handSize=known(9);
 assert.equal(beginRound(s,cards.slice(0,8)).ok,false);assert.equal(success(beginRound(s,cards.slice(0,9))).hand.length,9);
 const plan={schemaVersion:'scenario-1',planId:'nine',description:'manual',initialHand:cards.slice(0,9).map(cardId=>({cardId,knowledge:'hypothetical',basis:'test'})),events:[{type:'play',cardIds:['AS','AH'],drawIfContinues:[]}],assumptions:{noMoneyChangesDuringRound:true}};
 assert.equal(validateRoundPlan(plan).ok,true);
 const painted=withVouchers(['v_paint_brush','v_palette']);painted.observed.deckId=known('painted');painted.observed.resources={handsPerRound:known(4),discardsPerRound:known(3),handSize:known(12),jokerSlots:known(4)};
 assert.equal(success(beginRound(painted,cards)).hand.length,12);
 assert.equal(validateRoundPlan({...plan,initialHand:cards.map(cardId=>({cardId,knowledge:'hypothetical',basis:'test'}))}).ok,true);
 const anti=withVouchers(['v_blank','v_antimatter']);anti.observed.resources.jokerSlots=known(6);
 const held=success(applyShopAction(anti,{type:'hold'},{expectedRevision:anti.revision,updatedAt:anti.updatedAt}));assert.equal(held.freeSlots,6);
 anti.observed.resources.jokerSlots=known(5);assert.equal(applyShopAction(anti,{type:'hold'},{expectedRevision:anti.revision,updatedAt:anti.updatedAt}).ok,false);
});
