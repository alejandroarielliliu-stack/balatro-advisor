import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import type {GameStateV02} from '../src/state/model.js';
import {guideBlindChoice,blindGuidanceIsCurrent} from '../src/advisor/blind-guidance.js';
import type {BlindGuidanceOptions} from '../src/advisor/blind-guidance.js';
import {CONFIRMED_STORAGE_KEY,createConfirmedStore} from '../src/storage/confirmed-store.js';
import {known,success,MemoryStorage} from './helpers.js';
import {deckCards} from '../src/rules/core.js';

interface BlindCase {
 id:string;area:'blind';state:GameStateV02;options:BlindGuidanceOptions;
 mechanicalOracles:{
  cashoutIfWon?:{remainingHands:number[];earned:number[];balanceAfter:number[];minimumRemainingHandsToMatchSkipIncome:number|null};
 };
 behaviorOracle:{allowedPreferred:('play'|'skip'|null)[];automaticPlayForbidden?:boolean;mustHaveUsefulOrientation?:boolean;mustAbstainInStrictMode?:boolean};
}
const fixtureBytes=readFileSync(new URL('../../evaluation/fixtures/decisiones-visibles-development.json',import.meta.url));
const bank=JSON.parse(fixtureBytes.toString('utf8')) as {cases:({id:string;area:string}|BlindCase)[]};
const cases=bank.cases.filter((entry):entry is BlindCase=>entry.area==='blind');
const fixture=(id:string):BlindCase=>{const entry=cases.find(entry=>entry.id===id);assert.ok(entry,id);return structuredClone(entry);};
const guidance=(id:string)=>{const entry=fixture(id);return success(guideBlindChoice(entry.state,entry.options));};

test('STR02 selección forzosa: no proyecta cobro conservando un Golden que Dagger podría destruir',()=>{
 const entry=fixture('DV-BLIND-01');entry.state.observed.money=known(6);
 entry.state.observed.jokers=known([
  {instanceId:'dagger',catalogId:'ceremonial_dagger',edition:known('base'),stickers:known([]),sellValue:known(3),counters:{mult:known(0)}},
  {instanceId:'golden',catalogId:'golden_joker',edition:known('base'),stickers:known([]),sellValue:known(3),counters:{}}
 ]);
 const before=structuredClone(entry.state),report=success(guideBlindChoice(entry.state));
 assert.equal(report.cashflowReference,null);assert.equal(report.recommendation.status,'tradeoff');assert.notEqual(report.recommendation.preferred,'play');
 assert.match(report.reasons.join(' '),/Ceremonial Dagger.*destruir/);assert.deepEqual(entry.state,before);
});

// The expected cash amounts and policy counterexamples were frozen before this
// evaluator ran. These are synthetic acceptance cases, not Balatro observations.
test('STR02a banco independiente conserva SHA, orden y once casos de ciega',()=>{
 const freeze=JSON.parse(readFileSync(new URL('../../evaluation/fixtures/decisiones-visibles-freeze.json',import.meta.url),'utf8')) as {
  freezeVersion:string;baselineRevision:string;fixtures:{path:string;sha256:string;caseIds:string[];caseCount:number}[];
 };
 const locked=freeze.fixtures.find(entry=>entry.path==='evaluation/fixtures/decisiones-visibles-development.json');assert.ok(locked);
 assert.equal(freeze.freezeVersion,'decisiones-visibles-freeze-1');
 assert.equal(freeze.baselineRevision,'b8420929105254fa36991eaa8b3ad6d6f47e3bcb');
 assert.equal(locked.sha256,'5f29f0799f160a53e080add06d0e950339f70c3d001f659c59151c746d3d0492');
 assert.equal(createHash('sha256').update(fixtureBytes).digest('hex'),locked.sha256);
 assert.deepEqual(bank.cases.map(entry=>entry.id),locked.caseIds);assert.equal(bank.cases.length,16);assert.equal(locked.caseCount,16);
 assert.deepEqual(cases.map(entry=>entry.id),Array.from({length:11},(_,i)=>`DV-BLIND-${String(i+1).padStart(2,'0')}`));
});

