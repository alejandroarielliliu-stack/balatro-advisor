# Tienda — investigación estática de 1.0.1o-FULL

Consulta: **2026-10-13**. Fuente primaria local: ZIP integrado en `C:/Program Files (x86)/Steam/steamapps/common/Balatro/Balatro.exe`, leído sin ejecutar Lua ni el juego. `version.jkr`: `1.0.1o-FULL`, `1.0.1o`, `PROD_PC_Console`. SHA256 del ejecutable: `0d75fe164accf3312734d4b37ac98788dd15f0b8e4f9bb8b7f90c4e59de93f47`.

Los hallazgos son **respaldo estático**, no observación de una partida. No se conocen la semilla, el contenido de un sobre cerrado ni las próximas ofertas. No se estiman probabilidades de victoria, rentabilidad de un sobre o compra óptima. La implementación actual puede tener menor cobertura que el ejecutable inspeccionado.

## Hallazgos mecánicos

| ID | Regla inspeccionada | Localización y caso mínimo verificable como software | Estado y límite |
| --- | --- | --- | --- |
| SHOP01 | La tienda base tiene dos espacios de cartas, dos sobres y un vale vigente. Las cartas pueden ser comodines o consumibles; no son dos comodines garantizados. | `game.lua:1984`, `game.lua:3125–3157`; `functions/UI_definitions.lua:742–800`. Tienda base con comodín y Tarot, dos packs y un vale: disposición compatible. | Respaldado por código local; no observado. Tags, vales, baraja y tutorial alteran contenido. |
| SHOP02 | Overstock y Overstock Plus añaden un espacio de carta cada uno; pueden dar tres/cuatro espacios. | `card.lua:1885–1888`; `functions/common_events.lua:1097–1115`. Cada adquisición suma una sola vez; comprar una oferta no rellena inmediatamente el hueco comprado. | Respaldado por código local. H2 actual rechaza más de dos ofertas como cobertura pendiente; transcribirlas no habilita la transacción. |
| SHOP03 | El reroll sustituye las ofertas del área de cartas, no los sobres ni el vale. Descuenta el precio vigente y aplica eventos propios del reroll. | `functions/button_callbacks.lua:2855–2909`. Con dos cartas, dos packs y un vale: cambia las cartas; packs/vale permanecen. | Respaldado por código local. Sin semilla no generar cartas nuevas; después de un reroll real se transcribe la nueva tienda. |
| SHOP04 | Base de reroll $5; tras reroll pagado aumenta en $1. Los rerolls gratuitos no incrementan ese coste y consumen su disponibilidad. Nueva ronda reinicia el incremento; Chaos genera rerolls gratuitos. | `game.lua:1924,1958–1959`; `functions/common_events.lua:2263–2268`; `functions/button_callbacks.lua:2867–2871`; `functions/state_events.lua:300–313`. Sin modificadores: $5→$6→$7; con un gratuito vigente: $0→base sin incremento por el gratuito. | Respaldado por código local. Reroll Surplus/Glut, D6, Chaos, inflación y precios manuales requieren cobertura propia. No inventar precio por número de rerolls incompleto. |
| SHOP05 | Los 32 vales tienen precio base $10. Los 16 mejorados exigen su vale base y desbloqueo del perfil para entrar en el pool; no repetir un vale ya usado. | Tabla `v_*` de `game.lua`; `functions/common_events.lua:1987–2006`. Money Tree requiere Seed Money y Antimatter requiere Blank; registrar el requisito no demuestra desbloqueo de perfil. | Respaldado por código local. El vale visible observado es evidencia de disponibilidad de esa oferta; no reconstruir el perfil ni simular sus desbloqueos. |
| SHOP06 | Comprar el vale lo registra y consume la oferta; no aparece otro inmediatamente. El siguiente vale se selecciona al vencer el jefe/cambiar ante, conservándose si no se compra durante ese ante. | `card.lua:1813–1852`; `functions/state_events.lua:238–264`; `game.lua:3125–3132`. Compra seguida de otra tienda del mismo ante: oferta consumida; vencer el jefe permite vale siguiente. | Respaldado por código local; tags añaden excepciones. No actualizar historial o ante por recomendar un vale. |
| SHOP07 | Abrir un sobre cobra el precio de la oferta, fija número de cartas y elecciones y genera contenido. Abrir y escoger son acciones distintas; abrir activa eventos de comodines. | `card.lua:1681–1797`; `functions/button_callbacks.lua:2267–2283`. Mega de cinco cartas permite hasta dos elecciones, no cinco adquisiciones. | Respaldado por código local. No aplicar Hallucination, Red Card, Tarot usados o crecimiento de Holograma sin sus eventos/elecciones pertinentes. |
| SHOP08 | Seleccionar un comodín de Buffoon necesita hueco, salvo edición negativa compatible. Puede omitirse un sobre; omitir dispara su evento propio. | `functions/button_callbacks.lua:2112–2119,2558–2562`. Inventario lleno no admite un comodín normal sin venta previa; abrir no crea un hueco. | Respaldado por código local. La legalidad de efectos consumibles depende de objetivos y cartas disponibles, no solo dinero. |

