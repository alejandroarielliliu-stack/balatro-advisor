# UX01 — consejo de tienda compacto

18 de octubre de 2026. Primera tarea del [plan vigente](hoja-de-ruta-asesor.md). Implementa presentación sobre DEC00/quick-shop-2; no añade catálogo, fórmulas, criterios de compra ni persistencia.

## Comportamiento

La primera respuesta muestra título y estado del consejo, alternativas indicadas por la política con precio/saldo hipotético, un beneficio y un sacrificio. Precio desconocido, modificador incompatible, condición material relevante o regla pendiente en modo estricto permanecen visibles. Las condiciones de varias opciones y conflictos estructurados se conservan; no se elige arbitrariamente una alternativa para resumir el empate.

El aporte propio +Mult se identifica como tal, no como diferencia de puntuación total. Los recursos de un vale son totales proyectados. El coste neto y las pérdidas por reemplazo proceden de consecuencias H2; los intereses se muestran condicionados a ganar y conservar el saldo hasta cobrar. La etiqueta de alcance conserva supervivencia sin evaluar y evidencia provisional cuando corresponden.

Cuatro accesos mantienen el contenido anterior:

- **Ver por qué:** razones originales completas de la recomendación.
- **Datos pendientes**, cuando existen: las preguntas de DEC00, además del aviso decisivo del resumen.
- **Alternativas:** todos los artículos y conservar, saldos, consecuencias H2, motivos y cobertura. No cambia la exclusión del botón de renovación indicada por el usuario.
- **Análisis de manos:** comparación optativa de planes, controles y resultados existentes. No se calcula una mano por abrir el resumen.

Los límites completos permanecen desplegables. Los desplegables usan controles nativos de HTML; el análisis optativo conserva su apertura cuando se recalcula. Cerrar y volver a abrir presenta inicialmente el consejo breve; si se dejó la comparación de planes activa, esa sección sigue accesible abierta.

## Implementación y límites

`src/ui/shop-advice-summary.ts` es un presentador puro del resultado existente. Conserva título, estado y orden, sin acceso a DOM, almacenamiento, nuevos estados de partida ni ranking. Usa campos estructurados de DEC00, H2, findings y señales de encaje; no extrae otra política analizando párrafos.

`src/ui/storefront.ts` presenta ese resumen y mantiene todas las razones originales en detalles. `web/mesa.css` reutiliza colores, tipografía y controles del proyecto; no se añaden dependencias ni imágenes.

Se comprobó que las 116 fuentes previas fuera de `src/ui` conservan sus hashes LF frente a la congelación de EVAL01a. El reservado de aquel lote no se reabre ni se modifica para validar la interfaz. Sus resultados estratégicos mantienen su alcance y revisión; un cambio de UI tampoco demuestra mayor eficacia estratégica.

Persisten límites del consejo original. Si la política no aporta una consecuencia estructurada suficiente, el presentador no fabrica una cifra ni una explicación estratégica nueva. La ampliación de comparaciones y pérdidas específicas permanece en DEC02.

**UX01b continúa pendiente:** algunas ediciones básicas aún pasan por Registro. Esta entrega no implementa el autoguardado adicional ni el resumen parcial OBS01d. Consultar, desplegar, cerrar o comparar sigue sin registrar acciones reales.

## Comprobaciones

- `npm run check`: 936 pruebas aprobadas, 0 fallos y 10 TODO de contraste manual. Dieciséis pruebas nuevas del presentador: compras, mismo rol, recursos, interés condicionado, reemplazo, empates, datos pendientes, modo estricto, condiciones múltiples, conflicto con Bull y copias independientes.
- `npm run test:compact-advice`: seis grupos Chrome con perfiles aislados. Compra con +6 Mult propio y saldo8; razones completas recuperables; reemplazo Popcorn4 con coste neto0; precio/modificador incompatibles visibles; análisis optativo, modo estricto y consulta/recarga sin escrituras; móvil390×844 sin desbordamiento y resumen completo en la primera vista.
- Regresiones de tienda, capacidades DEC00, consecuencias/planes, consejo EVAL01a y compras de vales conservan sus aserciones. Ahora abren los desplegables como un usuario antes de inspeccionar el detalle; no se sustituyeron comprobaciones por mera existencia de nodos ocultos.
- Capturas e informe runtime: `docs/evidencia/ux01/`, ignorados según la convención del repositorio. Se revisaron visualmente escritorio, móvil, precio desconocido y modificador incompatible.

Estos casos son sintéticos y comprueban interfaz/contratos. Móvil emulado no es Android físico; no se observó una nueva partida de Balatro ni se midió todavía la comprensión de un jugador. EVAL01b mantiene esa comprobación de uso abierta.

La publicación usa el workflow existente. El modo público del script acepta `UX01_BASE_URL`, `UX01_COMMIT` y `UX01_WORKFLOW` y compara26 archivos (módulos críticos, HTML y CSS) con `out/` antes de ejecutar los mismos seis grupos.
