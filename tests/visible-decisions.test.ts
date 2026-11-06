import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import type {GameState} from '../src/state/model.js';
import type {ShopSnapshot} from '../src/advisor/shop-context.js';
import {inspectShopAlternatives} from '../src/advisor/shop-alternatives.js';
import {success} from './helpers.js';

interface Oracle {key:string;moneyBefore?:number;moneyAfter?:number|null;ownedCountAfter?:number;status?:string;reasonCode?:string;removedInstanceIds?:string[];lostCounters?:Record<string,number>;newJokerDoesNotInheritCounters?:boolean}
const bank=JSON.parse(readFileSync(new URL('../../evaluation/fixtures/decisiones-visibles-development.json',import.meta.url),'utf8')) as {cases:{id:string;area:string;state:GameState;snapshot?:ShopSnapshot;mechanicalOracles:Oracle[]}[]};
// Literal, independently frozen shop oracles; not evaluator-generated expectations.
for(const entry of bank.cases.filter(c=>c.area==='shop'))test(entry.id+' consecuencias de tienda contra oráculos congelados',()=>{
 assert.ok(entry.snapshot);const before=structuredClone(entry),report=success(inspectShopAlternatives(entry.state,entry.snapshot));
 assert.equal(new Set(report.alternatives.map(a=>a.id)).size,report.alternatives.length);
 for(const oracle of entry.mechanicalOracles){
  const alt=report.alternatives.find(a=>a.id===oracle.key);assert.ok(alt,oracle.key);
  if(oracle.moneyBefore!==undefined)assert.equal(alt.moneyBefore,oracle.moneyBefore);
  if(oracle.moneyAfter!==undefined)assert.equal(alt.moneyAfter,oracle.moneyAfter);
  if(oracle.ownedCountAfter!==undefined)assert.equal(alt.consequences?.occupiedJokerSlots.after,oracle.ownedCountAfter);
  if(oracle.status)assert.equal(alt.status,oracle.status);
  if(oracle.reasonCode)assert.ok(alt.errors.some(e=>e.code===oracle.reasonCode));
  if(oracle.removedInstanceIds)assert.deepEqual(alt.removed.map(j=>j.instanceId),oracle.removedInstanceIds);
  for(const [key,n]of Object.entries(oracle.lostCounters??{}))assert.deepEqual(alt.removed[0]?.counters[key],{status:'known',source:'manual',value:n});
  if(oracle.newJokerDoesNotInheritCounters)assert.equal(Object.keys(alt.consequences?.added[0]?.counters??{}).includes('greenMult'),false);
 }
 assert.deepEqual(entry,before);
});
