import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {createHash} from 'node:crypto';

// RUN01a browser contract. Synthetic, observed fixtures; no gameplay observation.
// Money, revisions and history expectations below are independent literals.
const key='balatro-advisor.confirmed.v1',port='4198',origin='http://127.0.0.1:'+port;
const dir='docs/evidencia/run-migration';await mkdir(dir,{recursive:true});
const base=JSON.parse(await readFile('examples/shop-purchase.json','utf8'));
const known=value=>({status:'known',source:'manual',value});
function fixture(phase='shop'){
 const initial=structuredClone(base);initial.runId='synthetic-run-migration';initial.revision=4;initial.phase=phase;
 initial.updatedAt='2026-10-15T10:00:00Z';initial.observed.money=known(24);initial.observed.jokers=known([]);
 initial.observed.shop=known({shopId:'migration-shop',cardOffers:[{offerId:'joker-2',catalogId:'joker',label:'Joker',kind:'joker',price:known(2),edition:known('base'),stickers:known([])}],ignoredOtherOffers:[]});
 initial.assumptions.probes=[];initial.assumptions.roundPlans=[];
 const state=structuredClone(initial);state.revision=5;state.updatedAt='2026-10-15T10:01:00Z';state.observed.money=known(25);
 return {schemaVersion:'confirmed-1',initialState:initial,state,history:[{id:'legacy-correction',kind:'correction',before:structuredClone(initial),after:structuredClone(state),action:null,reason:'Synthetic transcription: observed $24 → $25.',targetEntryId:null,evidence:null,trace:[]}]};
}
const report={date:new Date().toISOString(),environment:'Chrome temporary profiles; desktop/mobile emulation',gameObservation:false,physicalAndroid:false,cases:[]};
const pageErrors=[],failedRequests=[];report.pageErrors=pageErrors;report.failedRequests=failedRequests;
const pass=(id,expected,observed)=>{report.cases.push({id,expected,observed,status:'passed'});console.log('PASS',id);};
const server=spawn(process.execPath,['dist/src/server.js'],{env:{...process.env,PORT:port},stdio:'pipe',windowsHide:true});let browser,lastPage;
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('RUN01a server timeout')),15000);server.stdout.on('data',d=>{if(String(d).includes('Balatro Advisor local')){clearTimeout(timer);resolve();}});server.on('error',e=>{clearTimeout(timer);reject(e);});server.on('exit',()=>{clearTimeout(timer);reject(Error('RUN01a server stopped'));});});
 browser=await chromium.launch({headless:true,channel:'chrome'});
 const raw=p=>p.evaluate(k=>localStorage.getItem(k),key),record=async p=>JSON.parse(await raw(p));
 const writes=p=>p.evaluate(()=>structuredClone(window.__migrationWrites));
 const go=async(p,screen)=>{if(await p.locator(`[data-screen="${screen}"]`).getAttribute('aria-current')!=='page')await p.locator(`[data-screen="${screen}"]`).click();};
 const ready=p=>p.waitForFunction(()=>document.querySelector('#ownership')?.textContent.includes('Esta pestaña tiene'));
 const messages=async p=>(await p.locator('#message,#dialog-error,#backup-error').allTextContents()).join(' ');
 const session=async(viewport={width:1440,height:1000})=>{
  const context=await browser.newContext({viewport,acceptDownloads:true});await context.addInitScript(k=>{
   window.__migrationWrites=[];window.__migrationFail=null;
   const original=Storage.prototype.setItem;Storage.prototype.setItem=function(name,value){
    if(window.__migrationFail==='all'||window.__migrationFail==='active'&&name===k||window.__migrationFail==='backup'&&name!==k)throw new DOMException('Synthetic migration quota failure','QuotaExceededError');
    original.call(this,name,value);window.__migrationWrites.push({key:name,value});
   };
  },key);
  const p=await context.newPage();lastPage=p;p.on('pageerror',e=>pageErrors.push(e.message));p.on('requestfailed',r=>failedRequests.push({url:r.url(),failure:r.failure()?.errorText}));await p.goto(origin);await ready(p);return {context,p};
 };
 const load=async(p,data)=>{await go(p,'archive');await p.locator('#import-file').setInputFiles({name:'legacy-confirmed.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});await p.locator('#confirmation').waitFor({state:'visible'});await p.locator('#dialog-accept').click();await p.locator('#confirmation').waitFor({state:'hidden'});};
 const preview=async p=>{await go(p,'archive');await p.locator('#run-migrate').click();await p.locator('#confirmation').waitFor({state:'visible'});await p.locator('#run-migration-preview').waitFor();};
 const migrate=async p=>{await preview(p);await p.locator('#dialog-accept').click();await p.locator('#confirmation').waitFor({state:'hidden'});};
 const downloadedText=async(p,selector)=>{const waiting=p.waitForEvent('download');await p.locator(selector).click();const file=await waiting;return {name:file.suggestedFilename(),text:await readFile(await file.path(),'utf8')};};
 const snapshots=r=>[r.initialState,r.state,...r.history.flatMap(e=>[e.before,e.after])];

 const main=await session(),{p}=main,legacy=fixture();await load(p,legacy);
 assert.deepEqual(await record(p),legacy,'Importing a legacy journal preserves its schema and all facts');
 let before=await raw(p),count=(await writes(p)).length;await go(p,'table');await p.locator('#composition-score').click();await p.locator('#composition-details').getByRole('button',{name:'Cerrar',exact:true}).click();assert.equal(await raw(p),before);assert.equal((await writes(p)).length,count);
 await preview(p);assert.equal(await raw(p),before);assert.equal((await writes(p)).length,count);assert.match(await p.locator('#run-migration-preview').innerText(),/0\.2|confirmed-2/);await p.screenshot({path:dir+'/desktop-preview.png',fullPage:true});await p.locator('#dialog-cancel').click();assert.equal(await raw(p),before);assert.equal((await writes(p)).length,count);
 pass('explicit-legacy-import-and-preview','Legacy import remains confirmed-1; consulting and migration preview/cancel cause zero writes',{schemaVersion:'confirmed-1',revision:5,history:1,previewWrites:0});

 await migrate(p);let migrated=await record(p);assert.equal(migrated.schemaVersion,'confirmed-2');assert.equal(migrated.state.schemaVersion,'0.2');assert.equal(migrated.state.phase,'shop');assert.equal(migrated.state.phaseData.origin.status,'unknown');assert.equal(migrated.state.revision,5);assert.equal(migrated.state.updatedAt,'2026-10-15T10:01:00Z');assert.equal(migrated.history.length,1);assert.equal(migrated.history[0].id,'legacy-correction');assert.deepEqual(migrated.history.map(e=>[e.before.revision,e.after.revision]),[[4,5]]);assert.ok(snapshots(migrated).every(s=>s.schemaVersion==='0.2'&&s.phase==='shop'&&s.phaseData.origin.status==='unknown'));
 for(let i=0;i<snapshots(legacy).length;i++){const old=snapshots(legacy)[i],current=snapshots(migrated)[i];assert.deepEqual(current.observed,old.observed);assert.deepEqual(current.assumptions,old.assumptions);assert.equal(current.updatedAt,old.updatedAt);assert.equal(current.revision,old.revision);}
 await go(p,'archive');const backup=await downloadedText(p,'#run-migration-backup');assert.equal(backup.text,before,'Backup must preserve exact prior bytes, not a reconstructed journal');
 const migrationWrites=(await writes(p)).slice(count);assert.equal(migrationWrites.filter(w=>w.key===key).length,1,'One atomic active-record replacement');const backupWrite=migrationWrites.findIndex(w=>w.key!==key);assert.ok(backupWrite>=0,'A prior backup must actually be persisted');assert.ok(backupWrite<migrationWrites.findIndex(w=>w.key===key),'Backup persists before active record changes');
 pass('confirmed-journal-migration-and-backup','Explicit migration converts every snapshot, preserves facts/revisions/history, backs up raw prior bytes before one atomic active write',{schemaVersion:'confirmed-2',stateSchema:'0.2',revision:5,history:1,shopOrigin:'unknown',backupExact:true});

 const saved=await raw(p);await p.reload();await ready(p);assert.equal(await raw(p),saved);await go(p,'table');assert.match(await p.locator('#run-progress').innerText(),/tienda/i);await p.screenshot({path:dir+'/desktop-migrated.png',fullPage:true});
 await p.locator('.candidate-card[data-offer-id="joker-2"] .candidate-hero').click();await p.locator('[data-shop-confirm="joker-2"]').click();await p.locator('#performed').check();await p.locator('#dialog-accept').click();await p.locator('#confirmation').waitFor({state:'hidden'});let r=await record(p);assert.equal(r.schemaVersion,'confirmed-2');assert.equal(r.state.revision,6);assert.equal(r.state.observed.money.value,23);assert.equal(r.state.observed.jokers.value.length,1);assert.equal(r.state.observed.shop.value.cardOffers.length,0);assert.equal(r.history.length,2);
 await p.locator('#shop-undo').click();r=await record(p);assert.equal(r.state.revision,7);assert.equal(r.state.observed.money.value,25);assert.equal(r.state.observed.jokers.value.length,0);assert.equal(r.state.observed.shop.value.cardOffers[0].offerId,'joker-2');assert.equal(r.history.length,3);assert.equal(r.history.at(-1).kind,'undo');assert.equal(r.state.phase,'shop');assert.equal(r.state.phaseData.origin.status,'unknown');
 await p.reload();await ready(p);assert.equal((await record(p)).state.revision,7);await go(p,'archive');const exported=await downloadedText(p,'#export');assert.deepEqual(JSON.parse(exported.text),await record(p));
 pass('v2-reload-buy-undo-export','Migrated V2 reloads, records $25−$2=$23 at revision6, undoes to $25 at revision7 and exports full history',{revision:7,money:25,owned:0,offers:1,history:3});
 await go(p,'table');await p.locator('#money').fill('26');await go(p,'archive');await p.locator('#edit-reason').fill('Synthetic observed balance correction after migration.');await p.getByRole('button',{name:'Guardar actualización que transcribí',exact:true}).click();r=await record(p);assert.equal(r.state.schemaVersion,'0.2');assert.equal(r.state.phase,'shop');assert.deepEqual(r.state.phaseData,migrated.state.phaseData);assert.equal(r.state.observed.money.value,26);assert.equal(r.state.revision,8);assert.equal(r.history.length,4);
 pass('v2-shop-transcription-preserves-phase','Ordinary explicit transcription keeps 0.2 and its phase data, records one correction and does not manufacture a transition',{schema:'0.2',phase:'shop',origin:'unknown',money:26,revision:8,history:4});

 const frozenReader=await p.evaluate(async state=>{const {validateState}=await import('/dist/src/state/legacy-validation.js');return validateState(state);},migrated.state);assert.equal(frozenReader.ok,false);assert.equal(frozenReader.errors[0].code,'unsupported_schema');
 pass('frozen-v1-state-reader-rejects-v2','Frozen pre-0.2 state validator rejects the new state schema without downgrade',{ok:false,code:'unsupported_schema'});
 if(process.env.LEGACY_READER_PATH){
  // Optional historical binary capture from clean 73554d7, made before compiling
  // RUN01a. Pins avoid labeling an arbitrary supplied module an old reader.
  for(const [file,sha] of [['storage/confirmed-store.js','601c993525725dadd147ac60eedff3f4e6d06a3c53f88ce8917e6f59a776c855'],['state/model.js','734efb9c871bf3d58244429437e53b2ed425a26519659e9359026669060d5417'],['state/validation.js','26f66a36a5e27fac159997b9c3545698a48b147c07245ca7219f0aa693dbc7c8']])assert.equal(createHash('sha256').update(await readFile(join(process.env.LEGACY_READER_PATH,file))).digest('hex'),sha,'Historical reader capture differs: '+file);
  const {createConfirmedStore,validateConfirmedRecord}=await import(pathToFileURL(join(process.env.LEGACY_READER_PATH,'storage','confirmed-store.js')).href);let oldWrites=0;const oldStorage={getItem:()=>saved,setItem:()=>{oldWrites++;}};
  const oldStore=createConfirmedStore(()=>oldStorage);assert.equal(validateConfirmedRecord(JSON.parse(saved)).ok,false);assert.equal(oldStore.load().ok,false);assert.equal(oldStore.initialize(legacy.state).ok,false);assert.equal(oldStore.confirm({confirmationId:'old-reader-hold',confirmed:true,expected:{runId:legacy.state.runId,revision:5,rulesetId:legacy.state.rulesetId},updatedAt:'2026-10-16T12:00:00Z',action:{type:'hold'}}).ok,false);assert.equal(oldWrites,0);
  pass('authentic-v1-record-reader-rejects-v2','Optional frozen compiled baseline reader rejects confirmed-2 and cannot silently overwrite it',{baseline:'73554d73d930eda1becd5178b4d67ed31cafead1',loadOk:false,writes:0});
 }
 await load(p,JSON.parse(backup.text));assert.deepEqual(await record(p),legacy,'Explicitly restoring the downloaded backup recovers the original history and facts');await migrate(p);assert.equal((await record(p)).state.revision,5);assert.equal((await record(p)).history.length,1);
 pass('backup-recovery-is-explicit','Downloaded raw backup can replace V2 only through confirmed import, restores original V1/history and can be migrated again',{restoredSchema:'confirmed-1',remigratedSchema:'confirmed-2',revision:5,history:1});
 await main.context.close();

 const oldEditable=await session();await load(oldEditable.p,fixture());await go(oldEditable.p,'table');await oldEditable.p.locator('.candidate-card[data-offer-id="joker-2"] .candidate-hero').click();await oldEditable.p.locator('[data-shop-confirm="joker-2"]').click();await oldEditable.p.locator('#performed').check();await oldEditable.p.locator('#dialog-accept').click();await oldEditable.p.locator('#confirmation').waitFor({state:'hidden'});r=await record(oldEditable.p);assert.equal(r.schemaVersion,'confirmed-1');assert.equal(r.state.schemaVersion,'0.1');assert.equal(r.state.revision,6);assert.equal(r.state.observed.money.value,23);assert.equal(r.history.length,2);await oldEditable.context.close();
 pass('legacy-actions-keep-their-version','Existing legal shop confirmation still works before opting in; it never silently upgrades the journal',{schema:'confirmed-1',stateSchema:'0.1',revision:6,money:23,history:2});

 const draft=await session();await load(draft.p,fixture('draft'));const draftOld=await record(draft.p);await migrate(draft.p);r=await record(draft.p);assert.equal(r.state.phase,'unknown');assert.ok(snapshots(r).every(s=>s.phase==='unknown'));assert.deepEqual(r.state.observed,draftOld.state.observed);assert.equal(r.state.revision,5);before=await raw(draft.p);count=(await writes(draft.p)).length;await go(draft.p,'table');assert.match(await draft.p.locator('#run-progress').innerText(),/desconoc|sin identificar|no identific|pendiente|sin confirmar|sin registrar/i);assert.equal(await draft.p.locator('#run-form').count(),0,'Unknown phase remains read-only instead of using a form that forces shop');assert.equal(await draft.p.getByRole('button',{name:/Salté|Jugué|Jugar ciega|Saltar ciega/}).count(),0,'B1 does not expose unimplemented transitions');assert.equal(await raw(draft.p),before);assert.equal((await writes(draft.p)).length,count);await draft.p.reload();await ready(draft.p);assert.equal((await record(draft.p)).state.phase,'unknown');await draft.context.close();
 pass('legacy-draft-does-not-invent-phase','Legacy draft maps to unknown in every snapshot, retains observations and revision, exposes no unimplemented play/skip action',{phase:'unknown',revision:5,noInventedBlindOrRound:true});

 for(const failure of ['backup','active']){
  const s=await session();await load(s.p,fixture());before=await raw(s.p);await preview(s.p);await s.p.evaluate(mode=>window.__migrationFail=mode,failure);await s.p.locator('#dialog-accept').click();assert.equal(await raw(s.p),before);assert.equal((await record(s.p)).schemaVersion,'confirmed-1');assert.match(await messages(s.p),/guardar|almacenamiento|respaldo|copia|cuota/i);assert.equal(await s.p.locator('#confirmation[open]').count(),1);await s.p.evaluate(()=>window.__migrationFail=null);await s.p.locator('#dialog-cancel').click();await s.p.reload();await ready(s.p);assert.equal(await raw(s.p),before);await migrate(s.p);assert.equal((await record(s.p)).schemaVersion,'confirmed-2');await s.context.close();
  pass('migration-'+failure+'-quota-failure','Failure '+failure+' leaves exact active confirmed-1 recoverable; explicit retry succeeds',{originalActiveBytesPreserved:true,retrySchema:'confirmed-2'});
 }

 const locking=await session();await load(locking.p,fixture());const writerBefore=await raw(locking.p);const second=await locking.context.newPage();second.on('pageerror',e=>pageErrors.push(e.message));await second.goto(origin);await second.waitForFunction(()=>document.querySelector('#ownership')?.textContent.includes('Modo lectura'));await go(second,'archive');assert.equal(await second.locator('#run-migrate').isDisabled(),true);assert.equal(await raw(second),writerBefore);const locks=await second.evaluate(()=>navigator.locks.query());assert.ok(locks.held.some(x=>x.name==='balatro-advisor-confirmed-writer-v1'));
 await migrate(locking.p);await second.waitForFunction(k=>JSON.parse(localStorage.getItem(k)).schemaVersion==='confirmed-2',key);assert.equal((await record(second)).schemaVersion,'confirmed-2');assert.match(await second.locator('#ownership').textContent(),/Modo lectura/);await locking.context.close();
 pass('same-key-same-writer-lock','Read-only tab cannot migrate; existing writer lock name and active key remain stable and V2 change is received',{activeKey:key,lock:'balatro-advisor-confirmed-writer-v1',readonlyMigrationDisabled:true});

 const mobile=await session({width:390,height:844});await load(mobile.p,fixture());await preview(mobile.p);assert.equal(await mobile.p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);const accept=await mobile.p.locator('#dialog-accept').boundingBox();assert.ok(accept&&accept.x>=0&&accept.x+accept.width<=390&&accept.y>=0&&accept.y+accept.height<=844,'Migration accept remains inside the mobile viewport');await mobile.p.screenshot({path:dir+'/mobile-preview.png',fullPage:true});await mobile.p.screenshot({path:dir+'/mobile-preview-viewport.png'});await mobile.p.locator('#dialog-accept').click();await mobile.p.locator('#confirmation').waitFor({state:'hidden'});await go(mobile.p,'table');assert.equal(await mobile.p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await mobile.p.screenshot({path:dir+'/mobile-migrated.png',fullPage:true});await mobile.context.close();
 pass('mobile-migration','Preview and confirmation fit 390px; migrated table does not overflow',{width:390,physicalAndroid:false});
 assert.deepEqual(pageErrors,[]);report.status='passed';report.pageErrors=pageErrors;await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');console.log('PASS RUN01a migration',report.cases.length,'groups');
}catch(error){report.status='failed';report.error=error.stack||error.message;if(lastPage&&!lastPage.isClosed())await lastPage.screenshot({path:dir+'/failed.png',fullPage:true}).catch(()=>{});await writeFile(dir+'/report.json',JSON.stringify(report,null,2)+'\n');throw error;}
finally{await browser?.close();server.kill();}
