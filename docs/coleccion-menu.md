# Colección sobre el menú principal

8 de noviembre de 2026. Rediseño a partir de las trece capturas proporcionadas por el usuario. La colección se abre sobre el fondo del menú, con panel gris, botones rojos y Volver naranja. No muestra puntos de notificación ni inventa progreso de desbloqueo: las cantidades del índice son totales de referencia.

| Categoría | Distribución |
| --- | --- |
| Comodines | 150 fichas, 15 por página, cinco columnas y tres filas |
| Barajas | Carrusel de 15 barajas con ilustración y efecto |
| Vales | 32 fichas, ocho por página y parejas de vale/mejora |
| Tarot | 22 cartas, once por página en filas de cinco y seis |
| Planetas | Doce cartas, seis columnas y dos filas |
| Espectrales | 18 cartas, nueve por página en filas de cuatro y cinco |
| Cartas mejoradas | Ocho cartas, cuatro columnas y dos filas |
| Sellos | Cuatro cartas en una fila |
| Ediciones | Cinco comodines de ejemplo en una fila |
| Paquetes | 32 ilustraciones, ocho por página; las variantes visuales no crean nuevas operaciones del motor |
| Etiquetas | 24 iconos, seis columnas y cuatro filas |
| Ciegas | Pequeña, grande y 28 jefes, junto a la tabla de bases por ante |

Las flechas recorren las páginas de forma circular. Volver/Escape regresa desde una categoría al índice y desde el índice al menú. Una ficha abierta conserva su propio cierre y devuelve el foco al elemento que la abrió. Los filtros y las sinergias de comodines siguen disponibles bajo Buscar o dentro de la ficha, sin ocupar la cuadrícula principal.

Las ilustraciones reutilizan los atlas existentes; se añade el atlas de Tarot/Planetas/Espectrales sin modificar sus píxeles. Procedencia y huella en `web/assets/collection/provenance.json`. Las ediciones usan capas visuales CSS sobre el comodín de ejemplo. Los textos proceden del catálogo y de localizaciones estáticas de 1.0.1o-FULL. Su presencia en la colección no habilita una regla nueva, ni implica observación en partida. La tabla posterior al ante 8 es referencia visual, no una ampliación del recorrido implementado.

Se conservan el almacenamiento, la partida y el historial: navegar por la colección no escribe en ellos. La escena usa la orientación horizontal existente, incluida la rotación en pantallas verticales; sus paneles se escalan desde una composición de 1280 × 600.

Verificación: `npm.cmd run check`, construcción estática y pruebas de navegador de colección, menú principal, orientación, catálogo de jefes, frontend y tienda. La colección cuenta con una prueba específica en la publicación automática. Son pruebas de interfaz y datos de referencia, no validación de estrategia ni una prueba en Android físico.
