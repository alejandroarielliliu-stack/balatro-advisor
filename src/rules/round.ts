import {consumeInvestments} from './tags.js';
import {grantBossDefeatTag} from './price-tags.js';
import {counterValue,updateCounter,decayJokers} from './joker-counters.js';
import {SCORING_EFFECTS as FX} from '../catalog/initial.js';
import {handCapacityForBoss} from '../catalog/blinds.js';
import {jokerResourceDelta} from '../catalog/joker-resources.js';
import {voucherResources} from '../catalog/vouchers.js';
import {deckDefinition} from '../catalog/decks.js';
import {CONSUMABLE_KINDS} from '../catalog/generation-jokers.js';
import type {Card,HandId} from '../catalog/initial.js';
import type {GameState} from '../state/model.js';
import type {EngineOptions,Trace} from './core.js';
import {blindInfo,deckCards,fail,greenValue,inventory,need,resources,run,safe,stateInput,valueFact} from './core.js';
import {scoreInternal,classifyHand} from './scoring.js';
import type {HandScore} from './scoring.js';
import {cashoutInternal} from './economy.js';
import type {Cashout} from './economy.js';
import {applyShopAction} from './shop.js';
import type {Mutation} from './shop.js';
import {validateState} from '../state/validation.js';
import {validateEffectChoices} from '../state/effect-choices.js';
import {effectiveJokers} from './joker-context.js';
import {historyEvent,historyResourceDelta,historySelectBlindJoker,resetRoundHistory,rescueWithBones} from './history-jokers.js';
import {generationEvent,generationCardsDestroyed} from './generation-jokers.js';
import {randomEvent} from './random-jokers.js';
import {economicEvent,bankBalance} from './economic-jokers.js';
import {booleanChance,effectKey,requireChoice} from './effect-choices.js';
import type {Consumable,EffectChoice,FullEventInput} from './full-joker-contract.js';

