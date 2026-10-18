import assert from 'node:assert/strict';
import test from 'node:test';
import type {Fact,GameStateV02,JokerInstance} from '../src/state/model.js';
import type {PackEntry} from '../src/state/pack-contract.js';
import {createNewRun} from '../src/run/start.js';
import {compareArcanaChoices,arcanaChoicesAreCurrent} from '../src/advisor/arcana-choices.js';
import type {ArcanaChoiceOption,ArcanaChoiceReport} from '../src/advisor/arcana-choices.js';
import {CONFIRMED_STORAGE_KEY,createConfirmedStore} from '../src/storage/confirmed-store.js';
import {known,MemoryStorage,success} from './helpers.js';

/** Synthetic known observations, not a Balatro session. Combinatorial oracles
 * below are hand-counted C(8,1), C(8,1)+C(8,2), and +C(8,3). Exact card effects
 * follow the independently documented L12/L13 primary static inspection. */
const date='2026-10-18T16:00:00Z',unknown={status:'unknown',reason:'Sin observar.'} as const;
const hand=['KS','QH','8S','8H','2C','3C','4C','5C'];
const tarot=(entryId:string,catalogId:string):PackEntry=>({entryId,kind:'tarot',catalogId});
const owned=(catalogId:string,instanceId=catalogId,counters:JokerInstance['counters']={}):JokerInstance=>({instanceId,catalogId,counters,sellValue:known(2),edition:known('base'),stickers:known([])});
function fixture(entries:PackEntry[]=[tarot('steel','c_chariot'),tarot('mult','c_empress'),tarot('hearts','c_sun')],mega=false):GameStateV02{
 const initial=success(createNewRun({runId:'arcana-policy',updatedAt:date,deckId:'blue',profileConfirmed:true}));
 const contents=mega?[...entries,tarot('gold','c_devil'),tarot('glass','c_justice')]:entries;
 const state:GameStateV02={...initial,phase:'open_pack',phaseData:{packId:known('arcana'),returnTo:'shop',context:{offerId:'arcana',shopId:'shop',catalogId:mega?'arcana-mega':'arcana-normal',paid:mega?8:4,remainingChoices:mega?2:1,contents:known(contents),selectedEntryIds:[],shopOrigin:known({ante:1,kind:'small'}),heldCardIds:known([...hand])}}};
 state.observed.money=known(mega?12:16);state.observed.shop=known({shopId:'shop',cardOffers:[],voucherOffers:[],packOffers:[],ignoredOtherOffers:[]});
 state.observed.nextBlind=known({ante:1,kind:'big',bossId:known('none'),target:known(450),reward:known(4)});
 state.assumptions.probes=[];state.assumptions.roundPlans=[];
 return state;
}
const context=(state:GameStateV02)=>{if(state.phase!=='open_pack'||!state.phaseData.context)throw Error('Missing pack');return state.phaseData.context;};
const value=<T>(fact:Fact<T>):T=>{assert.equal(fact.status,'known');if(fact.status!=='known')throw Error('Missing fact');return fact.value;};
const report=(state:GameStateV02,options:Parameters<typeof compareArcanaChoices>[1]={})=>success(compareArcanaChoices(state,options));
const choices=(result:ArcanaChoiceReport,entryId:string)=>result.options.filter(option=>option.entryId===entryId);
const target=(result:ArcanaChoiceReport,entryId:string,ids:string[]):ArcanaChoiceOption=>{const option=choices(result,entryId).find(item=>JSON.stringify(item.targetCardIds)===JSON.stringify(ids));assert.ok(option,'Missing '+entryId+' '+ids);return option;};
const after=(option:ArcanaChoiceOption)=>success(option.projection).state;
const cards=(state:GameStateV02)=>{const deck=value(state.observed.deck);assert.ok('cards'in deck);return deck.cards;};

test('DECK04c enumera todos los subconjuntos1..máximo, no solo los máximos ni permutaciones',()=>{
 const result=report(fixture());
 assert.equal(choices(result,'steel').length,8);assert.equal(choices(result,'mult').length,36);assert.equal(choices(result,'hearts').length,92);
 assert.equal(result.coverage.enumerated,136);assert.equal(result.coverage.theoreticalCount,136);assert.equal(result.coverage.truncated,false);
 assert.equal(result.options.length,137);assert.equal(result.options.filter(option=>option.id==='skip').length,1);
 assert.equal(new Set(result.options.map(option=>option.id)).size,137);
 const heartTargets=choices(result,'hearts');assert.deepEqual([1,2,3].map(length=>heartTargets.filter(option=>option.targetCardIds.length===length).length),[8,28,56]);
 assert.ok(result.options.every(option=>option.projection.ok));
 assert.equal(result.coverage.scope,'next-choice');assert.equal(result.projected,true);assert.equal(result.exhaustive,false);
});

