import type {ShopPlan} from '../advisor/shop-context.js';
import type {GameState} from '../state/model.js';

type Binding=Pick<GameState,'runId'|'revision'>;
interface ShopPlanView {
 state():GameState;
 quote():number|null;
 observeQuote(price:number|null,binding:Binding,complete?:boolean):string|null;
 changed():void;
}

let declaration:{binding:Binding;plan:ShopPlan}|undefined;
export function currentShopPlan(state:GameState):ShopPlan|undefined {
 if(declaration?.binding.runId===state.runId&&declaration.binding.revision===state.revision)return declaration.plan;
 return undefined;
}

/** The objective applies to this decision. Only an edited price is an observation in the saved run. */
export function openShopPlan(view:ShopPlanView,trigger?:HTMLElement):void {
 if(document.getElementById('shop-plan-dialog'))return;
 const initial=view.state(),binding={runId:initial.runId,revision:initial.revision};
 const plan=currentShopPlan(initial),initialQuote=view.quote();
 const element=<K extends keyof HTMLElementTagNameMap>(tag:K,text='')=>{const node=document.createElement(tag);node.textContent=text;return node;};
 const dialog=element('dialog');dialog.id='shop-plan-dialog';dialog.className='game-shop-editor shop-plan-dialog';
 const heading=element('div');heading.className='game-shop-editor-heading';
 const title=element('h2','Orientar mi compra');title.id='shop-plan-title';dialog.setAttribute('aria-labelledby',title.id);
 const close=element('button','Cerrar');close.type='button';close.className='game-shop-editor-close';close.onclick=()=>dialog.close();heading.append(title,close);
 const form=element('form'),need=element('select');need.id='shop-plan-need';
 const label=(text:string,control:HTMLInputElement|HTMLSelectElement)=>{const node=element('label',text);node.htmlFor=control.id;node.append(control);return node;};
 for(const [key,text] of [['','Comparar las ofertas'],['score','Subir mi puntuación'],['economy','Generar dinero'],['save','Guardar mi dinero']] as const){const choice=element('option',text);choice.value=key;need.append(choice);}
 need.value=plan?.need??'';
 const dollars=(id:string,value:number|null|undefined,min:number)=>{const input=element('input');input.type='number';input.id=id;input.min=String(min);input.step='1';input.inputMode='numeric';input.value=value==null?'':String(value);return input;};
 const reserve=dollars('shop-plan-reserve',plan?.purchaseReserve,1);reserve.placeholder='Opcional';
 const reserveLabel=label('¿Cuánto quieres reservar para comprar después de renovar? ($)',reserve);
 const toggleReserve=()=>{reserveLabel.hidden=!['score','economy'].includes(need.value);reserve.disabled=reserveLabel.hidden;};
 need.onchange=toggleReserve;toggleReserve();
 const quote=dollars('game-shop-quoted-cost',initialQuote,0);quote.placeholder='Desconocido';
 const complete=element('input');complete.type='checkbox';complete.id='shop-plan-complete';
 complete.checked=initial.observed.shop.status==='known'&&initial.observed.shop.value.ignoredOtherOffers.length===0;
 const completeLabel=label('Ya registré todas las cartas de esta tienda',complete);
 const error=element('p');error.className='game-shop-editor-error';error.setAttribute('role','alert');
 const submit=element('button','Ver consejo');submit.type='submit';submit.id='shop-plan-apply';
 const actions=element('div');actions.className='game-shop-editor-actions';actions.append(submit);
 form.append(label('¿Qué necesitas en esta tienda?',need),reserveLabel,label('Precio de renovar que ves ahora ($)',quote),completeLabel,error,actions);
 form.onsubmit=event=>{
  event.preventDefault();
  try{
   const current=view.state();
   if(current.runId!==binding.runId||current.revision!==binding.revision||current.phase!==initial.phase){error.textContent='La partida cambió. Cierra y vuelve a consultar esta tienda.';return;}
   const purchaseReserve=reserve.disabled||reserve.value===''?undefined:reserve.valueAsNumber;
   const amount=quote.value===''?null:quote.valueAsNumber;
   if(purchaseReserve!==undefined&&(!Number.isSafeInteger(purchaseReserve)||purchaseReserve<=0)){error.textContent='Introduce un presupuesto entero de al menos $1.';reserve.focus();return;}
   if(amount!==null&&(!Number.isSafeInteger(amount)||amount<0)){error.textContent='Introduce el precio en dólares enteros o déjalo en blanco.';quote.focus();return;}
   if(amount!==initialQuote||complete.checked&&(initial.observed.shop.status==='unknown'||initial.observed.shop.value.ignoredOtherOffers.length>0)){
    const problem=view.observeQuote(amount,binding,complete.checked);if(problem){error.textContent=problem;return;}
   }
   const updated=view.state();
   declaration=need.value?{binding:{runId:updated.runId,revision:updated.revision},plan:{need:need.value as ShopPlan['need'],...(purchaseReserve===undefined?{}:{purchaseReserve})}}:undefined;
   view.changed();document.dispatchEvent(new Event('shop-plan-change'));dialog.close();
  }catch(problem){error.textContent=problem instanceof Error?problem.message:'Revisa los datos de la partida.';}
 };
 dialog.append(heading,form);document.body.append(dialog);dialog.addEventListener('close',()=>{dialog.remove();if(trigger?.isConnected)trigger.focus({preventScroll:true});},{once:true});
 dialog.showModal();need.focus({preventScroll:true});
}
