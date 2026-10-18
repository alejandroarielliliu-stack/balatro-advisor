import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {standardDeck} from '../src/catalog/initial.js';
import type {GameState,GameStateV01,GameStateV02,Result} from '../src/state/model.js';
import type {PackAction,PackContext,PackEntry,PackOffer} from '../src/state/pack-contract.js';
import {parseState,serializeState,validateState} from '../src/state/validation.js';
import {analysisBinding,CONFIRMED_STORAGE_KEY,createConfirmedStore,validateConfirmedRecord} from '../src/storage/confirmed-store.js';
import {known,MemoryStorage,success} from './helpers.js';

const time='2026-10-18T14:00:00Z';
const unknown={status:'unknown',reason:'Todavía no observado en el sobre.'} as const;
const legacy=():GameStateV01=>JSON.parse(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8')) as GameStateV01;
const offer=(offerId='arcana',catalogId='arcana-normal',price=4):PackOffer=>({offerId,catalogId,price:known(price)});
const hand=['2S','3H','4D','5C','6S','7H','8D','9C'];
const contents=():PackEntry[]=>[{entryId:'chariot',kind:'tarot',catalogId:'c_chariot'},{entryId:'moon',kind:'tarot',catalogId:'c_moon'},{entryId:'fool',kind:'unsupported',catalogId:'c_fool'}];
const megaContents=():PackEntry[]=>[...contents(),{entryId:'empress',kind:'tarot',catalogId:'c_empress'},{entryId:'soul',kind:'unsupported',catalogId:'c_soul'}];
/** Literal synthetic inputs. Oracles below use fixed balances, IDs, properties
 * and counters; no H2 result is used to manufacture an expected outcome. */
function fixture():GameStateV02{
 const state:GameStateV02={...legacy(),schemaVersion:'0.2',phase:'shop',phaseData:{origin:known({ante:1,kind:'small'})}};
 state.observed.money=known(20);state.observed.deck=known({cards:standardDeck()});
 state.observed.jokerContext=known({consumables:known([]),consumableSlots:known(2),tarotsUsed:known(7)});
 assert.ok(state.observed.shop.status==='known');state.observed.shop.value.packOffers=[offer(),offer('buffoon','buffoon-normal'),offer('celestial','celestial-normal')];
 return state;
}
function current(state:GameState):GameStateV02{assert.equal(state.schemaVersion,'0.2');return state as GameStateV02;}
function shelf(state:GameState){const s=current(state).observed.shop;assert.ok(s.status==='known');return s.value;}
function pack(state:GameState):PackContext{const s=current(state);assert.equal(s.phase,'open_pack');if(s.phase!=='open_pack')throw Error('Not open');assert.ok(s.phaseData.context);return s.phaseData.context;}
function context(state:GameState){const c=state.observed.jokerContext;assert.ok(c?.status==='known');return c.value;}
function cards(state:GameState){const d=state.observed.deck;assert.ok(d.status==='known'&&'cards' in d.value);return d.value.cards;}
function opened(catalogId='arcana-normal'):GameStateV02{
 const state=fixture();state.observed.money=known(catalogId==='arcana-mega'?12:16);shelf(state).packOffers=shelf(state).packOffers!.filter(p=>p.offerId!=='arcana');
 return {...state,phase:'open_pack',phaseData:{packId:known('arcana'),returnTo:'shop',context:{offerId:'arcana',shopId:'s01-shop',catalogId,paid:catalogId==='arcana-mega'?8:4,remainingChoices:catalogId==='arcana-mega'?2:1,contents:unknown,selectedEntryIds:[],shopOrigin:known({ante:1,kind:'small'}),heldCardIds:unknown}}};
}
function ready():GameStateV02{const state=opened();pack(state).heldCardIds=known([...hand]);pack(state).contents=known(contents());return state;}
const header=(state:GameState,id:string)=>({confirmationId:id,confirmed:true,expected:analysisBinding(state),updatedAt:time});
const request=(state:GameState,id:string,action:PackAction)=>({...header(state,id),action});
const choose=(state:GameState,id='use-chariot',entryId='chariot',targetCardIds=['2S'])=>request(state,id,{type:'choose_pack_item',entryId,targetCardIds});
function code(result:Result<unknown>){assert.ok(!result.ok,JSON.stringify(result));assert.ok(result.errors[0]!.message);return result.errors[0]!.code;}
function setup(state:GameState=fixture()){
 const memory=new MemoryStorage(),store=createConfirmedStore(()=>memory);success(store.initialize(state));return {state,memory,store};
}

test('DECK04b H1 conserva Tarot y mano de sobre; contextos0.2 anteriores siguen sin mano inventada ni migración',()=>{
 const state=ready(),copy=structuredClone(state);assert.deepEqual(success(parseState(success(serializeState(state)))),copy);assert.deepEqual(state,copy);
 const old=opened('buffoon-normal');delete pack(old).heldCardIds;pack(old).contents=known([{entryId:'opaque',kind:'unsupported',catalogId:'unmapped'}]);
 const oldCopy=structuredClone(old),{store,memory}=setup(old);assert.deepEqual(success(store.load())!.state,oldCopy);assert.equal(pack(success(store.load())!.state).heldCardIds,undefined);assert.equal(success(store.prepareMigration()).requiresMigration,false);
 assert.deepEqual(success(createConfirmedStore(()=>memory).load())!.state,oldCopy);assert.deepEqual(old,oldCopy);
 const opaque=opened('unmapped-pack');pack(opaque).heldCardIds=known(['2S']);pack(opaque).contents=known([{entryId:'unmapped-tarot',kind:'tarot',catalogId:'unmapped-tarot'}]);assert.ok(validateState(opaque).ok,'H1 records structure without claiming engine support.');
});

test('DECK04b H1 rechaza mano repetida, referencias falsas y formas inválidas sin aplicar reglas de tamaño',()=>{
 const invalid:unknown[]=[];
 const duplicate=ready();pack(duplicate).heldCardIds=known(['2S','2S']);invalid.push(duplicate);
 const falseRef=ready();pack(falseRef).heldCardIds=known(['phantom']);invalid.push(falseRef);
 const wrongFact=ready();Object.assign(pack(wrongFact),{heldCardIds:['2S']});invalid.push(wrongFact);
 const extra=ready();Object.assign(pack(extra),{hypotheticalDraw:['2S']});invalid.push(extra);
 for(const state of invalid)assert.ok(!validateState(state).ok);
 const large=ready();pack(large).heldCardIds=known(hand.concat('10S'));assert.ok(validateState(large).ok,'Size legality belongs to H2, not the structural schema.');
 const unknownDeck=ready();unknownDeck.observed.deck=unknown;pack(unknownDeck).heldCardIds=known(['opaque-card']);assert.ok(validateState(unknownDeck).ok,'Unknown composition does not prove a reference invalid.');
});

test('DECK04b comprar20−4=16 abre Arcana con mano y contenido desconocidos; observar no consume ni transforma',()=>{
 const {state,store,memory}=setup(),copy=structuredClone(state),bought=success(store.confirm(request(state,'buy',{type:'buy_pack',offerId:'arcana'})));
 assert.equal(bought.state.phase,'open_pack');assert.deepEqual(bought.state.observed.money,known(16));assert.equal(pack(bought.state).contents.status,'unknown');assert.equal(pack(bought.state).heldCardIds?.status,'unknown');
 assert.deepEqual(context(bought.state).consumables,known([]));assert.deepEqual(context(bought.state).tarotsUsed,known(7));assert.deepEqual(cards(bought.state),cards(state));assert.deepEqual(shelf(bought.state).cardOffers,shelf(state).cardOffers);
 const observed=success(store.confirm(request(bought.state,'contents',{type:'observe_pack',contents:contents()}))),held=success(store.confirm(request(observed.state,'hand',{type:'observe_pack_hand',cardIds:[...hand]})));
 assert.deepEqual(pack(held.state).heldCardIds,known(hand));assert.deepEqual(pack(held.state).contents,known(contents()));assert.deepEqual(held.state.observed,observed.state.observed);assert.deepEqual(held.state.observed.resources,state.observed.resources);assert.deepEqual(held.state.assumptions,state.assumptions);
 assert.equal(held.state.revision,3);assert.equal(held.history.length,3);assert.deepEqual(held.history[2]!.action,{type:'observe_pack_hand',cardIds:hand});assert.match(held.history[2]!.reason,/mano del sobre/);
 assert.deepEqual(success(createConfirmedStore(()=>memory).load()),held);assert.deepEqual(state,copy);
});

test('DECK04b elegir Chariot2S→Steel usa el Tarot directamente: total7→8 y consumibles[] sin cobro adicional',()=>{
 const {state,store,memory}=setup(ready()),copy=structuredClone(state),saved=success(store.confirm(choose(state)));
 assert.equal(saved.state.phase,'shop');assert.deepEqual(saved.state.observed.money,known(16));assert.equal(saved.state.revision,1);
 assert.deepEqual(cards(saved.state).find(c=>c.instanceId==='2S'),{instanceId:'2S',rank:'2',suit:'S',edition:'base',enhancement:'steel',seal:'none',extraChips:0,debuff:false});
 assert.deepEqual(cards(saved.state).filter(c=>c.instanceId!=='2S'),cards(state).filter(c=>c.instanceId!=='2S'));assert.deepEqual(context(saved.state).consumables,known([]));assert.deepEqual(context(saved.state).tarotsUsed,known(8));
 assert.deepEqual(saved.state.observed.resources,state.observed.resources);assert.deepEqual(saved.state.observed.jokers,state.observed.jokers);assert.deepEqual(saved.state.observed.shop,state.observed.shop);assert.deepEqual(saved.state.assumptions,state.assumptions);
 assert.deepEqual(saved.history[0]!.before,state);assert.deepEqual(saved.history[0]!.action,{type:'choose_pack_item',entryId:'chariot',targetCardIds:['2S']});assert.ok(saved.history[0]!.evidence?.limitations.length);assert.equal(saved.history[0]!.evidence?.verifiedAgainstGame,false);
 assert.deepEqual(success(createConfirmedStore(()=>memory).load()),saved);assert.deepEqual(state,copy);success(validateConfirmedRecord(saved));
});

test('DECK04b Mega conserva una mano observada entre dos usos y recarga; no permite un nuevo reparto tras elegir',()=>{
 const state=opened('arcana-mega');pack(state).contents=known(megaContents());pack(state).heldCardIds=known([...hand]);const {store,memory}=setup(state);
 const first=success(store.confirm(choose(state)));assert.equal(first.state.phase,'open_pack');assert.equal(pack(first.state).remainingChoices,1);assert.deepEqual(pack(first.state).selectedEntryIds,['chariot']);assert.deepEqual(pack(first.state).heldCardIds,known(hand));assert.deepEqual(first.state.observed.money,known(12));assert.deepEqual(context(first.state).tarotsUsed,known(8));
 const loaded=success(createConfirmedStore(()=>memory).load())!,raw=memory.getItem(CONFIRMED_STORAGE_KEY);
 assert.equal(code(store.confirm(request(loaded.state,'redraw',{type:'observe_pack_hand',cardIds:['KS',...hand.slice(1)]}))),'pack_already_selected');assert.equal(code(store.confirm(choose(loaded.state,'repeat'))),'already_selected');assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);
 const second=success(store.confirm(choose(loaded.state,'use-moon','moon',['3H'])));assert.equal(second.state.phase,'shop');assert.equal(cards(second.state).find(c=>c.instanceId==='2S')!.enhancement,'steel');
 assert.deepEqual(cards(second.state).find(c=>c.instanceId==='3H'),{instanceId:'3H',rank:'3',suit:'C',edition:'base',enhancement:'none',seal:'none',extraChips:0,debuff:false});assert.deepEqual(context(second.state).tarotsUsed,known(9));assert.deepEqual(context(second.state).consumables,known([]));assert.deepEqual(second.state.observed.money,known(12));assert.equal(second.state.revision,2);
 assert.deepEqual(success(createConfirmedStore(()=>memory).load()),second);
});