La regla de selección del vale se documenta para una tienda ordinaria. Tags, tutorial, desafíos y modificadores específicos exigen distinguir la oferta visible del caso base; no rechazarlos como imposibles solo por exceder su distribución normal.

## Sobres: tipos, tamaños y precios base

La tabla `p_*` de `game.lua:665–696` contiene **32 variantes ilustradas**, agrupables en **15 combinaciones de tipo/tamaño**. La propiedad `extra` es el número de cartas mostradas y `choose` las elecciones disponibles.

| Tipo | Normal | Jumbo | Mega | Contenido típico y límites |
| --- | --- | --- | --- | --- |
| Arcana | $4 · muestra3 · elige1 | $6 · muestra5 · elige1 | $8 · muestra5 · elige2 | Tarot; Omen Globe puede sustituir por Spectral y existen cartas especiales. Las cartas se usan con sus condiciones/objetivos; no se presupone que pasen al inventario de consumibles. |
| Celestial | $4 · muestra3 · elige1 | $6 · muestra5 · elige1 | $8 · muestra5 · elige2 | Planetas usados para mejorar manos; excepción Black Hole. Telescope interviene en la primera carta si existe historial elegible. |
| Standard | $4 · muestra3 · elige1 | $6 · muestra5 · elige1 | $8 · muestra5 · elige2 | Cartas de juego con posible mejora, edición y sello. Elegir una aumenta el mazo y puede activar crecimiento; abrir no prueba que haya material útil. |
| Spectral | $4 · muestra2 · elige1 | $6 · muestra4 · elige1 | $8 · muestra4 · elige2 | Spectral usados con sus condiciones/objetivos. Pueden aparecer Soul/Black Hole según ramas de generación; no se presupone beneficio de una carta no vista. |
| Buffoon | $4 · muestra2 · elige1 | $6 · muestra4 · elige1 | $8 · muestra4 · elige2 | Comodines elegibles según generación y capacidad. Elegir no implica pagar un segundo precio individual; el coste ya pagado es el sobre. |

`Card:open` genera cada contenido en `card.lua:1730–1774`. `create_card` contempla Soul y Black Hole en `functions/common_events.lua:2088–2099`. No se trasladan los umbrales pseudoaleatorios a probabilidades del asesor.

`get_pack`, en `functions/common_events.lua:1944–1960`, garantiza un Buffoon normal en la primera selección de pack si el flag aún no está marcado y no está prohibido. El flag, tutorial y otros modificadores impiden inferir indiscriminadamente que toda tienda actual contiene ese sobre. La primera entrega debe transcribir lo visible.

### Telescope y otros modificadores

