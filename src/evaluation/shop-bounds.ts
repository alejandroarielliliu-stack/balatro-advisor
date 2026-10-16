import { boundRoundScore } from '../rules/upper-bound.js';
import type { RoundUpperBound } from '../rules/upper-bound.js';
import { applyShopAction, enumerateActions } from '../rules/shop.js';
import type { Mutation, ShopAction, ShopChange } from '../rules/shop.js';
import { run, stateInput, fail } from '../rules/core.js';
import type { EngineOptions, EngineResult } from '../rules/core.js';
import type { AnalysisGate } from '../rules/evidence.js';
import type { Issue } from '../state/model.js';
import { mergeEvidence } from './plan.js';
import { orderShopCandidates } from './shop-candidates.js';

export interface BoundedAlternative {
  action: ShopAction; shop: EngineResult<ShopChange>; bound: EngineResult<RoundUpperBound>|null;
}
export interface ShopBounds {
  inputRevision:number; alternatives:BoundedAlternative[]; enumerationErrors:Issue[];
  coverage:{included:string[];excluded:string[];exhaustive:false};
  everyLegalEnumeratedInsufficient:boolean; conclusion:string;
}
/** Same restricted action family as T07b; never ranks by the size of an upper bound. */
export function compareShopBounds(input:unknown, mutation:Mutation, options:EngineOptions={}):EngineResult<ShopBounds> {
  const gates:AnalysisGate[]=[];
  const result=run<ShopBounds>([],options,()=>{
    const state=stateInput(input);
    if (!mutation || mutation.expectedRevision!==state.revision) fail('$.revision','stale_revision','Recarga antes de calcular cotas.');
    const candidates=enumerateActions(state,mutation,options);gates.push(candidates.evidence);
    const actions:ShopAction[]=candidates.ok?orderShopCandidates(candidates.value.map(c=>c.action)):[{type:'hold'}];
    const alternatives=actions.map(action=>{
      const shop=applyShopAction(state,action,mutation,options);gates.push(shop.evidence);
      const bound=shop.ok?boundRoundScore(shop.value.state,options):null;
      if(bound)gates.push(bound.evidence);
      return {action,shop,bound};
    });
    const legal=alternatives.filter(a=>a.shop.ok);
    const definitiveIllegal=new Set(['no_slots','insufficient_money','missing_joker','missing_offer','unsupported_duplicate']);
    const unresolved=alternatives.some(a=>!a.shop.ok&&a.shop.errors.some(e=>!definitiveIllegal.has(e.code)));
    const all=candidates.ok&&!unresolved&&legal.length>0&&legal.every(a=>a.bound?.ok&&a.bound.value.verdict==='insufficient_under_model');
    return {inputRevision:state.revision,alternatives,enumerationErrors:candidates.ok?[]:candidates.errors,
      coverage:{included:['conservar','una compra','una venta seguida de una compra','una venta individual'],excluded:['varias compras/ventas','rerolls','paquetes','vales','consumibles','acciones durante la ronda'],exhaustive:false},
      everyLegalEnumeratedInsufficient:all,
      conclusion:all?'Todas las alternativas legales enumeradas tienen cota inferior al objetivo bajo el modelo. No demuestra que no existan otras acciones de tienda fuera de esta cobertura.'
        :'No hay una prueba conjunta de insuficiencia de las alternativas. Revisar cotas, datos ausentes y acciones fuera de cobertura; no es una recomendación de compra.'};
  });
  result.evidence=mergeEvidence([result.evidence,...gates]);return result;
}
