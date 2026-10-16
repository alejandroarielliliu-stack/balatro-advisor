# Modelo de estado v0.1

**T09b, 2026-10-10:** GameState 0.1 no cambia. Un documento separado confirmed-1 contiene partida e historial de acciones realizadas, migrado explícitamente desde H1. [Contrato, separación de hipótesis y correcciones](confirmaciones-t09b.md). Tras adoptar ese documento, su state es la fuente de verdad; el guardado H1 anterior queda como respaldo.

Actualización: 2026-10-09. Implementado en [model.ts](../src/state/model.ts), [schema.ts](../src/state/schema.ts) y [validation.ts](../src/state/validation.ts). Alcance de producto: [especificación](especificacion-v0.1.md); reglas separadas: [catálogo y evidencia](reglas-y-fuentes.md). H1 no depende de confirmar versión, intereses ni Green.

**H2:** este esquema y su persistencia no cambiaron. El motor ya implementa validación semántica del alcance, acciones, puntuación y eventos en módulos separados; el texto que los describe como posteriores a H1 se concreta ahora en [motor-h2.md](motor-h2.md). El ejemplo histórico 1.0.1f sigue siendo guardable, pero el motor activo requiere contrato 1.0.1o explícito. RoundState es una proyección efímera, no un campo nuevo del JSON. Las salidas proyectadas no son nuevas observaciones por el hecho de tener forma GameState.

## Datos conocidos, desconocidos e hipotéticos

T07b incorpora un contrato de escenario separado, `scenario-1`, con procedencia por carta y robos condicionales. [Campos, ejemplo y resultados](comparacion-t07b.md). No migra ni interpreta automáticamente los roundPlans históricos de H1; guardar/cargar el estado sigue conservándolos tal cual. Este nuevo escenario y sus resultados no se guardan automáticamente como observaciones de partida.

`Fact<T>` tiene exactamente una forma:

```ts
type Fact<T> =
  | { status: 'known'; value: T; source: 'manual' | 'confirmedPreset' }
  | { status: 'unknown'; reason: string };
```

Ausencia de dato no equivale a cero, false o lista vacía. `confirmedPreset` registra confirmación de entrada del usuario, no observación de una regla por el equipo. `createDraft(runId, updatedAt)` crea campos desconocidos y ruleset `unselected`, sin seleccionar build ni aplicar recursos del juego. El llamante suministra identidad y fecha, y valida antes de guardar.

`observed` conserva la instantánea; `assumptions` contiene manos y planes hipotéticos. Los resultados derivados no se guardan como hechos ni se aceptan como campos extra. `recentRounds` es contexto histórico opcional; no implica una distribución de probabilidades.

## Contrato estructural implementado

Todos los números son enteros seguros. No hay coerción de texto a número. Los objetos exigen sus campos requeridos y rechazan campos desconocidos para evitar pérdida silenciosa al importar.

| Campo | Tipo / validación H1 |
| --- | --- |
| schemaVersion | Literal "0.1"; otra versión se rechaza sin migración automática. |
| rulesetId, runId | Texto no vacío; ruleset no necesita existir para poder guardar. |
| revision | Entero ≥0; guardar conserva su valor, no incrementa automáticamente. |
| updatedAt | Fecha UTC real YYYY-MM-DDTHH:mm:ssZ o con tres cifras de milisegundos. |
| phase | shop o draft. No es prueba de que el análisis esté disponible. |
| observed.gameVersion, gamePlatform, deckId, stakeId | Fact de texto; otras builds/barajas se conservan. |
| observed.modsPresent | Fact booleano; true es guardable, aunque fuera del alcance propuesto. |
| observed.money | Fact de entero con signo; no se impone la ausencia de deuda como regla de serialización. |
| observed.lastCleared | Fact de {ante: entero, kind: small/big/boss}. H1 no limita ante a 1–8. |
| observed.nextBlind, visibleBoss | Fact de BlindInfo: ante, kind, bossId Fact de texto, target Fact de entero >0, reward Fact de entero ≥0. |
| observed.resources | handsPerRound, discardsPerRound, handSize, jokerSlots: Fact de entero ≥0. Sin constantes 5/3/8/5. |
| observed.deck | Fact de {preset: string} o {cards: PlayingCard[]}. Preset opaco en H1. |
| observed.handBases | Fact de {preset: string} o {values: las nueve categorías, cada una Fact de {level, chips, mult ≥0}}. |
| observed.jokers | Fact de JokerInstance[], orden conservado; límite técnico 100, no capacidad del juego. |
| observed.shop | Fact de {shopId, cardOffers, ignoredOtherOffers}; hasta 100 ofertas por límite técnico. |
| observed.outOfScope | Fact de {vouchers, consumables, pendingTags, otherModifiers}: listas de texto. |
| assumptions | Probes, roundPlans, horizonte 1–3 y supuestos de cobro; véase abajo. |
| recentRounds | Opcional, hasta 100: {blind, target >0, score ≥0, handsUsed ≥0, discardsUsed ≥0, inventoryRevision ≥0}. |

