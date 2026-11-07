interface LayoutPoint {x:number;y:number}
type LockableOrientation=ScreenOrientation&{lock?:(orientation:'landscape')=>Promise<void>};

/** Pointer coordinates in the unchanged, horizontal application layout. */
export function layoutPoint(clientX:number,clientY:number):LayoutPoint {
 const frame=document.getElementById('app-viewport');
 if(!frame)return {x:clientX,y:clientY};
 const bounds=frame.getBoundingClientRect();
 if(!bounds.width||!bounds.height)return {x:clientX,y:clientY};
 if(matchMedia('(orientation: portrait)').matches)return {
  x:(clientY-bounds.top)*frame.clientWidth/bounds.height,
  y:(bounds.right-clientX)*frame.clientHeight/bounds.width
 };
 return {x:(clientX-bounds.left)*frame.clientWidth/bounds.width,y:(clientY-bounds.top)*frame.clientHeight/bounds.height};
}

/** Best-effort native lock; CSS provides the horizontal layout independently. */
export function mountLandscape(){
 const portrait=matchMedia('(orientation: portrait)');
 const frame=document.getElementById('app-viewport');
 let disposed=false,pending=false,locked=false;
 const update=()=>{
  if(disposed)return;
  const root=document.documentElement;
  root.dataset.uiRotated=String(portrait.matches);
  if(!frame||!frame.clientWidth||!frame.clientHeight)return;
  // Freeze units at the application viewport. A nested component container
  // must not redefine what a virtual viewport unit means for its descendants.
  const width=frame.clientWidth,height=frame.clientHeight;
  const values={'--app-width':width,'--app-height':height,'--app-vw':width/100,
   '--app-vh':height/100,'--app-svh':height/100,'--app-dvh':height/100};
  for(const [name,value] of Object.entries(values)){
   const pixels=value+'px';if(root.style.getPropertyValue(name)!==pixels)root.style.setProperty(name,pixels);
  }
 };
 const removeGesture=()=>{
  document.removeEventListener('pointerdown',gesture,true);
  document.removeEventListener('keydown',gesture,true);
 };
 const attempt=()=>{
  const orientation=screen.orientation as LockableOrientation|undefined;
  if(disposed||pending||locked||typeof orientation?.lock!=='function')return false;
  pending=true;
  try{
   Promise.resolve(orientation.lock('landscape')).then(()=>{locked=true;removeGesture();},()=>{
    // Fullscreen/security/support restrictions are normal: keep CSS rotation.
   }).finally(()=>{pending=false;});
  }catch{pending=false;}
  return true;
 };
 function gesture(event:Event){if(event.isTrusted&&attempt())removeGesture();}
 const fullscreen=()=>{locked=false;attempt();};
 portrait.addEventListener('change',update);
 window.addEventListener('resize',update);
 const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(update);
 if(frame)observer?.observe(frame);
 document.addEventListener('pointerdown',gesture,{capture:true,passive:true});
 document.addEventListener('keydown',gesture,true);
 document.addEventListener('fullscreenchange',fullscreen);
 update();attempt();
 return {destroy(){
  disposed=true;removeGesture();portrait.removeEventListener('change',update);
  observer?.disconnect();window.removeEventListener('resize',update);document.removeEventListener('fullscreenchange',fullscreen);
 }};
}
