# Modelo de estado 0.1 y 0.2

Extensión vigente: [SHOP02b](sobres-shop02b.md) añade ofertas opcionales y contexto de sobre abierto en 0.2. Conserva 0.1 congelado y 0.2 anteriores sin contexto; no se genera contenido ni se migra al leer.

RUN01b añade comandos observacionales y entradas `progress` al registro `confirmed-2`, sin cambiar el esquema de estado 0.2. [Flujo, datos que caducan y compatibilidad](recorrido-run01b.md). El formato sigue separado del cálculo de reglas.

**Actualización RUN01a, 2026-10-16:** se admiten GameState 0.1 y 0.2. El nuevo formato incorpora fases discriminadas; el antiguo sigue siendo legible sin conversión. El documento de partida e historial admite `confirmed-1` con estados 0.1 o `confirmed-2` con estados 0.2. [Fases, APIs de migración y recuperación](fases-y-migracion.md). El `state` del registro adoptado es la fuente de verdad; las consultas no lo modifican.

Implementado en [model.ts](../src/state/model.ts), [schema.ts](../src/state/schema.ts) y [validation.ts](../src/state/validation.ts). El contrato 0.1 está congelado en [legacy-model.ts](../src/state/legacy-model.ts) y [legacy-validation.ts](../src/state/legacy-validation.ts). Alcance de producto: [especificación](especificacion-v0.1.md); reglas separadas: [catálogo y evidencia](reglas-y-fuentes.md). La validación estructural no depende de confirmar reglas del juego.

**H2:** este esquema y su persistencia no cambiaron. El motor ya implementa validación semántica del alcance, acciones, puntuación y eventos en módulos separados; el texto que los describe como posteriores a H1 se concreta ahora en [motor-h2.md](motor-h2.md). El ejemplo histórico 1.0.1f sigue siendo guardable, pero el motor activo requiere contrato 1.0.1o explícito. RoundState es una proyección efímera, no un campo nuevo del JSON. Las salidas proyectadas no son nuevas observaciones por el hecho de tener forma GameState.

## Datos conocidos, desconocidos e hipotéticos

T07b incorpora un contrato de escenario separado, `scenario-1`, con procedencia por carta y robos condicionales. [Campos, ejemplo y resultados](comparacion-t07b.md). No migra ni interpreta automáticamente los roundPlans históricos de H1; guardar/cargar el estado sigue conservándolos tal cual. Este nuevo escenario y sus resultados no se guardan automáticamente como observaciones de partida.

`Fact<T>` tiene exactamente una forma:

```ts
type Fact<T> =
  | { status: 'known'; value: T; source: 'manual' | 'confirmedPreset' }
  | { status: 'unknown'; reason: string };
```

Ausencia de dato no equivale a cero, false o lista vacía. `confirmedPreset` registra confirmación de entrada del usuario, no observación de una regla por el equipo. `createDraft(runId, updatedAt)` sigue creando 0.1 `draft`; `createUnknownState(runId, updatedAt)` crea 0.2 `unknown`. Ambos usan campos desconocidos y ruleset `unselected`, sin seleccionar build ni aplicar recursos del juego. El llamante suministra identidad y fecha, y valida antes de guardar.

`observed` conserva la instantánea; `assumptions` contiene manos y planes hipotéticos. Los resultados derivados no se guardan como hechos ni se aceptan como campos extra. `recentRounds` es contexto histórico opcional; no implica una distribución de probabilidades.

## Contrato estructural implementado

Todos los números son enteros seguros. No hay coerción de texto a número. Los objetos exigen sus campos requeridos y rechazan campos desconocidos para evitar pérdida silenciosa al importar.

