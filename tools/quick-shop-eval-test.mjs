import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createNewRun} from '../dist/src/run/start.js';

// Browser contract checks with independent, literal observed-state fixtures.
// These are not the frozen EVAL01 development/reserved cases, real Balatro
// observations, or a measure of strategic effectiveness in complete games.
const port='4215',remote=process.env.EVAL01_BASE_URL;
const origin=new URL(remote??'http://127.0.0.1:'+port+'/');if(!origin.pathname.endsWith('/'))origin.pathname+='/';
const key='balatro-advisor.confirmed.v1',dir='docs/evidencia/eval01';await mkdir(dir,{recursive:true});
const known=value=>({status:'known',source:'manual',value});
const owned=(catalogId,instanceId,sellValue,counters={})=>({catalogId,instanceId,sellValue:known(sellValue),edition:known('base'),stickers:known([]),counters});
function fixture({deckId='blue',money=12,jokers=[owned('joker','owned-joker',1)],catalogId='abstract_joker',price=4,vouchers=[]}={}){
 const created=createNewRun({runId:'synthetic-eval01-browser',updatedAt:'2026-10-18T23:00:00Z',deckId,profileConfirmed:true});assert.equal(created.ok,true);
 const state=created.value;
 state.phase='shop';state.phaseData={origin:known({ante:3,kind:'boss'})};
 state.observed.money=known(money);state.observed.jokers=known(structuredClone(jokers));
 state.observed.lastCleared=known({ante:3,kind:'boss'});
 state.observed.nextBlind=known({ante:4,kind:'small',bossId:known('none'),target:known(5000),reward:known(3)});
 state.observed.outOfScope.value.vouchers=[...vouchers];
 state.observed.shop=known({shopId:'eval01-browser-shop',cardOffers:[{offerId:'visible-joker',catalogId,label:catalogId,kind:'joker',price:known(price),edition:known('base'),stickers:known([])}],voucherOffers:[],packOffers:[],ignoredOtherOffers:[]});
 state.assumptions.probes=[];state.assumptions.roundPlans=[];
 return {schemaVersion:'confirmed-2',initialState:structuredClone(state),state,history:[]};
}
const modules=[
 'dist/src/ui/app.js','dist/src/ui/storefront.js','dist/src/ui/consequences-view.js',
 'dist/src/advisor/shop-context.js','dist/src/advisor/quick-shop-policy.js','dist/src/advisor/quick-fit.js','dist/src/advisor/fit-index.js',
 'dist/src/advisor/decision.js','dist/src/advisor/composition.js','dist/src/advisor/composition-signals.js',
 'dist/src/rules/shop.js','dist/src/rules/fixed-main-mult.js','dist/src/rules/scoring.js','dist/src/rules/economy.js','dist/src/rules/generation-jokers.js',
 'dist/src/rules/core.js','dist/src/rules/engine-evidence.js','dist/src/rules/evidence.js',
 'dist/src/run/start.js','dist/src/state/model.js','dist/src/state/validation.js','dist/src/storage/confirmed-store.js','dist/src/storage/confirmed-record.js'
];
const report={date:new Date().toISOString(),mode:remote?'public':'local',url:origin.href,commit:process.env.EVAL01_COMMIT??null,workflow:process.env.EVAL01_WORKFLOW??null,
 environment:'Chrome temporary isolated profiles; desktop and 390px mobile emulation',gameObservation:false,physicalAndroid:false,
 oracle:'Independent literal arithmetic and UI/transaction contracts. Editorial recommendations are not verified optimal decisions or complete-run win probabilities.',
 storageScope:'Confirmed run record: consultation must not call setItem, change revision, or append history. The ownership lease is separate.',
 criticalModules:modules.length,hashes:[],cases:[],pageErrors:[]};
