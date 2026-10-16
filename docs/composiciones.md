# Composición de la construcción

`inspectCompositions(state, candidateArtId, replacementId?)` en [composition-signals.ts](../src/advisor/composition-signals.ts) describe relaciones concretas entre el candidato, los comodines conservados y el mazo actual. Es una inspección determinista e inmutable, sin manos de prueba, robos, generación aleatoria ni transacciones. No calcula puntuaciones, ingresos futuros, consistencia ni probabilidades de victoria.

## Contrato

La entrada es un `GameState` estructuralmente válido, previamente validado por el consumidor. Los IDs del inventario se traducen al ID de arte mediante `ALL_JOKER_FACTS`; se excluye la instancia identificada por `replacementId` y se incorpora el candidato al conjunto hipotético. La consulta no demuestra que su compra o venta sea legal: esa comprobación corresponde a H2. Una instancia poseída también puede inspeccionarse sin inventar crecimiento; estas relaciones no cuentan duplicados ni copian contadores.

La salida es `FitSignal[]`, con `id`, `kind` y `text`. Los IDs estables comienzan por `composition-`. Solo se describen familias relacionadas con el candidato; no se enumera toda la biblioteca de combos. Inventario desconocido produce `composition-inventory`, sin inventar compañeros. Un identificador que no pertenece al catálogo no produce señales.

- **`potential`:** existe el material físico requerido en el mazo conocido y están los participantes; todavía faltan la mano, retención, evento u orden. Las relaciones que generan cartas, como ADN/Holograma, identifican un mecanismo condicionado al evento, sin requerir que ya exista la carta futura.
- **`heuristic`:** falta información para comprobar el soporte, o se explica una distinción que no demuestra un conflicto de toda la construcción. No acredita una sinergia positiva.
- **`conflict`:** una condición conocida falta o dos mecanismos compiten. El texto identifica la relación afectada; no significa que el comodín sea inútil en todas sus demás funciones ni que deba venderse.

No hay una bonificación numérica en este helper. Su consumidor decide cómo presentar estas señales en su política publicada. No acumular relaciones como si sus beneficios fueran independientes ni convertir varios textos en puntos de una mano.

Un conflicto entre actores que ya estaban presentes no se atribuye automáticamente al candidato. Por ejemplo, añadir Cumbre Mística a Ladrón/Estandarte puede favorecer su condición, aunque el texto conserve el aviso sobre Estandarte; la señal de esa consulta sigue siendo potencial. Pareidolia solo se relaciona con la familia de Cristal o corazones cuando acompaña una repetición de figuras que pueda habilitar, no cuando el único repetidor existente es Hack. Perkeo no recibe soporte de Tarot o planeta por una relación preexistente sin tener un consumible correspondiente que copiar.

## Composición y zonas

Se usa la lista actual de cartas transcritas. El preset `standard52-unmodified` solo se expande cuando está declarado como conocido y la baraja registrada tiene composición inicial estándar. No se convierte Abandonada, Cuadriculada o Errática en 52 cartas normales, ni se genera un mazo por el nombre de la baraja. Las listas explícitas prevalecen sobre su composición inicial: una Abandonada puede haber adquirido figuras posteriormente.

Los recuentos de material que debe activarse excluyen cartas debilitadas. Los requisitos de rango no se satisfacen con Piedra ni con Pareidolia: esta última cambia la condición de figura, no convierte una jota en rey ni una figura en un cuatro. La condición de figura sí incluye las cartas consideradas figuras por Pareidolia, conforme a la inspección estática y las pruebas del motor, también cuando su mejora es Piedra. Un recuento de mazo completo, como Piedra para Stone Joker o el tamaño de Erosión, conserva todas las cartas pertinentes.

Tener una carta en el mazo no prueba que se robe, puntúe o conserve. **Retenida al puntuar**, **puntuada**, **retenida al cierre**, **mazo completo** y **carta añadida** se mantienen como condiciones distintas. Los sellos no se confunden con mejoras. No se deduce el orden de las cartas jugadas ni se declara ejecutada una selección de ciega.

