# Selección de ciegas

7 de noviembre de 2026. Petición de interfaz basada en las dos capturas del usuario. Jugar en el selector inicia directamente esta pantalla, retirando el segundo modal de perfil. Se mantiene la cobertura del motor y el formato horizontal existente.

## Pantalla y datos

La mesa reproduce la composición de la referencia: panel lateral con recursos, tres ciegas, inventario arriba y dorso del mazo a la derecha. La zona superior izquierda de título/puntuación se sustituye por un comodín y un bocadillo con la orientación existente de `guideBlindChoice`. No es un chatbot ni un asesor nuevo: muestra su recomendación heurística, condición y limitación de supervivencia sin evaluar. No calcula porcentajes ni implica que se pueda superar una ciega.

El escenario ocupa toda la altura disponible: el panel izquierdo llega a ambos bordes y las tres columnas de ciegas se prolongan hasta el inferior, sin agrandar sus controles. La altura lógica se adapta a la relación de aspecto, incluida la orientación girada; las bandejas de comodines y consumibles tienen un fondo hundido más oscuro. Las pruebas comprueban los bordes en escritorio16:9/4:3 y móviles horizontales/girados.

El fondo verde reutiliza el renderer del menú con tratamiento de color; solo anima la pantalla activa, respeta movimiento reducido/Opciones y se pausa al ocultar el documento. Las fichas y etiquetas son atlas originales locales, con [procedencia](../web/assets/blinds/README.md). Primer fotograma estático en iconos, sin bibliotecas ni bucles adicionales para cada ficha.

Baraja, manos, descartes, dinero y cartas proceden del registro ya creado. Roja muestra 4/4; Azul 5/3; no se copian cifras de la captura. El número de rondas en selección deriva de las posiciones anteriores del ciclo menos el total observado de saltos; si faltan los datos, muestra «—». No se infiere composición para Errática ni se usa la semilla para generar resultados.

Los objetivos y premios de Pequeña/Grande utilizan `blindRequirement`, dentro de su cobertura y evidencia provisional existentes. Un objetivo actual observado prevalece sobre el valor de referencia. Con ciega actual desconocida no se inventan ante1 ni objetivos300/450. El jefe empieza sin identificar; su propio espacio permite transcribirlo. Las 28 identidades son presentación: solo se calculan los cuatro perfiles de jefe que ya admite el motor. Los demás conservan objetivo/premio desconocidos, salvo datos observados previamente para el mismo jefe/ante. Una ilustración no amplía la cobertura de reglas.

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
