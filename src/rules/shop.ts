import {validateEffectChoices} from '../state/effect-choices.js';
import type {EffectChoice,FullEventInput} from './full-joker-contract.js';
import {bankBalance,creditLimit} from './economic-jokers.js';
import {historyEvent,historyResourceDelta} from './history-jokers.js';
import {generationEvent,generationSellingSelf,generationShopInventoryChanged} from './generation-jokers.js';
import {effectiveJokers} from './joker-context.js';
import {initialCounters} from '../catalog/joker-counters.js';
import {jokerResourceDelta} from '../catalog/joker-resources.js';
import type { GameState, JokerInstance } from '../state/model.js';
import { validateState } from '../state/validation.js';
import { jokerDefinition } from '../catalog/initial.js';
import { fail, inventory, need, plain, run, safe, stateInput, valueFact, synchronizeResourceFacts } from './core.js';
import type { EngineOptions, Trace } from './core.js';

export type ShopAction = ({ type: 'hold' } | { type: 'buy'; offerId: string; instanceId: string }
  | { type: 'sell'; instanceId: string }
  | { type: 'replace'; sellInstanceId: string; offerId: string; instanceId: string })&{choices?:EffectChoice[]};
export interface Mutation { expectedRevision: number; updatedAt: string }
export interface ShopChange { state: GameState; occupiedSlots: number; freeSlots: number; steps: GameState[] }

export function applyShopAction(input: unknown, action: ShopAction, mutation: Mutation, options: EngineOptions = {}) {
  return run<ShopChange>(['shop.actions', 'base.configuration'], options, (trace, use) => {
    let state = stateInput(input,use);
    inventory(state);const selected=validateEffectChoices(action?.choices??[]);if(!selected.ok){const e=selected.errors[0]!;fail(e.path,e.code,e.message);}
    if (!mutation || mutation.expectedRevision !== state.revision) fail('$.revision', 'stale_revision', 'Revisión obsoleta; vuelve a cargar la partida.');
    if (!action || !['hold','buy','sell','replace'].includes(action.type)) fail('$action', 'invalid_action', 'Acción no implementada.');
    const steps: GameState[] = [];
    const actions = action.type === 'replace' ? [
      { type: 'sell' as const, instanceId: action.sellInstanceId },
      { type: 'buy' as const, offerId: action.offerId, instanceId: action.instanceId }
    ] : [action];
    for (const step of actions) {
      const jokers = inventory(state);
      if (step.type === 'hold') continue;
      const before = bankBalance(need(state.observed.money, '$.observed.money'));
      if (step.type === 'sell') {
        const index = jokers.findIndex(j => j.instanceId === step.instanceId);
        if (index < 0) fail('$action.instanceId', 'missing_joker', 'El comodín a vender no existe.');
        const j = jokers[index]!;
        use('shop.prices');
        const amount = need(j.sellValue, '$.observed.jokers.' + j.instanceId + '.sellValue');
        const extra=j.counters.extraSell?need(j.counters.extraSell,'$.jokers.counters.extraSell'):0;const edition=need(j.edition,'$.edition');
        if(amount!==Math.max(1,Math.floor(editionPrice(j.catalogId,edition)/2))+extra) fail('$.observed.jokers.' + j.instanceId, 'unsupported_price', 'Valor de venta distinto del catálogo base; posible efecto no compatible.');
        if(need(j.stickers,'$.stickers').includes('eternal'))fail('$action','eternal_joker','Un comodín Eternal no se puede vender.');
        const event:FullEventInput={state,stage:'sell',cards:[],soldJoker:j,activeBlind:options.activeBlind??false,choices:selected.value,trace,use};generationSellingSelf(event,j);generationShopInventoryChanged(state,j,'remove',trace,use);historyEvent(event);
        adjustResources(state,j,-1);
        jokers.splice(jokers.indexOf(j),1);
        generationEvent(event,effectiveJokers(jokers));
        state.observed.money = valueFact(bankBalance(before + amount));
        trace.push({ ruleId: 'shop.actions', label: 'Venta', values: { instanceId: j.instanceId, before, received: amount, after: before + amount } });
      } else {
        const shop = need(state.observed.shop, '$.observed.shop');
        if (shop.cardOffers.length > 2) fail('$.observed.shop', 'unsupported_shop', 'Más de dos ofertas de cartas requiere modificadores fuera de cobertura.');
        const index = shop.cardOffers.findIndex(o => o.offerId === step.offerId);
        if (index < 0) fail('$action.offerId', 'missing_offer', 'La oferta ya no existe.');
        const offer = shop.cardOffers[index]!;
        const definition = jokerDefinition(offer.catalogId);
        if (!definition || offer.kind !== 'joker') fail('$action.offerId', 'unsupported_offer', 'La oferta no es un comodín compatible.');
        plain(offer.edition, offer.stickers, '$.observed.shop.' + offer.offerId);
        if (typeof step.instanceId !== 'string' || !step.instanceId.trim() || step.instanceId.length > 200 || jokers.some(j => j.instanceId === step.instanceId)) fail('$action.instanceId', 'invalid_id', 'La nueva instancia necesita un ID no vacío y único.');

        if(need(offer.edition,'$.offer.edition')!=='negative'&&jokers.length >= need(state.observed.resources.jokerSlots, '$.observed.resources.jokerSlots')) fail('$action', 'no_slots', 'No hay espacios; vende antes de comprar.');
        const price = need(offer.price, '$.observed.shop.' + offer.offerId + '.price');
        use('shop.prices');
        if (price !== editionPrice(offer.catalogId,need(offer.edition,'$.edition'))) fail('$action.offerId', 'unsupported_price', 'Precio distinto del catálogo base; no se reemplaza el precio observado.');
        if (before-price < -creditLimit(state)) fail('$action', 'insufficient_money', `Dinero insuficiente: ${before}, precio ${price}.`);
        if (offer.catalogId === 'green_joker') use('green.changes');
        jokers.push({ instanceId: step.instanceId, catalogId: offer.catalogId, edition: structuredClone(offer.edition),
          stickers: structuredClone(offer.stickers), sellValue: valueFact(Math.max(1,Math.floor(price/2))),
          counters: offer.catalogId === 'green_joker' ? { greenMult: valueFact(0) } : initialCounters(offer.catalogId) });
        const created=jokers[jokers.length-1]!;adjustResources(state,created,1);generationShopInventoryChanged(state,created,'add',trace,use);
        shop.cardOffers.splice(index, 1);
        state.observed.money = valueFact(bankBalance(before - price));
        trace.push({ ruleId: 'shop.actions', label: 'Compra', values: { offerId: offer.offerId, before, spent: price, after: before - price, occupied: jokers.length, free: need(state.observed.resources.jokerSlots, '$.observed.resources.jokerSlots') - jokers.length } });
      }
      synchronizeResourceFacts(state);
      state.revision = safe(state.revision + 1, '$.revision');
      state.updatedAt = mutation.updatedAt;
      const valid = validateState(state);
      if (!valid.ok) { const e = valid.errors[0]!; fail(e.path, e.code, e.message); }
      state = valid.value;
      steps.push(structuredClone(state));
    }
    const occupiedSlots = inventory(state).length;
    return { state, occupiedSlots, freeSlots: need(state.observed.resources.jokerSlots, '$.observed.resources.jokerSlots') - occupiedSlots, steps };
  });
}

