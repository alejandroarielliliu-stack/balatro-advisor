# Comparación visible y orientación de ciegas

Entrega del 05-11-2026 sobre `b842092`. Implementa el [plan de las dos observaciones](plan-decisiones-visibles.md). Repositorio independiente `balatro-advisor-github`; no se modifica Project Bonk.

## Evaluación de la siguiente ciega

`blind-guidance-4` aplica las reglas explícitas de Skip Tags antes de emitir el consejo general. Una ciega jefe se juega. Las recomendaciones de etiqueta se muestran como **Juega** o **Salta** con una razón breve. Foil, Polychrome, Handy, Rare, Celestial (Meteor), Juggle, Standard y Arcana (Charm) siempre recomiendan jugar. Speed, Garbage, Economy y Ethereal conservan sus reglas anteriores.

La estimación toma el mazo registrado, los jokers y recursos que admite el motor y el objetivo de la ciega que viene tras el salto. Prueba ocho órdenes de robo reproducibles, sin reemplazo. Elige jugadas entre un conjunto acotado de manos legales y usa descartes visibles cuando le falta puntuación. H2 aplica los puntos y efectos del camino elegido. Cada ronda termina al alcanzar la meta o al agotar sus opciones. Los puntos por mano disponible son el promedio del total dividido por el presupuesto de manos; una mano que sobra no añade puntos. Se informa cuántas rondas de ejemplo pasan la meta. Para la siguiente ciega después de un salto no hay otra salida de tienda, por lo que el estimador omite ese evento.

Cupón recomienda saltar en los antes 1 y 2. Buffoon y Top-up lo recomiendan hasta la Pequeña del ante 2 inclusive, y Uncommon solo en la Pequeña del primero. Inversión y Holográfica tienen el mismo límite que Buffoon. Comparan el promedio total con la meta del jefe registrado del ante actual. Inversión pide que alcance la meta y Holográfica que se quede por debajo. Un jefe sin datos o un efecto incompatible produce Juega con el motivo correspondiente. En la Ciega Grande, la edición de Holográfica sigue llegando en una tienda posterior al jefe.

Voucher pide $35 de saldo para pagar $10 y reservar $25. D6 pide $50 para reservar $25 y presupuestar otros $15 en rerolls y $10 en jokers. Si el saldo todavía no alcanza, D6 comprueba el dinero que quedaría al ganar la ciega siguiente, con las rentas conocidas de jokers e intereses. Si Delayed Gratification completa el presupuesto, el consejo indica que hay que ganar sin descartar. El cálculo no presupone manos sobrantes ni ganancias aleatorias durante la ronda.

Orbital usa la mano indicada en la etiqueta, registrada desde el selector de la ciega. Identifica la mano principal entre las que el mazo puede formar según sus niveles, su uso y sus jokers. También puede reconocer una composición favorable a Color antes de que se suba de nivel, como la de la baraja cuadriculada inicial. Recomienda saltar cuando coinciden. Boss recomienda saltar al identificar una restricción que perjudica de forma significativa al mazo o a sus jokers. Negative pide al menos dos Double Tags registradas. Double recomienda jugar salvo con Anaglifo y una recompensa que ya se vea para el siguiente salto. Por ejemplo, una Negative que pasaría el umbral de dos Double Tags o una Orbital que mejora la mano principal. Anaglifo añade una Double Tag al registrar una victoria contra el jefe con la cola confirmada. Si faltan datos para confirmar una condición, el consejo es Juega y explica el dato pendiente.

Economía conserva su comparación con todos los cobros simples de la ciega actual. Su recomendación por simulación exige que todas las muestras de la siguiente ciega superen la meta, una composición compatible y ninguna etiqueta pendiente. El jugador aún puede declarar que puede con la siguiente cuando la simulación no está disponible. Las reglas explícitas por nombre, ante o presupuesto solo consultan sus condiciones y conservan su consejo al abrir los planes de Análisis.

Las reglas de estrategia son las solicitadas para el Advisor. La estimación usa efectos del motor, incluidos Psíquico, Agua, Muro, Contenedor Violeta, Aguja, Grillete y Pedernal. Las muestras muestran la consistencia del ejemplo. Un dato o efecto que el motor aún no puede calcular deja la estimación sin resultado. Las ofertas de tiendas, sobres y rerolls futuros permanecen desconocidas. Consultar el consejo no registra ninguna acción.

## Uso

En **Mesa → Tienda**, transcribir las ofertas como antes. **Comparar opciones** lleva a la tabla visible: acción, coste neto/ingreso, saldo resultante y cambio pertinente. Conservar permanece como referencia al filtrar. Pulsar una fila abre consecuencias y condiciones; **Registrar lo que hice** inicia la confirmación T09b. Elegir o consultar una fila no escribe ni marca una edición real. Una venta puede registrarse sola, conservando la oferta para una compra posterior.

En **selección de ciega**, el recuadro muestra **Juega** o **Salta** con un motivo breve. Si falta una estimación para Inversión u Holográfica, el recuadro aconseja pasar por la tienda y buscar el primer comodín o reforzar la composición. **Ver motivos** abre los datos, límites y la comparación. La valoración opcional del jugador es temporal y se invalida al cambiar el estado. Las jugadas de Análisis siguen siendo opcionales y mantienen sus resultados separados.

## Contratos y cobertura

`inspectShopAlternatives` (`shop-alternatives-1`) reutiliza H2 y DEC00: conservar, cada compra de comodín, cada venta individual y cada venta→compra; añade los vales y sobres ya integrados. Cada rama tiene ID propio y parte del mismo estado. Incluye acciones ilegales con su causa, sin ocultar reemplazos legales cuando comprar no cabe. Un precio desconocido no se convierte en cero. Las ofertas sin acción compatible permanecen identificadas como pendientes.

