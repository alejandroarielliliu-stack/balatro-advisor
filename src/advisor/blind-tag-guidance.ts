import {bossDefinition} from '../catalog/bosses.js';
import {HAND_BASES} from '../catalog/initial.js';
import {TAG_EFFECTS} from '../catalog/tag-effects.js';
import {tagDefinition} from '../catalog/tags.js';
import type {TagId} from '../catalog/tags.js';
import type {Fact,GameStateV02} from '../state/model.js';

/** v0.11: these recommendations depend only on the recorded tag's identity. */
export const AUTO_PLAY_BLIND_TAGS: ReadonlySet<TagId> = new Set<TagId>([
  'tag_uncommon', 'tag_meteor', 'tag_skip', 'tag_standard', 'tag_double', 'tag_garbage'
]);

export function isAutomaticPlayTag(tagId: string | null): boolean {
  const tag = tagId === null ? undefined : tagDefinition(tagId);
  return tag !== undefined && AUTO_PLAY_BLIND_TAGS.has(tag.id);
}

export interface BlindTagAssessment {
  reason: string;
  conditions: string[];
  /** The reward itself cannot contribute in this case. Composition and queue are checked by the caller. */
  preferPlay: boolean;
}

const value = <T>(fact: Fact<T> | undefined): T | null => fact?.status === 'known' ? fact.value : null;
const handIds = Object.keys(HAND_BASES);
const shopTags: ReadonlySet<TagId> = new Set<TagId>([
  'tag_rare', 'tag_negative', 'tag_foil', 'tag_holo', 'tag_polychrome',
  'tag_voucher', 'tag_coupon', 'tag_d_six'
]);

const compare = (reason: string, ...conditions: string[]): BlindTagAssessment =>
  ({reason, conditions, preferPlay: false});
const play = (reason: string, ...conditions: string[]): BlindTagAssessment =>
  ({reason, conditions, preferPlay: true});

function recordedHandsPlayed(state: GameStateV02): number | null {
  const counts = value(state.observed.jokerContext)?.handCounts;
  if (!counts) return null;
  const total = handIds.reduce<number | null>((sum, id) => {
    const count = value(counts[id]);
    return sum === null || count === null ? null : sum + count;
  }, 0);
  return total !== null && Number.isSafeInteger(total) ? total : null;
}

/** Compare the observed reward with the lost round. Future shops, pack contents and
 * candidate Jokers remain unknown. An assessment neither executes effects nor picks a skip. */
