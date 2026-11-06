# Comparación visible y orientación de ciegas

Entrega del 05-11-2026 sobre `b842092`. Implementa el [plan de las dos observaciones](plan-decisiones-visibles.md). Repositorio independiente `balatro-advisor-github`; no se modifica Project Bonk.

## Uso

En **Mesa → Tienda**, transcribir las ofertas como antes. **Comparar opciones** lleva a la tabla visible: acción, coste neto/ingreso, saldo resultante y cambio pertinente. Conservar permanece como referencia al filtrar. Pulsar una fila abre consecuencias y condiciones; **Registrar lo que hice** inicia la confirmación T09b. Elegir o consultar una fila no escribe ni marca una edición real. Una venta puede registrarse sola, conservando la oferta para una compra posterior.

En **selección de ciega**, aparece una orientación breve. **Jugar / saltar** amplía motivos y consecuencias. No exige jugadas. La pregunta opcional sobre cómo llega el jugador a la ciega es una declaración temporal; al cerrar no se guarda, y un cambio de estado la invalida al recalcular. Las jugadas de Análisis siguen siendo opcionales y mantienen sus resultados separados.

## Contratos y cobertura

`inspectShopAlternatives` (`shop-alternatives-1`) reutiliza H2 y DEC00: conservar, cada compra de comodín, cada venta individual y cada venta→compra; añade los vales y sobres ya integrados. Cada rama tiene ID propio y parte del mismo estado. Incluye acciones ilegales con su causa, sin ocultar reemplazos legales cuando comprar no cabe. Un precio desconocido no se convierte en cero. Las ofertas sin acción compatible permanecen identificadas como pendientes.

Límite de 50 alternativas solicitadas; excederlo devuelve error explícito y mantiene el consejo previo disponible. No se recorta silenciosamente. Quedan fuera varias ventas/compras, renovaciones y búsqueda de todos los órdenes. `exhaustive:false`; `completeSingleActionSet` describe únicamente el conjunto individual enumerado, no que cada consecuencia esté calculada. Las acciones con datos pendientes conservan su estado propio.

El consejo rápido anterior conserva su universo de opciones. Las fichas de cada variante reutilizan sus motivos, pero sus preferencias locales **no** se promueven a un orden universal. Las ventas y todos los reemplazos nuevos tienen comparación de consecuencias, sin clasificación estratégica adicional. La tabla lo indica. No añade notas, fórmulas de puntuación ni utilidad común para dinero, Mult y contadores. El crecimiento sacrificado se identifica por instancia y contador.

`guideBlindChoice` (`blind-guidance-1`) es una política heurística independiente de `compareBlindChoices`. No concede recompensas ni decide supervivencia:

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
- Regresión: resumen compacto6, DEC02 diez, sesión de tienda15, ciegas siete, frontend nueve y prueba estática bajo subruta. Foco restaurado, ampliación200% en la regresión frontend y cero errores JavaScript en las pruebas nuevas.

Se revisaron visualmente las capturas y se corrigieron ingreso/coste en móvil, filtro cuyo grupo desaparece y un supuesto imposible de cobro por destrucción de un Golden. Una captura o una prueba automática no es una sesión de usabilidad ni evidencia de Balatro. La emulación móvil no es Android físico.

**P01, UX03, DEC03a/b, STR02a/b y UX04 entregados dentro de esta cobertura. EVAL02 sigue parcial:** la comprobación automatizada pasó; falta observar a un jugador encontrar/comprender las dos decisiones y evaluar si el consejo es útil. No se cierra eficacia estratégica ni contraste empírico de reglas. Siguiente: esa sesión acotada, anotando cualquier decisión concreta que justifique ampliar perfiles o la política; no completar catálogos por inercia.
