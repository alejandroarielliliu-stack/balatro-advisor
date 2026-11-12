import {openWorkspace,reloadWorkspace} from './workspace-navigation.mjs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';

// Browser contracts use the independently frozen DEC02 fixtures and literal
// dollar/Mult oracles. They are not observations of Balatro or win-rate tests.
const port='4219',remote=process.env.DEC02_BASE_URL,origin=new URL(remote??'http://127.0.0.1:'+port+'/');
if(!origin.pathname.endsWith('/'))origin.pathname+='/';
const key='balatro-advisor.confirmed.v1',dir='docs/evidencia/dec02';await mkdir(dir,{recursive:true});
const fixtureBytes=await readFile('evaluation/fixtures/dec02-development.json');assert.equal(createHash('sha256').update(fixtureBytes).digest('hex'),'b9ad6643331c67d9caf4efc7a850cd27e4c5e6f0f31687640a0732918fdf1cd0');
const bank=JSON.parse(fixtureBytes.toString('utf8'));
const at=id=>{const found=bank.cases.find(c=>c.id===id);assert.ok(found,id);return found;};
const wrap=state=>({schemaVersion:'confirmed-2',initialState:structuredClone(state),state:structuredClone(state),history:[]});
const known=value=>({status:'known',source:'manual',value});
const modules=[
 'dist/src/ui/app.js','dist/src/ui/storefront.js','dist/src/ui/shop-advice-summary.js','dist/src/ui/consequences-view.js',
 'dist/src/advisor/shop-context.js','dist/src/advisor/shop-comparison.js','dist/src/advisor/quick-shop-policy.js',
 'dist/src/advisor/decision.js','dist/src/advisor/quick-fit.js','dist/src/advisor/composition.js','dist/src/advisor/composition-signals.js',
 'dist/src/rules/shop.js','dist/src/rules/fixed-main-mult.js','dist/src/rules/scoring.js','dist/src/rules/economy.js',
 'dist/src/rules/engine-evidence.js','dist/src/storage/confirmed-record.js','dist/src/storage/confirmed-store.js',
 'dist/src/state/model.js','dist/src/state/validation.js',
 'dist/src/rules/shop-pricing.js','dist/src/rules/shop-offer-prices.js','dist/src/rules/price-tags.js'
];
const report={date:new Date().toISOString(),mode:remote?'public':'local',url:origin.href,commit:process.env.DEC02_COMMIT??null,workflow:process.env.DEC02_WORKFLOW??null,
 environment:'Chrome isolated profiles; desktop and mobile390 emulation',gameObservation:false,physicalAndroid:false,
 oracle:'Frozen DEC02 mechanical literals; constrained policy acceptance, independent alternatives, and zero-write consultation. No strategic optimum, survival or probability is inferred.',
 hashes:[],cases:[],pageErrors:[]};
