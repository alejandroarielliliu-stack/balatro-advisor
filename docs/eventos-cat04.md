# Eventos registrados para los comodines CAT04

`applyGameEvent` mantiene la misma separación que H2/T09b: recibe una instantánea y devuelve otra **proyectada**, sin cambiar la original ni guardar nada. Para registrar una acción real, la confirmación debe utilizar el resultado mediante el almacenamiento atómico del registro. Un análisis o candidato nunca llama a guardar por su cuenta.

Implementación: `src/rules/full-events.ts`. Contrato: `GameEvent`, `ConsumableCorrection`, `GameEventChange`. Las reglas mantienen evidencia provisional y el modo estricto conserva la abstención cuando se requiere observación en juego. Fuente y resultados independientes: [CAT04](evidencia/cat04-generation.md).

## Eventos

| `type` | Datos mínimos | Actualización |
|---|---|---|
| `reroll` | Coste pagado y gratis actuales en `jokerContext`; `newShop` opcional | Cobra el coste, consume gratis o sube siguiente coste; Flash crece. Si no se registra nueva tienda, `shop` pasa a desconocido: las ofertas anteriores no se reutilizan |
| `skip_pack` | `packId` | Red Card +3 Mult. No inventa reembolso ni precio de compra |
| `open_pack` | `packId`, rama/resultados de Hallucination cuando se activa | Aplica Hallucination con capacidad y Oops; la compra previa y contenido del sobre requieren datos independientes |
| `use_consumable` | `instanceId`, objetivos cuando corresponda; corrección propia para Tarot/Spectral | Retira una instancia poseída; actualiza historial Tarot/Planet, Constellation y efectos de comodines. Planet mejora su mano canónica |
| `sell_consumable` | `instanceId` | Añade venta observada, retira consumible y crece Campfire. Conserva beneficios de Gift Card registrados en su valor de venta |
| `end_shop` | Resultados explícitos de Perkeo si se activa | Crea copia Negative de un consumible poseído |
| `add_cards` | Cartas completas con IDs nuevos, `basis` | Añade cartas observadas y dispara Hologram |
| `destroy_cards` | `cardIds`, `basis`, `shatteredIds` si se rompió Glass | Retira cartas, Canio/Glass crecen cuando corresponde; invalida escenarios que referían cartas desaparecidas |

Cada mutación exige `{ expectedRevision, updatedAt }`. Una revisión obsoleta, un timestamp inválido, una acción incompatible, un resultado que falta o una corrección incompleta producen error y ningún nuevo estado. El identificador de confirmación y los fallos de persistencia siguen siendo responsabilidad del registro T09b, no de esta función pura.

## Efecto propio de consumibles

Se implementa la relación canónica de los 12 Planet con sus manos y se reutiliza `levelUp`, la misma progresión utilizada por Space/Burnt. Una instancia Mercury marcada como `handId: 'high_card'` se rechaza por inconsistencia. Satellite cuenta identidades Planet distintas, no el número total de usos.

Esta tarea implementa efectos de comodines. Para Tarot/Spectral, el propio efecto de la carta requiere una **corrección explícita de datos finales observados**. Ejemplo: Hermit necesita `correction.money`; Moon necesita `correction.cards`; Ankh necesita `correction.jokers`; Immolate necesita `cards` y `money`; Ouija necesita `cards` y `resources`. El campo `basis` explica de dónde salió el dato.

Si esa corrección no está completa, la operación devuelve `needs_consumable_effect` o `incomplete_consumable_effect`: no consume la carta, no cuenta su uso y no guarda un éxito parcial. La corrección permite aportar el cambio ocurrido en el juego; el resultado informa que el motor no verifica por sí solo todos los pasos del efecto Tarot/Spectral.

Corrección admitida:

```ts
interface ConsumableCorrection {
  basis: string;
  money?: number;
  cards?: Card[];             // mazo completo final, no solo cartas objetivo
  jokers?: JokerInstance[];   // inventario completo final
  handBases?: /* valor conocido de observed.handBases */;
  consumables?: Consumable[]; // inventario final sin la instancia usada
  resources?: Partial<Record<
    'handsPerRound' | 'discardsPerRound' | 'handSize' | 'jokerSlots', number
  >>;
}
```

No admite reemplazar revisiones, versión o cualquier campo arbitrario. Los IDs retirados invalidan sus pruebas/planes completos; el motor no reescribe silenciosamente una secuencia para que vuelva a resultar legal. Los cambios de recursos externos pueden necesitar cobertura de reglas adicional para volver a analizar el estado, aunque la corrección estructural se pueda guardar.

## Ejemplo ejecutable del API

Después de `npm run build`, en PowerShell desde `balatro-advisor`:

```powershell
@'
import fs from 'node:fs';
import {applyGameEvent} from './dist/src/rules/full-events.js';
const state = JSON.parse(fs.readFileSync('examples/shop-purchase.json', 'utf8'));
const known = value => ({status:'known', value, source:'manual'});
// Datos sintéticos explícitos para esta demostración.
state.observed.jokerContext = known({
  consumables: known([{instanceId:'mercury-1', catalogId:'c_mercury',
    kind:'planet', edition:'base', sellValue:1}]),
  consumableSlots: known(2), planetsUsed: known([]), tarotsUsed: known(0)
});
const before = JSON.stringify(state);
const result = applyGameEvent(state,
  {type:'use_consumable', instanceId:'mercury-1'},
  {expectedRevision:state.revision, updatedAt:'2026-10-12T20:00:00Z'});
console.log(JSON.stringify(result, null, 2));
console.log('Original conservado:', before === JSON.stringify(state));
'@ | node --input-type=module
```

Resultado esperado independiente: Mercury usado y retirado; Pair pasa del nivel 1, 10 fichas/2 Mult, al nivel 2, 25/3; revisión +1; instantánea original conservada. El ejemplo no guarda una partida real.

Pruebas: `npm run build` y `node --test dist/tests/full-events.test.js`. Incluyen conservación del input, legalidad, escenarios invalidados, ramas explícitas, falta de efecto propio, correcciones parciales, revisión obsoleta, timestamp inválido y modo estricto. Las expectativas numéricas vienen de `game.lua`/`card.lua`, no de otra ejecución del API.
