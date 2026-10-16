import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateJokerFit} from '../src/advisor/quick-fit.js';
import {standardDeck} from '../src/catalog/initial.js';
import type {GameState, JokerInstance} from '../src/state/model.js';
import {known} from './helpers.js';

/** Synthetic composition transcriptions. Density expectations are editorial
 * continuous support of the recorded deck (not draw probabilities). Combo expectations come
 * from SYN01/L02 conditions, not from scoring-engine output or observed play. */
function fixture():GameState {
 const state=JSON.parse(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8')) as GameState;
 state.assumptions.probes=[];state.assumptions.roundPlans=[];
 state.observed.money=known(30);state.observed.deck=known({cards:standardDeck()});
 return state;
}
function joker(catalogId:string,instanceId=catalogId,counters:JokerInstance['counters']={}):JokerInstance {
 return {instanceId,catalogId,counters,edition:known('base'),stickers:known([]),sellValue:known(1)};
}
function own(state:GameState,...instances:JokerInstance[]) {state.observed.jokers=known(instances);}
function readinessValue(fit:ReturnType<typeof evaluateJokerFit>) {return fit.axes.find(a=>a.key==='readiness')?.value;}
function score(fit:ReturnType<typeof evaluateJokerFit>):number {assert.notEqual(fit.score,null);return fit.score!;}
function signal(fit:ReturnType<typeof evaluateJokerFit>,id:string) {return fit.signals.find(s=>s.id===id);}

test('Composición D00: un combo de meta con una sola figura no recibe todo su potencial de etapa',()=>{
 const state=fixture(),cards=standardDeck().filter(c=>!['J','Q','K'].includes(c.rank));cards[0]!.rank='Q';state.observed.deck=known({cards});own(state,joker('hanging_chad'));
 const before=structuredClone(state),scarce=evaluateJokerFit(state,'photograph',{ante:8});
 // Editorial oracle: (stage2.2 + material1.05 + relation3)×10 =62.5.
 assert.equal(scarce.score,62.5);assert.equal(scarce.axes.find(a=>a.key==='stage')?.value,2.2);assert.ok(signal(scarce,'scarce-material'));assert.equal(scarce.readiness,'potential');assert.deepEqual(state,before);
 state.observed.deck=known({cards:cards.map(c=>({...c,rank:'Q' as const}))});const prepared=evaluateJokerFit(state,'photograph',{ante:8});
 assert.equal(prepared.score,100);assert.equal(prepared.readiness,'potential');
});

test('Composición D01: soporte continuo 12/52, 13/52 y 26/52; material no significa puntuarlo',()=>{
 const results=[];
 for(const [hearts,expected] of [[12,19/13],[13,1.5],[26,2]] as const){
  const state=fixture(),cards=standardDeck();
  cards.forEach((c,i)=>c.suit=i<hearts?'H':'S');state.observed.deck=known({cards});
  const before=structuredClone(state),fit=evaluateJokerFit(state,'lusty_joker',{ante:4});
  // Independent policy oracle: 1 +2×eligible/52, not a draw probability.
  assert.ok(Math.abs(readinessValue(fit)!-expected)<1e-12,'Floating-point representation keeps the independently worked fraction');
  assert.equal(fit.readiness,'potential','La banda alta tampoco acredita cartas puntuadas');
  assert.ok(fit.signals.some(s=>s.kind==='potential'));
  assert.deepEqual(state,before);results.push(score(fit));
 }
 assert.ok(results[0]!<results[1]!&&results[1]!<results[2]!);
 const noHearts=fixture(),cards=standardDeck();cards.forEach(c=>c.suit='S');noHearts.observed.deck=known({cards});
 const absent=evaluateJokerFit(noHearts,'lusty_joker',{ante:4});
 assert.equal(absent.readiness,'unavailable');assert.equal(readinessValue(absent),0);assert.ok(score(absent)<=20);
});

test('Composición D02: Cuadriculada favorece Corazones 26/52 frente a Azul 13/52',()=>{
 const blue=fixture(),checkered=fixture(),cards=standardDeck();
 checkered.observed.deckId=known('checkered');
 // Literal L03 starting condition: clubs become spades, diamonds become hearts.
 cards.forEach(c=>{if(c.suit==='C')c.suit='S';else if(c.suit==='D')c.suit='H';});
 checkered.observed.deck=known({cards});
 const blueFit=evaluateJokerFit(blue,'lusty_joker',{ante:1});
 const checkeredFit=evaluateJokerFit(checkered,'lusty_joker',{ante:1});
 assert.equal(readinessValue(blueFit),1.5);assert.equal(readinessValue(checkeredFit),2);
 assert.equal(checkeredFit.readiness,'potential');
 assert.ok(score(checkeredFit)>score(blueFit));
 assert.equal(blue.assumptions.roundPlans.length,0);assert.equal(checkered.assumptions.roundPlans.length,0);
});

test('Composición D03: desconocido no es cero, y un preset estándar no reemplaza Errática',()=>{
 const state=fixture();state.observed.deck={status:'unknown',reason:'Mazo actual sin registrar'};
 const missing=evaluateJokerFit(state,'lusty_joker',{ante:4});
 assert.equal(missing.readiness,'unknown');assert.equal(missing.score,null);assert.equal(readinessValue(missing),null);
 state.observed.deckId=known('erratic');state.observed.deck=known({preset:'standard52-unmodified'});
 const wrongPreset=evaluateJokerFit(state,'lusty_joker',{ante:4});
 assert.equal(wrongPreset.readiness,'unknown');assert.equal(wrongPreset.score,null);
});

test('Composición D04: Mimo cuenta una vez cada rey de Acero para el soporte retenido',()=>{
 const state=fixture(),cards=standardDeck();
 cards.forEach((c,i)=>{c.rank=i<8?'K':'7';c.enhancement=i<8?'steel':'none';});
 state.observed.deck=known({cards});own(state,joker('baron'));
 const before=structuredClone(state),fit=evaluateJokerFit(state,'mime',{ante:4});
 // Eight distinct cards have both traits: 1+2×8/52=17/13.
 // Counting each card twice would incorrectly inflate the support.
 assert.equal(readinessValue(fit),17/13);
 assert.equal(fit.readiness,'potential');
 assert.ok(fit.signals.some(s=>s.id==='steel-held'&&s.kind==='potential'));
 assert.equal(signal(fit,'composition-mime-steel-baron')?.kind,'potential');
 assert.deepEqual(state,before);
});

test('Composición D05: Hack repite 2–5; Wee solo desarrolla con el 2 y conserva fichas acumuladas',()=>{
 const state=fixture(),cards=standardDeck();
 cards.forEach((c,i)=>c.rank=i<26?'2':'8');state.observed.deck=known({cards});
 own(state,joker('wee','owned-wee',{chips:known(20)}));
 const twos=evaluateJokerFit(state,'hack',{ante:4});
 assert.equal(twos.readiness,'potential');assert.equal(readinessValue(twos),2);
 assert.equal(signal(twos,'composition-wee-hack')?.kind,'potential');
 // Change only the eligible rank: threes remain Hack material, not Wee growth material.
 cards.forEach(c=>{if(c.rank==='2')c.rank='3';});
 const threes=evaluateJokerFit(state,'hack',{ante:4});
 assert.equal(threes.readiness,'potential');assert.equal(readinessValue(threes),2);
 assert.equal(signal(threes,'composition-wee-hack')?.kind,'conflict');
 assert.ok(score(twos)>score(threes));
 own(state,joker('wee','owned-wee',{chips:known(20)}),joker('hack'));
 const before=structuredClone(state),grown=evaluateJokerFit(state,'wee',{ante:4,instanceId:'owned-wee'});
 assert.equal(grown.readiness,'ready','No tener doses no borra las 20 fichas ya registradas');
 assert.ok(grown.signals.some(s=>s.kind==='fact'&&/20/.test(s.text)));
 assert.deepEqual(state,before);
});

test('Composición D06: Fotografía/Chad sin figuras exige habilitador; Pareidolia ofrece potencial',()=>{
 const state=fixture();state.observed.deckId=known('abandoned');
 state.observed.deck=known({cards:standardDeck().filter(c=>!['J','Q','K'].includes(c.rank))});
 own(state,joker('hanging_chad'));
 const absent=evaluateJokerFit(state,'photograph',{ante:4});
 assert.equal(absent.readiness,'unavailable');
 assert.equal(signal(absent,'composition-photo-chad')?.kind,'conflict');
 own(state,joker('hanging_chad'),joker('pareidolia'));
 const before=structuredClone(state),enabled=evaluateJokerFit(state,'photograph',{ante:4});
 assert.equal(enabled.readiness,'potential');
 assert.equal(signal(enabled,'composition-photo-chad')?.kind,'potential');
 assert.ok(score(enabled)>score(absent));
 assert.ok(signal(enabled,'composition-photo-chad')!.text.match(/primer|orden|punt/i));
 assert.deepEqual(state,before);
});

test('Composición D07: Pareidolia reinicia Bus al puntuar sin alterar el contador transcrito',()=>{
 const state=fixture();own(state,joker('ride_the_bus','bus',{mult:known(20)}));
 const usable=evaluateJokerFit(state,'ride_the_bus',{ante:4,instanceId:'bus'});
 own(state,joker('ride_the_bus','bus',{mult:known(20)}),joker('pareidolia'));
 const before=structuredClone(state),conflict=evaluateJokerFit(state,'ride_the_bus',{ante:4,instanceId:'bus'});
 assert.equal(signal(conflict,'composition-pareidolia-bus')?.kind,'conflict');
 assert.equal(conflict.readiness,'unavailable');
 assert.ok(score(conflict)<score(usable));assert.ok(score(conflict)<=20);
 assert.deepEqual(state,before,'Valorar el próximo play no registra un reinicio ya ocurrido');
});

test('Composición D08: Burglar habilita Summit y destruye el soporte de Banner',()=>{
 const state=fixture(),without=evaluateJokerFit(state,'mystic_summit',{ante:1});
 own(state,joker('burglar'));
 const before=structuredClone(state),summit=evaluateJokerFit(state,'mystic_summit',{ante:1});
 assert.equal(without.readiness,'potential');assert.equal(summit.readiness,'ready');
 assert.equal(signal(summit,'composition-burglar-discards')?.kind,'potential');
 assert.ok(score(summit)>score(without));
 const banner=evaluateJokerFit(state,'banner',{ante:1});
 assert.equal(banner.readiness,'unavailable');
 assert.equal(signal(banner,'composition-burglar-discards')?.kind,'conflict');
 assert.ok(score(banner)<=20);
 assert.deepEqual(state,before);
});

test('Composición D09: DNA/Marble benefician Hologram potencialmente y tensan Erosión por separado',()=>{
 const state=fixture();state.observed.deck=known({cards:standardDeck().slice(0,40)});
 state.observed.jokerContext=known({startingDeckSize:known(52)});
 own(state,joker('hologram','holo',{x100:known(150)}),joker('erosion'));
 const before=structuredClone(state),dna=evaluateJokerFit(state,'dna',{ante:4});
 assert.equal(signal(dna,'composition-dna-hologram')?.kind,'potential');
 assert.equal(signal(dna,'composition-erosion-addition')?.kind,'conflict');
 const marble=evaluateJokerFit(state,'marble',{ante:4});
 assert.equal(signal(marble,'composition-marble-stone-hologram')?.kind,'potential');
 assert.equal(signal(marble,'composition-erosion-addition')?.kind,'conflict');
 // Benefits and sacrifice coexist; their presence doesn't register cards being added.
 assert.deepEqual(state,before);
});

test('Composición D10: Bull/Bootstraps utilizan saldo real; compra usa el posterior y conserva entrada',()=>{
 const state=fixture();state.observed.money=known(6);own(state,joker('bull'));
 const before=structuredClone(state);
 const fit=evaluateJokerFit(state,'bootstraps',{ante:4,purchase:true});
 // Literal catalogue price $7: $6 cannot purchase this candidate.
 assert.equal(fit.purchase.status,'illegal');assert.equal(fit.purchase.moneyAfter,undefined);
 assert.deepEqual(state,before);
 state.observed.money=known(7);
 const beforeLegal=structuredClone(state);
 const spent=evaluateJokerFit(state,'bootstraps',{ante:4,purchase:true});
 // $7 - $7 = $0. Bootstraps needs at least $5 after the actual legal transition.
 assert.equal(spent.purchase.status,'legal');assert.equal(spent.purchase.moneyAfter,0);
 assert.equal(spent.readiness,'unavailable');assert.equal(readinessValue(spent),0);
 assert.equal(signal(spent,'spending-money-scalers')?.kind,'conflict');
 assert.deepEqual(state,beforeLegal);
 state.observed.money={status:'unknown',reason:'Saldo real no registrado'};
 const unknown=evaluateJokerFit(state,'bootstraps',{ante:4,purchase:true});
 assert.equal(unknown.purchase.status,'unknown');assert.equal(unknown.readiness,'unknown');assert.equal(unknown.score,null);
});

test('Composición R01: Blueprint necesita un objetivo compatible en su posición, no en cualquier hueco',()=>{
 const state=fixture(),noTarget=evaluateJokerFit(state,'blueprint',{ante:4});
 assert.equal(noTarget.readiness,'unavailable');assert.ok(score(noTarget)<=20);
 // Joker is compatible, Egg is not. A compatible card to the left does not
 // make Blueprint's immediate right-hand target eligible.
 own(state,joker('joker','compatible-left'),joker('blueprint','owned-copy'),joker('egg','incompatible-right'));
 const before=structuredClone(state),wrongRight=evaluateJokerFit(state,'blueprint',{ante:4,instanceId:'owned-copy'});
 assert.equal(wrongRight.readiness,'unavailable');assert.ok(score(wrongRight)<=20);
 assert.deepEqual(state,before);
 own(state,joker('joker','compatible-left'),joker('blueprint','owned-copy'));
 const endOfRow=evaluateJokerFit(state,'blueprint',{ante:4,instanceId:'owned-copy'});
 assert.equal(endOfRow.readiness,'unavailable');assert.ok(score(endOfRow)<=20);
});

test('Composición R02: Seeing Double requiere tréboles y otra carta de otro palo',()=>{
 const state=fixture(),cards=standardDeck();cards.forEach(c=>c.suit='C');state.observed.deck=known({cards});
 const clubsOnly=evaluateJokerFit(state,'seeing_double',{ante:4});
 assert.equal(clubsOnly.readiness,'unavailable');assert.ok(score(clubsOnly)<=20);
 cards.forEach((c,i)=>c.suit=i%2?'H':'C');
 const before=structuredClone(state),mixed=evaluateJokerFit(state,'seeing_double',{ante:4});
 assert.equal(mixed.readiness,'potential','Material de dos palos no acredita que puntúen juntos');
 assert.ok(score(mixed)>score(clubsOnly));assert.deepEqual(state,before);
});
