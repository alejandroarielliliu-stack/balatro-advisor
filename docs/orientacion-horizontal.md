# Orientación horizontal — UI04

6 de noviembre de 2026. Alcance: presentación horizontal de toda la web y mejora del [fondo del menú](fondo-menu-shader.md). No cambia navegación, alternativas, reglas ni datos de partida.

La aclaración final del usuario sustituye la propuesta de aviso: **no hay pantalla de «gira el dispositivo»**. La aplicación se mantiene horizontal incluso cuando el teléfono sigue físicamente en vertical.

## Comportamiento

- Con un viewport horizontal, las pantallas conservan su disposición existente.
- Con un viewport vertical, el mismo contenido gira 90 grados: su ancho lógico es el lado largo y su alto es el corto. El usuario ve la interfaz de lado; no se recorta una página de escritorio ni se muestra una pantalla intermedia.
- La rotación conserva ruta, partida, formularios, historial y diálogos abiertos. No se reconstruye la aplicación, no hay iframe ni una segunda instancia de guardado.
- Se intenta `screen.orientation.lock('landscape')` cuando existe, al iniciar y con una interacción real, y se reintenta al cambiar fullscreen. Los rechazos se capturan. No se solicita fullscreen ni se añaden controles: el giro visual funciona independientemente del resultado de la API.

El [bloqueo nativo tiene disponibilidad y requisitos limitados](https://developer.mozilla.org/en-US/docs/Web/API/ScreenOrientation/lock); por eso no se presenta como garantizado en todos los navegadores. La interfaz web sí tiene su alternativa visual. El navegador y el sistema operativo siguen controlando sus propias barras, teclado y selectores nativos.

## Integración

`#app-viewport` representa el rectángulo horizontal y `#app-shell` conserva el desplazamiento. Las consultas CSS existentes de ancho/alto pasan a consultar ese contenedor, conservando sus puntos de adaptación y reglas de composición. Las consultas de movimiento reducido continúan consultando al sistema. Las unidades de viewport se derivan de las dimensiones lógicas; no de un rectángulo ya girado ni del tamaño de un contenedor de tarjeta.

Los [container queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_containment/Container_size_and_style_queries) permiten conservar los mismos puntos de adaptación. Las variables se fijan también en píxeles al medir el viewport lógico para evitar que un contenedor anidado las reinterprete. Se mantienen zoom y áreas seguras. En el menú de poca altura, los tres botones usan la fila horizontal y espaciado compacto existentes.

Los diálogos `showModal()` se dibujan en la capa superior del navegador y reciben su propio giro/centrado; se conserva el diálogo y su contenido. El arrastre convierte coordenadas físicas a lógicas. La navegación desplaza el contenedor interno al inicio, y el canvas mide `clientWidth/clientHeight`. Estas adaptaciones sostienen las mismas interacciones después del giro.

No se escribe un nuevo campo de partida ni se migra el almacenamiento. `data-ui-rotated` y las variables CSS son estado de presentación temporal. Arrastrar para cambiar el orden de comodines sigue produciendo la observación y autoguardado anteriores; girar, consultar o desplazarse no registra una acción de juego.

## Verificación

`npm.cmd run test:orientation` comprueba equivalencia de dimensiones lógicas, pantallas existentes, formularios/diálogos abiertos durante el giro, compra/venta confirmadas, arrastre, desplazamiento, almacenamiento y las ramas del bloqueo nativo. Los mocks de la API no se presentan como bloqueo físico de un teléfono.

`npm.cmd run test:menu` conserva las comprobaciones de movimiento, preferencia reducida, teclado, enlaces, fallback sin GPU y guardados. Las comprobaciones geométricas de los runners usan ejes lógicos; los controles se prueban por sus posiciones físicas reales. Las capturas e informes están en `docs/evidencia/orientation/` y `docs/evidencia/menu/`, excluidos de Git.

Se revisan escritorio, móvil horizontal y móvil vertical emulado. No acredita una prueba en Android físico. El límite de trabajo del shader se documenta aparte; una emulación no garantiza la misma frecuencia de dibujo en todos los teléfonos.

Resultados de esta entrega: seis grupos de orientación, nueve de menú, nueve de frontend (con zoom 200 %), runner de tienda y prueba estática aprobados; 1.028 pruebas del núcleo aprobadas, cero fallos y diez TODO manuales anteriores. El viewport táctil 800×1280 con DPR 3 mantuvo el canvas lógico 1280×800 y renderizó 1131×707, dentro del límite de 800.000 píxeles.

Cuatro runners históricos (`candidates`, `quick-fit`, `sale`, `bay`) no aprobaron: intentan acceder a filtros o al buscador del catálogo plegado antes de sus comprobaciones. Se reprodujo el fallo de `bay` en una copia limpia de `d91d39e`, anterior a UI04: timeout de visibilidad en su primer filtro, en escritorio y antes de girar. Los otros tres presentan el mismo acceso sin abrir el catálogo en su preparación. No se arregló esa deuda ni se contó como prueba aprobada; las pruebas actuales de menú, tienda y orientación sí abren los controles existentes. La evidencia de contraste está en `.browser-runtime/baseline-ui03/`, fuera del sitio público.
