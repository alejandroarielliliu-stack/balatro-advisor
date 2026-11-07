import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {logicalBounds} from './ui-logical-bounds.mjs';
import {openWorkspace,reloadWorkspace} from './workspace-navigation.mjs';

// Presentation/input contracts. No game observation or physical Android claim.
const port='4226',origin=`http://127.0.0.1:${port}/`,dir='docs/evidencia/orientation';
const key='balatro-advisor.confirmed.v1';
await mkdir(dir,{recursive:true});
const source=JSON.parse(await readFile('examples/shop-purchase.json','utf8'));
const buyer=structuredClone(source);
buyer.runId='synthetic-orientation-shop';buyer.observed.money.value=25;
buyer.observed.shop.value.cardOffers=buyer.observed.shop.value.cardOffers.filter(offer=>offer.offerId==='o1');
buyer.observed.shop.value.ignoredOtherOffers=[];buyer.assumptions.probes=[];buyer.assumptions.roundPlans=[];
const draggable=JSON.parse(await readFile('examples/horizon-golden-state.json','utf8'));
const envelope=state=>JSON.stringify({schemaVersion:'confirmed-1',initialState:structuredClone(state),state:structuredClone(state),history:[]});
const report={date:new Date().toISOString(),url:origin,environment:'Chrome isolated profiles and touch/viewport emulation; not physical Android',gameObservation:false,physicalAndroid:false,cases:[],pageErrors:[]};
const pass=(id,details={})=>{report.cases.push({id,status:'passed',...details});console.log('PASS',id);};
const server=spawn(process.execPath,['dist/src/server.js'],{env:{...process.env,PORT:port},stdio:'pipe',windowsHide:true});
let browser,lastPage;
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Orientation server timeout')),15000);server.stdout.on('data',data=>{if(String(data).includes('Balatro Advisor local')){clearTimeout(timer);resolve();}});server.on('error',reject);server.on('exit',()=>{clearTimeout(timer);reject(Error('Orientation server stopped'));});});
 browser=await chromium.launch({channel:'chrome',headless:true});
 const session=async({viewport={width:844,height:390},saved=envelope(buyer),path='#menu',lock='absent',motion='off',deviceScaleFactor=1}={})=>{
  const context=await browser.newContext({viewport,hasTouch:true,isMobile:true,deviceScaleFactor,reducedMotion:'reduce'});
  await context.addInitScript(({key,saved,lock,motion})=>{
   if(saved!==null&&localStorage.getItem(key)===null)localStorage.setItem(key,saved);
   localStorage.setItem('balatro-advisor.menu-motion.v1',motion);
   window.__orientationWrites=[];window.__orientationLockCalls=[];window.__orientationFullscreenCalls=0;window.__orientationDraws=0;
   const set=Storage.prototype.setItem;Storage.prototype.setItem=function(name,value){window.__orientationWrites.push(name);return set.call(this,name,value);};
   const mock=lock==='absent'?undefined:orientation=>{window.__orientationLockCalls.push(orientation);return lock==='resolve'?Promise.resolve():Promise.reject(new DOMException('Synthetic orientation restriction','SecurityError'));};
   Object.defineProperty(screen.orientation,'lock',{configurable:true,value:mock});
   Element.prototype.requestFullscreen=function(){window.__orientationFullscreenCalls++;return Promise.reject(new DOMException('Unexpected fullscreen request','SecurityError'));};
   if(typeof WebGLRenderingContext!=='undefined'){const draw=WebGLRenderingContext.prototype.drawArrays;WebGLRenderingContext.prototype.drawArrays=function(...args){if(this.canvas.id==='menu-background')window.__orientationDraws++;return draw.apply(this,args);};}
  },{key,saved,lock,motion});
  const page=await context.newPage();lastPage=page;page.on('pageerror',error=>report.pageErrors.push(error.message));
  await openWorkspace(page,origin+path);await page.waitForFunction(()=>document.querySelector('#ownership')?.textContent.includes('Esta pestaña tiene'));
  await page.evaluate(()=>document.fonts.ready);await layout(page);return {page,context,saved};
 };
 const raw=page=>page.evaluate(key=>localStorage.getItem(key),key);
 const record=async page=>JSON.parse(await raw(page));
 const writes=page=>page.evaluate(()=>window.__orientationWrites.filter(name=>/balatro-advisor\.(?:confirmed|shop)/.test(name)));
 const unchanged=async(page,before,count=0)=>{assert.equal(await raw(page),before,'Rotation/consultation preserves exact state and history');assert.equal((await writes(page)).length,count,'Rotation/consultation never writes the run or shop');};
 async function layout(page){
  await page.waitForFunction(()=>{const frame=document.getElementById('app-viewport');return frame&&Math.abs(frame.clientWidth-Math.max(innerWidth,innerHeight))<=1&&Math.abs(frame.clientHeight-Math.min(innerWidth,innerHeight))<=1&&document.documentElement.dataset.uiRotated===String(innerHeight>innerWidth);});
 }
 const view=(page,screen)=>page.waitForFunction(expected=>document.body.dataset.view===expected,screen);
 const go=async(page,screen)=>{if(screen==='menu')await page.locator('.brand-link').click();else if(await page.locator('#menu-view').isVisible()){await page.locator('#menu-collection').click();await view(page,'collection');if(screen!=='collection')await page.locator(`[data-screen="${screen}"]`).click();}else await page.locator(`[data-screen="${screen}"]`).click();await view(page,screen);};
 const fit=async(page,selector)=>{
  const r=await page.locator(selector).boundingBox(),size=page.viewportSize();
  assert.ok(r&&r.x>=-1&&r.y>=-1&&r.x+r.width<=size.width+1&&r.y+r.height<=size.height+1,'Unclipped interactive surface '+selector+': '+JSON.stringify({r,size}));
  assert.equal(await page.locator(selector).evaluate(element=>element.scrollWidth<=element.clientWidth+1),true,'No inner horizontal overflow: '+selector);
 };
 const noOverflow=async page=>{
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,'Physical document fits the screen');
  assert.equal(await page.locator('#app-shell').evaluate(shell=>shell.scrollWidth<=shell.clientWidth+1),true,'Logical app is not silently clipped horizontally');
 };
 const screenshot=(page,name)=>page.screenshot({path:`${dir}/${name}.png`});

 const base=await session(),p=base.page;
 const reference=await p.locator('.menu-actions>a,.menu-actions>button').evaluateAll(logicalBounds);
 assert.equal(reference.length,3);await fit(p,'.menu-actions');await noOverflow(p);
 await p.setViewportSize({width:390,height:844});await layout(p);
 assert.equal(await p.getByText(/gira el dispositivo|girar el dispositivo/i).count(),0,'No rotate notice or extra mode');
 const rotated=await p.locator('.menu-actions>a,.menu-actions>button').evaluateAll(logicalBounds);
 for(let i=0;i<reference.length;i++)for(const property of ['left','top','width','height'])assert.ok(Math.abs(reference[i][property]-rotated[i][property])<=1.5,'Same horizontal menu layout after rotation: '+property);
 await fit(p,'.menu-actions');await noOverflow(p);await unchanged(p,base.saved);await screenshot(p,'menu-portrait-rotated');
 await p.setViewportSize({width:844,height:390});await layout(p);await screenshot(p,'menu-landscape');
 pass('same-horizontal-layout-in-native-and-portrait-viewports',{native:[844,390],portrait:[390,844],extraControls:0});

 await go(p,'evaluation');await p.getByRole('button',{name:'Añadir plantilla hipotética: dos parejas'}).click();
 const description=p.locator('input[id^="description-"]').first();await description.fill('Borrador conservado al girar');
 await go(p,'menu');await p.locator('#menu-options').click();await p.locator('#menu-settings').waitFor({state:'visible'});
 await p.locator('#menu-settings-close').focus();const route=await p.evaluate(()=>location.hash),focused=await p.evaluate(()=>document.activeElement.id);
 await p.setViewportSize({width:390,height:844});await layout(p);
 assert.equal(await p.locator('#menu-settings').evaluate(dialog=>dialog.open),true);assert.equal(await p.evaluate(()=>document.activeElement.id),focused);assert.equal(await p.evaluate(()=>location.hash),route);assert.equal(await description.inputValue(),'Borrador conservado al girar');await fit(p,'#menu-settings');await screenshot(p,'options-portrait-rotated');
 await p.setViewportSize({width:844,height:390});await layout(p);assert.equal(await p.locator('#menu-settings').evaluate(dialog=>dialog.open),true);await p.keyboard.press('Escape');
 for(const screen of ['table','evaluation','archive','collection']){
  await go(p,screen);await p.setViewportSize({width:390,height:844});await layout(p);await noOverflow(p);assert.equal(await p.evaluate(()=>document.body.dataset.view),screen);
  if(screen==='collection'){await p.waitForFunction(()=>document.querySelectorAll('.collection-card').length===150);await p.locator('[data-joker="j_joker"]').click();await p.locator('#joker-detail').waitFor({state:'visible'});await fit(p,'#joker-detail');await p.keyboard.press('Escape');}
  await screenshot(p,`${screen}-portrait-rotated`);await p.setViewportSize({width:844,height:390});await layout(p);await noOverflow(p);
 }
 await unchanged(p,base.saved);pass('all-screens-modal-focus-route-and-hypothetical-draft-survive-rotation');await base.context.close();

 // Sample the actual opening animation, not just the settled/reduced-motion UI.
 const animated=await session({viewport:{width:390,height:844},path:'#table'}),ap=animated.page;
 await ap.emulateMedia({reducedMotion:'no-preference'});
 await ap.evaluate(()=>{
  window.__dialogAnimation={samples:[],ended:false};
  document.addEventListener('animationstart',event=>{
   if(event.target.id!=='confirmation'||event.animationName!=='panel-arrival')return;
   const dialog=event.target;
   const sample=()=>{
    if(window.__dialogAnimation.ended)return;
    const matrix=new DOMMatrixReadOnly(getComputedStyle(dialog).transform),r=dialog.getBoundingClientRect();
    window.__dialogAnimation.samples.push({a:matrix.a,b:matrix.b,c:matrix.c,d:matrix.d,left:r.left,right:r.right,top:r.top,bottom:r.bottom});
    requestAnimationFrame(sample);
   };
   sample();
  });
  document.addEventListener('animationend',event=>{if(event.target.id==='confirmation'&&event.animationName==='panel-arrival')window.__dialogAnimation.ended=true;});
 });
 await ap.locator('.candidate-card[data-offer-id="o1"] .candidate-hero').click();await ap.locator('[data-shop-confirm="o1"]').click();
 await ap.waitForFunction(()=>window.__dialogAnimation.ended);
 const animationSamples=await ap.evaluate(()=>window.__dialogAnimation.samples);
 assert.ok(animationSamples.length>0,'Opening animation was sampled while active');
 for(const s of animationSamples){
  assert.ok(Math.abs(s.a)<0.001&&Math.abs(s.b-1)<0.001&&Math.abs(s.c+1)<0.001&&Math.abs(s.d)<0.001,'The full clockwise quarter-turn survives every sampled animation frame');
  assert.ok(s.left>=-1&&s.right<=391&&s.top>=-1&&s.bottom<=845,'Animated confirmation stays within the physical viewport');
 }
 await ap.keyboard.press('Escape');await unchanged(ap,animated.saved);await animated.context.close();
 pass('opening-animation-preserves-landscape-transform',{sampledFrames:animationSamples.length});

 const trading=await session({viewport:{width:390,height:844},path:'#table'}),q=trading.page;
 let before=await raw(q),count=(await writes(q)).length;
 await q.locator('#shop-recommendation').click();await q.locator('#shop-advice-dialog').waitFor({state:'visible'});await fit(q,'#shop-advice-dialog');await q.keyboard.press('Escape');await unchanged(q,before,count);
 await q.locator('.candidate-card[data-offer-id="o1"] .candidate-hero').click();await q.locator('[data-shop-confirm="o1"]').click();await q.locator('#confirmation').waitFor({state:'visible'});await fit(q,'#confirmation');await q.locator('#performed').check();
 await q.setViewportSize({width:844,height:390});await layout(q);assert.equal(await q.locator('#confirmation').evaluate(dialog=>dialog.open),true);assert.equal(await q.locator('#performed').isChecked(),true);await unchanged(q,before,count);
 await q.locator('#dialog-accept').click();await q.locator('#confirmation').waitFor({state:'hidden'});await q.waitForFunction(()=>document.querySelector('#money').value==='23');
 let purchased=await record(q);assert.equal(purchased.state.observed.money.value,23);assert.equal(purchased.state.observed.jokers.value.length,1);assert.equal(purchased.history.length,1);assert.equal(purchased.history[0].action.type,'buy');
 await q.setViewportSize({width:390,height:844});await layout(q);await q.locator('.inventory-panel .joker-portrait').first().click();await q.locator('#bay-dialog').waitFor({state:'visible'});await fit(q,'#bay-dialog');assert.match(await q.locator('#bay-sell').innerText(),/\$1/);await q.locator('#bay-sell').click();await q.locator('#confirmation').waitFor({state:'visible'});await fit(q,'#confirmation');await q.locator('#performed').check();await q.locator('#dialog-accept').click();await q.locator('#confirmation').waitFor({state:'hidden'});await q.waitForFunction(()=>document.querySelector('#money').value==='24');
 const sold=await record(q);assert.equal(sold.state.observed.money.value,24);assert.equal(sold.state.observed.jokers.value.length,0);assert.equal(sold.history.length,2);assert.equal(sold.history[1].action.type,'sell');assert.deepEqual(sold.state.observed.deck,buyer.observed.deck);assert.deepEqual(sold.state.assumptions,buyer.assumptions);
 before=await raw(q);await reloadWorkspace(q);await layout(q);await q.waitForFunction(()=>document.querySelector('#money')?.value==='24');assert.equal(await raw(q),before);await screenshot(q,'confirmed-sale-portrait-rotated');
 pass('portrait-purchase-sale-confirmation-and-reload',{moneyBefore:25,afterBuy:23,afterSale:24,historyEntries:2});await trading.context.close();

 const drag=await session({saved:envelope(draggable),viewport:{width:390,height:844},path:'#table'}),d=drag.page;
 const original=await raw(d),portraits=d.locator('.inventory-panel .joker-portrait');assert.equal(await portraits.count(),2);
 const order=()=>d.locator('.inventory-panel select[id^="joker-"]').evaluateAll(selects=>selects.map(select=>select.value));const originalOrder=await order();
 await portraits.first().scrollIntoViewIfNeeded();const a=await portraits.nth(0).boundingBox(),b=await portraits.nth(1).boundingBox();
 await d.mouse.move(a.x+a.width/2,a.y+a.height/2);await d.mouse.down();await d.mouse.move(b.x+b.width/2,b.y+b.height+4,{steps:12});await d.mouse.up();assert.deepEqual(await order(),[originalOrder[1],originalOrder[0]],'A physical vertical drag reorders along horizontal logical axis');assert.equal(await d.locator('#bay-dialog').isVisible(),false);await d.waitForFunction(key=>JSON.parse(localStorage.getItem(key)).state.revision===1,key);const observedOrder=await record(d),originalRecord=JSON.parse(original);assert.deepEqual(observedOrder.state.observed.jokers.value,[...originalRecord.state.observed.jokers.value].reverse());assert.equal(observedOrder.history.length,1);assert.equal(observedOrder.history[0].kind,'correction');for(const field of ['money','deck','shop','handBases'])assert.deepEqual(observedOrder.state.observed[field],originalRecord.state.observed[field]);const afterDragRaw=await raw(d);
 await d.locator('#app-shell').evaluate(shell=>shell.scrollTo(0,0));const cdp=await d.context().newCDPSession(d);
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:40,y:550}]});
 for(let x=70;x<=310;x+=40)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:550}]});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await d.waitForFunction(()=>document.getElementById('app-shell').scrollTop>0);await cdp.detach();
 assert.equal(await d.evaluate(()=>document.documentElement.dataset.uiRotated),'true');assert.equal(await raw(d),afterDragRaw);await noOverflow(d);await screenshot(d,'drag-and-touch-scroll-portrait');pass('portrait-pointer-reordering-observes-order-and-touch-scroll-preserves-record');await drag.context.close();

 for(const lock of ['absent','reject','resolve']){
  const test=await session({lock,viewport:{width:390,height:844}}),v=test.page;
  await v.locator('#menu-options').click();await v.locator('#menu-settings').waitFor({state:'visible'});await v.keyboard.press('Escape');
  const attempts=await v.evaluate(()=>window.__orientationLockCalls);
  if(lock==='absent')assert.deepEqual(attempts,[]);else{assert.ok(attempts.length>=1);assert.ok(attempts.every(value=>value==='landscape'));}
  assert.equal(await v.evaluate(()=>window.__orientationFullscreenCalls),0,'No fullscreen request or extra control is introduced');assert.equal(await v.evaluate(()=>document.documentElement.dataset.uiRotated),'true','A mocked API success without actual resize does not disable CSS rotation');await unchanged(v,test.saved);await fit(v,'.menu-actions');await test.context.close();
 }
 pass('native-lock-absent-rejected-and-resolved-keep-css-fallback-without-fullscreen');

 const rendering=await session({viewport:{width:800,height:1280},deviceScaleFactor:3,motion:'on'}),r=rendering.page;
 const canvas=await r.locator('#menu-background').evaluate(canvas=>({width:canvas.width,height:canvas.height,logicalWidth:canvas.clientWidth,logicalHeight:canvas.clientHeight,renderer:canvas.dataset.renderer}));
 assert.ok(canvas.logicalWidth>canvas.logicalHeight);assert.ok(Math.abs(canvas.width/canvas.height-canvas.logicalWidth/canvas.logicalHeight)<0.01,'Canvas resolution follows logical landscape, not its rotated physical rectangle');assert.ok(canvas.width*canvas.height<=800000,'Mobile fragment budget stays within 800k');
 if(canvas.renderer==='webgl'){await r.waitForTimeout(150);const start=await r.evaluate(()=>window.__orientationDraws);await r.waitForTimeout(1000);const frames=await r.evaluate(()=>window.__orientationDraws)-start;assert.ok(frames>0&&frames<=32,'Enabled renderer produces frames with a 30fps cap');report.renderFramesInOneSecond=frames;}
 await unchanged(r,rendering.saved);await rendering.context.close();pass('shader-keeps-logical-aspect-and-bounded-mobile-work',{canvas,physicalAndroid:false});
 assert.deepEqual(report.pageErrors,[]);report.status='passed';await writeFile(`${dir}/report.json`,JSON.stringify(report,null,2)+'\n');console.log(`PASS orientation: ${report.cases.length} browser groups`);
}catch(error){report.status='failed';report.error=error.stack||String(error);await writeFile(`${dir}/report.json`,JSON.stringify(report,null,2)+'\n');if(lastPage&&!lastPage.isClosed())await lastPage.screenshot({path:`${dir}/failed.png`,fullPage:true}).catch(()=>{});throw error;}
finally{await browser?.close();server.kill();}
