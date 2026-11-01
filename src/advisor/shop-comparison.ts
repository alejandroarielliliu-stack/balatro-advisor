import type {GameState} from '../state/model.js';
import type {ShopOption,ShopSnapshot} from './shop-context.js';
import {QUICK_SHOP_POLICY} from './quick-shop-policy.js';

export interface ShopOfferComparison {
 ruleId:string;preferredId:string;otherId:string;
 values:{preferredMult:number;otherMult:number;preferredNetCost:number;otherNetCost:number};
 conditions:string[];message:string;
}

/** A small conditional comparison, never a ranking by editorial index.
 * Empty inventory excludes retained effects (copies, sell-value bonuses, etc.).
 * Main-phase Mult already comes from H2's shared finding; no formula is copied. */
export function comparePreparedOffers(state:GameState,snapshot:ShopSnapshot,options:readonly ShopOption[]):ShopOfferComparison[] {
 if(state.observed.jokers.status!=='known'||state.observed.jokers.value.length)return [];
 const facts=options.flatMap(option=>{
  const offer=snapshot.jokers.find(o=>o.offerId===option.id),fit=option.fit;
  if(!offer||offer.replacementId||offer.edition!=='base'||offer.stickers.length||option.coverage!=='modeled'||fit?.purchase.status!=='legal'||fit.readiness!=='ready'||!['j_joker','j_abstract'].includes(fit.id))return [];
  const own=option.findings?.find(f=>f.ruleId===QUICK_SHOP_POLICY.rules.additionalScoring)?.values?.ownMult,net=fit.purchase.netCost;
  return typeof own==='number'&&typeof net==='number'?[{option,own,net}]:[];
 });
 const comparisons:ShopOfferComparison[]=[];
 for(const preferred of facts)for(const other of facts){
  if(preferred===other||preferred.own<other.own||preferred.net>other.net||preferred.own===other.own&&preferred.net===other.net)continue;
  const conditions=[
   'Solo aporte propio de Mult en la fase de comodines, con el inventario actual vacío antes de comprar.',
   'Edición base, sin stickers ni reemplazo; ambas transacciones son compatibles con H2.',
   'Abstract puede aportar más si después aumenta el inventario. Su desarrollo, reventa y otras compras futuras no están clasificados aquí.',
   'La comparación no acredita puntuación total, supervivencia ni una compra óptima para toda la partida.'
  ];
  comparisons.push({ruleId:QUICK_SHOP_POLICY.rules.comparableMult,preferredId:preferred.option.id,otherId:other.option.id,
   values:{preferredMult:preferred.own,otherMult:other.own,preferredNetCost:preferred.net,otherNetCost:other.net},conditions,
   message:`Con este inventario, ${preferred.option.title} aporta +${preferred.own} Mult propio por $${preferred.net}, frente a +${other.own} por $${other.net} de ${other.option.title}. Se prefiere para ese refuerzo actual; Abstract puede cambiar al añadir más comodines.`});
 }
 return comparisons;
}