test('DECK04b deshacer elección vuelve al mismo sobre y mano sin reembolsar su compra anterior',()=>{
 const {state,store,memory}=setup(),bought=success(store.confirm(request(state,'buy',{type:'buy_pack',offerId:'arcana'}))),observed=success(store.confirm(request(bought.state,'contents',{type:'observe_pack',contents:contents()}))),held=success(store.confirm(request(observed.state,'hand',{type:'observe_pack_hand',cardIds:[...hand]}))),used=success(store.confirm(choose(held.state)));
 const undone=success(store.undoLatest({...header(used.state,'undo-use'),targetEntryId:'use-chariot',reason:'No usé el Tarot todavía.'}));assert.equal(undone.state.phase,'open_pack');assert.deepEqual(pack(undone.state),pack(held.state));assert.deepEqual(undone.state.observed,held.state.observed);assert.deepEqual(undone.state.observed.money,known(16));assert.deepEqual(context(undone.state).tarotsUsed,known(7));assert.equal(cards(undone.state).find(c=>c.instanceId==='2S')!.enhancement,'none');assert.equal(undone.state.revision,5);
 assert.deepEqual(success(createConfirmedStore(()=>memory).load()),undone);assert.equal(code(store.confirm(choose(undone.state))),'duplicate_confirmation');
 const corrected=success(store.confirm(choose(undone.state,'correct-target','chariot',['3H'])));assert.equal(cards(corrected.state).find(c=>c.instanceId==='2S')!.enhancement,'none');assert.equal(cards(corrected.state).find(c=>c.instanceId==='3H')!.enhancement,'steel');
 const fresh=setup(),purchase=success(fresh.store.confirm(request(fresh.state,'purchase',{type:'buy_pack',offerId:'arcana'}))),undoPurchase=success(fresh.store.undoLatest({...header(purchase.state,'undo-purchase'),targetEntryId:'purchase',reason:'No abrí el sobre.'}));assert.equal(undoPurchase.state.phase,'shop');assert.deepEqual(undoPurchase.state.observed.money,known(20));assert.deepEqual(undoPurchase.state.observed,fresh.state.observed);
});

