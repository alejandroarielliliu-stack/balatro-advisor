# Selección de partida

7 de noviembre de 2026. Implementación a partir de la captura y aclaración final del usuario: se retira la propuesta de barajas vecinas y se reproduce la disposición de la foto, con cuatro botones rojos de flechas. Sustituye el destino provisional de Jugar descrito en [menú principal](menu-principal.md). Conserva tres pestañas rojas arriba, baraja, dificultad, casilla de semilla junto a Jugar y Volver a todo el ancho debajo.

## Composición

Panel ancho sobre el fondo animado existente, atenuado para dar prioridad a las cartas. Conserva la presentación exclusivamente horizontal y su giro visual en teléfonos verticales.

La baraja central muestra su ilustración original, nombre y efecto. Los botones rojos altos a ambos lados cambian la selección; la fila de dificultad repite la disposición con botones más bajos. No se muestran barajas ni fichas vecinas. El panel y el espacio de descripción mantienen su altura al cambiar de selección.

Debajo se elige la **dificultad/stake**, mediante fichas de colores. La fila White Stake de la captura no representa las ciegas pequeña, grande y jefe; estas pertenecen al recorrido posterior de la partida.

## Interacción

- Pulsar las flechas cambia la baraja o dificultad. Se conserva el gesto de arrastrar/deslizar y se ajusta a una selección completa al soltar. Las flechas conservan su DOM y foco al cambiar; Escape sigue disponible inmediatamente después.
- Puntos pequeños y agrupados debajo de cada fila permiten elegir directamente, como en la referencia. Tienen nombre accesible y selección identificada; las flechas grandes y el teclado ofrecen la misma selección sin depender de pulsar esos puntos pequeños.
- Cada selector conserva su elección al mover el otro. Las flechas recorren cíclicamente barajas y dificultades; Home/End permiten ir a los extremos por teclado.
- Sin avance automático, cambio al pasar el ratón ni captura de la rueda vertical de toda la página. El fondo puede moverse independientemente.
- La integración debe convertir los gestos a coordenadas lógicas con `layoutPoint`, reutilizando el sistema horizontal existente.

Los controles se basan en los [patrones de carrusel de WAI-ARIA APG](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/): selección explícita, botones semánticos anterior/siguiente, nombres accesibles y control por teclado.

## Flujo y guardado

Jugar abre `#setup`. Las tres pestañas permanecen visibles: Nueva partida, Continuar y Retos. Continuar muestra la copia disponible o el acceso a importar una copia; Retos comunica que no está implementado y no permite iniciar. No se añadió un motor de retos.

Volver cierra el panel sin alterar la partida registrada; las elecciones de esta sesión se conservan al reabrirlo. Iniciar valida la selección y reutiliza `createNewRun` y el guardado existente. Por la petición posterior del usuario, Jugar inicia directamente la [selección de ciegas](seleccion-ciegas.md), sin el modal de declaración Steam. El contexto de trabajo ya declarado es Steam 1.0.1o-FULL sin mods y Blanca; no se han ampliado esos límites. Si hay una partida, exige marcar «Sustituir la partida guardada» en el propio panel. La cancelación y cualquier fallo de persistencia conservan íntegra la copia anterior. Explorar los selectores solo modifica un borrador de presentación; nunca dinero, inventario ni historial. Exportar sigue disponible en Registro.

Marcar «Con semilla» muestra el gancho y un campo centrado encima de Jugar; desmarcarla lo oculta sin mover el panel. La semilla se conserva como texto manual descriptivo opcional `seed` en el estado 0.2, no vacío y de hasta 64 caracteres. No representa una validación del formato de Balatro ni activa predicciones, generación aleatoria o importación de partidas. Los archivos anteriores sin ese campo siguen válidos; el lector 0.1 no se amplía. Estado, semilla e historial se guardan mediante la misma transacción H1.

Cada carga de documento normaliza la URL a `#menu`. La partida guardada permanece intacta y se recupera desde Continuar. La navegación interna posterior y los borradores existentes siguen disponibles; Continuar no recarga la aplicación ni descarta una transcripción pendiente.

## Cobertura que debe respetar la implementación

El catálogo contiene 15 barajas, pero `deckDefinition` y `createNewRun` admiten 10. El inicio fija White Stake dentro del perfil Steam 1.0.1o-FULL sin mods ya declarado. Mostrar otras opciones no equivale a implementarlas: pueden previsualizarse con su limitación, pero no iniciar una partida aplicándoles silenciosamente las reglas de Blanca. Ampliar ese alcance es una tarea del motor, separada del selector visual.

Errática conserva la composición desconocida hasta registrar sus cartas reales. No se inventa un mazo inicial al seleccionarla.

Los 15 dorsos y ocho fichas usan los atlas originales de Balatro `Enhancers.png` y `chips.png`, del mismo espejo público y commit fijado que el catálogo de comodines. No se presentan como ilustraciones propias. Su [procedencia](../web/assets/decks/README.md), hashes, dimensiones y posiciones acompañan a `deck-art.ts`. Los PNG se sirven localmente; no requieren solicitudes externas ni nuevas dependencias. Un error de carga o ID desconocido muestra «?» de forma explícita.

## Comprobación

`npm.cmd run test:run-setup` ejecuta seis grupos: entrada/recarga obligatoria por menú; pestañas, flechas con foco/Escape, 15 ilustraciones originales, independencia y casilla; inicio directo y guardado de semilla; consentimiento en el panel/cancelación/error de persistencia/reintento al sustituir; conservación del borrador al continuar; tamaños horizontales y giro de gestos en móvil vertical emulado. Las expectativas de dinero $4 y $14 y cinco manos de Azul son oráculos literales, no salidas generadas por el motor.

Once pruebas unitarias comprueban el puente de inicio, el metadato opcional, importación/exportación, revisión cambiada, permisos de escritura y atomicidad, incluido el reemplazo directo consentido. La emulación no se presenta como una prueba en Android físico ni evidencia nueva de reglas en Balatro.

Se conservan el motor de reglas, la cobertura de dificultad blanca y la separación de Project Bonk.
