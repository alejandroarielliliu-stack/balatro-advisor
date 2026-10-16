/** Documentary relations only. Participants are not automatic match predicates. */
export interface SynergyReference {
 id:string;title:string;kind:'synergy'|'conflict'|'non-synergy';jokerIds:string[];
 deckRequirements:{zone:'held'|'held-end-round'|'scoring'|'played'|'full-deck';traits:string[];minimum:number}[];
 mechanism:string;conditions:string[];risks:string[];order:string;
 example:{setup:string;expected:string;basis:string};sourceIds:string[];
 evidenceStatus:'static-supported'|'provisional-composition';engineSupport:'reference-only';observedInGame:false;
}
export interface SynergyLibrary {schemaVersion:1;gameVersion:string;scope:string;sources:Record<string,{type:string;url?:string;path?:string;note?:string}>;synergies:SynergyReference[]}
export function relatedSynergies(library:SynergyLibrary,jokerId:string){return library.synergies.filter(s=>s.jokerIds.includes(jokerId));}
