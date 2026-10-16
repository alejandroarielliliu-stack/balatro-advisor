/** Reordering changes only the manual draft; the normal save path persists it. */
export function attachJokerDrag(row:HTMLElement,portrait:HTMLElement){
 let gesture:{id:number;x:number;y:number;dragging:boolean}|null=null,suppressClick=false;
 const rows=()=>Array.from(row.parentElement?.querySelectorAll<HTMLElement>(':scope > .joker-editor')??[]);
 const clear=()=>{portrait.classList.remove('dragging');portrait.style.removeProperty('--drag-x');portrait.style.removeProperty('--drag-y');rows().forEach(r=>r.classList.remove('drop-before','drop-after'));};
 const target=(x:number)=>rows().filter(r=>r!==row).find(r=>{const b=r.getBoundingClientRect();return x<b.left+b.width/2;});
 const changed=()=>row.dispatchEvent(new Event('input',{bubbles:true}));
 portrait.addEventListener('pointerdown',e=>{if(e.button!==0||!e.isPrimary)return;gesture={id:e.pointerId,x:e.clientX,y:e.clientY,dragging:false};suppressClick=false;portrait.setPointerCapture(e.pointerId);});
 portrait.addEventListener('pointermove',e=>{if(!gesture||e.pointerId!==gesture.id)return;const dx=e.clientX-gesture.x,dy=e.clientY-gesture.y;if(!gesture.dragging&&Math.hypot(dx,dy)<7)return;gesture.dragging=true;portrait.classList.add('dragging');portrait.style.setProperty('--drag-x',dx+'px');portrait.style.setProperty('--drag-y',Math.max(-28,Math.min(28,dy))+'px');rows().forEach(r=>r.classList.remove('drop-before','drop-after'));const next=target(e.clientX);if(next)next.classList.add('drop-before');else rows().filter(r=>r!==row).at(-1)?.classList.add('drop-after');});
 const cancel=()=>{if(gesture?.dragging)suppressClick=true;gesture=null;clear();};
 portrait.addEventListener('pointerup',e=>{if(!gesture||e.pointerId!==gesture.id)return;const moved=gesture.dragging;gesture=null;clear();if(!moved)return;suppressClick=true;const before=rows(),next=target(e.clientX);if(next)row.parentElement!.insertBefore(row,next);else row.parentElement!.append(row);if(rows().some((r,i)=>r!==before[i]))changed();portrait.focus({preventScroll:true});});
 portrait.addEventListener('pointercancel',cancel);portrait.addEventListener('lostpointercapture',cancel);
 portrait.addEventListener('click',e=>{if(suppressClick){e.preventDefault();e.stopImmediatePropagation();suppressClick=false;}},true);
 portrait.addEventListener('keydown',e=>{if(e.key==='Escape'){cancel();return;}if(!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const list=rows(),index=list.indexOf(row),offset=e.key==='ArrowLeft'?-1:1,other=list[index+offset];if(!other)return;if(e.altKey){if(offset<0)row.parentElement!.insertBefore(row,other);else row.parentElement!.insertBefore(other,row);changed();portrait.focus({preventScroll:true});}else other.querySelector<HTMLElement>('.joker-portrait')?.focus();});
 portrait.setAttribute('aria-keyshortcuts','Alt+ArrowLeft Alt+ArrowRight');
 portrait.title='Arrastra para ordenar · Alt + flechas con teclado';
}
