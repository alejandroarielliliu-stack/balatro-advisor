import {standardDeck} from './initial.js';
import type {Card} from './initial.js';

/** Declarative conditions: 1.0.1o-FULL / White Stake, L03. Templates, never patches to a running game. */
export type Resource = 'hands'|'discards'|'handSize'|'jokerSlots'|'startingMoney'|'consumableSlots'|'shopSlots';
export type Category = 'joker'|'tarot'|'planet'|'spectral'|'playingCard';
export type DeckCondition =
 | {when:'run_start';kind:'add';field:Resource;amount:number}
 | {when:'run_start';kind:'grant';itemType:'voucher'|'tarot'|'spectral';id:string;count:number}
 | {when:'run_start';kind:'composition';mode:'remove_faces'|'red_black_suits'|'random_rank_suit'}
 | {when:'shop_generation';kind:'weight';category:Category;value:number}
 | {when:'celestial_pack';kind:'most_played_visible';slot:1;minimumPlayed:1;tieBreak:'handlist_order';fallback:'normal_planet_pool'}
 | {when:'cashout';kind:'income';perHand:number;perDiscard:number;interest:false}
 | {when:'boss_defeated';kind:'grant_tag';id:'tag_double';count:1}
 | {when:'blind_target';kind:'multiply';factor:2}
 | {when:'final_scoring';kind:'floor_average'};
