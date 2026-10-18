import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {comparePackChoices,packChoicesAreCurrent} from '../src/advisor/pack-choices.js';
import type {PackChoiceReport} from '../src/advisor/pack-choices.js';
import type {Fact,GameStateV01,GameStateV02,JokerInstance} from '../src/state/model.js';
import type {PackEntry} from '../src/state/pack-contract.js';
import {createNewRun} from '../src/run/start.js';
import {CONFIRMED_STORAGE_KEY,createConfirmedStore} from '../src/storage/confirmed-store.js';
import {known,MemoryStorage,success} from './helpers.js';

/** Synthetic observations. Literal expected hand bases, counters, balances and
 * capacities follow L11/SYN01 and the stated editorial policy; expected values
 * are never obtained from the projection being tested. Not a Balatro session. */
const date='2026-10-17T19:00:00Z',unknown={status:'unknown',reason:'No observado.'} as const;
const owned=(catalogId='joker',instanceId='owned',counters:JokerInstance['counters']={},sellValue=1):JokerInstance=>({instanceId,catalogId,counters,sellValue:known(sellValue),edition:known('base'),stickers:known([])});
function joker(entryId:string,catalogId='joker',edition='base',sellValue=1):PackEntry{
 return {entryId,kind:'joker',joker:{...owned(catalogId,'instance:'+entryId,{},sellValue),edition:known(edition)}};
}
const mercury:PackEntry={entryId:'mercury',kind:'planet',catalogId:'c_mercury'};
const jupiter:PackEntry={entryId:'jupiter',kind:'planet',catalogId:'c_jupiter'};
const pluto:PackEntry={entryId:'pluto',kind:'planet',catalogId:'c_pluto'};
function fixture(catalogId='buffoon-normal',entries:PackEntry[]=[joker('joker'),joker('half','half_joker','base',2)]):GameStateV02{
 const initial=success(createNewRun({runId:'pack-choice-quality',updatedAt:date,deckId:'blue',profileConfirmed:true}));
 const state:GameStateV02={...initial,phase:'open_pack',phaseData:{packId:known('pack'),returnTo:'shop',context:{offerId:'pack',shopId:'shop',catalogId,paid:catalogId.endsWith('mega')?8:4,remainingChoices:catalogId.endsWith('mega')?2:1,contents:known(entries),selectedEntryIds:[],shopOrigin:known({ante:1,kind:'small'})}}};
 state.observed.money=known(catalogId.endsWith('mega')?12:16);
 state.observed.shop=known({shopId:'shop',cardOffers:[],voucherOffers:[],packOffers:[],ignoredOtherOffers:[]});
 state.observed.nextBlind=known({ante:1,kind:'big',bossId:known('none'),target:known(450),reward:known(4)});
 state.assumptions.probes=[];state.assumptions.roundPlans=[];
 return state;
}
const report=(state:GameStateV02,options:Parameters<typeof comparePackChoices>[1]={})=>success(comparePackChoices(state,options));
function choice(result:PackChoiceReport,id:string){const item=result.options.find(o=>o.id===id);assert.ok(item,'Missing option '+id);return item;}
function value<T>(fact:Fact<T>):T{assert.equal(fact.status,'known');if(fact.status!=='known')throw Error('Missing fact');return fact.value;}
const after=(result:PackChoiceReport,id:string)=>success(choice(result,id).projection).state;
const context=(state:GameStateV02)=>{assert.equal(state.phase,'open_pack');if(state.phase!=='open_pack'||!state.phaseData.context)throw Error('Missing context');return state.phaseData.context;};