test('DECK04c consulta determinista, inmutable y sin persistencia; ramas no comparten referencias',()=>{
 const state=fixture(),before=structuredClone(state),memory=new MemoryStorage();success(createConfirmedStore(()=>memory).initialize(state));
 const raw=memory.getItem(CONFIRMED_STORAGE_KEY),writes=memory.writes,result=report(state),second=report(state);
 assert.deepEqual(result,second);assert.deepEqual(state,before);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);assert.equal(memory.writes,writes);
 const first=after(target(result,'steel',['KS'])),other=after(target(result,'steel',['QH']));cards(first).find(card=>card.instanceId==='KS')!.rank='2';
 assert.equal(cards(other).find(card=>card.instanceId==='KS')!.rank,'K');assert.deepEqual(state,before);
});

test('DECK04c proyección exacta Acero preserva rango/sello/edición y el palo conserva la mejora',()=>{
 const state=fixture(),deck=value(state.observed.deck);assert.ok('cards'in deck);const king=deck.cards.find(card=>card.instanceId==='KS')!;
 king.edition='foil';king.seal='red';king.extraChips=17;king.enhancement='steel';
 const result=report(state),sun=target(result,'hearts',['KS']),changed=sun.cardChanges[0]!;
 assert.deepEqual(changed.before,king);assert.deepEqual(changed.after,{...king,suit:'H',debuff:false});
 assert.equal(cards(after(sun)).find(card=>card.instanceId==='KS')!.enhancement,'steel');
 assert.ok(sun.sacrifices.some(note=>/S por H/.test(note)));
});

test('DECK04c aplicar la misma mejora no inventa cartas nuevas ni mejora material',()=>{
 const state=fixture();cards(state).find(card=>card.instanceId==='KS')!.enhancement='steel';
 const result=report(state),same=target(result,'steel',['KS']);
 assert.deepEqual(same.cardChanges[0]!.after,{...same.cardChanges[0]!.before,debuff:false});
 assert.equal(same.composition!.before.material.steel,1);assert.equal(same.composition!.after.material.steel,1);
 assert.deepEqual(same.sacrifices,[]);assert.ok(same.composition!.sections.every(section=>section.delta===null||section.delta===0));
 assert.equal(value(value(after(same).observed.jokerContext!).tarotsUsed!),1,'A no-op still uses one Tarot, not zero');
});

test('DECK04c Mimo reconoce apoyo de Acero sin adjudicar activación, puntos o supervivencia',()=>{
 const state=fixture([tarot('steel','c_chariot'),tarot('wild','c_lovers'),tarot('lucky','c_magician')]);state.observed.jokers=known([owned('mime')]);
 const result=report(state),steel=target(result,'steel',['KS']),wild=target(result,'wild',['KS']);
 assert.equal(steel.composition!.after.material.steel,1);assert.equal(wild.composition!.after.material.steel,0);
 const steelPreparation=steel.composition!.after.sections.find(section=>section.id==='deck')!,wildPreparation=wild.composition!.after.sections.find(section=>section.id==='deck')!;
 assert.ok(steelPreparation.value!==null&&wildPreparation.value!==null&&steelPreparation.value>wildPreparation.value);
 assert.equal(result.recommendation.kind,'conditional');assert.ok(result.recommendation.optionIds.every(id=>result.options.find(option=>option.id===id)!.entryId==='steel'));
 assert.ok(result.recommendation.reasons.some(reason=>/soporte|estructural/.test(reason)));assert.ok(result.recommendation.reasons.some(reason=>/No identifica|no identifica/.test(reason)));
 assert.equal(steel.evidence.verifiedAgainstGame,false);
});

test('DECK04c igual índice no significa efectos equivalentes, ni un empate estratégico real',()=>{
 const result=report(fixture([tarot('wild','c_lovers'),tarot('lucky','c_magician'),tarot('glass','c_justice')]));
 assert.equal(result.recommendation.kind,'tie');assert.ok(result.recommendation.reasons.some(reason=>/no.*efectos equivalentes/i.test(reason)));
 assert.ok(result.recommendation.reasons.some(reason=>/intrínseco/.test(reason)));
 assert.notDeepEqual(target(result,'wild',['KS']).cardChanges,target(result,'glass',['KS']).cardChanges);
});

