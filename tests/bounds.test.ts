import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {boundRoundScore} from '../src/rules/upper-bound.js';
import {compareShopBounds} from '../src/evaluation/shop-bounds.js';
import {scoreHand} from '../src/rules/scoring.js';
import {parseState} from '../src/state/validation.js';
import type {GameState} from '../src/state/model.js';
import {HAND_BASES,standardDeck} from '../src/catalog/initial.js';
import type {HandId} from '../src/catalog/initial.js';
import {known,success} from './helpers.js';
const fixture=()=>success(parseState(readFileSync(new URL('../../examples/s09-bound.json',import.meta.url),'utf8')));
const mutation={expectedRevision:0,updatedAt:'2026-10-10T18:00:00Z'};
const unknown={status:'unknown',reason:'No observado'} as const;
function bases(s:GameState){
 const values=Object.fromEntries(Object.entries(HAND_BASES).map(([id,[chips,mult]])=>[id,known({level:1,chips,mult})])) as Record<HandId,ReturnType<typeof known<{level:number;chips:number;mult:number}>>>;
 s.observed.handBases=known({values});return values;
}
// S09 oracle predates this module: 5*(100+55+90+80)*(8+4+20+16+45).
test('T07c S09: 151125, Joker→Abstract 169000; catálogo lleno rechaza compra directa',()=>{
 const s=fixture(),snapshot=structuredClone(s),b=success(boundRoundScore(s));
 assert.equal(b.chipsPerHandUpper,325);assert.equal(b.multPerHandUpper,93);assert.equal(b.roundScoreUpper,151125);
 assert.equal(b.verdict,'insufficient_under_model');assert.equal(b.horizonRounds,1);
 const result=success(compareShopBounds(s,mutation));
 assert.equal(result.alternatives.length,12);assert.equal(result.everyLegalEnumeratedInsufficient,true);
 const direct=result.alternatives.find(a=>a.action.type==='buy')!;assert.ok(!direct.shop.ok);assert.equal(direct.shop.errors[0]!.code,'no_slots');
 const replacement=result.alternatives.find(a=>a.action.type==='replace'&&a.action.sellInstanceId==='joker')!;
 assert.equal(success(replacement.bound!).roundScoreUpper,169000);assert.deepEqual(success(replacement.shop).state.observed.money,known(27));
 assert.deepEqual(s,snapshot);assert.equal(result.coverage.exhaustive,false);
});
test('T07c reemplazos: pérdida de contribuciones y reinicio por venta, sin transferir Green',()=>{
 const rows=success(compareShopBounds(fixture(),mutation)).alternatives;
 // Independent literals: remove Half=20, Banner=90 chips, Scholar=80/16, Green=45; add Abstract=15.
 const expected:Record<string,number>={joker:169000,half_joker:143000,banner:126900,scholar:112700,green_joker:102375};
 for(const a of rows)if(a.action.type==='replace')assert.equal(success(a.bound!).roundScoreUpper,expected[a.action.sellInstanceId]);
});
test('T07c una cota alta no demuestra supervivencia; veredicto no concluyente',()=>{
 const s=fixture();s.observed.jokers=known([]);s.observed.nextBlind=known({ante:1,kind:'small',bossId:known('none'),target:known(300),reward:unknown});
 const b=success(boundRoundScore(s));assert.equal(b.roundScoreUpper,6200);assert.equal(b.verdict,'not_ruled_out');
 assert.match(b.conclusion,/No demuestra/);
});
test('T07c bases explícitas completas: máximos independientes, nunca solo la mano favorable',()=>{
 const s=fixture();s.observed.jokers=known([]);const values=bases(s);values.pair=known({level:2,chips:200,mult:2});
 assert.equal(success(boundRoundScore(s)).roundScoreUpper,10200); // (200+55)*8*5; base chips and Mult from different hands.
 values.flush=unknown;assert.ok(!boundRoundScore(s).ok);
});
test('T07c datos críticos ausentes o cobertura incompatible invalidan únicamente la cota afectada',()=>{
 const mutations:((s:GameState)=>void)[]=[
 s=>{s.observed.deck=unknown;},s=>{s.observed.handBases=unknown;},s=>{s.observed.jokers=unknown;},
 s=>{s.observed.resources.handsPerRound=unknown;},s=>{s.observed.outOfScope=unknown;},
 s=>{s.observed.nextBlind=unknown;},s=>{if(s.observed.jokers.status==='known')s.observed.jokers.value[4]!.counters.greenMult=unknown;},
 s=>{const cards=standardDeck();cards[0]!.enhancement='bonus';s.observed.deck=known({cards});},
 s=>{if(s.observed.jokers.status==='known')s.observed.jokers.value[0]!.catalogId='blueprint';},
 s=>{s.observed.nextBlind=known({ante:9,kind:'small',bossId:known('none'),target:known(1),reward:unknown});}
 ];
 for(const change of mutations){const s=fixture();change(s);assert.ok(!boundRoundScore(s).ok);}
 const s=fixture();s.observed.money=unknown;s.observed.shop=unknown;if(s.observed.nextBlind.status==='known')s.observed.nextBlind.value.reward=unknown;
 assert.ok(boundRoundScore(s).ok); // economics is not a dependency of an inventory-only proof.
});
test('T07c Psychic elimina Half; Water elimina Banner; no ignora reglas de jefe',()=>{
 const s=fixture();s.observed.nextBlind=known({ante:1,kind:'boss',bossId:known('the_psychic'),target:known(600),reward:known(5)});
 assert.equal(success(boundRoundScore(s)).roundScoreUpper,118625); // 325*(93-20)*5
 s.observed.nextBlind=known({ante:2,kind:'boss',bossId:known('the_water'),target:known(1600),reward:known(5)});
 assert.equal(success(boundRoundScore(s)).roundScoreUpper,109275); // (325-90)*93*5
});
test('T07c evidencia provisional, modo estricto, revisión antigua y ausencia de certeza con precio desconocido',()=>{
 const s=fixture();const r=boundRoundScore(s);assert.ok(r.ok);assert.equal(r.evidence.verifiedAgainstGame,false);
 assert.ok(r.evidence.limitations.some(e=>e.ruleId==='green.changes'));
 const strict=boundRoundScore(s,{requireObserved:true});assert.ok(!strict.ok);assert.equal(strict.errors[0]!.code,'pending_rule');
 assert.ok(!compareShopBounds(s,{...mutation,expectedRevision:7}).ok);
 if(s.observed.shop.status==='known')s.observed.shop.value.cardOffers[0]!.price=unknown;
 const partial=success(compareShopBounds(s,mutation));assert.equal(partial.everyLegalEnumeratedInsufficient,false);assert.ok(partial.alternatives[0]!.bound?.ok);
 s.observed.shop=unknown;const missing=success(compareShopBounds(s,mutation));assert.equal(missing.everyLegalEnumeratedInsufficient,false);assert.ok(missing.enumerationErrors.length>0);
});
test('T07c una rama sin Green sigue calculable aunque el contador de conservar sea desconocido',()=>{
 const s=fixture();if(s.observed.jokers.status==='known')s.observed.jokers.value[4]!.counters.greenMult=unknown;
 const rows=success(compareShopBounds(s,mutation));assert.equal(rows.everyLegalEnumeratedInsufficient,false);assert.equal(rows.alternatives[0]!.bound?.ok,false);
 const sold=rows.alternatives.find(a=>a.action.type==='replace'&&a.action.sellInstanceId==='green_joker')!;
 assert.equal(success(sold.bound!).roundScoreUpper,102375);
});
test('T07c rango numérico y determinismo; no devuelve infinito como prueba',()=>{
 const s=fixture();const b=bases(s);b.high_card=known({level:1,chips:Number.MAX_SAFE_INTEGER,mult:1});
 const r=boundRoundScore(s);assert.ok(!r.ok);assert.equal(r.errors[0]!.code,'numeric_range');
 assert.deepEqual(boundRoundScore(fixture()),boundRoundScore(fixture()));
});
test('T07c consistencia interna: muestra determinista de manos puntuadas nunca supera la cota',()=>{
 const hands=[['KS'],['8S','8H'],['8S','8H','8C'],['AS','AH','AC','AD','KS'],['2S','4S','6S','8S','10S'],['AS','2H','3C','4D','5S']];
 for(const hand of hands)for(const discards of [0,1,3]){
   const s=fixture();const b=success(boundRoundScore(s));const score=success(scoreHand(s,{cardIds:hand,discardsRemaining:discards}));assert.ok(score.score<=b.scorePerHandUpper);
 }
 // This is a consistency test, not the independent oracle or a proof by exhaustive enumeration.
});
test('T07c demo CLI muestra insuficiencia del modelo sin afirmar una puntuación realizable',()=>{
 const output=execFileSync(process.execPath,[fileURLToPath(new URL('../src/demo-bound.js',import.meta.url))],{encoding:'utf8'});
 assert.match(output,/151125/);assert.match(output,/169000/);assert.match(output,/MODELO PROVISIONAL/);
});