test('SHOP02c compara cada opción visible y omitir sin guardar ni mutar la partida',()=>{
 const state=fixture(),memory=new MemoryStorage();success(createConfirmedStore(()=>memory).initialize(state));const before=structuredClone(state),raw=memory.getItem(CONFIRMED_STORAGE_KEY),writes=memory.writes;
 const result=report(state);
 assert.equal(result.contract,'pack-choices-1');assert.equal(result.policyVersion,'pack-choice-policy-1');assert.equal(result.inputRevision,state.revision);
 assert.equal(result.family,'buffoon');assert.equal(result.projected,true);assert.equal(result.exhaustive,false);assert.equal(result.remainingChoices,1);
 assert.deepEqual(result.options.map(o=>o.id),['entry:joker','entry:half','skip']);
 assert.deepEqual(choice(result,'entry:joker').action,{type:'choose_pack_item',entryId:'joker'});assert.deepEqual(choice(result,'skip').action,{type:'skip_open_pack'});
 for(const item of result.options){assert.equal(item.projection.ok,true);assert.deepEqual(item.consequences!.money,{before:16,after:16,delta:0});assert.equal(item.evidence.verifiedAgainstGame,false);}
 assert.deepEqual(state,before);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);assert.equal(memory.writes,writes);
 assert.deepEqual(report(state),result,'Repeated read-only evaluation is deterministic');
});

test('SHOP02c estados de alternativas, informes y entrada no comparten referencias mutables',()=>{
 const state=fixture(),before=structuredClone(state),result=report(state),first=after(result,'entry:joker'),second=after(result,'entry:half'),skipped=after(result,'skip');
 assert.deepEqual(value(first.observed.jokers).map(j=>j.catalogId),['joker']);assert.deepEqual(value(second.observed.jokers).map(j=>j.catalogId),['half_joker']);assert.deepEqual(value(skipped.observed.jokers),[]);
 first.observed.money=known(999);value(first.observed.jokers)[0]!.catalogId='banner';
 assert.equal(value(second.observed.money),16);assert.equal(value(skipped.observed.money),16);assert.deepEqual(state,before);
});

test('SHOP02c inventario lleno limita la elección normal, Negative sigue legal y no cobra otra vez',()=>{
 const state=fixture('buffoon-normal',[joker('normal'),joker('negative','joker','negative',3)]);state.observed.jokers=known(Array.from({length:5},(_,i)=>owned(i===0?'ring_master':'joker','owned:'+i)));
 const result=report(state),normal=choice(result,'entry:normal'),negative=choice(result,'entry:negative');
 assert.equal(normal.projection.ok,false);assert.equal(normal.errors[0]!.code,'no_slots');assert.equal(normal.consequences,null);
 const projected=success(negative.projection).state;assert.equal(value(projected.observed.jokers).length,6);assert.equal(value(projected.observed.resources.jokerSlots),6);
 assert.deepEqual(negative.consequences!.money,{before:16,after:16,delta:0});assert.deepEqual(negative.consequences!.freeJokerSlots,{before:0,after:0,delta:0});assert.equal(choice(result,'skip').projection.ok,true);
});

test('SHOP02c omitir conserva las cartas y desarrolla Red Card +3 una sola vez en su rama',()=>{
 const state=fixture();state.observed.jokers=known([owned('red_card','red',{mult:known(9)},2)]);
 const result=report(state),skip=choice(result,'skip'),skipped=after(result,'skip'),taken=after(result,'entry:joker');
 assert.equal(value(value(skipped.observed.jokers)[0]!.counters.mult!),12);assert.equal(value(value(taken.observed.jokers)[0]!.counters.mult!),9);
 assert.equal(value(skipped.observed.jokers).length,1);assert.equal(value(taken.observed.jokers).length,2);assert.equal(skip.consequences!.counters.length,1);
 assert.equal(value(skip.consequences!.counters[0]!.before!),9);assert.equal(value(skip.consequences!.counters[0]!.after!),12);assert.equal(skipped.phase,'shop');
});

test('SHOP02c Mega compara solo la siguiente decisión y no vuelve a ofrecer la entrada elegida',()=>{
 const state=fixture('buffoon-mega',[joker('first'),joker('half','half_joker','base',2),joker('third','greedy_joker','base',2),joker('fourth','lusty_joker','base',2)]);
 context(state).selectedEntryIds=['first'];context(state).remainingChoices=1;state.observed.jokers=known([owned('joker','instance:first')]);
 const result=report(state);
 assert.equal(result.remainingChoices,1);assert.equal(result.exhaustive,false);assert.deepEqual(result.options.map(o=>o.id),['entry:half','entry:third','entry:fourth','skip']);
 assert.deepEqual(value(after(result,'entry:half').observed.jokers).map(j=>j.instanceId),['instance:first','instance:half']);
 assert.deepEqual(value(after(result,'skip').observed.jokers).map(j=>j.instanceId),['instance:first']);
});

