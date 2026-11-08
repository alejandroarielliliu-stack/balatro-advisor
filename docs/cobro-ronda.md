# Pantalla de cobro de ronda

7 de noviembre de 2026. Interfaz basada en la captura de Cash Out del usuario.

Al pulsar **Seleccionar**, se registra la entrada en la ciega y sus tres columnas bajan. Aparece un solo panel de cobro con la ficha, el objetivo y el premio de la ciega registrada. Se conservan fondo, inventario, mazo y posición del panel lateral. El lateral muestra la puntuación registrada o «—» cuando falta; no se copian los números de la captura. La transición respeta movimiento reducido. No se simulan manos ni se concede una victoria al abrirlo.

El importe junto a **Cash Out** es el cobro que muestra Balatro. **Saldo al cobrar** pide el dinero total después de cobrar: la ronda puede haber cambiado el dinero que había antes de seleccionarla. Ambos se transcriben; el importe del cobro nunca se suma automáticamente al último saldo guardado.

El espacio inferior queda vacío sin comodines con datos dinámicos compatibles. Si los hay, aparecen por copia y posición, con ilustración y sus contadores observables. Se incluyen el valor de venta de Huevo y los valores afectados por Tarjeta de regalo. Los campos empiezan vacíos; un valor anterior solo aparece como referencia en el placeholder. Vacío conserva el dato como desconocido. «Ya no lo tengo» registra la desaparición observada de esa copia. No se inventan crecimientos ni se mezclan dos copias del mismo comodín.

Pulsar **Cash Out** confirma la ronda ganada, el saldo final y los cambios en una operación: `record_cashout` reutiliza las transiciones existentes, invalida los datos que la ronda no permite deducir y aplica después los valores transcritos. Se conserva una revisión y una entrada de historial. El cobro lleva a la tienda; ganar el jefe del ante 8 finaliza el recorrido sin inventar otra tienda. «Perdí la ronda» abre el formulario de resultado con derrota preseleccionada.

Editar, abrir, recargar o Continuar no concede premios. Un fallo de guardado conserva el registro y el borrador para reintentar. Se mantienen las comprobaciones de revisión, partida y pestaña escritora. Si cambia la revisión mientras hay un borrador, se conserva visible y se exige actualizar los datos antes de guardar. Continuar recupera el panel en fases `in_round` y `cashout` sin volver a registrar la selección.

## Verificación

- `npm run check`: 1056 pruebas aprobadas, cero fallos y 10 TODO manuales existentes.
- Ocho pruebas nuevas de progreso/persistencia; saldo absoluto, invalidación y cambios por instancia, retirada observada, fase de cobro recuperada, jefe del ante 8, datos inválidos, revisión, duplicados y fallo de almacenamiento.
- `node tools/round-cashout-test.mjs`: ocho grupos aprobados; recorrido con y sin comodines dinámicos, copias independientes, edición sin escrituras, guardado fallido/reintento, recarga/Continuar, cobro previo, final del ante 8, transición con movimiento reducido y normal, revisión externa con borrador y escritorio/móviles emulados.
- Regresión del selector de ciegas, entrada de partida y catálogo de jefes; artefacto estático bajo la subruta de publicación.

Las capturas y el informe de navegador quedan en `docs/evidencia/round-cashout/`, excluidos de Git. Son pruebas sintéticas de interfaz y persistencia; no una observación nueva en Balatro ni una prueba en Android físico.
