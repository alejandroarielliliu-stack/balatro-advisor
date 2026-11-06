import {GAME_VERSION} from './initial.js';
import {TAG_EFFECTS} from './tag-effects.js';

/** Qualitative descriptions, not executable tag effects or a numerical tier list. */
export interface TagStrategyProfile {
 id:string;
 benefit:string;
 timing:'immediate'|'boss_cashout'|'next_shop'|'next_tag';
 conditions:string[];
 evidence:{status:'provisional';verification:'static_inspection';gameVersion:string;source:string;observedInGame:false};
 execution:'existing_projection'|'not_implemented';
}

const source='docs/evidencia/str02-etiquetas.md';
const profiles:readonly TagStrategyProfile[]=[
 {id:'tag_economy',benefit:'Un ingreso inmediato que depende del saldo al recoger la etiqueta.',timing:'immediate',
  conditions:['Su importe se obtiene del motor de etiquetas cuando los datos y efectos pendientes lo permiten.','Recibir dinero no concede una visita a tienda.'],execution:'existing_projection',
  evidence:{status:'provisional',verification:'static_inspection',gameVersion:GAME_VERSION,source,observedInGame:false}},
 {id:'tag_investment',benefit:`${TAG_EFFECTS.investment.dollars} dólares al superar una ciega jefe y cobrar.`,timing:'boss_cashout',
  conditions:['Ese dinero no está disponible al saltar.','Depende de superar el jefe; no garantiza llegar a cobrarlo.'],execution:'existing_projection',
  evidence:{status:'provisional',verification:'static_inspection',gameVersion:GAME_VERSION,source,observedInGame:false}},
 {id:'tag_d_six',benefit:'Reduce la base temporal del coste de renovar en la próxima tienda.',timing:'next_shop',
  conditions:['No da dinero ni compras gratuitas.','Las renovaciones posteriores pueden aumentar su coste; no se consideran ilimitadas ni todas gratuitas.','Su utilidad depende de aprovechar esa tienda y de las ofertas que aparezcan.'],execution:'not_implemented',
  evidence:{status:'provisional',verification:'static_inspection',gameVersion:GAME_VERSION,source,observedInGame:false}},
 {id:'tag_coupon',benefit:'Hace gratuitas las cartas y los sobres iniciales de la próxima tienda afectados por el cupón.',timing:'next_shop',
  conditions:['No se presupone qué artículos aparecerán.','No se atribuye el cupón a vales ni a todas las cartas de futuras renovaciones.','No equivale a dinero disponible ahora.'],execution:'not_implemented',
  evidence:{status:'provisional',verification:'static_inspection',gameVersion:GAME_VERSION,source,observedInGame:false}},
 {id:'tag_double',benefit:'Duplica una siguiente etiqueta que no sea otra Double.',timing:'next_tag',
  conditions:['Su beneficio depende de qué etiqueta se recoja después.','No se simulan ahora duplicaciones ni recompensas futuras.'],execution:'not_implemented',
  evidence:{status:'provisional',verification:'static_inspection',gameVersion:GAME_VERSION,source,observedInGame:false}}
];

/** Copies prevent a consumer from promoting or changing shared evidence. */
export function tagStrategyProfile(id:string):TagStrategyProfile|null {
 const profile=profiles.find(p=>p.id===id);return profile?structuredClone(profile):null;
}
