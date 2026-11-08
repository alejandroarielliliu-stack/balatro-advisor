import {tagDefinition} from '../catalog/tags.js';
import type {Fact,GameState,GameStateV02,Result} from '../state/model.js';
import {createUnknownState} from '../state/model.js';
import {validateCurrentState,validateState} from '../state/validation.js';
import {array,boolean,checkJsonValue,enumeration,fact,integer,object,record as recordSchema,text,union} from '../state/schema.js';
import type {Infer,Schema} from '../state/schema.js';
import {counterSpecs} from '../catalog/joker-counters.js';
import {HISTORY_TARGET_KEYS} from '../catalog/history-jokers.js';
import {observationCounterSpecs} from '../state/observations.js';
import type {Trace} from '../rules/core.js';

const refSchema=object({ante:integer(1,8),kind:enumeration('small','big','boss')});
export const progressBlindSchema=object({ante:integer(1,8),kind:enumeration('small','big','boss'),bossId:fact(text()),target:fact(integer(1)),reward:fact(integer(0))});
export type BlindInfo=Infer<typeof progressBlindSchema>;
export type BlindRef=Infer<typeof refSchema>;
const patchFields=['deck','jokers','handBases','outOfScope','resources','jokerContext','money'] as const;
export type ObservedPatch=Partial<Pick<GameState['observed'],typeof patchFields[number]>>;
const patchSchema:Schema<ObservedPatch>={check(v,p,e){
  if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!patchFields.includes(k as typeof patchFields[number]))){e.push({path:p,code:'invalid_patch',message:'Solo se admiten datos observados de cartas, comodines, bases, vales, recursos, contexto y saldo.'});return false;}
  const draft=createUnknownState('patch-validation','2026-10-16T00:00:00Z');
  draft.observed={...draft.observed,...v};const checked=validateCurrentState(draft);
  if(!checked.ok)e.push(...checked.errors.map(x=>({...x,path:p+x.path.replace('$.observed','')})));
  return checked.ok;
}};
const literalTrue:Schema<true>={check:(v,p,e)=>v===true||(e.push({path:p,code:'confirmation_required',message:'Confirma que el inventario no cambió o transcribe sus datos observados.'}),false)};
export const inventoryGroups=['deck','jokers','handBases','outOfScope','resources','jokerContext'] as const;
export type InventoryGroup=typeof inventoryGroups[number];
const changedGroupsSchema:Schema<InventoryGroup[]>={check(value,path,errors){
 if(!array(enumeration(...inventoryGroups),6).check(value,path,errors))return false;
 const groups=value as InventoryGroup[];
 if(!groups.length||new Set(groups).size!==groups.length){errors.push({path,code:'invalid_groups',message:'Indica al menos un grupo que cambió, sin repetirlo.'});return false;}return true;
}};
export const inventoryConfirmationSchema=union(union(object({unchanged:literalTrue}),object({patch:patchSchema})),
  object({reconcile:object({changedGroups:changedGroupsSchema})}));
export type InventoryConfirmation=Infer<typeof inventoryConfirmationSchema>;
const cycleCommandSchema=union(
  union(object({type:enumeration('locate'),phase:enumeration('blind_select','in_round','shop'),blind:progressBlindSchema},{money:integer()}),
    object({type:enumeration('enter_round')},{blind:progressBlindSchema})),
  union(object({type:enumeration('report_result'),outcome:enumeration('won','lost')},{score:integer(0),handsUsed:integer(0,100),discardsUsed:integer(0,100)}),
    union(object({type:enumeration('collect_cashout'),money:integer()},{nextBlind:progressBlindSchema}),
      union(object({type:enumeration('leave_shop')},{nextBlind:progressBlindSchema}),object({type:enumeration('end_run'),reason:text(2000)})))));
