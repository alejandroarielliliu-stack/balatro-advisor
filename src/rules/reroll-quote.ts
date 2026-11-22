import {GAME_VERSION} from '../catalog/initial.js';
import type {Fact,GameState} from '../state/model.js';
import type {FullJokerContext} from './full-joker-contract.js';

export const D6_TAG='tag_d_six';
export const REROLL_VOUCHERS=['v_reroll_surplus','v_reroll_glut'] as const;
const value=<T>(fact:Fact<T>|undefined)=>fact?.status==='known'?fact.value:undefined;
const preset=(value:number):Fact<number>=>({status:'known',source:'confirmedPreset',value});
const manual=(value:number):Fact<number>=>({status:'known',source:'manual',value});
const unknown=(reason:string):Fact<number>=>({status:'unknown',reason});
const missingRate='Falta el precio de renovación pagada de esta tienda.';
const missingFree='Faltan los usos gratis restantes de Chaos en esta tienda.';

/** D6 uses a temporary base of zero. The shop keeps one activated tag, separate from the pending queue. */
function hasActiveD6(state:GameState):boolean {
 return state.schemaVersion==='0.2'&&value(state.observed.shop)?.pricingTags?.includes(D6_TAG)===true;
}

function supportsCalculatedRerolls(state:GameState):boolean {
 const {gameVersion,gamePlatform,modsPresent,outOfScope}=state.observed;
 return value(gameVersion)===GAME_VERSION&&value(gamePlatform)==='pc-steam'&&value(modsPresent)===false&&value(outOfScope)?.otherModifiers.length===0;
}

function newShopRate(state:GameState,context:FullJokerContext):number|undefined {
 const modifiers=value(state.observed.outOfScope);
 if(!modifiers||!supportsCalculatedRerolls(state))return undefined;
 if(hasActiveD6(state))return 0;
 if(value(context.tags)===undefined||modifiers.pendingTags.includes(D6_TAG))return undefined;
 // The Steam rules reset the ordinary base to $5 less $2 for each redeemed reroll voucher.
 return 5-2*REROLL_VOUCHERS.filter(id=>modifiers.vouchers.includes(id)).length;
}

function startingFreeRerolls(state:GameState):number|undefined {
 if(!supportsCalculatedRerolls(state))return undefined;
 const chaos=value(state.observed.jokers)?.filter(joker=>joker.catalogId==='chaos');
 if(!chaos||chaos.some(joker=>joker.stickers.status!=='known'||joker.stickers.value.includes('perishable')))return undefined;
 return chaos.length;
}

function freshShopFacts(state:GameState,context:FullJokerContext):FullJokerContext {
 const rate=newShopRate(state,context),free=startingFreeRerolls(state);
 return {...context,rerollCost:rate===undefined?unknown(missingRate):preset(rate),freeRerolls:free===undefined?unknown(missingFree):preset(free)};
}

/** Called on a recorded cashout into a new shop, after the final inventory is known. */
export function initializeShopRerolls(state:GameState):void {
 const existing=state.observed.jokerContext;
 if(existing?.status!=='known')return;
 const context=structuredClone(existing.value);
 const next=freshShopFacts(state,context);
 if(context.rerollCost?.status==='known')next.rerollCost=context.rerollCost;
 if(context.freeRerolls?.status==='known')next.freeRerolls=context.freeRerolls;
 if(context.visibleRerollCost?.status!=='known')delete next.visibleRerollCost;
 state.observed.jokerContext={...existing,value:next};
}

