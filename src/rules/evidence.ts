/** Evidence metadata and dependency gates only. No game calculation or advice. */
import type { GameState } from '../state/model.js';

export const PROPOSED_RULESET = 'balatro-pc-1.0.1f-blue-white-v1';
export type RuleStatus = 'confirmed' | 'provisional' | 'pending';
export interface Evidence {
  id: string;
  kind: 'primary_document' | 'secondary_document' | 'local_source' | 'game_observation';
  uri: string;
  summary: string;
  reviewedAt: string;
}
export interface RuleRecord {
  id: string;
  status: RuleStatus;
  claim: string;
  scope: string;
  evidenceIds: string[];
  verification: 'documented' | 'observed' | 'unverified';
  limitation: string;
}
export type RuleRegistry = Readonly<Record<string, RuleRecord>>;

export const evidenceSources: Readonly<Record<string, Evidence>> = {
  L14:{id:'L14',kind:'local_source',reviewedAt:'2026-10-18',uri:'docs/tarot-dinero-deck04d.md',summary:'Ermitaño y Templanza: caps20/50, ingresos y uso sin objetivos inspeccionados en card.lua/game.lua de Steam1.0.1o-FULL. No partida observada.'},
  L13:{id:'L13',kind:'local_source',reviewedAt:'2026-10-18',uri:'docs/evidencia/arcana/README.md',summary:'Arcana: tamaño/precio/elecciones, mano robada una vez, Mega sin nuevo robo, uso directo y retorno a tienda, Soul/Omen Globe inspeccionados en Steam1.0.1o-FULL. Sin partida observada.'},
  L12:{id:'L12',kind:'local_source',reviewedAt:'2026-10-17',uri:'docs/evidencia/tarot/README.md',summary:'Doce Tarot dirigidos: límites, reemplazo de mejoras, cambios de palo, historial y refresco de debuff inspeccionados en Steam1.0.1o-FULL. Sin observación de partida.'},
  L11:{id:'L11',kind:'local_source',reviewedAt:'2026-10-17',uri:'docs/sobres-shop02b.md',summary:'Apertura, precio, elección y omisión de Buffoon/Celestial, Planet y hooks inspeccionados en el ejecutable Steam1.0.1o-FULL. No partida observada.'},
  L10:{id:'L10',kind:'local_source',reviewedAt:'2026-10-17',uri:'docs/compras-vales-shop02a.md',summary:'Compra de vales: can_redeem, redeem, selección de pool y efectos de Card:apply_to_run inspeccionados en Steam1.0.1o-FULL; no partida observada.'},
  L09:{id:'L09',kind:'local_source',reviewedAt:'2026-10-16',uri:'docs/comparacion-ciegas-tag01b.md',summary:'TAG01b: parámetros Economy/Investment, callback de salto y consumo en cobro inspeccionados en Steam 1.0.1o-FULL; no observados en partida.'},
  L08:{id:'L08',kind:'local_source',reviewedAt:'2026-10-12',uri:'docs/comodines-cat04.md',summary:'FamiliasCAT04, contexto, sucesos aleatorios declarados y efectos sobre ronda/tienda/mazo; evidencia estática local.'},
  L07:{id:'L07',kind:'local_source',reviewedAt:'2026-10-12',uri:'docs/comodines-cat03.md',summary:'Card:calculate_joker, add_to_deck, remove_from_deck, state_events en 1.0.1o-FULL. Inspección estática, no gameplay.'},
  L06:{id:'L06',kind:'local_source',reviewedAt:'2026-10-12',uri:'docs/vales.md',summary:'Parámetros, prerrequisitos, arte y efectos persistentes de vales en game.lua y Card:apply_to_run del ejecutable 1.0.1o-FULL.'},
  L05:{id:'L05',kind:'local_source',reviewedAt:'2026-10-12',uri:'docs/cobro-automatico.md',summary:'Inspección local de game.lua, card.lua y functions/state_events.lua: vales de interés.'},
  L04:{id:'L04',kind:'local_source',reviewedAt:'2026-10-11',uri:'docs/comodines-cat02.md',summary:'33 efectos CAT02: parámetros y condiciones inspeccionados en game.lua, card.lua y state_events.lua de la instalación 1.0.1o. Sin observación en partida.'},
  L03:{id:'L03',kind:'local_source',reviewedAt:'2026-10-11',uri:'docs/evidencia/barajas-l03.md',summary:'Condiciones de las 15 barajas en game.lua, back.lua, card.lua y funciones de tienda/cobro de 1.0.1o. Inspección estática, no partida observada.'},
  L01: {
    id: 'L01', kind: 'local_source', reviewedAt: '2026-10-09',
    uri: 'docs/evidencia/h2-inspeccion-local.md',
    summary: 'Lectura estática del ejecutable instalado 1.0.1o-FULL, hashes y ubicaciones registrados. No es ejecución de una partida ni autenticación de distribución.'
  },
  P01: {
    id: 'P01', kind: 'primary_document', reviewedAt: '2026-10-08',
    uri: 'https://steamcommunity.com/games/2379780/announcements/detail/4208127528883891676',
    summary: 'Anuncio de LocalThunk recuperado vía Steam API en T01; confirma el parche y Banner +30. No es ejecución del juego.'
  },
  D01: {
    id: 'D01', kind: 'secondary_document', reviewedAt: '2026-10-08',
    uri: 'https://teemo.dev/game-design/balatro/systems/economy-money-interest-and-the-shop/',
    summary: 'Describe interés anterior al cobro y tope base; build local no observada.'
  },
  D02: {
    id: 'D02', kind: 'secondary_document', reviewedAt: '2026-10-08',
    uri: 'https://balatrogame.fandom.com/wiki/Guide%3A_Activation_Sequence',
    summary: 'Contenido indexado sitúa incremento de Green antes de puntuar; no es prueba directa.'
  },
  D03: {
    id: 'D03', kind: 'secondary_document', reviewedAt: '2026-10-08',
    uri: 'https://balatrogame.fandom.com/wiki/Green_Joker',
    summary: 'Texto indexado: crecimiento por mano, reducción por descarte, suelo cero.'
  },
  D04: {
    id: 'D04', kind: 'secondary_document', reviewedAt: '2026-10-08',
    uri: 'docs/reglas-y-fuentes.md',
    summary: 'Registro documental H0 con enlaces individuales para configuración, manos, comodines, precios y ciegas.'
  }
};

