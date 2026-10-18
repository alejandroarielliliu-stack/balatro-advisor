import {verifyOrScoreEfhiii} from '../reference/efhiii-scoring.js';
import {fixedMainMult} from './fixed-main-mult.js';
import {randomBeforeJoker,randomCard,randomHeld,randomMain} from './random-jokers.js';
import {historyBefore,historyBeforeJoker,historyMain,historyCard,historyRoundResources} from './history-jokers.js';
import {generationBeforeJoker,generationCard,generationMain} from './generation-jokers.js';
import {economicCard,baseballBonus,bankBalance} from './economic-jokers.js';
import {booleanChance,effectKey} from './effect-choices.js';
import {validateEffectChoices} from '../state/effect-choices.js';
import type {EffectBonus,EffectChoice,FullJokerInput} from './full-joker-contract.js';
import {handPatterns} from './hand-patterns.js';
import {counterSpecs} from '../catalog/joker-counters.js';
import {counterValue,updateCounter} from './joker-counters.js';
import {advancedJoker} from '../catalog/advanced-jokers.js';
import {contextRule,scoringContext,requireCards,effectiveJokers,face,finalHand,stencilMultiplier} from './joker-context.js';
import type {ScoringContext} from './joker-context.js';
import {simpleJoker} from '../catalog/simple-jokers.js';
import {cardMatches,mainBonus,simpleRule} from './simple-jokers.js';
import {deckDefinition} from '../catalog/decks.js';
import type { GameState,JokerInstance } from '../state/model.js';
import { HAND_BASES, SCORING_EFFECTS as FX, cardChips, rankValue } from '../catalog/initial.js';
import type { Card, HandId } from '../catalog/initial.js';
import { blindInfo, fail, greenValue, inventory, need, resources, run, safe, scalar, selectCards, stateInput, valueFact, deckCards } from './core.js';
import type { EngineOptions, Trace } from './core.js';

export interface HandScore { hand: HandId; playedCardIds: string[]; scoringCardIds: string[]; chips: number; mult: number; score: number; greenAfter: Record<string, number>; countersAfter:Record<string,JokerInstance['counters']>;stateAfter:GameState;moneyDelta:number;generatedLocations:Record<string,'hand'|'deck'> }
export interface HandInput extends ScoringContext { cardIds: string[]; discardsRemaining: number;handsUsed?:number;discardsUsed?:number;choices?:EffectChoice[];roundInitialHands?:number;roundInitialDiscards?:number;generatedHandIds?:string[];capacityOverflow?:number }

function classify(cards: Card[],ids:readonly string[]): { hand: HandId; scoring: Card[] } {
  if(!cards.length)return {hand:'high_card',scoring:[]};
  const groups = new Map<string, Card[]>();
  for (const card of cards) groups.set(card.rank, [...(groups.get(card.rank) ?? []), card]);
  const sizes = [...groups.values()].sort((a,b) => b.length - a.length || rankValue(b[0]!) - rankValue(a[0]!));
  const patterns=handPatterns(cards,ids),straight=patterns.straight.length>0,flush=patterns.flush.length>0;
  let hand: HandId, ranksScoring: Set<string>;
  if (flush && sizes[0]!.length === 5) hand = 'flush_five';
  else if (flush && sizes[0]!.length === 3 && sizes[1]?.length === 2) hand = 'flush_house';
  else if (sizes[0]!.length === 5) hand = 'five_kind';
  else if (straight && flush) hand = 'straight_flush';
  else if (sizes[0]!.length === 4) hand = 'four_kind';
  else if (sizes[0]!.length === 3 && sizes[1]?.length === 2) hand = 'full_house';
  else if (flush) hand = 'flush';
  else if (straight) hand = 'straight';
  else if (sizes[0]!.length === 3) hand = 'three_kind';
  else if (sizes[0]!.length === 2 && sizes[1]?.length === 2) hand = 'two_pair';
  else if (sizes[0]!.length === 2) hand = 'pair';
  else hand = 'high_card';
  if(hand==='straight_flush')return {hand,scoring:cards.filter(c=>patterns.straight.includes(c)||patterns.flush.includes(c))};
  if(hand==='straight')return {hand,scoring:cards.filter(c=>patterns.straight.includes(c))};
  if(hand==='flush')return {hand,scoring:cards.filter(c=>patterns.flush.includes(c))};
  if (['flush_five','flush_house','five_kind','straight_flush','full_house','flush','straight'].includes(hand)) return { hand, scoring: cards };
  if (hand === 'high_card') return { hand, scoring: [cards.reduce((best,c) => rankValue(c) > rankValue(best) ? c : best)] };
  ranksScoring = new Set((hand === 'two_pair' ? sizes.slice(0,2) : sizes.slice(0,1)).map(g => g[0]!.rank));
  return { hand, scoring: cards.filter(c => ranksScoring.has(c.rank)) };
}

