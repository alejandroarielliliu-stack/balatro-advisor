import test from 'node:test';
import assert from 'node:assert/strict';
import {createNewRun} from '../src/run/start.js';
import {freshJokerInstance} from '../src/rules/shop.js';
import {inspectShopDecision} from '../src/advisor/decision.js';
import type {ShopDecision} from '../src/advisor/decision.js';
import type {ShopSnapshot} from '../src/advisor/shop-context.js';
import {buildShopAdviceSummary} from '../src/ui/shop-advice-summary.js';
import {known,success} from './helpers.js';

function fixture(money=25){
 const state=success(createNewRun({runId:'summary',updatedAt:'2026-10-18T12:00:00Z',deckId:'blue',profileConfirmed:true}));
 state.phase='shop';state.phaseData={origin:known({ante:1,kind:'small'})};state.observed.money=known(money);
 const snapshot:ShopSnapshot={id:'observed',jokers:[],vouchers:[],packs:[],rerollCost:5};
 return {state,snapshot};
}
const offer=(catalogId:string,price:number|null,offerId=catalogId)=>({catalogId,price,offerId,edition:'base',stickers:[] as string[]});
function inspect(f:ReturnType<typeof fixture>,strict=false):ShopDecision {
 f.state.observed.shop=known({shopId:f.snapshot.id,cardOffers:f.snapshot.jokers.map(o=>({kind:'joker' as const,offerId:o.offerId,catalogId:o.catalogId,label:o.catalogId,price:o.price===null?{status:'unknown' as const,reason:'Precio no observado'}:known(o.price),edition:known(o.edition),stickers:known(o.stickers)})),voucherOffers:f.snapshot.vouchers.map(o=>({offerId:o.offerId,catalogId:o.catalogId,price:o.price===null?{status:'unknown' as const,reason:'Precio no observado'}:known(o.price)})),packOffers:[],ignoredOtherOffers:[]});
 return success(inspectShopDecision(f.state,f.snapshot,{requireObserved:strict}));
}