test('SHOP02c primera elección Mega conserva una elección y no ejecuta una segunda hipotética',()=>{
 const state=fixture('buffoon-mega',[joker('first'),joker('second','greedy_joker','base',2),joker('third','lusty_joker','base',2),joker('fourth','wrathful_joker','base',2)]),result=report(state),projected=after(result,'entry:first');
 assert.equal(projected.phase,'open_pack');assert.equal(context(projected).remainingChoices,1);assert.deepEqual(context(projected).selectedEntryIds,['first']);
 assert.equal(value(projected.observed.jokers).length,1);assert.equal(value(projected.observed.money),12);assert.equal(state.phase,'open_pack');assert.equal(context(state).remainingChoices,2);
});

test('SHOP02c Planet tiene cambios literales independientes: Mercury Pair10×2→25×3, Constellation×1→×1.1, sin cobro',()=>{
 const state=fixture('celestial-normal',[mercury,jupiter,pluto]);state.observed.jokers=known([owned('constellation','stars',{x100:known(100)},3),owned('satellite','satellite',{},3)]);
 const result=report(state,{intendedHand:'pair'}),option=choice(result,'entry:mercury'),projected=after(result,'entry:mercury'),pair=option.handChanges.find(h=>h.handId==='pair');
 assert.deepEqual(option.handChanges.map(h=>h.handId),['pair']);assert.ok(pair);assert.deepEqual(value(pair.before),{level:1,chips:10,mult:2});assert.deepEqual(value(pair.after),{level:2,chips:25,mult:3});
 assert.equal(value(value(projected.observed.jokers)[0]!.counters.x100!),110);assert.deepEqual(option.consequences!.money,{before:16,after:16,delta:0});
 assert.deepEqual(value(value(projected.observed.jokerContext!).planetsUsed!),['c_mercury']);assert.deepEqual(value(value(projected.observed.jokerContext!).consumables!),[]);
 assert.equal(result.recommendation.kind,'conditional');assert.deepEqual(result.recommendation.optionIds,['entry:mercury']);
});

test('SHOP02c Jupiter mejora Flush35×4→50×6; no se interpreta el producto base como puntos de mano',()=>{
 const result=report(fixture('celestial-normal',[mercury,jupiter,pluto]),{intendedHand:'flush'}),option=choice(result,'entry:jupiter'),flush=option.handChanges.find(h=>h.handId==='flush');
 assert.deepEqual(option.handChanges.map(h=>h.handId),['flush']);assert.ok(flush);assert.deepEqual(value(flush.before),{level:1,chips:35,mult:4});assert.deepEqual(value(flush.after),{level:2,chips:50,mult:6});
 assert.deepEqual(result.recommendation.optionIds,['entry:jupiter']);assert.equal(option.fit,null);
 assert.ok(result.limitations.some(l=>/mano|puntuaci[oó]n/i.test(l)));
});

test('SHOP02c sin una mano declarada no inventa prioridad entre Planet ni usa el mayor producto base',()=>{
 const result=report(fixture('celestial-normal',[mercury,jupiter,pluto]));
 assert.notEqual(result.recommendation.kind,'conditional');assert.ok(result.recommendation.optionIds.length!==1||result.recommendation.kind==='abstain');
 assert.ok(result.options.every(o=>o.projection.ok));assert.equal(choice(result,'entry:mercury').handChanges[0]!.after.status,'known');
});

test('SHOP02c desarrollar la mano declarada frente a Red Card conserva el intercambio explícito',()=>{
 const state=fixture('celestial-normal',[mercury,jupiter,pluto]);state.observed.jokers=known([owned('red_card','red',{mult:known(9)},2)]);
 const result=report(state,{intendedHand:'pair'});
 assert.equal(result.recommendation.kind,'tradeoff');assert.ok(result.recommendation.optionIds.includes('entry:mercury'));assert.ok(result.recommendation.optionIds.includes('skip'));
 assert.equal(choice(result,'entry:mercury').handChanges.find(h=>h.handId==='pair')?.after.status,'known');
 assert.equal(value(value(after(result,'entry:mercury').observed.jokers)[0]!.counters.mult!),9);
 assert.equal(value(value(after(result,'skip').observed.jokers)[0]!.counters.mult!),12);
});

