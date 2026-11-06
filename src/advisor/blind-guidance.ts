import type {Fact,GameState,Result,Issue} from '../state/model.js';
import {validateState} from '../state/validation.js';
import {boolean,checkJsonValue,enumeration,isObject,object} from '../state/schema.js';
import {analysisBinding,canonical,equal} from '../storage/confirmed-record.js';
import type {AnalysisBinding} from '../storage/confirmed-record.js';
import {ENGINE_RULESET,GAME_VERSION} from '../catalog/initial.js';
import {deckDefinition} from '../catalog/decks.js';
import {tagDefinition} from '../catalog/tags.js';
import {tagStrategyProfile} from '../catalog/tag-strategy.js';
import type {TagStrategyProfile} from '../catalog/tag-strategy.js';
import {projectSkipBlind,selectionScenarioState} from '../rules/tags.js';
import {projectCashout} from '../rules/economy.js';
import {BLIND_POLICY} from './blind-decision.js';

export const BLIND_GUIDANCE_POLICY={version:'blind-guidance-1',rules:{
 opportunity:'BG-ROUND-AND-SHOP',cashThreshold:'BG-CASH-THRESHOLD',rewardTradeoff:'BG-REWARD-TRADEOFF',
 risk:'BG-DECLARED-RISK',persistent:'BG-PERSISTENT-TRADEOFF',queue:'BG-TAG-QUEUE',
 strict:'BG-STRICT-EVIDENCE',compatibility:'BG-COMPATIBILITY',boss:'BG-BOSS-NO-SKIP'
}} as const;
export type BlindRisk='comfortable'|'tight'|'unknown';
export interface BlindGuidanceOptions {requireObserved?:boolean;risk?:BlindRisk}
export interface BlindCashflowReference {
 basis:'conditional_cashflow_only';
 skipImmediateIncome:number;
 rows:{handsRemaining:number;earned:number;balanceAfter:number}[];
 minimumHandsToMatchSkip:number|null;
 assumptions:string[];
 provisional:true;
}
export interface BlindGuidance {
 contract:'blind-guidance-1';policyVersion:string;basis:'heuristic';
 binding:AnalysisBinding;stateToken:string;optionsToken:string;
 recommendation:{status:'conditional'|'tradeoff'|'abstain';preferred:'play'|'skip'|null;ruleId:string;title:string;reason:string};
 reasons:string[];sacrifices:string[];conditions:string[];limitations:string[];
 tag:{id:string|null;name:string;profile:TagStrategyProfile|null};
 survival:{status:'not_evaluated'|'player_reported';risk:BlindRisk;source:'player_declaration'|null};
 cashflowReference:BlindCashflowReference|null;
 askRisk:boolean;projected:true;exhaustive:false;
 evidence:{status:'provisional';verification:'static_inspection_and_heuristic';source:string;observedInGame:false};
}
const value=<T>(fact:Fact<T>|undefined):T|null=>fact?.status==='known'?fact.value:null;
const token=(data:unknown)=>JSON.stringify(canonical(data));
const policy=BLIND_GUIDANCE_POLICY.rules;
const temporary:Record<string,string>={
 popcorn:'Popcorn pierde Mult al terminar una ronda.',
 ice_cream:'Ice Cream se consume al jugar manos.',
 ramen:'Ramen puede perder multiplicador al descartar.',
 turtle_bean:'Turtle Bean pierde parte de su efecto al terminar una ronda.',
 selzer:'Seltzer consume sus manos de repetición al jugar.',
 ceremonial_dagger:'Ceremonial Dagger puede destruir el comodín a su derecha al seleccionar la ciega.',
 madness:'Madness puede destruir otro comodín al seleccionar una ciega pequeña o grande.'
};
function parsedOptions(input:unknown):Result<Required<BlindGuidanceOptions>> {
 const errors=checkJsonValue(input);if(errors.length)return {ok:false,errors};
 if(!isObject(input)||Object.keys(input).some(key=>!['requireObserved','risk'].includes(key)))return {ok:false,errors:[{path:'$guidance.options',code:'invalid_options',message:'Opciones de orientación de ciega no reconocidas.'}]};
 const issues:Issue[]=[];object({},{requireObserved:boolean,risk:enumeration('comfortable','tight','unknown')}).check(input,'$guidance.options',issues);
 return issues.length?{ok:false,errors:issues}:{ok:true,value:{requireObserved:input.requireObserved===true,risk:(input.risk??'unknown') as BlindRisk}};
}