test('DECK04b cuota en compra, mano, contenidos y uso conserva estado/historial enteros y permite reintentar',()=>{
 const {store,memory}=setup();let record=success(store.load())!;
 const actions:PackAction[]=[{type:'buy_pack',offerId:'arcana'},{type:'observe_pack_hand',cardIds:[...hand]},{type:'observe_pack',contents:contents()},{type:'choose_pack_item',entryId:'chariot',targetCardIds:['2S']}];
 for(const [i,action]of actions.entries()){
  const req=request(record.state,'step-'+i,action),copy=structuredClone(req),raw=memory.getItem(CONFIRMED_STORAGE_KEY),writes=memory.writes;
  memory.failWrite=true;assert.equal(code(store.confirm(req)),'storage_write');assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);assert.equal(memory.writes,writes);assert.deepEqual(success(store.load()),record);assert.deepEqual(req,copy);
  memory.failWrite=false;record=success(store.confirm(req));
 }
 assert.equal(record.state.phase,'shop');assert.deepEqual(record.state.observed.money,known(16));assert.deepEqual(context(record.state).consumables,known([]));assert.deepEqual(context(record.state).tarotsUsed,known(8));assert.equal(record.history.length,4);
 const req={...header(record.state,'undo'),targetEntryId:'step-3',reason:'Todavía no se realizó.'},raw=memory.getItem(CONFIRMED_STORAGE_KEY);memory.failWrite=true;assert.equal(code(store.undoLatest(req)),'storage_write');assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);memory.failWrite=false;assert.equal(success(store.undoLatest(req)).state.phase,'open_pack');
});