const pass=(id,expected,observed)=>{report.cases.push({id,expected,observed,status:'passed'});console.log('PASS',id);};
const server=remote?null:spawn(process.execPath,['dist/src/server.js'],{env:{...process.env,PORT:port},stdio:'pipe',windowsHide:true});let browser,lastPage;
try{
 if(server)await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('DEC02 server timeout')),15000);server.stdout.on('data',d=>{if(String(d).includes('Balatro Advisor local')){clearTimeout(timeout);resolve();}});server.on('error',reject);server.on('exit',()=>reject(Error('DEC02 server stopped')));});
 if(remote)for(const file of ['index.html',...modules,'web/mesa.css']){const url=new URL(file,origin);url.searchParams.set('dec02',String(Date.now()));const response=await fetch(url);assert.equal(response.status,200,file);const bytes=Buffer.from(await response.arrayBuffer()),local=await readFile('out/'+file),hash=data=>createHash('sha256').update(data).digest('hex');assert.equal(hash(bytes),hash(local),'Public artifact differs: '+file);report.hashes.push({file,sha256:hash(bytes)});}
 browser=await chromium.launch({channel:'chrome',headless:true});
 const raw=page=>page.evaluate(k=>localStorage.getItem(k),key),record=async page=>JSON.parse(await raw(page)),writes=page=>page.evaluate(()=>window.__dec02Writes);
 const go=(page,screen)=>page.locator('[data-screen="'+screen+'"]').click();
 const ready=page=>page.waitForFunction(()=>document.querySelector('#ownership')?.textContent.includes('Esta pestaña tiene'));
 const shelf=page=>page.waitForFunction(()=>document.querySelectorAll('.bay-mini').length===150&&!document.querySelector('.candidate-pending')&&document.querySelector('#shop-recommendation')?.textContent!=='Revisa los datos');
 const observePage=page=>{lastPage=page;page.on('pageerror',e=>report.pageErrors.push(e.message));};
 const session=async(state=at('DEC02-05').state,viewport={width:1440,height:1000})=>{
  const context=await browser.newContext({viewport});await context.addInitScript(storageKey=>{window.__dec02Writes=0;const set=Storage.prototype.setItem;Storage.prototype.setItem=function(name,value){if(name===storageKey)window.__dec02Writes++;return set.call(this,name,value);};},key);
  const page=await context.newPage();observePage(page);await openWorkspace(page,new URL('#table',origin.href).href);await ready(page);await go(page,'archive');await page.locator('#import-file').setInputFiles({name:'synthetic-dec02.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(wrap(state)))});await page.locator('#dialog-accept').click();await page.locator('#confirmation').waitFor({state:'hidden'});await go(page,'table');await shelf(page);return {context,page};
 };
 const open=async page=>{await page.locator('#shop-recommendation').click();await page.locator('#shop-advice-dialog').waitFor({state:'visible'});};
 const closeNative=async(dialog,button)=>{await dialog.evaluate(element=>{element.dataset.testCloseComplete='pending';element.addEventListener('close',()=>queueMicrotask(()=>{element.dataset.testCloseComplete='done';}),{once:true});});await button.click();await dialog.waitFor({state:'hidden'});await dialog.locator('xpath=self::*[@data-test-close-complete="done"]').waitFor({state:'attached'});};
 const close=page=>closeNative(page.locator('#shop-advice-dialog'),page.locator('#shop-advice-dialog').getByRole('button',{name:'Cerrar',exact:true}));
 const inspect=(page,options={})=>page.evaluate(async({k,options})=>{const {inspectShopDecision}=await import(new URL('dist/src/advisor/decision.js',location.href).href),{readShopSnapshot}=await import(new URL('dist/src/ui/storefront.js',location.href).href);const state=JSON.parse(localStorage.getItem(k)).state;const result=inspectShopDecision(state,readShopSnapshot(),{ante:state.observed.nextBlind.status==='known'?state.observed.nextBlind.value.ante:1,...options});if(!result.ok)throw Error(JSON.stringify(result.errors));return result.value;},{k:key,options});
 const unchanged=async(page,before,count)=>{assert.equal(await raw(page),before);assert.equal(await writes(page),count);};
 const row=(page,id)=>page.locator('[data-advice-offer="'+id+'"]');
 const choices=page=>page.locator('#shop-advice-summary [data-advice-choice]').evaluateAll(nodes=>nodes.map(n=>n.dataset.adviceChoice));

 // All comparisons originate from the same real snapshot. Literal current
 // main-phase own Mult4/$2 versus3/$4 is not a claim about future inventories.
 const primary=await session(),p=primary.page;let before=await raw(p),count=await writes(p);await open(p);let decision=await inspect(p),rec=decision.context.recommendation;
 assert.equal(decision.context.policy,'quick-shop-3');assert.equal(rec.status,'conditional');assert.deepEqual(rec.offerIds,['joker']);
 const comparison=decision.context.comparisons.find(c=>c.preferredId==='joker'&&c.otherId==='abstract');assert.ok(comparison);
 assert.deepEqual(comparison.values,{preferredMult:4,otherMult:3,preferredNetCost:2,otherNetCost:4});assert.ok(comparison.conditions.length>0);
 assert.deepEqual(await choices(p),['joker']);const benefit=await p.locator('#shop-advice-benefit').innerText();assert.match(benefit,/\+4/);assert.match(benefit,/\+3/);assert.match(benefit,/\$2/);assert.match(benefit,/\$4/);assert.match(benefit,/inventario|Mult propio/i);assert.match(await p.locator('#shop-advice-scope').innerText(),/supervivencia sin evaluar/i);
 await p.locator('#shop-advice-reasons > summary').click();assert.match(await p.locator('#shop-advice-reasons').innerText(),/Abstract.*(futur|inventario)|inventario.*Abstract/i);await p.locator('#shop-advice-alternatives > summary').click();assert.equal(await row(p,'abstract').isVisible(),true);await unchanged(p,before,count);await p.screenshot({path:dir+'/desktop-comparison.png',fullPage:false});await close(p);
 pass('current-own-mult-and-net-cost-give-constrained-preference',{preferred:'joker',ownMult:[4,3],netCost:[2,4],moneyAfter:[23,21],writes:0},{preferred:rec.offerIds,comparison:comparison.values,moneyAfter:decision.context.options.filter(o=>o.id==='joker'||o.id==='abstract').map(o=>o.moneyAfter),writes:0});

 // A retained Scholar is a legitimate distinct joker; at two physical slots
 // Abstract6/$4 versus Joker4/$2 leaves a resource/benefit tradeoff.
 const developed=structuredClone(at('DEC02-05').state);developed.observed.jokers=known([{catalogId:'scholar',instanceId:'observed-scholar',sellValue:known(2),edition:known('base'),stickers:known([]),counters:{}}]);
 const alternative=await session(developed),a=alternative.page;before=await raw(a);count=await writes(a);await open(a);decision=await inspect(a);assert.equal(decision.context.recommendation.status,'tie');assert.ok(decision.context.recommendation.offerIds.includes('joker'));assert.ok(decision.context.recommendation.offerIds.includes('abstract'));assert.deepEqual(decision.context.comparisons,[]);await unchanged(a,before,count);await alternative.context.close();
 pass('larger-mult-with-higher-cost-stays-a-tradeoff',{status:'tie',currentOwnMult:[4,6],cost:[2,4],forcedWinner:false},{status:decision.context.recommendation.status,choices:decision.context.recommendation.offerIds,forcedWinner:false});

 // A manual Tarot remains unresolved, priced and present. The registered
 // run never acquires it and the conditional recommendation is explicitly local.
 const partial=await session(at('DEC02-06').state),u=partial.page;before=await raw(u);count=await writes(u);const unknownId=at('DEC02-06').snapshot.others[0].offerId;await open(u);decision=await inspect(u);rec=decision.context.recommendation;
 assert.equal(rec.status,'conditional');assert.deepEqual(rec.offerIds,['joker']);assert.equal(rec.scope,'evaluated-options');assert.ok(rec.pendingOfferIds.includes(unknownId));assert.match(await u.locator('#shop-advice-scope').innerText(),/comparación parcial/i);assert.match(await u.locator('#shop-advice-pending').innerText(),/The Fool|Tarot/i);assert.match(await u.locator('#shop-advice-pending').innerText(),/cambiar|pendiente|evaluar|desconoc/i);
 assert.equal(decision.actions.some(action=>action.optionId===unknownId),false);assert.equal(decision.context.options.find(option=>option.id===unknownId).price,3);assert.equal(decision.context.options.find(option=>option.id===unknownId).moneyAfter,17);await u.locator('#shop-advice-alternatives > summary').click();assert.match(await row(u,unknownId).innerText(),/3/);assert.equal(await row(u,unknownId).getAttribute('data-recommended'),'false');assert.doesNotMatch(await u.locator('#shop-advice-summary').innerText(),/\d\s*%/);await unchanged(u,before,count);await u.screenshot({path:dir+'/desktop-partial.png',fullPage:false});await partial.context.close();
 pass('unknown-competitor-preserves-partial-known-advice',{preferred:'joker',scope:'evaluated-options',manualPrice:3,hypotheticalOnlyBalance:17,unknownAction:false,writes:0},{preferred:rec.offerIds,scope:rec.scope,manualPrice:3,hypotheticalOnlyBalance:17,unknownAction:false,writes:0});

 const replacement=await session(at('DEC02-03').state),r=replacement.page;before=await raw(r);count=await writes(r);let blocked=await inspect(r);assert.ok(blocked.actions.find(action=>action.optionId==='abstract').errors.some(error=>error.code==='no_slots'));
 await r.locator('.candidate-card[data-offer-id="abstract"] .candidate-hero').click();const candidate=r.locator('.candidate-card[data-offer-id="abstract"] .candidate-dialog');await candidate.locator('select[aria-label^="Reemplazo para"]').selectOption('owned-riff');await closeNative(candidate,candidate.getByRole('button',{name:'Cerrar',exact:true}));await open(r);decision=await inspect(r);rec=decision.context.recommendation;
 assert.equal(rec.status,'tie');assert.ok(rec.offerIds.includes('hold'));assert.ok(rec.offerIds.includes('abstract'));const action=decision.actions.find(item=>item.action.type==='replace'&&item.optionId==='abstract');assert.equal(action.moneyAfter,19);assert.equal(action.consequences.money.delta,-1);assert.equal(action.consequences.added[0].catalogId,'abstract_joker');assert.deepEqual(action.consequences.added[0].counters,{});assert.equal(action.consequences.removed[0].instanceId,'owned-riff');assert.equal(action.consequences.occupiedJokerSlots.after,5);
 await r.locator('#shop-advice-reasons > summary').click();assert.match(await r.locator('#shop-advice-reasons').innerText(),/generaci|crear/i);assert.match(await r.locator('#shop-advice-reasons').innerText(),/futur|hueco|espacio/i);assert.match(await r.locator('#shop-advice-sacrifice').innerText(),/\$1/);assert.match(await r.locator('#shop-advice-benefit').innerText(),/\+15/);await unchanged(r,before,count);await replacement.context.close();
 pass('selected-replacement-preserves-future-sacrifice-and-fresh-instance',{status:'tie',netCost:1,moneyAfter:19,physicalJokers:5,ownMult:15,counters:{},writes:0},{status:rec.status,netCost:-action.consequences.money.delta,moneyAfter:action.moneyAfter,physicalJokers:action.consequences.occupiedJokerSlots.after,counters:action.consequences.added[0].counters,writes:0});

 const mixed=await session(at('DEC02-04').state),m=mixed.page;before=await raw(m);count=await writes(m);await open(m);decision=await inspect(m);rec=decision.context.recommendation;
 assert.equal(rec.status,'conditional');assert.deepEqual(rec.offerIds,['scoring']);assert.match(rec.planReason,/primer comodín de puntuación/);assert.deepEqual(decision.context.comparisons,[]);
 await m.locator('#shop-advice-alternatives > summary').click();assert.match(await row(m,'income').innerText(),/4|Golden/);assert.equal((await record(m)).state.observed.money.value,20);await unchanged(m,before,count);await mixed.context.close();
 pass('first-scoring-rule-prioritizes-points-before-future-income',{status:'conditional',preferred:'scoring',moneyBefore:20,projectedBalances:[18,14],immediateIncome:0,writes:0},{status:rec.status,preferred:rec.offerIds,moneyBefore:20,projectedBalances:decision.context.options.filter(o=>o.id==='scoring'||o.id==='income').map(o=>o.moneyAfter),immediateIncome:0,writes:0});

 const prepared=await session(at('DEC02-01').state),c=prepared.page;before=await raw(c);count=await writes(c);await open(c);decision=await inspect(c);assert.deepEqual(decision.context.recommendation.offerIds,['summit']);assert.equal(decision.context.recommendation.status,'conditional');assert.equal(decision.context.options.find(o=>o.id==='summit').moneyAfter,15);assert.equal(decision.context.options.find(o=>o.id==='baron').fit.readiness,'unavailable');await unchanged(c,before,count);await prepared.context.close();
 const savings=await session(at('DEC02-02').state),v=savings.page;before=await raw(v);count=await writes(v);await open(v);decision=await inspect(v);assert.deepEqual(decision.context.recommendation.offerIds,['hold']);assert.equal(decision.context.options.find(o=>o.id==='seed').moneyAfter,10);assert.deepEqual([decision.context.options.find(o=>o.id==='seed').economics.interest.before,decision.context.options.find(o=>o.id==='seed').economics.interest.after],[4,2]);assert.match(await v.locator('#shop-advice-benefit').innerText(),/\$20/);assert.match(await v.locator('#shop-advice-benefit').innerText(),/\$10.*no aprovecha el tope/);await v.locator('#shop-advice-alternatives > summary').click();assert.match(await row(v,'seed').innerText(),/futur|inversión|saldo cre/i);await unchanged(v,before,count);await savings.context.close();
 pass('prepared-purchase-and-unused-interest-cap-keep-distinct-conditions',{prepared:'summit',summitBalance:15,save:'hold',seedBalance:10,conditionalInterest:[4,2],writes:0},{prepared:'summit',summitBalance:15,save:decision.context.recommendation.offerIds,seedBalance:10,conditionalInterest:[4,2],writes:0});

 // An unidentified edition makes the automatic price unknown. Merely omitting
 // a historical price no longer does: the base price can be calculated.
 // Unknown price and strict evidence do not enter the eligible comparison;
 // an unaffordable expensive alternative does not become a selected purchase.
 const missing=structuredClone(at('DEC02-05').state);missing.observed.shop.value.cardOffers[0].price={status:'unknown',reason:'Precio sin calcular: falta confirmar la edición.'};missing.observed.shop.value.cardOffers[0].edition={status:'unknown',reason:'Edición sin registrar.'};
 const limitation=await session(missing),l=limitation.page;before=await raw(l);count=await writes(l);decision=await inspect(l);assert.ok(!decision.context.recommendation.offerIds.includes('joker'));assert.equal(decision.context.options.find(o=>o.id==='joker').price,null);assert.deepEqual(decision.context.comparisons,[]);const strict=await inspect(l,{requireObserved:true});assert.equal(strict.context.recommendation.status,'abstain');assert.ok(strict.actions.every(action=>action.status==='pending_evidence'||action.status==='missing_data'));await unchanged(l,before,count);await limitation.context.close();
 const poor=structuredClone(at('DEC02-05').state);poor.observed.money=known(1);const illegal=await session(poor),il=illegal.page;before=await raw(il);count=await writes(il);decision=await inspect(il);assert.deepEqual(decision.context.recommendation.offerIds,['hold']);assert.deepEqual(decision.context.comparisons,[]);assert.ok(decision.actions.filter(action=>action.optionId!=='hold').every(action=>action.status==='illegal'));await unchanged(il,before,count);await illegal.context.close();
 pass('price-evidence-and-legality-gates-precede-preference',{unknownPrice:null,strict:'abstain',insufficientMoney:'hold',comparisonWithoutLegalData:false},{unknownPrice:null,strict:strict.context.recommendation.status,insufficientMoney:decision.context.recommendation.offerIds,comparisonWithoutLegalData:false});

 before=await raw(p);count=await writes(p);await p.locator('#money').fill('24');await p.locator('#money').press('Tab');await p.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).state.revision===1,key);let saved=await record(p);assert.equal(saved.state.observed.money.value,24);assert.equal(saved.history.length,1);assert.equal(saved.history[0].kind,'correction');assert.equal(saved.history[0].action,null);assert.equal(await writes(p),count+1);before=await raw(p);count=await writes(p);await open(p);decision=await inspect(p);assert.deepEqual(decision.context.recommendation.offerIds,['joker']);assert.equal(decision.context.options.find(o=>o.id==='joker').moneyAfter,22);assert.equal(decision.context.options.find(o=>o.id==='abstract').moneyAfter,20);await unchanged(p,before,count);await close(p);await reloadWorkspace(p);await ready(p);await go(p,'table');await shelf(p);await open(p);assert.equal(await raw(p),before);assert.equal(await writes(p),0);await close(p);
 pass('observed-balance-saves-once-consultation-and-reload-save-nothing',{observedBalance:24,revision:1,history:1,comparisonBalances:[22,20],consultationWrites:0},{observedBalance:saved.state.observed.money.value,revision:saved.state.revision,history:saved.history.length,comparisonBalances:[22,20],consultationWrites:0});

 const reader=await primary.context.newPage();observePage(reader);await openWorkspace(reader,new URL('#table',origin.href).href);await reader.waitForFunction(()=>document.querySelector('#ownership')?.textContent.includes('Modo lectura'));await go(reader,'table');await shelf(reader);before=await raw(reader);await open(reader);decision=await inspect(reader);assert.deepEqual(decision.context.recommendation.offerIds,['joker']);await reader.locator('#shop-advice-alternatives > summary').click();assert.equal(await writes(reader),0);assert.equal(await raw(reader),before);await reader.close();await primary.context.close();
 pass('reader-tab-can-compare-without-registering-actions',{readonly:true,preferred:'joker',writes:0},{readonly:true,preferred:decision.context.recommendation.offerIds,writes:0});

 const mobile=await session(at('DEC02-05').state,{width:390,height:844}),mobi=mobile.page;before=await raw(mobi);count=await writes(mobi);await open(mobi);assert.match(await mobi.locator('#shop-advice-benefit').innerText(),/\+4.*\$2.*\+3.*\$4/s);assert.equal(await mobi.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await mobi.screenshot({path:dir+'/mobile-comparison.png',fullPage:false});await unchanged(mobi,before,count);await close(mobi);await mobile.context.close();
 const mobilePartial=await session(at('DEC02-06').state,{width:390,height:844}),mp=mobilePartial.page;before=await raw(mp);count=await writes(mp);await open(mp);assert.match(await mp.locator('#shop-advice-scope').innerText(),/comparación parcial/i);assert.equal(await mp.locator('#shop-advice-pending').isVisible(),true);assert.equal(await mp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await mp.screenshot({path:dir+'/mobile-partial.png',fullPage:false});await unchanged(mp,before,count);await mobilePartial.context.close();
 pass('mobile390-comparison-and-partial-advice-remain-readable',{width:390,overflow:false,partialLimitationVisible:true,physicalAndroid:false},{width:390,overflow:false,partialLimitationVisible:true,physicalAndroid:false});
 assert.equal(report.cases.length,10);assert.deepEqual(report.pageErrors,[]);report.status='passed';await writeFile(dir+'/browser.json',JSON.stringify(report,null,2)+'\n');console.log('PASS DEC02 10 browser groups; synthetic contracts, not gameplay');
}catch(error){report.status='failed';report.error=error.stack||String(error);await writeFile(dir+'/browser.json',JSON.stringify(report,null,2)+'\n');if(lastPage&&!lastPage.isClosed())await lastPage.screenshot({path:dir+'/failed.png',fullPage:true}).catch(()=>{});throw error;}
finally{await browser?.close();server?.kill();}
