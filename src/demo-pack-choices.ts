import assert from 'node:assert/strict';
import {comparePackChoices,packChoicesAreCurrent} from './advisor/pack-choices.js';
import type {PackChoiceOptions,PackChoiceReport} from './advisor/pack-choices.js';
import {createNewRun} from './run/start.js';
import {freshJokerInstance} from './rules/shop.js';
import {standardDeck} from './catalog/initial.js';
import type {Fact,GameStateV02,Result} from './state/model.js';
import type {PackEntry} from './state/pack-contract.js';

const time='2026-10-17T19:00:00Z';
const known=<T>(value:T):Fact<T>=>({status:'known',source:'manual',value});
const ok=<T>(result:Result<T>):T=>{if(!result.ok)throw Error(JSON.stringify(result.errors));return result.value;};
const value=<T>(fact:Fact<T>):T=>{if(fact.status!=='known')throw Error(fact.reason);return fact.value;};
const joker=(entryId:string,catalogId:string):PackEntry=>({entryId,kind:'joker',joker:freshJokerInstance(catalogId,'instance:'+entryId)});
/** A synthetic recorded observation, not a game session and not a phase conversion by the advisor. */
function fixture(catalogId:string,entries:PackEntry[]):GameStateV02{
 const state=ok(createNewRun({runId:'demo-pack-choices',updatedAt:time,deckId:'blue',profileConfirmed:true}));
 return {...state,observed:{...state.observed,money:known(16),shop:known({shopId:'shop',cardOffers:[],voucherOffers:[],packOffers:[],ignoredOtherOffers:[]})},phase:'open_pack',phaseData:{packId:known('pack'),returnTo:'shop',context:{offerId:'pack',shopId:'shop',catalogId,paid:4,remainingChoices:1,contents:known(entries),selectedEntryIds:[],shopOrigin:known({ante:1,kind:'small'})}}};
}
function show(title:string,state:GameStateV02,options:PackChoiceOptions={}):PackChoiceReport{
 const original=structuredClone(state),report=ok(comparePackChoices(state,options));assert.deepEqual(state,original);assert.ok(packChoicesAreCurrent(report,state,options));
 console.log('\n'+title+' · revisión '+report.inputRevision);
 console.table(report.order.map(id=>{const o=report.options.find(item=>item.id===id)!;return {opción:o.label,H2:o.status,encaje:o.fit?.score??o.fit?.readiness??'—',índiceAntes:o.composition?.before.global.value??'—',índiceDespués:o.composition?.after.global.value??'—',saldo:o.consequences?.money.after??'—',plazasLibres:o.consequences?.freeJokerSlots.after??'—'};}));
 console.log(report.recommendation.kind+': '+report.recommendation.reasons.join(' '));
 for(const option of report.options){
  for(const h of option.handChanges){if(h.before.status==='known'&&h.after.status==='known')console.log(option.label+' · '+h.handId+': '+h.before.value.chips+' × '+h.before.value.mult+' → '+h.after.value.chips+' × '+h.after.value.mult+' (bases; no puntuación de jugada).');}
  for(const c of option.consequences?.counters??[])console.log(option.label+' · '+c.instanceId+'.'+c.key+': '+JSON.stringify(c.before)+' → '+JSON.stringify(c.after));
 }
 return report;
}

console.log('SHOP02c · elecciones observadas, solo lectura. Casos sintéticos, sin evidencia nueva de gameplay.');
const buffoon=fixture('buffoon-normal',[joker('baron','baron'),joker('joker','joker')]);
buffoon.observed.deck=known({cards:standardDeck().filter(c=>c.rank!=='K')});
const first=show('Buffoon · sin reyes ni Acero',buffoon);
assert.equal(first.options.find(o=>o.id==='entry:baron')!.fit!.readiness,'unavailable');
assert.equal(first.options.find(o=>o.id==='entry:joker')!.fit!.readiness,'ready');

const celestial=fixture('celestial-normal',[{entryId:'mercury',kind:'planet',catalogId:'c_mercury'},{entryId:'jupiter',kind:'planet',catalogId:'c_jupiter'},{entryId:'pluto',kind:'planet',catalogId:'c_pluto'}]);
assert.equal(show('Celestial · sin intención de mano',celestial).recommendation.kind,'abstain');
const pair=show('Celestial · intención explícita de Pareja',celestial,{intendedHand:'pair'});
assert.equal(pair.recommendation.kind,'conditional');
assert.deepEqual(pair.options.find(o=>o.id==='entry:mercury')!.handChanges.find(h=>h.handId==='pair')!.after,known({level:2,chips:25,mult:3}));

const red=freshJokerInstance('red_card','owned:red');red.counters.mult=known(9);celestial.observed.jokers=known([red]);
const tradeoff=show('Celestial · Pareja frente a Red Card al omitir',celestial,{intendedHand:'pair'});
assert.equal(tradeoff.recommendation.kind,'tradeoff');
assert.equal(value(tradeoff.options.find(o=>o.id==='skip')!.consequences!.counters[0]!.after!),12);
console.log('\nSin escrituras, sin uso automático y sin búsqueda de una secuencia Mega completa. El modo estricto conserva sus bloqueos por evidencia pendiente.');
