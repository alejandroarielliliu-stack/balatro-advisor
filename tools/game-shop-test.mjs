import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {createNewRun} from '../dist/src/run/start.js';
import {applyRunProgress} from '../dist/src/run/progress.js';
import {logicalBounds} from './ui-logical-bounds.mjs';

// Synthetic browser/recording checks, not a game observation or a physical phone test.
const port='4232',origin=process.env.GAME_SHOP_ORIGIN??`http://127.0.0.1:${port}/`;
const key='balatro-advisor.confirmed.v1',dir='docs/evidencia/game-shop';
await mkdir(dir,{recursive:true});
const report={date:new Date().toISOString(),origin,gameObservation:false,physicalAndroid:false,cases:[],pageErrors:[]};
const pass=id=>{report.cases.push({id,status:'passed'});console.log('PASS',id);};
const generated=createNewRun({runId:'game-shop-fixture',updatedAt:'2026-11-08T05:00:00Z',deckId:'red',profileConfirmed:true});
assert.equal(generated.ok,true);
const progress=(state,command)=>{const changed=applyRunProgress(state,command,{expectedRevision:state.revision,updatedAt:'2026-11-08T05:01:00Z',inventory:{unchanged:true}});assert.equal(changed.ok,true,JSON.stringify(changed.errors));return changed.value.state;};
const shopFixture=()=>{
 const state=progress(progress(structuredClone(generated.value),{type:'enter_round'}),{type:'record_cashout',amount:21,jokerUpdates:[]});
 return JSON.stringify({schemaVersion:'confirmed-2',initialState:state,state,history:[]});
};
const server=process.env.GAME_SHOP_ORIGIN?null:spawn(process.execPath,['dist/src/server.js'],{env:{...process.env,PORT:port},stdio:'pipe',windowsHide:true});
let browser,lastPage;
try{
 if(server)await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Game shop server timeout')),15000);server.stdout.on('data',chunk=>{if(String(chunk).includes('Balatro Advisor local')){clearTimeout(timer);resolve();}});server.on('error',reject);server.on('exit',()=>reject(Error('Game shop server stopped')));});
 browser=await chromium.launch({channel:'chrome',headless:true});
 const session=async(viewport={width:1280,height:600},saved=null,reducedMotion='reduce',touch=true)=>{
  const context=await browser.newContext({viewport,reducedMotion,hasTouch:touch,isMobile:touch});
  await context.addInitScript(({key,saved})=>{
   if(saved&&localStorage.getItem(key)===null)localStorage.setItem(key,saved);
   window.__gameShopFail=false;
   const write=Storage.prototype.setItem;
   Storage.prototype.setItem=function(k,v){if(k===key&&window.__gameShopFail)throw new DOMException('Synthetic game shop quota failure','QuotaExceededError');return write.call(this,k,v);};
  },{key,saved});
  const page=await context.newPage();lastPage=page;page.on('pageerror',error=>report.pageErrors.push(error.message));await page.goto(origin);
  await page.waitForFunction(()=>location.hash==='#menu'&&document.querySelector('#ownership')?.textContent.includes('Esta pestaña tiene'));
  return {context,page};
 };
 const raw=page=>page.evaluate(k=>localStorage.getItem(k),key),record=async page=>JSON.parse(await raw(page));
 const activeEditor=page=>page.locator('#shop-joker-detail:visible,#game-shop-editor:visible');
 const selectJoker=async(page,catalogId)=>{
  await page.locator('#shop-joker-picker').waitFor({state:'visible'});
  await page.locator('#shop-joker-search').fill(catalogId);
  await page.locator(`[data-shop-joker="${catalogId}"]`).click();
  await page.locator('#shop-joker-detail').waitFor({state:'visible'});
 };
 const modifier=async(page,kind,change)=>{
  await page.locator('#shop-joker-'+kind).click();await change();
  await page.locator('#shop-joker-apply-modifier').click();
 };
 const shopReady=async page=>{await page.waitForFunction(()=>document.body.dataset.view==='blind'&&document.querySelector('#blind-screen')?.dataset.mode==='shop');await page.locator('#game-shop').waitFor({state:'visible'});};
 const start=async page=>{await page.locator('#menu-play').click();await page.locator('#setup-deck-dots input[value="red"]').check();await page.locator('#setup-play').click();await page.waitForFunction(()=>document.body.dataset.view==='blind');};
 const continueRun=async page=>{await page.locator('#menu-play').click();await page.locator('#setup-tab-continue').click();await page.locator('#setup-play').click();await shopReady(page);};
 const enterCashout=async page=>{await page.locator('#blind-select-small').click();await page.locator('#round-cashout').waitFor({state:'visible'});};
 const shellBounds=page=>page.locator('.blind-sidebar,.blind-joker-tray,.blind-consumable-tray,#blind-deck').evaluateAll(elements=>elements.map(element=>{const r=element.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}));
 const advisorBounds=async page=>{
  for(const selector of ['.blind-advisor','.blind-advisor-avatar','.blind-speech'])assert.equal(await page.locator(selector).isVisible(),true,'Advisor remains visible: '+selector);
  assert.equal(await page.locator('.game-shop-sign,.blind-round-score,.blind-last-hand').count(),0,'The static advisor is not replaced by a shop sign or scoring HUD');
  return page.locator('.blind-advisor,.blind-advisor-avatar,.blind-speech').evaluateAll(logicalBounds);
 };
 const observe=async(page,kind,catalogId,price)=>{
  await page.locator(`[data-game-shop-kind="${kind}"][data-game-shop-empty="true"]`).first().click();
  if(kind==='joker')await selectJoker(page,catalogId);
  else {await page.locator('#game-shop-editor').waitFor({state:'visible'});await page.locator('#game-shop-catalog').selectOption(catalogId);}
  const editor=activeEditor(page);await editor.locator('#game-shop-price').fill(String(price));await editor.locator('#game-shop-save').click();await editor.waitFor({state:'hidden'});
  const shop=(await record(page)).state.observed.shop.value,list=kind==='joker'?shop.cardOffers:kind==='voucher'?shop.voucherOffers:shop.packOffers;
  const offer=list.find(offer=>offer.catalogId===catalogId);assert.ok(offer,'Observed '+kind+' is stored in the real shop snapshot');return offer.offerId;
 };
 const openOffer=async(page,id)=>{await page.locator(`[data-game-shop-offer="${id}"]`).click();await activeEditor(page).waitFor({state:'visible'});};
 const beginPurchase=async(page,id)=>{await openOffer(page,id);await activeEditor(page).locator('#game-shop-buy').click();await page.locator('#confirmation').waitFor({state:'visible'});};
 const confirmPurchase=async page=>{await page.locator('#performed').check();await page.locator('#dialog-accept').click();await page.locator('#confirmation').waitFor({state:'hidden'});};
 const geometry=async(page,viewport)=>{
  for(const selector of ['#game-shop-next','#game-shop-reroll','#game-shop-details','[data-game-shop-kind="joker"]','[data-game-shop-kind="voucher"]','[data-game-shop-kind="pack"]','#blind-run-info','#blind-deck']){
   const bounds=await page.locator(selector).first().boundingBox();assert.ok(bounds&&bounds.x>=-1&&bounds.y>=-1&&bounds.x+bounds.width<=viewport.width+1&&bounds.y+bounds.height<=viewport.height+1,selector+' clipped '+JSON.stringify({viewport,bounds}));
  }
  const height=await page.locator('#app-viewport').evaluate(element=>element.clientHeight),[sidebar,panel]=await page.locator('.blind-sidebar,#game-shop').evaluateAll(logicalBounds);
  assert.ok(Math.abs(sidebar.top)<=1&&Math.abs(sidebar.bottom-height)<=1,'Shop keeps the sidebar at both viewport edges');assert.ok(Math.abs(panel.bottom-height)<=2,'Shop panel continues to the viewport bottom');
  for(const selector of ['.blind-sidebar','#game-shop']){
   const color=await page.locator(selector).evaluate(element=>getComputedStyle(element).borderLeftColor),channels=color.match(/[\d.]+/g)?.map(Number)??[];
   assert.ok(channels[0]>channels[1]*1.2&&channels[0]>channels[2]*1.2,selector+' has the requested red edge: '+color);
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 };

 const desktop={width:1920,height:1200};
 const main=await session(desktop,null,'reduce',false),p=main.page;await start(p);
 await p.locator('.blind-stage[data-layout="desktop"]').waitFor();
 const referenceBox=async(selector,x,y,width,height)=>{
  const box=await p.locator(selector).boundingBox();
  for(const [key,expected] of Object.entries({x,y,width,height})){
   assert.ok(box&&Math.abs(box[key]-expected)<=4,selector+' '+key+' in the desktop reference: expected '+expected+', got '+box?.[key]);
  }
 };
 await referenceBox('.blind-joker-tray',505,100,876,228);
 await referenceBox('.blind-card-small',520,362,326,838);
 const initialAdvisor=await advisorBounds(p);await enterCashout(p);assert.deepEqual(await advisorBounds(p),initialAdvisor,'Selecting a blind does not move or replace the advisor');
 const beforeCashout=await record(p),stationary=await shellBounds(p);await p.locator('#round-cashout-amount').fill('3');await p.locator('#round-cashout-submit').click();await shopReady(p);
 const entered=await record(p);assert.equal(entered.state.phase,'shop');assert.equal(entered.state.observed.money.value,7);assert.equal(entered.state.revision,beforeCashout.state.revision+1);assert.equal(entered.history.length,beforeCashout.history.length+1);assert.equal(entered.history.at(-1).progress.command.type,'record_cashout');
 assert.deepEqual(await shellBounds(p),stationary,'Opening the shop retains sidebar, tray and deck positions');assert.equal(await p.locator('#round-cashout').isVisible(),false);assert.equal(await p.locator('#game-shop').evaluate(element=>getComputedStyle(element).animationName),'none','Reduced motion opens the shop without the rise animation');
 assert.deepEqual(await advisorBounds(p),initialAdvisor,'The advisor keeps the same position and dimensions in selection, cashout and shop');
 const initialShop=entered.state.observed.shop;
 if(initialShop.status==='known'){assert.equal(initialShop.value.cardOffers.length,0);assert.equal((initialShop.value.voucherOffers??[]).length,0);assert.equal((initialShop.value.packOffers??[]).length,0);}
 assert.equal(await p.locator('[data-game-shop-empty="false"]').count(),0,'The reference screenshot does not become invented shop offers');
 assert.ok(await p.locator('[data-game-shop-kind="joker"][data-game-shop-empty="true"]').count()>=2);assert.ok(await p.locator('[data-game-shop-kind="voucher"][data-game-shop-empty="true"]').count()>=1);assert.ok(await p.locator('[data-game-shop-kind="pack"][data-game-shop-empty="true"]').count()>=2);
 assert.equal(await p.locator('#game-shop').getAttribute('aria-label'),'Tienda');await geometry(p,desktop);
 await referenceBox('#game-shop',536,414,1032,786);
 await referenceBox('.game-shop-card-well',827,437,716,300);
 await referenceBox('.game-shop-pack-well',1071,789,456,314);
 await p.screenshot({path:dir+'/desktop-empty.png'});
 pass('cashout-opens-empty-shop-on-same-table-with-one-payment-and-red-edges');

 const beforeBrowse=await raw(p);await p.locator('[data-game-shop-kind="joker"][data-game-shop-empty="true"]').first().click();await p.locator('#shop-joker-picker').waitFor({state:'visible'});
 assert.equal(await p.locator('[data-shop-joker]').count(),15,'Collection-style gallery has fifteen Jokers per page');
 await p.screenshot({path:dir+'/joker-gallery-desktop.png'});
 assert.match(await p.locator('#shop-joker-page').innerText(),/1\s*\/\s*10/);
 await p.locator('#shop-joker-next').click();assert.match(await p.locator('#shop-joker-page').innerText(),/2\s*\/\s*10/);
 await p.locator('#shop-joker-prev').click();await selectJoker(p,'joker');
 assert.equal(await activeEditor(p).locator('#game-shop-price').inputValue(),'','A new selection has no assumed screenshot price');
 assert.equal(await p.locator('#shop-joker-counters').isVisible(),false,'A static Joker has no counter pencil');
 await activeEditor(p).locator('#game-shop-price').fill('2');await activeEditor(p).locator('#game-shop-close').click();assert.equal(await raw(p),beforeBrowse,'Browsing or canceling an offer does not write');
 pass('collection-style-joker-gallery-and-card-detail-cancel-without-writing');
 const jokerId=await observe(p,'joker','joker',2),voucherId=await observe(p,'voucher','v_seed_money',10),packId=await observe(p,'pack','buffoon-normal',4);
 const shelf=await record(p),shopId=shelf.state.observed.shop.value.shopId;assert.equal(shelf.state.observed.money.value,7,'Transcribing three offers spends nothing');assert.equal(shelf.state.observed.jokers.value.length,0);assert.equal(shelf.state.observed.shop.value.cardOffers[0].price.value,2);assert.equal(shelf.state.observed.shop.value.voucherOffers[0].price.value,10);assert.equal(shelf.state.observed.shop.value.packOffers[0].price.value,4);await p.screenshot({path:dir+'/desktop-observed.png'});
 pass('joker-voucher-and-pack-share-real-shop-snapshot-without-acquisition');
 await openOffer(p,jokerId);await modifier(p,'stickers',()=>p.locator('.game-shop-stickers input[value="unknown"]').check());await activeEditor(p).locator('#game-shop-save').click();await p.locator('#shop-joker-detail').waitFor({state:'hidden'});assert.equal((await record(p)).state.observed.shop.value.cardOffers[0].stickers.status,'unknown');
 await openOffer(p,jokerId);await modifier(p,'stickers',()=>p.locator('.game-shop-stickers input[value="unknown"]').uncheck());await activeEditor(p).locator('#game-shop-save').click();await p.locator('#shop-joker-detail').waitFor({state:'hidden'});assert.deepEqual((await record(p)).state.observed.shop.value.cardOffers[0].stickers.value,[]);assert.equal((await record(p)).state.observed.shop.value.packOffers[0].offerId,packId);

 const purchaseRaw=await raw(p);await beginPurchase(p,jokerId);assert.equal(await raw(p),purchaseRaw);await p.locator('#dialog-accept').click();assert.equal(await raw(p),purchaseRaw,'Purchases still require the performed-action confirmation');await p.locator('#dialog-cancel').click();
 await beginPurchase(p,jokerId);await confirmPurchase(p);await shopReady(p);const bought=await record(p);assert.equal(bought.state.observed.money.value,5);assert.equal(bought.state.observed.jokers.value.length,1);assert.equal(bought.state.observed.jokers.value[0].catalogId,'joker');assert.equal(bought.state.observed.shop.value.cardOffers.length,0);assert.equal(bought.history.at(-1).action.type,'buy');
 pass('existing-confirmation-records-one-real-joker-purchase');

 await p.locator('[data-game-shop-kind="joker"][data-game-shop-empty="true"]').first().click();await selectJoker(p,'green_joker');await activeEditor(p).locator('#game-shop-price').fill('3');const beforeFailure=await raw(p);
 await p.evaluate(()=>window.__gameShopFail=true);await activeEditor(p).locator('#game-shop-save').click();assert.equal(await raw(p),beforeFailure);assert.equal(await p.locator('#shop-joker-detail').isVisible(),true);assert.match(await activeEditor(p).innerText(),/Green Joker|Comodín verde/i);assert.equal(await activeEditor(p).locator('#game-shop-price').inputValue(),'3');
 assert.match(await activeEditor(p).innerText(),/guardar|almacen|espacio|fall/i);
 await p.evaluate(()=>window.__gameShopFail=false);await activeEditor(p).locator('#game-shop-save').click();await p.locator('#shop-joker-detail').waitFor({state:'hidden'});assert.equal((await record(p)).state.observed.shop.value.cardOffers[0].catalogId,'green_joker');
 pass('offer-storage-failure-keeps-record-and-editor-draft-for-retry');

 const beforeReroll=await raw(p),rerollRecord=await record(p);await p.locator('#game-shop-reroll').click();await p.locator('#confirmation').waitFor({state:'visible'});assert.match(await p.locator('#dialog-title').innerText(),/renovaci/i);assert.equal(await raw(p),beforeReroll);await p.locator('#dialog-cancel').click();assert.equal(await raw(p),beforeReroll);
 await p.locator('#game-shop-reroll').click();await p.locator('#game-shop-reroll-done').check();await p.locator('#game-shop-reroll-money').fill('3');await p.locator('#game-shop-reroll-cost').fill('6');await p.locator('#dialog-accept').click();await p.locator('#confirmation').waitFor({state:'hidden'});
 const rerolled=await record(p);assert.equal(rerolled.state.observed.money.value,3,'Reroll records the literal observed balance');assert.equal(rerolled.state.observed.shop.value.shopId,shopId);assert.equal(rerolled.state.observed.shop.value.cardOffers.length,0,'Untranscribed new joker offers are not generated');assert.deepEqual(rerolled.state.observed.shop.value.voucherOffers,rerollRecord.state.observed.shop.value.voucherOffers);assert.deepEqual(rerolled.state.observed.shop.value.packOffers,rerollRecord.state.observed.shop.value.packOffers);assert.equal(rerolled.state.observed.jokerContext.value.rerollCost.value,6);
 const reloadRaw=await raw(p);await p.reload();await p.waitForFunction(()=>location.hash==='#menu');assert.equal(await raw(p),reloadRaw);await continueRun(p);assert.equal(await raw(p),reloadRaw,'Continuing a saved shop is read-only');assert.equal((await record(p)).state.observed.money.value,3);
 pass('reroll-is-an-explicit-observation-and-shop-reload-does-not-pay-again');

 const beforeNext=await record(p);await p.locator('#game-shop-next').click();await p.waitForFunction(()=>document.body.dataset.view==='blind'&&document.querySelector('#blind-screen')?.dataset.mode==='select');const next=await record(p);assert.equal(next.state.phase,'blind_select');assert.equal(next.state.observed.nextBlind.value.kind,'big');assert.equal(next.state.observed.money.value,3);assert.equal(next.state.revision,beforeNext.state.revision+1);assert.equal(next.history.at(-1).progress.command.type,'leave_shop');assert.equal(await p.locator('.blind-card').count(),3);assert.equal(await p.locator('#blind-select-big').isEnabled(),true);assert.equal(await p.locator('#game-shop').isVisible(),false);
 assert.equal(await p.locator('.blind-cards').evaluate(element=>getComputedStyle(element).animationName),'none','Reduced motion makes the next ciegas available without a rise');assert.equal(await p.locator('#game-shop').evaluate(element=>getComputedStyle(element).animationName),'none');
 pass('next-round-reuses-recorded-progression-without-repeating-payout');await main.context.close();

 const comparedSave=JSON.parse(shopFixture());
 for(const state of [comparedSave.state,comparedSave.initialState])state.observed.shop={status:'known',source:'manual',value:{shopId:'compared-offers',cardOffers:[],ignoredOtherOffers:[]}};
 const compared=await session(undefined,JSON.stringify(comparedSave)),q=compared.page;await continueRun(q);
 const plain=await observe(q,'joker','joker',2);await observe(q,'joker','abstract_joker',4);
 const tile=q.locator(`[data-game-shop-offer="${plain}"]`);
 assert.equal(await tile.getAttribute('data-offer-preference'),'compared');
 await observe(q,'pack','buffoon-normal',4);
 assert.equal(await tile.getAttribute('data-offer-preference'),'conditional');
 assert.equal(await q.locator('[data-game-shop-kind="pack"][data-offer-preference]').count(),0);
 const beforeReason=await raw(q);await openOffer(q,plain);assert.match(await activeEditor(q).innerText(),/\+4\s+(?:mult|multi)/i,'The card detail shows the catalog effect');
 assert.equal(await raw(q),beforeReason);await activeEditor(q).locator('#game-shop-price').fill('');await activeEditor(q).locator('#game-shop-save').click();await q.locator('#shop-joker-detail').waitFor({state:'hidden'});
 assert.equal(await q.locator('[data-offer-preference]').count(),0,'Missing price removes the comparison');
 pass('shop-mark-belongs-to-a-supported-comparison-and-expires-with-the-price');await compared.context.close();

 // The normal cashout/continue path begins with an unobserved shop, including the
 // legacy annotation for offers still pending. The plan can confirm transcription.
 const guide=await session(desktop,shopFixture(),'reduce',false),g=guide.page;await continueRun(g);
 const basic=await observe(g,'joker','joker',2),golden=await observe(g,'joker','golden_joker',6);
 const plan=async(page,need,reserve='',quote='5',complete=true)=>{
  await page.locator('#game-shop-plan').click();await page.locator('#shop-plan-dialog').waitFor({state:'visible'});
  await page.locator('#shop-plan-need').selectOption(need);
  if(['score','economy'].includes(need))await page.locator('#shop-plan-reserve').fill(reserve);
  await page.locator('#game-shop-quoted-cost').fill(quote);
  await page.locator('#shop-plan-complete').setChecked(complete);
  await page.locator('#shop-plan-apply').click();await page.locator('#shop-plan-dialog').waitFor({state:'hidden'});
 };
 await plan(g,'score');
 assert.match(await g.locator('.blind-speech strong').innerText(),/Compra Joker/);
 assert.equal(await g.locator(`[data-game-shop-offer="${basic}"]`).getAttribute('data-offer-preference'),'compared');
 const advised=await raw(g);await plan(g,'economy');
 assert.match(await g.locator('.blind-speech strong').innerText(),/Compra Golden/);
 assert.equal(await g.locator(`[data-game-shop-offer="${golden}"]`).getAttribute('data-offer-preference'),'compared');
 assert.equal(await raw(g),advised,'Changing the buying goal consults the same record');
 await plan(g,'save');
 assert.match(await g.locator('.blind-speech strong').innerText(),/Ahorra/);
 assert.equal(await g.locator('[data-offer-preference]').count(),0);
 assert.equal(await g.locator('#game-shop-next').getAttribute('data-advised-action'),'');
 assert.equal(await raw(g),advised,'Advising to save does not leave the shop or spend');
 await g.screenshot({path:dir+'/guide-save-desktop.png'});await guide.context.close();
 pass('guide-picks-points-income-or-saving-from-normal-recorded-shop');

 const search=await session(undefined,shopFixture()),h=search.page;await continueRun(h);
 await observe(h,'joker','steel_joker',7);await observe(h,'joker','credit_card',1);
 await plan(h,'score','8','5');
 assert.match(await h.locator('.blind-speech strong').innerText(),/Renueva/);
 assert.equal(await h.locator('#game-shop-reroll').getAttribute('data-advised-action'),'');
 const budget=await raw(h),budgetState=await record(h);
 assert.equal(budgetState.state.observed.money.value,25);assert.equal(budgetState.state.observed.shop.value.cardOffers.length,2);
 assert.equal(budgetState.state.observed.jokerContext.value.visibleRerollCost.value,5);
 await plan(h,'score','24','5');assert.match(await h.locator('.blind-speech strong').innerText(),/Ahorra/);
 assert.equal(await raw(h),budget,'Only the search budget changed');
 await h.locator('#game-shop-details').click();await h.locator('#shop-recommendation').waitFor({state:'visible'});
 assert.match(await h.locator('#shop-recommendation').innerText(),/Guarda/);
 await h.locator('#store-shop-plan').click();await h.locator('#shop-plan-reserve').fill('8');await h.locator('#shop-plan-apply').click();
 await h.locator('#shop-recommendation').click();assert.match(await h.locator('#shop-advice-summary').innerText(),/Renueva una vez/);
 await h.locator('#shop-advice-dialog').getByRole('button',{name:'Cerrar',exact:true}).click();
 await h.evaluate(()=>location.hash='blind');await shopReady(h);
 assert.match(await h.locator('.blind-speech strong').innerText(),/Renueva/);
 assert.equal(await raw(h),budget,'Scene and detail consult the same plan and saved balance');
 await plan(h,'score','8','0');assert.equal((await record(h)).state.observed.money.value,25);
 assert.match(await h.locator('#game-shop-reroll').innerText(),/\$0/);
 await h.screenshot({path:dir+'/guide-search-mobile.png'});await search.context.close();
 pass('guide-renews-with-purchase-budget-and-shares-plan-with-table-without-spending');

 const customized=await session(desktop,shopFixture(),'reduce',false),c=customized.page;await continueRun(c);
 await c.locator('[data-game-shop-kind="joker"][data-game-shop-empty="true"]').first().click();
 await selectJoker(c,'red_card');await activeEditor(c).locator('#game-shop-price').fill('10');
 const beforeCustomize=await raw(c);
 assert.equal(await c.locator('#shop-joker-counters').isVisible(),true,'A changing Joker exposes its pencil');
 await modifier(c,'edition',()=>c.locator('#game-shop-edition').selectOption('negative'));
 await modifier(c,'stickers',()=>c.locator('.game-shop-stickers input[value="eternal"]').check());
 await modifier(c,'counters',()=>c.locator('[data-counter="mult"]').fill('9'));
 assert.equal(await raw(c),beforeCustomize,'Editing modifiers stays a local offer draft');
 await c.screenshot({path:dir+'/joker-detail-desktop.png'});
 await activeEditor(c).locator('#game-shop-save').click();await c.locator('#shop-joker-detail').waitFor({state:'hidden'});
 let customizedState=await record(c),redOffer=customizedState.state.observed.shop.value.cardOffers.find(item=>item.catalogId==='red_card');
 assert.ok(redOffer);assert.equal(redOffer.edition.value,'negative');assert.deepEqual(redOffer.stickers.value,['eternal']);assert.equal(redOffer.counters.mult.value,9);
 assert.equal(customizedState.state.observed.money.value,25);assert.equal(customizedState.state.observed.jokers.value.length,0);
 const customizedRaw=await raw(c);await c.reload();await c.waitForFunction(()=>location.hash==='#menu');await continueRun(c);assert.equal(await raw(c),customizedRaw);
 await openOffer(c,redOffer.offerId);await c.locator('#shop-joker-counters').click();assert.equal(await c.locator('[data-counter="mult"]').inputValue(),'9');await c.locator('#shop-joker-apply-modifier').click();
 await activeEditor(c).locator('#game-shop-close').click();assert.equal(await raw(c),customizedRaw);
 const reader=await customized.context.newPage();reader.on('pageerror',error=>report.pageErrors.push(error.message));await reader.goto(origin);
 await reader.waitForFunction(()=>location.hash==='#menu'&&document.querySelector('#ownership')?.textContent.includes('Modo lectura'));
 await continueRun(reader);await openOffer(reader,redOffer.offerId);
 for(const id of ['game-shop-save','game-shop-buy','game-shop-remove'])assert.equal(await activeEditor(reader).locator('#'+id).isDisabled(),true,'Reader cannot '+id);
 assert.equal(await raw(reader),customizedRaw);await activeEditor(reader).locator('#game-shop-close').click();await reader.close();
 await openOffer(c,redOffer.offerId);await activeEditor(c).locator('#game-shop-price').fill('5');
 await modifier(c,'edition',()=>c.locator('#game-shop-edition').selectOption('base'));
 await modifier(c,'stickers',()=>c.locator('.game-shop-stickers input[value="eternal"]').uncheck());
 await activeEditor(c).locator('#game-shop-save').click();await c.locator('#shop-joker-detail').waitFor({state:'hidden'});
 await beginPurchase(c,redOffer.offerId);await confirmPurchase(c);
 customizedState=await record(c);assert.equal(customizedState.state.observed.money.value,20);
 assert.equal(customizedState.state.observed.jokers.value[0].counters.mult.value,9,'The acquired copy keeps the observed offer value');
 await customized.context.close();pass('joker-modifiers-and-observed-counter-survive-reload-and-purchase-with-reader-protection');

 const outdated=await session(undefined,shopFixture()),o=outdated.page;await continueRun(o);
 const staleOffer=await observe(o,'joker','joker',2);await openOffer(o,staleOffer);await activeEditor(o).locator('#game-shop-price').fill('3');
 await o.evaluate(async()=>{
  const {createConfirmedStore,analysisBinding}=await import(new URL('dist/src/storage/confirmed-store.js',location.href).href);
  const store=createConfirmedStore(()=>localStorage),loaded=store.load();if(!loaded.ok||!loaded.value)throw Error('Missing fixture');
  const result=store.correct({confirmationId:'other-tab-correction',confirmed:true,expected:analysisBinding(loaded.value.state),updatedAt:'2026-11-11T13:00:00Z',patch:{money:{status:'known',source:'manual',value:24}},reason:'Observed balance corrected by another writer.'});
  if(!result.ok)throw Error(JSON.stringify(result.errors));
 });
 const corrected=await raw(o);await activeEditor(o).locator('#game-shop-save').click();
 assert.equal(await raw(o),corrected,'A stale card draft cannot replace a newer confirmed record');
 assert.equal((await record(o)).state.observed.shop.value.cardOffers.find(item=>item.offerId===staleOffer).price.value,2);
 await outdated.context.close();pass('stale-joker-detail-keeps-newer-record-and-original-offer');

 const purchases=await session(undefined,shopFixture()),v=purchases.page;await continueRun(v);const paidVoucher=await observe(v,'voucher','v_seed_money',10);await beginPurchase(v,paidVoucher);await confirmPurchase(v);await shopReady(v);assert.equal((await record(v)).state.observed.money.value,15);assert.ok((await record(v)).state.observed.outOfScope.value.vouchers.includes('v_seed_money'));
 const paidPack=await observe(v,'pack','buffoon-normal',4);await beginPurchase(v,paidPack);await confirmPurchase(v);const opened=await record(v);assert.equal(opened.state.observed.money.value,11);assert.equal(opened.state.phase,'open_pack');assert.equal(opened.state.observed.jokers.value.length,0,'Buying a closed pack does not invent its contents');
 await v.waitForFunction(()=>location.hash==='#pack'&&document.activeElement?.id==='pack-panel');const beforeResume=await raw(v);
 await v.reload();await v.locator('#menu-play').click();await v.locator('#setup-tab-continue').click();await v.locator('#setup-play').click();
 await v.waitForFunction(()=>location.hash==='#pack');assert.equal(await raw(v),beforeResume);
 await v.locator('#pack-skip').click();await v.locator('#performed').check();await v.locator('#dialog-accept').click();await shopReady(v);
 assert.equal(await v.evaluate(()=>location.hash),'#blind');assert.equal((await record(v)).state.observed.money.value,11);
 pass('voucher-and-pack-purchases-use-existing-confirmations-and-pack-flow');await purchases.context.close();

 const animated=await session(undefined,null,'no-preference'),a=animated.page;await start(a);await enterCashout(a);
 await a.locator('.blind-cards,#round-cashout').evaluateAll(async elements=>Promise.all(elements.flatMap(element=>element.getAnimations()).map(animation=>animation.finished.catch(()=>{}))));const beforeMotion=await shellBounds(a);
 await a.evaluate(()=>{window.__gameShopMotion=[];document.addEventListener('animationstart',event=>{if(!['round-cashout','game-shop'].includes(event.target.id))return;const animation=event.target.getAnimations().find(item=>item.animationName===event.animationName);if(!animation)return;animation.pause();window.__gameShopMotion.push(event.target.id);});});
 await a.locator('#round-cashout-amount').fill('3');await a.locator('#round-cashout-submit').click();await shopReady(a);await a.waitForFunction(()=>window.__gameShopMotion.includes('round-cashout')&&window.__gameShopMotion.includes('game-shop'));
 const directions=await a.locator('#round-cashout,#game-shop').evaluateAll(elements=>elements.map(element=>{const animation=element.getAnimations()[0],duration=Number(animation.effect.getTiming().duration);animation.currentTime=duration*.25;const first=new DOMMatrix(getComputedStyle(element).transform).m42;animation.currentTime=duration*.75;const last=new DOMMatrix(getComputedStyle(element).transform).m42;return {id:element.id,first,last};}));
 assert.ok(directions.find(item=>item.id==='round-cashout').last>directions.find(item=>item.id==='round-cashout').first,'Cashout moves down');assert.ok(directions.find(item=>item.id==='game-shop').last<directions.find(item=>item.id==='game-shop').first,'Shop rises');assert.deepEqual(await shellBounds(a),beforeMotion,'Only panels move; sidebar, trays and deck remain fixed');await a.screenshot({path:dir+'/transition.png'});
 await a.locator('#round-cashout,#game-shop').evaluateAll(elements=>elements.forEach(element=>element.getAnimations().forEach(animation=>animation.finish())));await a.locator('#round-cashout').waitFor({state:'hidden'});assert.equal(await a.locator('#game-shop').isVisible(),true);
 const beforeShopExit=await record(a),beforeExitShell=await shellBounds(a),beforeExitAdvisor=await advisorBounds(a);
 await a.evaluate(()=>{window.__gameShopExit=[];document.addEventListener('animationstart',event=>{if(!['game-shop-drop','game-blinds-rise'].includes(event.animationName))return;const animation=event.target.getAnimations().find(item=>item.animationName===event.animationName);if(!animation)return;animation.pause();window.__gameShopExit.push(event.animationName);});});
 await a.locator('#game-shop-next').evaluate(button=>{button.click();button.click();});
 await a.waitForFunction(()=>window.__gameShopExit.includes('game-shop-drop')&&window.__gameShopExit.includes('game-blinds-rise'));
 const exitDirections=await a.locator('#game-shop,.blind-cards').evaluateAll(elements=>elements.map(element=>{const name=element.id==='game-shop'?'game-shop-drop':'game-blinds-rise',animation=element.getAnimations().find(item=>item.animationName===name),duration=Number(animation.effect.getTiming().duration);animation.currentTime=duration*.25;const first=new DOMMatrix(getComputedStyle(element).transform).m42;animation.currentTime=duration*.75;const last=new DOMMatrix(getComputedStyle(element).transform).m42;return {name,first,last};}));
 assert.ok(exitDirections.find(item=>item.name==='game-shop-drop').last>exitDirections.find(item=>item.name==='game-shop-drop').first,'Leaving the shop moves it down');assert.ok(exitDirections.find(item=>item.name==='game-blinds-rise').last<exitDirections.find(item=>item.name==='game-blinds-rise').first,'The next blind selection rises from below');
 assert.deepEqual(await shellBounds(a),beforeExitShell,'The exit animation does not move the table shell');assert.deepEqual(await advisorBounds(a),beforeExitAdvisor,'The advisor stays fixed while shop and ciegas move');
 const leaving=await record(a);assert.equal(leaving.state.phase,'blind_select');assert.equal(leaving.state.observed.money.value,beforeShopExit.state.observed.money.value,'Going to the next round does not spend or collect money');assert.equal(leaving.state.revision,beforeShopExit.state.revision+1);assert.equal(leaving.history.length,beforeShopExit.history.length+1,'A double click leaves the shop only once');assert.equal(leaving.history.at(-1).progress.command.type,'leave_shop');
 await a.screenshot({path:dir+'/shop-to-blinds.png'});
 await a.locator('#game-shop,.blind-cards').evaluateAll(elements=>elements.forEach(element=>element.getAnimations().filter(animation=>['game-shop-drop','game-blinds-rise'].includes(animation.animationName)).forEach(animation=>animation.finish())));
 await a.locator('#game-shop').waitFor({state:'hidden'});assert.equal(await a.locator('#game-shop').evaluate(element=>element.hidden||element.inert||getComputedStyle(element).pointerEvents==='none'),true,'The departed shop no longer accepts input');assert.equal(await a.locator('.blind-cards').isVisible(),true);assert.equal(await a.locator('#blind-select-big').isEnabled(),true);assert.equal(await a.locator('#blind-select-big').isVisible(),true);await animated.context.close();
 for(const viewport of [{width:844,height:390},{width:390,height:844},{width:568,height:320}]){
  const mobile=await session(viewport,shopFixture()),m=mobile.page;await continueRun(m);await geometry(m,viewport);await m.screenshot({path:`${dir}/mobile-${viewport.width}x${viewport.height}.png`});
  const beforePicker=await raw(m);await m.locator('[data-game-shop-kind="joker"][data-game-shop-empty="true"]').first().click();await m.locator('#shop-joker-picker').waitFor({state:'visible'});
  assert.equal(await m.getByRole('dialog',{name:'Comodines de la tienda',exact:true}).isVisible(),true);
  assert.equal(await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await selectJoker(m,'red_card');await m.locator('#shop-joker-counters').click();
  assert.equal(await m.locator('#shop-joker-detail').evaluate(element=>element.scrollWidth<=element.clientWidth+1),true,'Card detail does not overflow horizontally');
  await m.screenshot({path:`${dir}/joker-detail-${viewport.width}x${viewport.height}.png`});
  await m.locator('#shop-joker-apply-modifier').click();await activeEditor(m).locator('#game-shop-close').click();
  assert.equal(await raw(m),beforePicker,'Mobile gallery and detail consultation do not write');await mobile.context.close();
 }
 pass('panels-transition-in-opposite-directions-with-stationary-shell-and-mobile-layout');
 assert.deepEqual(report.pageErrors,[]);report.status='passed';await writeFile(dir+'/report.json',JSON.stringify(report,null,2));console.log('PASS game shop: '+report.cases.length+' groups');
}catch(error){report.status='failed';report.error=error.stack||String(error);await writeFile(dir+'/report.json',JSON.stringify(report,null,2));if(lastPage&&!lastPage.isClosed())await lastPage.screenshot({path:dir+'/failed.png'}).catch(()=>{});throw error;}
finally{await browser?.close();server?.kill();}