test('STR02a contratos congelados: orientación sin planes, evidencia honesta e inmutabilidad',()=>{
 for(const entry of cases){
  const input=structuredClone({state:entry.state,options:entry.options}),before=structuredClone(input),report=success(guideBlindChoice(input.state,input.options));
  assert.equal(report.contract,'blind-guidance-1',entry.id);assert.equal(report.policyVersion,'blind-guidance-2',entry.id);assert.equal(report.basis,'heuristic');
  assert.equal(report.projected,true);assert.equal(report.exhaustive,false);assert.equal(report.binding.runId,input.state.runId);assert.equal(report.binding.revision,input.state.revision);
  assert.ok(entry.behaviorOracle.allowedPreferred.includes(report.recommendation.preferred),entry.id);
  if(entry.behaviorOracle.automaticPlayForbidden)assert.notEqual(report.recommendation.preferred,'play',entry.id);
  if(entry.behaviorOracle.mustHaveUsefulOrientation)assert.notEqual(report.recommendation.status,'abstain',entry.id);
  if(entry.behaviorOracle.mustAbstainInStrictMode)assert.equal(report.recommendation.status,'abstain',entry.id);
  assert.ok(report.recommendation.reason.trim().length>0);assert.ok(report.conditions.length>0);assert.ok(report.limitations.length>0);
  assert.equal(report.evidence.status,'provisional');assert.equal(report.evidence.verification,'static_inspection_and_heuristic');assert.equal(report.evidence.observedInGame,false);
  assert.equal('winProbability'in report,false);assert.equal('confidencePercent'in report,false);assert.equal('predictedScore'in report,false);assert.equal('state'in report,false);
  assert.deepEqual(input,before,entry.id+' must not apply a projected payout, draw, skip or counter');
 }
});

test('STR02a Economía4: umbral monetario1 con cobros literales3..7, sin predecir manos sobrantes',()=>{
 const entry=fixture('DV-BLIND-01'),report=success(guideBlindChoice(entry.state,entry.options)),cash=report.cashflowReference;assert.ok(cash);
 const oracle=entry.mechanicalOracles.cashoutIfWon;assert.ok(oracle);
 // Blue has five hands; a won round used at least one. $3 reward, zero
 // interest on the original $4: the literal independent table is $3..$7.
 assert.deepEqual(oracle.remainingHands,[0,1,2,3,4]);assert.deepEqual(oracle.earned,[3,4,5,6,7]);assert.deepEqual(oracle.balanceAfter,[7,8,9,10,11]);
 assert.equal(cash.basis,'conditional_cashflow_only');assert.equal(cash.skipImmediateIncome,4);
 assert.deepEqual(cash.rows.map(row=>row.handsRemaining),oracle.remainingHands);assert.deepEqual(cash.rows.map(row=>row.earned),oracle.earned);assert.deepEqual(cash.rows.map(row=>row.balanceAfter),oracle.balanceAfter);
 assert.equal(cash.minimumHandsToMatchSkip,1);assert.equal(oracle.minimumRemainingHandsToMatchSkipIncome,1);assert.equal(cash.provisional,true);
 assert.equal(report.recommendation.status,'conditional');assert.equal(report.recommendation.preferred,'play');assert.equal(report.recommendation.ruleId,'BG-CASH-THRESHOLD');
 assert.match(report.recommendation.reason,/al menos 1 mano sin usar/);assert.match(cash.assumptions.join(' '),/no predice/);assert.match(cash.assumptions.join(' '),/tienda.*no tienen precio/);
 assert.deepEqual(report.survival,{status:'not_evaluated',risk:'unknown',source:null});assert.equal(report.askRisk,true);
});

