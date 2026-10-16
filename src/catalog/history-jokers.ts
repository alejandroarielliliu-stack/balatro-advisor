/** CAT04: static inspection of installed Steam 1.0.1o-FULL; not an observed gameplay test. */
import type {CounterSpec} from './joker-counters.js';
export const HISTORY_JOKERS = {
  "loyalty_card": {
    "name": "Loyalty Card",
    "artId": "j_loyalty_card",
    "price": 5,
    "sell": 2,
    "blueprint": true
  },
  "supernova": {
    "name": "Supernova",
    "artId": "j_supernova",
    "price": 5,
    "sell": 2,
    "blueprint": true
  },
  "burglar": {
    "name": "Burglar",
    "artId": "j_burglar",
    "price": 6,
    "sell": 3,
    "blueprint": true
  },
  "card_sharp": {
    "name": "Card Sharp",
    "artId": "j_card_sharp",
    "price": 6,
    "sell": 3,
    "blueprint": true
  },
  "madness": {
    "name": "Madness",
    "artId": "j_madness",
    "price": 7,
    "sell": 3,
    "blueprint": true
  },
  "rocket": {
    "name": "Rocket",
    "artId": "j_rocket",
    "price": 6,
    "sell": 3,
    "blueprint": false
  },
  "obelisk": {
    "name": "Obelisk",
    "artId": "j_obelisk",
    "price": 8,
    "sell": 4,
    "blueprint": true
  },
  "luchador": {
    "name": "Luchador",
    "artId": "j_luchador",
    "price": 5,
    "sell": 2,
    "blueprint": true
  },
  "turtle_bean": {
    "name": "Turtle Bean",
    "artId": "j_turtle_bean",
    "price": 6,
    "sell": 3,
    "blueprint": false
  },
  "erosion": {
    "name": "Erosion",
    "artId": "j_erosion",
    "price": 6,
    "sell": 3,
    "blueprint": true
  },
  "mail": {
    "name": "Mail-In Rebate",
    "artId": "j_mail",
    "price": 4,
    "sell": 2,
    "blueprint": true
  },
  "ancient": {
    "name": "Ancient Joker",
    "artId": "j_ancient",
    "price": 8,
    "sell": 4,
    "blueprint": true
  },
  "castle": {
    "name": "Castle",
    "artId": "j_castle",
    "price": 6,
    "sell": 3,
    "blueprint": true
  },
  "mr_bones": {
    "name": "Mr. Bones",
    "artId": "j_mr_bones",
    "price": 5,
    "sell": 2,
    "blueprint": false
  },
  "throwback": {
    "name": "Throwback",
    "artId": "j_throwback",
    "price": 6,
    "sell": 3,
    "blueprint": true
  },
  "idol": {
    "name": "The Idol",
    "artId": "j_idol",
    "price": 6,
    "sell": 3,
    "blueprint": true
  },
  "matador": {
    "name": "Matador",
    "artId": "j_matador",
    "price": 7,
    "sell": 3,
    "blueprint": true
  },
  "chicot": {
    "name": "Chicot",
    "artId": "j_chicot",
    "price": 20,
    "sell": 10,
    "blueprint": false
  }
} as const;
export const historyJoker=(id:string)=>Object.hasOwn(HISTORY_JOKERS,id)?HISTORY_JOKERS[id as keyof typeof HISTORY_JOKERS]:undefined;

export const HISTORY_COUNTERS:Readonly<Record<string,Readonly<Record<string,CounterSpec>>>>={
 loyalty_card:{hands:{label:'Manos jugadas desde adquirirlo',initial:0,min:0}},
 madness:{x100:{label:'XMult × 100',initial:100,min:100}},
 obelisk:{x100:{label:'XMult × 100',initial:100,min:100}},
 rocket:{dollars:{label:'Dólares por ronda',initial:1,min:1}},
 turtle_bean:{hSize:{label:'Tamaño de mano añadido',initial:5,min:1,max:5}},
 castle:{chips:{label:'Fichas acumuladas',initial:0,min:0},suit:{label:'Palo objetivo: 0♠ 1♥ 2♦ 3♣',initial:0,min:0,max:3}},
 mail:{rank:{label:'Rango objetivo (11 J; 12 Q; 13 K; 14 A)',initial:14,min:2,max:14}},
 ancient:{suit:{label:'Palo objetivo: 0♠ 1♥ 2♦ 3♣',initial:0,min:0,max:3}},
 idol:{rank:{label:'Rango objetivo (11 J; 12 Q; 13 K; 14 A)',initial:14,min:2,max:14},suit:{label:'Palo objetivo: 0♠ 1♥ 2♦ 3♣',initial:0,min:0,max:3}}
};
/** Global round targets already exist before acquisition: the initial UI must request these values. */
export const HISTORY_TARGET_KEYS:Readonly<Record<string,readonly string[]>>={mail:['rank'],ancient:['suit'],castle:['suit'],idol:['rank','suit']};
