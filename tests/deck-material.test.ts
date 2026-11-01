import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import type {Card} from '../src/catalog/initial.js';
import {standardDeck} from '../src/catalog/initial.js';
import type {GameState,JokerInstance} from '../src/state/model.js';
import {createNewRun} from '../src/run/start.js';
import {currentDeckCards,inspectDeckMaterial,summarizeDeckCards} from '../src/state/deck-material.js';
import {evaluateJokerFit} from '../src/advisor/quick-fit.js';
import {evaluateComposition} from '../src/advisor/composition.js';
import {inspectCompositions} from '../src/advisor/composition-signals.js';
import {known,success} from './helpers.js';

// Literal structural counts and documented effect distinctions, not engine
// outputs reused as expected values or new observations of Balatro gameplay.
const card=(instanceId:string,rank:Card['rank'],suit:Card['suit'],extra:Partial<Card>={}):Card=>({instanceId,rank,suit,edition:'base',enhancement:'none',seal:'none',extraChips:0,...extra});
function fixture():GameState {
 const state=JSON.parse(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8')) as GameState;
 state.assumptions.probes=[];state.assumptions.roundPlans=[];state.observed.jokers=known([]);
 state.observed.money=known(30);state.observed.deckId=known('blue');state.observed.deck=known({cards:standardDeck()});return state;
}
const joker=(catalogId:string):JokerInstance=>({instanceId:catalogId,catalogId,counters:{},edition:known('base'),stickers:known([]),sellValue:known(1)});

test('Material derivado: cada inicio integrado conserva su plantilla; Errática no fabrica52 cartas',()=>{
 for(const id of ['blue','red','yellow','green','black','painted','plasma','abandoned','checkered','erratic']){
  const state=success(createNewRun({runId:'literal-initial-'+id,updatedAt:'2026-11-01T12:00:00Z',deckId:id,profileConfirmed:true}));
  const before=structuredClone(state),material=inspectDeckMaterial(state);
  if(id==='erratic'){assert.equal(material,undefined);assert.equal(currentDeckCards(state),undefined);}
  else {
   assert.equal(material!.full.total,id==='abandoned'?40:52);
   assert.equal(material!.full.ranks.K,id==='abandoned'?0:4);
   assert.equal(material!.full.enhancements.steel??0,0);
   assert.equal(material!.full.suits.S,id==='checkered'?26:id==='abandoned'?10:13);
   assert.equal(material!.full.suits.H,id==='checkered'?26:id==='abandoned'?10:13);
   assert.equal(material!.full.suits.C,id==='checkered'?0:id==='abandoned'?10:13);
  }
  assert.deepEqual(state,before);
 }
});

test('Material derivado: cero conocido es distinto de desconocido y no se repone el mazo inicial',()=>{
 const state=fixture();state.observed.deck=known({cards:[card('only-two','2','S')]});
 assert.equal(inspectDeckMaterial(state)!.full.ranks.K,0);
 assert.equal(inspectDeckMaterial(state)!.full.total,1);
 assert.equal(evaluateJokerFit(state,'baron',{ante:4}).readiness,'unavailable');
 state.observed.deck={status:'unknown',reason:'Cambios sin registrar'};
 assert.equal(inspectDeckMaterial(state),undefined);
 assert.equal(evaluateJokerFit(state,'baron',{ante:4}).readiness,'unknown');
 assert.equal(evaluateComposition(state,{ante:4}).material.kings,null);
});

test('Material derivado: preset estándar exige perfil conocido compatible en todos los inspectores',()=>{
 const state=fixture();state.observed.deck=known({preset:'standard52-unmodified'});state.observed.jokers=known([joker('baron')]);
 assert.equal(inspectDeckMaterial(state)!.full.ranks.K,4);
 const ids=[known('abandoned'),known('checkered'),known('erratic'),known('unrecognized'),{status:'unknown' as const,reason:'Sin perfil'}];
 for(const id of ids){
  state.observed.deckId=id;
  assert.equal(currentDeckCards(state),undefined);
  assert.equal(evaluateJokerFit(state,'baron',{ante:4}).readiness,'unknown');
  assert.equal(evaluateComposition(state,{ante:4}).material.kings,null);
  assert.equal(inspectCompositions(state,'j_mime').find(signal=>signal.id==='composition-mime-steel-baron')?.kind,'heuristic');
 }
});

test('Material derivado: las cartas actuales explícitas prevalecen sobre el nombre de baraja y se devuelven copias',()=>{
 const state=fixture();state.observed.deckId=known('abandoned');
 state.observed.deck=known({cards:[card('added-king','K','H',{enhancement:'steel'})]});
 const before=structuredClone(state),cards=currentDeckCards(state)!;
 assert.equal(cards.length,1);assert.equal(inspectDeckMaterial(state)!.full.ranks.K,1);
 cards[0]!.rank='2';cards.push(card('another','3','S'));
 const summary=inspectDeckMaterial(state)!;summary.full.ranks.K=99;
 assert.deepEqual(state,before);assert.equal(inspectDeckMaterial(state)!.full.ranks.K,1);
});

test('Material derivado: reyes de Acero, Piedra y debuff usan conjuntos explícitos sin doble contar',()=>{
 const cards=[card('steel-king','K','S',{enhancement:'steel'}),card('debuff-king','K','H',{enhancement:'steel',debuff:true}),
  card('stone-king','K','C',{enhancement:'stone'}),card('gold-queen','Q','D',{enhancement:'gold',seal:'blue'}),card('two','2','H',{seal:'blue'})];
 const before=structuredClone(cards),material=summarizeDeckCards(cards);
 assert.equal(material.full.total,5);assert.equal(material.usable.total,4);
 assert.equal(material.full.ranks.K,2);assert.equal(material.usable.ranks.K,1);
 assert.equal(material.full.faces,3);assert.equal(material.usable.faces,2);
 assert.equal(material.full.enhancements.steel,2);assert.equal(material.usable.enhancements.steel,1);
 assert.equal(material.full.steelKings,2);assert.equal(material.usable.steelKings,1);
 assert.deepEqual(material.full.suits,{S:1,H:2,D:1,C:0});assert.equal(material.full.seals.blue,2);
 assert.deepEqual(cards,before);
});

test('Material derivado: Steel Joker cuenta Acero del mazo completo; Mimo exige soporte no debilitado',()=>{
 const state=fixture();state.observed.deck=known({cards:[card('steel-disabled','2','H',{enhancement:'steel',debuff:true})]});
 const before=structuredClone(state),steel=evaluateJokerFit(state,'steel_joker',{ante:4}),mime=evaluateJokerFit(state,'mime',{ante:4});
 assert.equal(steel.readiness,'ready');assert.match(steel.axes.find(axis=>axis.key==='readiness')!.reason,/1 cartas de Acero en el mazo completo/);
 assert.equal(mime.readiness,'unavailable');assert.notEqual(mime.axes.find(axis=>axis.key==='integration')!.value,3);
 assert.equal(evaluateComposition(state,{ante:4}).material.steel,1);
 assert.deepEqual(state,before);
});

test('Material derivado: Pareidolia y un rey de Piedra no fabrican soporte de Barón/Mimo',()=>{
 const state=fixture();state.observed.deck=known({cards:[card('stone','K','S',{enhancement:'stone'})]});
 state.observed.jokers=known([joker('mime'),joker('pareidolia')]);
 const baron=evaluateJokerFit(state,'baron',{ante:4});
 assert.equal(baron.readiness,'unavailable');assert.notEqual(baron.axes.find(axis=>axis.key==='integration')!.value,3);
 assert.equal(evaluateComposition(state,{ante:4}).material.kings,0);
 assert.equal(inspectCompositions(state,'j_baron').find(signal=>signal.id==='composition-mime-steel-baron')?.kind,'conflict');
});

test('Material derivado: editar Acero cambia solo el soporte pertinente y conserva los valores reales',()=>{
 const state=fixture(),before=structuredClone(state);
 const originalMime=evaluateJokerFit(state,'mime',{ante:4}),originalSteel=evaluateJokerFit(state,'steel_joker',{ante:4});
 const originalBaron=evaluateJokerFit(state,'baron',{ante:4}),originalJoker=evaluateJokerFit(state,'joker',{ante:4});
 const cards=currentDeckCards(state)!;cards.slice(0,4).forEach(c=>c.enhancement='steel');
 const alternative=structuredClone(state);alternative.observed.deck=known({cards});
 const changedMime=evaluateJokerFit(alternative,'mime',{ante:4}),changedSteel=evaluateJokerFit(alternative,'steel_joker',{ante:4});
 assert.equal(originalMime.readiness,'unavailable');assert.equal(changedMime.readiness,'potential');assert.ok(changedMime.score!>originalMime.score!);
 assert.equal(originalSteel.readiness,'unavailable');assert.equal(changedSteel.readiness,'ready');assert.ok(changedSteel.score!>originalSteel.score!);
 assert.equal(evaluateJokerFit(alternative,'baron',{ante:4}).score,originalBaron.score);
 assert.equal(evaluateJokerFit(alternative,'joker',{ante:4}).score,originalJoker.score);
 assert.equal(evaluateComposition(alternative,{ante:4}).material.steel,4);
 assert.deepEqual(state,before);
});