test('DECK04b confirmación, duplicados y revisión antigua protegen la elección real',()=>{
 const {state,store,memory}=setup(ready()),raw=memory.getItem(CONFIRMED_STORAGE_KEY);assert.equal(code(store.confirm({...choose(state),confirmed:false})),'confirmation_required');assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);
 const saved=success(store.confirm(choose(state))),after=memory.getItem(CONFIRMED_STORAGE_KEY);assert.equal(code(store.confirm(choose(state))),'duplicate_confirmation');assert.equal(code(store.confirm(choose(state,'old-analysis'))),'stale_revision');assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),after);
 assert.ok(!store.confirm({...choose(saved.state,'forged'),projectedState:saved.state}).ok);assert.ok(!store.confirm({...choose(saved.state,'forged'),action:{type:'choose_pack_item',entryId:'chariot',targetCardIds:['2S'],knowledge:'hypothetical'}}).ok);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),after);
});

test('DECK04b objetivos inválidos, contenidos incompatibles y efectos no implementados no se consumen parcialmente',()=>{
 const cases:[GameStateV02,PackAction,string][]=[
  [ready(),{type:'choose_pack_item',entryId:'chariot'},'missing_targets'],
  [ready(),{type:'choose_pack_item',entryId:'chariot',targetCardIds:[]},'invalid_target_count'],
  [ready(),{type:'choose_pack_item',entryId:'chariot',targetCardIds:['2S','3H']},'invalid_target_count'],
  [ready(),{type:'choose_pack_item',entryId:'chariot',targetCardIds:['KS']},'card_not_held'],
  [ready(),{type:'choose_pack_item',entryId:'chariot',targetCardIds:['phantom']},'unknown_card'],
  [ready(),{type:'choose_pack_item',entryId:'moon',targetCardIds:['2S','2S']},'duplicate_id'],
  [ready(),{type:'choose_pack_item',entryId:'fool',targetCardIds:['2S']},'unsupported_pack_item'],
  [opened(),{type:'observe_pack_hand',cardIds:['2S','3H','4D']},'incomplete_pack_hand'],
  [opened(),{type:'observe_pack_hand',cardIds:['2S','2S']},'duplicate_id'],
  [opened(),{type:'observe_pack_hand',cardIds:['phantom']},'unknown_card'],
  [opened(),{type:'observe_pack_hand',cardIds:hand.concat('10S')},'hand_too_large']
 ];
 const noHand=ready();pack(noHand).heldCardIds=unknown;cases.push([noHand,{type:'choose_pack_item',entryId:'chariot',targetCardIds:['2S']},'unknown_data']);
 const incomplete=ready();pack(incomplete).heldCardIds=known(['2S','3H','4D']);cases.push([incomplete,{type:'choose_pack_item',entryId:'chariot',targetCardIds:['2S']},'incomplete_pack_hand']);
 const opaque=ready();pack(opaque).contents=known([{entryId:'chariot',kind:'tarot',catalogId:'c_death'},contents()[1]!,contents()[2]!]);cases.push([opaque,{type:'choose_pack_item',entryId:'chariot',targetCardIds:['2S']},'unsupported_tarot']);
 const celestial=opened('celestial-normal');cases.push([celestial,{type:'observe_pack_hand',cardIds:['2S']},'incompatible_pack_action']);
 const wrongContents=opened();cases.push([wrongContents,{type:'observe_pack',contents:[{entryId:'planet',kind:'planet',catalogId:'c_mercury'},contents()[1]!,contents()[2]!]},'incompatible_pack_item']);
 for(const [state,action,expectedCode]of cases){const {store,memory}=setup(state),copy=structuredClone(state),raw=memory.getItem(CONFIRMED_STORAGE_KEY),writes=memory.writes;assert.equal(code(store.confirm(request(state,'illegal',action))),expectedCode);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);assert.equal(memory.writes,writes);assert.deepEqual(state,copy);assert.deepEqual(success(store.load())!.state,state);}
});