const cashoutJokerUpdateSchema=object({instanceId:text(),counters:recordSchema(fact(integer()))},{sellValue:fact(integer(0)),removed:boolean});
const recordCashoutCommandSchema=object({type:enumeration('record_cashout'),amount:integer(0),jokerUpdates:array(cashoutJokerUpdateSchema,100)},{money:integer(),nextBlind:progressBlindSchema});
export type CashoutJokerUpdate=Infer<typeof cashoutJokerUpdateSchema>;
export type RecordCashoutCommand=Infer<typeof recordCashoutCommandSchema>;
export const runProgressCommandSchema=union(recordCashoutCommandSchema,union(cycleCommandSchema,union(
 object({type:enumeration('observe_skip_tag'),tag:fact(text())},{blind:object({ante:integer(1,8),kind:enumeration('small','big')})}),
 union(object({type:enumeration('observe_tag_queue'),tags:fact(array(text(),100))}),
 object({type:enumeration('skip_blind'),atNextSelection:{check:(v,p,e)=>v===true||(e.push({path:p,code:'confirmation_required',message:'Confirma que resolviste los efectos del salto y estás en la siguiente selección.'}),false)} as Schema<true>},{money:integer(),nextBlind:progressBlindSchema,tags:fact(array(text(),100))})))));
export type RunProgressCommand=Infer<typeof runProgressCommandSchema>;
export interface ProgressOptions {expectedRevision:number;updatedAt:string;inventory:InventoryConfirmation}
export interface ProgressResult {state:GameStateV02;trace:Trace[];limitations:string[]}
const known=<T>(value:T):Fact<T>=>({status:'known',source:'manual',value});
const unknown=<T>(reason:string):Fact<T>=>({status:'unknown',reason});
const issue=<T>(code:string,message:string,path='$progress'):Result<T>=>({ok:false,errors:[{path,code,message}]});
const sameRef=(a:BlindRef,b:BlindRef)=>a.ante===b.ante&&a.kind===b.kind;
const observedProgressLimitations=['El avance es declarado por el usuario; no verifica las reglas mediante una partida ni calcula efectos de manos omitidas.','El ciclo Small → Big → Boss y el final en ante 8 corresponden al alcance documentado, sin endless ni desafíos; no se infiere compatibilidad del perfil desconocido.'];

/** Cycle order only. No tag effects, boss lottery, payout or scoring is performed. */
export function advanceBlindRef(blind:BlindRef):BlindRef|null {
  if(!Number.isSafeInteger(blind.ante)||blind.ante<1||blind.ante>8)return null;
  if(blind.kind==='small')return {ante:blind.ante,kind:'big'};
  if(blind.kind==='big')return {ante:blind.ante,kind:'boss'};
  return blind.ante<8?{ante:blind.ante+1,kind:'small'}:null;
}
/** An upcoming reference is derived; its unobserved target, reward and new boss stay unknown. */
export function nextBlindAfter(state:GameState,blind:BlindRef):BlindInfo|null {
  const next=advanceBlindRef(blind);if(!next)return null;
  const boss=state.observed.visibleBoss;
  if(next.kind==='boss'&&boss.status==='known'&&sameRef(next,boss.value))return structuredClone(boss.value);
  return {...next,bossId:next.kind==='boss'?unknown('Todavía no se registró este jefe.'):known('none'),target:unknown('Confirma el objetivo de la siguiente ciega.'),reward:unknown('Confirma el premio de la siguiente ciega.')};
}
const dynamicContext=['tags','visibleHands','tarotsUsed','planetsUsed','grosMichelExtinct','consumables','rerollCost','freeRerolls','bossDisabled'] as const;
// These grow through shop/pack decisions, not through a played round by itself.
const shopOnlyCounters=new Set(['red_card','flash']);