test('DECK04c reemplazar una mejora y convertir rango en Piedra expone el sacrificio',()=>{
 const state=fixture([tarot('stone','c_tower'),tarot('steel','c_chariot'),tarot('wild','c_lovers')]);cards(state).find(card=>card.instanceId==='KS')!.enhancement='gold';state.observed.jokers=known([owned('mime'),owned('baron')]);
 const result=report(state),steel=target(result,'steel',['KS']),stone=target(result,'stone',['QH']);
 assert.ok(steel.sacrifices.some(note=>/gold por steel/.test(note)));assert.ok(stone.sacrifices.some(note=>/Piedra.*rango y palo/.test(note)));
 if(result.recommendation.kind==='conditional')assert.ok(result.recommendation.optionIds.every(id=>result.options.find(option=>option.id===id)!.sacrifices.length===0));
});

test('DECK04c omitir desarrolla Red Card+3, conserva dinero y muestra intercambio',()=>{
 const state=fixture();state.observed.jokers=known([owned('red_card','red',{mult:known(9)})]);
 const result=report(state),skip=result.options.find(option=>option.id==='skip')!,used=target(result,'steel',['KS']);
 assert.equal(value(value(after(skip).observed.jokers)[0]!.counters.mult!),12);assert.equal(value(value(after(used).observed.jokers)[0]!.counters.mult!),9);
 assert.deepEqual(skip.consequences!.money,{before:16,after:16,delta:0});assert.deepEqual(used.consequences!.money,{before:16,after:16,delta:0});
 assert.equal(result.recommendation.kind,'tradeoff');assert.ok(result.recommendation.optionIds.includes('skip'));assert.ok(result.recommendation.reasons.some(reason=>/Red Card/.test(reason)));
});

test('DECK04c historial Tarot desconocido permite transformar, conserva incertidumbre y no inventa Fortune Teller',()=>{
 const state=fixture();value(state.observed.jokerContext!).tarotsUsed=unknown;
 const result=report(state),used=target(result,'steel',['KS']);
 assert.equal(used.projection.ok,true);assert.equal(cards(after(used)).find(card=>card.instanceId==='KS')!.enhancement,'steel');
 assert.deepEqual(value(after(used).observed.jokerContext!).tarotsUsed,unknown);assert.ok(used.limitations.some(note=>/total previo.*no está registrado/.test(note)));
});

test('DECK04c historial conocido avanza una vez por uso y no por objetivo, omitir no usa Tarot',()=>{
 const state=fixture();value(state.observed.jokerContext!).tarotsUsed=known(7);state.observed.jokers=known([owned('fortune_teller')]);
 const result=report(state),one=target(result,'hearts',['KS']),three=target(result,'hearts',['KS','QH','8S']),skip=result.options.find(option=>option.id==='skip')!;
 for(const option of [one,three]){
  assert.equal(value(value(after(option).observed.jokerContext!).tarotsUsed!),8);
  assert.deepEqual(option.historyChanges,[{field:'tarotsUsed',before:known(7),after:known(8)}]);
 }
 assert.equal(value(value(after(skip).observed.jokerContext!).tarotsUsed!),7);assert.deepEqual(skip.historyChanges,[]);
 assert.deepEqual(one.consequences!.money,{before:16,after:16,delta:0});assert.deepEqual(three.consequences!.money,{before:16,after:16,delta:0});
});

test('DECK04c contenido o mano desconocidos conserva omitir y exige datos antes de comparar',()=>{
 for(const field of ['contents','heldCardIds']as const){const state=fixture();context(state)[field]=unknown;const result=report(state);
  assert.equal(result.coverage.theoreticalCount,null);assert.equal(result.coverage.enumerated,0);assert.equal(result.recommendation.kind,'abstain');assert.equal(result.options.find(option=>option.id==='skip')!.projection.ok,true);
 }
});

test('DECK04c contenido incompatible deja calcular las otras cartas, pero no publica ganadora global',()=>{
 const state=fixture([tarot('steel','c_chariot'),tarot('mult','c_empress'),{entryId:'soul',kind:'unsupported',catalogId:'c_soul'}]),result=report(state);
 assert.equal(result.coverage.enumerated,44);assert.equal(result.coverage.theoreticalCount,null);assert.equal(target(result,'steel',['KS']).projection.ok,true);
 const unsupported=choices(result,'soul')[0]!;assert.equal(unsupported.projection.ok,false);assert.equal(unsupported.status,'unsupported');assert.equal(unsupported.errors[0]!.code,'unsupported_pack_item');assert.equal(result.recommendation.kind,'abstain');
});

