import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {readFile,mkdir} from 'node:fs/promises';
const dir='docs/evidencia/vales';await mkdir(dir,{recursive:true});
const server=spawn(process.execPath,['dist/src/server.js'],{env:{...process.env,PORT:'4183'},stdio:'pipe',windowsHide:true});
await new Promise((resolve,reject)=>{server.stdout.on('data',d=>String(d).includes('Balatro Advisor local')&&resolve());server.on('error',reject);server.on('exit',()=>reject(Error('Server stopped')));});
let browser;
try{
 browser=await chromium.launch({headless:true,channel:'chrome'});
 const p=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const go=async s=>{await p.locator(`[data-screen="${s}"]`).click();};
 const raw=()=>p.evaluate(()=>localStorage.getItem('balatro-advisor.confirmed.v1'));
 await p.goto('http://127.0.0.1:4183/');await p.waitForFunction(()=>document.querySelector('#ownership').textContent.includes('Esta pestaña tiene'));
 await go('archive');await p.locator('#import-file').setInputFiles({name:'state.json',mimeType:'application/json',buffer:await readFile('examples/shop-purchase.json')});await p.locator('#dialog-accept').click();await go('table');
 const original=await raw();
 const choose=async id=>{await p.locator(`[data-voucher="${id}"]`).click();await p.locator('#voucher-apply').click();};
 assert.equal(await p.locator('.voucher-tile').count(),10);
 await p.locator('[data-voucher="v_nacho_tong"]').click();assert.equal(await p.locator('#voucher-apply').isDisabled(),true);await p.locator('.voucher-dialog').getByRole('button',{name:'Cerrar'}).click();
 await choose('v_grabber');assert.equal(await p.locator('#hands').inputValue(),'6');
 await choose('v_nacho_tong');assert.equal(await p.locator('#hands').inputValue(),'7');
 await p.locator('[data-voucher="v_grabber"]').click();assert.equal(await p.locator('#voucher-apply').isDisabled(),true);await p.locator('.voucher-dialog').getByRole('button',{name:'Cerrar'}).click();
 await choose('v_blank');await choose('v_antimatter');assert.equal(await p.locator('#slots').inputValue(),'6');
 await choose('v_paint_brush');assert.equal(await p.locator('#size').inputValue(),'9');
 await p.locator('#starting-deck').selectOption('painted');assert.equal(await p.locator('#size').inputValue(),'11');assert.equal(await p.locator('#slots').inputValue(),'5');
 await p.locator('#starting-deck').selectOption('blue');assert.equal(await p.locator('#size').inputValue(),'9');assert.equal(await p.locator('#hands').inputValue(),'7');
 assert.equal(await raw(),original);assert.equal(await p.locator('#money').inputValue(),'7');
 await p.getByRole('button',{name:'Ver los 32'}).click();assert.equal(await p.locator('.voucher-tile').count(),32);
 await p.locator('[data-voucher="v_observatory"]').click();assert.equal(await p.locator('#voucher-apply').isDisabled(),true);await p.locator('.voucher-dialog').getByRole('button',{name:'Cerrar'}).click();
 await p.getByRole('button',{name:'Reducir lista'}).click();
 await p.locator('#vouchers').screenshot({path:dir+'/desktop.png'});
 await p.setViewportSize({width:390,height:844});await p.locator('#vouchers').screenshot({path:dir+'/mobile.png'});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await p.setViewportSize({width:1440,height:1000});await go('archive');await p.locator('#edit-reason').fill('Registrar vales');await go('archive');await p.getByRole('button',{name:'Guardar actualización que transcribí'}).click();await go('table');
 const saved=JSON.parse(await raw());assert.equal(saved.state.observed.resources.handsPerRound.value,7);assert.equal(saved.state.observed.resources.handSize.value,9);assert.equal(saved.state.observed.outOfScope.value.vouchers.length,5);
 await p.reload();await go('table');assert.equal(await p.locator('[data-voucher="v_grabber"]').getAttribute('data-owned'),'true');assert.equal(await p.locator('#hands').inputValue(),'7');
 await choose('v_nacho_tong');assert.equal(await p.locator('#hands').inputValue(),'6');await choose('v_grabber');assert.equal(await p.locator('#hands').inputValue(),'5');
 const recorded=await raw();
 await p.getByRole('button',{name:'Ver los 32'}).click();
 await choose('v_tarot_merchant');assert.equal(await p.locator('[data-voucher="v_tarot_merchant"]').getAttribute('data-owned'),'true');
 await choose('v_hieroglyph');assert.equal(await p.locator('#hands').inputValue(),'');
 assert.equal(await p.locator('#ante').inputValue(),'1'); // Never repeat the voucher's historical ante reduction.
 assert.equal(await p.locator('.composition-bar[data-section="resources"]').getAttribute('data-status'),'partial');
 await p.locator('details').filter({has:p.locator('#hands')}).locator(':scope > summary').click();
 await p.locator('#hands').fill('4');
 await p.locator('#money').fill('8');assert.equal(await p.locator('#hands').inputValue(),'4');
 await choose('v_wasteful');assert.equal(await p.locator('#hands').inputValue(),'4');assert.equal(await p.locator('#discards').inputValue(),'4');
 await choose('v_petroglyph');assert.equal(await p.locator('#discards').inputValue(),'');
 await p.locator('#discards').fill('3');
 await choose('v_seed_money');assert.equal(await p.locator('#hands').inputValue(),'4');assert.equal(await p.locator('#discards').inputValue(),'3');
 assert.equal(await raw(),recorded); // Selecting documentary vouchers remains a draft, not a transaction.
 await go('archive');await p.locator('#edit-reason').fill('Transcribir vales documentales y recursos actuales');
 await p.getByRole('button',{name:'Guardar actualización que transcribí'}).click();
 await p.reload();await go('table');
 assert.equal(await p.locator('[data-voucher="v_tarot_merchant"]').getAttribute('data-owned'),'true');
 assert.equal(await p.locator('[data-voucher="v_hieroglyph"]').getAttribute('data-owned'),'true');
 assert.equal(await p.locator('#hands').inputValue(),'4');assert.equal(await p.locator('#discards').inputValue(),'3');
 await choose('v_grabber');assert.equal(await p.locator('#hands').inputValue(),''); // Requires actual transcription again.
 assert.deepEqual(errors,[]);console.log('PASS vales: 10 efectos / 32 registrables, prerrequisitos, recursos, cambio de baraja, persistencia, registro separado, Jeroglífico/Petroglifo y móvil');
}finally{await browser?.close();server.kill();}