test('DECK04b robos hipotéticos no completan la mano del sobre ni se copian al confirmar objetivos',()=>{
 const state=opened();pack(state).contents=known(contents());state.assumptions.probes=[{probeId:'hand-hypothesis',label:'Posible mano',playedCardIds:['2S'],discardsRemaining:3,role:'favorable'}];state.assumptions.roundPlans=[{planId:'draw',initialHandCardIds:['2S'],events:[{type:'discard',cardIds:['2S'],drawnCardIds:['3H']}]}];
 const {store,memory}=setup(state),raw=memory.getItem(CONFIRMED_STORAGE_KEY);assert.ok(!store.confirm(choose(state)).ok);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);
 const observed=success(store.confirm(request(state,'observe-real',{type:'observe_pack_hand',cardIds:[...hand]}))),chosen=success(store.confirm(choose(observed.state)));
 assert.deepEqual(chosen.state.assumptions,state.assumptions);assert.deepEqual(chosen.state.observed.money,known(16));assert.deepEqual(context(chosen.state).consumables,known([]));assert.equal(cards(chosen.state).find(c=>c.instanceId==='3H')!.enhancement,'none');
});

test('DECK04b datos independientes desconocidos no bloquean transformar; límites quedan guardados al recargar',()=>{
 const state=ready();context(state).tarotsUsed=unknown;context(state).consumables=unknown;state.observed.jokers=unknown;state.observed.money=unknown;state.observed.resources.jokerSlots=unknown;
 const {store,memory}=setup(state),saved=success(store.confirm(choose(state)));
 assert.equal(cards(saved.state).find(c=>c.instanceId==='2S')!.enhancement,'steel');assert.deepEqual(context(saved.state).tarotsUsed,unknown);assert.deepEqual(context(saved.state).consumables,unknown);assert.deepEqual(saved.state.observed.jokers,unknown);assert.deepEqual(saved.state.observed.money,unknown);assert.deepEqual(saved.state.observed.resources.jokerSlots,unknown);
 assert.match(saved.history[0]!.reason,/total previo de Tarot usados.*no está registrado/);assert.ok(saved.history[0]!.evidence?.limitations.some(x=>x.ruleId==='tarot.targets'));assert.deepEqual(success(createConfirmedStore(()=>memory).load()),saved);
});

