import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {standardDeck} from '../src/catalog/initial.js';
import type {GameState,GameStateV01,GameStateV02,Result} from '../src/state/model.js';
import type {TarotAction} from '../src/state/tarot-contract.js';
import {validateState} from '../src/state/validation.js';
import {analysisBinding,CONFIRMED_STORAGE_KEY,createConfirmedStore,validateConfirmedRecord} from '../src/storage/confirmed-store.js';
import {known,MemoryStorage,success} from './helpers.js';

const time='2026-10-17T20:00:00Z';
const unknown={status:'unknown',reason:'Mano todavía no observada.'} as const;
const legacy=():GameStateV01=>JSON.parse(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8')) as GameStateV01;
const consumable=(instanceId='steel-a',catalogId='c_chariot')=>({instanceId,catalogId,kind:'tarot' as const,edition:'base' as const,sellValue:1});
/** Synthetic inputs. The expected 2S enhancement/count/balance literals below are
 * authored independently of H2; no projected output supplies a test oracle. */
function fixture():GameStateV02{
 const state:GameStateV02={...legacy(),schemaVersion:'0.2',phase:'in_round',phaseData:{
  blind:known({ante:1,kind:'big'}),handsRemaining:known(4),discardsRemaining:known(2),score:known(37),heldCardIds:known(['2S','3H'])
 }};
 state.observed.deck=known({cards:standardDeck()});
 state.observed.money=known(20);
 state.observed.jokerContext=known({consumables:known([consumable(),consumable('steel-b'),consumable('strength','c_strength')]),tarotsUsed:known(7),consumableSlots:known(3)});
 return state;
}
function current(state:GameState):GameStateV02{assert.equal(state.schemaVersion,'0.2');return state as GameStateV02;}
function round(state:GameState){const s=current(state);assert.equal(s.phase,'in_round');if(s.phase!=='in_round')throw Error('Not a round');return s.phaseData;}
function context(state:GameState){const c=state.observed.jokerContext;assert.ok(c?.status==='known');return c.value;}
function cards(state:GameState){const d=state.observed.deck;assert.ok(d.status==='known'&&'cards' in d.value);return d.value.cards;}
const header=(state:GameState,id:string)=>({confirmationId:id,confirmed:true,expected:analysisBinding(state),updatedAt:time});
const request=(state:GameState,id:string,action:TarotAction)=>({...header(state,id),action});
const use=(state:GameState,id='use-steel',instanceId='steel-a',targetCardIds=['2S'])=>request(state,id,{type:'use_tarot',instanceId,targetCardIds});
function code(result:Result<unknown>){assert.ok(!result.ok,JSON.stringify(result));assert.ok(result.errors[0]!.message);return result.errors[0]!.code;}
function setup(state:GameState=fixture()){
 const memory=new MemoryStorage(),store=createConfirmedStore(()=>memory);
 success(store.initialize(state));return {state,memory,store};
}

test('DECK04a observar mano registra solo IDs reales; mantiene puntuación, recursos y consumibles al recargar',()=>{
 const input=fixture();round(input).heldCardIds=unknown;
 const {state,store,memory}=setup(input),copy=structuredClone(state),oldRaw=memory.getItem(CONFIRMED_STORAGE_KEY);
 const saved=success(store.confirm(request(state,'hand',{type:'observe_round_hand',cardIds:['2S','3H']})));
 assert.deepEqual(round(saved.state).heldCardIds,known(['2S','3H']));assert.equal(saved.state.revision,1);
 assert.deepEqual(saved.state.observed,state.observed);assert.deepEqual(saved.state.assumptions,state.assumptions);
 assert.deepEqual(round(saved.state).score,known(37));assert.deepEqual(round(saved.state).handsRemaining,known(4));assert.deepEqual(round(saved.state).discardsRemaining,known(2));
 assert.deepEqual(state,copy);assert.notEqual(memory.getItem(CONFIRMED_STORAGE_KEY),oldRaw);
 assert.deepEqual(saved.history[0]!.action,{type:'observe_round_hand',cardIds:['2S','3H']});assert.equal(saved.history[0]!.kind,'action');
 assert.deepEqual(success(createConfirmedStore(()=>memory).load()),saved);success(validateConfirmedRecord(saved));
 const empty=success(store.confirm(request(saved.state,'empty-hand',{type:'observe_round_hand',cardIds:[]})));
 assert.deepEqual(round(empty.state).heldCardIds,known([]));assert.deepEqual(empty.state.observed,saved.state.observed);
});

test('DECK04a Chariot poseído convierte 2S a acero, consume una sola copia y Tarot7→8 sin dinero ni jugadas',()=>{
 const {state,store,memory}=setup(),copy=structuredClone(state),action=use(state),actionCopy=structuredClone(action);
 const saved=success(store.confirm(action));
 assert.deepEqual(cards(saved.state).find(c=>c.instanceId==='2S'),{instanceId:'2S',rank:'2',suit:'S',edition:'base',enhancement:'steel',seal:'none',extraChips:0,debuff:false});
 assert.deepEqual(cards(saved.state).filter(c=>c.instanceId!=='2S'),cards(state).filter(c=>c.instanceId!=='2S'));
 assert.deepEqual(context(saved.state).consumables,known([consumable('steel-b'),consumable('strength','c_strength')]));
 assert.deepEqual(context(saved.state).tarotsUsed,known(8));assert.deepEqual(saved.state.observed.money,known(20));
 assert.deepEqual(saved.state.observed.resources,state.observed.resources);assert.deepEqual(saved.state.observed.jokers,state.observed.jokers);
 assert.deepEqual(saved.state.observed.shop,state.observed.shop);assert.deepEqual(round(saved.state),round(state));
 assert.deepEqual(saved.state.assumptions,state.assumptions);assert.deepEqual(state,copy);assert.deepEqual(action,actionCopy);
 assert.equal(saved.state.revision,1);assert.equal(saved.history.length,1);assert.deepEqual(saved.history[0]!.before,state);
 assert.deepEqual(saved.history[0]!.action,{type:'use_tarot',instanceId:'steel-a',targetCardIds:['2S']});
 assert.ok(saved.history[0]!.evidence?.limitations.length);assert.equal(saved.history[0]!.evidence?.verifiedAgainstGame,false);
 assert.deepEqual(success(createConfirmedStore(()=>memory).load()),saved);
});

test('DECK04a consulta y H2 hipotético no escriben; una confirmación no admite estados ni procedencia inventada',()=>{
 const {state,store,memory}=setup(),raw=memory.getItem(CONFIRMED_STORAGE_KEY),writes=memory.writes;
 const loaded=success(store.load())!;round(loaded.state).heldCardIds=known(['KS']);cards(loaded.state).find(c=>c.instanceId==='2S')!.enhancement='steel';
 assert.deepEqual(success(store.load())!.state,state);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);assert.equal(memory.writes,writes);
 assert.equal(code(store.confirm({...use(state),confirmed:false})),'confirmation_required');
 for(const extra of [{projectedState:loaded.state},{action:{type:'use_tarot',instanceId:'steel-a',targetCardIds:['2S'],knowledge:'hypothetical'}},{action:{type:'observe_round_hand',cardIds:['2S'],basis:'Robo supuesto.'}},{action:{type:'use_consumable',instanceId:'steel-a',correction:{cards:cards(loaded.state)}}}])
  assert.ok(!store.confirm({...use(state),...extra}).ok);
 assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);assert.equal(memory.writes,writes);
});