Límite de 50 alternativas solicitadas; excederlo devuelve error explícito y mantiene el consejo previo disponible. No se recorta silenciosamente. Quedan fuera varias ventas/compras, renovaciones y búsqueda de todos los órdenes. `exhaustive:false`; `completeSingleActionSet` describe únicamente el conjunto individual enumerado, no que cada consecuencia esté calculada. Las acciones con datos pendientes conservan su estado propio.

El consejo rápido anterior conserva su universo de opciones. Las fichas de cada variante reutilizan sus motivos, pero sus preferencias locales **no** se promueven a un orden universal. Las ventas y todos los reemplazos nuevos tienen comparación de consecuencias, sin clasificación estratégica adicional. La tabla lo indica. No añade notas, fórmulas de puntuación ni utilidad común para dinero, Mult y contadores. El crecimiento sacrificado se identifica por instancia y contador.

Antes de `blind-guidance-3`, `guideBlindChoice` (`blind-guidance-1`) era una política heurística independiente de `compareBlindChoices` con el siguiente alcance de entrega:

| Regla visible | Conducta |
|---|---|
| BG-ROUND-AND-SHOP | Orientación inicial por jugar, condicionada a superar la ciega; conserva oportunidad de cobro y tienda |
| BG-CASH-THRESHOLD | Economía: H2 enumera cobros condicionados por manos sobrantes; muestra el mínimo necesario para igualar el ingreso inmediato del salto, sin asumir que se logrará |
| BG-REWARD-TRADEOFF | Compensación monetaria relevante, Inversión, Cupón o Double: intercambio sin precio ficticio de tienda |
| BG-PERSISTENT-TRADEOFF | Throwback, desgaste, modificadores desconocidos y destrucción de selección: no preferir jugar automáticamente |
| BG-TAG-QUEUE | Cola Double o desconocida: condición decisiva; no simular duplicaciones |
| BG-DECLARED-RISK | «Voy justo» retira la preferencia automática; no afirma que la siguiente ciega sea segura |
| BG-STRICT-EVIDENCE / BG-COMPATIBILITY | Abstención por evidencia exigida o contexto incompatible |
| BG-BOSS-NO-SKIP | Jefe sin salto; jugar no implica victoria |

Los cinco perfiles cualitativos son Economía, Inversión, D6, Cupón y Double. [STR02](evidencia/str02-etiquetas.md) registra procedencia, versión, hipótesis y falta de observación en partida. Una etiqueta sin perfil no vale cero: la limitación puede cambiar la orientación. No se amplía el ejecutor de etiquetas.

La referencia numérica de cobro se limita a la familia inicial de ocho comodines retenidos, sin stickers y con los datos que H2 requiere. No se conserva por hipótesis un inventario sujeto a selección no resuelta: Dagger/Madness reciben intercambio cualitativo. Tampoco se puntúan manos, predicen robos ni se certifican manos sobrantes. Los supuestos del cobro quedan en el informe.

## Integridad

Revisión, hechos, tienda y opciones forman la vigencia de cada consulta. La ficha antigua se deshabilita al cambiar su informe; antes de iniciar una confirmación se revisa de nuevo. La escritura definitiva utiliza T09b con su guardia de revisión y persistencia atómica. No se copian estados proyectados, robos ni ingresos de escenarios. El modo lectura puede consultar, pero no confirmar; errores de guardado conservan el registro anterior. No cambia el formato de archivos guardados.

## Comprobación y límites

- P01: 16 casos congelados **antes** de ejecutar los nuevos evaluadores, con SHA protegido; [casos y procedencia](casos-decisiones-visibles.md). Quince son sintéticos alcanzables; Eternal en White es una defensa estructural explícita.
- `npm.cmd run check`: 1.028 pruebas aprobadas, cero fallos y diez TODO manuales. Nuevas: 12 de alternativas, 14 de orientación y cinco contra oráculos de tienda congelados.
- `npm.cmd run test:visible-decisions`: siete grupos de navegador; comparación visible, saldos literales, pérdida de Green7, consulta sin escritura/edición real, venta sola, compra posterior, reemplazo atómico, lectura, falta de precio/espacio, fallo de guardado y revisión antigua. Capturas escritorio y anchuras390/360; orientación sin planes, riesgo y modo estricto.
- Regresión: resumen compacto6, DEC02 diez, sesión de tienda15, ciegas siete, capacidades seis, consecuencias cinco, frontend nueve y prueba estática bajo subruta. Foco restaurado, ampliación200% en la regresión frontend y cero errores JavaScript en las pruebas nuevas. La primera ejecución de CI detectó que un selector antiguo contaba también los avisos de la tabla nueva; se acotó al diálogo original, manteniendo su esperado de dos compras bloqueadas. El caso se reprodujo antes del ajuste y pasó después; no se alteraron reglas ni oráculos de dinero.

Se revisaron visualmente las capturas y se corrigieron ingreso/coste en móvil, filtro cuyo grupo desaparece y un supuesto imposible de cobro por destrucción de un Golden. Una captura o una prueba automática no es una sesión de usabilidad ni evidencia de Balatro. La emulación móvil no es Android físico.

**P01, UX03, DEC03a/b, STR02a/b y UX04 entregados dentro de esta cobertura. EVAL02 sigue parcial:** la comprobación automatizada pasó; falta observar a un jugador encontrar/comprender las dos decisiones y evaluar si el consejo es útil. No se cierra eficacia estratégica ni contraste empírico de reglas. Siguiente: esa sesión acotada, anotando cualquier decisión concreta que justifique ampliar perfiles o la política; no completar catálogos por inercia.