test('SHOP02c dos candidatos físicamente equivalentes pueden empatar sin romperse por nombre o ID',()=>{
 const state=fixture('buffoon-normal',[joker('alpha'),joker('omega')]);state.observed.jokers=known([owned('ring_master','showman',{},2)]);const result=report(state);
 const alpha=choice(result,'entry:alpha'),omega=choice(result,'entry:omega');
 assert.deepEqual(alpha.composition!.sections,omega.composition!.sections);assert.deepEqual(alpha.consequences!.money,omega.consequences!.money);
 assert.notEqual(result.recommendation.kind,'conditional','Los IDs distintos no justifican una preferencia única');
 assert.equal(result.recommendation.optionIds.includes('entry:alpha'),result.recommendation.optionIds.includes('entry:omega'));
});

test('SHOP02c historial Satellite distingue identidades pero no añade ingresos inmediatos ni planetas retenidos',()=>{
 const state=fixture('celestial-normal',[mercury,jupiter,pluto]);state.observed.jokers=known([owned('satellite','satellite',{},3)]);
 value(state.observed.jokerContext!).planetsUsed=known(['c_mercury']);
 const result=report(state),same=after(result,'entry:mercury'),different=after(result,'entry:jupiter');
 assert.deepEqual(value(value(same.observed.jokerContext!).planetsUsed!),['c_mercury']);assert.deepEqual(value(value(different.observed.jokerContext!).planetsUsed!),['c_mercury','c_jupiter']);
 assert.equal(value(same.observed.money),16);assert.equal(value(different.observed.money),16);assert.deepEqual(value(value(different.observed.jokerContext!).consumables!),[]);
});

test('SHOP02c Black Hole queda limitado localmente y evita declarar ganadora global una comparación incompleta',()=>{
 const state=fixture('celestial-normal',[mercury,jupiter,{entryId:'hole',kind:'unsupported',catalogId:'c_black_hole'}]);
 const result=report(state,{intendedHand:'pair'}),hole=choice(result,'entry:hole');
 assert.equal(hole.projection.ok,false);assert.equal(hole.errors[0]!.code,'unsupported_pack_item');assert.equal(hole.consequences,null);
 assert.equal(choice(result,'entry:mercury').projection.ok,true);assert.equal(choice(result,'skip').projection.ok,true);assert.equal(result.recommendation.kind,'abstain');
});

test('SHOP02c historial Planet desconocido bloquea solo esas elecciones y deja omitir calculable',()=>{
 const state=fixture('celestial-normal',[mercury,jupiter,pluto]);value(state.observed.jokerContext!).planetsUsed=unknown;
 const result=report(state,{intendedHand:'pair'});
 for(const item of result.options.filter(o=>o.id!=='skip')){assert.equal(item.projection.ok,false);assert.equal(item.errors[0]!.code,'unknown_data');assert.equal(item.consequences,null);}
 assert.equal(choice(result,'skip').projection.ok,true);assert.equal(result.recommendation.kind,'abstain');
});

test('SHOP02c mazo desconocido no convierte material ausente en cero ni bloquea las adquisiciones legales',()=>{
 const state=fixture('buffoon-normal',[joker('baron','baron','base',4),joker('plain')]);state.observed.deck=unknown;
 const result=report(state),baron=choice(result,'entry:baron');
 assert.equal(baron.projection.ok,true);assert.equal(baron.fit?.readiness,'unknown');assert.equal(baron.fit?.score,null);assert.equal(choice(result,'entry:plain').projection.ok,true);
 assert.ok(['abstain','tradeoff','tie'].includes(result.recommendation.kind));
});

