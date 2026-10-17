import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import type {GameState,GameStateV01,GameStateV02,JokerInstance,Result} from '../src/state/model.js';
import type {PackAction,PackContext,PackEntry,PackOffer} from '../src/state/pack-contract.js';
import {validateState,serializeState,parseState} from '../src/state/validation.js';
import {analysisBinding,CONFIRMED_STORAGE_KEY,createConfirmedStore,validateConfirmedRecord} from '../src/storage/confirmed-store.js';
import {createShopSessionStore} from '../src/storage/shop-session.js';
import {known,MemoryStorage,success} from './helpers.js';

const time='2026-10-17T18:00:00Z';
const unknown={status:'unknown',reason:'No observado.'} as const;
const legacy=():GameStateV01=>JSON.parse(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8')) as GameStateV01;
const offer=(offerId='buffoon',catalogId='buffoon-normal',price=4):PackOffer=>({offerId,catalogId,price:known(price)});
const fixture=():GameStateV02=>{
 const state:GameStateV02={...legacy(),schemaVersion:'0.2',phase:'shop',phaseData:{origin:known({ante:1,kind:'small'})}};
 state.observed.money=known(20);
 assert.ok(state.observed.shop.status==='known');
 state.observed.shop.value.packOffers=[offer(),offer('celestial','celestial-normal'),offer('future','new-pack')];
 state.observed.shop.value.voucherOffers=[{offerId:'voucher',catalogId:'v_blank',price:known(10)}];
 return state;
};
const current=(state:GameState):GameStateV02=>{assert.equal(state.schemaVersion,'0.2');return state as GameStateV02;};
const shelf=(state:GameState)=>{const shop=current(state).observed.shop;assert.ok(shop.status==='known');return shop.value;};
const context=(state:GameState):PackContext=>{const s=current(state);assert.equal(s.phase,'open_pack');if(s.phase!=='open_pack')throw Error('Wrong phase');assert.ok(s.phaseData.context);return s.phaseData.context;};
const joker=(instanceId:string,catalogId='joker',sellValue=1):JokerInstance=>({instanceId,catalogId,edition:known('base'),stickers:known([]),sellValue:known(sellValue),counters:{}});
const buffoonContents=():PackEntry[]=>[{entryId:'choice-a',kind:'joker',joker:joker('pack-joker')},{entryId:'choice-b',kind:'joker',joker:joker('pack-half','half_joker',2)}];
const planets=():PackEntry[]=>[{entryId:'mercury',kind:'planet',catalogId:'c_mercury'},{entryId:'pluto',kind:'planet',catalogId:'c_pluto'},{entryId:'uranus',kind:'planet',catalogId:'c_uranus'}];
const header=(state:GameState,id:string)=>({confirmationId:id,confirmed:true,expected:analysisBinding(state),updatedAt:time});
const request=(state:GameState,id:string,action:PackAction)=>({...header(state,id),action});
const code=(result:Result<unknown>)=>{assert.ok(!result.ok,JSON.stringify(result));assert.ok(result.errors[0]!.message);return result.errors[0]!.code;};
function setup(state:GameState=fixture()){
 const memory=new MemoryStorage(),store=createConfirmedStore(()=>memory);
 success(store.initialize(state));return {state,memory,store,session:createShopSessionStore(()=>memory)};
}
/** Literal recorded examples and manual expectations; H2 output never supplies an oracle. */
function openedState():GameStateV02{
 const state=fixture();shelf(state).packOffers=shelf(state).packOffers!.filter(o=>o.offerId!=='buffoon');
 return {...state,phase:'open_pack',phaseData:{packId:known('buffoon'),returnTo:'shop',context:{offerId:'buffoon',shopId:'s01-shop',catalogId:'buffoon-normal',paid:4,remainingChoices:1,contents:unknown,selectedEntryIds:[],shopOrigin:known({ante:1,kind:'small'})}}};
}

test('SHOP02b esquema0.2 conserva ofertas y contexto desconocido sin generar contenidos; formato anterior0.2 sigue legible',()=>{
 const state=fixture(),copy=structuredClone(state);
 assert.deepEqual(success(parseState(success(serializeState(state)))),copy);assert.deepEqual(state,copy);
 const open=openedState();assert.deepEqual(success(validateState(open)),open);assert.deepEqual(context(open).contents,unknown);
 const old=fixture();delete shelf(old).packOffers;assert.deepEqual(success(validateState(old)),old);
 const oldOpen:GameStateV02={...old,phase:'open_pack',phaseData:{packId:unknown,returnTo:'blind_select'}};
 assert.deepEqual(success(validateState(oldOpen)),oldOpen);
 const {memory}=setup(open);assert.deepEqual(success(createConfirmedStore(()=>memory).load())!.state,open);
});

test('SHOP02b H1 rechaza IDs compartidos, contextos contradictorios y referencias inexistentes sin reglas de catálogo',()=>{
 const invalid:GameStateV02[]=[];
 for(const packOffers of [[offer(),offer()],[offer('o1')],[offer('voucher')]]){const state=fixture();shelf(state).packOffers=packOffers;invalid.push(state);}
 const duplicateEntry=openedState();context(duplicateEntry).contents=known([buffoonContents()[0]!,buffoonContents()[0]!]);invalid.push(duplicateEntry);
 const duplicateJoker=openedState();context(duplicateJoker).contents=known([buffoonContents()[0]!,{entryId:'other-entry',kind:'joker',joker:joker('pack-joker')}]);invalid.push(duplicateJoker);
 const selected=openedState();context(selected).contents=known(buffoonContents());context(selected).selectedEntryIds=['missing'];invalid.push(selected);
 const duplicateSelected=openedState();context(duplicateSelected).contents=known(buffoonContents());context(duplicateSelected).selectedEntryIds=['choice-a','choice-a'];invalid.push(duplicateSelected);
 const unknownSelection=openedState();context(unknownSelection).selectedEntryIds=['choice-a'];invalid.push(unknownSelection);
 const wrongOffer=openedState();context(wrongOffer).offerId='other';invalid.push(wrongOffer);
 const wrongShop=openedState();context(wrongShop).shopId='other-shop';invalid.push(wrongShop);
 const wrongReturn=openedState();if(wrongReturn.phase==='open_pack')wrongReturn.phaseData.returnTo='blind_select';invalid.push(wrongReturn);
 for(const state of invalid)assert.ok(!validateState(state).ok,JSON.stringify(state));
 const foreign=openedState();context(foreign).catalogId='unknown-pack';context(foreign).contents=known([{entryId:'opaque',kind:'unsupported',catalogId:'unmapped-content'}]);
 assert.ok(validateState(foreign).ok,'H1 records unknown catalog identities without pretending H2 supports them.');
 for(const price of [-1,1.5]){const state=fixture();shelf(state).packOffers![0]!.price=known(price);assert.ok(!validateState(state).ok);}
});

test('SHOP02b observar ofertas persiste sobres sin comprarlos; omitir preserva y nueva tienda no hereda',()=>{
 const state=fixture();delete shelf(state).packOffers;const {session,memory}=setup(state),before=structuredClone(state);
 const offers=[offer(),{offerId:'unknown-price',catalogId:'arcana-normal',price:unknown}],saved=success(session.observeJokerOffers({...header(state,'observe-packs'),shopId:'s01-shop',offers:shelf(state).cardOffers,packOffers:offers}));
 assert.deepEqual(shelf(saved.state).packOffers,offers);assert.deepEqual(saved.state.observed.money,known(20));assert.deepEqual(saved.state.observed.jokers,before.observed.jokers);assert.equal(saved.state.phase,'shop');
 assert.deepEqual(saved.state.assumptions,before.assumptions);assert.deepEqual(state,before);assert.equal(saved.history[0]!.kind,'correction');
 assert.deepEqual(success(createShopSessionStore(()=>memory).load()),saved);const writes=memory.writes;
 const same=success(session.observeJokerOffers({...header(saved.state,'no-op'),shopId:'s01-shop',offers:shelf(saved.state).cardOffers}));assert.deepEqual(same,saved);assert.equal(memory.writes,writes);
 const clear=success(session.observeJokerOffers({...header(saved.state,'clear'),shopId:'s01-shop',offers:shelf(saved.state).cardOffers,packOffers:[]}));assert.deepEqual(shelf(clear.state).packOffers,[]);assert.deepEqual(shelf(clear.state).voucherOffers,shelf(state).voucherOffers);
 const another=setup();const next=success(another.session.observeJokerOffers({...header(another.state,'new-shelf'),shopId:'next-shop',offers:[]}));assert.equal(shelf(next.state).packOffers,undefined);
});

test('SHOP02b comprar20−4=16 abre sobre con contenido desconocido; observar y elegir registra solo la carta elegida',()=>{
 const {state,session,memory}=setup(),original=structuredClone(state),bought=success(session.confirm(request(state,'buy',{type:'buy_pack',offerId:'buffoon'})));
 assert.equal(bought.state.phase,'open_pack');assert.deepEqual(bought.state.observed.money,known(16));assert.equal(context(bought.state).remainingChoices,1);assert.equal(context(bought.state).contents.status,'unknown');
 assert.deepEqual(bought.state.observed.jokers,state.observed.jokers);assert.deepEqual(shelf(bought.state).cardOffers,shelf(state).cardOffers);assert.deepEqual(shelf(bought.state).voucherOffers,shelf(state).voucherOffers);assert.deepEqual(shelf(bought.state).packOffers,shelf(state).packOffers!.slice(1));
 assert.deepEqual(success(createShopSessionStore(()=>memory).load()),bought);
 const contents=buffoonContents(),observed=success(session.confirm(request(bought.state,'contents',{type:'observe_pack',contents})));assert.deepEqual(context(observed.state).contents,known(contents));
 assert.deepEqual(observed.state.observed.money,known(16));assert.deepEqual(observed.state.observed.jokers,known([]));
 const selected=success(session.confirm(request(observed.state,'choose',{type:'choose_pack_item',entryId:'choice-a'})));
 assert.equal(selected.state.phase,'shop');assert.deepEqual(selected.state.observed.jokers,known([joker('pack-joker')]));assert.deepEqual(selected.state.observed.money,known(16));assert.equal(selected.state.revision,3);
 const cur=current(selected.state);assert.equal(cur.phase,'shop');if(cur.phase==='shop')assert.deepEqual(cur.phaseData.origin,known({ante:1,kind:'small'}));
 assert.deepEqual(state,original);assert.deepEqual(contents,buffoonContents());assert.deepEqual(success(createShopSessionStore(()=>memory).load()),selected);success(validateConfirmedRecord(selected));
});

test('SHOP02b Mega conserva la primera elección al recargar; no permite elegirla dos veces y cierra al elegir dos',()=>{
 const state=fixture();shelf(state).packOffers=[offer('mega','buffoon-mega',8)];const {session,memory}=setup(state);
 const bought=success(session.confirm(request(state,'buy-mega',{type:'buy_pack',offerId:'mega'})));
 assert.deepEqual(bought.state.observed.money,known(12));assert.equal(context(bought.state).remainingChoices,2);
 const contents:PackEntry[]=[...buffoonContents(),{entryId:'third',kind:'joker',joker:joker('third','greedy_joker',2)},{entryId:'fourth',kind:'joker',joker:joker('fourth','lusty_joker',2)}];
 const observed=success(session.confirm(request(bought.state,'mega-contents',{type:'observe_pack',contents}))),one=success(session.confirm(request(observed.state,'first',{type:'choose_pack_item',entryId:'choice-a'})));
 assert.equal(context(one.state).remainingChoices,1);assert.deepEqual(context(one.state).selectedEntryIds,['choice-a']);assert.deepEqual(one.state.observed.jokers,known([joker('pack-joker')]));
 assert.deepEqual(success(createShopSessionStore(()=>memory).load()),one);const writes=memory.writes,raw=memory.getItem(CONFIRMED_STORAGE_KEY);
 assert.ok(!session.confirm(request(one.state,'repeat-selection',{type:'choose_pack_item',entryId:'choice-a'})).ok);assert.equal(memory.writes,writes);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);
 const two=success(session.confirm(request(one.state,'second',{type:'choose_pack_item',entryId:'choice-b'})));
 assert.equal(two.state.phase,'shop');assert.deepEqual(two.state.observed.money,known(12));assert.deepEqual(two.state.observed.jokers,known([joker('pack-joker'),joker('pack-half','half_joker',2)]));
 assert.deepEqual(success(createShopSessionStore(()=>memory).load()),two);
});

