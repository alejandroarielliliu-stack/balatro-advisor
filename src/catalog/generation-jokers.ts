/** CAT04: owned unmodded Steam 1.0.1o-FULL, static Lua inspection; not gameplay observation. */
import type {CounterSpec} from './joker-counters.js';
export const GENERATION_JOKERS:Readonly<Record<string,{name:string;artId:string;price:number;sell:number;blueprint:boolean}>>={
  "ceremonial": {
    "name": "Ceremonial Dagger",
    "artId": "j_ceremonial",
    "price": 6,
    "sell": 3,
    "blueprint": true
  },
  "marble": {
    "name": "Marble Joker",
    "artId": "j_marble",
    "price": 6,
    "sell": 3,
    "blueprint": true
  },
  "chaos": {
    "name": "Chaos the Clown",
    "artId": "j_chaos",
    "price": 4,
    "sell": 2,
    "blueprint": false
  },
  "dna": {
    "name": "DNA",
    "artId": "j_dna",
    "price": 8,
    "sell": 4,
    "blueprint": true
  },
  "sixth_sense": {
    "name": "Sixth Sense",
    "artId": "j_sixth_sense",
    "price": 6,
    "sell": 3,
    "blueprint": false
  },
  "constellation": {
    "name": "Constellation",
    "artId": "j_constellation",
    "price": 6,
    "sell": 3,
    "blueprint": true
  },
  "hiker": {
    "name": "Hiker",
    "artId": "j_hiker",
    "price": 5,
    "sell": 2,
    "blueprint": true
  },
  "superposition": {
    "name": "Superposition",
    "artId": "j_superposition",
    "price": 4,
    "sell": 2,
    "blueprint": true
  },
  "todo_list": {
    "name": "To Do List",
    "artId": "j_todo_list",
    "price": 4,
    "sell": 2,
    "blueprint": true
  },
  "red_card": {
    "name": "Red Card",
    "artId": "j_red_card",
    "price": 5,
    "sell": 2,
    "blueprint": true
  },
  "seance": {
    "name": "Séance",
    "artId": "j_seance",
    "price": 6,
    "sell": 3,
    "blueprint": true
  },
  "riff_raff": {
    "name": "Riff-Raff",
    "artId": "j_riff_raff",
    "price": 6,
    "sell": 3,
    "blueprint": true
  },
  "vampire": {
    "name": "Vampire",
    "artId": "j_vampire",
    "price": 7,
    "sell": 3,
    "blueprint": true
  },
  "hologram": {
    "name": "Hologram",
    "artId": "j_hologram",
    "price": 7,
    "sell": 3,
    "blueprint": true
  },
  "vagabond": {
    "name": "Vagabond",
    "artId": "j_vagabond",
    "price": 8,
    "sell": 4,
    "blueprint": true
  },
  "midas_mask": {
    "name": "Midas Mask",
    "artId": "j_midas_mask",
    "price": 7,
    "sell": 3,
    "blueprint": false
  },
  "hallucination": {
    "name": "Hallucination",
    "artId": "j_hallucination",
    "price": 4,
    "sell": 2,
    "blueprint": true
  },
  "fortune_teller": {
    "name": "Fortune Teller",
    "artId": "j_fortune_teller",
    "price": 6,
    "sell": 3,
    "blueprint": true
  },
  "stone": {
    "name": "Stone Joker",
    "artId": "j_stone",
    "price": 6,
    "sell": 3,
    "blueprint": true
  },
  "lucky_cat": {
    "name": "Lucky Cat",
    "artId": "j_lucky_cat",
    "price": 6,
    "sell": 3,
    "blueprint": true
  },
  "diet_cola": {
    "name": "Diet Cola",
    "artId": "j_diet_cola",
    "price": 6,
    "sell": 3,
    "blueprint": true
  },
  "trading": {
    "name": "Trading Card",
    "artId": "j_trading",
    "price": 6,
    "sell": 3,
    "blueprint": false
  },
  "flash": {
    "name": "Flash Card",
    "artId": "j_flash",
    "price": 5,
    "sell": 2,
    "blueprint": true
  },
  "campfire": {
    "name": "Campfire",
    "artId": "j_campfire",
    "price": 9,
    "sell": 4,
    "blueprint": true
  },
  "certificate": {
    "name": "Certificate",
    "artId": "j_certificate",
    "price": 6,
    "sell": 3,
    "blueprint": true
  },
  "glass": {
    "name": "Glass Joker",
    "artId": "j_glass",
    "price": 6,
    "sell": 3,
    "blueprint": true
  },
  "ring_master": {
    "name": "Showman",
    "artId": "j_ring_master",
    "price": 5,
    "sell": 2,
    "blueprint": false
  },
  "invisible": {
    "name": "Invisible Joker",
    "artId": "j_invisible",
    "price": 8,
    "sell": 4,
    "blueprint": false
  },
  "satellite": {
    "name": "Satellite",
    "artId": "j_satellite",
    "price": 6,
    "sell": 3,
    "blueprint": false
  },
  "cartomancer": {
    "name": "Cartomancer",
    "artId": "j_cartomancer",
    "price": 6,
    "sell": 3,
    "blueprint": true
  },
  "astronomer": {
    "name": "Astronomer",
    "artId": "j_astronomer",
    "price": 8,
    "sell": 4,
    "blueprint": false
  },
  "burnt": {
    "name": "Burnt Joker",
    "artId": "j_burnt",
    "price": 8,
    "sell": 4,
    "blueprint": true
  },
  "caino": {
    "name": "Canio",
    "artId": "j_caino",
    "price": 20,
    "sell": 10,
    "blueprint": true
  },
  "perkeo": {
    "name": "Perkeo",
    "artId": "j_perkeo",
    "price": 20,
    "sell": 10,
    "blueprint": true
  }
};
export const GENERATION_COUNTERS:Readonly<Record<string,Readonly<Record<string,CounterSpec>>>>={
 ceremonial:{mult:{label:'Mult acumulado',initial:0,min:0}},
 vampire:{x100:{label:'XMult ×100',initial:100,min:100}}, hologram:{x100:{label:'XMult ×100',initial:100,min:100}}, lucky_cat:{x100:{label:'XMult ×100',initial:100,min:100}}, glass:{x100:{label:'XMult ×100',initial:100,min:100}}, caino:{x100:{label:'XMult ×100',initial:100,min:100}}, constellation:{x100:{label:'XMult ×100',initial:100,min:100}}, campfire:{x100:{label:'XMult ×100',initial:100,min:100}},
 red_card:{mult:{label:'Mult acumulado',initial:0,min:0}},flash:{mult:{label:'Mult acumulado',initial:0,min:0}},invisible:{rounds:{label:'Rondas completadas',initial:0,min:0}},
 todo_list:{handIndex:{label:'Objetivo (índice de mano, dato observado)',initial:0,min:0,max:11}}
};
export const generationJoker=(id:string)=>GENERATION_JOKERS[id];

