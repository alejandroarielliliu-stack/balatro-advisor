# Venta desde un comodín propio

**Contrato vigente desde 2026-10-16:** [SHOP03a](tienda-persistente.md) registra **Vendí** como acción realmente realizada, tras confirmación, y guarda estado/historial mediante H2/T09b. Recargar conserva la venta; Deshacer corrige el registro. El flujo de venta solo en borrador descrito a continuación es el antecedente UI-SELL, sustituido en la interfaz; `previewMesaSale` permanece como helper hipotético y no autoriza confirmar bajo un perfil asumido.

Corrección2026-10-13. Pulsar una ilustración de Tus comodines abre **Vender · $importe** y **Editar**. Las fichas del catálogo conservan Añadir. La venta actualiza dinero, inventario, huecos, recursos y efectos sobre los comodines restantes mediante `applyShopAction`, y recalcula candidatos y composición. No hace falta guardar, introducir una mano ni conocer la próxima ciega para vender un Joker básico.

## Mesa y registro

La transición se aplica únicamente a la **vista en edición**, sin escribir almacenamiento ni historial, como el resto de cambios en Mesa. La copia guardada permanece recuperable al recargar. Para conservar la transcripción, usar Registro→Guardar actualización, con el motivo habitual. Confirmar una venta realmente realizada y registrar su acción/evidencia sigue disponible en Análisis→Registrar otra acción de tienda, mediante [T09b](confirmaciones-t09b.md). No se copia ningún resultado de una ronda hipotética.

«Quitar fila», dentro de Editar, sigue siendo una corrección del inventario transcrito y no cobra dinero. «Vender» aplica las consecuencias completas H2; no es un alias de eliminar una fila.

## Datos y límites

- Hace falta saldo actual y valor de venta conocido. Un dato faltante, Eternal, precio incompatible o un resultado necesario no descrito conserva dinero e inventario y muestra el error en la ficha. Editar permite revisar los datos; no hay eliminación de respaldo tras una venta rechazada.
- `previewMesaSale` valida H1 y evalúa sobre una copia. Si versión/plataforma/dificultad/mods no están transcritos, usa el modelo objetivo Steam1.0.1o-FULL/White/sin mods **solo para la transición del borrador**, devuelve los supuestos y muestra esa limitación. Los hechos originales permanecen desconocidos. Nunca sustituye un contexto conocido incompatible ni habilita efectos de vales fuera de H2.
- Sigue siendo una regla provisional por evidencia estática; no se declara observación nueva en Balatro. El flujo real T09b conserva sus comprobaciones y confirmación explícita; los supuestos de Mesa no autorizan guardar una acción como si la configuración se hubiera verificado.
- Las ventas con efectos que generan o copian elementos necesitan los datos que exige H2. La ficha no inventa resultados ni elige una copia aleatoria. Si faltan, transcribir los cambios reales explícitamente o usar el flujo de eventos que admita sus resultados.

## Dependencia corregida

`historyEvent` exigía la próxima ciega al entrar incluso durante una venta sin efectos de ciega. Ahora la pide solo en las ramas pertinentes: seleccionar una ciega, Rocket al terminar ronda y Luchador vendido ante una ciega activa. Vender Luchador en tienda no desactiva la próxima ciega; vender un Joker sencillo no requiere ofertas de tienda. Compras, jefes y modo estricto conservan sus dependencias.

## Oráculos y reproducción

Estados sintéticos, no observaciones del juego: Joker `$7+$1=$8`; Half `$25+$2=$27`; negativa base Joker `$7+$3=$10`, huecos6→5; Campfire de los restantes X1→X1.25 por una venta. Campfire procede del texto del catálogo extraído y [oráculo CAT04](evidencia/cat04-generation.md), no de ejecutar la implementación. Un valor de venta distinto del modelo se rechaza; no se convierte en el precio estándar.

`npm.cmd run check` conserva las suites anteriores y añade13casos de dependencia y transición pura:472aprobadas,0fallos y10TODO manuales. `npm.cmd run test:sale` pasa siete grupos sobre botón en la ficha, datos incompletos, Eternal, dinero/huecos/contadores, separación del registro, guardado explícito/recarga y móvil emulado. Los [informes](evidencia/venta/report.json) y capturas se guardan en `docs/evidencia/venta/`. Regresiones de navegador17grupos, composición y galería también pasan; no son observaciones nuevas en Balatro. Capturas locales de escritorio/móvil inspeccionadas; corregido el solapamiento del nombre de etapa y el índice, con comprobación geométrica a360/390px.