function invalidateDynamic(state:GameStateV02,scope:'gap'|'selection'|'round'|'shop'|'shop_entry',limitations:string[]){
  const reason=scope==='gap'?'El tramo anterior no fue registrado. Transcribe el valor actual.':scope==='selection'?'Seleccionar la ciega puede cambiar este dato; no se ejecutaron sus efectos.':scope==='round'?'El resumen de ronda no determina este dato. Transcribe su valor final.':scope==='shop_entry'?'El precio y los usos de renovación de esta nueva tienda no se registraron.':'La salida de tienda puede activar efectos; no se simuló su resultado.';
  const inventory=state.observed.jokers;
  if(inventory.status==='known'){
    const gift=inventory.value.some(j=>j.catalogId==='gift');
    for(const j of inventory.value){
      const keys=new Set([...Object.keys(j.counters),...Object.keys(counterSpecs(j.catalogId)),...(j.catalogId==='green_joker'?['greenMult']:[])]);
      for(const key of keys){
        const target=HISTORY_TARGET_KEYS[j.catalogId]?.includes(key)||j.catalogId==='todo_list'&&key==='handIndex';
        const selection=['madness','ceremonial'].includes(j.catalogId)||target;
        const boss=state.observed.nextBlind.status==='known'&&state.observed.nextBlind.value.kind==='boss';
        const roundChanges=!shopOnlyCounters.has(j.catalogId)&&!['ceremonial','madness'].includes(j.catalogId)&&(j.catalogId!=='rocket'||boss);
        if(scope==='gap'||scope==='round'&&(roundChanges||key==='extraSell'&&gift)||scope==='selection'&&selection)j.counters[key]=unknown(reason);
      }
      if((scope==='round'||scope==='gap')&&(gift||j.catalogId==='egg'))j.sellValue=unknown('El valor de venta pudo cambiar al terminar la ronda; transcribe el observado.');
    }
  }
  const context=state.observed.jokerContext;
  if(context?.status==='known'){
    const ctx=context.value;
    const fields=scope==='shop_entry'?['rerollCost','freeRerolls'] as const:scope==='shop'?['rerollCost','freeRerolls',...(inventory.status==='known'&&inventory.value.some(j=>j.catalogId==='perkeo')?['consumables' as const]:[])] as const:dynamicContext;
    for(const field of fields)if(ctx[field]&&!(field==='tags'&&ctx.tags?.status==='known'&&ctx.tags.value.length===0)&&!(field==='grosMichelExtinct'&&ctx.grosMichelExtinct?.status==='known'&&ctx.grosMichelExtinct.value===true))ctx[field]=unknown(reason) as never;
    if(scope==='round'||scope==='gap')for(const field of ['handCounts','roundHandCounts'] as const)if(ctx[field])for(const key of Object.keys(ctx[field]))ctx[field][key]=unknown(reason);
  }
  // A saved debuff boolean cannot express "unknown". Retaining it would apply an old boss to a new blind.
  if(scope!=='shop_entry'&&state.observed.deck.status==='known'&&'cards' in state.observed.deck.value&&state.observed.deck.value.cards.some(c=>c.debuff)){
    state.observed.deck=unknown('El mazo tenía cartas debilitadas por un contexto anterior. Confirma las cartas actuales antes de puntuar.');
    limitations.push('Se invalidó la instantánea de cartas debilitadas; no se supuso que un jefe nuevo las afecta igual.');
  }
  if(inventory.status==='known'&&inventory.value.some(j=>j.catalogId==='turtle_bean')&&(scope==='round'||scope==='gap'))state.observed.resources.handSize=unknown('El tamaño de mano puede cambiar con Turtle Bean; transcribe su valor actual.');
  limitations.push(reason);
}

function applyInventory(state:GameStateV02,inventory:InventoryConfirmation){
  if('unchanged' in inventory)return;
  if('reconcile' in inventory){
    const reason='El usuario indicó que este grupo cambió. Transcribe únicamente sus datos actuales.';
    for(const group of inventory.reconcile.changedGroups){
      if(group==='resources')state.observed.resources={handsPerRound:unknown(reason),discardsPerRound:unknown(reason),handSize:unknown(reason),jokerSlots:unknown(reason)};
      else state.observed[group]=unknown(reason) as never;
    }
    return;
  }
  const reason='No se confirmó que este dato siguiera igual ni se transcribió su valor actual.';
  state.observed.deck=unknown(reason);state.observed.jokers=unknown(reason);state.observed.handBases=unknown(reason);state.observed.outOfScope=unknown(reason);state.observed.jokerContext=unknown(reason);
  state.observed.resources={handsPerRound:unknown(reason),discardsPerRound:unknown(reason),handSize:unknown(reason),jokerSlots:unknown(reason)};
  Object.assign(state.observed,structuredClone(inventory.patch));
}

