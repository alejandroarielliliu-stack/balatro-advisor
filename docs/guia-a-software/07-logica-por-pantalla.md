# Cómo aplicar la guía en Balatro Advisor

Revisión del 9 de noviembre de 2026. El objetivo principal es ayudar a ganar hasta el ante 8 con una partida compatible. La guía revisada aporta los criterios estratégicos. El motor comprueba las operaciones, los precios y los efectos que puede calcular. La interfaz muestra el consejo **mientras el jugador todavía puede actuar**.

## 1. Dónde va cada decisión

| Momento | Qué sabe el asesor | Qué debe hacer el Joker | Cómo continúa la partida |
| --- | --- | --- | --- |
| **Nueva partida** | Baraja, apuesta elegida y semilla opcional. Hoy se puede iniciar con apuesta blanca y una baraja compatible. | Explicar la condición inicial de la baraja. La semilla es una referencia para el jugador. | Jugar crea una partida. Navegar por las opciones o volver conserva la anterior. |
| **Continuar** | La copia guardada, su fase y sus datos conocidos. La mejor mano carece de un campo de registro. | Mostrar ronda, ante, dinero, baraja y apuesta. Representar con «—» un dato ausente. | Reanuda ciegas, cobro, tienda o sobre abierto; otras fases conducen a Mesa. Reanudar no cobra ni reinicializa. |
| **Elegir ciega** | Objetivo y premio, etiqueta y jefe observados, dinero, inventario, recursos y cola de etiquetas cuando se conocen. | Comparar jugar con saltar **antes de Seleccionar**. Jugar conserva la oportunidad de cobrar y comprar si se gana; saltar sacrifica esa oportunidad a cambio de la etiqueta. El jefe obliga a jugar. | Seleccionar registra la entrada y muestra el cobro. Saltar, una vez confirmado, avanza directamente a otra selección. |
| **Cobro** | Importe ganado que introduce el usuario y cambios de los Jokers que realmente posee, identificados por copia. | Solicitar solo lo que pudo cambiar. Con saldo conocido, sumar el cobro una vez. Si el saldo previo era desconocido, corregirlo en Mesa cuando sea necesario para comparar compras. | Siguiente registra el resultado y abre la tienda. Una derrota o completar el jefe final lleva al resultado correspondiente. |
| **Tienda** | Ofertas y precios transcritos, dinero disponible, material actual y amenaza siguiente. | Comparar conservar, comprar y, cuando sea calculable, vender o reemplazar. Explicar el aporte actual, qué se sacrifica, cuánto dinero queda y qué condición cambiaría el consejo. | Pulsar una oferta abre su detalle. Solo registrar la operación realizada cambia la partida. Renovar requiere las ofertas nuevas observadas. |
| **Sobre cerrado** | Familia, tamaño, precio y saldo que quedaría. El contenido aún no se conoce. | Evaluar si gastar ese dinero tiene sentido incluso si no sale una carta útil. La política capaz de preferir un sobre cerrado sigue pendiente. | Abrir un sobre compatible registra el pago una vez. Buffoon, Celestial y Arcana tienen operaciones de apertura; el catálogo también muestra familias con cobertura pendiente. |
| **Sobre abierto** | Opciones que realmente aparecieron, elecciones restantes, huecos, mano o blancos confirmados cuando hacen falta. | Comparar esas opciones. Un Mega puede seguir abierto después de una elección. Omitir requiere que el jugador lo haya hecho. | Desde tienda o Continuar, se abre el editor del sobre en Mesa. Al terminar u omitir vuelve a la tienda de origen. Si el usuario trabaja directamente en Mesa, conserva esa vista. |
| **Siguiente ronda** | Ciega que originó la tienda y ciega que viene después. Pueden estar en distintos antes. | Valorar una compra frente al próximo objetivo. Tras el jefe del ante 1, la tienda corresponde al ante 1 y el siguiente objetivo es la pequeña del ante 2. | Baja la tienda y suben las ciegas. El inventario continúa; jefe y etiquetas nuevos se observan cuando aparecen. |
| **Colección y Análisis** | Catálogo, reglas documentadas y, solo en Análisis, escenarios que el jugador declara. | Usar Colección para consultar una carta y Análisis para calcular una mano o un plan concreto. Encontrar un Joker en Colección no significa poseerlo. | Consultar, comparar y probar un escenario dejan intacta la partida. |

## 2. Cómo se convierte un párrafo en una regla

