import {openWorkspace} from './workspace-navigation.mjs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

// Frozen development contracts; not a human usability study or Balatro observation.
const bank=JSON.parse(await readFile('evaluation/fixtures/decisiones-visibles-development.json','utf8'));
const key='balatro-advisor.confirmed.v1',port='4221',origin=process.env.VISIBLE_BASE_URL??`http://127.0.0.1:${port}/`;
const dir='docs/evidencia/decisiones-visibles';await mkdir(dir,{recursive:true});
const fixture=id=>{const c=bank.cases.find(c=>c.id===id);assert.ok(c);return {schemaVersion:'confirmed-2',initialState:structuredClone(c.state),state:structuredClone(c.state),history:[]};};
const report={date:new Date().toISOString(),url:origin,gameObservation:false,userStudy:false,physicalAndroid:false,cases:[],hashes:[],pageErrors:[]};
const pass=id=>{report.cases.push(id);console.log('PASS',id);};
const server=process.env.VISIBLE_BASE_URL?null:spawn(process.execPath,['dist/src/server.js'],{env:{...process.env,PORT:port},stdio:'pipe',windowsHide:true});
let browser,lastPage;
try{
 if(server)await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Server timeout')),15000);server.stdout.on('data',d=>{if(String(d).includes('Balatro Advisor local')){clearTimeout(timer);resolve();}});server.on('error',reject);});
 if(process.env.VISIBLE_BASE_URL)for(const file of ['web/mesa.css','dist/src/ui/storefront.js','dist/src/ui/shop-comparison-view.js','dist/src/ui/blind-decision-view.js','dist/src/advisor/shop-alternatives.js','dist/src/advisor/blind-guidance.js','dist/src/catalog/tag-strategy.js']){
  const local=await readFile('out/'+file),response=await fetch(new URL(file+'?visible='+Date.now(),origin));assert.equal(response.status,200);const bytes=Buffer.from(await response.arrayBuffer()),hash=b=>createHash('sha256').update(b).digest('hex');assert.equal(hash(bytes),hash(local),file);report.hashes.push({file,sha256:hash(bytes)});
 }
 browser=await chromium.launch({channel:'chrome',headless:true});
 const raw=p=>p.evaluate(k=>localStorage.getItem(k),key),record=async p=>JSON.parse(await raw(p)),writes=p=>p.evaluate(()=>window.__visibleWrites);
 const go=(p,screen)=>p.locator(`[data-screen="${screen}"]`).click();
 const ready=p=>p.waitForFunction(()=>document.querySelector('#ownership')?.textContent.includes('Esta pestaña tiene'));
 const load=async(p,id)=>{await go(p,'archive');await p.locator('#import-file').setInputFiles({name:'frozen-development-case.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture(id)))});await p.locator('#dialog-accept').click();await p.locator('#confirmation').waitFor({state:'hidden'});await go(p,'table');};
 const session=async(id,viewport={width:1440,height:1000})=>{
  const context=await browser.newContext({viewport,reducedMotion:'reduce'});
  await context.addInitScript(k=>{window.__visibleWrites=0;window.__failVisibleSave=false;const original=Storage.prototype.setItem;Storage.prototype.setItem=function(name,value){if(name===k){if(window.__failVisibleSave)throw new DOMException('Synthetic save failure','QuotaExceededError');window.__visibleWrites++;}return original.call(this,name,value);};},key);
  const p=await context.newPage();lastPage=p;p.on('pageerror',e=>report.pageErrors.push(e.message));await openWorkspace(p,new URL('#table',origin).href);await ready(p);await load(p,id);return {context,p};
 };
 const shelf=p=>p.waitForFunction(()=>document.querySelector('#shop-comparison [data-alternative="hold"]')&&!document.querySelector('.candidate-pending'));
 const row=(p,id)=>p.locator('.comparison-row').filter({has:p.locator(`[data-alternative="${id}"]`)});
 const open=(p,id)=>p.locator(`[data-alternative="${id}"]`).click();
 const close=p=>p.locator('#shop-alternative-dialog').getByRole('button',{name:'Cerrar',exact:true}).click();
 const finish=async p=>{await p.locator('#performed').check();await p.locator('#dialog-accept').click();await p.locator('#confirmation').waitFor({state:'hidden'});await shelf(p);};
 const unchanged=async(p,before,count)=>{assert.equal(await raw(p),before);assert.equal(await writes(p),count);assert.equal(await p.locator('#draft-status').isVisible(),false);};
 const noOverflow=async p=>assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);

 const s=await session('DV-SHOP-02'),p=s.p;await shelf(p);let before=await raw(p),count=await writes(p);
 await p.locator('#store-compare-options').click();assert.equal(await p.locator('#shop-comparison').isVisible(),true);assert.equal(await p.locator('.comparison-row').count(),9);
 for(const [id,saldo]of [['hold','$20'],['buy:abstract','$16'],['sell:owned-green','$22'],['replace:abstract:owned-green','$18'],['replace:abstract:owned-joker','$17']])assert.equal(await row(p,id).locator('.comparison-after').innerText(),saldo);
 assert.match(await row(p,'replace:abstract:owned-green').innerText(),/greenMult: 7/);assert.equal(await p.locator('#shop-advice-dialog').isVisible(),false);
 await open(p,'replace:abstract:owned-green');await close(p);assert.equal(await p.locator('[data-alternative="replace:abstract:owned-green"]').evaluate(e=>e===document.activeElement),true);
 await p.locator('[data-alternative-filter=sell]').click();assert.equal(await p.locator('.comparison-row').count(),3);assert.equal(await row(p,'hold').isVisible(),true);await p.locator('[data-alternative-filter=all]').click();await unchanged(p,before,count);
 await p.locator('#shop-comparison').scrollIntoViewIfNeeded();await noOverflow(p);await p.screenshot({path:dir+'/shop-desktop.png',fullPage:false});
 pass('visible-comparison-distinct-sale-replacement-growth-and-readonly-selection');

 await open(p,'sell:owned-green');await p.locator('#shop-alternative-confirm').click();await finish(p);let r=await record(p);
 assert.equal(r.state.observed.money.value,22);assert.equal(r.state.observed.jokers.value.length,1);assert.equal(r.state.observed.shop.value.cardOffers.length,2);assert.equal(r.history.at(-1).action.type,'sell');
 await open(p,'buy:abstract');await p.locator('#shop-alternative-confirm').click();await finish(p);r=await record(p);assert.equal(r.state.observed.money.value,18);assert.equal(r.state.observed.jokers.value.length,2);assert.equal(r.history.length,2);assert.equal(r.history.at(-1).action.type,'buy');await s.context.close();
 pass('sale-alone-keeps-offer-then-independent-confirmed-buy');

 const repl=await session('DV-SHOP-02');await shelf(repl.p);before=await raw(repl.p);await open(repl.p,'replace:abstract:owned-green');await repl.p.locator('#shop-alternative-confirm').click();await finish(repl.p);r=await record(repl.p);
 assert.equal(r.state.observed.money.value,18);assert.equal(r.state.observed.jokers.value.length,2);assert.equal(r.history.length,1);assert.equal(r.history[0].action.type,'replace');assert.equal(r.state.revision,JSON.parse(before).state.revision+2);assert.equal(r.state.observed.jokers.value.some(j=>j.instanceId==='owned-green'),false);assert.deepEqual(r.state.assumptions,JSON.parse(before).state.assumptions);await repl.context.close();
 pass('atomic-replacement-does-not-copy-hypothetical-state');

 const full=await session('DV-SHOP-03');await shelf(full.p);assert.equal(await row(full.p,'buy:abstract').getAttribute('data-operation-status'),'illegal');assert.match(await row(full.p,'buy:abstract').innerText(),/espacio|hueco/i);assert.equal(await row(full.p,'replace:abstract:owned-joker').getAttribute('data-operation-status'),'provisional');await full.context.close();
 const partial=await session('DV-SHOP-05');await shelf(partial.p);before=await raw(partial.p);count=await writes(partial.p);assert.equal(await row(partial.p,'buy:joker').locator('.comparison-after').innerText(),'—');assert.equal(await row(partial.p,'buy:abstract').locator('.comparison-after').innerText(),'$16');
 const reader=await partial.context.newPage();await openWorkspace(reader,new URL('#table',origin).href);await reader.waitForFunction(()=>document.querySelector('#ownership')?.textContent.includes('Modo lectura'));await shelf(reader);await open(reader,'buy:abstract');assert.equal(await reader.locator('#shop-alternative-confirm').isDisabled(),true);await unchanged(partial.p,before,count);await reader.close();await partial.context.close();
 pass('full-slots-and-unknown-price-limit-only-affected-branches-reader-can-consult');

 const failed=await session('DV-SHOP-02');await shelf(failed.p);before=await raw(failed.p);await open(failed.p,'sell:owned-green');await failed.p.locator('#shop-alternative-confirm').click();await failed.p.locator('#performed').check();await failed.p.evaluate(()=>window.__failVisibleSave=true);await failed.p.locator('#dialog-accept').click();assert.equal(await raw(failed.p),before);assert.equal(await failed.p.locator('#confirmation').isVisible(),true);await failed.p.locator('#dialog-cancel').click();await failed.p.evaluate(()=>window.__failVisibleSave=false);
 await open(failed.p,'sell:owned-green');await failed.p.locator('#shop-alternative-confirm').click();await failed.p.locator('#performed').check();
 const changed=await failed.p.evaluate(async k=>{const {createConfirmedStore,analysisBinding}=await import(new URL('dist/src/storage/confirmed-store.js',location.href));const r=JSON.parse(localStorage.getItem(k)),s=r.state;return createConfirmedStore(()=>localStorage).correct({confirmationId:'external-visible-revision',confirmed:true,expected:analysisBinding(s),updatedAt:s.updatedAt,patch:{money:{status:'known',source:'manual',value:19}},reason:'Synthetic external correction'});},key);assert.equal(changed.ok,true,JSON.stringify(changed));before=await raw(failed.p);await failed.p.locator('#dialog-accept').click();assert.equal(await raw(failed.p),before);assert.equal((await record(failed.p)).state.observed.jokers.value.length,2);await failed.context.close();
 pass('save-failure-and-stale-confirmation-preserve-real-record');

 const b=await session('DV-BLIND-03');before=await raw(b.p);count=await writes(b.p);assert.match(await b.p.locator('#run-blind-guidance').innerText(),/jugar|ronda/i);await b.p.locator('#run-compare-blind').click();assert.equal(await b.p.locator('#blind-guidance').getAttribute('data-status'),'conditional');assert.match(await b.p.locator('#blind-guidance').innerText(),/tienda/);assert.equal(await b.p.locator('.blind-plan').count(),0);
 await b.p.screenshot({path:dir+'/blind-desktop.png',fullPage:false});await b.p.setViewportSize({width:390,height:844});await noOverflow(b.p);await b.p.screenshot({path:dir+'/blind-390.png',fullPage:false});
 await b.p.locator('#blind-risk').selectOption('tight');assert.equal(await b.p.locator('#blind-guidance').getAttribute('data-preferred'),'none');assert.match(await b.p.locator('#blind-guidance').innerText(),/riesgo|justo/i);await b.p.locator('#blind-strict').check();assert.equal(await b.p.locator('#blind-guidance').getAttribute('data-status'),'abstain');await unchanged(b.p,before,count);await b.p.locator('#dialog-accept').click();await b.context.close();
 pass('qualitative-tag-without-executor-and-risk-strict-controls-never-write');
 for(const width of [390,360]){
  const mobile=await session('DV-SHOP-02',{width,height:844});await shelf(mobile.p);before=await raw(mobile.p);count=await writes(mobile.p);await mobile.p.locator('#store-compare-options').click();await noOverflow(mobile.p);await mobile.p.screenshot({path:dir+`/shop-${width}.png`,fullPage:false});await open(mobile.p,'replace:abstract:owned-green');await noOverflow(mobile.p);await close(mobile.p);await unchanged(mobile.p,before,count);await mobile.context.close();
 }
 pass('mobile390-and360-visible-comparison-dialog-and-focus');assert.deepEqual(report.pageErrors,[]);report.status='passed';await writeFile(dir+'/browser-report.json',JSON.stringify(report,null,2));
}catch(e){report.status='failed';report.error=String(e);await writeFile(dir+'/browser-report.json',JSON.stringify(report,null,2));await lastPage?.screenshot({path:dir+'/failed.png',fullPage:true}).catch(()=>{});throw e;}
finally{await browser?.close();server?.kill();}