/** Ephemeral projected round. Scenario generation never enters observed storage automatically. */
export interface RoundState {
 game:GameState;hand:string[];remaining:string[];spent:string[];
 handsLeft:number;discardsLeft:number;initialHands:number;initialDiscards:number;generatedHandIds:string[];capacityOverflow:number;score:number;
 status:'active'|'won'|'lost'|'rescued'|'settled';rescuedBy?:string;lastHand?:HandId;
}
export type RoundEvent={type:'play'|'discard'|'sell_joker';cardIds:string[];drawnCardIds:string[];instanceId?:string;choices?:EffectChoice[];bossDiscardedCardIds?:string[]};
function checkRound(round:RoundState,use:(id:string)=>void):RoundState{
 if(!round||typeof round!=='object')fail('$round','invalid_round','Falta una ronda creada por beginRound.');
 const game=stateInput(round.game,use),r=resources(game),blind=blindInfo(game),deck=deckCards(game);inventory(game);
 if(![round.hand,round.remaining,round.spent,round.generatedHandIds].every(a=>Array.isArray(a)&&a.every(id=>typeof id==='string')))fail('$round','invalid_round','Listas de cartas de ronda inválidas.');
 const all=[...round.hand,...round.remaining,...round.spent];
 if(all.length!==deck.length||new Set(all).size!==deck.length||all.some(id=>!deck.some(c=>c.instanceId===id)))fail('$round','invalid_round','Cada carta del mazo debe estar exactamente en mano, disponible o gastada.');
 if(new Set(round.generatedHandIds).size!==round.generatedHandIds.length||round.generatedHandIds.some(id=>!deck.some(c=>c.instanceId===id)))fail('$round.generatedHandIds','invalid_round','IDs de cartas generadas incoherentes.');
 const generatedHeld=round.generatedHandIds.filter(id=>round.hand.includes(id)).length;
 if(!Number.isSafeInteger(round.initialHands)||round.initialHands<1||round.initialHands>100||!Number.isSafeInteger(round.initialDiscards)||round.initialDiscards<0||round.initialDiscards>100
 ||!Number.isSafeInteger(round.capacityOverflow)||round.capacityOverflow<0||round.capacityOverflow>200||round.hand.length>handCapacityForBoss(r.handSize,blind.boss)+generatedHeld+round.capacityOverflow||!Number.isSafeInteger(round.handsLeft)||round.handsLeft<0||round.handsLeft>round.initialHands||!Number.isSafeInteger(round.discardsLeft)||round.discardsLeft<0||round.discardsLeft>round.initialDiscards)fail('$round','invalid_resources','Recursos o tamaño de mano incoherentes.');
 safe(round.score,'$round.score');const expected=round.score>=blind.target?'won':round.handsLeft===0?'lost':'active';
 const rescued=round.status==='rescued'&&expected==='lost'&&!!round.rescuedBy&&round.score>=blind.target/4&&!inventory(game).some(j=>j.instanceId===round.rescuedBy);
 if(!['active','won','lost','rescued','settled'].includes(round.status)||round.status!=='settled'&&!rescued&&round.status!==expected)fail('$round.status','invalid_round','Estado de ronda incoherente con objetivo y manos.');
 return{...structuredClone(round),game};
}
function revise(game:GameState,mutation:Mutation){
 if(!mutation||mutation.expectedRevision!==game.revision)fail('$.revision','stale_revision','Evento basado en una revisión obsoleta.');
 game.revision=safe(game.revision+1);game.updatedAt=mutation.updatedAt;const checked=validateState(game);if(!checked.ok){const e=checked.errors[0]!;fail(e.path,e.code,e.message);}
}
function clearDestroyedLegacyReferences(game:GameState,trace:Trace[]){
 const ids=new Set(deckCards(game).map(c=>c.instanceId)),before=game.assumptions.probes.length+game.assumptions.roundPlans.length;
 game.assumptions.probes=game.assumptions.probes.filter(p=>p.playedCardIds.every(id=>ids.has(id)));
 game.assumptions.roundPlans=game.assumptions.roundPlans.filter(p=>[...p.initialHandCardIds,...p.events.flatMap(e=>[...e.cardIds,...e.drawnCardIds])].every(id=>ids.has(id)));
 const removed=before-game.assumptions.probes.length-game.assumptions.roundPlans.length;
 if(removed)trace.push({ruleId:'round.resources',label:'Referencias de pruebas guardadas a cartas destruidas invalidadas; plan externo intacto',values:{removed}});
}
function choicesInput(choices:readonly EffectChoice[]){const checked=validateEffectChoices(choices);if(!checked.ok){const e=checked.errors[0]!;fail(e.path,e.code,e.message);}return checked.value;}
function syncResourceBases(game:GameState){
 const base=voucherResources(need(game.observed.deckId,'$.deckId'),need(game.observed.outOfScope,'$.outOfScope').vouchers),js=inventory(game),delta=jokerResourceDelta(js.map(j=>j.catalogId));delta.handSize+=historyResourceDelta(js).handSize;
 game.observed.resources.handsPerRound=valueFact(base.hands+delta.hands);game.observed.resources.discardsPerRound=valueFact(base.discards+delta.discards);game.observed.resources.handSize=valueFact(base.handSize+delta.handSize);
}
function syncPartitions(round:RoundState,generated:Record<string,'hand'|'deck'>){
 const cards=deckCards(round.game),ids=new Set(cards.map(c=>c.instanceId));
 round.hand=round.hand.filter(id=>ids.has(id));round.remaining=round.remaining.filter(id=>ids.has(id));round.spent=round.spent.filter(id=>ids.has(id));round.generatedHandIds=round.generatedHandIds.filter(id=>ids.has(id));
 const assigned=new Set([...round.hand,...round.remaining,...round.spent]);
 for(const c of cards)if(!assigned.has(c.instanceId)){
  if(generated[c.instanceId]==='hand'){round.hand.push(c.instanceId);round.generatedHandIds.push(c.instanceId);}else round.remaining.push(c.instanceId);
 }
}
function pay(game:GameState,dollars:number){if(dollars)game.observed.money=valueFact(bankBalance(need(game.observed.money,'$.observed.money')+dollars));}
function initializeLegacyContext(game:GameState){
 const exclusions=need(game.observed.outOfScope,'$.observed.outOfScope'),existing=game.observed.jokerContext,ctx=existing?.status==='known'?existing.value:{};
 if(!ctx.consumables&&!exclusions.consumables.length)ctx.consumables=valueFact([]);
 if(!ctx.tags&&!exclusions.pendingTags.length)ctx.tags=valueFact([]);
 if(!ctx.consumableSlots)ctx.consumableSlots=valueFact(deckDefinition(need(game.observed.deckId,'$.deckId'))!.consumableSlots);
 game.observed.jokerContext=valueFact(ctx);
}
function consumableInventory(game:GameState){
 const fact=game.observed.jokerContext;if(!fact)fail('$.jokerContext','unknown_data','Falta inventario de consumibles.');const ctx=need(fact,'$.jokerContext');
 if(!ctx.consumables||!ctx.consumableSlots)fail('$.jokerContext','unknown_data','Faltan consumibles o espacios para aplicar el sello.');
 return{items:need(ctx.consumables,'$.consumables'),slots:need(ctx.consumableSlots,'$.consumableSlots')};
}
function purpleSeal(input:FullEventInput,card:Card){
 if(card.seal!=='purple'||card.debuff)return;const {items,slots}=consumableInventory(input.state);if(items.filter(c=>c.edition!=='negative').length>=slots)return;
 const key=effectKey('discard','purple','card',card.instanceId),c=requireChoice(input,key,'consumable').value;
 if(typeof c!=='object'||!('kind'in c)||c.kind!=='tarot'||CONSUMABLE_KINDS[c.catalogId]!=='tarot'||c.edition!=='base'||items.some(x=>x.instanceId===c.instanceId))fail('$choices.'+key,'invalid_outcome','Sello morado necesita un Tarot base concreto con ID nuevo.');
 items.push(structuredClone(c as Consumable));input.trace.push({ruleId:'jokers.random',label:'Sello morado crea el Tarot explícito',values:{cardId:card.instanceId,created:c.instanceId,catalogId:c.catalogId}});
}
const planets:Record<HandId,string>={high_card:'c_pluto',pair:'c_mercury',two_pair:'c_uranus',three_kind:'c_venus',straight:'c_saturn',flush:'c_jupiter',full_house:'c_earth',four_kind:'c_mars',straight_flush:'c_neptune',five_kind:'c_planet_x',flush_house:'c_ceres',flush_five:'c_eris'};
function heldEndRound(round:RoundState,trace:Trace[],use:(id:string)=>void){
 const copies=effectiveJokers(inventory(round.game)).filter(j=>j.catalogId==='mime').length;
 for(const id of round.hand){const card=deckCards(round.game).find(c=>c.instanceId===id)!;if(card.debuff)continue;
  const repeats=1+copies+(card.seal==='red'?1:0);
  for(let n=0;n<repeats;n++){
   if(card.enhancement==='gold'){use('jokers.generation');pay(round.game,3);trace.push({ruleId:'jokers.generation',label:'Oro retenido antes del cobro',values:{cardId:id,activation:n+1,dollars:3}});}
   if(card.seal==='blue'){
    const {items,slots}=consumableInventory(round.game);if(items.filter(c=>c.edition!=='negative').length>=slots)continue;
    if(!round.lastHand)fail('$round.lastHand','unknown_data','Sello azul requiere la última categoría jugada.');
    let instanceId=id+':blue:'+n,index=1;while(items.some(c=>c.instanceId===instanceId))instanceId=id+':blue:'+n+':'+index++;
    const catalogId=planets[round.lastHand];items.push({instanceId,catalogId,kind:'planet',edition:'base',sellValue:1,handId:round.lastHand});use('jokers.generation');trace.push({ruleId:'jokers.generation',label:'Sello azul crea el planeta de la última mano',values:{cardId:id,activation:n+1,catalogId,created:instanceId}});
   }
  }
 }
}

