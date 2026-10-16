import {readFileSync} from 'node:fs';
import {parseState} from './state/validation.js';
import {comparisonDemoScenarios} from './demo-scenarios.js';
import {adviseShop} from './advisor/advisor.js';
import {POLICY} from './advisor/policy.js';
const state=parseState(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8'));
if(!state.ok)throw new Error(JSON.stringify(state.errors));
console.log(`H3: política heurística ${POLICY.version}, reglas provisionales, planes fijos. Sin probabilidades de victoria.`);
for(const demo of comparisonDemoScenarios(state.value)) {
  const result=adviseShop(demo.state,[{role:'representative',plan:demo.plan}],{expectedRevision:demo.state.revision,updatedAt:'2026-10-10T18:00:00Z'});
  if(!result.ok)throw new Error(JSON.stringify(result.errors));
  console.log('\n'+demo.title);
  if(process.argv.includes('--json')){console.log(JSON.stringify(result,null,2));continue;}
  console.table(result.value.orderedAlternativeIds.map(id=>result.value.alternatives.find(a=>a.id===id)!).map(a=>({id:a.id,tier:a.tier,action:JSON.stringify(a.action),
    points:a.scenarios[0]?.metrics?.score,margin:a.scenarios[0]?.metrics?.margin,money:a.scenarios[0]?.metrics?.moneyAfterRound,complete:a.complete})));
  console.log(JSON.stringify(result.value.recommendation,null,2));
  for(const p of result.value.preferences)console.log(`${p.ruleId}: ${p.preferred} > ${p.over}. ${p.explanation}`);
  for(const a of result.value.alternatives)if(a.sacrificed.length)console.log(a.id+' sacrifica '+JSON.stringify(a.sacrificed));
  console.log(result.value.limitations.join('\n'));
}
