import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import type {Fact,GameStateV01,GameStateV02,Result} from './state/model.js';
import type {TarotAction} from './state/tarot-contract.js';
import {applyTarotAction} from './rules/tarot.js';
import {analysisBinding,CONFIRMED_STORAGE_KEY,createConfirmedStore} from './storage/confirmed-store.js';

const known=<T>(value:T):Fact<T>=>({status:'known',source:'manual',value});
const value=<T>(fact:Fact<T>):T=>{if(fact.status!=='known')throw new Error(fact.reason);return fact.value;};
const ok=<T>(result:Result<T>):T=>{if(!result.ok)throw new Error(JSON.stringify(result.errors));return result.value;};
const time='2026-10-17T18:00:00Z';
const legacy=JSON.parse(readFileSync('examples/shop-purchase.json','utf8')) as GameStateV01;
// Synthetic in-round fixture. This is not a migration of a real shop into a claimed observed round.
const state:GameStateV02={...legacy,schemaVersion:'0.2',phase:'in_round',phaseData:{
 blind:known({ante:1,kind:'big'}),handsRemaining:known(5),discardsRemaining:known(3),score:known(0),heldCardIds:{status:'unknown',reason:'Todavía no se transcribió la mano visible.'}
}};
state.observed.jokerContext=known({consumables:known([{instanceId:'owned-chariot',catalogId:'c_chariot',kind:'tarot',edition:'base',sellValue:1}]),tarotsUsed:known(2)});
const memory=new Map<string,string>(),port={getItem:(key:string)=>memory.get(key)??null,setItem:(key:string,data:string)=>{memory.set(key,data);}},store=createConfirmedStore(()=>port);
let record=ok(store.initialize(state));
function confirm(id:string,action:TarotAction){record=ok(store.confirm({confirmationId:id,confirmed:true,expected:analysisBinding(record.state),updatedAt:time,action}));return record.state;}
confirm('observed-hand',{type:'observe_round_hand',cardIds:['8S','8H','KS']});
const original=structuredClone(record.state),raw=memory.get(CONFIRMED_STORAGE_KEY),binding=analysisBinding(record.state);
const action:TarotAction={type:'use_tarot',instanceId:'owned-chariot',targetCardIds:['KS']};
const preview=applyTarotAction(record.state,action,{expectedRevision:record.state.revision,updatedAt:time});
if(!preview.ok)throw new Error(JSON.stringify(preview.errors));
assert.deepEqual(record.state,original);assert.equal(memory.get(CONFIRMED_STORAGE_KEY),raw);
const after=confirm('chariot-used',action),afterDeck=value(after.observed.deck);assert.ok('cards'in afterDeck);
assert.equal(afterDeck.cards.find(card=>card.instanceId==='KS')!.enhancement,'steel');
assert.equal(value(value(after.observed.jokerContext!).tarotsUsed!),3);assert.equal(value(value(after.observed.jokerContext!).consumables!).length,0);
const reloaded=ok(createConfirmedStore(()=>port).load());assert.deepEqual(reloaded,record);
const stale=store.confirm({confirmationId:'old-preview',confirmed:true,expected:binding,updatedAt:time,action});assert.ok(!stale.ok);
const undone=ok(store.undoLatest({confirmationId:'undo-tarot',confirmed:true,expected:analysisBinding(record.state),updatedAt:time,targetEntryId:'chariot-used',reason:'Ejemplo: el Tarot no se había usado realmente.'}));
assert.equal(value(value(undone.state.observed.jokerContext!).consumables!).length,1);
console.log(JSON.stringify({demo:'DECK04a · Tarot propio con objetivos observados',
 consultation:{writes:0,inputUnchanged:true,cardChanges:preview.value.cardChanges,trace:preview.trace,limitations:preview.value.limitations,evidence:preview.evidence},
 confirmed:{revision:after.revision,phase:after.phase,heldCardIds:after.phase==='in_round'?after.phaseData.heldCardIds:undefined,money:after.observed.money,tarotsUsed:value(after.observed.jokerContext!).tarotsUsed,consumables:value(after.observed.jokerContext!).consumables},
 reloadedMatches:true,staleRejected:stale.errors[0]!.code,undo:{revision:undone.state.revision,consumables:value(undone.state.observed.jokerContext!).consumables},
 evidence:'Ejemplo sintético con oráculos literales de inspección estática. No demuestra observación de esta transformación en una partida de Balatro.'
},null,2));