test('DECK04a revisión y duplicado impiden consejo antiguo, pero otra copia de Chariot puede usarse con ID nuevo',()=>{
 const {state,store,memory}=setup(),first=success(store.confirm(use(state))),raw=memory.getItem(CONFIRMED_STORAGE_KEY);
 assert.equal(code(store.confirm(use(state))),'duplicate_confirmation');
 assert.equal(code(store.confirm(use(state,'old-analysis','steel-b',['3H']))),'stale_revision');
 assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);
 const second=success(store.confirm(use(first.state,'use-second','steel-b',['3H'])));
 assert.equal(second.state.revision,2);assert.deepEqual(context(second.state).tarotsUsed,known(9));
 assert.deepEqual(context(second.state).consumables,known([consumable('strength','c_strength')]));
 assert.equal(cards(second.state).find(c=>c.instanceId==='2S')!.enhancement,'steel');assert.equal(cards(second.state).find(c=>c.instanceId==='3H')!.enhancement,'steel');
 assert.deepEqual(second.history.map(e=>e.id),['use-steel','use-second']);assert.deepEqual(success(store.load()),second);
});

test('DECK04a cuota al observar, usar y deshacer conserva documento entero y permite reintentar el mismo ID',()=>{
 const input=fixture();round(input).heldCardIds=unknown;const {store,memory}=setup(input);let record=success(store.load())!;
 for(const action of [{type:'observe_round_hand',cardIds:['2S','3H']},{type:'use_tarot',instanceId:'steel-a',targetCardIds:['2S']}] as TarotAction[]){
  const req=request(record.state,'step-'+record.state.revision,action),before=structuredClone(req),raw=memory.getItem(CONFIRMED_STORAGE_KEY),writes=memory.writes;
  memory.failWrite=true;assert.equal(code(store.confirm(req)),'storage_write');assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);assert.equal(memory.writes,writes);assert.deepEqual(success(store.load()),record);assert.deepEqual(req,before);
  memory.failWrite=false;record=success(store.confirm(req));
 }
 const undo={...header(record.state,'undo-steel'),targetEntryId:'step-1',reason:'No utilicé el Tarot.'},raw=memory.getItem(CONFIRMED_STORAGE_KEY);
 memory.failWrite=true;assert.equal(code(store.undoLatest(undo)),'storage_write');assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);assert.deepEqual(success(store.load()),record);
 memory.failWrite=false;const undone=success(store.undoLatest(undo));assert.equal(undone.state.revision,3);assert.equal(cards(undone.state).find(c=>c.instanceId==='2S')!.enhancement,'none');assert.deepEqual(context(undone.state).tarotsUsed,known(7));
});