## Familias y casos comprobables

Las primeras 16 familias se amplían con la relación de sello azul solicitada durante la implementación. Son 17 familias explícitas; no constituyen una búsqueda exhaustiva de composiciones.

| ID después de `composition-` | Predicado y dato que se comprueba | Condición que sigue faltando / caso negativo | Respaldo |
| --- | --- | --- | --- |
| `mime-steel-baron` | Mimo y Acero, o Mimo con Barón y reyes reales. Cuenta la unión de cartas elegibles; un rey de Acero no se cuenta como dos cartas. | Hay que robar y retener las cartas al puntuar. Barón no sirve para cualquier figura y Mimo no repite Steel Joker. | SYN01 `mime-steel`, `baron-mime`, `steel-king-mime`; L02. |
| `mime-blue` | Candidato Mimo y al menos un sello azul conocido. | Retenerlo al cierre, última mano y hueco en cada intento. Un hueco no acredita dos planetas. | SYN01 `mime-blue`; L02. |
| `photo-chad` | Fotografía y Chad; figuras físicas o habilitadas por Pareidolia. | La primera carta puntuada debe ser también la primera figura puntuada. Una figura posterior no basta. Sin figuras conocidas, el soporte de esta relación falta. | SYN01 `photo-chad`; L02; catálogo de Pareidolia. |
| `wee-hack` | Wee y Hack con doses elegibles. | Los doses deben puntuar y el contador desarrollado necesita utilidad posterior. Treses, cuatros y cincos no desarrollan Wee. | SYN01 `hack-wee`; catálogo. |
| `dna-hologram` | ADN y Holograma. No exige poseer una mejora particular. | Primera mano legal de una carta. No se añade una copia ni crecimiento; la mano y posible dilución son costes. | SYN01 `dna-hologram`; catálogo. |
| `erosion-addition` | Erosión con **ADN o Mármol**, sin exigir ambos. Tamaño inicial declarado y tamaño actual, cuando se conocen. | Añadir cartas compite con reducción del mazo; los tamaños desconocidos no se sustituyen por 52. La tensión no prohíbe aprovechar otros beneficios. | SYN01 `erosion-dna-conflict`; catálogo. |
| `marble-stone-hologram` | Mármol con **Stone Joker o Holograma**. Recuento de Piedra del mazo completo. | Selección real de ciega con actores activos. No se agrega la Piedra futura; Stone Joker no exige puntuarla. | SYN01 `marble-stone`; catálogo de Holograma. |
| `glass-retriggers` | Cristal conocido y candidato relacionado con Chad, Hack, Sock and Buskin, Dusk, Seltzer o su habilitador Pareidolia. Cuenta solo Cristal compatible con los repetidores presentes. | Primera carta, rangos bajos, figura, última mano o duración de Seltzer según el actor. Repetir puntuación no prueba cuántas comprobaciones de rotura ocurren. No se propone una construcción de Cristal cuando no hay ese material. | SYN01 `chad-glass`; L02; catálogo de los repetidores. |
| `hack-walkie` | Hack y Walkie Talkie; intersección real de rango **4**. | Puntuar cuatros. Dieces de Walkie no son repetidos por Hack. | Catálogo 1.0.1o de ambos. |
| `tarot-development` | Fortune Teller y fuente de Tarot compatible o inventario pertinente. Distingue historial de Tarots usados de consumibles poseídos; comprueba huecos conocidos para generaciones que los exigen. | Historial/capacidad desconocidos se indican. Generar o copiar un Tarot no equivale a usarlo. Los generadores tienen condiciones distintas de saldo, ciega, mano, sobre o azar. | Catálogo de Fortune Teller, Cartomancer, Vagabond, Superposition, Hallucination, 8 Ball y Perkeo. |
| `planet-development` | Constellation con planetas, Astrónomo, copia de Perkeo o sello azul/Mimo pertinentes; distingue historial y disponibilidad. | Usar un planeta realmente. Un nivel obtenido por otra vía no acredita ese uso; Astrónomo no crea una oferta. Generación azul requiere cierre, última mano y capacidad. | Catálogo; SYN01 `mime-blue`; L02. |
| `bloodstone-hearts` | Heliotropo con corazones elegibles; Smeared puede habilitar diamantes, y se cuenta material compatible con las repeticiones presentes. | Robar, puntuar, cumplir la condición del repetidor y resolver el azar. No se deduce un color jugable ni un éxito. Oops también puede afectar azar perjudicial. | SYN01 `bloodstone-smeared`, `bloodstone-oops`; catálogo. |
| `pareidolia-bus` | Pareidolia y Ride the Bus. | Figuras puntuadas compiten con la secuencia del Bus. Sin una mano no se registra un reinicio ni se modifica su contador. | Catálogo 1.0.1o de ambos. |
| `burglar-discards` | Ladrón y alguno de Estandarte, Cumbre Mística, Burnt, Green o Ramen. | Seleccionar la ciega. Cero descartes favorece Cumbre, quita soporte a Estandarte e impide el primer descarte de Burnt. Más manos no prueba cuántas se jugarán. | SYN01 `banner-burglar-conflict`, `green-burglar`; catálogo de Summit, Burnt y Ramen. |
| `gold-zones` | Golden Ticket y/o Mimo con Oro pertinente. Se cuenta la **mejora Oro**, separada del sello dorado. | Ticket necesita puntuar; Mimo necesita retener al cierre. No se suman automáticamente ingresos de la misma carta en zonas distintas. Un sello dorado por sí solo no respalda Mimo. | SYN01 `mime-gold`, `mime-gold-seal-false`; L02; catálogo de Golden Ticket. |
| `midas-vampire` | Midas y Vampiro, figuras conocidas o habilitadas por Pareidolia. | Midas antes de Vampiro y cartas que puntúen. Se consumen mejoras y el orden inverso cambia el resultado; no se transforma el mazo aquí. | SYN01 `pareidolia-midas-vampire`; L02. |
| `hack-fibonacci` | Hack y Fibonacci; intersección real **2, 3, 5**. | Puntuar la intersección. Ases y ochos no son repetidos por Hack; cuatros no activan Fibonacci. | SYN01 `hack-fibonacci`; catálogo. |

