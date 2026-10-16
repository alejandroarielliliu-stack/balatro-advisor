import type {QuickFit} from '../advisor/quick-fit.js';
import {FIT_INDEX_POLICY} from '../advisor/fit-index.js';
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',cl='')=>{const n=document.createElement(tag);n.textContent=text;n.className=cl;return n;};
const indexLabel=(value:number)=>value.toFixed(FIT_INDEX_POLICY.decimals);
export function fitLabel(fit:QuickFit){return fit.score!==null?indexLabel(fit.score):fit.range?fit.range[1]===null?`≥${indexLabel(fit.range[0])}`:`${indexLabel(fit.range[0])}–${indexLabel(fit.range[1])}`:'Sin valorar';}
export function fitTone(fit:QuickFit){return fit.score===null?'unknown':fit.score>=FIT_INDEX_POLICY.positive?'positive':fit.score<=FIT_INDEX_POLICY.negative?'negative':'neutral';}
export function fitReason(fit:QuickFit){return fit.signals.find(s=>s.kind==='conflict'&&s.id!=='replacement-loss')?.text??fit.signals.find(s=>s.id==='scarce-material')?.text??fit.signals.find(s=>s.id==='preparation')?.text??fit.signals.find(s=>s.id.startsWith('composition-')&&s.kind==='potential')?.text??fit.signals.find(s=>s.id==='photo-chad'||s.id==='steel-held')?.text??fit.signals[0]?.text??fit.limitations.at(-1)??'';}
export function renderQuickFit(fit:QuickFit){
 const host=el('div','','quick-fit-result');host.dataset.previewStatus='fit';host.dataset.previewLabel=fitLabel(fit);host.dataset.fitLabel=fitLabel(fit);host.dataset.fitTone=fitTone(fit);host.dataset.fitReason=fitReason(fit);host.dataset.fitId=fit.id;
 if(fit.score!==null)host.dataset.fitScore=String(fit.score);
 const heading=el('div','','fit-summary');heading.append(el('small','Índice · '+({early:'inicio',middle:'desarrollo',late:'cierre',unknown:'etapa pendiente'} as const)[fit.stage]),el('strong',fitLabel(fit),'fit-score '+fitTone(fit)),el('p',fitReason(fit),'fit-reason'));host.append(heading);
 const signals=el('div','','fit-signals');for(const s of fit.signals)if(s.text!==fitReason(fit))signals.append(el('p',s.text,s.kind==='conflict'?'fit-conflict':''));host.append(signals);
 if(fit.purchase.status==='legal')host.append(el('p',`Coste neto $${fit.purchase.netCost} · dinero después $${fit.purchase.moneyAfter}`));
 else if(fit.purchase.status==='illegal')host.append(el('p',fit.purchase.errors.map(e=>e.message).join(' '),'fit-conflict'));
 else if(fit.purchase.status==='unknown')host.append(el('small','Compra sin validar · '+(fit.purchase.errors[0]?.message??fit.purchase.limitations[0]??'faltan datos')));
 const details=el('details');details.append(el('summary','Motivos y límites'));
 for(const axis of fit.axes)details.append(el('p',`${({stage:'Etapa',readiness:'Preparación',integration:'Construcción'} as const)[axis.key]}: ${axis.value===null?'pendiente':indexLabel(axis.value*FIT_INDEX_POLICY.unitsPerBand)} · ${axis.reason}`));
 details.append(el('p',`Aporte actual: ${fit.magnitude.bonus===null?'pendiente':indexLabel(fit.magnitude.bonus)} · ${fit.magnitude.reason}`));
 details.append(el('small','Índice heurístico. No son fichas ni probabilidad de ganar.'));
 for(const text of [...new Set([...fit.limitations,...fit.purchase.limitations])])details.append(el('small',text));host.append(details);return host;
}