export function beginRound(input:unknown,initialHand:string[],options:EngineOptions & {enteringFromShop?:boolean}={},choices:readonly EffectChoice[]=[]){
 return run<RoundState>(['round.resources','base.configuration','blind.effects'],options,(trace,use)=>{
  const game=stateInput(input,use),r=resources(game),checkedChoices=choicesInput(choices),generatedLocations:Record<string,'hand'|'deck'>={};inventory(game);initializeLegacyContext(game);
  const event:FullEventInput={state:game,stage:'end_shop',cards:[],choices:checkedChoices,generatedLocations,trace,use};
  if(options.enteringFromShop!==false)generationEvent(event,effectiveJokers(inventory(game)));
  resetRoundHistory(game);
  const startingBoss=blindInfo(game).boss;
  let handsLeft=startingBoss==='the_needle'?1:r.hands,discardsLeft=startingBoss==='the_water'?0:r.discards;
  event.stage='select_blind';
  for(const actorId of inventory(game).map(j=>j.instanceId)){
   const actor=inventory(game).find(j=>j.instanceId===actorId);if(!actor)continue;
   const beforeDiscards=need(game.observed.resources.discardsPerRound,'$.resources.discardsPerRound'),beforeDisabled=blindInfo(game).disabled;
   historySelectBlindJoker(event,actor);
   const effective=effectiveJokers(inventory(game)).find(j=>j.instanceId===actorId);
   if(effective?.catalogId==='burglar'){use('jokers.history');handsLeft+=3;discardsLeft=0;trace.push({ruleId:'jokers.history',label:'Burglar al seleccionar ciega',values:{instanceId:actorId,handsAdded:3,discardsLeft}});}
   if(effective)generationEvent(event,[effective]);
   syncResourceBases(game);
   discardsLeft=Math.max(0,discardsLeft+need(game.observed.resources.discardsPerRound,'$.resources.discardsPerRound')-beforeDiscards);
   if(!beforeDisabled&&blindInfo(game).disabled){
    if(startingBoss==='the_water')discardsLeft+=r.discards;
    if(startingBoss==='the_needle')handsLeft+=r.hands-1;
   }
  }
  const after=resources(game),blind=blindInfo(game),deck=deckCards(game),required=Math.min(handCapacityForBoss(after.handSize,blind.boss),deck.length),createdInHand=Object.keys(generatedLocations).filter(id=>generatedLocations[id]==='hand');
  if(!Array.isArray(initialHand)||initialHand.length!==required||new Set(initialHand).size!==initialHand.length||initialHand.some(id=>!deck.some(c=>c.instanceId===id))||createdInHand.some(id=>!initialHand.includes(id)))fail('$initialHand','invalid_initial_hand',`Se necesitan ${required} cartas distintas del mazo tras los efectos de inicio, incluidas ${createdInHand.length} generadas en mano.`);
  trace.push({ruleId:'round.resources',label:'Inicio de ronda; recursos tras jefe y comodines',values:{hands:handsLeft,discards:discardsLeft,target:blind.target}});
  return{game,hand:[...initialHand],remaining:deck.filter(c=>!initialHand.includes(c.instanceId)).map(c=>c.instanceId),spent:[],handsLeft,discardsLeft,initialHands:handsLeft,initialDiscards:discardsLeft,generatedHandIds:createdInHand,capacityOverflow:0,score:0,status:'active'};
 });
}

