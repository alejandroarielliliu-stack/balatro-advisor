import type {Fact,GameState,GameStateV02,Issue,Result} from '../state/model.js';
import type {PackAction,PackEntry} from '../state/pack-contract.js';
import type {HandId} from '../catalog/initial.js';
import {HAND_BASES} from '../catalog/initial.js';
import {BOOSTER_CATALOG} from '../catalog/booster-catalog.js';
import {ALL_JOKER_FACTS} from '../catalog/all-joker-facts.js';
import {validateState} from '../state/validation.js';
import {boolean,checkJsonValue,enumeration,object} from '../state/schema.js';
import {observedHandBases} from '../state/observed-details.js';
import {analysisBinding,canonical,equal} from '../storage/confirmed-record.js';
import type {AnalysisBinding} from '../storage/confirmed-record.js';
import {applyPackAction} from '../rules/pack-shop.js';
import type {PackChange} from '../rules/pack-shop.js';
import type {EngineResult} from '../rules/core.js';
import type {AnalysisGate} from '../rules/evidence.js';
import {evaluateComposition} from './composition.js';
import type {CompositionReport,CompositionSection,CompositionSectionId} from './composition.js';
import {compositionRound} from './composition-policy.js';
import {evaluateOwnedFits} from './quick-fit.js';
import type {QuickFit} from './quick-fit.js';
import {immediateConsequences} from './consequences.js';
import type {ImmediateConsequences} from './consequences.js';
import {operationStatus} from './decision.js';
import type {OperationStatus} from './decision.js';

/** Editorial next-choice policy; no new score, weights, probabilities or game rules. */
export const PACK_CHOICE_POLICY={
 version:'pack-choice-policy-1',
 rules:{incomplete:'P-INCOMPLETE',pareto:'P-COMPOSITION-PARETO',tie:'P-CONTEXT-TIE',tradeoff:'P-TRADEOFF',intention:'P-INTENDED-HAND'},
 criteria:['scoring','economy','synergy','deck','growth','resources'] as readonly CompositionSectionId[]
} as const;
export interface PackChoiceOptions {intendedHand?:HandId;requireObserved?:boolean}
export interface PackCompositionDelta {
 before:CompositionReport;after:CompositionReport;globalDelta:number|null;
 sections:{id:CompositionSectionId;label:string;before:number|null;after:number|null;delta:number|null;
  beforeStatus:CompositionSection['status'];afterStatus:CompositionSection['status']}[];
}
type HandFact=NonNullable<ReturnType<typeof observedHandBases>[HandId]>;
export interface PackHandChange {handId:HandId;before:HandFact;after:HandFact}
export interface PackHistoryChange {field:'planetsUsed';before:unknown;after:unknown}
export interface PackChoiceOption {
 id:string;label:string;action:Extract<PackAction,{type:'choose_pack_item'|'skip_open_pack'}>;
 status:OperationStatus;projection:EngineResult<PackChange>;consequences:ImmediateConsequences|null;
 fit:QuickFit|null;composition:PackCompositionDelta|null;handChanges:PackHandChange[];historyChanges:PackHistoryChange[];
 evidence:AnalysisGate;limitations:string[];errors:Issue[];
}
export interface PackChoiceReport {
 contract:'pack-choices-1';policyVersion:typeof PACK_CHOICE_POLICY.version;binding:AnalysisBinding;
 stateToken:string;optionsToken:string;inputRevision:number;family:'buffoon'|'celestial';remainingChoices:number;
 options:PackChoiceOption[];order:string[];
 recommendation:{kind:'conditional'|'tie'|'tradeoff'|'abstain';optionIds:string[];reasons:string[];ruleIds:string[]};
 limitations:string[];projected:true;exhaustive:false;
}
const value=<T>(f:Fact<T>|undefined):T|undefined=>f?.status==='known'?f.value:undefined;
const token=(input:unknown)=>JSON.stringify(canonical(input));
const invalid=(code:string,message:string,path='$packChoices'):Result<never>=>({ok:false,errors:[{path,code,message}]});
const optionSchema=object({},{intendedHand:enumeration(...Object.keys(HAND_BASES) as [HandId,...HandId[]]),requireObserved:boolean});
const label=(entry:PackEntry)=>entry.kind==='joker'?ALL_JOKER_FACTS[entry.joker.catalogId]?.name??entry.joker.catalogId:entry.catalogId;

