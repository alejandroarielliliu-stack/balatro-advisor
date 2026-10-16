import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {inspectCompositions} from '../src/advisor/composition-signals.js';
import {standardDeck} from '../src/catalog/initial.js';
import type {GameState,JokerInstance} from '../src/state/model.js';
import {known} from './helpers.js';

/** Independent documentary fixtures from docs/composiciones.md and SYN01/L02.
 * These test support, missing conditions and input preservation. They are not
 * observations in Balatro and do not manufacture expected hand scores. */
function fixture():GameState {
 const state=JSON.parse(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8')) as GameState;
 state.assumptions.probes=[];state.assumptions.roundPlans=[];
 state.observed.deck=known({cards:standardDeck()});
 return state;
}
function joker(catalogId:string,instanceId=catalogId):JokerInstance {
 return {instanceId,catalogId,counters:{},edition:known('base'),stickers:known([]),sellValue:known(1)};
}
function own(state:GameState,...ids:string[]) {state.observed.jokers=known(ids.map(id=>joker(id)));}

test('Composición S01: mazo desconocido o preset de Errática no respaldan relaciones de material',()=>{
 // Each material relation requires current cards; actor names alone are not
 // evidence for held steel, scoring faces, twos/fours or scoring hearts.
 const cases:[string,string[]][]=[
  ['j_mime',['baron']],['j_photograph',['hanging_chad']],
  ['j_hack',['wee','walkie_talkie','fibonacci']],
  ['j_bloodstone',['smeared','hanging_chad']],['j_vampire',['midas_mask']]
 ];
 for(const [candidate,actors] of cases){
  const state=fixture();own(state,...actors);
  state.observed.deck={status:'unknown',reason:'Cartas actuales no transcritas'};
  const before=structuredClone(state),signals=inspectCompositions(state,candidate);
  assert.ok(signals.length,'Se deben conservar las condiciones pendientes del caso');
  assert.ok(signals.every(signal=>signal.kind==='heuristic'));
  assert.ok(signals.some(signal=>/Falta/.test(signal.text)));
  assert.deepEqual(state,before);
 }
 const erratic=fixture();own(erratic,'baron');
 erratic.observed.deckId=known('erratic');erratic.observed.deck=known({preset:'standard52-unmodified'});
 assert.equal(inspectCompositions(erratic,'j_mime').find(s=>s.id==='composition-mime-steel-baron')?.kind,'heuristic');
});

test('Composición S02: sello dorado no es mejora Oro y no respalda ingresos retenidos de Mimo',()=>{
 const state=fixture(),cards=standardDeck();cards[0]!.seal='gold';
 state.observed.deck=known({cards});
 const before=structuredClone(state),seal=inspectCompositions(state,'j_mime').find(s=>s.id==='composition-gold-zones');
 assert.equal(seal?.kind,'heuristic');
 assert.match(seal!.text,/sello dorado paga al puntuar|sellos dorados/i);
 assert.match(seal!.text,/Mimo no lo repite por retención/);
 assert.deepEqual(state,before);
 // Change only the relevant property to the documented Gold enhancement.
 cards[0]!.seal='none';cards[0]!.enhancement='gold';
 const gold=inspectCompositions(state,'j_mime').find(s=>s.id==='composition-gold-zones');
 assert.equal(gold?.kind,'potential');
 assert.match(gold!.text,/retenida al finalizar la ronda/);
 assert.match(gold!.text,/Falta elegir/);
});

test('Composición S03: Mimo con sello azul exige cierre, última mano y capacidad sin crear planetas',()=>{
 const state=fixture(),cards=standardDeck();cards[0]!.seal='blue';
 state.observed.deck=known({cards});
 state.observed.jokerContext=known({consumables:known([]),consumableSlots:known(1)});
 const before=structuredClone(state),blue=inspectCompositions(state,'j_mime').find(s=>s.id==='composition-mime-blue');
 assert.equal(blue?.kind,'potential');
 assert.match(blue!.text,/conservar el sello al cierre/);
 assert.match(blue!.text,/última mano/);assert.match(blue!.text,/espacio de consumibles en cada intento/);
 assert.match(blue!.text,/Un único hueco no permite prometer dos planetas/);
 assert.match(blue!.text,/no se registra ninguna creación futura/);
 assert.deepEqual(state,before,'La inspección no cambia cartas ni inventario de consumibles');
});

test('Composición S04: Cumbre aprovecha Ladrón sin heredar el conflicto previo con Estandarte',()=>{
 const state=fixture();own(state,'burglar','banner');const before=structuredClone(state);
 const signals=inspectCompositions(state,'j_mystic_summit');
 const summit=signals.find(s=>s.id==='composition-burglar-discards');
 assert.equal(summit?.kind,'potential');
 assert.match(summit!.text,/Cumbre Mística tiene favorecida su condición de cero descartes/);
 assert.match(summit!.text,/Estandarte pierde su soporte/,'El aviso previo sigue visible');
 assert.ok(signals.every(s=>s.kind!=='conflict'),'La compra de Cumbre no introduce ese conflicto preexistente');
 assert.deepEqual(state,before);
});

test('Composición S05: poseer Tarot y planeta no sustituye historial desconocido ni acredita crecimiento',()=>{
 const state=fixture();own(state,'fortune_teller','constellation');
 state.observed.jokerContext=known({
  consumables:known([
   {instanceId:'tarot-observed',catalogId:'c_fool',kind:'tarot' as const,edition:'base' as const,sellValue:1},
   {instanceId:'planet-observed',catalogId:'c_mercury',kind:'planet' as const,edition:'base' as const,sellValue:1}
  ]),
  consumableSlots:known(3),
  tarotsUsed:{status:'unknown' as const,reason:'Historial no transcrito'},
  planetsUsed:{status:'unknown' as const,reason:'Historial no transcrito'}
 });
 const before=structuredClone(state),signals=inspectCompositions(state,'j_perkeo');
 const tarot=signals.find(s=>s.id==='composition-tarot-development');
 const planet=signals.find(s=>s.id==='composition-planet-development');
 assert.equal(tarot?.kind,'heuristic');assert.equal(planet?.kind,'heuristic');
 assert.match(tarot!.text,/Falta el número de Tarots usados/);
 assert.match(planet!.text,/Falta el historial de planetas usados/);
 assert.ok(signals.every(s=>s.kind!=='potential'),'Sin historial no hay respaldo positivo de estas composiciones');
 assert.deepEqual(state,before);
});

test('Composición S06: excluir el actor vendido elimina la relación sin modificar el inventario real',()=>{
 const state=fixture();state.observed.jokers=known([joker('hack','hack-observed')]);
 const before=structuredClone(state);
 // A standard declared deck has four twos. Hack plus Wee can use them only
 // if scored; selling the only Hack removes that documented relationship.
 const keep=inspectCompositions(state,'j_wee');
 assert.equal(keep.find(s=>s.id==='composition-wee-hack')?.kind,'potential');
 const replace=inspectCompositions(state,'j_wee','hack-observed');
 assert.equal(replace.some(s=>s.id==='composition-wee-hack'),false);
 assert.deepEqual(state,before);
});
