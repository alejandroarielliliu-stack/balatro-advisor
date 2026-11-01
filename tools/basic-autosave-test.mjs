import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createNewRun} from '../dist/src/run/start.js';

// Synthetic observation/persistence contracts, not a Balatro playthrough or a
// strategic oracle. Literal edits must change only the observed fields supplied.
const port='4217',remote=process.env.AUTOSAVE_BASE_URL;
const origin=new URL(remote??'http://127.0.0.1:'+port+'/');if(!origin.pathname.endsWith('/'))origin.pathname+='/';
const key='balatro-advisor.confirmed.v1',dir='docs/evidencia/ux01b';await mkdir(dir,{recursive:true});
const known=value=>({status:'known',source:'manual',value});
const unknown=reason=>({status:'unknown',reason});
const owned=(catalogId,instanceId,sellValue,counters={})=>({catalogId,instanceId,sellValue:known(sellValue),edition:known('base'),stickers:known([]),counters});
function fixture({unknownEdition=false}={}){
 const result=createNewRun({runId:'synthetic-basic-autosave',updatedAt:'2026-10-28T12:00:00Z',deckId:'blue',profileConfirmed:true});assert.equal(result.ok,true);
 const state=result.value;state.phase='shop';state.phaseData={origin:known({ante:1,kind:'small'})};state.observed.money=known(25);
 state.observed.lastCleared=known({ante:1,kind:'small'});state.observed.nextBlind=known({ante:1,kind:'big',bossId:known('none'),target:known(450),reward:known(4)});
 const basic=owned('joker','owned-basic',1);if(unknownEdition){basic.edition=unknown('Not observed; do not normalize to Base');basic.counters.extraSell=known(17);}
 state.observed.jokers=known([owned('green_joker','owned-green',2,{greenMult:known(6)}),basic]);
 state.observed.shop=known({shopId:'autosave-visible',cardOffers:[{offerId:'visible-joker',catalogId:'abstract_joker',label:'Abstract Joker',kind:'joker',price:known(4),edition:known('base'),stickers:known([])}],voucherOffers:[],packOffers:[],ignoredOtherOffers:[]});
 const context=state.observed.jokerContext.value;context.tarotsUsed=known(9);context.handCounts={pair:known(3)};context.consumables=known([{instanceId:'held-fool',catalogId:'c_fool',kind:'tarot',edition:'base',sellValue:1}]);context.tags=known(['observed-context-tag']);
 state.assumptions.cashflow.assumeRoundWon=true;state.assumptions.cashflow.handsUsedByRound=[1];
 return {schemaVersion:'confirmed-2',initialState:structuredClone(state),state,history:[]};
}
const modules=[
 'dist/src/ui/app.js','dist/src/ui/workspace.js','dist/src/ui/vouchers.js','dist/src/ui/joker-counters.js','dist/src/ui/joker-drag.js','dist/src/ui/writer.js',
 'dist/src/ui/storefront.js','dist/src/ui/shop-advice-summary.js','dist/src/state/basic-observations.js','dist/src/state/model.js','dist/src/state/validation.js',
 'dist/src/storage/confirmed-store.js','dist/src/storage/confirmed-record.js','dist/src/storage/shop-session.js','dist/src/state/observed-details.js',
 'dist/src/advisor/decision.js','dist/src/advisor/shop-context.js','dist/src/rules/shop.js'
];
const report={date:new Date().toISOString(),mode:remote?'public':'local',url:origin.href,commit:process.env.AUTOSAVE_COMMIT??null,workflow:process.env.AUTOSAVE_WORKFLOW??null,
 environment:'Chrome temporary isolated profiles; desktop and 390px mobile emulation',gameObservation:false,physicalAndroid:false,
 oracle:'Literal observed edits, field preservation, revision/history and read-only contracts. No projected outcomes are copied to the real run.',
 criticalModules:modules.length,hashes:[],cases:[],pageErrors:[]};
