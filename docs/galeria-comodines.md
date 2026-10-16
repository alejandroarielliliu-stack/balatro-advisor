# Galería de comodines — 2026-10-11

La zona «Tus comodines» mantiene 216 px de altura en escritorio y móvil. El inventario es una franja horizontal independiente; la galería de 150 ilustraciones está debajo de candidatos y vales, con desplazamiento interno. «＋ Buscar» enfoca su buscador. La [revisión de diseño](diseno-web.md) describe la distribución actual. Abrir la ficha, filtrar o añadir cartas no cambia la altura del inventario.

Al pulsar una ilustración se abre un diálogo con nombre, descripción y comparación hipotética. Las imágenes del inventario abren la misma ficha; su nombre abre el editor. Escape o Cerrar devuelve a la galería. En tienda la imagen abre la edición de su oferta.

## Añadir y filtrar

«Añadir a mis comodines», dentro de la ficha, es la única entrada para crear filas nuevas del inventario manual. El antiguo botón «Añadir comodín poseído» se retiró. El botón añade la carta elegida al borrador, invalida análisis anteriores y no descuenta dinero ni copia estados hipotéticos. El guardado explícito conserva revisión, historial y validaciones H1/T09b. El contador de un Green observado se deja desconocido hasta transcribirlo: no se supone que sea recién comprado.

Se rechazan inventario desconocido, espacios ausentes/agotados. Las copias con IDs de instancia distintos están permitidas. Las fichas de efectos no implementados muestran el botón deshabilitado y explican el motivo. La edición de filas existentes y la confirmación de compras reales conservan sus flujos anteriores.

Bajo el buscador hay botones para Común, Inusual, Raro y Legendario, y para cada precio base presente en el catálogo. Sin botones activos se muestran todos. Dentro de cada grupo las selecciones se unen: Común + Raro muestra ambos. Entre grupos se intersectan: Común + Raro con $4 + $6 muestra esas rarezas a cualquiera de esos dos precios. Pulsar otra vez desactiva la selección; `aria-pressed` comunica su estado. La búsqueda se combina con ambos grupos y ninguna consulta modifica el borrador.

## Qué significa la puntuación

`src/evaluation/joker-preview.ts` clona y valida la vista actual, sustituye **solo en esa copia** la tienda por una oferta sintética al precio base y llama a H3/T07b/H2 con conservar y comprar, o vender→comprar si se elige un reemplazo. No duplica fórmulas ni genera robos. Utiliza exactamente los escenarios explícitos actuales de Análisis. Cada rama finaliza cuando alcanza la ciega, por lo que puede consumir distintas cantidades de manos.

La ficha separa puntos acumulados, recursos, saldo tras compra y encaje heurístico 0–10 ([rúbrica existente](plan-valoracion-contextual.md)). «Ver cálculo» muestra las trazas por evento. El supuesto de precio base es visible; no afirma que el comodín esté disponible en la tienda real. No representa una adición gratuita ni una probabilidad de ganar. Los reemplazos pierden el efecto de la instancia vendida y se validan como venta seguida de compra.

No hay cálculo si falta partida/escenario, la compra es ilegal o el efecto está fuera de cobertura. Los planes incompatibles no presentan puntuación completa. El JSON de la galería publica **82 efectos con cálculo y 68 solo catálogo**; las familias adicionales del código siguen pendientes de integración completa en la UI. Las reglas siguen provisionales: esta entrega no aporta observaciones nuevas del juego.

No existe botón para confirmar la oferta sintética: nunca se copian sus estados ni sus cobros al registro. Búsqueda y diálogo tampoco marcan el formulario como modificado. El estado registrado solo cambia mediante los flujos de guardado/confirmación previos.

## Comprobaciones

- `npm run check`: 215 pruebas aprobadas, cero fallos; 10 TODO de evidencia anteriores siguen abiertos. Tres pruebas nuevas cubren inmutabilidad, puntuación de referencia 80→572, coste $5, dinero insuficiente, catálogo no implementado, capacidad llena y reemplazo.
- `npm run test:bay`: Chrome; 150 miniaturas, búsqueda, uniones de rarezas y precios, intersección entre grupos, teclado/Escape, altura constante, ausencia de escritura al consultar, ficha sin escenario/sin efecto, editor cerrado sin marcar borrador y comparación $7→$2. Alta en borrador, guardado/recarga, conservación de dinero/tienda y errores por duplicado/capacidad comprobados. Pantallas de 360, 390, 768 y 1440 px sin desbordamiento horizontal.
- Regresión web: 17 grupos aprobados. Suite de diseño aprobada: navegación, edición, reordenación, escenarios, confirmaciones, perfiles de baraja y reflujo al 200%.
- Capturas revisadas visualmente: [galería con inventario](evidencia/joker-bay/owned-desktop.png), [galería móvil](evidencia/joker-bay/gallery-mobile.png), [detalle móvil](evidencia/joker-bay/detail-mobile.png). Móvil emulado, no dispositivo Android físico.

El oráculo de puntos procede del caso H3 existente: pareja de ochos `(10+8+8)×2=52`, luego pareja de doses `(10+2+2)×2=28`; total 80. Con Half, la primera mano da `26×(2+20)=572` y supera la ciega de 450. Es un cálculo independiente de la salida del motor, no una comprobación observada en Balatro.

## Fila de inventario al estilo del juego

Cartas centradas sobre una bandeja común, sin recuadros vacíos, contador de ocupación y elevación al pasar el cursor o seleccionar. Arrastrar horizontalmente cambia el orden del borrador; el gesto no abre la ficha. Un clic sigue abriendo los detalles. Flechas desplazan el foco y Alt + flechas reordena; los botones del editor continúan disponibles. Escape o cancelación del puntero descartan el gesto antes de soltar. Se respeta movimiento reducido.

