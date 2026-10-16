import {adviseHorizon} from '../advisor/horizon-advisor.js';
import type {GameState,Fact} from '../state/model.js';
import type {RoundPlan} from '../evaluation/plan.js';
import type {HorizonPlan} from '../evaluation/horizon.js';
import type {ShopAction} from '../rules/shop.js';
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='')=>{const n=document.createElement(tag);n.textContent=text;return n;};
const known=<T>(value:T):Fact<T>=>({status:'known',source:'manual',value});
function select(id:string,label:string,choices:[string,string][]){const wrap=el('label',label),input=el('select');input.id=id;for(const [value,text]of choices){const o=el('option',text);o.value=value;input.append(o);}wrap.append(input);return {wrap,input};}
function field(id:string,label:string,type='text'){const wrap=el('label',label),input=el('input');input.id=id;input.type=type;if(type==='number'){input.step='1';input.inputMode='numeric';}wrap.append(input);return {wrap,input};}
function check(id:string,label:string){const wrap=el('label'),input=el('input');input.type='checkbox';input.id=id;wrap.append(input,el('span',label));return {wrap,input};}
function detail(title:string,data:unknown){const d=el('details');d.append(el('summary',title),el('pre',JSON.stringify(data,null,2)));return d;}
export function mountHorizon(host:HTMLElement,source:{state:()=>GameState;plans:()=>RoundPlan[];actionText:(a:ShopAction,s:GameState)=>string;message:(s:string,error?:boolean)=>void}){
 const section=el('details');section.id='horizon-panel';section.append(el('summary','Comparar varias rondas consecutivas (hipótesis)'));
 section.append(el('p','Crea primero los planes de cartas en el editor de escenarios. Aquí eliges su orden y declaras las ciegas futuras. No se predicen robos ni se realizan compras entre rondas. La configuración es de esta sesión.'));
 const prepare=el('button','Preparar horizonte con mis planes');prepare.type='button';prepare.id='prepare-horizon';
 const config=el('div'),results=el('div');results.id='horizon-results';results.setAttribute('aria-live','polite');section.append(prepare,config,results);host.append(section);
 const clear=()=>results.replaceChildren();config.oninput=clear;
 prepare.onclick=()=>{try{
  clear();const plans=source.plans();if(!plans.length)throw new Error('Añade al menos un plan de cartas antes de preparar el horizonte.');
  config.replaceChildren();const choices=plans.map(p=>[p.planId,p.description] as [string,string]);
  const count=select('horizon-count','Número de rondas',[['1','1'],['2','2'],['3','3']]);count.input.value='2';
  const first=select('horizon-first','Plan para la próxima ciega registrada',choices);config.append(count.wrap,first.wrap);
  const rows=[1,2].map(i=>{
   const row=el('fieldset');row.append(el('legend',`Ronda ${i+1}`));
   const plan=select(`horizon-plan-${i}`,'Plan de cartas',choices),ante=field(`horizon-ante-${i}`,'Ante declarado','number');
   const kind=select(`horizon-kind-${i}`,'Ciega',[['','Seleccionar'],['small','Small'],['big','Big'],['boss','Jefe']]);
   const boss=select(`horizon-boss-${i}`,'Efecto de jefe',[['none','Sin jefe'],['the_psychic','The Psychic'],['the_water','The Water'],['the_wall','The Wall'],['violet_vessel','Violet Vessel']]);
   const target=field(`horizon-target-${i}`,'Puntos objetivo','number'),reward=field(`horizon-reward-${i}`,'Recompensa de la ciega','number');
   const observed=check(`horizon-known-${i}`,'Esta ciega es conocida; sin marcar es hipotética');
   const basis=field(`horizon-basis-${i}`,'Procedencia o supuesto de esta ciega');
   row.append(plan.wrap,ante.wrap,kind.wrap,boss.wrap,target.wrap,reward.wrap,observed.wrap,basis.wrap);config.append(row);
   return {row,plan,ante,kind,boss,target,reward,observed,basis};
  });
  const updateRows=()=>rows.forEach((r,i)=>r.row.hidden=i>=Number(count.input.value)-1);count.input.onchange=()=>{clear();updateRows();};updateRows();
  const fixed=check('horizon-fixed','Supongo que no compro, vendo ni uso consumibles entre rondas; conservo mazo y niveles de manos.');config.append(fixed.wrap);
  const run=el('button','Evaluar horizonte');run.type='button';run.id='analyze-horizon';config.append(run);
  run.onclick=()=>{clear();try{
   const state=source.state(),current=source.plans();const plan=(id:string)=>{const p=current.find(p=>p.planId===id);if(!p)throw new Error('El plan seleccionado ya no existe. Prepara nuevamente el horizonte.');return p;};
   const integer=(input:HTMLInputElement,min:number,max=Number.MAX_SAFE_INTEGER)=>{const n=Number(input.value);if(!input.value.trim()||!Number.isSafeInteger(n)||n<min||n>max){input.focus();throw new Error(`Completa ${input.parentElement!.firstChild!.textContent} con un entero entre ${min} y ${max}.`);}return n;};
   const continuations=rows.slice(0,Number(count.input.value)-1).map(r=>{
    if(!r.kind.input.value||!r.basis.input.value.trim())throw new Error('Selecciona cada ciega futura e indica su procedencia o supuesto.');
    return {blind:{ante:integer(r.ante.input,1,8),kind:r.kind.input.value as 'small'|'big'|'boss',bossId:known(r.boss.input.value),target:known(integer(r.target.input,1)),reward:known(integer(r.reward.input,0))},
     knowledge:r.observed.input.checked?'known' as const:'hypothetical' as const,basis:r.basis.input.value,plan:plan(r.plan.input.value)};
   });
   const horizon:HorizonPlan={schemaVersion:'horizon-1',horizonId:'web-explicit-horizon',description:'Secuencia explícita de la sesión web.',firstPlan:plan(first.input.value),continuations,
    assumptions:{noBetweenRoundActions:fixed.input.checked,unchangedDeckAndHandBases:fixed.input.checked}};
   const result=adviseHorizon(state,horizon,{expectedRevision:state.revision,updatedAt:new Date().toISOString()});
   if(!result.ok){source.message(result.errors.map(e=>e.message).join(' '),true);return;}
   const a=result.value;results.append(el('h3','Horizonte hipotético · revisión '+state.revision));
   results.append(el('p','Reglas provisionales. No modifica la partida registrada. Los saldos de rondas futuras no se pueden confirmar como una compra.'));
   results.append(el('h4',a.recommendation.status==='conditional'?'Preferencia condicional':a.recommendation.status==='tie'?'Empate o compromiso':'Sin base suficiente para recomendar'));
   if(a.recommendation.action)results.append(el('p',source.actionText(a.recommendation.action,state)));results.append(el('p',a.recommendation.reason));
   for(const [i,alt]of a.comparison.alternatives.entries()){
    const card=el('article');card.className='alternative';card.append(el('h4',source.actionText(alt.action,state)));const m=a.assessments[i]!;
    card.append(el('p',`Saldo tras tienda: ${m.moneyAfterShop??'desconocido'} $. Rondas superadas: ${m.roundsReached}/${1+continuations.length}.`));
    card.append(el('p',`Saldo inicial: ${a.comparison.moneyBefore??'desconocido'} $. Coste neto inicial: ${alt.netCost??'no calculado'} $ (negativo significa ingreso por venta).`));
    for(const [j,metric]of m.metrics.entries())card.append(el('p',`Ronda ${j+1}: ${metric.score} puntos; ${metric.reached?'objetivo alcanzado':'plan insuficiente'}; ${metric.handsUsed} manos y ${metric.discardsUsed} descartes usados; saldo tras cobro: ${metric.moneyAfterRound??'no calculado'}.`));
    if(alt.evaluation?.ok&&alt.evaluation.value.stopReason)card.append(el('p',alt.evaluation.value.stopReason));
    if(!alt.shop.ok)card.append(el('p',alt.shop.errors.map(e=>e.message).join(' ')));else if(alt.evaluation&&!alt.evaluation.ok)card.append(el('p',alt.evaluation.errors.map(e=>e.message).join(' ')));
    if(alt.sacrificed.length)card.append(el('p','Sacrificas: '+alt.sacrificed.map(j=>j.catalogId).join(', ')+', incluidos sus contadores.'));
    card.append(detail('Desglose por ronda, estado proyectado y evidencia',alt));results.append(card);
   }
   results.append(detail('Supuestos, criterios de comparación y límites',{horizon,policy:a.policyVersion,preferences:a.preferences,limitations:a.limitations,coverage:a.comparison.coverage,evidence:result.evidence}));
   source.message('Horizonte evaluado sin guardar ningún estado hipotético.');
  }catch(e){source.message(e instanceof Error?e.message:String(e),true);}};
 }catch(e){source.message(e instanceof Error?e.message:String(e),true);}};
}
