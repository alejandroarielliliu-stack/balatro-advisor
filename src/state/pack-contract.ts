import {effectChoiceSchema} from './effect-choices.js';
import {jokerSchema} from './legacy-model.js';
import {array,enumeration,fact,integer,object,text,union} from './schema.js';
import type {Infer} from './schema.js';

/** Recorded pack facts. Prices, contents and outcomes are never generated here. */
export const packOfferSchema=object({offerId:text(),catalogId:text(),price:fact(integer(0))});
export type PackOffer=Infer<typeof packOfferSchema>;
export const packEntrySchema=union(
 object({entryId:text(),kind:enumeration('joker'),joker:jokerSchema}),
 union(object({entryId:text(),kind:enumeration('planet'),catalogId:text()}),object({entryId:text(),kind:enumeration('unsupported'),catalogId:text()}))
);
export type PackEntry=Infer<typeof packEntrySchema>;
export const packContextSchema=object({
 offerId:text(),shopId:text(),catalogId:text(),paid:integer(0),remainingChoices:integer(0),
 contents:fact(array(packEntrySchema,100)),selectedEntryIds:array(text(),100),
 shopOrigin:fact(object({ante:integer(1),kind:enumeration('small','big','boss')}))
});
export type PackContext=Infer<typeof packContextSchema>;
const choiceFields={choices:array(effectChoiceSchema,2000)};
export const packActionSchema=union(
 union(object({type:enumeration('buy_pack'),offerId:text()},choiceFields),object({type:enumeration('observe_pack'),contents:array(packEntrySchema,100)})),
 union(object({type:enumeration('choose_pack_item'),entryId:text()}),union(object({type:enumeration('skip_open_pack')},choiceFields),object({type:enumeration('sell_pack_joker'),instanceId:text()},choiceFields)))
);
export type PackAction=Infer<typeof packActionSchema>;
