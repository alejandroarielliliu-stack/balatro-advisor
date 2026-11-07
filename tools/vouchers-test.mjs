import {openWorkspace,reloadWorkspace} from './workspace-navigation.mjs';
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
 const record=async()=>JSON.parse(await raw());
 const revision=async expected=>{await p.waitForFunction(expected=>JSON.parse(localStorage.getItem('balatro-advisor.confirmed.v1')).state.revision===expected,expected);return record();};
 const manualSave=async reason=>{const previous=(await record()).state.revision;await go('archive');await p.locator('#edit-reason').fill(reason);await p.getByRole('button',{name:'Guardar actualización que transcribí'}).click();await revision(previous+1);await go('table');};
 await openWorkspace(p,'http://127.0.0.1:4183/#table');await p.waitForFunction(()=>document.querySelector('#ownership').textContent.includes('Esta pestaña tiene'));
 await go('archive');await p.locator('#import-file').setInputFiles({name:'state.json',mimeType:'application/json',buffer:await readFile('examples/shop-purchase.json')});await p.locator('#dialog-accept').click();await go('table');
 const original=(await record()).state;
 const choose=async id=>{const before=await record();if(!await p.locator(`[data-voucher="${id}"]`).count())await p.getByRole('button',{name:'Ver los 32',exact:true}).click();await p.locator(`[data-voucher="${id}"]`).click();await p.locator('#voucher-apply').click();await p.locator('.voucher-dialog').waitFor({state:'hidden'});const saved=await revision(before.state.revision+1);assert.equal(saved.history.at(-1).kind,'correction');assert.equal(saved.history.at(-1).action,null);assert.deepEqual(saved.state.observed.money,before.state.observed.money);};
 assert.equal(await p.locator('.voucher-tile').count(),10);
 await p.locator('[data-voucher="v_nacho_tong"]').click();assert.equal(await p.locator('#voucher-apply').isDisabled(),true);await p.locator('.voucher-dialog').getByRole('button',{name:'Cerrar'}).click();
 await choose('v_grabber');assert.equal(await p.locator('#hands').inputValue(),'6');
 await choose('v_nacho_tong');assert.equal(await p.locator('#hands').inputValue(),'7');
 await p.locator('[data-voucher="v_grabber"]').click();assert.equal(await p.locator('#voucher-apply').isDisabled(),true);await p.locator('.voucher-dialog').getByRole('button',{name:'Cerrar'}).click();
 await choose('v_blank');await choose('v_antimatter');assert.equal(await p.locator('#slots').inputValue(),'6');
 await choose('v_paint_brush');assert.equal(await p.locator('#size').inputValue(),'9');
 const observed=await raw();await p.locator('#starting-deck').selectOption('painted');assert.equal(await p.locator('#size').inputValue(),'11');assert.equal(await p.locator('#slots').inputValue(),'5');
 await p.locator('#starting-deck').selectOption('blue');assert.equal(await p.locator('#size').inputValue(),'9');assert.equal(await p.locator('#hands').inputValue(),'7');
 assert.equal(await raw(),observed);assert.deepEqual((await record()).state.observed.money,original.observed.money);assert.equal(await p.locator('#money').inputValue(),'7');
 await p.getByRole('button',{name:'Ver los 32'}).click();assert.equal(await p.locator('.voucher-tile').count(),32);
 await p.locator('[data-voucher="v_observatory"]').click();assert.equal(await p.locator('#voucher-apply').isDisabled(),true);await p.locator('.voucher-dialog').getByRole('button',{name:'Cerrar'}).click();
 await p.getByRole('button',{name:'Reducir lista'}).click();
 await p.locator('#vouchers').screenshot({path:dir+'/desktop.png'});
 await p.setViewportSize({width:390,height:844});await p.locator('#vouchers').screenshot({path:dir+'/mobile.png'});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await p.setViewportSize({width:1440,height:1000});await manualSave('Confirmar el cambio avanzado de baraja y sus recursos; los vales ya estaban registrados.');
 const saved=JSON.parse(await raw());assert.equal(saved.state.observed.resources.handsPerRound.value,7);assert.equal(saved.state.observed.resources.handSize.value,9);assert.equal(saved.state.observed.outOfScope.value.vouchers.length,5);
 await reloadWorkspace(p);await go('table');assert.equal(await p.locator('[data-voucher="v_grabber"]').getAttribute('data-owned'),'true');assert.equal(await p.locator('#hands').inputValue(),'7');
 await choose('v_nacho_tong');assert.equal(await p.locator('#hands').inputValue(),'6');await choose('v_grabber');assert.equal(await p.locator('#hands').inputValue(),'5');
 const recordedRevision=(await record()).state.revision;
 await p.getByRole('button',{name:'Ver los 32'}).click();
 await choose('v_tarot_merchant');assert.equal(await p.locator('[data-voucher="v_tarot_merchant"]').getAttribute('data-owned'),'true');
 await choose('v_hieroglyph');assert.equal(await p.locator('#hands').inputValue(),'');
 assert.equal(await p.locator('#ante').inputValue(),'1'); // Never repeat the voucher's historical ante reduction.
 assert.equal(await p.locator('.composition-bar[data-section="resources"]').getAttribute('data-status'),'partial');
 await p.locator('details').filter({has:p.locator('#hands')}).locator(':scope > summary').click();
 await p.locator('#hands').fill('4');await manualSave('Transcribir las manos actuales tras Jeroglífico.');
 const beforeMoney=await raw(),moneyRevision=(await record()).state.revision;await p.locator('#money').fill('8');assert.equal(await raw(),beforeMoney);await p.locator('#money').press('Tab');await revision(moneyRevision+1);assert.equal(await p.locator('#hands').inputValue(),'4');
 await choose('v_wasteful');assert.equal(await p.locator('#hands').inputValue(),'4');assert.equal(await p.locator('#discards').inputValue(),'4');
 await choose('v_petroglyph');assert.equal(await p.locator('#discards').inputValue(),'');
 const resourceDetails=p.locator('details').filter({has:p.locator('#discards')});if(!await resourceDetails.evaluate(e=>e.open))await resourceDetails.locator(':scope > summary').click();await p.locator('#discards').fill('3');await manualSave('Transcribir los descartes actuales tras Petroglifo.');
 await choose('v_seed_money');assert.equal(await p.locator('#hands').inputValue(),'4');assert.equal(await p.locator('#discards').inputValue(),'3');
 const observedDocumentary=await record();assert.ok(observedDocumentary.state.revision>recordedRevision);assert.equal(observedDocumentary.state.observed.money.value,8);assert.ok(observedDocumentary.history.every(entry=>entry.kind==='correction'&&entry.action===null)); // Owned vouchers are observations, never purchases or projected income.
 await reloadWorkspace(p);await go('table');
 assert.equal(await p.locator('[data-voucher="v_tarot_merchant"]').getAttribute('data-owned'),'true');
 assert.equal(await p.locator('[data-voucher="v_hieroglyph"]').getAttribute('data-owned'),'true');
 assert.equal(await p.locator('#hands').inputValue(),'4');assert.equal(await p.locator('#discards').inputValue(),'3');
 await choose('v_grabber');assert.equal(await p.locator('#hands').inputValue(),''); // Requires actual transcription again.
 assert.deepEqual(errors,[]);console.log('PASS vales: 10 efectos / 32 registrables, prerrequisitos, observaciones autoguardadas sin compra ni gasto, recursos avanzados explícitos, Jeroglífico/Petroglifo y móvil');
}finally{await browser?.close();server.kill();}