function rerollContext(state:GameState):FullJokerContext {
 const context=value(state.observed.jokerContext)??{};
 // The old observed reroll flow always stored all three facts, even if the next
 // price was left blank. Any explicit price, including unknown, remains authoritative.
 const entry=state.observed.shop.status==='unknown'&&/^Registra las ofertas de esta nueva tienda[.;]/.test(state.observed.shop.reason);
 const unstamped=state.observed.shop.status==='known'&&!context.rerollCost&&!context.freeRerolls;
 if(state.schemaVersion==='0.2'&&state.phase==='shop'&&state.phaseData.origin.status==='known'&&(entry||unstamped)&&
    !context.visibleRerollCost&&value(context.tags)?.includes(D6_TAG)===false){
  const fresh=freshShopFacts(state,context);
  if(context.rerollCost?.status==='known')fresh.rerollCost=context.rerollCost;
  if(context.freeRerolls?.status==='known')fresh.freeRerolls=context.freeRerolls;
  return fresh;
 }
 return context;
}

/** The price shown now can be zero even when the next paid reroll costs money. */
export function observedRerollQuote(state:GameState):number|null {
 const {visibleRerollCost,freeRerolls,rerollCost}=rerollContext(state);
 if(visibleRerollCost)return value(visibleRerollCost)??null;
 if(freeRerolls?.status!=='known')return null;
 return freeRerolls.value>0?0:value(rerollCost)??null;
}

/** A manual check overrides the display while retaining any separately known nominal D6 rate. */
export function contextWithObservedRerollQuote(state:GameState,price:number|null):FullJokerContext {
 const context=structuredClone(rerollContext(state));
 applyVisibleQuote(context,price,hasActiveD6(state));
 return context;
}

function applyVisibleQuote(context:FullJokerContext,price:number|null,d6:boolean):void {
 context.visibleRerollCost=price===null?unknown('Precio visible de renovación sin registrar.'):manual(price);
 if(price!==null&&price>0){
  if(!d6||value(context.rerollCost)===undefined)context.rerollCost=manual(price);
  context.freeRerolls=manual(0);
 }else if(price===0&&!d6&&(value(context.rerollCost)??0)>0&&value(context.freeRerolls)===0)context.freeRerolls=unknown(missingFree);
}

/** Advance exactly one confirmed renewal. A Chaos free use never raises the nominal rate. */
export function rerollContextAfterObservation(state:GameState,nextPrice?:number):FullJokerContext {
 const context=structuredClone(rerollContext(state)),price=observedRerollQuote(state);
 const free=price!==null&&price>0?0:value(context.freeRerolls);
 const nominal=value(context.rerollCost);
 delete context.visibleRerollCost;
 if(free===undefined)context.rerollCost=unknown(missingRate);
 else if(free===0)context.rerollCost=nominal!==undefined&&Number.isSafeInteger(nominal+1)?preset(nominal+1):unknown(missingRate);
 context.freeRerolls=free===undefined?unknown(missingFree):preset(Math.max(0,free-1));
 if(nextPrice!==undefined)applyVisibleQuote(context,nextPrice,hasActiveD6(state));
 return context;
}

/** Redemption changes the permanent base and current display independently. */
export function applyRerollVoucher(state:GameState):void {
 const context=structuredClone(rerollContext(state)),current=observedRerollQuote(state),nominal=value(context.rerollCost);
 const d6=hasActiveD6(state);
 if(nominal!==undefined&&!d6)context.rerollCost=preset(Math.max(0,nominal-2));
 if(current!==null)context.visibleRerollCost=preset(Math.max(0,current-2));
 if(current!==null||nominal!==undefined)state.observed.jokerContext={status:'known',source:'confirmedPreset',value:context};
}

/** An acquisition grants a use immediately. A removal cannot carry a temporary displayed price forward. */
export function adjustChaosRerolls(state:GameState,change:'add'|'remove'):void {
 const context=structuredClone(rerollContext(state));
 const previous=value(context.freeRerolls);
 delete context.visibleRerollCost;
 if(previous!==undefined)context.freeRerolls=preset(Math.max(0,previous+(change==='add'?1:-1)));
 else if(change==='add')context.visibleRerollCost=preset(0);
 state.observed.jokerContext={status:'known',source:'confirmedPreset',value:context};
}
