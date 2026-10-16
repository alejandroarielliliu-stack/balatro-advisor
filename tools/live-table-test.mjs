import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {readFile,mkdir} from 'node:fs/promises';
const dir='docs/evidencia/live-table';await mkdir(dir,{recursive:true});
const server=spawn(process.execPath,['dist/src/server.js'],{env:{...process.env,PORT:'4181'},stdio:'pipe',windowsHide:true});
await new Promise((resolve,reject)=>{server.stdout.on('data',d=>String(d).includes('Balatro Advisor local')&&resolve());server.on('error',reject);server.on('exit',()=>reject(Error('Server stopped')));});
let browser;
try{
 browser=await chromium.launch({headless:true,channel:'chrome'});
 const p=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const go=async s=>{await p.locator(`[data-screen="${s}"]`).click();};
 const raw=()=>p.evaluate(()=>localStorage.getItem('balatro-advisor.confirmed.v1'));
 const waitPreviews=(content='')=>p.waitForFunction(content=>{
  const cards=[...document.querySelectorAll('.candidate-card')];
  return cards.length>0&&cards.every(card=>card.dataset.previewStatus&&card.dataset.previewStatus!=='updating'&&card.querySelector('.candidate-info>.fit-score')?.textContent.trim())&&(!content||cards.some(card=>card.querySelector('.quick-fit-result')?.textContent.includes(content)));
 },content);
 await p.goto('http://127.0.0.1:4181/');await p.waitForFunction(()=>document.querySelector('#ownership').textContent.includes('Esta pestaña tiene'));
 await p.locator('.coverage-note>summary').click();await p.locator('#coverage').check();await p.locator('#money').fill('7');await p.locator('#blind-kind').selectOption('big');assert.equal(await p.locator('#reward').inputValue(),'4');
 const add=async(id,button)=>{await p.locator('#bay-search').fill(id);await p.locator('.bay-mini').click();await p.locator(button).click();};
 await add('half joker','#bay-candidate');assert.match(await p.locator('.candidate-info>.fit-score').innerText(),/^\d+\.\d$/);assert.equal(await p.locator('.candidate-delta').count(),0);assert.equal(await raw(),null);
 const exact=async expected=>{await go('evaluation');await p.locator('#calculate-hands').click();await p.waitForFunction(expected=>document.querySelector('#hand-results')?.textContent.includes(expected),expected);await go('table');};
 await go('evaluation');await p.getByRole('button',{name:'Añadir plantilla hipotética: dos parejas'}).click();await p.locator('.scenario').waitFor();await go('table');await exact('80 → 572 puntos');
 await add('j_joker','#bay-add');assert.equal(await p.locator('.inventory-panel .fit-score').count(),1);await exact('240 → 676 puntos');assert.equal(await raw(),null);
 await p.locator('#money').fill('0');await waitPreviews('Dinero insuficiente');await p.locator('.candidate-hero').click();assert.match(await p.locator('.candidate-dialog[open]').innerText(),/Dinero insuficiente/);assert.equal(await p.locator('.candidate-delta').count(),0);await p.keyboard.press('Escape');await p.locator('#money').fill('7');
 await go('evaluation');const cards=p.locator('input[id^="cards-"]').first();await cards.fill('ZZ');await p.locator('#calculate-hands').click();assert.equal(await cards.inputValue(),'ZZ');assert.equal(await p.locator('#hand-results .bay-score-value').count(),0);await cards.fill('8S 8H');await go('table');await exact('240 → 676 puntos');assert.equal(await raw(),null);
 await p.locator('#joker-candidates').screenshot({path:dir+'/live-candidate.png'});
 // Saving lives in Register and never includes the hypothetical plan.
 await go('archive');await p.getByRole('button',{name:'Crear y guardar mi partida'}).click();const saved=await raw();assert.ok(saved);await go('table');await p.locator('#money').fill('0');await waitPreviews('Dinero insuficiente');assert.equal(await raw(),saved);await p.locator('#money').fill('7');await exact('240 → 676 puntos');assert.equal(await raw(),saved);
 await go('evaluation');assert.equal(await p.locator('#scenarios').isVisible(),true);await go('table');assert.equal(await p.locator('#scenarios').isVisible(),false);assert.equal(await cards.inputValue(),'8S 8H');await p.setViewportSize({width:390,height:844});await p.locator('#joker-candidates').screenshot({path:dir+'/mobile.png'});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
 console.log('PASS Mesa encaje sin planes/guardar; cálculo exacto independiente enAnálisis80→572/240→676; ilegalidad y cartasinválidas; guardarRegistro; separación real/hipotético');
}finally{await browser?.close();server.kill();}
