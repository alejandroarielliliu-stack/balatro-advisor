import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createNewRun} from '../dist/src/run/start.js';

// Synthetic UX contracts, not Balatro observations or proof of optimal advice.
// Arithmetic oracles below are literals: Abstract has two physical jokers ×3
// Mult; buying at $4 from $12 leaves $8; sale$2→purchase$2 has net cost $0.
const port='4216',remote=process.env.UX01_BASE_URL;
const origin=new URL(remote??'http://127.0.0.1:'+port+'/');if(!origin.pathname.endsWith('/'))origin.pathname+='/';
const key='balatro-advisor.confirmed.v1',dir='docs/evidencia/ux01';await mkdir(dir,{recursive:true});
const known=value=>({status:'known',source:'manual',value});
const unknown=reason=>({status:'unknown',reason});
const owned=(catalogId,instanceId,sellValue,counters={})=>({catalogId,instanceId,sellValue:known(sellValue),edition:known('base'),stickers:known([]),counters});
function fixture({money=12,jokers=[owned('joker','owned-joker',1)],catalogId='abstract_joker',price=4,stickers=[]}={}){
 const created=createNewRun({runId:'synthetic-ux01-browser',updatedAt:'2026-10-18T23:00:00Z',deckId:'blue',profileConfirmed:true});assert.equal(created.ok,true);
 const state=created.value;state.phase='shop';state.phaseData={origin:known({ante:3,kind:'boss'})};
 state.observed.money=known(money);state.observed.jokers=known(structuredClone(jokers));
 state.observed.lastCleared=known({ante:3,kind:'boss'});
 state.observed.nextBlind=known({ante:4,kind:'small',bossId:known('none'),target:known(5000),reward:known(3)});
 state.observed.shop=known({shopId:'ux01-browser-shop',cardOffers:[{offerId:'visible-joker',catalogId,label:catalogId,kind:'joker',price:price===null?unknown('Precio visible sin transcribir'):known(price),edition:known('base'),stickers:known(stickers)}],voucherOffers:[],packOffers:[],ignoredOtherOffers:[]});
 state.assumptions.probes=[];state.assumptions.roundPlans=[];
 return {schemaVersion:'confirmed-2',initialState:structuredClone(state),state,history:[]};
}
const modules=[
 'dist/src/ui/app.js','dist/src/ui/storefront.js','dist/src/ui/shop-advice-summary.js','dist/src/ui/consequences-view.js',
 'dist/src/advisor/shop-context.js','dist/src/advisor/quick-shop-policy.js','dist/src/advisor/quick-fit.js','dist/src/advisor/fit-index.js',
 'dist/src/advisor/decision.js','dist/src/advisor/composition.js','dist/src/advisor/composition-signals.js',
 'dist/src/rules/shop.js','dist/src/rules/fixed-main-mult.js','dist/src/rules/scoring.js','dist/src/rules/economy.js','dist/src/rules/generation-jokers.js',
 'dist/src/rules/core.js','dist/src/rules/engine-evidence.js','dist/src/rules/evidence.js',
 'dist/src/run/start.js','dist/src/state/model.js','dist/src/state/validation.js','dist/src/storage/confirmed-store.js','dist/src/storage/confirmed-record.js'
];
const report={date:new Date().toISOString(),mode:remote?'public':'local',url:origin.href,commit:process.env.UX01_COMMIT??null,workflow:process.env.UX01_WORKFLOW??null,
 environment:'Chrome temporary isolated profiles; desktop and 390px mobile emulation',gameObservation:false,physicalAndroid:false,
 oracle:'Independent literal arithmetic, display/retention and read-only contracts. Inspecting API text for retention is a consistency check, not a strategic oracle.',
 storageScope:'Confirmed run record only. Ownership lease is independent; consultation cannot write the run, revision or history.',
 criticalModules:modules.length,hashes:[],cases:[],pageErrors:[]};
