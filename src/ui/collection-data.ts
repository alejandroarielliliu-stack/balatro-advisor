/** Read-only 1.0.1o-FULL collection metadata. Imported by static literal parsing,
 * never Lua execution or a rule implementation. See assets/collection/provenance.json.
 * All entries are visible reference data, not the user's unlock progress. */
import {DECK_PROFILES} from '../catalog/decks.js';
import type {DeckId} from '../catalog/decks.js';
import {VOUCHER_CATALOG} from '../catalog/voucher-catalog.js';
import {BOSS_CATALOG} from '../catalog/bosses.js';
export interface CollectionSprite {src:string;x:number;y:number;columns:number;rows:number;width:number;height:number;underlay?:CollectionSprite}
export interface CollectionEntry {id:string;name:string;nameEn:string;description:string;descriptionEn:string;art:CollectionSprite;meta?:string;edition?:'base'|'foil'|'holo'|'polychrome'|'negative'}

export const COLLECTION_TAROT:readonly CollectionEntry[]=[
 {
  "id": "c_fool",
  "name": "El loco",
  "description": "Genera la última carta de tarot o de planeta usada en esta partida a excepción de El loco",
  "nameEn": "The Fool",
  "descriptionEn": "Creates the last Tarot or Planet card used during this run The Fool excluded",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 0,
   "y": 0,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_magician",
  "name": "El mago",
  "description": "Mejora 2 carta(s) seleccionada(s) a Carta de la suerte",
  "nameEn": "The Magician",
  "descriptionEn": "Enhances 2 selected cards to Lucky Cards",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 1,
   "y": 0,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_high_priestess",
  "name": "La sacerdotisa",
  "description": "Genera hasta 2 cartas de planeta al azar (Debe haber espacio)",
  "nameEn": "The High Priestess",
  "descriptionEn": "Creates up to 2 random Planet cards (Must have room)",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 2,
   "y": 0,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_empress",
  "name": "La emperatriz",
  "description": "Mejora 2 cartas seleccionadas a Carta multis",
  "nameEn": "The Empress",
  "descriptionEn": "Enhances 2 selected cards to Mult Cards",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 3,
   "y": 0,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_emperor",
  "name": "El emperador",
  "description": "Genera hasta 2 cartas de tarot al azar (Debe haber espacio)",
  "nameEn": "The Emperor",
  "descriptionEn": "Creates up to 2 random Tarot cards (Must have room)",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 4,
   "y": 0,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_heirophant",
  "name": "El hierofante",
  "description": "Mejora 2 cartas seleccionadas a Carta adicional",
  "nameEn": "The Hierophant",
  "descriptionEn": "Enhances 2 selected cards to Bonus Cards",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 5,
   "y": 0,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_lovers",
  "name": "Los enamorados",
  "description": "Mejora 1 carta seleccionada a Carta versátil",
  "nameEn": "The Lovers",
  "descriptionEn": "Enhances 1 selected card into a Wild Card",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 6,
   "y": 0,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_chariot",
  "name": "El carro",
  "description": "Mejora 1 carta seleccionada a Carta de acero",
  "nameEn": "The Chariot",
  "descriptionEn": "Enhances 1 selected card into a Steel Card",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 7,
   "y": 0,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_justice",
  "name": "La justicia",
  "description": "Mejora 1 carta seleccionada a Carta de vidrio",
  "nameEn": "Justice",
  "descriptionEn": "Enhances 1 selected card into a Glass Card",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 8,
   "y": 0,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_hermit",
  "name": "El ermitaño",
  "description": "Duplica el dinero (Máx. de 20 $)",
  "nameEn": "The Hermit",
  "descriptionEn": "Doubles money (Max of $20)",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 9,
   "y": 0,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_wheel_of_fortune",
  "name": "La rueda de la fortuna",
  "description": "1 en 4 probabilidades de agregar que sean laminadas, holográficas o polícromas a un comodín al azar",
  "nameEn": "The Wheel of Fortune",
  "descriptionEn": "1 in 4 chance to add Foil, Holographic, or Polychrome edition to a random Joker",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 0,
   "y": 1,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_strength",
  "name": "La fuerza",
  "description": "Aumenta la categoría de hasta 2 cartas elegidas en 1",
  "nameEn": "Strength",
  "descriptionEn": "Increases rank of up to 2 selected cards by 1",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 1,
   "y": 1,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_hanged_man",
  "name": "El colgado",
  "description": "Destruye hasta 2 cartas seleccionadas",
  "nameEn": "The Hanged Man",
  "descriptionEn": "Destroys up to 2 selected cards",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 2,
   "y": 1,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_death",
  "name": "La muerte",
  "description": "Selecciona 2 cartas, convierte la carta izquierda en la carta derecha (Arrastra para acomodar)",
  "nameEn": "Death",
  "descriptionEn": "Select 2 cards, convert the left card into the right card (Drag to rearrange)",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 3,
   "y": 1,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_temperance",
  "name": "La templanza",
  "description": "Otorga el valor total de venta de todos los comodines actuales (Máx. de 50 $)",
  "nameEn": "Temperance",
  "descriptionEn": "Gives the total sell value of all current Jokers (Max of $50)",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 4,
   "y": 1,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_devil",
  "name": "El diablo",
  "description": "Mejora 1 carta seleccionada a Carta de oro",
  "nameEn": "The Devil",
  "descriptionEn": "Enhances 1 selected card into a Gold Card",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 5,
   "y": 1,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_tower",
  "name": "La torre",
  "description": "Mejora 1 carta seleccionada a Carta de piedra",
  "nameEn": "The Tower",
  "descriptionEn": "Enhances 1 selected card into a Stone Card",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 6,
   "y": 1,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_star",
  "name": "La estrella",
  "description": "Convierte hasta 3 cartas seleccionadas en Diamantes",
  "nameEn": "The Star",
  "descriptionEn": "Converts up to 3 selected cards to Diamonds",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 7,
   "y": 1,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_moon",
  "name": "La luna",
  "description": "Convierte hasta 3 cartas seleccionadas en Tréboles",
  "nameEn": "The Moon",
  "descriptionEn": "Converts up to 3 selected cards to Clubs",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 8,
   "y": 1,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_sun",
  "name": "El sol",
  "description": "Convierte hasta 3 cartas seleccionadas en Corazones",
  "nameEn": "The Sun",
  "descriptionEn": "Converts up to 3 selected cards to Hearts",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 9,
   "y": 1,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_judgement",
  "name": "El juicio",
  "description": "Genera una carta de comodín al azar (Debe haber espacio)",
  "nameEn": "Judgement",
  "descriptionEn": "Creates a random Joker card (Must have room)",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 0,
   "y": 2,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_world",
  "name": "El mundo",
  "description": "Convierte hasta 3 cartas seleccionadas en Espadas",
  "nameEn": "The World",
  "descriptionEn": "Converts up to 3 selected cards to Spades",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 1,
   "y": 2,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 }
];

export const COLLECTION_PLANETS:readonly CollectionEntry[]=[
 {
  "id": "c_mercury",
  "name": "Mercurio",
  "description": "Aumenta un nivel de Par.",
  "nameEn": "Mercury",
  "descriptionEn": "Levels up Pair by one level.",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 0,
   "y": 3,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_venus",
  "name": "Venus",
  "description": "Aumenta un nivel de Tercia.",
  "nameEn": "Venus",
  "descriptionEn": "Levels up Three of a Kind by one level.",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 1,
   "y": 3,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_earth",
  "name": "Tierra",
  "description": "Aumenta un nivel de Full house.",
  "nameEn": "Earth",
  "descriptionEn": "Levels up Full House by one level.",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 2,
   "y": 3,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_mars",
  "name": "Marte",
  "description": "Aumenta un nivel de Póker.",
  "nameEn": "Mars",
  "descriptionEn": "Levels up Four of a Kind by one level.",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 3,
   "y": 3,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_jupiter",
  "name": "Júpiter",
  "description": "Aumenta un nivel de Color.",
  "nameEn": "Jupiter",
  "descriptionEn": "Levels up Flush by one level.",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 4,
   "y": 3,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_saturn",
  "name": "Saturno",
  "description": "Aumenta un nivel de Escalera.",
  "nameEn": "Saturn",
  "descriptionEn": "Levels up Straight by one level.",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 5,
   "y": 3,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_uranus",
  "name": "Urano",
  "description": "Aumenta un nivel de Doble par.",
  "nameEn": "Uranus",
  "descriptionEn": "Levels up Two Pair by one level.",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 6,
   "y": 3,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_neptune",
  "name": "Neptuno",
  "description": "Aumenta un nivel de Escalera corrida.",
  "nameEn": "Neptune",
  "descriptionEn": "Levels up Straight Flush by one level.",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 7,
   "y": 3,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_pluto",
  "name": "Plutón",
  "description": "Aumenta un nivel de Carta más alta.",
  "nameEn": "Pluto",
  "descriptionEn": "Levels up High Card by one level.",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 8,
   "y": 3,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_planet_x",
  "name": "Planeta X",
  "description": "Aumenta un nivel de Quintilla.",
  "nameEn": "Planet X",
  "descriptionEn": "Levels up Five of a Kind by one level.",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 9,
   "y": 2,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_ceres",
  "name": "Ceres",
  "description": "Aumenta un nivel de Full de color.",
  "nameEn": "Ceres",
  "descriptionEn": "Levels up Flush House by one level.",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 8,
   "y": 2,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_eris",
  "name": "Eris",
  "description": "Aumenta un nivel de Cinco de color.",
  "nameEn": "Eris",
  "descriptionEn": "Levels up Flush Five by one level.",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 3,
   "y": 2,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 }
];

