import type {GameState} from '../state/model.js';

/** The price shown now can be zero even when the next paid reroll costs money. */
export function observedRerollQuote(state:GameState):number|null {
 const observed=state.observed.jokerContext;
 if(observed?.status!=='known')return null;
 const {visibleRerollCost,freeRerolls,rerollCost}=observed.value;
 if(visibleRerollCost)return visibleRerollCost.status==='known'?visibleRerollCost.value:null;
 if(freeRerolls?.status!=='known')return null;
 if(freeRerolls.value>0)return 0;
 return rerollCost?.status==='known'?rerollCost.value:null;
}
