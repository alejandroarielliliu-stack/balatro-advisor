import {tagDefinition} from '../catalog/tags.js';
import {historyBoss,historyResourceDelta} from './history-jokers.js';
import {counterSpecs} from '../catalog/joker-counters.js';
import {advancedJoker} from '../catalog/advanced-jokers.js';
import {jokerResourceDelta} from '../catalog/joker-resources.js';
import {supportedVouchers,voucherResources} from '../catalog/vouchers.js';
import {blindRequirement} from '../catalog/blinds.js';
import {deckDefinition} from '../catalog/decks.js';
import type { Fact, GameState, Issue, JokerInstance } from '../state/model.js';
import { validateState } from '../state/validation.js';
import { ENGINE_RULESET, ENGINE_VERSION, GAME_VERSION, jokerDefinition, standardDeck } from '../catalog/initial.js';
import type { Card } from '../catalog/initial.js';
import type { AnalysisGate } from './evidence.js';
import { engineEvidence } from './engine-evidence.js';

export interface Trace { ruleId: string; label: string; values: Record<string, number | string>; }
export interface EngineOptions { requireObserved?: boolean;activeBlind?:boolean }
export type EngineResult<T> = { ok: true; value: T; trace: Trace[]; evidence: AnalysisGate; engineVersion: string; projected: true }
  | { ok: false; errors: Issue[]; evidence: AnalysisGate; engineVersion: string };