export const CONSUMABLE_KINDS:Readonly<Record<string,'tarot'|'planet'|'spectral'>>={
  "c_locked": "tarot",
  "c_fool": "tarot",
  "c_magician": "tarot",
  "c_high_priestess": "tarot",
  "c_empress": "tarot",
  "c_emperor": "tarot",
  "c_heirophant": "tarot",
  "c_lovers": "tarot",
  "c_chariot": "tarot",
  "c_justice": "tarot",
  "c_hermit": "tarot",
  "c_wheel_of_fortune": "tarot",
  "c_strength": "tarot",
  "c_hanged_man": "tarot",
  "c_death": "tarot",
  "c_temperance": "tarot",
  "c_devil": "tarot",
  "c_tower": "tarot",
  "c_star": "tarot",
  "c_moon": "tarot",
  "c_sun": "tarot",
  "c_judgement": "tarot",
  "c_world": "tarot",
  "c_mercury": "planet",
  "c_venus": "planet",
  "c_earth": "planet",
  "c_mars": "planet",
  "c_jupiter": "planet",
  "c_saturn": "planet",
  "c_uranus": "planet",
  "c_neptune": "planet",
  "c_pluto": "planet",
  "c_planet_x": "planet",
  "c_ceres": "planet",
  "c_eris": "planet",
  "c_familiar": "spectral",
  "c_grim": "spectral",
  "c_incantation": "spectral",
  "c_talisman": "spectral",
  "c_aura": "spectral",
  "c_wraith": "spectral",
  "c_sigil": "spectral",
  "c_ouija": "spectral",
  "c_ectoplasm": "spectral",
  "c_immolate": "spectral",
  "c_ankh": "spectral",
  "c_deja_vu": "spectral",
  "c_hex": "spectral",
  "c_trance": "spectral",
  "c_medium": "spectral",
  "c_cryptid": "spectral",
  "c_soul": "spectral",
  "c_black_hole": "spectral"
};
