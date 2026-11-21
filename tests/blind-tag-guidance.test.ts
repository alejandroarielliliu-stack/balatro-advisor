import test from 'node:test';
import assert from 'node:assert/strict';
import {assessBlindTag,isAutomaticPlayTag} from '../src/advisor/blind-tag-guidance.js';
import {HAND_BASES} from '../src/catalog/initial.js';
import {TAGS} from '../src/catalog/tags.js';
import {createNewRun} from '../src/run/start.js';
import {known,success} from './helpers.js';

function state() {
  const run = success(createNewRun({runId:'blind-tag-test',updatedAt:'2026-11-21T12:00:00Z',deckId:'red',profileConfirmed:true}));
  assert.ok(run.phase === 'blind_select');
  return run;
}

test('six fixed discards bypass assessment; the remaining eighteen get specific conditions', () => {
  const run = state();
  assert.deepEqual(TAGS.filter(tag => isAutomaticPlayTag(tag.id)).map(tag => tag.id).sort(),
    ['tag_double','tag_garbage','tag_meteor','tag_skip','tag_standard','tag_uncommon']);
  assert.equal(isAutomaticPlayTag(null), false);
  const before = structuredClone(run);
  let assessed = 0;
  for (const tag of TAGS) {
    const report = assessBlindTag(run, tag.id);
    if (isAutomaticPlayTag(tag.id)) assert.equal(report, null, tag.id);
    else {
      assert.ok(report?.reason.length, tag.id);
      assert.ok(report.conditions.length, tag.id);
      assessed++;
    }
  }
  assert.equal(assessed, 18);
  assert.deepEqual(run, before, 'tag assessment does not grant any reward or change observations');
});

test('lost access to future rewards is separate from benefits available before the final boss', () => {
  const run = state();
  run.observed.nextBlind = known({ante:8,kind:'big',bossId:known('none'),target:known(75_000),reward:known(4)});
  for (const tag of ['tag_investment','tag_coupon','tag_d_six','tag_voucher','tag_negative']) {
    assert.equal(assessBlindTag(run, tag)?.preferPlay, true, tag);
  }
  for (const tag of ['tag_juggle','tag_boss','tag_buffoon','tag_orbital']) {
    assert.equal(assessBlindTag(run, tag)?.preferPlay, false, tag);
  }
});

test('do not presume zero payout or zero free slots from incomplete observations', () => {
  const run = state();
  run.observed.resources.jokerSlots = {status:'unknown',reason:'No se ven los espacios.'};
  run.observed.money = {status:'unknown',reason:'No se ve el saldo.'};
  assert.equal(assessBlindTag(run, 'tag_top_up')?.preferPlay, false);
  assert.equal(assessBlindTag(run, 'tag_economy')?.preferPlay, false);
  run.observed.money = known(0);
  assert.equal(assessBlindTag(run, 'tag_economy')?.preferPlay, true);
  run.observed.jokerContext = known({handCounts:{pair:known(0)}});
  assert.equal(assessBlindTag(run, 'tag_handy')?.preferPlay, false);
  run.observed.jokerContext = known({handCounts:Object.fromEntries(Object.keys(HAND_BASES).map(id => [id, known(id === 'pair' ? 6 : 0)]))});
  assert.match(assessBlindTag(run, 'tag_handy')?.reason ?? '', /Handy aportaría \$6/);
});
