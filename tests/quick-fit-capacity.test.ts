import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {evaluateJokerFit,projectJokerPurchase} from '../src/advisor/quick-fit.js';
import {freshJokerInstance} from '../src/rules/shop.js';
import {generationEvent} from '../src/rules/generation-jokers.js';
import type {FullEventInput} from '../src/rules/full-joker-contract.js';
import type {GameState,JokerInstance} from '../src/state/model.js';
import {known} from './helpers.js';

function state():GameState {
 const s=JSON.parse(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8')) as GameState;
 s.assumptions.probes=[];s.assumptions.roundPlans=[];s.observed.money=known(100);return s;
}
function inventory(s:GameState,count:number):JokerInstance[] {
 const ids=['joker','half_joker','banner','abstract_joker','golden_joker','mystic_summit'];
 const cards=ids.slice(0,count).map((id,i)=>freshJokerInstance(id,'owned:'+i));
 s.observed.jokers=known(cards);return cards;
}

// Independent oracles from installed 1.0.1o-FULL card.lua:2529–2530:
// count physical cards, then min(2, limit - physical count). L08 remains static
// inspection, not observation in a played game. No generated advice is a label.
test('Riff-Raff: filling the fifth slot provides no current generation space',()=>{
 const s=state();inventory(s,4);const before=structuredClone(s);
 const fit=evaluateJokerFit(s,'riff_raff',{ante:1,purchase:true});
 assert.equal(fit.purchase.status,'legal');assert.equal(fit.readiness,'unavailable');
 assert.match(fit.signals.find(signal=>signal.id==='preparation')!.text,/Sin huecos tras esta adquisición/);
 assert.deepEqual(s,before);
});

test('Riff-Raff: one remaining slot means at most one unknown common',()=>{
 const s=state();inventory(s,3);
 const fit=evaluateJokerFit(s,'riff_raff',{ante:1,purchase:true});
 assert.equal(fit.readiness,'potential');
 assert.match(fit.signals.find(signal=>signal.id==='preparation')!.text,/Hasta 1 comodín común cabría/);
 assert.match(fit.signals.find(signal=>signal.id==='preparation')!.text,/identidad y utilidad siguen desconocidas/);
});

test('Riff-Raff: owned instance is counted once, not as another acquisition',()=>{
 const s=state(),cards=inventory(s,3),riff=freshJokerInstance('riff_raff','riff');
 s.observed.jokers=known([...cards,riff]);
 const fit=evaluateJokerFit(s,'riff_raff',{ante:1,instanceId:'riff'});
 assert.equal(fit.readiness,'potential');
 assert.match(fit.signals.find(signal=>signal.id==='preparation')!.text,/Hasta 1 comodín común cabría/);
});

test('Riff-Raff: replacing an owned card still occupies the same full capacity',()=>{
 const s=state(),cards=inventory(s,5);
 const fit=evaluateJokerFit(s,'riff_raff',{ante:1,purchase:true,replacementId:cards[0]!.instanceId});
 assert.equal(fit.purchase.status,'legal');assert.equal(fit.readiness,'unavailable');
});

test('Riff-Raff: H2 Negative capacity is used once in a purchase projection',()=>{
 const s=state();inventory(s,4);
 const fit=evaluateJokerFit(s,'riff_raff',{ante:1,purchase:true,offer:{price:known(11),edition:known('negative'),stickers:known([])}});
 assert.equal(fit.purchase.status,'legal');assert.equal(fit.readiness,'potential');
 assert.match(fit.signals.find(signal=>signal.id==='preparation')!.text,/Hasta 1 comodín común cabría/);
});

test('Riff-Raff: unknown capacity stays unknown instead of assuming five',()=>{
 const s=state();inventory(s,3);s.observed.resources.jokerSlots={status:'unknown',reason:'No contado'};
 const fit=evaluateJokerFit(s,'riff_raff',{ante:1});assert.equal(fit.readiness,'unknown');assert.equal(fit.score,null);
});

test('Riff-Raff H2: a Negative card does not free a second place in a full adjusted inventory',()=>{
 const s=state(),cards=inventory(s,5),riff=freshJokerInstance('riff_raff','riff','negative');
 s.observed.resources.jokerSlots=known(6);s.observed.jokers=known([...cards,riff]);
 const event:FullEventInput={state:s,stage:'select_blind',cards:[],trace:[],choices:[],use:()=>{}};
 // Six physical cards, adjusted limit six: no outcomes should be requested.
 generationEvent(event);
 assert.equal(s.observed.jokers.status,'known');assert.equal(s.observed.jokers.value.length,6);
 const fit=evaluateJokerFit(s,'riff_raff',{ante:1,instanceId:'riff'});assert.equal(fit.readiness,'unavailable');
});

// L07: Credit Card changes the debt limit by $20; it never credits $20 cash.
// These check conditions and explanations, not a score band or optimal purchase.
test('Credit Card: cash abundance is not a demonstrated need for credit',()=>{
 const s=state(),before=structuredClone(s);
 const fit=evaluateJokerFit(s,'credit_card',{ante:1,purchase:true});
 assert.equal(fit.purchase.status,'legal');assert.equal(fit.purchase.moneyAfter,99);
 assert.equal(fit.readiness,'potential');
 assert.equal(fit.signals.find(signal=>signal.id==='credit-need')?.kind,'heuristic');
 assert.match(fit.signals.find(signal=>signal.id==='preparation')!.text,/compra útil que necesite/);
 assert.deepEqual(s,before);
});

test('Credit Card: an owned credit facility can support observed negative balance',()=>{
 const s=state();s.observed.money=known(-5);s.observed.jokers=known([freshJokerInstance('credit_card','credit')]);
 const fit=evaluateJokerFit(s,'credit_card',{ante:1,instanceId:'credit'});
 assert.equal(fit.readiness,'ready');assert.equal(fit.signals.find(signal=>signal.id==='credit-need')?.kind,'fact');
 assert.match(fit.signals.find(signal=>signal.id==='preparation')!.text,/No es ingreso/);
});

test('Credit Card: unknown balance is not treated as an observed financing need',()=>{
 const s=state();s.observed.money={status:'unknown',reason:'No transcrito'};
 const fit=evaluateJokerFit(s,'credit_card',{ante:1});assert.equal(fit.readiness,'unknown');assert.equal(fit.score,null);
});

test('Shared H2 purchase projection returns an independent legal state',()=>{
 const s=state(),before=structuredClone(s);
 const projection=projectJokerPurchase(s,'joker',{purchase:true});
 assert.equal(projection.status,'legal');assert.equal(projection.moneyAfter,98);
 assert.equal(projection.projectedState!.observed.jokers.status,'known');
 if(projection.projectedState!.observed.jokers.status==='known')assert.equal(projection.projectedState!.observed.jokers.value.length,1);
 assert.deepEqual(s,before);
 projection.projectedState!.observed.money=known(0);assert.deepEqual(s,before);
});
