import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';

// Temporary browser contexts and an isolated origin. Numerical expectations
// below are independently worked editorial-policy examples, not hand scores,
// observed gameplay, game-engine output, confidence or winning probabilities.
const dir='docs/evidencia/composicion',origin='http://127.0.0.1:4195';
await mkdir(dir,{recursive:true});
const report={date:new Date().toISOString(),policy:'composition-1',environment:'Chrome temporary contexts; desktop and mobile viewport emulation',gameObservation:false,physicalAndroidTest:false,cases:[]};
const pass=(id,expected,observed)=>report.cases.push({id,expected,observed,status:'passed'});
const server=spawn(process.execPath,['dist/src/server.js'],{env:{...process.env,PORT:'4195'},stdio:'pipe',windowsHide:true});
await new Promise((resolve,reject)=>{
 const timeout=setTimeout(()=>reject(Error('Server did not start on4195')),15000);
 server.stdout.on('data',data=>{if(String(data).includes('Balatro Advisor local')){clearTimeout(timeout);resolve();}});
 server.on('error',error=>{clearTimeout(timeout);reject(error);});
 server.on('exit',()=>{clearTimeout(timeout);reject(Error('Server stopped before the test'));});
});
let browser;
try{
 browser=await chromium.launch({headless:true,channel:'chrome'});
 const context=await browser.newContext({viewport:{width:1440,height:1000}}),p=await context.newPage(),errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 const stored=page=>page.evaluate(()=>localStorage.getItem('balatro-advisor.confirmed.v1'));
 const go=async(page,screen)=>page.locator(`[data-screen="${screen}"]`).click();
 const load=async page=>{
  await page.goto(origin+'/');
  await page.waitForFunction(()=>document.querySelector('#ownership').textContent.includes('Esta pestaña tiene'));
  await page.waitForFunction(()=>document.querySelectorAll('.bay-mini').length===150&&document.querySelectorAll('#composition-overview [data-section]').length===6);
 };
 const addOwned=async(page,id)=>{
  await page.locator('#bay-search').fill(id);await page.locator(`[data-bay-joker="${id}"]`).click();
  await page.locator('#bay-add').click();await page.locator('#bay-dialog').waitFor({state:'hidden'});
 };
 const ownedRow=async(page,id)=>{
  const rows=page.locator('.inventory-panel .joker-editor');
  for(let i=0;i<await rows.count();i++)if(await rows.nth(i).locator('select[id^="joker-"]').inputValue()===id)return rows.nth(i);
  throw Error('Owned joker row not found: '+id);
 };
 const global=page=>page.locator('#composition-score');
 const bar=(page,id)=>page.locator(`#composition-overview [data-section="${id}"]`);
 const value=async locator=>{
  assert.equal(await locator.getAttribute('data-status'),'known');
  const text=await locator.getAttribute('data-score');assert.ok(text!==null&&text!=='');return Number(text);
 };
 const waitValue=(page,id,expected)=>page.waitForFunction(({id,expected})=>{
  const e=id==='global'?document.querySelector('#composition-score'):document.querySelector(`#composition-overview [data-section="${id}"]`);
  return e?.dataset.status==='known'&&e.dataset.score===String(expected);
 },{id,expected});
 const inspectReadOnly=async(page,button)=>{
  const before=await stored(page),draftBefore=await page.locator('#draft-status').evaluate(e=>e.hidden);
  await button.click();await page.locator('#composition-details').waitFor({state:'visible'});
  assert.ok(await page.locator('#composition-details p').count()>0);
  await page.locator('#composition-details').getByRole('button',{name:'Cerrar',exact:true}).click();
  assert.equal(await stored(page),before);assert.equal(await page.locator('#draft-status').evaluate(e=>e.hidden),draftBefore);
 };

 await load(p);
 assert.equal(await stored(p),null);assert.equal(await p.locator('#coverage').isChecked(),false);
 assert.equal(await p.locator('.scenario').count(),0);
 assert.equal(await p.locator('#composition-overview > p, #composition-overview > details, #composition-overview > ul').count(),0);
 assert.equal(await p.locator('.composition-content p, .composition-content details, .composition-content ul').count(),0);
 assert.equal(await p.locator('#composition-overview h2').filter({hasText:'Tu composición'}).count(),1);
 await inspectReadOnly(p,global(p));
 await p.locator('#money').fill('25');await p.locator('#ante').fill('1');await p.locator('#starting-deck').selectOption('blue');
 await addOwned(p,'j_joker');await waitValue(p,'global',65);
 // Blue's five hands give resources100×(0.4×5/4+0.2+0.25+0.15)=110.
 // Joker80, economy70, synergy0; no card requirement/growth -> N/A.
 assert.equal(await value(bar(p,'scoring')),80);assert.equal(await value(bar(p,'economy')),70);
 assert.equal(await value(bar(p,'synergy')),0);assert.equal(await value(bar(p,'resources')),110);
 for(const id of ['deck','growth']){assert.equal(await bar(p,id).getAttribute('data-status'),'not-applicable');assert.equal(await bar(p,id).locator('strong').innerText(),'—');}
 assert.equal(await global(p).locator('strong').innerText(),'65.0');
 await inspectReadOnly(p,bar(p,'economy'));
 assert.equal(await stored(p),null);assert.equal(await p.locator('.scenario').count(),0);
 pass('basic-score-and-bars','Only global index and six bars; Blue/Joker/$25 gives65.0 without coverage, save or hands',{global:65,scoring:80,economy:70,synergy:0,resources:110,plans:0,confirmedRun:null});

 await addOwned(p,'j_golden');await waitValue(p,'economy',97);await waitValue(p,'global',71.8);
 // Golden at ante1=(4+3+2)×10=90; economy70+0.3×90=97.
 // (80+97+0+110)/4=71.75, rounded1decimal. No cash payout is recorded.
 assert.equal(await p.locator('#money').inputValue(),'25');assert.equal(await stored(p),null);
 pass('economy','Golden changes economic preparation97/global71.8 without crediting projected money',{economy:97,global:71.8,money:25});

 await addOwned(p,'j_green_joker');
 await p.waitForFunction(()=>document.querySelector('#composition-score')?.dataset.status==='partial');
 assert.equal(await global(p).getAttribute('data-score'),'');assert.match(await global(p).innerText(),/≥|–/);
 assert.equal(await bar(p,'growth').getAttribute('data-status'),'partial');
 await p.locator('#composition-overview').screenshot({path:dir+'/partial.png'});
 const green=await ownedRow(p,'green_joker');await green.locator('.card-settings>summary').click();
 await green.locator('input[id^="green-"]').fill('20');await green.getByRole('button',{name:'Cerrar edición',exact:true}).click();
 await waitValue(p,'growth',92.5);
 // Green20: base80+bonus10=90; Blue's extra hand offers2.5 editorially early.
 await p.locator('#ante').fill('8');await waitValue(p,'growth',80);
 assert.equal(await green.locator('input[id^="green-"]').inputValue(),'20');
 await inspectReadOnly(p,bar(p,'growth'));assert.equal(await stored(p),null);
 pass('unknown-and-growth','Unknown counter stays partial; registered Green20 gives92.5 early,80 late without changing20',{unknownShown:true,early:92.5,late:80,registeredMult:20});

 await p.locator('[data-voucher="v_paint_brush"]').click();await p.locator('#voucher-apply').click();
 assert.equal(await p.locator('#size').inputValue(),'9');await waitValue(p,'resources',113.1);
 // Blue hands5 plus size9:100×(0.4×5/4+0.2+0.25×9/8+0.15)=113.125.
 await p.locator('#money').fill('26');await waitValue(p,'resources',113.1);
 await inspectReadOnly(p,bar(p,'resources'));assert.equal(await p.locator('#size').inputValue(),'9');
 assert.equal(await stored(p),null);
 pass('voucher-resources','Paint Brush is reflected in recorded size9 only once; unrelated refresh preserves113.1',{size:9,resources:113.1,confirmedRun:null});

 await addOwned(p,'j_mime');await waitValue(p,'synergy',0);
 const mime=await ownedRow(p,'mime');assert.match(await mime.locator('.fit-badge').getAttribute('title'),/Sin|soporte|retenci/i);
 await p.locator('#deck-editor>summary').click();
 await p.locator('.deck-card-editor').first().getByRole('combobox',{name:/^Mejora /}).selectOption('steel');
 assert.doesNotMatch(await p.locator('#deck-editor>summary').innerText(),/inicial/);
 await p.waitForFunction(()=>Number(document.querySelector('#composition-overview [data-section="synergy"]')?.dataset.score)>0);
 assert.ok(await value(bar(p,'deck'))>0);assert.equal(await p.locator('.scenario').count(),0);
 assert.equal(await stored(p),null);await inspectReadOnly(p,bar(p,'synergy'));
 await p.locator('#deck-editor>summary').click();
 pass('real-deck-material','Mime with no retained material has no prepared synergy; recorded Steel provides conditional support, not hand points',{synergy:await value(bar(p,'synergy')),deck:await value(bar(p,'deck')),plans:0,confirmedRun:null});

 const layouts=[];
 for(const width of [360,390,768,1440]){
  await p.setViewportSize({width,height:1000});await p.locator('#composition-overview').scrollIntoViewIfNeeded();
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  const visible=await p.locator('.composition-bar-heading').evaluateAll(rows=>rows.every(row=>{
   const box=row.getBoundingClientRect();return [...row.children].every(child=>{const b=child.getBoundingClientRect();return b.left>=box.left-1&&b.right<=box.right+1;});
  }));assert.equal(visible,true,'Bar label and value remain inside the bar at'+width);
  assert.equal(await p.locator('#composition-overview [data-section]').count(),6);
  layouts.push({width,overflow:false,labelsVisible:true});
 }
 await p.setViewportSize({width:1440,height:1000});await p.locator('#composition-overview').screenshot({path:dir+'/desktop.png'});
 await p.screenshot({path:dir+'/mesa-desktop.png',fullPage:true});
 await p.setViewportSize({width:390,height:844});await p.locator('#composition-overview').screenshot({path:dir+'/mobile.png'});
 await p.screenshot({path:dir+'/mesa-mobile.png',fullPage:true});
 pass('responsive','360–1440px keeps six readable bars without document overflow; viewport emulation only',layouts);

 // Second fresh context checks a clean persisted transcription and avoids
 // copying candidates, round plans or hypothetical final states into it.
 const second=await browser.newContext({viewport:{width:1440,height:1000}}),q=await second.newPage();q.on('pageerror',e=>errors.push(e.message));await load(q);
 const state=JSON.parse(await readFile('examples/shop-purchase.json','utf8'));
 const known=value=>({status:'known',source:'manual',value});
 const cards=[];for(const rank of ['2','3','4','5','6','7','8','9','10','A'])for(const suit of ['S','H','D','C'])cards.push({instanceId:rank+suit,rank,suit,edition:'base',enhancement:'none',seal:'none',extraChips:0});
 state.assumptions.probes=[];state.assumptions.roundPlans=[];state.observed.deckId=known('abandoned');state.observed.deck=known({cards});state.observed.money=known(25);
 state.observed.resources={handsPerRound:known(4),discardsPerRound:known(3),handSize:known(8),jokerSlots:known(5)};
 state.observed.nextBlind=known({ante:1,kind:'small',bossId:known('none'),target:known(300),reward:known(3)});
 state.observed.jokers=known(['photograph','hanging_chad'].map(id=>({instanceId:'observed:'+id,catalogId:id,edition:known('base'),stickers:known([]),sellValue:known(1),counters:{}})));
 await go(q,'archive');await q.locator('#import-file').setInputFiles({name:'observed-composition.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(state))});
 await q.locator('#confirmation').waitFor({state:'visible'});assert.equal(await stored(q),null);
 await q.locator('#dialog-accept').click();await go(q,'table');await waitValue(q,'deck',0);await waitValue(q,'synergy',0);
 const saved=await stored(q);assert.ok(saved);assert.equal(JSON.parse(saved).state.assumptions.roundPlans.length,0);
 await inspectReadOnly(q,global(q));await inspectReadOnly(q,bar(q,'synergy'));
 assert.equal(await q.locator('#draft-status').evaluate(e=>e.hidden),true);
 await q.locator('#deck-editor>summary').click();await q.getByRole('button',{name:'Añadir carta observada',exact:true}).click();
 await q.locator('.deck-card-editor').last().getByRole('combobox',{name:/^Rango /}).selectOption('Q');
 await q.waitForFunction(()=>Number(document.querySelector('#composition-overview [data-section="synergy"]')?.dataset.score)>0);
 assert.ok(await value(bar(q,'deck'))>0);assert.equal(await stored(q),saved);
 await q.reload();await q.waitForFunction(()=>document.querySelector('#ownership').textContent.includes('Esta pestaña tiene'));
 await go(q,'table');await waitValue(q,'deck',0);await waitValue(q,'synergy',0);
 assert.equal(await stored(q),saved);assert.equal(await q.locator('.scenario').count(),0);
 pass('confirmed-state-separation','Confirmed import persists; reading is clean; queen edit changes only draft; reload recovers40 no-figure cards',{savedCards:40,draftQueenPersisted:false,plans:0,readOnlyDialog:true});
 await second.close();assert.deepEqual(errors,[]);assert.equal(await stored(p),null);
 report.status='passed';report.pageErrors=errors;await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');
 console.log('PASS composition: score/six bars, basic inputs, economy, partial counters/growth, vouchers, actual deck, read-only details, persisted-state separation, responsive emulation');
}catch(error){
 report.status='failed';report.error=error.message;await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');throw error;
}finally{await browser?.close();server.kill();}
