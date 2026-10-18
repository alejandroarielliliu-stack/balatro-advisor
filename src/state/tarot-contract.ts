import {array,enumeration,object,text,union} from './schema.js';
import type {Infer} from './schema.js';

/** Observed hand membership and an owned consumable, never a hypothetical draw. */
export const tarotActionSchema=union(
 object({type:enumeration('observe_round_hand'),cardIds:array(text(),100)}),
 object({type:enumeration('use_tarot'),instanceId:text(),targetCardIds:array(text(),100)})
);
export type TarotAction=Infer<typeof tarotActionSchema>;