La actualización usa los mismos nodos/lectores H1 y el mismo guardado explícito. No realiza ventas al arrastrar fuera ni modifica el dinero. `test:bay` comprueba arrastre real de ratón y eventos táctiles emulados de Chrome, ausencia de apertura accidental del diálogo, teclado y conservación del registro. `test:design` mantiene el recorrido de guardado del orden y las demás funciones; `npm run check`: 215 aprobadas, 10 TODO previos. Capturas de escritorio y móvil revisadas; no es una prueba en dispositivo físico.

## Comparación conjunta de candidatos

La mesa sustituye el panel «En la tienda» por «Candidatos», debajo del inventario/galería. Cada ficha tiene «Añadir a candidatos»: máximo cuatro entradas distintas, eliminables. Se mantienen durante la sesión y al guardar la partida; se descartan al recargar la página. No son ofertas observadas ni amplían la tienda H2 a cuatro espacios. Para conservar la edición de ofertas reales existente, su formulario queda plegado en «Ofertas registradas · avanzado» en la columna de datos.

Cada candidato muestra ilustración, efecto, precio base, selector opcional de venta previa y el resultado de `previewJoker`/H3/T07b/H2: puntos antes/después por escenario, objetivo, recursos usados, dinero tras compra y encaje contextual 0–10. Todos parten del mismo registro y los mismos planes; se evalúan individualmente, nunca como una compra de cuatro cartas. Supuestos y trazas siguen disponibles en desplegables. Si faltan escenarios, dinero o cobertura, se muestra la limitación; no se inventan puntos.

Cambiar el borrador, escenarios o revisión invalida las cifras. «Comparar candidatos» calcula con los datos actuales, y no calcula sobre un borrador sin guardar. Las preferencias de reemplazo no transfieren contadores. Quitar/añadir candidatos o consultar resultados no cambia el estado guardado ni marca la partida como editada.

`npm run test:candidates`: cuatro candidatos, quinto rechazado, oráculos 80→572 y 80→240, invalidación por partida/plan, efectos sin soporte explícitos, ausencia de escritura y reflujo 360–1440 px. Capturas revisadas en `docs/evidencia/candidates/`. Regresión: 217 pruebas aprobadas, 10 TODO de evidencia previos; 17 grupos web y suite de diseño aprobados.

### Presentación compacta (2026-10-12)

Por defecto cada candidato muestra miniatura, nombre y diferencia de puntos por escenario: ▲ +N verde, ▼ −N rojo y — 0 neutro. El signo y el símbolo comunican el cambio además del color. El nombre accesible y el título incluyen puntos antes/después; «Detalles» conserva efecto, precio, reemplazo, puntuación completa y supuestos. Con varios escenarios se muestra una diferencia por escenario, sin promediar. Datos desconocidos o fuera de cobertura muestran «Sin cálculo», nunca cero ficticio.

El delta procede de las mismas métricas H3/T07b ya calculadas para la ficha. No es una nota global del mazo ni modifica la política. `test:candidates` comprueba ▲ +492, ▲ +160, reemplazo Half→Joker ▼ −332 y venta/compra de Joker — 0; también verifica invalidación y ausencia de escritura. Capturas compactas revisadas en escritorio y móvil emulado; los cuatro candidatos ocupan menos de 400 px de alto en la prueba de escritorio.


### Una sola fila, sin desplegable (2026-10-12)

Los cuatro candidatos permanecen en una sola fila: miniatura, nombre y delta. Al pulsar la carta (o Enter/Espacio) se abre un diálogo con la información completa; Cerrar/Escape regresa a la fila. Se retiró el enlace «Detalles» y el encabezado comparte línea con Comparar y el contador. En pantallas estrechas la fila se desplaza horizontalmente, sin crear filas adicionales ni desbordar la página. La prueba verifica alineación en 360/390/768/1440 px, panel menor de 160 px en escritorio y reemplazo desde el diálogo; capturas revisadas.


## Comparación en vivo desde Mesa (2026-10-12)

Esta sección sustituye el requisito anterior de guardar antes de comparar candidatos. La lectura del formulario se comparte con el guardado: cada evaluación valida una copia de los datos actuales, incluidos orden, contadores y composición. No escribe en el registro ni en el historial. Al cambiar el formulario o los planes, las cifras se invalidan inmediatamente y se recalculan tras 220 ms sin pulsar Comparar. Un error o campo incompleto no mantiene cifras antiguas ni roba el foco. Los reemplazos se ofrecen contra el inventario actualmente editado.

«Cartas y jugadas de prueba» está en Mesa. El mismo editor se conserva al navegar a «Avanzado», donde siguen disponibles el asesor sobre ofertas registradas, las cotas y los horizontes. No se duplica el editor ni se crean escenarios favorables automáticamente. Sin cartas/jugadas explícitas no se inventa una puntuación global del mazo.

Guardar continúa disponible para conservar la copia registrada y su historial, pero es opcional para este flujo. Las ediciones en vivo siguen siendo de la sesión: no se guardan automáticamente al cerrar/recargar. La confirmación de acciones reales en Avanzado continúa ligada a revisiones guardadas; nunca copia los resultados hipotéticos al inventario.

Prueba `npm run test:live`: partida nueva sin guardar, añadir Joker cambia el delta de Half de +492 a +436, dinero insuficiente y cartas inválidas retiran resultados sin robar foco, restauración recalcula, y edición de una partida guardada conserva el registro. Pruebas existentes: 217 aprobadas, 10 TODO de evidencia previos; regresión web (17 grupos), diseño y galería. Capturas en `docs/evidencia/live-table/`.
