import type {Fact,GameStateV02,Issue,Result} from '../state/model.js';
import type {PackAction,PackEntry} from '../state/pack-contract.js';
import {BOOSTER_CATALOG} from '../catalog/booster-catalog.js';
import {validateState} from '../state/validation.js';
import {boolean,checkJsonValue,integer,object} from '../state/schema.js';
import {analysisBinding,canonical,equal} from '../storage/confirmed-record.js';
import type {AnalysisBinding} from '../storage/confirmed-record.js';
import {applyPackAction} from '../rules/pack-shop.js';
import type {PackChange} from '../rules/pack-shop.js';
import type {EngineResult} from '../rules/core.js';
import type {AnalysisGate} from '../rules/evidence.js';
import {tarotDefinition} from '../rules/tarot.js';
import type {TarotCardChange} from '../rules/tarot.js';
import {evaluateComposition} from './composition.js';
import type {CompositionReport} from './composition.js';
import {compositionDelta,compositionSectionRelation,PACK_CHOICE_POLICY} from './pack-choices.js';
import type {PackCompositionDelta} from './pack-choices.js';
import {immediateConsequences} from './consequences.js';
import type {ImmediateConsequences} from './consequences.js';
import {operationStatus} from './decision.js';
import type {OperationStatus} from './decision.js';

/** Editorial comparison over the existing six sections; no new effect formula. */
export const ARCANA_CHOICE_POLICY={version:'arcana-choice-policy-1',defaultMaxCandidates:1024,maximumCandidates:4096,
 rules:{incomplete:'A-INCOMPLETE',pareto:'A-CONTEXTUAL-PARETO',undistinguished:'A-UNDISTINGUISHED',tradeoff:'A-TRADEOFF',sacrifice:'A-UNVALUED-SACRIFICE'}} as const;
export interface ArcanaChoiceOptions {requireObserved?:boolean;maxCandidates?:number}
type ChoiceAction=Extract<PackAction,{type:'choose_pack_item'|'skip_open_pack'}>;
export interface ArcanaChoiceOption {
 id:string;entryId:string|null;label:string;targetCardIds:string[];action:ChoiceAction;
 status:OperationStatus;projection:EngineResult<PackChange>;composition:PackCompositionDelta|null;
 consequences:ImmediateConsequences|null;cardChanges:TarotCardChange[];sacrifices:string[];
 historyChanges:{field:'tarotsUsed';before:Fact<number>|null;after:Fact<number>|null}[];
 evidence:AnalysisGate;limitations:string[];errors:Issue[];
}
export interface ArcanaChoiceReport {
 contract:'arcana-choices-1';policyVersion:typeof ARCANA_CHOICE_POLICY.version;binding:AnalysisBinding;
 stateToken:string;optionsToken:string;inputRevision:number;remainingChoices:number;
 options:ArcanaChoiceOption[];order:string[];
 recommendation:{kind:'conditional'|'tie'|'tradeoff'|'abstain';optionIds:string[];reasons:string[];ruleIds:string[]};
 coverage:{scope:'next-choice';maxCandidates:number;enumerated:number;theoreticalCount:number|null;truncated:boolean};
 limitations:string[];projected:true;exhaustive:false;
 analysisScope:'contextual-preparation';notOverallBest:true;
}
const value=<T>(fact:Fact<T>|undefined):T|undefined=>fact?.status==='known'?fact.value:undefined;
const token=(input:unknown)=>JSON.stringify(canonical(input));
const optionSchema=object({},{requireObserved:boolean,maxCandidates:integer(1,ARCANA_CHOICE_POLICY.maximumCandidates)});
const invalid=(code:string,message:string,path='$arcanaChoices'):Result<never>=>({ok:false,errors:[{path,code,message}]});
const optionErrors=(options:ArcanaChoiceOptions)=>{const errors=checkJsonValue(options);if(!errors.length)optionSchema.check(options,'$options',errors);return errors;};
const identity=(entryId:string,targets:readonly string[])=>'entry:'+encodeURIComponent(entryId)+':targets:'+targets.slice().sort().map(encodeURIComponent).join(',');
const entryName=(entry:PackEntry)=>entry.kind==='joker'?entry.joker.catalogId:tarotDefinition(entry.catalogId)?.name??entry.catalogId;

