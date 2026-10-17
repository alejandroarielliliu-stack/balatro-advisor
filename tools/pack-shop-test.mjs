import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createNewRun} from '../dist/src/run/start.js';

// Synthetic observations and literal documentary oracles; never use H2 to
// generate its own expected values. This is not an observed Balatro session.
const port='4208',remote=process.env.PACK_SHOP_BASE_URL;
const origin=new URL(remote??'http://127.0.0.1:'+port+'/');
if(!origin.pathname.endsWith('/'))origin.pathname+='/';
const key='balatro-advisor.confirmed.v1',dir='docs/evidencia/pack-shop'+(remote?'/public':'');
await mkdir(dir,{recursive:true});
const known=value=>({status:'known',source:'manual',value});
const owned=(catalogId='joker',instanceId='owned-joker',counters={})=>({
 instanceId,catalogId,edition:known('base'),stickers:known([]),sellValue:known(catalogId==='joker'?1:2),counters
});
function fixture({money=20,jokers=[],consumables=[]}={}){
 const created=createNewRun({runId:'synthetic-pack-shop',updatedAt:'2026-10-17T18:00:00Z',deckId:'blue',profileConfirmed:true});
 assert.equal(created.ok,true,'The synthetic current-format run must be structurally valid');
 const state=created.value;
 state.phase='shop';state.phaseData={origin:known({ante:1,kind:'small'})};
 state.observed.money=known(money);state.observed.jokers=known(jokers);
 state.observed.shop=known({shopId:'synthetic-pack-shelf',cardOffers:[],voucherOffers:[],packOffers:[],ignoredOtherOffers:[]});
 state.observed.jokerContext.value.consumables=known(consumables);
 state.assumptions.probes=[];state.assumptions.roundPlans=[];
 return {schemaVersion:'confirmed-2',initialState:structuredClone(state),state,history:[]};
}
const modules=[
 'dist/src/ui/app.js','dist/src/ui/storefront.js','dist/src/ui/pack-view.js','dist/src/advisor/decision.js',
 'dist/src/rules/pack-shop.js','dist/src/rules/planet.js','dist/src/rules/shop.js','dist/src/rules/core.js',
 'dist/src/rules/generation-jokers.js','dist/src/state/pack-contract.js','dist/src/state/model.js',
 'dist/src/state/validation.js','dist/src/storage/confirmed-store.js','dist/src/storage/confirmed-record.js',
 'dist/src/storage/shop-session.js','dist/src/rules/engine-evidence.js'
];
const report={date:new Date().toISOString(),url:origin.href,commit:process.env.PACK_SHOP_COMMIT??null,
 workflow:process.env.PACK_SHOP_WORKFLOW??null,environment:'Chrome temporary profiles; desktop and 390px mobile emulation',
 gameObservation:false,physicalAndroid:false,criticalModules:modules.length,hashes:[],cases:[],pageErrors:[]};