test('SHOP02b Planet elegido se utiliza inmediatamente: Mercury mejora pareja nivel1/10×2 a nivel2/25×3',()=>{
 const input=fixture();input.observed.jokerContext=known({planetsUsed:known([]),consumables:known([]),consumableSlots:known(2)});
 const {state,session,memory}=setup(input),bought=success(session.confirm(request(state,'buy-celestial',{type:'buy_pack',offerId:'celestial'})));
 const observed=success(session.confirm(request(bought.state,'planets',{type:'observe_pack',contents:planets()}))),chosen=success(session.confirm(request(observed.state,'mercury',{type:'choose_pack_item',entryId:'mercury'})));
 const bases=chosen.state.observed.handBases;assert.ok(bases.status==='known'&&'values' in bases.value);assert.deepEqual(bases.value.values.pair,known({level:2,chips:25,mult:3}));assert.deepEqual(bases.value.values.high_card,known({level:1,chips:5,mult:1}));
 assert.deepEqual(chosen.state.observed.jokerContext,known({planetsUsed:known(['c_mercury']),consumables:known([]),consumableSlots:known(2)}));
 assert.equal(chosen.state.phase,'shop');assert.deepEqual(chosen.state.observed.money,known(16));assert.deepEqual(chosen.state.observed.outOfScope,state.observed.outOfScope);assert.deepEqual(chosen.state.observed.jokers,known([]));assert.deepEqual(success(createShopSessionStore(()=>memory).load()),chosen);
});

