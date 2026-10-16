import {VOUCHER_CATALOG} from '../catalog/voucher-catalog.js';
import {supportsVoucher} from '../catalog/vouchers.js';
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',className='')=>{const e=document.createElement(tag);e.textContent=text;e.className=className;return e;};
/** Records vouchers already owned. This is not a purchase or a projected shop action. */
export function mountVouchers(initial:readonly string[],onChange:(ids:string[])=>void){
 let ids=[...initial],all=false;
 const host=el('section','','voucher-panel');host.id='vouchers';
 const title=el('div','','section-title'),count=el('span','','tag');title.append(el('h2','Tus vales'),count);
 const controls=el('div','','voucher-controls'),toggle=el('button','Ver los 32','secondary');toggle.type='button';toggle.setAttribute('aria-expanded','false');
 controls.append(el('small','Ya adquiridos'),toggle);
 const grid=el('div','','voucher-grid'),dialog=el('dialog','','voucher-dialog');dialog.setAttribute('aria-labelledby','voucher-title');
 host.append(title,controls,grid,dialog);
 const art=(id:string)=>{const a=el('span','','voucher-art '+id);a.setAttribute('aria-hidden','true');return a;};
 const render=()=>{
  count.textContent=`${ids.length} adquiridos`;grid.replaceChildren();
  for(const v of VOUCHER_CATALOG.filter(v=>all||supportsVoucher(v.id)||ids.includes(v.id))){
   const owned=ids.includes(v.id),supported=supportsVoucher(v.id),b=el('button','','voucher-tile');b.type='button';b.dataset.voucher=v.id;b.dataset.owned=String(owned);b.dataset.supported=String(supported);b.setAttribute('aria-label',v.name+(owned?' · adquirido':''));b.setAttribute('aria-haspopup','dialog');b.title=v.english;
   const text=el('span','','voucher-label');text.append(el('b',v.name),el('small',owned?(supported?'✓ Adquirido':'✓ Registrado · sin cálculo'):supported?'Sin adquirir':'Sin cálculo'));
   const image=el('span','','voucher-image');image.append(art(v.id));b.append(image,text);b.onclick=()=>inspect(v.id);grid.append(b);
  }
 };
 const inspect=(id:string)=>{
  const v=VOUCHER_CATALOG.find(v=>v.id===id)!,owned=ids.includes(id),supported=supportsVoucher(id);
  dialog.replaceChildren();const heading=el('h2',v.name);heading.id='voucher-title';
  dialog.append(art(id),heading,el('small',v.english),el('p',v.description));
  const missing=v.requires.filter(r=>!ids.includes(r));const children=VOUCHER_CATALOG.filter(v=>v.requires.some(r=>r===id)&&ids.includes(v.id));
  if(missing.length)dialog.append(el('p','Requiere: '+missing.map(id=>VOUCHER_CATALOG.find(v=>v.id===id)!.name).join(', ')));
  if(owned&&children.length)dialog.append(el('p','Quita primero: '+children.map(v=>v.name).join(', ')));
  dialog.append(el('small',supported?'Efecto integrado · regla provisional por inspección del juego.':'Se registra para valorar su contexto. Su efecto no está integrado en los cálculos de manos o compras.'));
  if(id==='v_hieroglyph'||id==='v_petroglyph')dialog.append(el('p',id==='v_hieroglyph'?'Transcribe las manos por ronda actuales después de registrarlo. El ante no se resta automáticamente.':'Transcribe los descartes por ronda actuales después de registrarlo. El ante no se resta automáticamente.'));
  const actions=el('div','','toolbar'),apply=el('button',owned?'Quitar de mis vales':'Marcar como adquirido');apply.type='button';apply.id='voucher-apply';apply.disabled=(!owned&&missing.length>0)||(owned&&children.length>0);
  apply.onclick=()=>{ids=owned?ids.filter(v=>v!==id):[...ids,id];onChange([...ids]);render();dialog.close();};
  const close=el('button','Cerrar','secondary');close.type='button';close.onclick=()=>dialog.close();actions.append(apply,close);dialog.append(actions);dialog.showModal();
 };
 toggle.onclick=()=>{all=!all;toggle.textContent=all?'Reducir lista':'Ver los 32';toggle.setAttribute('aria-expanded',String(all));render();};
 render();return {host,read:()=>[...ids]};
}