test('DECK04a deshacer restaura carta, Tarot e historial de uso sin borrar entrada ni reutilizar su ID',()=>{
 const {state,store,memory}=setup(),used=success(store.confirm(use(state)));
 const undone=success(store.undoLatest({...header(used.state,'undo'),targetEntryId:'use-steel',reason:'Registré la carta equivocada.'}));
 assert.equal(undone.state.revision,2);assert.deepEqual(undone.state.observed,state.observed);assert.deepEqual(round(undone.state),round(state));
 assert.deepEqual(undone.history.map(e=>e.kind),['action','undo']);assert.deepEqual(success(createConfirmedStore(()=>memory).load()),undone);
 assert.equal(code(store.confirm(use(undone.state))),'duplicate_confirmation');
 const corrected=success(store.confirm(use(undone.state,'correct-selection','steel-a',['3H'])));
 assert.equal(cards(corrected.state).find(c=>c.instanceId==='2S')!.enhancement,'none');assert.equal(cards(corrected.state).find(c=>c.instanceId==='3H')!.enhancement,'steel');
 assert.deepEqual(context(corrected.state).tarotsUsed,known(8));
});

test('DECK04a objetivos, inventario, cartas y fase ilegales fallan antes de guardar o consumir',()=>{
 const cases:[GameStateV02,TarotAction][]=[
  [fixture(),{type:'use_tarot',instanceId:'missing',targetCardIds:['2S']}],
  [fixture(),{type:'use_tarot',instanceId:'steel-a',targetCardIds:['KS']}],
  [fixture(),{type:'use_tarot',instanceId:'steel-a',targetCardIds:[]}],
  [fixture(),{type:'use_tarot',instanceId:'steel-a',targetCardIds:['2S','2S']}],
  [fixture(),{type:'observe_round_hand',cardIds:['2S','2S']}],
  [fixture(),{type:'observe_round_hand',cardIds:['not-in-deck']}]
 ];
 const unsupported=fixture();context(unsupported).consumables=known([consumable('steel-a','c_fool')]);cases.push([unsupported,{type:'use_tarot',instanceId:'steel-a',targetCardIds:['2S']}]);
 const wrongKind=fixture();context(wrongKind).consumables=known([{...consumable(),kind:'spectral'}]);cases.push([wrongKind,{type:'use_tarot',instanceId:'steel-a',targetCardIds:['2S']}]);
 const shop:GameStateV02={...fixture(),phase:'shop',phaseData:{origin:known({ante:1,kind:'small'})}};cases.push([shop,{type:'use_tarot',instanceId:'steel-a',targetCardIds:['2S']}]);
 for(const [state,action]of cases){const {store,memory}=setup(state),copy=structuredClone(state),raw=memory.getItem(CONFIRMED_STORAGE_KEY),writes=memory.writes;code(store.confirm(request(state,'illegal',action)));assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);assert.equal(memory.writes,writes);assert.deepEqual(success(store.load())!.state,state);assert.deepEqual(state,copy);}
});

