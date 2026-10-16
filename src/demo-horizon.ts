import {readFileSync} from 'node:fs';
import {adviseHorizon} from './advisor/horizon-advisor.js';
const load=(name:string):unknown=>JSON.parse(readFileSync(new URL(`../../examples/${name}.json`,import.meta.url),'utf8'));
const result=adviseHorizon(load('horizon-golden-state'),load('horizon-golden'),{expectedRevision:0,updatedAt:'2026-10-10T20:00:00Z'});
if(!result.ok){console.error(result.errors);process.exitCode=1;}
else if(process.argv.includes('--json'))console.log(JSON.stringify(result,null,2));
else {
 console.log('HORIZONTE S03 — SINTÉTICO, REGLAS PROVISIONALES. No modifica una partida.');
 console.log(result.value.policyVersion,result.value.recommendation);
 console.table(result.value.comparison.alternatives.map((a,i)=>({action:JSON.stringify(a.action),afterShop:result.value.assessments[i]!.moneyAfterShop,
  rounds:result.value.assessments[i]!.roundsReached,balances:result.value.assessments[i]!.metrics.map(m=>m.moneyAfterRound).join(' → '),outcome:a.evaluation?.ok?a.evaluation.value.outcome:'no evaluable'})));
 console.log(result.value.limitations.join('\n'));
}