const pass=(id,expected,observed)=>{report.cases.push({id,expected,observed,status:'passed'});console.log('PASS',id);};
const server=remote?null:spawn(process.execPath,['dist/src/server.js'],{env:{...process.env,PORT:port},stdio:'pipe',windowsHide:true});
const moduleURL=file=>new URL('dist/src/'+file,origin).href;
let browser,lastPage;
try{
 if(server)await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('SHOP02b server timeout')),15000);
  server.stdout.on('data',data=>{if(String(data).includes('Balatro Advisor local')){clearTimeout(timer);resolve();}});
  server.on('error',error=>{clearTimeout(timer);reject(error);});
  server.on('exit',()=>{clearTimeout(timer);reject(Error('SHOP02b server stopped'));});
 });
 if(remote)for(const file of ['index.html',...modules,'web/mesa.css']){
  const local=await readFile('out/'+file),url=new URL(file,origin);url.searchParams.set('pack-shop',String(Date.now()));
  const response=await fetch(url);assert.equal(response.status,200,file);
  const bytes=Buffer.from(await response.arrayBuffer()),hash=data=>createHash('sha256').update(data).digest('hex');
  assert.equal(hash(bytes),hash(local),'Public artifact differs from out/'+file);
  report.hashes.push({file,sha256:hash(bytes)});
 }
 browser=await chromium.launch({channel:'chrome',headless:true});
 const go=(page,screen)=>page.locator(`[data-screen="${screen}"]`).click();
 const raw=page=>page.evaluate(storageKey=>localStorage.getItem(storageKey),key);
 const record=async page=>JSON.parse(await raw(page));
 const writes=page=>page.evaluate(()=>window.__packWrites);
 const watch=page=>{lastPage=page;page.on('pageerror',error=>report.pageErrors.push(error.message));};
 const ready=page=>page.waitForFunction(()=>document.querySelector('#ownership')?.textContent.includes('Esta pestaña tiene'));
 const shelf=page=>page.waitForFunction(()=>document.querySelectorAll('.bay-mini').length===150&&document.querySelector('#store-new-shop')?.dataset.localDisabled==='false');
 const opened=page=>page.locator('#pack-panel').waitFor({state:'visible'});
 const editor=page=>page.locator('#store-item-editor');
 const tile=(page,id)=>page.locator(`.store-extra-tile[data-store-kind="pack"][data-offer-id="${id}"]`);
 const load=async(page,input)=>{
  await go(page,'archive');await page.locator('#import-file').setInputFiles({name:'synthetic-pack-shop.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(input))});
  await page.locator('#dialog-accept').click();await page.locator('#confirmation').waitFor({state:'hidden'});await go(page,'table');await shelf(page);
 };
 const session=async(input=fixture(),viewport={width:1440,height:1000})=>{
  const context=await browser.newContext({viewport});
  await context.addInitScript(storageKey=>{
   window.__packWrites=0;window.__packFailWrite=false;
   const original=Storage.prototype.setItem;
   Storage.prototype.setItem=function(name,value){
    if(name===storageKey){if(window.__packFailWrite)throw new DOMException('Synthetic pack quota failure','QuotaExceededError');window.__packWrites++;}
    return original.call(this,name,value);
   };
  },key);
  const page=await context.newPage();watch(page);await page.goto(origin.href);await ready(page);await load(page,input);return {context,page};
 };
 const reload=async(page,inPack=false)=>{await page.reload();await ready(page);await go(page,'table');if(inPack)await opened(page);else await shelf(page);};
 const closeEditor=async page=>{if(await page.locator('#store-item-editor[open]').count())await editor(page).getByRole('button',{name:'Cerrar',exact:true}).click();};
 const closeAdvice=page=>page.locator('#shop-advice-dialog').getByRole('button',{name:'Cerrar',exact:true}).click();
 const messages=async page=>(await page.locator('#shop-session-status,#message,#dialog-error,#store-item-error,#voucher-confirm-note,#pack-panel').allTextContents()).join(' ');
 const prepare=async(page,catalogId='buffoon-mega',price)=>{
  await page.locator('#store-pack-add').click();await editor(page).waitFor({state:'visible'});await page.locator('#store-item-id').selectOption(catalogId);
  if(price!==undefined)await page.locator('#store-item-price').fill(price===null?'':String(price));
 };
 const add=async(page,catalogId='buffoon-mega',price)=>{
  const previous=(await record(page)).state.observed.shop.value.packOffers??[];
  await prepare(page,catalogId,price);await page.locator('#store-item-save').click();await editor(page).waitFor({state:'hidden'});
  const added=(await record(page)).state.observed.shop.value.packOffers.filter(offer=>!previous.some(old=>old.offerId===offer.offerId));
  assert.equal(added.length,1,'Observing one pack persists exactly one offer');await tile(page,added[0].offerId).waitFor();return added[0].offerId;
 };
 const begin=async(page,id)=>{await tile(page,id).locator('.store-extra-inspect').click();await editor(page).waitFor({state:'visible'});await page.locator(`[data-pack-confirm="${id}"]`).click();await page.locator('#confirmation').waitFor({state:'visible'});};
 const finish=async(page,{twice=false}={})=>{
  await page.locator('#performed').check();if(twice)await page.locator('#dialog-accept').evaluate(button=>{button.click();button.click();});else await page.locator('#dialog-accept').click();
  await page.locator('#confirmation').waitFor({state:'hidden'});
 };
 const buy=async(page,id)=>{await begin(page,id);await finish(page);await opened(page);};
 const fillBuffoon=async(page,ids=['joker','greedy_joker','lusty_joker','wrathful_joker'],editions=[])=>{
  for(let index=0;index<ids.length;index++){
   await page.locator(`[data-pack-joker-index="${index}"]`).selectOption(ids[index]);
   if(editions[index])await page.locator(`[data-pack-edition-index="${index}"]`).selectOption(editions[index]);
  }
 };
 const fillPlanets=async(page,ids=['c_mercury','c_pluto','c_mars'])=>{for(let index=0;index<ids.length;index++)await page.locator(`[data-pack-planet-index="${index}"]`).selectOption(ids[index]);};
 const observe=async page=>{await page.locator('#pack-observe').click();await finish(page);};
 const choose=async(page,entryId,{twice=false}={})=>{await page.locator(`[data-pack-choose="${entryId}"]`).click();await finish(page,{twice});};
 const skip=async page=>{await page.locator('#pack-skip').click();await finish(page);};

 // 1. Observing a closed pack persists facts, never payment or contents.
 const main=await session(),p=main.page,original=await record(p),id=await add(p);
 let saved=await record(p),before,count;
 assert.equal(saved.state.observed.money.value,20);assert.deepEqual(saved.state.observed.jokers.value,[]);
 assert.equal(saved.state.phase,'shop');assert.deepEqual(saved.state.observed.shop.value.packOffers,[{offerId:id,catalogId:'buffoon-mega',price:known(8)}]);
 assert.equal(saved.state.revision,original.state.revision+1);
 await reload(p);await tile(p,id).waitFor();before=await raw(p);count=await writes(p);
 await p.locator('#shop-recommendation').click();await p.locator('#shop-advice-dialog').waitFor({state:'visible'});await closeAdvice(p);
 await tile(p,id).locator('.store-extra-inspect').click();await closeEditor(p);
 assert.equal(await raw(p),before);assert.equal(await writes(p),count);
 pass('observed-pack-reload-and-zero-write-consultation',{money:20,phase:'shop',offers:1,consultationWrites:0},{money:20,phase:'shop',offers:1,consultationWrites:0});

 // 2. Payment/opening is one real confirmation, with no generated contents.
 await begin(p,id);await p.locator('#dialog-accept').click();assert.equal(await raw(p),before);assert.match(await p.locator('#dialog-error').innerText(),/confirm/i);
 await p.locator('#dialog-cancel').click();await closeEditor(p);assert.equal(await raw(p),before);
 const observed=await record(p);await begin(p,id);await finish(p,{twice:true});await opened(p);saved=await record(p);
 assert.equal(saved.state.observed.money.value,12);assert.equal(saved.state.phase,'open_pack');
 assert.equal(saved.state.phaseData.context.contents.status,'unknown');assert.equal(saved.state.phaseData.context.remainingChoices,2);
 assert.deepEqual(saved.state.phaseData.context.selectedEntryIds,[]);assert.equal(saved.state.observed.shop.value.packOffers.length,0);
 assert.equal(saved.state.revision,observed.state.revision+1);assert.equal(saved.history.filter(entry=>entry.action?.type==='buy_pack').length,1);
 assert.deepEqual(saved.state.observed.jokers,original.state.observed.jokers);assert.deepEqual(saved.state.observed.deck,original.state.observed.deck);assert.deepEqual(saved.state.assumptions,original.state.assumptions);
 before=await raw(p);await reload(p,true);assert.equal(await raw(p),before);assert.equal(await p.locator('#pack-content-form').isVisible(),true);
 await p.screenshot({path:dir+'/desktop-open.png',fullPage:false});
 pass('confirmed-opening-no-double-charge-no-generated-cards',{money:12,phase:'open_pack',remaining:2,contents:'unknown',purchases:1},{money:12,phase:'open_pack',remaining:2,contents:'unknown',purchases:1});

 // 3. A complete observed transcript changes no inventory, bases or money.
 await fillBuffoon(p);before=await raw(p);await p.locator('#pack-observe').click();await p.locator('#dialog-cancel').click();assert.equal(await raw(p),before);
 await observe(p);saved=await record(p);
 assert.equal(saved.state.observed.money.value,12);assert.deepEqual(saved.state.observed.jokers.value,[]);
 assert.equal(saved.state.phaseData.context.contents.status,'known');assert.equal(saved.state.phaseData.context.contents.value.length,4);
 assert.equal(saved.state.phaseData.context.remainingChoices,2);assert.deepEqual(saved.state.phaseData.context.selectedEntryIds,[]);
 assert.deepEqual(saved.state.observed.handBases,original.state.observed.handBases);
 before=await raw(p);count=await writes(p);await p.locator('#pack-panel').screenshot({path:dir+'/desktop-contents.png'});assert.equal(await raw(p),before);assert.equal(await writes(p),count);
 pass('observed-contents-are-not-acquired',{visible:4,jokers:0,money:12,remaining:2},{visible:4,jokers:0,money:12,remaining:2});

 // 4. Mega decisions survive reload and each acquisition is free after opening.
 const entries=saved.state.phaseData.context.contents.value,first=entries[0].entryId,second=entries[1].entryId;
 await choose(p,first,{twice:true});saved=await record(p);
 assert.equal(saved.state.phase,'open_pack');assert.equal(saved.state.phaseData.context.remainingChoices,1);assert.deepEqual(saved.state.phaseData.context.selectedEntryIds,[first]);
 assert.equal(saved.state.observed.jokers.value.length,1);assert.equal(saved.state.observed.jokers.value[0].catalogId,'joker');assert.equal(saved.state.observed.jokers.value[0].sellValue.value,1);
 assert.equal(saved.state.observed.money.value,12);assert.equal(saved.history.filter(entry=>entry.action?.type==='choose_pack_item').length,1);
 before=await raw(p);await reload(p,true);assert.equal(await raw(p),before);assert.equal(await p.locator('#pack-edit-contents').count(),0,'A partial Mega cannot silently replace its contents');
 await choose(p,second);saved=await record(p);assert.equal(saved.state.phase,'shop');assert.equal(saved.state.observed.money.value,12);assert.deepEqual(saved.state.observed.jokers.value.map(joker=>joker.catalogId),['joker','greedy_joker']);
 assert.deepEqual(saved.state.phaseData,original.state.phaseData);assert.deepEqual(saved.state.assumptions,original.state.assumptions);
 assert.equal(await p.locator('#pack-panel').isVisible(),false);await reload(p);assert.equal((await record(p)).state.observed.jokers.value.length,2);
 pass('mega-two-independent-choices-with-reload',{money:12,chosen:['joker','greedy_joker'],phase:'shop',choices:2},{money:12,chosen:['joker','greedy_joker'],phase:'shop',choices:2});
 await main.context.close();

 // 5. Omitting a partially used Mega retains the first card and grows Red Card.
 const red=await session(fixture({jokers:[owned('red_card','red',{mult:known(0)})]})),r=red.page,redId=await add(r);
 await buy(r,redId);await fillBuffoon(r);await observe(r);let content=(await record(r)).state.phaseData.context.contents.value;await choose(r,content[0].entryId);await skip(r);saved=await record(r);
 assert.equal(saved.state.phase,'shop');assert.equal(saved.state.observed.money.value,12);assert.equal(saved.state.observed.jokers.value.length,2);
 assert.equal(saved.state.observed.jokers.value.find(joker=>joker.instanceId==='red').counters.mult.value,3);
 assert.equal(saved.state.observed.jokers.value.filter(joker=>joker.catalogId==='joker').length,1);
 pass('mega-partial-skip-keeps-card-and-red-card-growth',{money:12,acquired:1,redMult:3,phase:'shop'},{money:12,acquired:1,redMult:3,phase:'shop'});
 await red.context.close();

 // 6. Full inventory blocks selection, not opening; selling and choosing are separate.
 const five=['joker','greedy_joker','lusty_joker','wrathful_joker','gluttenous_joker'].map((catalogId,index)=>owned(catalogId,'full-'+index));
 const full=await session(fixture({jokers:five})),f=full.page,fullId=await add(f,'buffoon-normal');await buy(f,fullId);await fillBuffoon(f,['joker','half_joker']);await observe(f);
 content=(await record(f)).state.phaseData.context.contents.value;before=await raw(f);const normalButton=f.locator(`[data-pack-choose="${content[0].entryId}"]`);
 if(await normalButton.isEnabled()){await normalButton.click();if(await f.locator('#confirmation[open]').count())await f.locator('#dialog-cancel').click();}
 assert.equal(await raw(f),before);assert.match(await messages(f),/espacio|hueco|no_slots|capacidad/i);
 await f.locator('#pack-panel details').filter({has:f.locator('#pack-sell-joker')}).locator('summary').click();await f.locator('#pack-sell-joker').selectOption('full-0');await f.locator('#pack-sell').click();await finish(f);
 saved=await record(f);assert.equal(saved.state.phaseData.context.remainingChoices,1);assert.equal(saved.state.observed.money.value,17);assert.equal(saved.state.observed.jokers.value.length,4);
 assert.equal(saved.history.at(-1).action.type,'sell_pack_joker');await choose(f,content[0].entryId);saved=await record(f);
 assert.equal(saved.state.phase,'shop');assert.equal(saved.state.observed.money.value,17);assert.equal(saved.state.observed.jokers.value.length,5);
 pass('full-area-opening-sale-then-choice',{openingMoney:16,saleMoney:17,finalMoney:17,finalJokers:5},{openingMoney:16,saleMoney:17,finalMoney:17,finalJokers:5});await full.context.close();

 // 7. A Negative choice at full capacity adds its own slot, without another charge.
 const negative=await session(fixture({jokers:five})),n=negative.page,negativeId=await add(n,'buffoon-normal');await buy(n,negativeId);await fillBuffoon(n,['joker','half_joker'],['negative']);await observe(n);
 content=(await record(n)).state.phaseData.context.contents.value;await choose(n,content[0].entryId);saved=await record(n);
 assert.equal(saved.state.phase,'shop');assert.equal(saved.state.observed.money.value,16);assert.equal(saved.state.observed.jokers.value.length,6);assert.equal(saved.state.observed.resources.jokerSlots.value,6);
 assert.equal(saved.state.observed.jokers.value.at(-1).edition.value,'negative');
 pass('negative-choice-adds-slot',{money:16,jokers:6,slots:6},{money:16,jokers:6,slots:6});await negative.context.close();

 // 8. Mercury is used directly even with full consumables; history/growth is real.
 const oldConsumables=[{instanceId:'held-a',catalogId:'c_fool',kind:'tarot',edition:'base',sellValue:1},{instanceId:'held-b',catalogId:'c_pluto',kind:'planet',edition:'base',sellValue:1}];
 const planets=await session(fixture({jokers:[owned('constellation','constellation',{x100:known(100)})],consumables:oldConsumables})),c=planets.page,planetId=await add(c,'celestial-normal');
 await buy(c,planetId);await fillPlanets(c);await observe(c);content=(await record(c)).state.phaseData.context.contents.value;
 await c.locator(`[data-pack-choose="${content[0].entryId}"]`).click();
 const planetConfirmation=await c.locator('#dialog-body').innerText();
 assert.match(planetConfirmation,/Mercurio/,'The real-action confirmation names the observed Planet.');
 assert.match(planetConfirmation,/10\s*×\s*2\s*→\s*25\s*×\s*3/,'Independent Pair oracle must be visible before confirmation.');
 assert.match(planetConfirmation,/Constellation\s*·\s*×1\s*→\s*×1[.,]1/,'The recorded growth is displayed as a multiplier, not unexplained hundredths.');
 await finish(c);saved=await record(c);
 assert.equal(saved.state.phase,'shop');assert.equal(saved.state.observed.money.value,16);
 assert.deepEqual(saved.state.observed.handBases.value.values.pair.value,{level:2,chips:25,mult:3});
 assert.deepEqual(saved.state.observed.jokerContext.value.planetsUsed.value,['c_mercury']);assert.deepEqual(saved.state.observed.jokerContext.value.consumables.value,oldConsumables);
 assert.equal(saved.state.observed.jokers.value[0].counters.x100.value,110);assert.equal(saved.state.observed.deck.value.cards.length,52);
 pass('planet-direct-use-bases-history-and-constellation',{money:16,pair:{level:2,chips:25,mult:3},x100:110,planetsUsed:['c_mercury'],heldConsumables:2},{money:16,pair:{level:2,chips:25,mult:3},x100:110,planetsUsed:['c_mercury'],heldConsumables:2});await planets.context.close();

 // 9. Black Hole stays observable without pretending its effect is integrated.
 const black=await session(),b=black.page,blackId=await add(b,'celestial-normal');await buy(b,blackId);await fillPlanets(b,['c_black_hole','c_mercury','c_pluto']);await observe(b);saved=await record(b);content=saved.state.phaseData.context.contents.value;
 assert.equal(content[0].kind,'unsupported');assert.equal(content[0].catalogId,'c_black_hole');before=await raw(b);
 const blackButton=b.locator(`[data-pack-choose="${content[0].entryId}"]`);if(await blackButton.isEnabled()){await blackButton.click();if(await b.locator('#confirmation[open]').count())await b.locator('#dialog-cancel').click();}
 assert.equal(await raw(b),before);assert.match(await messages(b),/implementad|compatible|cobertura|Black Hole/i);await skip(b);saved=await record(b);assert.equal(saved.state.phase,'shop');assert.equal(saved.state.observed.money.value,16);
 assert.deepEqual(saved.state.observed.handBases.value,{preset:'all-standard-level1'});
 pass('black-hole-observed-but-not-applied',{kind:'unsupported',money:16,levelsChanged:false,skipAllowed:true},{kind:'unsupported',money:16,levelsChanged:false,skipAllowed:true});await black.context.close();

 // 10. Illegal pack branches are explicit and preserve the complete record.
 const rejected=[{id:'buffoon-normal',price:4,money:3,pattern:/insuficiente|dinero|saldo/i},{id:'buffoon-normal',price:3,money:20,pattern:/precio|admitid|cobertura/i},{id:'arcana-normal',price:4,money:20,pattern:/Buffoon|Celestial|implementad|admite|cobertura/i}];
 for(const example of rejected){
  const current=await session(fixture({money:example.money})),page=current.page,offer=await add(page,example.id,example.price);before=await raw(page);count=await writes(page);
  await tile(page,offer).locator('.store-extra-inspect').click();const button=page.locator(`[data-pack-confirm="${offer}"]`);
  if(await button.isEnabled()){await button.click();if(await page.locator('#confirmation[open]').count()){await page.locator('#performed').check();await page.locator('#dialog-accept').click();}}
  assert.equal(await raw(page),before);assert.equal(await writes(page),count);assert.match(await messages(page),example.pattern);
  if(await page.locator('#confirmation[open]').count())await page.locator('#dialog-cancel').click();await closeEditor(page);await current.context.close();
 }
 pass('insufficient-price-and-family-rejections',{rejected:3,mutations:0},{rejected:3,mutations:0});

 // 11. Failed observation, opening and choice writes preserve state AND history.
 const quota=await session(),q=quota.page;before=await raw(q);await q.evaluate(()=>window.__packFailWrite=true);await prepare(q,'buffoon-normal');await q.locator('#store-item-save').click();
 assert.equal(await raw(q),before);assert.equal(await q.locator('.store-extra-tile[data-store-kind="pack"]').count(),0);assert.match(await messages(q),/guardar|almacenamiento|cuota|guardad/i);
 await q.evaluate(()=>window.__packFailWrite=false);await q.locator('#store-item-save').click();await editor(q).waitFor({state:'hidden'});const quotaId=(await record(q)).state.observed.shop.value.packOffers[0].offerId;
 before=await raw(q);await begin(q,quotaId);await q.locator('#performed').check();await q.evaluate(()=>window.__packFailWrite=true);await q.locator('#dialog-accept').click();assert.equal(await raw(q),before);assert.equal((await record(q)).state.phase,'shop');
 await q.evaluate(()=>window.__packFailWrite=false);await q.locator('#dialog-accept').click();await q.locator('#confirmation').waitFor({state:'hidden'});await opened(q);assert.equal((await record(q)).state.observed.money.value,16);
 await fillBuffoon(q,['joker','half_joker']);await observe(q);content=(await record(q)).state.phaseData.context.contents.value;before=await raw(q);await q.locator(`[data-pack-choose="${content[0].entryId}"]`).click();await q.locator('#performed').check();await q.evaluate(()=>window.__packFailWrite=true);await q.locator('#dialog-accept').click();assert.equal(await raw(q),before);assert.equal((await record(q)).state.observed.jokers.value.length,0);
 await q.evaluate(()=>window.__packFailWrite=false);await q.locator('#dialog-accept').click();await q.locator('#confirmation').waitFor({state:'hidden'});saved=await record(q);assert.equal(saved.state.observed.money.value,16);assert.equal(saved.state.observed.jokers.value.length,1);assert.equal(saved.state.phase,'shop');
 pass('quota-failures-preserve-whole-record-and-retry',{observationRollback:true,openingRollback:true,choiceRollback:true,retryJokers:1,money:16},{observationRollback:true,openingRollback:true,choiceRollback:true,retryJokers:1,money:16});await quota.context.close();

 // 12. Stale dialogs and repeated confirmation IDs cannot overwrite a newer run.
 const stale=await session(),s=stale.page,staleId=await add(s,'buffoon-normal');await begin(s,staleId);await s.locator('#performed').check();
 const corrected=await s.evaluate(async({storeURL,key})=>{const {createConfirmedStore,analysisBinding}=await import(storeURL),store=createConfirmedStore(()=>localStorage),loaded=store.load();if(!loaded.ok)throw Error('load');const result=store.correct({confirmationId:'external-pack-balance',confirmed:true,expected:analysisBinding(loaded.value.state),updatedAt:'2026-10-17T19:00:00Z',patch:{money:{status:'known',source:'manual',value:19}},reason:'Synthetic current observed balance.'});if(!result.ok)throw Error(JSON.stringify(result.errors));return localStorage.getItem(key);},{storeURL:moduleURL('storage/confirmed-store.js'),key});
 await s.locator('#dialog-accept').click();assert.equal(await raw(s),corrected);assert.match(await messages(s),/cambi|revisi|recarga|recalcula/i);await s.locator('#dialog-cancel').click();await closeEditor(s);await reload(s);
 await buy(s,staleId);saved=await record(s);assert.equal(saved.state.observed.money.value,15);
 const duplicate=await s.evaluate(async({storeURL,key})=>{const {createConfirmedStore,analysisBinding}=await import(storeURL),store=createConfirmedStore(()=>localStorage),loaded=store.load();if(!loaded.ok)throw Error('load');const last=loaded.value.history.at(-1),before=localStorage.getItem(key);const result=store.confirm({confirmationId:last.id,confirmed:true,expected:analysisBinding(loaded.value.state),updatedAt:'2026-10-17T19:01:00Z',action:last.action});return {ok:result.ok,code:result.ok?null:result.errors[0].code,unchanged:localStorage.getItem(key)===before};},{storeURL:moduleURL('storage/confirmed-store.js'),key});
 assert.deepEqual(duplicate,{ok:false,code:'duplicate_confirmation',unchanged:true});
 pass('stale-dialog-and-duplicate-id',{externalMoney:19,openingMoney:15,duplicateRejected:true},{externalMoney:19,openingMoney:15,duplicateRejected:true});await stale.context.close();

 // 13. Undo recovers the open context and persists that local correction.
 const undo=await session(),u=undo.page,undoId=await add(u,'buffoon-normal');const beforeBuy=(await record(u)).state;await buy(u,undoId);await skip(u);assert.equal((await record(u)).state.phase,'shop');
 await u.locator('#shop-undo').click();saved=await record(u);assert.equal(saved.state.phase,'open_pack');assert.equal(saved.state.observed.money.value,16);assert.equal(saved.state.phaseData.context.contents.status,'unknown');await reload(u,true);
 saved=await record(u);assert.equal(saved.history.at(-1).kind,'undo');assert.deepEqual(saved.state.assumptions,beforeBuy.assumptions);
 pass('undo-recovers-persistent-open-context',{contextRestored:true,moneyAfterUndoSkip:16,historyRetained:true},{contextRestored:true,moneyAfterUndoSkip:16,historyRetained:true});await undo.context.close();

 // 14. Readonly/mobile, free Celestial and unresolved Hallucination stay explicit.
 const writer=await session(),w=writer.page,writerId=await add(w,'buffoon-normal');before=await raw(w);const reader=await writer.context.newPage();watch(reader);await reader.goto(origin.href);await reader.waitForFunction(()=>document.querySelector('#ownership')?.textContent.includes('Modo lectura'));await go(reader,'table');await shelf(reader);await tile(reader,writerId).locator('.store-extra-inspect').click();assert.equal(await reader.locator(`[data-pack-confirm="${writerId}"]`).isDisabled(),true);assert.equal(await raw(reader),before);await writer.context.close();
 const mobile=await session(fixture(),{width:390,height:844}),m=mobile.page,mobileId=await add(m,'celestial-normal');await buy(m,mobileId);await fillPlanets(m);assert.equal(await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await m.locator('#pack-panel').screenshot({path:dir+'/mobile-content.png'});await observe(m);content=(await record(m)).state.phaseData.context.contents.value;await m.locator(`[data-pack-choose="${content[0].entryId}"]`).click();assert.equal(await m.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await m.screenshot({path:dir+'/mobile-confirmation.png',fullPage:false});await finish(m);assert.equal((await record(m)).state.observed.money.value,16);await mobile.context.close();
 const free=await session(fixture({jokers:[owned('astronomer','astronomer')]})),a=free.page,freeId=await add(a,'celestial-normal',0);await buy(a,freeId);assert.equal((await record(a)).state.observed.money.value,20);await skip(a);await free.context.close();
 const hallucination=await session(fixture({jokers:[owned('hallucination','hallucination')]})),h=hallucination.page,hId=await add(h,'buffoon-normal');before=await raw(h);await tile(h,hId).locator('.store-extra-inspect').click();const hb=h.locator(`[data-pack-confirm="${hId}"]`);if(await hb.isEnabled()){await hb.click();if(await h.locator('#confirmation[open]').count()){await h.locator('#performed').check();await h.locator('#dialog-accept').click();}}
 assert.equal(await raw(h),before);assert.match(await messages(h),/Hallucination|Alucinaci|resultado|azar|datos|outcome/i);assert.equal(await h.locator('#store-item-editor textarea,#confirmation textarea').count(),0,'Missing outcomes are explained without asking for technical JSON');await hallucination.context.close();
 pass('readonly-mobile390-astronomer-and-unresolved-outcome',{readonly:true,mobileOverflow:false,freeCelestialMoney:20,hallucinationUnchanged:true},{readonly:true,mobileOverflow:false,freeCelestialMoney:20,hallucinationUnchanged:true,physicalAndroid:false});

 assert.equal(report.cases.length,14);assert.deepEqual(report.pageErrors,[]);report.status='passed';await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');
 console.log('PASS SHOP02b',report.cases.length,'browser groups; synthetic observations, not gameplay');
}catch(error){report.status='failed';report.error=error.stack||String(error);await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');if(lastPage&&!lastPage.isClosed())await lastPage.screenshot({path:dir+'/failed.png',fullPage:true}).catch(()=>{});throw error;}
finally{await browser?.close();server?.kill();}
