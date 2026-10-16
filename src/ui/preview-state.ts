import type {Issue} from '../state/model.js';
/** UI availability, not a strategic score or a rules-engine verdict. */
export type PreviewStatus='unsupported'|'needs-plan'|'needs-data'|'illegal'|'pending-rule'|'incompatible'|'partial'|'calculated';
export function markPreview(host:HTMLElement,status:PreviewStatus,label:string){host.dataset.previewStatus=status;host.dataset.previewLabel=label;}
export function previewIssueStatus(issues:readonly Issue[]):{status:PreviewStatus;label:string}{
 const issue=issues[0];
 if(issues.some(i=>i.code==='pending_rule'))return {status:'pending-rule',label:'Regla pendiente'};
 if(issues.some(i=>i.code==='insufficient_money'))return {status:'illegal',label:'Dinero insuficiente'};
 if(issues.some(i=>i.code==='no_slots'))return {status:'illegal',label:'Sin espacio: elige reemplazo'};
 if(issue?.code==='unknown_data'){
  const label=issue.path.includes('counter')?'Falta contador':issue.path.includes('money')?'Falta dinero':issue.path.includes('nextBlind')?'Falta ciega':issue.path.includes('handBases')?'Faltan niveles':issue.path.includes('deck')?'Falta mazo':'Faltan datos';
  return {status:'needs-data',label};
 }
 return {status:'incompatible',label:'Revisa datos o jugadas'};
}
