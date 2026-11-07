# Menú principal — UI03

6 de noviembre de 2026. Primera pantalla al abrir la raíz de Balatro Advisor, inspirada en la captura de Balatro aportada por el usuario. Conserva Mesa, Colección, Análisis, Registro y los guardados existentes. UI04 refina exclusivamente el [fondo](fondo-menu-shader.md) y la [presentación horizontal](orientacion-horizontal.md), sin cambiar sus destinos.

## Comportamiento

- Cada entrada o recarga abre `#menu`, incluso si la URL contenía otra pantalla. Esta decisión del usuario sustituye la conservación anterior de enlaces directos al arrancar; no borra la partida ni su historial. El logotipo interior permite volver y la navegación interna posterior conserva el historial del navegador.
- **Jugar** abre `#setup`, el [selector de partida](selector-partida-diseno.md), con Nueva partida, Continuar y Retos. Abrirlo o explorar barajas no crea/reinicia una partida. Continuar abre Mesa sin guardar; Nueva partida solo se registra al confirmar el perfil y, si existe una copia, su reemplazo.
- **Colección** abre la colección existente de 150 comodines.
- **Opciones** permite seguir la preferencia del sistema, activar o desactivar el fondo animado. Escape y Volver cierran el diálogo y devuelven el foco. No contiene ajustes sin función ni controles que alteren el juego.
- Las rutas interiores siguen funcionando después del arranque. Navegar conserva formularios y partidas; la consulta no registra compras ni ventas.

## Presentación y movimiento

Fondo procedural WebGL rojo y azul, con remolinos y reflejos, sin vídeo ni librerías nuevas. Logotipo tipográfico propio de Balatro Advisor, carta decorativa, fuente pixel existente y botones con relieve. La imagen de referencia no se incorpora como captura estática del fondo.

El render se limita a 30 fotogramas por segundo, 800.000 píxeles y DPR 1,25. Se detiene al salir del menú o al ocultarse el documento. Por defecto respeta `prefers-reduced-motion`; la selección explícita de Opciones prevalece. Sin WebGL se conserva un fondo estático Canvas2D/CSS y todos los controles.

La preferencia visual utiliza `balatro-advisor.menu-motion.v1`; no escribe el registro de partida ni la tienda. Si falla ese guardado, el cambio se aplica en memoria y se informa en Opciones. No requiere migrar los formatos anteriores.

Los botones conservan su orden y el formato horizontal. En pantallas de poca altura se compactan sus proporciones. Si el teléfono está en vertical, la interfaz completa gira 90 grados; no aparece un aviso ni un modo adicional. Se contemplan las áreas seguras.

## Verificación

`npm.cmd run test:menu` comprueba la entrada, enlaces, teclado/foco, preferencias, movimiento y pausas, alternativas sin GPU y conservación de datos en contextos aislados. Guarda capturas e informe en `docs/evidencia/menu/`, excluidos de Git.

Los runners de funciones interiores comprueban primero el arranque real en `#menu`; `tools/workspace-navigation.mjs` selecciona después la ruta interna del fixture y verifica que no escriba el registro. No se presenta como prueba de un enlace directo. La prueba dedicada `test:run-setup` comprueba el recorrido real por Jugar, pestañas, semilla, confirmación, guardado, recarga y Continuar. La prueba estática conserva sus oráculos bajo `/balatro-advisor/`.

Verificación ejecutada: `npm.cmd run check` pasó con 1.028 pruebas aprobadas, cero fallos y diez TODO manuales anteriores. El runner del menú pasó sus nueve grupos, incluido movimiento real WebGL comprobado por píxeles y llamadas de render, cinco tamaños y conservación exacta de un historial no vacío. También pasaron Mesa/frontend (nueve grupos), autoguardado (14), decisiones visibles (siete), avance (18), Colección y la prueba del artefacto estático bajo subruta.

Se revisó visualmente en el navegador abierto y en capturas de escritorio, móvil vertical pequeño y horizontal emulado; se corrigieron centrado del menú, proporción del título y botón principal móvil. No acredita una prueba en Android físico ni cambia la evidencia del motor o del asesor.