export function compositionDelta(before:CompositionReport,after:CompositionReport):PackCompositionDelta {
 return {before:structuredClone(before),after:structuredClone(after),globalDelta:before.global.value===null||after.global.value===null?null:compositionRound(after.global.value-before.global.value),
  sections:before.sections.map(b=>{const a=after.sections.find(s=>s.id===b.id)!;return {id:b.id,label:b.label,before:b.value,after:a.value,delta:b.value===null||a.value===null?null:compositionRound(a.value-b.value),beforeStatus:b.status,afterStatus:a.status};})};
}
function handChanges(before:GameState,after:GameState):PackHandChange[]{
 const old=observedHandBases(before),current=observedHandBases(after);
 const missing:HandFact={status:'unknown',reason:'Base de esta mano no registrada.'};
 return (Object.keys(HAND_BASES) as HandId[]).filter(hand=>!equal(old[hand],current[hand])).map(hand=>({handId:hand,before:structuredClone(old[hand]??missing),after:structuredClone(current[hand]??missing)}));
}
function historyChanges(before:GameState,after:GameState):PackHistoryChange[]{
 const old=value(before.observed.jokerContext)?.planetsUsed??null,current=value(after.observed.jokerContext)?.planetsUsed??null;
 return equal(old,current)?[]:[{field:'planetsUsed',before:structuredClone(old),after:structuredClone(current)}];
}
function projection(state:GameStateV02,action:PackChoiceOption['action'],entry:PackEntry|null,baseline:CompositionReport,options:PackChoiceOptions):PackChoiceOption {
 const result=applyPackAction(structuredClone(state),action,{expectedRevision:state.revision,updatedAt:state.updatedAt},{requireObserved:options.requireObserved??false});
 const id=entry?'entry:'+entry.entryId:'skip';
 const notes=['Proyección de esta única elección desde la misma revisión; no cambia la partida registrada.'];
 if(!result.ok)return {id,label:entry?label(entry):'Omitir lo restante',action:structuredClone(action),status:operationStatus(result.errors,result.evidence),projection:result,consequences:null,fit:null,composition:null,handChanges:[],historyChanges:[],evidence:structuredClone(result.evidence),limitations:[...notes,...result.evidence.limitations.map(l=>l.message)],errors:structuredClone(result.errors)};
 const after=result.value.state,consequences=immediateConsequences(state,after),composition=compositionDelta(baseline,evaluateComposition(after));
 const fit=entry?.kind==='joker'?evaluateOwnedFits(after,options.intendedHand?{intendedHand:options.intendedHand}:{}).find(f=>f.instanceId===entry.joker.instanceId)??null:null;
 notes.push(...result.value.limitations);
 if(entry?.kind==='joker')notes.push('El comodín se añade al final del orden actual y conserva la edición y los contadores observados. El encaje no calcula activaciones, puntuación de mano ni valor de la plaza ocupada.',...(fit?.limitations??[]));
 if(entry?.kind==='planet')notes.push('La base de la mano mejorada no es la puntuación de una jugada: faltan cartas y activaciones. Este Planet se usa; no queda retenido para Observatory. El historial único puede apoyar ingresos futuros de Satellite, sin cobrarlos ahora.');
 if(!entry)notes.push('Omitir conserva las elecciones ya realizadas y pierde todas las restantes; no devuelve el precio pagado. Revisa el crecimiento real de Red Card entre las consecuencias.');
 return {id,label:entry?label(entry):'Omitir lo restante',action:structuredClone(action),status:operationStatus([],result.evidence),projection:result,consequences,fit,composition,handChanges:handChanges(state,after),historyChanges:historyChanges(state,after),evidence:structuredClone(result.evidence),limitations:[...new Set(notes)],errors:[]};
}