**Primera regla de salto implementada (10 de noviembre).** Con Economía, el Joker compara el ingreso inmediato con los cobros posibles si se gana la ronda. Por ejemplo, en la pequeña del ante 2 con baraja azul, apuesta blanca y $40, saltar deja $80. Ganar con una mano deja $52 si el saldo no cambia durante la ronda. Cuando incluso el mejor cobro calculado queda por debajo del salto, «Valorar la próxima ciega» pregunta si puedes afrontarla prescindiendo de esta tienda y del crecimiento de esta ronda. Si respondes que sí, el Joker recomienda saltar. Si necesitas comprar, recomienda jugar para acceder a la tienda al ganar; si además vas justo, explica el riesgo de ambas alternativas. La pregunta solo aparece cuando se conocen los datos pertinentes y los efectos de la ronda admiten esta comparación.

Para cada consejo se conservan el **pasaje de la guía**, el **momento de decisión**, los **hechos necesarios**, la **operación legal**, el **motivo** y un **contraejemplo**. Una regla del juego puede calcular un coste o una puntuación. Una preferencia de la guía necesita explicar bajo qué condiciones resulta útil. Si falta un dato decisivo, el Joker plantea la pregunta concreta o presenta el intercambio.

| Pasaje de la guía revisada | Aplicación en el flujo | Caso que limita la recomendación |
| --- | --- | --- |
| XII-007 a XII-013 · árbol de tienda | Identificar primero qué falla en la composición. Comparar el efecto que funciona con el mazo actual, el coste y las alternativas. Ofrecer conservar como acción. | Si dos opciones resuelven problemas distintos y no hay base para ordenarlas, explicar qué situación favorece a cada una. |
| XII-014, XII-020 y XII-021 · primer refuerzo | En los primeros antes, una aportación inmediata de Mult puede justificar comprar con inventario vacío. Un Joker base y Abstract permiten una comparación acotada de Mult propio y coste actual. | Un plan que ya supera la ciega conservando dinero, una edición, un alquiler o material distinto pueden invertir la preferencia. El episodio de una semilla no establece una tasa de victoria. |
| XII-060 · cinco huecos ocupados | Antes de recomendar un reemplazo, identificar **qué copia se vende**, su valor actual, la función perdida y el saldo tras ambos pasos. | Con inventario lleno, una compra directa y «vender A para comprar B» son acciones distintas. Un Joker eterno no se trata como vendible. |
| XII-067 y XII-075 · salto y transición de ante | Comparar Economía con el cobro condicionado y la visita perdida. Evaluar Grabber comprado tras el jefe contra las manos disponibles en la próxima ciega. | Una etiqueta diferida no incrementa el saldo de hoy. El ante escrito en el vale no define el objetivo contra el que se prepara la compra. |
| XIII-012 y XIII-025 · sobre y jefe | Presupuestar el resultado malo del sobre. Para The Needle, evaluar la única mano permitida si se han registrado las cartas y reglas necesarias. | Un sobre cerrado no garantiza la carta buscada. La puntuación estimada de una mano no demuestra que se pueda robar. |
| XIII-006 y XIII-032 a XIII-037 · orden de los efectos | Un aviso sobre Perkeo corresponde a **antes de salir de tienda**; uno sobre Burglar, a **antes de seleccionar**. Avisos sobre primera jugada, descarte o cierre deben poder consultarse antes de entrar en la ronda. | Al cobrar ya es tarde para sugerir mover una copia, vender un alquiler dentro de la ronda o reservar una carta para un efecto de cierre. Ahí se registra lo que ocurrió. Estos avisos específicos quedan en G06b. |

**Ejemplo comprobable.** Con inventario vacío, un Joker base por $2 y Abstract base por $4, el primero aporta +4 Mult propio frente a +3 de Abstract con ese inventario. El asesor ya puede distinguirlo como refuerzo para ese momento. Si también hay un sobre por $4, sigue siendo preferible entre esos dos Jokers según ese criterio; el sobre podría cambiar qué conviene hacer con el dinero. Si desaparece el precio del Joker, desaparece la marca. El verde nunca compra una carta.

## 3. Qué partes de la guía alimentan cada módulo

