/** CAT02: static 1.0.1o source; no played-game verification. */
export interface SimpleJoker {
 name:string;artId:string;price:number;sell:number;stage:'main'|'card'|'selection';
 condition:'always'|'suit'|'ranks'|'pair'|'three'|'two_pair'|'straight'|'flush'|'four'|'zero_discards'|'money_chips'|'money_mult'|'sell_mult'|'flower_pot'|'seeing_double';
 chips:number;mult:number;xmult:number;suit?:string;ranks?:readonly string[];
}
export const SIMPLE_JOKERS:Readonly<Record<string,SimpleJoker>> = {
  "greedy_joker": {
    "name": "Greedy Joker",
    "artId": "j_greedy_joker",
    "price": 5,
    "sell": 2,
    "stage": "card",
    "condition": "suit",
    "chips": 0,
    "mult": 3,
    "xmult": 1,
    "suit": "D"
  },
  "lusty_joker": {
    "name": "Lusty Joker",
    "artId": "j_lusty_joker",
    "price": 5,
    "sell": 2,
    "stage": "card",
    "condition": "suit",
    "chips": 0,
    "mult": 3,
    "xmult": 1,
    "suit": "H"
  },
  "wrathful_joker": {
    "name": "Wrathful Joker",
    "artId": "j_wrathful_joker",
    "price": 5,
    "sell": 2,
    "stage": "card",
    "condition": "suit",
    "chips": 0,
    "mult": 3,
    "xmult": 1,
    "suit": "S"
  },
  "gluttenous_joker": {
    "name": "Gluttonous Joker",
    "artId": "j_gluttenous_joker",
    "price": 5,
    "sell": 2,
    "stage": "card",
    "condition": "suit",
    "chips": 0,
    "mult": 3,
    "xmult": 1,
    "suit": "C"
  },
  "jolly": {
    "name": "Jolly Joker",
    "artId": "j_jolly",
    "price": 3,
    "sell": 1,
    "stage": "main",
    "condition": "pair",
    "chips": 0,
    "mult": 8,
    "xmult": 1
  },
  "zany": {
    "name": "Zany Joker",
    "artId": "j_zany",
    "price": 4,
    "sell": 2,
    "stage": "main",
    "condition": "three",
    "chips": 0,
    "mult": 12,
    "xmult": 1
  },
  "mad": {
    "name": "Mad Joker",
    "artId": "j_mad",
    "price": 4,
    "sell": 2,
    "stage": "main",
    "condition": "two_pair",
    "chips": 0,
    "mult": 10,
    "xmult": 1
  },
  "crazy": {
    "name": "Crazy Joker",
    "artId": "j_crazy",
    "price": 4,
    "sell": 2,
    "stage": "main",
    "condition": "straight",
    "chips": 0,
    "mult": 12,
    "xmult": 1
  },
  "droll": {
    "name": "Droll Joker",
    "artId": "j_droll",
    "price": 4,
    "sell": 2,
    "stage": "main",
    "condition": "flush",
    "chips": 0,
    "mult": 10,
    "xmult": 1
  },
  "sly": {
    "name": "Sly Joker",
    "artId": "j_sly",
    "price": 3,
    "sell": 1,
    "stage": "main",
    "condition": "pair",
    "chips": 50,
    "mult": 0,
    "xmult": 1
  },
  "wily": {
    "name": "Wily Joker",
    "artId": "j_wily",
    "price": 4,
    "sell": 2,
    "stage": "main",
    "condition": "three",
    "chips": 100,
    "mult": 0,
    "xmult": 1
  },
  "clever": {
    "name": "Clever Joker",
    "artId": "j_clever",
    "price": 4,
    "sell": 2,
    "stage": "main",
    "condition": "two_pair",
    "chips": 80,
    "mult": 0,
    "xmult": 1
  },
  "devious": {
    "name": "Devious Joker",
    "artId": "j_devious",
    "price": 4,
    "sell": 2,
    "stage": "main",
    "condition": "straight",
    "chips": 100,
    "mult": 0,
    "xmult": 1
  },
  "crafty": {
    "name": "Crafty Joker",
    "artId": "j_crafty",
    "price": 4,
    "sell": 2,
    "stage": "main",
    "condition": "flush",
    "chips": 80,
    "mult": 0,
    "xmult": 1
  },
  "mystic_summit": {
    "name": "Mystic Summit",
    "artId": "j_mystic_summit",
    "price": 5,
    "sell": 2,
    "stage": "main",
    "condition": "zero_discards",
    "chips": 0,
    "mult": 15,
    "xmult": 1
  },
  "fibonacci": {
    "name": "Fibonacci",
    "artId": "j_fibonacci",
    "price": 8,
    "sell": 4,
    "stage": "card",
    "condition": "ranks",
    "chips": 0,
    "mult": 8,
    "xmult": 1,
    "ranks": [
      "A",
      "2",
      "3",
      "5",
      "8"
    ]
  },
  "scary_face": {
    "name": "Scary Face",
    "artId": "j_scary_face",
    "price": 4,
    "sell": 2,
    "stage": "card",
    "condition": "ranks",
    "chips": 30,
    "mult": 0,
    "xmult": 1,
    "ranks": [
      "J",
      "Q",
      "K"
    ]
  },
  "odd_todd": {
    "name": "Odd Todd",
    "artId": "j_odd_todd",
    "price": 4,
    "sell": 2,
    "stage": "card",
    "condition": "ranks",
    "chips": 31,
    "mult": 0,
    "xmult": 1,
    "ranks": [
      "A",
      "9",
      "7",
      "5",
      "3"
    ]
  },
  "splash": {
    "name": "Splash",
    "artId": "j_splash",
    "price": 3,
    "sell": 1,
    "stage": "selection",
    "condition": "always",
    "chips": 0,
    "mult": 0,
    "xmult": 1
  },
  "bull": {
    "name": "Bull",
    "artId": "j_bull",
    "price": 6,
    "sell": 3,
    "stage": "main",
    "condition": "money_chips",
    "chips": 2,
    "mult": 0,
    "xmult": 1
  },
  "walkie_talkie": {
    "name": "Walkie Talkie",
    "artId": "j_walkie_talkie",
    "price": 4,
    "sell": 2,
    "stage": "card",
    "condition": "ranks",
    "chips": 10,
    "mult": 4,
    "xmult": 1,
    "ranks": [
      "10",
      "4"
    ]
  },
  "smiley": {
    "name": "Smiley Face",
    "artId": "j_smiley",
    "price": 4,
    "sell": 2,
    "stage": "card",
    "condition": "ranks",
    "chips": 0,
    "mult": 5,
    "xmult": 1,
    "ranks": [
      "J",
      "Q",
      "K"
    ]
  },
  "swashbuckler": {
    "name": "Swashbuckler",
    "artId": "j_swashbuckler",
    "price": 4,
    "sell": 2,
    "stage": "main",
    "condition": "sell_mult",
    "chips": 0,
    "mult": 0,
    "xmult": 1
  },
  "arrowhead": {
    "name": "Arrowhead",
    "artId": "j_arrowhead",
    "price": 7,
    "sell": 3,
    "stage": "card",
    "condition": "suit",
    "chips": 50,
    "mult": 0,
    "xmult": 1,
    "suit": "S"
  },
  "onyx_agate": {
    "name": "Onyx Agate",
    "artId": "j_onyx_agate",
    "price": 7,
    "sell": 3,
    "stage": "card",
    "condition": "suit",
    "chips": 0,
    "mult": 7,
    "xmult": 1,
    "suit": "C"
  },
  "flower_pot": {
    "name": "Flower Pot",
    "artId": "j_flower_pot",
    "price": 6,
    "sell": 3,
    "stage": "main",
    "condition": "flower_pot",
    "chips": 0,
    "mult": 0,
    "xmult": 3
  },
  "seeing_double": {
    "name": "Seeing Double",
    "artId": "j_seeing_double",
    "price": 6,
    "sell": 3,
    "stage": "main",
    "condition": "seeing_double",
    "chips": 0,
    "mult": 0,
    "xmult": 2
  },
  "duo": {
    "name": "The Duo",
    "artId": "j_duo",
    "price": 8,
    "sell": 4,
    "stage": "main",
    "condition": "pair",
    "chips": 0,
    "mult": 0,
    "xmult": 2
  },
  "trio": {
    "name": "The Trio",
    "artId": "j_trio",
    "price": 8,
    "sell": 4,
    "stage": "main",
    "condition": "three",
    "chips": 0,
    "mult": 0,
    "xmult": 3
  },
  "family": {
    "name": "The Family",
    "artId": "j_family",
    "price": 8,
    "sell": 4,
    "stage": "main",
    "condition": "four",
    "chips": 0,
    "mult": 0,
    "xmult": 4
  },
  "order": {
    "name": "The Order",
    "artId": "j_order",
    "price": 8,
    "sell": 4,
    "stage": "main",
    "condition": "straight",
    "chips": 0,
    "mult": 0,
    "xmult": 3
  },
  "tribe": {
    "name": "The Tribe",
    "artId": "j_tribe",
    "price": 8,
    "sell": 4,
    "stage": "main",
    "condition": "flush",
    "chips": 0,
    "mult": 0,
    "xmult": 2
  },
  "bootstraps": {
    "name": "Bootstraps",
    "artId": "j_bootstraps",
    "price": 7,
    "sell": 3,
    "stage": "main",
    "condition": "money_mult",
    "chips": 0,
    "mult": 2,
    "xmult": 1
  }
};
export function simpleJoker(id:string){return Object.hasOwn(SIMPLE_JOKERS,id)?SIMPLE_JOKERS[id]:undefined;}