test('STR02a Economía20: cobro27..31 no compensa automáticamente salto40',()=>{
 const entry=fixture('DV-BLIND-02'),report=success(guideBlindChoice(entry.state,entry.options)),cash=report.cashflowReference;assert.ok(cash);
 const oracle=entry.mechanicalOracles.cashoutIfWon;assert.ok(oracle);
 // Independent frozen amounts: original20, reward3, interest4, unused0..4.
 assert.deepEqual(oracle.earned,[7,8,9,10,11]);assert.deepEqual(oracle.balanceAfter,[27,28,29,30,31]);
 assert.equal(cash.skipImmediateIncome,20);assert.deepEqual(cash.rows.map(row=>row.earned),oracle.earned);assert.deepEqual(cash.rows.map(row=>row.balanceAfter),oracle.balanceAfter);
 assert.equal(cash.minimumHandsToMatchSkip,null);assert.equal(oracle.minimumRemainingHandsToMatchSkipIncome,null);
 assert.notEqual(report.recommendation.preferred,'play');assert.equal(report.recommendation.ruleId,'BG-REWARD-TRADEOFF');assert.match(report.recommendation.reason,/20.*inmediatos/);
 assert.ok(report.recommendation.reason.includes('$11'));assert.match(report.recommendation.title,/tienda/i);assert.equal(report.askNextBlindPlan,true);
 assert.match(report.conditions.join(' '),/tienda.*no tienen precio/);assert.equal(report.survival.status,'not_evaluated');
});

function guideEconomySmall(){
 const {state}=fixture('DV-BLIND-02');
 assert.ok(state.phase==='blind_select'&&state.observed.nextBlind.status==='known');
 state.observed.nextBlind.value.ante=2;state.observed.nextBlind.value.target=known(800);
 state.observed.money=known(40);
 return state;
}

test('XII-067: Economy leaves $80 vs at most $52 on a one-hand win, but the next shop changes the choice',()=>{
 const state=guideEconomySmall(),before=structuredClone(state);
 const undecided=success(guideBlindChoice(state)),ref=undecided.cashflowReference;assert.ok(ref);
 assert.equal(ref.skipImmediateIncome,40);assert.deepEqual(ref.rows.map(row=>row.balanceAfter),[48,49,50,51,52]);
 assert.equal(undecided.askNextBlindPlan,true);assert.equal(undecided.recommendation.preferred,null);
 assert.equal(success(guideBlindChoice(state,{risk:'comfortable'})).recommendation.preferred,null,'Confidence on the current blind does not answer readiness for the next one');
 const ready=success(guideBlindChoice(state,{nextBlindPlan:'ready'}));
 assert.equal(ready.recommendation.preferred,'skip');assert.equal(ready.recommendation.status,'conditional');
 const explanation=[ready.recommendation.reason,...ready.reasons,...ready.conditions].join(' ');
 for(const amount of [80,52,28])assert.ok(explanation.includes('$'+amount),'Explain $'+amount);
 assert.match(ready.sacrifices.join(' '),/tienda/i);
 assert.equal(success(guideBlindChoice(state,{nextBlindPlan:'need_shop'})).recommendation.preferred,'play');
 assert.equal(success(guideBlindChoice(state,{nextBlindPlan:'need_shop',risk:'tight'})).recommendation.preferred,null);
 assert.equal(success(guideBlindChoice(state,{nextBlindPlan:'ready',risk:'tight'})).recommendation.preferred,'skip');
 assert.equal(blindGuidanceIsCurrent(ready,state,{nextBlindPlan:'ready'}),true);
 assert.equal(blindGuidanceIsCurrent(ready,state,{nextBlindPlan:'need_shop'}),false);
 assert.deepEqual(state,before);
});