class RuleError extends Error { constructor(readonly detail: Issue) { super(detail.message); } }
export function fail(path: string, code: string, message: string): never { throw new RuleError({ path, code, message }); }
export function need<T>(fact: Fact<T>, path: string): T {
  if (fact.status === 'unknown') fail(path, 'unknown_data', `Falta dato: ${fact.reason}`);
  return fact.value;
}
// Values in a projected state are not new observations. The enclosing result always says projected:true.
export const valueFact = <T>(value: T): Fact<T> => ({ status: 'known', value, source: 'manual' });
export function safe(value: number, path = '$calculation'): number {
  if (!Number.isSafeInteger(value) || value < 0) fail(path, 'numeric_range', 'Resultado fuera del rango de enteros seguros no negativos.');
  return value;
}
export function run<T>(ids: string[], options: EngineOptions, body: (trace: Trace[], use: (id: string) => void) => T): EngineResult<T> {
  const required = new Set(['version.compatibility', ...ids]);
  const trace: Trace[] = [];
  const use = (id: string) => {
    required.add(id);
    const gate = engineEvidence([id], options.requireObserved);
    if (gate.status === 'abstain') {
      const pending = gate.limitations.find(item => item.status === 'pending' || item.status === 'missing');
      fail('$rules.' + (pending?.ruleId ?? id), 'pending_rule', pending?.message ?? `Regla pendiente: ${id}.`);
    }
  };
  try {
    for (const id of required) use(id);
    const value = body(trace, use);
    return { ok: true, value, trace, evidence: engineEvidence([...required], options.requireObserved), engineVersion: ENGINE_VERSION, projected: true };
  } catch (error) {
    if (!(error instanceof RuleError)) throw error;
    return { ok: false, errors: [error.detail], evidence: engineEvidence([...required], options.requireObserved), engineVersion: ENGINE_VERSION };
  }
}
export function stateInput(input: unknown, use: (id:string)=>void = ()=>{}, allowedPhases:readonly GameState['phase'][]=['shop']): GameState {
  const result = validateState(input);
  if (!result.ok) { const first = result.errors[0]!; fail(first.path, first.code, first.message); }
  const state = result.value;
  const observed = state.observed;
  for (const [key, expected] of [['gameVersion', GAME_VERSION], ['gamePlatform', 'pc-steam'], ['stakeId', 'white']] as const) {
    if (need(observed[key], '$.observed.' + key) !== expected) fail('$.observed.' + key, 'unsupported_context', `Este motor solo admite ${key}=${expected}. No migra versiones silenciosamente.`);
  }
  if (!deckDefinition(need(observed.deckId,'$.observed.deckId'))) fail('$.observed.deckId','unsupported_context','Baraja catalogada pero aún sin integración en H2; no se sustituyen sus condiciones por las de Azul.');
  if (state.rulesetId !== ENGINE_RULESET) fail('$.rulesetId', 'unsupported_ruleset', `Se requiere ${ENGINE_RULESET}.`);
  if (need(observed.modsPresent, '$.observed.modsPresent')) fail('$.observed.modsPresent', 'unsupported_modifier', 'Mods fuera de cobertura.');
  if (!allowedPhases.includes(state.phase)) fail('$.phase', 'wrong_phase', 'Esta operación requiere la fase: '+allowedPhases.join(', ')+'.');
  const extra = need(observed.outOfScope, '$.observed.outOfScope');
  if (!supportedVouchers(extra.vouchers)||extra.consumables.length||extra.pendingTags.length||extra.otherModifiers.length) fail('$.observed.outOfScope', 'unsupported_modifier', 'Hay vales, consumibles, tags u otros modificadores no implementados.');
  if(extra.vouchers.some(id=>!['v_seed_money','v_money_tree'].includes(id))) use('vouchers.resources');
  if(observed.jokers.status==='known'&&observed.jokers.value.some(j=>advancedJoker(j.catalogId)))use('jokers.context');
  return state;
}
export function inventory(state: GameState): JokerInstance[] {
  const jokers = need(state.observed.jokers, '$.observed.jokers');
  const slots = need(state.observed.resources.jokerSlots, '$.observed.resources.jokerSlots');
  const negatives=jokers.filter(j=>need(j.edition,'$.jokers.edition')==='negative').length;
  if (slots !== voucherResources(need(state.observed.deckId, '$.observed.deckId'),need(state.observed.outOfScope,'$.observed.outOfScope').vouchers).jokerSlots+negatives || jokers.length > slots) fail('$.observed.jokers', 'unsupported_capacity', 'Los espacios deben coincidir con la baraja, sin sobreocupación.');
  const seen = new Set<string>();
  for (const j of jokers) {
    if (!jokerDefinition(j.catalogId)) fail('$.observed.jokers.' + j.instanceId, 'unsupported_joker', `Comodín no implementado: ${j.catalogId}.`);
    
    seen.add(j.catalogId);
    plain(j.edition, j.stickers, '$.observed.jokers.' + j.instanceId);
    if (Object.keys(j.counters).some(key => !(key === 'greenMult' && j.catalogId === 'green_joker') && key!=='extraSell' && !Object.hasOwn(counterSpecs(j.catalogId),key))) fail('$.observed.jokers.' + j.instanceId + '.counters', 'unsupported_counter', 'Contador no implementado.');
  }
  return jokers;
}
export function plain(edition: Fact<string>, stickers: Fact<string[]>, path: string): void {
  if (!['base','foil','holographic','polychrome','negative'].includes(need(edition, path + '.edition')) || need(stickers, path + '.stickers').some(s=>s!=='eternal')) fail(path, 'unsupported_modifier', 'Ediciones y stickers fuera del alcance.');
}
export function greenValue(joker: JokerInstance): number {
  const value = joker.counters.greenMult;
  if (!value) fail('$.jokers.' + joker.instanceId + '.counters.greenMult', 'unknown_data', 'Falta contador Green; no se asume cero.');
  return safe(need(value, '$.jokers.' + joker.instanceId + '.counters.greenMult'));
}
export function deckCards(state: GameState): Card[] {
  const data = need(state.observed.deck, '$.observed.deck');
  if ('preset' in data) {
    if (data.preset !== 'standard52-unmodified') fail('$.observed.deck', 'unsupported_preset', 'Preset de mazo no implementado.');
    if (['abandoned','checkered','erratic'].includes(need(state.observed.deckId,'$.observed.deckId'))) fail('$.observed.deck','explicit_composition_required','Esta baraja necesita cartas explícitas: no se asume un mazo estándar.');
    return standardDeck();
  }
  const cards = data.cards;
  if (cards.length < 1 || cards.length > 200 || new Set(cards.map(c => c.instanceId)).size !== cards.length
    || cards.some(c => !['base','foil','holographic','polychrome'].includes(c.edition) || !['none','bonus','mult','wild','glass','steel','stone','gold','lucky'].includes(c.enhancement) || !['none','red','blue','gold','purple'].includes(c.seal) || !Number.isSafeInteger(c.extraChips) || c.extraChips<0)) {
    fail('$.observed.deck', 'unsupported_deck', 'Se admiten de 1 a 200 cartas base o de acero con IDs únicos, sin otras mejoras, sellos, ediciones ni fichas añadidas.');
  }
  return cards;
}
export function selectCards(state: GameState, ids: readonly string[]): Card[] {
  if (!Array.isArray(ids) || ids.length < 1 || ids.length > 5 || new Set(ids).size !== ids.length) fail('$hand', 'invalid_hand', 'Selecciona de una a cinco cartas distintas.');
  const deck = deckCards(state);
  return ids.map(id => { const card = deck.find(c => c.instanceId === id); if (!card) fail('$hand', 'unknown_card', `Carta inexistente: ${id}.`); return card; });
}
/** No tag hooks are simulated. Block only operations whose totals can depend on the pending queue. */
export function guardPendingTags(state:GameState,operation:'resources'|'cashout'){
 const context=state.observed.jokerContext;
 if(context?.status==='unknown')fail('$.observed.jokerContext','unknown_data','El contexto desconocido puede contener etiquetas que afectan recursos o cobro; confirma la cola actual.');
 if(!context)return; // absent legacy context is not silently migrated to an empty queue
 const fact=context.value.tags;
 if(!fact)return; // legacy files predate this explicit queue; no migration to fabricated []
 const tags=need(fact,'$.observed.jokerContext.tags');
 const blocked=tags.find(id=>{const definition=tagDefinition(id);return !definition||['immediate','new_blind_choice','round_start_bonus'].includes(definition.trigger);});
 if(blocked)fail('$.observed.jokerContext.tags','unsupported_tag',`Etiqueta pendiente ${blocked}: ${operation==='resources'?'los recursos de la próxima ronda':'el cobro'} requieren efectos todavía no implementados. Registra sus resultados observados.`);
}
export function resources(state: GameState) {
  guardPendingTags(state,'resources');
  const r = state.observed.resources;
  const hands = need(r.handsPerRound, '$.observed.resources.handsPerRound');
  const discards = need(r.discardsPerRound, '$.observed.resources.discardsPerRound');
  const handSize = need(r.handSize, '$.observed.resources.handSize');
  const deck={...deckDefinition(need(state.observed.deckId,'$.observed.deckId')),...voucherResources(need(state.observed.deckId,'$.observed.deckId'),need(state.observed.outOfScope,'$.observed.outOfScope').vouchers)};
  if(!deck) fail('$.observed.deckId','unsupported_context','Baraja no implementada.');
  const physical=need(state.observed.jokers,'$.observed.jokers');const delta=jokerResourceDelta(physical.map(j=>j.catalogId));delta.handSize+=historyResourceDelta(physical).handSize;deck.hands+=delta.hands;deck.discards+=delta.discards;deck.handSize+=delta.handSize;
  if (hands !== deck.hands || discards !== deck.discards || handSize !== deck.handSize) fail('$.observed.resources', 'unsupported_resources', `${deck.name}/White requiere bases ${deck.hands} manos, ${deck.discards} descartes, tamaño ${deck.handSize}; el jefe se aplica después.`);
  return { hands, discards, handSize };
}
export function blindInfo(state: GameState) {
  const blind = need(state.observed.nextBlind, '$.observed.nextBlind');
  const boss = need(blind.bossId, '$.observed.nextBlind.bossId');
  const expected=blindRequirement(blind.ante,blind.kind,boss,need(state.observed.deckId,'$.observed.deckId'));
  if(!expected.ok)fail(expected.error.path,expected.error.code,expected.error.message);
  const target = need(blind.target, '$.observed.nextBlind.target');
  if (target !== expected.target) fail('$.observed.nextBlind.target', 'target_mismatch', `Objetivo distinto del modelo: se esperaba ${expected.target}.`);
  // Reward is needed only by cashout, not by scoring.
  const effective=historyBoss(state);return {...blind,boss:effective.disabled?'none':boss,target:effective.target,expectedReward:expected.reward,disabled:effective.disabled,originalTarget:target};
}

/** Fractional Mult is retained until the final score is floored, as in the game. */
export function scalar(value:number){if(!Number.isFinite(value)||value<0||value>Number.MAX_SAFE_INTEGER)fail('$calculation','numeric_range','Factor fuera de rango.');return value;}

/** Recompute persistent resource totals after a physical inventory change. Current-round counts are separate. */
export function synchronizeResourceFacts(state:GameState){
 const physical=need(state.observed.jokers,'$.observed.jokers'),base=voucherResources(need(state.observed.deckId,'$.observed.deckId'),need(state.observed.outOfScope,'$.observed.outOfScope').vouchers);
 const delta=jokerResourceDelta(physical.map(j=>j.catalogId));delta.handSize+=historyResourceDelta(physical).handSize;
 const values={handsPerRound:base.hands+delta.hands,discardsPerRound:base.discards+delta.discards,handSize:base.handSize+delta.handSize,jokerSlots:base.jokerSlots+physical.filter(j=>need(j.edition,'$.edition')==='negative').length};
 for(const key of Object.keys(values) as (keyof typeof values)[])if(state.observed.resources[key].status==='known'&&state.observed.resources[key].value!==values[key])state.observed.resources[key]=valueFact(safe(values[key]));
}