/** Advances an observed payout without manufacturing a known final balance. */
function enterShopAfterCashout(state:GameStateV02,proposed:BlindInfo|undefined,limitations:string[]):Result<GameStateV02>{
  if(state.phase!=='cashout')return issue('wrong_phase','Solo se puede registrar el cobro tras una ronda ganada.');
  if(state.phaseData.blind.status!=='known')return issue('missing_blind','Falta la ciega superada; corrige el registro antes de avanzar.');
  const successor=nextBlindAfter(state,state.phaseData.blind.value);if(!successor)return issue('finished_run','El objetivo del ante 8 ya terminó; no se inventa una tienda posterior.');
  if(proposed&&!sameRef(proposed,successor))return issue('wrong_blind','La ciega transcrita no coincide con la siguiente posición del ciclo.');
  state.observed.nextBlind=known(structuredClone(proposed??successor));
  if(state.phaseData.blind.value.kind==='boss')state.observed.visibleBoss=unknown('El jefe del nuevo ante todavía no se registró.');
  state.observed.shop=unknown('Registra las ofertas de esta nueva tienda; no se reutilizan las anteriores.');
  const next:GameStateV02={...state,phase:'shop',phaseData:{origin:structuredClone(state.phaseData.blind)}};
  invalidateDynamic(next,'shop_entry',limitations);
  return {ok:true,value:next};
}

