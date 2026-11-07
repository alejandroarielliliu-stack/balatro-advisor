import assert from 'node:assert/strict';
import test from 'node:test';
import {createNewRun} from '../src/run/start.js';
import {applyRunProgress} from '../src/run/progress.js';
import type {RunProgressCommand} from '../src/run/progress.js';
import type {GameStateV02} from '../src/state/model.js';
import {legacyShape} from '../src/state/model.js';
import {validateCurrentState,validateLegacyState,parseState,serializeState} from '../src/state/validation.js';
import {createConfirmedStore,analysisBinding} from '../src/storage/confirmed-store.js';
import {known,MemoryStorage,success} from './helpers.js';

const time='2026-11-07T16:00:00Z';
const unknown={status:'unknown' as const,reason:'No observado.'};
const start=()=>success(createNewRun({runId:'visible-blind-observations',updatedAt:time,deckId:'red',profileConfirmed:true}));
const apply=(state:GameStateV02,command:RunProgressCommand)=>success(applyRunProgress(state,command,{expectedRevision:state.revision,updatedAt:time,inventory:{unchanged:true}})).state;

// Literal observation/persistence contracts. These do not validate in-game tag effects.
test('future Big tag stays separate from current Small tag and never grants its reward',()=>{
  const original=start(),before=structuredClone(original);
  const future=apply(original,{type:'observe_skip_tag',blind:{ante:1,kind:'big'},tag:known('tag_investment')});
  assert.deepEqual(original,before,'Input is immutable');
  assert.equal(future.phase,'blind_select');
  if(future.phase!=='blind_select')assert.fail('Selection required');
  assert.equal(future.phaseData.skipTag.status,'unknown');
  assert.deepEqual(future.blindTags,[{ante:1,kind:'big',tag:known('tag_investment')}]);
  assert.deepEqual(future.observed.money,original.observed.money);
  assert.deepEqual(future.observed.jokerContext,original.observed.jokerContext);
  const both=apply(future,{type:'observe_skip_tag',tag:known('tag_uncommon')});
  if(both.phase!=='blind_select')assert.fail('Selection required');
  assert.deepEqual(both.phaseData.skipTag,known('tag_uncommon'));
  assert.equal(both.blindTags?.length,2);
  const skipped=apply(both,{type:'skip_blind',atNextSelection:true,money:4});
  if(skipped.phase!=='blind_select')assert.fail('Selection required');
  assert.deepEqual(skipped.phaseData.skipTag,known('tag_investment'));
  assert.equal(skipped.observed.nextBlind.status==='known'&&skipped.observed.nextBlind.value.kind,'big');
  assert.deepEqual(skipped.observed.money,known(4),'Balance is an explicit observation, not a computed tag payout');
});

test('Big observation survives played Small, cashout and shop; applies only on Big selection',()=>{
  let state=apply(start(),{type:'observe_skip_tag',blind:{ante:1,kind:'big'},tag:known('tag_rare')});
  state=apply(state,{type:'enter_round'});
  state=apply(state,{type:'report_result',outcome:'won'});
  state=apply(state,{type:'collect_cashout',money:9});
  assert.equal(state.phase,'shop');
  assert.deepEqual(state.blindTags,[{ante:1,kind:'big',tag:known('tag_rare')}]);
  state=apply(state,{type:'leave_shop'});
  if(state.phase!=='blind_select')assert.fail('Selection required');
  assert.deepEqual(state.phaseData.skipTag,known('tag_rare'));
  assert.deepEqual(state.observed.money,known(9));
});

