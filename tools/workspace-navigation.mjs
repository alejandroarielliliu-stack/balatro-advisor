import assert from 'node:assert/strict';

// Fixture navigation for feature-specific browser runners, not a product bypass.
// Every real document navigation must first reach the mandatory main menu.
// Only then does the fixture select an internal route so tests for shop, deck,
// journal, etc. remain isolated from the separately tested startup wizard.
// This does not prove that a deep link or reload opens the requested workspace.
const screens=new Set(['menu','table','evaluation','archive','collection']);
const storageKey='balatro-advisor.confirmed.v1';

async function enterWorkspace(page,screen){
 await page.waitForFunction(()=>location.hash==='#menu'&&document.body.dataset.view==='menu'&&!!document.getElementById('menu-play'));
 assert.equal(await page.locator('#menu-view').isVisible(),true,'Document navigation first opens the main menu');
 if(screen==='menu')return;
 const before=await page.evaluate(key=>localStorage.getItem(key),storageKey);
 await page.evaluate(target=>{location.hash=target;},screen);
 await page.waitForFunction(target=>document.body.dataset.view===target,screen);
 assert.equal(await page.evaluate(key=>localStorage.getItem(key),storageKey),before,'Fixture route selection never writes the confirmed run');
}

function requestedScreen(url){
 const screen=new URL(String(url)).hash.slice(1)||'menu';
 assert.ok(screens.has(screen),'Feature fixture requests a recognized internal route: '+screen);
 return screen;
}

export async function openWorkspace(page,url,options){
 const screen=requestedScreen(url);
 const response=await page.goto(url,options);
 await enterWorkspace(page,screen);
 return response;
}

export async function reloadWorkspace(page,options){
 const screen=requestedScreen(page.url());
 const response=await page.reload(options);
 await enterWorkspace(page,screen);
 return response;
}