test('Economy skip stays within its cash, inventory, deck, queue and evidence conditions',()=>{
 const ordinary=guideEconomySmall();
 const eligible=(state:GameStateV02)=>success(guideBlindChoice(state,{nextBlindPlan:'ready'}));
 const golden=structuredClone(ordinary);
 golden.observed.jokers=known([{instanceId:'golden',catalogId:'golden_joker',edition:known('base'),stickers:known([]),sellValue:known(3),counters:{}}]);
 const cash=eligible(golden);
 assert.equal(cash.recommendation.preferred,'skip');assert.equal(cash.cashflowReference?.rows.at(-1)?.balanceAfter,56,'Includes Golden in the comparison');
 const grows=structuredClone(ordinary);
 grows.observed.jokers=known([{instanceId:'green',catalogId:'green_joker',edition:known('base'),stickers:known([]),sellValue:known(3),counters:{greenMult:known(2)}}]);
 const goldCard=structuredClone(ordinary),cards=deckCards(goldCard);
 cards[0]!.enhancement='gold';goldCard.observed.deck=known({cards});
 const missing=structuredClone(ordinary);missing.observed.money={status:'unknown',reason:'Saldo sin transcribir.'};
 const casesToKeep=[grows,goldCard,missing,...['DV-BLIND-01','DV-BLIND-04','DV-BLIND-06','DV-BLIND-07','DV-BLIND-10'].map(id=>fixture(id).state)];
 for(const state of casesToKeep){const result=eligible(state);assert.notEqual(result.recommendation.preferred,'skip',state.runId);assert.equal(result.askNextBlindPlan,false,state.runId);}
 assert.equal(success(guideBlindChoice(ordinary,{nextBlindPlan:'ready',requireObserved:true})).recommendation.status,'abstain');
 assert.equal(guideBlindChoice(ordinary,{nextBlindPlan:'always'} as never).ok,false);
});

test('STR02a D6 pendiente permite orientación útil sin ejecutar efecto ni tratarlo como cero',()=>{
 const report=guidance('DV-BLIND-03'),profile=report.tag.profile;assert.ok(profile);
 assert.equal(report.tag.id,'tag_d_six');assert.equal(profile.execution,'not_implemented');assert.equal(profile.timing,'next_shop');assert.equal(profile.evidence.observedInGame,false);
 assert.equal(report.cashflowReference,null);assert.ok(['conditional','tradeoff'].includes(report.recommendation.status));
 assert.ok(fixture('DV-BLIND-03').behaviorOracle.allowedPreferred.includes(report.recommendation.preferred));
 assert.match(profile.benefit,/próxima tienda/);assert.match(profile.conditions.join(' '),/no.*(?:ilimitadas|todas gratuitas)/i);
 assert.match(report.limitations.join(' '),/efecto no se ejecuta/);assert.match(report.reasons.join(' '),/visita.*tienda/);
 assert.equal(report.survival.status,'not_evaluated');assert.equal(report.askRisk,true);
});

test('STR02a Inversión conserva25 diferidos y saldo real4, sin dinero disponible29',()=>{
 const entry=fixture('DV-BLIND-04'),before=structuredClone(entry.state),report=success(guideBlindChoice(entry.state,entry.options)),profile=report.tag.profile;assert.ok(profile);
 assert.equal(profile.timing,'boss_cashout');assert.match(profile.benefit,/25 dólares al superar una ciega jefe/);
 assert.match(profile.conditions.join(' '),/no está disponible al saltar/);assert.match(profile.conditions.join(' '),/no garantiza/);
 assert.notEqual(report.recommendation.preferred,'play');assert.equal(report.recommendation.ruleId,'BG-REWARD-TRADEOFF');assert.equal(report.cashflowReference,null);
 assert.deepEqual(entry.state.observed.money,known(4));assert.deepEqual(entry.state,before);
});