/** Records a user's actual progress; never copies a H2/T07b projected state or runs round hooks. */
export function applyRunProgress(input:unknown,commandInput:unknown,options:ProgressOptions):Result<ProgressResult>{
  const loaded=validateState(input);if(!loaded.ok)return loaded;
  if(loaded.value.schemaVersion!=='0.2')return issue('migration_required','Actualiza explícitamente el formato de la partida antes de registrar su avance.');
  const errors=checkJsonValue(commandInput);if(!errors.length)runProgressCommandSchema.check(commandInput,'$command',errors);
  const optionErrors=checkJsonValue(options);if(!optionErrors.length)object({expectedRevision:integer(0),updatedAt:text(),inventory:inventoryConfirmationSchema}).check(options,'$options',optionErrors);
  if(errors.length||optionErrors.length)return {ok:false,errors:[...errors,...optionErrors]};
  const command=structuredClone(commandInput) as RunProgressCommand,state=loaded.value;
  if(options.expectedRevision!==state.revision)return issue('stale_revision','La partida cambió; recarga antes de confirmar el avance.');
  if(command.type==='record_cashout')return recordObservedCashout(state,command,options);
  const trace:Trace[]=[],limitations=[...observedProgressLimitations];
  let next:GameStateV02=state;
  const requireBlind=():Result<BlindInfo>=>{
    if(state.observed.nextBlind.status!=='known')return issue('missing_blind','Indica la ciega actual; no se deduce de una tienda de origen desconocido.');
    const errors:import('../state/model.js').Issue[]=[];
    if(!progressBlindSchema.check(state.observed.nextBlind.value,'$.observed.nextBlind.value',errors))return issue('unsupported_progress','El avance solo cubre ciegas de los antes 1 a 8. Conserva el registro para corregirlo o detenerlo.');
    return {ok:true,value:state.observed.nextBlind.value};
  };
  const acceptBlind=(proposed:BlindInfo|undefined,expected:BlindInfo):Result<BlindInfo>=>proposed&&!sameRef(proposed,expected)?issue('wrong_blind','La ciega transcrita no coincide con la siguiente posición del ciclo.'):{ok:true,value:structuredClone(proposed??expected)};
  const tags='tag' in command?[command.tag]:('tags' in command&&command.tags?[command.tags]:[]);
  for(const fact of tags)if(fact.status==='known')for(const id of typeof fact.value==='string'?[fact.value]:fact.value)if(!tagDefinition(id))return issue('unsupported_tag','Etiqueta fuera del catálogo 1.0.1o-FULL: '+id);
  if(command.type==='observe_skip_tag'){
    if(state.phase!=='blind_select')return issue('wrong_phase','La etiqueta visible se registra en la selección de ciega.');
    const blind=requireBlind();if(!blind.ok)return blind;
    if(blind.value.kind==='boss')return issue('illegal_skip','La ciega jefe no se puede saltar.');
    const ref=command.blind??{ante:blind.value.ante,kind:blind.value.kind};
    if(ref.ante!==blind.value.ante||blind.value.kind==='big'&&ref.kind==='small')
      return issue('wrong_blind','Registra la etiqueta de la ciega actual o de la siguiente ciega visible del mismo ante.');
    const retained=(state.blindTags??[]).filter(entry=>!sameRef(entry,ref));
    state.blindTags=[...retained,{...ref,tag:structuredClone(command.tag)}];
    if(sameRef(ref,blind.value))state.phaseData.skipTag=command.tag;
  }else if(command.type==='observe_tag_queue'){
    if(state.phase==='finished'||state.phase==='unknown')return issue('wrong_phase','Ubica una partida en curso antes de registrar sus etiquetas.');
    const ctx=state.observed.jokerContext?.status==='known'?state.observed.jokerContext.value:{};
    ctx.tags=command.tags;state.observed.jokerContext=known(ctx);
  }else if(command.type==='skip_blind'){
    if(state.phase!=='blind_select')return issue('wrong_phase','Solo puedes registrar un salto desde la selección de ciega.');
    const current=requireBlind();if(!current.ok)return current;
    if(current.value.kind==='boss')return issue('illegal_skip','La ciega jefe no se puede saltar.');
    const tag=state.phaseData.skipTag;
    if(tag.status==='known'&&!tagDefinition(tag.value))return issue('unsupported_tag','Registra una etiqueta compatible o declárala desconocida antes del salto.');
    // A Boss Tag or an unobserved reward can replace the visible boss. Never retain it as current.
    if(tag.status==='unknown'||tag.value==='tag_boss')state.observed.visibleBoss=unknown('Confirma el jefe después de los efectos del salto.');
    const successor=nextBlindAfter(state,current.value)!;
    const upcoming=acceptBlind(command.nextBlind,successor);if(!upcoming.ok)return upcoming;
    if(tag.status==='known'&&tag.value==='tag_orbital')state.observed.handBases=unknown('La etiqueta orbital cambia una mano. Transcribe sus bases finales; no se calculó el incremento.');
    state.observed.nextBlind=known(upcoming.value);
    state.observed.shop=unknown('Saltar no abre una tienda; no se reutilizan ofertas.');
    state.observed.money=unknown('Transcribe el saldo observado después de todos los efectos del salto.');
    const ctx=state.observed.jokerContext?.status==='known'?state.observed.jokerContext.value:{};
    state.observed.jokerContext=known(ctx);
    const skipped=ctx.blindsSkipped;
    ctx.blindsSkipped=skipped?.status==='known'?known(skipped.value+1):unknown('No se conoce el total previo de ciegas saltadas.');
    ctx.tags=command.tags??unknown('Confirma las etiquetas pendientes después del salto; no se ejecutaron ni duplicaron sus efectos.');
    next={...state,phase:'blind_select',phaseData:{skipTag:unknown('Transcribe la etiqueta de la nueva ciega.')}};
    limitations.push('Salto declarado después de resolver sus efectos y volver a selección; no se generaron cartas, sobres, dinero ni duplicados. No equivale a una ronda ganada ni acredita que saltar fuera mejor.');
  }else if(command.type==='locate'){
    if(state.phase!=='unknown')return issue('wrong_phase','Ubicar la partida solo se aplica cuando su fase es desconocida.');
    state.observed.nextBlind=known(command.blind);state.observed.shop=unknown('La tienda actual todavía no se transcribió.');
    if(command.blind.kind==='boss')state.observed.visibleBoss=known(command.blind);
    else if(state.observed.visibleBoss.status==='known'&&state.observed.visibleBoss.value.ante!==command.blind.ante)state.observed.visibleBoss=unknown('El jefe guardado pertenece a otro ante; transcribe el actual.');
    state.observed.money=unknown('Confirma el saldo actual tras el tramo no registrado.');
    invalidateDynamic(state,'gap',limitations);
    if(command.phase==='shop')next={...state,phase:'shop',phaseData:{origin:unknown('No se registró qué ciega originó esta tienda.')}};
    else if(command.phase==='blind_select')next={...state,phase:'blind_select',phaseData:{skipTag:unknown('Etiqueta de salto no registrada.')}};
    else next={...state,phase:'in_round',phaseData:{blind:known({ante:command.blind.ante,kind:command.blind.kind}),handsRemaining:unknown('No se registraron las manos restantes.'),discardsRemaining:unknown('No se registraron los descartes restantes.'),score:unknown('No se registró la puntuación actual.'),heldCardIds:unknown('No se transcribieron las cartas en mano.')}};
  }else if(command.type==='enter_round'){
    if(state.phase!=='blind_select')return issue('wrong_phase','Solo puedes entrar en una ronda desde la selección de ciega.');
    const current=requireBlind();if(!current.ok)return current;const blind=acceptBlind(command.blind,current.value);if(!blind.ok)return blind;
    state.observed.nextBlind=known(blind.value);state.observed.shop=unknown('La tienda anterior ya no está abierta.');
    invalidateDynamic(state,'selection',limitations);
    next={...state,phase:'in_round',phaseData:{blind:known({ante:blind.value.ante,kind:blind.value.kind}),handsRemaining:unknown('Confirma los recursos tras seleccionar la ciega; sus efectos no se simularon.'),discardsRemaining:unknown('Confirma los recursos tras seleccionar la ciega; sus efectos no se simularon.'),score:unknown('Puntuación actual todavía no registrada.'),heldCardIds:unknown('No se transcribieron cartas en mano.')}};
  }else if(command.type==='report_result'){
    if(state.phase!=='in_round')return issue('wrong_phase','Registra el resultado desde una ronda en curso.');
    const blind=requireBlind();if(!blind.ok)return blind;
    state.observed.money=unknown('El saldo pudo cambiar durante la ronda. Se confirmará al cobrar o con una transcripción observada.');
    state.observed.shop=unknown('La siguiente tienda todavía no fue observada.');
    invalidateDynamic(state,'round',limitations);
    if(command.score!==undefined&&command.handsUsed!==undefined&&command.discardsUsed!==undefined&&blind.value.target.status==='known'){
      state.recentRounds=[...(state.recentRounds??[]),{blind:{ante:blind.value.ante,kind:blind.value.kind},target:blind.value.target.value,score:command.score,handsUsed:command.handsUsed,discardsUsed:command.discardsUsed,inventoryRevision:state.revision}].slice(-100);
    }
    if(command.outcome==='won'){
      state.observed.lastCleared=known({ante:blind.value.ante,kind:blind.value.kind});
      if(blind.value.ante===8&&blind.value.kind==='boss')next={...state,phase:'finished',phaseData:{outcome:'won',reason:known('El usuario confirmó la victoria contra el jefe del ante 8.')}};
      else next={...state,phase:'cashout',phaseData:{blind:known({ante:blind.value.ante,kind:blind.value.kind}),amount:unknown('No se calcula el cobro a partir del resumen; registra el saldo final observado.')}};
    }else next={...state,phase:'finished',phaseData:{outcome:'lost',reason:known('El usuario confirmó que perdió la ronda. No se concedió premio.')}};
  }else if(command.type==='collect_cashout'){
    const result=enterShopAfterCashout(state,command.nextBlind,limitations);if(!result.ok)return result;next=result.value;
  }else if(command.type==='leave_shop'){
    if(state.phase!=='shop')return issue('wrong_phase','Solo puedes salir de una tienda abierta.');
    const upcoming=requireBlind();if(!upcoming.ok)return upcoming;const accepted=acceptBlind(command.nextBlind,upcoming.value);if(!accepted.ok)return accepted;
    state.observed.nextBlind=known(accepted.value);state.observed.shop=unknown('La tienda se cerró; sus ofertas anteriores no siguen disponibles.');
    invalidateDynamic(state,'shop',limitations);
    next={...state,phase:'blind_select',phaseData:{skipTag:unknown('Etiqueta de salto no registrada.')}};
  }else{
    if(state.phase==='finished')return issue('wrong_phase','La partida ya está finalizada.');
    next={...state,phase:'finished',phaseData:{outcome:'stopped',reason:known(command.reason)}};
    next.observed.shop=unknown('La partida fue detenida.');
  }
  const skipContext=command.type==='skip_blind'&&next.observed.jokerContext?.status==='known'?structuredClone({blindsSkipped:next.observed.jokerContext.value.blindsSkipped,tags:next.observed.jokerContext.value.tags}):undefined;
  applyInventory(next,options.inventory);
  if(command.type==='observe_tag_queue'){
    const ctx=next.observed.jokerContext?.status==='known'?next.observed.jokerContext.value:{};
    ctx.tags=command.tags;next.observed.jokerContext=known(ctx);
  }
  if(command.type==='skip_blind'){
    const ctx=next.observed.jokerContext?.status==='known'?next.observed.jokerContext.value:{};
    Object.assign(ctx,skipContext);next.observed.jokerContext=known(ctx);
  }
  // A patch is an explicit final observation; an "unchanged" declaration cannot undo an Orbital invalidation.
  // The final balance is an observation, not an increment or projected payout.
  if(command.type==='collect_cashout'||(command.type==='locate'||command.type==='skip_blind')&&command.money!==undefined)next.observed.money=known(command.money!);
  // A saved reward belongs to its own selection, never to the preceding blind.
  // This restores observations only; it does not acquire or execute a tag.
  if((command.type==='skip_blind'||command.type==='leave_shop')&&next.phase==='blind_select'&&next.observed.nextBlind.status==='known'){
    const ref=next.observed.nextBlind.value;
    const observed=next.blindTags?.find(entry=>sameRef(entry,ref));
    if(observed)next.phaseData.skipTag=structuredClone(observed.tag);
  }
  next.revision=state.revision+1;next.updatedAt=options.updatedAt;
  const validated=validateCurrentState(next);if(!validated.ok)return validated;
  trace.push({ruleId:'run.observed',label:'Avance confirmado por el usuario',values:{command:command.type,from:loaded.value.phase,to:next.phase,revision:next.revision}});
  if(command.type==='collect_cashout')trace.push({ruleId:'run.observed.balance',label:'Saldo final transcrito; no se sumó un cobro estimado',values:{money:command.money}});
  return {ok:true,value:{state:validated.value,trace,limitations}};
}

