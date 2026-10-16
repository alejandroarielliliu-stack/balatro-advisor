import {HISTORY_COUNTERS,historyJoker} from '../catalog/history-jokers.js';
import {HAND_BASES,rankValue,standardDeck} from '../catalog/initial.js';
import type {Card,HandId} from '../catalog/initial.js';
import type {GameState,JokerInstance} from '../state/model.js';
import {fail,need,safe,valueFact} from './core.js';
import type {Trace} from './core.js';
import {effectiveJokers} from './joker-context.js';
import type {EffectBonus,EffectChoice,FullEventInput,FullJokerContext,FullJokerInput} from './full-joker-contract.js';

export const historyRule='jokers.history';
const suits=['S','H','D','C'] as const;
const handIds=Object.keys(HAND_BASES) as HandId[];
const regularHands=handIds.slice(0,9);
function counter(j:JokerInstance,key:string){
 const spec=HISTORY_COUNTERS[j.catalogId]?.[key],fact=j.counters[key];
 if(!spec||!fact)fail('$.observed.jokers.'+j.instanceId+'.counters.'+key,'unknown_data','Falta contador '+(spec?.label??key)+'.');
 const n=need(fact,'$.observed.jokers.'+j.instanceId+'.counters.'+key);
 if(!Number.isSafeInteger(n)||n<spec.min||(spec.max!==undefined&&n>spec.max))fail('$.observed.jokers.'+j.instanceId+'.counters.'+key,'invalid_counter','Contador fuera del rango compatible.');
 return n;
}
function setCounter(j:JokerInstance,key:string,after:number,trace:Trace[]){const before=counter(j,key);j.counters[key]=valueFact(safe(after));trace.push({ruleId:historyRule,label:historyJoker(j.catalogId)!.name+' · '+key,values:{instanceId:j.instanceId,before,after}});}
function setTarget(j:JokerInstance,key:string,after:number,trace:Trace[]){
 const spec=HISTORY_COUNTERS[j.catalogId]?.[key];
 if(!spec||!Number.isSafeInteger(after)||after<spec.min||(spec.max!==undefined&&after>spec.max))fail('$target','invalid_outcome','Objetivo fuera del rango compatible.');
 const fact=j.counters[key],before=fact?.status==='known'?fact.value:'unknown';j.counters[key]=valueFact(after);
 trace.push({ruleId:historyRule,label:historyJoker(j.catalogId)!.name+' · nuevo objetivo '+key,values:{instanceId:j.instanceId,before,after}});
}
function context(state:GameState,required=false):FullJokerContext|undefined{
 const fact=state.observed.jokerContext;
 if(!fact){if(required)fail('$.observed.jokerContext','unknown_data','Falta el historial o contexto del comodín.');return;}
 if(fact.status==='unknown'){if(required)fail('$.observed.jokerContext','unknown_data','Falta dato: '+fact.reason);return;}
 return fact.value;
}
function writableContext(state:GameState){
 let ctx=context(state);
 if(!ctx){ctx={};state.observed.jokerContext=valueFact(ctx);}
 return ctx;
}
function historyCount(ctx:FullJokerContext,field:'handCounts'|'roundHandCounts',hand:HandId){
 const fact=ctx[field]?.[hand];
 if(!fact)fail('$.observed.jokerContext.'+field+'.'+hand,'unknown_data','Falta el número de '+hand+' jugadas; no se supone cero.');
 return safe(need(fact,'$.observed.jokerContext.'+field+'.'+hand));
}
function composition(state:GameState){const d=need(state.observed.deck,'$.observed.deck');return 'cards' in d?d.cards:standardDeck();}
function suitMatches(card:Card,target:number,physical:readonly JokerInstance[]){
 if(card.enhancement==='stone')return false;
 if(card.enhancement==='wild')return true;
 const suit=suits[target]!;
 return card.suit===suit||physical.some(j=>j.catalogId==='smeared')&&(['S','C'].includes(card.suit)===['S','C'].includes(suit));
}
function choice(choices:readonly EffectChoice[]|undefined,key:string,kind:EffectChoice['kind']){
 const matches=choices?.filter(c=>c.key===key)??[];
 if(matches.length!==1||matches[0]!.kind!==kind||!matches[0]!.basis.trim())fail('$choices.'+key,'missing_outcome','Indica una rama explícita '+kind+' para '+key+' y su fundamento.');
 return matches[0]!;
}
function explainChoice(c:EffectChoice,trace:Trace[]){trace.push({ruleId:historyRule,label:'Rama explícita; no se estima su probabilidad',values:{key:c.key,knowledge:c.knowledge,basis:c.basis}});}

