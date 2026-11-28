import assert from 'node:assert/strict';
import test from 'node:test';
import {assessRun} from '../src/advisor/run-diagnosis.js';
import {cardChips,standardDeck} from '../src/catalog/initial.js';
import type {Card} from '../src/catalog/initial.js';
import {applyRunProgress} from '../src/run/progress.js';
import {createNewRun} from '../src/run/start.js';
import type {CurrentShop,GameStateV02} from '../src/state/model.js';
import {known,success} from './helpers.js';

const updatedAt='2026-11-27T14:00:00Z';
const unknown={status:'unknown',reason:'Todavía no registrado.'} as const;
const stock:CurrentShop={shopId:'diagnosis-shop',cardOffers:[],voucherOffers:[],packOffers:[],ignoredOtherOffers:[]};
const offer=(catalogId:string,price:number)=>({offerId:catalogId,catalogId,label:catalogId,kind:'joker' as const,price:known(price),edition:known('base'),stickers:known([])});
const voucher=(catalogId:string)=>({offerId:catalogId,catalogId,price:known(10)});

function setup(cards:Card[],balance=30):GameStateV02 {
 const newRun=success(createNewRun({runId:'diagnosis-test',deckId:'red',profileConfirmed:true,updatedAt}));
 const step={updatedAt,inventory:{unchanged:true as const}};
 const played=success(applyRunProgress(newRun,{type:'enter_round'},{...step,expectedRevision:newRun.revision})).state;
 const shop=success(applyRunProgress(played,{type:'record_cashout',amount:balance-4,jokerUpdates:[]},{...step,expectedRevision:played.revision})).state;
 assert.equal(shop.schemaVersion,'0.2');
 shop.observed.deck=known({cards});
 return shop;
}

function card(rank:Card['rank'],suit:Card['suit'],points:number):Card {
 const base=standardDeck().find(card=>card.rank===rank&&card.suit===suit)!;
 return {...base,extraChips:points-5-cardChips(base)};
}

test('diagnoses an empty shelf and excludes an unaffordable unknown offer',()=>{
 const s=setup([card('A','S',500)],14);
 const initial=assessRun(s);
 assert.equal(initial.diagnosis.priority,'economy');
 assert.equal(initial.diagnosis.next?.wins,32);
 assert.equal(initial.diagnosis.next?.meanCashoutBalance,23);
 s.observed.shop=known({...stock,voucherOffers:[{offerId:'future',catalogId:'v_telescope',price:known(50)}]});
 assert.equal(assessRun(s).shop?.kind,'hold');
});

test('an extra hand from a voucher wins where the affordable economy Joker cannot',()=>{
 const s=setup([card('A','S',100),card('2','C',100),card('5','H',100),card('8','D',100),card('J','S',100)]);
 s.observed.shop=known({...stock,cardOffers:[offer('golden_joker',6)],voucherOffers:[voucher('v_grabber')]});
 const before=structuredClone(s),result=assessRun(s);
 assert.equal(result.diagnosis.priority,'survival');
 assert.equal(result.diagnosis.next?.wins,0);
 assert.equal(result.shop?.kind,'buy');
 assert.equal(result.shop.offerKind,'voucher');
 assert.equal(result.shop.offerId,'v_grabber');
 assert.equal(result.shop.moneyAfter,20);
 assert.deepEqual(s,before);
});

test('saving beats a Joker whose points and an interest voucher whose cap do not improve the round',()=>{
 const s=setup([card('A','S',500)],25);
 s.observed.shop=known({...stock,cardOffers:[offer('joker',2)],voucherOffers:[voucher('v_seed_money')]});
 const result=assessRun(s);
 assert.equal(result.shop?.kind,'hold');
 assert.equal(result.diagnosis.next?.meanHandsLeft,3);
 assert.equal(result.diagnosis.next?.meanCashoutBalance,37);
});

test('a tougher known boss changes the diagnosis to scaling without guessing future offers',()=>{
 const s=setup([card('A','S',500)]);
 s.observed.visibleBoss=known({ante:1,kind:'boss',bossId:known('the_hook'),target:unknown,reward:unknown});
 const result=assessRun(s);
 assert.equal(result.diagnosis.next?.wins,32);
 assert.equal(result.diagnosis.later?.kind,'boss');
 assert.equal(result.diagnosis.later.estimate.wins,0);
 assert.equal(result.diagnosis.priority,'scaling');
 assert.equal(result.shop?.kind,'compare');
});

test('an affordable unknown offer prevents marking a winner and closed packs stay conditional',()=>{
 const s=setup([card('A','S',100)]);
 const pack={offerId:'pack1',catalogId:'celestial-normal',price:known(4)};
 s.observed.shop=known({...stock,packOffers:[pack]});
 assert.equal(assessRun(s).shop?.kind,'pack');
 s.observed.shop=known({...stock,cardOffers:[offer('joker',2),{...offer('golden_joker',6),price:unknown}]});
 assert.equal(assessRun(s).shop?.kind,'compare');
});
