**Actualización T10:** [interfaz local, concurrencia, pruebas y límites](interfaz-t10.md). Web Locks coordina escritores, T09b sigue siendo autoritativo y Playwright prueba el navegador.

# Arquitectura mínima v0.1

**T09b, 2026-10-10:** storage/confirmed-store.ts coordina confirmación humana, H2 y el guardado H1 mediante un adaptador que escribe estado e historial en un único documento. No consume estados finales de T07b. [Contrato y límites de concurrencia](confirmaciones-t09b.md). La UI T10 está implementada; ver [contrato web](interfaz-t10.md).

**Actualización H3, 2026-10-10:** advisor/advisor.ts consume exclusivamente evaluaciones T07b para construir la matriz y explicaciones; advisor/policy.ts centraliza prioridades cualitativas. demo-advisor.ts es otra frontera CLI. [Contrato H3](asesor-h3.md). H1, H2 y T07b permanecen independientes del asesor; T10 añade UI sin simulación.

Actualización: 2026-10-09. El núcleo H1 está implementado en `balatro-advisor/`, dentro del Git raíz existente. No se inicializa otro repositorio ni se modifica Project Bonk. [H1](evidencia/h1-validacion.md) registra las pruebas y sus límites.

**Actualización H2/T07b:** catalog/initial.ts y rules/{core,shop,scoring,round,economy,engine-evidence}.ts implementan catálogo, reglas y trazas. evaluation/{plan,comparison}.ts añade evaluateRoundPlan y compareShopAlternatives como orquestación pura del motor. src/demo.ts y src/demo-comparison.ts son fronteras CLI con Node. [Contrato H2](motor-h2.md) y [contrato de comparación](comparacion-t07b.md). Estas capas no contienen la política estratégica de H3, UI ni simulador.

## Tecnología

Implementado: TypeScript estricto 7.0.2, Node 24.19.0 y runner nativo `node:test`, sin dependencias de ejecución. Versiones fijadas y lockfile; `npm ci` y `npm run check` reproducen instalación y comprobación. Se eligió el runner nativo en vez del Vitest inicialmente propuesto porque basta para este núcleo y evita dependencias adicionales.

T10 usa HTML/CSS y DOM nativo, módulos ES compilados con tsc y un servidor estático Node limitado a loopback. Vite no fue necesario. No se requiere framework, backend ni cuentas. La lógica de producción no importa Node: usa objetos, JSON y un puerto de almacenamiento síncrono compatible con localStorage.

Persistencia: clave propia, errores de acceso/cuota, exportación/importación y validación previa a escritura. El adaptador navegador obtiene localStorage al operar y captura fallos. H1 prueba también persistencia real entre procesos mediante Web Storage experimental de Node; no acredita pruebas en PC/Android. La interfaz futura se probará servida por HTTP; no se promete comportamiento de file://, hosting u offline.

## Responsabilidades y contratos

| Módulo / estado | Entrada → salida | Responsabilidad |
| --- | --- | --- |
| `catalog/` | rulesetId → datos inmutables | Ocho comodines, manos nivel 1, ciegas, fuentes, estado D/E y versión de reglas. No consejo estratégico. |
| `state/` — implementado | JSON desconocido → estado o errores por ruta | Tipos, integridad estructural e importación. Presets opacos; no decide cobertura ni ejecuta reglas. |
| `rules/` — implementado H2 provisional | estado + acción/evento → proyección y traza | Legalidad, saldos, capacidad, puntuación, contadores y cobro. Funciones puras sin DOM, red, reloj ni aleatoriedad. |
| `advisor/` — H3 básico implementado | estado + escenarios + acciones opcionales → consejo | Reutiliza T07b, construye métricas por dimensión y niveles, detecta insuficiencia y emite consejo condicional, empate o abstención con política versionada. |
| `explanations/` | trazas/razones estructuradas → texto español | Plantillas con cifras, supuestos, regla y causa de abstención. No inventar conclusiones con un modelo de lenguaje. |
| `ui/` | edición del jugador ↔ estado/análisis | Formularios, mensajes de error, tabla de opciones, detalles, aplicación explícita de acción y guardado. |
| `storage/` — implementado | instantánea validada ↔ JSON local/archivo | Guardar/restaurar, informar fallos y proteger la partida previa. Sin derivados autoritativos. |
| `evaluation/` — T07b implementado | estado + escenario → ramas y diferencias | Reutiliza acciones y eventos H2; procede por copias, no infiere robos ni recomienda. Oráculos separados en tests y documentación. |