/** Only equal-applicability, fully known section vectors may dominate one another. */
export function compositionSectionRelation(a:CompositionReport,b:CompositionReport):'better'|'same'|'worse'|'incomparable'{
 let up=false,down=false;
 for(const id of PACK_CHOICE_POLICY.criteria){
  const first=a.sections.find(s=>s.id===id)!,second=b.sections.find(s=>s.id===id)!;
  if(first.status==='not-applicable'&&second.status==='not-applicable')continue;
  if(first.status!=='known'||second.status!=='known'||first.value===null||second.value===null)return 'incomparable';
  if(first.value>second.value)up=true;if(first.value<second.value)down=true;
 }
 return up&&down?'incomparable':up?'better':down?'worse':'same';
}
function sectionRelation(a:PackChoiceOption,b:PackChoiceOption):'better'|'same'|'worse'|'incomparable'{
 return a.composition&&b.composition?compositionSectionRelation(a.composition.after,b.composition.after):'incomparable';
}
function fronts(options:PackChoiceOption[]):PackChoiceOption[][]{
 let remaining=options.filter(o=>o.projection.ok);const ordered:PackChoiceOption[][]=[];
 while(remaining.length){const front=remaining.filter(o=>!remaining.some(other=>other!==o&&sectionRelation(other,o)==='better'));ordered.push(front);const ids=new Set(front.map(o=>o.id));remaining=remaining.filter(o=>!ids.has(o.id));}
 return ordered;
}
function uncertain(option:PackChoiceOption):boolean {
 // An illegal direct choice is excluded; unsupported content and missing inputs remain unknown alternatives.
 return !option.projection.ok&&option.status!=='illegal';
}
function skipGrowth(skip:PackChoiceOption|undefined):boolean {
 return !!skip?.consequences?.counters.some(c=>{const a=value(c.after??undefined),b=value(c.before??undefined);return a!==undefined&&b!==undefined&&a>b;});
}
function recommend(family:PackChoiceReport['family'],options:PackChoiceOption[],knownContents:boolean,settings:PackChoiceOptions):PackChoiceReport['recommendation']{
 const p=PACK_CHOICE_POLICY.rules;
 const abstain=(reason:string):PackChoiceReport['recommendation']=>({kind:'abstain',optionIds:[],reasons:[reason],ruleIds:[p.incomplete]});
 if(!knownContents)return abstain('El contenido sigue desconocido: solo se calcula omitir. Transcribe las cartas visibles para compararlas.');
 const unavailable=options.filter(uncertain);
 if(unavailable.length)return {kind:'abstain',optionIds:[],reasons:['Hay contenido no compatible, reglas bloqueadas o datos faltantes. Se conservan los cálculos disponibles, sin declarar una mejor elección global.',...unavailable.map(o=>o.label+': '+o.errors.map(e=>e.message).join(' '))],ruleIds:[p.incomplete]};
 const legal=options.filter(o=>o.projection.ok),choices=legal.filter(o=>o.action.type==='choose_pack_item'),skip=legal.find(o=>o.id==='skip');
 if(!choices.length)return abstain('No hay una elección directa compatible. Vender un comodín antes de elegir puede abrir opciones y requiere una nueva comparación; no se recomienda omitir por defecto.');
 if(family==='celestial'){
  if(!settings.intendedHand)return abstain('Indica qué mano quieres desarrollar. Las bases de manos distintas no se ordenan como puntuaciones ni se deduce la estrategia del historial de uso.');
  const intended=settings.intendedHand;
  const matching=choices.filter(o=>o.handChanges.some(h=>h.handId===intended));
  if(!matching.length)return abstain('Ninguna elección compatible mejora la mano declarada. No se sustituyen tus objetivos por la mano con mayor base.');
  if(skipGrowth(skip))return {kind:'tradeoff',optionIds:[...matching.map(o=>o.id),...(skip?[skip.id]:[])],reasons:['El Planet desarrolla la mano declarada, mientras omitir crece el contador mostrado de Red Card. No se convierte ese crecimiento en niveles de mano ni se supone cuál tendrá más utilidad.'],ruleIds:[p.intention,p.tradeoff]};
  return {kind:matching.length>1?'tie':'conditional',optionIds:matching.map(o=>o.id),reasons:[`Estas elecciones mejoran ${intended}, la mano que declaraste. Preferencia condicionada a seguir esa estrategia; no demuestra poder formarla ni superar la ciega.`,...(matching.length>1?['Las copias restantes tienen el mismo efecto inmediato modelado; el desempate no inventa valor futuro.']:[])],ruleIds:[p.intention,...(matching.length>1?[p.tie]:[])]};
 }
 const front=fronts(legal)[0]??[];
 const unknownFit=front.some(o=>o.fit?.readiness==='unknown'||o.composition?.after.sections.some(s=>s.status==='partial'));
 if(unknownFit)return abstain('Los apartados o condiciones relevantes conservan datos desconocidos. Las consecuencias exactas disponibles no bastan para ordenar el encaje completo.');
 const pairwiseSame=front.every(a=>front.every(b=>sectionRelation(a,b)==='same'));
 if(front.length===1){
  const preferred=front[0]!;
  if(preferred.fit?.readiness==='unavailable')return abstain('La única opción favorecida por el índice tiene una condición conocida no disponible. Revisa el material o las otras consecuencias; el índice no elimina ese bloqueo.');
  return {kind:'conditional',optionIds:[preferred.id],reasons:['Esta alternativa no empeora ningún apartado comparable y mejora al menos uno frente a las demás alternativas directas compatibles, según la política contextual existente.',preferred.id==='skip'?'Omitir conserva el inventario y abandona las elecciones restantes; el precio pagado ya no se recupera.':'Añade el comodín al final del orden y ocupa la plaza indicada. La prioridad es contextual y no acredita una mejora de puntuación ni supervivencia.'],ruleIds:[p.pareto]};
 }
 if(front.length>1)return {kind:pairwiseSame?'tie':'tradeoff',optionIds:front.map(o=>o.id),reasons:[pairwiseSame?'Las alternativas tienen los mismos apartados conocidos según esta política. Sus efectos y condiciones pueden diferir; no se inventa un desempate.':'Hay ventajas repartidas, cambios de aplicabilidad o efectos que los apartados no ordenan. Consulta las diferencias y condiciones; no se suman dólares, puntos y contadores.',...(skip&&front.includes(skip)?['Omitir es un punto de comparación y descarta todas las elecciones restantes; no es automáticamente la mejor opción por no ocupar plaza.']:[])],ruleIds:[pairwiseSame?p.tie:p.tradeoff]};
 return abstain('No hay una comparación contextual completa disponible.');
}