/** Global counts update exactly once before joker-before, as evaluate_play lines 574–578. */
export function historyBefore(input:FullJokerInput){
 const ctx=context(input.state);
 if(!ctx)return;
 for(const key of ['handCounts','roundHandCounts'] as const){
  if(ctx[key]?.[input.hand]){
   const before=historyCount(ctx,key,input.hand),after=safe(before+1);ctx[key]![input.hand]=valueFact(after);
   input.trace.push({ruleId:historyRule,label:'Historial de la mano incluye la jugada actual',values:{field:key,hand:input.hand,before,after}});
  }
 }
 if(ctx.visibleHands?.status==='known'&&!ctx.visibleHands.value.includes(input.hand))ctx.visibleHands=valueFact([...ctx.visibleHands.value,input.hand]);
}
/** Call once per physical joker in inventory order, after historyBefore. Copiers do not grow counters. */
export function historyBeforeJoker(input:FullJokerInput,j:JokerInstance){
 if(j.catalogId==='loyalty_card'){input.use(historyRule);setCounter(j,'hands',counter(j,'hands')+1,input.trace);}
 if(j.catalogId==='obelisk'){
  input.use(historyRule);const ctx=context(input.state,true)!;
  let visible:HandId[];
  if(ctx.visibleHands)visible=need(ctx.visibleHands,'$.observed.jokerContext.visibleHands');
  else{
   // Hidden hands become visible when first played. All twelve counts are required to derive this.
   visible=handIds.filter(h=>historyCount(ctx,'handCounts',h)>0||regularHands.includes(h));
  }
  const current=historyCount(ctx,'handCounts',input.hand);
  const reset=!visible.some(h=>h!==input.hand&&historyCount(ctx,'handCounts',h)>=current);
  setCounter(j,'x100',reset?100:counter(j,'x100')+20,input.trace);
  input.trace.push({ruleId:historyRule,label:'Obelisk compara historial después de contar esta mano',values:{hand:input.hand,count:current,reset:String(reset)}});
 }
}
export function historyMain(input:FullJokerInput,j:JokerInstance):EffectBonus{
 if(!historyJoker(j.catalogId))return{};
 input.use(historyRule);
 switch(j.catalogId){
  case 'loyalty_card':return{xmult:counter(j,'hands')>0&&counter(j,'hands')%6===0?4:1};
  case 'supernova':return{mult:historyCount(context(input.state,true)!,'handCounts',input.hand)};
  case 'card_sharp':return{xmult:historyCount(context(input.state,true)!,'roundHandCounts',input.hand)>1?3:1};
  case 'madness':case 'obelisk':return{xmult:counter(j,'x100')/100};
  case 'castle':return{chips:counter(j,'chips')};
  case 'erosion':{
   const fact=context(input.state,true)!.startingDeckSize;
   if(!fact)fail('$.observed.jokerContext.startingDeckSize','unknown_data','Falta el tamaño inicial de esta run; no se presupone 52.');
   return{mult:4*Math.max(0,safe(need(fact,'$.observed.jokerContext.startingDeckSize'))-composition(input.state).length)};
  }
  case 'throwback':{
   const fact=context(input.state,true)!.blindsSkipped;
   if(!fact)fail('$.observed.jokerContext.blindsSkipped','unknown_data','Falta el total de ciegas saltadas de esta run.');
   return{xmult:1+0.25*safe(need(fact,'$.observed.jokerContext.blindsSkipped'))};
  }
  case 'matador':{
   const blind=need(input.state.observed.nextBlind,'$.observed.nextBlind');
   if(blind.kind!=='boss'||bossDisabled(input.state,input.physical))return{money:0};
   const boss=need(blind.bossId,'$.observed.nextBlind.bossId');
   // These supported bosses never set triggered for a valid scoring hand. Psychic invalid hands are handled upstream.
   if(['the_wall','violet_vessel','the_water','the_psychic'].includes(boss))return{money:0};
   const c=choice(input.choices,j.instanceId+':boss_triggered','boolean');if(typeof c.value!=='boolean')fail('$choices.'+c.key,'invalid_outcome','boss_triggered debe ser booleano.');explainChoice(c,input.trace);return{money:c.value?8:0};
  }
  default:return{};
 }
}
export function historyCard(input:FullJokerInput,j:JokerInstance,card:Card,_activation:number):EffectBonus{
 if(j.catalogId!=='ancient'&&j.catalogId!=='idol')return{};
 input.use(historyRule);
 const matches=suitMatches(card,counter(j,'suit'),input.physical);
 return{xmult:matches&&(j.catalogId==='ancient'||rankValue(card)===counter(j,'rank'))?(j.catalogId==='ancient'?1.5:2):1};
}
export interface HistoryEventResult{money:number;cashoutBonus:number;bossDisabled?:boolean}
export function resetRoundHistory(state:GameState){const ctx=writableContext(state);ctx.roundHandCounts=Object.fromEntries(handIds.map(h=>[h,valueFact(0)]));ctx.bossDisabled=valueFact(false);}
/** One setting_blind activation, dispatched in actual physical inventory order. */
export function historySelectBlindJoker(input:FullEventInput,j:JokerInstance){
 const physical=need(input.state.observed.jokers,'$.observed.jokers'),blind=need(input.state.observed.nextBlind,'$.observed.nextBlind');
 if(!physical.includes(j))return;
 if(j.catalogId==='chicot'&&blind.kind==='boss'){input.use(historyRule);disableBoss(input.state,input.trace);}
 if(j.catalogId!=='madness'||blind.kind==='boss')return;
 input.use(historyRule);const candidates=physical.filter(o=>o!==j&&!need(o.stickers,'$.observed.jokers.'+o.instanceId+'.stickers').includes('eternal'));
 let target:JokerInstance|undefined=candidates.length===1?candidates[0]:undefined;
 const supplied=input.choices?.some(c=>c.key===j.instanceId+':destroy');
 if(candidates.length>1||supplied){
  const c=choice(input.choices,j.instanceId+':destroy','joker'),id=typeof c.value==='string'?c.value:typeof c.value==='object'&&'instanceId' in c.value?c.value.instanceId:undefined;
  target=candidates.find(o=>o.instanceId===id);if(!target)fail('$choices.'+c.key,'invalid_outcome','Madness debe destruir otro comodín elegible.');explainChoice(c,input.trace);
 }
 setCounter(j,'x100',counter(j,'x100')+50,input.trace);
 if(target){physical.splice(physical.indexOf(target),1);input.trace.push({ruleId:historyRule,label:'Madness destruye el comodín de la rama explícita',values:{source:j.instanceId,destroyed:target.instanceId}});}
}
/** Operates only on the caller's projected clone. End-round bonuses are cashout income, not pre-interest cash. */
export function historyEvent(input:FullEventInput):HistoryEventResult{
 const result:HistoryEventResult={money:0,cashoutBonus:0};
 const physical=need(input.state.observed.jokers,'$.observed.jokers');
 if(input.stage==='select_blind'){
  // Selecting a blind still requires its identity, before changing history.
  need(input.state.observed.nextBlind,'$.observed.nextBlind');
  resetRoundHistory(input.state);for(const j of [...physical])historySelectBlindJoker(input,j);
  if(bossDisabled(input.state,physical))result.bossDisabled=true;
 }
 if(input.stage==='discard'){
  for(const j of [...physical])if(j.catalogId==='castle'){
   input.use(historyRule);const matches=input.cards.filter(c=>suitMatches(c,counter(j,'suit'),physical)).length;
   if(matches)setCounter(j,'chips',counter(j,'chips')+3*matches,input.trace);
  }
  for(const j of effectiveJokers(physical))if(j.catalogId==='mail'){
   input.use(historyRule);const matches=input.cards.filter(c=>c.enhancement!=='stone'&&rankValue(c)===counter(j,'rank')).length;result.money+=5*matches;
   input.trace.push({ruleId:historyRule,label:'Mail-In Rebate paga por carta descartada del rango objetivo',values:{instanceId:j.instanceId,matches,money:5*matches}});
  }
 }
 if(input.stage==='end_round'){
  // End-of-round effects occur even before a loss is finally settled in the executable.
  for(const j of [...physical]){
   if(j.catalogId==='rocket'){
    input.use(historyRule);const blind=need(input.state.observed.nextBlind,'$.observed.nextBlind');
    if(blind.kind==='boss')setCounter(j,'dollars',counter(j,'dollars')+2,input.trace);
    if(input.won)result.cashoutBonus+=counter(j,'dollars');
   }
   if(j.catalogId==='turtle_bean'){
    input.use(historyRule);const before=counter(j,'hSize');
    if(before===1){physical.splice(physical.indexOf(j),1);input.trace.push({ruleId:historyRule,label:'Turtle Bean consumido',values:{instanceId:j.instanceId,before}});}
    else setCounter(j,'hSize',before-1,input.trace);
    const handSize=need(input.state.observed.resources.handSize,'$.observed.resources.handSize');input.state.observed.resources.handSize=valueFact(Math.max(0,handSize-1));
   }
  }
  if(input.won)resetTargets(input);
 }
 if(input.stage==='sell'&&input.soldJoker?.catalogId==='luchador'&&input.activeBlind){
  // A shop sale has no active blind effect. Ask for the blind only when the
  // sold Luchador could actually disable one, rather than blocking all sales.
  const blind=need(input.state.observed.nextBlind,'$.observed.nextBlind');
  if(blind.kind==='boss'&&!bossDisabled(input.state,physical)){
   input.use(historyRule);disableBoss(input.state,input.trace);result.bossDisabled=true;
  }
 }
 return result;
}
function resetTargets(input:FullEventInput){
 const physical=need(input.state.observed.jokers,'$.observed.jokers');
 for(const j of physical){
  const keys=j.catalogId==='idol'?['rank','suit']:j.catalogId==='mail'?['rank']:['ancient','castle'].includes(j.catalogId)?['suit']:[];
  if(!keys.length)continue;
  input.use(historyRule);const matches=input.choices?.filter(c=>c.key===j.instanceId+':target')??[];
  if(!matches.length){for(const key of keys)j.counters[key]={status:'unknown',reason:'El juego elige otro objetivo tras la ronda; registra el mostrado o proporciona una rama explícita.'};continue;}
  const c=choice(input.choices,j.instanceId+':target','target');
  if(j.catalogId==='ancient'){
   const next=typeof c.value==='string'?suits.indexOf(c.value as typeof suits[number]):-1;
   if(next<0||next===counter(j,'suit'))fail('$choices.'+c.key,'invalid_outcome','Ancient elige uno de los otros tres palos, aunque no esté en el mazo.');
   setCounter(j,'suit',next,input.trace);
  }else{
   if(typeof c.value!=='object'||!('rank' in c.value)||!('suit' in c.value))fail('$choices.'+c.key,'invalid_outcome','El objetivo debe ser una carta elegible del mazo.');
   const selected=c.value;
   const card=composition(input.state).find(d=>d.instanceId===selected.instanceId);
   if(!card||card.enhancement==='stone'||card.rank!==selected.rank||card.suit!==selected.suit)fail('$choices.'+c.key,'invalid_outcome','La carta objetivo no existe o no es elegible.');
   if(keys.includes('rank'))setTarget(j,'rank',rankValue(card),input.trace);
   if(keys.includes('suit'))setTarget(j,'suit',suits.indexOf(card.suit),input.trace);
  }
  explainChoice(c,input.trace);
 }
}
/** Passive capacity change; Burglar affects current-round counts only when the blind is selected. */
export function historyResourceDelta(physical:readonly JokerInstance[]){return{hands:0,discards:0,handSize:physical.filter(j=>j.catalogId==='turtle_bean').reduce((n,j)=>n+counter(j,'hSize'),0)};}
export function historyRoundResources(effective:readonly JokerInstance[],hands:number,discards:number){const burglars=effective.filter(j=>j.catalogId==='burglar').length;return{hands:hands+3*burglars,discards:burglars?0:discards};}
export function bossDisabled(state:GameState,physical:readonly JokerInstance[]=need(state.observed.jokers,'$.observed.jokers')){
 const blind=need(state.observed.nextBlind,'$.observed.nextBlind');if(blind.kind!=='boss')return false;
 const flag=context(state)?.bossDisabled;if(flag)return need(flag,'$.observed.jokerContext.bossDisabled');
 return physical.some(j=>j.catalogId==='chicot');
}
export function disableBoss(state:GameState,trace:Trace[]){writableContext(state).bossDisabled=valueFact(true);trace.push({ruleId:historyRule,label:'Efecto del jefe desactivado; premio sin cambios',values:{disabled:'true'}});}
/** Target reduction is returned as an effective target; the observed blind is not rewritten. */
export function historyBoss(state:GameState,physical?:readonly JokerInstance[]){
 const blind=need(state.observed.nextBlind,'$.observed.nextBlind'),target=need(blind.target,'$.observed.nextBlind.target'),boss=need(blind.bossId,'$.observed.nextBlind.bossId'),disabled=bossDisabled(state,physical);
 return{disabled,target:disabled?target/(boss==='the_wall'?2:boss==='violet_vessel'?3:1):target,restoreDiscards:disabled&&boss==='the_water'};
}
/** Call only when the round would otherwise end in game_over. It survives without reaching the chip target. */
export function rescueWithBones(state:GameState,score:number,target:number,trace:Trace[]){
 const physical=need(state.observed.jokers,'$.observed.jokers'),bones=physical.find(j=>j.catalogId==='mr_bones');
 if(!bones||score<target/4)return false;
 physical.splice(physical.indexOf(bones),1);trace.push({ruleId:historyRule,label:'Mr. Bones evita game_over y se consume; premio de ciega $0',values:{instanceId:bones.instanceId,score,target,threshold:target/4,blindReward:0}});return true;
}