test('STR02a riesgo declarado es una entrada del jugador y retira la preferencia automática',()=>{
 const report=guidance('DV-BLIND-05');assert.deepEqual(report.survival,{status:'player_reported',risk:'tight',source:'player_declaration'});
 assert.notEqual(report.recommendation.preferred,'play');assert.equal(report.recommendation.ruleId,'BG-DECLARED-RISK');assert.equal(report.askRisk,false);
 assert.match(report.conditions.join(' '),/valoración declarada/);assert.match(report.conditions.join(' '),/no demuestra.*siguiente ciega/);
 const entry=fixture('DV-BLIND-01'),comfortable=success(guideBlindChoice(entry.state,{risk:'comfortable'}));
 assert.deepEqual(comfortable.survival,{status:'player_reported',risk:'comfortable',source:'player_declaration'});assert.equal(comfortable.askRisk,false);
 assert.match(comfortable.conditions.join(' '),/no una certificación del motor/);
});

test('STR02a cola Double o desconocida no se ignora ni publica ingreso de salto garantizado',()=>{
 for(const id of ['DV-BLIND-06','DV-BLIND-07']){
  const entry=fixture(id),before=structuredClone(entry.state),report=success(guideBlindChoice(entry.state,entry.options));
  assert.equal(report.cashflowReference,null,id);assert.notEqual(report.recommendation.preferred,'play',id);assert.equal(report.recommendation.ruleId,'BG-TAG-QUEUE');
  assert.equal(report.survival.status,'not_evaluated');assert.ok(report.reasons.some(reason=>reason.includes('tienda')));assert.deepEqual(entry.state,before);
  if(id==='DV-BLIND-06'){assert.match(report.conditions.join(' '),/Double pendiente/);assert.match(report.conditions.join(' '),/no se simula/i);}
  else{assert.match(report.conditions.join(' '),/cola.*no está confirmada/);assert.match(report.conditions.join(' '),/no se presupone vacía/);}
 }
});

test('STR02a Throwback y Popcorn muestran crecimiento o desgaste sin aplicarlos ni monetizarlos',()=>{
 const throwback=fixture('DV-BLIND-08'),beforeThrowback=structuredClone(throwback.state),growth=success(guideBlindChoice(throwback.state,throwback.options));
 assert.notEqual(growth.recommendation.preferred,'play');assert.equal(growth.recommendation.ruleId,'BG-PERSISTENT-TRADEOFF');
 assert.match(growth.reasons.join(' '),/Throwback.*actualmente 2/);assert.match(growth.reasons.join(' '),/no se convierte.*dinero.*garantizada/);
 assert.match(growth.recommendation.reason,/utilidad depende/);assert.deepEqual(throwback.state,beforeThrowback);
 const popcorn=fixture('DV-BLIND-11'),beforePopcorn=structuredClone(popcorn.state),wear=success(guideBlindChoice(popcorn.state,popcorn.options));
 assert.notEqual(wear.recommendation.preferred,'play');assert.equal(wear.recommendation.ruleId,'BG-PERSISTENT-TRADEOFF');assert.match(wear.reasons.join(' '),/Popcorn pierde Mult al terminar una ronda/);
 assert.match(wear.sacrifices.join(' '),/Jugar puede consumir/);assert.ok(wear.reasons.some(reason=>reason.includes('tienda')));assert.deepEqual(popcorn.state,beforePopcorn);
 if(popcorn.state.observed.jokers.status!=='known')throw Error('fixture');assert.deepEqual(popcorn.state.observed.jokers.value[0]!.counters.mult,known(12));
});

test('STR02a strict conserva abstención y Jefe no ofrece una alternativa de salto',()=>{
 const strict=guidance('DV-BLIND-09');assert.equal(strict.recommendation.status,'abstain');assert.equal(strict.recommendation.preferred,null);
 assert.equal(strict.recommendation.ruleId,'BG-STRICT-EVIDENCE');assert.equal(strict.cashflowReference,null);assert.equal(strict.evidence.observedInGame,false);assert.match(strict.recommendation.reason,/contrastadas en una partida/);
 const boss=guidance('DV-BLIND-10');assert.notEqual(boss.recommendation.preferred,'skip');assert.equal(boss.recommendation.ruleId,'BG-BOSS-NO-SKIP');assert.match(boss.recommendation.reason,/no admite salto/);
 assert.match(boss.recommendation.reason,/no demuestra que puedas superarla/);assert.deepEqual(boss.sacrifices,[]);assert.equal(boss.cashflowReference,null);
});