/** H2 supplies every amount. This enumerates conditional cashouts, never hands,
 * draws, a scoring plan, or a claim that unused hands can actually be retained. */
function cashflowReference(state:Extract<GameState,{schemaVersion:'0.2'}>):BlindCashflowReference|null {
 if(state.phase!=='blind_select')return null;
 // Without a round plan we cannot resolve forced selection events or later
 // income changes. Limit the numerical reference to the retained initial-eight
 // family; unknown modifiers also prevent assuming a stable cashout inventory.
 const jokers=value(state.observed.jokers);
 if(jokers===null||jokers.some(j=>!(BLIND_POLICY.cashEligibleJokers as readonly string[]).includes(j.catalogId)||value(j.stickers)===null||value(j.stickers)!.length>0))return null;
 const skip=projectSkipBlind(structuredClone(state));if(!skip.ok||skip.value.tagId!=='tag_economy')return null;
 const hands=value(state.observed.resources.handsPerRound);if(hands===null||hands<1)return null;
 const input=selectionScenarioState(state),rows:BlindCashflowReference['rows']=[];
 for(let remaining=0;remaining<hands;remaining++){
  const cash=projectCashout(input,{handsRemaining:remaining,won:true,noMoneyChangesDuringRound:true});
  if(!cash.ok)return null;
  rows.push({handsRemaining:remaining,earned:cash.value.earned,balanceAfter:cash.value.balanceAfter});
 }
 const qualifying=rows.find(row=>row.earned>=skip.value.immediateIncome);
 // A threshold is advertised only when all larger enumerated counts also match.
 const minimum=qualifying&&rows.filter(row=>row.handsRemaining>=qualifying.handsRemaining).every(row=>row.earned>=skip.value.immediateIncome)?qualifying.handsRemaining:null;
 return {basis:'conditional_cashflow_only',skipImmediateIncome:skip.value.immediateIncome,rows,minimumHandsToMatchSkip:minimum,
  assumptions:['Superar la ciega actual.','El saldo no cambia durante la ronda; se conservan los otros datos usados por el cobro.','Cada fila declara sus manos sobrantes; no predice cuántas sobrarán.','La comparación acaba en el cobro o en el ingreso inmediato del salto; la tienda y los efectos futuros no tienen precio.'],provisional:true};
}

/** Independent qualitative orientation. An unavailable skip projection limits
 * the projection, not the opportunity-cost reasoning. No persistence or scoring. */
