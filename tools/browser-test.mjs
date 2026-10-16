import assert from 'node:assert/strict';
import {chromium,firefox} from 'playwright';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
const port=Number(process.env.TEST_PORT??4174),base=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['dist/src/server.js'],{env:{...process.env,PORT:String(port)},stdio:'pipe',windowsHide:true});
await new Promise((resolve,reject)=>{server.stdout.on('data',d=>{if(String(d).includes('Balatro Advisor local'))resolve();});server.on('error',reject);server.on('exit',code=>reject(new Error(`Server exited ${code}`)));});
const engine=process.env.TEST_BROWSER==='firefox'?'firefox':'chromium';
const evidenceDir=process.env.TEST_BROWSER?`docs/evidencia/t11/${engine}`:'docs/evidencia/t10';
const browser=await (engine==='firefox'?firefox:chromium).launch({headless:true,...(engine==='chromium'&&process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})}).catch(error=>{server.kill();throw error;});
const results=[],errors=[];let context;
const key='balatro-advisor.confirmed.v1';
const raw=p=>p.evaluate(k=>localStorage.getItem(k),key);
const state=async p=>JSON.parse(await raw(p));
const revealDetails=async(p,selector)=>{const d=p.locator(selector);if(await d.count()&&!await d.evaluate(e=>e.open))await d.locator(':scope > summary').click();};
const go=async(p,screen)=>{const link=p.locator('[data-screen="'+screen+'"]');if(await link.getAttribute('aria-current')!=='page')await link.click();};
const storage=async p=>{if(!await p.locator('.storage-status').evaluate(e=>e.open))await p.locator('.storage-status > summary').click();};
const check=(name,fn)=>fn().then(()=>{results.push(name);console.log('PASS',name);});
const observeOffer=async(p,id)=>{
  await p.locator('#bay-search').fill(id);await p.locator(`[data-bay-joker="${id}"]`).click();await p.locator('#bay-candidate').click();await p.locator('#bay-dialog').waitFor({state:'hidden'});
  await p.locator(`.candidate-card[data-candidate="${id}"]`).waitFor();
};
let observationCount=0;
try{
  context=await browser.newContext({viewport:{width:1280,height:900},acceptDownloads:true});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.waitForFunction(()=>document.querySelector('#ownership').textContent.includes('Esta pestaña tiene'));
  await check('crear partida mediante formularios, errores junto al campo y valores desconocidos',async()=>{
    assert.equal(await page.locator('#edit-reason').count(),0);assert.equal(await page.locator('#revision').innerText(),'Sin copia guardada');
    await go(page,'table');await revealDetails(page,'.coverage-note');await page.locator('#coverage').check();await go(page,'table');await page.locator('#money').fill('-21'); // Debt through -20 is structurally supported.
    await go(page,'archive');await page.getByRole('button',{name:'Crear y guardar mi partida'}).click();await go(page,'table');assert.match(await page.locator('#money-error').innerText(),/entero/);assert.equal(await raw(page),null);
    await go(page,'table');await page.locator('#money').fill('7');await page.locator('#blind-kind').selectOption('big');assert.equal(await page.locator('#target').inputValue(),'450');assert.equal(await page.locator('#reward').inputValue(),'4');
    await go(page,'archive');await page.getByRole('button',{name:'Crear y guardar mi partida'}).click();await go(page,'table');
    assert.equal((await state(page)).state.observed.money.value,7);assert.equal((await state(page)).state.revision,0);
    await observeOffer(page,'j_joker');await observeOffer(page,'j_half');observationCount=(await state(page)).history.length;
    assert.equal(observationCount,2);assert.equal((await state(page)).state.observed.shop.value.cardOffers.length,2);
  });
  await check('consulta real H3 con escenario explícito no modifica el registro',async()=>{
    await go(page,'evaluation');await page.getByRole('button',{name:'Añadir plantilla hipotética: dos parejas'}).click();await page.locator('.scenario').waitFor();
    const before=await raw(page);await page.locator('#analyze').click();assert.equal(await raw(page),before);
    assert.match(await page.locator('#advice').innerText(),/Preferencia condicional/);assert.match(await page.locator('#advice').innerText(),/572 puntos/);
  });
  let firstId,oldState;
  await check('confirmar compra, guardar historial y evitar doble pulsación',async()=>{
    oldState=(await state(page)).state;
    await page.locator('#advice .preferred').getByRole('button',{name:'Registrar que hice esta acción'}).click();
    await page.locator('#dialog-accept').click();assert.match(await page.locator('#dialog-error').innerText(),/Marca la confirmación/);
    await page.locator('#performed').check();await page.locator('#observed-balance').fill('2');
    await page.locator('#dialog-accept').evaluate(b=>{b.click();b.click();});
    const saved=await state(page);firstId=saved.history.at(-1).id;assert.equal(saved.state.revision,observationCount+1);assert.equal(saved.history.length,observationCount+1);assert.equal(saved.state.observed.money.value,2);
    assert.equal(saved.state.observed.jokers.value[0].catalogId,'half_joker');assert.match(await page.locator('#advice').innerText(),/Vuelve a consultar/);
  });
  await check('revisión antigua y duplicado rechazados sobre almacenamiento real',async()=>{
    const result=await page.evaluate(async({oldState,firstId})=>{
      const {createConfirmedStore,analysisBinding}=await import('/dist/src/storage/confirmed-store.js');const store=createConfirmedStore(()=>localStorage);
      const base={confirmed:true,expected:analysisBinding(oldState),updatedAt:new Date().toISOString(),action:{type:'hold'}};
      return [store.confirm({...base,confirmationId:'old-ui'}),store.confirm({...base,confirmationId:firstId})];
    },{oldState,firstId});assert.equal(result[0].errors[0].code,'stale_revision');assert.equal(result[1].errors[0].code,'duplicate_confirmation');assert.equal((await state(page)).history.length,observationCount+1);
  });
  await check('recarga recupera partida y permite corregir/deshacer sin borrar historial',async()=>{
    await page.reload();await page.waitForFunction(()=>document.querySelector('#ownership').textContent.includes('Esta pestaña tiene'));
    assert.equal(await page.locator('#money').inputValue(),'2');await go(page,'table');await page.locator('#money').fill('3');await go(page,'archive');await page.locator('#edit-reason').fill('Corregí el saldo transcrito');
    await go(page,'archive');await page.getByRole('button',{name:'Guardar actualización que transcribí'}).click();await go(page,'table');assert.equal((await state(page)).state.revision,observationCount+2);
    await go(page,'archive');await page.getByRole('button',{name:'Deshacer la última entrada'}).click();await page.locator('#undo-reason').fill('La corrección fue un error');await page.locator('#dialog-accept').click();
    assert.equal((await state(page)).state.revision,observationCount+3);assert.equal((await state(page)).state.observed.money.value,2);assert.equal((await state(page)).history.length,observationCount+3);
  });
  await check('exportar e importar: validación, confirmación previa y cancelación conserva registro',async()=>{
    const before=await raw(page);const downloaded=page.waitForEvent('download');await go(page,'archive');await page.locator('#export').click();const download=await downloaded;assert.equal(download.suggestedFilename(),'balatro-partida.json');
    await go(page,'archive');await page.locator('#import-file').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{bad')});assert.equal(await raw(page),before);assert.match(await page.locator('#message').innerText(),/JSON inválido/);
    await go(page,'archive');await page.locator('#import-file').setInputFiles({name:'copy.json',mimeType:'application/json',buffer:Buffer.from(before)});await page.locator('#confirmation').waitFor({state:'visible'});assert.equal(await raw(page),before);
    await page.locator('#dialog-cancel').click();assert.equal(await raw(page),before);
    await go(page,'archive');await page.locator('#import-file').setInputFiles({name:'copy.json',mimeType:'application/json',buffer:Buffer.from(before)});await page.locator('#confirmation').waitFor({state:'visible'});await page.locator('#dialog-accept').click();assert.equal((await state(page)).history.length,observationCount+3);
  });
  await check('fallo de almacenamiento no anuncia éxito ni cambia estado/historial',async()=>{
    const before=await raw(page);await page.evaluate(()=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('test quota','QuotaExceededError');};});
    await go(page,'table');await page.locator('#money').fill('4');await go(page,'archive');await page.locator('#edit-reason').fill('Prueba de cuota');await go(page,'archive');await page.getByRole('button',{name:'Guardar actualización que transcribí'}).click();await go(page,'table');
    assert.equal(await raw(page),before);assert.match(await page.locator('#message').innerText(),/No se pudo guardar/);
    await page.evaluate(()=>Storage.prototype.setItem=window.originalSetItem);await page.reload();await page.waitForFunction(()=>document.querySelector('#ownership').textContent.includes('Esta pestaña tiene'));
  });
  const second=await context.newPage();second.on('pageerror',e=>errors.push(e.message));
  await check('dos pestañas: exclusión real, solicitud en espera, liberación y nuevo propietario',async()=>{
    await second.goto(base);await second.waitForFunction(()=>document.querySelector('#ownership').textContent.includes('Modo lectura'));
    await go(second,'archive');assert.equal(await second.getByRole('button',{name:'Guardar actualización que transcribí'}).isDisabled(),true);
    await storage(second);await second.getByRole('button',{name:'Solicitar control'}).click();await second.waitForFunction(()=>document.querySelector('#ownership').textContent.includes('Esperando control'));
    const locks=await second.evaluate(()=>navigator.locks.query());assert.equal(locks.held.length,1);assert.equal(locks.pending.length,1);
    await storage(page);await page.getByRole('button',{name:'Liberar control'}).click();await second.waitForFunction(()=>document.querySelector('#ownership').textContent.includes('Esta pestaña tiene'));
    await go(page,'archive');assert.equal(await page.getByRole('button',{name:'Guardar actualización que transcribí'}).isDisabled(),true);
    await go(second,'table');await second.locator('#money').fill('6');await go(second,'archive');await second.locator('#edit-reason').fill('Registro desde pestaña nueva');await go(second,'archive');await second.getByRole('button',{name:'Guardar actualización que transcribí'}).click();await go(second,'table');
    await page.waitForFunction(()=>document.querySelector('#money').value==='6');assert.equal((await state(page)).state.revision,observationCount+4);
  });
  await check('cierre del escritor libera bloqueo y permite continuar',async()=>{
    await storage(page);await page.getByRole('button',{name:'Solicitar control'}).click();await second.close();await page.waitForFunction(()=>document.querySelector('#ownership').textContent.includes('Esta pestaña tiene'));
    assert.equal((await page.evaluate(()=>navigator.locks.query())).held.length,1);
  });
  await check('demostración independiente sin escritura y revisión visual escritorio/móvil emulado',async()=>{
    const before=await raw(page);await go(page,'evaluation');await page.locator('#demo').click();await page.locator('.demo-banner').waitFor();assert.equal(await raw(page),before);assert.equal(await page.locator('#advice button[data-write]').count(),0);
    await mkdir(evidenceDir,{recursive:true});await page.screenshot({path:`${evidenceDir}/escritorio.png`,fullPage:true});
    await go(page,'table');await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${evidenceDir}/escritorio-viewport.png`});
    await page.setViewportSize({width:390,height:844});await page.screenshot({path:`${evidenceDir}/movil-emulado.png`,fullPage:true});
    await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${evidenceDir}/movil-viewport.png`});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.setViewportSize({width:360,height:800});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  });
  await check('sin Web Locks el navegador permanece en lectura, sin persistencia insegura',async()=>{
    const isolated=await browser.newContext();try{
      await isolated.addInitScript(()=>Object.defineProperty(navigator,'locks',{value:undefined}));
      const readonly=await isolated.newPage();await readonly.goto(base);
      await go(readonly,'archive');assert.equal(await readonly.getByRole('button',{name:'Crear y guardar mi partida'}).isDisabled(),true);
      assert.equal(await raw(readonly),null);
    }finally{await isolated.close();}
  });
  await check('teclado: recorrer controles, crear con desconocidos y cerrar diálogo con Escape',async()=>{
    const ctx=await browser.newContext();try{
      const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base);
      await p.waitForFunction(()=>document.querySelector('#ownership').textContent.includes('Esta pestaña tiene'));
      await revealDetails(p,'.coverage-note');for(let i=0;i<80 && !await p.locator('#coverage').evaluate(e=>e===document.activeElement);i++)await p.keyboard.press('Tab');
      assert.equal(await p.locator('#coverage').evaluate(e=>e===document.activeElement),true);await p.keyboard.press('Space');
      await go(p,'archive');await p.getByRole('button',{name:'Crear y guardar mi partida'}).focus();await p.keyboard.press('Enter');
      assert.equal((await state(p)).state.observed.money.status,'unknown');
      const before=await raw(p);await go(p,'archive');await p.locator('#import-file').setInputFiles({name:'copy.json',mimeType:'application/json',buffer:Buffer.from(before)});
      await p.locator('#confirmation').waitFor({state:'visible'});await p.keyboard.press('Escape');
      assert.equal(await p.locator('#confirmation').isVisible(),false);assert.equal(await raw(p),before);
    }finally{await ctx.close();}
  });
  await check('tacto emulado 360px: crear, consultar, confirmar compra y recuperar',async()=>{
    const ctx=await browser.newContext({viewport:{width:360,height:800},hasTouch:true,...(engine==='chromium'?{isMobile:true}:{})});try{
      const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base);
      await p.waitForFunction(()=>document.querySelector('#ownership').textContent.includes('Esta pestaña tiene'));
      await go(p,'table');await revealDetails(p,'.coverage-note');await p.locator('#coverage').tap();await go(p,'table');await p.locator('#money').fill('7');await p.locator('#blind-kind').selectOption('big');assert.equal(await p.locator('#target').inputValue(),'450');assert.equal(await p.locator('#reward').inputValue(),'4');
      await go(p,'archive');await p.getByRole('button',{name:'Crear y guardar mi partida'}).tap();await go(p,'table');
      await observeOffer(p,'j_half');
      await go(p,'evaluation');await p.getByRole('button',{name:'Añadir plantilla hipotética: dos parejas'}).tap();await p.locator('.scenario').waitFor();
      const before=await raw(p);await p.locator('#analyze').tap();assert.equal(await raw(p),before);assert.match(await p.locator('#advice').innerText(),/572 puntos/);
      await p.locator('#advice .preferred').getByRole('button',{name:'Registrar que hice esta acción'}).tap();await p.locator('#performed').tap();await p.locator('#dialog-accept').tap();
      assert.equal((await state(p)).state.observed.money.value,2);await p.reload();assert.equal((await state(p)).history.length,2);
      assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    }finally{await ctx.close();}
  });
  assert.deepEqual(errors,[]);
  await check('T07c cota S09 sin escenario, sin escritura e invalidación al editar',async()=>{
    const ctx=await browser.newContext();try{
      const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base);
      await p.waitForFunction(()=>document.querySelector('#ownership').textContent.includes('Esta pestaña tiene'));
      await go(p,'archive');await p.locator('#import-file').setInputFiles({name:'s09.json',mimeType:'application/json',buffer:await readFile('examples/s09-bound.json')});
      await p.locator('#confirmation').waitFor({state:'visible'});await p.locator('#dialog-accept').click();
      const before=await raw(p);await go(p,'evaluation');await p.locator('#check-bounds').click();
      assert.match(await p.locator('#bounds').innerText(),/151125/);assert.match(await p.locator('#bounds').innerText(),/169000/);
      assert.match(await p.locator('#bounds').innerText(),/reglas provisionales/);assert.equal(await raw(p),before);
      await p.setViewportSize({width:360,height:800});assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await p.locator('.app-header').evaluate(el=>el.hidden=true); await p.locator('#bounds').screenshot({path:`${evidenceDir}/cotas-s09.png`}); await p.locator('.app-header').evaluate(el=>el.hidden=false);
      await go(p,'table');await p.locator('#money').fill('29');assert.equal(await p.locator('#bounds').innerText(),'');
      await go(p,'evaluation');await p.locator('#check-bounds').click();assert.match(await p.locator('#message').innerText(),/Guarda los datos/);assert.equal(await raw(p),before);
    }finally{await ctx.close();}
  });
  assert.deepEqual(errors,[]);
  await check('T08c consejo de venta individual, sacrificio y confirmación sin copiar cobro hipotético',async()=>{
    const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});try{
      const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base);
      await p.waitForFunction(()=>document.querySelector('#ownership').textContent.includes('Esta pestaña tiene'));
      await go(p,'archive');await p.locator('#import-file').setInputFiles({name:'sale.json',mimeType:'application/json',buffer:await readFile('examples/sale-psychic.json')});
      await p.locator('#confirmation').waitFor({state:'visible'});await p.locator('#dialog-accept').tap();
      const before=await raw(p),beforeState=await state(p);
      await go(p,'evaluation');await p.getByRole('button',{name:'Añadir escenario vacío'}).tap();
      await p.locator('input[id^="description-"]').fill('Pareja ante Psychic');
      await p.locator('input[id^="initial-"]').fill('8S 8H 2D 5C KS 3S 4H 6D');
      await p.locator('input[id^="basis-"]').fill('Escenario sintético de prueba; no robos observados');
      await p.locator('input[id^="cards-"]').fill('8S 8H 2D 5C KS');
      await p.locator('input[id^="draws-"]').fill('7S 7H 9D JC QS');await p.locator('input[id^="cash-"]').check();
      await p.locator('#analyze').tap();assert.equal(await raw(p),before);
      await p.getByRole('button',{name:'Ver Vender Half Joker',exact:true}).click();
      const card=p.locator('#advice .preferred').filter({has:p.getByRole('heading',{name:'Vender Half Joker',exact:true})});
      assert.equal(await card.count(),1);assert.match(await card.innerText(),/696 puntos/);assert.match(await card.innerText(),/Ingreso por venta: 2/);
      assert.match(await card.innerText(),/saldo tras cobro: 23/);assert.match(await card.innerText(),/Sacrificas: Half Joker/);
      assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await p.locator('.app-header').evaluate(el=>el.hidden=true); await card.screenshot({path:`${evidenceDir}/venta-half.png`}); await p.locator('.app-header').evaluate(el=>el.hidden=false);
      await card.getByRole('button',{name:'Registrar que hice esta acción'}).tap();await p.locator('#performed').tap();await p.locator('#observed-balance').fill('12');await p.locator('#dialog-accept').tap();
      const after=await state(p);assert.equal(after.state.observed.money.value,12);assert.equal(after.state.revision,1);assert.equal(after.history.length,1);
      assert.deepEqual(after.history[0].action,{type:'sell',instanceId:'half_joker'});
      assert.deepEqual(after.state.observed.shop,beforeState.state.observed.shop);assert.equal(after.state.observed.jokers.value.length,2);
      await p.reload();assert.equal((await state(p)).state.observed.money.value,12);
    }finally{await ctx.close();}
  });
  assert.deepEqual(errors,[]);
  await check('T08c horizonte explícito S03, cobros por rama, cero escrituras e invalidación',async()=>{
    const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});try{
      const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base);
      await p.waitForFunction(()=>document.querySelector('#ownership').textContent.includes('Esta pestaña tiene'));
      await go(p,'archive');await p.locator('#import-file').setInputFiles({name:'s03.json',mimeType:'application/json',buffer:await readFile('examples/horizon-golden-state.json')});
      await p.locator('#confirmation').waitFor({state:'visible'});await p.locator('#dialog-accept').tap();const before=await raw(p);
      await go(p,'evaluation');await p.getByRole('button',{name:'Añadir plantilla hipotética: dos parejas'}).tap();await p.locator('.scenario').waitFor();
      await p.locator('#horizon-panel > summary').tap();await p.locator('#prepare-horizon').tap();
      await go(p,'evaluation');await p.locator('#analyze-horizon').tap();assert.match(await p.locator('#message').innerText(),/Selecciona cada ciega/);assert.equal(await raw(p),before);
      await p.locator('#horizon-ante-1').fill('2');await p.locator('#horizon-kind-1').selectOption('big');
      await p.locator('#horizon-target-1').fill('1200');await p.locator('#horizon-reward-1').fill('4');
      await p.locator('#horizon-basis-1').fill('Big consecutiva hipotética, sin tienda intermedia');await p.locator('#horizon-fixed').check();
      await go(p,'evaluation');await p.locator('#analyze-horizon').tap();
      const results=p.locator('#horizon-results');assert.match(await results.innerText(),/Empate o compromiso/);
      const hold=results.locator('article').filter({has:p.getByRole('heading',{name:'Conservar, sin comprar',exact:true})});
      const buy=results.locator('article').filter({has:p.getByRole('heading',{name:'Comprar Golden Joker',exact:true})});
      assert.match(await hold.innerText(),/saldo tras cobro: 37/);assert.match(await hold.innerText(),/saldo tras cobro: 50/);
      assert.match(await buy.innerText(),/Saldo tras tienda: 19/);assert.match(await buy.innerText(),/saldo tras cobro: 33/);assert.match(await buy.innerText(),/saldo tras cobro: 50/);
      assert.equal(await results.getByRole('button').count(),0);assert.equal(await raw(p),before);
      assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await p.locator('.app-header').evaluate(el=>el.hidden=true); await buy.screenshot({path:`${evidenceDir}/horizonte-golden.png`}); await p.locator('.app-header').evaluate(el=>el.hidden=false);
      await p.locator('#horizon-target-1').fill('1199');assert.equal(await results.innerText(),'');
      await go(p,'evaluation');await p.locator('#analyze-horizon').tap();assert.match(await results.innerText(),/Sin base suficiente/);assert.equal(await raw(p),before);
      await p.locator('#horizon-target-1').fill('1200');await go(p,'evaluation');await p.locator('#analyze-horizon').tap();
      await p.locator('input[id^="description-"]').fill('Plan modificado');assert.equal(await results.innerText(),'');
      await go(p,'evaluation');await p.locator('#analyze-horizon').tap();assert.match(await results.innerText(),/50/);
      await go(p,'table');await p.locator('#money').fill('24');assert.equal(await results.innerText(),'');await go(p,'evaluation');await p.locator('#analyze-horizon').tap();
      assert.match(await p.locator('#message').innerText(),/Guarda los datos editados/);assert.equal(await raw(p),before);
    }finally{await ctx.close();}
  });
  assert.deepEqual(errors,[]);
  await check('T08c-3 S04/S06: sinergias, jefe fuera del plan y sacrificios visibles sin escribir',async()=>{
    const known=value=>({status:'known',source:'manual',value});
    for(const id of ['S04','S06']){
      const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});try{
        const s=JSON.parse(await readFile('examples/shop-purchase.json','utf8'));
        s.observed.money=known(id==='S04'?10:8);
        s.observed.lastCleared=known({ante:2,kind:id==='S04'?'small':'big'});
        s.observed.nextBlind=known({ante:2,kind:id==='S04'?'big':'boss',bossId:known(id==='S04'?'none':'the_water'),target:known(id==='S04'?1200:1600),reward:known(id==='S04'?4:5)});
        s.observed.visibleBoss=known({ante:2,kind:'boss',bossId:known(id==='S04'?'the_wall':'the_water'),target:known(id==='S04'?3200:1600),reward:known(5)});
        s.observed.jokers=known((id==='S04'?['half_joker']:['half_joker','banner']).map(catalogId=>({instanceId:catalogId,catalogId,edition:known('base'),stickers:known([]),sellValue:known(2),counters:{}})));
        s.observed.shop.value.cardOffers=(id==='S04'?['scholar','even_steven']:['scholar']).map(catalogId=>({offerId:catalogId,catalogId,label:catalogId,kind:'joker',price:known(4),edition:known('base'),stickers:known([])}));
        const p=await ctx.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(base);
        await p.waitForFunction(()=>document.querySelector('#ownership').textContent.includes('Esta pestaña tiene'));
        await go(p,'archive');await p.locator('#import-file').setInputFiles({name:id+'.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(s))});
        await p.locator('#confirmation').waitFor({state:'visible'});await p.locator('#dialog-accept').tap();const before=await raw(p);
        for(const [name,initial,played,draws] of [['Ases','AS AH KS QH JD 4C 5S 6H','AS AH','2S 2H'],...(id==='S04'?[['Ochos adverso','8S 8H KS QH JD 4C 5S 6H','8S 8H','2S 2H']]:[])]){
          await go(p,'evaluation');await p.getByRole('button',{name:'Añadir escenario vacío'}).tap();const row=p.locator('.scenario').last();
          await row.locator('input[id^="description-"]').fill(name);await row.locator('input[id^="initial-"]').fill(initial);
          await row.locator('input[id^="basis-"]').fill('Caso documental sintético, no predicción');
          await row.locator('input[id^="cards-"]').fill(played);await row.locator('input[id^="draws-"]').fill(draws);await row.locator('input[id^="cash-"]').check();
        }
        await p.locator('#analyze').tap();assert.equal(await raw(p),before);
        await p.getByRole('button',{name:'Ver Comprar Scholar',exact:true}).click();
        const buy=p.locator('#advice article').filter({has:p.getByRole('heading',{name:'Comprar Scholar',exact:true})});
        assert.match(await buy.innerText(),/2160 puntos/);
        if(id==='S04'){
          assert.match(await p.locator('#advice > .notice').innerText(),/the_wall/);assert.match(await buy.innerText(),/Objetivo no alcanzado en este plan · 572/);
          await buy.locator('summary').filter({hasText:'Condiciones y limitaciones'}).tap();assert.match(await buy.innerText(),/4 ases/);
          await p.getByRole('button',{name:'Ver Comprar Even Steven',exact:true}).click();
          const even=p.locator('#advice article').filter({has:p.getByRole('heading',{name:'Comprar Even Steven',exact:true})});
          await even.locator('summary').filter({hasText:'Condiciones y limitaciones'}).tap();assert.match(await even.innerText(),/20 cartas/);
        }else{
          await p.getByRole('button',{name:'Ver Vender Banner → comprar Scholar',exact:true}).click();
          const replace=p.locator('#advice article').filter({has:p.getByRole('heading',{name:'Vender Banner → comprar Scholar',exact:true})});
          assert.match(await replace.innerText(),/2160 puntos/);assert.match(await replace.innerText(),/saldo tras tienda: 6/);assert.match(await replace.innerText(),/Sacrificas: Banner/);
          await replace.locator('summary').filter({hasText:'Condiciones y limitaciones'}).tap();assert.match(await replace.innerText(),/futuras rondas/);
        }
        assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await raw(p),before);
        await p.getByRole('button',{name:'Ver Comprar Scholar',exact:true}).click();await p.locator('.app-header').evaluate(el=>el.hidden=true); await buy.screenshot({path:`${evidenceDir}/auditoria-${id.toLowerCase()}.png`}); await p.locator('.app-header').evaluate(el=>el.hidden=false);
      }finally{await ctx.close();}
    }
  });
  assert.deepEqual(errors,[]);
  const report={date:new Date().toISOString(),engine,browser:await browser.version(),channel:engine==='firefox'?'Playwright Firefox':process.env.BROWSER_CHANNEL??'bundled Chromium',headless:true,desktop:[1280,900],mobileEmulation:[[390,844],[360,800]],touchEmulated:true,physicalAndroid:false,passed:results.length,results,pageErrors:errors};
  await writeFile(`${evidenceDir}/verificacion.json`,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{await context?.close();await browser.close();server.kill();}
