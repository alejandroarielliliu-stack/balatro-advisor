import {readFileSync} from 'node:fs';
import {adviseShop} from './advisor/advisor.js';
const state:unknown=JSON.parse(readFileSync(new URL('../../examples/sale-psychic.json',import.meta.url),'utf8'));
const plan:unknown=JSON.parse(readFileSync(new URL('../../examples/sale-psychic-plan.json',import.meta.url),'utf8'));
const result=adviseShop(state,[{role:'representative',plan}],{expectedRevision:0,updatedAt:'2026-10-10T18:00:00Z'});
if(!result.ok){console.error(result.errors);process.exitCode=1;}
else if(process.argv.includes('--json'))console.log(JSON.stringify(result,null,2));
else {
 console.log('VENTA INDIVIDUAL — EJEMPLO SINTÉTICO, REGLAS PROVISIONALES');
 console.log(result.value.policyVersion,result.value.recommendation);
 console.table(result.value.alternatives.map(a=>({action:JSON.stringify(a.action),score:a.scenarios[0]?.metrics?.score,moneyAfterShop:a.scenarios[0]?.metrics?.moneyAfterShop,moneyAfterRound:a.scenarios[0]?.metrics?.moneyAfterRound,sacrificed:a.sacrificed.map(j=>j.catalogId).join(',')})));
 console.log(result.value.limitations.join('\n'));
}