function rule(id: string, status: RuleStatus, claim: string, evidenceIds: string[], limitation: string): RuleRecord {
  return { id, status, claim, scope: PROPOSED_RULESET, evidenceIds,
    verification: status === 'confirmed' ? 'documented' : 'unverified', limitation };
}
const registry: RuleRegistry = Object.fromEntries([
  rule('version.compatibility', 'pending', 'El contrato propuesto coincide con la build del jugador.', ['P01'], 'Faltan versión, plataforma y mods del jugador; el anuncio solo prueba existencia del parche.'),
  rule('base.configuration', 'provisional', 'Configuración Blue/White y recursos descritos en R-BASE.', ['D04'], 'Valores documentales sin contraste local; no se inyectan al guardar.'),
  rule('score.base', 'provisional', 'Valores de cartas y bases de manos descritos en R-BASE.', ['D04'], 'Sin prueba de puntuación de la build objetivo.'),
  rule('shop.prices', 'provisional', 'Precios y ventas base de R-J.', ['D04'], 'No sustituir valores observados ni validar estructura con precios del catálogo.'),
  rule('blind.effects', 'provisional', 'Objetivos y efectos de R-BLIND.', ['D04'], 'Verificar por jefe cuando se implemente su soporte, no como puerta de H1.'),
  rule('interest.formula', 'provisional', 'Un dólar por cada cinco de saldo, con tope base de cinco.', ['D01'], 'Casos de frontera preparados; sin observaciones del juego.'),
  rule('interest.timing', 'pending', 'Interés calculado antes de añadir recompensa, manos y Golden del mismo cobro.', ['D01'], 'U1: falta comparar saldo anterior, líneas de cobro y saldo posterior.'),
  rule('green.changes', 'provisional', 'Incremento por mano y decremento por acción de descarte, con suelo cero.', ['D03'], 'Contador observado se guarda tal cual; no se aplica la regla en H1.'),
  rule('green.timing', 'pending', 'La mano actual utiliza el contador ya incrementado.', ['D02', 'D03'], 'U2: faltan puntos de mano y contador antes/después; el contador final no basta.'),
  rule('banner.effect', 'confirmed', 'Banner cambia a 30 fichas por descarte en el parche 1.0.1f.', ['P01'], 'Confirmación documental del cambio, no observación en la instalación del jugador.'),
  ...['joker', 'half_joker', 'abstract_joker', 'even_steven', 'scholar', 'golden_joker'].map(id =>
    rule(`${id}.effect`, 'provisional', `Efecto de ${id} descrito en R-J.`, ['D04'], 'Evidencia secundaria; activación no verificada contra el juego.'))
].map(entry => [entry.id, entry]));

