# Índice de preparación de la composición

`evaluateComposition(state, {ante?})` en [composition.ts](../src/advisor/composition.ts) devuelve la lectura de **la construcción registrada**. No incorpora candidatos, estados finales de escenarios, robos hipotéticos ni ingresos proyectados. Es puro: valida con H1, trabaja sobre su copia, reutiliza los encajes de comodines poseídos y las familias de [composición](composiciones.md), y no guarda ni ejecuta una acción.

La interfaz presenta **un índice global y seis barras**. Pulsarlos abre sus motivos y límites; el formulario de manos sigue en Análisis. Esta entrega responde a la petición de resumir economía, sinergias y preparación sin convertir Mesa en una guía. No proporciona una puntuación exacta de mano, una probabilidad de victoria ni un diagnóstico de supervivencia.

## Plan y decisiones

1. Mantener separados los datos actuales y los candidatos.
2. Definir apartados con unidades editoriales explícitas, sin sumar directamente dólares, fichas, Mult y contadores.
3. Reutilizar perfiles y predicados existentes; no importar tiers por rareza ni inventar reglas de juego.
4. Representar datos desconocidos por intervalos, condiciones imposibles por cero y apartados sin mecanismo pertinente por «No aplica».
5. Conectar el índice en vivo a mazo, etapa, comodines, recursos y vales registrados; sin necesidad de guardar o configurar una mano.
6. Contrastar oráculos contractuales, separación de candidatos, inmutabilidad, desconocidos y registro de vales; revisar escritorio y móvil.

La [investigación](evidencia/composicion-puntuada-2026-10-13.md), el [meta existente](meta-estrategico.md) y las condiciones mecánicas del catálogo respaldan **qué aspectos considerar**. No justifican estadísticamente estos números ni pesos. La política `composition-1` es editorial y permanece sin calibración empírica de eficacia estratégica.

## Contrato

`CompositionReport` conserva material, roles, encajes individuales, fortalezas, carencias, prioridades, familias, vales, limitaciones y errores para las explicaciones. Añade:

- `sections`: Puntuación, Economía, Sinergia, Mazo, Crecimiento y Recursos, con ID estable, valor, intervalo, estado, motivos e IDs de reglas editoriales.
- `global`: valor, intervalo, estado, pesos realmente usados y motivos.
- `value: null`: falta información para afirmar un valor único; no es cero.
- `range: [mínimo, máximo]`: límites de la política con esos datos, **no un intervalo de confianza**. Un máximo `null` queda abierto.
- `status: known`: se conocen los datos usados por la fórmula editorial. No significa regla observada en partida ni modelo validado.
- `status: partial`: hay una dependencia desconocida o un efecto pertinente pendiente de integración.
- `status: not-applicable`: no existe un mecanismo pertinente registrado para ese apartado. Se excluye de la media y se muestra como «No aplica».

Un estado estructuralmente inválido devuelve errores y ninguna barra calculada. No infiere cartas por el nombre de una baraja: solo expande un preset estándar expresamente conocido y compatible con ese mazo. Errática desconocida conserva material desconocido. Cartas debilitadas se excluyen del material activable; los recuentos de mejora Acero, Oro, sello azul y Piedra del mazo completo permanecen separados. Pareidolia puede habilitar figuras, pero no convierte una carta en rey o reina; el resumen de figuras es físico.

## Política numérica

Los parámetros viven en [composition-policy.ts](../src/advisor/composition-policy.ts). El índice es abierto, con un decimal. **100 es una referencia visual para llenar la barra, no un máximo.** Un resultado130 se conserva; solo el ancho de la barra se limita a100. Los números son unidades de preparación de esta política.

Sea `F(j)` el índice individual de un comodín poseído, sin compra hipotética; `P(j)` su eje de preparación de0 a3. Si la condición está indisponible, su contribución a estos apartados es0, aunque el encaje individual conserve su tope editorial. No se suma la nota de todos los comodines.

