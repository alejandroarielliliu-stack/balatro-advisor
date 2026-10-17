# L11 / SHOP02b — evidencia de sobres observados

17 de octubre de 2026, Panamá. Lectura estática del ZIP incorporado en `C:/Program Files (x86)/Steam/steamapps/common/Balatro/Balatro.exe`, mediante `zipfile.ZipFile`, sin ejecutar Balatro, modificar la instalación ni extraer sus fuentes al repositorio. `version.jkr` identifica `1.0.1o-FULL`, `1.0.1o` y `PROD_PC_Console`. Las huellas coinciden con L01/L10.

**Estado: provisional, respaldado por inspección; pendiente observación en partida.** «Observado estático» significa una rama del código leído. No significa que se haya visto su resultado en una sesión del juego. Las pruebas del asesor comprueban su contrato, no sustituyen esa evidencia. Solo se publican conclusiones, ubicaciones y hashes, sin redistribuir Lua.

## Matriz de comprobación

Los resultados esperados de esta tabla se fijaron a partir de las ramas inspeccionadas, antes de ejecutar el asesor. No se generan usando la misma función sometida a prueba.

| Regla o hipótesis | Caso mínimo | Resultado esperado independiente | Observado estático y fuente | Estado / pendiente en partida |
|---|---|---|---|---|
| Precio y cantidad Buffoon | Normal, Jumbo y Mega sin modificadores | $4, 2 opciones/1 elección; $6, 4/1; $8, 4/2 | `game.lua:693–696` declara coste, `extra` y `choose` | Provisional; foto de cada tipo abierto con precio previo y elecciones visibles |
| Precio y cantidad Celestial | Mismos tres tamaños | $4, 3/1; $6, 5/1; $8, 5/2 | `game.lua:673–680` | Provisional; mismos datos para Celestial |
| Abrir cobra una sola vez | $20, Buffoon normal observado a $4 | Saldo $16, oferta consumida, contenido todavía por observar en el asesor | `functions/button_callbacks.lua:2209,2240–2247` retira la oferta y abre; `card.lua:1681–1716` fija fase/elecciones y descuenta el coste | Provisional; tienda/saldo antes y sobre/saldo después |
| Elegir no vuelve a comprar | Tras pagar el Buffoon anterior, elegir Joker base | Saldo sigue $16; se añade una instancia; no aparece un cargo de $2 o $4 | `functions/button_callbacks.lua:2233–2239` añade y coloca, sin otro descuento | Provisional; elección e inventario/saldo posterior |
| Abrir y elegir tienen límites distintos | Inventario 5/5, abrir Buffoon; seleccionar normal o Negative | Apertura posible; normal bloqueado por capacidad; Negative permite adquisición | `can_open`, `functions/button_callbacks.lua:111–118`, no comprueba huecos; `can_select_card:2112–2118` sí admite Negative | Provisional; sobre abierto y botones de ambas opciones con capacidad llena |
| Negative aumenta capacidad | Cinco comodines/5 espacios, elegir Negative | Seis comodines/6 espacios, sin cobrar otra compra | `card.lua:630–638` incrementa capacidad al añadir Negative; selección anterior | Provisional; capacidad antes/después de elegir |
| Cada Mega permite dos, no todas | Mega Buffoon $8, cuatro opciones, elegir una | Quedan tres opciones y una elección; la segunda cierra | `game.lua:696`; `functions/button_callbacks.lua:2273–2283` resta una elección o cierra | Provisional; secuencia después de primera y segunda elección |
| Omitir no devuelve el precio | $20, Mega $8, elegir una y omitir el resto | Saldo $12; primera elección conservada; sobre cerrado | `functions/button_callbacks.lua:2558–2562` llama al evento y al cierre; no existe devolución en ese flujo | Provisional; saldo y comodín conservado tras omitir |
| Red Card al omitir | Red Card Mult 0; omitir un sobre o el resto de Mega tras una elección | Mult 3; no crece un Blueprint como segunda copia física | `card.lua:2441–2443`, rama `skipping_booster`, excluye Blueprint | Provisional; contador antes/después, incluido Mega parcial |
| Venta dentro del sobre | 5/5, vender Joker base por $1 antes de elegir otro | Se libera un espacio, saldo +$1, no disminuyen elecciones | `card.lua:1640–1652` permite vender un comodín propio no Eternal fuera de bloqueos/animaciones sin excluir la fase de sobre; `functions/button_callbacks.lua:2122–2128,2318–2325` usa la venta existente, no `use_card` de elección | Provisional; venta y elección separadas; la persistencia del asesor se prueba aparte |
| La venta no depende del coste del sobre | Joker base obtenido de Buffoon normal de $4 | Valor base de venta $1 | `card.lua:335,369–383` usa coste propio del centro y edición, no el precio del Booster; `game.lua:368` define Joker coste 2 | Provisional; descripción de venta de la instancia elegida |
| Inicialización de instancia | To Do List e Invisible generados en Buffoon | To Do List tiene objetivo elegido; Invisible comienza en 0 rondas | `card.lua:277–297,308–322,335–337` inicializa atributos y objetivo | Provisional; capturar objetivos/contadores; no rellenarlos con una hipótesis |
| Buffoon ordinario no da Legendarios | Generar opciones Joker con parámetros normales | Pool de rareza 1/2/3; no Caino/Perkeo/etc. | `card.lua:1773–1774` llama a creación Joker sin bandera legendaria; `functions/common_events.lua:1968–1971` selecciona 1/2/3 salvo bandera | Provisional; no es una medición de frecuencias ni justifica un porcentaje de victoria |
| Stickers y copias dependen del contexto | White sin mods; identidad ya usada con/sin Showman | No se inventan stickers de dificultades superiores ni se prohíbe toda copia observada | `functions/common_events.lua:1987–1988,2133–2150` filtra pool e incorpora modificadores/stickers/edición | Provisional; conservar datos vistos y comunicar incompatibilidad, no simular perfil |
| Planet se usa directamente | Inventario de consumibles lleno, elegir Mercury de Celestial | Pair sube un nivel; no se guarda Mercury ni exige un hueco | `functions/button_callbacks.lua:2211–2220` usa la carta; `card.lua:1264–1266` mejora su mano | Provisional; bases Pair y consumibles antes/después |
| Progresión de Pair | Pair nivel 1, 10 fichas y Mult 2; usar Mercury | Nivel 2, 25 fichas y Mult 3 | Identidad `game.lua:557`; bases/incrementos `game.lua:2012`; fórmula `functions/common_events.lua:464–468` | Provisional; nivel y bases observados, separados de puntuación de cartas |
| Los doce Planet tienen identidad propia | Un uso de cada Planet desde nivel 1 | Tabla canónica inferior; no intercambiar Mercury y Pluto | `game.lua:557–568,2002–2013`; `card.lua:1264–1266` | Provisional; contrastar solo Planet que aparezcan, no pedir todo el catálogo a la vez |
| Planet oculto no acredita historial | Observar Planet X/Ceres/Eris | Registrar opción sin inventar manos jugadas; generación ordinaria requiere que su mano se haya jugado | `game.lua:566–568` marca softlock; `functions/common_events.lua:2008–2010` comprueba `played > 0` | Provisional; foto de contenido y de historial pertinente si se investiga su generación |
| Black Hole puede aparecer en Celestial | Opción Black Hole observada entre los Planet | Se conserva como Spectral; no se aplica como un Planet normal | `functions/common_events.lua:2088–2099` permite la sustitución especial; `card.lua:1153–1176` mejora todas las manos | Provisional; presencia y efectos pendientes; su uso queda fuera del primer lote |
| Constellation e historial | Constellation ×1; Mercury dos veces y Mars una | Constellation ×1,3; dos identidades usadas para Satellite; ningún ingreso inmediato | `card.lua:2727–2732` +0,1 físico por Planet; `functions/misc_functions.lua:1184–1206` registra identidad/usos; `card.lua:1667–1673` calcula ingreso de Satellite | Provisional; contadores al usar y cobro posterior en evidencia separada |
| Hallucination ocurre al abrir | Hallucination previo, capacidad disponible, rama observada; comparar con obtenerlo del propio Buffoon | Apertura activa el hook previo; el comodín obtenido no vuelve a abrir el sobre | `card.lua:1796–1798,2335–2351`; elección posterior en `functions/button_callbacks.lua:2233–2239` | Provisional; registrar resultado real y capacidad, nunca declarar una rama aleatoria como observada |
| Hallucination respeta capacidad | Consumibles llenos, abrir; después caso con espacio y resultado conocido | Lleno no crea Tarot; con espacio depende de la rama y resultado explícitos | `card.lua:2335–2346` comprueba capacidad/buffer y probabilidad `normal/extra` | Provisional; inventario, comodines y resultado antes/después |
| Astronomer hace gratuito Celestial | Astronomer físico; normal/jumbo/mega Celestial y Buffoon | Celestial $0; Buffoon mantiene $4/$6/$8; adquisición/venta cambia precios afectados | `card.lua:380,616–621,673–679` vuelve a calcular costes | Provisional; precios antes/después de adquirir o vender |
| Terminar recupera contexto | Abrir desde tienda, elegir/omitir | Vuelve a la tienda interrumpida; no crea otra ronda ni otras ofertas | `functions/button_callbacks.lua:2565–2624`, restaura `PACK_INTERRUPT` y guarda | Provisional; tienda y ofertas restantes tras cierre |

