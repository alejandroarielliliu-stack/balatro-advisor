import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {createNewRun} from '../dist/src/run/start.js';
import {logicalBounds} from './ui-logical-bounds.mjs';

// Synthetic UI/persistence evidence; not a direct observation of Balatro.
const port='4228',origin=process.env.BLIND_SCREEN_ORIGIN??`http://127.0.0.1:${port}/`,key='balatro-advisor.confirmed.v1',dir='docs/evidencia/blind-screen';
await mkdir(dir,{recursive:true});
const report={date:new Date().toISOString(),gameObservation:false,physicalAndroid:false,origin,cases:[],pageErrors:[]};
const pass=id=>{report.cases.push({id,status:'passed'});console.log('PASS',id);};
const server=process.env.BLIND_SCREEN_ORIGIN?null:spawn(process.execPath,['dist/src/server.js'],{env:{...process.env,PORT:port},stdio:'pipe',windowsHide:true});
let browser,lastPage;
try{
 if(server)await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Blind screen server timeout')),15000);server.stdout.on('data',s=>{if(String(s).includes('Balatro Advisor local')){clearTimeout(timer);resolve();}});server.on('error',reject);});
 browser=await chromium.launch({channel:'chrome',headless:true});
 const session=async(viewport={width:1280,height:720},saved=null)=>{
  const context=await browser.newContext({viewport,reducedMotion:'reduce',hasTouch:true,isMobile:true});
  await context.addInitScript(({key,saved})=>{if(saved&&localStorage.getItem(key)===null)localStorage.setItem(key,saved);window.__blindFail=false;const set=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k===key&&window.__blindFail)throw new DOMException('Synthetic quota failure','QuotaExceededError');return set.call(this,k,v);};},{key,saved});
  const page=await context.newPage();lastPage=page;page.on('pageerror',e=>report.pageErrors.push(e.message));await page.goto(origin);await page.waitForFunction(()=>location.hash==='#menu'&&document.querySelector('#ownership')?.textContent.includes('Esta pestaña tiene'));return {context,page};
 };
 const raw=p=>p.evaluate(k=>localStorage.getItem(k),key),record=async p=>JSON.parse(await raw(p));
 const fillsHeight=async p=>{const height=await p.locator('#app-viewport').evaluate(e=>e.clientHeight),[sidebar,...cards]=await p.locator('.blind-sidebar,.blind-card').evaluateAll(logicalBounds);assert.ok(Math.abs(sidebar.top)<=1&&Math.abs(sidebar.bottom-height)<=1,'Sidebar reaches both viewport edges');for(const card of cards)assert.ok(Math.abs(card.bottom-height)<=1,'Blind column reaches the viewport bottom');};
 const start=async(p,deck='red')=>{await p.locator('#menu-play').click();await p.locator(`#setup-deck-dots input[value="${deck}"]`).check();await p.locator('#setup-play').click();await p.waitForFunction(()=>document.body.dataset.view==='blind');assert.equal(await p.locator('#confirmation').isVisible(),false);await p.locator('.blind-art[data-blind=small][data-art-status=loaded]').waitFor();};
 const tag=async(p,kind,id)=>{await p.locator(`[data-tag-slot=${kind}]`).click();await p.locator(`[data-tag-choice=${id}]`).click();await p.locator('#blind-picker').waitFor({state:'hidden'});};
 const main=await session(),p=main.page;await start(p);
 await fillsHeight(p);
 assert.equal(await p.locator('#blind-hands').innerText(),'4');assert.equal(await p.locator('#blind-discards').innerText(),'4');assert.equal(await p.locator('#blind-money').innerText(),'$4');assert.equal(await p.locator('#blind-round').innerText(),'0');
 assert.equal(await p.locator('[data-kind=small] .blind-score-target').innerText(),'300');assert.equal(await p.locator('[data-kind=big] .blind-score-target').innerText(),'450');assert.equal(await p.locator('[data-kind=boss] .blind-score-target').innerText(),'—');
 assert.equal(await p.locator('[data-tag-slot][data-empty=true]').count(),2);assert.equal(await p.locator('[data-tag-slot=small]').evaluate(e=>getComputedStyle(e).borderTopStyle),'dashed');assert.equal(await p.locator('#blind-select-big').isDisabled(),true);assert.equal(await p.locator('#blind-skip-big').isDisabled(),true);
 const initial=await record(p);await p.locator('[data-tag-slot=small]').click();await p.locator('#blind-picker').waitFor();await p.keyboard.press('Escape');await p.locator('#blind-picker').waitFor({state:'hidden'});assert.deepEqual(await record(p),initial,'Browsing a picker never changes recorded facts');
 pass('direct-start-and-literal-red-initial-values-not-copied-from-image');
 const beforeAdvice=await raw(p);
 await p.locator('#blind-compare').click();await p.locator('#blind-risk').selectOption('tight');
 await p.locator('#dialog-accept').click();await p.locator('#confirmation').waitFor({state:'hidden'});
 assert.match(await p.locator('.blind-speech strong').innerText(),/riesgo/i);
 assert.equal(await raw(p),beforeAdvice,'Comparing before selection never enters the blind or writes the player assessment');
 pass('preselection-risk-reaches-the-fixed-adviser-without-writing');

 await tag(p,'big','tag_rare');let saved=await record(p);assert.equal(saved.state.phaseData.skipTag.status,'unknown');assert.equal(saved.state.blindTags[0].kind,'big');assert.equal(saved.state.blindTags[0].tag.value,'tag_rare');assert.equal(saved.state.observed.money.value,4);assert.equal(saved.state.phase,'blind_select');assert.equal(await p.locator('#blind-round').innerText(),'0');
 await tag(p,'small','tag_investment');saved=await record(p);assert.equal(saved.state.phaseData.skipTag.value,'tag_investment');assert.equal(saved.state.observed.money.value,4);assert.equal(saved.state.blindTags.find(t=>t.kind==='big').tag.value,'tag_rare');
 const before=await raw(p);await p.locator('[data-tag-slot=small]').click();await p.evaluate(()=>window.__blindFail=true);await p.locator('[data-tag-choice=tag_uncommon]').click();assert.equal(await raw(p),before);assert.equal(await p.locator('#blind-picker').isVisible(),true);assert.match(await p.locator('#blind-picker .error').innerText(),/guardar|almacenamiento/i);await p.evaluate(()=>window.__blindFail=false);await p.locator('[data-tag-choice=tag_uncommon]').click();await p.locator('#blind-picker').waitFor({state:'hidden'});assert.equal((await record(p)).state.phaseData.skipTag.value,'tag_uncommon');
 pass('current-and-upcoming-tags-stay-independent-atomic-save-failure-and-retry');

 await p.locator('#blind-boss-picker').click();await p.locator('[data-boss-choice=the_window]').click();await p.locator('#blind-picker').waitFor({state:'hidden'});saved=await record(p);assert.equal(saved.state.observed.visibleBoss.value.bossId.value,'the_window');assert.equal(saved.state.observed.visibleBoss.value.target.value,600);assert.equal(saved.state.observed.visibleBoss.value.reward.value,5);assert.equal(saved.state.observed.nextBlind.value.kind,'small');assert.equal(saved.state.observed.money.value,4);assert.match(await p.locator('[data-kind=boss] .blind-boss-effect').innerText(),/Diamantes/);
 await p.locator('[data-kind=boss] .blind-art[data-art-status=loaded]').waitFor();
 const effectBox=await p.locator('.blind-boss-effect').boundingBox(),labelBox=await p.locator('[data-kind=boss] .blind-amounts>span').first().boundingBox();assert.ok(effectBox.y+effectBox.height<=labelBox.y,'Boss effect and score label must not overlap');assert.equal(await p.locator('.blind-boss-effect').evaluate(e=>e.scrollHeight<=e.clientHeight),true,'Boss text fits its own box');
 const upBox=await p.locator('.blind-up-ante').boundingBox(),cardBox=await p.locator('[data-kind=boss]').boundingBox();assert.ok(upBox.y+upBox.height<=cardBox.y+cardBox.height,'Boss footer remains inside its card');await p.screenshot({path:dir+'/desktop.png'});
 const savedRaw=await raw(p);await p.reload();await p.waitForFunction(()=>location.hash==='#menu');assert.equal(await raw(p),savedRaw);await p.locator('#menu-play').click();await p.locator('#setup-tab-continue').click();await p.locator('#setup-play').click();await p.waitForFunction(()=>document.body.dataset.view==='blind');assert.equal(await raw(p),savedRaw);assert.equal(await p.locator('[data-tag-slot=big] .tag-art').getAttribute('data-tag'),'tag_rare');
 pass('observed-boss-fills-verified-metadata-reload-menu-and-continue-preserve-data');

 // Selection records entry directly; the cash-out form does not yet grant a win or money.
 await p.locator('#blind-select-small').click();await p.locator('#round-cashout').waitFor();assert.equal(await p.locator('#confirmation').isVisible(),false);assert.equal((await record(p)).state.phase,'in_round');assert.equal((await record(p)).state.observed.money.value,4);assert.equal(await p.locator('#round-cashout-amount').inputValue(),'');assert.equal(await p.locator('#blind-round').innerText(),'1');
 pass('select-opens-cashout-without-granting-a-win-or-income');await main.context.close();

 const generated=createNewRun({runId:'unknown-blind-ui',updatedAt:'2026-11-07T18:00:00Z',deckId:'red',profileConfirmed:true});assert.equal(generated.ok,true);const unknownState=generated.value;unknownState.observed.nextBlind={status:'unknown',reason:'Synthetic resumed game with unknown current blind.'};const unknownRaw=JSON.stringify({schemaVersion:'confirmed-2',initialState:unknownState,state:unknownState,history:[]});
 const missing=await session(undefined,unknownRaw),u=missing.page;await u.locator('#menu-play').click();await u.locator('#setup-tab-continue').click();await u.locator('#setup-play').click();await u.waitForFunction(()=>document.body.dataset.view==='blind');assert.equal(await u.locator('#blind-ante').innerText(),'—/8');assert.deepEqual(await u.locator('.blind-score-target').allTextContents(),['—','—','—']);assert.equal(await u.locator('[data-tag-slot=small]').isDisabled(),true);assert.equal(await raw(u),unknownRaw);await missing.context.close();
 const large=structuredClone(generated.value);large.observed.nextBlind={status:'known',source:'manual',value:{ante:1,kind:'small',bossId:{status:'known',source:'manual',value:'none'},target:{status:'known',source:'manual',value:300},reward:{status:'known',source:'manual',value:1000000000}}};const largeRaw=JSON.stringify({schemaVersion:'confirmed-2',initialState:large,state:large,history:[]});
 const robust=await session(undefined,largeRaw),r=robust.page;await r.locator('#menu-play').click();await r.locator('#setup-tab-continue').click();await r.locator('#setup-play').click();await r.waitForFunction(()=>document.body.dataset.view==='blind');assert.match(await r.locator('[data-kind=small] .blind-reward').innerText(),/1\.000\.000\.000/);await r.locator('[data-tag-slot=small]').click();await r.goBack();await r.locator('#blind-picker').waitFor({state:'hidden'});assert.equal(await raw(r),largeRaw);await robust.context.close();pass('unknown-current-blind-never-invents-ante-targets-large-reward-and-back-close-picker');

 for(const viewport of [{width:1024,height:768},{width:1920,height:1080},{width:844,height:390},{width:390,height:844},{width:568,height:320}]){
  const mobile=await session(viewport),m=mobile.page;await start(m,'blue');assert.equal(await m.locator('#blind-hands').innerText(),'5');assert.equal(await m.locator('#blind-discards').innerText(),'3');
  await fillsHeight(m);
  for(const selector of ['.blind-stage','#blind-select-small','[data-tag-slot=small]','[data-tag-slot=big]','#blind-boss-picker','#blind-run-info','#blind-deck']){const b=await m.locator(selector).boundingBox();assert.ok(b&&b.x>=-1&&b.y>=-1&&b.x+b.width<=viewport.width+1&&b.y+b.height<=viewport.height+1,selector+' clipped '+JSON.stringify({viewport,b}));}
  await m.locator('[data-tag-slot=small]').click();await m.locator('#blind-picker').waitFor();assert.equal(await m.locator('[data-tag-choice]').count(),24);await m.locator('[data-tag-choice=tag_uncommon]').click();await m.locator('#blind-picker').waitFor({state:'hidden'});assert.equal((await record(m)).state.phaseData.skipTag.value,'tag_uncommon');
  await m.screenshot({path:`${dir}/mobile-${viewport.width}x${viewport.height}.png`});await mobile.context.close();
 }
 pass('landscape-and-rotated-mobile-resource-values-and-pickers');assert.deepEqual(report.pageErrors,[]);report.status='passed';await writeFile(dir+'/report.json',JSON.stringify(report,null,2));console.log('PASS blind screen: '+report.cases.length+' groups');
}catch(e){report.status='failed';report.error=e.stack||String(e);await writeFile(dir+'/report.json',JSON.stringify(report,null,2));if(lastPage&&!lastPage.isClosed())await lastPage.screenshot({path:dir+'/failed.png'}).catch(()=>{});throw e;}
finally{await browser?.close();server?.kill();}