/** Shared identity allocation for projected alternatives, never a real acquisition. */
export function shopPurchaseInstanceId(offerId:string,jokers:readonly JokerInstance[]):string{
 let id='new:'+offerId;while(jokers.some(j=>j.instanceId===id))id='_'+id;return id;
}
/** Each candidate starts from the same input. Rejected candidates keep their error. No strategy ranking. */
export function enumerateActions(input: unknown, mutation: Mutation, options: EngineOptions = {}) {
  return run<{ action: ShopAction; legal: boolean; errors: { code: string; message: string; path: string }[]; trace: Trace[] }[]>(['shop.actions'], options, (_trace,use) => {
    const state = stateInput(input,use), jokers = inventory(state);
    const shop = need(state.observed.shop, '$.observed.shop');
    const actions: ShopAction[] = [{ type: 'hold' }, ...jokers.map(j => ({ type: 'sell' as const, instanceId: j.instanceId }))];
    for (const offer of shop.cardOffers) {
      const instanceId=shopPurchaseInstanceId(offer.offerId,jokers);
      actions.push({ type: 'buy', offerId: offer.offerId, instanceId });
      for (const j of jokers) actions.push({ type: 'replace', sellInstanceId: j.instanceId, offerId: offer.offerId, instanceId });
    }
    return actions.map(action => { const result = applyShopAction(state, action, mutation, options);
      return { action, legal: result.ok, errors: result.ok ? [] : result.errors, trace: result.ok ? result.trace : [] }; });
  });
}

function adjustResources(state:GameState,j:import('../state/model.js').JokerInstance,direction:number){
 const delta=jokerResourceDelta([j.catalogId]);delta.handSize+=historyResourceDelta([j]).handSize;
 if(need(j.edition,'$.edition')==='negative')state.observed.resources.jokerSlots=valueFact(safe(need(state.observed.resources.jokerSlots,'$.resources.jokerSlots')+direction));
 for(const [field,amount] of [['handsPerRound',delta.hands],['discardsPerRound',delta.discards],['handSize',delta.handSize]] as const){
  if(!amount)continue;const fact=state.observed.resources[field];
  if(fact.status==='known')state.observed.resources[field]=valueFact(safe(fact.value+amount*direction));
 }
}

// Static 1.0.1o-FULL Card:set_cost (card.lua:372–373), without inflation or discounts.
export function editionPrice(id:string,edition:string){return jokerDefinition(id)!.price+(({foil:2,holo:3,holographic:3,polychrome:5,negative:5} as Record<string,number>)[edition]??0);}
