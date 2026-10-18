import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createNewRun} from '../dist/src/run/start.js';

// Synthetic observations, never a direct observation of Balatro gameplay.
// The browser checks presentation and real/hypothetical separation. Literal
// Chariot and Moon property changes below use the independently recorded L12
// contract; ranking itself is an editorial policy, not an empirical oracle.
const port='4213',remote=process.env.ARCANA_CHOICES_BASE_URL;
const origin=new URL(remote??'http://127.0.0.1:'+port+'/');if(!origin.pathname.endsWith('/'))origin.pathname+='/';
const key='balatro-advisor.confirmed.v1',dir='docs/evidencia/arcana-choices'+(remote?'/public':'');await mkdir(dir,{recursive:true});
const known=value=>({status:'known',source:'manual',value});
const missing=reason=>({status:'unknown',reason});
const held=['8S','8H','KS','2D','3C','4H','5D','6C'];
const stock=[{instanceId:'held-fool',catalogId:'c_fool',kind:'tarot',edition:'base',sellValue:1},{instanceId:'held-pluto',catalogId:'c_pluto',kind:'planet',edition:'base',sellValue:1}];
const tarot=(entryId,catalogId)=>({entryId,kind:'tarot',catalogId});
const unsupported=(entryId,catalogId)=>({entryId,kind:'unsupported',catalogId});
const standardEntries=[tarot('chariot','c_chariot'),tarot('empress','c_empress'),tarot('moon','c_moon')];
function fixture({pack='arcana-normal',entries=standardEntries,hand=known(held),jokers=[]}={}){
 const created=createNewRun({runId:'synthetic-arcana-choices',updatedAt:'2026-10-18T21:00:00Z',deckId:'blue',profileConfirmed:true});assert.equal(created.ok,true);const state=created.value;
 const cards=['S','H','D','C'].flatMap(suit=>['2','3','4','5','6','7','8','9','10','J','Q','K','A'].map(rank=>({instanceId:rank+suit,rank,suit,edition:'base',enhancement:'none',seal:'none',extraChips:0,debuff:false})));
 Object.assign(cards.find(card=>card.instanceId==='8S'),{enhancement:'bonus',edition:'foil',seal:'blue',extraChips:7});
 const mega=pack.endsWith('mega'),jumbo=pack.endsWith('jumbo'),paid=mega?8:jumbo?6:4;
 state.phase='open_pack';state.phaseData={packId:known('observed-arcana'),returnTo:'shop',context:{offerId:'observed-arcana',shopId:'choice-shelf',catalogId:pack,paid,remainingChoices:mega?2:1,contents:known(structuredClone(entries)),heldCardIds:structuredClone(hand),selectedEntryIds:[],shopOrigin:known({ante:1,kind:'small'})}};
 state.observed.money=known(20-paid);state.observed.deck=known({cards});state.observed.jokers=known(jokers);
 state.observed.shop=known({shopId:'choice-shelf',cardOffers:[],voucherOffers:[],packOffers:[],ignoredOtherOffers:[]});
 state.observed.nextBlind=known({ante:1,kind:'boss',bossId:known('the_club'),target:known(600),reward:known(5)});
 state.observed.jokerContext.value.consumables=known(structuredClone(stock));state.observed.jokerContext.value.tarotsUsed=known(7);state.assumptions.probes=[];state.assumptions.roundPlans=[];
 return {schemaVersion:'confirmed-2',initialState:structuredClone(state),state,history:[]};
}
const modules=[
 'dist/src/ui/app.js','dist/src/ui/pack-view.js','dist/src/ui/arcana-choice-view.js','dist/src/ui/tarot-view.js',
 'dist/src/advisor/arcana-choices.js','dist/src/advisor/composition.js','dist/src/advisor/composition-policy.js','dist/src/advisor/composition-signals.js',
 'dist/src/advisor/quick-fit.js','dist/src/advisor/fit-index.js',
 'dist/src/rules/pack-shop.js','dist/src/rules/tarot.js','dist/src/rules/core.js','dist/src/rules/generation-jokers.js','dist/src/rules/history-jokers.js',
 'dist/src/state/pack-contract.js','dist/src/state/tarot-contract.js','dist/src/state/model.js','dist/src/state/validation.js',
 'dist/src/storage/confirmed-store.js','dist/src/storage/confirmed-record.js','dist/src/rules/engine-evidence.js','dist/src/rules/evidence.js'
];
const report={date:new Date().toISOString(),url:origin.href,commit:process.env.ARCANA_CHOICES_COMMIT??null,workflow:process.env.ARCANA_CHOICES_WORKFLOW??null,
 environment:'Chrome temporary profiles; desktop and 390px mobile emulation',gameObservation:false,physicalAndroid:false,
 oracle:'UI-contract checks; L12 literal property changes. Heuristic order is not a gameplay observation or proof of optimal play.',criticalModules:modules.length,hashes:[],cases:[],pageErrors:[]};