| Apartado / reglas | Cálculo editorial | Interpretación y límite |
|---|---|---|
| Puntuación — `C-SCORE-MAX`, `C-SCORE-COVERAGE` | Mayor `F(j)` respaldado entre fichas, Mult, XMult y repetición, más10 por tipo adicional respaldado entre esos cuatro. | Lee preparación de efectos, no una mano. Los otros tipos dan cobertura editorial; ninguna construcción está obligada a tener los cuatro. Un comodín indisponible no aporta diversidad. Plasma conserva el desconocimiento de su balance. |
| Economía — `C-ECON-RESERVE`, `C-ECON-EFFECT` | `70 × min(1, max(0, dinero)/25) + 0.30 × max F(j económico disponible o condicionado)`. Sin efecto económico, el segundo término es0. | $25 es referencia editorial de reserva, no un umbral universal ni un cálculo de intereses. No se añaden ventas futuras, cobros, deuda disponible ni descuentos hipotéticos al saldo. Verde y vales de interés no cambian por sí solos este saldo. |
| Sinergia — `C-SYN-SUPPORT`, `C-SYN-CONFLICT` | `max(0, 100 × Σ(P(j)/3)/N − 50 × C/N)`. `N` es el inventario físico completo; la suma cuenta una vez cada instancia participante de familias positivas, y `C` las instancias con conflicto pertinente. Inventario vacío:0. | Mide cohesión de la composición registrada. Añadir un comodín independiente puede bajar esta barra mientras mejora otra; no demuestra empeorar la partida. No apila nombres de combos ni cuenta un rey de Acero dos veces. Una relación positiva mantiene sus condiciones de uso, orden y retención. |
| Mazo — `C-DECK-PREPARATION` | `100 × media(P(j)/3)` solo para los efectos poseídos que necesitan material de cartas. | Soporte de palos, rangos, figuras, mejoras, retención o patrones compatibles; también Barón, Mimo, Hack, Walkie, Triboulet, Fotografía, Driver's License, Stone y Steel Joker. Sin esos requisitos: «No aplica». No estima probabilidades de robo ni consistencia real. |
| Crecimiento — `C-GROWTH-CURRENT`, `C-GROWTH-HORIZON` | Mayor `F(j)` de un perfil de crecimiento disponible o condicionado. Para Green, Runner, Square, Trousers, Bus o Wee, añadir `10 × max(0, manos−4)/4 × (8−ante)/7` si existe uno compatible. | Conserva el contador registrado. El extra de manos es oportunidad editorial de activación, sin acreditar crecimiento futuro. No aparece si la condición es indisponible. Sin mecanismo de crecimiento: «No aplica». Más contador no garantiza aprovecharlo; las condiciones individuales permanecen en sus motivos. |
| Recursos — `C-RESOURCE-CURRENT` | `100 × (0.40×manos/4 + 0.20×descartes/3 + 0.25×tamañoMano/8 + 0.15×huecos/5)`. | Usa recursos actuales transcritos una sola vez. Referencias y pesos son editoriales; un recurso disponible no garantiza que se utilice ni que la ronda se gane. No reconstruye compras de vales o eventos pasados. |

El **global** es la media con igual peso de los apartados aplicables. Un apartado desconocido permanece en el denominador y aporta un intervalo; no se elimina para inflar la nota ni se sustituye por0. Se redondea cada apartado a un decimal y luego la media a un decimal. Los pesos devueltos muestran el denominador usado.

Esta media favorece una lectura compacta, pero cambiar qué apartados son aplicables también cambia el denominador. **No usar su diferencia como una orden de comprar o vender.** Sinergia puede bajar al añadir un efecto independiente útil. No maximizar una barra aisladamente ni interpretar un índice global superior como mayor probabilidad de ganar. La eficacia de esta política necesita evaluación posterior con estados y decisiones contrastadas.

## Comodines, mazo y vales

Solo se inspeccionan miembros del inventario actual. Las familias deduplicadas reutilizan `inspectCompositions` y sus condiciones; el candidato no se incorpora a esa lectura. La familia Ladrón/descartes penaliza a Ladrón y a los componentes que pierden ese soporte, sin atribuir el conflicto de Estandarte a Green o Ramen.

Los32 vales pueden describirse cuando aparecen en `observed.outOfScope.value.vouchers`; el nombre histórico del campo no convierte su efecto en implementado. Los10 vales de [recursos y economía](vales.md) conservan su cobertura H2; los22 restantes reciben anotaciones documentales y límites. El informe no suma otra vez Brocha, Agarrador ni Antimateria a los recursos actuales.