`rules/evidence.ts` conserva metadata histórica; engine-evidence.ts registra el contrato activo provisional. Los módulos de cálculo H2 consultan dependencias y devuelven errores/trazas; ninguna prueba los promueve a observados. Catálogo, reglas, estado y almacenamiento están implementados; asesor e interfaz también están implementados; el simulador sigue fuera de alcance. La salida de formatTrace es una presentación mecánica de pasos, no una recomendación.

Flujo futuro: interfaz → validación → catálogo + reglas → asesor → explicaciones → interfaz. Almacenamiento solo depende del contrato del estado. Las pruebas llaman directamente las reglas y el asesor; nunca extraen lógica de textos de la interfaz. Versionar separadamente motor y política estratégica para poder cambiar preferencias sin alterar las reglas del juego.

La API H1 expone `validateState`, `parseState`, `serializeState`, `createDraft`, `createStateStore`, `createBrowserStateStore` y consultas de evidencia. H2 añade las [APIs de acciones, puntuación, ronda y economía](motor-h2.md); T07b evalúa escenarios y compara alternativas sin preferencias estratégicas. `applyShopAction` produce una copia; la futura UI solo la guardará cuando se confirme que esa acción se realizó. Una revisión antigua produce error de estado obsoleto. Las entradas y salidas públicas son objetos serializables y no referencias DOM.

## Interfaz mínima

Una pantalla de captura con secciones plegables de partida, tienda y ejemplos, seguida de comparación y explicación de la opción seleccionada. Valores iniciales mediante presets confirmados, búsqueda en ocho nombres y teclado numérico para dinero. Errores junto al campo y un resumen accesible.

La comparación muestra primero cobertura y datos faltantes; después saldo/espacios, puntuaciones por ejemplo, interés condicionado, crecimiento y riesgos. En Android usar tarjetas por acción en vez de forzar una tabla ancha. Controles con objetivo táctil propuesto mínimo de 44×44 px, foco visible, etiquetas de formulario, sin información dependiente solo de color o hover. Actualización tras «Analizar» evita recalcular borradores incompletos como si fueran válidos.

## Evaluación y ampliación posterior

La corrección aritmética se mide con igualdad exacta sobre enteros y trazas. La calidad del consejo se mide separadamente: cobertura declarada, razones sustentadas, ausencia de certeza falsa y sensibilidad a cambios de dinero/jefe/descartes. Los nueve casos no miden tasa de victoria ni constituyen validación de eficacia.

Primero ampliar reglas mediante pruebas por interacción y versión. Posteriormente una interfaz opcional `simulate(state, action, policy, rng, budget)` puede consumir las mismas transiciones del motor, en un Web Worker si el coste lo justifica. Un RNG inyectado con semilla **del experimento**, distinto de la semilla desconocida del juego, permitirá reproducir muestreos. El modelo tendrá que especificar robos, ofertas y política de juego; no basta con repetir las manos favorables del jugador.

Antes de mostrar probabilidades: validación contra partidas o simulador fiel, conjuntos separados de ajuste/evaluación, calibración, intervalos y comparación con políticas base. Eso no es parte de v0.1. No añadir ahora workers, colas, servicios, telemetría, API de IA ni un simulador ficticio.

