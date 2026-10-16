import assert from 'node:assert/strict';
import test from 'node:test';
import {createNewRun} from '../src/run/start.js';
import {success} from './helpers.js';

const input={runId:'synthetic-new-run',updatedAt:'2026-10-16T12:00:00Z',deckId:'blue',profileConfirmed:true};
const known=<T>(value:T)=>({status:'known',source:'confirmedPreset',value});
// Initial-condition oracles are literal values documented in L03 and ciclo-partida-1.0.1o.
test('RUN01b nueva Azul: selección, $4, 5/3/8/5, 52 cartas y ciega300; no inventa jefe, tag ni tienda',()=>{
  const state=success(createNewRun(input));
  assert.equal(state.schemaVersion,'0.2');assert.equal(state.phase,'blind_select');assert.equal(state.revision,0);
  assert.deepEqual(state.observed.money,known(4));assert.deepEqual(state.observed.resources,{
    handsPerRound:known(5),discardsPerRound:known(3),handSize:known(8),jokerSlots:known(5)});
  assert.deepEqual(state.observed.nextBlind,known({ante:1,kind:'small',bossId:known('none'),target:known(300),reward:known(3)}));
  const deck=state.observed.deck;assert.equal(deck.status,'known');if(deck.status==='known'&&'cards'in deck.value)assert.equal(deck.value.cards.length,52);else assert.fail('Mazo explícito requerido.');
  assert.equal(state.observed.visibleBoss.status,'unknown');assert.equal(state.observed.shop.status,'unknown');
  assert.deepEqual(state.observed.jokers,known([]));assert.equal(state.assumptions.probes.length,0);
});
test('RUN01b plantillas Amarilla/Negra/Abandonada/Plasma y Errática mantienen sus condiciones',()=>{
  const make=(deckId:string)=>success(createNewRun({...input,deckId}));
  assert.deepEqual(make('yellow').observed.money,known(14));
  assert.deepEqual(make('black').observed.resources.handsPerRound,known(3));assert.deepEqual(make('black').observed.resources.jokerSlots,known(6));
  const abandoned=make('abandoned').observed.deck;assert.equal(abandoned.status,'known');if(abandoned.status==='known'&&'cards'in abandoned.value){assert.equal(abandoned.value.cards.length,40);assert.ok(abandoned.value.cards.every(c=>!['J','Q','K'].includes(c.rank)));}
  const plasma=make('plasma').observed.nextBlind;assert.equal(plasma.status,'known');if(plasma.status==='known')assert.deepEqual(plasma.value.target,known(600));
  assert.equal(make('erratic').observed.deck.status,'unknown');
});
test('RUN01b iniciar exige perfil y plantilla compatibles; no admite estado existente, hipótesis ni fecha inválida',()=>{
  for(const extra of [{profileConfirmed:false},{deckId:'magic'},{deckId:'inventada'},{updatedAt:'ayer'},{runId:''},{projection:{money:100}}])assert.equal(createNewRun({...input,...extra}).ok,false);
  const snapshot=structuredClone(input);assert.deepEqual(success(createNewRun(input)),success(createNewRun(input)));assert.deepEqual(input,snapshot);
});