/** Unordered, nonempty subsets in recorded hand order; permutations are not new targets. */
function* subsets(ids:readonly string[],maximum:number):Generator<string[]>{
 function* choose(start:number,left:number,prefix:string[]):Generator<string[]>{
  if(!left){yield prefix;return;}
  for(let i=start;i<=ids.length-left;i++)yield*choose(i+1,left-1,[...prefix,ids[i]!]);
 }
 for(let count=1;count<=Math.min(ids.length,maximum);count++)yield*choose(0,count,[]);
}
function subsetCount(length:number,maximum:number):number{
 let total=0,combination=1;for(let n=1;n<=Math.min(length,maximum);n++){combination=combination*(length-n+1)/n;total+=combination;}return total;
}
function losses(changes:readonly TarotCardChange[]):string[]{
 const result:string[]=[];
 for(const change of changes){const {before,after,cardId}=change;
  if(before.enhancement!==after.enhancement&&before.enhancement!=='none')result.push(`${cardId}: se sustituye ${before.enhancement} por ${after.enhancement}; el índice no valora completamente el beneficio sacrificado.`);
  if(before.suit!==after.suit)result.push(`${cardId}: cambia ${before.suit} por ${after.suit}; no se comparan las futuras manos que pierden o ganan ese palo.`);
  if(before.enhancement!=='stone'&&after.enhancement==='stone')result.push(`${cardId}: Piedra deja de participar por rango y palo; esa pérdida no queda completamente valorada por los apartados.`);
 }
 return result;
}
function project(state:GameStateV02,entry:PackEntry|null,targets:string[],baseline:CompositionReport,settings:ArcanaChoiceOptions):ArcanaChoiceOption{
 const action:ChoiceAction=entry?{type:'choose_pack_item',entryId:entry.entryId,...(entry.kind==='tarot'?{targetCardIds:targets}:{})}:{type:'skip_open_pack'};
 const result=applyPackAction(state,action,{expectedRevision:state.revision,updatedAt:state.updatedAt},{requireObserved:settings.requireObserved??false});
 const id=entry?identity(entry.entryId,targets):'skip',label=entry?entryName(entry):'Omitir lo restante';
 const common={id,entryId:entry?.entryId??null,label,targetCardIds:[...targets],action:structuredClone(action),status:operationStatus(result.ok?[]:result.errors,result.evidence),projection:result,evidence:structuredClone(result.evidence)};
 const limitations=['Proyección de una única elección desde la revisión de origen; no cambia la partida registrada.',...result.evidence.limitations.map(item=>item.message)];
 if(!result.ok)return {...common,composition:null,consequences:null,cardChanges:[],sacrifices:[],historyChanges:[],limitations:[...new Set(limitations)],errors:structuredClone(result.errors)};
 const after=result.value.state,cardChanges=structuredClone(result.value.cardChanges),sacrifices=losses(cardChanges);
 limitations.push(...result.value.limitations,...sacrifices);
 if(entry)limitations.push('Los apartados valoran soporte estructural existente. No calculan la activación futura ni el beneficio intrínseco completo de cada mejora, y pueden ocultar diferencias por redondeo o umbrales.');
 else limitations.push('Omitir pierde las elecciones restantes y no devuelve el pago; conserva cualquier cambio ya confirmado del sobre.');
 const previous=value(state.observed.jokerContext)?.tarotsUsed??null,current=value(after.observed.jokerContext)?.tarotsUsed??null;
 const historyChanges:ArcanaChoiceOption['historyChanges']=equal(previous,current)?[]:[{field:'tarotsUsed',before:structuredClone(previous),after:structuredClone(current)}];
 return {...common,composition:compositionDelta(baseline,evaluateComposition(after)),consequences:immediateConsequences(state,after),cardChanges,sacrifices,historyChanges,limitations:[...new Set(limitations)],errors:[]};
}

/** Group equal section vectors first: a full 4096-candidate report must not do
 * quadratic work on thousands of physically different but equal-index targets. */
