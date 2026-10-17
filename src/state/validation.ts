import { currentGameStateSchema,legacyShape } from './model.js';
import type { GameState, GameStateV01, GameStateV02 } from './model.js';
import { MAX_STATE_BYTES, validateState as validateFrozenLegacyState } from './legacy-validation.js';
import { checkJsonValue, isObject, issue } from './schema.js';
import type { Result } from './schema.js';

export { MAX_STATE_BYTES } from './legacy-validation.js';

/** This export always validates the frozen 0.1 shape; it does not migrate it. */
export function validateLegacyState(input: unknown): Result<GameStateV01> {
  return validateFrozenLegacyState(input);
}

export function validateCurrentState(input: unknown): Result<GameStateV02> {
  const errors = checkJsonValue(input);
  if (errors.length) return { ok: false, errors };
  if (!currentGameStateSchema.check(input, '$', errors)) return { ok: false, errors };
  const state = input as GameStateV02;
  const projected=legacyShape(state as unknown as Record<string,unknown>);
  const legacy = validateLegacyState(projected);
  if (!legacy.ok) return legacy;

  if(state.observed.shop.status==='known'){
    const ids=new Set(state.observed.shop.value.cardOffers.map(o=>o.offerId));
    for(const [i,offer]of (state.observed.shop.value.voucherOffers??[]).entries()){if(ids.has(offer.offerId))issue(errors,`$.observed.shop.value.voucherOffers[${i}].offerId`,'duplicate_id','La oferta de vale necesita un identificador único en esta tienda.');ids.add(offer.offerId);}
    for(const [i,offer]of (state.observed.shop.value.packOffers??[]).entries()){if(ids.has(offer.offerId))issue(errors,`$.observed.shop.value.packOffers[${i}].offerId`,'duplicate_id','La oferta de sobre necesita un identificador único en esta tienda.');ids.add(offer.offerId);}
  }

  if(state.phase==='open_pack'&&state.phaseData.context){
    const context=state.phaseData.context,path='$.phaseData.context';
    if(state.phaseData.packId.status!=='known'||state.phaseData.packId.value!==context.offerId)
      issue(errors,`${path}.offerId`,'conflicting_reference','El sobre abierto debe identificar la misma oferta que phaseData.packId.');
    if(state.phaseData.returnTo!=='shop')issue(errors,'$.phaseData.returnTo','conflicting_reference','Un sobre con contexto de tienda debe regresar a shop.');
    if(state.observed.shop.status!=='known'||state.observed.shop.value.shopId!==context.shopId)
      issue(errors,`${path}.shopId`,'conflicting_reference','El contexto del sobre no coincide con la tienda registrada.');
    const selected=new Set<string>();
    context.selectedEntryIds.forEach((id,index)=>{
      if(selected.has(id))issue(errors,`${path}.selectedEntryIds[${index}]`,'duplicate_id','Una entrada del sobre no puede registrarse dos veces.');
      selected.add(id);
    });
    if(context.contents.status==='known'){
      const entryIds=new Set<string>(),jokerIds=new Set<string>();
      context.contents.value.forEach((entry,index)=>{
        if(entryIds.has(entry.entryId))issue(errors,`${path}.contents.value[${index}].entryId`,'duplicate_id','Las entradas del sobre necesitan identificadores únicos.');
        entryIds.add(entry.entryId);
        if(entry.kind==='joker'){
          if(jokerIds.has(entry.joker.instanceId))issue(errors,`${path}.contents.value[${index}].joker.instanceId`,'duplicate_id','Las instancias de comodines del sobre necesitan identificadores únicos.');
          jokerIds.add(entry.joker.instanceId);
        }
      });
      context.selectedEntryIds.forEach((id,index)=>{
        if(!entryIds.has(id))issue(errors,`${path}.selectedEntryIds[${index}]`,'unknown_reference','La elección no existe entre los contenidos observados.');
      });
    }else if(selected.size)issue(errors,`${path}.selectedEntryIds`,'unknown_reference','No se pueden referenciar elecciones sin contenidos observados.');
  }

  // Only structural identity references; turn legality, defaults and effects belong to H2.
  if (state.phase === 'in_round' && state.phaseData.heldCardIds.status === 'known') {
    const seen = new Set<string>();
    const deck = state.observed.deck;
    const ids = deck.status === 'known' && 'cards' in deck.value
      ? new Set(deck.value.cards.map(card => card.instanceId)) : undefined;
    state.phaseData.heldCardIds.value.forEach((id, index) => {
      const path = `$.phaseData.heldCardIds.value[${index}]`;
      if (seen.has(id)) issue(errors, path, 'duplicate_id', `Identificador repetido: ${id}.`);
      if (ids && !ids.has(id)) issue(errors, path, 'unknown_reference', `La carta ${id} no existe en el mazo explícito.`);
      seen.add(id);
    });
  }
  if ((state.phase === 'in_round' || state.phase === 'cashout')
    && state.phaseData.blind.status === 'known' && state.observed.nextBlind.status === 'known') {
    const active = state.phaseData.blind.value, next = state.observed.nextBlind.value;
    if (active.ante !== next.ante || active.kind !== next.kind) issue(errors, '$.phaseData.blind.value',
      'conflicting_reference', 'La ciega activa no coincide con la posición registrada en observed.nextBlind.');
  }
  if (new TextEncoder().encode(JSON.stringify(state)).byteLength > MAX_STATE_BYTES) {
    issue(errors, '$', 'size', 'La partida supera el límite de 1 MiB.');
  }
  return errors.length ? { ok: false, errors } : { ok: true, value: structuredClone(state) };
}

/** Accept either supported version; reading never silently changes schema or observations. */
export function validateState(input: unknown): Result<GameState> {
  const errors = checkJsonValue(input);
  if (errors.length) return { ok: false, errors };
  if (isObject(input) && input.schemaVersion === '0.2') return validateCurrentState(input);
  if (isObject(input) && Object.hasOwn(input, 'schemaVersion') && input.schemaVersion !== '0.1') {
    return { ok: false, errors: [{ path: '$.schemaVersion', code: 'unsupported_schema',
      message: 'Versión de documento no admitida. Conserva el archivo original; no se migrará automáticamente.' }] };
  }
  return validateLegacyState(input);
}

export function parseState(json: string): Result<GameState> {
  if (new TextEncoder().encode(json).byteLength > MAX_STATE_BYTES) return {
    ok: false, errors: [{ path: '$', code: 'size', message: 'El archivo supera el límite de 1 MiB.' }]
  };
  let input: unknown;
  try { input = JSON.parse(json) as unknown; }
  catch { return { ok: false, errors: [{ path: '$', code: 'invalid_json', message: 'JSON inválido: revisa comas, comillas y llaves.' }] }; }
  return validateState(input);
}

export function serializeState(input: unknown): Result<string> {
  const result = validateState(input);
  return result.ok ? { ok: true, value: JSON.stringify(result.value) } : result;
}
