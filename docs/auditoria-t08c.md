# T08c-3 — auditoría conjunta S01–S09

Ejecutada el 2026-10-10. [Plan](plan-t08c-auditoria.md). **T08c completado como software dentro de la cobertura v0.1.** Se cierran A3/A4 como pruebas del modelo y su comunicación, no como validación empírica de la estrategia ni observación en Balatro. T01/H2 y T11/A7 permanecen abiertos.

## Evidencia reproducible

```powershell
npm.cmd run test:scenarios
npm.cmd run check
npm.cmd run test:reference
$env:TEST_BROWSER='chromium'
$env:BROWSER_CHANNEL='chrome'
npm.cmd run test:web
```

Resultados: 30 pruebas de escenarios/cotas/horizontes; suite completa **141 aprobadas, 0 fallidas, 10 TODO de observación**; 29 contrastes EFHIII; **17 grupos Chrome**, sin errores JS. Chrome 154.0.8037.98, Windows, headless, con emulación táctil y anchuras móviles; no Android físico.

La suite nueva está en [product-scenarios.test.ts](../tests/product-scenarios.test.ts). Construye los estados y las cartas explícitas desde la especificación, con precios y esperados literales independientes del catálogo ejecutable. Amplía [engine.test.ts](../tests/engine.test.ts), [advisor.test.ts](../tests/advisor.test.ts), [horizon.test.ts](../tests/horizon.test.ts) y [bounds.test.ts](../tests/bounds.test.ts). No se generan esperados desde la salida del motor.

## Matriz de casos

Cada fila corresponde al test con el mismo ID en la suite nueva. Los oráculos principales y la posibilidad sintética constan en [escenarios v0.1](escenarios-v0.1.md); las continuaciones, en [horizontes](horizontes-t08c.md). Todos los resultados siguientes pasaron como software provisional.

| Caso | Comprobación ejecutada | Lectura estratégica y límite |
| --- | --- | --- |
| S01 | Pareja 52/156/572; K 15/75/315; saldos 7/5/2; interés base 1/1/0. | Half cubre solo el plan de pareja; aviso específico de Psychic posterior no evaluado. No afirma que se robará pareja. |
| S02 | Pareja 2552→3016; K 2205→2625; cobro 37 frente a 34. Tres acciones de descarte reales dejan 572/676. | Ahorro con los primeros planes. La variante sin descartes no vence con ninguna acción enumerada y devuelve abstención. |
| S03 | Conservar 25→37→50; Golden 19→33→50. Mismas cartas por rama y dos ciegas explícitas. | Empate/compromiso: ingreso posterior no elimina la menor liquidez inicial. Sin venta residual ficticia. |
| S04 | Ases 704/2160/704; ochos 572/572/780; cuatro cartas jugadas 64/720/64. Solo puntúan los ases. | La cobertura favorable de Scholar no implica consistencia. Cantidades de cartas elegibles y The Wall posterior visibles como límites. |
| S05 | Sin compra 524; Green 945 en tres manos y contador 3; Joker 1050 en dos. Cobros 12/15. | Compromiso entre crecimiento aplicado, manos y efectivo. No suma manos posteriores al fin. Pruebas de descarte/suelo y ronda siguiente en las suites H2/horizontes. |
| S06 | Water: conservar/comprar/vender Banner/reemplazar = 704/2160/704/2160; saldos 8/4/10/6; intereses 1/0/2/1. | La venta pierde Banner para futuras rondas. La preferencia de una sola ronda no afirma que sea inútil permanentemente. |
| S07 | Doce candidatos: conservar, compra ilegal, cinco reemplazos y cinco ventas. Ochos 3016; reemplazos Joker/Golden/Scholar 4292/4756/4756; venta Joker 2552. | Capacidad, orden venta→compra y sacrificios conservados. Con ases cambian las ventajas; no se trata Golden o Scholar como venta automática por un único ejemplo. |
| S08 | Psychic: 156/696/156/696; saldos 6/1/8/3; intereses 1/0/1/0. Dos cartas jugadas se rechazan. | Half apagado por cinco cartas jugadas, aunque solo dos puntúan. Sacrificio de Half declarado. |
| S09 | Cotas 151125 y 169000; todas las ramas legales ≤175500<300000. Compra sin espacio ilegal. | Insuficiencia bajo el modelo, no puntuación realizable ni ingreso posterior al objetivo. Datos incompletos invalidan la cota correspondiente. |

