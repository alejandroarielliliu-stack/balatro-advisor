# Selección de ciegas

7 de noviembre de 2026. Petición de interfaz basada en las dos capturas del usuario. Jugar en el selector inicia directamente esta pantalla, retirando el segundo modal de perfil. Se mantiene la cobertura del motor y el formato horizontal existente.

## Pantalla y datos

La mesa reproduce la composición de la referencia: panel lateral con recursos, tres ciegas, inventario arriba y dorso del mazo a la derecha. La zona superior izquierda de título/puntuación se sustituye por un comodín y un bocadillo con la orientación existente de `guideBlindChoice`. No es un chatbot ni un asesor nuevo: muestra su recomendación heurística, condición y limitación de supervivencia sin evaluar. No calcula porcentajes ni implica que se pueda superar una ciega.

El escenario ocupa toda la altura disponible: el panel izquierdo llega a ambos bordes y las tres columnas de ciegas se prolongan hasta el inferior, sin agrandar sus controles. La altura lógica se adapta a la relación de aspecto, incluida la orientación girada; las bandejas de comodines y consumibles tienen un fondo hundido más oscuro. Las pruebas comprueban los bordes en escritorio16:9/4:3 y móviles horizontales/girados.

El fondo verde reutiliza el renderer del menú con tratamiento de color; solo anima la pantalla activa, respeta movimiento reducido/Opciones y se pausa al ocultar el documento. Las fichas y etiquetas son atlas originales locales, con [procedencia](../web/assets/blinds/README.md). Primer fotograma estático en iconos, sin bibliotecas ni bucles adicionales para cada ficha.

Baraja, manos, descartes, dinero y cartas proceden del registro ya creado. Roja muestra 4/4; Azul 5/3; no se copian cifras de la captura. El número de rondas en selección deriva de las posiciones anteriores del ciclo menos el total observado de saltos; si faltan los datos, muestra «—». No se infiere composición para Errática ni se usa la semilla para generar resultados.

Los objetivos y premios utilizan `blindRequirement`, dentro de Blanca y antes1–8. El [catálogo de 28 jefes](evidencia/jefes-catalogo.md) incorpora ilustración, descripción, mínimo, multiplicador y premio base: ordinarios$5; los cinco finales$8. El ante cambia la base de fichas y Plasma duplica el objetivo. Seleccionar un jefe rellena sus valores y conserva una corrección manual existente para el mismo jefe. La selección prioriza los disponibles en ese ante; los demás se consultan en Colección. Con ciega actual desconocida no se inventan ante1 ni objetivos300/450.

La ficha y sus valores numéricos no implementan todos los efectos sobre cartas o jugadas. El motor conserva una comprobación separada de los cuatro efectos anteriores y rechaza puntuaciones afectadas por los demás, incluso si su objetivo y premio ya están catalogados. Las fuentes son inspección estática provisional, no observación de una partida. La sección «Ciegas jefe» de Colección permite buscar por nombre o efecto y consultar las28 fichas sin modificar el registro.

Los paneles no tienen línea de cierre inferior: sus bordes laterales continúan hasta el límite de pantalla. Las cruces vacías se dibujan con dos barras CSS centradas, independientes de la línea base de la fuente.

## Etiquetas y acciones reales

El espacio vacío de cada etiqueta es un recuadro blanco discontinuo con «+» pixelado. Pulsarlo abre las 24 identidades existentes; elegir una registra únicamente la observación. Pequeña y Grande se pueden transcribir por separado desde el mismo ante. `blindTags?` en estado0.2 almacena `{ante,kind,tag}`; es opcional para archivos anteriores, se conserva con historial/exportación y se excluye de la proyección al lector0.1. El comando `observe_skip_tag` admite `blind?`; sin referencia mantiene su contrato anterior. Solo se actualiza `phaseData.skipTag` al observar la ciega actual, y se recupera la etiqueta futura al llegar a ella. No se permiten ciegas anteriores, otro ante ni una etiqueta de salto para Jefe.

Observar no cobra premios, adquiere etiquetas pendientes, descuenta dinero ni simula la partida. La escritura reutiliza H1 y su historial atómico; cada selector conserva el ID de partida y revisión con los que se abrió. Un fallo de almacenamiento mantiene la copia anterior y el selector abierto con el error. Navegar fuera cierra el selector, incluido el botón Atrás del navegador.

«Seleccionar» y «Saltar ciega» reutilizan los controles de avance real existentes: piden confirmar lo realizado en Balatro antes de guardar. Las ciegas futuras no permiten avanzar. Abrir la pantalla, consultar el consejo o cancelar no modifica el registro. Info partida, inventario y mazo llevan a Mesa; «Ver ciegas» permite regresar desde el recorrido cuando la fase es selección. Se conserva la interfaz anterior para cartas, tienda, resultados y copias; no se ha intentado implementar el juego dentro de esta pantalla.

## Verificación

- `npm.cmd run check`: modelo, guardado, reglas y asesor; cinco casos nuevos de etiquetas observadas y dos de inicio directo/reemplazo.
- `npm.cmd run test:run-setup`: seis grupos de entrada, selección, semilla, consentimiento de sustitución, error/reintento y móvil.
- `npm.cmd run test:blind-screen`: seis grupos de recursos/objetivos literales, separación de observaciones, fallo de guardado, jefe fuera de cálculo, recarga/Continuar, avance confirmado, incertidumbre, importación de premio grande, Atrás y tamaños1280×720/844×390/390×844/568×320.
- Pruebas anteriores de recorrido, etiquetas, jugar/saltar, menú y orientación; comprobación del artefacto bajo `/balatro-advisor/`.

Las expectativas300/450,$4,Roja4/4 y Azul5/3 son literales independientes; las demás comprobaciones son contratos de UI/persistencia. Ninguna se presenta como observación nueva en Balatro ni prueba en un Android físico. Capturas e informe en `docs/evidencia/blind-screen/`, excluidos de Git.