const pass=(id,expected,observed)=>{report.cases.push({id,expected,observed,status:'passed'});console.log('PASS',id);};
const server=remote?null:spawn(process.execPath,['dist/src/server.js'],{env:{...process.env,PORT:port},stdio:'pipe',windowsHide:true});let browser,lastPage;
try{
 if(server)await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Arcana choices server timeout')),15000);server.stdout.on('data',data=>{if(String(data).includes('Balatro Advisor local')){clearTimeout(timer);resolve();}});server.on('error',error=>{clearTimeout(timer);reject(error);});server.on('exit',()=>{clearTimeout(timer);reject(Error('Arcana choices server stopped'));});});
 if(remote)for(const file of ['index.html',...modules,'web/mesa.css']){const local=await readFile('out/'+file),url=new URL(file,origin);url.searchParams.set('arcana-choices',String(Date.now()));const response=await fetch(url);assert.equal(response.status,200,file);const bytes=Buffer.from(await response.arrayBuffer()),hash=data=>createHash('sha256').update(data).digest('hex');assert.equal(hash(bytes),hash(local),'Public artifact differs from out/'+file);report.hashes.push({file,sha256:hash(bytes)});}
 browser=await chromium.launch({channel:'chrome',headless:true});
 const raw=page=>page.evaluate(storageKey=>localStorage.getItem(storageKey),key),record=async page=>JSON.parse(await raw(page)),writes=page=>page.evaluate(()=>window.__arcanaChoiceWrites);
 const go=(page,screen)=>page.locator(`[data-screen="${screen}"]`).click(),panel=page=>page.locator('#arcana-comparison'),status=page=>page.locator('#arcana-choice-status');
 const ready=page=>page.waitForFunction(()=>document.querySelector('#ownership')?.textContent.includes('Esta pestaña tiene'));
 const watch=page=>{lastPage=page;page.on('pageerror',error=>report.pageErrors.push(error.message));};
 const session=async(input=fixture(),viewport={width:1440,height:1000})=>{const context=await browser.newContext({viewport});await context.addInitScript(storageKey=>{window.__arcanaChoiceWrites=0;const original=Storage.prototype.setItem;Storage.prototype.setItem=function(name,value){if(name===storageKey)window.__arcanaChoiceWrites++;return original.call(this,name,value);};},key);const page=await context.newPage();watch(page);await page.goto(origin.href);await ready(page);await go(page,'archive');await page.locator('#import-file').setInputFiles({name:'synthetic-arcana-choices.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(input))});await page.locator('#dialog-accept').click();await page.locator('#confirmation').waitFor({state:'hidden'});await go(page,'table');await panel(page).waitFor({state:'visible'});return {context,page};};
 const reload=async page=>{await page.reload();await ready(page);await go(page,'table');await panel(page).waitFor({state:'visible'});};
 const finish=async page=>{await page.locator('#performed').check();await page.locator('#dialog-accept').click();await page.locator('#confirmation').waitFor({state:'hidden'});};
 const entry=(page,id)=>page.locator(`[data-pack-entry="${id}"]`),choice=(page,id)=>page.locator(`[data-pack-choose="${id}"]`);
 const detail=(page,id)=>page.locator(`[data-arcana-entry-comparison="${id}"]`);
 const suggestions=(page,id)=>page.locator(`[data-arcana-targets][data-entry-id="${id}"]`);
 const expand=async(page,id)=>{const host=detail(page,id);if(await host.evaluate(e=>e.tagName==='DETAILS'&&!e.open))await host.locator('summary').first().click();return host;};
 const suggest=async(page,id)=>{await expand(page,id);const button=suggestions(page,id).first(),ids=JSON.parse(await button.getAttribute('data-target-card-ids'));assert.ok(ids.length>0);assert.equal(new Set(ids).size,ids.length);assert.ok(ids.every(id=>held.includes(id)));await button.click();const picked=await entry(page,id).locator('[data-pack-target][aria-pressed="true"]').evaluateAll(buttons=>buttons.map(button=>button.dataset.packTarget.split(':').slice(1).join(':')));assert.deepEqual(picked,ids);return ids;};
 const cardMap=state=>new Map(state.observed.deck.value.cards.map(card=>[card.instanceId,card]));
 const assertOnlyTargets=(before,after,ids,patch)=>{const prior=cardMap(before);assert.equal(after.observed.deck.value.cards.length,52);for(const card of after.observed.deck.value.cards)assert.deepEqual(card,{...prior.get(card.instanceId),...(ids.includes(card.instanceId)?patch:{})});};
 const assertUntouchedFacts=(before,after)=>{assert.deepEqual(after.assumptions,before.assumptions);assert.deepEqual(after.observed.jokers,before.observed.jokers);assert.deepEqual(after.observed.jokerContext.value.consumables,before.observed.jokerContext.value.consumables);assert.deepEqual(after.observed.nextBlind,before.observed.nextBlind);};

 // 1. Automatic comparison, details and paginated target lists are projections.
 const initial=await session(),p=initial.page;let before=await raw(p),count=await writes(p);
 assert.notEqual((await status(p).innerText()).trim(),'');assert.match(await panel(p).innerText(),/heuríst|context|composici|apartados/i);assert.doesNotMatch(await panel(p).innerText(),/\d\s*%/);
 assert.match(await p.locator('#arcana-choice-coverage').innerText(),/objetiv|combin|elecci|candidat|alternativ/i);
 for(const id of ['chariot','empress','moon']){await expand(p,id);assert.ok(await suggestions(p,id).count()>0);}
 const more=detail(p,'moon').getByRole('button',{name:/Ver más objetivos/i});if(await more.count()){const prior=await suggestions(p,'moon').count();await more.click();assert.ok(await suggestions(p,'moon').count()>prior);}
 assert.equal(await raw(p),before);assert.equal(await writes(p),count);await p.locator('#pack-panel').screenshot({path:dir+'/desktop-comparison.png'});await reload(p);assert.equal(await raw(p),before);assert.equal(await writes(p),0);
 pass('automatic-comparison-and-pagination-readonly',{cards:52,history:0,comparisonWrites:0},{cards:(await record(p)).state.observed.deck.value.cards.length,history:(await record(p)).history.length,comparisonWrites:0});

 // 2. A suggestion fills only the manual target selector, never an action.
 before=await raw(p);count=await writes(p);const selected=await suggest(p,'chariot');assert.equal(selected.length,1);assert.equal(await choice(p,'chariot').isEnabled(),true);assert.equal(await p.locator('#confirmation').isVisible(),false);assert.match(await entry(p,'chariot').locator('.tarot-preview').innerText(),/Acero/);assert.equal(await raw(p),before);assert.equal(await writes(p),count);
 pass('suggestion-selects-targets-without-recording',{targetCount:1,confirmationOpen:false,writes:0},{targetIds:selected,confirmationOpen:false,writes:0});

 // 3. Only explicit real-action confirmation changes the imported current run.
 await choice(p,'chariot').click();assert.equal(await raw(p),before);await p.locator('#dialog-accept').click();assert.equal(await raw(p),before);assert.match(await p.locator('#dialog-error').innerText(),/confirm/i);await p.locator('#dialog-cancel').click();assert.equal(await raw(p),before);
 await choice(p,'chariot').click();await finish(p);let saved=await record(p),prior=JSON.parse(before).state;
 assert.equal(saved.state.phase,'shop');assert.equal(saved.state.revision,prior.revision+1);assert.equal(saved.state.observed.money.value,16);assert.equal(saved.state.observed.jokerContext.value.tarotsUsed.value,8);assert.equal(saved.history.length,1);assert.equal(saved.history[0].action.type,'choose_pack_item');assert.equal(saved.history[0].action.entryId,'chariot');assert.deepEqual(saved.history[0].action.targetCardIds,selected);assert.equal(await writes(p),count+1);assertOnlyTargets(prior,saved.state,selected,{enhancement:'steel',debuff:false});assertUntouchedFacts(prior,saved.state);assert.equal(saved.history[0].evidence.verifiedAgainstGame,false);
 pass('explicit-confirmation-only-actual-chariot-use',{money:16,tarotsUsed:8,actions:1,revisionDelta:1,enhancement:'steel',consumables:2},{money:16,tarotsUsed:8,actions:1,revisionDelta:1,enhancement:'steel',targetIds:selected,consumables:2});await initial.context.close();

 // 4. Mega compares again from the changed real revision and retained hand.
 const mega=await session(fixture({pack:'arcana-mega',entries:[...standardEntries,tarot('sun','c_sun'),tarot('world','c_world')]})),m=mega.page;
 before=await raw(m);let firstIds=await suggest(m,'chariot');await choice(m,'chariot').click();await finish(m);saved=await record(m);assert.equal(saved.state.phase,'open_pack');assert.equal(saved.state.phaseData.context.remainingChoices,1);assert.deepEqual(saved.state.phaseData.context.heldCardIds,known(held));assert.deepEqual(saved.state.phaseData.context.selectedEntryIds,['chariot']);assert.equal(await suggestions(m,'chariot').count(),0);assert.equal(await panel(m).getAttribute('data-input-revision'),String(saved.state.revision));
 assertOnlyTargets(JSON.parse(before).state,saved.state,firstIds,{enhancement:'steel',debuff:false});before=await raw(m);await reload(m);assert.equal(await raw(m),before);assert.equal(await panel(m).getAttribute('data-input-revision'),String(saved.state.revision));const secondIds=await suggest(m,'moon');assert.equal(await raw(m),before);await choice(m,'moon').click();await finish(m);let after=await record(m);assertOnlyTargets(saved.state,after.state,secondIds,{suit:'C',debuff:false});assert.equal(after.state.phase,'shop');assert.equal(after.state.observed.money.value,12);assert.equal(after.state.observed.jokerContext.value.tarotsUsed.value,9);assert.equal(after.history.length,2);assertUntouchedFacts(saved.state,after.state);
 pass('mega-next-choice-recalculated-after-real-use',{firstRevision:1,choicesRemaining:1,handRetained:true,finalMoney:12,tarotsUsed:9,actions:2},{firstRevision:saved.state.revision,choicesRemaining:1,handRetained:true,finalMoney:12,tarotsUsed:9,actions:2});await mega.context.close();

 // 5. Unimplemented competitors force global abstention, not false certainty.
 const unsupportedSession=await session(fixture({pack:'arcana-jumbo',entries:[unsupported('soul','c_soul'),unsupported('fool','c_fool'),...standardEntries]})),u=unsupportedSession.page;
 before=await raw(u);count=await writes(u);assert.equal(await status(u).getAttribute('data-kind'),'abstain');assert.match(await panel(u).innerText(),/no compatible|pendiente|cobertura|implementad|evaluad/i);assert.equal(await choice(u,'soul').isDisabled(),true);assert.equal(await choice(u,'fool').isDisabled(),true);await suggest(u,'chariot');assert.equal(await choice(u,'chariot').isEnabled(),true);assert.equal(await raw(u),before);assert.equal(await writes(u),count);
 pass('unsupported-competitor-abstention-keeps-supported-projection',{recommendation:'abstain',unsupportedUsable:false,supportedUsable:true,writes:0},{recommendation:'abstain',unsupportedUsable:false,supportedUsable:true,writes:0});await unsupportedSession.context.close();

 // 6. An unknown actual pack hand is not replaced by invented target cards.
 const unknownSession=await session(fixture({hand:missing('La mano real del sobre no se ha observado.')})),n=unknownSession.page;
 before=await raw(n);count=await writes(n);assert.equal(await status(n).getAttribute('data-kind'),'abstain');assert.equal(await n.locator('[data-arcana-targets]').count(),0);assert.equal(await n.locator('[data-pack-target]').count(),0);assert.equal(await choice(n,'chariot').isDisabled(),true);assert.match(await panel(n).innerText(),/mano|desconoc|registr/i);assert.equal(await raw(n),before);assert.equal(await writes(n),count);
 pass('unknown-hand-abstains-without-inventing-targets',{recommendation:'abstain',suggestedTargets:0,realHand:'unknown',writes:0},{recommendation:'abstain',suggestedTargets:0,realHand:(await record(n)).state.phaseData.context.heldCardIds.status,writes:0});await unknownSession.context.close();

 // 7. A read-only second tab may inspect/select projections but not confirm.
 const owner=await session(),o=owner.page;before=await raw(o);const reader=await owner.context.newPage();watch(reader);await reader.goto(origin.href);await reader.waitForFunction(()=>document.querySelector('#ownership')?.textContent.includes('Modo lectura'));await go(reader,'table');await panel(reader).waitFor({state:'visible'});await suggest(reader,'chariot');assert.equal(await choice(reader,'chariot').isDisabled(),true);assert.equal(await reader.locator('#pack-skip').isDisabled(),true);assert.equal(await raw(reader),before);assert.equal(await writes(reader),0);
 pass('readonly-tab-can-compare-without-real-action',{suggestionSelectable:true,confirmationAllowed:false,writes:0},{suggestionSelectable:true,confirmationAllowed:false,writes:0});await owner.context.close();

 // 8. 390px is desktop mobile emulation, not a physical Android assertion.
 const mobile=await session(fixture(),{width:390,height:844}),v=mobile.page;before=await raw(v);count=await writes(v);await suggest(v,'empress');assert.equal(await v.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await panel(v).screenshot({path:dir+'/mobile-comparison.png'});await v.locator('#pack-panel').screenshot({path:dir+'/mobile-targets.png'});await v.screenshot({path:dir+'/mobile-page.png',fullPage:false});await choice(v,'empress').click();assert.equal(await v.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await v.screenshot({path:dir+'/mobile-confirmation.png',fullPage:false});await v.locator('#dialog-cancel').click();assert.equal(await raw(v),before);assert.equal(await writes(v),count);
 pass('mobile390-comparison-targets-and-cancel',{overflow:false,writes:0,physicalAndroid:false},{overflow:false,writes:0,physicalAndroid:false});await mobile.context.close();

 assert.equal(report.cases.length,8);assert.deepEqual(report.pageErrors,[]);report.status='passed';await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');console.log('PASS Arcana choices',report.cases.length,'browser groups; synthetic observations, not gameplay');
}catch(error){report.status='failed';report.error=error.stack||String(error);await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');if(lastPage&&!lastPage.isClosed())await lastPage.screenshot({path:dir+'/failed.png',fullPage:true}).catch(()=>{});throw error;}
finally{await browser?.close();server?.kill();}
