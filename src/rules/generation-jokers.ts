import {HAND_BASES,RANKS,standardDeck} from '../catalog/initial.js';
import type {Card,HandId} from '../catalog/initial.js';
import {CONSUMABLE_KINDS,GENERATION_COUNTERS,GENERATION_JOKERS} from '../catalog/generation-jokers.js';
import {ALL_JOKER_FACTS} from '../catalog/all-joker-facts.js';
import type {GameState,JokerInstance} from '../state/model.js';
import {fail,need,safe,valueFact} from './core.js';
import type {Trace} from './core.js';
import type {Consumable,EffectBonus,EffectChoice,FullEventInput,FullJokerContext,FullJokerInput} from './full-joker-contract.js';
import {handPatterns} from './hand-patterns.js';
import {booleanChance,requireChoice} from './effect-choices.js';
import {levelUp} from './random-jokers.js';

export const generationRule='jokers.generation';
const HANDS=Object.keys(HAND_BASES) as HandId[];
type Scope={state:GameState;choices?:readonly EffectChoice[];trace:Trace[];use:(id:string)=>void};
function trace(s:Scope,label:string,values:Trace['values']){s.use(generationRule);s.trace.push({ruleId:generationRule,label,values});}
function choice(s:Scope,key:string,kind:EffectChoice['kind']){
 const found=requireChoice(s,key,kind);s.use(generationRule);return found.value;
}
function counter(j:JokerInstance,key:string){const fact=j.counters[key];if(!fact)fail('$.observed.jokers.'+j.instanceId+'.counters.'+key,'unknown_data','Falta contador '+key+'.');const n=need(fact,'$.observed.jokers.'+j.instanceId+'.counters.'+key),spec=GENERATION_COUNTERS[j.catalogId]?.[key];if(!Number.isSafeInteger(n)||!spec||n<spec.min||(spec.max!==undefined&&n>spec.max))fail('$counter','invalid_counter','Contador inválido.');return n;}
function update(s:Scope,j:JokerInstance,key:string,value:number){const before=counter(j,key);j.counters[key]=valueFact(safe(value));trace(s,j.catalogId+' · '+key,{instanceId:j.instanceId,before,after:value});}
function physical(state:GameState){return need(state.observed.jokers,'$.observed.jokers');}
function context(state:GameState):FullJokerContext{
 const fact=state.observed.jokerContext;
 if(!fact)fail('$.observed.jokerContext','unknown_data','Falta el contexto de consumibles/historial.');
 return need(fact,'$.observed.jokerContext');
}
function field<K extends keyof FullJokerContext>(state:GameState,key:K):FullJokerContext[K]{return context(state)[key];}
function consumables(state:GameState){const fact=field(state,'consumables');if(!fact)fail('$.observed.jokerContext.consumables','unknown_data','Falta inventario de consumibles.');return need(fact,'$.observed.jokerContext.consumables');}
function consumableRoom(state:GameState){const items=consumables(state),fact=field(state,'consumableSlots');if(!fact)fail('$.observed.jokerContext.consumableSlots','unknown_data','Faltan espacios de consumibles.');return items.filter(c=>c.edition!=='negative').length<need(fact,'$.observed.jokerContext.consumableSlots');}
function validConsumable(value:EffectChoice['value'],kind:Consumable['kind']):Consumable{
 if(!value||typeof value!=='object'||!('catalogId'in value)||!('kind'in value)||value.kind!==kind||typeof value.instanceId!=='string'||!value.instanceId||typeof value.catalogId!=='string'||!value.catalogId||!['base','negative'].includes(String(value.edition))||!('sellValue'in value)||!Number.isSafeInteger(value.sellValue)||Number(value.sellValue)<0)fail('$choices','invalid_outcome','Resultado de consumible inválido.');
 if(CONSUMABLE_KINDS[value.catalogId]!==kind)fail('$choices','unsupported_consumable','No existe este consumible en la versión objetivo.');return structuredClone(value as Consumable);
}
function createConsumable(s:Scope,j:JokerInstance,key:string,kind:Consumable['kind']){
 if(!consumableRoom(s.state)){trace(s,'Sin espacio de consumibles',{instanceId:j.instanceId});return;}
 const item=validConsumable(choice(s,j.instanceId+':'+key,'consumable'),kind),items=consumables(s.state);
 if(item.edition!=='base'||items.some(c=>c.instanceId===item.instanceId))fail('$choices','invalid_outcome','El consumible generado debe ser base y tener ID nuevo.');
 items.push(item);trace(s,'Consumible creado',{instanceId:j.instanceId,created:item.instanceId,kind});
}
function deck(state:GameState):Card[]{const fact=need(state.observed.deck,'$.observed.deck');if('cards'in fact)return fact.cards;if(fact.preset!=='standard52-unmodified')fail('$.observed.deck','unsupported_preset','Hace falta mazo explícito.');const cards=standardDeck();state.observed.deck=valueFact({cards});return cards;}
function validateCard(value:EffectChoice['value']):Card{
 if(!value||typeof value!=='object'||!('rank'in value)||!('suit'in value)||!('enhancement'in value)||!('seal'in value)||!('extraChips'in value)||typeof value.instanceId!=='string'||!value.instanceId||!RANKS.includes(value.rank as typeof RANKS[number])||!['S','H','D','C'].includes(String(value.suit))||!['base','foil','holo','holographic','polychrome'].includes(String(value.edition))||!['none','bonus','mult','wild','glass','steel','stone','gold','lucky'].includes(String(value.enhancement))||!['none','red','blue','gold','purple'].includes(String(value.seal))||!Number.isSafeInteger(value.extraChips)||Number(value.extraChips)<0)fail('$choices','invalid_outcome','Carta generada inválida.');
 return structuredClone(value as Card);
}
function newId(state:GameState,stem:string){const used=new Set([...deck(state).map(c=>c.instanceId),...physical(state).map(j=>j.instanceId)]);let id=stem,n=1;while(used.has(id))id=stem+':'+n++;return id;}
function addCard(s:Scope,card:Card){const cards=deck(s.state);if(cards.some(c=>c.instanceId===card.instanceId))fail('$choices','duplicate_card','La carta generada necesita un ID nuevo.');cards.push(card);trace(s,'Carta añadida al mazo',{cardId:card.instanceId,enhancement:card.enhancement});generationCardsAdded(s.state,[card],s.trace,s.use);}
function setEnhancement(s:Scope,c:Card,value:string){const original=deck(s.state).find(x=>x.instanceId===c.instanceId);if(!original)fail('$cards','unknown_card','Carta fuera del mazo.');const before=c.enhancement;original.enhancement=value;c.enhancement=value;trace(s,'Mejora transformada',{cardId:c.instanceId,before,after:value});}
function face(c:Card,state:GameState){return physical(state).some(j=>j.catalogId==='pareidolia')||(c.enhancement!=='stone'&&['J','Q','K'].includes(c.rank));}
function addMoney(s:Scope,n:number,label:string){const before=need(s.state.observed.money,'$.observed.money');s.state.observed.money=valueFact(before+n);trace(s,label,{before,earned:n,after:before+n});}
function generatedPlace(input:FullJokerInput|FullEventInput,id:string,place:'hand'|'deck'){if(input.generatedLocations)input.generatedLocations[id]=place;}
function upgradeHand(s:Scope,hand:HandId){levelUp(s.state,hand);trace(s,'Burnt Joker · nivel de mano',{hand,levelsAdded:1});}