- Brocha/Paleta: oportunidad de retención de Mimo, Barón o reinas; no una activación ni una carta robada.
- Agarrador/Nacho: más oportunidades compatibles de desarrollo; usar manos también consume duración o aporte de efectos temporales.
- Desperdiciador/Reciclomancia: selección o activaciones de descarte. Ladrón puede eliminar esos recursos; usarlos puede reducir Green/Ramen o impedir Delayed Gratification.
- Siembra dinero/Árbol: capacidad de ahorro condicionada al saldo de cierre y reglas económicas; no ingreso proyectado. Verde no cobra interés por adquirirlos.
- En blanco: no mejora actual ni bono por ser requisito de Antimateria.
- Mercaderes, magnates y Telescopio: acceso futuro no equivale a consumibles poseídos ni usados. Fortune Teller, Constellation, Satellite y Perkeo mantienen sus condiciones propias.
- Observatorio: planetas poseídos y mano específica. Si existen planetas o falta inventario, **solo Puntuación queda parcial** porque el efecto no está integrado en H2. Con inventario conocido sin planetas no se inventa una mejora. Usar un planeta para Constellation compite con conservar ese mismo consumible para Observatorio.
- Truco de magia/Ilusión: poder comprar no añade cartas. Una adición posterior podría alimentar Holograma y reducir soporte de Erosión.
- Descuentos, renovaciones, ediciones o cambio de jefe: oportunidades descritas sin generar ofertas, gastar, crecer Flash, asignar probabilidades ni elegir un jefe favorable.
- Jeroglífico/Petroglifo: se utilizan ante y recursos actuales transcritos; no se repite la modificación histórica del vale.

Un inventario de vales desconocido se señala como cobertura parcial de la transcripción. No se inventa uno vacío ni se bloquea toda la evaluación por cada vale hipotéticamente posible. Un vale pendiente solo limita la dependencia afectada; el resto continúa.

## Ejemplos contractuales

Son estados sintéticos para comprobar la política con cálculos manuales independientes, **no observaciones de Balatro ni decisiones óptimas**. Los recursos de los ejemplos son entradas explícitas; la validación estructural no demuestra por sí sola que todos los modificadores reales estén correctamente transcritos.

1. Joker, ante1, dinero25 y recursos4/3/8/5: encaje individual80, Puntuación80, Economía70, Sinergia0, Mazo/Crecimiento no aplicables, Recursos100; global `(80+70+0+100)/4 = 62.5`.
2. Barón/Mimo con cuatro reyes elegibles de52 y cero Acero: hay material para retención de reyes; Acero no es obligatorio para Barón. Preparación `1+2×4/52`; Sinergia y Mazo38.5. Continúa siendo necesario robar y retener esos reyes.
3. Fotografía/Chad y12 figuras elegibles de52: preparación de Fotografía `1+2×12/52 = 19/13`, la de Chad3. Sinergia `100×((19/13+3)/2)/3 = 74.4`; Mazo48.7. La primera carta puntuada todavía debe ser la primera figura.
4. Brocha con tamaño de mano actual9 y demás recursos4/3/5: Recursos103.1. El informe no vuelve a aumentar el tamaño a10.
5. Green+20, ante1 y cinco manos: Crecimiento92.5 según encaje vigente y oportunidad editorial de mano extra. Ante8, el contador conserva su aporte; el extra de horizonte pasa a0. No se registra ninguna mano ni +Mult futuro.
6. Dinero, mazo o contador desconocido: solo los apartados dependientes quedan parciales. Un contador conocido0 conserva el cero y su posibilidad editorial de desarrollo; no se confunde con un contador faltante.

## Evidencia y evaluación

Los efectos de juego proceden del catálogo y la inspección estática del ejecutable Steam1.0.1o-FULL; esta tarea no afirma haber observado nuevas partidas. Las fuentes estratégicas respaldan criterios y tradeoffs, nunca estos pesos concretos. Continúan pendientes calibración de la política, toda la cobertura avanzada de los150 efectos y la integración H2 de los22 vales documentales.

[Pruebas de composición](../tests/composition.test.ts) conservan los casos H2 anteriores y añaden18 oráculos de las barras, desconocidos, condiciones indisponibles, sinergias con material, impacto de recursos, contadores, vales, inmutabilidad y separación de candidatos. Verificación del núcleo:459aprobadas,0fallos y10TODO manuales; no se cierran los contrastes pendientes del juego.

`npm.cmd run test:composition` ejecuta siete grupos web: actualización sin guardar/planes, economía, contadores desconocidos, etapa, vales sin duplicar recursos, cartas actuales, lectura de detalles sin ensuciar el registro y tamaños360/390/768/1440. [Informe](evidencia/composicion/report.json) y capturas en la misma carpeta. Inspección visual local de escritorio/móvil emulado realizada; no acredita Android físico. Regresiones adicionales: vales con anotaciones y recarga, encaje8grupos, web17 y diseño15 incluyendo reflujo200%. Corregido el resumen «inicial» al editar una carta manteniendo su foco.