Los casos positivos y negativos de la tabla son oráculos documentales para las condiciones de composición; no se obtienen ejecutando este helper ni representan decisiones óptimas. Cambiar únicamente el material pertinente, quitar un actor mediante `replacementId` o marcar mazo/inventario desconocido permite contrastar esos predicados sin fabricar una mano.

## Evidencia y límites

Los efectos se apoyan en el catálogo local de **Steam PC 1.0.1o-FULL sin mods**, la biblioteca [SYN01](sinergias.md), su [inspección estática L02](evidencia/sinergias-l02.md) y la [cobertura CAT04](catalogo-completo.md). Las familias nuevas cruzan efectos explícitos del catálogo; no se interpretan sus descripciones con expresiones regulares ni se convierten listas de participantes en condiciones automáticas. Las pruebas de figuras/Pareidolia siguen la implementación del motor respaldada por la inspección local.

Esta entrega **no aporta observaciones nuevas de una partida de Balatro**. Tampoco resuelve todos los jefes, stickers, ediciones, copias, duraciones, órdenes, consumibles, objetivos variables o cartas modificadas. Una señal positiva es soporte condicionado; las excepciones y la legalidad deben preservarse en el análisis que la consume. El meta de comunidad orienta [criterios estratégicos](meta-estrategico.md), pero no es una fórmula ni una tabla universal importada para estas composiciones.