| Partes | Destino y uso |
| --- | --- |
| I, V y VI · fundamentos, cálculos y atlas | Catálogos y motor para reglas, eventos y cifras. Que una carta tenga ficha no certifica que todas sus interacciones sean calculables. |
| II, III y XI · composiciones, casos y decisiones | Política contextual y casos de contraste. Una composición orienta qué buscar en el inventario y mazo actuales; no asigna un puesto universal a cada Joker. |
| IV y VII · catálogos, etiquetas, retos y progreso | Consulta en Colección; efectos utilizables según perfil y operación. La colección visual ya existe. Ganar retos, llevar desbloqueos y modelar otras apuestas son trabajos diferentes. |
| XII y XIII · partida a ante 8, decisiones difíciles y ejecución | Prioridad de implementación. Alimentan ciegas, tienda, presupuesto de sobres y recordatorios por evento. |
| VIII, IX, X y XV · estudio, vídeos y trazabilidad | Explicaciones, procedencia y diseño de casos. No asignar pesos a una compra por el número de vídeos que la mencionan. |
| XIV · Endless y naneinf | Objetivo opcional con horizonte, recursos y aritmética propios. Mantenerlo fuera del recorrido para ganar el ante 8. |

## 4. Estado y siguiente entrega

**Ya conectado.** Desde el globo del Joker se puede abrir «Comparar jugar o saltar» antes de seleccionar y declarar «Voy justo». La respuesta modifica la orientación de esa revisión y no se guarda. En tienda, el consejero y la marca de compra consumen el mismo informe rápido. «Orientar mi compra» permite declarar puntuación, economía o ahorro para esa decisión. La guía prioriza un primer efecto de puntuación preparado en los antes iniciales frente a ingreso futuro. Con un objetivo de búsqueda y presupuesto de compra, puede recomendar una renovación si las cartas evaluadas no atienden esa necesidad y queda la reserva indicada. El precio visible, incluido $0, se puede registrar antes de renovar. La marca verde identifica una compra compatible preferida según ese objetivo; el contorno discontinuo con «?» indica otras ofertas pendientes. La escena y Mesa comparten el objetivo hasta que cambia la revisión. Abrir, reanudar y resolver un sobre desde el recorrido guiado devuelve al usuario a la tienda.

**Primero, consolidar la decisión de tienda (G01a → G01b → G01c).** Usar un único informe para el Joker, el detalle de Mesa y los escenarios opcionales de Análisis. Hoy el detalle puede ejecutar una consulta distinta con escenarios; la marca actual solo cubre la comparación rápida de Jokers. Lo comprobaremos con estos casos.

1. Ante inicial, cero Jokers y un refuerzo legal: explicar la compra, su aporte propio y el dinero restante. Variar precio, inventario o edición y volver a evaluar.
2. Si un plan explícito revela un intercambio entre ganar con menos manos y conservar más dinero, mostrar ese intercambio. La regla de apertura no debe desempatarlo.
3. Conservar puede ser la mejor acción global aunque una oferta sea la mejor compra del grupo evaluado. Distinguir esas respuestas en el mismo informe. Si no se puede justificar una preferencia, dejar las ofertas sin marca.
4. Un cambio de precio, inventario, tienda, escenario o política invalida la conclusión anterior. Una consulta o un borde verde nunca confirman una acción. Ninguna mano, semilla ni probabilidad estimada es requisito del consejo rápido.

**Después**, ampliar reemplazos y sacrificios (G02), otras cartas y sus objetivos (G03), economía y crecimiento aprovechable antes de la amenaza (G04–G05), avisos por evento y jefes (G06), y presupuesto comprobado de sobres cerrados (G07a). Validar con jugadores que entienden cuándo una oferta está destacada y cuándo conviene ahorrar (G08a). Cada ampliación entra con un ejemplo y un contraejemplo; una prueba de navegación verifica el flujo, no la fuerza de una estrategia.

## Referencias de implementación

- La fuente local es `docs/referencias/guia-balatro/GUIA_MASIVA_BALATRO_REVISADA.txt`. El mapa `indice.json` identifica 912 unidades de sus 15 partes, incluidas 329 fichas de catálogo. Los IDs de esta revisión remiten a ese mapa. `PLAN_MAESTRO.md` mantiene el orden y las dependencias completos.
- Las decisiones sobre ciegas se calculan en [orientación jugar/saltar](../../src/advisor/blind-guidance.ts); la confirmación del avance y el cobro usan [progreso de la partida](../../src/run/progress.ts).
- La [comparación de compras](../../src/advisor/shop-comparison.ts) proporciona los datos del [resumen y la marca](../../src/ui/shop-advice-summary.ts). El [editor del sobre](../../src/ui/pack-view.ts) usa las opciones observadas.
