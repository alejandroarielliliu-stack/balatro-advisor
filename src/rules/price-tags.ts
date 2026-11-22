import type {Fact,GameState} from '../state/model.js';
import {tagDefinition} from '../catalog/tags.js';
import {deckDefinition} from '../catalog/decks.js';

export const PRICE_TAGS=new Set(['tag_coupon','tag_uncommon','tag_rare','tag_negative','tag_foil','tag_holo','tag_polychrome']);
const known=(value:string[]):Fact<string[]>=>({status:'known',source:'confirmedPreset',value});

/** The caller has already established a boss win. Never recover an unknown queue from a reward. */
export function grantBossDefeatTag(state:GameState):number {
 const deck=state.observed.deckId,context=state.observed.jokerContext;
 if(deck.status!=='known'||context?.status!=='known'||context.value.tags?.status!=='known')return 0;
 const grant=deckDefinition(deck.value)?.conditions.find(condition=>condition.when==='boss_defeated');
 if(!grant)return 0;
 context.value.tags=known([...context.value.tags.value,...Array<string>(grant.count).fill(grant.id)]);
 return grant.count;
}

/** Only the queue is advanced here. Money, cards and pack contents remain observed. */
export function tagsAfterObservedSkip(state:GameState):Fact<string[]> {
 const previous=state.observed.jokerContext?.status==='known'?state.observed.jokerContext.value.tags:undefined;
 const tag=state.schemaVersion==='0.2'&&state.phase==='blind_select'?state.phaseData.skipTag:undefined;
 if(previous?.status!=='known'||tag?.status!=='known')return {status:'unknown',reason:'Falta la cola previa o la etiqueta del salto.'};
 const queue=[...previous.value],id=tag.value;
 if(id==='tag_double')return known([...queue,id]);
 const copies=1+queue.filter(item=>item==='tag_double').length;
 const retained=queue.filter(item=>item!=='tag_double');
 const trigger=tagDefinition(id)?.trigger;
 // The user confirmed completion of immediate rewards and the next selection.
 if(trigger!=='immediate'&&trigger!=='new_blind_choice')retained.push(...Array<string>(copies).fill(id));
 return known(retained);
}

export function pricingTagsForShop(state:GameState,shopId?:string):string[] {
 const shop=state.schemaVersion==='0.2'&&state.observed.shop.status==='known'?state.observed.shop.value:undefined;
 if(shop?.pricingTags&&(shopId===undefined||shop.shopId===shopId))return [...shop.pricingTags];
 const tags=state.observed.jokerContext?.status==='known'?state.observed.jokerContext.value.tags:undefined;
 if(tags?.status!=='known')return [];
 let coupon=false;
 return tags.value.filter(id=>PRICE_TAGS.has(id)&&(id!=='tag_coupon'||!coupon&&(coupon=true)));
}
