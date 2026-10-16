import {resolveDeck} from './decks.js';
import {VOUCHER_CATALOG} from './voucher-catalog.js';
/** L06: persistent effects inspected in Card:apply_to_run, not played-game evidence. */
export const VOUCHER_EFFECTS:Readonly<Record<string,Readonly<Partial<Record<'hands'|'discards'|'handSize'|'jokerSlots',number>>>>>={
 v_grabber:{hands:1},v_nacho_tong:{hands:1},v_wasteful:{discards:1},v_recyclomancy:{discards:1},
 v_paint_brush:{handSize:1},v_palette:{handSize:1},v_blank:{},v_antimatter:{jokerSlots:1},
 v_seed_money:{},v_money_tree:{}
};
export const supportsVoucher=(id:string)=>Object.hasOwn(VOUCHER_EFFECTS,id);
/** Manual annotations may use the full catalogue without enabling their rules. */
export function cataloguedVouchers(ids:readonly string[]){
 return new Set(ids).size===ids.length && ids.every(id=>{const entry=VOUCHER_CATALOG.find(v=>v.id===id);return entry&&entry.requires.every(required=>ids.includes(required));});
}
export function supportedVouchers(ids:readonly string[]){
 return cataloguedVouchers(ids)&&ids.every(supportsVoucher);
}
/** Recompute from the deck, never repeatedly add to previously modified resources. */
export function voucherResources(deckId:string,ids:readonly string[]){
 const d=resolveDeck(deckId), result={hands:d.hands,discards:d.discards,handSize:d.handSize,jokerSlots:d.jokerSlots};
 for(const id of new Set(ids))for(const [key,amount] of Object.entries(VOUCHER_EFFECTS[id]??{}))result[key as keyof typeof result]+=amount;
 return result;
}