const pass=(id,expected,observed)=>{report.cases.push({id,expected,observed,status:'passed'});console.log('PASS',id);};
const server=remote?null:spawn(process.execPath,['dist/src/server.js'],{env:{...process.env,PORT:port},stdio:'pipe',windowsHide:true});let browser,lastPage;
try{
 if(server)await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Basic autosave server timeout')),15000);server.stdout.on('data',data=>{if(String(data).includes('Balatro Advisor local')){clearTimeout(timer);resolve();}});server.on('error',error=>{clearTimeout(timer);reject(error);});server.on('exit',()=>{clearTimeout(timer);reject(Error('Basic autosave server stopped'));});});
 if(remote)for(const file of ['index.html',...modules,'web/mesa.css']){const url=new URL(file,origin);url.searchParams.set('autosave',String(Date.now()));const response=await fetch(url);assert.equal(response.status,200,file);const bytes=Buffer.from(await response.arrayBuffer()),local=await readFile('out/'+file),hash=b=>createHash('sha256').update(b).digest('hex');assert.equal(hash(bytes),hash(local),'Public artifact differs from out/'+file);report.hashes.push({file,sha256:hash(bytes)});}
 browser=await chromium.launch({channel:'chrome',headless:true});
 const raw=page=>page.evaluate(k=>localStorage.getItem(k),key),record=async page=>JSON.parse(await raw(page)),writes=page=>page.evaluate(()=>window.__basicWrites);
 const go=(page,screen)=>page.locator(`[data-screen="${screen}"]`).click();
 const watch=page=>{lastPage=page;page.on('pageerror',error=>report.pageErrors.push(error.message));};
 const ready=page=>page.waitForFunction(()=>document.querySelector('#ownership')?.textContent.includes('Esta pestaña tiene'));
 const shelf=page=>page.waitForFunction(()=>document.querySelectorAll('.bay-mini').length===150&&!document.querySelector('.candidate-pending'));
 const session=async(input=fixture(),viewport={width:1440,height:1000})=>{
  const context=await browser.newContext({viewport});await context.addInitScript(storageKey=>{window.__basicWrites=0;window.__basicFailWrite=false;window.__basicNativeSet=Storage.prototype.setItem;Storage.prototype.setItem=function(name,value){if(name===storageKey){if(window.__basicFailWrite)throw new DOMException('Synthetic autosave quota failure','QuotaExceededError');window.__basicWrites++;}return window.__basicNativeSet.call(this,name,value);};},key);
  const page=await context.newPage();watch(page);await page.goto(origin.href);await ready(page);await go(page,'archive');await page.locator('#import-file').setInputFiles({name:'synthetic-autosave.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(input))});await page.locator('#dialog-accept').click();await page.locator('#confirmation').waitFor({state:'hidden'});await go(page,'table');await shelf(page);return {context,page};
 };
 const revision=async(page,expected)=>{await page.waitForFunction(({k,expected})=>JSON.parse(localStorage.getItem(k)).state.revision===expected,{k:key,expected});return record(page);};
 const editMoney=async(page,value)=>{await page.locator('#money').fill(String(value));await page.locator('#money').press('Tab');};
 const row=(page,id)=>page.locator(`.joker-editor[data-instance-id="${id}"]`);
 const openJoker=async(page,id)=>{await row(page,id).locator('.joker-portrait').click();await page.locator('#bay-dialog').waitFor({state:'visible'});await page.locator('#bay-edit').click();await row(page,id).locator('.joker-edit-drawer').waitFor({state:'visible'});};
 const closeJoker=async(page,id)=>{const dialog=row(page,id).locator('.joker-edit-drawer');if(await dialog.isVisible())await dialog.getByRole('button',{name:'Cerrar edición',exact:true}).click();};
 const unchanged=async(page,before,count)=>{assert.equal(await raw(page),before);assert.equal(await writes(page),count);};
 const sameIndependent=(before,after)=>{for(const field of ['deck','handBases','shop','jokerContext','outOfScope','nextBlind','lastCleared'])assert.deepEqual(after.observed[field],before.observed[field],field+' remains exact');assert.deepEqual(after.assumptions,before.assumptions);assert.equal(after.phase,before.phase);assert.deepEqual(after.phaseData,before.phaseData);};

 // 1. A completed field, not each key, creates one correction. Repeated blur
 // without an observed change is a no-op and the existing input node survives.
 const primary=await session(),p=primary.page;let before=await raw(p),count=await writes(p),prior=(await record(p)).state;
 await p.locator('#money').evaluate(input=>input.dataset.autosaveTestToken='same-input');
 await p.locator('#money').fill('0');await p.locator('#money').fill('25');await p.locator('#money').press('Tab');await unchanged(p,before,count);assert.equal(await p.locator('#draft-status').isHidden(),true,'Returning to the saved value clears dirty even when no change event is emitted');
 await p.locator('#money').fill('31');await unchanged(p,before,count);await p.locator('#money').press('Tab');let saved=await revision(p,1);
 assert.equal(saved.state.observed.money.value,31);assert.equal(saved.history.length,1);assert.equal(saved.history[0].kind,'correction');assert.equal(saved.history[0].action,null);sameIndependent(prior,saved.state);assert.equal(await p.locator('#money').getAttribute('data-autosave-test-token'),'same-input');assert.equal(await writes(p),count+1);
 before=await raw(p);count=await writes(p);await p.locator('#money').focus();await p.locator('#money').press('Tab');await unchanged(p,before,count);
 await p.locator('#money').scrollIntoViewIfNeeded();await p.screenshot({path:dir+'/browser-desktop.png',fullPage:false});
 pass('money-commits-on-field-end-not-per-key',{money:31,revision:1,history:1,kind:'correction',writes:1,sameInputNode:true},{money:saved.state.observed.money.value,revision:saved.state.revision,history:saved.history.length,kind:saved.history[0].kind,writes:1,sameInputNode:true});

 // 2. Counter and a newly observed offer persist without opening Registro.
 await openJoker(p,'owned-green');await p.locator('#green-owned-green').fill('9');await p.locator('#green-owned-green').press('Tab');saved=await revision(p,2);await closeJoker(p,'owned-green');assert.equal(saved.state.observed.jokers.value.find(j=>j.instanceId==='owned-green').counters.greenMult.value,9);
 await p.locator('#bay-search').fill('j_jolly');await p.locator('[data-bay-joker="j_jolly"]').click();await p.locator('#bay-candidate').click();await p.locator('#bay-dialog').waitFor({state:'hidden'});saved=await revision(p,3);assert.equal(saved.state.observed.shop.value.cardOffers.length,2);assert.equal(saved.state.observed.money.value,31);assert.ok(saved.history.every(entry=>entry.kind==='correction'));
 before=await raw(p);await p.reload();await ready(p);await go(p,'table');await shelf(p);assert.equal(await raw(p),before);assert.equal((await record(p)).state.observed.jokers.value[0].counters.greenMult.value,9);assert.equal(await p.locator('#money').inputValue(),'31');
 pass('counter-offer-and-reload-without-record-screen',{money:31,greenMult:9,offers:2,revision:3},{money:31,greenMult:9,offers:(await record(p)).state.observed.shop.value.cardOffers.length,revision:3});

 // Turtle Bean's transient empty edit is not a new observation. Re-entering4
 // before blur must apply the actual 5→4 resource change once: 13→12 cards.
 const beanInput=fixture();beanInput.state.observed.jokers=known([owned('turtle_bean','owned-bean',3,{hSize:known(5)}),owned('joker','owned-basic',1)]);beanInput.state.observed.resources.handSize=known(13);beanInput.initialState=structuredClone(beanInput.state);
 const bean=await session(beanInput),b=bean.page;before=await raw(b);count=await writes(b);await openJoker(b,'owned-bean');const hSize=row(b,'owned-bean').locator('[data-counter="hSize"]');await hSize.fill('');await hSize.fill('4');await unchanged(b,before,count);await hSize.press('Tab');saved=await revision(b,1);await closeJoker(b,'owned-bean');assert.equal(saved.state.observed.jokers.value.find(j=>j.instanceId==='owned-bean').counters.hSize.value,4);assert.equal(saved.state.observed.resources.handSize.value,12);assert.equal(saved.state.observed.money.value,25);assert.equal(saved.history.length,1);
 pass('transient-empty-turtle-bean-applies-resource-delta-once',{hSize:4,handSize:12,money:25,history:1,writesBeforeFieldEnd:0},{hSize:4,handSize:saved.state.observed.resources.handSize.value,money:25,history:saved.history.length,writesBeforeFieldEnd:0});await bean.context.close();

 // 3. These interactions only consult facts/alternatives and cannot append a
 // correction just because a button, disclosure or catalog search was used.
 before=await raw(p);count=await writes(p);await openJoker(p,'owned-green');await closeJoker(p,'owned-green');await p.locator('#bay-search').fill('Joker');await p.locator('#shop-recommendation').click();await p.locator('#shop-advice-reasons > summary').click();await p.locator('#shop-advice-alternatives > summary').click();await p.locator('#shop-advice-dialog').getByRole('button',{name:'Cerrar',exact:true}).click();await unchanged(p,before,count);
 pass('consultations-and-drawers-never-autosave',{writes:0},{writes:0,revision:(await record(p)).state.revision});await primary.context.close();

 // 4. Adding/removing/reordering are observations, not purchases or sales.
 const inventory=await session(),i=inventory.page;prior=(await record(i)).state;await i.locator('#bay-search').fill('j_jolly');await i.locator('[data-bay-joker="j_jolly"]').click();await i.locator('#bay-add').click();await i.locator('#bay-dialog').waitFor({state:'hidden'});saved=await revision(i,1);const added=saved.state.observed.jokers.value.find(j=>!prior.observed.jokers.value.some(old=>old.instanceId===j.instanceId));assert.equal(added.catalogId,'jolly');assert.equal(saved.state.observed.money.value,25);assert.equal(saved.history[0].kind,'correction');
 await openJoker(i,added.instanceId);await row(i,added.instanceId).getByRole('button',{name:'Quitar fila',exact:true}).click();saved=await revision(i,2);assert.equal(saved.state.observed.jokers.value.length,2);assert.equal(saved.state.observed.money.value,25);
 await row(i,'owned-green').locator('.joker-portrait').focus();await row(i,'owned-green').locator('.joker-portrait').press('Alt+ArrowRight');saved=await revision(i,3);assert.deepEqual(saved.state.observed.jokers.value.map(j=>j.instanceId),['owned-basic','owned-green']);
 await openJoker(i,'owned-green');await i.locator('#joker-owned-green').selectOption('joker');saved=await revision(i,4);assert.equal(saved.state.observed.jokers.value.find(j=>j.instanceId==='owned-green').catalogId,'joker');
 await i.locator('#joker-owned-green').selectOption('green_joker');saved=await revision(i,5);const returnedGreen=saved.state.observed.jokers.value.find(j=>j.instanceId==='owned-green');assert.equal(returnedGreen.catalogId,'green_joker');assert.equal(returnedGreen.counters.greenMult.status,'unknown','Returning to Green is a new observed counter, never the old cached6');assert.equal(await i.locator('#green-owned-green').inputValue(),'');await closeJoker(i,'owned-green');assert.equal((await record(i)).state.revision,5);
 assert.ok(saved.history.every(entry=>entry.kind==='correction'&&entry.action===null));sameIndependent(prior,saved.state);
 pass('inventory-observations-add-remove-reorder-without-transactions',{money:25,order:['owned-basic','owned-green'],corrections:5,greenCounterAfterCatalogReturn:'unknown'},{money:25,order:saved.state.observed.jokers.value.map(j=>j.instanceId),corrections:saved.history.length,greenCounterAfterCatalogReturn:returnedGreen.counters.greenMult.status});await inventory.context.close();

 // 5. Observing a voucher changes its resource, never spends a shop price or
 // replaces independent context/assumptions with the editor's empty defaults.
 const vouchers=await session(),v=vouchers.page;prior=(await record(v)).state;await v.locator('#vouchers [data-voucher="v_grabber"]').click();await v.locator('#voucher-apply').click();saved=await revision(v,1);assert.deepEqual(saved.state.observed.outOfScope.value.vouchers,['v_grabber']);assert.equal(saved.state.observed.resources.handsPerRound.value,6);assert.equal(saved.state.observed.money.value,25);assert.deepEqual(saved.state.observed.jokerContext,prior.observed.jokerContext);assert.deepEqual(saved.state.assumptions,prior.assumptions);assert.deepEqual(saved.state.observed.shop,prior.observed.shop);assert.equal(saved.history[0].kind,'correction');
 await v.reload();await ready(v);await go(v,'table');await shelf(v);assert.equal(await v.locator('#vouchers [data-voucher="v_grabber"]').getAttribute('data-owned'),'true');
 pass('voucher-observation-preserves-context-without-buying',{money:25,hands:6,owned:['v_grabber'],kind:'correction'},{money:25,hands:6,owned:saved.state.observed.outOfScope.value.vouchers,kind:saved.history[0].kind});await vouchers.context.close();

 // 6. Unknown edition and an unrendered extraSell value remain exact while a
 // different joker's counter is edited. A default-looking selector is not evidence.
 const partial=await session(fixture({unknownEdition:true})),u=partial.page;prior=(await record(u)).state;await openJoker(u,'owned-green');await u.locator('#green-owned-green').fill('11');await u.locator('#green-owned-green').press('Tab');saved=await revision(u,1);await closeJoker(u,'owned-green');const oldBasic=prior.observed.jokers.value.find(j=>j.instanceId==='owned-basic'),newBasic=saved.state.observed.jokers.value.find(j=>j.instanceId==='owned-basic');assert.deepEqual(newBasic,oldBasic);assert.equal(newBasic.edition.status,'unknown');assert.equal(newBasic.counters.extraSell.value,17);sameIndependent(prior,saved.state);
 const greenBeforeResolution=structuredClone(saved.state.observed.jokers.value.find(j=>j.instanceId==='owned-green')),resourcesBeforeResolution=structuredClone(saved.state.observed.resources),capacities=[];
 await openJoker(u,'owned-basic');assert.equal(await u.locator('#edition-owned-basic').inputValue(),'unknown');
 for(const [edition,slots,expectedRevision]of [['base',5,2],['negative',6,3],['base',5,4]]){
  await u.locator('#edition-owned-basic').selectOption(edition);saved=await revision(u,expectedRevision);assert.equal(saved.state.observed.resources.jokerSlots.value,slots);capacities.push(saved.state.observed.resources.jokerSlots.value);
  const basic=saved.state.observed.jokers.value.find(j=>j.instanceId==='owned-basic');assert.equal(basic.edition.value,edition);assert.equal(basic.counters.extraSell.value,17);assert.deepEqual(saved.state.observed.jokers.value.find(j=>j.instanceId==='owned-green'),greenBeforeResolution);
  for(const field of ['handsPerRound','discardsPerRound','handSize'])assert.deepEqual(saved.state.observed.resources[field],resourcesBeforeResolution[field],field+' stays independent of edition resolution');sameIndependent(prior,saved.state);
 }
 await closeJoker(u,'owned-basic');
 pass('independent-unknowns-and-unrendered-fields-are-not-defaulted',{unknownPreservedUntilExplicitEdit:true,extraSell:17,greenMult:11,capacities:[5,6,5],revision:4},{unknownPreservedUntilExplicitEdit:newBasic.edition.status==='unknown',extraSell:newBasic.counters.extraSell.value,greenMult:saved.state.observed.jokers.value[0].counters.greenMult.value,capacities,revision:saved.state.revision});await partial.context.close();

 // 7. An invalid observed number stays in the draft; it cannot replace the
 // valid document or cause a partial history write. Correcting it is retryable.
 const invalid=await session(),n=invalid.page;before=await raw(n);count=await writes(n);await editMoney(n,'3.5');await n.locator('#basic-save-status[data-state="error"]').waitFor();await unchanged(n,before,count);assert.equal(await n.locator('#money').inputValue(),'3.5');assert.notEqual((await n.locator('#basic-save-message').innerText()).trim(),'');await editMoney(n,32);saved=await revision(n,1);assert.equal(saved.state.observed.money.value,32);assert.equal(saved.history.length,1);
 pass('invalid-number-preserves-document-and-editable-draft',{failedWrites:0,invalidDraft:'3.5',correctedMoney:32,revision:1},{failedWrites:0,invalidDraft:'3.5',correctedMoney:saved.state.observed.money.value,revision:1});await invalid.context.close();

 // Observed debt belongs to the signed H1 balance domain. Two already owned
 // Credit Cards permit this literal −25 balance; this does not buy either card.
 const debtInput=fixture();debtInput.state.observed.jokers=known([owned('credit_card','owned-credit-a',0),owned('credit_card','owned-credit-b',0)]);debtInput.initialState=structuredClone(debtInput.state);const debt=await session(debtInput),d=debt.page;await editMoney(d,-25);saved=await revision(d,1);assert.equal(saved.state.observed.money.value,-25);assert.equal(saved.history.length,1);assert.equal(saved.history[0].kind,'correction');assert.equal(saved.history[0].action,null);assert.deepEqual(saved.state.observed.jokers,debtInput.state.observed.jokers);
 pass('observed-signed-balance-is-not-clamped-to-one-credit-card',{money:-25,creditCards:2,history:1,kind:'correction'},{money:saved.state.observed.money.value,creditCards:saved.state.observed.jokers.value.length,history:saved.history.length,kind:saved.history[0].kind});await debt.context.close();

 // 8. A synthetic quota failure proves the persisted record and journal stay
 // together. Retrying the same visible draft performs exactly one correction.
 const quota=await session(),q=quota.page;before=await raw(q);count=await writes(q);await q.evaluate(()=>window.__basicFailWrite=true);await editMoney(q,44);await q.locator('#basic-save-status[data-state="error"]').waitFor();await unchanged(q,before,count);assert.equal(await q.locator('#money').inputValue(),'44');await q.evaluate(()=>window.__basicFailWrite=false);await q.locator('#basic-save-retry').click();saved=await revision(q,1);assert.equal(saved.state.observed.money.value,44);assert.equal(saved.history.length,1);assert.equal(await writes(q),count+1);
 pass('quota-failure-retains-draft-and-atomic-retry',{failedWrites:0,money:44,history:1,successfulWrites:1},{failedWrites:0,money:saved.state.observed.money.value,history:saved.history.length,successfulWrites:1});await quota.context.close();

 // 9. Controlled external mutation emulates a valid competing correction. It
 // intentionally bypasses this page's writer wrapper; no game state is invented.
 const stale=await session(),c=stale.page;await c.locator('#money').fill('41');const external=await c.evaluate(async storageKey=>{const {createConfirmedStore,analysisBinding}=await import(new URL('dist/src/storage/confirmed-store.js',location.href).href),store=createConfirmedStore(()=>({getItem:k=>localStorage.getItem(k),setItem:(k,value)=>window.__basicNativeSet.call(localStorage,k,value)}));const loaded=store.load();if(!loaded.ok)throw Error('External fixture load failed');const before=localStorage.getItem(storageKey),result=store.correct({confirmationId:'synthetic-external',confirmed:true,expected:analysisBinding(loaded.value.state),updatedAt:'2026-10-28T13:00:00Z',patch:{money:{status:'known',source:'manual',value:50}},reason:'Synthetic external observation'});if(!result.ok)throw Error(JSON.stringify(result.errors));const after=localStorage.getItem(storageKey);window.dispatchEvent(new StorageEvent('storage',{key:storageKey,oldValue:before,newValue:after,storageArea:localStorage}));return after;},key);
 assert.equal(await c.locator('#money').inputValue(),'41');await c.locator('#money').press('Tab');await c.locator('#basic-save-status[data-state="error"]').waitFor();assert.equal(await raw(c),external);assert.equal(await c.locator('#money').inputValue(),'41');await c.locator('#basic-save-reload').click();assert.equal(await c.locator('#money').inputValue(),'50');assert.equal(await raw(c),external);
 pass('stale-revision-keeps-draft-until-explicit-reload',{externalMoney:50,draftMoney:41,overwrite:false},{externalMoney:(await record(c)).state.observed.money.value,draftMoney:41,overwrite:false});await stale.context.close();

 // 10. A genuine second tab is read-only, and an unrelated empty profile does
 // not infer that typing money meant starting or continuing a real run.
 const owner=await session(),reader=await owner.context.newPage();watch(reader);await reader.goto(origin.href);await reader.waitForFunction(()=>document.querySelector('#ownership')?.textContent.includes('Modo lectura'));await go(reader,'table');await shelf(reader);before=await raw(owner.page);count=await writes(reader);if(!await reader.locator('#money').isDisabled()){await editMoney(reader,33);await reader.locator('#basic-save-status').waitFor({state:'visible'});}assert.equal(await raw(owner.page),before);assert.equal(await writes(reader),count);await reader.close();await owner.context.close();
 const emptyContext=await browser.newContext(),empty=await emptyContext.newPage();watch(empty);await empty.goto(origin.href);await ready(empty);await go(empty,'table');await editMoney(empty,19);assert.equal(await raw(empty),null);await emptyContext.close();
 pass('reader-and-uninitialized-run-cannot-autosave',{readerWrites:0,initializesOnTyping:false},{readerWrites:0,initializesOnTyping:false});

 // An advanced ante draft is independent of observed money and this counter.
 // Saving those facts cannot silently advance the actual blind or enable a buy.
 const advanced=await session(),a=advanced.page,advancedBefore=(await record(a)).state;before=await raw(a);count=await writes(a);await a.locator('#ante').fill('2');await a.locator('#ante').press('Tab');await unchanged(a,before,count);assert.equal(await a.locator('#draft-status').isHidden(),false);
 await editMoney(a,31);saved=await revision(a,1);assert.equal(saved.state.observed.money.value,31);assert.deepEqual(saved.state.observed.nextBlind,advancedBefore.observed.nextBlind);assert.equal(saved.state.phase,'shop');assert.equal(await a.locator('#ante').inputValue(),'2');
 await openJoker(a,'owned-green');await a.locator('#green-owned-green').fill('11');await a.locator('#green-owned-green').press('Tab');saved=await revision(a,2);await closeJoker(a,'owned-green');assert.equal(saved.state.observed.jokers.value.find(j=>j.instanceId==='owned-green').counters.greenMult.value,11);assert.deepEqual(saved.state.observed.nextBlind,advancedBefore.observed.nextBlind);assert.deepEqual(saved.state.phaseData,advancedBefore.phaseData);assert.equal(await a.locator('#ante').inputValue(),'2');assert.equal(await a.locator('#draft-status').isHidden(),false);assert.match(await a.locator('#basic-save-message').innerText(),/cambios avanzados/i);
 before=await raw(a);count=await writes(a);await a.locator('.candidate-card[data-offer-id="visible-joker"] .candidate-hero').click();assert.equal(await a.locator('[data-shop-confirm="visible-joker"]').isDisabled(),true);await unchanged(a,before,count);await advanced.context.close();
 pass('advanced-ante-draft-does-not-block-independent-facts-or-advance-real-run',{draftAnte:2,savedAnte:1,money:31,greenMult:11,phase:'shop',history:2,buyEnabled:false},{draftAnte:2,savedAnte:saved.state.observed.nextBlind.value.ante,money:saved.state.observed.money.value,greenMult:saved.state.observed.jokers.value[0].counters.greenMult.value,phase:saved.state.phase,history:saved.history.length,buyEnabled:false});

 // Keyboard completion, feedback and the next shop action fit a phone-sized
 // browser. Mobile emulation is not a physical Android validation.
 const mobile=await session(fixture(),{width:390,height:844}),m=mobile.page;await m.locator('#money').fill('18');await m.locator('#money').press('Enter');saved=await revision(m,1);assert.equal(saved.state.observed.money.value,18);assert.equal(saved.history.length,1);assert.equal(await m.locator('#confirmation').isVisible(),false);assert.equal(await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await m.locator('#money').scrollIntoViewIfNeeded();await m.screenshot({path:dir+'/browser-mobile.png',fullPage:false});await mobile.context.close();
 pass('mobile390-keyboard-autosave-without-overflow',{money:18,history:1,documentOverflow:false,physicalAndroid:false},{money:18,history:1,documentOverflow:false,physicalAndroid:false});
 assert.equal(report.cases.length,14);assert.deepEqual(report.pageErrors,[]);report.status='passed';await writeFile(dir+'/browser.json',JSON.stringify(report,null,2)+'\n');console.log('PASS UX01b',report.cases.length,'browser groups; synthetic observations, not gameplay');
}catch(error){report.status='failed';report.error=error.stack||String(error);await writeFile(dir+'/browser.json',JSON.stringify(report,null,2)+'\n');if(lastPage&&!lastPage.isClosed())await lastPage.screenshot({path:dir+'/browser-failed.png',fullPage:true}).catch(()=>{});throw error;}
finally{await browser?.close();server?.kill();}
