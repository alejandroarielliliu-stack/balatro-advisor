import {simpleJoker} from '../catalog/simple-jokers.js';
import {cardMatches,mainBonus,simpleRule} from './simple-jokers.js';
import {finalScoringFactors} from './scoring.js';
import { HAND_BASES, possibleHandIds, SCORING_EFFECTS as FX, cardChips } from '../catalog/initial.js';
import type { EngineOptions } from './core.js';
import { blindInfo, deckCards, fail, greenValue, inventory, need, resources, run, safe, stateInput } from './core.js';

export interface BoundTerm { ruleId: string; label: string; chips: number; mult: number; premise: string }
export interface RoundUpperBound {
  method: 'round-bound-1'; inputRevision: number; horizonRounds: 1;
  target: number; hands: number; chipsPerHandUpper: number; multPerHandUpper: number;
  scorePerHandUpper: number; roundScoreUpper: number;
  verdict: 'insufficient_under_model' | 'not_ruled_out';
  terms: BoundTerm[]; assumptions: string[]; conclusion: string;
}

/** Upper bound over all legal plays, not an achievable score or a draw forecast.
 * Relaxing joint feasibility, depletion and discards can only increase this bound
 * for the closed, nonnegative catalogue. Integer XMult is bounded after all additions; no retriggers.
 */