/** BEFORE stage uses the already selected scoring cards, in physical/effective order. */
export function generationBefore(input:FullJokerInput):void{
 for(const effective of input.effective)generationBeforeJoker(input,effective);
}
const vampireSeen=new WeakMap<FullJokerInput,Set<string>>();
export function generationBeforeJoker(input:FullJokerInput,effective:JokerInstance):void{
  const j=effective;
  if(effective.catalogId==='dna'&&input.played.length===1){
   if(input.handsUsed===undefined)fail('$round.handsUsed','unknown_data','DNA requiere saber si es la primera mano.');
   if(input.handsUsed===0){const original=input.played[0]!,copy={...structuredClone(original),instanceId:newId(input.state,j.instanceId+':dna:'+original.instanceId)};addCard(input,copy);input.held.push(copy);generatedPlace(input,copy.instanceId,'hand');}
  }
  // Effects with not-context.blueprint operate on physical instances only once.
  if(!input.physical.some(p=>p.instanceId===effective.instanceId&&p.catalogId===effective.catalogId))return;
  if(j.catalogId==='midas_mask')for(const c of input.scoring)if(face(c,input.state))setEnhancement(input,c,'gold');
  if(j.catalogId==='vampire'){const seen=vampireSeen.get(input)??new Set<string>();vampireSeen.set(input,seen);let gained=0;for(const c of input.scoring)if(c.enhancement!=='none'&&!seen.has(c.instanceId)){setEnhancement(input,c,'none');seen.add(c.instanceId);gained+=10;}if(gained)update(input,j,'x100',counter(j,'x100')+gained);}
  if(j.catalogId==='todo_list'&&HANDS[counter(j,'handIndex')]===input.hand)addMoney(input,4,'To Do List · mano objetivo');
}

