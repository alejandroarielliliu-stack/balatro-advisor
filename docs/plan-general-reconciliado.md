# Plan general y estado de ejecución

Revisión inicial del 2026-10-10, posterior a la recepción del plan Word y a la decisión del usuario de aplazar Android físico y probar formato móvil en web. Actualización de estado: 2026-11-01. El orden de implementación vigente está en [la hoja del asesor](hoja-de-ruta-asesor.md); las tareas PG02–PG04/PG06 de simulación quedan aplazadas mientras se cierra el consejo básico de tienda. [Reporte actual](reporte-hoja-de-ruta-2026-11-01.md).

Fuente leída íntegramente: `C:\Users\usuario\Downloads\Plan_general_Balatro_Strategic_Advisor.docx`, plan versión 1.0 del 8 de octubre de 2026. SHA-256 `BE57A0AA4F9CFC58EF790B6FBFDBCDFEFC8CBBD7915ABE46AEFB20033EEA96BD`. El archivo original se conservó sin cambios. Sus propuestas de v0.1 se concretaron en H0 y en las instrucciones posteriores del usuario; el documento es referencia del producto, no evidencia de reglas verificadas.

## Diferencia entre v0.1 y el plan completo

La implementación actual corresponde al asesor básico v0.1 y a una parte de H6. Las secuencias explícitas T07b/T08c no son H4: no muestrean robos ni contienen una política de continuación aleatoria. La auditoría de nueve escenarios no es H5: no usa partidas reservadas ni demuestra mejora sobre estrategias de referencia. No se puede declarar terminado el plan completo H0–H7 por haber terminado el software básico.

El plan pide H2 contrastado con Balatro y revisión de fidelidad del simulador; esas condiciones permanecen. Se puede preparar y desarrollar módulos independientes, pero no certificar modelos sin la evidencia requerida ni anunciar una beta validada.

| Hito del plan original | Correspondencia actual | Cierre que falta |
| --- | --- | --- |
| H0 especificación | Especificación v0.1 y backlog implementable; cerrado como planificación. | Las propuestas iniciales de calidad se complementan con presupuestos prospectivos de rendimiento, no retroactivamente atribuidos a H0. |
| H1 estado | Modelo, validación, persistencia, revisiones/recuperación y autoguardado de hechos y cartas implementados; material derivado del mazo actual. | Ningún bloqueo del núcleo para DEC02. La estructura conserva datos fuera de cobertura; H2 limita las operaciones afectadas. |
| H2 reglas | Motor provisional, oráculos independientes, inspección del ejecutable y contraste EFHIII. | Completar evidencia en partida por módulo y resolver discrepancias. O-I1 solo acredita su caso. |
| H3 asesor básico | Escenarios h3-2/T07b y consejo rápido con composición, etapa, vales y material actual; UX01/UX01b/OBS01d publicados. | DEC02 tiene una primera comparación acotada publicada junto a casos congelados. EVAL01b: comprobar utilidad y detectar comparaciones necesarias durante el uso. No acredita eficacia estratégica ni cierra la evidencia H2. |
| H4 simulador | No implementado. Los planes fijos no cuentan como simulación probabilística. | Definir azar y política, implementar muestreo reproducible, probar invariantes y contrastar fidelidad. |
| H5 asesor simulado | No implementado. | H4 y referencias previas; escenarios de desarrollo/ajuste/reserva separados; condiciones equivalentes, presupuesto e incertidumbre. |
| H6 web utilizable | Web pública en GitHub Pages y flujo local; última entrega contrastada en Chrome/escritorio y390px. Las17 comprobaciones Firefox y el rendimiento medido son evidencias de revisiones anteriores. | Comprensión/esfuerzo con jugadores y repetición pertinente por navegador tras cambios. Android físico aplazado; integración de H5 pendiente. |
| H7 beta evaluada | Publicación pública operativa y verificada; documentación, pruebas y recuperación disponibles. | Sigue pendiente la aceptación de una beta evaluada: calidad del consejo, uso real y cobertura declarada. El despliegue ya no es una tarea pendiente. |

## Trabajo completado al contrastar este plan

- Firefox: descarga limpia de Playwright Firefox 153.0 en `.browser-runtime`, aislada e ignorada por Git. Los 17 grupos pasaron sin cambios del sistema operativo ni de los perfiles personales. El fallo anterior queda como antecedente; no se afirma una causa raíz no demostrada.
- H6 rendimiento: herramienta `benchmark:web` con entradas fijas, tres calentamientos y veinte muestras, mediana/p95, tiempos de cálculo y respuesta del DOM. Reportes en Chrome escritorio, Firefox escritorio y formato móvil Chrome. Presupuestos definidos antes de medir; todos cumplieron en este equipo.
- Android: el usuario indicó «deja eso» y pidió usar formato móvil web. Se mantiene emulación y se aplaza el dispositivo físico. No es una nueva dependencia para desarrollar otras partes.

## Backlog restante del plan completo

| ID | Trabajo y dependencia | Resultado verificable |
| --- | --- | --- |
| PG01 — evidencia H2 | Casos mínimos de intereses/Golden/Green y módulos pendientes; sin pedir todo el catálogo. | Entradas, esperado previo, observado, versión/sesión, archivos y conclusión; discrepancias corregidas o exclusión explícita. |
| PG02 — contrato H4 | Puede redactarse con el motor provisional; la fidelidad final depende de PG01 para los módulos usados. | Horizonte y eventos aleatorios enumerados; política de juego/descarte declarada; fuentes del modelo; reglas pendientes y exclusiones. |
| PG03 — primer simulador | PG02; reutilizar H2 sin copiar fórmulas. Primera entrega limitada a robos de la siguiente ciega compatible. | Semilla interna reproducible, conservación del mazo/recursos, mismo azar por alternativa cuando sea aplicable, límites de tiempo/muestras y trazas. Sin porcentaje de victoria de partida completa. |
| PG04 — evaluación H5 | PG03 y fidelidad comprobada para sus cálculos. | Referencias económicas/puntuación definidas antes del experimento; conjunto reservado; victorias del horizonte, incertidumbre, coste y fallos adversos. Si no mejora, conservar básico. |
| PG05 — usabilidad H6 | Flujo básico ya permite la prueba, independiente de H4. | Personas ajenas a la implementación registran, interpretan y actualizan una partida; tiempos/errores y correcciones registrados. Android físico aplazado. |
| PG06 — integración simulada | PG03/PG04. | Web separa exacto, heurístico y estimado; presupuesto, horizonte, política e incertidumbre visibles; sin copiar proyecciones al registro real. |
| PG07 — beta H7 | Evaluación acorde a la cobertura elegida y condiciones de publicación del plan. | Informe de calidad y limitaciones, paquete/versiones identificados, registro de fallos y recuperación; publicación verificada. |

No se inventan cifras de mejora, observaciones de juego, participantes de usabilidad ni pruebas de Android. El cierre actual es el software v0.1 auditado; el plan completo sigue abierto. [Resultados de rendimiento](rendimiento-h6.md), [auditoría](auditoria-t08c.md) y [backlog vigente](backlog.md).