function rankedGroups(options:ArcanaChoiceOption[]):ArcanaChoiceOption[][][] {
 const groups=new Map<string,ArcanaChoiceOption[]>();
 for(const option of options.filter(option=>option.projection.ok&&option.composition)){
  const key=token(option.composition!.after.sections.map(section=>[section.id,section.status,section.value]));
  const group=groups.get(key);if(group)group.push(option);else groups.set(key,[option]);
 }
 let remaining=[...groups.values()];const fronts:ArcanaChoiceOption[][][]=[];
 while(remaining.length){const front=remaining.filter(group=>!remaining.some(other=>other!==group&&compositionSectionRelation(other[0]!.composition!.after,group[0]!.composition!.after)==='better'));fronts.push(front);const selected=new Set(front);remaining=remaining.filter(group=>!selected.has(group));}
 return fronts;
}
function recommend(options:ArcanaChoiceOption[],front:ArcanaChoiceOption[],blocked:string[]):ArcanaChoiceReport['recommendation']{
 const p=ARCANA_CHOICE_POLICY.rules;
 const abstain=(reasons:string[]):ArcanaChoiceReport['recommendation']=>({kind:'abstain',optionIds:[],reasons,ruleIds:[p.incomplete]});
 if(blocked.length)return abstain(blocked);
 if(options.some(option=>!option.projection.ok))return abstain(['Alguna alternativa no se puede calcular con las reglas o los datos disponibles. Se conservan las proyecciones independientes, sin ganadora global.']);
 const legal=options.filter(option=>option.projection.ok);
 if(!legal.some(option=>option.entryId!==null))return abstain(['No hay objetivos compatibles para usar un Tarot. No se recomienda omitir por defecto.']);
 if(legal.some(option=>option.composition!.after.sections.some(section=>section.status==='partial')))return abstain(['Hay apartados relevantes con datos desconocidos. Los cambios exactos de las cartas siguen disponibles, pero no bastan para ordenar el soporte completo.']);
 const skip=legal.find(option=>option.id==='skip');
 const skipGrowth=skip?.consequences?.counters.some(change=>{const before=value(change.before??undefined),after=value(change.after??undefined);return before!==undefined&&after!==undefined&&after>before;});
 if(skipGrowth)return {kind:'tradeoff',optionIds:[...new Set([...front.map(option=>option.id),'skip'])],reasons:['Omitir desarrolla el contador mostrado de Red Card; usar Tarot transforma cartas y puede desarrollar el historial de Tarot. El beneficio de esas transformaciones y activaciones futuras no se convierte en Mult ni en puntos de mano.'],ruleIds:[p.tradeoff]};
 if(front.some(option=>option.sacrifices.length))return {kind:'tradeoff',optionIds:front.map(option=>option.id),reasons:['Las opciones destacadas por los apartados sustituyen mejoras, palos o participación por rango. Esos beneficios sacrificados no están completamente valorados; no se declara superioridad estratégica.'],ruleIds:[p.sacrifice,p.tradeoff]};
 const first=front[0];
 const same=!!first&&front.every(option=>compositionSectionRelation(option.composition!.after,first.composition!.after)==='same');
 const outside=legal.filter(option=>!front.includes(option));
 if(front.length&&outside.length&&same)return {kind:'conditional',optionIds:front.map(option=>option.id),reasons:['Estas opciones mejoran al menos un apartado conocido sin empeorar los otros frente a las alternativas excluidas, según la política estructural existente.',...(front.length>1?['La política no distingue entre estos objetivos; compartir índices no significa compartir valor estratégico.']:[]),'Preferencia condicionada al soporte mostrado y a aprovecharlo después. No identifica el mejor Tarot global, una mano ganadora ni supervivencia; el valor intrínseco y las futuras activaciones siguen sin modelar.'],ruleIds:[p.pareto,...(front.length>1?[p.undistinguished]:[])]};
 if(front.length)return {kind:same?'tie':'tradeoff',optionIds:front.map(option=>option.id),reasons:[same?'Los apartados conocidos no distinguen estas opciones. Se muestran juntas sin afirmar que tengan efectos equivalentes o el mismo valor estratégico.':'Las ventajas de los apartados se reparten entre opciones y no se suman arbitrariamente.', 'Revisa las transformaciones exactas y sus condiciones: faltan las futuras jugadas y el valor intrínseco completo de las mejoras. No se desempata por nombre, ID o índice global.'],ruleIds:[same?p.undistinguished:p.tradeoff]};
 return abstain(['No hay una comparación contextual completa disponible.']);
}