/** Called for each scoring-card activation AFTER its own chips/enhancement. */
export function generationCard(input:FullJokerInput,j:JokerInstance,card:Card,activation:number):EffectBonus{
 if(j.catalogId==='hiker'){
  const source=deck(input.state).find(c=>c.instanceId===card.instanceId);if(!source)fail('$cards','unknown_card','Hiker requiere carta del mazo.');const before=source.extraChips;source.extraChips=safe(before+5);card.extraChips=source.extraChips;trace(input,'Hiker · mejora permanente',{cardId:card.instanceId,activation,before,after:source.extraChips});
 }
 if(j.catalogId==='lucky_cat'&&card.enhancement==='lucky'&&input.physical.some(p=>p.instanceId===j.instanceId&&p.catalogId===j.catalogId)){
  const explicit=(input as FullJokerInput&{luckyTriggeredIds?:string[]}).luckyTriggeredIds;
  const triggered=explicit?explicit.includes(card.instanceId):choice(input,card.instanceId+':lucky_trigger:'+activation,'boolean');if(typeof triggered!=='boolean')fail('$choices','invalid_outcome','Lucky trigger requiere booleano.');if(triggered)update(input,j,'x100',counter(j,'x100')+25);
 }
 return {};
}

export function generationMain(input:FullJokerInput,j:JokerInstance):EffectBonus{
 if(!GENERATION_JOKERS[j.catalogId])return {};
 input.use(generationRule);
 if(['vampire','hologram','lucky_cat','glass','caino','constellation','campfire'].includes(j.catalogId))return {xmult:counter(j,'x100')/100};
 if(['ceremonial','red_card','flash'].includes(j.catalogId))return {mult:counter(j,'mult')};
 if(j.catalogId==='stone')return {chips:25*deck(input.state).filter(c=>c.enhancement==='stone').length};
 if(j.catalogId==='fortune_teller'){const fact=field(input.state,'tarotsUsed');if(!fact)fail('$.observed.jokerContext.tarotsUsed','unknown_data','Fortune Teller requiere el historial de Tarot.');return {mult:need(fact,'$.observed.jokerContext.tarotsUsed')};}
 if(j.catalogId==='superposition'&&input.scoring.some(c=>c.rank==='A'&&c.enhancement!=='stone')&&handPatterns(input.played,input.physical.map(p=>p.catalogId)).straight.length)createConsumable(input,j,'superposition','tarot');
 if(j.catalogId==='seance'&&input.hand==='straight_flush')createConsumable(input,j,'seance','spectral');
 if(j.catalogId==='vagabond'&&need(input.state.observed.money,'$.observed.money')<=4)createConsumable(input,j,'vagabond','tarot');
 return {};
}

export function generationCardsAdded(state:GameState,cards:readonly Card[],traces:Trace[],use:(id:string)=>void):void{
 if(!cards.length)return;const s={state,trace:traces,use};for(const j of physical(state))if(j.catalogId==='hologram')update(s,j,'x100',counter(j,'x100')+25*cards.length);
}
/** Call once for each destruction batch; Glass grows only when a Glass card shattered. */
export function generationCardsDestroyed(state:GameState,cards:readonly Card[],shatteredIds:readonly string[],traces:Trace[],use:(id:string)=>void):void{
 const s={state,trace:traces,use};for(const j of physical(state)){
  if(j.catalogId==='caino'){const n=cards.filter(c=>face(c,state)).length;if(n)update(s,j,'x100',counter(j,'x100')+100*n);}
  if(j.catalogId==='glass'){const n=cards.filter(c=>c.enhancement==='glass'&&shatteredIds.includes(c.instanceId)).length;if(n)update(s,j,'x100',counter(j,'x100')+75*n);}
 }
}
function destroyCards(s:Scope,cards:readonly Card[]){const ids=new Set(cards.map(c=>c.instanceId));const original=deck(s.state);const removed=original.filter(c=>ids.has(c.instanceId));if(removed.length!==ids.size)fail('$cards','unknown_card','Destrucción contiene cartas fuera del mazo.');s.state.observed.deck=valueFact({cards:original.filter(c=>!ids.has(c.instanceId))});for(const c of removed)trace(s,'Carta destruida',{cardId:c.instanceId});generationCardsDestroyed(s.state,removed,[],s.trace,s.use);}