Omitir un sobre de Mega después de haber elegido una carta es una omisión del resto, no una anulación de la primera elección. La acción `skip_booster` no distingue ese caso: el evento Red Card sigue aplicándose. La conservación de elecciones y la posibilidad de recargar son, además, contratos de almacenamiento del asesor.

## Literales independientes de Planet

Desde nivel 1, un uso añade un nivel. Estos valores son bases de la mano; no incluyen cartas jugadas, ediciones ni comodines.

| Planet | Mano | Fichas/Mult nivel 1 → nivel 2 |
|---|---|---|
| Pluto | High Card | 5/1 → 15/2 |
| Mercury | Pair | 10/2 → 25/3 |
| Uranus | Two Pair | 20/2 → 40/3 |
| Venus | Three of a Kind | 30/3 → 50/5 |
| Saturn | Straight | 30/4 → 60/7 |
| Jupiter | Flush | 35/4 → 50/6 |
| Earth | Full House | 40/4 → 65/6 |
| Mars | Four of a Kind | 60/7 → 90/10 |
| Neptune | Straight Flush | 100/8 → 140/12 |
| Planet X | Five of a Kind | 120/12 → 155/15 |
| Ceres | Flush House | 140/14 → 180/18 |
| Eris | Flush Five | 160/16 → 210/19 |

