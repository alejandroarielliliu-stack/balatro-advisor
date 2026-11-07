import {logicalBounds} from './ui-logical-bounds.mjs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createConfirmedStore,analysisBinding} from '../dist/src/storage/confirmed-store.js';

// UI contracts only. No game-rule oracle, actual gameplay or physical Android.
const port='4224',origin=`http://127.0.0.1:${port}/`,dir='docs/evidencia/menu';
const key='balatro-advisor.confirmed.v1',motionKey='balatro-advisor.menu-motion.v1';
await mkdir(dir,{recursive:true});
const bank=JSON.parse(await readFile('evaluation/fixtures/dec02-development.json','utf8'));
const initial=structuredClone(bank.cases.find(item=>item.id==='DEC02-03').state);
// A real journal envelope with nonempty history, generated only for isolated setup.
const memory=new Map(),setup=createConfirmedStore(()=>({getItem:name=>memory.get(name)??null,setItem:(name,value)=>memory.set(name,value)}));
assert.equal(setup.initialize(initial).ok,true);
const prepared=setup.correct({confirmationId:'menu-fixture-observation',confirmed:true,expected:analysisBinding(initial),updatedAt:'2026-11-06T23:00:00.000Z',patch:{money:{status:'known',source:'manual',value:initial.observed.money.value+1}},reason:'Synthetic observation for menu navigation persistence.'});
assert.equal(prepared.ok,true);assert.equal(prepared.value.history.length,1);
const fixture=memory.get(key);
const report={date:new Date().toISOString(),url:origin,environment:'Chrome isolated profiles, desktop/mobile/landscape viewport emulation; not physical Android',gameObservation:false,userStudy:false,cases:[],limitations:[],pageErrors:[]};
const pass=(id,data={})=>{report.cases.push({id,status:'passed',...data});console.log('PASS',id);};
const server=spawn(process.execPath,['dist/src/server.js'],{env:{...process.env,PORT:port},stdio:'pipe',windowsHide:true});
let browser,lastPage;
try{
 await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Menu test server timed out')),15000);server.stdout.on('data',data=>{if(String(data).includes('Balatro Advisor local')){clearTimeout(timeout);resolve();}});server.on('error',reject);server.on('exit',()=>{clearTimeout(timeout);reject(Error('Menu test server stopped'));});});
 browser=await chromium.launch({channel:'chrome',headless:true});
 const session=async({saved=null,path='',motion=null,reducedMotion='reduce',denyCanvas=false,viewport={width:1440,height:900}}={})=>{
  const context=await browser.newContext({viewport,reducedMotion});
  await context.addInitScript(({saved,key,motion,motionKey,denyCanvas})=>{
   if(saved!==null)localStorage.setItem(key,saved);
   if(motion!==null)localStorage.setItem(motionKey,motion);
   window.__menuWrites=[];window.__menuDraws=0;
   const originalWrite=Storage.prototype.setItem;
   Storage.prototype.setItem=function(name,value){window.__menuWrites.push({key:name,value});return originalWrite.call(this,name,value);};
   if(typeof WebGLRenderingContext!=='undefined'){
    const originalDraw=WebGLRenderingContext.prototype.drawArrays;
    WebGLRenderingContext.prototype.drawArrays=function(...args){if(this.canvas.id==='menu-background')window.__menuDraws++;return originalDraw.apply(this,args);};
   }
   if(denyCanvas){const getContext=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return this.id==='menu-background'&&['webgl','webgl2','experimental-webgl','2d'].includes(type)?null:getContext.call(this,type,...args);};}
  },{saved,key,motion,motionKey,denyCanvas});
  const page=await context.newPage();lastPage=page;page.on('pageerror',error=>report.pageErrors.push(error.message));
  await page.goto(origin+path);await page.waitForFunction(()=>document.querySelector('#ownership')?.textContent.includes('Esta pestaña tiene'));
  await page.evaluate(()=>document.fonts.ready);return {page,context};
 };
 const view=(page,name)=>page.waitForFunction(expected=>document.body.dataset.view===expected,name);
 // Feature navigation through the existing collection/header, without creating
 // a run through the setup screen. Startup/Back/Continue are exercised below.
 const fromMenu=async(page,screen)=>{await page.locator('#menu-collection').click();await view(page,'collection');if(screen!=='collection')await page.locator(`[data-screen="${screen}"]`).click();await view(page,screen);};
 const raw=page=>page.evaluate(key=>localStorage.getItem(key),key);
 const writes=page=>page.evaluate(()=>window.__menuWrites);
 const unchanged=async(page,expected)=>{assert.equal(await raw(page),expected,'Menu navigation preserves exact state and journal');assert.deepEqual((await writes(page)).filter(item=>item.key!==motionKey),[],'Menu never writes run/shop storage');};
 const openOptions=async page=>{await page.locator('#menu-options').click();await page.locator('#menu-settings').waitFor({state:'visible'});};
 const setMotion=async(page,value)=>{await openOptions(page);await page.locator(`input[name="menu-motion"][value="${value}"]`).check();await page.keyboard.press('Escape');await page.locator('#menu-settings').waitFor({state:'hidden'});};
 const draws=page=>page.evaluate(()=>window.__menuDraws);
 const screenshots=async(page,name)=>page.screenshot({path:`${dir}/${name}.png`});
 const empty=await session(),p=empty.page;
 await view(p,'menu');assert.equal(await p.locator('#menu-view').isVisible(),true);assert.equal(await p.locator('.app-header').isVisible(),false);assert.equal(await p.locator('#main').isVisible(),false);await unchanged(p,null);
 const menuHash=await p.evaluate(()=>location.hash);await p.locator('.skip-link').focus();await p.keyboard.press('Enter');await p.waitForFunction(()=>document.activeElement?.id==='menu-play');assert.equal(await p.evaluate(()=>location.hash),menuHash,'Menu skip link preserves route');await view(p,'menu');await unchanged(p,null);
 await p.locator('#menu-play').focus();await p.keyboard.press('Enter');await p.locator('#run-setup').waitFor({state:'visible'});assert.equal(await p.evaluate(()=>location.hash),'#setup');await view(p,'menu');assert.equal(await p.locator('#main').isVisible(),false);await unchanged(p,null);
 await p.locator('#setup-back').click();await p.locator('#run-setup').waitFor({state:'hidden'});assert.equal(await p.evaluate(()=>location.hash),'#menu');await p.waitForFunction(()=>document.activeElement?.id==='menu-play');await unchanged(p,null);
 await fromMenu(p,'table');assert.equal(await p.locator('#main').isVisible(),true);assert.equal(await p.locator('#run-new').isVisible(),true);await unchanged(p,null);
 await p.locator('.brand-link').click();await view(p,'menu');await p.waitForFunction(()=>document.activeElement?.id==='menu-play');await p.goBack();await view(p,'table');await p.goForward();await view(p,'menu');await unchanged(p,null);
 pass('root-play-setup-back-keyboard-brand-and-history-do-not-create-run');
 await p.locator('#menu-collection').click();await view(p,'collection');await p.waitForFunction(()=>document.querySelectorAll('.collection-card').length===150);await unchanged(p,null);
 await p.locator('.brand-link').click();await view(p,'menu');pass('collection-reuses-existing-150-cards-without-saving');
 await p.locator('#menu-options').focus();await p.keyboard.press('Enter');await p.locator('#menu-settings').waitFor({state:'visible'});assert.equal(await p.locator('#menu-settings').evaluate(dialog=>dialog.contains(document.activeElement)),true);await p.keyboard.press('Escape');await p.locator('#menu-settings').waitFor({state:'hidden'});await p.waitForFunction(()=>document.activeElement?.id==='menu-options');await unchanged(p,null);
 await fromMenu(p,'table');await p.locator('.brand-link').click();await view(p,'menu');await openOptions(p);await p.goBack();await view(p,'table');await p.locator('#menu-settings').waitFor({state:'hidden'});await unchanged(p,null);await p.locator('.brand-link').click();await view(p,'menu');
 pass('options-keyboard-escape-focus-and-back-close-modal');
 assert.equal(await p.locator('#menu-view').getAttribute('data-motion-preference'),'system');assert.equal(await p.locator('#menu-view').getAttribute('data-motion'),'off');const reduceDraws=await draws(p);await p.waitForTimeout(350);assert.equal(await draws(p),reduceDraws,'Reduced motion has no continuing WebGL draws');
 await setMotion(p,'on');assert.equal(await p.evaluate(key=>localStorage.getItem(key),motionKey),'on');
 const renderer=await p.locator('#menu-background').getAttribute('data-renderer');
 if(renderer==='webgl'){
  const clip={x:20,y:80,width:100,height:100};
  const firstDraws=await draws(p),movingBefore=await p.screenshot({clip});await p.waitForTimeout(350);const movingAfter=await p.screenshot({clip});assert.ok(await draws(p)>firstDraws,'Enabled motion actually draws new frames');assert.equal(movingBefore.equals(movingAfter),false,'Liquid pixels change while enabled');
  await setMotion(p,'off');await p.mouse.move(0,0);await p.waitForTimeout(180);const stoppedDraws=await draws(p),stillBefore=await p.screenshot({clip});await p.waitForTimeout(350);const stillAfter=await p.screenshot({clip});assert.equal(await draws(p),stoppedDraws,'Disabled motion does not draw new frames');assert.equal(stillBefore.equals(stillAfter),true,'Background pixels stay fixed while disabled');
  await setMotion(p,'on');await fromMenu(p,'table');await p.waitForTimeout(120);const outside=await draws(p);await p.waitForTimeout(350);assert.equal(await draws(p),outside,'Leaving the menu pauses animation');await p.locator('.brand-link').click();await view(p,'menu');
  pass('webgl-actual-frame-pixels-move-stop-and-pause-outside-menu',{renderer,sample:'100x100 background-only crop; no reference-image baseline'});
 }else report.limitations.push(`WebGL motion/pixel checks not executed: renderer=${renderer}`);
 await setMotion(p,'off');await p.reload();await view(p,'menu');assert.equal(await p.locator('#menu-view').getAttribute('data-motion-preference'),'off');assert.equal(await p.locator('#menu-view').getAttribute('data-motion'),'off');
 await setMotion(p,'system');assert.equal(await p.evaluate(key=>localStorage.getItem(key),motionKey),'system');await p.emulateMedia({reducedMotion:'no-preference'});await p.waitForFunction(()=>document.querySelector('#menu-view').dataset.motion==='on');await p.emulateMedia({reducedMotion:'reduce'});await p.waitForFunction(()=>document.querySelector('#menu-view').dataset.motion==='off');await unchanged(p,null);
 pass('motion-system-on-off-persist-and-follow-reduced-motion',{renderer});
 const sizes=[{width:1440,height:900},{width:390,height:844},{width:360,height:640},{width:844,height:390},{width:320,height:568}];
 for(const size of sizes){
  await p.setViewportSize(size);await p.mouse.move(0,0);await p.waitForTimeout(180);
  const geometry=await p.evaluate(()=>{const rect=element=>{const r=element.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,nav:rect(document.querySelector('.menu-actions')),controls:[...document.querySelectorAll('.menu-actions>a,.menu-actions>button')].map(element=>({id:element.id,...rect(element),hit:element.contains(document.elementFromPoint(element.getBoundingClientRect().x+element.getBoundingClientRect().width/2,element.getBoundingClientRect().y+element.getBoundingClientRect().height/2))}))};});
  assert.ok(geometry.scrollWidth<=geometry.width+1,`No horizontal overflow at ${size.width}`);const [logicalNav]=await p.locator('.menu-actions').evaluateAll(logicalBounds);const logicalWidth=await p.locator('#app-viewport').evaluate(frame=>frame.clientWidth);assert.ok(Math.abs((logicalNav.left+logicalNav.right)/2-logicalWidth/2)<=1,'Navigation is centered in the horizontal layout');
  for(const control of geometry.controls){assert.ok(control.left>=0&&control.top>=0&&control.right<=geometry.width+1&&control.bottom<=geometry.height+1,'Visible unclipped control: '+JSON.stringify({size,control}));assert.ok(control.width>=44&&control.height>=44,'Touch target is at least 44px');assert.equal(control.hit,true,'Control center remains clickable');}
  await screenshots(p,`menu-${size.width}x${size.height}`);
 }
 await openOptions(p);await p.locator('#menu-settings-close').scrollIntoViewIfNeeded();assert.equal(await p.locator('#menu-settings-close').isVisible(),true);await screenshots(p,'options-320');await p.keyboard.press('Escape');await unchanged(p,null);
 pass('five-responsive-viewports-centered-touch-controls-and-options',{sizes,physicalAndroid:false});await empty.context.close();
 const saved=await session({saved:fixture}),q=saved.page;await unchanged(q,fixture);
 await q.locator('#menu-play').click();await q.locator('#run-setup').waitFor({state:'visible'});await q.locator('#setup-tab-continue').click();await unchanged(q,fixture);await q.locator('#setup-play').click();await view(q,'table');assert.equal(await q.locator('#money').inputValue(),String(prepared.value.state.observed.money.value));assert.equal(JSON.parse(await raw(q)).history.length,1);await q.locator('.brand-link').click();await view(q,'menu');await setMotion(q,'off');await q.locator('#menu-collection').click();await view(q,'collection');await q.locator('.brand-link').click();await view(q,'menu');await unchanged(q,fixture);await saved.context.close();
 pass('existing-state-and-nonempty-journal-byte-for-byte-unchanged');
 for(const screen of ['table','collection','evaluation','archive']){
  const deep=await session({saved:fixture,path:'#'+screen});await view(deep.page,'menu');assert.equal(await deep.page.evaluate(()=>location.hash),'#menu','Cold deep links still open the main menu');assert.equal(await deep.page.locator('#menu-view').isVisible(),true);assert.equal(await deep.page.locator('#main').isVisible(),false);await unchanged(deep.page,fixture);
  await fromMenu(deep.page,screen);assert.equal(await deep.page.locator(`[data-page="${screen}"]`).first().isVisible(),true);assert.equal(await deep.page.locator('#menu-view').isVisible(),false);
  const hash=await deep.page.evaluate(()=>location.hash);await deep.page.locator('.skip-link').focus();await deep.page.keyboard.press('Enter');await deep.page.waitForFunction(()=>document.activeElement?.id==='main');assert.equal(await deep.page.evaluate(()=>location.hash),hash,'Workspace skip link preserves the internally selected route');await view(deep.page,screen);
  await unchanged(deep.page,fixture);await deep.context.close();
 }
 pass('four-cold-deep-links-open-menu-and-internal-routes-preserve-record');
 const fallback=await session({denyCanvas:true}),f=fallback.page;await view(f,'menu');assert.equal(await f.locator('#menu-background').getAttribute('data-renderer'),'css');assert.equal(await f.locator('#menu-view').evaluate(element=>getComputedStyle(element).backgroundImage!=='none'),true);const fallbackDraws=await draws(f);await setMotion(f,'on');await f.waitForTimeout(350);assert.equal(await draws(f),fallbackDraws);await screenshots(f,'menu-css-fallback');await f.locator('#menu-play').click();await f.locator('#run-setup').waitFor({state:'visible'});await unchanged(f,null);await f.locator('#setup-back').click();await f.locator('#run-setup').waitFor({state:'hidden'});await fromMenu(f,'table');await f.locator('.brand-link').click();await view(f,'menu');await f.locator('#menu-collection').click();await view(f,'collection');await unchanged(f,null);await fallback.context.close();
 pass('denied-webgl-and-2d-use-static-css-with-working-navigation');
 assert.deepEqual(report.pageErrors,[]);report.status='passed';await writeFile(`${dir}/report.json`,JSON.stringify(report,null,2)+'\n');console.log(`PASS main menu: ${report.cases.length} browser groups`);
}catch(error){report.status='failed';report.error=error.stack||String(error);await writeFile(`${dir}/report.json`,JSON.stringify(report,null,2)+'\n');if(lastPage&&!lastPage.isClosed())await lastPage.screenshot({path:`${dir}/failed.png`,fullPage:true}).catch(()=>{});throw error;}
finally{await browser?.close();server.kill();}