export function generationEvent(input:FullEventInput,effective?:readonly JokerInstance[]):void{
 if(input.stage==='use_consumable'){
  const used=input.consumable;if(!used)fail('$event.consumable','unknown_data','Falta consumible usado.');const ctx=context(input.state);
  if(used.kind==='tarot'){if(!ctx.tarotsUsed)fail('$.observed.jokerContext.tarotsUsed','unknown_data','Falta historial anterior de Tarot.');ctx.tarotsUsed=valueFact(need(ctx.tarotsUsed,'$tarotsUsed')+1);trace(input,'Tarot usado',{catalogId:used.catalogId,tarotsUsed:need(ctx.tarotsUsed,'$tarotsUsed')});}
  const jokers=used.kind==='planet'||used.catalogId==='c_hanged_man'?physical(input.state):[];
  if(used.kind==='planet'){if(!ctx.planetsUsed)fail('$.observed.jokerContext.planetsUsed','unknown_data','Falta historial anterior de planetas.');ctx.planetsUsed=valueFact([...new Set([...need(ctx.planetsUsed,'$planetsUsed'),used.catalogId])]);for(const j of jokers)if(j.catalogId==='constellation')update(input,j,'x100',counter(j,'x100')+10);}
  if(used.catalogId==='c_hanged_man'&&jokers.some(j=>j.catalogId==='glass')){if(input.cards.length<1||input.cards.length>2)fail('$event.cards','unknown_data','The Hanged Man necesita una o dos cartas objetivo para evaluar Glass Joker.');const glasses=input.cards.filter(c=>c.enhancement==='glass').length;for(const j of jokers)if(j.catalogId==='glass'&&glasses)update(input,j,'x100',counter(j,'x100')+75*glasses);}
  return;
 }
 const jokers=physical(input.state);
 if(input.stage==='discard'&&jokers.some(j=>j.catalogId==='burnt'||j.catalogId==='trading')){
  if(input.discardsUsed===undefined)fail('$round.discardsUsed','unknown_data','Falta saber si es el primer descarte.');
  if(input.discardsUsed===0){let destroyed=false;for(const j of [...(effective??jokers)]){
   if(j.catalogId==='burnt'){if(!input.hand)fail('$event.hand','unknown_data','Burnt Joker requiere clasificar la mano descartada.');upgradeHand(input,input.hand);}
   if(j.catalogId==='trading'&&input.cards.length===1&&jokers.some(p=>p.instanceId===j.instanceId&&p.catalogId===j.catalogId)){if(!destroyed){destroyCards(input,input.cards);destroyed=true;}addMoney(input,3,'Trading Card · primer descarte');}
  }}
 }
 if(input.stage==='after_hand'&&jokers.some(j=>j.catalogId==='sixth_sense')&&input.cards.length===1&&input.cards[0]!.rank==='6'&&input.cards[0]!.enhancement!=='stone'){
  if(input.handsUsed===undefined)fail('$round.handsUsed','unknown_data','Sixth Sense requiere saber si fue la primera mano.');
  if(input.handsUsed===0){for(const j of jokers.filter(j=>j.catalogId==='sixth_sense'))createConsumable(input,j,'sixth_sense','spectral');destroyCards(input,input.cards);}
 }
 for(const j of [...(effective??jokers)]){
  if(!GENERATION_JOKERS[j.catalogId])continue;
  const isPhysical=jokers.some(p=>p.instanceId===j.instanceId&&p.catalogId===j.catalogId);
  if(!isPhysical&&!GENERATION_JOKERS[j.catalogId]!.blueprint)continue;
  if(input.stage==='select_blind'){
   if(j.catalogId==='ceremonial'&&isPhysical){const right=jokers[jokers.indexOf(j)+1];if(right&&!need(right.stickers,'$stickers').includes('eternal')){update(input,j,'mult',counter(j,'mult')+2*need(right.sellValue,'$sellValue'));jokers.splice(jokers.indexOf(right),1);trace(input,'Ceremonial Dagger · comodín destruido',{destroyed:right.instanceId});}}
   if(j.catalogId==='marble'||j.catalogId==='certificate'){const c=validateCard(choice(input,j.instanceId+':'+j.catalogId,'card'));if(j.catalogId==='marble'&&(c.enhancement!=='stone'||c.edition!=='base'||c.seal!=='none'||c.extraChips!==0))fail('$choices','invalid_outcome','Marble genera una carta Stone base sin sello.');if(j.catalogId==='certificate'&&(c.enhancement!=='none'||c.edition!=='base'||c.seal==='none'||c.extraChips!==0))fail('$choices','invalid_outcome','Certificate genera carta base con un sello.');addCard(input,c);generatedPlace(input,c.instanceId,j.catalogId==='certificate'?'hand':'deck');}
   if(j.catalogId==='cartomancer')createConsumable(input,j,'cartomancer','tarot');
   if(j.catalogId==='riff_raff')for(let n=1;n<=2;n++){
    const slots=need(input.state.observed.resources.jokerSlots,'$jokerSlots'),occupied=jokers.filter(x=>need(x.edition,'$edition')!=='negative').length;if(occupied>=slots)break;
    const result=choice(input,j.instanceId+':riff_raff:'+n,'joker');if(!result||typeof result!=='object'||!('counters'in result)||!('sellValue'in result)||!('catalogId'in result)||!('stickers'in result))fail('$choices','invalid_outcome','Riff-Raff requiere un comodín común explícito.');const created=structuredClone(result as JokerInstance);
    if(jokers.some(x=>x.instanceId===created.instanceId)||ALL_JOKER_FACTS[created.catalogId]?.rarity!==1||need(created.edition,'$edition')!=='base'||need(created.stickers,'$stickers').length)fail('$choices','invalid_outcome','Riff-Raff solo genera comunes base con ID nuevo.');jokers.push(created);trace(input,'Riff-Raff · comodín creado',{created:created.instanceId,catalogId:created.catalogId});
   }
   if(j.catalogId==='chaos'){const ctx=context(input.state);ctx.freeRerolls=valueFact(jokers.filter(x=>x.catalogId==='chaos').length);trace(input,'Chaos · rerolls gratis de tienda',{count:need(ctx.freeRerolls,'$freeRerolls')});}
  }
  if(input.stage==='skip_pack'&&j.catalogId==='red_card'&&isPhysical)update(input,j,'mult',counter(j,'mult')+3);
  if(input.stage==='open_pack'&&j.catalogId==='hallucination'&&consumableRoom(input.state)){const success=booleanChance(input,j.instanceId+':hallucination_trigger',2);if(success)createConsumable(input,j,'hallucination','tarot');}
  if(input.stage==='reroll'&&j.catalogId==='flash'&&isPhysical)update(input,j,'mult',counter(j,'mult')+2);
  if(input.stage==='sell'&&j.catalogId==='campfire'&&isPhysical&&input.soldJoker?.instanceId!==j.instanceId)update(input,j,'x100',counter(j,'x100')+25);
  if(input.stage==='end_round'&&isPhysical){
   if(j.catalogId==='invisible')update(input,j,'rounds',counter(j,'rounds')+1);
   if(j.catalogId==='campfire'&&need(input.state.observed.nextBlind,'$nextBlind').kind==='boss')update(input,j,'x100',100);
   if(j.catalogId==='todo_list'){
    if(!input.choices?.some(c=>c.key===j.instanceId+':todo_list')){j.counters.handIndex={status:'unknown',reason:'La mano objetivo cambia al terminar la ronda. Registra la mostrada antes de la próxima evaluación.'};trace(input,'To Do List · próximo objetivo desconocido',{instanceId:j.instanceId});continue;}
    const target=choice(input,j.instanceId+':todo_list','integer');const visible=field(input.state,'visibleHands');if(!visible)fail('$.observed.jokerContext.visibleHands','unknown_data','To Do List requiere manos visibles.');if(typeof target!=='number'||!Number.isInteger(target)||target<0||target>=HANDS.length||target===counter(j,'handIndex')||!need(visible,'$visibleHands').includes(HANDS[target]!))fail('$choices','invalid_outcome','To Do List necesita una mano visible distinta (índice 0–11).');update(input,j,'handIndex',target);
   }
  }
  if(input.stage==='end_shop'&&j.catalogId==='perkeo'){
   const items=consumables(input.state);if(!items.length)continue;const target=choice(input,j.instanceId+':perkeo','target');if(typeof target!=='string')fail('$choices','invalid_outcome','Perkeo requiere ID de consumible.');const source=items.find(c=>c.instanceId===target);if(!source)fail('$choices','invalid_target','Consumible de Perkeo ausente.');let id=j.instanceId+':perkeo:'+source.instanceId,n=1;while(items.some(c=>c.instanceId===id))id=j.instanceId+':perkeo:'+source.instanceId+':'+n++;const copy={...structuredClone(source),instanceId:id,edition:'negative' as const};items.push(copy);trace(input,'Perkeo · copia negativa',{source:source.instanceId,created:id});
  }
 }
}

