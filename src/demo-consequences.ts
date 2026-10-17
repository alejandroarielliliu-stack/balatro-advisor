import {readFileSync} from 'node:fs';
import {inspectShopDecision} from './advisor/decision.js';
import {parseState} from './state/validation.js';
import type {Result} from './state/model.js';
import type {ShopSnapshot} from './advisor/shop-context.js';
import type {AdvisorScenario} from './advisor/advisor.js';
const ok=<T>(r:Result<T>)=>{if(!r.ok)throw Error(JSON.stringify(r.errors));return r.value;};
const state=ok(parseState(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8'))),before=JSON.stringify(state);
if(state.observed.shop.status!=='known')throw Error('Falta tienda.');
const snapshot:ShopSnapshot={id:state.observed.shop.value.shopId,jokers:state.observed.shop.value.cardOffers.map(o=>({offerId:o.offerId,catalogId:o.catalogId,price:o.price.status==='known'?o.price.value:null,edition:'base',stickers:[]})),vouchers:[],packs:[],rerollCost:null};
const card=(cardId:string)=>({cardId,knowledge:'hypothetical' as const,basis:'Demo sintética de un plan fijo. No predice robos.'});
const cases=[{name:'Compra permite alcanzar450',initial:['8S','8H','2S','3S','4H','5D','6C','7D'],played:['8S','8H'],draws:['9S','9H']},{name:'Todos superan450; conservar tiene ventaja económica',initial:['AS','KS','QS','JS','10S','2H','3D','4C'],played:['AS','KS','QS','JS','10S'],draws:['5S','6S','7S','8S','9S']}];
for(const c of cases){const scenario:AdvisorScenario={role:'representative',plan:{schemaVersion:'scenario-1',planId:c.name,description:c.name,initialHand:c.initial.map(card),events:[{type:'play',cardIds:c.played,drawIfContinues:c.draws.map(card)}],assumptions:{noMoneyChangesDuringRound:true}}};const report=ok(inspectShopDecision(state,snapshot,{scenarios:[scenario]}));console.log('\nSINTÉTICO:',c.name);console.table(report.scenarioConsequences.alternatives.map(a=>({acción:a.action.type==='buy'?a.action.offerId:a.action.type,puntos:a.outcomes[0]?.metrics?.score,objetivo:a.outcomes[0]?.status,saldo:a.outcomes[0]?.metrics?.moneyAfterShop,deltaCobro:a.outcomes[0]?.versusHold.moneyAfterRoundDelta})));console.log('H3:',report.scenarioConsequences.recommendation);}
if(JSON.stringify(state)!==before)throw Error('La demo modificó el estado de entrada.');
console.log('Sin escrituras ni porcentajes. No alcanzar el objetivo en un plan no demuestra derrota.');
