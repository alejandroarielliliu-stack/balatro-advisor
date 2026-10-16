import assert from 'node:assert/strict';
import test from 'node:test';
import {createUnknownState} from '../src/state/model.js';
import type {GameStateV02,Result} from '../src/state/model.js';
import {applyRunProgress,advanceBlindRef,nextBlindAfter} from '../src/run/progress.js';
import type {BlindInfo,RunProgressCommand,InventoryConfirmation} from '../src/run/progress.js';
import {known,success} from './helpers.js';
const time='2026-10-16T17:00:00Z';
const unknown={status:'unknown' as const,reason:'No observado.'};
function blind(kind:'small'|'big'|'boss'='small',ante=1):BlindInfo{return {ante,kind,bossId:kind==='boss'?unknown:known('none'),target:known(kind==='small'?300:kind==='big'?450:600),reward:known(kind==='small'?3:kind==='big'?4:5)};}
function selection(kind:'small'|'big'|'boss'='small',ante=1):GameStateV02{
  const state=createUnknownState('synthetic-run01b',time);
  state.observed.nextBlind=known(blind(kind,ante));state.observed.money=known(25);
  state.observed.deck=known({preset:'standard52-unmodified'});state.observed.jokers=known([]);
  state.observed.handBases=known({preset:'all-standard-level1'});state.observed.outOfScope=known({vouchers:[],consumables:[],pendingTags:[],otherModifiers:[]});
  state.observed.resources={handsPerRound:known(4),discardsPerRound:known(3),handSize:known(8),jokerSlots:known(5)};
  return {...state,phase:'blind_select',phaseData:{skipTag:unknown}};
}
const apply=(state:GameStateV02,command:RunProgressCommand,inventory:InventoryConfirmation={unchanged:true})=>success(applyRunProgress(state,command,{expectedRevision:state.revision,updatedAt:time,inventory}));
const code=(r:Result<unknown>)=>{assert.ok(!r.ok);assert.ok(r.errors[0]!.message);return r.errors[0]!.code;};

test('RUN01b ciclo literal Small → Big → Boss → ante siguiente conserva inventario y exige saldo observado',()=>{
  let state=selection();const original=structuredClone(state),deck=structuredClone(state.observed.deck);
  state=apply(state,{type:'enter_round'}).state;assert.equal(state.phase,'in_round');
  state=apply(state,{type:'report_result',outcome:'won',score:350,handsUsed:2,discardsUsed:1}).state;
  assert.equal(state.phase,'cashout');assert.deepEqual(state.observed.lastCleared,known({ante:1,kind:'small'}));assert.equal(state.observed.money.status,'unknown');
  assert.equal(state.recentRounds?.[0]?.score,350);assert.equal(state.recentRounds?.[0]?.inventoryRevision,1);
  state=apply(state,{type:'collect_cashout',money:31}).state;
  assert.equal(state.phase,'shop');assert.deepEqual(state.observed.money,known(31));assert.deepEqual(state.observed.nextBlind.status==='known'&&[state.observed.nextBlind.value.ante,state.observed.nextBlind.value.kind],[1,'big']);
  assert.equal(state.observed.shop.status,'unknown');assert.deepEqual(state.observed.deck,deck);
  state=apply(state,{type:'leave_shop'}).state;assert.equal(state.phase,'blind_select');
  state=apply(state,{type:'enter_round'}).state;state=apply(state,{type:'report_result',outcome:'won'}).state;state=apply(state,{type:'collect_cashout',money:34}).state;
  assert.deepEqual(state.observed.nextBlind.status==='known'&&[state.observed.nextBlind.value.ante,state.observed.nextBlind.value.kind],[1,'boss']);
  state=apply(state,{type:'leave_shop'}).state;state=apply(state,{type:'enter_round'}).state;state=apply(state,{type:'report_result',outcome:'won'}).state;state=apply(state,{type:'collect_cashout',money:40}).state;
  assert.deepEqual(state.observed.nextBlind.status==='known'&&[state.observed.nextBlind.value.ante,state.observed.nextBlind.value.kind],[2,'small']);assert.equal(state.observed.visibleBoss.status,'unknown');
  assert.deepEqual(original,selection());assert.equal(state.revision,11);
});

test('RUN01b jefe visible del mismo ante se conserva; jefe nuevo, premio y objetivo no se inventan',()=>{
  const state=selection('big');const boss={...blind('boss'),bossId:known('the_psychic'),target:known(600)};state.observed.visibleBoss=known(boss);
  assert.deepEqual(nextBlindAfter(state,{ante:1,kind:'big'}),boss);
  const next=nextBlindAfter(state,{ante:1,kind:'boss'})!;assert.equal(next.ante,2);assert.equal(next.kind,'small');assert.equal(next.target.status,'unknown');assert.equal(next.reward.status,'unknown');
  assert.deepEqual(advanceBlindRef({ante:8,kind:'boss'}),null);
});

