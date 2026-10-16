import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';

// Isolated origin, observed fixtures and independent literal arithmetic.
// Campfire 100→125 comes from the static evidence in cat04-generation.md,
// selling_card +0.25. These UI checks are not observations inside Balatro.
const dir='docs/evidencia/venta',origin='http://127.0.0.1:4196';
const key='balatro-advisor.confirmed.v1';
await mkdir(dir,{recursive:true});
const report={date:new Date().toISOString(),environment:'Chrome temporary profiles and viewport emulation',gameObservation:false,physicalAndroidTest:false,cases:[]};
const pass=(id,expected,observed)=>report.cases.push({id,expected,observed,status:'passed'});
const base=JSON.parse(await readFile('examples/shop-purchase.json','utf8'));
const known=value=>({status:'known',source:'manual',value});
const one=(id='joker',edition='base',sell=1,stickers=[],instanceId='physical:'+id)=>({instanceId,catalogId:id,edition:known(edition),sellValue:known(sell),stickers:known(stickers),counters:{}});
function fixture(){const s=structuredClone(base);s.assumptions.probes=[];s.assumptions.roundPlans=[];s.observed.money=known(7);s.observed.jokers=known([one()]);s.observed.shop=known({shopId:'sale-shop',cardOffers:[],ignoredOtherOffers:[]});return s;}
const server=spawn(process.execPath,['dist/src/server.js'],{env:{...process.env,PORT:'4196'},stdio:'pipe',windowsHide:true});
let browser;
try{
 await new Promise((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(Error('Server did not start on 4196')),15000);
  server.stdout.on('data',d=>{if(String(d).includes('Balatro Advisor local')){clearTimeout(timeout);resolve();}});
  server.on('error',e=>{clearTimeout(timeout);reject(e);});server.on('exit',()=>{clearTimeout(timeout);reject(Error('Server stopped before test'));});
 });
 browser=await chromium.launch({headless:true,channel:'chrome'});
 const errors=[];
 const stored=p=>p.evaluate(k=>localStorage.getItem(k),key);
 const record=async p=>JSON.parse(await stored(p));
 const go=(p,screen)=>p.locator(`[data-screen="${screen}"]`).click();
 const start=async state=>{
  const context=await browser.newContext({viewport:{width:1440,height:1000}}),p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto(origin+'/');await p.waitForFunction(()=>document.querySelector('#ownership').textContent.includes('Esta pestaña tiene'));
  if(state){await go(p,'archive');await p.locator('#import-file').setInputFiles({name:'observed-sale.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(state))});await p.locator('#dialog-accept').click();await go(p,'table');}
  await p.waitForFunction(()=>document.querySelectorAll('.bay-mini').length===150);return {context,p};
 };
 const ownRows=p=>p.locator('.inventory-panel .joker-editor');
 const row=async(p,id)=>{const rows=ownRows(p);for(let i=0;i<await rows.count();i++)if(await rows.nth(i).locator('select[id^="joker-"]').inputValue()===id)return rows.nth(i);throw Error('Owned row not found: '+id);};
 const gallery=async(p,id)=>{await p.locator('#bay-search').fill(id);await p.locator(`[data-bay-joker="${id}"]`).click();};
 const openOwned=async(p,id)=>{
  const owned=await row(p,id);assert.ok(await owned.getAttribute('data-instance-id'),'Owned detail needs its physical instance ID');
  await owned.locator('.joker-portrait').click();await p.locator('#bay-dialog').waitFor({state:'visible'});
  assert.equal(await p.locator('#bay-add').count(),0,'Owned inspection exposes sale rather than adding a duplicate');assert.equal(await p.locator('#bay-sell').count(),1);return owned;
 };
 const close=p=>p.locator('#bay-dialog').getByRole('button',{name:'Cerrar',exact:true}).click();
 const finishSale=async(p,{twice=false}={})=>{
  await p.locator('#bay-sell').click();await p.locator('#confirmation').waitFor({state:'visible'});await p.locator('#performed').check();
  if(twice)await p.locator('#dialog-accept').evaluate(b=>{b.click();b.click();});else await p.locator('#dialog-accept').click();
  await p.locator('#confirmation').waitFor({state:'hidden'});
 };
 const waitCash=(p,cash)=>p.waitForFunction(expected=>document.querySelector('#money')?.value===String(expected),cash);
 const reload=async p=>{await p.reload();await p.waitForFunction(()=>document.querySelector('#ownership').textContent.includes('Esta pestaña tiene'));await go(p,'table');};

 const first=fixture();first.observed.nextBlind={status:'unknown',reason:'No transcrita; no necesaria para vender.'};
 const {context,p}=await start(first);
 await gallery(p,'j_half');await p.locator('#bay-candidate').click();await p.locator('#bay-dialog').waitFor({state:'hidden'});
 await p.waitForFunction(()=>document.querySelector('.candidate-card[data-candidate="j_half"] .quick-fit-result')?.dataset.fitScore==='70');
 const before=await stored(p),beforeRecord=JSON.parse(before),beforeStage=await p.locator('#ante').inputValue(),beforeBlind=await p.locator('#blind-kind').inputValue();
 await openOwned(p,'joker');assert.match(await p.locator('#bay-sell').innerText(),/\$1/);await close(p);assert.equal(await stored(p),before,'Inspecting sale never writes');
 await openOwned(p,'joker');await p.locator('#bay-dialog').screenshot({path:dir+'/desktop.png'});
 for(const width of [360,390]){
  await p.setViewportSize({width,height:844});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  assert.equal(await p.locator('#bay-preview .fit-summary').evaluate(e=>{const label=e.querySelector('small').getBoundingClientRect(),score=e.querySelector('.fit-score').getBoundingClientRect();return label.right+8<=score.left;}),true,'Stage label and index must not overlap');
  assert.equal(await p.locator('#bay-sell').isVisible(),true);const box=await p.locator('#bay-sell').boundingBox();assert.ok(box&&box.x>=0&&box.x+box.width<=width);
 }
 await p.locator('#bay-dialog').screenshot({path:dir+'/mobile.png'});await p.setViewportSize({width:1440,height:1000});
 await p.locator('#bay-sell').click();await p.locator('#confirmation').waitFor({state:'visible'});
 await p.locator('#dialog-accept').click();assert.equal(await stored(p),before,'Unconfirmed sale must not write');assert.match(await p.locator('#dialog-error').innerText(),/confirm/i);
 await p.locator('#performed').check();await p.locator('#dialog-accept').evaluate(b=>{b.click();b.click();});await waitCash(p,8);
 assert.equal(await ownRows(p).count(),0);assert.equal(await p.locator('#slots').inputValue(),'5');assert.equal(await p.locator('#blind-kind').inputValue(),beforeBlind);assert.equal(await p.locator('#ante').inputValue(),beforeStage);
 let after=await record(p);assert.equal(after.history.length,beforeRecord.history.length+1);assert.equal(after.state.revision,beforeRecord.state.revision+1);assert.deepEqual(after.history.at(-1).action,{type:'sell',instanceId:'physical:joker'});assert.equal(after.state.observed.nextBlind.status,'unknown');
 await p.waitForFunction(()=>document.querySelector('.candidate-card[data-candidate="j_half"] .quick-fit-result')?.dataset.fitScore==='80');assert.equal(await p.locator('#composition-overview [data-section="scoring"]').getAttribute('data-score'),'0');
 await reload(p);assert.equal(await p.locator('#money').inputValue(),'8');assert.equal(await ownRows(p).count(),0);
 pass('sale-confirmed-and-recalculation','Joker sale $1 pays 7→8 once after explicit confirmation; preserves unknown blind, frees physical card and persists without second save',{money:8,owned:0,slots:5,candidateBefore:70,candidateAfter:80,action:'sell'});
 pass('mobile-owned-modal','Owned dialog, sale and instance binding remain usable at 360/390px without overflow',{widths:[360,390],ownedAddButton:false});await context.close();

 const distinct=fixture();distinct.observed.jokers=known([one('joker','base',1,[],'first-joker'),one('joker','base',1,[],'second-joker')]);
 const two=await start(distinct);await openOwned(two.p,'joker');await finishSale(two.p,{twice:true});await waitCash(two.p,8);await openOwned(two.p,'joker');await finishSale(two.p);await waitCash(two.p,9);
 after=await record(two.p);assert.equal(after.history.length,2);assert.deepEqual(after.history.map(e=>e.action.instanceId),['first-joker','second-joker']);assert.equal(await ownRows(two.p).count(),0);
 pass('two-distinct-sales','Two physical Jokers legitimately sell once each, 7→8→9; duplicate click does not suppress the second distinct action',{money:9,history:2});await two.context.close();

 for(const [id,modify,reason] of [
  ['missing-money',s=>{s.observed.money={status:'unknown',reason:'No observado'};},/dinero|saldo|desconocid|Falta dato/i],
  ['unsupported-price',s=>{s.observed.jokers.value[0].sellValue=known(2);},/catálogo|compatible|venta|precio/i],
 ]){
  const s=fixture();modify(s);const rejected=await start(s),raw=await stored(rejected.p);await openOwned(rejected.p,'joker');const sale=rejected.p.locator('#bay-sell');if(await sale.isEnabled())await sale.click();
  assert.match(await rejected.p.locator('#bay-add-note,#shop-session-status,#message').allTextContents().then(x=>x.join(' ')),reason);assert.equal(await stored(rejected.p),raw);assert.equal(await ownRows(rejected.p).count(),1);assert.equal(await rejected.p.locator('#confirmation[open]').count(),0);
  pass(id,'Invalid or unknown sale facts produce an explicit error without mutation',{storedUnchanged:true,owned:1});await rejected.context.close();
 }

 const eternalState=fixture();eternalState.observed.jokers=known([one('joker','base',1,['eternal'])]);const eternal=await start(eternalState),eternalRaw=await stored(eternal.p);
 await openOwned(eternal.p,'joker');assert.equal(await eternal.p.locator('#bay-sell').isDisabled(),true);assert.match(await eternal.p.locator('#bay-add-note').innerText(),/Eternal|etern/i);await close(eternal.p);assert.equal(await ownRows(eternal.p).count(),1);assert.equal(await eternal.p.locator('#money').inputValue(),'7');assert.equal(await stored(eternal.p),eternalRaw);
 pass('eternal','Eternal is unsellable with an explicit reason; inspecting it does not write',{disabled:true,money:7,owned:1});await eternal.context.close();

 const horizon=JSON.parse(await readFile('examples/horizon-golden-state.json','utf8'));horizon.assumptions.probes=[];horizon.assumptions.roundPlans=[];
 const saved=await start(horizon),savedOriginal=await stored(saved.p);assert.equal(await ownRows(saved.p).count(),2);await openOwned(saved.p,'half_joker');await close(saved.p);assert.equal(await stored(saved.p),savedOriginal);
 await openOwned(saved.p,'half_joker');await finishSale(saved.p);await waitCash(saved.p,27);assert.equal(await ownRows(saved.p).count(),1);after=await record(saved.p);assert.equal(after.state.observed.jokers.value[0].catalogId,'banner');assert.equal(after.history.at(-1).kind,'action');assert.equal(after.history.at(-1).action.type,'sell');
 const afterSale=await stored(saved.p);await saved.p.locator('#composition-score').click();await saved.p.locator('#composition-details').getByRole('button',{name:'Cerrar',exact:true}).click();assert.equal(await stored(saved.p),afterSale);
 await reload(saved.p);assert.equal(await saved.p.locator('#money').inputValue(),'27');assert.equal(await ownRows(saved.p).count(),1);await row(saved.p,'banner');
 pass('confirmed-save-and-reload','Half pays 25+2=27 in one confirmed action; reload restores Banner/$27, and composition inspection is read-only',{before:25,after:27,savedOwned:['banner'],revision:after.state.revision});await saved.context.close();

 const specialState=fixture(),campfire={...one('campfire','base',4),counters:{x100:known(100)}};specialState.observed.jokers=known([one('joker','negative',3),campfire]);specialState.observed.resources.jokerSlots=known(6);
 const special=await start(specialState);await openOwned(special.p,'joker');await finishSale(special.p);await waitCash(special.p,10);assert.equal(await ownRows(special.p).count(),1);assert.equal(await special.p.locator('#slots').inputValue(),'5');const remaining=await row(special.p,'campfire');assert.equal(await remaining.locator('input[data-counter="x100"]').inputValue(),'125');
 after=await record(special.p);assert.equal(after.state.observed.jokers.value[0].counters.x100.value,125);assert.equal(after.history.length,1);await reload(special.p);assert.equal(await special.p.locator('#slots').inputValue(),'5');assert.equal(await special.p.locator('#money').inputValue(),'10');
 pass('negative-and-campfire','Negative sale $3 pays 7→10, capacity 6→5; Campfire grows 100→125 exactly once and survives reload',{money:10,slots:5,campfire:125,history:1});await special.context.close();
 assert.deepEqual(errors,[]);report.status='passed';report.pageErrors=errors;await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');console.log('PASS Mesa sale: explicit confirmation, atomic persistence/reload, double click, distinct instances, fit refresh, unknown money, unsupported price, Eternal, Negative/Campfire, mobile dialog');
}catch(error){report.status='failed';report.error=error.stack||error.message;await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');throw error;}
finally{await browser?.close();server.kill();}
