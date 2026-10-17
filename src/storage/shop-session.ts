import {packOfferSchema} from '../state/pack-contract.js';
import type {PackOffer} from '../state/pack-contract.js';
import type {GameState, Result,VoucherOffer} from '../state/model.js';
import {array, boolean, checkJsonValue, object, text} from '../state/schema.js';
import type {Schema} from '../state/schema.js';
import {voucherOfferSchema} from '../state/model.js';
import {validateState} from '../state/validation.js';
import {createConfirmedStore} from './confirmed-store.js';
import type {AnalysisBinding, ConfirmedRecord, ConfirmRequest, UndoRequest} from './confirmed-store.js';
import type {StoragePort} from './state-store.js';
import type {EngineOptions} from '../rules/core.js';
import {bindingSchema,equal,analysisBinding} from './confirmed-record.js';

type Shop = Extract<GameState['observed']['shop'], {status:'known'}>['value'];
export type ShopOffer = Shop['cardOffers'][number];
export interface ObserveJokerOffersRequest {
  confirmationId:string;
  confirmed:boolean;
  expected:AnalysisBinding;
  updatedAt:string;
  shopId:string;
  offers:ShopOffer[];
  voucherOffers?:VoucherOffer[];
  packOffers?:PackOffer[];
  /** Explicit transcription of other offers' coverage; never interpreted as purchasable contents. */
  ignoredOtherOffers?:string[];
}
const fail = (code:string,message:string,path='$shop'):Result<never> => ({ok:false,errors:[{code,message,path}]});
// Full offer fields are checked by H1's state schema below, rather than copied here.
const offerList:Schema<unknown[]>={check(value,path,errors){
  if(Array.isArray(value))return true;
  errors.push({path,code:'array',message:'Las ofertas deben ser una lista.'});return false;
}};
const observationSchema=object({confirmationId:text(),confirmed:boolean,
  expected:bindingSchema,updatedAt:text(),shopId:text(),offers:offerList
},{ignoredOtherOffers:array(text()),voucherOffers:array(voucherOfferSchema,100),packOffers:array(packOfferSchema,100)});

/**
 * The visual shop and H2 share the T09b journal, not a second storage document.
 * Observing a shelf and confirming a purchase are separate user actions. This
 * adapter never persists a preview, an analysis result or an unrelated draft.
 */
export function createShopSessionStore(getStorage:()=>StoragePort) {
  const confirmed = createConfirmedStore(getStorage);
  return {
    /** Reading returns detached copies and never initializes/migrates a run. */
    load:confirmed.load,
    observeJokerOffers(input:unknown):Result<ConfirmedRecord> {
      const errors=checkJsonValue(input);
      if(errors.length)return {ok:false,errors};
      if(!observationSchema.check(input,'$shop',errors))return {ok:false,errors};
      const request=input as ObserveJokerOffersRequest;
      const loaded=confirmed.load();
      if(!loaded.ok)return loaded;
      if(!loaded.value)return fail('not_initialized','Configura y registra la partida antes de guardar sus ofertas. No se inicializa a partir de una hipótesis.');
      const record=loaded.value,state=record.state,previous=state.observed.shop;
      if(request.voucherOffers!==undefined&&state.schemaVersion!=='0.2')return fail('migration_required','Actualiza explícitamente la partida al formato 0.2 desde Registro antes de guardar ofertas de vales.');
      if(request.packOffers!==undefined&&state.schemaVersion!=='0.2')return fail('migration_required','Actualiza explícitamente la partida al formato 0.2 desde Registro antes de guardar ofertas de sobres.');
      if(state.schemaVersion==='0.2'&&state.phase!=='shop')return fail('wrong_phase','Las ofertas solo se registran cuando estás en la tienda.');
      // Keep existing annotations only for the same shelf. A new shelf must not
      // inherit observations about vouchers/packs from a previous shop.
      const ignored=request.ignoredOtherOffers ?? (previous.status==='known' && previous.value.shopId===request.shopId
        ? previous.value.ignoredOtherOffers : ['Vales, sobres y otras cartas no registrados en este flujo.']);
      const previousVouchers=state.schemaVersion==='0.2'&&state.observed.shop.status==='known'&&state.observed.shop.value.shopId===request.shopId?state.observed.shop.value.voucherOffers:undefined;
      const vouchers=request.voucherOffers??previousVouchers;
      const previousPacks=state.schemaVersion==='0.2'&&state.observed.shop.status==='known'&&state.observed.shop.value.shopId===request.shopId?state.observed.shop.value.packOffers:undefined;
      const packs=request.packOffers??previousPacks;
      const shop={status:'known' as const,source:'manual' as const,value:{shopId:request.shopId,cardOffers:request.offers,ignoredOtherOffers:ignored,...(vouchers===undefined?{}:{voucherOffers:structuredClone(vouchers)}),...(packs===undefined?{}:{packOffers:structuredClone(packs)})}};
      const checked=validateState({...state,revision:state.revision+1,updatedAt:request.updatedAt,observed:{...state.observed,shop}});
      if(!checked.ok)return checked;
      if(request.confirmed!==true)return fail('confirmation_required','Confirma que estas son las ofertas observadas.');
      if(record.history.some(entry=>entry.id===request.confirmationId))return fail('duplicate_confirmation','Este ID ya fue registrado. No se aplica dos veces.');
      if(!equal(request.expected,analysisBinding(state)))
        return fail('stale_revision','La partida cambió. Recarga las ofertas y recalcula antes de registrarlas.');
      // No change means no history event and no invalidation of an analysis.
      // An unused ID on this no-op has not been consumed as a confirmation.
      const canonical=(value:unknown):unknown=>Array.isArray(value)?value.map(canonical):value && typeof value==='object'
        ? Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,v])=>[key,canonical(v)])):value;
      if(JSON.stringify(canonical(previous))===JSON.stringify(canonical(shop)))return {ok:true,value:record};
      return confirmed.correct({
        confirmationId:request.confirmationId,confirmed:request.confirmed,expected:request.expected,updatedAt:request.updatedAt,
        patch:{shop},
        reason:'Ofertas de tienda transcritas por el usuario. Registrar una oferta no confirma su compra.'
      });
    },
    /** H2 validates the selected operation; unsupported shelf entries can remain observed. */
    confirm(request:ConfirmRequest,options:EngineOptions={}):Result<ConfirmedRecord> {
      return confirmed.confirm(request,options);
    },
    undo(request:UndoRequest):Result<ConfirmedRecord> {
      return confirmed.undoLatest(request);
    }
  };
}
