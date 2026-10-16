import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {readFile,mkdir} from 'node:fs/promises';
const dir='docs/evidencia/auto-target';await mkdir(dir,{recursive:true});
const server=spawn(process.execPath,['dist/src/server.js'],{env:{...process.env,PORT:'4179'},stdio:'pipe',windowsHide:true});
await new Promise((resolve,reject)=>{server.stdout.on('data',d=>String(d).includes('Balatro Advisor local')&&resolve());server.on('error',reject);server.on('exit',()=>reject(Error('Server stopped')));});
let browser;
try{
 browser=await chromium.launch({headless:true,channel:'chrome'});
 const p=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const revealDetails=async(p,selector)=>{const d=p.locator(selector);if(await d.count()&&!await d.evaluate(e=>e.open))await d.locator(':scope > summary').click();};
 const go=async s=>{await p.locator(`[data-screen="${s}"]`).click();if(s==='table')await revealDetails(p,'.hand-calculation-data');};
 const raw=()=>p.evaluate(()=>localStorage.getItem('balatro-advisor.confirmed.v1'));
 await p.goto('http://127.0.0.1:4179/');await p.waitForFunction(()=>document.querySelector('#ownership').textContent.includes('Esta pestaña tiene'));
 await go('archive');await p.locator('#import-file').setInputFiles({name:'state.json',mimeType:'application/json',buffer:await readFile('examples/shop-purchase.json')});await p.locator('#dialog-accept').click();await go('table');
 const original=await raw();assert.equal(await p.locator('#target').inputValue(),'450');assert.equal(await p.locator('#target').getAttribute('readonly'),'');
 await p.locator('#ante').fill('2');assert.equal(await p.locator('#target').inputValue(),'1200');
 await p.locator('#starting-deck').selectOption('plasma');assert.equal(await p.locator('#target').inputValue(),'2400');
 await p.locator('#blind-kind').selectOption('boss');assert.equal(await p.locator('#target').inputValue(),'');
 await p.locator('#boss').selectOption('the_wall');assert.equal(await p.locator('#target').inputValue(),'6400');
 await p.locator('#ante').fill('8');assert.equal(await p.locator('#target').inputValue(),'');await p.locator('#boss').selectOption('violet_vessel');assert.equal(await p.locator('#target').inputValue(),'600000');
 await p.locator('#target-manual').check();await p.locator('#target').fill('12345');await p.locator('#starting-deck').selectOption('blue');assert.equal(await p.locator('#target').inputValue(),'12345');assert.equal(await raw(),original);
 await go('archive');await p.locator('#edit-reason').fill('Objetivo visible distinto');await go('archive');await p.getByRole('button',{name:'Guardar actualización que transcribí'}).click();await go('table');await p.reload();await go('table');assert.equal(await p.locator('#target').inputValue(),'12345');assert.equal(await p.locator('#target-manual').isChecked(),true);
 await p.locator('#target-manual').uncheck();assert.equal(await p.locator('#target').inputValue(),'300000');await go('archive');await p.locator('#edit-reason').fill('Usar objetivo del modelo');await go('archive');await p.getByRole('button',{name:'Guardar actualización que transcribí'}).click();await go('table');assert.deepEqual(JSON.parse(await raw()).state.observed.nextBlind.value.target,{status:'known',source:'confirmedPreset',value:300000});
 await p.reload();await go('table');assert.equal(await p.locator('#target').inputValue(),'300000');await p.locator('.hand-calculation-data').screenshot({path:dir+'/desktop.png'});
 await p.setViewportSize({width:390,height:844});await p.locator('.hand-calculation-data').screenshot({path:dir+'/mobile.png'});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);
 console.log('PASS objetivo automático, Plasma/jefes, desconocidos, manual conservado, guardado/recarga y procedencia');
}finally{await browser?.close();server.kill();}