export const COLLECTION_SPECTRAL:readonly CollectionEntry[]=[
 {
  "id": "c_familiar",
  "name": "Familiar",
  "description": "Destruye 1 carta de tu mano al azar, agrega 3 cartas de figura mejoradas al azar a tu mano",
  "nameEn": "Familiar",
  "descriptionEn": "Destroy 1 random card in your hand, add 3 random Enhanced face cards to your hand",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 0,
   "y": 4,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_grim",
  "name": "Lúgubre",
  "description": "Destruye 1 carta de tu mano al azar, agrega 2 ases mejorados a tu mano al azar",
  "nameEn": "Grim",
  "descriptionEn": "Destroy 1 random card in your hand, add 2 random Enhanced Aces to your hand",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 1,
   "y": 4,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_incantation",
  "name": "Encantamiento",
  "description": "Destruye 1 carta de tu mano al azar, agrega 4 carta mejorada numerada a tu mano al azar",
  "nameEn": "Incantation",
  "descriptionEn": "Destroy 1 random card in your hand, add 4 random Enhanced numbered cards to your hand",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 2,
   "y": 4,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_talisman",
  "name": "Talismán",
  "description": "Agrega un sello de oro a 1 carta seleccionada de tu mano al azar",
  "nameEn": "Talisman",
  "descriptionEn": "Add a Gold Seal to 1 selected card in your hand",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 3,
   "y": 4,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_aura",
  "name": "Aura",
  "description": "Agrega efectos de laminado, holográfico o polícromo a 1 carta seleccionada de tu mano",
  "nameEn": "Aura",
  "descriptionEn": "Add Foil, Holographic, or Polychrome effect to 1 selected card in hand",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 4,
   "y": 4,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_wraith",
  "name": "Espectro",
  "description": "Genera una carta de comodín rara al azar, deja el dinero en 0 $",
  "nameEn": "Wraith",
  "descriptionEn": "Creates a random Rare Joker, sets money to $0",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 5,
   "y": 4,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_sigil",
  "name": "Sigilo",
  "description": "Convierte todas las cartas de tu mano en un solo palo al azar",
  "nameEn": "Sigil",
  "descriptionEn": "Converts all cards in hand to a single random suit",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 6,
   "y": 4,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_ouija",
  "name": "Ouija",
  "description": "Convierte todas las cartas de tu mano en una sola categoría al azar -1 de tamaño de mano",
  "nameEn": "Ouija",
  "descriptionEn": "Converts all cards in hand to a single random rank -1 hand size",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 7,
   "y": 4,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_ectoplasm",
  "name": "Ectoplasma",
  "description": "Agrega negativo a un comodín al azar -1 de tamaño de mano",
  "nameEn": "Ectoplasm",
  "descriptionEn": "Add Negative to a random Joker, -[run-dependent] hand size",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 8,
   "y": 4,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_immolate",
  "name": "Inmolación",
  "description": "Destruye 5 cartas de tu mano al azar, gana 20 $",
  "nameEn": "Immolate",
  "descriptionEn": "Destroys 5 random cards in hand, gain $20",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 9,
   "y": 4,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_ankh",
  "name": "Anj",
  "description": "Crea una copia de un comodín aleatorio, destruye los demás",
  "nameEn": "Ankh",
  "descriptionEn": "Create a copy of a random Joker, destroy all other Jokers",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 0,
   "y": 5,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_deja_vu",
  "name": "Déjà vu",
  "description": "Agrega un sello rojo a 1 carta seleccionada de tu mano al azar",
  "nameEn": "Deja Vu",
  "descriptionEn": "Add a Red Seal to 1 selected card in your hand",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 1,
   "y": 5,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_hex",
  "name": "Maleficio",
  "description": "Agrega policromía a un comodín aleatorio, destruye los demás",
  "nameEn": "Hex",
  "descriptionEn": "Add Polychrome to a random Joker, destroy all other Jokers",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 2,
   "y": 5,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_trance",
  "name": "Trance",
  "description": "Agrega un sello azul a 1 carta seleccionada de tu mano al azar",
  "nameEn": "Trance",
  "descriptionEn": "Add a Blue Seal to 1 selected card in your hand",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 3,
   "y": 5,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_medium",
  "name": "Médium",
  "description": "Agrega un sello morado a 1 carta seleccionada de tu mano al azar",
  "nameEn": "Medium",
  "descriptionEn": "Add a Purple Seal to 1 selected card in your hand",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 4,
   "y": 5,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_cryptid",
  "name": "Críptido",
  "description": "Crea 2 copias de 1 carta seleccionada en tu mano",
  "nameEn": "Cryptid",
  "descriptionEn": "Create 2 copies of 1 selected card in your hand",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 5,
   "y": 5,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_soul",
  "name": "El alma",
  "description": "Crea un comodín legendario (Debe haber espacio)",
  "nameEn": "The Soul",
  "descriptionEn": "Creates a Legendary Joker (Must have room)",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 2,
   "y": 2,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "c_black_hole",
  "name": "Agujero negro",
  "description": "Aumenta todas las manos de póker 1 nivel",
  "nameEn": "Black Hole",
  "descriptionEn": "Upgrade every poker hand by 1 level",
  "art": {
   "src": "./web/assets/collection/tarots.png",
   "x": 9,
   "y": 3,
   "columns": 10,
   "rows": 6,
   "width": 71,
   "height": 95
  }
 }
];