/** Called while the sold joker is still known, before removal. */
export function generationSellingSelf(input:FullEventInput,sold:JokerInstance):void{
 if(sold.catalogId==='diet_cola'){const ctx=context(input.state);if(!ctx.tags)fail('$.observed.jokerContext.tags','unknown_data','Falta lista actual de tags.');ctx.tags=valueFact([...need(ctx.tags,'$tags'),'tag_double']);trace(input,'Diet Cola · Double Tag',{instanceId:sold.instanceId,tag:'tag_double'});}
 if(sold.catalogId==='invisible'&&counter(sold,'rounds')>=2){const candidates=physical(input.state).filter(j=>j.instanceId!==sold.instanceId);if(!candidates.length)return;const target=choice(input,sold.instanceId+':invisible','target');if(typeof target!=='string')fail('$choices','invalid_outcome','Invisible requiere ID del comodín copiado.');const source=candidates.find(j=>j.instanceId===target);if(!source)fail('$choices','invalid_target','No existe el comodín elegido.');const copy=structuredClone(source);copy.instanceId=newId(input.state,sold.instanceId+':copy:'+source.instanceId);if(need(copy.edition,'$edition')==='negative')copy.edition=valueFact('base');if(copy.catalogId==='invisible')copy.counters.rounds=valueFact(0);physical(input.state).push(copy);trace(input,'Invisible Joker · copia',{source:source.instanceId,created:copy.instanceId});}
}

