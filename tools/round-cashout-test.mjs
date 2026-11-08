import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {createNewRun} from '../dist/src/run/start.js';
import {applyRunProgress} from '../dist/src/run/progress.js';
import {analysisBinding,createConfirmedStore} from '../dist/src/storage/confirmed-store.js';
import {logicalBounds} from './ui-logical-bounds.mjs';

// Synthetic UI and persistence checks, not a recorded game or physical Android test.
const port='4231',origin=process.env.ROUND_CASHOUT_ORIGIN??`http://127.0.0.1:${port}/`;
const key='balatro-advisor.confirmed.v1',dir='docs/evidencia/round-cashout';
await mkdir(dir,{recursive:true});
const report={date:new Date().toISOString(),origin,gameObservation:false,physicalAndroid:false,cases:[],pageErrors:[]};
const pass=id=>{report.cases.push({id,status:'passed'});console.log('PASS',id);};
const known=value=>({status:'known',source:'manual',value});
const generated=createNewRun({runId:'round-cashout-fixture',updatedAt:'2026-11-07T20:00:00Z',deckId:'red',profileConfirmed:true});
assert.equal(generated.ok,true);
const fixture=state=>JSON.stringify({schemaVersion:'confirmed-2',initialState:state,state,history:[]});
const progress=(state,command)=>{
 const result=applyRunProgress(state,command,{expectedRevision:state.revision,updatedAt:'2026-11-07T20:01:00Z',inventory:{unchanged:true}});
 assert.equal(result.ok,true,JSON.stringify(result.errors));return result.value.state;
};
const server=process.env.ROUND_CASHOUT_ORIGIN?null:spawn(process.execPath,['dist/src/server.js'],{env:{...process.env,PORT:port},stdio:'pipe',windowsHide:true});
let browser,lastPage;
try{
 if(server)await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Round cashout server timeout')),15000);server.stdout.on('data',chunk=>{if(String(chunk).includes('Balatro Advisor local')){clearTimeout(timer);resolve();}});server.on('error',reject);server.on('exit',()=>reject(Error('Round cashout server stopped')));});
 browser=await chromium.launch({channel:'chrome',headless:true});
 const session=async(viewport={width:1280,height:600},saved=null,reducedMotion='reduce')=>{
  const context=await browser.newContext({viewport,reducedMotion,hasTouch:true,isMobile:true});
  await context.addInitScript(({key,saved})=>{
   if(saved&&localStorage.getItem(key)===null)localStorage.setItem(key,saved);
   window.__roundCashoutFail=false;
   const write=Storage.prototype.setItem;
   Storage.prototype.setItem=function(k,v){if(k===key&&window.__roundCashoutFail)throw new DOMException('Synthetic cashout storage failure','QuotaExceededError');return write.call(this,k,v);};
  },{key,saved});
  const page=await context.newPage();lastPage=page;page.on('pageerror',error=>report.pageErrors.push(error.message));
  await page.goto(origin);
  await page.waitForFunction(()=>location.hash==='#menu'&&document.querySelector('#ownership')?.textContent.includes('Esta pestaña tiene'));
  return {context,page};
 };
 const raw=page=>page.evaluate(k=>localStorage.getItem(k),key),record=async page=>JSON.parse(await raw(page));
 const continueRun=async page=>{
  await page.locator('#menu-play').click();await page.locator('#setup-tab-continue').click();await page.locator('#setup-play').click();
  await page.waitForFunction(()=>document.body.dataset.view==='blind');
 };
 const start=async page=>{
  await page.locator('#menu-play').click();await page.locator('#setup-deck-dots input[value="red"]').check();await page.locator('#setup-play').click();
  await page.waitForFunction(()=>document.body.dataset.view==='blind');
 };
 const enter=async page=>{
  const before=await record(page);await page.locator('#blind-select-'+before.state.observed.nextBlind.value.kind).click();
  await page.locator('#round-cashout').waitFor({state:'visible'});
  assert.equal(await page.locator('#confirmation').isVisible(),false,'Selecting enters directly without another dialog');
  const after=await record(page);assert.equal(after.state.phase,'in_round');assert.equal(after.state.revision,before.state.revision+1);
  assert.equal(after.history.length,before.history.length+1);assert.equal(after.history.at(-1).progress.command.type,'enter_round');
  return after;
 };
 const visibleBounds=async(page,viewport)=>{
  for(const selector of ['#round-cashout-submit','#round-cashout-amount','#round-cashout-money','#blind-run-info','#blind-deck','.blind-joker-tray','.blind-consumable-tray']){
   const bounds=await page.locator(selector).boundingBox();
   assert.ok(bounds&&bounds.x>=-1&&bounds.y>=-1&&bounds.x+bounds.width<=viewport.width+1&&bounds.y+bounds.height<=viewport.height+1,selector+' is clipped: '+JSON.stringify({viewport,bounds}));
  }
  const height=await page.locator('#app-viewport').evaluate(element=>element.clientHeight);
  const [sidebar,panel]=await page.locator('.blind-sidebar,#round-cashout').evaluateAll(logicalBounds);
  assert.ok(Math.abs(sidebar.top)<=1&&Math.abs(sidebar.bottom-height)<=1,'Sidebar remains full height');
  assert.ok(Math.abs(panel.bottom-height)<=2,'Cashout panel continues to the bottom edge');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'No horizontal page overflow');
 };

 const main=await session(),p=main.page;await start(p);const inRound=await enter(p);
 assert.equal(await p.locator('.blind-cards').evaluate(element=>getComputedStyle(element).animationName),'none','Reduced motion removes the blind drop animation');
 assert.equal(await p.locator('.blind-cards').evaluate(element=>getComputedStyle(element).visibility),'hidden','Reduced motion hides the old blinds immediately');
 assert.equal(await p.locator('.blind-cards').evaluate(element=>getComputedStyle(element).pointerEvents),'none');
 assert.equal(await p.locator('#round-cashout-jokers').innerText(),'','No growth editors or placeholder content without dynamic jokers');
 assert.equal(await p.locator('#round-cashout-amount').inputValue(),'');assert.equal(await p.locator('#round-cashout-money').inputValue(),'');
 assert.equal(inRound.state.observed.money.value,4,'Opening cashout grants neither payout nor victory');
 await visibleBounds(p,{width:1280,height:600});await p.screenshot({path:dir+'/desktop-empty.png'});
 const beforeEdit=await raw(p);await p.locator('#round-cashout-amount').fill('3');await p.locator('#round-cashout-money').fill('7');
 assert.equal(await raw(p),beforeEdit,'Typing observations does not save or change phase');
 pass('selection-opens-reference-layout-with-empty-joker-area-and-no-automatic-cobro');

 await p.evaluate(()=>window.__roundCashoutFail=true);await p.locator('#round-cashout-submit').click();
 assert.equal(await raw(p),beforeEdit,'Failed cashout keeps the complete prior record');
 assert.equal(await p.locator('#round-cashout-amount').inputValue(),'3');assert.equal(await p.locator('#round-cashout-money').inputValue(),'7');
 assert.match(await p.locator('#round-cashout-error').innerText(),/guardar|almacen|espacio|fall/i);
 await p.evaluate(()=>window.__roundCashoutFail=false);await p.locator('#round-cashout-submit').click();
 await p.waitForFunction(()=>document.body.dataset.view==='table');const collected=await record(p);
 assert.equal(collected.state.phase,'shop');assert.equal(collected.state.observed.money.value,7);
 assert.equal(collected.state.revision,inRound.state.revision+1);assert.equal(collected.history.length,inRound.history.length+1,'Win, payout and joker observations are one history entry');
 assert.equal(collected.history.at(-1).progress.command.type,'record_cashout');
 assert.equal(collected.history.at(-1).progress.command.amount,3);assert.equal(collected.state.observed.nextBlind.value.kind,'big');
 pass('storage-failure-preserves-draft-retry-saves-one-history-entry');await main.context.close();

 const dynamic=structuredClone(generated.value);dynamic.runId='cashout-duplicates';dynamic.observed.money=known(23);
 dynamic.observed.jokers=known([
  {instanceId:'green-a',catalogId:'green_joker',edition:known('base'),stickers:known([]),sellValue:known(2),counters:{greenMult:known(7)}},
  {instanceId:'green-b',catalogId:'green_joker',edition:known('base'),stickers:known([]),sellValue:known(2),counters:{greenMult:known(12)}},
  {instanceId:'ice',catalogId:'ice_cream',edition:known('base'),stickers:known([]),sellValue:known(2),counters:{chips:known(85)}}
 ]);
 const duplicates=await session(undefined,fixture(dynamic)),d=duplicates.page;await continueRun(d);await enter(d);
 assert.equal(await d.locator('[data-cashout-joker]').count(),3);
 assert.equal(await d.locator('[data-cashout-joker="green-a"] [data-counter="greenMult"]').inputValue(),'','Earlier round value is not a new observation');
 assert.equal(await d.locator('[data-cashout-joker="green-b"] [data-counter="greenMult"]').inputValue(),'');
 const resumeRaw=await raw(d);await d.reload();await d.waitForFunction(()=>location.hash==='#menu');assert.equal(await raw(d),resumeRaw);
 await continueRun(d);await d.locator('#round-cashout').waitFor({state:'visible'});assert.equal(await raw(d),resumeRaw,'Continue restores the round panel without replaying selection');
 await d.locator('[data-cashout-joker="green-a"] [data-counter="greenMult"]').fill('10');
 await d.locator('[data-cashout-joker="green-b"] [data-counter="greenMult"]').fill('22');
 await d.locator('#round-cashout-amount').fill('7');await d.locator('#round-cashout-money').fill('31');
 assert.equal(await raw(d),resumeRaw);await d.locator('#round-cashout-jokers').evaluate(element=>element.scrollTop=0);await d.screenshot({path:dir+'/desktop-jokers.png'});await d.locator('#round-cashout-submit').click();
 await d.waitForFunction(()=>document.body.dataset.view==='table');const changed=await record(d),jokers=changed.state.observed.jokers.value;
 assert.equal(changed.state.observed.money.value,31,'Final observed balance is literal, not prior balance plus payout');
 assert.equal(jokers.find(j=>j.instanceId==='green-a').counters.greenMult.value,10);
 assert.equal(jokers.find(j=>j.instanceId==='green-b').counters.greenMult.value,22);
 assert.equal(jokers.find(j=>j.instanceId==='ice').counters.chips.status,'unknown','A blank post-round counter does not restore its previous value');
 pass('duplicate-jokers-edit-independently-and-continue-preserves-round-without-writing');await duplicates.context.close();

 const cashout=progress(progress(structuredClone(generated.value),{type:'enter_round'}),{type:'report_result',outcome:'won'});
 const resumed=await session(undefined,fixture(cashout)),r=resumed.page;await continueRun(r);await r.locator('#round-cashout').waitFor({state:'visible'});
 const cashoutRaw=await raw(r);assert.equal(await r.locator('#round-cashout-money').inputValue(),'');await r.locator('#round-cashout-amount').fill('4');await r.locator('#round-cashout-money').fill('9');assert.equal(await raw(r),cashoutRaw);
 await r.locator('#round-cashout-submit').click();await r.waitForFunction(()=>document.body.dataset.view==='table');assert.equal((await record(r)).state.observed.money.value,9);
 pass('previously-recorded-cashout-resumes-without-inferring-unknown-balance');await resumed.context.close();

 const final=structuredClone(generated.value);final.runId='cashout-final-eight';final.observed.nextBlind=known({ante:8,kind:'boss',bossId:known('amber_acorn'),target:known(100000),reward:known(8)});
 const ending=await session(undefined,fixture(final)),e=ending.page;await continueRun(e);await enter(e);
 await e.locator('#round-cashout-amount').fill('8');await e.locator('#round-cashout-money').fill('45');await e.locator('#round-cashout-submit').click();
 await e.waitForFunction(()=>document.body.dataset.view==='table');const finished=await record(e);assert.equal(finished.state.phase,'finished');assert.equal(finished.state.phaseData.outcome,'won');assert.equal(finished.state.observed.money.value,45);
 assert.notEqual(finished.state.observed.shop.status,'known','Final boss does not invent an extra shop');
 pass('final-boss-records-payout-and-completes-ante-eight');await ending.context.close();

 const animated=await session(undefined,null,'no-preference'),a=animated.page;await start(a);
 const shellSelector='.blind-sidebar,.blind-joker-tray,.blind-consumable-tray,#blind-deck';
 const beforeDrop=await a.locator(shellSelector).evaluateAll(elements=>elements.map(element=>{const r=element.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}));
 await a.evaluate(()=>{
  window.__cashoutDrop=null;
  document.addEventListener('animationstart',event=>{
   if(event.animationName!=='blind-cards-drop')return;
   const animation=event.target.getAnimations().find(item=>item.animationName==='blind-cards-drop');
   animation.pause();animation.currentTime=Number(animation.effect.getTiming().duration)/2;
   window.__cashoutDrop={targetClass:event.target.className,keyframes:animation.effect.getKeyframes()};
  });
 });
 await enter(a);await a.waitForFunction(()=>window.__cashoutDrop!==null);
 const drop=await a.evaluate(()=>window.__cashoutDrop);assert.equal(drop.targetClass,'blind-cards');
 assert.ok(drop.keyframes.some(frame=>/translateY\(120%\)/.test(frame.transform)),'Blind cards move downward, not the full stage');
 const midDrop=await a.locator('.blind-cards').evaluate(element=>({offset:new DOMMatrix(getComputedStyle(element).transform).m42,pointerEvents:getComputedStyle(element).pointerEvents}));
 assert.ok(midDrop.offset>0,'The captured mid-animation translation is downward');assert.equal(midDrop.pointerEvents,'none','Departing blind buttons stop intercepting input immediately');
 const duringDrop=await a.locator(shellSelector).evaluateAll(elements=>elements.map(element=>{const r=element.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}));
 assert.deepEqual(duringDrop,beforeDrop,'Sidebar, inventories and deck remain stationary during the drop');
 assert.equal(await a.locator(shellSelector).evaluateAll(elements=>elements.flatMap(element=>element.getAnimations({subtree:true})).some(animation=>animation.animationName==='blind-cards-drop')),false,'No shell element shares the blind drop animation');
 await a.screenshot({path:dir+'/transition-mid-drop.png'});
 await a.locator('.blind-cards').evaluate(element=>element.getAnimations().find(animation=>animation.animationName==='blind-cards-drop').finish());
 await a.locator('.blind-cards').waitFor({state:'hidden'});
 assert.equal(await a.locator('.blind-cards').evaluate(element=>getComputedStyle(element).pointerEvents),'none');
 assert.equal(await a.locator('#blind-select-small').isVisible(),false,'The departed blind button is hidden after the animation');
 assert.equal(await a.locator('#round-cashout').isVisible(),true);
 pass('only-blind-cards-drop-while-shell-stays-stationary-and-reduced-motion-skips-drop');await animated.context.close();

 const stale=await session(undefined,fixture(dynamic)),s=stale.page;await continueRun(s);await enter(s);
 await s.locator('#round-cashout-amount').fill('7');await s.locator('#round-cashout-money').fill('31');
 await s.locator('[data-cashout-joker="green-a"] [data-counter="greenMult"]').fill('10');
 await s.locator('[data-cashout-joker="green-b"] [data-counter="greenMult"]').fill('22');
 const draftRaw=await raw(s);let externalRaw=draftRaw;
 const externalStore=createConfirmedStore(()=>({getItem:()=>externalRaw,setItem:(_key,value)=>{externalRaw=value;}}));
 const oldState=JSON.parse(draftRaw).state,newJokers=structuredClone(oldState.observed.jokers);
 newJokers.value.find(joker=>joker.instanceId==='green-a').counters.greenMult=known(18);
 const externalChange=externalStore.correct({confirmationId:'cashout-external-observation',confirmed:true,expected:analysisBinding(oldState),updatedAt:'2026-11-07T20:03:00Z',patch:{money:known(40),jokers:newJokers},reason:'Synthetic external correction while cashout draft is open.'});
 assert.equal(externalChange.ok,true,JSON.stringify(externalChange.errors));
 await s.evaluate(({key,previous,next})=>{localStorage.setItem(key,next);window.dispatchEvent(new StorageEvent('storage',{key,oldValue:previous,newValue:next,storageArea:localStorage,url:location.href}));},{key,previous:draftRaw,next:externalRaw});
 await s.locator('#round-cashout-reload').waitFor({state:'visible'});
 assert.equal(await s.locator('#round-cashout-amount').inputValue(),'7');assert.equal(await s.locator('#round-cashout-money').inputValue(),'31');
 assert.equal(await s.locator('[data-cashout-joker="green-a"] [data-counter="greenMult"]').inputValue(),'10');
 assert.equal(await s.locator('[data-cashout-joker="green-b"] [data-counter="greenMult"]').inputValue(),'22');
 assert.equal(await s.locator('#round-cashout-submit').isDisabled(),true,'A stale revision cannot be submitted');
 assert.match(await s.locator('#round-cashout-error').innerText(),/partida cambió.*borrador/i);
 assert.equal(await raw(s),externalRaw,'Refreshing the stale draft does not overwrite the newer valid record');
 await s.locator('#round-cashout-jokers').evaluate(element=>element.scrollTop=0);await s.screenshot({path:dir+'/stale-draft.png'});
 await s.locator('#round-cashout-reload').click();
 assert.equal(await s.locator('#round-cashout-amount').inputValue(),'');assert.equal(await s.locator('#round-cashout-money').inputValue(),'');
 assert.equal(await s.locator('[data-cashout-joker="green-a"] [data-counter="greenMult"]').inputValue(),'');
 assert.match(await s.locator('[data-cashout-joker="green-a"] [data-counter="greenMult"]').getAttribute('placeholder'),/18/,'Explicit refresh loads the current observation');
 assert.equal(await s.locator('#round-cashout-submit').isDisabled(),false);assert.equal(await s.locator('#round-cashout-reload').isVisible(),false);
 assert.equal(await raw(s),externalRaw,'Explicit draft refresh is also read-only');
 pass('external-revision-preserves-draft-blocks-submit-and-requires-explicit-refresh');await stale.context.close();

 for(const viewport of [{width:844,height:390},{width:390,height:844},{width:568,height:320}]){
  const mobile=await session(viewport),m=mobile.page;await start(m);await enter(m);await visibleBounds(m,viewport);
  await m.locator('#round-cashout-amount').fill('3');await m.locator('#round-cashout-money').fill('7');
  await m.screenshot({path:`${dir}/mobile-${viewport.width}x${viewport.height}.png`});await mobile.context.close();
 }
 pass('cashout-controls-fit-horizontal-and-rotated-mobile');
 assert.deepEqual(report.pageErrors,[]);report.status='passed';await writeFile(dir+'/report.json',JSON.stringify(report,null,2));console.log('PASS round cashout: '+report.cases.length+' groups');
}catch(error){report.status='failed';report.error=error.stack||String(error);await writeFile(dir+'/report.json',JSON.stringify(report,null,2));if(lastPage&&!lastPage.isClosed())await lastPage.screenshot({path:dir+'/failed.png'}).catch(()=>{});throw error;}
finally{await browser?.close();server?.kill();}
