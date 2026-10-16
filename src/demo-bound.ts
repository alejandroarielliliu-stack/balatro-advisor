import {readFileSync} from 'node:fs';
import {compareShopBounds} from './evaluation/shop-bounds.js';
const state:unknown=JSON.parse(readFileSync(new URL('../../examples/s09-bound.json',import.meta.url),'utf8'));
const result=compareShopBounds(state,{expectedRevision:0,updatedAt:'2026-10-10T18:00:00Z'});
if(!result.ok){console.error(result.errors);process.exitCode=1;}
else if(process.argv.includes('--json'))console.log(JSON.stringify(result,null,2));
else {
  console.log('S09 SINTÉTICO — COTAS DEL MODELO PROVISIONAL, NO PREDICCIÓN NI PARTIDA OBSERVADA');
  for(const a of result.value.alternatives){
    console.log(JSON.stringify(a.action));
    if(!a.shop.ok)console.log('Acción rechazada:',a.shop.errors.map(e=>e.message).join(' '));
    else if(a.bound?.ok){const b=a.bound.value;console.log(`${b.hands} × ${b.chipsPerHandUpper} × ${b.multPerHandUpper} = ${b.roundScoreUpper}; objetivo ${b.target}`);console.log(b.conclusion);console.log(b.terms);}
    else console.log('Cota no disponible:',a.bound);
  }
  console.log(result.value.conclusion);console.log(result.value.coverage);console.log(result.evidence);
}