const pass=(id,expected,observed)=>{report.cases.push({id,expected,observed,status:'passed'});console.log('PASS',id);};
const server=remote?null:spawn(process.execPath,['dist/src/server.js'],{env:{...process.env,PORT:port},stdio:'pipe',windowsHide:true});let browser,lastPage;
try{
 if(server)await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('UX01 browser server timeout')),15000);server.stdout.on('data',data=>{if(String(data).includes('Balatro Advisor local')){clearTimeout(timer);resolve();}});server.on('error',error=>{clearTimeout(timer);reject(error);});server.on('exit',()=>{clearTimeout(timer);reject(Error('UX01 browser server stopped'));});});
 if(remote)for(const file of ['index.html',...modules,'web/mesa.css']){
  const local=await readFile('out/'+file),url=new URL(file,origin);url.searchParams.set('ux01',String(Date.now()));
  const response=await fetch(url);assert.equal(response.status,200,file);const bytes=Buffer.from(await response.arrayBuffer()),hash=data=>createHash('sha256').update(data).digest('hex');
  assert.equal(hash(bytes),hash(local),'Public artifact differs from out/'+file);report.hashes.push({file,sha256:hash(bytes)});
 }
 browser=await chromium.launch({channel:'chrome',headless:true});
 const raw=page=>page.evaluate(storageKey=>localStorage.getItem(storageKey),key),record=async page=>JSON.parse(await raw(page)),writes=page=>page.evaluate(()=>window.__ux01ConfirmedWrites);
 const go=(page,screen)=>page.locator(`[data-screen="${screen}"]`).click();
 const ready=page=>page.waitForFunction(()=>document.querySelector('#ownership')?.textContent.includes('Esta pestaña tiene'));
 const watch=page=>{lastPage=page;page.on('pageerror',error=>report.pageErrors.push(error.message));};
 const open=async page=>{await page.locator('#shop-recommendation').click();await page.locator('#shop-advice-dialog').waitFor({state:'visible'});};
 const close=page=>page.locator('#shop-advice-dialog').getByRole('button',{name:'Cerrar',exact:true}).click();
 const option=page=>page.locator('[data-advice-offer="visible-joker"]');
 const inspect=async(page,options={})=>page.evaluate(async({storageKey,options})=>{
  const {inspectShopDecision}=await import(new URL('dist/src/advisor/decision.js',location.href).href);
  const {readShopSnapshot}=await import(new URL('dist/src/ui/storefront.js',location.href).href);
  const state=JSON.parse(localStorage.getItem(storageKey)).state,result=inspectShopDecision(state,readShopSnapshot(),{ante:4,...options});
  if(!result.ok)throw Error(JSON.stringify(result.errors));return result.value;
 },{storageKey:key,options});
 const session=async(input=fixture(),viewport={width:1440,height:1000})=>{
  const context=await browser.newContext({viewport});await context.addInitScript(storageKey=>{window.__ux01ConfirmedWrites=0;const original=Storage.prototype.setItem;Storage.prototype.setItem=function(name,value){if(name===storageKey)window.__ux01ConfirmedWrites++;return original.call(this,name,value);};},key);
  const page=await context.newPage();watch(page);await page.goto(origin.href);await ready(page);await go(page,'archive');
  await page.locator('#import-file').setInputFiles({name:'synthetic-ux01-browser.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(input))});
  await page.locator('#dialog-accept').click();await page.locator('#confirmation').waitFor({state:'hidden'});await go(page,'table');
  await page.locator('.candidate-card[data-offer-id="visible-joker"]').waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.querySelector('.candidate-pending')&&document.querySelector('#shop-recommendation')?.textContent!=='Revisa los datos');
  return {context,page};
 };
 const unchanged=async(page,before,count)=>{assert.equal(await raw(page),before);assert.equal(await writes(page),count);const saved=await record(page);assert.equal(saved.history.length,0);assert.equal(saved.state.revision,0);};
 const detailsClosed=async page=>{for(const id of ['shop-advice-reasons','shop-advice-alternatives','shop-advice-advanced'])assert.equal(await page.locator('#'+id).getAttribute('open'),null,id+' starts closed');};
 const summaryShape=async page=>{
  const summary=page.locator('#shop-advice-summary');await summary.waitFor({state:'visible'});
  assert.equal(await summary.getAttribute('data-status'),'conditional');
  for(const id of ['shop-advice-benefit','shop-advice-sacrifice','shop-advice-scope'])assert.equal(await page.locator('#'+id).isVisible(),true,id);
  const paragraphCount=await summary.locator('p').count();assert.ok(paragraphCount<=2,'Summary has at most two paragraphs, found '+paragraphCount);
  assert.match(await summary.innerText(),/\+6 Mult/);assert.match(await summary.innerText(),/\$8/);
  assert.doesNotMatch(await summary.innerText(),/\d\s*%/);
  assert.equal(await summary.evaluate(element=>element.scrollWidth<=element.clientWidth+1),true,'No summary horizontal overflow');
  await detailsClosed(page);return {paragraphCount,text:await summary.innerText()};
 };

 // Initial view gives a brief useful answer; all previous explanations remain
 // accessible. This comparison checks text retention, not advice correctness.
 const desktop=await session(),p=desktop.page;let before=await raw(p),count=await writes(p);await open(p);
 const shape=await summaryShape(p),decision=await inspect(p);assert.equal(decision.context.options.find(item=>item.id==='visible-joker').moneyAfter,8);
 await p.screenshot({path:dir+'/browser-desktop.png',fullPage:false});
 await p.locator('#shop-advice-reasons > summary').click();
 for(const reason of decision.context.recommendation.reasons)assert.ok((await p.locator('#shop-advice-reasons').innerText()).includes(reason),'Recommendation reason preserved');
 await p.locator('#shop-advice-alternatives > summary').click();
 for(const reason of decision.context.options.find(item=>item.id==='visible-joker').reasons)assert.ok((await option(p).innerText()).includes(reason),'Alternative reason preserved');
 assert.match(await option(p).innerText(),/Aporte propio.*\+6 Mult/);assert.match(await option(p).innerText(),/Saldo \$8/);
 assert.match(await option(p).innerText(),/No es una diferencia de puntuación total/);
 await unchanged(p,before,count);
 pass('compact-answer-and-complete-disclosures',{ownMult:6,moneyAfter:8,maxSummaryParagraphs:2,allOriginalReasonsPreserved:true,recordWrites:0},{ownMult:6,moneyAfter:8,summaryParagraphs:shape.paragraphCount,allOriginalReasonsPreserved:true,recordWrites:0});

 // The fixed-plan workflow remains opt-in and cannot silently invent plans.
 await p.locator('#shop-advice-advanced > summary').click();assert.equal(await p.locator('#store-scenarios').isVisible(),true);
 await p.locator('#store-scenarios').click();
 assert.match(await p.locator('#shop-advice-dialog').innerText(),/No hay escenarios|Configúralos en Análisis/);
 assert.equal(await p.locator('#shop-advice-summary').isVisible(),true);await unchanged(p,before,count);
 const strict=await inspect(p,{requireObserved:true});assert.equal(strict.context.recommendation.status,'abstain');assert.ok(strict.actions.every(action=>action.status==='pending_evidence'));
 await unchanged(p,before,count);await close(p);await p.reload();await ready(p);await go(p,'table');await p.locator('.candidate-card[data-offer-id="visible-joker"]').waitFor({state:'visible'});await open(p);await unchanged(p,before,0);await close(p);
 pass('plans-opt-in-strict-mode-and-reload-remain-readonly',{noInventedPlans:true,strict:'abstain',recordWrites:0,revision:0,historyEntries:0},{noInventedPlans:true,strict:strict.context.recommendation.status,recordWrites:0,revision:(await record(p)).state.revision,historyEntries:(await record(p)).history.length});await desktop.context.close();

 // Popcorn4 is reachable after four round endings (20−4×4). Equal money
 // and immediate Mult are a tradeoff, not proof of a universally optimal sale.
 const replacement=await session(fixture({jokers:[owned('popcorn','owned-popcorn',2,{mult:known(4)})],catalogId:'joker',price:2})),r=replacement.page;
 before=await raw(r);count=await writes(r);await r.locator('.candidate-hero').click();await r.locator('.candidate-dialog[open] select[aria-label^="Reemplazo para"]').selectOption('owned-popcorn');
 await r.locator('.candidate-dialog[open]').getByRole('button',{name:'Cerrar',exact:true}).click();await open(r);
 assert.equal(await r.locator('#shop-advice-summary').getAttribute('data-status'),'tie');
 assert.match(await r.locator('#shop-advice-sacrifice').innerText(),/Popcorn|Palomitas|mult=4|\+4 Mult/i);
 await r.locator('#shop-advice-alternatives > summary').click();assert.match(await option(r).innerText(),/mult=4/);assert.match(await option(r).innerText(),/No se heredan/);
 const replacementDecision=await inspect(r),replacementOption=replacementDecision.context.options.find(item=>item.id==='visible-joker');
 assert.equal(replacementOption.fit.purchase.netCost,0);assert.equal(replacementOption.moneyAfter,12);await unchanged(r,before,count);
 pass('replacement-sacrifice-is-visible-before-details',{status:'tie',sacrificed:'Popcorn remaining mult4',netCost:0,moneyAfter:12,recordWrites:0},{status:replacementDecision.context.recommendation.status,sacrifice:await r.locator('#shop-advice-sacrifice').innerText(),netCost:replacementOption.fit.purchase.netCost,moneyAfter:replacementOption.moneyAfter,recordWrites:0});await replacement.context.close();

 // Missing price and unsupported Perishable modifier remain visible on the
 // first answer. Neither is hidden exclusively behind a coverage disclosure.
 for(const [id,input,expected] of [
  ['unknown-price',fixture({price:null}),/precio/i],
  ['unsupported-modifier',fixture({stickers:['perishable']}),/pegatin|sticker|modific|fuera.*alcance|cobertura/i]
 ]){
  const sample=await session(input),page=sample.page;before=await raw(page);count=await writes(page);await open(page);
  const pending=page.locator('#shop-advice-pending');assert.equal(await pending.isVisible(),true,id+' visible limitation');assert.match(await pending.innerText(),expected);
  assert.equal(await page.locator('#shop-advice-summary').getAttribute('data-status'),'abstain');await detailsClosed(page);await unchanged(page,before,count);
  await page.screenshot({path:dir+'/browser-'+id+'.png',fullPage:false});
  pass(id+'-limitation-visible',{status:'abstain',limitationVisible:true,recordWrites:0},{status:await page.locator('#shop-advice-summary').getAttribute('data-status'),pending:await pending.innerText(),limitationVisible:true,recordWrites:0});await sample.context.close();
 }

 // Mobile emulation is reported honestly; this is not a physical Android run.
 const mobile=await session(fixture(),{width:390,height:844}),m=mobile.page;before=await raw(m);count=await writes(m);await open(m);const mobileShape=await summaryShape(m);
 const geometry=await m.locator('#shop-advice-summary').evaluate(element=>{const r=element.getBoundingClientRect(),dialog=element.closest('dialog'),d=dialog.getBoundingClientRect();return {top:r.top,bottom:r.bottom,height:r.height,viewportHeight:innerHeight,width:innerWidth,dialogScrollTop:dialog.scrollTop,firstBlock:element.previousElementSibling?.classList.contains('section-title')===true,documentOverflow:document.documentElement.scrollWidth>innerWidth,dialogOverflow:dialog.scrollWidth>dialog.clientWidth+1,dialogTop:d.top};});
 assert.equal(geometry.firstBlock,true);assert.ok(geometry.top>=0&&geometry.bottom<=844,'Mobile answer fits initial viewport: '+JSON.stringify(geometry));assert.equal(geometry.dialogScrollTop,0);assert.equal(geometry.documentOverflow,false);assert.equal(geometry.dialogOverflow,false);
 await m.screenshot({path:dir+'/browser-mobile.png',fullPage:false});await m.locator('#shop-advice-alternatives > summary').click();await option(m).scrollIntoViewIfNeeded();
 assert.equal(await m.locator('#shop-advice-dialog').evaluate(element=>element.scrollWidth<=element.clientWidth+1),true);await m.screenshot({path:dir+'/browser-mobile-alternatives.png',fullPage:false});await unchanged(m,before,count);await close(m);await unchanged(m,before,count);
 pass('mobile390-answer-fits-without-scroll-or-overflow',{viewport:{width:390,height:844},firstBlock:true,summaryFits:true,maxSummaryParagraphs:2,recordWrites:0,physicalAndroid:false},{...geometry,summaryParagraphs:mobileShape.paragraphCount,recordWrites:0,physicalAndroid:false});await mobile.context.close();

 assert.equal(report.cases.length,6);assert.deepEqual(report.pageErrors,[]);report.status='passed';await writeFile(dir+'/browser.json',JSON.stringify(report,null,2)+'\n');console.log('PASS UX01',report.cases.length,'browser groups; no gameplay verification');
}catch(error){report.status='failed';report.error=error.stack||String(error);await writeFile(dir+'/browser.json',JSON.stringify(report,null,2)+'\n');if(lastPage&&!lastPage.isClosed())await lastPage.screenshot({path:dir+'/browser-failed.png',fullPage:true}).catch(()=>{});throw error;}
finally{await browser?.close();server?.kill();}
