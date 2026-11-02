# Prompt para el rediseño del frontend

Preparado el 1 de noviembre de 2026. **Propuesta para la siguiente implementación; no describe un rediseño ya realizado.** Basado en el código actual, el plan vigente y capturas guardadas de OBS01d y DEC02. En esta preparación no se ejecutó una nueva inspección interactiva de la publicación.

## Diagnóstico y dirección

La aplicación ya tiene identidad de Balatro y funciones suficientes para su recorrido principal. El problema visible es la competencia entre controles: recorrido, atajos y formulario preceden al contenido decisivo; abrir el mazo alarga mucho la columna; numerosas cajas tienen peso similar; el botón estrecho del consejo fragmenta la frase. En móvil, esa organización retrasa la composición y la tienda. Es una revisión de diseño, no un resultado de pruebas con usuarios.

Dirección propuesta: **una mesa de asesor**, con contexto compacto, comodines y composición reconocibles, tienda fácil de transcribir y consejo cercano a las opciones. Menos instrucciones permanentes y formularios expuestos; más edición desde los objetos del juego. La recomendación debe seguir distinguiendo hechos, hipótesis y limitaciones relevantes.

## Investigación aplicada

| Fuente consultada | Aplicación propuesta |
|---|---|
| [Press kit oficial de Balatro](https://www.playbalatro.com/press-kit/) | Referencia visual y acceso a pantallas/animaciones oficiales. Reutilizar los recursos locales y su identidad; no añadir fondos de vídeo ni cargar recursos externos para funcionar. |
| [NN/g: jerarquía visual](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/) | Prioridad mediante escala, contraste y agrupación: construcción, tienda y decisión por delante de controles secundarios. |
| [NN/g: divulgación progresiva](https://www.nngroup.com/articles/progressive-disclosure/) | Edición especializada y explicaciones completas bajo demanda, conservando visibles las limitaciones decisivas. |
| [NN/g: heurísticas de usabilidad](https://www.nngroup.com/articles/ten-usability-heuristics/) | Vocabulario del jugador, estado de guardado veraz, reconocimiento de cartas, recuperación ante errores y control sobre acciones realizadas. |
| [NN/g: movimiento en UX](https://www.nngroup.com/articles/animation-purpose-ux/) | Movimiento corto para selección, apertura o cambio de estado; sin distracción continua. |
| [W3C: contraste](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) y [tamaño de objetivos](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | Contraste de texto y controles comprobable, objetivos activables y espacio suficiente pese a la densidad visual. |

Estas fuentes orientan la propuesta; no demuestran que el diseño futuro sea usable. Debe comprobarse sobre tareas reales de esta aplicación.

## Prompt listo para usar

Rediseña e implementa el frontend de **Balatro Strategic Advisor**. Quiero una herramienta bonita, compacta e intuitiva que parezca pertenecer al universo de Balatro. Debe ayudar durante una partida con pocas entradas y un consejo breve y explicable.

### 1. Revisa antes de cambiar

Trabaja únicamente en `C:\Users\Aleja\balatro-advisor-github`. No modifiques Project Bonk ni crees otro repositorio. Revisa `AGENTS.md` si existe, el estado de Git y el trabajo previo.

Lee el plan vigente, el backlog y los contratos de UX01, UX01b, OBS01d y DEC02. Inspecciona la aplicación funcionando antes de diseñar. Distingue lo observado ahora de las capturas históricas.

La aplicación usa TypeScript, DOM y CSS, sin framework de interfaz. Revisa `web/index.html`, `web/mesa.css`, `web/style.css` y `src/ui/`: especialmente `workspace`, `app`, `run-progress-view`, `storefront`, `composition-view`, `deck-editor` y `joker-bay`.

### 2. Diseña para el recorrido principal

El recorrido que debe entenderse a primera vista es:

1. Iniciar o retomar la partida y ver baraja, ante/ciega y dinero.
2. Reconocer y editar los comodines propios, sus valores pertinentes, cartas modificadas del mazo y vales.
3. Ver el puntaje de composición y sus seis apartados existentes.
4. Indicar los artículos y precios de la tienda: comodines, vale y sobres.
5. Entender el consejo: acción, beneficio, sacrificio y condición que podría cambiarlo.
6. Registrar lo realizado en Balatro, aunque sea diferente del consejo.

Las manos y escenarios exactos permanecen en Análisis, como herramienta opcional. Historial, recuperación e importación/exportación siguen accesibles en Registro. Colección conserva búsqueda y filtros. Puedes reorganizar navegación y distribución si reduces fricción sin perder estas funciones.

Propón brevemente la jerarquía y después implementa. No necesitas consultarme colores ni posiciones.

### 3. Dirección visual

Usa Balatro como lenguaje: fieltro oscuro, cartas físicas, paneles con profundidad sobria, dinero dorado, acentos rojos/azules y tipografía pixelada local para títulos y cifras. Mantén una fuente clara para campos y explicaciones.

Reutiliza ilustraciones, fuente y recursos locales. Define colores, tamaños, espaciados, bordes y estados compartidos. No acumules correcciones CSS contradictorias.

No basta con cambiar colores: replantea composición y flujo. Evita grandes encabezados vacíos, tarjetas de estadísticas repetidas, cajas para cada frase, efectos CRT sobre texto y decoración que dificulte leer.

### 4. Problemas concretos que debes resolver

- Comprime contexto y recorrido: ahora demasiados controles preceden a composición y tienda. Separa visualmente la acción habitual de deshacer o terminar una partida.
- Conserva una bandeja estable para los comodines. Consultar una carta no debe estirar toda la fila; detalles y edición se abren al pulsarla. Mantén ordenación, capacidad y alternativa al arrastre.
- Presenta composición con su número principal y barras existentes. Explicaciones al pulsar. Identifica la valoración como heurística, sin convertirla en fichas de una mano ni probabilidad de victoria. No inventes escalas ni recortes valores válidos para llenar las barras.
- Da al consejo un espacio legible junto a la tienda. Evita frases partidas en una columna estrecha. Conserva alternativas visibles o fácilmente comparables, beneficio y coste; no obligues a recordar cartas de una en una.
- Edita el mazo mediante sus cartas y los cambios observados. Los recuentos se derivan de esos datos; no pidas introducirlos otra vez. Las operaciones de restaurar composición inicial o marcarla desconocida deben diferenciarse de la edición cotidiana.
- Haz accesible la búsqueda de comodines sin mantener una galería grande dominando la Mesa. Conserva filtros combinables y selección mediante detalle con acción explícita.
- Usa texto breve y concreto. Elimina explicaciones repetidas, nunca una advertencia que podría cambiar la decisión. No añadas Renovar ni controles decorativos sin una función real.

### 5. Conserva los contratos del producto

No cambies reglas, fórmulas, ranking, catálogo ni cobertura estratégica para facilitar el diseño. Reutiliza los resultados y presentadores existentes; no calcules estrategia en la vista.

Consultar o comparar nunca modifica la partida. Las observaciones válidas se guardan al terminar su edición; comprar, vender o registrar una secuencia realizada exige confirmación explícita. No confundas registrar una oferta con comprarla. No copies robos, ingresos ni estados hipotéticos al registro real.

Conserva revisiones, detección de recomendaciones antiguas y duplicadas, bloqueo de escritura desde otra pestaña y guardados compatibles. Un error debe mantener borrador y copia previa recuperables; muestra reintento y descarte explícito. No presentes éxito si no se guardó.

Desconocido no es cero. Comparación parcial, reglas provisionales, efectos incompatibles, empates y abstenciones deben conservar su significado. Si una oferta pendiente puede cambiar el consejo, dilo cerca de la conclusión. No inventes porcentajes ni una recomendación concluyente.

### 6. Interacción y adaptación

Diseña escritorio y móvil según sus tareas. En móvil no antepongas un formulario largo a la construcción y la tienda. Evita diálogos anidados, recortes y desplazamientos internos innecesarios. El teclado virtual no debe tapar la acción para terminar una edición.

Mantén foco visible, etiquetas, teclado, Escape y retorno de foco. No dependas del color ni de hover. Comprueba contraste de texto normal de 4,5:1 y texto grande de 3:1. Respeta objetivos de al menos 24 × 24 px CSS o las excepciones de separación de WCAG; prioriza aproximadamente 44 px para acciones táctiles frecuentes. Usa movimiento breve y respeta `prefers-reduced-motion`.

No añadas framework, dependencias, cuentas, backend ni simulación. Conserva las rutas relativas y el funcionamiento en GitHub Pages bajo `/balatro-advisor/`.

### 7. Valida e itera

Comprueba al menos 360/390 px y escritorio de 1440 px, además de zoom al 200 %. Toma capturas del mismo estado en ambos tamaños; revisa jerarquía, densidad, lectura y acceso a acciones. Corrige los problemas encontrados antes de darlo por terminado.

Recorre estos casos con datos de prueba aislados:

- Retomar una partida, cambiar dinero y editar un comodín; recargar y recuperar los cambios.
- Cambiar una carta del mazo y comprobar que se actualiza la valoración pertinente.
- Introducir una tienda, comparar alternativas y consultar detalles sin modificar el estado real.
- Registrar una venta y una compra válida mediante confirmación; revisar historial.
- Ver una comparación parcial, un dato desconocido y un fallo de guardado sin mensajes engañosos.

Ejecuta `npm.cmd run check`, `npm.cmd run test:site` y las pruebas web pertinentes de composición, tienda, DEC02, consejo compacto, autoguardado y mazo. Adapta selectores si cambia la estructura, preservando sus aserciones. No retoques expectativas estratégicas para aprobar un cambio visual.

Entrega una comparación visual antes/después, decisiones de diseño, archivos afectados, pruebas y límites pendientes. Si no inspeccionaste visualmente el resultado, dilo. No declares validada la utilidad con usuarios solo por compilar o superar pruebas automáticas. No publiques cambios remotos sin autorización aplicable.