test('UX01: Joker +4 is an own effect, not a hand score delta, with H2 cost $2 and balance $23',()=>{
 const f=fixture();f.snapshot.jokers=[offer('joker',2)];const decision=inspect(f),s=buildShopAdviceSummary(decision);
 assert.equal(s.title,decision.context.recommendation.title);assert.equal(s.status,'conditional');
 assert.equal(s.benefit,'+4 Mult propio; no es el cambio de puntuación total de la mano.');
 assert.match(s.sacrifice!,/Coste neto \$2; quedan \$23/);assert.equal(s.pending,null);
 assert.equal(s.scope,'Heurístico · supervivencia sin evaluar · reglas provisionales');
});
test('UX01: Abstract can summarize +6 own Mult despite an already occupied Mult role',()=>{
 const f=fixture(12);f.state.observed.jokers=known([freshJokerInstance('joker','owned')]);f.snapshot.jokers=[offer('abstract_joker',4)];
 const s=buildShopAdviceSummary(inspect(f));assert.match(s.benefit!,/^\+6 Mult propio/);assert.match(s.sacrifice!,/Coste neto \$4; quedan \$8/);
});
test('UX01: replacement preserves hold and spells out Popcorn remaining mult=4 at net zero',()=>{
 const f=fixture(15),popcorn=freshJokerInstance('popcorn','old');popcorn.counters.mult=known(4);popcorn.sellValue=known(2);f.state.observed.jokers=known([popcorn]);f.snapshot.jokers=[{...offer('joker',2),replacementId:'old'}];
 const d=inspect(f),s=buildShopAdviceSummary(d);assert.equal(s.status,'tie');assert.deepEqual(s.choices.map(c=>c.id),['hold','joker']);assert.match(s.benefit!,/^\+4 Mult propio/);assert.match(s.sacrifice!,/Coste neto \$0; quedan \$15/);assert.match(s.sacrifice!,/Popcorn \(mult=4\)/);assert.match(s.sacrifice!,/no se heredan/);assert.equal(s.pending,null);
});
test('UX01: distinct purchases keep recommendation order and no arbitrarily preferred numeric benefit',()=>{
 const f=fixture();f.snapshot.jokers=[offer('stuntman',7,'chips'),offer('joker',2,'mult')];const d=inspect(f),s=buildShopAdviceSummary(d);
 assert.equal(s.status,'tie');assert.deepEqual(s.choices.map(c=>c.id),d.context.recommendation.offerIds);assert.deepEqual(s.choices.map(c=>c.moneyAfter),[18,23]);assert.match(s.benefit!,/no demuestra una ganadora/);assert.doesNotMatch(s.benefit!,/\+4/);
});
test('UX01: unknown current price prompts for that price without inventing cost or a benefit',()=>{
 const f=fixture();f.snapshot.jokers=[offer('joker',null)];const s=buildShopAdviceSummary(inspect(f));
 assert.equal(s.status,'abstain');assert.equal(s.benefit,null);assert.equal(s.sacrifice,null);assert.equal(s.choices[0]!.price,null);assert.match(s.pending!,/precio actual/);
});
test('UX01: unsupported observed discount remains a visible blocker, not a successful cheap purchase',()=>{
 const f=fixture();f.snapshot.jokers=[offer('joker',1)];const s=buildShopAdviceSummary(inspect(f));
 assert.equal(s.status,'abstain');assert.match(s.pending!,/Fuera del cálculo compatible.*Precio distinto/);assert.equal(s.sacrifice,null);
});
test('UX01: strict mode surfaces pending gameplay evidence before generic data questions',()=>{
 const f=fixture();f.snapshot.jokers=[offer('joker',2)];const s=buildShopAdviceSummary(inspect(f,true));
 assert.equal(s.status,'abstain');assert.match(s.pending!,/^Modo estricto: faltan observaciones en partida/);assert.equal(s.benefit,null);
});
test('UX01: voucher resource totals are labelled totals, not invented deltas',()=>{
 const f=fixture(40);f.snapshot.vouchers=[{offerId:'grabber',catalogId:'v_grabber',price:10}];const s=buildShopAdviceSummary(inspect(f));
 assert.equal(s.status,'tie');assert.equal(s.benefit,'Totales tras comprar: 6 manos/ronda.');assert.match(s.sacrifice!,/Coste neto \$10; quedan \$30/);
});
test('UX01: interest reduction is explicitly conditional, never current income',()=>{
 const f=fixture(35);f.state.observed.outOfScope=known({vouchers:['v_seed_money'],consumables:[],pendingTags:[],otherModifiers:[]});f.snapshot.jokers=[offer('joker',2)];
 const s=buildShopAdviceSummary(inspect(f));assert.match(s.sacrifice!,/interés aislado \$7 → \$6, solo si ganas y mantienes esos saldos hasta cobrar/);
});
test('UX01: summarizing never mutates decision or state and each result owns its choices',()=>{
 const f=fixture();f.snapshot.jokers=[offer('joker',2)];const d=inspect(f),before=structuredClone({state:f.state,decision:d});
 const first=buildShopAdviceSummary(d);first.choices[0]!.title='Changed by renderer';const next=buildShopAdviceSummary(d);
 assert.deepEqual({state:f.state,decision:d},before);assert.notEqual(next.choices[0]!.title,'Changed by renderer');
});
test('UX01: material uncertainty remains visible even when H2 can legally buy Baron',()=>{
 const f=fixture();f.state.observed.deck={status:'unknown',reason:'No se transcribió el material'};f.snapshot.jokers=[offer('baron',8)];
 const d=inspect(f);assert.equal(d.actions[1]!.status,'provisional');const s=buildShopAdviceSummary(d);
 assert.equal(s.status,'abstain');assert.match(s.pending!,/composición.*mazo/);assert.equal(s.benefit,null);
});
test('UX01: an unresolved second offer stays visible beside a conditional known purchase',()=>{
 const f=fixture();f.snapshot.jokers=[offer('joker',2),offer('stuntman',null)];const s=buildShopAdviceSummary(inspect(f));
 assert.equal(s.status,'conditional');assert.match(s.benefit!,/^\+4/);assert.match(s.pending!,/Falta el precio.*podría cambiar la elección/);
});
test('UX01: Steel Joker states the six recorded Steel cards without fabricating a hand score gain',()=>{
 const f=fixture();assert.ok(f.state.observed.deck.status==='known'&&'cards' in f.state.observed.deck.value);
 f.state.observed.deck.value.cards.slice(0,6).forEach(c=>{c.enhancement='steel';});f.snapshot.jokers=[offer('steel_joker',7)];
 const d=inspect(f),s=buildShopAdviceSummary(d);assert.equal(d.context.options.find(o=>o.id==='steel_joker')!.fit!.readiness,'ready');
 assert.equal(s.benefit,'6 cartas de Acero en el mazo completo; no exige retenerlas.');assert.doesNotMatch(s.benefit!,/\+|Δ|puntos/);
});
test('UX01: Banner preserves its discard condition rather than treating round capacity as scoring gain',()=>{
 const f=fixture();f.snapshot.jokers=[offer('banner',5)];const s=buildShopAdviceSummary(inspect(f));
 assert.equal(s.pending,'3 descartes por ronda; el aporte depende de cuántos uses o conserves.');assert.doesNotMatch(s.benefit??'',/90|\+/);
});
test('UX01: a conditional purchase displays the structured loss of Bull support beside saving',()=>{
 const f=fixture();f.state.observed.jokers=known([freshJokerInstance('bull','owned')]);f.snapshot.jokers=[offer('joker',2)];
 const d=inspect(f),s=buildShopAdviceSummary(d);assert.equal(s.status,'tie');assert.deepEqual(s.choices.map(c=>c.id),['hold','joker']);
 assert.match(s.pending!,/Gastar \$2 reduce el soporte económico de Bull\/Bootstraps; saldo posterior \$23/);assert.match(s.pending!,/no suma esa pérdida como puntos/);
});
test('UX01: a tie preserves both potential purchase conditions with their names in recommendation order',()=>{
 const f=fixture();f.snapshot.jokers=[offer('banner',5),offer('half_joker',5)];const d=inspect(f),s=buildShopAdviceSummary(d);
 assert.equal(s.status,'tie');assert.deepEqual(s.choices.map(c=>c.id),['banner','half_joker']);
 assert.match(s.pending!,/Banner: 3 descartes por ronda; el aporte depende de cuántos uses o conserves/);
 assert.match(s.pending!,/Half Joker: Puedes jugar tres cartas o menos; su utilidad depende de las manos que elijas/);
 assert.ok(s.pending!.indexOf('Banner:')<s.pending!.indexOf('Half Joker:'));
});