La lista completa y sus tipos se infieren del esquema ejecutable; no mantener una segunda implementación de tipos. Texto ordinario: máximo 200 caracteres. Arrays sin límite especializado: máximo 1000. Son límites de entrada del producto, no reglas de Balatro.

## Cartas, inventario y referencias

`PlayingCard`: instanceId, rank (2–10/J/Q/K/A), suit (S/H/D/C), edition, enhancement, seal y extraChips entero con signo. Se permiten cartas modificadas y composiciones distintas de 52 para registrar datos fuera de cobertura.

`JokerInstance`: instanceId, catalogId, edition Fact de texto, stickers Fact de lista de texto, sellValue Fact de entero ≥0 y `counters: Record<string, Fact<number entero>>`. No se fuerza greenMult ni se completa con cero. Se conserva cualquier contador conocido o desconocido; catalogId repetido es guardable si sus instanceId son distintos.

`ShopOffer`: offerId, catalogId, label, kind joker/unsupported, price Fact de entero ≥0, edition y stickers. Los precios observados se conservan aunque difieran del catálogo.

Se rechazan IDs duplicados de cartas, instancias de comodín, ofertas, probes y planes. Las referencias de cartas se contrastan si el mazo está enumerado; un preset opaco no se expande ni permite acreditar referencias en H1. Cada lista de cartas de un evento rechaza duplicados. La disponibilidad de cartas a través del tiempo corresponde al motor futuro.

## Datos para valorar supervivencia

`Probe`: probeId, label, playedCardIds (hasta 100 por límite técnico), discardsRemaining ≥0, role favorable/adverse/representative y greenMultBeforePlay entero opcional. Un probe no es un robo observado ni una ronda completa.

`RoundPlan`: planId, initialHandCardIds y hasta 100 eventos {type: play/discard, cardIds, drawnCardIds}. H1 verifica forma e integridad de referencias, no legalidad de juego, tamaño de mano, recursos consumidos o fin automático de ronda. Hasta 20 probes y 20 planes.

`assumptions.cashflow`: assumeRoundWon, noSpendingBetweenRounds y noMoneyChangesDuringRound booleanos; handsUsedByRound lista de hasta tres enteros ≥0. horizonRounds admite 1–3 como límite de producto; truncarlo al objetivo del ante 8 será una operación semántica, no de guardado.

Para supervivencia, el futuro analizador necesitará objetivo/jefe/recursos, composición del mazo, bases de mano, inventario/contadores y ejemplos. Si faltan, debe limitar o abstenerse según el módulo. Incluso con datos completos el orden futuro del mazo continúa desconocido.

## Validación semántica posterior, separada

H2 comprueba compatibilidad de build y presets, recursos Blue/White, capacidad, precios, efectos de los jefes admitidos, puntuación y disponibilidad de cartas durante eventos explícitos. Al terminar una ronda deja la próxima ciega y tienda desconocidas; no genera una nueva ronda. Evaluar planes completos sigue pendiente. Las dependencias están en el [backlog](backlog.md). Estas reglas no se ejecutan al guardar ni se presentan como observadas en el juego.

Las acciones H2 hold/buy/sell/replace producen copias y exigen revisión e IDs vigentes. Su contrato incluye trazas, evidencia y versión de motor, como detalla el [motor H2](motor-h2.md). El futuro análisis estratégico deberá asociarse también a la revisión de entrada y versión de política. No existe todavía puntuación estratégica ni probabilidad de victoria.

## Ejemplo completo: fixture sintético S01

El archivo [state-s01.json](../tests/fixtures/state-s01.json) se copió literalmente de la documentación H0. No es una partida observada; sus presets no se expanden en H1 y su etiqueta de versión no demuestra compatibilidad.