function validateSelectedCards(round:RoundState,cardIds:string[]){
 if(!Array.isArray(cardIds)||cardIds.length<1||cardIds.length>5||new Set(cardIds).size!==cardIds.length||cardIds.some(id=>!round.hand.includes(id)))fail('$event.cardIds','cards_not_in_hand','Selecciona de una a cinco cartas distintas que estén en mano.');
}

interface RoundEffects {
 handsUsed:number;discardsUsed:number;choices:EffectChoice[];
 generatedLocations:Record<string,'hand'|'deck'>;trace:Trace[];use:(id:string)=>void;
}

function applyDiscardEffects(round:RoundState,cardIds:string[],effects:RoundEffects,forcedDiscard=false){
 const {trace,use}=effects;
 const deck=deckCards(round.game),discarded=cardIds.map(id=>deck.find(c=>c.instanceId===id)!);
 const event:FullEventInput={...effects,state:round.game,stage:'discard',cards:discarded,hand:classifyHand(discarded,inventory(round.game).map(j=>j.catalogId)).hand,forcedDiscard};
 const history=historyEvent(event);pay(round.game,history.money+economicEvent(event));generationEvent(event,effectiveJokers(inventory(round.game)));for(const c of discarded)purpleSeal(event,c);
 for(const joker of [...inventory(round.game)]){
  if(joker.catalogId==='hit_the_road'){const n=discarded.filter(c=>!c.debuff&&c.enhancement!=='stone'&&c.rank==='J').length;updateCounter(joker,'x100',counterValue(joker,'x100')+50*n,trace);}
  if(joker.catalogId==='yorick'){let left=counterValue(joker,'remaining'),mult=counterValue(joker,'x100');for(const _ of discarded){left--;if(!left){left=23;mult+=100;}}updateCounter(joker,'remaining',left,trace);updateCounter(joker,'x100',mult,trace);}
  if(joker.catalogId==='ramen'){const after=counterValue(joker,'x100')-discarded.length;if(after<=100){const list=inventory(round.game);list.splice(list.indexOf(joker),1);trace.push({ruleId:'jokers.context',label:'Ramen consumido',values:{instanceId:joker.instanceId}});}else updateCounter(joker,'x100',after,trace);}
 }
 for(const joker of inventory(round.game))if(joker.catalogId==='green_joker'){
  use('green.changes');const before=greenValue(joker),after=Math.max(0,before-FX.greenPerDiscard);joker.counters.greenMult=valueFact(after);trace.push({ruleId:'green.changes',label:'Un decremento por acción de descarte',values:{instanceId:joker.instanceId,discardedCards:cardIds.length,before,after}});
 }
}

