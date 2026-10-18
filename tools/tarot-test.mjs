import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createNewRun} from '../dist/src/run/start.js';

// Synthetic observations. The literal enhancement/target/count oracles below
// come from the documented L12 inspection, never the engine being evaluated.
// These browser tests are not direct observations of a played Balatro game.
const port='4210',remote=process.env.PACK_TAROT_BASE_URL;
const origin=new URL(remote??'http://127.0.0.1:'+port+'/');if(!origin.pathname.endsWith('/'))origin.pathname+='/';
const key='balatro-advisor.confirmed.v1',dir='docs/evidencia/tarot'+(remote?'/public':'');
await mkdir(dir,{recursive:true});
const known=value=>({status:'known',source:'manual',value});
const unknown={status:'unknown',reason:'No observado en esta transcripción sintética.'};
const consumable=(catalogId,instanceId)=>({instanceId,catalogId,kind:'tarot',edition:'base',sellValue:1});
function fixture({held=['8S','8H','KS'],historyKnown=true,boss=false}={}){
 const created=createNewRun({runId:'synthetic-directed-tarot',updatedAt:'2026-10-17T18:00:00Z',deckId:'blue',profileConfirmed:true});assert.equal(created.ok,true);
 const state=created.value;
 // Explicit 52 actual-card identities; the modified 8S observation is independent
 // of any simulated hand, draw, Tarot preview, or helper that applies effects.
 const cards=['S','H','D','C'].flatMap(suit=>['2','3','4','5','6','7','8','9','10','J','Q','K','A'].map(rank=>({instanceId:rank+suit,rank,suit,edition:'base',enhancement:'none',seal:'none',extraChips:0})));
 Object.assign(cards.find(card=>card.instanceId==='8S'),{enhancement:'bonus',edition:'foil',seal:'blue',extraChips:7});
 state.phase='in_round';state.phaseData={blind:known({ante:1,kind:boss?'boss':'small'}),handsRemaining:known(5),discardsRemaining:known(3),score:known(0),heldCardIds:held===null?structuredClone(unknown):known(held)};
 state.observed.nextBlind=known({ante:1,kind:boss?'boss':'small',bossId:known(boss?'the_club':'none'),target:known(boss?600:300),reward:known(boss?5:3)});
 state.observed.money=known(16);state.observed.deck=known({cards});state.observed.jokers=known([]);
 state.observed.jokerContext.value.consumables=known([consumable('c_chariot','owned-chariot'),consumable('c_empress','owned-empress')]);
 state.observed.jokerContext.value.tarotsUsed=historyKnown?known(0):structuredClone(unknown);
 state.assumptions.probes=[];state.assumptions.roundPlans=[];
 return {schemaVersion:'confirmed-2',initialState:structuredClone(state),state,history:[]};
}
const modules=[
 'dist/src/ui/app.js','dist/src/ui/tarot-view.js','dist/src/ui/inventory-changes-view.js',
 'dist/src/rules/tarot.js','dist/src/rules/core.js','dist/src/rules/generation-jokers.js','dist/src/rules/history-jokers.js',
 'dist/src/state/tarot-contract.js','dist/src/state/model.js','dist/src/state/validation.js',
 'dist/src/storage/confirmed-store.js','dist/src/storage/confirmed-record.js','dist/src/rules/engine-evidence.js',
 'dist/src/advisor/composition.js','dist/src/advisor/composition-policy.js','dist/src/advisor/composition-signals.js',
 'dist/src/rules/evidence.js','dist/src/ui/consumable-labels.js','dist/src/catalog/initial.js'
];
const report={date:new Date().toISOString(),url:origin.href,commit:process.env.PACK_TAROT_COMMIT??null,workflow:process.env.PACK_TAROT_WORKFLOW??null,
 environment:'Chrome temporary profiles; desktop and 390px mobile emulation',gameObservation:false,physicalAndroid:false,criticalModules:modules.length,hashes:[],cases:[],pageErrors:[]};
