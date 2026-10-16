# SYN01 — biblioteca de sinergias y condiciones de mazo

**Actualización2026-10-13:** la biblioteca documental sigue separada del cálculo de manos. Se implementó un consumidor de [17 familias composicionales](composiciones.md) para la [valoración contextual de la Mesa](encaje-rapido.md), con material, desconocidos y conflictos explícitos. No ejecuta automáticamente todas las fichas de este JSON.

Primera selección curada de **32 relaciones**, no exhaustiva: 28 sinergias, 2 conflictos y 2 falsas sinergias. Datos en `web/assets/jokers/synergies.json`; tipos y consulta en `src/catalog/synergies.ts`. Se consulta desde **Colección → Sinergias y mazo** o desde la ficha de cada comodín.

Incluye Acero/Mimo/Barón/sello rojo, Oro y sello azul retenidos, Fotografía/Chad, figuras/repeticiones, Hack/Fibonacci/Wee, Cristal y Suerte, Heliotropo, Pareidolia/Midas/Vampiro, ADN/Holograma, mazos de Acero y Piedra, economía con Huevo/Swashbuckler/Tarjeta de regalo, ahorro con Toro/Bootstraps y manos/descartes con Green/Ladrón/Ramen. También guarda pérdidas y conflictos, no solo beneficios.

## Contrato de datos

- Cada ficha tiene participantes, tipo de relación, mecanismo, condiciones, riesgos, orden, caso mínimo y fuentes.
- `deckRequirements.zone` distingue `held`, `held-end-round`, `scoring`, `played` y `full-deck`. `traits` identifica rango, palo, mejora, sello o posición. Esto evita tratar un rey jugado como un rey retenido, o Acero como el comodín Steel Joker.
- `minimum: 1` indica la existencia mínima del rasgo para ilustrar el mecanismo, **no una cantidad suficiente para recomendar una compra**. Los IDs de comodines son participantes de la relación; no son un predicado automático que exija poseerlos todos. En la ficha de Erosión, ADN y Mármol son alternativas de adición de cartas.
- Las condiciones textuales son parte del contrato, no comentarios prescindibles. Estas etiquetas todavía no constituyen un lenguaje de reglas ejecutable. No hay detector de combos activos en la partida.
- Toda ficha asume componentes activos y acciones legales, salvo que indique lo contrario. No cubre todos los jefes, ediciones, stickers, duplicaciones y órdenes posibles.
- `static-supported` significa respaldo de la inspección [L02](evidencia/sinergias-l02.md); `provisional-composition` significa deducción a partir de efectos documentados cuya interacción completa aún requiere contraste. Ambas mantienen `observedInGame: false` y `engineSupport: reference-only`.

## Límites de uso

Los ejemplos separan el aporte de un efecto de la puntuación total. No estiman probabilidades de victoria, frecuencia de robos ni rendimiento esperado. Ninguna relación modifica H2, el ranking H3 o el estado real. Comprar por una ficha sería insuficiente: habría que contar cartas elegibles, posibilidad de retenerlas/puntuarlas, coste, espacios, recursos y alternativas reales.

Las fuentes comunitarias sirvieron para localizar relaciones, no para afirmar observación directa. Las discrepancias detectadas están en L02; las URLs individuales y referencias del catálogo quedan en el JSON. El contenido es una síntesis propia breve, sin copiar guías completas. Los sobres todavía no se evalúan: disponer de un combo documentado no demuestra que convenga comprar un sobre para buscarlo.

## Validación y siguiente paso

`npm run check` comprueba referencias, unicidad, campos, separación de cartas/mejoras/sellos, invariantes documentales e inmutabilidad. `npm run test:catalog` comprueba búsqueda, detalle de Mimo, condiciones y conflictos visibles, tamaño móvil y ausencia de escritura. Son pruebas del software y los datos; no simulaciones ni comprobaciones contra una partida.

Siguiente paso: implementar en H2 un lote de efectos retenidos (Acero + Mimo + Barón, con sellos separados), con fixtures independientes y casos negativos. Después podrá conectarse un detector explicable al mazo real. La biblioteca por sí sola no habilita esos cálculos ni cierra H2.

Verificación del 2026-10-11: 149 pruebas aprobadas, cero fallos y 10 TODO de observación existentes. Suite de colección ampliada aprobada en Chrome y Firefox; 17 grupos de regresión web en Chrome. Captura móvil revisada en `docs/evidencia/collection/chromium/synergies-mobile.png`. Las pruebas no activan ni validan esos 32 combos dentro de H2.
