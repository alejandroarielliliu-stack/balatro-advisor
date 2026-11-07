import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {logicalBounds} from './ui-logical-bounds.mjs';

// UI and persistence contracts. Synthetic input, no observed Balatro game.
const port='4227',origin=`http://127.0.0.1:${port}/`,key='balatro-advisor.confirmed.v1',dir='docs/evidencia/run-setup';
await mkdir(dir,{recursive:true});
const state=JSON.parse(await readFile('examples/shop-purchase.json','utf8'));
const fixture=JSON.stringify({schemaVersion:'confirmed-1',initialState:structuredClone(state),state,history:[]});
const report={date:new Date().toISOString(),gameObservation:false,physicalAndroid:false,cases:[],pageErrors:[]};
const pass=(id,details={})=>{report.cases.push({id,status:'passed',...details});console.log('PASS',id);};
const server=spawn(process.execPath,['dist/src/server.js'],{env:{...process.env,PORT:port},stdio:'pipe',windowsHide:true});
let browser,lastPage;
try{
 await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Setup server timeout')),15000);server.stdout.on('data',data=>{if(String(data).includes('Balatro Advisor local')){clearTimeout(timeout);resolve();}});server.on('error',reject);server.on('exit',()=>{clearTimeout(timeout);reject(Error('Setup server stopped'));});});
 browser=await chromium.launch({channel:'chrome',headless:true});
 const session=async({saved=null,path='#menu',viewport={width:1280,height:720}}={})=>{
  const context=await browser.newContext({viewport,hasTouch:true,isMobile:true,reducedMotion:'reduce'});
  await context.addInitScript(({saved,key})=>{if(saved!==null&&localStorage.getItem(key)===null)localStorage.setItem(key,saved);window.__setupWrites=0;window.__setupFail=false;const set=Storage.prototype.setItem;Storage.prototype.setItem=function(name,value){if(name===key){if(window.__setupFail)throw new DOMException('Synthetic setup quota failure','QuotaExceededError');window.__setupWrites++;}return set.call(this,name,value);};},{saved,key});
  const page=await context.newPage();lastPage=page;page.on('pageerror',e=>report.pageErrors.push(e.message));await page.goto(origin+path);await page.waitForFunction(()=>location.hash==='#menu'&&document.body.dataset.view==='menu'&&document.querySelector('#ownership')?.textContent.includes('Esta pestaña tiene'));return {page,context};
 };
 const raw=p=>p.evaluate(key=>localStorage.getItem(key),key);
 const writes=p=>p.evaluate(()=>window.__setupWrites);
 const setup=async p=>{await p.locator('#menu-play').click();await p.locator('#run-setup').waitFor({state:'visible'});};
 const deck=(p,id)=>p.locator(`#setup-deck-dots input[value="${id}"]`).check();
 const stake=(p,id)=>p.locator(`#setup-stake-dots input[value="${id}"]`).check();
 const current=async p=>JSON.parse(await raw(p));
 const start=async p=>{await p.locator('#setup-play').click();await p.waitForFunction(()=>location.hash==='#blind'&&document.body.dataset.view==='blind');assert.equal(await p.locator('#confirmation').isVisible(),false,'Play goes directly to blind selection without the removed profile modal');};

 // Cold URLs and reloads always show the title; stored bytes remain intact.
 for(const path of ['','#table','#blind','#evaluation','#archive','#collection','#setup']){const s=await session({saved:fixture,path});assert.equal(await raw(s.page),fixture);assert.equal(await s.page.locator('#run-setup').isVisible(),false);assert.equal(await writes(s.page),0);await setup(s.page);await s.page.reload();await s.page.waitForFunction(()=>location.hash==='#menu'&&document.body.dataset.view==='menu');assert.equal(await raw(s.page),fixture);assert.equal(await s.page.locator('#run-setup').isVisible(),false);await s.context.close();}
 pass('all-entries-and-reloads-open-main-menu-without-clearing-run');

 const browse=await session(),p=browse.page;await setup(p);
 assert.equal(await p.locator('.run-setup-tabs [role=tab]').count(),3);
 assert.equal(await p.locator('.setup-arrow').count(),4);assert.equal(await p.locator('.setup-neighbor-deck,.setup-neighbor-stake').count(),0);
 assert.equal(await p.locator('#setup-decks .deck-art').count(),1);assert.equal(await p.locator('#setup-stakes .stake-art').count(),1);
 await deck(p,'blue');await p.locator('#setup-deck-next').focus();await p.keyboard.press('Enter');assert.equal(await p.locator('#setup-deck-dots input:checked').inputValue(),'yellow');assert.equal(await p.evaluate(()=>document.activeElement.id),'setup-deck-next');await p.keyboard.press('Escape');await p.locator('#run-setup').waitFor({state:'hidden'});await setup(p);
 const heights=[];
 for(const id of ['blue','red','yellow','green','black','magic','nebula','ghost','abandoned','checkered','zodiac','painted','anaglyph','plasma','erratic']){await deck(p,id);await p.locator('#setup-decks .deck-art[data-art-status=loaded]').waitFor();assert.equal(await p.locator('#setup-decks .deck-art').getAttribute('data-art-source'),'balatro-game-atlas-1.0.1o');heights.push((await p.locator('.run-setup-panel').boundingBox()).height);}
 assert.ok(Math.max(...heights)-Math.min(...heights)<=1,'All 15 descriptions preserve panel size');
 await deck(p,'ghost');assert.equal(await p.locator('#setup-play').isDisabled(),true);await p.locator('#setup-seeded').check();assert.match(await p.locator('#setup-error').innerText(),/baraja/i);await p.locator('#setup-seeded').uncheck();await deck(p,'blue');
 await stake(p,'red');assert.equal(await p.locator('#setup-play').isDisabled(),true);await deck(p,'yellow');assert.equal(await p.locator('#setup-stake-dots input[value=red]').isChecked(),true);await stake(p,'white');assert.equal(await p.locator('#setup-play').isEnabled(),true);
 await p.locator('#setup-stake-dots input[value=white]').focus();await p.keyboard.press('ArrowLeft');assert.equal(await p.locator('#setup-stake-dots input[value=gold]').isChecked(),true);await p.keyboard.press('Home');assert.equal(await p.locator('#setup-stake-dots input[value=white]').isChecked(),true);
 await p.locator('#setup-tab-challenges').click();assert.match(await p.locator('#setup-summary').innerText(),/Aún no disponibles/);assert.equal(await p.locator('#setup-play').isDisabled(),true);
 await p.locator('#setup-tab-continue').click();assert.match(await p.locator('#setup-summary').innerText(),/Sin partida/);assert.equal(await p.locator('#setup-play').isDisabled(),true);
 await p.locator('#setup-tab-new').click();await p.locator('#setup-seeded').check();assert.equal(await p.locator('#setup-seed').isVisible(),true);assert.match(await p.locator('.setup-check').evaluate(e=>getComputedStyle(e,'::after').content),/✓/);await p.locator('#setup-seed').fill('REFERENCE42');
 const beforeBox=await p.locator('.run-setup-panel').boundingBox();await p.locator('#setup-seeded').uncheck();assert.equal(await p.locator('#setup-seed').isVisible(),false);assert.deepEqual(await p.locator('.run-setup-panel').boundingBox(),beforeBox);assert.equal(await raw(p),null);assert.equal(await writes(p),0);
 await p.locator('#setup-back').click();await p.locator('#run-setup').waitFor({state:'hidden'});await p.waitForFunction(()=>location.hash==='#menu');assert.equal(await p.locator('#run-setup').isVisible(),false);await setup(p);await p.keyboard.press('Escape');await p.locator('#run-setup').waitFor({state:'hidden'});await p.waitForFunction(()=>location.hash==='#menu');assert.equal(await writes(p),0);
 pass('three-tabs-15-decks-independent-stakes-seed-check-and-back-never-save');await browse.context.close();

 const seeded=await session(),n=seeded.page;await setup(n);await deck(n,'blue');await n.locator('#setup-seeded').check();await n.locator('#setup-play').click();assert.match(await n.locator('#setup-error').innerText(),/semilla/i);assert.equal(await n.locator('#confirmation').isVisible(),false);
 await n.locator('#setup-seed').fill('SYNTHETIC42');await start(n);
 const started=await current(n);assert.equal(started.state.schemaVersion,'0.2');assert.equal(started.state.seed,'SYNTHETIC42');assert.equal(started.initialState.seed,'SYNTHETIC42');assert.equal(started.state.observed.money.value,4);assert.equal(started.state.observed.resources.handsPerRound.value,5);assert.equal(started.state.observed.jokers.value.length,0);assert.equal(started.history.length,0);assert.equal(await writes(n),1);
 const saved=await raw(n);await n.reload();await n.waitForFunction(()=>location.hash==='#menu');assert.equal(await raw(n),saved);await setup(n);await n.locator('#setup-tab-continue').click();assert.match(await n.locator('#setup-summary').innerText(),/SYNTHETIC42/);await start(n);assert.equal(await raw(n),saved);assert.equal(await writes(n),0);
 pass('direct-atomic-seeded-start-blind-screen-reload-and-continue',{startingMoney:4,hands:5,seed:'manual reference, not RNG'});await seeded.context.close();

 const replacement=await session({saved:fixture}),r=replacement.page;await setup(r);await deck(r,'yellow');assert.equal(await r.locator('#setup-replace').isVisible(),true);assert.equal(await r.locator('#setup-replace').isChecked(),false);assert.equal(await r.locator('#setup-play').isDisabled(),true);await r.locator('#setup-replace').check();assert.equal(await r.locator('#setup-play').isEnabled(),true);await r.locator('#setup-replace').uncheck();assert.equal(await r.locator('#setup-play').isDisabled(),true);await r.locator('#setup-back').click();await r.locator('#run-setup').waitFor({state:'hidden'});assert.equal(await raw(r),fixture);assert.equal(await writes(r),0);
 await setup(r);assert.equal(await r.locator('#setup-play').isDisabled(),true);await r.locator('#setup-replace').check();await r.evaluate(()=>window.__setupFail=true);await r.locator('#setup-play').click();assert.equal(await raw(r),fixture);assert.match(await r.locator('#setup-error').innerText(),/guardar|almacenamiento/i);assert.equal(await r.locator('#confirmation').isVisible(),false);assert.equal(await r.locator('#run-setup').isVisible(),true);assert.equal(await writes(r),0);
 await r.evaluate(()=>window.__setupFail=false);await start(r);const replaced=await current(r);assert.equal(replaced.state.observed.money.value,14);assert.equal(replaced.state.observed.deckId.value,'yellow');assert.equal(Object.hasOwn(replaced.state,'seed'),false);assert.equal(await writes(r),1);
 pass('inline-replacement-cancel-quota-failure-and-direct-retry-preserve-old-copy');await replacement.context.close();

 const draft=await session({saved:fixture}),d=draft.page;await setup(d);await d.locator('#setup-tab-continue').click();await d.locator('#setup-play').click();await d.waitForFunction(()=>document.body.dataset.view==='table');await d.locator('#money').fill('26.5');await d.locator('.brand-link').click();await setup(d);assert.equal(await d.locator('#setup-play').isDisabled(),true);await d.locator('#setup-tab-continue').click();await d.locator('#setup-play').click();await d.waitForFunction(()=>document.body.dataset.view==='table');assert.equal(await d.locator('#money').inputValue(),'26.5');assert.equal(await raw(d),fixture);
 pass('continue-preserves-unsaved-draft-new-start-is-blocked');await draft.context.close();

 for(const viewport of [{width:844,height:390},{width:390,height:844},{width:568,height:320}]){
  const mobile=await session({viewport}),m=mobile.page;await setup(m);await deck(m,'blue');await m.locator('#setup-seeded').check();await m.locator('#setup-seed').fill('MOBILE');
  for(const selector of ['.run-setup-panel','#setup-tab-new','#setup-tab-continue','#setup-tab-challenges','#setup-seed','#setup-play','#setup-back']){const box=await m.locator(selector).boundingBox();assert.ok(box&&box.x>=-1&&box.y>=-1&&box.x+box.width<=viewport.width+1&&box.y+box.height<=viewport.height+1,'Unclipped setup control '+selector+' '+JSON.stringify({viewport,box}));}
  const [seedBox,playBox,backBox]=await m.locator('#setup-seed,#setup-play,#setup-back').evaluateAll(logicalBounds);
  assert.ok(seedBox.bottom<playBox.top,'Seed input remains fully above Play');assert.ok(playBox.bottom<backBox.top,'Back remains fully below Play');
  const before=await m.locator('#setup-deck-dots input:checked').inputValue();const stage=await m.locator('#setup-decks').boundingBox();
  if(viewport.height>viewport.width){await m.mouse.move(stage.x+stage.width/2,stage.y+stage.height*.6);await m.mouse.down();await m.mouse.move(stage.x+stage.width/2,stage.y+stage.height*.25,{steps:8});}
  else{await m.mouse.move(stage.x+stage.width*.6,stage.y+stage.height/2);await m.mouse.down();await m.mouse.move(stage.x+stage.width*.25,stage.y+stage.height/2,{steps:8});}
  await m.mouse.up();assert.notEqual(await m.locator('#setup-deck-dots input:checked').inputValue(),before,'Drag uses logical horizontal direction even when rotated');assert.equal(await raw(m),null);assert.equal(await writes(m),0);await m.screenshot({path:`${dir}/setup-${viewport.width}x${viewport.height}.png`});await mobile.context.close();
 }
 pass('landscape-and-rotated-mobile-fit-controls-and-normalize-drag',{physicalAndroid:false});
 const shot=await session(),s=shot.page;await setup(s);await deck(s,'blue');await s.locator('#setup-decks .deck-art[data-art-status=loaded]').waitFor();await s.locator('#setup-stakes .stake-art[data-art-status=loaded]').waitFor();await s.screenshot({path:dir+'/desktop.png'});await s.locator('#setup-seeded').check();await s.locator('#setup-seed').fill('BALATRO');await s.screenshot({path:dir+'/desktop-seeded.png'});await shot.context.close();
 assert.deepEqual(report.pageErrors,[]);report.status='passed';await writeFile(dir+'/report.json',JSON.stringify(report,null,2));console.log(`PASS run setup: ${report.cases.length} groups`);
}catch(error){report.status='failed';report.error=error.stack||String(error);await writeFile(dir+'/report.json',JSON.stringify(report,null,2));if(lastPage&&!lastPage.isClosed())await lastPage.screenshot({path:dir+'/failed.png'}).catch(()=>{});throw error;}
finally{await browser?.close();server.kill();}
