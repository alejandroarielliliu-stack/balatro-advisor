// Installed 1.0.1o-FULL; see docs/vales.md.
export const VOUCHER_CATALOG = [
  {
    "id": "v_overstock_norm",
    "name": "Excedente",
    "english": "Overstock",
    "description": "+1 ranura de carta disponible en la tienda",
    "requires": [],
    "x": 0,
    "y": 0
  },
  {
    "id": "v_overstock_plus",
    "name": "Excedente plus",
    "english": "Overstock Plus",
    "description": "+1 ranura de carta disponible en la tienda",
    "requires": [
      "v_overstock_norm"
    ],
    "x": 0,
    "y": 1
  },
  {
    "id": "v_reroll_surplus",
    "name": "Excedente de renovaciones",
    "english": "Reroll Surplus",
    "description": "Las renovaciones cuestan 2 $ menos",
    "requires": [],
    "x": 0,
    "y": 2
  },
  {
    "id": "v_reroll_glut",
    "name": "Gula de renovaciones",
    "english": "Reroll Glut",
    "description": "Las renovaciones cuestan 2 $ menos",
    "requires": [
      "v_reroll_surplus"
    ],
    "x": 0,
    "y": 3
  },
  {
    "id": "v_tarot_merchant",
    "name": "Mercader de tarot",
    "english": "Tarot Merchant",
    "description": "Las cartas de tarot aparecen 2 X veces más seguido en la tienda",
    "requires": [],
    "x": 1,
    "y": 0
  },
  {
    "id": "v_tarot_tycoon",
    "name": "Magnate del tarot",
    "english": "Tarot Tycoon",
    "description": "Las cartas de tarot aparecen 4 X veces más seguido en la tienda",
    "requires": [
      "v_tarot_merchant"
    ],
    "x": 1,
    "y": 1
  },
  {
    "id": "v_seed_money",
    "name": "Siembra dinero",
    "english": "Seed Money",
    "description": "Aumenta el tope de interés ganado en cada ronda a $10",
    "requires": [],
    "x": 1,
    "y": 2
  },
  {
    "id": "v_money_tree",
    "name": "Árbol de dinero",
    "english": "Money Tree",
    "description": "Aumenta el tope de interés ganado en cada ronda a $20",
    "requires": [
      "v_seed_money"
    ],
    "x": 1,
    "y": 3
  },
  {
    "id": "v_planet_merchant",
    "name": "Mercader de planetas",
    "english": "Planet Merchant",
    "description": "Las cartas de planeta aparecen 2 X veces más seguido en la tienda",
    "requires": [],
    "x": 2,
    "y": 0
  },
  {
    "id": "v_planet_tycoon",
    "name": "Magnate de planetas",
    "english": "Planet Tycoon",
    "description": "Las cartas de planeta aparecen 4 X veces más seguido en la tienda",
    "requires": [
      "v_planet_merchant"
    ],
    "x": 2,
    "y": 1
  },
  {
    "id": "v_crystal_ball",
    "name": "Bola de cristal",
    "english": "Crystal Ball",
    "description": "+1 ranura de consumible",
    "requires": [],
    "x": 2,
    "y": 2
  },
  {
    "id": "v_omen_globe",
    "name": "Orbe profético",
    "english": "Omen Globe",
    "description": "Las cartas espectrales pueden aparecer en cualquier paquete arcano",
    "requires": [
      "v_crystal_ball"
    ],
    "x": 2,
    "y": 3
  },
  {
    "id": "v_clearance_sale",
    "name": "Venta de saldos",
    "english": "Clearance Sale",
    "description": "Todas las cartas y paquetes en la tienda a 25 % menos",
    "requires": [],
    "x": 3,
    "y": 0
  },
  {
    "id": "v_liquidation",
    "name": "Liquidación",
    "english": "Liquidation",
    "description": "Todas las cartas y paquetes en la tienda a 50 % menos",
    "requires": [
      "v_clearance_sale"
    ],
    "x": 3,
    "y": 1
  },
  {
    "id": "v_telescope",
    "name": "Telescopio",
    "english": "Telescope",
    "description": "Los paquetes celestiales siempre contienen la carta de planeta para tu mano de póker más jugada",
    "requires": [],
    "x": 3,
    "y": 2
  },
  {
    "id": "v_observatory",
    "name": "Observatorio",
    "english": "Observatory",
    "description": "Las cartas de planeta en el área de consumibles otorgan  X1.5  multi para su mano de póker específica",
    "requires": [
      "v_telescope"
    ],
    "x": 3,
    "y": 3
  },
  {
    "id": "v_hone",
    "name": "Perfección",
    "english": "Hone",
    "description": "Las cartas laminadas, holográficas y polícromas aparecen 2X más veces",
    "requires": [],
    "x": 4,
    "y": 0
  },
  {
    "id": "v_glow_up",
    "name": "Brillo",
    "english": "Glow Up",
    "description": "Las cartas laminadas, holográficas y polícromas aparecen 4X más veces",
    "requires": [
      "v_hone"
    ],
    "x": 4,
    "y": 1
  },
  {
    "id": "v_magic_trick",
    "name": "Truco de magia",
    "english": "Magic Trick",
    "description": "Las cartas de juego pueden comprarse en la tienda",
    "requires": [],
    "x": 4,
    "y": 2
  },
  {
    "id": "v_illusion",
    "name": "Ilusión",
    "english": "Illusion",
    "description": "Las cartas de juego en la tienda pueden tener una mejora, edición y/o un sello",
    "requires": [
      "v_magic_trick"
    ],
    "x": 4,
    "y": 3
  },
  {
    "id": "v_grabber",
    "name": "Agarrador",
    "english": "Grabber",
    "description": "Gana para siempre +1 mano(s) por ronda",
    "requires": [],
    "x": 5,
    "y": 0
  },
  {
    "id": "v_nacho_tong",
    "name": "Pinza para nachos",
    "english": "Nacho Tong",
    "description": "Gana para siempre +1 mano(s) por ronda",
    "requires": [
      "v_grabber"
    ],
    "x": 5,
    "y": 1
  },
  {
    "id": "v_hieroglyph",
    "name": "Jeroglífico",
    "english": "Hieroglyph",
    "description": "-1 apuesta inicial, -1 mano cada ronda",
    "requires": [],
    "x": 5,
    "y": 2
  },
  {
    "id": "v_petroglyph",
    "name": "Petroglifo",
    "english": "Petroglyph",
    "description": "-1 apuesta inicial, -1 descarte cada ronda",
    "requires": [
      "v_hieroglyph"
    ],
    "x": 5,
    "y": 3
  },
  {
    "id": "v_wasteful",
    "name": "Desperdiciador",
    "english": "Wasteful",
    "description": "Gana para siempre +1 descarte cada ronda",
    "requires": [],
    "x": 6,
    "y": 0
  },
  {
    "id": "v_recyclomancy",
    "name": "Reciclomancia",
    "english": "Recyclomancy",
    "description": "Gana para siempre +1 descarte cada ronda",
    "requires": [
      "v_wasteful"
    ],
    "x": 6,
    "y": 1
  },
  {
    "id": "v_directors_cut",
    "name": "Versión del director",
    "english": "Director's Cut",
    "description": "Renueva la ciega jefe 1 vez por apuesta inicial, 10 $ por cambio",
    "requires": [],
    "x": 6,
    "y": 2
  },
  {
    "id": "v_retcon",
    "name": "Retrocontinuidad",
    "english": "Retcon",
    "description": "Renueva la ciega jefe ilimitadas veces, 10 $ por cambio",
    "requires": [
      "v_directors_cut"
    ],
    "x": 6,
    "y": 3
  },
  {
    "id": "v_blank",
    "name": "En blanco",
    "english": "Blank",
    "description": "¿No hace nada?",
    "requires": [],
    "x": 7,
    "y": 0
  },
  {
    "id": "v_antimatter",
    "name": "Antimateria",
    "english": "Antimatter",
    "description": "+1 ranura de comodín",
    "requires": [
      "v_blank"
    ],
    "x": 7,
    "y": 1
  },
  {
    "id": "v_paint_brush",
    "name": "Brocha",
    "english": "Paint Brush",
    "description": "+1 tamaño de mano",
    "requires": [],
    "x": 7,
    "y": 2
  },
  {
    "id": "v_palette",
    "name": "Paleta",
    "english": "Palette",
    "description": "+1 tamaño de mano",
    "requires": [
      "v_paint_brush"
    ],
    "x": 7,
    "y": 3
  }
] as const;
