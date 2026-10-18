import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createNewRun} from '../dist/src/run/start.js';

// Literal synthetic observations, not screenshots or observations of Balatro.
// H2 and the advisor under test never generate the expectations below.
const port='4209',remote=process.env.PACK_CHOICES_BASE_URL;
const origin=new URL(remote??'http://127.0.0.1:'+port+'/');
if(!origin.pathname.endsWith('/'))origin.pathname+='/';
const key='balatro-advisor.confirmed.v1',dir='docs/evidencia/pack-choices'+(remote?'/public':'');
await mkdir(dir,{recursive:true});
const known=value=>({status:'known',source:'manual',value});
// Literal fresh sale observations for only the fixtures used in this harness:
// Joker $1, Steel Joker $3, the four suit jokers/Half $2, Negative Half $5.
const owned=(catalogId='joker',instanceId='owned-joker',edition='base')=>({instanceId,catalogId,edition:known(edition),stickers:known([]),sellValue:known(catalogId==='joker'?1:catalogId==='steel_joker'?3:catalogId==='half_joker'&&edition==='negative'?5:2),counters:{}});
const joker=(catalogId,entryId,edition='base')=>({entryId,kind:'joker',joker:owned(catalogId,'pack-'+entryId,edition)});
const planet=(catalogId,entryId)=>({entryId,kind:catalogId==='c_black_hole'?'unsupported':'planet',catalogId});
function fixture({pack='buffoon-normal',entries=[joker('joker','ordinary'),joker('steel_joker','steel')],jokers=[],steel=0}={}){
 const created=createNewRun({runId:'synthetic-pack-choice',updatedAt:'2026-10-17T20:00:00Z',deckId:'blue',profileConfirmed:true});
 assert.equal(created.ok,true,'The independent run fixture must be structurally valid');
 const state=created.value;
 state.phase='open_pack';state.phaseData={packId:known('observed-pack'),returnTo:'shop',context:{offerId:'observed-pack',shopId:'choice-shelf',catalogId:pack,paid:pack.endsWith('mega')?8:4,remainingChoices:pack.endsWith('mega')?2:1,contents:known(entries),selectedEntryIds:[],shopOrigin:known({ante:1,kind:'small'})}};
 state.observed.money=known(pack.endsWith('mega')?12:16);state.observed.jokers=known(jokers);
 state.observed.shop=known({shopId:'choice-shelf',cardOffers:[],voucherOffers:[],packOffers:[],ignoredOtherOffers:[]});
 if(steel)state.observed.deck.value.cards=state.observed.deck.value.cards.map((card,index)=>index<steel?{...card,enhancement:'steel'}:card);
 state.assumptions.probes=[];state.assumptions.roundPlans=[];
 return {schemaVersion:'confirmed-2',initialState:structuredClone(state),state,history:[]};
}
const modules=[
 'dist/src/ui/app.js','dist/src/ui/pack-view.js','dist/src/ui/pack-choice-view.js','dist/src/advisor/pack-choices.js',
 'dist/src/advisor/quick-fit.js','dist/src/advisor/fit-index.js','dist/src/advisor/composition.js',
 'dist/src/advisor/composition-policy.js','dist/src/advisor/composition-signals.js',
 'dist/src/rules/pack-shop.js','dist/src/rules/planet.js','dist/src/rules/shop.js','dist/src/rules/core.js',
 'dist/src/state/pack-contract.js','dist/src/state/model.js','dist/src/state/validation.js',
 'dist/src/storage/confirmed-store.js','dist/src/storage/confirmed-record.js','dist/src/rules/engine-evidence.js'
];
const report={date:new Date().toISOString(),url:origin.href,commit:process.env.PACK_CHOICES_COMMIT??null,workflow:process.env.PACK_CHOICES_WORKFLOW??null,
 environment:'Chrome temporary profiles; desktop and 390px mobile emulation',gameObservation:false,physicalAndroid:false,criticalModules:modules.length,hashes:[],cases:[],pageErrors:[]};