test('STR02a vigencia incluye estado completo y opciones normalizadas aunque la revisión sea igual',()=>{
 const entry=fixture('DV-BLIND-01'),report=success(guideBlindChoice(entry.state,entry.options));
 assert.equal(blindGuidanceIsCurrent(report,entry.state,entry.options),true);assert.equal(blindGuidanceIsCurrent(report,entry.state),true);
 assert.equal(blindGuidanceIsCurrent(report,entry.state,{risk:'unknown',requireObserved:false}),true);
 const changed=structuredClone(entry.state);changed.observed.money=known(5);assert.equal(changed.revision,entry.state.revision);assert.equal(blindGuidanceIsCurrent(report,changed,entry.options),false);
 const revision=structuredClone(entry.state);revision.revision++;assert.equal(blindGuidanceIsCurrent(report,revision,entry.options),false);
 const tag=structuredClone(entry.state);if(tag.phase!=='blind_select')throw Error('fixture');tag.phaseData.skipTag=known('tag_d_six');assert.equal(blindGuidanceIsCurrent(report,tag,entry.options),false);
 assert.equal(blindGuidanceIsCurrent(report,entry.state,{risk:'comfortable'}),false);assert.equal(blindGuidanceIsCurrent(report,entry.state,{requireObserved:true}),false);
 assert.equal(blindGuidanceIsCurrent(report,entry.state,{unexpected:true} as never),false);assert.equal(blindGuidanceIsCurrent(report,{schemaVersion:'invented'}),false);
});

test('STR02a errores de estructura y opciones no producen orientación; contexto incompatible se comunica',()=>{
 const entry=fixture('DV-BLIND-01');assert.equal(guideBlindChoice({schemaVersion:'invented'}).ok,false);
 for(const options of [{risk:'invented'},{requireObserved:'yes'},{unexpected:true},null,[]])assert.equal(guideBlindChoice(entry.state,options as never).ok,false);
 const wrong=structuredClone(entry.state);wrong.phase='shop';wrong.phaseData={origin:{status:'unknown',reason:'Caso defensivo de fase.'}};
 const phase=guideBlindChoice(wrong);assert.equal(phase.ok,false);if(!phase.ok)assert.ok(phase.errors.some(error=>error.code==='wrong_phase'));
 const mods=structuredClone(entry.state);mods.observed.modsPresent=known(true);const incompatible=success(guideBlindChoice(mods));
 assert.equal(incompatible.recommendation.status,'abstain');assert.equal(incompatible.recommendation.preferred,null);assert.equal(incompatible.recommendation.ruleId,'BG-COMPATIBILITY');assert.equal(incompatible.cashflowReference,null);
});

test('STR02a consultar no escribe y los perfiles devueltos no comparten mutaciones entre informes',()=>{
 const entry=fixture('DV-BLIND-03'),memory=new MemoryStorage();success(createConfirmedStore(()=>memory).initialize(entry.state));
 const original=memory.getItem(CONFIRMED_STORAGE_KEY),writes=memory.writes,before=structuredClone(entry.state),first=success(guideBlindChoice(entry.state,entry.options));
 assert.ok(first.tag.profile);first.tag.profile.benefit='Modificado solo en este informe';first.tag.profile.conditions.push('No debe filtrarse al catálogo');
 const second=success(guideBlindChoice(entry.state,entry.options));assert.ok(second.tag.profile);
 assert.notEqual(second.tag.profile.benefit,first.tag.profile.benefit);assert.equal(second.tag.profile.conditions.includes('No debe filtrarse al catálogo'),false);
 assert.deepEqual(entry.state,before);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),original);assert.equal(memory.writes,writes);
});