test('DECK04a mano desconocida no se rellena desde probes o planes; observarla requiere una confirmación distinta',()=>{
 const state=fixture();round(state).heldCardIds=unknown;
 state.assumptions.probes=[{probeId:'hypothesis',label:'Posible 2S',playedCardIds:['2S'],discardsRemaining:2,role:'favorable'}];
 state.assumptions.roundPlans=[{planId:'draw-scenario',initialHandCardIds:['2S'],events:[{type:'discard',cardIds:['2S'],drawnCardIds:['3H']}]}];
 const {store,memory}=setup(state),raw=memory.getItem(CONFIRMED_STORAGE_KEY);assert.ok(!store.confirm(use(state)).ok);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);
 const observed=success(store.confirm(request(state,'observed',{type:'observe_round_hand',cardIds:['2S']})));
 assert.deepEqual(context(observed.state).consumables,context(state).consumables);assert.deepEqual(context(observed.state).tarotsUsed,known(7));assert.deepEqual(observed.state.assumptions,state.assumptions);
 const used=success(store.confirm(use(observed.state)));assert.deepEqual(used.state.assumptions,state.assumptions);assert.deepEqual(round(used.state).heldCardIds,known(['2S']));
});

test('DECK04a modo estricto bloquea las reglas provisionales sin escribir; el historial conserva límites en modo provisional',()=>{
 const {state,store,memory}=setup(),raw=memory.getItem(CONFIRMED_STORAGE_KEY),writes=memory.writes;
 assert.equal(code(store.confirm(use(state),{requireObserved:true})),'pending_rule');assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);assert.equal(memory.writes,writes);
 const used=success(store.confirm(use(state)));const evidence=used.history[0]!.evidence;assert.ok(evidence);assert.equal(evidence.verifiedAgainstGame,false);assert.ok(evidence.limitations.some(x=>x.status==='provisional'||x.status==='pending'));
 assert.deepEqual(success(createConfirmedStore(()=>memory).load())!.history[0]!.evidence,evidence);assert.ok(used.history[0]!.trace.length);
});

test('DECK04a un total Tarot desconocido sigue desconocido; la limitación queda guardada con el cambio independiente',()=>{
 const state=fixture();context(state).tarotsUsed=unknown;state.observed.money=unknown;state.observed.resources.jokerSlots=unknown;
 const {store,memory}=setup(state),used=success(store.confirm(use(state)));
 assert.equal(cards(used.state).find(c=>c.instanceId==='2S')!.enhancement,'steel');assert.deepEqual(context(used.state).tarotsUsed,unknown);
 assert.deepEqual(context(used.state).consumables,known([consumable('steel-b'),consumable('strength','c_strength')]));assert.deepEqual(used.state.observed.money,unknown);assert.deepEqual(used.state.observed.resources.jokerSlots,unknown);
 assert.match(used.history[0]!.reason,/total previo de Tarot usados.*no está registrado/);assert.match(used.history[0]!.reason,/no puntúa una mano/);
 assert.deepEqual(success(createConfirmedStore(()=>memory).load()),used);
});