/** Base cashout bonus; root must place this beside Golden rather than after interest. */
export function generationRoundIncome(state:GameState):number{let n=0;for(const j of physical(state))if(j.catalogId==='satellite'){const fact=field(state,'planetsUsed');if(!fact)fail('$.observed.jokerContext.planetsUsed','unknown_data','Satellite requiere historial de planetas únicos.');n+=new Set(need(fact,'$planetsUsed')).size;}return n;}
export function generationShopPrice(state:GameState,kind:'joker'|'tarot'|'planet'|'spectral'|'celestial_pack'|'other_pack',basePrice:number):number{return physical(state).some(j=>j.catalogId==='astronomer')&&(kind==='planet'||kind==='celestial_pack')?0:basePrice;}
export function generationAllowsDuplicatePool(state:GameState):boolean{return physical(state).some(j=>j.catalogId==='ring_master');}
export function generationRerollCost(state:GameState):number{const ctx=context(state);if(!ctx.freeRerolls||!ctx.rerollCost)fail('$.observed.jokerContext','unknown_data','Falta coste y rerolls gratis actuales.');return need(ctx.freeRerolls,'$freeRerolls')>0?0:need(ctx.rerollCost,'$rerollCost');}
export function generationUseReroll(input:FullEventInput):void{const ctx=context(input.state),cost=generationRerollCost(input.state),money=need(input.state.observed.money,'$.observed.money');if(money<cost)fail('$money','insufficient_money','Dinero insuficiente para reroll.');input.state.observed.money=valueFact(money-cost);const free=need(ctx.freeRerolls!,'$freeRerolls');if(free>0)ctx.freeRerolls=valueFact(free-1);else ctx.rerollCost=valueFact(cost+1);trace(input,'Reroll',{cost,moneyBefore:money,moneyAfter:money-cost});generationEvent({...input,stage:'reroll'});}

/** Acquisition/removal changes free rerolls immediately, without resetting ones used. */
export function generationShopInventoryChanged(state:GameState,joker:JokerInstance,change:'add'|'remove',traces:Trace[],use:(id:string)=>void):void{
 if(joker.catalogId!=='chaos')return;const ctx=context(state);if(!ctx.freeRerolls)fail('$.observed.jokerContext.freeRerolls','unknown_data','Faltan rerolls gratis actuales.');const before=need(ctx.freeRerolls,'$freeRerolls'),after=Math.max(0,before+(change==='add'?1:-1));ctx.freeRerolls=valueFact(after);trace({state,trace:traces,use},'Chaos · inventario cambia',{change,before,after});
}

