import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {verifyOrScoreEfhiii,EFHIII_SOURCE} from '../src/reference/efhiii-scoring.js';
import type {GameState} from '../src/state/model.js';
import {standardDeck} from '../src/catalog/initial.js';
import {known} from './helpers.js';
import type {HandInput} from '../src/rules/scoring.js';

function fixture(ids:string[]):GameState {
 const s=JSON.parse(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8')) as GameState;
 s.observed.jokers=known(ids.map((catalogId,i)=>({catalogId,instanceId:'j'+i,edition:known('base'),stickers:known([]),sellValue:known(2),counters:{}})));
 return s;
}
function run(s:GameState,hand:HandInput,score:number,mult:number,chips:number):void {
 const original=structuredClone(s),before=structuredClone(hand),result=verifyOrScoreEfhiii(s,hand);
 assert.deepEqual(result,{supported:true,score,chips,mult,source:EFHIII_SOURCE});assert.deepEqual(s,original);assert.deepEqual(hand,before);
}
test('EFHIII real: held Q→K conserva orden de +13 y ×1.5; oráculo 7×14×1.5=147',()=>{
 run(fixture(['shoot_the_moon','baron']),{cardIds:['2H'],heldCardIds:['QH','KH'],discardsRemaining:3},147,21,7);
});
test('EFHIII real: held K→Q cambia orden y redondea únicamente el total 101.5→101',()=>{
 run(fixture(['shoot_the_moon','baron']),{cardIds:['2H'],heldCardIds:['KH','QH'],discardsRemaining:3},101,14.5,7);
});
test('EFHIII real: Baron+Mime y K Steel/Red repetida tres veces; oráculo 7×2.25³→79',()=>{
 const s=fixture(['baron','mime']),deck=standardDeck(),king=deck.find(c=>c.instanceId==='KH')!;king.enhancement='steel';king.seal='red';s.observed.deck=known({cards:deck});
 run(s,{cardIds:['2H'],heldCardIds:['KH'],discardsRemaining:3},79,11.390625,7);
});
test('EFHIII real: Photograph+Hanging Chad+Red, cuatro activaciones de K; (5+40)×16=720',()=>{
 const s=fixture(['photograph','hanging_chad']),deck=standardDeck();deck.find(c=>c.instanceId==='KH')!.seal='red';s.observed.deck=known({cards:deck});
 run(s,{cardIds:['KH'],heldCardIds:[],discardsRemaining:3},720,16,45);
});
test('EFHIII real: Blueprint copia Photograph con identidad física y repeticiones; ×4 por K',()=>{
 const s=fixture(['blueprint','photograph','hanging_chad']);
 // Three scoring activations: 5+3×10=35 chips; each ×2 Photograph and ×2 copy => ×4³=64.
 run(s,{cardIds:['KH'],heldCardIds:[],discardsRemaining:3},2240,64,35);
});
test('EFHIII limita Flint, Glass, Hiker, Space y familias con eventos o azar',()=>{
 for(const id of ['glass','hiker','space','misprint','bloodstone','8_ball','reserved_parking','vampire','midas_mask','dna']){
  const result=verifyOrScoreEfhiii(fixture([id]),{cardIds:['2H'],heldCardIds:[],discardsRemaining:3});assert.equal(result.supported,false);assert.ok(result.reason?.includes(id));
 }
 const s=fixture([]);assert.equal(s.observed.nextBlind.status,'known');if(s.observed.nextBlind.status==='known')s.observed.nextBlind.value.bossId=known('the_flint');
 const flint=verifyOrScoreEfhiii(s,{cardIds:['2H'],discardsRemaining:3});assert.equal(flint.supported,false);assert.ok(flint.reason?.includes('Flint'));
 for(const enhancement of ['lucky','glass']){const s=fixture([]),deck=standardDeck();deck.find(c=>c.instanceId==='2H')!.enhancement=enhancement;s.observed.deck=known({cards:deck});assert.equal(verifyOrScoreEfhiii(s,{cardIds:['2H'],discardsRemaining:3}).supported,false);}
});
test('EFHIII no infiere cartas retenidas, contadores ni outcomes; rechaza cartas ilegales',()=>{
 assert.equal(verifyOrScoreEfhiii(fixture(['baron']),{cardIds:['2H'],discardsRemaining:3}).supported,false);
 assert.equal(verifyOrScoreEfhiii(fixture(['green_joker']),{cardIds:['2H'],discardsRemaining:3}).supported,false);
 for(const hand of [{cardIds:['2H','2H'],discardsRemaining:3},{cardIds:['2H'],heldCardIds:['2H'],discardsRemaining:3},{cardIds:['not-a-card'],discardsRemaining:3}])assert.equal(verifyOrScoreEfhiii(fixture([]),hand).supported,false);
 const choices=[{key:'any',kind:'boolean' as const,value:true,knowledge:'hypothetical' as const,basis:'Rama declarada'}];assert.equal(verifyOrScoreEfhiii(fixture([]),{cardIds:['2H'],discardsRemaining:3,choices}).supported,false);
});
test('EFHIII convierte Green antes de jugar y niveles canónicos, evitando doble crecimiento',()=>{
 const s=fixture(['green_joker']);if(s.observed.jokers.status==='known')s.observed.jokers.value[0]!.counters.greenMult=known(5);
 run(s,{cardIds:['KH'],discardsRemaining:3},105,7,15);
 s.observed.jokers=known([]);
 const v={high_card:known({level:2,chips:15,mult:2}),pair:known({level:1,chips:10,mult:2}),two_pair:known({level:1,chips:20,mult:2}),three_kind:known({level:1,chips:30,mult:3}),straight:known({level:1,chips:30,mult:4}),flush:known({level:1,chips:35,mult:4}),full_house:known({level:1,chips:40,mult:4}),four_kind:known({level:1,chips:60,mult:7}),straight_flush:known({level:1,chips:100,mult:8})};
 s.observed.handBases=known({values:v});run(s,{cardIds:['KH'],discardsRemaining:3},50,2,25);
 v.high_card=known({level:2,chips:16,mult:2});assert.equal(verifyOrScoreEfhiii(s,{cardIds:['KH'],discardsRemaining:3}).supported,false);
});
test('Fuente EFHIII fijada y ambas copias de distribución conservan MIT y atribución',()=>{
 const raw=readFileSync('tools/reference/efhiii/balatro-sim.js');assert.equal(createHash('sha256').update(raw).digest('hex'),'27ada8d35202a698ebd30b803e13dd1c765222f2e36ba54e806b5d69f69302a8');
 for(const path of ['src/reference/vendor/efhiii-sim.ts','web/assets/efhiii/balatro-sim.js']){const source=readFileSync(path,'utf8');assert.ok(source.includes('Copyright (c) 2024 Saffron Haas'));assert.ok(source.includes('MIT License'));assert.ok(source.includes('export { Hand }'));}
});