export function boundRoundScore(input: unknown, options: EngineOptions = {}) {
  return run<RoundUpperBound>(['base.configuration','score.base','hand.classification','blind.effects','round.resources'], options, (trace,use) => {
    const state=stateInput(input,use), cards=deckCards(state), jokers=inventory(state);
    if(cards.some(c=>c.enhancement!=='none'))fail('$.observed.deck','unsupported_bound','No hay una cota demostrada para cartas mejoradas; usa un escenario explícito.');
    const r=resources(state), blind=blindInfo(state);
    const bases=need(state.observed.handBases,'$.observed.handBases');
    let chipsBase=0, multBase=0;
    if ('preset' in bases) {
      if (bases.preset!=='all-standard-level1') fail('$.observed.handBases','unsupported_preset','Preset de manos no implementado.');
      chipsBase=Math.max(...possibleHandIds(cards).map(h=>HAND_BASES[h][0]));
      multBase=Math.max(...possibleHandIds(cards).map(h=>HAND_BASES[h][1]));
    } else {
      for (const hand of possibleHandIds(cards)) {
        const fact=bases.values[hand];if(!fact)fail('$.observed.handBases.values.'+hand,'unknown_data','Falta una base especial posible con esta composición.');
        const b=need(fact,'$.observed.handBases.values.'+hand);
        if (b.level<1 || b.chips<1 || b.mult<1) fail('$.observed.handBases','invalid_base','Todas las bases deben ser positivas y conocidas para demostrar una cota global.');
        chipsBase=Math.max(chipsBase,b.chips);multBase=Math.max(multBase,b.mult);
      }
    }
    const terms:BoundTerm[]=[];
    const add=(ruleId:string,label:string,chips:number,mult:number,premise:string)=>{
      use(ruleId);safe(chips);safe(mult);terms.push({ruleId,label,chips,mult,premise});
      trace.push({ruleId,label,values:{chipsUpper:chips,multUpper:mult,premise}});
    };
    add('score.base','Bases máximas independientes',chipsBase,multBase,'Máximos sobre las bases posibles conocidas; no exige que pertenezcan a la misma categoría.');
    add('score.base','Fichas de cartas',5*Math.max(...cards.map(cardChips)),0,'Como máximo cinco cartas puntuadas por mano, cada una acotada por el máximo del mazo. Se permite repetir ese máximo para sobreestimar.');
    let xmultUpper=1;
    for (const j of jokers) {
      const simple=simpleJoker(j.catalogId);
      if(simple){
        use(simpleRule);
        if(simple.stage==='card'){const n=Math.min(5,cards.filter(c=>cardMatches(simple,c)).length);add(simpleRule,simple.name,n*simple.chips,n*simple.mult,'Hasta cinco cartas elegibles; no supone que se puedan combinar todos los máximos.');}
        if(simple.stage==='main'){const fx=mainBonus(simple,state,j.instanceId,[],[],0,true);add(simpleRule,simple.name,fx.chips,fx.mult,'Condición activada como relajación de la cota.');xmultUpper=safe(xmultUpper*fx.xmult);}
        continue;
      }
      switch (j.catalogId) {
        case 'joker': add('joker.effect','Joker',0,FX.jokerMult,'Contribución constante.');break;
        case 'half_joker': add('half_joker.effect','Half Joker',0,blind.boss==='the_psychic'?0:FX.halfMult,'Se permite activarlo junto a máximos incompatibles; Psychic exige cinco cartas y elimina esta contribución.');break;
        case 'abstract_joker': add('abstract_joker.effect','Abstract Joker',0,FX.abstractPerJoker*jokers.length,'Inventario posterior a la acción de tienda, fijo durante la ronda.');break;
        case 'even_steven': {
          const eligible=cards.filter(c=>['2','4','6','8','10'].includes(c.rank)).length;
          add('even_steven.effect','Even Steven',0,Math.min(5,eligible)*FX.evenMult,'Hasta cinco cartas pares puntuadas por mano; se ignora su compatibilidad con otros máximos.');break;
        }
        case 'scholar': {
          const aces=Math.min(5,cards.filter(c=>c.rank==='A').length);
          add('scholar.effect','Scholar',aces*FX.scholarChips,aces*FX.scholarMult,'Como máximo cinco ases distintos disponibles en el mazo; se reutiliza ese límite en cada mano.');break;
        }
        case 'banner': add('banner.effect','Banner',FX.bannerPerDiscard*(blind.boss==='the_water'?0:r.discards),0,'Descartar no aumenta los descartes restantes; Water los fija a cero.');break;
        case 'green_joker':
          use('green.changes');
          add('green.timing','Green Joker',0,safe(greenValue(j)+r.hands*FX.greenPerPlay),'Contador inicial + un incremento por mano disponible. Ignorar decrecimientos por descarte y usar el contador final en cada mano sobreestima.');break;
        case 'golden_joker': add('golden_joker.effect','Golden Joker',0,0,'No aporta puntos; no se proyectan ingresos ni rondas posteriores.');break;
        default: fail('$.observed.jokers','unsupported_joker','No hay demostración para este efecto.');
      }
    }
    let chips=safe(terms.reduce((sum,t)=>safe(sum+t.chips),0));
    let mult=safe(terms.reduce((sum,t)=>safe(sum+t.mult),0));
    mult=safe(mult*xmultUpper);
    if(xmultUpper>1)trace.push({ruleId:simpleRule,label:'Cota: multiplicadores después de todos los sumandos positivos',values:{xmultUpper,multUpper:mult}});
    ({chips,mult}=finalScoringFactors(state,chips,mult,trace,use));
    const perHand=safe(chips*mult), total=safe(r.hands*perHand);
    trace.push({ruleId:'score.base',label:'Cota de ronda: manos × fichas máximas × Mult máximo',values:{hands:r.hands,chips,mult,perHand,total,target:blind.target}});
    return {
      method:'round-bound-1',inputRevision:state.revision,horizonRounds:1,target:blind.target,hands:r.hands,
      chipsPerHandUpper:chips,multPerHandUpper:mult,scorePerHandUpper:perHand,roundScoreUpper:total,
      verdict:total<blind.target?'insufficient_under_model':'not_ruled_out',terms,
      assumptions:[
        'Estado completo y exacto dentro del contrato de la baraja seleccionada / White y mazo actual confirmado; ausencia de efectos externos.',
        'Inventario fijo desde el inicio de la próxima ronda, sin consumibles ni cambios de bases o mazo.',
        'Se sobreestiman manos y activaciones: no se exige robo favorable, coexistencia de máximos ni disponibilidad repetida de cartas.',
        'Reglas provisionales: el certificado matemático se refiere a este modelo, no garantiza concordancia con toda partida real.',
        'Una sola ronda hasta ante 8; ninguna proyección de ingresos posteriores.'
      ],
      conclusion:total<blind.target
        ? `Incluso la cota ${total} es menor que ${blind.target}: el inventario fijo es insuficiente bajo estas premisas y reglas del modelo.`
        : `La cota ${total} no descarta alcanzar ${blind.target}. No demuestra una jugada ganadora, supervivencia ni probabilidad.`
    };
  });
}