export const COLLECTION_ENHANCEMENTS:readonly CollectionEntry[]=[
 {
  "id": "m_bonus",
  "name": "Carta adicional",
  "description": "+30 fichas adicionales al puntuar.",
  "nameEn": "Bonus Card",
  "descriptionEn": "+30 extra chips when scored.",
  "art": {
   "src": "./web/assets/decks/enhancers.png",
   "x": 1,
   "y": 1,
   "columns": 7,
   "rows": 5,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "m_mult",
  "name": "Carta multi",
  "description": "+4 multi",
  "nameEn": "Mult Card",
  "descriptionEn": "+4 Mult",
  "art": {
   "src": "./web/assets/decks/enhancers.png",
   "x": 2,
   "y": 1,
   "columns": 7,
   "rows": 5,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "m_wild",
  "name": "Carta versátil",
  "description": "Puede usarse como cualquier palo",
  "nameEn": "Wild Card",
  "descriptionEn": "Can be used as any suit",
  "art": {
   "src": "./web/assets/decks/enhancers.png",
   "x": 3,
   "y": 1,
   "columns": 7,
   "rows": 5,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "m_glass",
  "name": "Carta de vidrio",
  "description": "X2 multi 1 en 4 probabilidades de destruir la carta",
  "nameEn": "Glass Card",
  "descriptionEn": "X2 Mult 1 in 4 chance to destroy card",
  "art": {
   "src": "./web/assets/decks/enhancers.png",
   "x": 5,
   "y": 1,
   "columns": 7,
   "rows": 5,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "m_steel",
  "name": "Carta de acero",
  "description": "Multi X1.5 mientras esta carta esté en tu mano",
  "nameEn": "Steel Card",
  "descriptionEn": "X1.5 Mult while this card stays in hand",
  "art": {
   "src": "./web/assets/decks/enhancers.png",
   "x": 6,
   "y": 1,
   "columns": 7,
   "rows": 5,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "m_stone",
  "name": "Carta de piedra",
  "description": "+50 fichas sin categoría ni palo",
  "nameEn": "Stone Card",
  "descriptionEn": "+50 Chips no rank or suit",
  "art": {
   "src": "./web/assets/decks/enhancers.png",
   "x": 5,
   "y": 0,
   "columns": 7,
   "rows": 5,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "m_gold",
  "name": "Carta de oro",
  "description": "3 $ si esta carta está en tu mano al final de la ronda",
  "nameEn": "Gold Card",
  "descriptionEn": "$3 if this card is held in hand at end of round",
  "art": {
   "src": "./web/assets/decks/enhancers.png",
   "x": 6,
   "y": 0,
   "columns": 7,
   "rows": 5,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "m_lucky",
  "name": "Carta de la suerte",
  "description": "1 en 5 probabilidades de +20 multi 1 en 15 probabilidades de ganar 20 $",
  "nameEn": "Lucky Card",
  "descriptionEn": "1 in 5 chance for +20 Mult 1 in 15 chance to win $20",
  "art": {
   "src": "./web/assets/decks/enhancers.png",
   "x": 4,
   "y": 1,
   "columns": 7,
   "rows": 5,
   "width": 71,
   "height": 95
  }
 }
];

export const COLLECTION_EDITIONS:readonly CollectionEntry[]=[
 {
  "id": "e_base",
  "name": "Base",
  "description": "Sin efectos adicionales",
  "nameEn": "Base",
  "descriptionEn": "No extra effects",
  "art": {
   "src": "./web/assets/jokers/atlas.png",
   "x": 0,
   "y": 0,
   "columns": 10,
   "rows": 16,
   "width": 71,
   "height": 95
  },
  "edition": "base"
 },
 {
  "id": "e_foil",
  "name": "Laminada",
  "description": "+50 fichas",
  "nameEn": "Foil",
  "descriptionEn": "+50 chips",
  "art": {
   "src": "./web/assets/jokers/atlas.png",
   "x": 0,
   "y": 0,
   "columns": 10,
   "rows": 16,
   "width": 71,
   "height": 95
  },
  "edition": "foil"
 },
 {
  "id": "e_holo",
  "name": "Holográfica",
  "description": "Multi +10",
  "nameEn": "Holographic",
  "descriptionEn": "+10 Mult",
  "art": {
   "src": "./web/assets/jokers/atlas.png",
   "x": 0,
   "y": 0,
   "columns": 10,
   "rows": 16,
   "width": 71,
   "height": 95
  },
  "edition": "holo"
 },
 {
  "id": "e_polychrome",
  "name": "Polícroma",
  "description": "Multi X1.5",
  "nameEn": "Polychrome",
  "descriptionEn": "X1.5 Mult",
  "art": {
   "src": "./web/assets/jokers/atlas.png",
   "x": 0,
   "y": 0,
   "columns": 10,
   "rows": 16,
   "width": 71,
   "height": 95
  },
  "edition": "polychrome"
 },
 {
  "id": "e_negative",
  "name": "Negativa",
  "description": "+1 ranura de comodín",
  "nameEn": "Negative",
  "descriptionEn": "+1 Joker slot",
  "art": {
   "src": "./web/assets/jokers/atlas.png",
   "x": 0,
   "y": 0,
   "columns": 10,
   "rows": 16,
   "width": 71,
   "height": 95
  },
  "edition": "negative"
 }
];

export const COLLECTION_BOOSTERS:readonly CollectionEntry[]=[
 {
  "id": "p_arcana_normal_1",
  "name": "Paquete arcano",
  "description": "Elige 1 de hasta 3 cartas de tarot para usar de inmediato",
  "nameEn": "Arcana Pack",
  "descriptionEn": "Choose 1 of up to 3 Tarot cards to be used immediately",
  "art": {
   "src": "./web/assets/boosters/atlas.png",
   "x": 0,
   "y": 0,
   "columns": 4,
   "rows": 9,
   "width": 71,
   "height": 95
  },
  "meta": "$4 · 1 / 3"
 },
 {
  "id": "p_arcana_normal_2",
  "name": "Paquete arcano",
  "description": "Elige 1 de hasta 3 cartas de tarot para usar de inmediato",
  "nameEn": "Arcana Pack",
  "descriptionEn": "Choose 1 of up to 3 Tarot cards to be used immediately",
  "art": {
   "src": "./web/assets/boosters/atlas.png",
   "x": 1,
   "y": 0,
   "columns": 4,
   "rows": 9,
   "width": 71,
   "height": 95
  },
  "meta": "$4 · 1 / 3"
 },
 {
  "id": "p_arcana_normal_3",
  "name": "Paquete arcano",
  "description": "Elige 1 de hasta 3 cartas de tarot para usar de inmediato",
  "nameEn": "Arcana Pack",
  "descriptionEn": "Choose 1 of up to 3 Tarot cards to be used immediately",
  "art": {
   "src": "./web/assets/boosters/atlas.png",
   "x": 2,
   "y": 0,
   "columns": 4,
   "rows": 9,
   "width": 71,
   "height": 95
  },
  "meta": "$4 · 1 / 3"
 },
 {
  "id": "p_arcana_normal_4",
  "name": "Paquete arcano",
  "description": "Elige 1 de hasta 3 cartas de tarot para usar de inmediato",
  "nameEn": "Arcana Pack",
  "descriptionEn": "Choose 1 of up to 3 Tarot cards to be used immediately",
  "art": {
   "src": "./web/assets/boosters/atlas.png",
   "x": 3,
   "y": 0,
   "columns": 4,
   "rows": 9,
   "width": 71,
   "height": 95
  },
  "meta": "$4 · 1 / 3"
 },
 {
  "id": "p_arcana_jumbo_1",
  "name": "Paquete arcano jumbo",
  "description": "Elige 1 de hasta 5 cartas de tarot para usar de inmediato",
  "nameEn": "Jumbo Arcana Pack",
  "descriptionEn": "Choose 1 of up to 5 Tarot cards to be used immediately",
  "art": {
   "src": "./web/assets/boosters/atlas.png",
   "x": 0,
   "y": 2,
   "columns": 4,
   "rows": 9,
   "width": 71,
   "height": 95
  },
  "meta": "$6 · 1 / 5"
 },
 {
  "id": "p_arcana_jumbo_2",
  "name": "Paquete arcano jumbo",
  "description": "Elige 1 de hasta 5 cartas de tarot para usar de inmediato",
  "nameEn": "Jumbo Arcana Pack",
  "descriptionEn": "Choose 1 of up to 5 Tarot cards to be used immediately",
  "art": {
   "src": "./web/assets/boosters/atlas.png",
   "x": 1,
   "y": 2,
   "columns": 4,
   "rows": 9,
   "width": 71,
   "height": 95
  },
  "meta": "$6 · 1 / 5"
 },
 {
  "id": "p_arcana_mega_1",
  "name": "Paquete arcano mega",
  "description": "Elige 2 de hasta 5 cartas de tarot para usar de inmediato",
  "nameEn": "Mega Arcana Pack",
  "descriptionEn": "Choose 2 of up to 5 Tarot cards to be used immediately",
  "art": {
   "src": "./web/assets/boosters/atlas.png",
   "x": 2,
   "y": 2,
   "columns": 4,
   "rows": 9,
   "width": 71,
   "height": 95
  },
  "meta": "$8 · 2 / 5"
 },
 {
  "id": "p_arcana_mega_2",
  "name": "Paquete arcano mega",
  "description": "Elige 2 de hasta 5 cartas de tarot para usar de inmediato",
  "nameEn": "Mega Arcana Pack",
  "descriptionEn": "Choose 2 of up to 5 Tarot cards to be used immediately",
  "art": {
   "src": "./web/assets/boosters/atlas.png",
   "x": 3,
   "y": 2,
   "columns": 4,
   "rows": 9,
   "width": 71,
   "height": 95
  },
  "meta": "$8 · 2 / 5"
 },
 {
  "id": "p_celestial_normal_1",
  "name": "Paquete celestial",
  "description": "Elige 1 de hasta 3 cartas de planeta para usar de inmediato",
  "nameEn": "Celestial Pack",
  "descriptionEn": "Choose 1 of up to 3 Planet cards to be used immediately",
  "art": {
   "src": "./web/assets/boosters/atlas.png",
   "x": 0,
   "y": 1,
   "columns": 4,
   "rows": 9,
   "width": 71,
   "height": 95
  },
  "meta": "$4 · 1 / 3"
 },
 {
  "id": "p_celestial_normal_2",
  "name": "Paquete celestial",
  "description": "Elige 1 de hasta 3 cartas de planeta para usar de inmediato",
  "nameEn": "Celestial Pack",
  "descriptionEn": "Choose 1 of up to 3 Planet cards to be used immediately",
  "art": {
   "src": "./web/assets/boosters/atlas.png",
   "x": 1,
   "y": 1,
   "columns": 4,
   "rows": 9,
   "width": 71,
   "height": 95
  },
  "meta": "$4 · 1 / 3"
 },
 {
  "id": "p_celestial_normal_3",
  "name": "Paquete celestial",
  "description": "Elige 1 de hasta 3 cartas de planeta para usar de inmediato",
  "nameEn": "Celestial Pack",
  "descriptionEn": "Choose 1 of up to 3 Planet cards to be used immediately",
  "art": {
   "src": "./web/assets/boosters/atlas.png",
   "x": 2,
   "y": 1,
   "columns": 4,
   "rows": 9,
   "width": 71,
   "height": 95
  },
  "meta": "$4 · 1 / 3"
 },
 {
  "id": "p_celestial_normal_4",
  "name": "Paquete celestial",
  "description": "Elige 1 de hasta 3 cartas de planeta para usar de inmediato",
  "nameEn": "Celestial Pack",
  "descriptionEn": "Choose 1 of up to 3 Planet cards to be used immediately",
  "art": {
   "src": "./web/assets/boosters/atlas.png",
   "x": 3,
   "y": 1,
   "columns": 4,
   "rows": 9,
   "width": 71,
   "height": 95
  },
  "meta": "$4 · 1 / 3"
 },
 {
  "id": "p_celestial_jumbo_1",
  "name": "Paquete celestial jumbo",
  "description": "Elige 1 de hasta 5 cartas de planeta para usar de inmediato",
  "nameEn": "Jumbo Celestial Pack",
  "descriptionEn": "Choose 1 of up to 5 Planet cards to be used immediately",
  "art": {
   "src": "./web/assets/boosters/atlas.png",
   "x": 0,
   "y": 3,
   "columns": 4,
   "rows": 9,
   "width": 71,
   "height": 95
  },
  "meta": "$6 · 1 / 5"
 },
 {
  "id": "p_celestial_jumbo_2",
  "name": "Paquete celestial jumbo",
  "description": "Elige 1 de hasta 5 cartas de planeta para usar de inmediato",
  "nameEn": "Jumbo Celestial Pack",
  "descriptionEn": "Choose 1 of up to 5 Planet cards to be used immediately",
  "art": {
   "src": "./web/assets/boosters/atlas.png",
   "x": 1,
   "y": 3,
   "columns": 4,
   "rows": 9,
   "width": 71,
   "height": 95
  },
  "meta": "$6 · 1 / 5"
 },
 {
  "id": "p_celestial_mega_1",
  "name": "Paquete celestial mega",
  "description": "Elige 2 de hasta 5 cartas de planeta para usar de inmediato",
  "nameEn": "Mega Celestial Pack",
  "descriptionEn": "Choose 2 of up to 5 Planet cards to be used immediately",
  "art": {
   "src": "./web/assets/boosters/atlas.png",
   "x": 2,
   "y": 3,
   "columns": 4,
   "rows": 9,
   "width": 71,
   "height": 95
  },
  "meta": "$8 · 2 / 5"
 },
 {
  "id": "p_celestial_mega_2",
  "name": "Paquete celestial mega",
  "description": "Elige 2 de hasta 5 cartas de planeta para usar de inmediato",
  "nameEn": "Mega Celestial Pack",
  "descriptionEn": "Choose 2 of up to 5 Planet cards to be used immediately",
  "art": {
   "src": "./web/assets/boosters/atlas.png",
   "x": 3,
   "y": 3,
   "columns": 4,
   "rows": 9,
   "width": 71,
   "height": 95
  },
  "meta": "$8 · 2 / 5"
 },
 {
  "id": "p_standard_normal_1",
  "name": "Paquete estándar",
  "description": "Elige 1 de hasta 3 cartas de juego para agregar a tu baraja",
  "nameEn": "Standard Pack",
  "descriptionEn": "Choose 1 of up to 3 Playing cards to add to your deck",
  "art": {
   "src": "./web/assets/boosters/atlas.png",
   "x": 0,
   "y": 6,
   "columns": 4,
   "rows": 9,
   "width": 71,
   "height": 95
  },
  "meta": "$4 · 1 / 3"
 },
 {
  "id": "p_standard_normal_2",
  "name": "Paquete estándar",
  "description": "Elige 1 de hasta 3 cartas de juego para agregar a tu baraja",
  "nameEn": "Standard Pack",
  "descriptionEn": "Choose 1 of up to 3 Playing cards to add to your deck",
  "art": {
   "src": "./web/assets/boosters/atlas.png",
   "x": 1,
   "y": 6,
   "columns": 4,
   "rows": 9,
   "width": 71,
   "height": 95
  },
  "meta": "$4 · 1 / 3"
 },
 {
  "id": "p_standard_normal_3",
  "name": "Paquete estándar",
  "description": "Elige 1 de hasta 3 cartas de juego para agregar a tu baraja",
  "nameEn": "Standard Pack",
  "descriptionEn": "Choose 1 of up to 3 Playing cards to add to your deck",
  "art": {
   "src": "./web/assets/boosters/atlas.png",
   "x": 2,
   "y": 6,
   "columns": 4,
   "rows": 9,
   "width": 71,
   "height": 95
  },
  "meta": "$4 · 1 / 3"
 },
 {
  "id": "p_standard_normal_4",
  "name": "Paquete estándar",
  "description": "Elige 1 de hasta 3 cartas de juego para agregar a tu baraja",
  "nameEn": "Standard Pack",
  "descriptionEn": "Choose 1 of up to 3 Playing cards to add to your deck",
  "art": {
   "src": "./web/assets/boosters/atlas.png",
   "x": 3,
   "y": 6,
   "columns": 4,
   "rows": 9,
   "width": 71,
   "height": 95
  },
  "meta": "$4 · 1 / 3"
 },
 {
  "id": "p_standard_jumbo_1",
  "name": "Paquete estándar jumbo",
  "description": "Elige 1 de hasta 5 cartas de juego para agregar a tu baraja",
  "nameEn": "Jumbo Standard Pack",
  "descriptionEn": "Choose 1 of up to 5 Playing cards to add to your deck",
  "art": {
   "src": "./web/assets/boosters/atlas.png",
   "x": 0,
   "y": 7,
   "columns": 4,
   "rows": 9,
   "width": 71,
   "height": 95
  },
  "meta": "$6 · 1 / 5"
 },
 {
  "id": "p_standard_jumbo_2",
  "name": "Paquete estándar jumbo",
  "description": "Elige 1 de hasta 5 cartas de juego para agregar a tu baraja",
  "nameEn": "Jumbo Standard Pack",
  "descriptionEn": "Choose 1 of up to 5 Playing cards to add to your deck",
  "art": {
   "src": "./web/assets/boosters/atlas.png",
   "x": 1,
   "y": 7,
   "columns": 4,
   "rows": 9,
   "width": 71,
   "height": 95
  },
  "meta": "$6 · 1 / 5"
 },
 {
  "id": "p_standard_mega_1",
  "name": "Paquete estándar mega",
  "description": "Elige 2 de hasta 5 cartas de juego para agregar a tu baraja",
  "nameEn": "Mega Standard Pack",
  "descriptionEn": "Choose 2 of up to 5 Playing cards to add to your deck",
  "art": {
   "src": "./web/assets/boosters/atlas.png",
   "x": 2,
   "y": 7,
   "columns": 4,
   "rows": 9,
   "width": 71,
   "height": 95
  },
  "meta": "$8 · 2 / 5"
 },
 {
  "id": "p_standard_mega_2",
  "name": "Paquete estándar mega",
  "description": "Elige 2 de hasta 5 cartas de juego para agregar a tu baraja",
  "nameEn": "Mega Standard Pack",
  "descriptionEn": "Choose 2 of up to 5 Playing cards to add to your deck",
  "art": {
   "src": "./web/assets/boosters/atlas.png",
   "x": 3,
   "y": 7,
   "columns": 4,
   "rows": 9,
   "width": 71,
   "height": 95
  },
  "meta": "$8 · 2 / 5"
 },
 {
  "id": "p_buffoon_normal_1",
  "name": "Paquete de bufón",
  "description": "Elige 1 de hasta 2 cartas de comodín",
  "nameEn": "Buffoon Pack",
  "descriptionEn": "Choose 1 of up to 2 Joker cards",
  "art": {
   "src": "./web/assets/boosters/atlas.png",
   "x": 0,
   "y": 8,
   "columns": 4,
   "rows": 9,
   "width": 71,
   "height": 95
  },
  "meta": "$4 · 1 / 2"
 },
 {
  "id": "p_buffoon_normal_2",
  "name": "Paquete de bufón",
  "description": "Elige 1 de hasta 2 cartas de comodín",
  "nameEn": "Buffoon Pack",
  "descriptionEn": "Choose 1 of up to 2 Joker cards",
  "art": {
   "src": "./web/assets/boosters/atlas.png",
   "x": 1,
   "y": 8,
   "columns": 4,
   "rows": 9,
   "width": 71,
   "height": 95
  },
  "meta": "$4 · 1 / 2"
 },
 {
  "id": "p_buffoon_jumbo_1",
  "name": "Paquete de bufón jumbo",
  "description": "Elige 1 de hasta 4 cartas de comodín",
  "nameEn": "Jumbo Buffoon Pack",
  "descriptionEn": "Choose 1 of up to 4 Joker cards",
  "art": {
   "src": "./web/assets/boosters/atlas.png",
   "x": 2,
   "y": 8,
   "columns": 4,
   "rows": 9,
   "width": 71,
   "height": 95
  },
  "meta": "$6 · 1 / 4"
 },
 {
  "id": "p_buffoon_mega_1",
  "name": "Paquete de bufón mega",
  "description": "Elige 2 de hasta 4 cartas de comodín",
  "nameEn": "Mega Buffoon Pack",
  "descriptionEn": "Choose 2 of up to 4 Joker cards",
  "art": {
   "src": "./web/assets/boosters/atlas.png",
   "x": 3,
   "y": 8,
   "columns": 4,
   "rows": 9,
   "width": 71,
   "height": 95
  },
  "meta": "$8 · 2 / 4"
 },
 {
  "id": "p_spectral_normal_1",
  "name": "Paquete espectral",
  "description": "Elige 1 de hasta 2 cartas espectrales para usar de inmediato",
  "nameEn": "Spectral Pack",
  "descriptionEn": "Choose 1 of up to 2 Spectral cards to be used immediately",
  "art": {
   "src": "./web/assets/boosters/atlas.png",
   "x": 0,
   "y": 4,
   "columns": 4,
   "rows": 9,
   "width": 71,
   "height": 95
  },
  "meta": "$4 · 1 / 2"
 },
 {
  "id": "p_spectral_normal_2",
  "name": "Paquete espectral",
  "description": "Elige 1 de hasta 2 cartas espectrales para usar de inmediato",
  "nameEn": "Spectral Pack",
  "descriptionEn": "Choose 1 of up to 2 Spectral cards to be used immediately",
  "art": {
   "src": "./web/assets/boosters/atlas.png",
   "x": 1,
   "y": 4,
   "columns": 4,
   "rows": 9,
   "width": 71,
   "height": 95
  },
  "meta": "$4 · 1 / 2"
 },
 {
  "id": "p_spectral_jumbo_1",
  "name": "Paquete espectral jumbo",
  "description": "Elige 1 de hasta 4 cartas espectrales para usar de inmediato",
  "nameEn": "Jumbo Spectral Pack",
  "descriptionEn": "Choose 1 of up to 4 Spectral cards to be used immediately",
  "art": {
   "src": "./web/assets/boosters/atlas.png",
   "x": 2,
   "y": 4,
   "columns": 4,
   "rows": 9,
   "width": 71,
   "height": 95
  },
  "meta": "$6 · 1 / 4"
 },
 {
  "id": "p_spectral_mega_1",
  "name": "Paquete espectral mega",
  "description": "Elige 2 de hasta 4 cartas espectrales para usar de inmediato",
  "nameEn": "Mega Spectral Pack",
  "descriptionEn": "Choose 2 of up to 4 Spectral cards to be used immediately",
  "art": {
   "src": "./web/assets/boosters/atlas.png",
   "x": 3,
   "y": 4,
   "columns": 4,
   "rows": 9,
   "width": 71,
   "height": 95
  },
  "meta": "$8 · 2 / 4"
 }
];

const deckEntries:CollectionEntry[]=[
 {
  "id": "red",
  "name": "Baraja roja",
  "description": "+1 descarte en cada ronda",
  "nameEn": "Red Deck",
  "descriptionEn": "+1 discard every round",
  "art": {
   "src": "./web/assets/decks/enhancers.png",
   "x": 0,
   "y": 0,
   "columns": 7,
   "rows": 5,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "blue",
  "name": "Baraja azul",
  "description": "+1 mano en cada ronda",
  "nameEn": "Blue Deck",
  "descriptionEn": "+1 hand every round",
  "art": {
   "src": "./web/assets/decks/enhancers.png",
   "x": 0,
   "y": 2,
   "columns": 7,
   "rows": 5,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "yellow",
  "name": "Baraja amarilla",
  "description": "Comienza con 10 $ extra",
  "nameEn": "Yellow Deck",
  "descriptionEn": "Start with extra $10",
  "art": {
   "src": "./web/assets/decks/enhancers.png",
   "x": 1,
   "y": 2,
   "columns": 7,
   "rows": 5,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "green",
  "name": "Baraja verde",
  "description": "Al final de cada ronda: 2 $ por mano restante 1 $ por descarte restante No ganas interés",
  "nameEn": "Green Deck",
  "descriptionEn": "At end of each Round: $2 per remaining Hand $1 per remaining Discard Earn no Interest",
  "art": {
   "src": "./web/assets/decks/enhancers.png",
   "x": 2,
   "y": 2,
   "columns": 7,
   "rows": 5,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "black",
  "name": "Baraja negra",
  "description": "+1 ranura(s) de comodín -1 mano en cada ronda",
  "nameEn": "Black Deck",
  "descriptionEn": "+1 Joker slot -1 hand every round",
  "art": {
   "src": "./web/assets/decks/enhancers.png",
   "x": 3,
   "y": 2,
   "columns": 7,
   "rows": 5,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "magic",
  "name": "Baraja mágica",
  "description": "Comienza la partida con el vale Bola de cristal y 2 copias de El loco",
  "nameEn": "Magic Deck",
  "descriptionEn": "Start run with the Crystal Ball voucher and 2 copies of The Fool",
  "art": {
   "src": "./web/assets/decks/enhancers.png",
   "x": 0,
   "y": 3,
   "columns": 7,
   "rows": 5,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "nebula",
  "name": "Baraja nébula",
  "description": "Comienza la partida con el vale Telescopio -1 ranura de consumible",
  "nameEn": "Nebula Deck",
  "descriptionEn": "Start run with the Telescope voucher -1 consumable slot",
  "art": {
   "src": "./web/assets/decks/enhancers.png",
   "x": 3,
   "y": 0,
   "columns": 7,
   "rows": 5,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "ghost",
  "name": "Baraja fantasma",
  "description": "Las cartas espectrales pueden aparecer en la tienda, comienza con una carta de maleficio",
  "nameEn": "Ghost Deck",
  "descriptionEn": "Spectral cards may appear in the shop, start with a Hex card",
  "art": {
   "src": "./web/assets/decks/enhancers.png",
   "x": 6,
   "y": 2,
   "columns": 7,
   "rows": 5,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "abandoned",
  "name": "Baraja abandonada",
  "description": "Comienza la partida sin ninguna carta de figura en tu baraja",
  "nameEn": "Abandoned Deck",
  "descriptionEn": "Start run with no Face Cards in your deck",
  "art": {
   "src": "./web/assets/decks/enhancers.png",
   "x": 3,
   "y": 3,
   "columns": 7,
   "rows": 5,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "checkered",
  "name": "Baraja a cuadros",
  "description": "Comienza la partida con 26 espadas y 26 corazones en la baraja",
  "nameEn": "Checkered Deck",
  "descriptionEn": "Start run with 26 Spades and 26 Hearts in deck",
  "art": {
   "src": "./web/assets/decks/enhancers.png",
   "x": 1,
   "y": 3,
   "columns": 7,
   "rows": 5,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "zodiac",
  "name": "Baraja zodiacal",
  "description": "Comienza la partida con Mercader de tarot, Mercader de planetas, y Excedente",
  "nameEn": "Zodiac Deck",
  "descriptionEn": "Start run with Tarot Merchant, Planet Merchant, and Overstock",
  "art": {
   "src": "./web/assets/decks/enhancers.png",
   "x": 3,
   "y": 4,
   "columns": 7,
   "rows": 5,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "painted",
  "name": "Baraja pintada",
  "description": "+2 tamaño de mano -1 ranuras de comodín",
  "nameEn": "Painted Deck",
  "descriptionEn": "+2 hand size, -1 Joker slot",
  "art": {
   "src": "./web/assets/decks/enhancers.png",
   "x": 4,
   "y": 3,
   "columns": 7,
   "rows": 5,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "anaglyph",
  "name": "Baraja anaglifo",
  "description": "Después de derrotar a cada ciega jefe, gana 1 Etiqueta doble",
  "nameEn": "Anaglyph Deck",
  "descriptionEn": "After defeating each Boss Blind, gain a Double Tag",
  "art": {
   "src": "./web/assets/decks/enhancers.png",
   "x": 2,
   "y": 4,
   "columns": 7,
   "rows": 5,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "plasma",
  "name": "Baraja plasmática",
  "description": "Equilibra las fichas y el multi cuando calcula los puntos de cada mano jugada X2 tamaño base de la ciega",
  "nameEn": "Plasma Deck",
  "descriptionEn": "Balance Chips and Mult when calculating score for played hand X2 base Blind size",
  "art": {
   "src": "./web/assets/decks/enhancers.png",
   "x": 4,
   "y": 2,
   "columns": 7,
   "rows": 5,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "erratic",
  "name": "Baraja errática",
  "description": "Todas las categorías y los palos en la baraja se aleatorizan",
  "nameEn": "Erratic Deck",
  "descriptionEn": "All Ranks and Suits in deck are randomized",
  "art": {
   "src": "./web/assets/decks/enhancers.png",
   "x": 2,
   "y": 3,
   "columns": 7,
   "rows": 5,
   "width": 71,
   "height": 95
  }
 }
];
export const COLLECTION_DECKS:readonly CollectionEntry[]=deckEntries.map(entry=>({...entry,name:DECK_PROFILES[entry.id as DeckId].name,description:DECK_PROFILES[entry.id as DeckId].effect}));

export const COLLECTION_TAGS:readonly CollectionEntry[]=[
 {
  "id": "tag_uncommon",
  "name": "Etiqueta inusual",
  "description": "La tienda tiene un comodín inusual gratis",
  "nameEn": "Uncommon Tag",
  "descriptionEn": "Shop has a free Uncommon Joker",
  "art": {
   "src": "./web/assets/blinds/tags.png",
   "x": 0,
   "y": 0,
   "columns": 6,
   "rows": 5,
   "width": 34,
   "height": 34
  }
 },
 {
  "id": "tag_rare",
  "name": "Etiqueta rara",
  "description": "La tienda tiene un comodín raro gratis",
  "nameEn": "Rare Tag",
  "descriptionEn": "Shop has a free Rare Joker",
  "art": {
   "src": "./web/assets/blinds/tags.png",
   "x": 1,
   "y": 0,
   "columns": 6,
   "rows": 5,
   "width": 34,
   "height": 34
  }
 },
 {
  "id": "tag_negative",
  "name": "Etiqueta negativa",
  "description": "El próximo comodín de la tienda de la edición base es gratis y se vuelve negativo",
  "nameEn": "Negative Tag",
  "descriptionEn": "Next base edition shop Joker is free and becomes Negative",
  "art": {
   "src": "./web/assets/blinds/tags.png",
   "x": 2,
   "y": 0,
   "columns": 6,
   "rows": 5,
   "width": 34,
   "height": 34
  }
 },
 {
  "id": "tag_foil",
  "name": "Etiqueta laminada",
  "description": "El próximo comodín de la tienda de la edición base es gratis y se vuelve laminado",
  "nameEn": "Foil Tag",
  "descriptionEn": "Next base edition shop Joker is free and becomes Foil",
  "art": {
   "src": "./web/assets/blinds/tags.png",
   "x": 3,
   "y": 0,
   "columns": 6,
   "rows": 5,
   "width": 34,
   "height": 34
  }
 },
 {
  "id": "tag_holo",
  "name": "Etiqueta holográfica",
  "description": "El próximo comodín de la tienda de la edición base es gratis y se vuelve holográfico",
  "nameEn": "Holographic Tag",
  "descriptionEn": "Next base edition shop Joker is free and becomes Holographic",
  "art": {
   "src": "./web/assets/blinds/tags.png",
   "x": 0,
   "y": 1,
   "columns": 6,
   "rows": 5,
   "width": 34,
   "height": 34
  }
 },
 {
  "id": "tag_polychrome",
  "name": "Etiqueta polícroma",
  "description": "El próximo comodín de la tienda de la edición base es gratis y se vuelve polícromo",
  "nameEn": "Polychrome Tag",
  "descriptionEn": "Next base edition shop Joker is free and becomes Polychrome",
  "art": {
   "src": "./web/assets/blinds/tags.png",
   "x": 1,
   "y": 1,
   "columns": 6,
   "rows": 5,
   "width": 34,
   "height": 34
  }
 },
 {
  "id": "tag_investment",
  "name": "Etiqueta de inversión",
  "description": "Después de derrotar a la ciega jefe, gana 25 $",
  "nameEn": "Investment Tag",
  "descriptionEn": "After defeating the Boss Blind, gain $25",
  "art": {
   "src": "./web/assets/blinds/tags.png",
   "x": 2,
   "y": 1,
   "columns": 6,
   "rows": 5,
   "width": 34,
   "height": 34
  }
 },
 {
  "id": "tag_voucher",
  "name": "Etiqueta de vale",
  "description": "Agrega un vale en la siguiente tienda",
  "nameEn": "Voucher Tag",
  "descriptionEn": "Adds one Voucher to the next shop",
  "art": {
   "src": "./web/assets/blinds/tags.png",
   "x": 3,
   "y": 1,
   "columns": 6,
   "rows": 5,
   "width": 34,
   "height": 34
  }
 },
 {
  "id": "tag_boss",
  "name": "Etiqueta de jefe",
  "description": "Renueva la ciega jefe",
  "nameEn": "Boss Tag",
  "descriptionEn": "Rerolls the Boss Blind",
  "art": {
   "src": "./web/assets/blinds/tags.png",
   "x": 0,
   "y": 2,
   "columns": 6,
   "rows": 5,
   "width": 34,
   "height": 34
  }
 },
 {
  "id": "tag_standard",
  "name": "Etiqueta estándar",
  "description": "Otorga gratis un megapaquete estándar",
  "nameEn": "Standard Tag",
  "descriptionEn": "Gives a free Mega Standard Pack",
  "art": {
   "src": "./web/assets/blinds/tags.png",
   "x": 1,
   "y": 2,
   "columns": 6,
   "rows": 5,
   "width": 34,
   "height": 34
  }
 },
 {
  "id": "tag_charm",
  "name": "Etiqueta encantada",
  "description": "Otorga gratis un paquete arcano mega",
  "nameEn": "Charm Tag",
  "descriptionEn": "Gives a free Mega Arcana Pack",
  "art": {
   "src": "./web/assets/blinds/tags.png",
   "x": 2,
   "y": 2,
   "columns": 6,
   "rows": 5,
   "width": 34,
   "height": 34
  }
 },
 {
  "id": "tag_meteor",
  "name": "Etiqueta de meteoro",
  "description": "Otorga gratis un paquete celestial mega",
  "nameEn": "Meteor Tag",
  "descriptionEn": "Gives a free Mega Celestial Pack",
  "art": {
   "src": "./web/assets/blinds/tags.png",
   "x": 3,
   "y": 2,
   "columns": 6,
   "rows": 5,
   "width": 34,
   "height": 34
  }
 },
 {
  "id": "tag_buffoon",
  "name": "Etiqueta de bufón",
  "description": "Otorga gratis un paquete de bufón",
  "nameEn": "Buffoon Tag",
  "descriptionEn": "Gives a free Mega Buffoon Pack",
  "art": {
   "src": "./web/assets/blinds/tags.png",
   "x": 4,
   "y": 2,
   "columns": 6,
   "rows": 5,
   "width": 34,
   "height": 34
  }
 },
 {
  "id": "tag_handy",
  "name": "Etiqueta manual",
  "description": "Otorga 1 $ por cada mano jugada en esta partida (Otorgará [según partida] $)",
  "nameEn": "Handy Tag",
  "descriptionEn": "Gives $1 per played hand this run (Will give $[run-dependent])",
  "art": {
   "src": "./web/assets/blinds/tags.png",
   "x": 1,
   "y": 3,
   "columns": 6,
   "rows": 5,
   "width": 34,
   "height": 34
  }
 },
 {
  "id": "tag_garbage",
  "name": "Etiqueta de basura",
  "description": "Otorga 1 $ por cada descarte sin usar en esta partida (Otorgará [según partida] $)",
  "nameEn": "Garbage Tag",
  "descriptionEn": "Gives $1 per unused discard this run (Will give $[run-dependent])",
  "art": {
   "src": "./web/assets/blinds/tags.png",
   "x": 2,
   "y": 3,
   "columns": 6,
   "rows": 5,
   "width": 34,
   "height": 34
  }
 },
 {
  "id": "tag_ethereal",
  "name": "Etiqueta etérea",
  "description": "Otorga gratis un paquete espectral",
  "nameEn": "Ethereal Tag",
  "descriptionEn": "Gives a free Spectral Pack",
  "art": {
   "src": "./web/assets/blinds/tags.png",
   "x": 3,
   "y": 3,
   "columns": 6,
   "rows": 5,
   "width": 34,
   "height": 34
  }
 },
 {
  "id": "tag_coupon",
  "name": "Etiqueta de cupón",
  "description": "Las cartas iniciales y los paquetes potenciadores en la próxima tienda son gratis",
  "nameEn": "Coupon Tag",
  "descriptionEn": "Initial cards and booster packs in next shop are free",
  "art": {
   "src": "./web/assets/blinds/tags.png",
   "x": 4,
   "y": 0,
   "columns": 6,
   "rows": 5,
   "width": 34,
   "height": 34
  }
 },
 {
  "id": "tag_double",
  "name": "Etiqueta doble",
  "description": "Otorga una copia de la etiqueta siguiente seleccionada a excepción de Etiqueta doble",
  "nameEn": "Double Tag",
  "descriptionEn": "Gives a copy of the next selected Tag Double Tag excluded",
  "art": {
   "src": "./web/assets/blinds/tags.png",
   "x": 5,
   "y": 0,
   "columns": 6,
   "rows": 5,
   "width": 34,
   "height": 34
  }
 },
 {
  "id": "tag_juggle",
  "name": "Etiqueta de malabar",
  "description": "+3 tamaño de mano en la ronda siguiente",
  "nameEn": "Juggle Tag",
  "descriptionEn": "+3 hand size next round",
  "art": {
   "src": "./web/assets/blinds/tags.png",
   "x": 5,
   "y": 1,
   "columns": 6,
   "rows": 5,
   "width": 34,
   "height": 34
  }
 },
 {
  "id": "tag_d_six",
  "name": "Etiqueta D6",
  "description": "Las renovaciones en la tienda siguiente comienzan en 0 $",
  "nameEn": "D6 Tag",
  "descriptionEn": "Rerolls in next shop start at $0",
  "art": {
   "src": "./web/assets/blinds/tags.png",
   "x": 5,
   "y": 3,
   "columns": 6,
   "rows": 5,
   "width": 34,
   "height": 34
  }
 },
 {
  "id": "tag_top_up",
  "name": "Etiqueta de recarga",
  "description": "Genera hasta 2 comodines comunes (Debe haber espacio)",
  "nameEn": "Top-up Tag",
  "descriptionEn": "Create up to 2 Common Jokers (Must have room)",
  "art": {
   "src": "./web/assets/blinds/tags.png",
   "x": 4,
   "y": 1,
   "columns": 6,
   "rows": 5,
   "width": 34,
   "height": 34
  }
 },
 {
  "id": "tag_skip",
  "name": "Etiqueta veloz",
  "description": "Otorga 5 $ por ciega omitida en esta partida (Otorgará [según partida] $)",
  "nameEn": "Speed Tag",
  "descriptionEn": "Gives $5 per skipped Blind this run (Will give $[run-dependent])",
  "art": {
   "src": "./web/assets/blinds/tags.png",
   "x": 0,
   "y": 3,
   "columns": 6,
   "rows": 5,
   "width": 34,
   "height": 34
  }
 },
 {
  "id": "tag_orbital",
  "name": "Etiqueta orbital",
  "description": "Aumenta [según partida] en 3 niveles",
  "nameEn": "Orbital Tag",
  "descriptionEn": "Upgrade [run-dependent] by 3 levels",
  "art": {
   "src": "./web/assets/blinds/tags.png",
   "x": 5,
   "y": 2,
   "columns": 6,
   "rows": 5,
   "width": 34,
   "height": 34
  }
 },
 {
  "id": "tag_economy",
  "name": "Etiqueta de economía",
  "description": "Duplica el dinero (Máx. de 40 $)",
  "nameEn": "Economy Tag",
  "descriptionEn": "Doubles your money (Max of $40)",
  "art": {
   "src": "./web/assets/blinds/tags.png",
   "x": 4,
   "y": 3,
   "columns": 6,
   "rows": 5,
   "width": 34,
   "height": 34
  }
 }
];

const voucherEntries:CollectionEntry[]=[
 {
  "id": "v_overstock_norm",
  "name": "Excedente",
  "description": "+1 ranura de carta disponible en la tienda",
  "nameEn": "Overstock",
  "descriptionEn": "+1 card slot available in shop",
  "art": {
   "src": "./web/assets/vouchers/atlas.png",
   "x": 0,
   "y": 0,
   "columns": 9,
   "rows": 4,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "v_overstock_plus",
  "name": "Excedente plus",
  "description": "+1 ranura de carta disponible en la tienda",
  "nameEn": "Overstock Plus",
  "descriptionEn": "+1 card slot available in shop",
  "art": {
   "src": "./web/assets/vouchers/atlas.png",
   "x": 0,
   "y": 1,
   "columns": 9,
   "rows": 4,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "v_clearance_sale",
  "name": "Venta de saldos",
  "description": "Todas las cartas y paquetes en la tienda a 25 % menos",
  "nameEn": "Clearance Sale",
  "descriptionEn": "All cards and packs in shop are 25% off",
  "art": {
   "src": "./web/assets/vouchers/atlas.png",
   "x": 3,
   "y": 0,
   "columns": 9,
   "rows": 4,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "v_liquidation",
  "name": "Liquidación",
  "description": "Todas las cartas y paquetes en la tienda a 50 % menos",
  "nameEn": "Liquidation",
  "descriptionEn": "All cards and packs in shop are 50% off",
  "art": {
   "src": "./web/assets/vouchers/atlas.png",
   "x": 3,
   "y": 1,
   "columns": 9,
   "rows": 4,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "v_hone",
  "name": "Perfección",
  "description": "Las cartas laminadas, holográficas y polícromas aparecen 2X más veces",
  "nameEn": "Hone",
  "descriptionEn": "Foil, Holographic, and Polychrome cards appear 2X more often",
  "art": {
   "src": "./web/assets/vouchers/atlas.png",
   "x": 4,
   "y": 0,
   "columns": 9,
   "rows": 4,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "v_glow_up",
  "name": "Brillo",
  "description": "Las cartas laminadas, holográficas y polícromas aparecen 4X más veces",
  "nameEn": "Glow Up",
  "descriptionEn": "Foil, Holographic, and Polychrome cards appear 4X more often",
  "art": {
   "src": "./web/assets/vouchers/atlas.png",
   "x": 4,
   "y": 1,
   "columns": 9,
   "rows": 4,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "v_reroll_surplus",
  "name": "Excedente de renovaciones",
  "description": "Las renovaciones cuestan 2 $ menos",
  "nameEn": "Reroll Surplus",
  "descriptionEn": "Rerolls cost $2 less",
  "art": {
   "src": "./web/assets/vouchers/atlas.png",
   "x": 0,
   "y": 2,
   "columns": 9,
   "rows": 4,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "v_reroll_glut",
  "name": "Gula de renovaciones",
  "description": "Las renovaciones cuestan 2 $ menos",
  "nameEn": "Reroll Glut",
  "descriptionEn": "Rerolls cost $2 less",
  "art": {
   "src": "./web/assets/vouchers/atlas.png",
   "x": 0,
   "y": 3,
   "columns": 9,
   "rows": 4,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "v_crystal_ball",
  "name": "Bola de cristal",
  "description": "+1 ranura de consumible",
  "nameEn": "Crystal Ball",
  "descriptionEn": "+1 consumable slot",
  "art": {
   "src": "./web/assets/vouchers/atlas.png",
   "x": 2,
   "y": 2,
   "columns": 9,
   "rows": 4,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "v_omen_globe",
  "name": "Orbe profético",
  "description": "Las cartas espectrales pueden aparecer en cualquier paquete arcano",
  "nameEn": "Omen Globe",
  "descriptionEn": "Spectral cards may appear in any of the Arcana Packs",
  "art": {
   "src": "./web/assets/vouchers/atlas.png",
   "x": 2,
   "y": 3,
   "columns": 9,
   "rows": 4,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "v_telescope",
  "name": "Telescopio",
  "description": "Los paquetes celestiales siempre contienen la carta de planeta para tu mano de póker más jugada",
  "nameEn": "Telescope",
  "descriptionEn": "Celestial Packs always contain the Planet card for your most played poker hand",
  "art": {
   "src": "./web/assets/vouchers/atlas.png",
   "x": 3,
   "y": 2,
   "columns": 9,
   "rows": 4,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "v_observatory",
  "name": "Observatorio",
  "description": "Las cartas de planeta en el área de consumibles otorgan X1.5 multi para su mano de póker específica",
  "nameEn": "Observatory",
  "descriptionEn": "Planet cards in your consumable area give X1.5 Mult for their specified poker hand",
  "art": {
   "src": "./web/assets/vouchers/atlas.png",
   "x": 3,
   "y": 3,
   "columns": 9,
   "rows": 4,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "v_grabber",
  "name": "Agarrador",
  "description": "Gana para siempre +1 mano(s) por ronda",
  "nameEn": "Grabber",
  "descriptionEn": "Permanently gain +1 hand per round",
  "art": {
   "src": "./web/assets/vouchers/atlas.png",
   "x": 5,
   "y": 0,
   "columns": 9,
   "rows": 4,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "v_nacho_tong",
  "name": "Pinza para nachos",
  "description": "Gana para siempre +1 mano(s) por ronda",
  "nameEn": "Nacho Tong",
  "descriptionEn": "Permanently gain +1 hand per round",
  "art": {
   "src": "./web/assets/vouchers/atlas.png",
   "x": 5,
   "y": 1,
   "columns": 9,
   "rows": 4,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "v_wasteful",
  "name": "Desperdiciador",
  "description": "Gana para siempre +1 descarte cada ronda",
  "nameEn": "Wasteful",
  "descriptionEn": "Permanently gain +1 discard each round",
  "art": {
   "src": "./web/assets/vouchers/atlas.png",
   "x": 6,
   "y": 0,
   "columns": 9,
   "rows": 4,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "v_recyclomancy",
  "name": "Reciclomancia",
  "description": "Gana para siempre +1 descarte cada ronda",
  "nameEn": "Recyclomancy",
  "descriptionEn": "Permanently gain +1 discard each round",
  "art": {
   "src": "./web/assets/vouchers/atlas.png",
   "x": 6,
   "y": 1,
   "columns": 9,
   "rows": 4,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "v_tarot_merchant",
  "name": "Mercader de tarot",
  "description": "Las cartas de tarot aparecen 2 X veces más seguido en la tienda",
  "nameEn": "Tarot Merchant",
  "descriptionEn": "Tarot cards appear 2X more frequently in the shop",
  "art": {
   "src": "./web/assets/vouchers/atlas.png",
   "x": 1,
   "y": 0,
   "columns": 9,
   "rows": 4,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "v_tarot_tycoon",
  "name": "Magnate del tarot",
  "description": "Las cartas de tarot aparecen 4 X veces más seguido en la tienda",
  "nameEn": "Tarot Tycoon",
  "descriptionEn": "Tarot cards appear 4X more frequently in the shop",
  "art": {
   "src": "./web/assets/vouchers/atlas.png",
   "x": 1,
   "y": 1,
   "columns": 9,
   "rows": 4,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "v_planet_merchant",
  "name": "Mercader de planetas",
  "description": "Las cartas de planeta aparecen 2 X veces más seguido en la tienda",
  "nameEn": "Planet Merchant",
  "descriptionEn": "Planet cards appear 2X more frequently in the shop",
  "art": {
   "src": "./web/assets/vouchers/atlas.png",
   "x": 2,
   "y": 0,
   "columns": 9,
   "rows": 4,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "v_planet_tycoon",
  "name": "Magnate de planetas",
  "description": "Las cartas de planeta aparecen 4 X veces más seguido en la tienda",
  "nameEn": "Planet Tycoon",
  "descriptionEn": "Planet cards appear 4X more frequently in the shop",
  "art": {
   "src": "./web/assets/vouchers/atlas.png",
   "x": 2,
   "y": 1,
   "columns": 9,
   "rows": 4,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "v_seed_money",
  "name": "Siembra dinero",
  "description": "Aumenta el tope de interés ganado en cada ronda a $10.0",
  "nameEn": "Seed Money",
  "descriptionEn": "Raise the cap on interest earned in each round to $10.0",
  "art": {
   "src": "./web/assets/vouchers/atlas.png",
   "x": 1,
   "y": 2,
   "columns": 9,
   "rows": 4,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "v_money_tree",
  "name": "Árbol de dinero",
  "description": "Aumenta el tope de interés ganado en cada ronda a $20.0",
  "nameEn": "Money Tree",
  "descriptionEn": "Raise the cap on interest earned in each round to $20.0",
  "art": {
   "src": "./web/assets/vouchers/atlas.png",
   "x": 1,
   "y": 3,
   "columns": 9,
   "rows": 4,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "v_blank",
  "name": "En blanco",
  "description": "¿No hace nada?",
  "nameEn": "Blank",
  "descriptionEn": "Does nothing?",
  "art": {
   "src": "./web/assets/vouchers/atlas.png",
   "x": 7,
   "y": 0,
   "columns": 9,
   "rows": 4,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "v_antimatter",
  "name": "Antimateria",
  "description": "+1 ranura de comodín",
  "nameEn": "Antimatter",
  "descriptionEn": "+1 Joker Slot",
  "art": {
   "src": "./web/assets/vouchers/atlas.png",
   "x": 7,
   "y": 1,
   "columns": 9,
   "rows": 4,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "v_magic_trick",
  "name": "Truco de magia",
  "description": "Las cartas de juego pueden comprarse en la tienda",
  "nameEn": "Magic Trick",
  "descriptionEn": "Playing cards can be purchased from the shop",
  "art": {
   "src": "./web/assets/vouchers/atlas.png",
   "x": 4,
   "y": 2,
   "columns": 9,
   "rows": 4,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "v_illusion",
  "name": "Ilusión",
  "description": "Las cartas de juego en la tienda pueden tener una mejora, edición y/o un sello",
  "nameEn": "Illusion",
  "descriptionEn": "Playing cards in shop may have an Enhancement, Edition, and/or a Seal",
  "art": {
   "src": "./web/assets/vouchers/atlas.png",
   "x": 4,
   "y": 3,
   "columns": 9,
   "rows": 4,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "v_hieroglyph",
  "name": "Jeroglífico",
  "description": "-1 apuesta inicial, -1 mano cada ronda",
  "nameEn": "Hieroglyph",
  "descriptionEn": "-1 Ante, -1 hand each round",
  "art": {
   "src": "./web/assets/vouchers/atlas.png",
   "x": 5,
   "y": 2,
   "columns": 9,
   "rows": 4,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "v_petroglyph",
  "name": "Petroglifo",
  "description": "-1 apuesta inicial, -1 descarte cada ronda",
  "nameEn": "Petroglyph",
  "descriptionEn": "-1 Ante, -1 discard each round",
  "art": {
   "src": "./web/assets/vouchers/atlas.png",
   "x": 5,
   "y": 3,
   "columns": 9,
   "rows": 4,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "v_directors_cut",
  "name": "Versión del director",
  "description": "Renueva la ciega jefe 1 vez por apuesta inicial, 10 $ por cambio",
  "nameEn": "Director's Cut",
  "descriptionEn": "Reroll Boss Blind 1 time per Ante, $10 per roll",
  "art": {
   "src": "./web/assets/vouchers/atlas.png",
   "x": 6,
   "y": 2,
   "columns": 9,
   "rows": 4,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "v_retcon",
  "name": "Retrocontinuidad",
  "description": "Renueva la ciega jefe ilimitadas veces, 10 $ por cambio",
  "nameEn": "Retcon",
  "descriptionEn": "Reroll Boss Blind unlimited times, $10 per roll",
  "art": {
   "src": "./web/assets/vouchers/atlas.png",
   "x": 6,
   "y": 3,
   "columns": 9,
   "rows": 4,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "v_paint_brush",
  "name": "Brocha",
  "description": "+1 tamaño de mano",
  "nameEn": "Paint Brush",
  "descriptionEn": "+1 hand size",
  "art": {
   "src": "./web/assets/vouchers/atlas.png",
   "x": 7,
   "y": 2,
   "columns": 9,
   "rows": 4,
   "width": 71,
   "height": 95
  }
 },
 {
  "id": "v_palette",
  "name": "Paleta",
  "description": "+1 tamaño de mano",
  "nameEn": "Palette",
  "descriptionEn": "+1 hand size",
  "art": {
   "src": "./web/assets/vouchers/atlas.png",
   "x": 7,
   "y": 3,
   "columns": 9,
   "rows": 4,
   "width": 71,
   "height": 95
  }
 }
];
export const COLLECTION_VOUCHERS:readonly CollectionEntry[]=voucherEntries.map(entry=>{const voucher=VOUCHER_CATALOG.find(v=>v.id===entry.id)!;return {...entry,name:voucher.name,nameEn:voucher.english,description:voucher.description};});

export const COLLECTION_SEALS:readonly CollectionEntry[]=[
 {
  "id": "gold_seal",
  "art": {
   "src": "./web/assets/decks/enhancers.png",
   "x": 2,
   "y": 0,
   "columns": 7,
   "rows": 5,
   "width": 71,
   "height": 95,
   "underlay": {
    "src": "./web/assets/decks/enhancers.png",
    "x": 1,
    "y": 0,
    "columns": 7,
    "rows": 5,
    "width": 71,
    "height": 95
   }
  },
  "name": "Sello de oro",
  "description": "Gana 3 $ cuando se juega esta carta y anota puntos",
  "nameEn": "Gold Seal",
  "descriptionEn": "Earn $3 when this card is played and scores"
 },
 {
  "id": "red_seal",
  "art": {
   "src": "./web/assets/decks/enhancers.png",
   "x": 5,
   "y": 4,
   "columns": 7,
   "rows": 5,
   "width": 71,
   "height": 95,
   "underlay": {
    "src": "./web/assets/decks/enhancers.png",
    "x": 1,
    "y": 0,
    "columns": 7,
    "rows": 5,
    "width": 71,
    "height": 95
   }
  },
  "name": "Sello rojo",
  "description": "Reactiva esta carta 1 vez",
  "nameEn": "Red Seal",
  "descriptionEn": "Retrigger this card 1 time"
 },
 {
  "id": "blue_seal",
  "art": {
   "src": "./web/assets/decks/enhancers.png",
   "x": 6,
   "y": 4,
   "columns": 7,
   "rows": 5,
   "width": 71,
   "height": 95,
   "underlay": {
    "src": "./web/assets/decks/enhancers.png",
    "x": 1,
    "y": 0,
    "columns": 7,
    "rows": 5,
    "width": 71,
    "height": 95
   }
  },
  "name": "Sello azul",
  "description": "Crea la carta de planeta para la última mano de póker de la ronda jugada si la tienes en la mano (Debe haber espacio)",
  "nameEn": "Blue Seal",
  "descriptionEn": "Creates the Planet card for final played poker hand of round if held in hand (Must have room)"
 },
 {
  "id": "purple_seal",
  "art": {
   "src": "./web/assets/decks/enhancers.png",
   "x": 4,
   "y": 4,
   "columns": 7,
   "rows": 5,
   "width": 71,
   "height": 95,
   "underlay": {
    "src": "./web/assets/decks/enhancers.png",
    "x": 1,
    "y": 0,
    "columns": 7,
    "rows": 5,
    "width": 71,
    "height": 95
   }
  },
  "name": "Sello morado",
  "description": "Crea una carta de tarot cuando se descarta (Debe haber espacio)",
  "nameEn": "Purple Seal",
  "descriptionEn": "Creates a Tarot card when discarded (Must have room)"
 }
];

const blindEnglish:Readonly<Record<string,string>>={"bl_arm": "Decrease level of played poker hand", "bl_big": "", "bl_club": "All Club cards are debuffed", "bl_eye": "No repeat hand types this round", "bl_final_acorn": "Flips and shuffles all Joker cards", "bl_final_bell": "Forces 1 card to always be selected", "bl_final_heart": "One random Joker disabled every hand", "bl_final_leaf": "All cards debuffed until 1 Joker sold", "bl_final_vessel": "Very large blind", "bl_fish": "Cards drawn face down after each hand played", "bl_flint": "Base Chips and Mult are halved", "bl_goad": "All Spade cards are debuffed", "bl_head": "All Heart cards are debuffed", "bl_hook": "Discards 2 random cards per hand played", "bl_house": "First hand is drawn face down", "bl_manacle": "-1 Hand Size", "bl_mark": "All face cards are drawn face down", "bl_mouth": "Play only 1 hand type this round", "bl_needle": "Play only 1 hand", "bl_ox": "Playing a [run-dependent] sets money to $0", "bl_pillar": "Cards played previously this Ante are debuffed", "bl_plant": "All face cards are debuffed", "bl_psychic": "Must play 5 cards", "bl_serpent": "After Play or Discard, always draw 3 cards", "bl_small": "", "bl_tooth": "Lose $1 per card played", "bl_wall": "Extra large blind", "bl_water": "Start with 0 discards", "bl_wheel": "in 7 cards get drawn face down", "bl_window": "All Diamond cards are debuffed"};

const blindCells:Readonly<Record<string,readonly[number,number]>>={"bl_small": [0, 0], "bl_big": [0, 1], "bl_ox": [0, 2], "bl_hook": [0, 7], "bl_mouth": [0, 18], "bl_fish": [0, 5], "bl_club": [0, 4], "bl_manacle": [0, 8], "bl_tooth": [0, 22], "bl_wall": [0, 9], "bl_house": [0, 3], "bl_mark": [0, 23], "bl_final_bell": [0, 26], "bl_wheel": [0, 10], "bl_arm": [0, 11], "bl_psychic": [0, 12], "bl_goad": [0, 13], "bl_water": [0, 14], "bl_eye": [0, 17], "bl_plant": [0, 19], "bl_needle": [0, 20], "bl_head": [0, 21], "bl_final_leaf": [0, 28], "bl_final_vessel": [0, 29], "bl_window": [0, 6], "bl_serpent": [0, 15], "bl_pillar": [0, 16], "bl_flint": [0, 24], "bl_final_acorn": [0, 27], "bl_final_heart": [0, 25]};

const chip=(id:string):CollectionSprite=>{const cell=blindCells[id]!;return {src:'./web/assets/blinds/blind-chips.png',x:cell[0],y:cell[1],columns:21,rows:31,width:34,height:34};};
export const COLLECTION_BLINDS:readonly CollectionEntry[]=[
 {id:'small',name:'Ciega pequeña',nameEn:'Small Blind',description:'Objetivo: una vez la base del ante. Premio base: $3.',descriptionEn:'Target: one times the ante base. Base reward: $3.',art:chip('bl_small')},
 {id:'big',name:'Ciega grande',nameEn:'Big Blind',description:'Objetivo: 1,5 veces la base del ante. Premio base: $4.',descriptionEn:'Target: 1.5 times the ante base. Base reward: $4.',art:chip('bl_big')},
 ...BOSS_CATALOG.map(boss=>({id:boss.id,name:boss.name,nameEn:boss.nameEn,description:boss.description,descriptionEn:blindEnglish[boss.artId]??boss.nameEn,meta:`×${boss.multiplier} · $${boss.reward}`,art:chip(boss.artId)}))
];
/** Atlas clipping only; image rendering does not observe or change a game. */
export function collectionArt(entry:CollectionEntry,label=entry.name):HTMLElement {
 const host=document.createElement('span');host.className='collection-art';host.setAttribute('role','img');host.setAttribute('aria-label',label);host.dataset.artStatus='loading';host.dataset.artSource='balatro-game-atlas-1.0.1o';
 host.style.setProperty('--collection-art-ratio',String(entry.art.width/entry.art.height));if(entry.edition)host.dataset.edition=entry.edition;
 let remaining=entry.art.underlay?2:1,failed=false;
 const unavailable=()=>{failed=true;host.dataset.artStatus='unavailable';host.setAttribute('aria-label',label+' · ilustración no disponible');};
 const append=(sprite:CollectionSprite,underlay=false)=>{const image=document.createElement('img');image.alt='';image.setAttribute('aria-hidden','true');image.draggable=false;image.decoding='async';image.style.width=sprite.columns*100+'%';image.style.height=sprite.rows*100+'%';image.style.left=sprite.x*-100+'%';image.style.top=sprite.y*-100+'%';if(underlay)image.dataset.underlay='true';
 image.onload=()=>{void image.decode().then(()=>{if(--remaining===0&&!failed)host.dataset.artStatus='loaded';},unavailable);};image.onerror=unavailable;image.src=sprite.src;host.append(image);};
 if(entry.art.underlay)append(entry.art.underlay,true);append(entry.art);return host;
}