const pass=(id,expected,observed)=>{report.cases.push({id,expected,observed,status:'passed'});console.log('PASS',id);};
const server=remote?null:spawn(process.execPath,['dist/src/server.js'],{env:{...process.env,PORT:port},stdio:'pipe',windowsHide:true});
let browser,lastPage;
try{
 if(server)await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Tarot server timeout')),15000);server.stdout.on('data',data=>{if(String(data).includes('Balatro Advisor local')){clearTimeout(timer);resolve();}});server.on('error',error=>{clearTimeout(timer);reject(error);});server.on('exit',()=>{clearTimeout(timer);reject(Error('Tarot server stopped'));});});
 if(remote)for(const file of ['index.html',...modules,'web/mesa.css']){
  const local=await readFile('out/'+file),url=new URL(file,origin);url.searchParams.set('tarot',String(Date.now()));const response=await fetch(url);assert.equal(response.status,200,file);
  const bytes=Buffer.from(await response.arrayBuffer()),hash=data=>createHash('sha256').update(data).digest('hex');assert.equal(hash(bytes),hash(local),'Public artifact differs from out/'+file);report.hashes.push({file,sha256:hash(bytes)});
 }
 browser=await chromium.launch({channel:'chrome',headless:true});
 const raw=page=>page.evaluate(storageKey=>localStorage.getItem(storageKey),key),record=async page=>JSON.parse(await raw(page)),writes=page=>page.evaluate(()=>window.__tarotWrites);
 const go=(page,screen)=>page.locator(`[data-screen="${screen}"]`).click(),panel=page=>page.locator('#tarot-panel');
 const ready=page=>page.waitForFunction(()=>document.querySelector('#ownership')?.textContent.includes('Esta pestaña tiene'));
 const watch=page=>{lastPage=page;page.on('pageerror',error=>report.pageErrors.push(error.message));};
 const session=async(input=fixture(),viewport={width:1440,height:1000})=>{
  const context=await browser.newContext({viewport});await context.addInitScript(storageKey=>{
   window.__tarotWrites=0;window.__tarotFailWrite=false;const original=Storage.prototype.setItem;
   Storage.prototype.setItem=function(name,value){if(name===storageKey){if(window.__tarotFailWrite)throw new DOMException('Synthetic Tarot quota failure','QuotaExceededError');window.__tarotWrites++;}return original.call(this,name,value);};
  },key);
  const page=await context.newPage();watch(page);await page.goto(origin.href);await ready(page);await go(page,'archive');
  await page.locator('#import-file').setInputFiles({name:'synthetic-directed-tarot.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(input))});
  await page.locator('#dialog-accept').click();await page.locator('#confirmation').waitFor({state:'hidden'});await go(page,'table');await panel(page).waitFor({state:'visible'});return {context,page};
 };
 const finish=async page=>{await page.locator('#performed').check();await page.locator('#dialog-accept').click();await page.locator('#confirmation').waitFor({state:'hidden'});};
 const reload=async page=>{await page.reload();await ready(page);await go(page,'table');await panel(page).waitFor({state:'visible'});};
 const target=(page,id)=>page.locator(`[data-tarot-target="${id}"]`),actual=state=>state.observed.deck.value.cards.find(card=>card.instanceId==='8S');
 const messages=async page=>(await page.locator('#message,#dialog-error,#tarot-error').allTextContents()).join(' ');

 // 1. Observing a hand is a distinct real-data action, not a Tarot use or draw.
 const observation=await session(fixture({held:null})),o=observation.page;let before=await raw(o),count=await writes(o);
 assert.equal(await o.locator('#tarot-hand-editor').getAttribute('open'),'');assert.equal(await target(o,'8S').count(),0);
 for(const id of ['8S','8H','KS'])await o.locator(`[data-tarot-hand-card="${id}"]`).click();assert.equal(await raw(o),before);assert.equal(await writes(o),count);
 await o.locator('#tarot-observe-hand').click();await o.locator('#confirmation').waitFor({state:'visible'});assert.equal(await raw(o),before);
 await o.locator('#dialog-accept').click();assert.equal(await raw(o),before);assert.match(await o.locator('#dialog-error').innerText(),/confirm/i);await finish(o);
 let saved=await record(o),initial=JSON.parse(before).state;assert.deepEqual(saved.state.phaseData.heldCardIds,known(['8S','8H','KS']));
 assert.deepEqual(saved.state.observed,initial.observed);assert.deepEqual(saved.state.assumptions,initial.assumptions);assert.equal(saved.history.length,1);assert.equal(saved.history[0].action.type,'observe_round_hand');assert.equal(saved.state.revision,initial.revision+1);
 assert.equal(saved.state.observed.jokerContext.value.consumables.value.length,2);assert.equal(saved.state.observed.jokerContext.value.tarotsUsed.value,0);assert.equal(await o.locator('[data-tarot-target]').count(),3);
 pass('observed-hand-confirmation-separate-from-use',{held:['8S','8H','KS'],consumables:2,tarotsUsed:0,money:16,historyActions:['observe_round_hand'],otherObservedDataUnchanged:true},{held:saved.state.phaseData.heldCardIds.value,consumables:2,tarotsUsed:0,money:16,historyActions:saved.history.map(entry=>entry.action.type),otherObservedDataUnchanged:true});await observation.context.close();

 // 2. Switching a consumable, selecting known targets and inspecting the index
 // never writes; the remaining 49 deck cards are not offered as legal targets.
 const first=await session(),p=first.page;before=await raw(p);count=await writes(p);
 assert.deepEqual(await p.locator('[data-tarot-target]').evaluateAll(nodes=>nodes.map(node=>node.dataset.tarotTarget)),['8S','8H','KS']);
 assert.equal(await target(p,'2C').count(),0);assert.equal(await p.locator('#tarot-use').isDisabled(),true);
 await target(p,'8S').click();assert.match(await p.locator('.tarot-preview').innerText(),/Bonificación\s*→\s*8♠\s*·\s*Acero/);
 await p.locator('.tarot-preview details summary').click();assert.match(await p.locator('.tarot-preview').innerText(),/heurístico|composición/i);assert.doesNotMatch(await p.locator('.tarot-preview').innerText(),/\d\s*%/);
 await p.locator('#tarot-consumable').selectOption('owned-empress');assert.equal(await target(p,'8S').getAttribute('aria-pressed'),'false');assert.equal(await p.locator('#tarot-use').isDisabled(),true);
 await p.locator('#tarot-consumable').selectOption('owned-chariot');await target(p,'8S').click();assert.equal(await raw(p),before);assert.equal(await writes(p),count);
 await panel(p).screenshot({path:dir+'/desktop-preview.png'});
 pass('targets-preview-and-consumable-switch-readonly',{targetIds:['8S','8H','KS'],arbitraryDeckTarget:false,writes:0,realCardEnhancement:'bonus'},{targetIds:['8S','8H','KS'],arbitraryDeckTarget:false,writes:0,realCardEnhancement:(await record(p)).state.observed.deck.value.cards.find(card=>card.instanceId==='8S').enhancement});

 // 3. L12 independently states Chariot replaces the enhancement with steel,
 // retaining edition, seal and permanent chips. It costs no money to use it.
 await p.locator('#tarot-use').click();await p.locator('#confirmation').waitFor({state:'visible'});assert.equal(await raw(p),before);assert.match(await p.locator('#dialog-body').innerText(),/Bonificación.*Acero/s);
 await p.screenshot({path:dir+'/desktop-confirmation.png',fullPage:false});await p.locator('#dialog-cancel').click();assert.equal(await raw(p),before);
 await p.locator('#tarot-use').click();await finish(p);saved=await record(p);const original=JSON.parse(before).state;
 assert.deepEqual(actual(saved.state),{instanceId:'8S',rank:'8',suit:'S',edition:'foil',enhancement:'steel',seal:'blue',extraChips:7,debuff:false});
 assert.deepEqual(saved.state.observed.deck.value.cards.filter(card=>card.instanceId!=='8S'),original.observed.deck.value.cards.filter(card=>card.instanceId!=='8S'));
 assert.equal(saved.state.observed.money.value,16);assert.equal(saved.state.observed.jokerContext.value.tarotsUsed.value,1);assert.deepEqual(saved.state.observed.jokerContext.value.consumables.value,[consumable('c_empress','owned-empress')]);
 assert.equal(saved.history.length,1);assert.deepEqual(saved.history[0].action,{type:'use_tarot',instanceId:'owned-chariot',targetCardIds:['8S']});assert.deepEqual(saved.state.assumptions,original.assumptions);
 assert.deepEqual(saved.state.phaseData,original.phaseData);assert.equal(saved.state.observed.deck.value.cards.length,52);assert.equal(saved.history[0].evidence.verifiedAgainstGame,false);
 assert.ok(saved.history[0].evidence.limitations.some(item=>item.ruleId==='tarot.targets'&&item.status==='provisional'));
 pass('chariot-confirmed-exact-card-and-one-consumption',{enhancement:'steel',edition:'foil',seal:'blue',extraChips:7,money:16,tarotsUsed:1,remaining:['owned-empress'],history:1},{enhancement:actual(saved.state).enhancement,edition:actual(saved.state).edition,seal:actual(saved.state).seal,extraChips:actual(saved.state).extraChips,money:16,tarotsUsed:1,remaining:['owned-empress'],history:1});

 // 4. Reload restores exact cards/history. Undo is an explicit compensating
 // record, preserving the journal rather than claiming Balatro was undone.
 before=await raw(p);await reload(p);assert.equal(await raw(p),before);assert.equal(actual((await record(p)).state).enhancement,'steel');assert.equal(await p.locator('#tarot-consumable option[value="owned-chariot"]').count(),0);
 await p.locator('#run-undo').click();saved=await record(p);assert.deepEqual(saved.state.observed,original.observed);assert.deepEqual(saved.state.phaseData,original.phaseData);assert.equal(saved.history.length,2);assert.equal(saved.history[1].kind,'undo');assert.equal(saved.state.revision,original.revision+2);
 before=await raw(p);await reload(p);assert.equal(await raw(p),before);assert.equal(actual((await record(p)).state).enhancement,'bonus');
 pass('reload-and-undo-restore-observed-card-and-inventory',{undoEnhancement:'bonus',consumables:2,tarotsUsed:0,money:16,historyKinds:['action','undo']},{undoEnhancement:'bonus',consumables:2,tarotsUsed:0,money:16,historyKinds:saved.history.map(entry=>entry.kind)});await first.context.close();

 // 5. Empress independently permits at most two targets, not three; failed
 // selection does not silently clip the list or consume a different Tarot.
 const maximum=await session(),m=maximum.page;before=await raw(m);count=await writes(m);await m.locator('#tarot-consumable').selectOption('owned-empress');
 for(const id of ['8S','8H','KS'])await target(m,id).click();assert.equal(await m.locator('#tarot-use').isDisabled(),true);assert.match(await m.locator('.tarot-preview').innerText(),/entre 1 y 2/);assert.equal(await raw(m),before);assert.equal(await writes(m),count);
 await target(m,'KS').click();assert.equal(await m.locator('#tarot-use').isEnabled(),true);await m.locator('#tarot-use').click();await finish(m);saved=await record(m);
 assert.equal(actual(saved.state).enhancement,'mult');assert.equal(saved.state.observed.deck.value.cards.find(card=>card.instanceId==='8H').enhancement,'mult');assert.equal(saved.state.observed.deck.value.cards.find(card=>card.instanceId==='KS').enhancement,'none');assert.equal(saved.state.observed.jokerContext.value.tarotsUsed.value,1);
 assert.deepEqual(saved.state.observed.jokerContext.value.consumables.value,[consumable('c_chariot','owned-chariot')]);
 pass('empress-three-rejected-two-exact-targets',{maxTargets:2,threeAllowed:false,changed:['8S','8H'],unchangedKing:true,consumedOnce:true},{maxTargets:2,threeAllowed:false,changed:saved.history[0].action.targetCardIds,unchangedKing:true,consumedOnce:true});await maximum.context.close();

 // 6. Missing historical totals affect that total only, not the independent
 // card transformation. The Club's unimplemented debuff refresh blocks use,
 // while recording a hand remains available and does not assert a refresh.
 const missing=await session(fixture({historyKnown:false})),u=missing.page;await target(u,'8S').click();assert.match(await u.locator('.tarot-preview').innerText(),/total previo.*desconocido|sigue desconocido/i);await u.locator('#tarot-use').click();await finish(u);saved=await record(u);assert.deepEqual(saved.state.observed.jokerContext.value.tarotsUsed,unknown);assert.equal(actual(saved.state).enhancement,'steel');await missing.context.close();
 const club=await session(fixture({held:null,boss:true})),b=club.page;for(const id of ['8S','8H','KS'])await b.locator(`[data-tarot-hand-card="${id}"]`).click();assert.equal(await b.locator('#tarot-observe-hand').isEnabled(),true);await b.locator('#tarot-observe-hand').click();await finish(b);
 before=await raw(b);await target(b,'8S').click();assert.equal(await b.locator('#tarot-use').isDisabled(),true);assert.match(await b.locator('.tarot-preview').innerText(),/jefe.*debilitamiento|falta implementar/i);assert.equal(await raw(b),before);assert.equal((await record(b)).history[0].action.type,'observe_round_hand');
 pass('unknown-history-and-boss-limit-only-affected-operation',{unknownHistoryPreserved:true,independentSteel:true,clubHandObservation:true,clubUseAllowed:false},{unknownHistoryPreserved:true,independentSteel:true,clubHandObservation:true,clubUseAllowed:false});await club.context.close();

 // 7. Storage failure leaves the previous whole journal recoverable; the same
 // still-open confirmation can be retried and records exactly one action.
 const quota=await session(),q=quota.page;await target(q,'8S').click();await q.locator('#tarot-use').click();await q.locator('#performed').check();before=await raw(q);count=await writes(q);
 await q.evaluate(()=>window.__tarotFailWrite=true);await q.locator('#dialog-accept').click();assert.equal(await raw(q),before);assert.equal(await writes(q),count);assert.equal(await q.locator('#confirmation').isVisible(),true);assert.match(await messages(q),/guard|almacen|persist|cuota/i);
 await q.evaluate(()=>window.__tarotFailWrite=false);await q.locator('#dialog-accept').click();await q.locator('#confirmation').waitFor({state:'hidden'});saved=await record(q);assert.equal(saved.history.length,1);assert.equal(actual(saved.state).enhancement,'steel');assert.equal(saved.state.observed.jokerContext.value.tarotsUsed.value,1);assert.equal(await writes(q),count+1);
 pass('quota-failure-atomicity-and-single-retry',{failedWriteChangedJournal:false,successfulRetryWrites:1,history:1,tarotsUsed:1},{failedWriteChangedJournal:false,successfulRetryWrites:1,history:saved.history.length,tarotsUsed:1});await quota.context.close();

 // 8. A second tab may explore targets but cannot persist. 390px is emulation,
 // explicitly not a test on a physical Android device or a played game.
 const mobile=await session(fixture(),{width:390,height:844}),v=mobile.page;before=await raw(v);await target(v,'8S').click();assert.equal(await v.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await panel(v).screenshot({path:dir+'/mobile-preview.png'});await v.screenshot({path:dir+'/mobile-page.png',fullPage:false});await v.locator('#tarot-use').click();assert.equal(await v.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await v.screenshot({path:dir+'/mobile-confirmation.png',fullPage:false});await v.locator('#dialog-cancel').click();assert.equal(await raw(v),before);
 const reader=await mobile.context.newPage();watch(reader);await reader.goto(origin.href);await reader.waitForFunction(()=>document.querySelector('#ownership')?.textContent.includes('Modo lectura'));await go(reader,'table');await panel(reader).waitFor({state:'visible'});
 await target(reader,'8S').click();assert.match(await reader.locator('.tarot-preview').innerText(),/Acero/);assert.equal(await reader.locator('#tarot-use').isDisabled(),true);assert.equal(await reader.locator('#tarot-observe-hand').isDisabled(),true);assert.equal(await reader.locator('#tarot-inventory').isDisabled(),true);assert.equal(await raw(reader),before);
 pass('mobile390-and-readonly-preview-without-save',{mobileOverflow:false,readerPreview:true,readerWritesAllowed:false,physicalAndroid:false},{mobileOverflow:false,readerPreview:true,readerWritesAllowed:false,physicalAndroid:false});await mobile.context.close();

 assert.equal(report.cases.length,8);assert.deepEqual(report.pageErrors,[]);report.status='passed';await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');console.log('PASS directed Tarot',report.cases.length,'browser groups; synthetic observations, not gameplay');
}catch(error){report.status='failed';report.error=error.stack||String(error);await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');if(lastPage&&!lastPage.isClosed())await lastPage.screenshot({path:dir+'/failed.png',fullPage:true}).catch(()=>{});throw error;}
finally{await browser?.close();server?.kill();}