test('DECK04a formato0.1 permanece legible y rechaza acciones Tarot; migración explícita no reejecuta nada',()=>{
 const state=legacy(),{store,memory}=setup(state),raw=memory.getItem(CONFIRMED_STORAGE_KEY)!;
 for(const action of [{type:'observe_round_hand',cardIds:['2S']},{type:'use_tarot',instanceId:'steel-a',targetCardIds:['2S']}] as TarotAction[]){assert.ok(!store.confirm(request(state,'not-migrated',action)).ok);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);}
 const held=success(store.confirm({...header(state,'legacy-hold'),action:{type:'hold'}})),before=memory.getItem(CONFIRMED_STORAGE_KEY)!,prepared=success(store.prepareMigration());
 assert.equal(prepared.requiresMigration,true);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),before);
 const migrated=success(store.migrateToCurrent({confirmed:true,expectedRaw:before}));assert.equal(migrated.schemaVersion,'confirmed-2');assert.equal(migrated.state.revision,held.state.revision);
 assert.deepEqual(migrated.history.map(e=>e.action),[{type:'hold'}]);assert.equal(success(store.exportMigrationBackup()),before);success(validateConfirmedRecord(migrated));
 const forged=JSON.parse(raw);forged.history=[{id:'fake',kind:'action',before:forged.state,after:{...forged.state,revision:1},action:{type:'use_tarot',instanceId:'steel-a',targetCardIds:['2S']},reason:'Inventado',targetEntryId:null,evidence:null,trace:[]}];forged.state={...forged.state,revision:1};assert.ok(!validateConfirmedRecord(forged).ok);
});

test('DECK04a registros0.2 anteriores y exportación con acciones Tarot conservan forma y snapshots sin migración',()=>{
 const {state,store,memory}=setup();const oldRaw=memory.getItem(CONFIRMED_STORAGE_KEY)!,loaded=success(createConfirmedStore(()=>memory).load())!;assert.deepEqual(loaded.state,state);assert.equal(success(store.prepareMigration()).requiresMigration,false);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),oldRaw);
 const used=success(store.confirm(use(state))),json=success(store.exportJson()),other=new MemoryStorage(),restored=success(createConfirmedStore(()=>other).restoreJson(json,{confirmed:true,expectedRaw:null}));
 assert.deepEqual(restored,used);assert.deepEqual(success(createConfirmedStore(()=>other).load()),used);assert.deepEqual(JSON.parse(json).initialState,state);success(validateState(restored.state));
});

test('DECK04a recibos antiguos conservan contrato; discrepancia de dinero impide guardar el efecto del Tarot',()=>{
 const {state,store,memory}=setup(),raw=memory.getItem(CONFIRMED_STORAGE_KEY);
 assert.equal(code(store.confirm({...use(state),observedAfter:{money:19,jokerIds:[],offerIds:['o1','o2']}})),'model_discrepancy');assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);
 const used=success(store.confirm({...use(state),observedAfter:{money:20,jokerIds:[],offerIds:['o1','o2']}}));assert.equal(cards(used.state).find(c=>c.instanceId==='2S')!.enhancement,'steel');assert.deepEqual(used.state.observed.money,known(20));
});

test('DECK04a modificar la devolución o el historial no modifica el documento recuperado',()=>{
 const {state,store,memory}=setup(),used=success(store.confirm(use(state))),raw=memory.getItem(CONFIRMED_STORAGE_KEY),copy=structuredClone(used);
 cards(used.state).find(c=>c.instanceId==='2S')!.enhancement='gold';context(used.history[0]!.after).tarotsUsed=known(999);round(used.history[0]!.before).heldCardIds=known([]);
 assert.deepEqual(success(store.load()),copy);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);assert.deepEqual(state,fixture());
});
