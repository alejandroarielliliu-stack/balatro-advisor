import {ALL_JOKER_FACTS} from './all-joker-facts.js';
import {VOUCHER_CATALOG} from './voucher-catalog.js';
import {BOOSTER_CATALOG} from './booster-catalog.js';
import {DECK_PROFILES,deckDefinition} from './decks.js';
import {supportsVoucher} from './vouchers.js';
import {FIT_PROFILES} from '../advisor/fit-profiles.js';
export type CapabilityKind='joker'|'voucher'|'pack'|'deck';
export type CapabilityOperation='show'|'rate'|'score'|'apply'|'confirm';
export interface Capability {status:'available'|'conditional'|'unimplemented'|'not_applicable';basis:'catalogue'|'heuristic'|'engine'|'storage';reason:string}
export interface CatalogCapabilities {kind:CapabilityKind;id:string;operations:Record<CapabilityOperation,Capability>}
const cap=(status:Capability['status'],basis:Capability['basis'],reason:string):Capability=>({status,basis,reason});
/** Static routing only. A conditional entry is not proof that a concrete effect is supported. */
export function catalogCapabilities(kind:CapabilityKind,id:string):CatalogCapabilities|null{
 const joker=kind==='joker'&&Object.hasOwn(ALL_JOKER_FACTS,id)?ALL_JOKER_FACTS[id]:undefined;
 const voucher=kind==='voucher'?VOUCHER_CATALOG.find(v=>v.id===id):undefined;
 const pack=kind==='pack'?BOOSTER_CATALOG.find(p=>p.id===id):undefined;
 const deck=kind==='deck'&&Object.hasOwn(DECK_PROFILES,id)?DECK_PROFILES[id as keyof typeof DECK_PROFILES]:undefined;
 if(!joker&&!voucher&&!pack&&!deck)return null;
 const shop=!!joker||!!voucher&&supportsVoucher(id)||!!pack&&['buffoon','celestial','arcana'].includes(pack.family);
 return {kind,id,operations:{
  show:cap('available','catalogue','Identidad y descripción catalogadas; no demuestra reglas implementadas.'),
  rate:cap(joker&&!FIT_PROFILES[joker.artId]?'unimplemented':'conditional','heuristic','Valoración editorial condicionada al estado. No son puntos ni probabilidad de ganar.'),
  score:cap(joker||voucher&&supportsVoucher(id)||deck&&deckDefinition(id)?'conditional':pack?'not_applicable':'unimplemented','engine',pack?'Un sobre cerrado no tiene una mano concreta que puntuar.':'Solo una ejecución concreta de H2 puede comprobar datos, interacciones y evidencia requerida. El catálogo no certifica todos sus efectos.'),
  apply:cap(shop?'conditional':deck?'not_applicable':'unimplemented','engine',shop?'Apertura de Buffoon/Celestial/Arcana compatible, compra de vale compatible o compra/venta/reemplazo de comodín: requiere prueba H2 sobre estado y oferta registrados.':deck?'Una baraja no es una compra de tienda.':'Compra/apertura de esta categoría no está integrada en el flujo persistente de tienda.'),
  confirm:cap(shop?'conditional':deck?'not_applicable':'unimplemented','storage',shop?'Solo tras validación de H2, confirmación explícita, revisión vigente y escritura T09b. Consultar nunca registra acciones.':'Transcribir que posees un elemento no equivale a confirmar su adquisición mediante H2.')
 }};
}
export function listCatalogCapabilities():CatalogCapabilities[]{
 const entries:([CapabilityKind,string])[]=[...Object.keys(ALL_JOKER_FACTS).map(id=>['joker',id] as [CapabilityKind,string]),...VOUCHER_CATALOG.map(v=>['voucher',v.id] as [CapabilityKind,string]),...BOOSTER_CATALOG.map(p=>['pack',p.id] as [CapabilityKind,string]),...Object.keys(DECK_PROFILES).map(id=>['deck',id] as [CapabilityKind,string])];
 return entries.map(([kind,id])=>catalogCapabilities(kind,id)!);
}
