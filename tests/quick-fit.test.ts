import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateJokerFit, evaluateOwnedFits} from '../src/advisor/quick-fit.js';
import {standardDeck} from '../src/catalog/initial.js';
import {FIT_PROFILES} from '../src/advisor/fit-profiles.js';
import type {GameState, JokerInstance} from '../src/state/model.js';
import {known} from './helpers.js';

/** These are policy fixtures, not observations of gameplay or engine-generated
 * expected scores. Q01–Q08 come from docs/propuesta-encaje-rapido.md. The only
 * numerical expectations below are the published quick-fit-2 policy and literal
 * shop arithmetic; they do not establish an optimal decision or win rate. */
function fixture():GameState {
 const state=JSON.parse(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8')) as GameState;
 state.assumptions.probes=[];
 state.assumptions.roundPlans=[];
 state.observed.money=known(30);
 return state;
}
function joker(catalogId:string,instanceId=catalogId,counters:JokerInstance['counters']={}):JokerInstance {
 return {instanceId,catalogId,edition:known('base'),stickers:known([]),sellValue:known(1),counters};
}
function own(state:GameState,...jokers:JokerInstance[]) {state.observed.jokers=known(jokers);}
function score(fit:ReturnType<typeof evaluateJokerFit>):number {assert.notEqual(fit.score,null);return fit.score!;}
function signal(fit:ReturnType<typeof evaluateJokerFit>,id:string) {return fit.signals.find(s=>s.id===id);}

test('Encaje rápido Q01: funciona con datos básicos, sin planes, fichas objetivo ni cobro',()=>{
 const state=fixture();
 state.observed.money={status:'unknown',reason:'No introducido'};
 state.observed.nextBlind={status:'unknown',reason:'Sin ciega seleccionada'};
 state.observed.visibleBoss={status:'unknown',reason:'Todavía no visto'};
 const before=structuredClone(state),fit=evaluateJokerFit(state,'joker',{ante:1});
 assert.equal(fit.readiness,'ready');
 assert.equal(fit.stage,'early');
 assert.equal(fit.purchase.status,'not-requested');
 // Editorial Joker profile at ante 1: etapa 3 + disponible 3 + rol nuevo 2.
 assert.equal(fit.score,80);
 assert.ok(score(fit)>=0);
 assert.equal(fit.axes.reduce((sum,a)=>sum+(a.value??0)*10,0),fit.score);
 assert.deepEqual(Object.fromEntries(fit.axes.map(a=>[a.key,a.max])),{stage:4,readiness:3,integration:3});
 assert.ok(fit.limitations.length,'La nota heurística debe conservar sus límites');
 assert.deepEqual(state,before);
});

test('Encaje rápido Q02: el horizonte importa para Green nuevo y no borra el crecimiento poseído',()=>{
 const state=fixture();
 const early=evaluateJokerFit(state,'green_joker',{ante:1,purchase:true});
 const late=evaluateJokerFit(state,'green_joker',{ante:8,purchase:true});
 assert.equal(early.stage,'early');assert.equal(late.stage,'late');
 assert.ok(score(early)>score(late),'Un escalador nuevo tiene menos horizonte al final');
 assert.ok(signal(late,'growth-horizon'));
 own(state,joker('green_joker','grown-green',{greenMult:known(20)}));
 const grown=evaluateJokerFit(state,'green_joker',{ante:8,instanceId:'grown-green'});
 assert.ok(score(grown)>score(late),'El Mult registrado no desaparece por llegar al ante 8');
 assert.ok(grown.signals.some(s=>s.kind==='fact'&&/20/.test(s.text)));
});

test('Encaje rápido Q02: un contador poseído desconocido no se sustituye por cero',()=>{
 const state=fixture();
 own(state,joker('green_joker','unknown-green',{greenMult:{status:'unknown',reason:'No transcrito'}}));
 const fit=evaluateJokerFit(state,'green_joker',{ante:4,instanceId:'unknown-green'});
 assert.equal(fit.score,null);
 assert.ok(fit.range);
 assert.ok(fit.axes.some(a=>a.value===null));
 assert.ok(fit.limitations.join(' ').match(/contador|Mult|dato/i));
});

test('Encaje rápido Q03–Q04: Acero en el mazo apoya Mimo potencialmente y Steel Joker directamente',()=>{
 const state=fixture(),cards=standardDeck();
 cards.slice(0,4).forEach(c=>c.enhancement='steel');
 state.observed.deck=known({cards});
 const before=structuredClone(state),mime=evaluateJokerFit(state,'mime',{ante:4});
 const steel=evaluateJokerFit(state,'steel_joker',{ante:4});
 assert.equal(mime.readiness,'potential');
 assert.equal(signal(mime,'steel-held')?.kind,'potential');
 assert.equal(steel.readiness,'ready');
 assert.deepEqual(state,before);
 const unsupported=fixture(),noSteel=evaluateJokerFit(unsupported,'mime',{ante:4});
 assert.ok(score(mime)>score(noSteel));
 assert.notEqual(noSteel.readiness,'ready');
});

test('Encaje rápido Q05: Fotografía y Chad necesitan figuras, Pareidolia es un habilitador',()=>{
 const state=fixture();
 own(state,joker('hanging_chad'));
 const backed=evaluateJokerFit(state,'photograph',{ante:4});
 assert.equal(backed.readiness,'potential');
 assert.equal(signal(backed,'photo-chad')?.kind,'potential');
 state.observed.deckId=known('abandoned');
 state.observed.deck=known({cards:standardDeck().filter(c=>!['J','Q','K'].includes(c.rank))});
 const absent=evaluateJokerFit(state,'photograph',{ante:4});
 assert.equal(absent.readiness,'unavailable');
 assert.ok(score(absent)<=20,'Condición conocida imposible limita el índice a20');
 own(state,joker('hanging_chad'),joker('pareidolia'));
 const enabled=evaluateJokerFit(state,'photograph',{ante:4});
 assert.notEqual(enabled.readiness,'unavailable');
 assert.ok(score(enabled)>score(absent));
});

test('Encaje rápido Q06: Burglar elimina el soporte de Banner por descartes',()=>{
 const state=fixture();
 const supported=evaluateJokerFit(state,'banner',{ante:1});
 own(state,joker('burglar'));
 const conflict=evaluateJokerFit(state,'banner',{ante:1});
 assert.equal(signal(conflict,'banner-burglar')?.kind,'conflict');
 assert.equal(conflict.readiness,'unavailable');
 assert.ok(score(conflict)<score(supported));
});

test('Encaje rápido Q07: Erosión usa tamaño inicial declarado, no presume siempre 52',()=>{
 const state=fixture();
 state.observed.deck=known({cards:standardDeck().slice(0,40)});
 state.observed.jokerContext=known({startingDeckSize:known(52)});
 const reduced=evaluateJokerFit(state,'erosion',{ante:4});
 assert.equal(reduced.readiness,'ready');
 assert.ok(signal(reduced,'erosion-size'));
 state.observed.deck=known({cards:standardDeck()});
 const unchanged=evaluateJokerFit(state,'erosion',{ante:4});
 assert.ok(score(reduced)>score(unchanged));
 state.observed.jokerContext=known({});
 const unknown=evaluateJokerFit(state,'erosion',{ante:4});
 assert.equal(unknown.score,null);
 assert.equal(unknown.readiness,'unknown');
 assert.ok(unknown.limitations.join(' ').match(/inicial|tamaño|dato/i));
});

test('Encaje rápido Q07: DNA o Marble tensan Erosión por separado; no exige poseer los tres',()=>{
 const state=fixture();
 state.observed.deck=known({cards:standardDeck().slice(0,40)});
 state.observed.jokerContext=known({startingDeckSize:known(52)});
 own(state,joker('erosion'));
 for(const id of ['dna','marble'] as const){
  const fit=evaluateJokerFit(state,id,{ante:4});
  assert.equal(signal(fit,'erosion-growth-conflict')?.kind,'conflict');
  assert.ok(signal(fit,'erosion-growth-conflict')!.text.match(/Eros|añad|carta/i));
 }
});

test('Encaje rápido Q08: comprar reduce soporte de Bull/Bootstraps y muestra coste separado',()=>{
 const state=fixture();own(state,joker('bull'),joker('bootstraps'));
 const before=structuredClone(state);
 const fit=evaluateJokerFit(state,'joker',{ante:1,purchase:true});
 assert.equal(fit.purchase.status,'legal');
 // $30 iniciales - $2 del Joker = $28. Compra simple sin venta.
 assert.equal(fit.purchase.netCost,2);
 assert.equal(fit.purchase.moneyAfter,28);
 assert.equal(signal(fit,'spending-money-scalers')?.kind,'conflict');
 assert.deepEqual(state,before);
 state.observed.money={status:'unknown',reason:'Saldo no registrado'};
 const unknown=evaluateJokerFit(state,'joker',{ante:1,purchase:true});
 assert.equal(unknown.purchase.status,'unknown');
 assert.equal(unknown.purchase.moneyAfter,undefined);
 assert.ok(unknown.purchase.errors.length||unknown.purchase.limitations.length);
});

test('Encaje rápido: compra ilegal no se convierte en una transacción realizada',()=>{
 const state=fixture();state.observed.money=known(0);
 const before=structuredClone(state),fit=evaluateJokerFit(state,'joker',{ante:1,purchase:true});
 assert.equal(fit.purchase.status,'illegal');
 assert.ok(fit.purchase.errors.some(e=>e.code==='insufficient_money'));
 assert.equal(fit.purchase.moneyAfter,undefined);
 assert.deepEqual(state,before);
});

test('Encaje rápido Q01: reemplazo válido separa venta, coste y contador sacrificado',()=>{
 const state=fixture();
 const green=joker('green_joker','grown-green',{greenMult:known(20)});
 green.sellValue=known(2);
 own(state,green,joker('scholar'),joker('banner'),joker('even_steven'),joker('golden_joker'));
 const before=structuredClone(state);
 const blocked=evaluateJokerFit(state,'joker',{ante:4,purchase:true});
 assert.equal(blocked.purchase.status,'illegal');
 assert.ok(blocked.purchase.errors.some(e=>e.code==='no_slots'));
 const replace=evaluateJokerFit(state,'joker',{ante:4,purchase:true,replacementId:'grown-green'});
 assert.equal(replace.purchase.status,'legal');
 // Vender Green por $2 y comprar Joker por $2: coste neto $0, saldo $30.
 assert.equal(replace.purchase.netCost,0);
 assert.equal(replace.purchase.moneyAfter,30);
 assert.ok(replace.signals.some(s=>/20/.test(s.text)&&/perd|vend|sacrific|Green/i.test(s.text)));
 assert.deepEqual(state,before);
});

test('Encaje rápido: owned tiene identidad, admite alias del catálogo y no copia hipótesis',()=>{
 const state=fixture();own(state,joker('joker','owned-basic'),joker('green_joker','owned-grown',{greenMult:known(12)}));
 const before=structuredClone(state),fits=evaluateOwnedFits(state,{ante:4});
 assert.equal(fits.length,2);
 assert.deepEqual(fits.map(f=>f.instanceId),['owned-basic','owned-grown']);
 assert.deepEqual(evaluateJokerFit(state,'j_joker',{ante:4}),evaluateJokerFit(state,'joker',{ante:4}));
 assert.deepEqual(state,before);
});

test('Encaje rápido: sin perfil ni composición suficiente no se inventa una nota',()=>{
 const state=fixture();
 const unsupported=evaluateJokerFit(state,'not-a-joker',{ante:4});
 assert.equal(unsupported.score,null);
 assert.ok(unsupported.limitations.length);
 state.observed.deck={status:'unknown',reason:'Composición no registrada'};
 const materialDependent=evaluateJokerFit(state,'steel_joker',{ante:4});
 assert.equal(materialDependent.score,null);
 assert.equal(materialDependent.readiness,'unknown');
 assert.ok(materialDependent.range);
});

test('Encaje rápido: modo estricto limita transición H2 sin anular la rúbrica independiente',()=>{
 const state=fixture();
 const fit=evaluateJokerFit(state,'joker',{ante:1,purchase:true,requireObserved:true});
 assert.equal(fit.readiness,'ready');
 assert.notEqual(fit.score,null);
 assert.notEqual(fit.purchase.status,'legal');
 assert.ok(fit.purchase.errors.some(e=>e.code==='pending_rule'));
 assert.ok(fit.purchase.limitations.length||fit.limitations.length);
});

test('Encaje rápido: Plasma no presupone la necesidad de Mult por un rol ausente',()=>{
 const state=fixture(),normal=evaluateJokerFit(state,'joker',{ante:1});
 state.observed.deckId=known('plasma');
 const plasma=evaluateJokerFit(state,'joker',{ante:1});
 assert.ok(signal(plasma,'plasma-balance'));
 assert.equal(plasma.axes.find(a=>a.key==='integration')!.value,null);
 assert.equal(plasma.score,null);assert.ok(plasma.range);assert.notEqual(normal.score,null);
});

test('Encaje rápido: inventario desconocido no equivale a ausencia de todos los roles',()=>{
 const state=fixture();state.observed.jokers={status:'unknown',reason:'Inventario no confirmado'};
 const fit=evaluateJokerFit(state,'joker',{ante:1});
 assert.equal(fit.axes.find(a=>a.key==='integration')!.value,null);
 assert.equal(fit.score,null);
 assert.ok(fit.range);
});

test('Perfiles rápidos: 150 entradas explícitas coinciden con el catálogo, sin notas por rareza',()=>{
 const catalogue=JSON.parse(readFileSync(new URL('../../web/assets/jokers/catalog.json',import.meta.url),'utf8')) as {jokers:{id:string}[]};
 const ids=catalogue.jokers.map(j=>j.id).sort();
 assert.equal(ids.length,150);
 assert.deepEqual(Object.keys(FIT_PROFILES).sort(),ids);
 for(const [id,profile] of Object.entries(FIT_PROFILES)){
  assert.equal(profile.id,id);
  assert.ok(profile.roles.length);
  assert.ok(profile.detail);
  assert.equal(profile.stage.length,3);
  assert.ok(profile.stage.every(n=>Number.isInteger(n)&&n>=0&&n<=4));
 }
 // Integrity of profiles is distinct from gameplay evidence or validating a tier list.
});