test('changing future observation to unknown cannot clear current tag; repeated edits upsert one slot',()=>{
  let state=apply(start(),{type:'observe_skip_tag',tag:known('tag_uncommon')});
  state=apply(state,{type:'observe_skip_tag',blind:{ante:1,kind:'big'},tag:known('tag_rare')});
  state=apply(state,{type:'observe_skip_tag',blind:{ante:1,kind:'big'},tag:unknown});
  assert.equal(state.blindTags?.length,2);
  if(state.phase!=='blind_select')assert.fail('Selection required');
  assert.deepEqual(state.phaseData.skipTag,known('tag_uncommon'));
  state=apply(state,{type:'skip_blind',atNextSelection:true});
  if(state.phase!=='blind_select')assert.fail('Selection required');
  assert.deepEqual(state.phaseData.skipTag,unknown);
  state=apply(state,{type:'observe_skip_tag',tag:known('tag_investment')});
  state=apply(state,{type:'observe_skip_tag',tag:unknown});
  if(state.phase!=='blind_select')assert.fail('Selection required');
  assert.deepEqual(state.phaseData.skipTag,unknown);
  assert.equal(state.blindTags?.length,2);
});

test('illegal tag IDs, past/future ante and boss references reject without mutation',()=>{
  const small=start(),big=apply(small,{type:'skip_blind',atNextSelection:true});
  const boss=apply(big,{type:'skip_blind',atNextSelection:true});
  for(const [state,command]of [
    [small,{type:'observe_skip_tag',tag:known('invented-tag')}],
    [small,{type:'observe_skip_tag',blind:{ante:2,kind:'small'},tag:known('tag_rare')}],
    [small,{type:'observe_skip_tag',blind:{ante:1,kind:'boss'},tag:known('tag_rare')}],
    [big,{type:'observe_skip_tag',blind:{ante:1,kind:'small'},tag:known('tag_rare')}],
    [boss,{type:'observe_skip_tag',blind:{ante:1,kind:'big'},tag:known('tag_rare')}]
  ] as const){
    const before=structuredClone(state);
    const result=applyRunProgress(state,command,{expectedRevision:state.revision,updatedAt:time,inventory:{unchanged:true}});
    assert.equal(result.ok,false);if(!result.ok)assert.ok(result.errors.some(error=>error.message.length>0));
    assert.deepEqual(state,before);
  }
});

test('optional observations preserve old saves, reject duplicate refs and round-trip with history',()=>{
  const original=start();assert.equal(Object.hasOwn(original,'blindTags'),false);
  assert.equal(validateCurrentState(original).ok,true);
  const withTags=apply(original,{type:'observe_skip_tag',blind:{ante:1,kind:'big'},tag:known('tag_rare')});
  assert.deepEqual(success(parseState(success(serializeState(withTags)))),withTags);
  const projected=legacyShape(withTags as unknown as Record<string,unknown>);
  assert.equal(Object.hasOwn(projected,'blindTags'),false);
  assert.equal(validateLegacyState(projected).ok,true);
  for(const blindTags of [
    [{ante:1,kind:'big',tag:known('tag_rare')},{ante:1,kind:'big',tag:unknown}],
    [{ante:9,kind:'small',tag:known('tag_rare')}],
    [{ante:1,kind:'boss',tag:known('tag_rare')}],
    [{ante:1,kind:'small',tag:{status:'known',value:'tag_rare'}}]
  ])assert.equal(validateCurrentState({...original,blindTags}).ok,false);
  const memory=new MemoryStorage(),store=createConfirmedStore(()=>memory);
  success(store.initialize(original));
  const saved=success(store.progress({confirmationId:'observed-big',confirmed:true,expected:analysisBinding(original),updatedAt:time,
    command:{type:'observe_skip_tag',blind:{ante:1,kind:'big'},tag:known('tag_rare')},inventory:{unchanged:true}}));
  assert.equal(saved.history.length,1);assert.deepEqual(saved.state,withTags);
  const importedMemory=new MemoryStorage(),restored=createConfirmedStore(()=>importedMemory);
  assert.deepEqual(success(restored.restoreJson(success(store.exportJson()),{confirmed:true,expectedRaw:null})),saved);
  assert.deepEqual(success(restored.load()),saved);
});