test('SHOP02c Mimo distingue cero Acero de52 Acero sin atribuir una mano ni una activación retenida',()=>{
 const empty=fixture('buffoon-normal',[joker('mime','mime','base',2),joker('plain')]),prepared=structuredClone(empty),deck=value(prepared.observed.deck);
 assert.ok('cards'in deck);for(const card of deck.cards)card.enhancement='steel';
 const noMaterial=report(empty),abundant=report(prepared),absent=choice(noMaterial,'entry:mime').fit!,supported=choice(abundant,'entry:mime').fit!;
 assert.equal(absent.readiness,'unavailable');assert.equal(absent.axes.find(a=>a.key==='readiness')!.value,0);assert.ok(absent.score!==null&&absent.score<=20);
 // The existing editorial material rule is1+2×eligible/total:1+2×52/52=3.
 // All cards are only material in the deck: none has actually been held or retriggered.
 assert.equal(supported.axes.find(a=>a.key==='readiness')!.value,3);assert.equal(supported.readiness,'potential');assert.ok(supported.score!==null&&supported.score>20);
 assert.ok(supported.signals.some(s=>s.id==='steel-held'&&s.text.includes('52')));
 assert.equal(choice(noMaterial,'entry:plain').fit!.score,choice(abundant,'entry:plain').fit!.score);
 assert.deepEqual(empty.assumptions.roundPlans,[]);assert.deepEqual(prepared.assumptions.roundPlans,[]);
});

test('SHOP02c opciones de comparación inválidas devuelven errores y nunca alteran los hechos',()=>{
 const state=fixture(),before=structuredClone(state);
 for(const options of [{intendedHand:'banana'},{requireObserved:'true'},{intendedHand:3},{extraWeight:99}]){
  const result=comparePackChoices(state,options as never);assert.equal(result.ok,false);if(!result.ok){assert.ok(result.errors.length);assert.ok(result.errors[0]!.path.startsWith('$options'));}
 }
 assert.deepEqual(state,before);
});

test('SHOP02c evidencia provisional se conserva y el modo estricto no publica estados calculados',()=>{
 const state=fixture(),original=structuredClone(state),provisional=report(state),strict=report(state,{requireObserved:true});
 assert.ok(provisional.options.every(o=>o.status==='provisional'&&o.evidence.verifiedAgainstGame===false));
 for(const option of strict.options){assert.equal(option.status,'pending_evidence');assert.equal(option.projection.ok,false);assert.equal(option.errors[0]!.code,'pending_rule');assert.equal(option.consequences,null);assert.equal(option.composition,null);}
 assert.equal(strict.recommendation.kind,'abstain');assert.deepEqual(state,original);
});

test('SHOP02c vigencia incluye datos sin cambio de revisión y los supuestos de intención o evidencia',()=>{
 const state=fixture('celestial-normal',[mercury,jupiter,pluto]),options={intendedHand:'pair' as const},result=report(state,options);
 assert.equal(packChoicesAreCurrent(result,state,options),true);assert.equal(packChoicesAreCurrent(result,state,{intendedHand:'flush'}),false);assert.equal(packChoicesAreCurrent(result,state,{...options,requireObserved:true}),false);
 const changed=structuredClone(state);changed.observed.money=known(15);assert.equal(changed.revision,state.revision);assert.equal(packChoicesAreCurrent(result,changed,options),false);
 const renamed=structuredClone(state);context(renamed).contents=known([mercury,jupiter,{...pluto,entryId:'other'}]);assert.equal(packChoicesAreCurrent(result,renamed,options),false);
 const revised=structuredClone(state);revised.revision++;assert.equal(packChoicesAreCurrent(result,revised,options),false);
});

test('SHOP02c fase incorrecta o estado antiguo se rechazan; contenido desconocido conserva únicamente omitir',()=>{
 const shop:GameStateV02={...fixture(),phase:'shop',phaseData:{origin:known({ante:1,kind:'small'})}};assert.equal(comparePackChoices(shop).ok,false);
 const legacy=JSON.parse(readFileSync('examples/shop-purchase.json','utf8')) as GameStateV01;assert.equal(comparePackChoices(legacy).ok,false);
 const missing=fixture();context(missing).contents=unknown;const limited=report(missing);assert.deepEqual(limited.options.map(o=>o.id),['skip']);assert.equal(choice(limited,'skip').projection.ok,true);assert.equal(limited.recommendation.kind,'abstain');
});
