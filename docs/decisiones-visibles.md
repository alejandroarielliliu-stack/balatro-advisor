# Comparación visible y orientación de ciegas

Entrega del 05-11-2026 sobre `b842092`. Implementa el [plan de las dos observaciones](plan-decisiones-visibles.md). Repositorio independiente `balatro-advisor-github`; no se modifica Project Bonk.

## Evaluación de la siguiente ciega

`blind-guidance-3` incorpora el diseño de noviembre para White Stake, hasta el jefe del ante 8. Primero devuelve **Jugar** para una ciega jefe o para cualquiera de las seis etiquetas de la lista por nombre (Uncommon, Meteor, Speed, Standard, Double y Garbage). La lista se resuelve antes de consultar la composición, el dinero o la cola. Las otras 18 etiquetas muestran su beneficio, las condiciones para aprovecharlo y los datos que faltan.

La estimación toma el mazo registrado, los jokers y recursos que admite el motor y el objetivo de la ciega que viene tras el salto. Prueba ocho órdenes de robo reproducibles, sin reemplazo. Elige jugadas entre un conjunto acotado de manos legales y usa descartes visibles cuando le falta puntuación. H2 aplica los puntos y efectos del camino elegido. Cada ronda termina al alcanzar la meta o al agotar sus opciones. Los puntos por mano disponible son el promedio del total dividido por el presupuesto de manos; una mano que sobra no añade puntos. Se informa cuántas rondas de ejemplo pasan la meta. Para la siguiente ciega después de un salto no hay otra salida de tienda, por lo que el estimador omite ese evento.

Las primeras candidatas a **Saltar** son Economía, cuando su ingreso supera todos los cobros simples calculados al jugar, Cupón en la primera ciega pequeña e Inversión en la ciega grande de los antes 1–2. La política exige que todas las muestras alcancen la meta, una composición estable dentro de la familia inicial de comodines y ninguna etiqueta pendiente. Una proyección insuficiente orienta a jugar y conservar la tienda. Los casos mixtos quedan para comparar. Para Economía sin muestra se mantiene disponible la orientación condicionada a una declaración explícita del jugador sobre la próxima ciega.

La [guía de Balatro University](https://www.youtube.com/watch?v=q4YAHDuRUcQ) informa las condiciones y se contrasta con las [notas de la versión 1.0.1f](https://steamcommunity.com/games/2379780/announcements/detail/4208127528883891676). El filtro es una política provisional. Una muestra no mide la probabilidad real de ganar. Si falta el mazo, el jefe, los contadores, un resultado aleatorio o un efecto anterior a la ronda (como Juggle u Orbital), se indica qué impide la estimación. Las ofertas de tiendas, sobres y rerolls futuros permanecen desconocidas. Consultar el consejo no registra ninguna acción.

## Uso

En **Mesa → Tienda**, transcribir las ofertas como antes. **Comparar opciones** lleva a la tabla visible: acción, coste neto/ingreso, saldo resultante y cambio pertinente. Conservar permanece como referencia al filtrar. Pulsar una fila abre consecuencias y condiciones; **Registrar lo que hice** inicia la confirmación T09b. Elegir o consultar una fila no escribe ni marca una edición real. Una venta puede registrarse sola, conservando la oferta para una compra posterior.

En **selección de ciega**, aparece una orientación breve. **Jugar / saltar** amplía motivos y consecuencias. No exige jugadas. La pregunta opcional sobre cómo llega el jugador a la ciega es una declaración temporal; al cerrar no se guarda, y un cambio de estado la invalida al recalcular. Las jugadas de Análisis siguen siendo opcionales y mantienen sus resultados separados.

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
