import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {readFile,mkdir} from 'node:fs/promises';
const dir='docs/evidencia/candidates';await mkdir(dir,{recursive:true});
const server=spawn(process.execPath,['dist/src/server.js'],{env:{...process.env,PORT:'4180'},stdio:'pipe',windowsHide:true});
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
 await p.goto('http://127.0.0.1:4180/');await p.waitForFunction(()=>document.querySelector('#ownership').textContent.includes('Esta pestaña tiene'));
 await go('archive');await p.locator('#import-file').setInputFiles({name:'state.json',mimeType:'application/json',buffer:await readFile('examples/shop-purchase.json')});await p.locator('#dialog-accept').click();await go('table');
 await p.waitForFunction(()=>document.querySelectorAll('.bay-mini').length===150);const original=await raw();
 assert.equal(await p.locator('.board > .shop-panel').count(),0);assert.equal(await p.locator('#joker-candidates').count(),1);
 // Fit is available without a plan; hand scoring is a separate workflow.
 await p.locator('#bay-search').fill('half joker');await p.locator('.bay-mini').first().click();assert.match(await p.locator('#bay-dialog').innerText(),/Encaje contextual/);await p.locator('#bay-candidate').click();assert.equal(await p.locator('.candidate-card').getAttribute('data-preview-status'),'fit');assert.match(await p.locator('.candidate-card .fit-score').first().innerText(),/^\d+\.\d$/);assert.equal(await p.locator('.candidate-delta').count(),0);
 await p.locator('.candidate-hero').click();assert.match(await p.locator('.candidate-dialog').innerText(),/Índice/);assert.equal(await p.locator('.candidate-dialog .bay-score-value').count(),0);await p.keyboard.press('Escape');assert.equal(await raw(),original);
 await go('evaluation');await p.getByRole('button',{name:'Añadir plantilla hipotética: dos parejas'}).click();await p.locator('.scenario').waitFor();await p.locator('#calculate-hands').click();await p.waitForFunction(()=>document.querySelector('#hand-results')?.textContent.includes('80 → 572 puntos'));assert.match(await p.locator('#hand-results').innerText(),/dinero después|Dinero tras compra: \$2/i);await go('table');
 const add=async name=>{await p.locator('#bay-search').fill(name);await p.locator('.bay-mini').first().click();await p.locator('#bay-candidate').click();};
 await add('j_joker');assert.match(await p.locator('.candidate-card').nth(1).innerText(),/\b\d+\.\d\b/);
 await add('banner');await add('even steven');assert.equal(await p.locator('.candidate-card').count(),4);const tops=await p.locator('.candidate-card').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().top));assert.ok(tops.every(t=>t===tops[0]));assert.equal(await p.locator('.candidate-card>details').count(),0);assert.equal(await raw(),original);assert.equal(await p.locator('#draft-status').isVisible(),false);
 await add('scholar');assert.match(await p.locator('#candidate-note').innerText(),/Máximo 4/);await p.keyboard.press('Escape');
 assert.ok((await p.locator('#joker-candidates .candidate-grid').boundingBox()).height<=170,JSON.stringify(await p.locator('#joker-candidates').evaluate(e=>({height:e.getBoundingClientRect().height,children:[...e.children].map(c=>({class:c.className,height:c.getBoundingClientRect().height,text:c.textContent?.slice(0,80)}))}))));await p.locator('#joker-candidates').screenshot({path:dir+'/desktop.png'});await p.setViewportSize({width:390,height:844});await p.locator('#joker-candidates').screenshot({path:dir+'/mobile-compact.png'});await p.setViewportSize({width:1440,height:1000});
 const labels=await p.locator('.candidate-info>.fit-score').allTextContents();await go('evaluation');await p.locator('input[id^="description-"]').first().fill('Plan modificado');await go('table');await waitPreviews();assert.deepEqual(await p.locator('.candidate-info>.fit-score').allTextContents(),labels);assert.equal(await raw(),original);
 await p.locator('.candidate-card').first().getByRole('button',{name:'Quitar candidato',exact:true}).click();assert.equal(await p.locator('.candidate-card').count(),3);await add('perkeo');assert.match(await p.locator('.candidate-card').last().innerText(),/(?:\d+\.\d–\d+\.\d|≥\d+\.\d)/);
 await p.locator('#money').fill('0');await waitPreviews('Dinero insuficiente');assert.equal(await p.locator('.candidate-delta').count(),0);await p.locator('.candidate-card[data-candidate="j_joker"] .candidate-hero').click();assert.match(await p.locator('.candidate-dialog[open]').innerText(),/Dinero insuficiente/);await p.keyboard.press('Escape');assert.equal(await raw(),original);
 for(const width of [360,390,768,1440]){await p.setViewportSize({width,height:900});const ys=await p.locator('.candidate-card').evaluateAll(es=>es.map(e=>e.getBoundingClientRect().top));assert.ok(ys.every(y=>y===ys[0]));assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
 await p.setViewportSize({width:390,height:844});await p.locator('#joker-candidates').screenshot({path:dir+'/mobile.png'});assert.deepEqual(errors,[]);
 const example=JSON.parse(await readFile('examples/shop-purchase.json','utf8'));
 example.observed.jokers={status:'known',source:'manual',value:[{instanceId:'owned',catalogId:'half_joker',edition:{status:'known',source:'manual',value:'base'},stickers:{status:'known',source:'manual',value:[]},sellValue:{status:'known',source:'manual',value:2},counters:{}}]};
 await go('archive');await p.locator('#import-file').setInputFiles({name:'negative.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(example))});await p.locator('#dialog-accept').click();await go('table');
 const joker=p.locator('.candidate-card[data-candidate="j_joker"]');await joker.locator('.candidate-hero').click();await joker.locator('select[aria-label^="Reemplazo para"]').selectOption('owned');assert.match(await joker.locator('dialog').innerText(),/sacrifica|no hereda/);assert.equal(await joker.locator('.candidate-delta').count(),0);await p.keyboard.press('Escape');await joker.locator('dialog').waitFor({state:'hidden'});assert.equal(await joker.locator('.candidate-hero').evaluate(e=>document.activeElement===e),true);
 console.log('PASS candidatos: cuatro máximo/una fila, encaje sin planes, puntos80→572/$2 sóloAnálisis, planes no cambian notas, rango por datos faltantes, compra ilegal, reemplazo explicado y foco, inmutabilidad y móvil');
}finally{await browser?.close();server.kill();}