/** Compare the next observed choice only. No RNG, persistence, phase conversion or Mega sequence search. */
export function comparePackChoices(input:unknown,options:PackChoiceOptions={}):Result<PackChoiceReport>{
 const checked=validateState(input);if(!checked.ok)return checked;
 const optionErrors=checkJsonValue(options);if(!optionErrors.length)optionSchema.check(options,'$options',optionErrors);if(optionErrors.length)return {ok:false,errors:optionErrors};
 if(checked.value.schemaVersion!=='0.2'||checked.value.phase!=='open_pack')return invalid('wrong_phase','Compara elecciones desde un sobre abierto registrado en formato 0.2.');
 const state=structuredClone(checked.value),context=state.phaseData.context;
 if(!context)return invalid('missing_pack_context','Falta el contexto del sobre: no se reconstruyen su compra, pago ni contenido.');
 const family=BOOSTER_CATALOG.find(p=>p.id===context.catalogId)?.family;
 if(family!=='buffoon'&&family!=='celestial')return invalid('unsupported_pack','La comparación solo admite Buffoon y Celestial observados.');
 const baseline=evaluateComposition(state),entries=value(context.contents)?.filter(e=>!context.selectedEntryIds.includes(e.entryId))??[];
 const evaluated=entries.map(entry=>projection(state,{type:'choose_pack_item',entryId:entry.entryId},entry,baseline,options));
 evaluated.push(projection(state,{type:'skip_open_pack'},null,baseline,options));
 const ordered=family==='buffoon'?fronts(evaluated).flat().map(o=>o.id):evaluated.filter(o=>o.projection.ok).map(o=>o.id);
 for(const option of evaluated)if(!ordered.includes(option.id))ordered.push(option.id);
 const recommendation=recommend(family,evaluated,context.contents.status==='known',options);
 // An explicit Celestial intention changes presentation order, never the underlying H2 effects.
 if(family==='celestial'&&recommendation.optionIds.length){const preferred=new Set(recommendation.optionIds);ordered.sort((a,b)=>Number(preferred.has(b))-Number(preferred.has(a)));}
 return {ok:true,value:{contract:'pack-choices-1',policyVersion:PACK_CHOICE_POLICY.version,binding:analysisBinding(state),stateToken:token(state),optionsToken:token(options),inputRevision:state.revision,family,remainingChoices:context.remainingChoices,options:evaluated,order:ordered,recommendation,
  limitations:['Compara elegir una entrada observada u omitir el resto. No enumera ventas previas, cambios de orden ni secuencias completas de sobres Mega; vuelve a comparar después de cada elección.',
   'El pago del sobre ya ocurrió en el estado de origen. La comparación no lo repite ni predice qué traerá un sobre cerrado.',
   'Consecuencias y bases se calculan con H2. Encaje y apartados de composición son heurísticos editoriales existentes, separados del cálculo y sin calibración de eficacia.',
   'La preferencia Buffoon exige dominancia en apartados conocidos con igual aplicabilidad. El índice global se muestra como diferencia descriptiva y nunca decide por sí solo. No se asigna cero a lo desconocido o no aplicable.',
   'Una preferencia condicional no estima consistencia, probabilidades, puntuación de una mano ni supervivencia. No valora toda la partida o el mejor uso futuro de la plaza.',
   'La intención de mano es un supuesto de esta comparación, no un hecho guardado ni una estrategia inferida automáticamente.',
   'La evidencia de reglas conserva la diferencia entre inspección del ejecutable y observación en partida; el modo estricto se aplica a cada proyección.'],projected:true,exhaustive:false}};
}

/** Full snapshot and assumptions, including same-revision edits, must still match. */
export function packChoicesAreCurrent(report:PackChoiceReport,input:unknown,options:PackChoiceOptions={}):boolean{
 const checked=validateState(input);if(!checked.ok)return false;
 const errors=checkJsonValue(options);if(!errors.length)optionSchema.check(options,'$options',errors);if(errors.length)return false;
 return report.contract==='pack-choices-1'&&report.policyVersion===PACK_CHOICE_POLICY.version&&report.stateToken===token(checked.value)&&report.optionsToken===token(options)&&equal(report.binding,analysisBinding(checked.value));
}