test('RUN01b ante 8 Boss ganado termina sin conceder dinero ni inventar tienda o endless',()=>{
  const state=apply(selection('boss',8),{type:'enter_round'}).state;
  const result=apply(state,{type:'report_result',outcome:'won',score:700,handsUsed:1,discardsUsed:0});
  assert.equal(result.state.phase,'finished');if(result.state.phase==='finished')assert.equal(result.state.phaseData.outcome,'won');
  assert.equal(result.state.observed.money.status,'unknown');assert.equal(result.state.observed.shop.status,'unknown');
  assert.equal(code(applyRunProgress(result.state,{type:'collect_cashout',money:100},{expectedRevision:2,updatedAt:time,inventory:{unchanged:true}})),'wrong_phase');
});

test('RUN01b derrota explícita no avanza lastCleared ni concede cobro; detener es distinto',()=>{
  const state=apply(selection(),{type:'enter_round'}).state;state.observed.lastCleared=known({ante:1,kind:'small'});
  const lost=apply(state,{type:'report_result',outcome:'lost',score:250}).state;
  assert.equal(lost.phase,'finished');if(lost.phase==='finished')assert.equal(lost.phaseData.outcome,'lost');assert.deepEqual(lost.observed.lastCleared,state.observed.lastCleared);assert.equal(lost.observed.money.status,'unknown');
  const stopped=apply(selection(),{type:'end_run',reason:'Cerré la partida.'}).state;if(stopped.phase==='finished')assert.equal(stopped.phaseData.outcome,'stopped');
});

test('RUN01b ubicar unknown no deduce una ronda anterior ni inventa recursos o saldo',()=>{
  const state=createUnknownState('resume',time),before=structuredClone(state);
  for(const phase of ['shop','blind_select','in_round'] as const){const next=apply(state,{type:'locate',phase,blind:blind('big')}).state;assert.equal(next.phase,phase);assert.equal(next.observed.lastCleared.status,'unknown');assert.equal(next.observed.money.status,'unknown');assert.equal(next.observed.shop.status,'unknown');}
  assert.deepEqual(state,before);
  const resumed=apply(state,{type:'locate',phase:'shop',blind:blind('big'),money:27}).state;
  assert.deepEqual(resumed.observed.money,known(27));assert.equal(resumed.observed.deck.status,'unknown');
});

test('RUN01b tienda migrada usa siguiente ciega conocida aunque origen sea desconocido; no la deduce si falta',()=>{
  const base=selection('big'),shop:GameStateV02={...base,phase:'shop',phaseData:{origin:unknown}};
  assert.equal(apply(shop,{type:'leave_shop'}).state.phase,'blind_select');shop.observed.nextBlind=unknown;
  assert.equal(code(applyRunProgress(shop,{type:'leave_shop'},{expectedRevision:0,updatedAt:time,inventory:{unchanged:true}})),'missing_blind');
});

test('RUN01b declaraciones estructurales explícitas: sin confirmación datos desconocidos, patch observado prevalece',()=>{
  const state=selection();const noInventory=apply(state,{type:'enter_round'},{patch:{}}).state;
  for(const fact of [noInventory.observed.deck,noInventory.observed.jokers,noInventory.observed.outOfScope,noInventory.observed.handBases,noInventory.observed.resources.handSize])assert.equal(fact.status,'unknown');
  const patch={jokers:known([{instanceId:'g',catalogId:'green_joker',edition:known('base'),stickers:known([] as string[]),sellValue:known(2),counters:{greenMult:known(9)}}])};
  const entered=apply(state,{type:'enter_round'}).state;const report=apply(entered,{type:'report_result',outcome:'won'},{patch}).state;
  assert.deepEqual(report.observed.jokers,patch.jokers);assert.equal(report.observed.deck.status,'unknown');
});

test('RUN01b resumen no infiere Green ni crecimientos de manos; Red Card estable se conserva',()=>{
  const state=selection();state.observed.jokers=known([
    {instanceId:'g',catalogId:'green_joker',edition:known('base'),stickers:known([]),sellValue:known(2),counters:{greenMult:known(0)}},
    {instanceId:'r',catalogId:'red_card',edition:known('base'),stickers:known([]),sellValue:known(2),counters:{mult:known(6)}}
  ]);
  const result=apply(apply(state,{type:'enter_round'}).state,{type:'report_result',outcome:'won',handsUsed:2,discardsUsed:2}).state;
  assert.equal(result.observed.jokers.status,'known');if(result.observed.jokers.status==='known'){
    assert.equal(result.observed.jokers.value[0]!.counters.greenMult!.status,'unknown');assert.deepEqual(result.observed.jokers.value[1]!.counters.mult,known(6));
  }
});

test('RUN01b Campfire queda pendiente tras resumen; Gros Michel ya extinto sigue siendo un hecho monotónico',()=>{
  const state=selection();state.observed.jokers=known([{instanceId:'c',catalogId:'campfire',edition:known('base'),stickers:known([]),sellValue:known(4),counters:{x100:known(150)}}]);
  state.observed.jokerContext=known({grosMichelExtinct:known(true)});
  const result=apply(apply(state,{type:'enter_round'}).state,{type:'report_result',outcome:'won'}).state;
  if(result.observed.jokers.status==='known')assert.equal(result.observed.jokers.value[0]!.counters.x100!.status,'unknown');else assert.fail('Identidad preservada.');
  if(result.observed.jokerContext?.status==='known')assert.deepEqual(result.observed.jokerContext.value.grosMichelExtinct,known(true));else assert.fail('Contexto preservado.');
});

