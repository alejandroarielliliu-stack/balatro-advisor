import {openWorkspace} from './workspace-navigation.mjs';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';

// UI-only contracts using the frozen DEC02 states. A screenshot and a successful
// browser assertion are not a user study, a Balatro observation or a game oracle.
const label=process.env.FRONTEND_CAPTURE_LABEL??'after';
assert.match(label,/^[a-z0-9-]+$/i,'Capture label is a simple file label');
const dir='docs/evidencia/frontend',port='4220',origin=process.env.FRONTEND_BASE_URL??`http://127.0.0.1:${port}/`;
await mkdir(dir,{recursive:true});
const bank=JSON.parse(await readFile('evaluation/fixtures/dec02-development.json','utf8'));
const fixture=id=>{const c=bank.cases.find(c=>c.id===id);assert.ok(c,id);return {schemaVersion:'confirmed-2',initialState:structuredClone(c.state),state:structuredClone(c.state),history:[]};};
const key='balatro-advisor.confirmed.v1';
const report={date:new Date().toISOString(),url:origin,label,environment:'Chrome isolated contexts; mobile viewport emulation, not physical Android',gameObservation:false,userStudy:false,cases:[],pageErrors:[]};
const pass=(id,data={})=>{report.cases.push({id,status:'passed',...data});console.log('PASS',id);};
const server=process.env.FRONTEND_BASE_URL?null:spawn(process.execPath,['dist/src/server.js'],{env:{...process.env,PORT:port},stdio:'pipe',windowsHide:true});
let browser,lastPage;
try{
 if(server)await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Frontend server timeout')),15000);server.stdout.on('data',data=>{if(String(data).includes('Balatro Advisor local')){clearTimeout(timer);resolve();}});server.on('error',reject);server.on('exit',()=>{clearTimeout(timer);reject(Error('Frontend server stopped'));});});
 browser=await chromium.launch({channel:'chrome',headless:true});
 const raw=page=>page.evaluate(k=>localStorage.getItem(k),key),writes=page=>page.evaluate(()=>window.__frontendWrites);
 const observe=page=>{lastPage=page;page.on('pageerror',error=>report.pageErrors.push(error.message));};
 const go=(page,screen)=>page.locator(`[data-screen="${screen}"]`).click();
 const ready=page=>page.waitForFunction(()=>document.querySelector('#ownership')?.textContent.includes('Esta pestaña tiene'));
 const shelf=page=>page.waitForFunction(()=>document.querySelectorAll('.bay-mini').length===150&&!document.querySelector('.candidate-pending'));
 const unchanged=async(page,before,count)=>{assert.equal(await raw(page),before,'Consultation preserves exact saved record');assert.equal(await writes(page),count,'Consultation never writes the confirmed record');};
 const noOverflow=async(page,context)=>{
  const geometry=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,items:[...document.querySelectorAll('body *')].filter(element=>{const r=element.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+1||r.left< -1);}).slice(0,12).map(element=>({tag:element.tagName,id:element.id,className:typeof element.className==='string'?element.className:'',right:element.getBoundingClientRect().right,width:element.getBoundingClientRect().width}))}));
  assert.equal(geometry.scroll<=geometry.width+1,true,context+' has horizontal page overflow: '+JSON.stringify(geometry));
  assert.equal(await page.locator('#app-shell').evaluate(shell=>shell.scrollWidth<=shell.clientWidth+1),true,context+' has horizontal overflow inside the app scroller');
 };
 const session=async(input,viewport={width:1440,height:1000})=>{
  const context=await browser.newContext({viewport,reducedMotion:'reduce'});
  await context.addInitScript(storageKey=>{window.__frontendWrites=0;const original=Storage.prototype.setItem;Storage.prototype.setItem=function(name,value){if(name===storageKey)window.__frontendWrites++;return original.call(this,name,value);};},key);
  const page=await context.newPage();observe(page);await openWorkspace(page,new URL('#table',origin).href);await ready(page);
  if(input){await go(page,'archive');await page.locator('#import-file').setInputFiles({name:'synthetic-frontend.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(input))});await page.locator('#dialog-accept').click();await page.locator('#confirmation').waitFor({state:'hidden'});await go(page,'table');}
  await shelf(page);return {context,page};
 };
 const openCatalogue=async page=>{const dock=page.locator('#catalogue-dock');if(await dock.evaluate(element=>element instanceof HTMLDetailsElement&&!element.open))await dock.locator(':scope > summary').click();await page.locator('#bay-search').waitFor({state:'visible'});};
 const closeByEscape=async(page,dialog,expectedFocus)=>{await page.keyboard.press('Escape');await page.locator(dialog).waitFor({state:'hidden'});assert.equal(await page.locator(expectedFocus).evaluate(element=>document.activeElement===element),true,'Dialog restores focus: '+dialog);};
 const screenshot=async(page,name,fullPage=false)=>{await page.screenshot({path:`${dir}/${label}-${name}.png`,fullPage});};

 const empty=await session(),e=empty.page;
 assert.equal(await raw(e),null);
 for(const width of [1440,390,360]){await e.setViewportSize({width,height:width===1440?1000:844});await noOverflow(e,`empty/${width}`);await screenshot(e,`empty-${width}`);}
 assert.equal(await raw(e),null);assert.equal(await writes(e),0);
 pass('empty-layout-is-responsive-and-does-not-create-a-run');await empty.context.close();

 const main=await session(fixture('DEC02-03')),p=main.page;const before=await raw(p),count=await writes(p);
 assert.equal(await p.locator('.inventory-panel .joker-editor').count(),5);
 assert.equal(await p.locator('#composition-overview [data-section]').count(),6);
 const catalogue=p.locator('#catalogue-dock');
 if(label!=='before'){assert.equal(await catalogue.evaluate(element=>element instanceof HTMLDetailsElement),true,'Catalogue uses explicit disclosure');assert.equal(await catalogue.evaluate(element=>element.open),false,'Catalogue does not dominate the initial table');}
 for(const width of [1440,390,360]){
  await p.setViewportSize({width,height:width===1440?1000:844});await p.evaluate(()=>document.getElementById('app-shell').scrollTo(0,0));await noOverflow(p,`table/${width}`);
  assert.equal(await p.locator('#composition-score').isVisible(),true);assert.equal(await p.locator('#shop-recommendation').isVisible(),true);
  await screenshot(p,String(width));await screenshot(p,`full-${width}`,true);
 }
 await unchanged(p,before,count);pass('same-full-inventory-fixture-at-desktop-and-two-mobile-widths',{fixture:'DEC02-03',widths:[1440,390,360]});

 await p.setViewportSize({width:1440,height:1000});
 const contrasts=await p.evaluate(()=>{
  const luminance=rgb=>rgb.map(n=>n/255).map(n=>n<=.04045?n/12.92:((n+.055)/1.055)**2.4).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);
  return ['#money','#run-leave-shop','#shop-recommendation','.store-advice-scope','.store-well-label','nav a[aria-current]'].map(selector=>{
   const element=document.querySelector(selector),style=getComputedStyle(element),text=style.color.match(/[\d.]+/g).map(Number).slice(0,3);let background;
   for(let ancestor=element;ancestor;ancestor=ancestor.parentElement){const rgb=getComputedStyle(ancestor).backgroundColor.match(/[\d.]+/g).map(Number);if(rgb.length===3||rgb[3]===1){background=rgb.slice(0,3);break;}}
   if(!background)throw Error('No opaque background found for contrast: '+selector);
   const a=luminance(text),b=luminance(background);return {selector,ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
  });
 });
 for(const sample of contrasts)assert.ok(sample.ratio>=4.5,'Normal-text contrast below4.5: '+JSON.stringify(sample));
 const capacity=await p.locator('.joker-capacity').boundingBox(),addButton=await p.locator('.inventory-tools button').boundingBox();assert.ok(capacity&&addButton&&capacity.x+capacity.width<=addButton.x,'Capacity remains separate from the add action');
 await unchanged(p,before,count);pass('key-text-contrast-and-distinct-inventory-capacity',{contrasts});
 await p.locator('#composition-score').focus();await p.keyboard.press('Enter');await p.locator('#composition-details').waitFor({state:'visible'});await closeByEscape(p,'#composition-details','#composition-score');
 const portrait='.inventory-panel .joker-editor:first-child .joker-portrait';await p.locator(portrait).focus();await p.keyboard.press('Enter');await p.locator('#bay-dialog').waitFor({state:'visible'});await closeByEscape(p,'#bay-dialog',portrait);
 await unchanged(p,before,count);pass('composition-and-owned-joker-keyboard-dialogs-restore-focus-without-writes');

 const height=await p.locator('.inventory-panel').evaluate(element=>element.getBoundingClientRect().height);
 await openCatalogue(p);await p.locator('#bay-search').fill('j_joker');await p.locator('[data-bay-joker="j_joker"]').waitFor({state:'visible'});
 await p.locator('[data-bay-joker="j_joker"]').focus();await p.keyboard.press('Enter');await p.locator('#bay-dialog').waitFor({state:'visible'});
 const replacement=p.getByLabel('Comodín que reemplazarías',{exact:true}),sellId=await replacement.locator('option').nth(1).getAttribute('value');
 assert.ok(sellId);await replacement.selectOption(sellId);assert.equal(await p.locator('#draft-status').isVisible(),false,'Hypothetical replacement must not dirty the real-state form');await unchanged(p,before,count);
 await replacement.selectOption('');assert.equal(await p.locator('#draft-status').isVisible(),false);await unchanged(p,before,count);
 await closeByEscape(p,'#bay-dialog','[data-bay-joker="j_joker"]');
 await p.locator('#bay-search').fill('');
 const chips=p.locator('.bay-filter-chip[data-filter-kind="rarity"]');await chips.nth(0).click();await chips.nth(1).click();assert.equal(await p.locator('.bay-filter-chip[data-filter-kind="rarity"][aria-pressed="true"]').count(),2);
 assert.equal(await chips.nth(0).getAttribute('aria-pressed'),'true');assert.equal(await chips.nth(1).getAttribute('aria-pressed'),'true');await chips.nth(0).click();await chips.nth(1).click();
 if(await catalogue.evaluate(element=>element instanceof HTMLDetailsElement&&element.open))await catalogue.locator(':scope > summary').click();
 assert.ok(Math.abs(await p.locator('.inventory-panel').evaluate(element=>element.getBoundingClientRect().height)-height)<1,'Browsing does not resize the owned rail');
 await unchanged(p,before,count);pass('catalogue-search-combinable-filters-and-stable-owned-rail');

 await p.locator('#shop-recommendation').focus();await p.keyboard.press('Enter');await p.locator('#shop-advice-dialog').waitFor({state:'visible'});await p.locator('#shop-advice-alternatives > summary').click();assert.ok(await p.locator('[data-advice-offer]').count()>=2);
 await closeByEscape(p,'#shop-advice-dialog','#shop-recommendation');await unchanged(p,before,count);pass('shop-consultation-opens-by-keyboard-and-preserves-the-real-run');

 await p.setViewportSize({width:1280,height:900});await p.evaluate(()=>document.documentElement.style.zoom='2');
 for(const screen of ['table','evaluation','archive','collection']){await go(p,screen);await noOverflow(p,`zoom200/${screen}`);}
 await go(p,'table');await screenshot(p,'zoom200');await p.evaluate(()=>document.documentElement.style.zoom='');await unchanged(p,before,count);pass('all-four-screens-reflow-at-200-percent');

 const reader=await main.context.newPage();observe(reader);await openWorkspace(reader,new URL('#table',origin).href);await reader.waitForFunction(()=>document.querySelector('#ownership')?.textContent.includes('Modo lectura'));await go(reader,'table');await shelf(reader);const readerBefore=await raw(reader),readerCount=await writes(reader);
 await reader.locator('#shop-recommendation').click();await reader.locator('#shop-advice-dialog').waitFor({state:'visible'});await reader.locator('#shop-advice-alternatives > summary').click();await reader.keyboard.press('Escape');await unchanged(reader,readerBefore,readerCount);assert.equal(readerCount,0);await unchanged(p,before,count);pass('read-only-tab-can-consult-without-saving');await reader.close();await main.context.close();

 const partial=await session(fixture('DEC02-06'),{width:390,height:844}),u=partial.page;const partialBefore=await raw(u),partialCount=await writes(u);await u.locator('#shop-recommendation').click();await u.locator('#shop-advice-dialog').waitFor({state:'visible'});
 assert.match(await u.locator('#shop-advice-scope').innerText(),/comparación parcial/i);assert.equal(await u.locator('#shop-advice-pending').isVisible(),true);assert.match(await u.locator('#shop-advice-pending').innerText(),/The Fool|Tarot/i);await noOverflow(u,'partial-mobile');assert.equal(await u.locator('#shop-advice-dialog').evaluate(element=>element.scrollWidth<=element.clientWidth+1),true);await screenshot(u,'partial-mobile');await unchanged(u,partialBefore,partialCount);pass('partial-advice-retains-the-decision-changing-limitation');await partial.context.close();

 assert.deepEqual(report.pageErrors,[]);report.status='passed';await writeFile(`${dir}/${label}-report.json`,JSON.stringify(report,null,2)+'\n');console.log(`PASS frontend redesign: ${report.cases.length} browser groups`);
}catch(error){report.status='failed';report.error=error.stack||String(error);await writeFile(`${dir}/${label}-report.json`,JSON.stringify(report,null,2)+'\n');if(lastPage&&!lastPage.isClosed())await lastPage.screenshot({path:`${dir}/${label}-failed.png`,fullPage:true}).catch(()=>{});throw error;}
finally{await browser?.close();server?.kill();}
