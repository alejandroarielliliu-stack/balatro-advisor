import {mountMenuBackground} from './menu-background.js';
import {mountRunSetup} from './run-setup.js';
import type {RunStartBridge} from './run-start-bridge.js';

const MOTION_KEY='balatro-advisor.menu-motion.v1';
type Motion='system'|'on'|'off';
const motionValue=(value:unknown):Motion=>value==='on'||value==='off'?value:'system';

/** Entry screen only: these preferences never touch the run or its journal. */
export function mountMainMenu(bridge:RunStartBridge){
 const host=document.getElementById('menu-view')!;
 const canvas=document.getElementById('menu-background') as HTMLCanvasElement;
 const dialog=document.getElementById('menu-settings') as HTMLDialogElement;
 const options=document.getElementById('menu-options') as HTMLButtonElement;
 const status=document.getElementById('menu-settings-status')!;
 const media=matchMedia('(prefers-reduced-motion: reduce)');
 let motion:Motion='system';
 try{motion=motionValue(localStorage.getItem(MOTION_KEY));}catch{/* The menu remains usable with storage denied. */}
 const background=mountMenuBackground(canvas);
 const setup=mountRunSetup(host,bridge);
 const apply=()=>{
  const enabled=motion==='on'||motion==='system'&&!media.matches;
  host.dataset.motion=enabled?'on':'off';
  host.dataset.motionPreference=motion;
  background.setMotion(enabled);
  dialog.querySelectorAll<HTMLInputElement>('input[name="menu-motion"]').forEach(input=>input.checked=input.value===motion);
 };
 media.addEventListener('change',apply);
 dialog.querySelectorAll<HTMLInputElement>('input[name="menu-motion"]').forEach(input=>input.addEventListener('change',()=>{
  motion=motionValue(input.value);status.textContent='';
  try{localStorage.setItem(MOTION_KEY,motion);}catch{status.textContent='Se aplicó el cambio, pero no se pudo recordar.';}
  apply();
 }));
 window.addEventListener('storage',event=>{
  if(event.key===MOTION_KEY||event.key===null){motion=motionValue(event.newValue);apply();}
 });
 options.addEventListener('click',()=>{status.textContent='';dialog.showModal();});
 document.getElementById('menu-settings-close')!.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
 dialog.addEventListener('close',()=>options.focus({preventScroll:true}));
 apply();
 return {setSetupOpen(value:boolean){if(value&&dialog.open)dialog.close();setup.setOpen(value);},focusSetup:()=>setup.focus(),setActive(active:boolean){
  if(!active&&dialog.open)dialog.close();
  background.setActive(active);
 }};
}