test('SHOP02b deshacer restaura elección, contenidos, compra y ofertas sin retroceder la revisión',()=>{
 const {state,session,memory}=setup(),bought=success(session.confirm(request(state,'buy',{type:'buy_pack',offerId:'buffoon'}))),observed=success(session.confirm(request(bought.state,'contents',{type:'observe_pack',contents:buffoonContents()}))),chosen=success(session.confirm(request(observed.state,'choose',{type:'choose_pack_item',entryId:'choice-a'})));
 const undone=success(session.undo({...header(chosen.state,'undo-choice'),targetEntryId:'choose',reason:'Elegí la otra carta.'}));assert.deepEqual(undone.state.observed,observed.state.observed);assert.deepEqual(context(undone.state),context(observed.state));assert.equal(undone.state.revision,4);
 assert.deepEqual(success(createShopSessionStore(()=>memory).load()),undone);
 const two=setup(),purchase=success(two.session.confirm(request(two.state,'buy',{type:'buy_pack',offerId:'buffoon'}))),undoPurchase=success(two.session.undo({...header(purchase.state,'undo-buy'),targetEntryId:'buy',reason:'No abrí el sobre.'}));
 assert.equal(undoPurchase.state.phase,'shop');assert.deepEqual(undoPurchase.state.observed,state.observed);assert.equal(undoPurchase.state.revision,2);
});