```json
{
  "schemaVersion": "0.1",
  "rulesetId": "balatro-pc-1.0.1f-blue-white-v1",
  "runId": "synthetic-s01",
  "revision": 0,
  "updatedAt": "2026-10-08T12:00:00Z",
  "phase": "shop",
  "observed": {
    "gameVersion": {"status":"known","value":"1.0.1f-FULL","source":"manual"},
    "gamePlatform": {"status":"known","value":"pc-steam","source":"manual"},
    "deckId": {"status":"known","value":"blue","source":"manual"},
    "stakeId": {"status":"known","value":"white","source":"manual"},
    "modsPresent": {"status":"known","value":false,"source":"manual"},
    "money": {"status":"known","value":7,"source":"manual"},
    "lastCleared": {"status":"known","value":{"ante":1,"kind":"small"},"source":"manual"},
    "nextBlind": {"status":"known","source":"manual","value":{
      "ante":1,"kind":"big",
      "bossId":{"status":"known","value":"none","source":"manual"},
      "target":{"status":"known","value":450,"source":"manual"},
      "reward":{"status":"known","value":4,"source":"manual"}
    }},
    "visibleBoss": {"status":"known","source":"manual","value":{
      "ante":1,"kind":"boss",
      "bossId":{"status":"known","value":"the_psychic","source":"manual"},
      "target":{"status":"known","value":600,"source":"manual"},
      "reward":{"status":"known","value":5,"source":"manual"}
    }},
    "resources": {
      "handsPerRound":{"status":"known","value":5,"source":"confirmedPreset"},
      "discardsPerRound":{"status":"known","value":3,"source":"confirmedPreset"},
      "handSize":{"status":"known","value":8,"source":"confirmedPreset"},
      "jokerSlots":{"status":"known","value":5,"source":"confirmedPreset"}
    },
    "deck":{"status":"known","value":{"preset":"standard52-unmodified"},"source":"confirmedPreset"},
    "handBases":{"status":"known","value":{"preset":"all-standard-level1"},"source":"confirmedPreset"},
    "jokers":{"status":"known","value":[],"source":"manual"},
    "shop":{"status":"known","source":"manual","value":{
      "shopId":"s01-shop",
      "cardOffers":[
        {"offerId":"o1","catalogId":"joker","label":"Joker","kind":"joker",
         "price":{"status":"known","value":2,"source":"manual"},
         "edition":{"status":"known","value":"base","source":"manual"},
         "stickers":{"status":"known","value":[],"source":"manual"}},
        {"offerId":"o2","catalogId":"half_joker","label":"Half Joker","kind":"joker",
         "price":{"status":"known","value":5,"source":"manual"},
         "edition":{"status":"known","value":"base","source":"manual"},
         "stickers":{"status":"known","value":[],"source":"manual"}}
      ],
      "ignoredOtherOffers":["paquetes y vale fuera de comparación"]
    }},
    "outOfScope":{"status":"known","source":"manual","value":{
      "vouchers":[],"consumables":[],"pendingTags":[],"otherModifiers":[]
    }}
  },
  "assumptions": {
    "probes":[
      {"probeId":"pair8","label":"Pareja de ochos","playedCardIds":["8S","8H"],"discardsRemaining":3,"role":"favorable"},
      {"probeId":"king","label":"Rey solo","playedCardIds":["KS"],"discardsRemaining":3,"role":"adverse"}
    ],
    "roundPlans":[],
    "horizonRounds":1,
    "cashflow":{"assumeRoundWon":false,"handsUsedByRound":[],"noSpendingBetweenRounds":false,"noMoneyChangesDuringRound":true}
  }
}
```

Ejemplo de incertidumbre: `{"status":"unknown","reason":"No transcrito"}` en visibleBoss conserva el desconocido al guardar; no permite asumir jefe sin efecto. La misma forma en money no equivale a saldo cero.

Ejemplo de contadores: `{"greenMult":{"status":"known","value":7,"source":"manual"}}`. Guardar/cargar preserva 7; `{}` no lo inicializa en cero. Un contador desconocido conserva su motivo.

## Persistencia y errores

La tienda transcrita en la Mesa utiliza un `ShopSnapshot` separado: [contrato y límites](tienda-contextual.md#estado-y-contrato). Sus ofertas temporales no son adquisiciones ni sustituyen el `observed.shop` de un guardado existente. Consultarla no cambia la revisión, inventario o historial de la partida.

API: validateState, parseState, serializeState y createStateStore. Resultado discriminado `{ok:true,value}` o `{ok:false,errors:[{path,code,message}]}`. Ejemplo: un schemaVersion diferente devuelve ruta `$.schemaVersion`, código `unsupported_schema` y explica que no se migrará automáticamente.

La clave es `balatro-advisor.state.v0.1`. load devuelve null cuando no existe guardado; un JSON corrupto devuelve errores sin borrarlo. save e import validan antes de setItem; fallos de acceso/cuota se comunican. export funciona sin acceder al almacenamiento. El puerto exige la atomicidad ante fallo de Web Storage. No se implementa archivo descargable ni formulario todavía.

Límite 1 MiB de JSON UTF-8, profundidad 60 y 100 000 nodos; rechazo de ciclos, getters, objetos no JSON, claves reservadas, campos extra, arrays dispersos y valores que no sobrevivirían ida/vuelta (undefined, NaN, infinito, -0). Una validación exitosa devuelve copia independiente.

El almacenamiento pertenece al navegador/origen/dispositivo, puede borrarse y no se sincroniza. No se promete una segunda copia de borrador ni recuperación automática de datos corruptos. [Pruebas y limitaciones reales de H1](evidencia/h1-validacion.md).
