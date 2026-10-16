import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {readFile,mkdir} from 'node:fs/promises';
const dir='docs/evidencia/joker-bay';await mkdir(dir,{recursive:true});
const server=spawn(process.execPath,['dist/src/server.js'],{env:{...process.env,PORT:'4178'},stdio:'pipe',windowsHide:true});
await new Promise((resolve,reject)=>{server.stdout.on('data',d=>String(d).includes('Balatro Advisor local')&&resolve());server.on('error',reject);server.on('exit',()=>reject(Error('Server stopped')));});
let browser;
try{
 browser=await chromium.launch({headless:true,channel:'chrome'});
 const p=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const go=async s=>{await p.locator(`[data-screen="${s}"]`).click();};
 const raw=()=>p.evaluate(()=>localStorage.getItem('balatro-advisor.confirmed.v1'));
 await p.goto('http://127.0.0.1:4178/');await p.waitForFunction(()=>document.querySelector('#ownership').textContent.includes('Esta pestaña tiene'));
 await go('archive');await p.locator('#import-file').setInputFiles({name:'state.json',mimeType:'application/json',buffer:await readFile('examples/shop-purchase.json')});await p.locator('#dialog-accept').click();await go('table');
 await p.waitForFunction(()=>document.querySelectorAll('.bay-mini').length===150);const original=await raw();
 const height=()=>p.locator('.inventory-panel').evaluate(e=>e.getBoundingClientRect().height);
 const desktopHeight=await height();assert.ok(desktopHeight>0);
 assert.equal(await p.locator('#bay-filter').count(),0);assert.equal(await p.getByRole('button',{name:'Añadir comodín poseído',exact:true}).count(),0);
 const catalog=JSON.parse(await readFile('web/assets/jokers/catalog.json','utf8')).jokers;
 const chip=(kind,value)=>p.locator(`.bay-filter-chip[data-filter-kind="${kind}"][data-filter-value="${value}"]`);
 const ids=()=>p.locator('.bay-mini').evaluateAll(es=>es.map(e=>e.dataset.bayJoker));
 await chip('rarity',1).click();assert.deepEqual(await ids(),catalog.filter(j=>j.rarity===1).map(j=>j.id));
 await chip('rarity',3).click();assert.deepEqual(await ids(),catalog.filter(j=>[1,3].includes(j.rarity)).map(j=>j.id));
 await chip('price',4).click();await chip('price',6).click();assert.deepEqual(await ids(),catalog.filter(j=>[1,3].includes(j.rarity)&&[4,6].includes(j.basePrice)).map(j=>j.id));
 await chip('rarity',1).click();assert.deepEqual(await ids(),catalog.filter(j=>j.rarity===3&&[4,6].includes(j.basePrice)).map(j=>j.id));
 await chip('rarity',3).click();await chip('price',4).click();await chip('price',6).click();assert.equal(await p.locator('.bay-mini').count(),150);assert.equal(await raw(),original);assert.equal(await p.locator('#draft-status').isVisible(),false);
 await p.locator('#bay-search').fill('perkeo');assert.equal(await height(),desktopHeight);
 // A strategic profile allows transcription without pretending its effect is
 // implemented in the exact hand engine. Perkeo still needs consumable data.
 await p.locator('.bay-mini[data-bay-joker="j_perkeo"]').click();assert.match(await p.locator('#bay-preview').innerText(),/consumibles|condiciones concretas/i);assert.equal(await p.locator('#bay-preview [data-preview-status]').getAttribute('data-preview-status'),'fit');assert.match(await p.locator('#bay-preview .fit-score').innerText(),/(?:\d+\.\d–\d+\.\d|≥\d+\.\d)/);assert.equal(await p.locator('#bay-preview .bay-score-value').count(),0);assert.equal(await p.locator('#bay-add').isDisabled(),false);await p.locator('#bay-add').click();assert.equal(await p.locator('.inventory-panel .joker-editor').count(),1);assert.equal(await raw(),original);assert.equal(await height(),desktopHeight);
 await p.reload();await go('table');await p.waitForFunction(()=>document.querySelectorAll('.bay-mini').length===150);
 await p.locator('#bay-search').fill('half joker');await p.locator('.bay-mini').click();assert.match(await p.locator('#bay-dialog .tag').innerText(),/Encaje contextual/);assert.equal(await p.locator('#bay-preview [data-preview-status]').getAttribute('data-preview-status'),'fit');assert.match(await p.locator('#bay-preview .fit-score').innerText(),/^\d+\.\d$/);assert.equal(await p.locator('#bay-preview .bay-score-value').count(),0);assert.equal(await p.locator('#bay-preview [data-score-delta]').count(),0);assert.equal(await p.locator('.scenario').count(),0);await p.locator('#bay-candidate').click();
 await go('evaluation');await p.getByRole('button',{name:'Añadir plantilla hipotética: dos parejas'}).click();await p.locator('.scenario').waitFor();await p.locator('#calculate-hands').click();
 // Independent documentary oracle retained from the old hand test. Exact
 // points and $7-$5=$2 are exposed only in Analysis, not a quick-fit badge.
 await p.waitForFunction(()=>document.querySelector('#hand-results')?.textContent.includes('80 → 572 puntos'));assert.match(await p.locator('#hand-results').innerText(),/Dinero tras compra: \$2/);assert.equal(await p.locator('#hand-results [data-preview-status]').getAttribute('data-preview-status'),'calculated');assert.equal(await raw(),original);await go('table');await p.locator('.bay-mini').click();assert.equal(await p.locator('#bay-preview .bay-score-value').count(),0);assert.match(await p.locator('#bay-preview .fit-score').innerText(),/^\d+\.\d$/);
 assert.equal(await raw(),original);assert.equal(await p.locator('#draft-status').isVisible(),false);
 await p.locator('#bay-dialog').screenshot({path:`${dir}/detail-desktop.png`});await p.keyboard.press('Escape');await p.locator('#bay-search').fill('');
 await p.locator('.inventory-panel').screenshot({path:`${dir}/gallery-desktop.png`});
 for(const width of [360,390,768,1440]){
  await p.setViewportSize({width,height:900});const viewportHeight=await height();await p.locator('#bay-search').fill('joker');assert.equal(await height(),viewportHeight);await p.locator('#bay-search').fill('');assert.equal(await height(),viewportHeight);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 }
 await p.setViewportSize({width:390,height:844});await p.locator('.inventory-panel').screenshot({path:`${dir}/gallery-mobile.png`});
 await p.locator('#bay-search').fill('half joker');await p.locator('.bay-mini').focus();await p.keyboard.press('Enter');await p.locator('#bay-dialog').screenshot({path:`${dir}/detail-mobile.png`});
 assert.equal(await p.locator('#bay-dialog').evaluate(e=>e.scrollWidth<=e.clientWidth),true);await p.keyboard.press('Escape');assert.equal(await raw(),original);assert.deepEqual(errors,[]);
 await p.setViewportSize({width:1440,height:1000});await go('archive');await p.locator('#import-file').setInputFiles({name:'owned.json',mimeType:'application/json',buffer:await readFile('examples/horizon-golden-state.json')});await p.locator('#dialog-accept').click();await go('table');await p.waitForFunction(()=>document.querySelectorAll('.bay-mini').length===150);const ownedRaw=await raw();
 await p.locator('.inventory-panel .joker-portrait').first().click();await p.locator('#bay-dialog').waitFor({state:'visible'});await p.keyboard.press('Escape');assert.equal(await raw(),ownedRaw);
 await p.locator('.inventory-panel .joker-editor summary').first().click();assert.equal(await height(),desktopHeight);await p.locator('.inventory-panel').getByRole('button',{name:'Cerrar edición',exact:true}).first().click();assert.equal(await p.locator('#draft-status').isVisible(),false);
 await p.locator('.inventory-panel').screenshot({path:`${dir}/owned-desktop.png`});assert.equal(await raw(),ownedRaw);
 // Mouse drag reorders the draft, not storage; a drag must not open the detail.
 const portraits=p.locator('.inventory-panel .joker-portrait'),first=await portraits.nth(0).boundingBox(),second=await portraits.nth(1).boundingBox();
 await p.mouse.move(first.x+first.width/2,first.y+first.height/2);await p.mouse.down();await p.mouse.move(second.x+second.width,second.y+second.height/2,{steps:8});await p.mouse.up();
 assert.equal(await p.locator('#bay-dialog').isVisible(),false);assert.equal(await p.locator('.inventory-panel select[id^="joker-"]').first().inputValue(),'banner');assert.equal(await raw(),ownedRaw);assert.equal(await p.locator('#draft-status').isVisible(),true);
 await portraits.nth(1).focus();await p.keyboard.press('Alt+ArrowLeft');assert.equal(await p.locator('.inventory-panel select[id^="joker-"]').first().inputValue(),'half_joker');assert.equal(await raw(),ownedRaw);
 await p.reload();await go('table');await p.waitForFunction(()=>document.querySelectorAll('.bay-mini').length===150);
 // Touch events use the same pointer path.
 await p.setViewportSize({width:390,height:844});await portraits.first().scrollIntoViewIfNeeded();const touchA=await portraits.nth(0).boundingBox(),touchB=await portraits.nth(1).boundingBox(),cdp=await p.context().newCDPSession(p);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touchA.x+touchA.width/2,y:touchA.y+touchA.height/2}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touchB.x+touchB.width,y:touchB.y+touchB.height/2}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 assert.equal(await p.locator('.inventory-panel select[id^="joker-"]').first().inputValue(),'banner');assert.equal(await raw(),ownedRaw);assert.equal(await p.locator('#bay-dialog').isVisible(),false);
 await p.locator('.inventory-panel').screenshot({path:`${dir}/owned-touch-mobile.png`});await cdp.detach();
 await p.reload();await go('table');await p.waitForFunction(()=>document.querySelectorAll('.bay-mini').length===150);await p.setViewportSize({width:1440,height:1000});
 // Addition goes only to the draft, without copying a simulated score, money or shop.
 await p.locator('#bay-search').fill('scholar');await p.locator('.bay-mini').click();await p.locator('#bay-add').click();assert.equal(await p.locator('#bay-dialog').isVisible(),false);
 assert.equal(await p.locator('.inventory-panel .joker-editor').count(),3);assert.equal(await p.locator('#draft-status').isVisible(),true);assert.equal(await raw(),ownedRaw);assert.equal(await height(),desktopHeight);
 // Two copies can exist legitimately (e.g. Invisible Joker); identity stays distinct.
 await p.locator('.bay-mini').click();await p.locator('#bay-add').click();assert.equal(await p.locator('.inventory-panel .joker-editor').count(),4);assert.equal(await raw(),ownedRaw);
 const scholars=p.locator('.inventory-panel select[id^="joker-"]');const selected=await scholars.evaluateAll(es=>es.filter(e=>e.value==='scholar').map(e=>e.id));assert.equal(selected.length,2);assert.equal(new Set(selected).size,2);
 const extra=p.locator('.inventory-panel .joker-editor').last();await extra.locator('summary').click();await extra.getByRole('button',{name:'Quitar fila',exact:true}).click();assert.equal(await p.locator('.inventory-panel .joker-editor').count(),3);assert.equal(await raw(),ownedRaw);
 await go('archive');await p.locator('#edit-reason').fill('Transcribir Erudito observado');await p.getByRole('button',{name:'Guardar actualización que transcribí',exact:true}).click();
 const saved=JSON.parse(await raw());assert.equal(saved.state.observed.jokers.value.at(-1).catalogId,'scholar');assert.deepEqual(saved.state.observed.money,JSON.parse(ownedRaw).state.observed.money);assert.deepEqual(saved.state.observed.shop,JSON.parse(ownedRaw).state.observed.shop);
 await p.reload();await go('table');assert.equal(await p.locator('.inventory-panel .joker-editor').count(),3);const savedRaw=await raw();
 await p.getByText('Recursos y bases de manos',{exact:true}).click();await p.locator('#slots').fill('3');await p.locator('#bay-search').fill('fibonacci');await p.locator('.bay-mini').click();await p.locator('#bay-add').click();assert.match(await p.locator('#bay-add-note').innerText(),/No quedan espacios/);assert.equal(await p.locator('.inventory-panel .joker-editor').count(),3);assert.equal(await raw(),savedRaw);assert.deepEqual(errors,[]);
 console.log('PASS galería 150, filtros OR/AND, encaje sin planes, Perkeo transcribible con datos pendientes, detalle exacto solo en Análisis 80→572/$2, guardar en Registro, alta/recarga/duplicados/capacidad, altura fija, drag y teclado, almacenamiento intacto, 360–1440px');
}finally{await browser?.close();server.kill();}
