import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {readFile,mkdir} from 'node:fs/promises';
const dir='docs/evidencia/cat03';await mkdir(dir,{recursive:true});
const server=spawn(process.execPath,['dist/src/server.js'],{env:{...process.env,PORT:'4184'},stdio:'pipe',windowsHide:true});
await new Promise((resolve,reject)=>{server.stdout.on('data',d=>String(d).includes('Balatro Advisor local')&&resolve());server.on('error',reject);server.on('exit',()=>reject(Error('Server stopped')));});
let browser;
try{
 browser=await chromium.launch({headless:true,channel:'chrome'});
 const p=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const go=async s=>{await p.locator(`[data-screen="${s}"]`).click();};
 const raw=()=>p.evaluate(()=>localStorage.getItem('balatro-advisor.confirmed.v1'));
 await p.goto('http://127.0.0.1:4184/');await p.waitForFunction(()=>document.querySelector('#ownership').textContent.includes('Esta pestaña tiene'));
 await go('archive');await p.locator('#import-file').setInputFiles({name:'state.json',mimeType:'application/json',buffer:await readFile('examples/shop-purchase.json')});await p.locator('#dialog-accept').click();await go('table');
 const original=await raw();
 const add=async name=>{await p.locator('#bay-search').fill(name);await p.locator('.bay-mini').first().click();await p.locator('#bay-add').click();};
 await add('runner');const runner=p.locator('.inventory-panel .joker-editor').first();assert.equal(await runner.locator('select[id^="joker-"] option').count(),150); // Metadata choices, not proof of all effects.
 await runner.locator('summary').click();assert.equal(await runner.locator('[data-counter="chips"]').inputValue(),'');await runner.locator('[data-counter="chips"]').fill('45');await runner.getByRole('button',{name:'Cerrar edición'}).click();await runner.locator('.joker-edit-drawer').waitFor({state:'hidden'});
 await add('juggler');assert.equal(await p.locator('#size').inputValue(),'9');
 await p.locator('#deck-editor > summary').click();await p.getByRole('combobox',{name:'Mejora KS',exact:true}).selectOption('steel');await p.locator('#deck-editor > summary').click();assert.equal(await raw(),original);
 await p.locator('#edit-reason').fill('Registrar Runner, Juggler y acero');await p.getByRole('button',{name:'Guardar actualización que transcribí'}).click();
 const saved=JSON.parse(await raw());assert.equal(saved.state.observed.jokers.value[0].counters.chips.value,45);assert.equal(saved.state.observed.resources.handSize.value,9);assert.equal(saved.state.observed.deck.value.cards.find(c=>c.instanceId==='KS').enhancement,'steel');
 await p.reload();await go('table');assert.equal(await p.locator('.inventory-panel .joker-editor [data-counter="chips"]').inputValue(),'45');assert.equal(await p.locator('#size').inputValue(),'9');
 await p.locator('.inventory-panel .joker-editor').first().locator('summary').click();await p.locator('.inventory-panel .joker-edit-drawer').first().screenshot({path:dir+'/counter-editor.png'});await p.locator('.inventory-panel .joker-editor').first().getByRole('button',{name:'Cerrar edición'}).click();await p.locator('.inventory-panel .joker-edit-drawer').first().waitFor({state:'hidden'});
 for(const width of [1440,390]){await p.setViewportSize({width,height:900});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
 await p.locator('.inventory-panel .joker-editor').last().locator('summary').click();await p.locator('.inventory-panel .joker-editor').last().getByRole('button',{name:'Quitar fila'}).click();assert.equal(await p.locator('#size').inputValue(),'8');
 assert.deepEqual(errors,[]);console.log('PASS CAT03 web: selección, contadores desconocidos, edición de acero, recursos al añadir/quitar, guardado y recarga, escritorio/móvil');
}finally{await browser?.close();server.kill();}

