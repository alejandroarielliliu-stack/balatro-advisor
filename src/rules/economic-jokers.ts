import {ALL_JOKER_FACTS} from '../catalog/all-joker-facts.js';
import type {Card} from '../catalog/initial.js';
import type {GameState,JokerInstance} from '../state/model.js';
import {face,effectiveJokers} from './joker-context.js';
import {suitMatches} from './hand-patterns.js';
import {fail,need,safe,valueFact} from './core.js';
import type {Trace} from './core.js';
import type {EffectBonus,FullJokerInput,FullEventInput} from './full-joker-contract.js';
export const economicRule='jokers.economy';
export function bankBalance(n:number){if(!Number.isSafeInteger(n))fail('$.observed.money','numeric_range','Saldo fuera del rango entero seguro.');return n;}
export function economicCard(input:FullJokerInput,j:JokerInstance,card:Card):EffectBonus{
 if(card.debuff)return {};
 if(j.catalogId==='rough_gem'&&card.enhancement!=='stone'&&(card.enhancement==='wild'||suitMatches(card,'D',input.physical.some(j=>j.catalogId==='smeared')))){input.use(economicRule);return {money:1};}
 if(j.catalogId==='ticket'&&card.enhancement==='gold'){input.use(economicRule);return {money:4};}
 return {};
}
/** Called after each physical joker's main effect, as other_joker in state_events. */
export function baseballBonus(input:FullJokerInput,other:JokerInstance):EffectBonus{
 // other_joker points to the physical card: a Blueprint copying an uncommon remains rare.
 const physical=input.physical.find(j=>j.instanceId===other.instanceId);
 if(!physical)fail('$jokers.'+other.instanceId,'unknown_joker_context','Baseball Card necesita la identidad física del comodín evaluado.');
 if(ALL_JOKER_FACTS[physical.catalogId]?.rarity!==2)return {};
 const count=input.effective.filter(j=>j.catalogId==='baseball'&&j.instanceId!==other.instanceId).length;
 if(count){input.use(economicRule);return {xmult:1.5**count};}return {};
}
export function growSell(j:JokerInstance,amount:number,trace:Trace[]){
 const current=need(j.sellValue,'$.jokers.'+j.instanceId+'.sellValue');
 const extra=j.counters.extraSell;const previous=extra?need(extra,'$.jokers.'+j.instanceId+'.counters.extraSell'):current-ALL_JOKER_FACTS[j.catalogId]!.sell;
 if(previous<0)fail('$.jokers.'+j.instanceId,'price_mismatch','Valor de venta menor que la base sin un modificador registrado.');
 j.counters.extraSell=valueFact(safe(previous+amount));j.sellValue=valueFact(safe(current+amount));
 trace.push({ruleId:economicRule,label:'Valor de venta: '+j.catalogId,values:{instanceId:j.instanceId,before:current,increase:amount,after:current+amount}});
}
export function economicEvent(input:FullEventInput){
 const physical=need(input.state.observed.jokers,'$.observed.jokers');let money=0;
 if(input.stage==='discard')for(const j of effectiveJokers(physical))if(j.catalogId==='faceless'&&input.cards.filter(c=>!c.debuff&&face(c,physical)&&(c.enhancement!=='stone'||physical.some(p=>p.catalogId==='pareidolia'))).length>=3){input.use(economicRule);money+=5;input.trace.push({ruleId:economicRule,label:'Faceless Joker',values:{instanceId:j.instanceId,dollars:5}});}
 // state_events invokes end_of_round before deciding game_over; loss doesn't suppress growth.
 if(input.stage==='end_round'){
  // Egg and Gift are not Blueprint-compatible. Only physical instances grow sell values.
  for(const j of physical){
   if(j.catalogId==='egg'){input.use(economicRule);growSell(j,3,input.trace);}
   if(j.catalogId==='gift'){
    input.use(economicRule);
    const context=input.state.observed.jokerContext;
    if(!context||context.status!=='known'||!context.value.consumables)fail('$.observed.jokerContext.consumables','unknown_data','Gift Card necesita conocer los consumibles, incluso si no tienes ninguno.');
    const consumables=need(context.value.consumables,'$.observed.jokerContext.consumables');
    for(const p of physical)growSell(p,1,input.trace);
    for(const c of consumables)c.sellValue=safe(c.sellValue+1);
   }
  }
 }
 return money;
}
export function creditLimit(state:GameState){return need(state.observed.jokers,'$.observed.jokers').filter(j=>j.catalogId==='credit_card').length*20;}