- `card.lua:1737–1754`: Telescope recorre manos visibles y escoge la de mayor número de veces **jugada**, con desempate por orden del juego. No usa nivel, intención del usuario ni mano de mayor puntuación. Con todas a cero no hay una mano forzada por esa rama. Una promesa del planeta requiere historial pertinente conocido; sin él, limitar la explicación.
- `card.lua:1731–1734`: Omen Globe puede cambiar la familia de contenido en Arcana. No asumir que todo Arcana ofrece únicamente Tarot cuando este vale está adquirido.
- `card.lua:380`: Astronomer deja a precio0 los planetas y sobres Celestial. Que sea gratuito no prueba que convenga usar cualquier planeta, ni hace gratuitas otras familias.
- `card.lua:1917–1928`: descuentos de Clearance/Liquidation y reducción de Reroll Surplus/Glut modifican precios. Precio visto prevalece; el asesor debe conservar discrepancia/cobertura.

## Precio observado y discrepancias existentes

`Card:set_cost`, `card.lua:369–383`, utiliza precio base, edición, inflación y descuento, con redondeo y mínimo; aplica después excepciones como Astronomer, rental y coupon. También contiene tutorial y modificador de incremento de packs por ante. Este último no se importa como regla de Blanca.

La investigación original detectó una **discrepancia de precios**: `editionPrice` usaba Holo +2 y Polychrome +3; el ejecutable inspeccionado usa Holo +3 y Polychrome +5. Se corrigió al integrar SHOP01 el2026-10-14, con19oráculos independientes en `tests/edition-prices.test.ts`. Los descuentos todavía no quedan integrados por esa corrección; el precio base de una ilustración no sustituye el observado. La verificación sigue siendo estática, no observación en partida.

H1 puede guardar datos manuales que H2 no soporte. Los diez efectos persistentes de vales integrados se describen en [vales](../vales.md); los otros veintidós son registrables con limitaciones. Guardar un vale, una oferta o un tipo de sobre no implementa sus efectos.

## Plan mínimo recomendado

Esta sección propone un alcance; no declara código implementado.

1. **Una tienda observada.** Área de cartas acorde a capacidad conocida, dos packs y vale vigente, más campo del precio actual de reroll. Estados separados: oferta transcrita, hueco vacío confirmado y dato desconocido. Catálogos existentes permiten seleccionar cartas/vales; un pack necesita tipo, tamaño y precio visto. No crear ofertas aleatorias.
2. **Consejo de compras conocidas.** Reutilizar H2 para la legalidad de compras/ventas compatibles y la evaluación contextual para efectos conocidos. Comparar saldo, rol y recursos, sin convertir la nota de composición en porcentaje o prueba de supervivencia. Una tienda incompleta no produce una búsqueda exhaustiva.
3. **Vales compatibles.** Proyección independiente precio→saldo y recurso/interest-cap admitido, validando requisito y adquisición previa. El vale consumido desaparece solo tras acción real confirmada. Precio, crecimiento futuro e ingresos condicionados permanecen separados. Vales no integrados ofrecen consejo condicionado y datos pendientes, sin fingir aplicar efectos.
4. **Packs cerrados.** Mostrar coste, cantidad de elecciones y necesidad estratégica concreta. Arcana puede interesar para arreglar material; Celestial para la mano relevante; Standard para añadir material o Holograma; Buffoon para buscar reemplazo; Spectral para transformaciones posibles. Son hipótesis de categoría, no contenido garantizado ni mejora numérica de la composición. Sin un modelo de distribución validado no ordenar packs por valor esperado inventado.
5. **Pack abierto.** El usuario transcribe cartas visibles y elecciones restantes. Solo entonces se puede recomendar entre opciones conocidas; una carta con objetivos necesita sus objetivos reales o una proyección explícita. Lo no implementado conserva límite. Abrir, elegir, usar y omitir requieren eventos propios antes de registrarlos; no usar una compra genérica de joker para simularlos.
6. **Reroll.** Valorar coste inmediato, información perdida y necesidades, sin asegurar mejor oferta. Una confirmación real consume dinero y debe conservar eventos compatibles; las nuevas ofertas se solicitan después, sin generar contenido. El modo de primera entrega puede aconsejarlo condicionalmente sin implementarlo como transacción.
7. **Registro y pruebas.** Mantener T09b: consultar/proyectar jamás guarda una adquisición. Confirmar únicamente eventos implementados; lo demás se corrige/transcribe de forma explícita y con revisión. Guardados anteriores necesitan migración o campos opcionales declarados antes de ampliar estructura de tienda.

