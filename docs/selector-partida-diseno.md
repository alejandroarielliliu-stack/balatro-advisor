# Selección de partida

7 de noviembre de 2026. Implementación a partir de la captura y aclaración del usuario. Sustituye el destino provisional de Jugar descrito en [menú principal](menu-principal.md). La disposición conserva tres pestañas rojas arriba, barajas, dificultad, casilla de semilla junto a Jugar y Volver a todo el ancho debajo.

## Composición

Panel ancho sobre el fondo animado existente, atenuado para dar prioridad a las cartas. Conserva la presentación exclusivamente horizontal y su giro visual en teléfonos verticales.

La baraja central muestra ilustración, nombre y efecto breve. Las vecinas aparecen más pequeñas a ambos lados; no se añaden botones con flechas. El panel y el espacio de descripción mantienen su altura al cambiar de selección.

Debajo se elige la **dificultad/stake**, mediante fichas de colores. La fila White Stake de la captura no representa las ciegas pequeña, grande y jefe; estas pertenecen al recorrido posterior de la partida.

## Interacción

- Pulsar una baraja o ficha vecina la centra. Arrastrar con ratón o deslizar con el dedo cambia de opción y ajusta a una selección completa al soltar.
- Puntos debajo de cada fila permiten elegir directamente. Tienen un área pulsable mayor que el punto visible, nombre accesible y selección identificada. Teclado y foco siguen disponibles.
- Cada selector conserva su elección al mover el otro. Las barajas permiten un recorrido circular; la dificultad mantiene sus extremos.
- Sin avance automático, cambio al pasar el ratón ni captura de la rueda vertical de toda la página. El fondo puede moverse independientemente.
- La integración debe convertir los gestos a coordenadas lógicas con `layoutPoint`, reutilizando el sistema horizontal existente.

Los controles se basan en los [patrones de carrusel de WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/): selección explícita, botones semánticos, nombres accesibles y control por teclado. Las propias cartas vecinas cumplen la función visual de anterior/siguiente.

## Flujo y guardado

Jugar abre `#setup`. Las tres pestañas permanecen visibles: Nueva partida, Continuar y Retos. Continuar muestra la copia disponible o el acceso a importar una copia; Retos comunica que no está implementado y no permite iniciar. No se añadió un motor de retos.

Volver cierra el panel sin alterar la partida registrada; las elecciones de esta sesión se conservan al reabrirlo. Iniciar valida la selección y reutiliza `createNewRun` y el guardado existente. Si hay una partida, conserva la confirmación de reemplazo y la recuperación/exportación actuales. Explorar los carruseles solo modifica un borrador de presentación; nunca dinero, inventario ni historial.

Marcar «Con semilla» muestra el gancho y un campo centrado encima de Jugar; desmarcarla lo oculta sin mover el panel. La semilla se conserva como texto manual descriptivo opcional `seed` en el estado 0.2, no vacío y de hasta 64 caracteres. No representa una validación del formato de Balatro ni activa predicciones, generación aleatoria o importación de partidas. Los archivos anteriores sin ese campo siguen válidos; el lector 0.1 no se amplía. Estado, semilla e historial se guardan mediante la misma transacción H1.

Cada carga de documento normaliza la URL a `#menu`. La partida guardada permanece intacta y se recupera desde Continuar. La navegación interna posterior y los borradores existentes siguen disponibles; Continuar no recarga la aplicación ni descarta una transcripción pendiente.

## Cobertura que debe respetar la implementación

El catálogo contiene 15 barajas, pero `deckDefinition` y `createNewRun` admiten 10. El inicio fija White Stake y exige confirmar el perfil Steam 1.0.1o-FULL sin mods. Mostrar otras opciones no equivale a implementarlas: pueden previsualizarse con su limitación, pero no iniciar una partida aplicándoles silenciosamente las reglas de Blanca. Ampliar ese alcance es una tarea del motor, separada del selector visual.

Errática conserva la composición desconocida hasta registrar sus cartas reales. No se inventa un mazo inicial al seleccionarla.

Los 15 dorsos y ocho fichas son ilustraciones vectoriales propias, no sprites oficiales ni recursos extraídos del juego. Su [procedencia](../web/assets/decks/README.md) y manifiesto acompañan a `deck-art.ts`; no requieren solicitudes externas ni nuevas dependencias.

## Comprobación

`npm.cmd run test:run-setup` ejecuta seis grupos: entrada/recarga obligatoria por menú; pestañas, 15 barajas, independencia y casilla; confirmación y guardado de semilla; cancelación/error de persistencia/reintento al sustituir; conservación del borrador al continuar; tamaños horizontales y giro de gestos en móvil vertical emulado. Las expectativas de dinero $4 y $14 y cinco manos de Azul son oráculos literales, no salidas generadas por el motor.

Nueve pruebas unitarias adicionales comprueban el puente de inicio, el metadato opcional, importación/exportación, revisión cambiada, permisos de escritura y atomicidad. La emulación no se presenta como una prueba en Android físico ni evidencia nueva de reglas en Balatro.

Se conservan el motor de reglas, la cobertura de dificultad blanca y la separación de Project Bonk.
