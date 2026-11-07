// Test-only inverse of the documented clockwise 90-degree presentation transform.
// This function is self-contained so Playwright can serialize it into a page.
export function logicalBounds(elements) {
 const frame=document.getElementById('app-viewport');
 const rotated=document.documentElement.dataset.uiRotated==='true';
 const origin=frame?.getBoundingClientRect()??{left:0,top:0,right:innerWidth,width:innerWidth,height:innerHeight};
 const scale=frame?(rotated?origin.height/frame.clientWidth:origin.width/frame.clientWidth):1;
 return elements.map(element=>{
  const r=element.getBoundingClientRect();
  const left=(rotated?r.top-origin.top:r.left-origin.left)/scale;
  const top=(rotated?origin.right-r.right:r.top-origin.top)/scale;
  const width=(rotated?r.height:r.width)/scale,height=(rotated?r.width:r.height)/scale;
  return {left,top,right:left+width,bottom:top+height,width,height};
 });
}
