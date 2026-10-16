import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {readFile, readdir, mkdir, writeFile} from 'node:fs/promises';
import {resolve, relative, extname, sep} from 'node:path';
import {chromium} from 'playwright';

// Test the deployable artifact, never the development server/source tree.
// GitHub project Pages mounts the same site beneath a repository-name prefix.
// The temporary Chrome context starts with no saved runs and uses a separate origin.
const artifact=resolve('out');
const prefix='/balatro-advisor/';
const port=4194,origin=`http://127.0.0.1:${port}`,base=origin+prefix;
const evidence='docs/evidencia/publicacion';
const key='balatro-advisor.confirmed.v1';
await mkdir(evidence,{recursive:true});
const report={date:new Date().toISOString(),mode:'static artifact under project subpath',mount:prefix,artifact:'out/',environment:'Chrome desktop and mobile emulation; temporary profile',gameObservation:false,cases:[]};
const pass=(id,expected,observed)=>report.cases.push({id,expected,observed,status:'passed'});
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.ttf':'font/ttf','.svg':'image/svg+xml'};
const server=createServer(async(req,res)=>{
  try{
    if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
    const path=decodeURIComponent(new URL(req.url,origin).pathname);
    if(!path.startsWith(prefix)){res.writeHead(404).end();return;}
    const local=path.slice(prefix.length)||'index.html',absolute=resolve(artifact,local);
    if(!absolute.startsWith(artifact+sep)){res.writeHead(403).end();return;}
    const bytes=await readFile(absolute);
    res.writeHead(200,{'Content-Type':mime[extname(absolute)]??'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(req.method==='HEAD'?undefined:bytes);
  }catch{res.writeHead(404).end();}
});
await new Promise((done,fail)=>{server.once('error',fail);server.listen(port,'127.0.0.1',done);});
let browser;
try{
  const files=[];
  const visit=async dir=>{for(const item of await readdir(dir,{withFileTypes:true})){const file=resolve(dir,item.name);if(item.isDirectory())await visit(file);else files.push(relative(artifact,file).replaceAll('\\','/'));}};
  await visit(artifact);
  assert.ok(files.includes('index.html'));
  assert.ok(files.includes('dist/src/ui/app.js'));
  assert.deepEqual(files.filter(f=>f.startsWith('examples/')).sort(),['examples/round-plan.json','examples/shop-purchase.json']);
  const forbidden=files.filter(f=>/\.(?:ts|log)$/i.test(f)||/(?:^|\/)(?:docs|tests|tools|node_modules|\.git|logs)(?:\/|$)/.test(f)||/(?:^|\/)\.env(?:\.|$)/.test(f)||/(?:counter[-_]?report|report\.json)/i.test(f));
  assert.deepEqual(forbidden,[],'Source declarations, evidence/logs and reports must not ship in the site artifact.');
  for(const file of files.filter(f=>f.endsWith('.js'))){
    const code=await readFile(resolve(artifact,file),'utf8');
    assert.doesNotMatch(code,/(?:from\s*|import\s*\(?\s*)['"]node:/,'Browser artifact must not contain Node module imports: '+file);
  }
  report.assetCount=files.filter(f=>f.startsWith('web/assets/')).length;
  report.fileCount=files.length;
  pass('artifact','Browser modules/assets and exactly two public examples; source/test/docs/Node imports excluded',{files:files.length,assets:report.assetCount,forbidden});
  for(const path of ['/', '/web/assets/jokers/catalog.json','/dist/src/ui/app.js','/examples/round-plan.json'])assert.equal((await fetch(origin+path)).status,404);
  assert.equal((await fetch(base+'index.html')).status,200);
  pass('subpath','Root-level web/dist/examples paths return 404; only project-mounted artifact is served',{mount:prefix,root:'404',index:'200'});

  browser=await chromium.launch({headless:true,channel:'chrome'});
  const ctx=await browser.newContext({viewport:{width:1440,height:1000}});
  const p=await ctx.newPage(),pageErrors=[],failed=[],external=[],loaded=new Set();
  const instrument=page=>{
    page.on('pageerror',e=>pageErrors.push(e.message));
    page.on('request',r=>{if(!r.url().startsWith(origin)&&!r.url().startsWith('data:'))external.push(r.url());});
    page.on('requestfailed',r=>failed.push({url:r.url(),error:r.failure()?.errorText}));
    page.on('response',r=>{if(r.status()>=400)failed.push({url:r.url(),status:r.status()});else loaded.add(r.url());});
  };
  instrument(p);
  const go=async(page,screen)=>{const link=page.locator(`[data-screen="${screen}"]`);if(await link.getAttribute('aria-current')!=='page')await link.click();};
  const stored=page=>page.evaluate(k=>localStorage.getItem(k),key);
  const ready=page=>page.waitForFunction(()=>document.querySelector('#ownership')?.textContent.includes('Esta pestaña tiene'));
  const add=async(page,id,button)=>{await page.locator('#bay-search').fill(id);await page.locator(`[data-bay-joker="${id}"]`).click();await page.locator(button).click();await page.locator('#bay-dialog').waitFor({state:'hidden'});};
  await p.goto(base);await ready(p);
  await p.waitForFunction(()=>document.querySelectorAll('.bay-mini').length===150);
  await p.evaluate(()=>document.fonts.ready);
  assert.equal(await p.evaluate(()=>document.fonts.check('16px "Balatro Pixel"')),true);
  assert.equal(await stored(p),null);
  await p.locator('#money').fill('20');await p.locator('#ante').fill('1');
  for(const id of ['j_joker','j_banner','j_greedy_joker','j_lusty_joker','j_even_steven'])await add(p,id,'#bay-add');
  for(const id of ['j_half','j_sly','j_crafty'])await add(p,id,'#bay-candidate');
  await p.waitForFunction(()=>document.querySelectorAll('.inventory-panel .fit-score').length===5&&document.querySelectorAll('.candidate-info>.fit-score').length===3&&[...document.querySelectorAll('.candidate-info>.fit-score')].every(n=>/^\d+\.\d$/.test(n.textContent)));
  assert.equal(await p.locator('.scenario').count(),0);
  assert.equal(await p.locator('#coverage').isChecked(),false);
  const labels=await p.locator('.inventory-panel .fit-score,.candidate-info>.fit-score').allTextContents();
  assert.equal(labels.length,8);for(const label of labels)assert.match(label.trim(),/^\d+\.\d$/);
  assert.equal(await stored(p),null);
  for(const path of ['web/assets/fonts/m6x11plus.ttf','web/assets/jokers/catalog.json','web/assets/jokers/atlas.png','web/assets/vouchers/atlas.png'])assert.ok(loaded.has(base+path),'Asset should be loaded from project subpath: '+path);
  pass('basic-fit','150 gallery entries, local font/atlases/catalog load; five owned and three candidates rated without plans/save',{gallery:150,indices:labels,plans:0,stored:null});
  await p.waitForFunction(()=>document.querySelectorAll('#composition-overview .composition-bar').length===6);
  assert.equal(await p.locator('#table-view #composition-overview').count(),1);
  const compositionSections=await p.locator('#composition-overview .composition-bar').evaluateAll(bars=>bars.map(bar=>bar.dataset.section));
  assert.deepEqual([...compositionSections].sort(),['deck','economy','growth','resources','scoring','synergy']);
  assert.match((await p.locator('#composition-score>strong').innerText()).trim(),/^(?:\d+\.\d|\d+\.\d–\d+\.\d|≥\d+\.\d)$/);
  await p.locator('#composition-score').click();await p.locator('#composition-details').waitFor({state:'visible'});
  assert.match(await p.locator('#composition-details').innerText(),/Encaje global/);
  await p.locator('#composition-details').getByRole('button',{name:'Cerrar',exact:true}).click();
  assert.equal(await stored(p),null);
  pass('composition-overview','Static artifact includes global composition and all six sections; inspecting explanations does not save actual data',{sections:compositionSections,globalLabel:await p.locator('#composition-score>strong').innerText(),stored:null});
  await p.locator('#bay-search').fill('');
  for(const width of [1440,390]){
    await p.setViewportSize({width,height:width===390?844:1000});
    await p.evaluate(()=>scrollTo(0,0));
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await p.screenshot({path:`${evidence}/static-${width===390?'mobile':'desktop'}.png`,fullPage:true});
  }
  pass('responsive','Static project deployment has no document overflow at 390px or 1440px',{widths:[390,1440],physicalAndroidTest:false});

  // A second isolated context tests the independently documented 80→572 hand oracle.
  const exactCtx=await browser.newContext({viewport:{width:1440,height:1000}});
  try{
    const e=await exactCtx.newPage();instrument(e);await e.goto(base);await ready(e);
    await e.waitForFunction(()=>document.querySelectorAll('.bay-mini').length===150);
    const exampleResponse=await fetch(base+'examples/shop-purchase.json');assert.equal(exampleResponse.status,200);
    const exampleText=await exampleResponse.text();
    const template=await fetch(base+'examples/round-plan.json');assert.equal(template.status,200);assert.equal((await template.json()).schemaVersion,'scenario-1');
    await e.locator('.coverage-note>summary').click();await e.locator('#coverage').check();
    await e.locator('#money').fill('7');await e.locator('#blind-kind').selectOption('big');
    await add(e,'j_half','#bay-candidate');
    await go(e,'evaluation');
    await e.getByRole('button',{name:'Añadir plantilla hipotética: dos parejas',exact:true}).click();
    await e.locator('.scenario').waitFor();
    await e.locator('#calculate-hands').click();
    await e.waitForFunction(()=>document.querySelector('#hand-results')?.textContent.includes('80 → 572 puntos'));
    assert.equal(await stored(e),null);
    pass('hand-oracle','Round-plan fetched at project subpath; pair baseline80 and Half Joker572 independently documented; no saved state',{result:'80 → 572 puntos',stored:null});
    await e.locator('#demo').click();await e.locator('.demo-banner').waitFor();
    assert.equal(await stored(e),null);assert.equal(await e.locator('#advice button[data-write]').count(),0);
    pass('public-examples','Both public example paths work and independent demo cannot register actions',{demo:true,template:true,stored:null});

    await go(e,'archive');
    await e.locator('#import-file').setInputFiles({name:'public-example.json',mimeType:'application/json',buffer:Buffer.from(exampleText)});
    await e.locator('#confirmation').waitFor({state:'visible'});
    assert.equal(await stored(e),null,'Importing a file is not confirmation to replace real data.');
    await e.locator('#dialog-accept').click();
    const before=await stored(e);assert.ok(before);
    const record=JSON.parse(before);assert.equal(record.state.runId,'synthetic-h2-s01');assert.equal(record.state.observed.money.value,7);assert.deepEqual(record.history,[]);
    await e.reload();await ready(e);assert.equal(await stored(e),before);assert.equal(await e.locator('#money').inputValue(),'7');await go(e,'table');
    assert.equal(await e.locator('.scenario').count(),0,'Transient hand plans are not copied into the saved actual state.');
    await add(e,'j_half','#bay-candidate');await e.waitForFunction(()=>/^\d+\.\d$/.test(document.querySelector('.candidate-info>.fit-score')?.textContent??''));
    assert.equal(await stored(e),before);
    await go(e,'evaluation');await e.locator('#demo').click();await e.locator('.demo-banner').waitFor();assert.equal(await stored(e),before);
    pass('persistence','Explicit H1 example import creates T09 record; reload recovers money/revision; consulting fit/demo leaves record byte-for-byte unchanged',{runId:record.state.runId,revision:record.state.revision,money:7,history:0,storedOnConfirmationOnly:true});
  }finally{await exactCtx.close();}
  assert.deepEqual(pageErrors,[]);assert.deepEqual(failed,[]);assert.deepEqual(external,[]);
  report.requests={internalLoaded:loaded.size,externalCount:external.length,failed,pageErrors};
  report.status='passed';
  await writeFile(evidence+'/static-report.json',JSON.stringify(report,null,2)+'\n');
  console.log('PASS static project subpath: clean artifact,150gallery/assets,font,8basicindices,no-root-fallback,80→572,demo/template,explicitpersist/reload/no-consult-writes,390/1440,noexternalrequests/errors');
}catch(error){
  report.status='failed';report.error=error.message;
  await writeFile(evidence+'/static-report.json',JSON.stringify(report,null,2)+'\n');throw error;
}finally{await browser?.close();await new Promise(done=>server.close(done));}