La fórmula leída calcula cada base a partir del nivel y sus parámetros canónicos. No valida una mano concreta ni convierte estos literales en una predicción de puntos o supervivencia. Black Hole es Spectral y su uso no equivale a usar doce Planet para Constellation o Satellite.

## Identidad de los archivos

SHA-256 de los bytes inspeccionados. Repetición: abrir el ejecutable como ZIP en memoria, leer las entradas, calcular `hashlib.sha256` y consultar las líneas sin extraer ni ejecutar sus fuentes.

| Archivo / entrada | SHA-256 |
|---|---|
| `Balatro.exe` | `0d75fe164accf3312734d4b37ac98788dd15f0b8e4f9bb8b7f90c4e59de93f47` |
| `version.jkr` | `a0525225e93bc81acd291aa4661e6648c8f3591ff34761bb3bee5319a766aaa3` |
| `game.lua` | `bbc67bd3fbadd1ea3f3f0aba07ef8596118d89ff1e9758718f9e17c07a96e912` |
| `card.lua` | `5073d834e08119da9516f1795a8c3d93110669aeb409c29ad1b308e0eb0be453` |
| `functions/button_callbacks.lua` | `c88a74ca3a8fa8ace0ce46ad10a97238f347c292842c9164d11136fe9952c101` |
| `functions/common_events.lua` | `522ea0810101de1004685e13e7ed05a750b4e115e5231dca2cbc97aeb8c3e5fc` |
| `functions/misc_functions.lua` | `c36ed54d8ab441be994a9afc5d38b8ac530f3b93995dfed424ec11f02e633198` |
| `functions/UI_definitions.lua` | `e41dcdb24fb66faeb9e3809ea3e4252716d61836ef152677e39245a28fca6eb8` |

Las funciones de UI identifican botones de selección/omisión (`functions/UI_definitions.lua:369,1665,1711,1767–1803`); las funciones de regla citadas en la matriz determinan las consecuencias. Un cambio de huella requiere revisar compatibilidad. Los datos nominales de los seis sobres ya existían en `BOOSTER_CATALOG`; este lote los conecta a acciones reales, no amplía su contenido mediante una distribución inventada.

## Verificación del asesor y evidencia que falta

Resultado de software: **764 pruebas aprobadas, 0 fallos y 10 TODO de contraste manual**. Catorce grupos nuevos de navegador, doce de tienda y diez de vales aprobados, además de las regresiones de progreso, migración, decisiones, observaciones y hosting estático. Capturas de escritorio y 390 px inspeccionadas; no es Android físico. Comandos reproducibles:

```powershell
npm.cmd run demo:packs
npm.cmd run check
npm.cmd run test:pack-shop
```

Las suites deben distinguir los esperados mecánicos anteriores de contratos internos: copiar sin mutación, validación de referencias/cantidad, revisión, IDs de confirmación, consentimiento, escritura atómica, fallo de cuota, recarga, deshacer y migración son comportamientos del asesor. No son comprobaciones ejecutadas en Balatro. Las capturas web de esta entrega comprueban su interfaz, tampoco acreditan una partida.

Las reglas `packs.purchase`, `packs.contents`, `packs.choose`, `packs.skip` y `packs.planet` permanecen provisionales con L11. Hallucination, Red Card, progresión, crédito y efectos de inventario conservan sus evidencias compartidas. `requireObserved:true` no debe promocionar las reglas por aprobar las pruebas; comunica la dependencia pendiente.

Para un contraste manual futuro basta empezar por una compra normal y un Planet, sin solicitar todo el catálogo: versión/plataforma/mods ya declarados se conservan; registrar precio y saldo antes de abrir, contenido y elecciones tras abrir, y saldo/inventario o bases de la mano después de elegir. Un segundo caso Mega, una elección y omisión permite contrastar persistencia de la elección y Red Card si está presente. Los casos de Negative, Astronomer o Hallucination se agrupan solo cuando aparezcan en esa versión. No se afirma que esas capturas se hayan obtenido en esta entrega.