test('RUN01b salida con Perkeo invalida consumibles sin simular copia ni cambiar historial estable',()=>{
  const state=selection(),shop:GameStateV02={...state,phase:'shop',phaseData:{origin:unknown}};
  shop.observed.jokers=known([{instanceId:'p',catalogId:'perkeo',edition:known('base'),stickers:known([]),sellValue:known(10),counters:{}}]);
  shop.observed.jokerContext=known({consumables:known([]),handCounts:{pair:known(3)}});
  const next=apply(shop,{type:'leave_shop'}).state;if(next.observed.jokerContext?.status==='known'){
    assert.equal(next.observed.jokerContext.value.consumables?.status,'unknown');assert.deepEqual(next.observed.jokerContext.value.handCounts?.pair,known(3));
  }else assert.fail('Contexto preservado.');
});

test('RUN01b Egg/Gift, historial, objetivos y debuffs antiguos no sobreviven como hechos actuales',()=>{
  const state=selection();state.observed.jokers=known([{instanceId:'g',catalogId:'gift',edition:known('base'),stickers:known([]),sellValue:known(3),counters:{}},{instanceId:'c',catalogId:'castle',edition:known('base'),stickers:known([]),sellValue:known(3),counters:{chips:known(20),suit:known(0)}}]);
  state.observed.jokerContext=known({handCounts:{pair:known(4)},roundHandCounts:{pair:known(1)},blindsSkipped:known(2),startingDeckSize:known(52),consumables:known([]),rerollCost:known(5),bossDisabled:known(false)});
  state.observed.deck=known({cards:[{instanceId:'AS',rank:'A',suit:'S',edition:'base',enhancement:'none',seal:'none',extraChips:0,debuff:true}]});
  const result=apply(apply(state,{type:'enter_round'}).state,{type:'report_result',outcome:'won'}).state;
  assert.equal(result.observed.deck.status,'unknown');assert.equal(result.observed.jokers.status,'known');if(result.observed.jokers.status==='known')assert.equal(result.observed.jokers.value[1]!.sellValue.status,'unknown');
  assert.equal(result.observed.jokerContext?.status,'known');if(result.observed.jokerContext?.status==='known'){
    assert.equal(result.observed.jokerContext.value.handCounts?.pair?.status,'unknown');assert.equal(result.observed.jokerContext.value.consumables?.status,'unknown');assert.deepEqual(result.observed.jokerContext.value.blindsSkipped,known(2));assert.deepEqual(result.observed.jokerContext.value.startingDeckSize,known(52));
  }
});

test('RUN01b saldo de cobro sustituye al anterior, incluso negativo; importe de cobro no se inventa',()=>{
  const cashout=apply(apply(selection(),{type:'enter_round'}).state,{type:'report_result',outcome:'won'}).state;
  assert.equal(cashout.phase,'cashout');if(cashout.phase==='cashout')assert.equal(cashout.phaseData.amount.status,'unknown');
  const result=apply(cashout,{type:'collect_cashout',money:-3}).state;assert.deepEqual(result.observed.money,known(-3));
});

test('RUN01b datos inválidos, fases ilegales, revisión antigua y nueva ciega incorrecta producen errores sin mutación',()=>{
  const state=selection(),before=structuredClone(state),options={expectedRevision:0,updatedAt:time,inventory:{unchanged:true as const}};
  for(const command of [{type:'collect_cashout',money:10},{type:'report_result',outcome:'won'},{type:'locate',phase:'shop',blind:blind()},{type:'enter_round',blind:blind('boss')},{type:'enter_round',projectedState:{}},{type:'end_run',reason:''}])assert.ok(!applyRunProgress(state,command,options).ok);
  assert.equal(code(applyRunProgress(state,{type:'enter_round'},{...options,expectedRevision:1})),'stale_revision');
  assert.ok(!applyRunProgress(state,{type:'enter_round'},{...options,updatedAt:'invalid'}).ok);
  assert.ok(!applyRunProgress(state,{type:'enter_round'},{...options,inventory:{patch:{money:known(2.5)}}}).ok);
  assert.deepEqual(state,before);
});

test('RUN01b escenarios guardados siguen hipótesis separadas y no aportan datos reales',()=>{
  const state=selection();state.assumptions.cashflow={assumeRoundWon:true,handsUsedByRound:[1],noSpendingBetweenRounds:true,noMoneyChangesDuringRound:true};
  const result=apply(apply(state,{type:'enter_round'}).state,{type:'report_result',outcome:'won'}).state;
  assert.deepEqual(result.assumptions,state.assumptions);assert.equal(result.observed.money.status,'unknown');assert.equal(result.recentRounds,undefined);
});
