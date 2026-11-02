# UI02 — Mesa de Balatro

2 de noviembre de 2026. Implementación del [prompt de frontend](prompt-frontend-balatro.md), sobre UX01/UX01b, OBS01d y DEC02. Cambia presentación y acceso a herramientas; conserva política, fórmulas, catálogo, formato de guardado y confirmaciones.

## Jerarquía implementada

- **Contexto horizontal:** baraja, dinero, ante y ciega, con acceso directo a las cartas del mazo. El formulario deja de ocupar una columna permanente.
- **Construcción:** comodines y composición comparten la primera fila de escritorio. En móvil se apilan. La bandeja conserva altura estable; capacidad, añadir, inspección y edición tienen espacios distintos.
- **Tienda:** cartas, vale y sobres forman bandejas agrupadas. El consejo ocupa una franja completa con título, beneficio, sacrificio, alcance y condición decisiva según los datos existentes. Pulsarlo abre razones y alternativas completas.
- **Recorrido:** fase actual y acción principal visibles; etiquetas, deshacer y terminar se consultan en «Más». Escape y seleccionar una utilidad cierran ese menú con devolución de foco.
- **Bajo demanda:** la colección se abre desde «Añadir», desde la búsqueda de tienda o desde su desplegable. «Cartas del mazo» abre y enfoca el editor dentro de «Mazo y ajustes». Los controles especializados siguen disponibles.

La fuente pixelada local identifica títulos y cifras; campos y explicaciones usan tipografía de sistema. Fieltro, cartas, precio dorado, botones coral y paneles conservan el lenguaje del juego. Se consolidaron las reglas de distribución anteriores en `web/mesa.css`. No se añadieron recursos remotos ni dependencias.

La adaptación usa el ancho disponible del contenedor, también cuando el zoom reduce el espacio de composición. Los valores originales de los índices, intervalos e incertidumbres siguen siendo datos del asesor. «Índice heurístico» diferencia la composición de la puntuación exacta de una mano.

## Contratos conservados

Consultar, comparar, desplegar y cerrar no escriben el estado registrado. Las observaciones básicas guardan al terminar su edición; las acciones realizadas conservan sus confirmaciones. Se mantienen historial, revisión, recuperación, estado desconocido, cobertura parcial, reglas provisionales y segunda pestaña en lectura.

El inspector de comodines queda fuera de la colección plegada y de la bandeja de inventario: puede abrirse desde una carta propia sin desplegar el catálogo y sus cifras hipotéticas no se mezclan con las cifras del inventario.

## Verificación

Comprobaciones locales sobre perfiles de navegador aislados y estados sintéticos:

- `npm.cmd run check`: **997 pruebas aprobadas**, cero fallos, diez TODO de evidencia manual del juego. TypeScript aprobado. Sin cambios en motor, asesor, estado o almacenamiento.
- `npm.cmd run test:frontend`: nueve grupos sobre estado vacío, misma construcción a 1440/390/360 px, contraste de textos principales, capacidad separada, teclado y retorno de foco, búsqueda y filtros combinables, bandeja estable, consulta sin escrituras, cuatro pantallas con zoom al 200 %, segunda pestaña en lectura y consejo parcial.
- `npm.cmd run test:site`: artefacto estático bajo `/balatro-advisor/`, recursos locales, guardado/recarga, separación de consultas, puntuación independiente 80→572 y ausencia de peticiones externas o errores JavaScript.
- Regresiones actuales: composición, mazo, autoguardado, DEC02, consejo compacto y rápido, tienda y sesión, recorrido, etiquetas, observaciones, correcciones, vales, sobres, Tarot/Arcana, comparación de ciegas y migración.

Los arneses afectados abren los nuevos desplegables mediante interacción real. Se conservan los resultados esperados de cálculos y las aserciones de persistencia. El antiguo `test:design` conserva expectativas históricas de guardado manual anteriores a UX01b; no es la puerta de aceptación de esta entrega. Se usan las verificaciones actuales indicadas arriba.

Se inspeccionaron capturas antes/después y se corrigieron desbordamiento de navegación a 360 px, distribución con zoom, colisión de un atributo de navegación, separación del contador de huecos y ubicación del inspector. La evidencia reproducible se genera en `docs/evidencia/frontend/` y sigue la convención de archivos locales ignorados; no entra al artefacto público.

## Límites

Las capturas móviles son Chrome de escritorio con tamaños móviles. No se afirma una prueba en Android físico, con teclado virtual real ni una auditoría completa con lector de pantalla. El contraste se comprueba para los textos seleccionados por el arnés; no certifica WCAG para todas las pantallas y estados.

La interfaz no amplía la calidad estratégica demostrada por DEC02 ni valida supervivencia hasta ante 8. La siguiente comprobación de producto sigue siendo **EVAL01b**: observar si una persona introduce su tienda, entiende el consejo y registra su decisión con poco esfuerzo. No hay resultados humanos inventados.

Las [fuentes y su aplicación](prompt-frontend-balatro.md#investigación-aplicada) permanecen junto al encargo: material oficial de Balatro, jerarquía y divulgación progresiva de NN/g, movimiento con propósito y criterios de W3C.