| Campo | Tipo / validación H1 |
| --- | --- |
| schemaVersion | "0.1" o "0.2"; otras versiones se rechazan. Validar y cargar no convierten entre versiones. |
| rulesetId, runId | Texto no vacío; ruleset no necesita existir para poder guardar. |
| revision | Entero ≥0; guardar conserva su valor, no incrementa automáticamente. |
| updatedAt | Fecha UTC real YYYY-MM-DDTHH:mm:ssZ o con tres cifras de milisegundos. |
| phase | 0.1: shop/draft. 0.2: unknown/blind_select/in_round/cashout/shop/open_pack/finished. No acredita una transición realizada ni disponibilidad de análisis. |
| phaseData | Solo 0.2, obligatorio y discriminado por phase. [Campos y validaciones](fases-y-migracion.md#fases-de-02). |
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

Se rechazan IDs duplicados de cartas, instancias de comodín, ofertas, probes y planes. Las referencias de cartas se contrastan si el mazo está enumerado; un preset opaco no se expande ni permite acreditar referencias en H1. Cada lista de cartas de un evento rechaza duplicados. En 0.2 también se contrastan los IDs conocidos en mano. La disponibilidad de cartas a través del tiempo corresponde a H2/T07b.

## Datos para valorar supervivencia

`Probe`: probeId, label, playedCardIds (hasta 100 por límite técnico), discardsRemaining ≥0, role favorable/adverse/representative y greenMultBeforePlay entero opcional. Un probe no es un robo observado ni una ronda completa.

`RoundPlan`: planId, initialHandCardIds y hasta 100 eventos {type: play/discard, cardIds, drawnCardIds}. H1 verifica forma e integridad de referencias, no legalidad de juego, tamaño de mano, recursos consumidos o fin automático de ronda. Hasta 20 probes y 20 planes.

`assumptions.cashflow`: assumeRoundWon, noSpendingBetweenRounds y noMoneyChangesDuringRound booleanos; handsUsedByRound lista de hasta tres enteros ≥0. horizonRounds admite 1–3 como límite de producto; truncarlo al objetivo del ante 8 será una operación semántica, no de guardado.

Para supervivencia, el futuro analizador necesitará objetivo/jefe/recursos, composición del mazo, bases de mano, inventario/contadores y ejemplos. Si faltan, debe limitar o abstenerse según el módulo. Incluso con datos completos el orden futuro del mazo continúa desconocido.

## Validación semántica separada

H2 comprueba compatibilidad de build y presets, recursos, capacidad, precios, efectos de los jefes admitidos, puntuación y disponibilidad de cartas durante eventos explícitos, dentro de su cobertura. T07b evalúa planes completos y el horizonte permite continuaciones declaradas. Al terminar una ronda calculada, deja próxima ciega y tienda desconocidas: en 0.1 usa `draft`; en 0.2 usa `unknown` con motivo. Estas salidas son proyecciones, no avances registrados de partida. Estas reglas no se ejecutan al guardar ni se presentan como observadas en el juego.

Las acciones H2 hold/buy/sell/replace producen copias y exigen revisión e IDs vigentes. Su contrato incluye trazas, evidencia y versión de motor, como detalla el [motor H2](motor-h2.md). H3 y las valoraciones contextuales conservan sus límites propios; una valoración heurística no estima la probabilidad de victoria. T09b vincula las confirmaciones al estado utilizado, incluyendo schemaVersion en 0.2 para invalidar consejos anteriores a la migración.

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

Desde [SHOP03a](tienda-persistente.md), las ofertas de comodines transcritas en Mesa se conservan en `observed.shop` del mismo registro de la partida; la vista se reconstruye desde él. Registrar una oferta es una observación, no una compra. Consultarla no cambia revisión, inventario ni historial. Los vales y sobres ofertados mantienen sus límites de consulta descritos en esa entrega.

API: validateState, validateLegacyState, validateCurrentState, parseState, serializeState y createStateStore. Resultado discriminado `{ok:true,value}` o `{ok:false,errors:[{path,code,message}]}`. Una versión no admitida devuelve ruta `$.schemaVersion`, código `unsupported_schema` y explica que no se migrará automáticamente. `migrateState` es una conversión explícita y pura; no incrementa revisión ni convierte hipótesis en observaciones.

El almacén H1 conserva la clave `balatro-advisor.state.v0.1`; el flujo web adoptado usa el registro T09b en `balatro-advisor.confirmed.v1`, cuyo contenido puede ser confirmed-1 o confirmed-2. Los nombres históricos de claves no seleccionan el formato. load devuelve null cuando no existe guardado; un JSON corrupto devuelve errores sin borrarlo. save e import validan antes de setItem; fallos de acceso/cuota se comunican. El puerto exige la atomicidad ante fallo de Web Storage. La web permite descargar e importar el registro completo.

Límite 1 MiB de JSON UTF-8, profundidad 60 y 100 000 nodos; rechazo de ciclos, getters, objetos no JSON, claves reservadas, campos extra, arrays dispersos y valores que no sobrevivirían ida/vuelta (undefined, NaN, infinito, -0). Una validación exitosa devuelve copia independiente.

El almacenamiento pertenece al navegador/origen/dispositivo, puede borrarse y no se sincroniza. No se promete una segunda copia de borrador ni recuperación automática de datos corruptos. La migración explícita confirmed-1→confirmed-2 conserva antes el texto original en un único espacio de respaldo descargable; no es un historial de copias ilimitado. [Procedimiento y fallos de migración](fases-y-migracion.md). [Pruebas históricas de H1](evidencia/h1-validacion.md).


## DECK04a: uso dirigido de Tarot

No añade campos ni cambia la versión: reutiliza `in_round.heldCardIds`, cartas por instancia y `jokerContext.consumables`/`tarotsUsed`. La mano observada y el uso son acciones actuales separadas de `confirmed-2`; las proyecciones no sustituyen hechos. Un total desconocido no se completa con cero. El formato histórico 0.1 permanece congelado. [Contrato, validaciones, ejemplos y persistencia](tarot-deck04a.md).


## DECK04b: mano y objetivos de Arcana

`PackContext.heldCardIds?: Fact<string[]>` registra únicamente la mano observada del sobre; ausencia en copias0.2 anteriores no crea cartas ni obliga a migrarlas. `PackEntry` añade `kind:tarot` por identidad de catálogo; `observe_pack_hand` y los objetivos opcionales de `choose_pack_item` pertenecen solo al contrato actual. H1 comprueba referencias; H2 exige familia/origen, mano completa conocida y objetivos legales. El estado no contiene un consumible ficticio por una opción usada directamente. [Contrato y ejemplos](arcana-deck04b.md).
