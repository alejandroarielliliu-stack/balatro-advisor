import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {HISTORY_COUNTERS,HISTORY_JOKERS} from '../src/catalog/history-jokers.js';
import {HAND_BASES,standardDeck} from '../src/catalog/initial.js';
import {parseState} from '../src/state/validation.js';
import type {GameState,JokerInstance} from '../src/state/model.js';
import type {FullJokerInput,FullEventInput,EffectChoice} from '../src/rules/full-joker-contract.js';
import {historyBefore,historyBeforeJoker,historyMain,historyCard,historyEvent,historyResourceDelta,historyRoundResources,historyBoss,rescueWithBones} from '../src/rules/history-jokers.js';
import {known,success} from './helpers.js';

const fixture=()=>success(parseState(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8')));
function joker(id:keyof typeof HISTORY_JOKERS,values:Record<string,number>={}):JokerInstance{
 return{instanceId:id,catalogId:id,edition:known('base'),stickers:known([]),sellValue:known(HISTORY_JOKERS[id].sell),counters:Object.fromEntries(Object.entries(HISTORY_COUNTERS[id]??{}).map(([key,spec])=>[key,known(values[key]??spec.initial)]))};
}
function scoring(js:JokerInstance[],counts:Record<string,number>={}):FullJokerInput{
 const state=fixture();state.observed.jokers=known(js);state.observed.jokerContext=known({handCounts:Object.fromEntries(Object.keys(HAND_BASES).map(h=>[h,known(counts[h]??0)])),roundHandCounts:Object.fromEntries(Object.keys(HAND_BASES).map(h=>[h,known(0)])),visibleHands:known(Object.keys(HAND_BASES).slice(0,9) as FullJokerInput['hand'][])});
 const played=standardDeck().filter(c=>['AS','AH'].includes(c.instanceId));
 return{state,physical:js,effective:js,played,scoring:played,held:[],hand:'pair',discardsRemaining:3,trace:[],use:()=>{}};
}
function event(state:GameState,stage:FullEventInput['stage'],choices?:EffectChoice[]):FullEventInput{return{state,stage,cards:[],trace:[],use:()=>{},...(choices?{choices}:{})};}
const value=(j:JokerInstance,key:string)=>{const f=j.counters[key]!;assert.equal(f.status,'known');return f.status==='known'?f.value:-1;};
const boss=(state:GameState,id:string,target:number)=>{state.observed.nextBlind=known({ante:1,kind:'boss',bossId:known(id),target:known(target),reward:known(5)});};

test('CAT04 declara exactamente los 18 comodines asignados con precios y compatibilidad del ejecutable',()=>{
 assert.equal(Object.keys(HISTORY_JOKERS).length,18);assert.equal(HISTORY_JOKERS.chicot.price,20);assert.equal(HISTORY_JOKERS.chicot.blueprint,false);assert.equal(HISTORY_JOKERS.mr_bones.blueprint,false);assert.equal(HISTORY_JOKERS.burglar.blueprint,true);assert.equal(HISTORY_JOKERS.luchador.sell,2);
});
test('Loyalty: quinta mano sin ×4; sexta y duodécima con ×4; crecer una sola vez por físico',()=>{
 // card.lua3633–3648: every=5, cycle=6, activation remaining=5; independent literal schedule.
 const j=joker('loyalty_card'),input=scoring([j]);
 for(let hand=1;hand<=12;hand++){
  historyBefore(input);historyBeforeJoker(input,j);
  assert.equal(historyMain(input,j).xmult,[6,12].includes(hand)?4:1);assert.equal(value(j,'hands'),hand);
 }
});
test('Supernova y Card Sharp incluyen la mano actual; primera/segunda pair de ronda dan ×1/×3',()=>{
 // state_events574–575 increment before card.lua3731 and4040. Run pairs already played=7.
 const nova=joker('supernova'),sharp=joker('card_sharp'),input=scoring([nova,sharp],{pair:7});
 historyBefore(input);assert.equal(historyMain(input,nova).mult,8);assert.equal(historyMain(input,sharp).xmult,1);
 historyBefore(input);assert.equal(historyMain(input,nova).mult,9);assert.equal(historyMain(input,sharp).xmult,3);
 delete input.state.observed.jokerContext;assert.throws(()=>historyMain(input,nova),/historial|contexto/);
});
test('Obelisk: empate tras incrementar conserva crecimiento; pasar a más jugada única reinicia',()=>{
 // Source tests another visible hand >= this hand AFTER increment, rather than a pre-play rank.
 const j=joker('obelisk',{x100:200}),input=scoring([j],{pair:4,high_card:5});
 historyBefore(input);historyBeforeJoker(input,j);assert.equal(value(j,'x100'),220);assert.equal(historyMain(input,j).xmult,2.2);
 historyBefore(input);historyBeforeJoker(input,j);assert.equal(value(j,'x100'),100);
});
test('Obelisk no inventa visibilidad ni cuentas ausentes',()=>{
 const j=joker('obelisk'),input=scoring([j]);input.state.observed.jokerContext=known({handCounts:{pair:known(1)},visibleHands:known(['pair','high_card'])});
 assert.throws(()=>historyBeforeJoker(input,j),/high_card/);
});
test('Erosion usa tamaño inicial explícito y Throwback saltos de toda la run',()=>{
 const erosion=joker('erosion'),throwback=joker('throwback'),input=scoring([erosion,throwback]);
 input.state.observed.deck=known({cards:standardDeck().slice(0,35)});input.state.observed.jokerContext=known({startingDeckSize:known(40),blindsSkipped:known(3)});
 assert.equal(historyMain(input,erosion).mult,20);assert.equal(historyMain(input,throwback).xmult,1.75);
 input.state.observed.jokerContext=known({startingDeckSize:known(30),blindsSkipped:known(0)});assert.equal(historyMain(input,erosion).mult,0);assert.equal(historyMain(input,throwback).xmult,1);
 input.state.observed.jokerContext=known({});assert.throws(()=>historyMain(input,erosion),/tamaño inicial/);assert.throws(()=>historyMain(input,throwback),/saltadas/);
});
test('Ancient e Idol aplican ×1,5 y ×2 por activación de carta; palo y rango son condiciones diferentes',()=>{
 const ancient=joker('ancient',{suit:0}),idol=joker('idol',{suit:0,rank:14}),input=scoring([ancient,idol]);
 const as=standardDeck().find(c=>c.instanceId==='AS')!,qs=standardDeck().find(c=>c.instanceId==='QS')!,ah=standardDeck().find(c=>c.instanceId==='AH')!;
 assert.equal(historyCard(input,ancient,as,1).xmult,1.5);assert.equal(historyCard(input,ancient,qs,2).xmult,1.5);
 assert.equal(historyCard(input,idol,as,1).xmult,2);assert.equal(historyCard(input,idol,qs,1).xmult,1);assert.equal(historyCard(input,idol,ah,1).xmult,1);
 as.enhancement='wild';assert.equal(historyCard(input,idol,as,1).xmult,2);as.enhancement='stone';assert.equal(historyCard(input,idol,as,1).xmult,1);
});
test('Castle crece por cada carta descartada del palo y Mail paga $5 por rango',()=>{
 const castle=joker('castle',{chips:9,suit:1}),mail=joker('mail',{rank:14}),input=scoring([castle,mail]);
 const e=event(input.state,'discard');e.cards=standardDeck().filter(c=>['AH','AS','2H'].includes(c.instanceId));
 const r=historyEvent(e);assert.equal(value(castle,'chips'),15);assert.equal(r.money,10);assert.equal(historyMain(input,castle).chips,15);
});
test('Burglar cambia solo los recursos de la ronda; Turtle Bean es capacidad pasiva y decae',()=>{
 const bean=joker('turtle_bean'),burglar=joker('burglar'),input=scoring([bean,burglar]);
 assert.deepEqual(historyResourceDelta([bean,burglar]),{hands:0,discards:0,handSize:5});
 assert.deepEqual(historyRoundResources([burglar],4,3),{hands:7,discards:0});assert.deepEqual(historyRoundResources([burglar,burglar],4,3),{hands:10,discards:0});
 input.state.observed.resources.handSize=known(13);const e=event(input.state,'end_round');e.won=true;historyEvent(e);assert.equal(value(bean,'hSize'),4);assert.deepEqual(input.state.observed.resources.handSize,known(12));
 bean.counters.hSize=known(1);input.state.observed.resources.handSize=known(9);historyEvent(e);assert.equal(input.state.observed.jokers.status==='known'&&input.state.observed.jokers.value.includes(bean),false);assert.deepEqual(input.state.observed.resources.handSize,known(8));
});
test('Madness crece incluso solo; jefe no crece; destrucción con varias opciones requiere rama',()=>{
 const mad=joker('madness'),input=scoring([mad]);historyEvent(event(input.state,'select_blind'));assert.equal(value(mad,'x100'),150);
 const castle=joker('castle'),mail=joker('mail');input.state.observed.jokers=known([mad,castle,mail]);
 assert.throws(()=>historyEvent(event(input.state,'select_blind')),/rama explícita/);assert.equal(value(mad,'x100'),150);
 const c:EffectChoice={key:'madness:destroy',kind:'joker',value:'castle',knowledge:'hypothetical',basis:'Escenario explícito: se destruye Castle.'};
 historyEvent(event(input.state,'select_blind',[c]));assert.equal(value(mad,'x100'),200);assert.deepEqual(input.state.observed.jokers.status==='known'?input.state.observed.jokers.value.map(j=>j.catalogId):[],['madness','mail']);
 boss(input.state,'the_wall',1200);historyEvent(event(input.state,'select_blind'));assert.equal(value(mad,'x100'),200);
});
test('Rocket crece antes del cobro de jefe y su ingreso no se suma al saldo que genera interés',()=>{
 const rocket=joker('rocket'),input=scoring([rocket]);const before=structuredClone(input.state.observed.money);
 const e=event(input.state,'end_round');e.won=true;assert.equal(historyEvent(e).cashoutBonus,1);
 boss(input.state,'the_wall',1200);assert.equal(historyEvent(e).cashoutBonus,3);assert.equal(value(rocket,'dollars'),3);assert.deepEqual(input.state.observed.money,before);
});
test('Chicot desactiva Wall/Violet/Water, modifica objetivo efectivo sin sobrescribir observación',()=>{
 const chico=joker('chicot'),input=scoring([chico]);boss(input.state,'the_wall',1200);
 assert.deepEqual(historyBoss(input.state),{disabled:true,target:600,restoreDiscards:false});
 boss(input.state,'violet_vessel',1800);assert.equal(historyBoss(input.state).target,600);
 boss(input.state,'the_water',600);assert.equal(historyBoss(input.state).restoreDiscards,true);assert.equal(historyEvent(event(input.state,'select_blind')).bossDisabled,true);
 assert.equal(input.state.observed.nextBlind.status==='known'&&input.state.observed.nextBlind.value.target.status==='known'?input.state.observed.nextBlind.value.target.value:0,600);
});
test('Luchador vendido en tienda no desactiva el siguiente jefe; solo un jefe activo',()=>{
 const luchador=joker('luchador'),input=scoring([]);boss(input.state,'the_wall',1200);
 const e=event(input.state,'sell');e.soldJoker=luchador;e.activeBlind=false;historyEvent(e);assert.equal(historyBoss(input.state).disabled,false);
 e.activeBlind=true;historyEvent(e);assert.equal(historyBoss(input.state).disabled,true);assert.equal(historyBoss(input.state).target,600);
});
test('MrBones salva al alcanzar 25%, se consume, sin cambiar chips ni conceder premio de ciega',()=>{
 const bones=joker('mr_bones'),input=scoring([bones]);
 assert.equal(rescueWithBones(input.state,149,600,input.trace),false);assert.equal(rescueWithBones(input.state,150,600,input.trace),true);
 assert.equal(input.state.observed.jokers.status==='known'?input.state.observed.jokers.value.length:-1,0);assert.equal(input.trace.at(-1)!.values.blindReward,0);assert.equal(rescueWithBones(input.state,400,600,input.trace),false);
});
test('Matador paga solo con triggered explícito; jefe grande o cero descartes no basta',()=>{
 const matador=joker('matador'),input=scoring([matador]);assert.equal(historyMain(input,matador).money,0);
 boss(input.state,'the_wall',1200);assert.equal(historyMain(input,matador).money,0);
 boss(input.state,'the_flint',600);assert.throws(()=>historyMain(input,matador),/rama explícita/);
 input.choices=[{key:'matador:boss_triggered',kind:'boolean',value:true,knowledge:'hypothetical',basis:'Rama del escenario: The Flint ha activado modify_hand.'}];assert.equal(historyMain(input,matador).money,8);
});
test('El próximo objetivo desconocido se registra como desconocido; Ancient excluye palo anterior',()=>{
 const mail=joker('mail'),ancient=joker('ancient',{suit:0}),input=scoring([mail,ancient]);
 const e=event(input.state,'end_round');e.won=true;historyEvent(e);assert.equal(mail.counters.rank!.status,'unknown');assert.equal(ancient.counters.suit!.status,'unknown');
 ancient.counters.suit=known(0);e.choices=[{key:'ancient:target',kind:'target',value:'S',knowledge:'hypothetical',basis:'Rama inválida: repite palo.'}];assert.throws(()=>historyEvent(e),/otros tres palos/);
 e.choices=[{key:'ancient:target',kind:'target',value:'C',knowledge:'hypothetical',basis:'Rama válida: tréboles.'}];historyEvent(e);assert.equal(value(ancient,'suit'),3);
});
test('Plan de análisis mantiene el estado observado original mediante copia independiente',()=>{
 const observed=fixture();observed.observed.jokers=known([joker('madness')]);const before=structuredClone(observed);
 const projected=structuredClone(observed);historyEvent(event(projected,'select_blind'));
 assert.deepEqual(observed,before);assert.notDeepEqual(projected,observed);
});
