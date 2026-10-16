import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {cpus,platform,release} from 'node:os';
import {chromium,firefox} from 'playwright';

// Prospective engineering budgets, not measurements of user skill or Android performance.
const budgets={single:500,twenty:2000,horizon:2000,render:1000};
const samples=20,warmup=3,engine=process.env.TEST_BROWSER==='firefox'?'firefox':'chromium';
const mobile=process.env.BENCHMARK_MOBILE==='1',viewport=mobile?{width:390,height:844}:{width:1280,height:900};
const port=Number(process.env.TEST_PORT??4175),base=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['dist/src/server.js'],{env:{...process.env,PORT:String(port)},stdio:'pipe',windowsHide:true});
let browser;
try{
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Timeout iniciando servidor de benchmark.')),10000);server.stdout.on('data',d=>{if(String(d).includes('Balatro Advisor local')){clearTimeout(timer);resolve();}});server.on('error',e=>{clearTimeout(timer);reject(e);});server.on('exit',c=>{clearTimeout(timer);reject(new Error(`Servidor terminó: ${c}`));});});
 browser=await (engine==='firefox'?firefox:chromium).launch({headless:true,...(engine==='chromium'?{channel:process.env.BROWSER_CHANNEL??'chrome'}:{})});
 const context=await browser.newContext({viewport,hasTouch:mobile,...(mobile&&engine==='chromium'?{isMobile:true}:{})}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
 const core=await page.evaluate(async({samples,warmup})=>{
  const {adviseShop}=await import('/dist/src/advisor/advisor.js');const {adviseHorizon}=await import('/dist/src/advisor/horizon-advisor.js');
  const load=async file=>{const r=await fetch('/examples/'+file+'.json');if(!r.ok)throw new Error(file);return r.json();};
  const [single,full,plan,golden,horizon]=await Promise.all(['shop-purchase','s09-bound','round-plan','horizon-golden-state','horizon-golden'].map(load));
  const mutation={expectedRevision:0,updatedAt:'2026-10-10T23:00:00Z'};
  // Independent IDs avoid duplicate-scenario rejection; duplicated content is a load test, not extra strategic evidence.
  const twenty=Array.from({length:20},(_,i)=>({role:'representative',plan:{...structuredClone(plan),planId:`load-${i}`}}));
  const cases=[['single',()=>adviseShop(single,[{role:'representative',plan}],mutation)],['twenty',()=>adviseShop(full,twenty,mutation)],['horizon',()=>adviseHorizon(golden,horizon,mutation)]];
  const original=JSON.stringify({single,full,plan,golden,horizon});const results=[];
  for(const [id,fn]of cases){const durations=[];let alternativeCount=0;
   for(let i=-warmup;i<samples;i++){
    const start=performance.now(),r=fn(),elapsed=performance.now()-start;if(!r.ok)throw new Error(JSON.stringify(r.errors));
    alternativeCount=(r.value.alternatives??r.value.comparison.alternatives).length;
    if(i>=0)durations.push(elapsed);await new Promise(resolve=>setTimeout(resolve,0));
   }
   results.push({id,durationsMs:durations,alternativeCount});
  }
  if(JSON.stringify({single,full,plan,golden,horizon})!==original)throw new Error('El benchmark mutó entradas.');
  return {results,heap:performance.memory?{usedJSHeapSize:performance.memory.usedJSHeapSize,totalJSHeapSize:performance.memory.totalJSHeapSize,meaning:'Instantánea aproximada de heap JS, no pico ni memoria del proceso.'}:null};
 },{samples,warmup});
 await page.waitForFunction(()=>document.querySelector('#ownership').textContent.includes('Esta pestaña tiene'));
 await page.locator('[data-screen=archive]').click();await page.locator('#import-file').setInputFiles({name:'benchmark.json',mimeType:'application/json',buffer:await readFile('examples/shop-purchase.json')});await page.locator('#confirmation').waitFor({state:'visible'});await page.locator('#dialog-accept').click();
 await page.locator('[data-screen=evaluation]').click();await page.getByRole('button',{name:'Añadir plantilla hipotética: dos parejas'}).click();await page.locator('.scenario').waitFor();
 const before=await page.evaluate(()=>localStorage.getItem('balatro-advisor.confirmed.v1'));
 const rendering=await page.evaluate(async({samples,warmup})=>{const durations=[];for(let i=-warmup;i<samples;i++){
  const start=performance.now();document.getElementById('analyze').click();
  if(!document.querySelector('#advice article'))throw new Error('No se renderizó el consejo.');
  await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));if(i>=0)durations.push(performance.now()-start);
 }return {id:'render',durationsMs:durations,meaning:'Click → actualización DOM → dos requestAnimationFrame; proxy de respuesta, no cronometraje humano ni garantía de presentación física.'};},{samples,warmup});
 assert.equal(await page.evaluate(()=>localStorage.getItem('balatro-advisor.confirmed.v1')),before);assert.deepEqual(errors,[]);
 const results=[...core.results,rendering].map(item=>{const sorted=[...item.durationsMs].sort((a,b)=>a-b),median=(sorted[9]+sorted[10])/2,p95=sorted[Math.ceil(.95*sorted.length)-1];return {...item,medianMs:median,p95Ms:p95,maxMs:sorted.at(-1),p95BudgetMs:budgets[item.id],withinBudget:p95<=budgets[item.id]};});
 const report={generatedAt:new Date().toISOString(),engine,browser:await browser.version(),headless:true,viewport:[viewport.width,viewport.height],mobileEmulation:mobile,physicalAndroid:false,os:{platform:platform(),release:release(),cpu:cpus()[0]?.model,logicalCpus:cpus().length},samples,warmup,quantile:'nearest-rank p95; median central pair',results,heap:core.heap,limitations:['Solo equipo local y entradas fijas, no capacidad universal; emular formato móvil no emula su CPU.','Caso twenty repite un plan solo para medir carga; no acredita consistencia ni distribuciones.','No mide tiempo de transcripción/comprensión por personas ni pico de memoria.']};
 const suffix=mobile?'-mobile':'';await mkdir('docs/evidencia/rendimiento',{recursive:true});await writeFile(`docs/evidencia/rendimiento/${engine}${suffix}.json`,JSON.stringify(report,null,2)+'\n');
 if(mobile){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.locator('#advice').screenshot({path:`docs/evidencia/rendimiento/${engine}-mobile.png`});}
 console.table(results.map(({id,medianMs,p95Ms,p95BudgetMs,withinBudget})=>({id,medianMs,p95Ms,p95BudgetMs,withinBudget})));console.log('Informe de rendimiento guardado; datos de usuario intactos.');
 if(results.some(r=>!r.withinBudget))process.exitCode=1;
}finally{await browser?.close();server.kill();}
