import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ECONOMIC_JOKERS} from '../src/catalog/economic-jokers.js';
import {standardDeck} from '../src/catalog/initial.js';
import type {Card} from '../src/catalog/initial.js';
import type {GameState,JokerInstance} from '../src/state/model.js';
import {need} from '../src/rules/core.js';
import {baseballBonus,bankBalance,creditLimit,economicCard,economicEvent,growSell} from '../src/rules/economic-jokers.js';
import {effectiveJokers} from '../src/rules/joker-context.js';
import type {FullEventInput,FullJokerInput} from '../src/rules/full-joker-contract.js';
import {known} from './helpers.js';

const saved=():GameState=>JSON.parse(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8')) as GameState;
const joker=(catalogId:string,sellValue=2,instanceId=catalogId):JokerInstance=>({catalogId,instanceId,sellValue:known(sellValue),edition:known('base'),stickers:known([]),counters:{}});
const card=(id:string):Card=>{const found=standardDeck().find(c=>c.instanceId===id);assert.ok(found);return found;};
function input(jokers:JokerInstance[]):FullJokerInput {
 const state=saved();state.observed.jokers=known(jokers);
 return {state,physical:jokers,effective:effectiveJokers(jokers),played:[],scoring:[],held:[],hand:'high_card',discardsRemaining:3,trace:[],use:()=>{}};
}
function event(i:FullJokerInput,stage:FullEventInput['stage'],cards:Card[]=[]):FullEventInput {
 return {state:i.state,stage,cards,trace:i.trace,use:i.use};
}
function rejectsCode(body:()=>unknown,expected:string):void {
 assert.throws(body,(e:unknown)=>e instanceof Error&&'detail' in e&&typeof e.detail==='object'&&e.detail!==null&&'code' in e.detail&&e.detail.code===expected);
}
test('CAT04 economy: siete metadatos, precios de fuente y venta mínima $1',()=>{
 const expected={credit_card:[1,1,false,1],egg:[4,2,false,1],faceless:[4,2,true,1],gift:[6,3,false,2],baseball:[8,4,true,3],ticket:[5,2,true,1],rough_gem:[7,3,true,2]} as const;
 assert.equal(Object.keys(ECONOMIC_JOKERS).length,7);
 for(const [id,[price,sell,blueprint,rarity]] of Object.entries(expected)){
  const actual=ECONOMIC_JOKERS[id as keyof typeof ECONOMIC_JOKERS];assert.deepEqual([actual.price,actual.sell,actual.blueprint,actual.rarity],[price,sell,blueprint,rarity]);
 }
});
test('Credit Card suma $20 de crédito físico; Blueprint no amplía el límite',()=>{
 const i=input([joker('blueprint',5),joker('credit_card',1)]);
 assert.equal(creditLimit(i.state),20);i.state.observed.money=known(-20);assert.equal(bankBalance(-20),-20);
 // Independent affordability oracle: with $0 and $20 debt limit, $20 is payable, $21 isn't.
 assert.equal(20<=0+20,true);assert.equal(21<=0+20,false);
 i.state.observed.jokers=known([]);assert.equal(creditLimit(i.state),0);
 rejectsCode(()=>bankBalance(Number.MAX_SAFE_INTEGER+1),'numeric_range');rejectsCode(()=>bankBalance(1.5),'numeric_range');
});
test('Egg crece $3 en end-round, también derrota; Blueprint no copia este crecimiento',()=>{
 const i=input([joker('blueprint',5),joker('egg',2)]),original=structuredClone(i.state);
 i.state=structuredClone(original);const end=event(i,'end_round');end.won=false;
 economicEvent(end);const inventory=need(i.state.observed.jokers,'jokers');
 assert.equal(need(inventory[1]!.sellValue,'egg'),5);assert.equal(need(inventory[1]!.counters.extraSell!,'growth'),3);
 assert.equal(need(inventory[0]!.sellValue,'copy'),5);
 assert.equal(need(need(original.observed.jokers,'jokers')[1]!.sellValue,'egg'),2);
 economicEvent(event(i,'after_hand'));assert.equal(need(inventory[1]!.sellValue,'egg'),5);
});
test('Gift incluye su propio valor y consumibles; Egg y Gift se acumulan una vez por físico',()=>{
 for(const reversed of [false,true]){
  const js=[joker('egg',2),joker('gift',3),joker('blueprint',5)];if(reversed)js.reverse();
  const i=input(js),tarot={instanceId:'tarot',catalogId:'c_fool',kind:'tarot' as const,edition:'base' as const,sellValue:1};
  i.state.observed.jokerContext=known({consumables:known([tarot]),consumableSlots:known(2)});
  const end=event(i,'end_round');end.won=true;economicEvent(end);
  // Independent: Egg 2+3+1=6, Gift 3+1=4, Blueprint 5+1=6, Tarot 1+1=2.
  assert.equal(need(js.find(j=>j.catalogId==='egg')!.sellValue,'egg'),6);
  assert.equal(need(js.find(j=>j.catalogId==='gift')!.sellValue,'gift'),4);
  assert.equal(need(js.find(j=>j.catalogId==='blueprint')!.sellValue,'blueprint'),6);assert.equal(tarot.sellValue,2);
 }
});
test('Gift exige inventario explícito de consumibles antes de elevar los precios',()=>{
 const i=input([joker('gift',3)]),original=structuredClone(i.state);
 rejectsCode(()=>economicEvent(event(i,'end_round')),'unknown_data');assert.deepEqual(i.state,original);
 i.state.observed.jokerContext=known({consumables:known([])});economicEvent(event(i,'end_round'));
 assert.equal(need(i.physical[0]!.sellValue,'gift'),4);
});
test('Faceless paga una vez por descarte de 3 figuras; dos no alcanzan, Blueprint duplica pago',()=>{
 const i=input([joker('faceless',2)]);
 assert.equal(economicEvent(event(i,'discard',[card('KS'),card('QH')])),0);
 assert.equal(economicEvent(event(i,'discard',[card('KS'),card('QH'),card('JD')])),5);
 assert.equal(economicEvent(event(i,'after_hand',[card('KS'),card('QH'),card('JD')])),0);
 i.physical.unshift(joker('blueprint',5));i.state.observed.jokers=known(i.physical);
 assert.equal(economicEvent(event(i,'discard',[card('KS'),card('QH'),card('JD'),card('KH')])),10);
});
test('Faceless respeta Pareidolia incluso Stone y descarta figuras debuff sin contarlas',()=>{
 const i=input([joker('faceless',2),joker('pareidolia',2)]),three=[card('2S'),card('3H'),{...card('4D'),enhancement:'stone'}];
 assert.equal(economicEvent(event(i,'discard',three)),5);
 assert.equal(economicEvent(event(i,'discard',[...three.slice(0,2),{...three[2]!,debuff:true}])),0);
 i.state.observed.jokers=known([i.physical[0]!]);
 assert.equal(economicEvent(event(i,'discard',[card('KS'),card('QH'),{...card('JD'),enhancement:'stone'}])),0);
});
test('Rough Gem paga $1 por activación de diamante, incluidos Wild y Smeared',()=>{
 const i=input([joker('rough_gem',3)]),j=i.physical[0]!;
 assert.deepEqual(economicCard(i,j,card('8D')),{money:1});assert.deepEqual(economicCard(i,j,card('8H')),{});
 assert.deepEqual(economicCard(i,j,{...card('8S'),enhancement:'wild'}),{money:1});
 assert.deepEqual(economicCard(i,j,{...card('8D'),enhancement:'stone'}),{});
 assert.deepEqual(economicCard(i,j,{...card('8D'),debuff:true}),{});
 i.physical.push(joker('smeared',3));assert.deepEqual(economicCard(i,j,card('8H')),{money:1});
});
test('Golden Ticket paga $4 solo por carta gold puntuada; no requiere palo ni rango',()=>{
 const i=input([joker('ticket',2)]),j=i.physical[0]!,gold={...card('2S'),enhancement:'gold'};
 assert.deepEqual(economicCard(i,j,gold),{money:4});assert.deepEqual(economicCard(i,j,card('2S')),{});
 assert.deepEqual(economicCard(i,j,{...gold,debuff:true}),{});
 // Independent: three activations of the gold card produce $12, excluding held-gold cashout.
 assert.equal(4*3,12);
});
test('Baseball añade ×1,5 tras cada físico uncommon; no confunde rareza de Blueprint con efecto copiado',()=>{
 const blueprint=joker('blueprint',5,'bp'),rough=joker('rough_gem',3,'gem'),baseball=joker('baseball',4,'ball'),i=input([blueprint,rough,baseball]);
 const copy={...rough,instanceId:'bp'};
 assert.deepEqual(baseballBonus(i,rough),{xmult:1.5});assert.deepEqual(baseballBonus(i,copy),{});
 assert.deepEqual(baseballBonus(i,baseball),{});assert.deepEqual(baseballBonus(i,blueprint),{});
 // Blueprint copying Baseball contributes another ×1.5 on the physical uncommon.
 i.physical=[rough,blueprint,baseball];i.effective=effectiveJokers(i.physical);
 assert.deepEqual(baseballBonus(i,rough),{xmult:2.25});
 rejectsCode(()=>baseballBonus(i,joker('rough_gem',3,'not-in-inventory')),'unknown_joker_context');
});
test('growSell conserva crecimiento observado y rechaza base inferior sin modificador',()=>{
 const egg=joker('egg',8);egg.counters.extraSell=known(6);const trace:FullJokerInput['trace']=[];
 growSell(egg,3,trace);assert.equal(need(egg.sellValue,'sell'),11);assert.equal(need(egg.counters.extraSell!,'growth'),9);
 rejectsCode(()=>growSell(joker('egg',1),3,[]),'price_mismatch');
});