/** Read-only next choice. No draw prediction, store, phase conversion or Mega sequence search. */
export function compareArcanaChoices(input:unknown,options:ArcanaChoiceOptions={}):Result<ArcanaChoiceReport>{
 const checked=validateState(input);if(!checked.ok)return checked;const errors=optionErrors(options);if(errors.length)return {ok:false,errors};
 if(checked.value.schemaVersion!=='0.2'||checked.value.phase!=='open_pack')return invalid('wrong_phase','Compara Arcana desde un sobre abierto registrado en formato 0.2.');
 const state=checked.value,context=state.phaseData.context;
 if(!context)return invalid('missing_pack_context','Falta el contexto registrado del sobre.');
 if(BOOSTER_CATALOG.find(pack=>pack.id===context.catalogId)?.family!=='arcana')return invalid('unsupported_pack','Esta comparación solo admite sobres Arcana.');
 const entries=value(context.contents)?.filter(entry=>!context.selectedEntryIds.includes(entry.entryId))??[],hand=value(context.heldCardIds),maximum=options.maxCandidates??ARCANA_CHOICE_POLICY.defaultMaxCandidates;
 const baseline=evaluateComposition(state),evaluated:ArcanaChoiceOption[]=[],blocked:string[]=[];
 let enumerated=0,theoreticalCount:number|null=context.contents.status==='known'&&hand!==undefined?0:null,truncated=false;
 if(context.contents.status!=='known')blocked.push('El contenido del sobre sigue desconocido. Transcribe las opciones visibles antes de compararlas.');
 if(hand===undefined)blocked.push('Falta la mano observada de Arcana. No se inventan cartas ni se eligen objetivos de todo el mazo.');
 if(state.observed.resources.handSize.status==='unknown')blocked.push('No se conoce el tamaño de mano: se pueden calcular transformaciones locales, pero no comprobar que estén todos los objetivos visibles.');
 for(const entry of entries){
  const definition=entry.kind==='tarot'?tarotDefinition(entry.catalogId):undefined;
  if(!definition){theoreticalCount=null;blocked.push('Hay contenido no compatible o de otra familia: '+entryName(entry)+'. Se conservan los cálculos compatibles sin declarar una mejor opción global.');evaluated.push(project(state,entry,[],baseline,options));continue;}
  if(hand===undefined){evaluated.push(project(state,entry,[],baseline,options));continue;}
  if(theoreticalCount!==null)theoreticalCount+=subsetCount(hand.length,definition.maxTargets);
  for(const targets of subsets(hand,definition.maxTargets)){
   if(enumerated>=maximum){truncated=true;break;}
   evaluated.push(project(state,entry,targets,baseline,options));enumerated++;
  }
 }
 if(truncated)blocked.push(`Se alcanzó el límite de ${maximum} combinaciones. La búsqueda parcial no permite declarar una ganadora global.`);
 evaluated.push(project(state,null,[],baseline,options));
 const layers=rankedGroups(evaluated),front=layers[0]?.flat()??[],order=layers.flat(2).map(option=>option.id);
 for(const option of evaluated)if(!order.includes(option.id))order.push(option.id);
 return {ok:true,value:{contract:'arcana-choices-1',policyVersion:ARCANA_CHOICE_POLICY.version,binding:analysisBinding(state),stateToken:token(state),optionsToken:token(options),inputRevision:state.revision,remainingChoices:context.remainingChoices,
  options:evaluated,order,recommendation:recommend(evaluated,front,blocked),coverage:{scope:'next-choice',maxCandidates:maximum,enumerated,theoreticalCount,truncated},
  limitations:['Se enumeran subconjuntos no vacíos de los objetivos observados para cada Tarot compatible restante, más omitir. El límite corresponde a proyecciones de objetivos; omitir y entradas no compatibles se muestran además.',
   'Solo la siguiente elección: no se optimiza el orden de dos usos Mega ni se añaden ventas, otros consumibles o robos. Recalcula después de confirmar una elección.',
   'La entrada es una observación registrada; todos los resultados son proyecciones independientes. Solo una confirmación explícita puede guardar una acción real.',
   'Los seis apartados reutilizan la política de composición existente ('+baseline.policy+'); la relación Pareto se comparte con '+PACK_CHOICE_POLICY.version+'. El índice global solo describe diferencias y no ordena por sí solo.',
   'Igualdad de índices no implica igualdad de efectos ni de valor estratégico. Umbrales, máximos y redondeos pueden ocultar diferencias; no se valora toda la utilidad intrínseca de mejoras ni futuras manos adaptadas.',
   'No se estima puntuación de una mano, probabilidad, consistencia de robo ni supervivencia. El pago del sobre ya ocurrió y no se cobra otra vez.',
   'Las reglas conservan su evidencia provisional por inspección del ejecutable; no se declara comprobación directa en partida. El modo estricto se aplica a cada proyección.',...blocked],projected:true,exhaustive:false,analysisScope:'contextual-preparation',notOverallBest:true}};
}

export function arcanaChoicesAreCurrent(report:ArcanaChoiceReport,input:unknown,options:ArcanaChoiceOptions={}):boolean{
 const checked=validateState(input);if(!checked.ok||optionErrors(options).length)return false;
 return report.contract==='arcana-choices-1'&&report.policyVersion===ARCANA_CHOICE_POLICY.version&&report.stateToken===token(checked.value)&&report.optionsToken===token(options)&&equal(report.binding,analysisBinding(checked.value));
}
