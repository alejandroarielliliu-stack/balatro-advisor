import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseState} from '../src/state/validation.js';
import {standardDeck,jokerDefinition} from '../src/catalog/initial.js';
import {initialCounters} from '../src/catalog/joker-counters.js';
import {beginRound,applyRoundEvent,finishRound} from '../src/rules/round.js';
import type {RoundState,RoundEvent} from '../src/rules/round.js';
import type {GameState,JokerInstance} from '../src/state/model.js';
import type {EffectChoice} from '../src/rules/full-joker-contract.js';
import {known,success} from './helpers.js';
const now='2026-10-12T14:00:00Z';
const fixture=()=>success(parseState(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8')));
function joker(id:string,values:Record<string,number>={}):JokerInstance{
 const counters:JokerInstance['counters']=initialCounters(id);for(const [k,n]of Object.entries(values))counters[k]=known(n);
 return{instanceId:id,catalogId:id,edition:known('base'),stickers:known([]),sellValue:known(jokerDefinition(id)!.sell),counters};
}
function state(js:JokerInstance[]):GameState{const s=fixture();s.observed.jokers=known(js);return s;}
function apply(round:RoundState,event:RoundEvent){return success(applyRoundEvent(round,event,{expectedRevision:round.game.revision,updatedAt:now}));}
const initial=['2S','2H','3S','3H','4S','4H','5S','5H'];
const num=(f:GameState['observed']['money'])=>f.status==='known'?f.value:NaN;
function setBlind(s:GameState,bossId:string,ante=2){s.observed.nextBlind=known({ante,kind:'boss',bossId:known(bossId),target:known((ante===8?50000:800)*(bossId==='the_wall'?4:2)),reward:known(5)});}

test('Burglar concede manos y elimina descartes al iniciar; un plan de descarte se rechaza',()=>{
 const original=state([joker('burglar')]),before=structuredClone(original),round=success(beginRound(original,initial));
 // Blue gives5 basehands, Burglar+3. This literal oracle comes from game.lua417/card.lua2522.
 assert.equal(round.handsLeft,8);assert.equal(round.initialHands,8);assert.equal(round.discardsLeft,0);assert.deepEqual(original,before);
 const failed=applyRoundEvent(round,{type:'discard',cardIds:['2S'],drawnCardIds:['AS']},{expectedRevision:0,updatedAt:now});assert.equal(failed.ok,false);
});
test('Madness y Ceremonial Dagger respetan orden real; destrucción de Turtle ajusta la capacidad',()=>{
 const mad=joker('madness'),bean=joker('turtle_bean'),s=state([mad,bean]);s.observed.resources.handSize=known(13);
 const round=success(beginRound(s,initial));assert.equal(round.hand.length,8);assert.deepEqual(round.game.observed.resources.handSize,known(8));assert.equal(round.game.observed.jokers.status==='known'?round.game.observed.jokers.value.length:0,1);
 const dagger=state([joker('ceremonial'),joker('madness')]);const d=success(beginRound(dagger,initial));assert.equal(d.game.observed.jokers.status==='known'?d.game.observed.jokers.value[0]!.catalogId:'','ceremonial');
 // Dagger destroys Madness before Madness can execute; twice $3 base sale = +6Mult.
 assert.equal(d.game.observed.jokers.status==='known'&&d.game.observed.jokers.value[0]!.counters.mult!.status==='known'?d.game.observed.jokers.value[0]!.counters.mult!.value:-1,6);
});
test('MrBones consume al agotar manos y registra rescate sin superar objetivo ni cobrar ciega',()=>{
 const original=state([joker('mr_bones')]),before=structuredClone(original);let round=success(beginRound(original,initial));
 for(const [rank,draw]of [['2',['6S','6H']],['3',['7S','7H']],['4',['8S','8H']],['5',['9S','9H']],['6',[]]] as [string,string[]][]){round=apply(round,{type:'play',cardIds:[rank+'S',rank+'H'],drawnCardIds:draw}).round;}
 // Level1 pairs: (10+2r)*2 for r=2..6 => 28+32+36+40+44 =180. Bigtarget450;25%=112.5.
 assert.equal(round.score,180);assert.equal(round.status,'rescued');assert.equal(round.handsLeft,0);assert.equal(round.rescuedBy,'mr_bones');assert.deepEqual(original,before);
 const settled=success(finishRound(round,{expectedRevision:round.game.revision,updatedAt:now}));assert.equal(settled.outcome,'rescued');assert.equal(settled.goalReached,false);assert.equal(settled.cashout!.blindReward,0);assert.equal(settled.cashout!.earned,1);
});
test('MrBones permite finalizar ante8 Boss al salvar; el objetivo de fichas sigue sin alcanzarse',()=>{
 const s=state([joker('mr_bones')]);s.observed.nextBlind=known({ante:8,kind:'boss',bossId:known('violet_vessel'),target:known(300000),reward:known(8)});
 // Literal level35 pair progression from game.lua:10+34*15=520chips;2+34=36Mult.
 s.observed.handBases=known({values:{high_card:known({level:1,chips:5,mult:1}),pair:known({level:35,chips:520,mult:36}),two_pair:known({level:1,chips:20,mult:2}),three_kind:known({level:1,chips:30,mult:3}),straight:known({level:1,chips:30,mult:4}),flush:known({level:1,chips:35,mult:4}),full_house:known({level:1,chips:40,mult:4}),four_kind:known({level:1,chips:60,mult:7}),straight_flush:known({level:1,chips:100,mult:8})}});
 let round=success(beginRound(s,initial));for(const [rank,draw]of [['2',['6S','6H']],['3',['7S','7H']],['4',['8S','8H']],['5',['9S','9H']],['6',[]]] as [string,string[]][])round=apply(round,{type:'play',cardIds:[rank+'S',rank+'H'],drawnCardIds:draw}).round;
 // sum(520+2r)*36, r2..6 =95040; threshold75000, target300000.
 assert.equal(round.score,95040);assert.equal(round.status,'rescued');const ended=success(finishRound(round,{expectedRevision:round.game.revision,updatedAt:now}));assert.equal(ended.goalReached,true);assert.equal(ended.outcome,'rescued');assert.equal(ended.cashout,null);
});
test('DNA conserva copia en mano y Hiker conserva cambios permanentes; no se generan robos de más',()=>{
 const s=state([joker('dna'),joker('hiker')]),before=structuredClone(s),round=success(beginRound(s,initial));
 const result=apply(round,{type:'play',cardIds:['2S'],drawnCardIds:[]});
 // Highcard5+2=7 before Hiker grows +5; DNA made one extra copy, so8 cards remain in hand.
 assert.equal(result.handScore!.score,7);assert.equal(result.round.hand.length,8);assert.ok(result.round.hand.includes('dna:dna:2S'));assert.equal(result.round.remaining.length+result.round.hand.length+result.round.spent.length,53);
 const deck=result.round.game.observed.deck;assert.equal(deck.status==='known'&&'cards'in deck.value?deck.value.cards.find(c=>c.instanceId==='2S')!.extraChips:-1,5);assert.deepEqual(s,before);
 assert.equal(applyRoundEvent(round,{type:'play',cardIds:['2S'],drawnCardIds:['AS']},{expectedRevision:0,updatedAt:now}).ok,false);
});
test('Riff-Raff añade dos comunes y Certificate exige incluir su carta en la mano inicial',()=>{
 const riff=state([joker('riff_raff')]),created1={...joker('joker'),instanceId:'generated:joker'},created2={...joker('half_joker'),instanceId:'generated:half'};
 const choices:EffectChoice[]=[{key:'riff_raff:riff_raff:1',kind:'joker',value:created1,knowledge:'hypothetical',basis:'Rama concreta de dos comunes.'},{key:'riff_raff:riff_raff:2',kind:'joker',value:created2,knowledge:'hypothetical',basis:'Rama concreta de dos comunes.'}];
 const started=success(beginRound(riff,initial,{},choices));assert.equal(started.game.observed.jokers.status==='known'?started.game.observed.jokers.value.length:0,3);
 const cert=state([joker('certificate')]),card={...standardDeck()[0]!,instanceId:'certificate:new',seal:'red'},c:EffectChoice={key:'certificate:certificate',kind:'card',value:card,knowledge:'hypothetical',basis:'Certificado genera un dos con sello rojo.'};
 assert.equal(beginRound(cert,initial,{},[c]).ok,false);const legal=success(beginRound(cert,[...initial.slice(0,7),card.instanceId],{},[c]));assert.equal(legal.generatedHandIds[0],card.instanceId);assert.equal(legal.hand.length,8);
});
test('Trading destruye carta y paga solo en primer descarte; Burnt sube la categoría antes de puntuar',()=>{
 const s=state([joker('trading'),joker('burnt')]),round=success(beginRound(s,initial));
 const r=apply(round,{type:'discard',cardIds:['2S'],drawnCardIds:['AS']}).round;
 assert.equal(num(r.game.observed.money),10);assert.equal([...r.hand,...r.remaining,...r.spent].includes('2S'),false);
 const bases=r.game.observed.handBases;assert.equal(bases.status==='known'&&'values'in bases.value&&bases.value.values.high_card.status==='known'?bases.value.values.high_card.value.chips:-1,15);
 const second=apply(r,{type:'discard',cardIds:['2H'],drawnCardIds:['AH']}).round;assert.equal(num(second.game.observed.money),10);assert.ok(second.spent.includes('2H'));
});
test('Glass exige rama explícita; rotura quita la carta, crece GlassJoker y limpia solo referencias legacy',()=>{
 const s=state([joker('glass')]),cards=standardDeck();cards.find(c=>c.instanceId==='8S')!.enhancement='glass';s.observed.deck=known({cards});const before=structuredClone(s),round=success(beginRound(s,['8S','3S','3H','4S','4H','5S','5H','6S']));
 assert.equal(applyRoundEvent(round,{type:'play',cardIds:['8S'],drawnCardIds:['AS']},{expectedRevision:0,updatedAt:now}).ok,false);
 const c:EffectChoice={key:'after_hand:glass:card:8S:1',kind:'boolean',value:true,knowledge:'hypothetical',basis:'Rama explícita: se rompe la carta de cristal.'};
 const next=apply(round,{type:'play',cardIds:['8S'],drawnCardIds:['AS'],choices:[c]}).round;assert.equal([...next.hand,...next.spent,...next.remaining].includes('8S'),false);
 const js=next.game.observed.jokers;assert.equal(js.status==='known'&&js.value[0]!.counters.x100!.status==='known'?js.value[0]!.counters.x100!.value:-1,175);assert.equal(next.game.assumptions.probes.some(p=>p.playedCardIds.includes('8S')),false);assert.deepEqual(s,before);
});
test('Rocket jefe paga crecimiento en mismo cobro y Oro retenido contribuye al interés',()=>{
 const s=state([joker('rocket'),joker('half_joker'),joker('mime')]);setBlind(s,'the_psychic');
 // Psychic requires5 played cards, so use Wall and a level1 pair+Half:52*22? pair8 =>572, belowWall1200.
 setBlind(s,'the_wall');s.observed.deckId=known('plasma');s.observed.nextBlind=known({ante:2,kind:'boss',bossId:known('the_wall'),target:known(6400),reward:known(5)});s.observed.resources.handsPerRound=known(4);
 const cards=standardDeck();cards.find(c=>c.instanceId==='3S')!.enhancement='gold';cards.find(c=>c.instanceId==='3S')!.seal='red';s.observed.deck=known({cards});
 let round=success(beginRound(s,initial));round=apply(round,{type:'play',cardIds:['2S','2H'],drawnCardIds:['AS','AH']}).round;
 // Plasma pair2+Half:chips14,Mult22 =>floor(36/2)^2=324, notwon; use extra chips literal observed handbase to avoid false success.
 // Instead finish a real synthetic winning high-card withpermanent500chips on AS afteritsdraw.
 const deck=round.game.observed.deck;if(deck.status==='known'&&'cards'in deck.value)deck.value.cards.find(c=>c.instanceId==='AS')!.extraChips=500;
 round=apply(round,{type:'play',cardIds:['AS'],drawnCardIds:[]}).round;assert.equal(round.status,'won');
 const out=success(finishRound(round,{expectedRevision:round.game.revision,updatedAt:now}));
 // HeldGold3S: original+Red+Mime => $9 beforeinterest; initial$7 =>interestfloor16/5=3. Rocket$3 aftergrowth.
 assert.equal(out.cashout!.balanceBefore,16);assert.equal(out.cashout!.interest,3);assert.equal(out.cashout!.otherJokerIncome,3);
});
test('Luchador se vende durante ronda y reduce Wall, sin consumir recursos; venta en tienda no basta',()=>{
 const s=state([joker('luchador'),joker('half_joker')]);setBlind(s,'the_wall');let round=success(beginRound(s,['8S','8H','AS','AH','KS','KH','3S','3H']));
 round=apply(round,{type:'play',cardIds:['8S','8H'],drawnCardIds:['4S','4H']}).round;assert.equal(round.score,572);assert.equal(round.status,'active');
 // Wall ante2 target3200 ->1600 aftersale. Pair8 572 + pairA704 + pairK660 =1936.
 const sold=apply(round,{type:'sell_joker',instanceId:'luchador',cardIds:[],drawnCardIds:[]}).round;assert.equal(sold.handsLeft,4);assert.equal(sold.discardsLeft,3);assert.equal(num(sold.game.observed.money),9);
 const second=apply(sold,{type:'play',cardIds:['AS','AH'],drawnCardIds:['5S','5H']}).round;
 const final=apply(second,{type:'play',cardIds:['KS','KH'],drawnCardIds:[]}).round;assert.equal(final.status,'won');assert.equal(final.score,1936);
});
test('BlueSeal genera planeta de última mano, Mime lo repite hasta capacidad; Purple exige Tarot declarado',()=>{
 const s=state([joker('half_joker'),joker('mime')]),cards=standardDeck();cards.find(c=>c.instanceId==='3S')!.seal='blue';cards.find(c=>c.instanceId==='4S')!.seal='purple';s.observed.deck=known({cards});
 const round=success(beginRound(s,['8S','8H','3S','3H','4S','4H','5S','5H']));
 assert.equal(applyRoundEvent(round,{type:'discard',cardIds:['4S'],drawnCardIds:['AS']},{expectedRevision:0,updatedAt:now}).ok,false);
 const tarot={instanceId:'purple:tarot',catalogId:'c_fool',kind:'tarot' as const,edition:'base' as const,sellValue:1};
 const discarded=apply(round,{type:'discard',cardIds:['4S'],drawnCardIds:['AS'],choices:[{key:'discard:purple:card:4S:1',kind:'consumable',value:tarot,knowledge:'hypothetical',basis:'Sello morado crea El Loco.'}]}).round;
 const won=apply(discarded,{type:'play',cardIds:['8S','8H'],drawnCardIds:[]}).round;const finished=success(finishRound(won,{expectedRevision:won.game.revision,updatedAt:now}));
 const ctx=finished.state.observed.jokerContext;assert.equal(ctx?.status==='known'&&ctx.value.consumables?.status==='known'?ctx.value.consumables.value.length:-1,2);assert.equal(ctx?.status==='known'&&ctx.value.consumables?.status==='known'?ctx.value.consumables.value[1]!.catalogId:'','c_mercury');
});
