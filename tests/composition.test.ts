import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {known,success} from './helpers.js';
import {parseState,serializeState,validateState} from '../src/state/validation.js';
import {startingComposition} from '../src/catalog/decks.js';
import {standardDeck} from '../src/catalog/initial.js';
import type {Card} from '../src/catalog/initial.js';
import {scoreHand} from '../src/rules/scoring.js';
import {boundRoundScore} from '../src/rules/upper-bound.js';
import {beginRound,applyRoundEvent} from '../src/rules/round.js';
import {evaluateComposition} from '../src/advisor/composition.js';
import type {CompositionReport,CompositionSectionId} from '../src/advisor/composition.js';
import type {GameState,JokerInstance} from '../src/state/model.js';
function fixture(id:string,cards?:Card[]){
 const s=success(parseState(readFileSync('examples/shop-purchase.json','utf8')));
 s.observed.deckId=known(id);s.observed.resources.handsPerRound=known(4);s.observed.resources.discardsPerRound=known(3);s.observed.jokers=known([]);
 s.observed.nextBlind=known({ante:1,kind:'small',bossId:known('none'),target:known(300),reward:known(3)});
 s.assumptions.probes=[];s.assumptions.roundPlans=[];
 if(cards)s.observed.deck=known({cards});return s;
}
function initial(id:string){const c=startingComposition(id);assert.equal(c.status,'known');if(c.status!=='known')throw Error();return c.cards;}
const copy=(id:string,rank:Card['rank'],suit:Card['suit']):Card=>({instanceId:id,rank,suit,edition:'base',enhancement:'none',seal:'none',extraChips:0});
test('Abandonada: 40 cartas reales, identidades legales y partición tras descarte',()=>{
 const s=fixture('abandoned',initial('abandoned')),before=structuredClone(s);
 assert.equal(success(scoreHand(s,{cardIds:['8S','8H'],discardsRemaining:3})).score,52);
 assert.ok(!scoreHand(s,{cardIds:['JS'],discardsRemaining:3}).ok);
 const round=success(beginRound(s,['AS','AH','2S','2H','3S','3H','4S','4H']));
 const next=success(applyRoundEvent(round,{type:'discard',cardIds:['AS'],drawnCardIds:['5S']},{expectedRevision:s.revision,updatedAt:s.updatedAt})).round;
 assert.equal(next.remaining.length+next.hand.length+next.spent.length,40);assert.deepEqual(s,before);
});
test('Cuadriculada: dos instancias del mismo rango/palo; guardado conserva identidad',()=>{
 const s=fixture('checkered',initial('checkered'));
 const result=success(scoreHand(s,{cardIds:['8S','8C'],discardsRemaining:3}));assert.equal(result.hand,'pair');assert.equal(result.score,52);
 assert.ok(!scoreHand(s,{cardIds:['8S','8S'],discardsRemaining:3}).ok);
 assert.deepEqual(success(parseState(success(serializeState(s)))),s);
 const d=initial('checkered');d[1]!.instanceId=d[0]!.instanceId;assert.ok(!validateState(fixture('checkered',d)).ok);
});
test('Errática: ninguna composición implícita ni comodín numérico por su nombre',()=>{
 const s=fixture('erratic');assert.ok(!scoreHand(s,{cardIds:['8S'],discardsRemaining:3}).ok);
 s.observed.deck={status:'unknown',reason:'No registrada'};assert.ok(!scoreHand(s,{cardIds:['8S'],discardsRemaining:3}).ok);
 s.observed.deck=known({cards:standardDeck()});assert.equal(success(scoreHand(s,{cardIds:['8S','8H'],discardsRemaining:3})).score,52);
});
test('Categorías especiales con oráculos de game.lua: cinco iguales, Flush House y Flush Five',()=>{
 const cases:[Card[],string,number][]=[
  [['S','H','D','C','S'].map((s,i)=>copy('c'+i,'8',s as Card['suit'])),'five_kind',1920], // (120+5*8)*12
  [['8','8','8','2','2'].map((r,i)=>copy('c'+i,r as Card['rank'],'S')),'flush_house',2352], // (140+24+4)*14
  [Array.from({length:5},(_,i)=>copy('c'+i,'8','S')),'flush_five',3200] // (160+40)*16
 ];
 for(const [cards,hand,score] of cases){
  const s=fixture('erratic',[...cards,...standardDeck()]),before=structuredClone(s),out=success(scoreHand(s,{cardIds:cards.map(c=>c.instanceId),discardsRemaining:3}));
  assert.equal(out.hand,hand);assert.equal(out.score,score);assert.equal(out.scoringCardIds.length,5);
  assert.ok(success(boundRoundScore(s)).scorePerHandUpper>=score);assert.deepEqual(s,before);
  assert.ok(!scoreHand(s,{cardIds:cards.map(c=>c.instanceId),discardsRemaining:3},{requireObserved:true}).ok);
 }
});
test('Guardados anteriores sin bases especiales: se bloquea solo la categoría afectada',()=>{
 const s=fixture('erratic',[...Array.from({length:5},(_,i)=>copy('c'+i,'8','S')),...standardDeck()]);
 s.observed.handBases=known({values:{high_card:known({level:1,chips:5,mult:1}),pair:known({level:1,chips:10,mult:2}),two_pair:known({level:1,chips:20,mult:2}),three_kind:known({level:1,chips:30,mult:3}),straight:known({level:1,chips:30,mult:4}),flush:known({level:1,chips:35,mult:4}),full_house:known({level:1,chips:40,mult:4}),four_kind:known({level:1,chips:60,mult:7}),straight_flush:known({level:1,chips:100,mult:8})}});
 assert.ok(validateState(s).ok);assert.equal(success(scoreHand(s,{cardIds:['8S','8H'],discardsRemaining:3})).score,52);
 const result=scoreHand(s,{cardIds:['c0','c1','c2','c3','c4'],discardsRemaining:3});assert.ok(!result.ok);assert.equal(result.errors[0]!.code,'unknown_data');assert.ok(!boundRoundScore(s).ok);
});
test('Composición actual prevalece al inicio: cambios explícitos admitidos, mejoras aún rechazadas',()=>{
 const cards=initial('abandoned');cards.push(copy('observed-face','J','H'));const s=fixture('abandoned',cards);
 assert.equal(success(scoreHand(s,{cardIds:['observed-face'],discardsRemaining:3})).score,15);
 cards[0]!.enhancement='steel';assert.ok(!scoreHand(fixture('abandoned',cards),{cardIds:['observed-face'],discardsRemaining:3}).ok);
});

