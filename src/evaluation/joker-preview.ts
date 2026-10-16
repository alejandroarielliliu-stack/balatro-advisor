import type {GameState,Fact} from '../state/model.js';
import {validateState} from '../state/validation.js';
import {adviseShop} from '../advisor/advisor.js';
import type {AdvisorScenario} from '../advisor/advisor.js';
import {jokerDefinition} from '../catalog/initial.js';
import type {ShopAction} from '../rules/shop.js';
/** Synthetic shop, same observed run and explicit plans. Never persisted or confirmable. */
export function previewJoker(input:GameState,id:string,scenarios:AdvisorScenario[],sellId='',offer?:{price:Fact<number>;edition:Fact<string>;stickers:Fact<string[]>}){
 const checked=validateState(input);if(!checked.ok)return checked;
 const definition=jokerDefinition(id);
 if(!definition)return {ok:false as const,errors:[{path:'$joker',code:'unsupported_joker',message:'Este efecto todavía no tiene cálculo.'}]};
 const state=checked.value;
 const owned=state.observed.jokers.status==='known'?state.observed.jokers.value:[];
 let instanceId='new:catalog-preview';while(owned.some(j=>j.instanceId===instanceId))instanceId='_'+instanceId;
 state.observed.shop={status:'known',source:'manual',value:{shopId:'hypothetical-catalog',cardOffers:[{offerId:'catalog-preview',catalogId:id,label:id,kind:'joker',price:structuredClone(offer?.price??{status:'known',source:'manual',value:definition.price}),edition:structuredClone(offer?.edition??{status:'known',source:'manual',value:'base'}),stickers:structuredClone(offer?.stickers??{status:'known',source:'manual',value:[]})}],ignoredOtherOffers:[]}};
 const action:ShopAction=sellId?{type:'replace',sellInstanceId:sellId,offerId:'catalog-preview',instanceId}:{type:'buy',offerId:'catalog-preview',instanceId};
 return adviseShop(state,scenarios,{expectedRevision:state.revision,updatedAt:state.updatedAt},{actions:[{type:'hold'},action]});
}