test('SHOP02b cuota durante compra, transcripción y elección conserva documento completo y permite el mismo ID al reintentar',()=>{
 const {state,session,memory}=setup();let saved=success(session.load())!;
 const actions:PackAction[]=[{type:'buy_pack',offerId:'buffoon'},{type:'observe_pack',contents:buffoonContents()},{type:'choose_pack_item',entryId:'choice-a'}];
 for(const [i,action]of actions.entries()){
  const input=request(saved.state,'step-'+i,action),copy=structuredClone(input),raw=memory.getItem(CONFIRMED_STORAGE_KEY),writes=memory.writes;
  memory.failWrite=true;assert.equal(code(session.confirm(input)),'storage_write');assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);assert.equal(memory.writes,writes);assert.deepEqual(success(session.load()),saved);assert.deepEqual(input,copy);
  memory.failWrite=false;saved=success(session.confirm(input));
 }
 assert.equal(saved.state.phase,'shop');assert.deepEqual(saved.state.observed.money,known(16));assert.deepEqual(state,fixture());
});

test('SHOP02b consentimiento, revisión, duplicados y resultados hipotéticos no se incorporan al registro real',()=>{
 const {state,session,memory}=setup(),before=memory.getItem(CONFIRMED_STORAGE_KEY),buy=request(state,'buy',{type:'buy_pack',offerId:'buffoon'});
 assert.equal(code(session.confirm({...buy,confirmed:false})),'confirmation_required');
 const hypothetical={...buy,action:{...buy.action,choices:[{key:'outcome',kind:'boolean' as const,value:true,knowledge:'hypothetical' as const,basis:'Escenario, no observación.'}]}};
 assert.equal(code(session.confirm(hypothetical)),'hypothetical_confirmation');assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),before);
 const bought=success(session.confirm(buy)),raw=memory.getItem(CONFIRMED_STORAGE_KEY);
 assert.equal(code(session.confirm(buy)),'duplicate_confirmation');assert.equal(code(session.confirm(request(state,'old-analysis',{type:'buy_pack',offerId:'celestial'}))),'stale_revision');assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);
 const undone=success(session.undo({...header(bought.state,'undo'),targetEntryId:'buy',reason:'Compra equivocada.'}));assert.equal(code(session.confirm(request(undone.state,'buy',{type:'buy_pack',offerId:'buffoon'}))),'duplicate_confirmation');
 const next=success(session.confirm(request(undone.state,'another-purchase',{type:'buy_pack',offerId:'buffoon'})));assert.deepEqual(next.state.observed.money,known(16));
});

