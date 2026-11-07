# Menú principal — UI03

6 de noviembre de 2026. Primera pantalla al abrir la raíz de Balatro Advisor, inspirada en la captura de Balatro aportada por el usuario. Conserva Mesa, Colección, Análisis, Registro y los guardados existentes. UI04 refina exclusivamente el [fondo](fondo-menu-shader.md) y la [presentación horizontal](orientacion-horizontal.md), sin cambiar sus destinos.

## Comportamiento

- La raíz y `#menu` muestran el menú. El logotipo de las pantallas interiores permite volver; también funciona el historial del navegador.
- **Jugar** abre `#table`, la Mesa existente como destino provisional. El usuario definirá la siguiente pantalla; no se inventa todavía otro asistente de configuración ni se crea/reinicia una partida al pulsarlo.
- **Colección** abre la colección existente de 150 comodines.
- **Opciones** permite seguir la preferencia del sistema, activar o desactivar el fondo animado. Escape y Volver cierran el diálogo y devuelven el foco. No contiene ajustes sin función ni controles que alteren el juego.
- Los enlaces directos anteriores siguen funcionando. Navegar conserva formularios y partidas; la consulta no registra compras ni ventas.

## Presentación y movimiento

Fondo procedural WebGL rojo y azul, con remolinos y reflejos, sin vídeo ni librerías nuevas. Logotipo tipográfico propio de Balatro Advisor, carta decorativa, fuente pixel existente y botones con relieve. La imagen de referencia no se incorpora como captura estática del fondo.

El render se limita a 30 fotogramas por segundo, 800.000 píxeles y DPR 1,25. Se detiene al salir del menú o al ocultarse el documento. Por defecto respeta `prefers-reduced-motion`; la selección explícita de Opciones prevalece. Sin WebGL se conserva un fondo estático Canvas2D/CSS y todos los controles.

La preferencia visual utiliza `balatro-advisor.menu-motion.v1`; no escribe el registro de partida ni la tienda. Si falla ese guardado, el cambio se aplica en memoria y se informa en Opciones. No requiere migrar los formatos anteriores.

Los botones conservan su orden y el formato horizontal. En pantallas de poca altura se compactan sus proporciones. Si el teléfono está en vertical, la interfaz completa gira 90 grados; no aparece un aviso ni un modo adicional. Se contemplan las áreas seguras.

## Verificación

`npm.cmd run test:menu` comprueba la entrada, enlaces, teclado/foco, preferencias, movimiento y pausas, alternativas sin GPU y conservación de datos en contextos aislados. Guarda capturas e informe en `docs/evidencia/menu/`, excluidos de Git.

Los runners anteriores que prueban Mesa entran ahora explícitamente por `#table`; conservan sus aserciones. La prueba estática abre la raíz, comprueba el menú y pulsa Jugar antes de continuar sus contratos originales bajo `/balatro-advisor/`.

Verificación ejecutada: `npm.cmd run check` pasó con 1.028 pruebas aprobadas, cero fallos y diez TODO manuales anteriores. El runner del menú pasó sus nueve grupos, incluido movimiento real WebGL comprobado por píxeles y llamadas de render, cinco tamaños y conservación exacta de un historial no vacío. También pasaron Mesa/frontend (nueve grupos), autoguardado (14), decisiones visibles (siete), avance (18), Colección y la prueba del artefacto estático bajo subruta.

Se revisó visualmente en el navegador abierto y en capturas de escritorio, móvil vertical pequeño y horizontal emulado; se corrigieron centrado del menú, proporción del título y botón principal móvil. No acredita una prueba en Android físico ni cambia la evidencia del motor o del asesor.
