import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';

// A temporary Chromium profile and isolated origin. No existing run is loaded.
 // Numerical notes below assert the published index policy, not hand points,
// game observations, optimal choices or a win probability.
const dir='docs/evidencia/quick-fit';
await mkdir(dir,{recursive:true});
const report={date:new Date().toISOString(),policy:'quick-fit-2',environment:'Chromium desktop and mobile emulation',gameObservation:false,cases:[]};
const pass=(id,expected,observed)=>report.cases.push({id,expected,observed,status:'passed'});
const server=spawn(process.execPath,['dist/src/server.js'],{env:{...process.env,PORT:'4192'},stdio:'pipe',windowsHide:true});
await new Promise((resolve,reject)=>{
 const timeout=setTimeout(()=>reject(Error('Server did not start on 4192')),15000);
 server.stdout.on('data',data=>{if(String(data).includes('Balatro Advisor local')){clearTimeout(timeout);resolve();}});
 server.on('error',error=>{clearTimeout(timeout);reject(error);});
 server.on('exit',()=>{clearTimeout(timeout);reject(Error('Server stopped before the test'));});
});
let browser;
try{
 browser=await chromium.launch({headless:true,channel:'chrome'});
 const context=await browser.newContext({viewport:{width:1440,height:1000}});
 const p=await context.newPage(),errors=[];
 p.on('pageerror',error=>errors.push(error.message));
 const go=async screen=>p.locator(`[data-screen="${screen}"]`).click();
 const stored=()=>p.evaluate(()=>localStorage.getItem('balatro-advisor.confirmed.v1'));
 const openBay=async id=>{await p.locator('#bay-search').fill(id);await p.locator(`[data-bay-joker="${id}"]`).click();};
 const addOwned=async id=>{await openBay(id);await p.locator('#bay-add').click();await p.locator('#bay-dialog').waitFor({state:'hidden'});};
 const addCandidate=async id=>{await openBay(id);await p.locator('#bay-candidate').click();await p.locator('#bay-dialog').waitFor({state:'hidden'});};
 const ownedRow=async catalogId=>{
  const rows=p.locator('.inventory-panel .joker-editor');
  for(let i=0;i<await rows.count();i++)if(await rows.nth(i).locator('select[id^="joker-"]').inputValue()===catalogId)return rows.nth(i);
  throw Error('Owned joker row not found: '+catalogId);
 };
 const candidate=id=>p.locator(`.candidate-card[data-candidate="${id}"]`);
 const waitFits=()=>p.waitForFunction(()=>{
  const cards=[...document.querySelectorAll('.candidate-card')];
  return cards.length===4&&cards.every(card=>card.querySelector('.fit-score')?.textContent?.match(/^\d+\.\d$/));
 });
 const exactFit=async locator=>{
  const text=(await locator.locator('.fit-score').first().innerText()).trim();
  assert.match(text,/^\d+\.\d$/,'Expected an exact contextual index, not hand points: '+text);
  const score=Number(text);assert.ok(Number.isFinite(score)&&score>=0);return score;
 };
 const ownedLabelsFit=async()=>{
  await p.waitForFunction(()=>document.querySelector('.inventory-panel').getAnimations({subtree:true}).every(a=>a.playState!=='running'));
  return p.locator('.inventory-panel').evaluate(panel=>{
  const box=panel.getBoundingClientRect(),shelf=panel.querySelector('.joker-shelf').getBoundingClientRect();
  return [...panel.querySelectorAll('.fit-score')].every(label=>{
   const b=label.getBoundingClientRect();return b.top>=box.top&&b.bottom<=box.bottom&&b.top>=shelf.top&&b.bottom<=shelf.bottom;
  });
  });
 };
 await p.goto('http://127.0.0.1:4192/');
 await p.waitForFunction(()=>document.querySelector('#ownership').textContent.includes('Esta pestaña tiene'));
 await p.waitForFunction(()=>document.querySelectorAll('.bay-mini').length===150);
 assert.equal(await stored(),null);
 assert.equal(await p.locator('#coverage').isChecked(),false);
 assert.equal(await p.locator('#scenarios').isVisible(),false);
 assert.equal(await p.locator('#table-view #scenarios').count(),0);
 assert.equal(await p.locator('#evaluation-view #scenarios').count(),1);
 assert.equal(await p.locator('.scenario').count(),0);
 await p.locator('#money').fill('20');await p.locator('#ante').fill('1');
 await addOwned('j_joker');await addOwned('j_greedy_joker');
 await p.waitForFunction(()=>document.querySelectorAll('.inventory-panel .fit-score').length===2);
 const joker=await ownedRow('joker'),greedy=await ownedRow('greedy_joker');
 const initialJoker=await exactFit(joker);await exactFit(greedy);
 assert.equal(await ownedLabelsFit(),true,'Owned labels stay inside the fixed-height tray.');
 assert.equal(await p.locator('#coverage').isChecked(),false);
 assert.equal(await p.locator('.scenario').count(),0);
 pass('basic-inputs','Owned notes use basic inputs; no coverage checkbox, saved run or plan required',{owned:2,jokerFit:initialJoker,coverageChecked:false,plans:0});
 await addOwned('j_lusty_joker');const lusty=await ownedRow('lusty_joker'),blueLusty=await exactFit(lusty);
 await p.locator('#starting-deck').selectOption('checkered');await p.waitForFunction(()=>document.querySelector('#deck-editor>summary')?.textContent.includes('52 cartas'));
 const checkerLusty=await exactFit(lusty);assert.ok(checkerLusty>blueLusty,'26/52 hearts provides stronger editorial material support than 13/52.');
 await p.locator('#starting-deck').selectOption('blue');await lusty.locator('.card-settings>summary').click();await lusty.getByRole('button',{name:'Quitar fila',exact:true}).click();
 assert.equal(await stored(),null);pass('starting-composition','Fresh initial templates follow the selected deck; known hearts density changes the fit without entering any hand',{blue:blueLusty,checkered:checkerLusty});
 for(const id of ['j_half','j_banner','j_photograph','j_steel_joker'])await addCandidate(id);
 await waitFits();
 assert.equal(await p.locator('.candidate-card').count(),4);
 assert.equal(await p.locator('.candidate-delta').count(),0);
 assert.equal(await p.locator('#money').inputValue(),'20');
 assert.equal(await stored(),null);
 for(const id of ['j_half','j_banner','j_photograph','j_steel_joker'])await exactFit(candidate(id));
 const tops=await p.locator('.candidate-card').evaluateAll(cards=>cards.map(card=>card.getBoundingClientRect().top));
 assert.ok(tops.every(top=>top===tops[0]));
 pass('shortlist','Four separate contextual indices in one row; no hand deltas, purchase or money mutation',{count:4,handDeltas:0,money:'20'});
 await p.locator('#ante').fill('8');
 await p.waitForFunction(()=>document.querySelectorAll('.candidate-card').length===4&&document.querySelectorAll('.candidate-card .fit-score').length>=4&&!document.querySelector('.candidate-pending'));
 const lateJoker=await exactFit(joker);assert.ok(lateJoker<initialJoker,'The fixed Mult profile has a lower stage axis at the end under the published heuristic.');
 pass('stage','Changing ante recomputes without playing a hand; fixed Mult has less late-stage weight',{early:initialJoker,late:lateJoker});
 await addOwned('j_green_joker');
 const green=await ownedRow('green_joker');
 await p.waitForFunction(()=>[...document.querySelectorAll('.inventory-panel .joker-editor')].some(row=>row.querySelector('select[id^="joker-"]')?.value==='green_joker'&&/(?:\d+\.\d–\d+\.\d|≥\d+\.\d)/.test(row.querySelector('.fit-score')?.textContent??'')));
 const unknownGreen=await green.locator('.fit-score').first().innerText();assert.match(unknownGreen,/(?:\d+\.\d–\d+\.\d|≥\d+\.\d)/);
 await green.locator('.card-settings>summary').click();
 await green.locator('input[id^="green-"]').fill('12');
 await green.getByRole('button',{name:'Cerrar edición',exact:true}).click();
 await p.waitForFunction(()=>[...document.querySelectorAll('.inventory-panel .joker-editor')].some(row=>row.querySelector('select[id^="joker-"]')?.value==='green_joker'&&/^\d+\.\d$/.test(row.querySelector('.fit-score')?.textContent??'')));
 const knownGreen=await exactFit(green);
 assert.equal(knownGreen,76.8,'Ante8: developed Green base70 + Mult12 bonus6.7807, independently worked policy oracle.');
 await green.locator('.card-settings>summary').click();
 await green.locator('input[id^="green-"]').fill('13');
 await green.getByRole('button',{name:'Cerrar edición',exact:true}).click();
 const incrementedGreen=await exactFit(green);assert.equal(incrementedGreen,77.2);
 await addOwned('j_perkeo');const perkeo=await ownedRow('perkeo');
 assert.match(await perkeo.locator('.fit-score').first().innerText(),/^\d+\.\d–\d+\.\d$/);
 for(const width of [390,1440]){
  await p.setViewportSize({width,height:1000});assert.equal(await ownedLabelsFit(),true);
  assert.equal(await perkeo.locator('.fit-score').first().evaluate(label=>label.getBoundingClientRect().width<=label.closest('.joker-editor').getBoundingClientRect().width),true,'Unknown range fits its owned-card slot.');
 }
 await perkeo.locator('.card-settings>summary').click();await perkeo.getByRole('button',{name:'Quitar fila',exact:true}).click();
 assert.equal(await p.locator('#money').inputValue(),'20');assert.equal(await stored(),null);
 pass('counter','Unknown Mult has no invented upper bound; Mult12→13 distinguishes small changes in the published heuristic',{unknown:unknownGreen,mult12:knownGreen,mult13:incrementedGreen});
 await p.locator('#starting-deck').selectOption('abandoned');
 await p.locator('#deck-editor>summary').click();
 await p.getByRole('button',{name:'Usar composición inicial que confirmé',exact:true}).click();
 await p.waitForFunction(()=>document.querySelector('.candidate-card[data-candidate="j_photograph"] .quick-fit-result')?.dataset.fitScore==='20');
 const noFaces=await exactFit(candidate('j_photograph'));assert.ok(noFaces<=20,'Documented policy cap when a known required condition is unavailable.');
 assert.match(await candidate('j_photograph').locator('.candidate-info>.fit-score').getAttribute('title'),/Sin figuras|figuras/i);
 await p.getByRole('button',{name:'Añadir carta observada',exact:true}).click();
 await p.locator('.deck-card-editor').last().getByRole('combobox',{name:/^Rango /}).selectOption('Q');
 await p.waitForFunction(()=>Number(document.querySelector('.candidate-card[data-candidate="j_photograph"] .quick-fit-result')?.dataset.fitScore)>20);
 const withFace=await exactFit(candidate('j_photograph'));assert.ok(withFace>noFaces);
 await p.locator('#starting-deck').selectOption('blue');assert.equal(await p.locator('.deck-card-editor').count(),41);await p.locator('#starting-deck').selectOption('abandoned');assert.equal(await p.locator('.deck-card-editor').count(),41);
 // A figure in the deck makes activation possible; it is not a scoring hand.
 await candidate('j_photograph').locator('.candidate-hero').click();
 assert.match(await p.locator('.candidate-dialog[open]').innerText(),/robar|utilizar|figuras/i);
 assert.equal(await p.locator('.candidate-dialog[open] .bay-score-value').count(),0);
 await p.keyboard.press('Escape');await p.locator('#deck-editor>summary').click();
 assert.equal(await stored(),null);
 pass('deck-material','Abandoned without figures caps Photograph; explicitly adding a queen provides potential support',{noFigures:noFaces,withQueen:withFace,handScoreComputed:false});
 await p.screenshot({path:dir+'/mesa-desktop.png',fullPage:true});
 await p.locator('.inventory-panel').screenshot({path:dir+'/indice-comodines.png'});
 const save=p.getByRole('button',{name:'Crear y guardar mi partida',exact:true});
 assert.equal(await save.isVisible(),false);
 await go('archive');assert.equal(await save.isVisible(),true);
 assert.equal(await save.evaluate(button=>button.form===document.querySelector('#state-form form')),true,'Moving save controls preserves form ownership.');
 assert.equal(await stored(),null);await go('evaluation');
 assert.equal(await p.locator('#scenarios').isVisible(),true);assert.equal(await save.isVisible(),false);
 await go('table');assert.equal(await p.locator('#scenarios').isVisible(),false);
 pass('separate-workflows','Hands only in Analysis, save controls only in Register, form ownership preserved',{handsInAnalysis:true,saveInRegister:true,storedRun:null});
 for(const width of [390,768,1440]){
  await p.setViewportSize({width,height:900});
  const rowTops=await p.locator('.candidate-card').evaluateAll(cards=>cards.map(card=>card.getBoundingClientRect().top));
  assert.ok(rowTops.every(top=>top===rowTops[0]));
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.equal(await ownedLabelsFit(),true);
 }
 await p.setViewportSize({width:390,height:844});
 await p.screenshot({path:dir+'/mesa-mobile.png',fullPage:true});
 assert.equal(await stored(),null);assert.deepEqual(errors,[]);
 pass('responsive','390–1440px has no document overflow; shortlist stays in one row',{widths:[390,768,1440],pageErrors:errors,physicalAndroidTest:false});
 report.status='passed';await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');
 console.log('PASS quick fit: basic inputs/no plan/no save, owned and four candidates, stage, unknown counter, deck support, separate hands/Register, no persistence writes, desktop/mobile emulation');
}catch(error){
 report.status='failed';report.error=error.message;await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');throw error;
}finally{await browser?.close();server.kill();}