import {MemoryStorage} from './helpers.js';
import {createConfirmedStore,analysisBinding} from '../src/storage/confirmed-store.js';
test('Corrección de composición: retirar escenarios es explícito, atómico y reversible',()=>{
 const s=fixture('blue');s.observed.resources.handsPerRound=known(5);
 s.assumptions.probes=[{probeId:'king',label:'Rey anterior',playedCardIds:['KS'],discardsRemaining:3,role:'adverse'}];
 const storage=new MemoryStorage(),store=createConfirmedStore(()=>storage);success(store.initialize(s));
 const patch={deck:known({cards:initial('abandoned')})};
 const request={confirmationId:'deck-correct',confirmed:true,expected:analysisBinding(s),updatedAt:s.updatedAt,patch,reason:'Composición corregida'};
 assert.ok(!store.correct(request).ok);assert.deepEqual(success(store.load())?.state,s);
 storage.failWrite=true;assert.ok(!store.correct({...request,discardSavedScenarios:true}).ok);storage.failWrite=false;assert.deepEqual(success(store.load())?.state,s);
 const saved=success(store.correct({...request,discardSavedScenarios:true}));assert.equal(saved.state.assumptions.probes.length,0);assert.equal(saved.history[0]!.before.assumptions.probes.length,1);
 const undone=success(store.undoLatest({confirmationId:'undo-deck',confirmed:true,expected:analysisBinding(saved.state),updatedAt:s.updatedAt,targetEntryId:'deck-correct',reason:'Restaurar registro'}));
 assert.deepEqual(undone.state.observed.deck,s.observed.deck);assert.deepEqual(undone.state.assumptions.probes,s.assumptions.probes);
});