export function assessBlindTag(state: GameStateV02, tagId: string): BlindTagAssessment | null {
  const tag = tagDefinition(tagId);
  const blind = value(state.observed.nextBlind);
  if (!tag || state.phase !== 'blind_select' || !blind || blind.kind === 'boss' || AUTO_PLAY_BLIND_TAGS.has(tag.id)) return null;

  if (blind.ante === 8 && blind.kind === 'big') {
    if (shopTags.has(tag.id)) {
      return play('La etiqueta afecta una tienda posterior al jefe final; no puede ayudarte a superar ese jefe.');
    }
    if (tag.id === TAG_EFFECTS.investment.id) {
      return play(`Los $${TAG_EFFECTS.investment.dollars} de Inversión se cobran después de vencer al jefe final.`);
    }
  }

  const jokers = value(state.observed.jokers);
  const slots = value(state.observed.resources.jokerSlots);
  const openSlots = jokers === null || slots === null ? null : Math.max(0, slots - jokers.length);
  const room = openSlots === null
    ? 'Confirma tus espacios de comodín y qué carta podrías sustituir.'
    : openSlots === 0
      ? 'Tus espacios están llenos. Para adquirir un comodín sin edición negativa necesitas liberar un espacio.'
      : `Tienes ${openSlots} ${openSlots === 1 ? 'espacio libre' : 'espacios libres'} ahora.`;
  const money = value(state.observed.money);

  switch (tag.id) {
    case 'tag_rare':
      return compare('Puede darte un comodín raro gratuito en la próxima tienda. Valora si una oportunidad de mayor rareza cubre lo que le falta a tu composición.',
        room, 'El comodín concreto depende del grupo elegible; primero tienes que llegar a la tienda.');
    case 'tag_negative':
      return compare('El siguiente comodín básico elegible de tienda será gratuito y negativo. Puede añadir un efecto sin ocupar un espacio neto.',
        'Valora si necesitas otro efecto. La etiqueta espera un comodín elegible y su identidad aún es desconocida.');
    case 'tag_foil':
      return compare('El siguiente comodín básico elegible será gratuito y laminado (+50 fichas). Valóralo si necesitas fichas para las primeras ciegas.',
        room, 'Primero tienes que llegar a una tienda con un comodín elegible.');
    case 'tag_holo':
      return compare('El siguiente comodín básico elegible será gratuito y holográfico (+10 multi). Valóralo si necesitas multiplicador aditivo pronto.',
        room, 'La identidad del comodín y la tienda en la que aparecerá siguen siendo desconocidas.');
    case 'tag_polychrome':
      return compare('El siguiente comodín básico elegible será gratuito y polícromo (×1,5 multi). Valóralo si ya puedes formar manos que aportan fichas y multi.',
        room, 'La edición afecta un comodín elegible de una tienda posterior.');
    case 'tag_investment':
      return compare(`Inversión paga $${TAG_EFFECTS.investment.dollars} al cobrar la victoria contra el jefe. Puede financiar el siguiente ante, sobre todo al principio.`,
        'Tienes que vencer al jefe con los recursos disponibles antes del cobro.');
    case 'tag_voucher':
      return compare('Añade un vale en la próxima tienda. Valóralo si buscas una mejora permanente que podrías pagar y aprovechar antes del objetivo.',
        'El vale no es gratuito y su identidad no se conoce hasta ver las ofertas.');
    case 'tag_boss': {
      const visible = value(state.observed.visibleBoss);
      const boss = visible?.kind === 'boss' && visible.ante === blind.ante ? value(visible.bossId) : null;
      const name = boss ? bossDefinition(boss)?.name : undefined;
      return compare(name
        ? `La etiqueta cambia a ${name} por otro jefe. Valórala si su efecto bloquea tu jugada principal.`
        : 'La etiqueta cambia el jefe de este ante. Registra el jefe visible para valorar si necesitas evitarlo.',
      'El reemplazo es desconocido y también puede ser adverso.');
    }
    case 'tag_charm':
      return compare('El Mega Arcano se abre al saltar. Valóralo si los tarots pueden mejorar tu mazo, financiar compras o darte un efecto útil antes de la próxima ciega.',
        'Podrás elegir hasta dos cartas de cinco opciones; el contenido todavía es desconocido.');
    case 'tag_buffoon':
      return compare('El Mega Bufón se abre al saltar. Puede darte refuerzo antes de la próxima ciega, especialmente cuando todavía estás formando tu composición.',
        room, 'Podrás elegir hasta dos comodines de cuatro opciones; el contenido todavía es desconocido.');
    case 'tag_handy': {
      const total = recordedHandsPlayed(state);
      return total === null
        ? compare('Handy paga $1 por mano jugada durante la partida. Comprueba el importe que muestra el juego y compáralo con el cobro y la tienda que perderías.',
          'Falta parte del contador de manos. El pago es inmediato y no abre una tienda.')
        : total === 0 ? play('Handy aportaría $0 según el historial completo de manos registrado.')
          : compare(`Handy aportaría $${total} inmediatamente según el historial registrado. Valora si ese dinero compensa renunciar al cobro y la tienda.`,
            'La cifra corresponde a una sola copia de la etiqueta.');
    }
    case 'tag_ethereal':
      return compare('Abre un Sobre Espectral. Valóralo si puedes aprovechar una modificación fuerte del mazo o de la composición antes de la próxima ciega.',
        'Es una elección entre dos cartas desconocidas; algunas pueden tener costes para el mazo o el saldo.');
    case 'tag_coupon':
      return compare('Las cartas y sobres iniciales de la próxima tienda serán gratuitos. El cupón puede ser especialmente útil al principio, cuando el presupuesto es menor.',
        'Hay que llegar a esa tienda sin el refuerzo de la anterior. El cupón no cubre vales ni renovaciones.');
    case 'tag_juggle':
      return compare('Tendrás tres cartas más en la mano durante la próxima ronda. Valóralo si la dificultad está en formar tu jugada o retener cartas que dan puntuación.',
        'El aumento es temporal. Se aplica a la próxima ronda jugada.');
    case 'tag_d_six':
      return compare('D6 abarata las renovaciones de la próxima tienda. Valórala si necesitas buscar una mejora y puedes guardar dinero para comprarla.',
        'Sin otros modificadores, tres renovaciones cuestan $3 con D6 y $18 normalmente. Las cartas que saldrán siguen siendo desconocidas.');
    case 'tag_top_up':
      return openSlots === 0
        ? play('Tus espacios están llenos. Top-up no puede añadir un comodín en el estado registrado.')
        : compare(openSlots === null
          ? 'Top-up puede crear hasta dos comodines comunes antes de la próxima ciega, si tienes espacio.'
          : `Top-up aprovecharía ${Math.min(2, openSlots)} ${openSlots === 1 ? 'espacio libre' : 'espacios libres'} para crear comodines comunes antes de la próxima ciega.`,
        'El resultado es aleatorio. Valóralo si necesitas refuerzo inmediato.',
        ...(openSlots === null ? ['Confirma tus espacios e inventario de comodines.'] : []));
    case 'tag_orbital':
      return compare('Sube tres niveles la mano que figura en la etiqueta. Valórala si es una jugada que tu mazo puede formar con frecuencia o si puedes reorientar tu estrategia hacia ella.',
        'La categoría concreta de la etiqueta todavía no forma parte de los datos registrados.');
    case 'tag_economy': {
      const total = money === null ? null : Math.min(TAG_EFFECTS.economy.cap, Math.max(0, money));
      return total === null
        ? compare('Economía aporta un ingreso inmediato ligado al saldo. Registra el saldo para compararlo con el cobro de jugar.',
          'El dinero del salto no abre una tienda.')
        : total === 0 ? play('Economía aportaría $0 con el saldo registrado.')
          : compare(`Economía aportaría $${total} inmediatamente. Compáralo con el cobro al ganar y el valor de pasar por la tienda.`,
            'La cifra corresponde a una sola copia de la etiqueta.');
    }
  }
  return null;
}
