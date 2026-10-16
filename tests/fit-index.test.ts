import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateJokerFit} from '../src/advisor/quick-fit.js';
import {standardDeck} from '../src/catalog/initial.js';
import type {GameState,JokerInstance} from '../src/state/model.js';
import {known} from './helpers.js';

/** Independent policy oracles for quick-fit-2, not observations in Balatro.
 * The literal expectations below are worked from the declared editorial rules:
 * index = 10 × (stage + preparation + integration) + development bonus.
 * Stage anchors: ante 1 / 4 / 8. Material: 1 + 2 × eligible / deck size.
 * The bonus's exact examples use log2(2)=1, log2(4)=2 and log2(64)=6;
 * this test does not import the implementation's policy helpers or constants.
 * Neither these numbers nor their ordering establish hand points or win rates. */
function fixture():GameState {
 const state=JSON.parse(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8')) as GameState;
 state.assumptions.probes=[];state.assumptions.roundPlans=[];
 state.observed.money=known(30);state.observed.jokers=known([]);
 state.observed.deck=known({cards:standardDeck()});
 return state;
}
function joker(catalogId:string,counters:JokerInstance['counters']={},instanceId='owned:'+catalogId):JokerInstance {
 return {instanceId,catalogId,counters,edition:known('base'),stickers:known([]),sellValue:known(1)};
}
function own(state:GameState,...instances:JokerInstance[]) {state.observed.jokers=known(instances);}
function score(fit:ReturnType<typeof evaluateJokerFit>):number {
 assert.notEqual(fit.score,null,'El escenario declara todos los datos que necesita esta valoración');
 return fit.score!;
}
function axis(fit:ReturnType<typeof evaluateJokerFit>,key:'stage'|'readiness'|'integration'):number {
 const value=fit.axes.find(a=>a.key===key)?.value;
 assert.equal(typeof value,'number');return value!;
}
function close(actual:number,expected:number) {assert.ok(Math.abs(actual-expected)<1e-12,`${actual} ≠ ${expected}`);}

test('Índice I01: política explícita y transición gradual entre antes, sin cambiar fichas o dinero',()=>{
 const state=fixture(),before=structuredClone(state);
 // Joker: stage anchors 3 / 2 / 1, preparation 3, new role integration 2.
 // At ante 2, 3-(1/3)=8/3; at ante 3, 3-(2/3)=7/3.
 for(const [ante,expected] of [[1,80],[2,76.7],[3,73.3],[4,70],[8,60]] as const){
  const fit=evaluateJokerFit(state,'joker',{ante});
  assert.equal(fit.policy,'quick-fit-2');assert.equal(score(fit),expected);
  assert.equal(fit.purchase.status,'not-requested');
 }
 assert.deepEqual(state,before);
});

test('Índice I02: una carta adicional diferencia 13/52 de 14/52 dentro de la antigua banda',()=>{
 const scores=[];
 for(const [hearts,expectedPrep,expectedIndex] of [[13,1.5,55],[14,20/13,55.4]] as const){
  const state=fixture(),cards=standardDeck();cards.forEach((c,i)=>c.suit=i<hearts?'H':'S');
  state.observed.deck=known({cards});const before=structuredClone(state);
  const fit=evaluateJokerFit(state,'lusty_joker',{ante:4});
  close(axis(fit,'readiness'),expectedPrep);
  // Stage 2 + integration 2. 14/52 gives preparation 20/13,
  // hence 10 × (4 + 20/13) = 55.384615..., displayed as 55.4.
  assert.equal(score(fit),expectedIndex);assert.equal(fit.readiness,'potential');
  assert.deepEqual(state,before);scores.push(score(fit));
 }
 assert.ok(scores[1]!>scores[0]!);
});

test('Índice I03: la densidad tiene el mismo valor en 13/52 y 26/104, sin fingir un robo probable',()=>{
 const small=fixture(),large=fixture(),cards=standardDeck();
 cards.forEach((c,i)=>c.suit=i<13?'H':'S');small.observed.deck=known({cards});
 const duplicated=[...cards,...cards.map(c=>({...c,instanceId:'copy:'+c.instanceId}))];
 large.observed.deck=known({cards:duplicated});
 const a=evaluateJokerFit(small,'lusty_joker',{ante:4}),b=evaluateJokerFit(large,'lusty_joker',{ante:4});
 assert.equal(score(a),55);assert.equal(score(b),55);
 assert.equal(a.readiness,'potential');assert.equal(b.readiness,'potential');
 assert.ok(a.signals.some(s=>s.kind==='potential'));
});

test('Índice I04: el límite por material escaso también cambia gradualmente',()=>{
 const state=fixture(),cards=standardDeck().filter(c=>!['J','Q','K'].includes(c.rank));
 cards[0]!.rank='Q';state.observed.deck=known({cards});own(state,joker('hanging_chad'));
 const fit=evaluateJokerFit(state,'photograph',{ante:8});
 // One figure in 40: cap stage 2+2×(1/40)/(1/4)=2.2;
 // preparation 1+2/40=1.05; supported Photo+Chad integration 3.
 close(axis(fit,'stage'),2.2);close(axis(fit,'readiness'),1.05);
 assert.equal(score(fit),62.5);assert.equal(fit.readiness,'potential');
 assert.ok(fit.signals.some(s=>s.id==='scarce-material'));
});

test('Índice I05: Green 12 y 13 conservan su Mult y producen una diferencia pequeña real',()=>{
 const scores=[];
 for(const mult of [12,13]){
  const state=fixture(),instance=joker('green_joker',{greenMult:known(mult)});own(state,instance);
  const before=structuredClone(state),fit=evaluateJokerFit(state,'green_joker',{ante:8,instanceId:instance.instanceId});
  assert.equal(fit.readiness,'ready');assert.ok(axis(fit,'stage')>=2);
  assert.ok(fit.signals.some(s=>s.id==='growth-horizon'));
  assert.ok(fit.signals.some(s=>s.kind==='fact'&&s.text.includes(String(mult))));
  assert.deepEqual(state,before);scores.push(score(fit));
 }
 // Hand-worked decimals: 70+10×log2(1+12/20)≈76.7807;
 // 70+10×log2(1+13/20)≈77.2247. These are policy units, not Mult.
 assert.deepEqual(scores,[76.8,77.2]);
});

test('Índice I06: referencia de desarrollo explícita, rendimientos decrecientes y sin techo 100',()=>{
 for(const [mult,expected] of [[20,80],[60,90],[1260,130]] as const){
  const state=fixture(),instance=joker('green_joker',{greenMult:known(mult)});own(state,instance);
  const fit=evaluateJokerFit(state,'green_joker',{ante:8,instanceId:instance.instanceId});
  // Late developed Green base = (2+3+2)×10 =70.
  // Mult20/ref20 -> log2(2)=1, 60/ref20 -> log2(4)=2,
  // 1260/ref20 -> log2(64)=6. No implementation output is an oracle.
  assert.equal(score(fit),expected);
 }
});

test('Índice I07: chips y XMult normalizan sus unidades antes del bono editorial',()=>{
 for(const [id,key,value,expected] of [
  ['runner','chips',100,80],['runner','chips',300,90],
  ['constellation','x100',200,80],['constellation','x100',400,90]
 ] as const){
  const state=fixture(),instance=joker(id,{[key]:known(value)});own(state,instance);
  const fit=evaluateJokerFit(state,id,{ante:8,instanceId:instance.instanceId});
  // Both bases are70. chips100 / reference100 =1. XMult200 means×2,
  // so only its excess over×1 is used: (200-100)/100 =1.
  assert.equal(score(fit),expected);
 }
});

test('Índice I08: el contador de aporte desconocido no obtiene cero ni un máximo inventado',()=>{
 const state=fixture(),instance=joker('green_joker',{greenMult:{status:'unknown',reason:'Mult sin transcribir'}});
 own(state,instance);const before=structuredClone(state);
 const fit=evaluateJokerFit(state,'green_joker',{ante:8,instanceId:instance.instanceId});
 assert.equal(fit.score,null);assert.ok(fit.range);assert.equal(fit.range[1],null);
 assert.ok(Number.isFinite(fit.range[0]));assert.equal(fit.readiness,'unknown');
 assert.ok(fit.limitations.join(' ').match(/contador|Mult|aporte|desarrollo/i));
 assert.deepEqual(state,before);
});

test('Índice I09: un objetivo desconocido limita la valoración sin volver ilimitado un aporte conocido',()=>{
 const state=fixture(),instance=joker('castle',{chips:known(100),suit:{status:'unknown',reason:'Palo objetivo sin transcribir'}});
 own(state,instance);const fit=evaluateJokerFit(state,'castle',{ante:8,instanceId:instance.instanceId});
 assert.equal(fit.score,null);assert.ok(fit.range);
 assert.equal(typeof fit.range[1],'number','Las fichas100 son conocidas; lo desconocido es el objetivo');
 assert.ok(fit.axes.some(a=>a.value===null));
});

test('Índice I10: progreso, dólares y tamaño de mano no se convierten en fuerza de puntuación',()=>{
 for(const [id,key,low,high] of [
  ['loyalty_card','hands',0,5],['invisible','rounds',0,2],
  ['rocket','dollars',1,64],['turtle_bean','hSize',1,5]
 ] as const){
  const state=fixture(),instance=joker(id,{[key]:known(low)});own(state,instance);
  const a=evaluateJokerFit(state,id,{ante:4,instanceId:instance.instanceId});
  instance.counters[key]=known(high);
  const b=evaluateJokerFit(state,id,{ante:4,instanceId:instance.instanceId});
  assert.equal(score(a),score(b),`${id}: cambiar ${key} no justifica un bono de chips/Mult`);
 }
});

test('Índice I11: claves extra ajenas al comodín no generan un bono',()=>{
 const state=fixture(),instance=joker('joker');own(state,instance);
 const before=evaluateJokerFit(state,'joker',{ante:4,instanceId:instance.instanceId});
 instance.counters.chips=known(6300);instance.counters.mult=known(1260);
 const after=evaluateJokerFit(state,'joker',{ante:4,instanceId:instance.instanceId});
 assert.equal(score(before),score(after));
});

test('Índice I12: material o condición imposible mantienen el límite aunque haya crecimiento registrado',()=>{
 const state=fixture(),greenBus=joker('ride_the_bus',{mult:known(1260)});
 own(state,greenBus,joker('pareidolia'));const before=structuredClone(state);
 const fit=evaluateJokerFit(state,'ride_the_bus',{ante:8,instanceId:greenBus.instanceId});
 assert.equal(fit.readiness,'unavailable');assert.ok(score(fit)<=20);
 assert.deepEqual(state,before);
 const noSteel=evaluateJokerFit(fixture(),'steel_joker',{ante:8});
 assert.equal(noSteel.readiness,'unavailable');assert.ok(score(noSteel)<=20);
});

test('Índice I13: un ante desconocido o fuera del alcance no se interpola como dato conocido',()=>{
 const state=fixture();state.observed.nextBlind={status:'unknown',reason:'Ciega no introducida'};
 for(const ante of [undefined,0,9,2.5]){
  const fit=evaluateJokerFit(state,'joker',ante===undefined?{}:{ante});
  assert.equal(fit.stage,'unknown');assert.equal(fit.score,null);
  assert.equal(fit.axes.find(a=>a.key==='stage')?.value,null);
 }
});

test('Índice I14: el progreso de Yorick no se confunde con XMult ya obtenido',()=>{
 const state=fixture(),instance=joker('yorick',{x100:known(100),remaining:known(23)});own(state,instance);
 const start=evaluateJokerFit(state,'yorick',{ante:4,instanceId:instance.instanceId});
 instance.counters.remaining=known(1);
 const nearCycle=evaluateJokerFit(state,'yorick',{ante:4,instanceId:instance.instanceId});
 assert.equal(score(start),score(nearCycle),'Un descarte pendiente no es un incremento ya adquirido de XMult');
 assert.notEqual(nearCycle.readiness,'ready','×1 no acredita un aporte multiplicativo desarrollado');
 instance.counters.x100=known(200);
 const developed=evaluateJokerFit(state,'yorick',{ante:4,instanceId:instance.instanceId});
 assert.equal(developed.readiness,'ready');assert.ok(score(developed)>score(nearCycle));
});

test('Índice I15: una valoración poseída y una compra son modos incompatibles',()=>{
 const state=fixture(),instance=joker('green_joker',{greenMult:known(20)});own(state,instance);
 const before=structuredClone(state);
 const fit=evaluateJokerFit(state,'green_joker',{ante:8,instanceId:instance.instanceId,purchase:true});
 // Contract oracle: reject ambiguous input before simulating a transaction.
 // A new purchase cannot borrow the existing instance's +20 Mult.
 assert.equal(fit.score,null);assert.equal(fit.range,null);
 assert.equal(fit.purchase.status,'unknown');
 assert.match(fit.limitations.join(' '),/compra|poseíd|instanceId/i);
 assert.deepEqual(state,before);
});

test('Índice I16: la instancia poseída debe corresponder al comodín valorado',()=>{
 const state=fixture(),instance=joker('runner',{chips:known(100)});own(state,instance);
 const before=structuredClone(state);
 const fit=evaluateJokerFit(state,'green_joker',{ante:8,instanceId:instance.instanceId});
 // Identity oracle: Runner's chips never become an owned Green's Mult.
 assert.equal(fit.score,null);assert.equal(fit.range,null);
 assert.equal(fit.purchase.status,'not-requested');
 assert.match(fit.limitations.join(' '),/correspond|coincid|identific|comodín/i);
 assert.deepEqual(state,before);
});

test('Índice I17: vender Green20 y comprar otro Green usa aporte inicial cero',()=>{
 const state=fixture(),instance=joker('green_joker',{greenMult:known(20)});
 instance.sellValue=known(2);own(state,instance);
 const before=structuredClone(state);
 const fit=evaluateJokerFit(state,'green_joker',{ante:8,purchase:true,replacementId:instance.instanceId});
 // Independent oracles: initial Green=0 Mult; late stage2 + future1 +
 // newly absent roles2 gives index50. Catalogue price$4 minus sale$2 costs$2.
 assert.equal(fit.purchase.status,'legal');assert.equal(fit.purchase.netCost,2);
 assert.equal(fit.purchase.moneyAfter,28);assert.equal(fit.magnitude.bonus,0);
 assert.equal(fit.readiness,'potential');assert.equal(score(fit),50);
 assert.ok(fit.signals.some(s=>s.id==='replacement-loss'&&s.text.includes('20')));
 assert.deepEqual(state,before,'Comparar no vende el Green real ni borra su contador');
});

test('Índice I18: un reemplazo sin compra no retira una instancia sin validar H2',()=>{
 const state=fixture(),instance=joker('pareidolia');own(state,instance);
 const before=structuredClone(state);
 const fit=evaluateJokerFit(state,'photograph',{ante:8,replacementId:instance.instanceId});
 assert.equal(fit.score,null);assert.equal(fit.range,null);assert.equal(fit.purchase.status,'unknown');
 assert.match(fit.limitations.join(' '),/reemplazo|venta|compra/i);
 assert.deepEqual(state,before);
});