export function guideBlindChoice(input:unknown,options:BlindGuidanceOptions={}):Result<BlindGuidance> {
 const checked=validateState(input);if(!checked.ok)return checked;
 const parsed=parsedOptions(options);if(!parsed.ok)return parsed;
 const state=checked.value,settings=parsed.value;
 if(state.schemaVersion!=='0.2'||state.phase!=='blind_select')return {ok:false,errors:[{path:'$.phase',code:'wrong_phase',message:'La orientación jugar/saltar requiere una selección de ciega registrada en formato 0.2.'}]};
 const blind=value(state.observed.nextBlind),tagId=value(state.phaseData.skipTag),profile=tagId?tagStrategyProfile(tagId):null;
 const result:BlindGuidance={contract:'blind-guidance-1',policyVersion:BLIND_GUIDANCE_POLICY.version,basis:'heuristic',binding:analysisBinding(state),stateToken:token(state),optionsToken:token(settings),
  recommendation:{status:'conditional',preferred:'play',ruleId:policy.opportunity,title:'Me inclino por jugar',reason:'Conservas la oportunidad de cobrar y visitar otra tienda, si superas esta ciega.'},
  reasons:[],sacrifices:['Saltar omite el cobro de esta ronda y su visita ordinaria a tienda; el cobro depende de ganar.'],
  conditions:['La capacidad de superar esta ciega no está evaluada por esta orientación.'],
  limitations:['Orientación heurística, sin porcentajes de victoria ni de confianza.','No se conocen las ofertas futuras ni se asigna un precio a una tienda.','No se puntúan manos ni se predicen cartas, robos o recursos sobrantes.','Inspección estática de Steam1.0.1o-FULL; no observación en una partida.'],
  tag:{id:tagId,name:tagId?tagDefinition(tagId)?.name??tagId:'Etiqueta sin registrar',profile},
  survival:{status:settings.risk==='unknown'?'not_evaluated':'player_reported',risk:settings.risk,source:settings.risk==='unknown'?null:'player_declaration'},
  cashflowReference:null,askRisk:false,projected:true,exhaustive:false,
  evidence:{status:'provisional',verification:'static_inspection_and_heuristic',source:'docs/evidencia/str02-etiquetas.md',observedInGame:false}};
 const recommend=(status:BlindGuidance['recommendation']['status'],preferred:'play'|null,ruleId:string,title:string,reason:string)=>{result.recommendation={status,preferred,ruleId,title,reason};};
 if(state.rulesetId!==ENGINE_RULESET||value(state.observed.gameVersion)!==GAME_VERSION||value(state.observed.gamePlatform)!=='pc-steam'||value(state.observed.modsPresent)!==false||value(state.observed.stakeId)!=='white'||!deckDefinition(value(state.observed.deckId)??'')||!blind||blind.ante<1||blind.ante>8){
  recommend('abstain',null,policy.compatibility,'Revisa el contexto de la ciega','Falta un contexto compatible de versión, baraja, dificultad o ciega; no se presupone su equivalencia.');return {ok:true,value:result};
 }
 if(settings.requireObserved){recommend('abstain',null,policy.strict,'Falta evidencia de partida','El modo estricto conserva la abstención: estas reglas y la orientación heurística todavía no están contrastadas en una partida.');return {ok:true,value:result};}
 if(blind.kind==='boss'){
  recommend('conditional','play',policy.boss,'La ciega jefe se juega','La Jefe no admite salto; esta orientación no demuestra que puedas superarla.');result.sacrifices=[];return {ok:true,value:result};
 }
 const money=value(state.observed.money),reward=value(blind.reward),deck=value(state.observed.deckId),jokers=value(state.observed.jokers),context=value(state.observed.jokerContext),queue=value(context?.tags);
 result.reasons.push(`Ante ${blind.ante} · ${blind.kind==='small'?'ciega pequeña':'ciega grande'}: conservar una ronda mantiene la visita ordinaria a tienda.`);
 if(reward!==null)result.reasons.push(`Premio registrado $${reward}, solo si superas esta ciega; no es el cobro total.`);
 if(money!==null)result.reasons.push(`Saldo actual $${money}; no se da por disponible ninguna recompensa futura.`);
 if(deck==='green')result.reasons.push('La baraja verde no cobra intereses; sus manos y descartes sobrantes influyen en el cobro.');
 if(profile){result.reasons.push(result.tag.name+': '+profile.benefit);result.conditions.push(...profile.conditions);if(profile.execution==='not_implemented')result.limitations.push('El beneficio se conoce cualitativamente; su efecto no se ejecuta ni se concede en el motor de esta consulta.');}
 else result.conditions.push(`El beneficio de ${result.tag.name} no está valorado; podría invertir esta orientación inicial. No se considera cero.`);
 if(settings.risk==='comfortable')result.conditions.push('Has indicado que la sueles superar; es tu valoración declarada, no una certificación del motor.');
 if(jokers?.some(joker=>joker.catalogId==='green_joker'))result.reasons.push('Green Joker puede desarrollarse al jugar manos y reducirse al descartar; no se presupone qué acciones harás ni cuánto crecerá.');
 if(profile?.id==='tag_economy'){
  result.cashflowReference=cashflowReference(state);
  const ref=result.cashflowReference;
  if(ref&&ref.minimumHandsToMatchSkip!==null){
   const n=ref.minimumHandsToMatchSkip;
   const condition=n===0?'si superas la ciega':`si superas la ciega dejando al menos ${n} ${n===1?'mano':'manos'} sin usar`;
   recommend('conditional','play',policy.cashThreshold,'Jugar conserva la tienda',`El cobro condicionado iguala o supera los $${ref.skipImmediateIncome} inmediatos de Economía ${condition}. Conservas además la visita a tienda.`);
   result.conditions.push(...ref.assumptions,`El umbral de ${n} manos sobrantes es una condición monetaria, no una predicción de supervivencia.`);
  }else{recommend('tradeoff',null,policy.rewardTradeoff,'Economía ofrece un intercambio',ref?`Economía aporta $${ref.skipImmediateIncome} inmediatos y ninguno de los cobros condicionados enumerados lo iguala. Jugar conserva tienda y desarrollo, cuyo valor no está monetizado.`:'La etiqueta puede aportar dinero, pero faltan datos o reglas para comparar ese ingreso con un cobro condicionado; no se trata como cero.');if(!ref)result.limitations.push('Sin referencia numérica de cobro: no se han resuelto los cambios de selección/ronda o los datos que podrían alterar sus ingresos.');}
 }else if(profile&&['tag_investment','tag_coupon','tag_double'].includes(profile.id)){
  recommend('tradeoff',null,policy.rewardTradeoff,'Compara la recompensa con otra ronda',`${result.tag.name} aporta un beneficio condicionado que podría compensar el salto. Jugar conserva cobro y tienda; no se les asigna un precio común.`);
 }
 const changing=jokers?.filter(joker=>temporary[joker.catalogId]||value(joker.stickers)?.some(sticker=>sticker==='perishable'||sticker==='rental'))??[];
 if(jokers===null||jokers.some(joker=>joker.stickers.status==='unknown')){
  result.conditions.push('Falta confirmar el inventario o sus modificadores; no se supone que no haya efectos que se consuman al jugar.');
  recommend('tradeoff',null,policy.persistent,'Falta valorar parte de tu composición','Conservar ronda y tienda es útil, pero los efectos propios desconocidos pueden cambiar ese intercambio.');
 }
 if(changing.length){for(const joker of changing)result.reasons.push(temporary[joker.catalogId]??`${joker.catalogId} tiene un modificador que puede consumir recursos o caducar.`);result.sacrifices.push('Jugar puede consumir un beneficio existente; conservarlo al saltar no demuestra utilidad en la siguiente ciega.');recommend('tradeoff',null,policy.persistent,'Jugar también consume efectos','Hay beneficios de tu composición que se gastan o deterioran al jugar. Compáralos con el cobro y la tienda antes de elegir.');}
 if(jokers?.some(joker=>joker.catalogId==='throwback')){
  const skips=value(context?.blindsSkipped);result.reasons.push(`Throwback se beneficia del total de saltos${skips===null?' (total sin registrar)':` (actualmente ${skips})`}; no se convierte ese crecimiento en dinero ni en puntuación garantizada.`);
  recommend('tradeoff',null,policy.persistent,'El salto también desarrolla Throwback','Saltar tiene una sinergia concreta con tu inventario. Su utilidad depende de poder aprovecharla después; jugar conserva ronda y tienda.');
 }
 if(queue===null||queue.includes('tag_double')){
  result.conditions.push(queue===null?'La cola de etiquetas no está confirmada; no se presupone vacía.':'Una Double pendiente puede duplicar la recompensa de salto. Su efecto no se simula aquí.');
  recommend('tradeoff',null,policy.queue,'Revisa las etiquetas pendientes','La cola puede cambiar la recompensa de saltar; las oportunidades de jugar siguen visibles, pero no se ignora esa condición.');
 }
 if(settings.risk==='tight'){
  result.conditions.push('Has indicado que vas justo; es una valoración declarada del jugador.','Saltar evita esta ronda, pero no demuestra que la siguiente ciega sea viable.');
  recommend('tradeoff',null,policy.risk,'El riesgo cambia la decisión','Has indicado que vas justo: no conviene preferir jugar automáticamente por su economía. Contrasta el beneficio de la etiqueta y las condiciones de la siguiente ciega.');
 }
 result.askRisk=settings.risk==='unknown'&&result.recommendation.preferred==='play';
 result.reasons=[...new Set(result.reasons)];result.conditions=[...new Set(result.conditions)];return {ok:true,value:result};
}

export function blindGuidanceIsCurrent(report:BlindGuidance,input:unknown,options:BlindGuidanceOptions={}):boolean {
 const checked=validateState(input),settings=parsedOptions(options);
 return checked.ok&&settings.ok&&report.stateToken===token(checked.value)&&report.optionsToken===token(settings.value)&&equal(report.binding,analysisBinding(checked.value));
}
