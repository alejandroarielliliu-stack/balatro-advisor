import type {Card,HandId} from '../catalog/initial.js';
import type {Fact,GameState,JokerInstance} from '../state/model.js';
import type {Trace} from './core.js';

export interface Consumable {instanceId:string;catalogId:string;kind:'tarot'|'planet'|'spectral';edition:'base'|'negative';sellValue:number;handId?:HandId}
export interface FullJokerContext {
 grosMichelExtinct?:Fact<boolean>;tags?:Fact<string[]>;visibleHands?:Fact<HandId[]>;
 handCounts?:Record<string,Fact<number>>;roundHandCounts?:Record<string,Fact<number>>;
 tarotsUsed?:Fact<number>;planetsUsed?:Fact<string[]>;startingDeckSize?:Fact<number>;blindsSkipped?:Fact<number>;
 consumables?:Fact<Consumable[]>;consumableSlots?:Fact<number>;
 rerollCost?:Fact<number>;freeRerolls?:Fact<number>;bossDisabled?:Fact<boolean>;
}
/** A concrete scenario branch, never a sample or a probability-weighted average. */
export interface EffectChoice {
 key:string;kind:'boolean'|'integer'|'card'|'joker'|'consumable'|'target';
 value:boolean|number|string|Card|JokerInstance|Consumable;knowledge:'known'|'hypothetical';basis:string;
}
export interface FullJokerInput {
 state:GameState;physical:JokerInstance[];effective:JokerInstance[];played:Card[];scoring:Card[];held:Card[];
 hand:HandId;handsRemaining?:number|undefined;discardsRemaining:number;handsUsed?:number|undefined;discardsUsed?:number|undefined;
 choices?:readonly EffectChoice[];luckyTriggeredIds?:string[];generatedLocations?:Record<string,'hand'|'deck'>;trace:Trace[];use:(id:string)=>void;
}
export interface EffectBonus {chips?:number|undefined;mult?:number|undefined;xmult?:number|undefined;money?:number}
export interface FullEventInput {
 state:GameState;stage:'select_blind'|'before_hand'|'after_hand'|'discard'|'end_round'|'end_shop'|'reroll'|'skip_pack'|'open_pack'|'use_consumable'|'sell';
 cards:Card[];hand?:HandId;handsUsed?:number|undefined;discardsUsed?:number|undefined;won?:boolean|undefined;
 consumable?:Consumable;soldJoker?:JokerInstance;activeBlind?:boolean|undefined;choices?:readonly EffectChoice[];generatedLocations?:Record<string,'hand'|'deck'>;trace:Trace[];use:(id:string)=>void;
}