export function scoreInternal(original: GameState, input: HandInput, trace: Trace[], use: (id: string) => void): HandScore {
  if (!input || typeof input !== 'object') fail('$hand', 'invalid_hand', 'Falta la mano concreta y sus descartes restantes.');
  const state=structuredClone(original),moneyBefore=state.observed.money.status==='known'?state.observed.money.value:undefined;
  const checkedChoices=validateEffectChoices(input.choices??[]);if(!checkedChoices.ok){const e=checkedChoices.errors[0]!;fail(e.path,e.code,e.message);}
  if(state.observed.deck.status==='known'&&'preset'in state.observed.deck.value)state.observed.deck=valueFact({cards:deckCards(state)});
  const cards = selectCards(state, input.cardIds), physical = inventory(state);let jokers=effectiveJokers(physical);
  const context=scoringContext(state,input.cardIds,input);
  const needsHeld=jokers.some(j=>['mime','raised_fist','baron','shoot_the_moon','blackboard','reserved_parking'].includes(j.catalogId))||context.deck.some(c=>c.enhancement==='steel');
  const held=needsHeld?requireCards(context.held,'las cartas retenidas en mano'):context.held??[];
  if(context.deck.some(c=>c.enhancement==='steel'))use(contextRule);
  const baseResources=resources(state),r={...baseResources,...historyRoundResources(jokers,baseResources.hands,baseResources.discards)},blind = blindInfo(state);
  if(input.roundInitialHands!==undefined){if(!Number.isSafeInteger(input.roundInitialHands)||input.roundInitialHands<1||input.roundInitialHands>1000)fail('$hand.roundInitialHands','invalid_resources','Manos iniciales de ronda incompatibles.');r.hands=input.roundInitialHands;}
  if(input.capacityOverflow!==undefined&&(!Number.isSafeInteger(input.capacityOverflow)||input.capacityOverflow<0||input.capacityOverflow>200))fail('$hand.capacityOverflow','invalid_resources','Exceso temporal de mano inválido.');
  if(held.length>r.handSize-cards.length+(input.capacityOverflow??0)+(input.generatedHandIds?.filter(id=>held.some(c=>c.instanceId===id)||cards.some(c=>c.instanceId===id)).length??0))fail('$hand.heldCardIds','invalid_card_context','La mano retenida y las cartas jugadas superan el tamaño de mano.');
  const maxDiscards=input.roundInitialDiscards??(blind.boss==='the_water'?0:r.discards);if(!Number.isSafeInteger(maxDiscards)||maxDiscards<0||maxDiscards>1000)fail('$hand.roundInitialDiscards','invalid_resources','Descartes de ronda incompatibles.');
  if (!Number.isSafeInteger(input.discardsRemaining) || input.discardsRemaining < 0 || input.discardsRemaining > maxDiscards) fail('$hand.discardsRemaining', 'invalid_discards', `Descartes restantes deben estar entre 0 y ${maxDiscards}.`);
  if (blind.boss === 'the_psychic' && cards.length !== 5) fail('$hand.cardIds', 'psychic_requires_five', 'The Psychic exige cinco cartas; manos inválidas no se evalúan en este alcance.');
  const classified=classify(cards.filter(c=>c.enhancement!=='stone'),physical.map(j=>j.catalogId)),hand=classified.hand;
  const splash=jokers.some(j=>j.catalogId==='splash');
  if(splash)use(simpleRule);
  const scoring=splash?cards:cards.filter(c=>c.enhancement==='stone'||classified.scoring.includes(c));
  const generatedLocations:Record<string,'hand'|'deck'>={};
  const full:FullJokerInput={state,physical,effective:jokers,played:cards,scoring,held,hand,handsRemaining:input.handsRemaining,discardsRemaining:input.discardsRemaining,handsUsed:input.handsUsed,discardsUsed:input.discardsUsed,choices:checkedChoices.value,generatedLocations,trace,use};
  historyBefore(full);
  for(const actor of physical){const effective=effectiveJokers(physical).find(j=>j.instanceId===actor.instanceId);historyBeforeJoker(full,actor);if(effective){generationBeforeJoker(full,effective);randomBeforeJoker(full,effective);}}
  jokers=effectiveJokers(physical);full.effective=jokers;
  if(splash)trace.push({ruleId:simpleRule,label:'Splash: puntúan todas las cartas jugadas',values:{played:cards.length,scored:scoring.length,extraScored:scoring.length-classified.scoring.length}});
  for(const j of physical){
    if(['runner','square','trousers','ride_the_bus','wee','ice_cream','popcorn','selzer','ramen','hit_the_road','yorick'].includes(j.catalogId))for(const key of Object.keys(counterSpecs(j.catalogId)))counterValue(j,key);
    if(j.catalogId==='runner'&&handPatterns(cards,physical.map(j=>j.catalogId)).straight.length>0)updateCounter(j,'chips',counterValue(j,'chips')+15,trace);
    if(j.catalogId==='square'&&cards.length===4)updateCounter(j,'chips',counterValue(j,'chips')+4,trace);
    if(j.catalogId==='trousers'&&Object.values(cards.reduce<Record<string,number>>((a,c)=>{a[c.rank]=(a[c.rank]??0)+1;return a;},{})).filter(n=>n>=2).length>=2)updateCounter(j,'mult',counterValue(j,'mult')+2,trace);
    if(j.catalogId==='ride_the_bus')updateCounter(j,'mult',scoring.some(c=>face(c,physical))?0:counterValue(j,'mult')+1,trace);
  }
  const bases = need(state.observed.handBases, '$.observed.handBases');
  let chips: number, mult: number;
  if ('preset' in bases) {
    if (bases.preset !== 'all-standard-level1') fail('$.observed.handBases', 'unsupported_preset', 'Preset de manos no implementado.');
    [chips,mult] = HAND_BASES[hand];
  } else {
    const fact=bases.values[hand];
    if(!fact) fail('$.observed.handBases.values.'+hand,'unknown_data','Falta la base de la categoría especial; transcríbela o confirma nivel 1.');
    const base = need(fact, '$.observed.handBases.values.' + hand);
    if (base.level < 1 || base.chips < 1 || base.mult < 1) fail('$.observed.handBases', 'invalid_base', 'Nivel, fichas y Mult deben ser positivos para puntuar.');
    chips = base.chips; mult = base.mult;
  }
  trace.push({ ruleId: 'hand.classification', label: 'Categoría y base', values: { hand, chips, mult, played: cards.length, scored: scoring.length } });
  const greenAfter: Record<string, number> = Object.create(null) as Record<string, number>;
  for (const joker of jokers) if (joker.catalogId === 'green_joker') {
    use('green.changes'); use('green.timing');
    const before = greenValue(joker), after = safe(before + FX.greenPerPlay);
    greenAfter[joker.instanceId] = after;
    trace.push({ ruleId: 'green.timing', label: 'Green antes de puntuar', values: { instanceId: joker.instanceId, before, after } });
  }
  const add = (ruleId: string, label: string, addChips: number, addMult: number) => {
    const beforeChips = chips, beforeMult = mult;
    chips = safe(chips + addChips); mult = scalar(mult + addMult);
    trace.push({ ruleId, label, values: { beforeChips, beforeMult, addChips, addMult, chips, mult } });
  };
  const multiply=(label:string,xmult:number)=>{const beforeMult=mult;mult=scalar(mult*xmult);trace.push({ruleId:contextRule,label,values:{beforeMult,xmult,mult}});};
  const applyBonus=(label:string,e:EffectBonus)=>{if(e.chips||e.mult)add('jokers.full',label,e.chips??0,e.mult??0);if(e.xmult&&e.xmult!==1)multiply(label,e.xmult);if(e.money){const before=need(state.observed.money,'$.money');state.observed.money=valueFact(bankBalance(before+e.money));trace.push({ruleId:'jokers.economy',label,values:{moneyBefore:before,income:e.money,moneyAfter:before+e.money}});}};
  const edition=(c:{edition:string},phase:'before'|'after')=>{if(phase==='before'){if(c.edition==='foil')add('jokers.full','Edición Foil',50,0);if(['holo','holographic'].includes(c.edition))add('jokers.full','Edición Holográfica',0,10);}else if(c.edition==='polychrome')multiply('Edición Policroma',1.5);};
  const finishJoker=(actor:JokerInstance)=>{applyBonus('Baseball Card',baseballBonus(full,actor));edition({edition:need(actor.edition,'$.edition')},'after');};
  const firstFace=scoring.find(c=>face(c,physical));
  for (const card of scoring) {
    if(card.debuff)continue;
    let repeats=1+(card.seal==='red'?1:0);
    for(const j of jokers){
      if(j.catalogId==='hack'&&['2','3','4','5'].includes(card.rank)||j.catalogId==='sock_and_buskin'&&face(card,physical)||j.catalogId==='dusk'&&finalHand(input,r.hands))repeats++;
      if(j.catalogId==='selzer')repeats++;
      if(j.catalogId==='hanging_chad'&&card===scoring[0])repeats+=2;
    }
    for(let repetition=0;repetition<repeats;repetition++){
    if(repeats>1)trace.push({ruleId:contextRule,label:'Activación de carta',values:{cardId:card.instanceId,activation:repetition+1,total:repeats}});
    if(card.rank==='2')for(const j of physical)if(j.catalogId==='wee')updateCounter(j,'chips',counterValue(j,'chips')+8,trace);
    add('score.base', `Carta ${card.instanceId}`, cardChips(card), 0);
    const luckyIds:string[]=[];
    if(card.enhancement==='mult')add('jokers.full','Carta Mult',0,4);
    if(card.enhancement==='glass')multiply('Carta Glass',2);
    if(card.enhancement==='lucky'){
      if(booleanChance(full,effectKey('card','lucky_mult','card',card.instanceId,repetition+1),5)){add('jokers.full','Carta Lucky · Mult',0,20);luckyIds.push(card.instanceId);}
      if(booleanChance(full,effectKey('card','lucky_money','card',card.instanceId,repetition+1),15)){applyBonus('Carta Lucky · dinero',{money:20});luckyIds.push(card.instanceId);}
    }
    if(card.seal==='gold')applyBonus('Sello dorado',{money:3});
    edition(card,'before');edition(card,'after');full.luckyTriggeredIds=luckyIds;

    for (const joker of jokers) {
      applyBonus(joker.catalogId,randomCard(full,joker,card,repetition+1));applyBonus(joker.catalogId,generationCard(full,joker,card,repetition+1));applyBonus(joker.catalogId,historyCard(full,joker,card,repetition+1));applyBonus(joker.catalogId,economicCard(full,joker,card));
      const simple=simpleJoker(joker.catalogId);
      if(simple?.stage==='card'){use(simpleRule);if((simple.name==='Scary Face'||simple.name==='Smiley Face')?face(card,physical):cardMatches(simple,card,physical.some(j=>j.catalogId==='smeared')))add(simpleRule,`${simple.name} ${joker.instanceId} sobre ${card.instanceId}`,simple.chips,simple.mult);}
      if(joker.catalogId==='photograph'&&card===firstFace)multiply('Photograph '+joker.instanceId,2);
      if(joker.catalogId==='triboulet'&&['K','Q'].includes(card.rank))multiply('Triboulet '+joker.instanceId,2);
      if (joker.catalogId === 'scholar') {
        use('scholar.effect');
        if (card.rank === 'A') add('scholar.effect', `Scholar ${joker.instanceId} sobre ${card.instanceId}`, FX.scholarChips, FX.scholarMult);
      }
      if (joker.catalogId === 'even_steven') {
        use('even_steven.effect');
        if (['2','4','6','8','10'].includes(card.rank)) add('even_steven.effect', `Even Steven ${joker.instanceId} sobre ${card.instanceId}`, 0, FX.evenMult);
      }
    }
  }
  }
  // Held abilities occur after scoring cards, in hand order, before joker-main.
  const lowest=held.filter(c=>c.enhancement!=='stone').reduce<Card|undefined>((a,c)=>!a||rankValue(c)<=rankValue(a)?c:a,undefined);
  for(const card of held){
    if(card.debuff)continue;
    const repeats=1+(card.seal==='red'?1:0)+jokers.filter(j=>j.catalogId==='mime').length;
    for(let n=0;n<repeats;n++){
      if(card.enhancement==='steel')multiply('Acero retenido '+card.instanceId,1.5);
      for(const j of jokers){
        applyBonus(j.catalogId,randomHeld(full,j,card,n+1));
        if(j.catalogId==='raised_fist'&&card===lowest)add(contextRule,'Raised Fist '+card.instanceId,0,2*cardChips(card));
        if(j.catalogId==='shoot_the_moon'&&card.rank==='Q')add(contextRule,'Shoot the Moon '+card.instanceId,0,13);
        if(j.catalogId==='baron'&&card.rank==='K')multiply('Baron '+card.instanceId,1.5);
      }
    }
  }
  for (const actor of physical) {
    edition({edition:need(actor.edition,'$.edition')},'before');
    const joker=jokers.find(j=>j.instanceId===actor.instanceId);if(!joker){finishJoker(actor);continue;}
    applyBonus(joker.catalogId,randomMain(full,joker));applyBonus(joker.catalogId,historyMain(full,joker));applyBonus(joker.catalogId,generationMain(full,joker));
    const advanced=advancedJoker(joker.catalogId);
    if(advanced){
      use(contextRule);
      if(['runner','square','wee','ice_cream'].includes(joker.catalogId))add(contextRule,joker.catalogId,counterValue(joker,'chips'),0);
      if(['trousers','ride_the_bus','popcorn'].includes(joker.catalogId))add(contextRule,joker.catalogId,0,counterValue(joker,'mult'));
      if(['ramen','hit_the_road','yorick'].includes(joker.catalogId))multiply(joker.catalogId,counterValue(joker,'x100')/100);
      if(joker.catalogId==='steel_joker')multiply('Steel Joker',1+0.2*context.deck.filter(c=>c.enhancement==='steel').length);
      if(joker.catalogId==='drivers_license'&&context.deck.filter(c=>c.enhancement!=='none').length>=16)multiply('Driver’s License',3);
      if(joker.catalogId==='stencil')multiply('Joker Stencil',stencilMultiplier(state,physical));
      if(joker.catalogId==='blackboard'&&held.every(c=>['S','C'].includes(c.suit)))multiply('Blackboard',3);
      if(joker.catalogId==='acrobat'&&finalHand(input,r.hands))multiply('Acrobat',3);
      if(joker.catalogId==='blue_joker')add(contextRule,'Blue Joker',2*requireCards(context.remaining,'las cartas restantes en el mazo de robo').length,0);
      if(joker.catalogId==='stuntman')add(contextRule,'Stuntman',250,0);
      finishJoker(actor);continue;
    }
    const simple=simpleJoker(joker.catalogId);
    if(simple){
      use(simpleRule);
      if(simple.stage==='main'){
        const effect=mainBonus(simple,state,joker.instanceId,cards,scoring,input.discardsRemaining);
        add(simpleRule,`${simple.name} ${joker.instanceId}`,effect.chips,effect.mult);
        if(effect.xmult!==1){const beforeMult=mult;mult=scalar(mult*effect.xmult);trace.push({ruleId:simpleRule,label:`${simple.name} ${joker.instanceId}: ×Mult`,values:{beforeMult,xmult:effect.xmult,mult}});}
      }
      finishJoker(actor);continue;
    }
    switch (joker.catalogId) {
      case 'joker': use('joker.effect'); add('joker.effect', joker.instanceId + ': Joker', 0, fixedMainMult(joker.catalogId,physical.length)!); break;
      case 'half_joker': use('half_joker.effect'); add('half_joker.effect', joker.instanceId + ': Half (cartas jugadas)', 0, cards.length <= FX.halfMaxCards ? FX.halfMult : 0); break;
      case 'abstract_joker': use('abstract_joker.effect'); add('abstract_joker.effect', joker.instanceId + ': Abstract (incluye sí mismo)', 0, fixedMainMult(joker.catalogId,physical.length)!); break;
      case 'banner': use('banner.effect'); add('banner.effect', joker.instanceId + ': Banner', FX.bannerPerDiscard * input.discardsRemaining, 0); break;
      case 'green_joker': add('green.timing', joker.instanceId + ': Green', 0, greenAfter[joker.instanceId]!); break;
      case 'golden_joker': use('golden_joker.effect'); add('golden_joker.effect', joker.instanceId + ': Golden (sin puntos)', 0, 0); break;
    }
    finishJoker(actor);
  }
  ({chips,mult}=finalScoringFactors(state,chips,mult,trace,use));
  let score = safe(Math.floor(scalar(chips * mult)));
  const reference=verifyOrScoreEfhiii(original,input);
  if(reference.supported&&reference.score!==undefined){const local=score;if(reference.score===local){score=reference.score;trace.push({ruleId:'jokers.full',label:'Cálculo efhiii · coincidencia con desglose local',values:{score,source:reference.source}});}else trace.push({ruleId:'jokers.full',label:'Discrepancia efhiii: se conserva el cálculo contrastado con la fuente local',values:{local,efhiii:reference.score,source:reference.source}});}
  trace.push({ ruleId: 'score.base', label: 'Fichas × Mult', values: { chips, mult, score } });
  return { hand, playedCardIds: [...input.cardIds], scoringCardIds: scoring.map(c => c.instanceId), chips, mult, score, greenAfter, countersAfter:Object.fromEntries(physical.filter(j=>Object.keys(counterSpecs(j.catalogId)).length).map(j=>[j.instanceId,structuredClone(j.counters)])),stateAfter:state,moneyDelta:moneyBefore!==undefined&&state.observed.money.status==='known'?state.observed.money.value-moneyBefore:0,generatedLocations };
}
export function scoreHand(input: unknown, hand: HandInput, options: EngineOptions = {}) {
  return run<HandScore>(['base.configuration','score.base','hand.classification','blind.effects'], options,
    (trace, use) => scoreInternal(stateInput(input,use), hand, trace, use));
}


/** Also used by the monotone upper bound; applies the same final deck condition. */
export function finalScoringFactors(state:GameState,chips:number,mult:number,trace:Trace[],use:(id:string)=>void){
  if (deckDefinition(need(state.observed.deckId,'$.observed.deckId'))!.scoring === 'floor_average') {
    use('deck.plasma');
    const beforeChips=chips,beforeMult=mult;
    chips=mult=Math.floor(scalar(chips+mult)/2);
    trace.push({ruleId:'deck.plasma',label:'Plasma: media redondeada hacia abajo en ambos factores',values:{beforeChips,beforeMult,chips,mult}});
  }
  return {chips,mult};
}

export function classifyHand(cards:Card[],ids:readonly string[]=[]){const result=classify(cards.filter(c=>c.enhancement!=='stone'),ids);return {...result,scoring:cards.filter(c=>c.enhancement==='stone'||result.scoring.includes(c))};}
