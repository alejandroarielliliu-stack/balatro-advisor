import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import type {Fact,GameStateV01,GameStateV02,Result} from './state/model.js';
import type {PackAction,PackEntry} from './state/pack-contract.js';
import {applyPackAction} from './rules/pack-shop.js';
import {analysisBinding,CONFIRMED_STORAGE_KEY,createConfirmedStore} from './storage/confirmed-store.js';

const known=<T>(value:T):Fact<T>=>({status:'known',source:'manual',value});
const value=<T>(fact:Fact<T>):T=>{if(fact.status!=='known')throw new Error(fact.reason);return fact.value;};
const ok=<T>(r:Result<T>):T=>{if(!r.ok)throw new Error(JSON.stringify(r.errors));return r.value;};
const time='2026-10-17T18:00:00Z';
const legacy=JSON.parse(readFileSync('examples/shop-purchase.json','utf8')) as GameStateV01;
const state:GameStateV02={...legacy,schemaVersion:'0.2',phase:'shop',phaseData:{origin:known({ante:1,kind:'small'})}};
state.observed.money=known(20);
state.observed.jokerContext=known({tags:known([]),consumables:known([]),consumableSlots:known(2),planetsUsed:known([])});
if(state.observed.shop.status!=='known')throw new Error('Falta la tienda de ejemplo.');
state.observed.shop.value.packOffers=[{offerId:'observed-celestial',catalogId:'celestial-normal',price:known(4)}];
const memory=new Map<string,string>(),port={getItem:(key:string)=>memory.get(key)??null,setItem:(key:string,data:string)=>{memory.set(key,data);}},store=createConfirmedStore(()=>port);
let record=ok(store.initialize(state));
const original=structuredClone(record.state),raw=memory.get(CONFIRMED_STORAGE_KEY);
const preview=applyPackAction(record.state,{type:'buy_pack',offerId:'observed-celestial'},{expectedRevision:record.state.revision,updatedAt:time});
if(!preview.ok)throw new Error(JSON.stringify(preview.errors));
assert.deepEqual(record.state,original);assert.equal(memory.get(CONFIRMED_STORAGE_KEY),raw);
function confirm(id:string,action:PackAction){record=ok(store.confirm({confirmationId:id,confirmed:true,expected:analysisBinding(record.state),updatedAt:time,action}));return record.state;}
const opened=confirm('bought-and-opened',{type:'buy_pack',offerId:'observed-celestial'});
const contents:PackEntry[]=[{entryId:'mercury',kind:'planet',catalogId:'c_mercury'},{entryId:'jupiter',kind:'planet',catalogId:'c_jupiter'},{entryId:'pluto',kind:'planet',catalogId:'c_pluto'}];
confirm('transcribed-visible-contents',{type:'observe_pack',contents});
const chosen=confirm('used-mercury',{type:'choose_pack_item',entryId:'mercury'});
assert.equal(chosen.phase,'shop');assert.equal(value(chosen.observed.money),16);
const bases=value(chosen.observed.handBases);assert.ok('values'in bases);assert.deepEqual(value(bases.values.pair),{level:2,chips:25,mult:3});
const reloaded=ok(createConfirmedStore(()=>port).load());assert.deepEqual(reloaded,record);
const undone=ok(store.undoLatest({confirmationId:'undo-choice',confirmed:true,expected:analysisBinding(record.state),updatedAt:time,targetEntryId:'used-mercury',reason:'Ejemplo de corrección: Mercury no fue la carta elegida.'}));
assert.equal(undone.state.phase,'open_pack');
console.log(JSON.stringify({demo:'SHOP02b · Celestial observado',consultation:{writes:0,inputUnchanged:true,moneyAfter:value(preview.value.state.observed.money),contents:'unknown'},
 opened:{phase:opened.phase,money:value(opened.observed.money),context:opened.phase==='open_pack'?opened.phaseData:undefined},
 chosen:{phase:chosen.phase,money:value(chosen.observed.money),pair:{level:2,chips:25,mult:3},uniquePlanets:value(chosen.observed.jokerContext!).planetsUsed},
 reloadedMatches:true,undo:{phase:undone.state.phase,revision:undone.state.revision,paid:value(undone.state.observed.money)},
 history:undone.history.map(entry=>({id:entry.id,kind:entry.kind,action:entry.action})),
 evidence:'Ejemplo sintético con cálculos literales de inspección estática; no demuestra una comprobación directa en una partida de Balatro.'},null,2));
