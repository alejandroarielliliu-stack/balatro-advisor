import { compareShopAlternatives } from '../evaluation/comparison.js';
import type { Alternative, Comparison } from '../evaluation/comparison.js';
import { mergeEvidence, validateRoundPlan } from '../evaluation/plan.js';
import type { RoundPlan } from '../evaluation/plan.js';
import { checkJsonValue } from '../state/schema.js';
import type { GameState, Issue, JokerInstance } from '../state/model.js';
import { fail, run, stateInput } from '../rules/core.js';
import type { EngineOptions, EngineResult, Trace } from '../rules/core.js';
import type { AnalysisGate } from '../rules/evidence.js';
import type { Mutation, ShopAction } from '../rules/shop.js';
import { POLICY, prefer } from './policy.js';
import type { Metrics, Preference } from './policy.js';

export interface AdvisorScenario { role: 'favorable'|'adverse'|'representative'; plan: RoundPlan }
export interface AdvisorOptions extends EngineOptions { actions?: ShopAction[] }
export interface ScenarioAssessment {
  scenarioId: string; metrics: Metrics | null; calculation: Alternative;
  activatedEffects: { eventIndex:number; trace:Trace[] }[];
  growth: { instanceId:string; before:unknown; after:unknown; usage:string }[];
}
export interface AdvisedAlternative {
  id:string; action:ShopAction; scenarios:ScenarioAssessment[]; tier:number|null;
  legal:boolean; complete:boolean; sacrificed:JokerInstance[]; conditions:string[]; limitations:string[];
  reachedScenarioIds:string[]; unreachedScenarioIds:string[]; incompleteScenarioIds:string[];
}
export interface Advice {
  policyVersion:string; inputRevision:number; rulesetId:string; scenarios:AdvisorScenario[];
  comparisons:EngineResult<Comparison>[]; alternatives:AdvisedAlternative[]; tiers:string[][]; preferences:Preference[];
  orderedAlternativeIds:string[];
  contextNotes:string[];
  recommendation:{ status:'conditional'|'tie'|'abstain'; action:ShopAction|null; candidates:string[]; reason:string; ruleIds:string[] };
  limitations:string[]; errors:Issue[]; exhaustive:false;
}
function key(a: ShopAction): string {
  switch(a.type) {
    case 'hold': return 'hold';
    case 'buy': return JSON.stringify(['buy',a.offerId,a.instanceId]);
    case 'sell': return JSON.stringify(['sell',a.instanceId]);
    case 'replace': return JSON.stringify(['replace',a.sellInstanceId,a.offerId,a.instanceId]);
  }
}
const conditionText:Record<string,string> = {
  half_joker:'Half depende de cuántas cartas se juegan; estos planes no prueban que se puedan encontrar manos pequeñas útiles.',
  scholar:'Scholar depende de ases que realmente puntúan. El mazo estándar compatible contiene 4 ases; esa cantidad no estima su frecuencia de robo ni la supervivencia.',
  even_steven:'Even Steven depende de rangos pares que puntúan. El mazo estándar compatible contiene 20 cartas de rango par; esa cantidad no demuestra consistencia de robo.',
  banner:'Banner depende de conservar descartes y del jefe; cambiar los descartes del plan puede cambiar el consejo.',
  green_joker:'Green depende de jugar y descartar. Su contador solo es útil si aporta Mult a manos futuras viables; no se valora solo por ser mayor.',
  golden_joker:'Golden depende de rondas ganadas y de conservarlo; el horizonte de cobro aquí es una sola ronda.',
  abstract_joker:'Abstract depende del inventario; vender cambia sus activaciones.',
  joker:'Joker aporta Mult a las manos puntuadas dentro de esta cobertura.'
};
function contextNotes(state:GameState):string[]{
  const next=state.observed.nextBlind;
  if(next.status==='known'&&next.value.kind==='boss')return [];
  const boss=state.observed.visibleBoss;
  if(boss.status==='unknown')return ['Jefe futuro no informado. Este consejo no acredita preparación para el jefe; registra sus datos y un horizonte explícito si quieres evaluarlo.'];
  const id=boss.value.bossId.status==='known'?boss.value.bossId.value:'no identificado';
  return [`Jefe visible: ${id}, ante ${boss.value.ante}. Queda fuera de estos planes de la próxima ciega: conservarlo en el registro no significa que se haya evaluado. Sus restricciones pueden cambiar el consejo; usa un horizonte explícito compatible.`];
}
function assessment(a:Alternative, scenarioId:string):ScenarioAssessment {
  const e=a.evaluation?.ok ? a.evaluation.value : null;
  const complete=e !== null && e.outcome !== 'incompatible';
  const blind=e?.round.game.observed.nextBlind;
  const target=blind?.status==='known' && blind.value.target.status==='known' ? blind.value.target.value : null;
  const js=a.shop.ok ? a.shop.value.state.observed.jokers : null;
  const final=e?.finalState.observed.jokers;
  const terminalGoal=!!(e?.settlement?.ok && e.settlement.value.goalReached);
  const persistentBenefits:string[]=[];
  if(!terminalGoal && e) {
    if(e.events.some(ev=>ev.trace.some(t=>t.ruleId==='green.timing' && Number(t.values.addMult)>0 || Number(t.values.xmult)>1 || Number(t.values.extraScored)>0))) persistentBenefits.push('green-applied');
    if(e.settlement?.ok && (e.settlement.value.cashout?.goldenIncome ?? 0)>0) persistentBenefits.push('golden-income');
  }
  const growth=js?.status==='known' ? js.value.filter(j=>j.catalogId==='green_joker').map(j=>({ instanceId:j.instanceId,
    before:structuredClone(j.counters.greenMult ?? null), after:final?.status==='known' ? structuredClone(final.value.find(f=>f.instanceId===j.instanceId)?.counters.greenMult ?? null) : null,
    usage:'Consultar las trazas green.timing de cada mano: muestran si el contador se aplicó. Sin extrapolar su utilidad a manos o rondas no descritas.' })) : [];
  return {scenarioId, calculation:a, metrics:complete && target!==null ? {scenarioId,reached:e.targetReached,score:e.score,margin:e.score-target,
    handsUsed:e.handsUsed,discardsUsed:e.discardsUsed,moneyAfterShop:a.moneyAfterShop,moneyAfterRound:a.moneyAfterRound,
    terminalGoal,persistentBenefits} : null,
    activatedEffects:e?.events.map(event=>({eventIndex:event.eventIndex, trace:event.trace.filter(t=>t.ruleId!=='score.base' && (Number(t.values.addChips)>0 || Number(t.values.addMult)>0 || Number(t.values.xmult)>1 || Number(t.values.extraScored)>0))})) ?? [], growth};
}
/** Heuristic ordering of a declared, fixed-plan comparison. No game formulas or probabilities. */
export function adviseShop(input:unknown, scenarioInput:unknown, mutation:Mutation, options:AdvisorOptions={}):EngineResult<Advice> {
  const gates:AnalysisGate[]=[];
  const result=run<Advice>([],options,()=>{
    const state=stateInput(input), jsonErrors=checkJsonValue(scenarioInput);
    if(jsonErrors.length) {const e=jsonErrors[0]!;fail(e.path,e.code,e.message);}
    if(!Array.isArray(scenarioInput) || scenarioInput.length>POLICY.maxScenarios) fail('$scenarios','invalid_scenarios',`Se requiere una lista de hasta ${POLICY.maxScenarios} escenarios.`);
    const scenarios:AdvisorScenario[]=[], ids=new Set<string>();
    for(const raw of scenarioInput) {
      if(!raw || typeof raw!=='object' || !['favorable','adverse','representative'].includes(raw.role) || Object.keys(raw).some(k=>!['role','plan'].includes(k))) fail('$scenarios','invalid_scenario','Cada escenario necesita role y plan, sin campos extra.');
      const checked=validateRoundPlan(raw.plan); if(!checked.ok){const e=checked.errors[0]!;fail(e.path,e.code,e.message);}
      if(ids.has(checked.value.planId)) fail('$scenarios','duplicate_scenario','Los IDs de escenario deben ser distintos; no se cuentan repeticiones como evidencia adicional.');
      ids.add(checked.value.planId); scenarios.push({role:raw.role,plan:checked.value});
    }
    const comparisons=scenarios.map(s=>compareShopAlternatives(state,s.plan,mutation,options));
    for(const c of comparisons) gates.push(c.evidence);
    const errors:Issue[]=comparisons.flatMap(c=>c.ok ? c.value.enumerationErrors : c.errors);
    const first=comparisons.find(c=>c.ok);
    let rawAlternatives=first?.ok ? first.value.alternatives : [];
    if(options.actions!==undefined) {
      if(checkJsonValue(options.actions).length || !Array.isArray(options.actions) || !options.actions.length) fail('$actions','invalid_actions','Indica una lista no vacía de acciones devueltas por T07b.');
      const available=new Map(rawAlternatives.map(a=>[key(a.action),a.action])); const selected=new Set<string>();
      for(const a of options.actions) {
        if(!a || typeof a!=='object' || !['hold','buy','replace','sell'].includes(a.type)) fail('$actions','invalid_actions','Acción fuera de la cobertura T07b.');
        const k=key(a), found=available.get(k);
        if(!found || Object.keys(a).length!==Object.keys(found).length || selected.has(k)) fail('$actions','invalid_actions','Acción ausente, duplicada o no idéntica a un candidato T07b.');
        selected.add(k);
      }
      rawAlternatives=rawAlternatives.filter(a=>selected.has(key(a.action)));
    }
    const original=state.observed.jokers;
    const alternatives:AdvisedAlternative[]=rawAlternatives.map(a=>{
      const cells=comparisons.flatMap((c,i)=>{
        const branch=c.ok ? c.value.alternatives.find(b=>key(b.action)===key(a.action)) : undefined;
        return branch ? [assessment(branch,scenarios[i]!.plan.planId)] : [];
      });
      const after=a.shop.ok ? a.shop.value.state.observed.jokers : null;
      const soldId=a.action.type==='replace' ? a.action.sellInstanceId : a.action.type==='sell' ? a.action.instanceId : null;
      const sacrificed=original.status==='known' ? original.value.filter(j=>j.instanceId===soldId) : [];
      const limitations=cells.flatMap(c=>{
        const e=c.calculation.evaluation;
        return [...(!c.calculation.shop.ok ? c.calculation.shop.errors.map(x=>x.message) : []),
          ...(e && !e.ok ? e.errors.map(x=>x.message) : e?.ok ? [...e.value.errors.map(x=>x.message),...(e.value.economicLimitation ? [e.value.economicLimitation] : [])] : [])];
      });
      if(sacrificed.length) limitations.push(`Vender elimina ${sacrificed.map(j=>j.catalogId).join(', ')} y sus contadores. No se transfiere crecimiento ni se valoran beneficios de futuras rondas no modeladas.`);
      return {id:a.id,action:a.action,scenarios:cells,tier:null,legal:cells.every(c=>c.calculation.shop.ok),
        reachedScenarioIds:cells.filter(c=>c.metrics?.reached).map(c=>c.scenarioId),
        unreachedScenarioIds:cells.filter(c=>c.metrics && !c.metrics.reached).map(c=>c.scenarioId),
        incompleteScenarioIds:cells.filter(c=>!c.metrics).map(c=>c.scenarioId),
        complete:cells.length===scenarios.length && cells.every(c=>c.metrics!==null), sacrificed:structuredClone(sacrificed),
        conditions:after?.status==='known' ? after.value.map(j=>conditionText[j.catalogId] ?? 'Efecto fuera de cobertura.') : [], limitations};
    });
    const eligible=alternatives.filter(a=>a.legal && a.complete);
    const preferences:Preference[]=[];
    for(const a of eligible) for(const b of eligible) if(a!==b) {
      const reason=prefer(a.scenarios.map(s=>s.metrics!),b.scenarios.map(s=>s.metrics!));
      if(reason) preferences.push({preferred:a.id,over:b.id,...reason});
    }
    const tiers:string[][]=[]; let remaining=eligible.map(a=>a.id);
    while(remaining.length) {
      const front=remaining.filter(id=>!preferences.some(p=>p.over===id && remaining.includes(p.preferred)));
      if(!front.length) fail('$policy','policy_cycle','Las prioridades producen un ciclo; no emitir consejo.');
      tiers.push(front); for(const a of alternatives) if(front.includes(a.id)) a.tier=tiers.length;
      remaining=remaining.filter(id=>!front.includes(id));
    }
    const uncertain=alternatives.some(a=>a.legal && !a.complete || a.scenarios.some(s=>!s.calculation.shop.ok && s.calculation.shop.errors.some(e=>e.code==='unknown_data' || e.code==='pending_rule')));
    const top=tiers[0] ?? [];
    const hasCoverage=eligible.some(a=>a.scenarios.some(s=>s.metrics!.reached));
    const blocked=errors.length>0 || uncertain || !scenarios.length || !hasCoverage;
    const recommendation:Advice['recommendation']=blocked ? {status:'abstain',action:null,candidates:top,ruleIds:[POLICY.incomplete],
      reason:!scenarios.length ? 'No hay escenarios para valorar supervivencia.' : !hasCoverage ? 'Ninguna alternativa evaluable supera un escenario aportado; no se infiere que la partida sea imposible.' : 'Hay alternativas o escenarios sin evaluación comparable; no se convierte una rama conocida en mejor opción por falta de datos de las demás.'}
      : top.length===1 ? {status:'conditional',action:alternatives.find(a=>a.id===top[0])!.action,candidates:top,
        ruleIds:[...new Set(preferences.filter(p=>p.preferred===top[0]).map(p=>p.ruleId))], reason:'Preferencia heurística solo entre las alternativas y planes declarados. Revisar costes, efectos sacrificados y condiciones; no demuestra preparación para toda la partida.'}
      : {status:'tie',action:null,candidates:top,ruleIds:[],reason:'Sin preferencia única: empate o compromisos entre escenarios, recursos y economía. No se suman sus unidades ni se ponderan como probabilidades.'};
    const context=contextNotes(state);
    const limitations=[...context,
      'Planes fijos, sin adaptar la estrategia de juego a cada compra. No predicen robos ni demuestran consistencia del mazo.',
      'Un escenario favorable no acredita supervivencia; varios escenarios no forman una distribución de probabilidades.',
      'Horizonte: próxima ciega descrita; sin valoración validada de ganar la partida completa, futuros jefes, ofertas ni crecimiento posterior.',
      'Reglas H2 provisionales sustentadas en inspección estática; no observadas en partida. Modo estricto conservado.',
      'Búsqueda T07b limitada: conservar, una compra, un reemplazo o una venta individual. No incluye varias compras/ventas ni reordenación.'
    ];
    if(alternatives.some(a=>a.scenarios.some(s=>s.metrics?.persistentBenefits.length))) limitations.push('H-PERSISTENCE: a igual cobertura no se prefiere perder Green aplicado o ingreso Golden demostrado solo por dinero/recursos; se deja el compromiso abierto, sin poner precio al crecimiento futuro.');
    if(options.actions) limitations.push('La lista de acciones fue restringida por el llamador; la preferencia solo cubre ese subconjunto.');
    if(!scenarios.some(s=>s.role==='adverse')) limitations.push('No se aportó un escenario etiquetado adverso; no se conoce la sensibilidad fuera de los planes presentes.');
    return {policyVersion:POLICY.version,inputRevision:state.revision,rulesetId:state.rulesetId,scenarios,comparisons,alternatives,tiers,
        orderedAlternativeIds:[...tiers.flat(),...alternatives.filter(a=>a.tier===null).map(a=>a.id)],contextNotes:context,preferences,recommendation,limitations,errors,exhaustive:false};
  });
  result.evidence=mergeEvidence([result.evidence,...gates]); return result;
}
