import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import type {Fact,GameStateV01,GameStateV02,Result} from './state/model.js';
import type {PackAction,PackEntry} from './state/pack-contract.js';
import {applyPackAction} from './rules/pack-shop.js';
import {analysisBinding,CONFIRMED_STORAGE_KEY,createConfirmedStore} from './storage/confirmed-store.js';

const known=<T>(value:T):Fact<T>=>({status:'known',source:'manual',value});
const value=<T>(fact:Fact<T>):T=>{if(fact.status!=='known')throw new Error(fact.reason);return fact.value;};
const ok=<T>(result:Result<T>):T=>{if(!result.ok)throw new Error(JSON.stringify(result.errors));return result.value;};
const time='2026-10-18T02:00:00Z';
const legacy=JSON.parse(readFileSync('examples/shop-purchase.json','utf8'))as GameStateV01;
const state:GameStateV02={...legacy,schemaVersion:'0.2',phase:'shop',phaseData:{origin:known({ante:1,kind:'small'})}};
state.observed.money=known(20);
state.observed.jokerContext=known({consumables:known([{instanceId:'keep-a',catalogId:'c_fool',kind:'tarot',edition:'base',sellValue:1},{instanceId:'keep-b',catalogId:'c_emperor',kind:'tarot',edition:'base',sellValue:1}]),consumableSlots:known(2),tarotsUsed:known(7)});
value(state.observed.shop).packOffers=[{offerId:'observed-arcana',catalogId:'arcana-mega',price:known(8)}];
const memory=new Map<string,string>(),port={getItem:(key:string)=>memory.get(key)??null,setItem:(key:string,data:string)=>{memory.set(key,data);}},store=createConfirmedStore(()=>port);
let record=ok(store.initialize(state));
function confirm(id:string,action:PackAction){record=ok(store.confirm({confirmationId:id,confirmed:true,expected:analysisBinding(record.state),updatedAt:time,action}));return record.state;}
confirm('bought-arcana',{type:'buy_pack',offerId:'observed-arcana'});
const contents:PackEntry[]=[{entryId:'chariot',kind:'tarot',catalogId:'c_chariot'},{entryId:'star',kind:'tarot',catalogId:'c_star'},{entryId:'sun',kind:'tarot',catalogId:'c_sun'},{entryId:'fool',kind:'unsupported',catalogId:'c_fool'},{entryId:'soul',kind:'unsupported',catalogId:'c_soul'}];
confirm('visible-contents',{type:'observe_pack',contents});
confirm('drawn-hand',{type:'observe_pack_hand',cardIds:['8S','8H','KS','2C','3C','4C','5C','6C']});
const original=structuredClone(record.state),raw=memory.get(CONFIRMED_STORAGE_KEY);
const firstAction:PackAction={type:'choose_pack_item',entryId:'chariot',targetCardIds:['KS']};
const preview=applyPackAction(record.state,firstAction,{expectedRevision:record.state.revision,updatedAt:time});
if(!preview.ok)throw new Error(JSON.stringify(preview.errors));
assert.deepEqual(record.state,original);assert.equal(memory.get(CONFIRMED_STORAGE_KEY),raw);
const first=confirm('chariot-used',firstAction);assert.equal(first.phase,'open_pack');
const reloaded=ok(createConfirmedStore(()=>port).load());assert.deepEqual(reloaded,record);
const second=confirm('star-used',{type:'choose_pack_item',entryId:'star',targetCardIds:['KS']});assert.equal(second.phase,'shop');
const deck=value(second.observed.deck);assert.ok('cards'in deck);const transformed=deck.cards.find(card=>card.instanceId==='KS');assert.ok(transformed);assert.equal(transformed.enhancement,'steel');assert.equal(transformed.suit,'D');assert.equal(value(value(second.observed.jokerContext!).tarotsUsed!),9);assert.equal(value(second.observed.money),12);assert.deepEqual(value(second.observed.jokerContext!).consumables,value(state.observed.jokerContext!).consumables);
const undone=ok(store.undoLatest({confirmationId:'undo-star',confirmed:true,expected:analysisBinding(record.state),updatedAt:time,targetEntryId:'star-used',reason:'Ejemplo de corrección: la segunda carta aún no se había usado.'}));assert.equal(undone.state.phase,'open_pack');
console.log(JSON.stringify({demo:'Arcana Mega observado · dos usos en la misma mano',
 example:'Sintético, no es una observación de una partida. No determina los mejores objetivos ni el orden de robo.',
 consultation:{writes:0,inputUnchanged:true,cardChanges:preview.value.cardChanges,trace:preview.trace,limitations:preview.value.limitations},
 first:{phase:first.phase,remaining:first.phase==='open_pack'?first.phaseData.context?.remainingChoices:undefined,held:first.phase==='open_pack'?first.phaseData.context?.heldCardIds:undefined},
 reloadedMatches:true,second:{phase:second.phase,money:value(second.observed.money),card:transformed,tarotsUsed:value(value(second.observed.jokerContext!).tarotsUsed!),ownedConsumablesUnchanged:true},
 undo:{phase:undone.state.phase,remaining:undone.state.phase==='open_pack'?undone.state.phaseData.context?.remainingChoices:undefined,held:undone.state.phase==='open_pack'?undone.state.phaseData.context?.heldCardIds:undefined},
 evidence:preview.evidence
},null,2));
