import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {merge,verifyFreezeBytes,verifyPolicyFreezeRecord,semanticCheck,semanticAssertions,buildFixture} from './evaluate-advisor.mjs';

test('deep merge preserves inputs and replaces arrays',()=>{
 const original={a:{x:1,y:2},b:[1,2]},patch={a:{x:3},b:[]};
 assert.deepEqual(merge(original,patch),{a:{x:3,y:2},b:[]});
 assert.deepEqual(original,{a:{x:1,y:2},b:[1,2]});
});
test('freeze verifies bytes and rejects even whitespace changes',()=>{
 const bytes=Buffer.from('{"cases":[]}\n'),digest=createHash('sha256').update(bytes).digest('hex');
 assert.equal(verifyFreezeBytes(bytes,digest,'test.json'),digest);
 assert.throws(()=>verifyFreezeBytes(Buffer.from('{"cases":[]}'),digest,'test.json'),/Fixture hash mismatch/);
});
test('a semantic label without a meaningful message does not pass',()=>{
 assert.equal(semanticCheck('economy.interest-opportunity-cost',[{path:'finding.ruleId',text:'S-INTEREST'}]).status,'manual-review-needed');
 assert.equal(semanticCheck('economy.interest-opportunity-cost',[{path:'finding.message',text:'Interés condicionado: $7 frente a $6; sacrificas $1 si no cambia el saldo.'}]).status,'pass');
});
test('forbidden claims distinguish positive and negated rules',()=>{
 const check=text=>semanticCheck('baron-requires-steel',[{path:'reason',text}],{forbidden:true}).status;
 assert.equal(check('Barón requiere Acero.'),'fail');
 assert.equal(check('Barón no requiere Acero.'),'pass');
 assert.equal(check('No: Barón requiere Acero.'),'fail'); // punctuation is not an invented negation rule
 const green=text=>semanticCheck('green-earns-interest',[{path:'reason',text}],{forbidden:true}).status;
 assert.equal(green('Verde cobra intereses.'),'fail');
 assert.equal(green('Verde no cobra intereses.'),'pass');
});
test('quick semantic checks do not accept engine traces or sidecar answers',()=>{
 const c={acceptance:{mustExplain:['scoring.same-role-can-help'],mustNotClaim:[],mustAskFor:[]}};
 const variants=[{decision:{context:{recommendation:{reasons:[]},options:[]},actions:[{message:'Un refuerzo adicional del mismo rol mejora el Mult.'}],trace:[{label:'Mismo rol adicional'}]},replacements:[]}];
 assert.equal(semanticAssertions(c,variants).semantic[0].status,'manual-review-needed');
 variants[0].decision.context.options.push({findings:[{ruleId:'S-ADDITIONAL-SCORING',message:'Este refuerzo del mismo rol añade Mult actual.'}]});
 assert.equal(semanticAssertions(c,variants).semantic[0].status,'pass');
});
test('a generic mention of current offers is not a question for missing offers',()=>{
 const c={acceptance:{mustExplain:[],mustNotClaim:[],mustAskFor:['shop.visible-offers-and-prices']}};
 const variants=[{decision:{context:{recommendation:{reasons:['Las ofertas conocidas no muestran una necesidad actual.']},limitations:[]},questions:[]},replacements:[]}];
 assert.equal(semanticAssertions(c,variants).semantic[0].status,'manual-review-needed');
 variants[0].decision.questions.push({message:'Transcribe las ofertas visibles y sus precios.'});
 assert.equal(semanticAssertions(c,variants).semantic[0].status,'pass');
});
test('H1 fixture adapter preserves partial material as unknown without synthetic IDs',async()=>{
 const root=resolve(import.meta.dirname,'..'),{defaults,cases}=JSON.parse(await readFile(resolve(root,'evaluation/fixtures/eval01-development.json'),'utf8'));
 const {createNewRun}=await import('../dist/src/run/start.js');
 const {freshJokerInstance}=await import('../dist/src/rules/shop.js');
 const {voucherResources}=await import('../dist/src/catalog/vouchers.js');
 const {startingComposition}=await import('../dist/src/catalog/decks.js');
 const {validateState}=await import('../dist/src/state/validation.js');
 const fixture=buildFixture(merge(defaults,cases.find(c=>c.id==='D08').setup),'test-D08',{createNewRun,freshJokerInstance,voucherResources,startingComposition,validateState});
 assert.equal(fixture.state.observed.deck.status,'unknown');
 assert.equal(fixture.sidecar[0].consumedByPolicy,false);
 assert.equal(fixture.state.assumptions.roundPlans.length,0);
 assert.equal(fixture.state.assumptions.probes.length,0);
});

// The guard is tested with synthetic metadata, without opening reserved fixtures.
test('reserved guard binds source and fixture hashes independently of property order',()=>{
 const source={'src/b.ts':'b','src/a.ts':'a'},manifest={files:[{path:'reserved.json',sha256:'fixture'}]};
 const good={frozenAt:'2026-10-18T12:00:00Z',productionSourceHashes:{'src/a.ts':'a','src/b.ts':'b'},fixtureHashes:{'reserved.json':'fixture'}};
 assert.equal(verifyPolicyFreezeRecord(good,source,manifest),true);
 assert.throws(()=>verifyPolicyFreezeRecord({...good,productionSourceHashes:{'src/a.ts':'changed'}},source,manifest),/source differs/);
 assert.throws(()=>verifyPolicyFreezeRecord({...good,fixtureHashes:{}},source,manifest),/fixture hashes/);
 assert.throws(()=>verifyPolicyFreezeRecord({},source,manifest),/requires/);
});
