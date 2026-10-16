import {HISTORY_COUNTERS,HISTORY_TARGET_KEYS} from './history-jokers.js';
import {GENERATION_COUNTERS} from './generation-jokers.js';
export interface CounterSpec {label:string;initial:number;min:number;max?:number}
const chips=(initial=0):CounterSpec=>({label:'Fichas actuales',initial,min:0});
const mult=(initial=0):CounterSpec=>({label:'Mult actual',initial,min:0});
/** Integer hundredths avoid changing the saved integer-counter contract. */
export const JOKER_COUNTERS:Readonly<Record<string,Readonly<Record<string,CounterSpec>>>>={
 ...HISTORY_COUNTERS,...GENERATION_COUNTERS,
 runner:{chips:chips()},square:{chips:chips()},wee:{chips:chips()},
 trousers:{mult:mult()},ride_the_bus:{mult:mult()},
 ice_cream:{chips:chips(100)},popcorn:{mult:mult(20)},
 selzer:{hands:{label:'Manos restantes',initial:10,min:1,max:10}},
 ramen:{x100:{label:'XMult × 100 (200 = ×2)',initial:200,min:101,max:200}},
 hit_the_road:{x100:{label:'XMult × 100 (150 = ×1,5)',initial:100,min:100}},
 yorick:{x100:{label:'XMult × 100',initial:100,min:100},remaining:{label:'Cartas por descartar para crecer',initial:23,min:1,max:23}}
};
export const counterSpecs=(id:string)=>JOKER_COUNTERS[id]??{};
export function initialCounters(id:string){return Object.fromEntries(Object.entries(counterSpecs(id)).map(([key,s])=>[key,(HISTORY_TARGET_KEYS[id]?.includes(key)||id==='todo_list'&&key==='handIndex')?{status:'unknown' as const,reason:'Transcribe el objetivo observado de la ronda.'}:{status:'known' as const,source:'manual' as const,value:s.initial}]));}