test('SHOP02b recibos opcionales contrastan sobres y fase; recibos antiguos de tres campos siguen válidos',()=>{
 const {state,session,memory}=setup(),raw=memory.getItem(CONFIRMED_STORAGE_KEY),receipt={money:16,jokerIds:[],offerIds:['o1','o2'],packOfferIds:['celestial','future'],phase:'open_pack' as const};
 for(const mismatch of [{phase:'shop' as const},{packOfferIds:['buffoon','celestial','future']},{money:15}]){
  assert.equal(code(session.confirm({...request(state,'buy',{type:'buy_pack',offerId:'buffoon'}),observedAfter:{...receipt,...mismatch}})),'model_discrepancy');assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);
 }
 success(session.confirm({...request(state,'buy',{type:'buy_pack',offerId:'buffoon'}),observedAfter:receipt}));
 const old=setup();success(old.session.confirm({...request(old.state,'old-receipt',{type:'buy_pack',offerId:'buffoon'}),observedAfter:{money:16,jokerIds:[],offerIds:['o1','o2']}}));
});

test('SHOP02b saldo insuficiente, pack no compatible, modo estricto y elección sin observar fallan sin persistir',()=>{
 const poor=fixture();poor.observed.money=known(3);
 for(const [state,action,options]of [[poor,{type:'buy_pack',offerId:'buffoon'},{}],[fixture(),{type:'buy_pack',offerId:'future'},{}],[fixture(),{type:'buy_pack',offerId:'buffoon'},{requireObserved:true}],[openedState(),{type:'choose_pack_item',entryId:'choice-a'},{}]] as const){
  const {session,memory}=setup(state),raw=memory.getItem(CONFIRMED_STORAGE_KEY),writes=memory.writes;assert.ok(!session.confirm(request(state,'illegal',action),options).ok);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);assert.equal(memory.writes,writes);
 }
});

test('SHOP02b0.1 congelado rechaza nuevas ofertas y acciones; migrar explícitamente preserva respaldo e historial',()=>{
 const state=legacy(),{store,session,memory}=setup(state),invalid=structuredClone(state);assert.ok(invalid.observed.shop.status==='known');Object.assign(invalid.observed.shop.value,{packOffers:[offer()]});assert.ok(!validateState(invalid).ok);
 const raw=memory.getItem(CONFIRMED_STORAGE_KEY)!;assert.equal(code(session.observeJokerOffers({...header(state,'legacy-packs'),shopId:'s01-shop',offers:shelf(fixture()).cardOffers,packOffers:[offer()]})),'migration_required');assert.ok(!session.confirm(request(state,'legacy-buy',{type:'buy_pack',offerId:'buffoon'})).ok);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),raw);
 const held=success(store.confirm({...header(state,'legacy-hold'),action:{type:'hold'}})),before=memory.getItem(CONFIRMED_STORAGE_KEY)!,prepared=success(store.prepareMigration());assert.equal(prepared.requiresMigration,true);assert.equal(memory.getItem(CONFIRMED_STORAGE_KEY),before);
 const migrated=success(store.migrateToCurrent({confirmed:true,expectedRaw:before}));assert.equal(success(store.exportMigrationBackup()),before);assert.equal(migrated.state.revision,held.state.revision);assert.deepEqual(migrated.history.map(e=>e.action),[{type:'hold'}]);assert.equal(shelf(migrated.state).packOffers,undefined);
 const observed=success(session.observeJokerOffers({...header(migrated.state,'new-packs'),shopId:'s01-shop',offers:shelf(migrated.state).cardOffers,packOffers:[offer()]})),bought=success(session.confirm(request(observed.state,'current-buy',{type:'buy_pack',offerId:'buffoon'})));
 assert.deepEqual(bought.state.observed.money,known(3));assert.equal(bought.state.phase,'open_pack');assert.deepEqual(success(store.load()),bought);
});
