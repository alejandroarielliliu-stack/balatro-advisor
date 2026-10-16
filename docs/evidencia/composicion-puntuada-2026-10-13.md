# Investigación para puntuar la composición

Consulta: **2026-10-13**. Objetivo: una nota conjunta y barras por apartado, con los datos básicos de la Mesa. Alcance del producto: Steam PC **1.0.1o-FULL**, sin mods, hasta el jefe del ante 8 y dentro de la cobertura declarada. No se ejecutó Balatro en esta investigación, no se observaron partidas y no se calibró un modelo predictivo.

## Fuentes originales consultadas

Se leyó el texto accesible de las publicaciones siguientes, incluidas las respuestas del autor indicadas. Son fuentes primarias **de opinión estratégica**. No sustituyen la inspección del ejecutable para reglas y constantes. Las fechas relativas de Reddit no permiten acreditar una build concreta.

| ID | Autor y fuente directa | Hallazgo aprovechable | Límites y filtro |
| --- | --- | --- | --- |
| CP01 | autumnchiu, [My Complete Guide to Balatro](https://www.reddit.com/r/balatro/comments/1cjxgu4/my_complete_guide_to_balatro/), publicación de 2024. Secciones Economy, Game Plan, Vouchers y respuesta del propio autor sobre 1.0.1. | Distingue estabilización, ahorro, fuentes de puntuación y desarrollo. Los vales tienen utilidad distinta según el mecanismo: más manos, descartes, retención o acceso a consumibles. El autor presenta una ruta hasta ante 8, no Endless. | El autor reconoce que escribió antes de 1.0.1. Su rechazo general de planetas/sellos, ranking de vales, garantías y umbrales no se importan a 1.0.1o. Más dinero no acredita supervivencia. Los roles propuestos son un ejemplo, no una receta obligatoria. |
| CP02 | DrBoomMD, [How to Win Chips and Influence Mult](https://www.reddit.com/r/balatro/comments/1bbh75a/how_to_win_chips_and_influence_mult_a_thorough/), publicación de lanzamiento. Secciones Scaling, Economy y conclusión. | Contrasta crecimiento con aporte inmediato y subraya que la fuente de puntuación cambia las necesidades de la mano. La conclusión reconoce rutas alternativas y menor certeza sobre su tier de comodines aislados. | Efectos y dificultad antiguos: Stuntman +300, Vampire y Campfire, Gold y Orange no coinciden con el catálogo actual. No adoptar esos números, frecuencias de crecimiento, tasas de éxito ni el desprecio universal de color/escalera. |
| CP03 | Thelettaq, [I finished C++ so I made a tier list for almost everything](https://www.reddit.com/r/balatro/comments/1htnokj/i_finished_c_so_i_made_a_tier_list_for_almost/), respuestas del autor sobre criterio y Paint Brush. | Declara que sus preferencias son contextuales y combina utilidad al comprar con contribución percibida. El debate sobre tamaño de mano muestra que retener cartas o construir manos exige valorar material y forma de jugar. | Alcance declarado: Gold ante 8. Es criterio subjetivo, no dataset calibrado. Sus preferencias de parejas o de compra de vales no se convierten en una tabla universal para Blanca. No se transcribe la imagen del tier como puntuaciones. |
| CP04 | Chimeran, [Completionist++](https://steamcommunity.com/sharedfiles/filedetails/?id=3547802969), publicada 2025-08-12. Secciones Consistency, Checkered Jokers y Economy. | Ofrece una ruta distinta: Cuadriculada, niveles de color y sellos azules; Mimo depende del material de retención. Advierte del horizonte de solo ocho antes y del conflicto entre arreglar el mazo y añadir cartas. | Objetivo de stickers en Gold, no Blanca. Las afirmaciones de consistencia, preferencias de comodines y economía son opinión, no probabilidades. El aviso genérico de Steam sobre incompatibilidad no demuestra una regla. No se usan sus garantías de ganar ni anécdotas como resultados. |
| CP05 | Grgapm_, [A Guide to Scaling](https://www.reddit.com/r/balatro/comments/1cjyigp/a_guide_to_scaling/), secciones de fases, Addition Before Multiplication y Late Game; fuente ya registrada en META05/COMP04 y vuelta a consultar. | Explica por qué importa dónde se suma o multiplica Mult y por qué crecimiento requiere activaciones. Ayuda a separar aporte desarrollado de posibilidades futuras. | Mezcla Purple+ y Endless. No trasladar umbrales de puntuación, ratio obligatorio de espacios ni crecimiento por ronda a esta aplicación. La intuición sobre aportes relativos no calibra una nota. |

La consulta también encontró resúmenes de terceros y proyectos enfocados a Endless. Se descartaron como evidencia de la política de este producto. No se vio ningún video completo ni se empleó un calculador externo como observación del juego.

## Evidencia mecánica reutilizada

- [L02 y familias de composición](../composiciones.md): participantes, material físico, zona, orden y restricciones; una relación potencial no es una activación observada.
- [L05: interés y cobro](../cobro-automatico.md): interés condicionado al saldo pertinente y a la baraja; los topes de Seed Money y Money Tree no crean dinero. No copiar un cobro proyectado al estado registrado.
- [L06: vales](../vales.md): diez vales integrados para recursos/interés. Los otros veintidós permanecen de catálogo y no pueden aportar una bonificación automática.
- [CAT04 y catálogo](../catalogo-completo.md): efectos conocidos, edición, estado y límites de cobertura. Las descripciones y dibujos no acreditan implementación de una regla.
- [Índice de encaje](../indice-encaje.md): política editorial existente, separada de la puntuación de manos. Su precisión decimal no convierte diferencias pequeñas en decisiones óptimas.

Son inspecciones estáticas y contratos del software, **no nuevas comprobaciones en una partida**. Cada resultado debe conservar su evidencia y modo estricto cuando invoque reglas afectadas.

## Criterios editoriales propuestos

La propuesta siguiente es diseño propio deducido de las fuentes y de la cobertura. Las fuentes no publican ni validan estos cinco ejes, sus anclajes numéricos, un agregado global o pesos. Usar unidades de rúbrica comunes permitiría mostrar barras; no autoriza sumar dólares, puntos de mano y contadores como si fueran cantidades comparables.

| Apartado | Qué puede valorar sin inventar una mano | Datos pertinentes | Qué no debe inferir |
| --- | --- | --- | --- |
| Economía | Reserva actual, interés calculable y mecanismos de ingreso compatibles; costes o restricciones conocidos. | Dinero, baraja, ante/ciega, vales de interés, comodines económicos y contadores pertinentes. | $25 no es una regla universal de compra. Seed Money con saldo bajo no acredita ingresos máximos. Renta condicional no es dinero recibido. Ausencia de dinero no demuestra derrota. |
| Sinergias | Relaciones cuyos actores están presentes y cuyo soporte está documentado; conflictos concretos. | Inventario y orden, cartas actuales, mejoras/sellos, recursos y consumibles conocidos cuando proceda. | Número de relaciones no equivale a poder: varias pueden compartir el mismo material. Una relación potencial no está activa siempre. Mimo no repite Steel Joker. |
| Preparación del mazo | Proporción del material pertinente a los mecanismos elegidos y los recursos para utilizarlo, con deduplicación por carta. | Lista de cartas real o preset confirmado; rangos, palos, mejoras, sellos, debilitación; tamaño de mano y descartes compatibles. | Concentrar palos, reducir el mazo o tener mucho Acero no es bueno en toda construcción. No premiar rasgos sin un consumidor útil. Proporción no es probabilidad de robo ni consistencia de una mano. |
| Puntuación | Preparación de fuentes compatibles para la etapa, su soporte y aporte ya desarrollado. Si se usa esta etiqueta, debe identificarse como valoración, no fichas de una mano. | Comodines, contadores de puntuación, niveles/bases conocidos, cartas actuales, orden y baraja. | Un grupo de roles no prueba superar la ciega. No exigir siempre un joker de fichas, uno de +Mult y uno de XMult: cartas, niveles o Plasma cambian las fuentes. Sin mano/plan no hay puntuación exacta ni diagnóstico de supervivencia. |
| Crecimiento | Mecanismos de desarrollo, habilitadores actuales, restricciones y oportunidades según recursos y horizonte hasta ante 8. | Ante/ciega, recursos, contador actual, eventos que lo aumentan, cartas o consumibles necesarios, ingresos disponibles cuando el crecimiento cuesta dinero. | Más manos permiten oportunidades; no garantizan que se usen sin perder. Planetas generados o niveles ganados no equivalen a planetas usados. Un contador de progreso no es potencia acumulada. Un escalador nuevo tarde difiere del mismo ya desarrollado. |

Una nota conjunta debe ser **índice editorial de preparación**. El agregado debe publicar su política centralizada y conservar los resultados por apartado. Un valor alto en economía no puede presentarse como compensación demostrada de una carencia de puntuación. No existe evidencia aquí para porcentajes de victoria o confianza ni umbrales «ganador/perdedor».

Si falta un dato pertinente, el apartado conserva `null` o un rango explícito. Un desconocido no vale cero y tampoco es un beneficio. No renormalizar silenciosamente los apartados disponibles para fabricar una nota global comparable a otra con cobertura completa. El visor puede ser compacto: número y barras, con estado parcial accesible; la ausencia de texto permanente no justifica ocultar incertidumbre.

## Casos para comprobar la política

Son oráculos de dirección y restricciones, no puntuaciones óptimas ni observaciones del juego. Los valores exactos que implemente la rúbrica deben documentarse por separado y probarse contra su especificación.

| Caso mínimo | Comportamiento que debe conservar |
| --- | --- |
| Barón con cero reyes conocidos; luego cuatro reyes básicos y ningún Acero | Sin soporte en el primer estado; soporte condicionado en el segundo. Barón necesita reyes retenidos, no exige Acero. No asignar activación segura a cuatro reyes de un mazo grande. |
| Mimo/Barón con reyes de Acero; añadir Brocha compatible | Tamaño de mano mayor modifica la preparación de retención si la política la contempla; no suma una carta retenida ficticia ni multiplica una mano inexistente. |
| Fotografía/Chad en Abandonada sin figuras; luego una figura añadida | El primer estado carece del material. El segundo tiene soporte escaso, no una garantía ni el mismo grado de preparación que un mazo de figuras. |
| Holograma con ADN frente a Holograma sin fuente de cartas | Reconocer habilitador de crecimiento y coste de primera mano. No incrementar contador ni añadir cartas por consultar. |
| Constelación con un sello azul/Mimo, hueco desconocido y ningún planeta usado registrado | Identificar mecanismo condicional. No atribuir uso, crecimiento ni generación completada. Más niveles por Burnt tampoco acreditan planeta usado. |
| Saldo $20 con y sin Seed Money | No asignar interés máximo del vale ni crear dinero. El mismo saldo usa el cálculo de H2 si está permitido. Una diferencia editorial por capacidad futura debe estar declarada como potencial. |
| Golden con ronda no evaluada | Distinguir ingreso condicionado de saldo presente. No aplicar recompensa/manos/Golden al saldo real ni deducir recursos sobrantes. |
| Grabber con Green y contadores conocidos | Reconocer oportunidad adicional si procede; no sumar +1 Mult hasta confirmar una mano jugada. Ante 8 debe conservar el aporte ya desarrollado. |
| Mazo desconocido con Barón/Mimo | Apartados afectados parciales o desconocidos; no sustituir por mazo estándar ni afirmar cero reyes/Acero. |
| Construcción Plasma | Mantener el tratamiento específico o limitar el eje de puntuación; no imponer balance convencional entre fichas y Mult. |
| Vales de catálogo no integrados | Cobertura explícita; no asignar mejoras de economía, sinergia o preparación por su nombre o cantidad. |
| Dinero aumentado, actores/material idénticos | Puede cambiar economía y las fuentes realmente dependientes de dinero. No cambiar todas las barras indiscriminadamente. |

La evaluación exacta de una mano o plan continúa en Análisis. Esta investigación no añade Monte Carlo, frecuencias de manos, rutas de robo, un objetivo de Endless ni nuevas condiciones de desbloqueo.
