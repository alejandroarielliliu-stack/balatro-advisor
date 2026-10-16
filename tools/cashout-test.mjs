import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {readFile,mkdir} from 'node:fs/promises';
const dir='docs/evidencia/auto-cashout';await mkdir(dir,{recursive:true});
const server=spawn(process.execPath,['dist/src/server.js'],{env:{...process.env,PORT:'4182'},stdio:'pipe',windowsHide:true});
await new Promise((resolve,reject)=>{server.stdout.on('data',d=>String(d).includes('Balatro Advisor local')&&resolve());server.on('error',reject);server.on('exit',()=>reject(Error('Server stopped')));});
let browser;
try{
 browser=await chromium.launch({headless:true,channel:'chrome'});
 const p=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const revealDetails=async(p,selector)=>{const d=p.locator(selector);if(await d.count()&&!await d.evaluate(e=>e.open))await d.locator(':scope > summary').click();};
 const go=async s=>{await p.locator(`[data-screen="${s}"]`).click();if(s==='table')await revealDetails(p,'.hand-calculation-data');};
 const raw=()=>p.evaluate(()=>localStorage.getItem('balatro-advisor.confirmed.v1'));
 await p.goto('http://127.0.0.1:4182/');await p.waitForFunction(()=>document.querySelector('#ownership').textContent.includes('Esta pestaña tiene'));
 await go('archive');await p.locator('#import-file').setInputFiles({name:'state.json',mimeType:'application/json',buffer:await readFile('examples/shop-purchase.json')});await p.locator('#dialog-accept').click();await go('table');
 await p.locator('#blind-kind').selectOption('small');assert.equal(await p.locator('#reward').inputValue(),'3');await p.locator('#blind-kind').selectOption('big');assert.equal(await p.locator('#reward').inputValue(),'4');
 await p.locator('#money').fill('101');await go('evaluation');await p.getByRole('button',{name:'Añadir plantilla hipotética: dos parejas'}).click();await p.locator('.scenario').waitFor();await go('table');
 const add=async name=>{await p.locator('#bay-search').fill(name);await p.locator('.bay-mini').first().click();await p.locator('#bay-add').click();};await add('half joker');await add('golden joker');
 await p.locator('#cashout-preview>summary').click();await p.waitForFunction(()=>document.querySelector('#cashout-results').textContent.includes('Cobro: $17')); // 4 blind + 4 hands + 4 Golden + 5 interest
 const voucher=async id=>{await p.locator(`[data-voucher="${id}"]`).click();await p.locator('#voucher-apply').click();};
 await voucher('v_seed_money');await p.waitForFunction(()=>document.querySelector('#cashout-results').textContent.includes('Cobro: $22'));
 await voucher('v_money_tree');await p.waitForFunction(()=>document.querySelector('#cashout-results').textContent.includes('Cobro: $32'));
 await p.locator('#cashout-preview').screenshot({path:dir+'/breakdown.png'});await p.setViewportSize({width:390,height:844});await p.locator('#cashout-preview').screenshot({path:dir+'/mobile.png'});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await p.setViewportSize({width:1440,height:1000});
 await p.locator('#cashout-manual').check();await p.locator('#cashout-override').fill('40');await p.waitForFunction(()=>document.querySelector('#cashout-results').textContent.includes('Total manual: $40'));await p.locator('#cashout-manual').uncheck();await p.waitForFunction(()=>document.querySelector('#cashout-results').textContent.includes('Cobro: $32'));
 await go('archive');await p.locator('#edit-reason').fill('Registrar vales e inventario');await go('archive');await p.getByRole('button',{name:'Guardar actualización que transcribí'}).click();await go('table');const saved=JSON.parse(await raw());assert.deepEqual(saved.state.observed.outOfScope.value.vouchers,['v_seed_money','v_money_tree']);assert.equal(saved.state.observed.money.value,101);await p.reload();await go('table');assert.equal(await p.locator('[data-voucher="v_money_tree"]').getAttribute('data-owned'),'true');
 await p.locator('#reward-manual').check();await p.locator('#reward').fill('9');await p.locator('#blind-kind').selectOption('small');assert.equal(await p.locator('#reward').inputValue(),'9');await p.locator('#reward-manual').uncheck();assert.equal(await p.locator('#reward').inputValue(),'3');
 await p.locator('.hand-calculation-data').screenshot({path:dir+'/desktop.png'});assert.deepEqual(errors,[]);console.log('PASS premio automático, cobro por Golden/manos/interés, Seed/Money Tree, corrección manual y persistencia sin sumar ingresos al saldo');
}finally{await browser?.close();server.kill();}