Oráculos adicionales de S07 escritos antes de evaluar: tras reemplazar Joker, ases `(32+40+90)×(2+20+15+8)=7290`; tras reemplazar Golden `162×49=7938`; tras reemplazar Scholar `(32+90)×(2+4+20+15)=5002`. Vender Golden después del reemplazo de Joker reduce Abstract de +15 a +12: `116×34=3944`. Estos cálculos prueban el modelo documental; no son observaciones ni etiquetas de decisión óptima.

## Fronteras y explicaciones

| Variante | Evidencia ejecutada |
| --- | --- |
| Precio desconocido | Abstención, sin precio cero; suite integrada y H2. |
| Oferta fuera de catálogo | Candidato visible pero ilegal, razón explícita, `exhaustive:false`. El consejo se limita a las alternativas calculables; no certifica mejor compra de toda la tienda. |
| Comodín poseído incompatible | Abstención; no se ignora su efecto. |
| Mazo alterado o carta mejorada | Rechazo H2 y cotas, cubierto por las suites existentes. |
| Ciega inmediata desconocida | No se puntúa ni diagnostica supervivencia. |
| Jefe posterior desconocido o fuera de cobertura | Advertencia específica, sin bloquear una próxima ciega que sí sea calculable. |
| Green/base desconocida | Aislamiento por módulo y rama en H2, H3, horizontes y cotas. |
| Saldo negativo o seis comodines | H1 puede conservarlos como datos estructurales; operaciones H2 fuera de contrato se rechazan. No se cambió H1 para prohibir guardar información real. |
| Orden de comodines | Invariancia comprobada para este catálogo aditivo en H2; no se generaliza a otros efectos. |
| Guardado y recuperación | Serializar/cargar conserva la evaluación, acciones, trazas y etiquetas de evidencia. Entrada intacta. T09b/navegador verifican almacenamiento e historial. |

La web usa los mismos resultados y conserva sus desgloses completos. Los grupos de navegador anteriores cubren compra, ventas, cotas y horizonte; el nuevo grupo cubre S04 con planes de ases/ochos, cantidades de cartas elegibles y aviso de The Wall, y S06 con comprar frente a reemplazar Banner. Verifica sacrificios, saldos, ausencia de escritura y ausencia de desbordamiento horizontal a 390 px. [Informe](evidencia/t11/chromium/verificacion.json), [captura S04](evidencia/t11/chromium/auditoria-s04.png), [captura S06](evidencia/t11/chromium/auditoria-s06.png). No se afirma que cada variante se haya transcrito manualmente en cada navegador.

## Discrepancias corregidas

1. **Aviso de jefe demasiado genérico:** H3 guardaba el jefe visible pero no lo mencionaba en el consejo. Nuevo campo `contextNotes` identifica el jefe posterior fuera del plan o su desconocimiento. Se muestra junto al consejo. No cambia la clasificación ni calcula otra ciega implícitamente.
2. **Activación sin cantidades de referencia:** las condiciones de Scholar/Even ahora indican los 4 ases/20 cartas pares del mazo estándar compatible y aclaran que no son probabilidades.
3. **Documentación histórica ambigua:** la frase que exigía rechazar saldo negativo/sexto comodín en validación estructural contradecía la separación H1/H2. Se corrige para exigir rechazo en las operaciones afectadas del motor. Las menciones a horizontes/ventas/cotas todavía pendientes se sustituyen por el estado actual.

No aparecieron discrepancias aritméticas en estos casos. No se alteraron fórmulas, prioridades h3-2, persistencia ni catálogo para hacer pasar los tests.

## Qué queda

La siguiente tarea de desarrollo/evaluación es T11: resolver y repetir la prueba de Firefox, y completar el recorrido en un Android físico. En paralelo continúa T01 con comprobaciones mínimas del juego (intereses/Golden/Green y módulos pendientes). El cobro O-I1 y EFHIII siguen siendo evidencias distintas; ni esta auditoría ni sus cifras cierran H2 como contrastado. Mejorar victorias en partidas completas y ampliar cobertura siguen fuera de las afirmaciones de v0.1.
