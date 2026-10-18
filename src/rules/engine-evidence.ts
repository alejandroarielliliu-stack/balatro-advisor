import { getRuleRegistry, assessRuleEvidence } from './evidence.js';
import type { RuleRegistry, AnalysisGate } from './evidence.js';
import { ENGINE_RULESET } from '../catalog/initial.js';

/** Static inspection of the local 1.0.1o executable is NOT a played-game observation. */
export function getEngineRuleRegistry(): RuleRegistry {
  const entries = Object.values(getRuleRegistry()).map(entry => ({ ...entry,
    scope: ENGINE_RULESET, status: 'provisional' as const, verification: 'documented' as const,
    evidenceIds: [...entry.evidenceIds, 'L01', 'L03'],
    limitation: 'Modelo 1.0.1o sustentado en documentación y lectura estática local; falta contrastarlo en una partida.'
  }));
  const registry = Object.fromEntries(entries.map(entry => [entry.id, entry]));
  registry['base.configuration']!.claim='Recursos White resueltos por condiciones de baraja (L03); saldo e inventario observados, nunca repuestos.';
  registry['version.compatibility']!.claim = 'Contrato 1.0.1o identificado por version.jkr del ejecutable instalado; comportamiento en partida aún sin contraste.';
  for (const id of ['shop.actions', 'hand.classification', 'round.resources', 'round.cashout', 'deck.green', 'deck.plasma', 'jokers.simple']) {
    registry[id] = { id, scope: ENGINE_RULESET, status: 'provisional', verification: 'documented',
      claim: `Reglas de ${id} dentro del alcance integrado Azul/Roja/Amarilla/Verde/Negra/Pintada/Plasma/Abandonada/Cuadriculada/Errática, White Stake.`, evidenceIds: ['D04', 'L01', 'L03'],
      limitation: 'Lectura estática y modelo documental; no prueba ejecutada en Balatro.' };
  }
  registry['jokers.simple']!.evidenceIds=['L01','L04'];
  registry['jokers.simple']!.claim='CAT02: 33 efectos deterministas por cartas, patrones, dinero, valor de venta, selección y XMult entero; alcance documentado en docs/comodines-cat02.md.';
  registry['vouchers.interest']={id:'vouchers.interest',scope:ENGINE_RULESET,status:'provisional',verification:'documented',claim:'Seed Money: tope $10; Money Tree: $20. No producen interés con baraja Verde.',evidenceIds:['L05'],limitation:'Inspección del ejecutable; pendiente observación en partida.'};
  registry['vouchers.resources']={id:'vouchers.resources',scope:ENGINE_RULESET,status:'provisional',verification:'documented',claim:'Grabber/Nacho Tong +1 mano; Wasteful/Recyclomancy +1 descarte; Paint Brush/Palette +1 tamaño; Blank sin efecto de ronda; Antimatter +1 espacio.',evidenceIds:['L06'],limitation:'Inspección estática de Card:apply_to_run; no observación en partida.'};
  registry['jokers.context']={id:'jokers.context',scope:ENGINE_RULESET,status:'provisional',verification:'documented',claim:'CAT03: cartas retenidas, repeticiones, copias y recursos; contexto explícito sin robos inventados.',evidenceIds:['L07'],limitation:'Inspección estática; falta contraste en partida.'};
  for(const id of ['jokers.full','jokers.random','jokers.history','jokers.generation','jokers.economy'])registry[id]={id,scope:ENGINE_RULESET,status:'provisional',verification:'documented',claim:'CAT04: efectos de los150 con contexto y resultados explícitos; eventos deterministas condicionados.',evidenceIds:['L08'],limitation:'Inspección estática del ejecutable1.0.1o; resultado condicionado por datos y sucesos indicados, sin observación en partida.'};
  for(const id of ['tags.skip','tags.economy','tags.investment'])registry[id]={id,scope:ENGINE_RULESET,status:'provisional',verification:'documented',claim:'TAG01b: salto Small/Big, Economy hasta $40 e Investment $25 por etiqueta al superar jefe.',evidenceIds:['L09'],limitation:'Inspección estática local; pendiente contraste en partida. Double y otros premios no se proyectan.'};
  registry['vouchers.purchase']={id:'vouchers.purchase',scope:ENGINE_RULESET,status:'provisional',verification:'documented',claim:'Compra de diez vales con oferta observada, precio base10, requisitos, saldo/crédito y efectos persistentes existentes.',evidenceIds:['L06','L10'],limitation:'Inspección estática local; sin contraste de partida. Descuentos, otros22 y repetición fallback Blank fuera del lote.'};
  for(const id of ['packs.purchase','packs.contents','packs.choose','packs.skip','packs.planet'])registry[id]={id,scope:ENGINE_RULESET,status:'provisional',verification:'documented',claim:'SHOP02b/DECK04b: operación común de sobres observados Buffoon/Celestial y Arcana con su dependencia adicional; Planet, adquisiciones, pago y omisión por rama.',evidenceIds:id==='packs.planet'?['L11','L08']:['L11','L13','L08'],limitation:'Inspección estática; falta contraste en partida. Arcana usa su dependencia adicional L13; no genera contenido ni cubre Black Hole, descuentos, Standard o Spectral.'};
  registry['tarot.targets']={id:'tarot.targets',scope:ENGINE_RULESET,status:'provisional',verification:'documented',claim:'DECK04a: doce Tarot deterministas sobre cartas en mano observadas; reemplazo de mejora o cambio de palo, historial conocido o desconocido explícito.',evidenceIds:['L12','L08'],limitation:'Inspección estática del ejecutable 1.0.1o-FULL, no observación en partida. No cubre otros Tarot ni refresco de debilitamiento de jefes fuera del alcance; la fuente de uso en Arcana tiene su propia dependencia.'};
  registry['packs.arcana']={id:'packs.arcana',scope:ENGINE_RULESET,status:'provisional',verification:'documented',claim:'DECK04b/d: Arcana normal/jumbo/mega desde tienda, doce Tarot dirigidos y dos de dinero, Mega sin nuevo robo y cierre/omisión.',evidenceIds:['L13','L12','L14','L08'],limitation:'Inspección estática 1.0.1o-FULL; no observación en partida. Otros Tarot, Soul, Omen Globe y uso de consumibles poseídos dentro del sobre permanecen limitados.'};
  registry['tarot.money']={id:'tarot.money',scope:ENGINE_RULESET,status:'provisional',verification:'documented',claim:'DECK04d: Ermitaño gana entre cero y20 según saldo actual; Templanza suma ventas físicas observadas hasta50, sin vender ni seleccionar cartas.',evidenceIds:['L14','L08'],limitation:'Inspección estática; no partida observada. Solo uso propio en tienda/ronda o uso directo observado en Arcana; el efecto no paga interés ni recompensa.'};
  return { ...registry, 'runtime.confirmation': {
    id: 'runtime.confirmation', scope: ENGINE_RULESET, status: 'pending', verification: 'unverified',
    claim: 'Resultados contrastados en una partida de la build identificada.', evidenceIds: ['L01', 'L03'],
    limitation: 'Pendiente evidencia de ejecución de T01; la lectura del ejecutable no la sustituye.'
  } };
}
export function engineEvidence(ids: readonly string[], requireObserved = false): AnalysisGate {
  return assessRuleEvidence([...ids, ...(requireObserved ? ['runtime.confirmation'] : [])], getEngineRuleRegistry());
}