const pass=(id,expected,observed)=>{report.cases.push({id,expected,observed,status:'passed'});console.log('PASS',id);};
const server=remote?null:spawn(process.execPath,['dist/src/server.js'],{env:{...process.env,PORT:port},stdio:'pipe',windowsHide:true});let browser,lastPage;
try{
 if(server)await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('EVAL01 browser server timeout')),15000);server.stdout.on('data',data=>{if(String(data).includes('Balatro Advisor local')){clearTimeout(timer);resolve();}});server.on('error',error=>{clearTimeout(timer);reject(error);});server.on('exit',()=>{clearTimeout(timer);reject(Error('EVAL01 browser server stopped'));});});
 if(remote)for(const file of ['index.html',...modules,'web/mesa.css']){
  const local=await readFile('out/'+file),url=new URL(file,origin);url.searchParams.set('eval01',String(Date.now()));
  const response=await fetch(url);assert.equal(response.status,200,file);const bytes=Buffer.from(await response.arrayBuffer()),hash=data=>createHash('sha256').update(data).digest('hex');
  assert.equal(hash(bytes),hash(local),'Public artifact differs from out/'+file);report.hashes.push({file,sha256:hash(bytes)});
 }
 browser=await chromium.launch({channel:'chrome',headless:true});
 const raw=page=>page.evaluate(storageKey=>localStorage.getItem(storageKey),key),record=async page=>JSON.parse(await raw(page)),writes=page=>page.evaluate(()=>window.__eval01ConfirmedWrites);
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
  const context=await browser.newContext({viewport});await context.addInitScript(storageKey=>{window.__eval01ConfirmedWrites=0;const original=Storage.prototype.setItem;Storage.prototype.setItem=function(name,value){if(name===storageKey)window.__eval01ConfirmedWrites++;return original.call(this,name,value);};},key);
  const page=await context.newPage();watch(page);await page.goto(origin.href);await ready(page);await go(page,'archive');
  await page.locator('#import-file').setInputFiles({name:'synthetic-eval01-browser.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(input))});
  await page.locator('#dialog-accept').click();await page.locator('#confirmation').waitFor({state:'hidden'});await go(page,'table');
  await page.locator('.candidate-card[data-offer-id="visible-joker"]').waitFor({state:'visible'});
  await page.waitForFunction(()=>!document.querySelector('.candidate-pending')&&document.querySelector('#shop-recommendation')?.textContent!=='Revisa los datos');
  return {context,page};
 };
 const unchanged=async(page,before,count)=>{assert.equal(await raw(page),before);assert.equal(await writes(page),count);const saved=await record(page);assert.equal(saved.history.length,0);assert.equal(saved.state.revision,0);};

 // 1. Abstract counts itself and the owned Joker: 2 physical cards ×3 = +6
 // own Mult. It is not a +6 score delta, nor a verdict about the 5000 target.
 const initial=await session(),p=initial.page;let before=await raw(p),count=await writes(p);await open(p);
 assert.match(await option(p).innerText(),/Aporte propio.*\+6 Mult/);assert.match(await option(p).innerText(),/Saldo \$8/);
 assert.match(await option(p).innerText(),/aunque ya tengas ese rol|mismo rol/i);assert.match(await option(p).innerText(),/No es una diferencia de puntuación total/);
 let decision=await inspect(p),result=decision.context.options.find(item=>item.id==='visible-joker');
 assert.equal(result.moneyAfter,8);assert.ok(result.findings.some(f=>f.ruleId==='S-ADDITIONAL-SCORING'&&f.values?.ownMult===6));
 assert.equal(decision.context.recommendation.status,'conditional');assert.deepEqual(decision.context.recommendation.offerIds,['visible-joker']);
 assert.match(await p.locator('#shop-advice-dialog').innerText(),/superar la ciega.*sin evaluar|Supervivencia sin evaluar/i);
 assert.doesNotMatch(await p.locator('#shop-advice-dialog').innerText(),/\d\s*%/);await unchanged(p,before,count);
 await p.screenshot({path:dir+'/browser-desktop.png',fullPage:false});
 pass('same-role-own-bonus-is-not-total-score',{ownedJokers:1,projectedPhysicalJokers:2,ownMult:6,moneyAfter:8,scenarioCount:0,recordWrites:0},{ownMult:result.findings.find(f=>f.ruleId==='S-ADDITIONAL-SCORING').values.ownMult,moneyAfter:result.moneyAfter,scenarioCount:decision.scenarioConsequences.plans.length,recordWrites:0});

 // 2. Consultation, disclosure controls, strict evidence and reload preserve the
 // imported real run byte-for-byte. Strict mode does not acquire observations.
 await option(p).locator('details > summary').click();await unchanged(p,before,count);
 const strict=await inspect(p,{requireObserved:true});assert.equal(strict.context.recommendation.status,'abstain');
 assert.ok(strict.actions.every(action=>action.status==='pending_evidence'));assert.ok(strict.actions.every(action=>!action.evidence?.verifiedAgainstGame));
 await unchanged(p,before,count);await close(p);await p.reload();await ready(p);await go(p,'table');await p.locator('.candidate-card[data-offer-id="visible-joker"]').waitFor({state:'visible'});await open(p);
 await unchanged(p,before,0);await close(p);pass('consultation-strict-evidence-reload-readonly',{confirmedRecordWrites:0,revision:0,historyEntries:0,strict:'abstain',gameVerified:false},{confirmedRecordWrites:0,revision:(await record(p)).state.revision,historyEntries:(await record(p)).history.length,strict:strict.context.recommendation.status,gameVerified:false});await initial.context.close();

 // 3. Seed Money raises the cap, but does not alter the $5 interest unit:
 // floor(35/5)=7; purchase $2 leaves33; floor(33/5)=6. No cashout occurs.
 const seeded=await session(fixture({money:35,jokers:[],catalogId:'joker',price:2,vouchers:['v_seed_money']})),s=seeded.page;
 before=await raw(s);count=await writes(s);await open(s);decision=await inspect(s);result=decision.context.options.find(item=>item.id==='visible-joker');
 assert.equal(result.moneyAfter,33);assert.equal(result.economics.interest.before,7);assert.equal(result.economics.interest.after,6);assert.equal(result.economics.interest.change,-1);
 assert.equal(result.economics.interest.provisional,true);assert.ok(result.economics.interest.assumptions.length>=2);
 assert.match(await option(s).innerText(),/Interés aislado condicionado: \$7 → \$6 \(-1\)/);assert.match(await option(s).innerText(),/no se paga en la tienda/i);
 await unchanged(s,before,count);assert.equal((await record(s)).state.observed.money.value,35);
 pass('seed-money-interest-is-conditional-opportunity',{hypotheticalBalance:33,interestBefore:7,interestAfter:6,interestChange:-1,actualBalance:35,recordWrites:0},{hypotheticalBalance:result.moneyAfter,...result.economics.interest,actualBalance:(await record(s)).state.observed.money.value,recordWrites:0});await seeded.context.close();

 // 4. Green earns no interest, regardless of this known balance.
 const green=await session(fixture({deckId:'green',money:35,jokers:[],catalogId:'joker',price:2})),g=green.page;
 before=await raw(g);count=await writes(g);await open(g);decision=await inspect(g);result=decision.context.options.find(item=>item.id==='visible-joker');
 assert.equal(result.economics.interest.before,0);assert.equal(result.economics.interest.after,0);assert.equal(result.economics.interest.change,0);
 assert.match(await option(g).innerText(),/Interés aislado condicionado: \$0 → \$0 \(0\)/);await unchanged(g,before,count);
 pass('green-deck-never-receives-invented-interest',{before:0,after:0,change:0,actualBalance:35,recordWrites:0},{...result.economics.interest,actualBalance:(await record(g)).state.observed.money.value,recordWrites:0});await green.context.close();

 // 5. Popcorn20-4×4=4 is a reachable remaining amount. Sale$2 then Joker$2
 // leaves cash unchanged; its current effect is sacrificed, never inherited.
 const replacement=await session(fixture({jokers:[owned('popcorn','owned-popcorn',2,{mult:known(4)})],catalogId:'joker',price:2})),r=replacement.page;
 before=await raw(r);count=await writes(r);await r.locator('.candidate-hero').click();await r.locator('.candidate-dialog[open] select[aria-label^="Reemplazo para"]').selectOption('owned-popcorn');
 await r.locator('.candidate-dialog[open]').getByRole('button',{name:'Cerrar',exact:true}).click();await open(r);decision=await inspect(r);result=decision.context.options.find(item=>item.id==='visible-joker');
 assert.equal(result.moneyAfter,12);assert.equal(result.fit.purchase.netCost,0);assert.equal(decision.context.recommendation.status,'tie');
 assert.deepEqual(decision.context.recommendation.offerIds,['hold','visible-joker']);assert.match(await option(r).innerText(),/mult=4/);assert.match(await option(r).innerText(),/No se heredan en la compra/);assert.match(await option(r).innerText(),/temporal restante, no crecimiento/);
 await unchanged(r,before,count);assert.equal((await record(r)).state.observed.jokers.value[0].catalogId,'popcorn');
 pass('replacement-is-local-tradeoff-not-inherited-development',{netCost:0,moneyAfter:12,status:'tie',alternatives:['hold','visible-joker'],realJoker:'popcorn',recordWrites:0},{netCost:result.fit.purchase.netCost,moneyAfter:result.moneyAfter,status:decision.context.recommendation.status,alternatives:decision.context.recommendation.offerIds,realJoker:(await record(r)).state.observed.jokers.value[0].catalogId,recordWrites:0});await replacement.context.close();

 // 6. A sole Credit Card at$1 with$100 does not demonstrate useful financing.
 const credit=await session(fixture({money:100,jokers:[],catalogId:'credit_card',price:1})),c=credit.page;
 before=await raw(c);count=await writes(c);await open(c);decision=await inspect(c);result=decision.context.options.find(item=>item.id==='visible-joker');
 assert.equal(result.fit.readiness,'potential');assert.deepEqual(decision.context.recommendation.offerIds,['hold']);assert.equal(await option(c).getAttribute('data-recommended'),'false');
 assert.match(await option(c).innerText(),/no crea efectivo|No añade dinero/);assert.match(await option(c).innerText(),/necesidad de financiación|compra útil que necesite/);await unchanged(c,before,count);
 pass('credit-is-not-an-income-or-automatic-purchase',{recommended:['hold'],readiness:'potential',actualBalance:100,recordWrites:0},{recommended:decision.context.recommendation.offerIds,readiness:result.fit.readiness,actualBalance:(await record(c)).state.observed.money.value,recordWrites:0});await credit.context.close();

 // 7. Mobile browser emulation is not a physical Android test.
 const mobile=await session(fixture(),{width:390,height:844}),m=mobile.page;before=await raw(m);count=await writes(m);
 assert.equal(await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await m.locator('#joker-candidates').scrollIntoViewIfNeeded();await m.screenshot({path:dir+'/browser-mobile-table.png',fullPage:false});await open(m);
 assert.equal(await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.match(await option(m).innerText(),/\+6 Mult/);
 const dialog=m.locator('#shop-advice-dialog');assert.equal(await dialog.evaluate(element=>element.scrollWidth<=element.clientWidth+1),true);
 await m.screenshot({path:dir+'/browser-mobile.png',fullPage:false});await option(m).scrollIntoViewIfNeeded();await m.screenshot({path:dir+'/browser-mobile-option.png',fullPage:false});await option(m).locator('details > summary').click();assert.equal(await dialog.evaluate(element=>element.scrollWidth<=element.clientWidth+1),true);
 await unchanged(m,before,count);await close(m);await unchanged(m,before,count);
 pass('mobile390-table-advice-and-details-without-overflow',{viewport:390,documentOverflow:false,dialogOverflow:false,recordWrites:0,physicalAndroid:false},{viewport:390,documentOverflow:false,dialogOverflow:false,recordWrites:0,physicalAndroid:false});await mobile.context.close();

 assert.equal(report.cases.length,7);assert.deepEqual(report.pageErrors,[]);report.status='passed';await writeFile(dir+'/browser.json',JSON.stringify(report,null,2)+'\n');console.log('PASS EVAL01',report.cases.length,'browser groups; no gameplay verification');
}catch(error){report.status='failed';report.error=error.stack||String(error);await writeFile(dir+'/browser.json',JSON.stringify(report,null,2)+'\n');if(lastPage&&!lastPage.isClosed())await lastPage.screenshot({path:dir+'/browser-failed.png',fullPage:true}).catch(()=>{});throw error;}
finally{await browser?.close();server?.kill();}