/** C01–C18 are synthetic transcriptions and independent editorial-policy
 * oracles. Their expectations are worked below from the published references,
 * not generated from evaluateComposition, a round engine, or a game session.
 * They establish deterministic interpretation of known data, never win rates,
 * observed activation, projected income, or a validated strategic ranking. */
function compositionFixture():GameState {
 const state=JSON.parse(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8')) as GameState;
 state.assumptions.probes=[];state.assumptions.roundPlans=[];
 state.observed.money=known(25);
 state.observed.nextBlind=known({ante:1,kind:'small',bossId:known('none'),target:known(300),reward:known(3)});
 state.observed.resources={handsPerRound:known(4),discardsPerRound:known(3),handSize:known(8),jokerSlots:known(5)};
 state.observed.deck=known({cards:standardDeck()});
 state.observed.jokers=known([compositionJoker('joker')]);
 return state;
}
function compositionJoker(catalogId:string,counters:JokerInstance['counters']={},instanceId='owned:'+catalogId):JokerInstance {
 return {instanceId,catalogId,counters,edition:known('base'),stickers:known([]),sellValue:known(1)};
}
function compositionOwn(state:GameState,...jokers:JokerInstance[]):void {state.observed.jokers=known(jokers);}
function section(report:CompositionReport,id:CompositionSectionId) {
 const found=report.sections.find(s=>s.id===id);assert.ok(found,`Falta el apartado ${id}`);return found;
}
function sectionValue(report:CompositionReport,id:CompositionSectionId):number {
 const item=section(report,id);assert.equal(item.status,'known',`${id}: ${item.reasons.join(' ')}`);
 assert.notEqual(item.value,null,`${id} no debe inventar un número para datos desconocidos`);return item.value!;
}
function freezeData<T>(value:T):T {
 if(value!==null&&typeof value==='object')for(const child of Object.values(value))freezeData(child);
 return value!==null&&typeof value==='object'?Object.freeze(value):value;
}

test('Composición C01: índice global y seis apartados tienen referencias editoriales independientes',()=>{
 const state=compositionFixture(),before=structuredClone(state),report=evaluateComposition(state);
 assert.equal(report.policy,'composition-1');
 assert.deepEqual(report.sections.map(s=>s.id),['scoring','economy','synergy','deck','growth','resources']);
 // Joker: (stage3 + preparation3 + new-role2)×10 =80.
 // Reserve25/25 gives70; no relation gives0. Resources4/3/8/5 give100.
 assert.equal(sectionValue(report,'scoring'),80);
 assert.equal(sectionValue(report,'economy'),70);
 assert.equal(sectionValue(report,'synergy'),0);
 assert.equal(sectionValue(report,'resources'),100);
 for(const id of ['deck','growth'] as const){
  assert.equal(section(report,id).status,'not-applicable');assert.equal(section(report,id).value,null);
  assert.equal(report.global.weights[id],0);
 }
 for(const id of ['scoring','economy','synergy','resources'] as const)assert.equal(report.global.weights[id],0.25);
 // Mean of the four applicable sections: (80+70+0+100)/4=62.5.
 assert.equal(report.global.status,'known');assert.equal(report.global.value,62.5);
 assert.deepEqual(state,before);
});

test('Composición C02: reserva económica usa el dinero registrado, sin inventar intereses ni ingresos',()=>{
 for(const [money,expected] of [[20,56],[25,70],[50,70]] as const){
  const state=compositionFixture();state.observed.money=known(money);
  const before=structuredClone(state),report=evaluateComposition(state);
  // 70×clamp(money/25,0,1); reserve beyond25 does not grow this component.
  assert.equal(sectionValue(report,'economy'),expected);assert.deepEqual(state,before);
 }
});

test('Composición C03: ingreso condicionado de Golden es un índice, no dinero cobrado',()=>{
 const state=compositionFixture();compositionOwn(state,compositionJoker('joker'),compositionJoker('golden_joker'));
 const before=structuredClone(state),report=evaluateComposition(state);
 // Golden at ante1: (4+3+2)×10=90. Economy70+0.3×90=97.
 assert.equal(sectionValue(report,'scoring'),80);assert.equal(sectionValue(report,'economy'),97);
 // (80+97+0+100)/4=69.25, rounded once to one decimal.
 assert.equal(report.global.value,69.3);
 assert.deepEqual(state,before);assert.deepEqual(state.observed.money,known(25));
 assert.ok(report.limitations.some(s=>/no.*(predice|superar|jugadas)/i.test(s)));
});

test('Composición C04: cero Acero no prepara Mimo ni Steel Joker por su nombre',()=>{
 const state=compositionFixture();compositionOwn(state,compositionJoker('mime'),compositionJoker('steel_joker'));
 const report=evaluateComposition(state);
 assert.equal(report.material.steel,0);
 assert.ok(report.fits.every(f=>f.readiness==='unavailable'));
 // An unavailable effect contributes0 to the structural scoring section,
 // even if its individual descriptive quick-fit cap is nonzero.
 assert.equal(sectionValue(report,'scoring'),0);assert.equal(sectionValue(report,'deck'),0);
 assert.equal(sectionValue(report,'synergy'),0);
 assert.ok(!report.synergies.some(s=>s.kind==='potential'));
});

test('Composición C05: Barón y Mimo pueden apoyarse en reyes sin exigir Acero',()=>{
 const state=compositionFixture();compositionOwn(state,compositionJoker('baron'),compositionJoker('mime'));
 const before=structuredClone(state),report=evaluateComposition(state),relation=report.synergies.find(s=>s.id==='composition-mime-steel-baron');
 assert.equal(report.material.kings,4);assert.equal(report.material.steel,0);
 assert.ok(relation);assert.equal(relation.kind,'potential');
 assert.match(relation.detail,/conservar|reten/i);
 // Both actors have preparation1+2×4/52=15/13. Support100×(15/13)/3=500/13.
 assert.equal(sectionValue(report,'synergy'),38.5);assert.equal(sectionValue(report,'deck'),38.5);
 assert.ok(report.fits.every(f=>f.readiness==='potential'));
 assert.deepEqual(state,before);
});

test('Composición C06: Fotografía y Chad puntúan soporte de figuras, no robos ni activaciones',()=>{
 const state=compositionFixture();compositionOwn(state,compositionJoker('photograph'),compositionJoker('hanging_chad'));
 const before=structuredClone(state),report=evaluateComposition(state);
 const relation=report.synergies.find(s=>s.id==='composition-photo-chad');assert.ok(relation);
 assert.equal(relation.kind,'potential');assert.match(relation.detail,/primera|orden/);
 // Photograph preparation1+2×12/52=19/13; Chad preparation3.
 // Mean actor support: 100×((19/13+3)/2)/3=2900/39=74.35897...
 assert.equal(sectionValue(report,'synergy'),74.4);
 // The material section includes the card-dependent Photograph:100×(19/13)/3=48.7179...
 assert.equal(sectionValue(report,'deck'),48.7);
 assert.equal(report.material.faces,12);assert.deepEqual(state,before);
 state.observed.deckId=known('abandoned');state.observed.deck=known({cards:initial('abandoned')});
 const absent=evaluateComposition(state);assert.equal(sectionValue(absent,'deck'),0);assert.equal(sectionValue(absent,'synergy'),0);
 compositionOwn(state,compositionJoker('photograph'),compositionJoker('hanging_chad'),compositionJoker('pareidolia'));
 const enabled=evaluateComposition(state);
 assert.equal(enabled.material.faces,0,'Physical counts stay physical despite Pareidolia');
 assert.equal(sectionValue(enabled,'deck'),100);assert.equal(sectionValue(enabled,'synergy'),100);
 assert.equal(enabled.synergies.find(s=>s.id==='composition-photo-chad')?.kind,'potential');
});

test('Composición C07: Pareidolia y Bus declaran conflicto sin borrar el crecimiento real',()=>{
 const state=compositionFixture(),bus=compositionJoker('ride_the_bus',{mult:known(20)});
 compositionOwn(state,bus,compositionJoker('pareidolia'));const before=structuredClone(state),report=evaluateComposition(state);
 const relation=report.synergies.find(s=>s.id==='composition-pareidolia-bus');assert.ok(relation);
 assert.equal(relation.kind,'conflict');assert.equal(sectionValue(report,'synergy'),0);
 assert.equal(report.fits.find(f=>f.instanceId===bus.instanceId)?.readiness,'unavailable');
 assert.deepEqual(state,before);assert.deepEqual(bus.counters.mult,known(20));
});

test('Composición C08: datos desconocidos permanecen parciales, diferentes de un cero conocido',()=>{
 const unknownDeck=compositionFixture();compositionOwn(unknownDeck,compositionJoker('photograph'),compositionJoker('hanging_chad'));
 unknownDeck.observed.deck={status:'unknown',reason:'Mazo no transcrito'};
 const missing=evaluateComposition(unknownDeck);
 for(const id of ['deck','synergy'] as const){assert.equal(section(missing,id).status,'partial');assert.equal(section(missing,id).value,null);assert.ok(missing.global.weights[id]>0);}
 assert.equal(missing.global.value,null);assert.equal(missing.global.status,'partial');assert.equal(missing.material.faces,null);
 const knownEmpty=compositionFixture();compositionOwn(knownEmpty,compositionJoker('photograph'),compositionJoker('hanging_chad'));
 knownEmpty.observed.deck=known({cards:initial('abandoned')});
 const absent=evaluateComposition(knownEmpty);assert.equal(sectionValue(absent,'deck'),0);assert.equal(sectionValue(absent,'synergy'),0);
 const counter=compositionFixture();compositionOwn(counter,compositionJoker('green_joker',{greenMult:{status:'unknown',reason:'Mult no transcrito'}}));
 const incomplete=evaluateComposition(counter);
 assert.equal(section(incomplete,'growth').status,'partial');assert.equal(section(incomplete,'growth').value,null);
 assert.equal(section(incomplete,'growth').range?.[1],null,'No fictional100 ceiling for an unknown scalable counter');
 assert.ok(incomplete.global.weights.growth>0);assert.equal(incomplete.global.value,null);
});

test('Composición C09: Brocha usa el tamaño de mano registrado una sola vez',()=>{
 const state=compositionFixture();state.observed.resources.handSize=known(9);
 state.observed.outOfScope=known({vouchers:['v_paint_brush'],consumables:[],pendingTags:[],otherModifiers:[]});
 const before=structuredClone(state),report=evaluateComposition(state);
 // 100×(0.4×4/4+0.2×3/3+0.25×9/8+0.15×5/5)=103.125.
 assert.equal(sectionValue(report,'resources'),103.1);assert.equal(report.global.value,63.3);
 assert.deepEqual(state,before);assert.deepEqual(state.observed.resources.handSize,known(9));
 assert.ok(report.vouchers.some(v=>v.relatedVouchers.includes('v_paint_brush')));
});

test('Composición C10: manos extra ofrecen horizonte a Green, sin registrar crecimiento proyectado',()=>{
 const state=compositionFixture();compositionOwn(state,compositionJoker('green_joker',{greenMult:known(20)}));
 const base=evaluateComposition(state,{ante:1});assert.equal(sectionValue(base,'growth'),90);
 state.observed.resources.handsPerRound=known(5);
 state.observed.outOfScope=known({vouchers:['v_grabber'],consumables:[],pendingTags:[],otherModifiers:[]});
 const before=structuredClone(state),early=evaluateComposition(state,{ante:1}),late=evaluateComposition(state,{ante:8});
 // Future opportunity10×((5−4)/4)×((8−1)/7)=2.5; not+1 real Mult.
 assert.equal(sectionValue(early,'growth'),92.5);
 // At ante8 the future-opportunity term is0, but the recorded20 Mult remains.
 assert.equal(sectionValue(late,'growth'),80);
 assert.ok(early.vouchers.some(v=>v.kind==='potential'&&v.relatedJokers.includes('j_green_joker')));
 assert.deepEqual(state,before);
});

test('Composición C11: vales documentales no acreditan dinero, manos ni efectos H2 nuevos',()=>{
 const state=compositionFixture(),base=evaluateComposition(state);
 state.observed.outOfScope=known({vouchers:['v_tarot_merchant','v_seed_money'],consumables:[],pendingTags:[],otherModifiers:[]});
 const before=structuredClone(state),report=evaluateComposition(state);
 assert.equal(sectionValue(report,'economy'),70);assert.equal(sectionValue(report,'scoring'),sectionValue(base,'scoring'));
 assert.equal(sectionValue(report,'resources'),100);
 assert.ok(report.limitations.some(s=>/v_tarot_merchant/.test(s)&&/H2/.test(s)));
 assert.ok(report.vouchers.some(v=>v.relatedVouchers.includes('v_tarot_merchant')));
 assert.deepEqual(state,before);
});

test('Composición C12: el índice abierto acepta aportes registrados superiores a100',()=>{
 const state=compositionFixture();compositionOwn(state,compositionJoker('green_joker',{greenMult:known(1260)}));
 const before=structuredClone(state),report=evaluateComposition(state,{ante:8});
 // Green late: (stage2+preparation3+new-role2)×10=70.
 // Magnitude10×log2(1+1260/20)=10×log2(64)=60, hence130.
 assert.equal(sectionValue(report,'scoring'),130);assert.equal(sectionValue(report,'growth'),130);
 // Five applicable sections: (130+70+0+130+100)/5=86.
 assert.equal(report.global.value,86);assert.deepEqual(state,before);
});

test('Composición C13: familias se deduplican aunque varios participantes descubran la misma relación',()=>{
 const state=compositionFixture();compositionOwn(state,compositionJoker('photograph'),compositionJoker('hanging_chad'),compositionJoker('pareidolia'));
 const report=evaluateComposition(state),relations=report.synergies.filter(s=>s.id==='composition-photo-chad');
 assert.equal(relations.length,1);assert.equal(sectionValue(report,'synergy'),100);
 assert.equal(new Set(report.synergies.map(s=>s.id)).size,report.synergies.length);
 assert.equal(new Set(relations[0]!.relatedJokers).size,relations[0]!.relatedJokers.length);
});

test('Composición C14: candidatos y escenarios hipotéticos no cambian el índice de la partida real',()=>{
 const state=compositionFixture(),baseline=evaluateComposition(state);
 state.assumptions.probes=[{probeId:'hypothesis',label:'Mano favorable hipotética',playedCardIds:['KS'],discardsRemaining:3,role:'favorable'}];
 state.assumptions.roundPlans=[{planId:'hypothesis',initialHandCardIds:['AS','AH','2S','2H','3S','3H','4S','4H'],events:[{type:'play',cardIds:['AS','AH'],drawnCardIds:[]}]}];
 state.observed.shop=known({shopId:'hypothetical-candidates',cardOffers:[{offerId:'candidate',catalogId:'baron',label:'Candidato no poseído',kind:'joker',price:known(0),edition:known('base'),stickers:known([])}],ignoredOtherOffers:[]});
 const before=structuredClone(state);freezeData(state);const report=evaluateComposition(state);
 assert.deepEqual(report.global,baseline.global);assert.deepEqual(report.sections,baseline.sections);
 assert.deepEqual(report.fits,baseline.fits);assert.deepEqual(state,before);assert.equal(state.revision,0);
});

test('Composición C15: faltar ante o dinero limita sus apartados, sin bloquear recursos independientes',()=>{
 const state=compositionFixture();state.observed.nextBlind={status:'unknown',reason:'Ante no transcrito'};
 const noStage=evaluateComposition(state);
 assert.equal(section(noStage,'scoring').status,'partial');assert.equal(noStage.global.value,null);
 assert.equal(sectionValue(noStage,'economy'),70);assert.equal(sectionValue(noStage,'resources'),100);
 const noMoney=compositionFixture();noMoney.observed.money={status:'unknown',reason:'Saldo no transcrito'};
 const report=evaluateComposition(noMoney);
 assert.equal(section(report,'economy').status,'partial');assert.equal(section(report,'economy').value,null);
 assert.equal(report.global.value,null);assert.equal(report.global.weights.economy,0.25);
 assert.equal(sectionValue(report,'resources'),100);
 const invalid=compositionFixture();invalid.revision=-1;
 const rejected=evaluateComposition(invalid);assert.ok(rejected.errors.length);assert.equal(rejected.global.value,null);
});

test('Composición C16: Observatorio limita puntuación cuando falta comprobar planetas, sin bloquear recursos',()=>{
 const state=compositionFixture();state.observed.outOfScope=known({vouchers:['v_telescope','v_observatory'],consumables:[],pendingTags:[],otherModifiers:[]});
 const unknown=evaluateComposition(state);
 assert.equal(section(unknown,'scoring').status,'partial');assert.equal(section(unknown,'scoring').value,null);
 assert.equal(section(unknown,'scoring').range?.[1],null);
 assert.equal(sectionValue(unknown,'resources'),100);assert.equal(sectionValue(unknown,'economy'),70);
 state.observed.jokerContext=known({consumables:known([])});
 const noPlanets=evaluateComposition(state);assert.equal(sectionValue(noPlanets,'scoring'),80);
 state.observed.jokerContext=known({consumables:known([{instanceId:'planet-observed',catalogId:'jupiter',kind:'planet',edition:'base',sellValue:1,handId:'flush'}])});
 const before=structuredClone(state),held=evaluateComposition(state);
 assert.equal(section(held,'scoring').status,'partial');assert.equal(held.global.value,null);
 assert.equal(sectionValue(held,'resources'),100);assert.deepEqual(state,before);
});

test('Composición C17: Sinergia mide cobertura de la composición, sin declarar inferior un comodín aislado',()=>{
 const state=compositionFixture();compositionOwn(state,compositionJoker('photograph'),compositionJoker('hanging_chad'),compositionJoker('joker'));
 const report=evaluateComposition(state);
 // Photo preparation19/13 + Chad3; Joker is not a participant in this family.
 // Cohesion across three owned effects:100×(19/13+3)/(3×3)=49.57265...
 assert.equal(sectionValue(report,'synergy'),49.6);
 assert.equal(report.synergies.filter(s=>s.id==='composition-photo-chad').length,1);
 assert.equal(report.material.faces,12);
 assert.ok(!report.synergies[0]!.relatedJokers.includes('j_joker'));
 assert.ok(report.global.reasons.some(s=>/por sí solo|vender|comprar/.test(s)));
});

test('Composición C18: un recurso desconocido mantiene su peso e intervalo abierto',()=>{
 const state=compositionFixture();state.observed.resources.handsPerRound={status:'unknown',reason:'Manos no transcritas'};
 const report=evaluateComposition(state),resources=section(report,'resources');
 // Known discard/hand-size/slot terms20+25+15=60; unknown hands have no100 cap.
 assert.equal(resources.status,'partial');assert.equal(resources.value,null);assert.deepEqual(resources.range,[60,null]);
 assert.equal(report.global.weights.resources,0.25);assert.equal(report.global.value,null);
 // Four applicable sections retain the resource contribution: (80+70+0+60)/4=52.5 lower bound.
 assert.deepEqual(report.global.range,[52.5,null]);assert.equal(sectionValue(report,'scoring'),80);
});
