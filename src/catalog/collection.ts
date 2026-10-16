/** Read-only reference data. This module does not register effects with the rules engine. */
export interface JokerReference {
 id:string; order:number; names:{es:string;en:string};
 localization:Record<'es'|'en',{name:string;description:string;template:string[];variables:unknown[];unlockTemplate:string[]}>;
 rarity:number; basePrice:number; initiallyUnlocked:boolean;
 compatibility:{blueprint:boolean;perishable:boolean;eternal:boolean};
 config:Record<string,unknown>; unlockCondition:Record<string,unknown>|null; poolRestrictions:Record<string,unknown>;
 art:{position:{x:number;y:number};overlay:{x:number;y:number}|null};
 engineId:string|null; evidence:string; observedInGame:boolean;
}
export interface JokerCollection {schemaVersion:1;gameVersion:string;jokers:JokerReference[]}
export const rarityNames:Record<number,string>={1:'Común',2:'Inusual',3:'Raro',4:'Legendario'};
export const normalizeSearch=(value:string)=>value.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
export function filterCollection(jokers:readonly JokerReference[],query='',rarity='',support=''){
 const words=normalizeSearch(query).trim().split(/\s+/).filter(Boolean);
 return jokers.filter(j=>(!rarity||String(j.rarity)===rarity)&&(!support||(support==='implemented')===Boolean(j.engineId))&&words.every(w=>normalizeSearch(`${j.id} ${j.names.es} ${j.names.en} ${j.localization.es.description} ${j.localization.en.description}`).includes(w)));
}
