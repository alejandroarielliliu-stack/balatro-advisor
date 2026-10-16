# Plan general y estado de ejecución

Revisión del 2026-10-10, posterior a la recepción del plan Word y a la decisión del usuario de aplazar Android físico y probar formato móvil en web.

Fuente leída íntegramente: `C:\Users\usuario\Downloads\Plan_general_Balatro_Strategic_Advisor.docx`, plan versión 1.0 del 8 de octubre de 2026. SHA-256 `BE57A0AA4F9CFC58EF790B6FBFDBCDFEFC8CBBD7915ABE46AEFB20033EEA96BD`. El archivo original se conservó sin cambios. Sus propuestas de v0.1 se concretaron en H0 y en las instrucciones posteriores del usuario; el documento es referencia del producto, no evidencia de reglas verificadas.

## Diferencia entre v0.1 y el plan completo

La implementación actual corresponde al asesor básico v0.1 y a una parte de H6. Las secuencias explícitas T07b/T08c no son H4: no muestrean robos ni contienen una política de continuación aleatoria. La auditoría de nueve escenarios no es H5: no usa partidas reservadas ni demuestra mejora sobre estrategias de referencia. No se puede declarar terminado el plan completo H0–H7 por haber terminado el software básico.

El plan pide H2 contrastado con Balatro y revisión de fidelidad del simulador; esas condiciones permanecen. Se puede preparar y desarrollar módulos independientes, pero no certificar modelos sin la evidencia requerida ni anunciar una beta validada.

| Hito del plan original | Correspondencia actual | Cierre que falta |
| --- | --- | --- |
| H0 especificación | Especificación v0.1 y backlog implementable; cerrado como planificación. | Las propuestas iniciales de calidad se complementan con presupuestos prospectivos de rendimiento, no retroactivamente atribuidos a H0. |
| H1 estado | Modelo, validación, ejemplos y persistencia implementados. | Ningún bloqueo del núcleo. La estructura puede conservar datos fuera de cobertura; H2 rechaza las operaciones afectadas. |
| H2 reglas | Motor provisional, oráculos independientes, inspección del ejecutable y contraste EFHIII. | Completar evidencia en partida por módulo y resolver discrepancias. O-I1 solo acredita su caso. |
| H3 asesor básico | Asesor h3-2, comparación, ventas, explicaciones, cotas y horizontes; auditoría T08c completa como software. | No constituye eficacia estratégica validada ni sustituye el cierre empírico H2. |
| H4 simulador | No implementado. Los planes fijos no cuentan como simulación probabilística. | Definir azar y política, implementar muestreo reproducible, probar invariantes y contrastar fidelidad. |
| H5 asesor simulado | No implementado. | H4 y referencias previas; escenarios de desarrollo/ajuste/reserva separados; condiciones equivalentes, presupuesto e incertidumbre. |
| H6 web utilizable | Flujo v0.1 completo; 17 grupos en Chrome y Firefox, formato/tacto móvil emulado; rendimiento del PC medido. | Prueba de comprensión/transcripción con personas y mediciones en dispositivos objetivo. Android físico aplazado por el usuario, no declarado aprobado. La integración del futuro H5 no existe aún. |
| H7 beta evaluada | Documentación y evidencia locales; sin publicación pública. | Cobertura de la beta, evaluación correspondiente, control de fallos, paquete reproducible y procedimiento de vuelta atrás; publicación solo después de los criterios pertinentes. |

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