Primera entrega verificable: sustituir Candidatos por tienda manual, consejo de comodines existentes, proyecciones de los vales soportados y consejo condicional de packs cerrados. La apariencia puede cubrir toda la tienda sin afirmar que se aplican todos sus eventos.

Casos mínimos independientes: pack Mega no otorga cinco elecciones; Buffoon lleno pide venta para seleccionar; Astronomer permite Celestial a0 pero no Arcana; gastar27→23 no resta interés ahora ni inventa un cobro; compra de Seed a20 no crea saldo50; reroll conserva packs/vale; vale mejorado sin requisito comunica discrepancia; pack cerrado no devuelve Δ exacta de composición; solo contenido conocido permite comparar elecciones concretas.

## Activos disponibles

Decisión posterior de producto (2026-10-14): el usuario pidió conservar la estética de la tienda y retirar Renovar y controles sin función de asesor. La investigación y API de reroll se conservan, pero no hay campo, botón ni opción de renovación en la Mesa. [Alcance implementado](../tienda-contextual.md).

La investigación original no exportó activos. En la integración posterior se añadió el atlas de sobres y15sprites representativos mediante `tools/import-boosters.py`; dos ejecuciones produjeron bytes idénticos. Catálogo y hashes se conservan en `src/catalog/booster-catalog.ts` y `web/assets/boosters/provenance.json`. Las ilustraciones mantienen su atribución y no certifican efectos calculados.

| Archivo dentro del ejecutable | Tamaño PNG | Uso y posiciones | SHA256 |
| --- | --- | --- | --- |
| `resources/textures/2x/boosters.png` | 568×1710 | Celdas142×190, cuatro columnas y nueve filas; posiciones de los32 packs en `game.lua:665–696`. Arcana normal y0, jumbo/mega y2; Celestial y1/y3; Spectral y4; Standard y6/y7; Buffoon y8. | `d68e8c3b01b567ac13066a26d95d33fa94120809dd3ba912604d122ab5ec1e63` |
| `resources/textures/2x/Vouchers.png` | 1278×760 | Atlas ya importado en `web/assets/vouchers`; catálogo32 y CSS existentes. | `bb9c4a21bb8b5b19c12c36ffb0da3848c0d0a52d0b68adbdf639e763569d30a8` |
| `resources/textures/2x/Tarots.png` | 1420×1140 | Consumibles; posición/atlas de cada centro está en `game.lua`, no inferirla por nombre traducido. | `83de7eb06d21a9c87096c3bfc611222933fc3834524703718fd64e3d4486f282` |

Arte Balatro © LocalThunk / Playstack, referencia local del asesor. El atlas no otorga cobertura de cálculo.

Archivos fuente inspeccionados, SHA256: `game.lua`=`bbc67bd3fbadd1ea3f3f0aba07ef8596118d89ff1e9758718f9e17c07a96e912`; `card.lua`=`5073d834e08119da9516f1795a8c3d93110669aeb409c29ad1b308e0eb0be453`; `functions/button_callbacks.lua`=`c88a74ca3a8fa8ace0ce46ad10a97238f347c292842c9164d11136fe9952c101`; `functions/common_events.lua`=`522ea0810101de1004685e13e7ed05a750b4e115e5231dca2cbc97aeb8c3e5fc`; `functions/state_events.lua`=`6c86aefb42d0323d737f87aaa84f53e42b755e72cd0bfd163b7d9cca5c0a99a9`.

La lectura estática de la build instalada permite verificar las reglas necesarias sin adoptar una fuente secundaria o una guía antigua. No fue necesario buscar otra fuente web para las constantes de esta nota.