test('DECK04c cartas duplicadas, ajenas o mano incompleta no producen una recomendación',()=>{
 for(const ids of [[...hand.slice(0,7),'not-in-deck'],[...hand.slice(0,7),hand[0]!],hand.slice(0,3)]){
  const state=fixture();context(state).heldCardIds=known(ids);const comparison=compareArcanaChoices(state);
  if(!comparison.ok){assert.ok(comparison.errors.length);continue;}
  assert.equal(comparison.value.recommendation.kind,'abstain');assert.ok(comparison.value.options.filter(option=>option.entryId!==null).every(option=>!option.projection.ok));
 }
});

test('DECK04c tamaño de mano desconocido no bloquea transformaciones locales, pero limita comparación global',()=>{
 const state=fixture();state.observed.resources.handSize=unknown;const result=report(state);
 assert.equal(target(result,'steel',['KS']).projection.ok,true);assert.equal(result.recommendation.kind,'abstain');assert.ok(result.limitations.some(note=>/tamaño de mano/.test(note)));
});

test('DECK04c modo estricto aplica H2 a cada rama y no filtra proyecciones provisionales',()=>{
 const state=fixture(),before=structuredClone(state),result=report(state,{requireObserved:true});
 assert.ok(result.options.every(option=>!option.projection.ok&&option.status==='pending_evidence'&&option.composition===null&&option.cardChanges.length===0));
 assert.equal(result.recommendation.kind,'abstain');assert.deepEqual(state,before);
});

test('DECK04c límite explícito cuenta proyecciones de objetivos, incluye omitir y se abstiene al truncar',()=>{
 const state=fixture(),result=report(state,{maxCandidates:10});
 assert.deepEqual(result.coverage,{scope:'next-choice',maxCandidates:10,enumerated:10,theoreticalCount:136,truncated:true});
 assert.equal(result.options.length,11);assert.equal(result.options.at(-1)!.id,'skip');assert.equal(result.recommendation.kind,'abstain');
 const exact=report(state,{maxCandidates:136});assert.equal(exact.coverage.truncated,false);assert.equal(exact.coverage.enumerated,136);
});

test('DECK04c valida límite, opciones y fase sin mutar la partida',()=>{
 const state=fixture(),before=structuredClone(state);
 for(const options of [{maxCandidates:0},{maxCandidates:4097},{maxCandidates:1.5},{maxCandidates:'8'},{requireObserved:'yes'},{unknown:1}]){const result=compareArcanaChoices(state,options as never);assert.equal(result.ok,false);if(!result.ok)assert.ok(result.errors[0]!.path.startsWith('$options'));}
 const nonArcana=fixture();context(nonArcana).catalogId='celestial-normal';assert.equal(compareArcanaChoices(nonArcana).ok,false);
 const shop:GameStateV02={...state,phase:'shop',phaseData:{origin:known({ante:1,kind:'small'})}};assert.equal(compareArcanaChoices(shop).ok,false);assert.deepEqual(state,before);
});

test('DECK04c vigencia cubre revisión, cambios sin revisión y supuestos del límite o evidencia',()=>{
 const state=fixture(),options={maxCandidates:10},result=report(state,options);
 assert.equal(arcanaChoicesAreCurrent(result,state,options),true);assert.equal(arcanaChoicesAreCurrent(result,state,{maxCandidates:11}),false);assert.equal(arcanaChoicesAreCurrent(result,state,{...options,requireObserved:true}),false);
 const edited=structuredClone(state);edited.observed.money=known(15);assert.equal(edited.revision,state.revision);assert.equal(arcanaChoicesAreCurrent(result,edited,options),false);
 const revised=structuredClone(state);revised.revision++;assert.equal(arcanaChoicesAreCurrent(result,revised,options),false);
 const assumed=structuredClone(state);assumed.assumptions.horizonRounds=2;assert.equal(arcanaChoicesAreCurrent(result,assumed,options),false);
});

test('DECK04c Mega solo proyecta siguiente uso, mantiene mano y recalcula sin entrada elegida',()=>{
 const state=fixture(undefined,true),result=report(state),used=after(target(result,'steel',['KS']));
 assert.equal(used.phase,'open_pack');assert.equal(context(used).remainingChoices,1);assert.deepEqual(context(used).selectedEntryIds,['steel']);assert.deepEqual(value(context(used).heldCardIds!),hand);
 assert.equal(context(state).remainingChoices,2);const next=report(used);assert.equal(next.remainingChoices,1);assert.equal(choices(next,'steel').length,0);assert.equal(next.coverage.scope,'next-choice');
 assert.equal(cards(used).find(card=>card.instanceId==='KS')!.enhancement,'steel');assert.equal(value(value(used.observed.jokerContext!).tarotsUsed!),1);
});