/** One observed payout, one revision. Internal transitions never persist separately. */
function recordObservedCashout(state:GameStateV02,command:RecordCashoutCommand,options:ProgressOptions):Result<ProgressResult>{
  if(state.phase!=='in_round'&&state.phase!=='cashout')return issue('wrong_phase','Registra el cobro desde una ciega en curso o su pantalla de cobro.');
  const previousMoney=state.observed.money;
  let finalMoney:Fact<number>;
  if(command.money!==undefined)finalMoney=known(command.money);
  else if(previousMoney.status==='known'){
    const total=previousMoney.value+command.amount;
    if(!Number.isSafeInteger(total))return issue('numeric_range','El saldo registrado más el cobro supera el rango de enteros seguros.','$command.amount');
    // The admitted manual source describes the player's inputs. This is a
    // literal addition to the recorded balance, not evidence of other income
    // or money changes that may have happened during the unrecorded round.
    finalMoney=known(total);
  }else finalMoney=structuredClone(previousMoney);
  const original=state.observed.jokers,seen=new Set<string>();
  for(const [index,update]of command.jokerUpdates.entries()){
    const path=`$command.jokerUpdates[${index}]`;
    if(seen.has(update.instanceId))return issue('duplicate_id','Cada copia de comodín solo se actualiza una vez.',path+'.instanceId');
    seen.add(update.instanceId);
    const joker=original.status==='known'?original.value.find(j=>j.instanceId===update.instanceId):undefined;
    if(!joker)return issue('unknown_reference','La copia de comodín no existe en el inventario registrado.',path+'.instanceId');
    const specs=observationCounterSpecs(joker);
    for(const [key,value]of Object.entries(update.counters)){
      const spec=specs[key];
      if(!spec&&!Object.hasOwn(joker.counters,key))return issue('unsupported_counter','Este contador no pertenece al comodín registrado.',path+'.counters.'+key);
      if(spec&&value.status==='known'&&(value.value<spec.min||spec.max!==undefined&&value.value>spec.max))return issue('out_of_range',spec.label+': valor fuera del rango admitido.',path+'.counters.'+key);
    }
  }
  let next:GameStateV02=state;const limitations=[...observedProgressLimitations],trace:Trace[]=[];
  const advance=(command:RunProgressCommand):Result<ProgressResult>=>applyRunProgress(next,command,{expectedRevision:next.revision,updatedAt:options.updatedAt,inventory:{unchanged:true}});
  if(next.phase==='in_round'){
    const result=advance({type:'report_result',outcome:'won'});if(!result.ok)return result;
    next=result.value.state;limitations.push(...result.value.limitations);
  }
  if(next.phase==='cashout'){
    next.phaseData.amount=known(command.amount);
    const result=enterShopAfterCashout(next,command.nextBlind,limitations);if(!result.ok)return result;next=result.value;
  }else{
    if(command.nextBlind)return issue('finished_run','El jefe del ante 8 termina el recorrido; no se registra una siguiente tienda.');
  }
  applyInventory(next,options.inventory);
  // An explicit final balance wins; otherwise use only the recorded baseline
  // captured before round invalidation. An unknown baseline never becomes zero.
  next.observed.money=finalMoney;
  for(const update of command.jokerUpdates){
    const inventory=next.observed.jokers;
    if(inventory.status!=='known')return issue('missing_inventory','Confirma el inventario actual antes de actualizar sus comodines.');
    const index=inventory.value.findIndex(j=>j.instanceId===update.instanceId);
    if(index<0)return issue('unknown_reference','La copia de comodín ya no existe en el inventario final.');
    if(update.removed){inventory.value.splice(index,1);continue;}
    const joker=inventory.value[index]!;
    for(const [key,value]of Object.entries(update.counters))joker.counters[key]=structuredClone(value);
    if(update.sellValue)joker.sellValue=structuredClone(update.sellValue);
  }
  next.revision=state.revision+1;next.updatedAt=options.updatedAt;
  const validated=validateCurrentState(next);if(!validated.ok)return validated;
  trace.push({ruleId:'run.observed',label:'Resultado y cobro confirmados por el usuario',values:{command:command.type,from:state.phase,to:next.phase,revision:next.revision}});
  if(command.money!==undefined)trace.push({ruleId:'run.observed.balance',label:'Saldo final transcrito; el cobro no se sumó al saldo anterior',values:{method:'observed_balance',money:command.money,amount:command.amount}});
  else if(previousMoney.status==='known'&&finalMoney.status==='known'){
    trace.push({ruleId:'run.observed.balance',label:'Saldo derivado: saldo previo registrado más el cobro indicado',values:{method:'recorded_balance_plus_amount',balanceBefore:previousMoney.value,amount:command.amount,money:finalMoney.value}});
    limitations.push('El saldo suma literalmente el cobro indicado al saldo previo registrado; no acredita otros ingresos o gastos no transcritos durante la ronda.');
  }else trace.push({ruleId:'run.observed.balance',label:'Saldo previo desconocido; el cobro indicado no permite reconstruir el saldo final',values:{method:'unknown_previous_balance',amount:command.amount}});
  if(command.jokerUpdates.length)trace.push({ruleId:'run.observed.jokers',label:'Cambios de comodines observados por copia después de la ronda',values:{instances:command.jokerUpdates.length}});
  return {ok:true,value:{state:validated.value,trace,limitations:[...new Set(limitations)]}};
}
