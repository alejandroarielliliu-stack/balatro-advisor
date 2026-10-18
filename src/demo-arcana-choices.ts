import assert from 'node:assert/strict';
import {createNewRun} from './run/start.js';
import type {Fact,GameStateV02,Result} from './state/model.js';
import {compareArcanaChoices} from './advisor/arcana-choices.js';

const known=<T>(value:T):Fact<T>=>({status:'known',source:'manual',value});
const ok=<T>(result:Result<T>):T=>{if(!result.ok)throw Error(JSON.stringify(result.errors));return result.value;};
const initial=ok(createNewRun({runId:'arcana-choice-demo',updatedAt:'2026-10-18T16:00:00Z',deckId:'blue',profileConfirmed:true}));
const state:GameStateV02={...initial,phase:'open_pack',phaseData:{packId:known('arcana'),returnTo:'shop',context:{offerId:'arcana',shopId:'shop',catalogId:'arcana-normal',paid:4,remainingChoices:1,contents:known([{entryId:'steel',kind:'tarot',catalogId:'c_chariot'},{entryId:'wild',kind:'tarot',catalogId:'c_lovers'},{entryId:'lucky',kind:'tarot',catalogId:'c_magician'}]),selectedEntryIds:[],shopOrigin:known({ante:1,kind:'small'}),heldCardIds:known(['KS','QH','8S','8H','2C','3C','4C','5C'])}}};
state.observed.money=known(16);state.observed.shop=known({shopId:'shop',cardOffers:[],voucherOffers:[],packOffers:[],ignoredOtherOffers:[]});
state.observed.jokers=known([{instanceId:'mime',catalogId:'mime',counters:{},sellValue:known(2),edition:known('base'),stickers:known([])}]);
const before=structuredClone(state),report=ok(compareArcanaChoices(state));assert.deepEqual(state,before);
const selected=report.options.find(option=>option.entryId==='steel'&&option.targetCardIds[0]==='KS')!;
console.log(JSON.stringify({demo:'Comparar Tarot y objetivos de Arcana · sin guardar',synthetic:true,inputRevision:report.inputRevision,inputUnchanged:true,
 coverage:report.coverage,recommendation:report.recommendation,
 example:{label:selected.label,targets:selected.targetCardIds,cardChanges:selected.cardChanges,sectionDeltas:selected.composition!.sections.map(section=>({id:section.id,before:section.before,after:section.after,delta:section.delta})),money:selected.consequences!.money,sacrifices:selected.sacrifices,evidence:selected.evidence.status},
 limitations:report.limitations},null,2));