interface Profile {name:string;effect:string;conditions:readonly DeckCondition[];engine:boolean;limitation:string}
const add=(field:Resource,amount:number):DeckCondition=>({when:'run_start',kind:'add',field,amount});
const grant=(itemType:'voucher'|'tarot'|'spectral',id:string,count=1):DeckCondition=>({when:'run_start',kind:'grant',itemType,id,count});
// Voucher effects are expanded by the resolver, not repeated in each deck.
const VOUCHER_CONDITIONS:Record<string,readonly DeckCondition[]>={
 v_crystal_ball:[add('consumableSlots',1)],
 v_telescope:[{when:'celestial_pack',kind:'most_played_visible',slot:1,minimumPlayed:1,tieBreak:'handlist_order',fallback:'normal_planet_pool'}],
 v_tarot_merchant:[{when:'shop_generation',kind:'weight',category:'tarot',value:9.6}],
 v_planet_merchant:[{when:'shop_generation',kind:'weight',category:'planet',value:9.6}],
 v_overstock_norm:[add('shopSlots',1)]
};
export const DECK_PROFILES = {
 blue:{name:'Baraja azul',effect:'+1 mano por ronda.',conditions:[add('hands',1)],engine:true,limitation:''},
 red:{name:'Baraja roja',effect:'+1 descarte por ronda.',conditions:[add('discards',1)],engine:true,limitation:''},
 yellow:{name:'Baraja amarilla',effect:'+$10 al iniciar la partida.',conditions:[add('startingMoney',10)],engine:true,limitation:''},
 green:{name:'Baraja verde',effect:'Sin intereses. $2 por mano y $1 por descarte sobrantes.',conditions:[{when:'cashout',kind:'income',perHand:2,perDiscard:1,interest:false}],engine:true,limitation:''},
 black:{name:'Baraja negra',effect:'−1 mano por ronda; +1 espacio de comodín.',conditions:[add('hands',-1),add('jokerSlots',1)],engine:true,limitation:''},
 magic:{name:'Baraja mágica',effect:'Inicia con Crystal Ball y dos The Fool.',conditions:[grant('voucher','v_crystal_ball'),grant('tarot','c_fool',2)],engine:false,limitation:'Falta integrar inventario y uso de consumibles/vales en H2.'},
 nebula:{name:'Baraja nebulosa',effect:'Inicia con Telescope; −1 espacio de consumible.',conditions:[grant('voucher','v_telescope'),add('consumableSlots',-1)],engine:false,limitation:'Falta integrar vales y apertura de sobres celestiales en H2.'},
 ghost:{name:'Baraja fantasma',effect:'Espectrales en la tienda (peso 2); inicia con Hex.',conditions:[{when:'shop_generation',kind:'weight',category:'spectral',value:2},grant('spectral','c_hex')],engine:false,limitation:'Falta integrar inventario y uso de espectrales en H2.'},
 abandoned:{name:'Baraja abandonada',effect:'40 cartas iniciales; sin J, Q ni K.',conditions:[{when:'run_start',kind:'composition',mode:'remove_faces'}],engine:true,limitation:'Requiere composición actual explícita; la plantilla de 40 cartas debe confirmarse.'},
 checkered:{name:'Baraja cuadriculada',effect:'26 picas y 26 corazones iniciales.',conditions:[{when:'run_start',kind:'composition',mode:'red_black_suits'}],engine:true,limitation:'Requiere composición explícita con un identificador por copia.'},
 zodiac:{name:'Baraja del zodíaco',effect:'Inicia con Tarot Merchant, Planet Merchant y Overstock.',conditions:[grant('voucher','v_tarot_merchant'),grant('voucher','v_planet_merchant'),grant('voucher','v_overstock_norm')],engine:false,limitation:'Falta integrar vales y ofertas no comodín en H2.'},
 painted:{name:'Baraja pintada',effect:'+2 cartas en mano; −1 espacio de comodín.',conditions:[add('handSize',2),add('jokerSlots',-1)],engine:true,limitation:''},
 anaglyph:{name:'Baraja anaglifo',effect:'Gana un Double Tag después de cada jefe derrotado.',conditions:[{when:'boss_defeated',kind:'grant_tag',id:'tag_double',count:1}],engine:false,limitation:'Falta integrar adquisición y consumo de tags en H2.'},
 plasma:{name:'Baraja de plasma',effect:'Equilibra fichas y Mult al final; objetivos de ciega ×2.',conditions:[{when:'blind_target',kind:'multiply',factor:2},{when:'final_scoring',kind:'floor_average'}],engine:true,limitation:''},
 erratic:{name:'Baraja errática',effect:'52 cartas con rango y palo aleatorios al iniciar.',conditions:[{when:'run_start',kind:'composition',mode:'random_rank_suit'}],engine:true,limitation:'Requiere registrar la composición real; no se genera sin semilla.'}
} as const satisfies Record<string,Profile>;
export type DeckId=keyof typeof DECK_PROFILES;
export type SupportedDeck='blue'|'red'|'yellow'|'green'|'black'|'painted'|'plasma'|'abandoned'|'checkered'|'erratic';
export function deckProfile(id:string):Profile|undefined{return Object.hasOwn(DECK_PROFILES,id)?DECK_PROFILES[id as DeckId]:undefined;}
export function resolveDeck(id:string){
 const profile=deckProfile(id);if(!profile)throw new Error(`Baraja desconocida: ${id}`);
 const values:Record<Resource,number>={hands:4,discards:3,handSize:8,jokerSlots:5,startingMoney:4,consumableSlots:2,shopSlots:2};
 const shopWeights:Record<Category,number>={joker:20,tarot:4,planet:4,spectral:0,playingCard:0};
 const initialItems:{itemType:'voucher'|'tarot'|'spectral';id:string;count:number}[]=[];
 const conditions=structuredClone([...profile.conditions]);
 let composition:'standard52'|'remove_faces'|'red_black_suits'|'random_rank_suit'='standard52';
 let income={perHand:1,perDiscard:0,interest:true},blindMultiplier=1,scoring:'multiply'|'floor_average'='multiply';
 for(const c of conditions){
  switch(c.kind){
   case 'add':values[c.field]+=c.amount;break;
   case 'grant':initialItems.push({itemType:c.itemType,id:c.id,count:c.count});if(c.itemType==='voucher')conditions.push(...structuredClone(VOUCHER_CONDITIONS[c.id]??[]));break;
   case 'composition':composition=c.mode;break;
   case 'weight':shopWeights[c.category]=c.value;break;
   case 'income':income={perHand:c.perHand,perDiscard:c.perDiscard,interest:c.interest};break;
   case 'multiply':blindMultiplier=c.factor;break;
   case 'floor_average':scoring=c.kind;break;
  }
 }
 return {...values,name:profile.name,effect:profile.effect,engine:profile.engine,limitation:profile.limitation,composition,initialItems,shopWeights,income,blindMultiplier,scoring,conditions,
  evidence:{version:'1.0.1o-FULL',status:'provisional',kind:'local_source',source:'L03',observedInGame:false} as const};
}
/** Engine/editor API contains only integrated profiles. */
export const DECKS=Object.fromEntries((['blue','red','yellow','green','black','painted','plasma','abandoned','checkered','erratic'] as const).map(id=>[id,resolveDeck(id)])) as Record<SupportedDeck,ReturnType<typeof resolveDeck>>;
export function deckDefinition(id:string){return Object.hasOwn(DECKS,id)?DECKS[id as SupportedDeck]:undefined;}
/** New-run template; no random generation or inference of the current deck. */
export function startingComposition(id:string):{status:'known';cards:Card[]}|{status:'unknown';reason:string;count:52}{
 const {composition}=resolveDeck(id);
 if(composition==='random_rank_suit')return {status:'unknown',count:52,reason:'Registrar rango y palo de cada carta de la partida real.'};
 let cards=standardDeck();
 if(composition==='remove_faces')cards=cards.filter(c=>!['J','Q','K'].includes(c.rank));
 if(composition==='red_black_suits')cards=cards.map(c=>({...c,suit:c.suit==='C'?'S':c.suit==='D'?'H':c.suit}));
 return {status:'known',cards};
}
/** Category distribution of an ordinary shop card slot: excludes boosters,
 * forced tags and individual-card availability; not a next-shop prediction. */
export function startingShopDistribution(id:string){
 const weights=resolveDeck(id).shopWeights,total=Object.values(weights).reduce((a,b)=>a+b,0);
 return Object.fromEntries(Object.entries(weights).map(([category,weight])=>[category,{weight,total,share:weight/total}])) as Record<Category,{weight:number;total:number;share:number}>;
}