type RoundPlay=Pick<RoundEvent,'cardIds'|'bossDiscardedCardIds'|'choices'>;

function scoreRoundPlay(round:RoundState,play:RoundPlay,effects:RoundEffects,copyDiscardState=false){
 const {cardIds}=play,{handsUsed,discardsUsed,choices,trace,use}=effects;
 const retained=round.hand.filter(id=>!cardIds.includes(id));
 const hook=blindInfo(round.game).boss==='the_hook';
 const required=hook?Math.min(2,retained.length):0;
 const bossDiscarded=play.bossDiscardedCardIds===undefined?[]:play.bossDiscardedCardIds;
 if(!Array.isArray(bossDiscarded)||bossDiscarded.length!==required||new Set(bossDiscarded).size!==required||bossDiscarded.some(id=>!retained.includes(id)))
  fail('$event.bossDiscardedCardIds','invalid_boss_discard',`El efecto de esta ciega requiere indicar ${required} cartas distintas de las que quedan en mano.`);
 if(bossDiscarded.length){
  trace.push({ruleId:'blind.effects',label:'El garfio descarta antes de puntuar sin gastar un descarte',values:{cards:bossDiscarded.join(', '),count:bossDiscarded.length}});
  const jokers=round.game.observed.jokers;
  if(jokers.status!=='known'||jokers.value.length>0||deckCards(round.game).some(card=>card.seal==='purple'&&bossDiscarded.includes(card.instanceId))){
   if(copyDiscardState)round={...round,game:structuredClone(round.game)};
   applyDiscardEffects(round,retained.filter(id=>bossDiscarded.includes(id)),effects,true);
  }
 }
 const handScore=scoreInternal(round.game,{cardIds,discardsRemaining:round.discardsLeft,heldCardIds:retained.filter(id=>!bossDiscarded.includes(id)),remainingCardIds:round.remaining,handsRemaining:round.handsLeft-1,handsUsed,discardsUsed,choices,roundInitialHands:round.initialHands,roundInitialDiscards:round.initialDiscards,generatedHandIds:round.generatedHandIds,capacityOverflow:round.capacityOverflow},trace,use,hook);
 return {handScore,bossDiscarded};
}

/** Fast preview for a round already built or validated by the round engine. */
export function previewProjectedRoundPlay(round:RoundState,play:RoundPlay,trace:Trace[],use:(id:string)=>void):HandScore{
 validateSelectedCards(round,play.cardIds);
 return scoreRoundPlay(round,play,{handsUsed:round.initialHands-round.handsLeft,discardsUsed:round.initialDiscards-round.discardsLeft,choices:choicesInput(play.choices??[]),generatedLocations:{},trace,use},true).handScore;
}

/** Scores an explicit proposed play with its stated boss outcome on a projected copy. */
export function previewRoundPlay(input:RoundState,play:RoundPlay,options:EngineOptions={}){
 return run<HandScore>(['round.resources','base.configuration','blind.effects','score.base','hand.classification'],options,(trace,use)=>{
  const round=checkRound(input,use);if(round.status!=='active')fail('$round.status','round_finished','La ronda terminó; no se conceden acciones posteriores.');
  if(!play)fail('$event','invalid_event','Falta la jugada que se quiere puntuar.');
  return previewProjectedRoundPlay(round,play,trace,use);
 });
}

