import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {scoreHand} from '../dist/src/rules/scoring.js';
import {parseState} from '../dist/src/state/validation.js';

const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root),'utf8');
const provenance=JSON.parse(read('tools/reference/efhiii/provenance.json'));
for(const [name,hash] of Object.entries(provenance.sha256))assert.equal(createHash('sha256').update(readFileSync(new URL('tools/reference/efhiii/'+name,root))).digest('hex'),hash,`Referencia modificada: ${name}`);
const source=read('tools/reference/efhiii/balatro-sim.js');
const context=vm.createContext({});
vm.runInContext(source,context,{timeout:3000});
// IDs read from pinned source: switch cases, and cards.js sprite x + 10*y for Golden.
const jokerIds={joker:0,half_joker:7,banner:21,abstract_joker:33,even_steven:38,scholar:63,green_joker:112,golden_joker:29};
const categories=['flush_five','flush_house','five_kind','straight_flush','four_kind','full_house','flush','straight','three_kind','two_pair','pair','high_card'];
const ranks=['2','3','4','5','6','7','8','9','10','J','Q','K','A'];
const suits={H:0,C:1,D:2,S:3};
const known=value=>({status:'known',value,source:'manual'});
const unwrap=r=>{assert.ok(r.ok,JSON.stringify(r));return r.value;};
// Literal chips/mult derived before execution, never outputs of either engine.
const cases=[
 ['high',['KS'],[],3,0,'high_card',15,1],
 ['pair',['8S','8H'],[],3,0,'pair',26,2],
 ['two-pair',['8S','8H','2C','2D'],[],3,0,'two_pair',40,2],
 ['three',['8S','8H','8C'],[],3,0,'three_kind',54,3],
 ['straight',['2S','3H','4C','5D','6S'],[],3,0,'straight',50,4],
 ['ace-low',['AS','2H','3C','4D','5S'],[],3,0,'straight',55,4],
 ['flush',['2S','4S','6S','8S','JS'],[],3,0,'flush',65,4],
 ['full-house',['8S','8H','8C','2D','2S'],[],3,0,'full_house',68,4],
 ['four',['8S','8H','8C','8D','KS'],[],3,0,'four_kind',92,7],
 ['straight-flush',['2S','3S','4S','5S','6S'],[],3,0,'straight_flush',120,8],
 ['joker',['8S','8H'],['joker'],3,0,'pair',26,6],
 ['half-2',['8S','8H'],['half_joker'],3,0,'pair',26,22],
 ['half-3',['8S','8H','KS'],['half_joker'],3,0,'pair',26,22],
 ['half-4',['8S','8H','KS','QD'],['half_joker'],3,0,'pair',26,2],
 ['abstract-alone',['8S','8H'],['abstract_joker'],3,0,'pair',26,5],
 ['abstract-golden',['8S','8H'],['abstract_joker','golden_joker'],3,0,'pair',26,8],
 ['even-scoring',['8S','8H','2C'],['even_steven'],3,0,'pair',26,10],
 ['even-ace',['AS'],['even_steven'],3,0,'high_card',16,1],
 ['scholar',['AS','AH'],['scholar'],3,0,'pair',72,10],
 ['scholar-unscored',['8S','8H','AS'],['scholar'],3,0,'pair',26,2],
 ['banner-3',['8S','8H'],['banner'],3,0,'pair',116,2],
 ['banner-0',['8S','8H'],['banner'],0,0,'pair',26,2],
 ['green-0',['KS'],['green_joker'],3,0,'high_card',15,2],
 ['green-5',['KS'],['green_joker'],3,5,'high_card',15,7],
 ['golden-score-only',['8S','8H'],['golden_joker'],3,0,'pair',26,2],
 ['banner-even',['8S','8H'],['banner','even_steven'],3,0,'pair',116,10],
 ['even-banner',['8S','8H'],['even_steven','banner'],3,0,'pair',116,10],
 ['scholar-joker',['AS','AH'],['scholar','joker'],3,0,'pair',72,14],
 ['five-slots',['8S','8H'],['joker','half_joker','abstract_joker','even_steven','banner'],3,0,'pair',116,49]
];
const results=[];
for(const [id,cards,jokers,discards,green,category,chips,mult] of cases){
 const state=unwrap(parseState(read('examples/shop-purchase.json')));
 state.observed.jokers=known(jokers.map((catalogId,i)=>({instanceId:`j${i}`,catalogId,edition:known('base'),stickers:known([]),sellValue:known(catalogId==='joker'?1:catalogId==='golden_joker'?3:2),counters:catalogId==='green_joker'?{greenMult:known(green)}:{}})));
 const original=JSON.stringify(state);
 const local=scoreHand(state,{cardIds:cards,discardsRemaining:discards});
 assert.equal(JSON.stringify(state),original,'Entrada local mutada');
 context.input=JSON.stringify({cards:cards.map(id=>[ranks.indexOf(id.slice(0,-1)),suits[id.slice(-1)],0,0,0,0,0]),jokers:jokers.map(id=>[jokerIds[id],id==='banner'?discards:id==='green_joker'?green:0,0,0,0])});
 const foreign=JSON.parse(vm.runInContext('JSON.stringify((()=>{const h=new Hand(JSON.parse(input));h.compileAll();const r=h.simulate();return {score:r[0]*10**r[1],chips:r[2],mult:r[3][0]*10**r[3][1],type:h.typeOfHand};})())',context,{timeout:3000}));
 const expected={category,chips,mult,score:chips*mult};
 const equivalent=(actual)=>actual.category===category&&Math.abs(actual.score-expected.score)<1e-8&&Math.abs(actual.mult-mult)<1e-8&&actual.chips===chips;
 const external={category:categories[foreign.type],chips:foreign.chips,mult:foreign.mult,score:foreign.score};
 const internal=local.ok?{category:local.value.hand,chips:local.value.chips,mult:local.value.mult,score:local.value.score}:local;
 const passed=local.ok&&equivalent(internal)&&equivalent(external);
 results.push({id,input:{cards,jokers,discards,green},expected,local:internal,efhiii:external,passed,evidenceKind:'external_implementation',observedInGame:false});
 console.log(`${passed?'PASS':'FAIL'} ${id}: local=${local.ok?local.value.score:'ERROR'}, EFHIII=${foreign.score}, esperado=${expected.score}`);
}
const report={date:'2026-10-10',reference:provenance,scope:'Normal level-1 scoring only; no game observation, economy, discard sequence, bosses or strategic evaluation',passed:results.filter(r=>r.passed).length,failed:results.filter(r=>!r.passed).length,results};
mkdirSync(new URL('docs/evidencia/efhiii/',root),{recursive:true});
writeFileSync(new URL('docs/evidencia/efhiii/resultados.json',root),JSON.stringify(report,null,2)+'\n');
assert.equal(report.failed,0,'Discrepancias: revisar informe; no cambiar esperados para imitar motores.');