/** Return a copy so a caller cannot promote a production rule by mutating shared metadata. */
export function getRuleRegistry(): RuleRegistry { return structuredClone(registry); }

export interface RuleLimitation {
  ruleId: string;
  status: RuleStatus | 'missing';
  evidenceIds: string[];
  message: string;
}
export interface AnalysisGate {
  status: 'documented' | 'limited' | 'abstain';
  limitations: RuleLimitation[];
  /** True only for observed evidence, never inferred from a passing software test. */
  verifiedAgainstGame: boolean;
}

export function assessRuleEvidence(requiredIds: readonly string[], rules: RuleRegistry = getRuleRegistry()): AnalysisGate {
  const limitations: RuleLimitation[] = [];
  let blocked = false, provisional = false;
  for (const id of new Set(requiredIds)) {
    const entry = Object.hasOwn(rules, id) ? rules[id] : undefined;
    if (!entry) {
      limitations.push({ ruleId: id, status: 'missing', evidenceIds: [], message: 'No existe una regla registrada; abstenerse.' });
      blocked = true;
    } else {
      if (entry.status === 'pending') blocked = true;
      if (entry.status === 'provisional') provisional = true;
      if (entry.status !== 'confirmed' || entry.verification !== 'observed') {
        limitations.push({ ruleId: id, status: entry.status, evidenceIds: [...entry.evidenceIds], message: entry.limitation });
      }
    }
  }
  return { status: blocked ? 'abstain' : provisional ? 'limited' : 'documented', limitations,
    verifiedAgainstGame: requiredIds.length > 0 && requiredIds.every(id =>
      Object.hasOwn(rules, id) && rules[id]?.status === 'confirmed' && rules[id]?.verification === 'observed') };
}

export const analysisDependencies = {
  interest: ['version.compatibility', 'interest.formula', 'interest.timing'],
  green_joker: ['version.compatibility', 'score.base', 'green.changes', 'green.timing'],
  banner: ['version.compatibility', 'base.configuration', 'score.base', 'banner.effect']
} as const;
export type AnalysisKind = keyof typeof analysisDependencies;

/** A future analysis must call this before calculation. There is no analysis engine in H1. */
export function assessAnalysis(state: GameState, kind: AnalysisKind, rules: RuleRegistry = getRuleRegistry()): AnalysisGate {
  const result = assessRuleEvidence(analysisDependencies[kind], rules);
  const matches = <T>(actual: { status: 'known'; value: T } | { status: 'unknown' }, expected: T) =>
    actual.status === 'known' && actual.value === expected;
  const contextMatches = state.rulesetId === PROPOSED_RULESET
    && matches(state.observed.gameVersion, '1.0.1f-FULL')
    && matches(state.observed.gamePlatform, 'pc-steam')
    && matches(state.observed.modsPresent, false)
    && matches(state.observed.deckId, 'blue') && matches(state.observed.stakeId, 'white');
  const scopeMatches = analysisDependencies[kind].every(id => rules[id]?.scope === state.rulesetId);
  if (!contextMatches || !scopeMatches) {
    result.status = 'abstain'; result.verifiedAgainstGame = false;
    result.limitations.push({ ruleId: 'version.compatibility', status: 'pending', evidenceIds: [],
      message: 'Versión/plataforma/mods/baraja/dificultad desconocidos o fuera del contrato propuesto; se puede guardar, no analizar.' });
  }
  return result;
}