export function applyRoundEvent(input:RoundState,event:RoundEvent,mutation:Mutation,options:EngineOptions={}){
 return run<{round:RoundState;handScore:HandScore|null}>(['round.resources','base.configuration','blind.effects'],options,(trace,use)=>{
  const round=checkRound(input,use);if(round.status!=='active')fail('$round.status','round_finished','La ronda terminó; no se conceden acciones posteriores.');
  if(!event||!['play','discard','sell_joker'].includes(event.type))fail('$event','invalid_event','Solo play/discard/sell_joker están implementados.');
  if(event.type!=='play'&&event.bossDiscardedCardIds!==undefined)fail('$event.bossDiscardedCardIds','invalid_boss_discard','Solo al jugar una mano se resuelve un descarte forzado por la ciega.');
  if(event.type==='sell_joker'){
   if(!event.instanceId||event.cardIds.length||event.drawnCardIds.length)fail('$event','invalid_sale','Indica el comodín vendido y listas de cartas vacías.');
   const before=resources(round.game),oldBlind=blindInfo(round.game),sold=applyShopAction(round.game,{type:'sell',instanceId:event.instanceId,choices:choicesInput(event.choices??[])},mutation,{...options,activeBlind:true});
   if(!sold.ok){const e=sold.errors[0]!;fail(e.path,e.code,e.message);}trace.push(...sold.trace);round.game=sold.value.state;
   const after=resources(round.game),nextBlind=blindInfo(round.game),delta=after.discards-before.discards+(oldBlind.boss==='the_water'&&nextBlind.disabled?before.discards:0);
   if(oldBlind.boss==='the_manacle'&&nextBlind.disabled&&round.remaining.length>0)fail('$event','unsupported_blind','Vender aquí roba una carta al desactivar El grillete. Ese robo no se proyecta en una venta.');
   if(oldBlind.boss==='the_needle'&&nextBlind.disabled){round.handsLeft+=before.hands-1;round.initialHands+=before.hands-1;}
   round.discardsLeft=Math.max(0,round.discardsLeft+delta);round.initialDiscards=Math.max(round.discardsLeft,round.initialDiscards+delta);round.capacityOverflow=Math.max(0,round.hand.length-handCapacityForBoss(after.handSize,nextBlind.boss));
   if(round.score>=nextBlind.target)round.status='won';
   return{round,handScore:null};
  }
  validateSelectedCards(round,event.cardIds);
  const choices=choicesInput(event.choices??[]),generatedLocations:Record<string,'hand'|'deck'>={},handsUsed=round.initialHands-round.handsLeft,discardsUsed=round.initialDiscards-round.discardsLeft;
  const effects:RoundEffects={handsUsed,discardsUsed,choices,generatedLocations,trace,use};
  let handScore:HandScore|null=null;
  let removed=event.cardIds;
  if(event.type==='play'){
   use('score.base');use('hand.classification');
   const scored=scoreRoundPlay(round,event,effects);handScore=scored.handScore;
   removed=[...event.cardIds,...scored.bossDiscarded];
   round.game=handScore.stateAfter;round.lastHand=handScore.hand;Object.assign(generatedLocations,handScore.generatedLocations);round.score=safe(round.score+handScore.score);round.handsLeft--;
   for(const joker of inventory(round.game))if(joker.catalogId==='green_joker')joker.counters.greenMult=valueFact(handScore.greenAfter[joker.instanceId]!);
   const played=event.cardIds.map(id=>deckCards(round.game).find(c=>c.instanceId===id)!).filter(Boolean);
   const hook:FullEventInput={state:round.game,stage:'after_hand',cards:played,hand:handScore.hand,handsUsed,discardsUsed,choices,generatedLocations,trace,use};
   generationEvent(hook,effectiveJokers(inventory(round.game)));
   const shattered=played.filter(c=>c.enhancement==='glass'&&deckCards(round.game).some(d=>d.instanceId===c.instanceId)&&booleanChance(hook,effectKey('after_hand','glass','card',c.instanceId),4));
   if(shattered.length){const ids=new Set(shattered.map(c=>c.instanceId));round.game.observed.deck=valueFact({cards:deckCards(round.game).filter(c=>!ids.has(c.instanceId))});generationCardsDestroyed(round.game,shattered,[...ids],trace,use);}
   decayJokers(round.game,'hand',trace);
   if(round.score>=blindInfo(round.game).target)round.status='won';
   else if(round.handsLeft===0){
    const bones=inventory(round.game).find(j=>j.catalogId==='mr_bones');
    if(rescueWithBones(round.game,round.score,blindInfo(round.game).target,trace)){use('jokers.history');round.status='rescued';round.rescuedBy=bones!.instanceId;}else round.status='lost';
   }
  }else{
   if(round.discardsLeft===0)fail('$event','no_discards','No quedan descartes.');round.discardsLeft--;
   applyDiscardEffects(round,event.cardIds,effects);
  }
  round.hand=round.hand.filter(id=>!removed.includes(id));round.spent.push(...removed.filter(id=>deckCards(round.game).some(c=>c.instanceId===id)));syncPartitions(round,generatedLocations);syncResourceBases(round.game);
  const capacity=handCapacityForBoss(resources(round.game).handSize,blindInfo(round.game).boss);
  round.capacityOverflow=Math.max(0,round.hand.length-capacity);
  const count=round.status==='active'?Math.max(0,Math.min(capacity-round.hand.length,round.remaining.length)):0;
  if(!Array.isArray(event.drawnCardIds)||event.drawnCardIds.length!==count||new Set(event.drawnCardIds).size!==count||event.drawnCardIds.some(id=>!round.remaining.includes(id)))fail('$event.drawnCardIds','invalid_draws',`Indica exactamente ${count} cartas distintas aún disponibles; no se generan robos.`);
  round.hand.push(...event.drawnCardIds);round.remaining=round.remaining.filter(id=>!event.drawnCardIds.includes(id));clearDestroyedLegacyReferences(round.game,trace);revise(round.game,mutation);
  trace.push({ruleId:'round.resources',label:'Recursos y acumulado',values:{handsLeft:round.handsLeft,discardsLeft:round.discardsLeft,score:round.score,status:round.status}});return{round,handScore};
 });
}
export interface RoundFinish{state:GameState;cashout:Cashout|null;goalReached:boolean;outcome:'won'|'lost'|'rescued'}
export function finishRound(input:RoundState,mutation:Mutation,options:EngineOptions={},choices:readonly EffectChoice[]=[]){
 return run<RoundFinish>(['round.cashout','round.resources','base.configuration','blind.effects'],options,(trace,use)=>{
  const round=checkRound(input,use);if(round.status!=='won'&&round.status!=='lost'&&round.status!=='rescued')fail('$round.status','round_not_settleable','Solo se finaliza una ronda ganada, rescatada o perdida.');
  const blind=blindInfo(round.game),won=round.status!=='lost',goalReached=won&&blind.kind==='boss'&&blind.ante===8;
  const hook:FullEventInput={state:round.game,stage:'end_round',cards:round.hand.map(id=>deckCards(round.game).find(c=>c.instanceId===id)!),won,choices:choicesInput(choices),trace,use};
  const history=historyEvent(hook);economicEvent(hook);generationEvent(hook,effectiveJokers(inventory(round.game)));randomEvent(hook);decayJokers(round.game,'round',trace);syncResourceBases(round.game);if(won)heldEndRound(round,trace,use);
  const cashout=goalReached?null:cashoutInternal(round.game,round.handsLeft,won,trace,use,round.discardsLeft,{saved:round.status==='rescued',initialHands:round.initialHands,initialDiscards:round.initialDiscards,additionalJokerIncome:history.cashoutBonus});
  if(cashout){round.game.observed.money=valueFact(cashout.balanceAfter);consumeInvestments(round.game,won,blind.kind==='boss');}
  if(won&&blind.kind==='boss'){
   const gained=grantBossDefeatTag(round.game);
   if(gained){use('deck.anaglyph');trace.push({ruleId:'deck.anaglyph',label:'Anaglifo · Double Tag al vencer al jefe',values:{count:gained}});}
  }
  if(won)round.game.observed.lastCleared=valueFact({ante:blind.ante,kind:blind.kind});
  round.game.observed.nextBlind={status:'unknown',reason:'Registrar la siguiente ciega; no se genera un jefe.'};round.game.observed.shop={status:'unknown',reason:'Registrar ofertas nuevas; la tienda anterior ya no es válida.'};
  if(round.game.schemaVersion==='0.2')round.game={...round.game,phase:'unknown',phaseData:{reason:'La ronda calculada terminó; la siguiente fase real no se registra mediante esta proyección.'}};
  else round.game.phase='draft';
  round.game.assumptions.probes=[];round.game.assumptions.roundPlans=[];revise(round.game,mutation);
  trace.push({ruleId:'round.resources',label:'Final de ronda; rescate y objetivo de fichas se distinguen',values:{outcome:round.status,goalReached:String(goalReached)}});return{state:round.game,cashout,goalReached,outcome:round.status};
 });
}
export function formatTrace(trace:readonly Trace[]){return trace.map(step=>`${step.label} [${step.ruleId}]: ${Object.entries(step.values).map(([k,v])=>`${k}=${v}`).join(', ')}`).join('\n');}