const pass=(id,expected,observed)=>{report.cases.push({id,expected,observed,status:'passed'});console.log('PASS',id);};
const server=remote?null:spawn(process.execPath,['dist/src/server.js'],{env:{...process.env,PORT:port},stdio:'pipe',windowsHide:true});
let browser,lastPage;
try{
 if(server)await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Pack choices server timeout')),15000);server.stdout.on('data',data=>{if(String(data).includes('Balatro Advisor local')){clearTimeout(timer);resolve();}});server.on('error',error=>{clearTimeout(timer);reject(error);});server.on('exit',()=>{clearTimeout(timer);reject(Error('Pack choices server stopped'));});});
 if(remote)for(const file of ['index.html',...modules,'web/mesa.css']){
  const local=await readFile('out/'+file),url=new URL(file,origin);url.searchParams.set('pack-choices',String(Date.now()));
  const response=await fetch(url);assert.equal(response.status,200,file);
  const bytes=Buffer.from(await response.arrayBuffer()),hash=data=>createHash('sha256').update(data).digest('hex');
  assert.equal(hash(bytes),hash(local),'Public artifact differs from out/'+file);report.hashes.push({file,sha256:hash(bytes)});
 }
 browser=await chromium.launch({channel:'chrome',headless:true});
 const raw=page=>page.evaluate(storageKey=>localStorage.getItem(storageKey),key);
 const record=async page=>JSON.parse(await raw(page));
 const writes=page=>page.evaluate(()=>window.__packChoiceWrites);
 const go=(page,screen)=>page.locator(`[data-screen="${screen}"]`).click();
 const ready=page=>page.waitForFunction(()=>document.querySelector('#ownership')?.textContent.includes('Esta pestaña tiene'));
 const panel=page=>page.locator('#pack-comparison');
 const status=page=>page.locator('#pack-choice-status');
 const info=(page,id)=>page.locator(`[data-pack-compare-entry="${id}"]`);
 const detailsText=async(page,id)=>{const detail=info(page,id);if(await detail.evaluate(element=>element.tagName==='DETAILS'&&!element.open))await detail.locator('summary').first().click();return detail.innerText();};
 const rating=(page,id)=>page.locator(`[data-pack-rating="${id}"]`);
 const watch=page=>{lastPage=page;page.on('pageerror',error=>report.pageErrors.push(error.message));};
 const session=async(input=fixture(),viewport={width:1440,height:1000})=>{
  const context=await browser.newContext({viewport});
  await context.addInitScript(storageKey=>{window.__packChoiceWrites=0;const original=Storage.prototype.setItem;Storage.prototype.setItem=function(name,value){if(name===storageKey)window.__packChoiceWrites++;return original.call(this,name,value);};},key);
  const page=await context.newPage();watch(page);await page.goto(origin.href);await ready(page);await go(page,'archive');
  await page.locator('#import-file').setInputFiles({name:'synthetic-pack-choice.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(input))});
  await page.locator('#dialog-accept').click();await page.locator('#confirmation').waitFor({state:'hidden'});await go(page,'table');await panel(page).waitFor({state:'visible'});return {context,page};
 };
 const reload=async page=>{await page.reload();await ready(page);await go(page,'table');await panel(page).waitFor({state:'visible'});};
 const finish=async page=>{await page.locator('#performed').check();await page.locator('#dialog-accept').click();await page.locator('#confirmation').waitFor({state:'hidden'});};

 // 1. Opening advice, expanding reasons and refreshing never record a choice.
 const first=await session(),p=first.page;let before=await raw(p),count=await writes(p);
 assert.equal(await rating(p,'ordinary').count(),1);assert.equal(await rating(p,'steel').count(),1);
 assert.notEqual((await rating(p,'ordinary').innerText()).trim(),'');assert.notEqual((await rating(p,'steel').innerText()).trim(),'');
 assert.match(await panel(p).innerText(),/heuríst|índice|encaje/i);assert.doesNotMatch(await panel(p).innerText(),/\d\s*%/);
 for(const summary of await panel(p).locator('details>summary').all())await summary.click();
 assert.equal(await raw(p),before);assert.equal(await writes(p),count);await reload(p);assert.equal(await raw(p),before);assert.equal(await writes(p),0);
 assert.equal((await record(p)).state.observed.jokers.value.length,0);assert.equal((await record(p)).history.length,0);
 await p.locator('#pack-panel').screenshot({path:dir+'/desktop-buffoon.png'});
 pass('buffoon-visible-readonly-repeat-and-reload',{ratings:2,choiceWrites:0,jokers:0,history:0},{ratings:2,choiceWrites:0,jokers:0,history:0});

 // 2. The very same Steel Joker sees the actual deck, not an invented combo.
 const absent=await detailsText(p,'steel'),absentRating=await rating(p,'steel').innerText();assert.match(absent,/sin acero|0\s*(?:\/52\s*)?(?:cartas de\s*)?acero|no aumenta su multiplicador/i);
 const supported=await session(fixture({steel:26})),s=supported.page,supportedText=await detailsText(s,'steel');
 assert.match(supportedText,/26/);assert.match(supportedText,/acero/i);assert.notEqual(await rating(s,'steel').innerText(),absentRating);
 assert.equal((await record(s)).state.observed.deck.value.cards.filter(card=>card.enhancement==='steel').length,26);
 pass('same-joker-real-deck-material',{absentSteel:0,supportedSteel:26,ratingChanges:true},{absentSteel:0,supportedSteel:26,ratingChanges:true});await supported.context.close();

 // 3. The normal action flow still requires an explicit real-action confirmation.
 await p.locator('[data-pack-choose="ordinary"]').click();await p.locator('#confirmation').waitFor({state:'visible'});
 assert.equal(await raw(p),before);await p.locator('#dialog-accept').click();assert.equal(await raw(p),before);assert.match(await p.locator('#dialog-error').innerText(),/confirm/i);
 await p.locator('#dialog-cancel').click();assert.equal(await raw(p),before);
 await p.locator('[data-pack-choose="ordinary"]').click();await finish(p);let saved=await record(p);
 assert.equal(saved.state.phase,'shop');assert.equal(saved.state.observed.money.value,16);assert.equal(saved.state.observed.jokers.value.length,1);
 assert.equal(saved.state.observed.jokers.value[0].catalogId,'joker');assert.equal(saved.history.length,1);assert.equal(saved.history[0].action.type,'choose_pack_item');
 assert.equal(saved.state.revision,JSON.parse(before).state.revision+1);
 pass('advice-keeps-explicit-confirmation-and-t09b',{money:16,phase:'shop',jokers:['joker'],recordedActions:1},{money:16,phase:'shop',jokers:['joker'],recordedActions:1});await first.context.close();

 // 4. Celestial intent is an unsaved evaluation preference. Mercury's result
 // is the independently documented Pair base 10×2 -> 25×3, not a hand score.
 const celestial=await session(fixture({pack:'celestial-normal',entries:[planet('c_mercury','mercury'),planet('c_pluto','pluto'),planet('c_mars','mars')]})),c=celestial.page;
 before=await raw(c);count=await writes(c);assert.equal(await c.locator('#pack-intended-hand').inputValue(),'');
 assert.equal(await status(c).getAttribute('data-kind'),'abstain');
 await c.locator('#pack-intended-hand').selectOption('pair');assert.notEqual(await status(c).getAttribute('data-kind'),'abstain');
 assert.match(await status(c).innerText(),/Mercurio|Mercury|Pareja/i);assert.match(await rating(c,'mercury').innerText(),/10\s*×\s*2\s*→\s*25\s*×\s*3/);
 assert.match(await detailsText(c,'mercury'),/base|mano concreta|puntuación de (?:una|la) mano/i);assert.doesNotMatch(await c.locator('#pack-panel').innerText(),/\b75\s*(?:puntos|fichas finales|puntuación final)/i);
 assert.equal(await raw(c),before);assert.equal(await writes(c),count);assert.deepEqual((await record(c)).state.observed.handBases.value,{preset:'all-standard-level1'});
 await c.locator('#pack-panel').screenshot({path:dir+'/desktop-celestial.png'});await reload(c);assert.equal(await c.locator('#pack-intended-hand').inputValue(),'');assert.equal(await raw(c),before);
 pass('celestial-intent-unsaved-and-independent-pair-base',{withoutIntent:'abstain',pairBaseBefore:[10,2],pairBaseAfter:[25,3],writes:0,actualBasesChanged:false},{withoutIntent:'abstain',pairBaseBefore:[10,2],pairBaseAfter:[25,3],writes:0,actualBasesChanged:false});await celestial.context.close();

 // 5. An unevaluated competing Black Hole prevents a whole-pack winner;
 // supported choices still expose their exact changes and remain usable.
 const black=await session(fixture({pack:'celestial-normal',entries:[planet('c_black_hole','black'),planet('c_mercury','mercury'),planet('c_pluto','pluto')]})),b=black.page;
 before=await raw(b);await b.locator('#pack-intended-hand').selectOption('pair');assert.equal(await status(b).getAttribute('data-kind'),'abstain');
 assert.match(await b.locator('#pack-panel').innerText(),/Black Hole|Agujero negro/i);assert.match(await b.locator('#pack-panel').innerText(),/pendiente|compatible|implementad|cobertura|condicion/i);
 assert.equal(await b.locator('[data-pack-choose="black"]').isDisabled(),true);assert.equal(await b.locator('[data-pack-choose="mercury"]').isEnabled(),true);assert.equal(await raw(b),before);
 assert.match(await rating(b,'mercury').innerText(),/10\s*×\s*2\s*→\s*25\s*×\s*3/);
 pass('black-hole-abstention-supported-choice-stays-legal',{recommendation:'abstain',blackSelectable:false,mercurySelectable:true,writes:0},{recommendation:'abstain',blackSelectable:false,mercurySelectable:true,writes:0});await black.context.close();

 // 6. A confirmed first Mega choice changes the actual context; advice then
 // compares the remaining entries, without inventing or acquiring a second.
 const mega=await session(fixture({pack:'buffoon-mega',entries:[joker('joker','first'),joker('steel_joker','second'),joker('greedy_joker','third'),joker('lusty_joker','fourth')]})),m=mega.page;
 before=await raw(m);await m.locator('[data-pack-choose="first"]').click();await finish(m);saved=await record(m);
 assert.equal(saved.state.phase,'open_pack');assert.equal(saved.state.phaseData.context.remainingChoices,1);assert.deepEqual(saved.state.phaseData.context.selectedEntryIds,['first']);
 assert.equal(saved.state.observed.jokers.value.length,1);assert.equal(saved.state.observed.money.value,12);assert.equal(await info(m,'first').count(),0);assert.equal(await info(m,'second').count(),1);
 assert.equal(saved.history.length,1);assert.equal(saved.state.revision,JSON.parse(before).state.revision+1);before=await raw(m);await reload(m);assert.equal(await raw(m),before);
 pass('mega-first-choice-refreshes-remaining-only',{remaining:1,selected:['first'],jokers:1,money:12,history:1},{remaining:1,selected:['first'],jokers:1,money:12,history:1});await mega.context.close();

 // 7. H2 capacity remains authoritative for advice and acquisition. A Negative
 // Joker provides its slot; a normal choice cannot silently sell an owned card.
 const five=['joker','greedy_joker','lusty_joker','wrathful_joker','gluttenous_joker'].map((id,index)=>owned(id,'full-'+index));
 const full=await session(fixture({jokers:five,entries:[joker('joker','normal'),joker('half_joker','negative','negative')]})),f=full.page;
 before=await raw(f);assert.equal(await f.locator('[data-pack-choose="normal"]').isDisabled(),true);assert.equal(await f.locator('[data-pack-choose="negative"]').isEnabled(),true);
 assert.match(await detailsText(f,'normal'),/espacio|hueco|capacidad|no_slots/i);assert.equal(await raw(f),before);
 await f.locator('[data-pack-choose="negative"]').click();await finish(f);saved=await record(f);
 assert.equal(saved.state.phase,'shop');assert.equal(saved.state.observed.jokers.value.length,6);assert.equal(saved.state.observed.resources.jokerSlots.value,6);assert.equal(saved.state.observed.money.value,16);
 assert.deepEqual(saved.state.observed.jokers.value.slice(0,5),five);assert.equal(saved.state.observed.jokers.value.at(-1).edition.value,'negative');
 pass('full-area-normal-rejected-negative-retains-legal-flow',{normalSelectable:false,negativeSelectable:true,finalJokers:6,finalSlots:6,money:16},{normalSelectable:false,negativeSelectable:true,finalJokers:6,finalSlots:6,money:16});await full.context.close();

 // 8. The same comparison remains usable at 390px; this is emulation only.
 const mobile=await session(fixture({pack:'celestial-normal',entries:[planet('c_mercury','mercury'),planet('c_pluto','pluto'),planet('c_mars','mars')]}),{width:390,height:844}),v=mobile.page;
 before=await raw(v);count=await writes(v);await v.locator('#pack-intended-hand').selectOption('pair');
 assert.equal(await v.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await panel(v).screenshot({path:dir+'/mobile-comparison.png'});await v.locator('#pack-panel').screenshot({path:dir+'/mobile-pack.png'});await v.screenshot({path:dir+'/mobile-page.png',fullPage:false});
 assert.equal(await raw(v),before);assert.equal(await writes(v),count);await v.locator('[data-pack-choose="mercury"]').click();assert.equal(await v.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await v.screenshot({path:dir+'/mobile-confirmation.png',fullPage:false});await v.locator('#dialog-cancel').click();assert.equal(await raw(v),before);await mobile.context.close();
 pass('mobile390-no-overflow-and-no-advice-write',{viewport:390,overflow:false,adviceWrites:0,physicalAndroid:false},{viewport:390,overflow:false,adviceWrites:0,physicalAndroid:false});

 assert.equal(report.cases.length,8);assert.deepEqual(report.pageErrors,[]);report.status='passed';await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');
 console.log('PASS observed-pack choices',report.cases.length,'browser groups; synthetic observations, not gameplay');
}catch(error){report.status='failed';report.error=error.stack||String(error);await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');if(lastPage&&!lastPage.isClosed())await lastPage.screenshot({path:dir+'/failed.png',fullPage:true}).catch(()=>{});throw error;}
finally{await browser?.close();server?.kill();}
