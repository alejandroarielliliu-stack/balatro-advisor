import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';

// Isolated origin and temporary contexts. Expected sales are literal catalog
// arithmetic, not produced from the action implementation under test.
// Campfire's100→125 oracle comes from independent static-evidence transcription
// docs/evidencia/cat04-generation.md, selling_card +0.25. No gameplay observation.
const dir='docs/evidencia/venta',origin='http://127.0.0.1:4196';
await mkdir(dir,{recursive:true});
const report={date:new Date().toISOString(),environment:'Chrome temporary profiles and viewport emulation',gameObservation:false,physicalAndroidTest:false,cases:[]};
const pass=(id,expected,observed)=>report.cases.push({id,expected,observed,status:'passed'});
const server=spawn(process.execPath,['dist/src/server.js'],{env:{...process.env,PORT:'4196'},stdio:'pipe',windowsHide:true});
await new Promise((resolve,reject)=>{
 const timeout=setTimeout(()=>reject(Error('Server did not start on4196')),15000);
 server.stdout.on('data',d=>{if(String(d).includes('Balatro Advisor local')){clearTimeout(timeout);resolve();}});
 server.on('error',e=>{clearTimeout(timeout);reject(e);});server.on('exit',()=>{clearTimeout(timeout);reject(Error('Server stopped before test'));});
});
let browser;
try{
 browser=await chromium.launch({headless:true,channel:'chrome'});
 const errors=[];
 const stored=p=>p.evaluate(()=>localStorage.getItem('balatro-advisor.confirmed.v1'));
 const go=(p,screen)=>p.locator(`[data-screen="${screen}"]`).click();
 const start=async()=>{
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto(origin+'/');await p.waitForFunction(()=>document.querySelector('#ownership').textContent.includes('Esta pestaña tiene'));
  await p.waitForFunction(()=>document.querySelectorAll('.bay-mini').length===150);return {context,p};
 };
 const ownRows=p=>p.locator('.inventory-panel .joker-editor');
 const row=async(p,id)=>{
  const rows=ownRows(p);for(let i=0;i<await rows.count();i++)if(await rows.nth(i).locator('select[id^="joker-"]').inputValue()===id)return rows.nth(i);
  throw Error('Owned row not found: '+id);
 };
 const gallery=async(p,id)=>{await p.locator('#bay-search').fill(id);await p.locator(`[data-bay-joker="${id}"]`).click();};
 const add=async(p,id)=>{await gallery(p,id);assert.equal(await p.locator('#bay-sell').count(),0);await p.locator('#bay-add').click();await p.locator('#bay-dialog').waitFor({state:'hidden'});};
 const openOwned=async(p,id)=>{
  const owned=await row(p,id);assert.ok(await owned.getAttribute('data-instance-id'),'Owned detail needs its physical instance ID');
  await owned.locator('.joker-portrait').click();await p.locator('#bay-dialog').waitFor({state:'visible'});
  assert.equal(await p.locator('#bay-add').count(),0,'Owned inspection exposes sale rather than adding a duplicate');
  assert.equal(await p.locator('#bay-sell').count(),1);return owned;
 };
 const close=p=>p.locator('#bay-dialog').getByRole('button',{name:'Cerrar',exact:true}).click();
 const waitCash=(p,cash)=>p.waitForFunction(expected=>document.querySelector('#money')?.value===String(expected),cash);
 const importState=async(p,state)=>{
  await go(p,'archive');await p.locator('#import-file').setInputFiles({name:'observed-sale.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(state))});
  await p.locator('#confirmation').waitFor({state:'visible'});const before=await stored(p);await p.locator('#dialog-accept').click();await go(p,'table');assert.notEqual(await stored(p),before);
 };
 const known=value=>({status:'known',source:'manual',value});
 const base=JSON.parse(await readFile('examples/shop-purchase.json','utf8'));
 const one=(id='joker',edition='base',sell=1,stickers=[])=>({instanceId:'physical:'+id,catalogId:id,edition:known(edition),sellValue:known(sell),stickers:known(stickers),counters:{}});
 const fixture=()=>{const s=structuredClone(base);s.assumptions.probes=[];s.assumptions.roundPlans=[];s.observed.money=known(7);s.observed.jokers=known([one()]);return s;};

 const {context,p}=await start();await p.locator('#money').fill('7');await add(p,'j_joker');
 await gallery(p,'j_half');await p.locator('#bay-candidate').click();await p.locator('#bay-dialog').waitFor({state:'hidden'});
 await p.waitForFunction(()=>document.querySelector('.candidate-card[data-candidate="j_half"] .quick-fit-result')?.dataset.fitScore==='70');
 const beforeStage=await p.locator('#ante').inputValue(),beforeBlind=await p.locator('#blind-kind').inputValue();
 assert.equal(beforeBlind,'');assert.equal(await p.locator('#coverage').isChecked(),false);assert.equal(await stored(p),null);
 await openOwned(p,'joker');assert.equal(await p.locator('#bay-sell').innerText(),'Vender · $1');
 const draftBefore=await p.locator('#draft-status').evaluate(e=>e.hidden);await close(p);
 assert.equal(await stored(p),null);assert.equal(await p.locator('#draft-status').evaluate(e=>e.hidden),draftBefore);assert.equal(await p.locator('#money').inputValue(),'7');
 await openOwned(p,'joker');
 await p.locator('#bay-dialog').screenshot({path:dir+'/desktop.png'});
 for(const width of [360,390]){
  await p.setViewportSize({width,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.equal(await p.locator('#bay-preview .fit-summary').evaluate(e=>{const label=e.querySelector('small').getBoundingClientRect(),score=e.querySelector('.fit-score').getBoundingClientRect();return label.right+8<=score.left;}),true,'Stage label and index must not overlap');
  assert.equal(await p.locator('#bay-sell').isVisible(),true);
  const box=await p.locator('#bay-sell').boundingBox();assert.ok(box&&box.x>=0&&box.x+box.width<=width);
 }
 await p.locator('#bay-dialog').screenshot({path:dir+'/mobile.png'});await p.setViewportSize({width:1440,height:1000});
 // Deliberately repeat the same confirmation on the same physical instance.
 await p.locator('#bay-sell').evaluate(b=>{b.click();b.click();});await waitCash(p,8);
 assert.equal(await ownRows(p).count(),0);assert.equal(await p.locator('#slots').inputValue(),'5');
 assert.equal(await p.locator('#coverage').isChecked(),false);assert.equal(await p.locator('#blind-kind').inputValue(),beforeBlind);assert.equal(await p.locator('#ante').inputValue(),beforeStage);
 assert.equal(await stored(p),null);assert.match(await p.locator('#message').innerText(),/provisionales|sin confirmar/i);
 await p.waitForFunction(()=>document.querySelector('.candidate-card[data-candidate="j_half"] .quick-fit-result')?.dataset.fitScore==='80');
 assert.equal(await p.locator('#composition-overview [data-section="scoring"]').getAttribute('data-score'),'0');
 pass('sale-draft-and-recalculation','Joker $1 pays7→8 once, frees the physical card, keeps5 slots/unknown blind/unchecked facts, updates composition and candidate70→80',{money:8,owned:0,slots:5,candidateBefore:70,candidateAfter:80,confirmedRun:null});
 await add(p,'j_joker');await openOwned(p,'joker');await p.locator('#bay-sell').click();await waitCash(p,9);
 assert.equal(await ownRows(p).count(),0);assert.equal(await stored(p),null);
 pass('two-distinct-sales','A different physical Joker may legitimately pay another$1;8→9',{money:9,owned:0});
 pass('mobile-owned-modal','Owned dialog, sale and instance binding remain usable at360/390px without page overflow',{widths:[360,390],ownedAddButton:false});
 await context.close();

 const missing=await start();await add(missing.p,'j_joker');await openOwned(missing.p,'joker');
 assert.equal(await missing.p.locator('#bay-sell').isEnabled(),true);await missing.p.locator('#bay-sell').click();
 assert.match(await missing.p.locator('#bay-add-note').innerText(),/dinero|saldo/i);
 assert.equal(await missing.p.locator('#money').inputValue(),'');assert.equal(await ownRows(missing.p).count(),1);assert.equal(await stored(missing.p),null);
 await close(missing.p);await missing.p.locator('#money').fill('7');await openOwned(missing.p,'joker');await missing.p.locator('#bay-edit').click();
 const edited=await row(missing.p,'joker');await edited.locator('input[id^="sell-"]').fill('2');await edited.getByRole('button',{name:'Cerrar edición',exact:true}).click();
 await openOwned(missing.p,'joker');await missing.p.locator('#bay-sell').click();assert.match(await missing.p.locator('#bay-add-note').innerText(),/catálogo|compatible|venta/i);
 assert.equal(await missing.p.locator('#money').inputValue(),'7');assert.equal(await ownRows(missing.p).count(),1);assert.equal(await stored(missing.p),null);
 pass('rejected-sale','Missing money and mismatched Joker sale value are explicit errors; no card, money or storage mutation',{missingMoneyPreserved:true,unsupportedPricePreserved:true,owned:1});await missing.context.close();

 const eternal=await start(),eternalState=fixture();eternalState.observed.jokers=known([one('joker','base',1,['eternal'])]);await importState(eternal.p,eternalState);
 const eternalRaw=await stored(eternal.p);await openOwned(eternal.p,'joker');assert.equal(await eternal.p.locator('#bay-sell').isDisabled(),true);
 assert.match(await eternal.p.locator('#bay-add-note').innerText(),/Eternal|etern/i);await close(eternal.p);
 assert.equal(await ownRows(eternal.p).count(),1);assert.equal(await eternal.p.locator('#money').inputValue(),'7');assert.equal(await stored(eternal.p),eternalRaw);
 pass('eternal','Eternal is unsellable and has an explicit reason; inspecting it does not write',{disabled:true,money:7,owned:1});await eternal.context.close();

 const saved=await start(),horizon=JSON.parse(await readFile('examples/horizon-golden-state.json','utf8'));horizon.assumptions.probes=[];horizon.assumptions.roundPlans=[];
 await importState(saved.p,horizon);const original=await stored(saved.p);
 assert.equal(await ownRows(saved.p).count(),2);await openOwned(saved.p,'half_joker');await close(saved.p);assert.equal(await stored(saved.p),original);
 await openOwned(saved.p,'half_joker');assert.equal(await saved.p.locator('#bay-sell').innerText(),'Vender · $2');await saved.p.locator('#bay-sell').click();await waitCash(saved.p,27);
 assert.equal(await ownRows(saved.p).count(),1);assert.equal(await (await row(saved.p,'banner')).locator('select[id^="joker-"]').inputValue(),'banner');assert.equal(await stored(saved.p),original);
 await saved.p.locator('#composition-score').click();await saved.p.locator('#composition-details').getByRole('button',{name:'Cerrar',exact:true}).click();assert.equal(await stored(saved.p),original);
 await go(saved.p,'archive');await saved.p.locator('#edit-reason').fill('Registré la venta de Half en Mesa');await saved.p.getByRole('button',{name:'Guardar actualización que transcribí',exact:true}).click();
 const persisted=JSON.parse(await stored(saved.p));assert.equal(persisted.state.observed.money.value,27);assert.equal(persisted.state.observed.jokers.value.length,1);assert.equal(persisted.state.observed.jokers.value[0].catalogId,'banner');
 await saved.p.reload();await saved.p.waitForFunction(()=>document.querySelector('#ownership').textContent.includes('Esta pestaña tiene'));await go(saved.p,'table');
 assert.equal(await saved.p.locator('#money').inputValue(),'27');assert.equal(await ownRows(saved.p).count(),1);await row(saved.p,'banner');
 pass('explicit-save-and-reload','Half pays25+2=27 in draft; original record is untouched until explicit correction save; reload restores27/Banner',{before:25,after:27,savedOwned:['banner'],revision:persisted.state.revision});await saved.context.close();

 const special=await start(),specialState=fixture(),campfire={...one('campfire','base',4),counters:{x100:known(100)}};
 specialState.observed.jokers=known([one('joker','negative',3),campfire]);specialState.observed.resources.jokerSlots=known(6);await importState(special.p,specialState);
 const specialRaw=await stored(special.p);await openOwned(special.p,'joker');assert.equal(await special.p.locator('#bay-sell').innerText(),'Vender · $3');await special.p.locator('#bay-sell').click();await waitCash(special.p,10);
 assert.equal(await ownRows(special.p).count(),1);assert.equal(await special.p.locator('#slots').inputValue(),'5');
 const remaining=await row(special.p,'campfire');assert.equal(await remaining.locator('input[data-counter="x100"]').inputValue(),'125');assert.equal(await stored(special.p),specialRaw);
 pass('negative-and-campfire','Negative Joker sale $3 pays7→10 and capacity6→5; physical Campfire develops100→125, not150',{money:10,slots:5,campfire:125,originalRecordUntouched:true});await special.context.close();
 assert.deepEqual(errors,[]);report.status='passed';report.pageErrors=errors;await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');
 console.log('PASS Mesa sale: draft money/owned/capacity, stale double click, distinct instances, actual candidate/composition refresh, unknown money, unsupported price, Eternal, confirmed save/reload, Negative and Campfire, mobile dialog');
}catch(error){report.status='failed';report.error=error.message;await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');throw error;}
finally{await browser?.close();server.kill();}
