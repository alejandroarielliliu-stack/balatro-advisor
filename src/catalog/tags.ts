/** 24 identities and trigger metadata inspected in owned Steam 1.0.1o-FULL.
 * Source: docs/etiquetas-tag01.md. No effects, pools or probabilities implemented. */
export const TAGS=[
  {
    "id": "tag_uncommon",
    "name": "Etiqueta inusual",
    "trigger": "store_joker_create",
    "minimumAnte": null
  },
  {
    "id": "tag_rare",
    "name": "Etiqueta rara",
    "trigger": "store_joker_create",
    "minimumAnte": null
  },
  {
    "id": "tag_negative",
    "name": "Etiqueta negativa",
    "trigger": "store_joker_modify",
    "minimumAnte": 2
  },
  {
    "id": "tag_foil",
    "name": "Etiqueta laminada",
    "trigger": "store_joker_modify",
    "minimumAnte": null
  },
  {
    "id": "tag_holo",
    "name": "Etiqueta holográfica",
    "trigger": "store_joker_modify",
    "minimumAnte": null
  },
  {
    "id": "tag_polychrome",
    "name": "Etiqueta polícroma",
    "trigger": "store_joker_modify",
    "minimumAnte": null
  },
  {
    "id": "tag_investment",
    "name": "Etiqueta de inversión",
    "trigger": "eval",
    "minimumAnte": null
  },
  {
    "id": "tag_voucher",
    "name": "Etiqueta de vale",
    "trigger": "voucher_add",
    "minimumAnte": null
  },
  {
    "id": "tag_boss",
    "name": "Etiqueta de jefe",
    "trigger": "new_blind_choice",
    "minimumAnte": null
  },
  {
    "id": "tag_standard",
    "name": "Etiqueta estándar",
    "trigger": "new_blind_choice",
    "minimumAnte": 2
  },
  {
    "id": "tag_charm",
    "name": "Etiqueta encantada",
    "trigger": "new_blind_choice",
    "minimumAnte": null
  },
  {
    "id": "tag_meteor",
    "name": "Etiqueta de meteoro",
    "trigger": "new_blind_choice",
    "minimumAnte": 2
  },
  {
    "id": "tag_buffoon",
    "name": "Etiqueta de bufón",
    "trigger": "new_blind_choice",
    "minimumAnte": 2
  },
  {
    "id": "tag_handy",
    "name": "Etiqueta manual",
    "trigger": "immediate",
    "minimumAnte": 2
  },
  {
    "id": "tag_garbage",
    "name": "Etiqueta de basura",
    "trigger": "immediate",
    "minimumAnte": 2
  },
  {
    "id": "tag_ethereal",
    "name": "Etiqueta etérea",
    "trigger": "new_blind_choice",
    "minimumAnte": 2
  },
  {
    "id": "tag_coupon",
    "name": "Etiqueta de cupón",
    "trigger": "shop_final_pass",
    "minimumAnte": null
  },
  {
    "id": "tag_double",
    "name": "Etiqueta doble",
    "trigger": "tag_add",
    "minimumAnte": null
  },
  {
    "id": "tag_juggle",
    "name": "Etiqueta de malabar",
    "trigger": "round_start_bonus",
    "minimumAnte": null
  },
  {
    "id": "tag_d_six",
    "name": "Etiqueta D6",
    "trigger": "shop_start",
    "minimumAnte": null
  },
  {
    "id": "tag_top_up",
    "name": "Etiqueta de recarga",
    "trigger": "immediate",
    "minimumAnte": 2
  },
  {
    "id": "tag_skip",
    "name": "Etiqueta veloz",
    "trigger": "immediate",
    "minimumAnte": null
  },
  {
    "id": "tag_orbital",
    "name": "Etiqueta orbital",
    "trigger": "immediate",
    "minimumAnte": 2
  },
  {
    "id": "tag_economy",
    "name": "Etiqueta de economía",
    "trigger": "immediate",
    "minimumAnte": null
  }
] as const;
export type TagId=typeof TAGS[number]["id"];
export const tagDefinition=(id:string)=>TAGS.find(t=>t.id===id);
