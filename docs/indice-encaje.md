# QR05a — índice de encaje abierto

2026-10-13. El usuario solicita más resolución que 0–10. La entrega usa un decimal y elimina el denominador y el techo fijo; no introduce una medición de probabilidad, puntos de mano o utilidad óptima.

## Plan realizado

1. Revisar dónde se pierden diferencias: franjas de ante, bandas de material y contadores reducidos a «positivo».
2. Separar la política editorial de las reglas del juego. Centralizarla en `src/advisor/fit-index.ts`, manteniendo perfiles, predicados y compra legal de H2.
3. Sustituir bandas numéricas por proporción continua y anclajes de etapa interpolados. Suavizar también el límite por material escaso.
4. Incorporar un ajuste explícito de aporte actual para contadores de puntuación permitidos; no interpretar progreso, ingresos o tamaño de mano como puntos. Preservar condiciones y desconocidos.
5. Adaptar inventario, fichas y candidatos; verificar fórmulas editoriales con oráculos independientes, guardados y visuales de escritorio/móvil.

El contrato completo está en [encaje rápido](encaje-rapido.md). Este documento conserva las decisiones nuevas y sus ejemplos; no duplica los predicados de los150 perfiles.

## Decisiones numéricas

El índice base expresa los tres ejes anteriores en unidades de 10. **Esto por sí solo no aportaría información.** La discriminación nueva proviene de material `1+2·n/N`, etapa interpolada entre ante 1/4/8 y ajuste de magnitud.

El ajuste es `10·log₂(1 + aporte/referencia)`. Se aplica solo al contador designado por comodín en `FIT_MAGNITUDE_COUNTERS`, cuando su perfil usa contadores de puntuación. Las referencias editoriales son100 Fichas,20 Mult y100 centésimas de gananciaXMult; ×1 tiene ganancia0. El logaritmo evita que una gran acumulación eclipse linealmente todos los componentes. La constante 10 fija resolución; **no afirma que esas unidades del juego tengan utilidad equivalente**. No se añaden dólares al índice.

Estos criterios son editoriales y comprobables como software; no proceden de fórmulas del ejecutable ni de calibración contra resultados de partidas. No hay pesos de escenarios ni frecuencia de robo implícitos. Mostrar un decimal no justifica desempatar una decisión de compra por 0.1 si existen costes, riesgos o condiciones distintas.

## Oráculos sintéticos

Estados compatibles con la estructura; mazos transcritos con IDs distintos. No son observaciones del juego. Inventario vacío salvo el participante indicado, sin otras bonificaciones. Los esperados se obtienen de las reglas anteriores, antes de consultar el evaluador.

| Caso | Esperado de política | Qué comprueba |
| --- | --- | --- |
| Lusty ante4,13 corazones de 52; luego 14/52 | 55.0→55.4 | Preparación1.5→20/13; etapa2 e integración2. Una carta cambia la proporción, sin acreditar una mano robada. |
| Joker ante1/2/3/4/8 | 80.0/76.7/73.3/70.0/60.0 | Anclajes3/2/1; preparación3 e integración2. Sin saltos por pasar de ante2 a3. |
| Green poseído ante 8,+12/+13 Mult | 76.8→77.2 | Base70; ajustes6.780719…/7.224660…. Sigue condicionado a jugar/descartar. |
| Green poseído ante 8,+20/+60 Mult | 80.0→90.0 | Log₂2=1 ylog₂4=2; rendimientos decrecientes del índice. |
| Green+1260 Mult, prueba de estrés estructural | 130.0 | Log₂64=6 ybase 70; ausencia de techo100. No se afirma que este contador se haya alcanzado dentro de ante8. |
| Fotografía+Chad ante8,1 figura de 40 | 62.5 | Etapa limitada 2.2, preparación 1.05 e integración 3. La sinergia no borra material escaso. |
| Green poseído con Mult desconocido | ≥40.0, `score:null` | No inventar cero ni máximo 100. Es cota editorial, sin significado estadístico. |
| Bus+1260 Mult conPareidolia | ≤20.0 | Condición imposible vence al ajuste; consultar no reinicia el contador real. |
| VenderGreen+20 por $2 ycomprar otro por $4 | Índice50.0, ajuste0; saldo30→28 | La compra usa contador inicial 0; registra sacrificio y valida H2, sin cambiar la entrada. |

## Cobertura y continuidad

El índice no diferencia todavía todas las magnitudes de Steel Joker, Stencil, Swashbuckler, ingresos o tamaño de mano. Esos predicados conservan datos y explicación, con empates cuando no hay criterio implementado. Las sinergias de los 22 vales de catálogo pendientes no aparecen por ampliar la escala. Plasma, historial y condiciones conjuntas conservan sus límites.

El modo poseído y la compra son mutuamente excluyentes; una instancia debe corresponder al ID valorado. Un reemplazo exige compra y validación venta→compra de H2. Las opciones ambiguas se rechazan sin nota ni transacción. No hay migración de archivos: quick-fit no se persiste; H1/T09b y sus revisiones conservan formato. La rúbrica de escenarios de Análisis es otro contrato y permanece identificada como tal.

## Evidencia

`tests/fit-index.test.ts` conserva 18 pruebas I01–I18 independientes de los auxiliares del índice. `npm run check` y `npm run test:fit` verifican la política, determinismo, inmutabilidad, datos faltantes, recursos y guardado. [Reporte de navegador](evidencia/quick-fit/report.json), [escritorio](evidencia/quick-fit/mesa-desktop.png) y [móvil](evidencia/quick-fit/mesa-mobile.png). Las capturas se inspeccionaron visualmente; el móvil es emulación de anchura, no un nuevo ensayo físico Android.

El inventario conserva su altura fija de216px. Los números quedan dentro del panel y los rangos incompletos caben en sus cartas a390px; las comprobaciones de geometría esperan al final de la animación de entrada.

Regresiones realizadas: web 17 grupos, diseño 15 grupos, galería, candidatos y Mesa viva. Los cálculos independientes80→572, 240→676 y 3712→4176 siguen en Análisis. No se modificó el catálogo, la lógica estratégica de escenarios ni Project Bonk.