test('DECK04b formato0.1 congelado rechaza mano/sobre Tarot y0.2 previo mantiene acciones históricas legibles',()=>{
 const state=legacy(),{store,memory}=setup(state),raw=memory.getItem(CONFIRMED_STORAGE_KEY)!;
 for(const action of [{type:'observe_pack_hand',cardIds:['2S']},{type:'choose_pack_item',entryId:'chariot',targetCardIds:['2S']}] as PackAction[]){assert.ok(!store.confirm(request(state,'not-migrated',action)).ok);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);}
 const held=success(store.confirm({...header(state,'hold'),action:{type:'hold'}})),before=memory.getItem(CONFIRMED_STORAGE_KEY)!,migrated=success(store.migrateToCurrent({confirmed:true,expectedRaw:before}));assert.equal(success(store.exportMigrationBackup()),before);assert.equal(migrated.state.revision,held.state.revision);assert.deepEqual(migrated.history.map(e=>e.action),[{type:'hold'}]);success(validateConfirmedRecord(migrated));
 const old=opened('celestial-normal');delete pack(old).heldCardIds;pack(old).contents=known([{entryId:'mercury',kind:'planet',catalogId:'c_mercury'},{entryId:'venus',kind:'planet',catalogId:'c_venus'},{entryId:'earth',kind:'planet',catalogId:'c_earth'}]);context(old).planetsUsed=known([]);
 const other=setup(old),chosen=success(other.store.confirm(request(old,'old-planet-action',{type:'choose_pack_item',entryId:'mercury'})));assert.equal(chosen.state.phase,'shop');assert.deepEqual(context(chosen.state).consumables,known([]));assert.deepEqual(context(chosen.state).tarotsUsed,known(7));assert.deepEqual(success(createConfirmedStore(()=>other.memory).load()),chosen);
});

test('DECK04b exportar/restaurar conserva mano, primera elección Mega, objetivos e historial sin aliases',()=>{
 const state=opened('arcana-mega');pack(state).contents=known(megaContents());pack(state).heldCardIds=known([...hand]);const {store}=setup(state),first=success(store.confirm(choose(state))),copy=structuredClone(first),json=success(store.exportJson()),other=new MemoryStorage(),restored=success(createConfirmedStore(()=>other).restoreJson(json,{confirmed:true,expectedRaw:null}));
 assert.deepEqual(restored,copy);assert.deepEqual(pack(restored.state).heldCardIds,known(hand));assert.deepEqual(pack(restored.state).selectedEntryIds,['chariot']);assert.equal(pack(restored.state).remainingChoices,1);
 cards(first.state).find(c=>c.instanceId==='2S')!.enhancement='gold';pack(first.history[0]!.before).heldCardIds=known([]);assert.deepEqual(success(store.load()),copy);assert.deepEqual(success(createConfirmedStore(()=>other).load()),copy);
});

test('DECK04b modo estricto no eleva evidencia de Arcana a observación en partida',()=>{
 const {state,store,memory}=setup(ready()),raw=memory.getItem(CONFIRMED_STORAGE_KEY),writes=memory.writes;
 assert.equal(code(store.confirm(choose(state),{requireObserved:true})),'pending_rule');assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);assert.equal(memory.writes,writes);
 const saved=success(store.confirm(choose(state)));assert.equal(saved.history[0]!.evidence?.verifiedAgainstGame,false);assert.ok(saved.history[0]!.evidence?.limitations.length);assert.ok(saved.history[0]!.trace.length);
});
