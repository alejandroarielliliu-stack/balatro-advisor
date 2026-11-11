import type {GameState} from '../state/model.js';
import {enumeration,integer,object} from '../state/schema.js';
import {GOLDEN_ROUND_INCOME} from '../rules/economy.js';
import {FIT_PROFILES} from './fit-profiles.js';
import {QUICK_SHOP_POLICY} from './quick-shop-policy.js';
import type {ShopContextResult,ShopOption} from './shop-context.js';

export interface ShopPlan {
 need:'score'|'economy'|'save';
 /** Dollars the player wants available for a purchase after looking again. */
 purchaseReserve?:number;
}
export const shopPlanSchema=object({need:enumeration('score','economy','save')},{purchaseReserve:integer(1)});

export interface AssessedShopOffer {
 option:ShopOption;
 eligible:boolean;
 uncertain:boolean;
 tradeoff?:boolean;
}
type Recommendation=ShopContextResult['recommendation'];
type Need=Exclude<ShopPlan['need'],'save'>;

const matchesNeed=(option:ShopOption,need:Need)=>option.kind==='joker'&&option.fit?.roles.some(role=>
 need==='score'?QUICK_SHOP_POLICY.scoringRoles.includes(role):role==='economy');

function advice(title:string,offerId:string,reason:string):Recommendation {
 return {status:'conditional',title,offerIds:[offerId],planReason:reason,reasons:[reason]};
}
function save(reason:string):Recommendation {
 return advice('Guarda el dinero','hold',reason);
}
function purchaseReason(option:ShopOption):string {
 const fit=option.fit!;
 const ownMult=option.findings?.find(f=>f.ruleId===QUICK_SHOP_POLICY.rules.additionalScoring)?.values?.ownMult;
 const support=fit.id==='j_golden'? `Si ganas la ronda con él, Golden Joker aporta $${GOLDEN_ROUND_INCOME} al cobro.`:
  typeof ownMult==='number'?`Aporta +${ownMult} Mult con tus comodines actuales.`:
  fit.signals.find(s=>s.id==='preparation')?.text;
 return [support,`Cuesta $${option.price} y te quedan $${option.moneyAfter}.`].filter(Boolean).join(' ');
}
function hasUnresolvedSacrifice(option:ShopOption,offers:AssessedShopOffer[]):boolean {
 const assessment=offers.find(entry=>entry.option===option);
 // An income-only role normally invites comparison with holding. Choosing an
 // income goal resolves that specific tradeoff, but never the loss of an owned effect.
 return option.fit?.signals.some(s=>s.kind==='conflict')===true||
  (assessment?.tradeoff===true&&matchesNeed(option,'score')===true)||
  option.findings?.some(f=>f.ruleId===QUICK_SHOP_POLICY.rules.replacementLoss)===true;
}
function searchOrSave(state:GameState,reroll:ShopOption,plan:ShopPlan|undefined):Recommendation|undefined {
 const owned=state.observed.jokers,slots=state.observed.resources.jokerSlots;
 if(owned.status!=='known'||slots.status!=='known')return undefined;
 if(owned.value.length>=slots.value)return save('Tus espacios de comodines están llenos. Antes de pagar por buscar otro, decide qué carta podrías vender.');
 if(reroll.price===null||reroll.moneyAfter===null)return plan
  ?{status:'abstain',title:'Comprueba el coste de renovar',offerIds:[],planReason:'Indica el saldo actual y el precio que muestra Renovar para calcular cuánto quedaría para comprar.',reasons:['Falta el saldo o el precio actual de la renovación.']}
  :undefined;
 const reserve=plan?.purchaseReserve;
 if(reroll.moneyAfter<=0||reroll.affordability!=='affordable')return save(`Renovar cuesta $${reroll.price}. Con el saldo actual no quedaría dinero para comprar el comodín que buscas.`);
 if(reserve!==undefined&&reroll.moneyAfter<reserve)return save(`Renovar por $${reroll.price} deja $${reroll.moneyAfter}, por debajo de los $${reserve} que quieres guardar para comprar.`);
 if(reroll.price>0&&reserve===undefined)return save(`Renovar cuesta $${reroll.price} y dejaría $${reroll.moneyAfter}. Indica cuánto quieres reservar para comprar antes de pagar por otra selección.`);
 const budget=reserve===undefined?`Conservas tus $${reroll.moneyAfter} para comprar.`:
  `Quedan $${reroll.moneyAfter} y reservas $${reserve} para comprar.`;
 const rec=advice('Renueva una vez','reroll',`Renovar cuesta $${reroll.price}. ${budget} Registra las nuevas cartas y vuelve a comparar.`);
 rec.reasons.push(...reroll.reasons);
 return rec;
}

/** Apply the guide's choice of immediate scoring, future income, or a search
 * with a purchase budget. Reuses the validated offers and their actual effects. */
export function guideShopPlan(state:GameState,plan:ShopPlan|undefined,assessed:AssessedShopOffer[],candidates:ShopOption[],
 otherCards:ShopOption[],reroll:ShopOption,base:Recommendation):Recommendation {
 if(state.phase!=='shop')return base;
 if(plan?.need==='save')return save('Has elegido conservar el saldo para otra tienda. Puedes pasar a la siguiente ronda.');
 const early=state.observed.nextBlind.status==='known'&&state.observed.nextBlind.value.ante<=2;
 const firstScorer=!plan&&early&&state.observed.jokers.status==='known'&&state.observed.jokers.value.length===0;
 const need=plan?.need??(firstScorer?'score':undefined);
 if(need){
  const matching=candidates.filter(o=>matchesNeed(o,need));
  // Prefer a cheaper unconditional source of the same kind of points when the
  // other offers require a hand, draw or activation still to be assembled.
  const reliable=matching.find(option=>option.fit?.readiness==='ready'&&FIT_PROFILES[option.fit.id]?.condition==='always'&&
   option.price!==null&&matching.every(other=>other===option||(
    other.fit?.readiness==='potential'&&other.price!==null&&option.price!<=other.price&&
    !other.fit.signals.some(s=>s.kind==='potential'&&s.id.startsWith('composition-'))&&
    option.fit!.roles.some(role=>QUICK_SHOP_POLICY.scoringRoles.includes(role)&&other.fit!.roles.includes(role)))));
  const selected=matching.length===1?matching[0]:reliable;
  const competesWithResource=candidates.some(o=>o.kind!=='joker');
  const justified=plan||selected?.fit?.readiness==='ready'&&(matching.length>1||candidates.some(o=>matchesNeed(o,'economy')));
  if(selected&&justified&&!competesWithResource&&!hasUnresolvedSacrifice(selected,assessed)){
   const goal=plan?(need==='score'?'Buscas puntos para la próxima ciega.':'Buscas mejorar la economía de la partida.'):'Aún buscas tu primer comodín de puntuación.';
   const rest=matching.filter(other=>other!==selected).map(other=>other.title);
   const condition=rest.length?` ${rest.join(' y ')} depende de qué cartas juegues. Para puntuar ahora, ${selected.title} funciona sin esperar esa condición.`:'';
   const rec=advice('Compra '+selected.title,selected.id,`${goal} ${purchaseReason(selected)}${condition}`);
   rec.reasons.push(...selected.reasons);
   return rec;
  }
  if(matching.length||competesWithResource)return base;
 }
 if(!plan&&(reroll.price!==0||base.status!=='conditional'||base.offerIds.length!==1||base.offerIds[0]!=='hold'))return base;
 if(base.status==='abstain'||otherCards.length||assessed.some(entry=>entry.uncertain))return base;
 return searchOrSave(state,reroll,plan)??base;
}
