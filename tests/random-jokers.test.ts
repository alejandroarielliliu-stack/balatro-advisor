import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {standardDeck} from '../src/catalog/initial.js';
import {RANDOM_JOKERS} from '../src/catalog/random-jokers.js';
import type {Card} from '../src/catalog/initial.js';
import type {GameState,JokerInstance} from '../src/state/model.js';
import {need} from '../src/rules/core.js';
import {booleanChance,effectKey,probabilityMultiplier} from '../src/rules/effect-choices.js';
import type {EffectChoice,FullEventInput,FullJokerInput} from '../src/rules/full-joker-contract.js';
import {randomBefore,randomCard,randomEvent,randomHeld,randomMain} from '../src/rules/random-jokers.js';
import {known} from './helpers.js';

const state=():GameState=>JSON.parse(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8')) as GameState;
const joker=(id:string,instanceId=id):JokerInstance=>({instanceId,catalogId:id,edition:known('base'),stickers:known([]),sellValue:known(2),counters:{}});
const card=(id:string):Card=>{const c=standardDeck().find(c=>c.instanceId===id);assert.ok(c);return c;};
function input(ids:string[],choices:EffectChoice[]=[]):FullJokerInput {
 const s=state(),js=ids.map((id,index)=>joker(id,id+'-'+index));s.observed.jokers=known(js);
 return {state:s,physical:js,effective:js,played:[card('8H')],scoring:[card('8H')],held:[],hand:'high_card',discardsRemaining:3,choices,trace:[],use:()=>{}};
}
function choice(key:string,value:boolean|number,kind:'boolean'|'integer'='boolean'):EffectChoice {
 return {key,kind,value,knowledge:'hypothetical',basis:'Rama de prueba fija; no es una tirada observada.'};
}
function rejectsCode(body:()=>unknown,expected:string):void {
 assert.throws(body,(e:unknown)=>e instanceof Error&&'detail' in e&&typeof e.detail==='object'&&e.detail!==null&&'code' in e.detail&&e.detail.code===expected);
}
test('CAT04: nueve metadatos coinciden con precios y compatibilidad inspeccionados',()=>{
 assert.equal(Object.keys(RANDOM_JOKERS).length,9);
 assert.equal(RANDOM_JOKERS.bloodstone.price,7);assert.equal(RANDOM_JOKERS.reserved_parking.sell,3);
 assert.equal(RANDOM_JOKERS.oops.blueprint,false);assert.equal(RANDOM_JOKERS.space.blueprint,true);
});
test('Misprint requiere un entero concreto 0–23; Oops no cambia su distribución de enteros',()=>{
 const i=input(['misprint','oops']),j=i.physical[0]!,key=effectKey('main','misprint',j.instanceId);
 rejectsCode(()=>randomMain(i,j),'needs_outcome');
 for(const value of [0,7,23]){i.choices=[choice(key,value,'integer')];assert.deepEqual(randomMain(i,j),{mult:value});}
 for(const value of [-1,24,2.5]){i.choices=[choice(key,value,'integer')];rejectsCode(()=>randomMain(i,j),'invalid_outcome');}
 i.choices=[choice(key,true)];rejectsCode(()=>randomMain(i,j),'invalid_outcome');
 assert.equal(probabilityMultiplier(i.state),2);
});
test('Gros Michel +15 y Cavendish ×3 son efectos principales sin azar durante puntuación',()=>{
 const i=input(['gros_michel','cavendish']);assert.deepEqual(randomMain(i,i.physical[0]!),{mult:15});assert.deepEqual(randomMain(i,i.physical[1]!),{xmult:3});
 // Independent example: high card 8 has (5+8) chips, 1 base Mult; Gros then Cavendish => 13×(1+15)×3=624.
 assert.equal((5+8)*(1+15)*3,624);
 assert.deepEqual(randomCard(i,i.physical[0]!,card('8H'),1),{});
});
test('Bloodstone ramas explícitas y activaciones independientes; Oops convierte 1/2 en certeza',()=>{
 const i=input(['bloodstone']),j=i.physical[0]!,c=card('8H'),key=effectKey('card',j.catalogId,j.instanceId,c.instanceId,1);
 assert.deepEqual(randomCard(i,j,card('8S'),1),{});
 rejectsCode(()=>randomCard(i,j,c,1),'needs_outcome');
 i.choices=[choice(key,false)];assert.deepEqual(randomCard(i,j,c,1),{});
 i.choices=[choice(key,true)];assert.deepEqual(randomCard(i,j,c,1),{xmult:1.5});
 rejectsCode(()=>randomCard(i,j,c,2),'needs_outcome');
 i.state.observed.jokers=known([...i.physical,joker('oops')]);i.choices=[];
 assert.deepEqual(randomCard(i,j,c,2),{xmult:1.5});
 i.choices=[choice(key,false)];rejectsCode(()=>randomCard(i,j,c,1),'contradictory_outcome');
 // Independent rule oracle: two successful Hearts multiply current Mult by 1.5×1.5 = 2.25.
 assert.equal(1.5*1.5,2.25);
});
test('Smeared y cartas wild activan Bloodstone; Stone no adquiere palo',()=>{
 const i=input(['bloodstone','smeared','oops']),j=i.physical[0]!;
 assert.deepEqual(randomCard(i,j,card('8D'),1),{xmult:1.5});
 assert.deepEqual(randomCard(i,j,{...card('8S'),enhancement:'wild'},1),{xmult:1.5});
 assert.deepEqual(randomCard(i,j,{...card('8H'),enhancement:'stone'},1),{});
});
test('Business paga $2 por figura puntuada; Reserved Parking $1 por figura retenida, con Pareidolia y Oops',()=>{
 const i=input(['business','reserved_parking','oops']),business=i.physical[0]!,parking=i.physical[1]!;
 assert.deepEqual(randomCard(i,business,card('KS'),1),{money:2});
 assert.deepEqual(randomHeld(i,parking,card('QS'),1),{money:1});
 assert.deepEqual(randomCard(i,parking,card('QS'),1),{});assert.deepEqual(randomHeld(i,business,card('KS'),1),{});
 assert.deepEqual(randomCard(i,business,card('8H'),1),{});assert.deepEqual(randomHeld(i,parking,card('8H'),1),{});
 i.physical.push(joker('pareidolia'));
 assert.deepEqual(randomCard(i,business,card('8H'),1),{money:2});assert.deepEqual(randomHeld(i,parking,card('8H'),1),{money:1});
});
test('Business y Parking sin Oops no asumen pagos; un fracaso explícito produce cero',()=>{
 const i=input(['business','reserved_parking']),b=i.physical[0]!,p=i.physical[1]!,c=card('KS');
 rejectsCode(()=>randomCard(i,b,c,1),'needs_outcome');rejectsCode(()=>randomHeld(i,p,c,1),'needs_outcome');
 i.choices=[choice(effectKey('card',b.catalogId,b.instanceId,c.instanceId),false),choice(effectKey('held',p.catalogId,p.instanceId,c.instanceId),false)];
 assert.deepEqual(randomCard(i,b,c,1),{});assert.deepEqual(randomHeld(i,p,c,1),{});
});
test('Space sube la categoría antes del cálculo: Pair nivel 1 (10,2) pasa a nivel 2 (25,3)',()=>{
 const i=input(['space']),j=i.physical[0]!,key=effectKey('before',j.catalogId,j.instanceId);i.hand='pair';
 rejectsCode(()=>randomBefore(i),'needs_outcome');
 i.choices=[choice(key,false)];randomBefore(i);assert.deepEqual(need(i.state.observed.handBases,'bases'),{preset:'all-standard-level1'});
 const original=structuredClone(i.state);i.state=structuredClone(original);i.choices=[choice(key,true)];randomBefore(i);
 const bases=need(i.state.observed.handBases,'bases');assert.ok('values' in bases);assert.deepEqual(need(bases.values.pair,'pair'),{level:2,chips:25,mult:3});
 assert.deepEqual(need(original.observed.handBases,'bases'),{preset:'all-standard-level1'});
 // Literal expected scoring after upgrade: two 8s => (25+8+8)×3 = 123; before (10+8+8)×2 = 52.
 assert.equal((25+8+8)*3,123);assert.equal((10+8+8)*2,52);
});
test('Space con dos Oops resulta seguro y copia separada puede subir un segundo nivel',()=>{
 const i=input(['space','oops','oops']);i.hand='pair';randomBefore(i);
 i.effective=[{...i.physical[0]!,instanceId:'blueprint-copy'}];randomBefore(i);
 const bases=need(i.state.observed.handBases,'bases');assert.ok('values' in bases);assert.deepEqual(need(bases.values.pair,'pair'),{level:3,chips:40,mult:4});
});
test('8 Ball comprueba rango y capacidad antes de exigir resultados',()=>{
 const i=input(['8_ball']),j=i.physical[0]!;
 assert.deepEqual(randomCard(i,j,card('7H'),1),{});
 rejectsCode(()=>randomCard(i,j,card('8H'),1),'unknown_data');
 i.state.observed.jokerContext=known({consumables:known([]),consumableSlots:known(0)});
 assert.deepEqual(randomCard(i,j,card('8H'),1),{});
 i.state.observed.jokerContext=known({consumables:known([]),consumableSlots:known(2)});
 rejectsCode(()=>randomCard(i,j,card('8H'),1),'needs_outcome');
 const key=effectKey('card',j.catalogId,j.instanceId,'8H');i.choices=[choice(key,false)];assert.deepEqual(randomCard(i,j,card('8H'),1),{});
});
test('8 Ball conserva el Tarot concreto y exige su identidad solo después de éxito',()=>{
 const i=input(['8_ball','oops','oops']),j=i.physical[0]!,key=effectKey('card',j.catalogId,j.instanceId,'8H');
 i.state.observed.jokerContext=known({consumables:known([]),consumableSlots:known(1)});
 rejectsCode(()=>randomCard(i,j,card('8H'),1),'needs_outcome');
 const tarot={instanceId:'tarot-fool-1',catalogId:'c_fool',kind:'tarot' as const,edition:'base' as const,sellValue:1};
 i.choices=[{key:key+':created',kind:'consumable',value:tarot,knowledge:'hypothetical',basis:'Tarot concreto declarado en este escenario.'}];
 randomCard(i,j,card('8H'),1);
 const ctx=need(i.state.observed.jokerContext,'context');assert.deepEqual(need(ctx.consumables!,'consumables'),[tarot]);
 // Buffer/capacity prevents a second Tarot even with a guaranteed success.
 assert.deepEqual(randomCard(i,j,card('8H'),2),{});
 assert.equal(need(ctx.consumables!,'consumables').length,1);
});
test('Destrucción Gros/Cavendish solo en end-round, sin afectar a copias físicas Blueprint',()=>{
 const i=input(['gros_michel','cavendish','blueprint']),g=i.physical[0]!,c=i.physical[1]!;
 const event:FullEventInput={state:i.state,stage:'after_hand',cards:[],choices:[],trace:[],use:()=>{}};
 randomEvent(event);assert.equal(need(i.state.observed.jokers,'jokers').length,3);
 event.stage='end_round';rejectsCode(()=>randomEvent(event),'needs_outcome');
 event.choices=[choice(effectKey('end_round',g.catalogId,g.instanceId),true),choice(effectKey('end_round',c.catalogId,c.instanceId),false)];
 randomEvent(event);assert.deepEqual(need(i.state.observed.jokers,'jokers').map(j=>j.catalogId),['cavendish','blueprint']);
 assert.equal(need(need(i.state.observed.jokerContext!,'context').grosMichelExtinct!,'extinct'),true);
});
test('Resultados duplicados o sin procedencia son errores; no hay fallback aleatorio',()=>{
 const i=input(['bloodstone']),key='arbitrary';
 i.choices=[choice(key,true),choice(key,false)];rejectsCode(()=>booleanChance(i,key,2),'duplicate_outcome');
 i.choices=[{...choice(key,true),basis:''}];rejectsCode(()=>booleanChance(i,key,2),'invalid_outcome');
 i.choices=[];rejectsCode(()=>booleanChance(i,key,2),'needs_outcome');
 assert.equal(effectKey('card','bloodstone','one','8H',2),'card:bloodstone:one:8H:2');
});
