# EVAL01 — aceptación independiente del asesor básico

Fecha: 18 de octubre de 2026. Alcance: consejo contextual de tienda con pocas entradas, sobre el contrato PC/Steam 1.0.1o-FULL, White Stake y sin mods. No amplía el catálogo ni implementa un simulador.

## Qué se quiere comprobar

El software puede calcular correctamente una operación y aun así recomendarla por una razón equivocada. Este banco distingue tres comprobaciones:

| Capa | Evidencia que aporta | Lo que no acredita |
|---|---|---|
| Exactitud de consecuencias | Saldos, activaciones y aritmética literal de casos conocidos | Que la compra sea buena durante una partida completa |
| Aceptación estratégica acotada | Reconocer un beneficio marginal, sacrificios, requisitos y alternativas incompletas | Optimalidad global, probabilidad de ganar o consenso de jugadores |
| Usabilidad y validación externa | Recorridos reales y revisión independiente posterior | No se sustituyen por las pruebas automáticas de este documento |

Las reglas usadas conservan su estado documental. Inspección estática del ejecutable, catálogo, deducción aritmética, prueba de software y observación en una partida son evidencias distintas. Ningún caso de este banco afirma observación directa nueva.

## Plan verificable de esta entrega

1. Congelar situaciones, hechos, incógnitas, resultados aritméticos y restricciones del consejo **antes** de consultar la política actual.
2. Ejecutar solo el conjunto de desarrollo; conservar los desacuerdos de partida como línea base.
3. Corregir criterios generales, no añadir excepciones por ID del fixture ni copiar respuestas del banco a producción.
4. Congelar la política corregida y sus pruebas antes de abrir el conjunto reservado.
5. Ejecutar los casos reservados una vez y publicar todos sus resultados. Si se usan para ajustar la política, pasan a desarrollo y se necesita otro conjunto reservado para una nueva evaluación independiente.
6. Mantener abierta la validación estratégica real. No llamar «asesor perfecto», porcentaje de eficacia o mejora de victorias al porcentaje de cláusulas sintéticas aprobadas.

## Banco congelado

Los archivos fuente son [desarrollo](../evaluation/fixtures/eval01-development.json) y [reservado](../evaluation/fixtures/eval01-reserved.json). El [manifiesto](../evaluation/fixtures/eval01-freeze.json) registra SHA-256 de sus bytes antes de ejecutar el asesor. Son **14 casos de desarrollo y 7 reservados**, escritos sin leer la lógica de decisión rápida ni sus resultados.

Desarrollo incluye 12 situaciones estratégicas sintéticas, una comprobación de representación parcial y una entrada negativa deliberada: Money Tree observado sin Seed Money, que una tienda ordinaria no generaría. Esa entrada comprueba rechazo legal y no cuenta como situación estratégica real. Dos casos incluyen una segunda configuración para comprobar sensibilidad al ante o a la baraja.

La revisión del contrato anterior a la línea base detectó que H1 todavía no representa resúmenes parciales. En esos casos el adaptador mantiene el mazo desconocido y conserva el resumen solo en la auditoría. Los límites de intersección son oráculos documentales, no requisitos de salida de una política que no recibió esos datos. Se comprueba que comunica la limitación y no fabrica cartas ni afirma haber usado el resumen. El manifiesto conserva los hashes previos y la razón de esta enmienda antes de consultar salidas; no es un ajuste a una recomendación observada.

Los dos JSON congelados se guardan con sus bytes originales mediante `.gitattributes -text`: la conversión automática CRLF→LF de Git no debe cambiar sus hashes. El primer intento de CI detectó esa conversión y se detuvo antes de publicar; se preservaron los archivos originales, sin cambiar expectativas ni recalificar el reservado.

El autor del banco puede leer contratos, catálogo y evidencia documental para construir estados. La implementación del adaptador no convierte los resultados esperados en salidas del motor: los literales y sus derivaciones se conservan en los JSON. El conjunto reservado está cerrado para el implementador hasta el paso 4. No se afirma independencia frente a todo conocimiento humano previo ni una muestra representativa de todas las partidas.

### Casos de desarrollo

| ID | Pregunta o fallo que se busca |
|---|---|
| D01 | Conservar cuando no hay ofertas registradas; no inventar artículos |
| D02 | Reconocer mejora inmediata que cruza un objetivo en un testigo concreto |
| D03 | Permitir refuerzo del mismo rol: Joker más Abstract |
| D04 | No preferir Greedy sobre material Checkered intacto sin diamantes solo por su valoración editorial |
| D05 | Explicar pérdida de Runner desarrollado y que el comprador no hereda su contador |
| D06 | No tratar Barón como preparado en Abandonada sin reyes |
| D07 | No inventar una utilidad retenida de Mimo en un mazo intacto sin soporte |
| D08 | Declarar el límite de representación del resumen parcial; no inventar intersecciones ni cartas retenidas |
| D09 | Considerar el coste de oportunidad de intereses con Seed Money |
| D10 | Rechazar la oferta negativa de Money Tree sin el requisito |
| D11 | Pedir las ofertas desconocidas en lugar de un cuestionario de 52 cartas |
| D12 | Aislar un consumible no compatible sin bloquear la compra independiente de Joker |
| D13 | El ante modifica el horizonte; no crea reyes, preparación ni suficiencia |
| D14 | Verde y Azul no comparten la regla de intereses |

La alternativa más cara del caso D04 no tiene el mismo texto que Joker: tiene peor efecto activable sobre el material observado. Esto evita fabricar dos precios distintos para un comodín idéntico sin explicar cómo pudo generarlos el juego. La comparación no descarta que futuras transformaciones puedan darle utilidad.

## Contrato de fixtures y adaptador

Cada JSON tiene `defaults`, `cases` e instrucciones de interpretación. `setup` se combina recursivamente con los valores por defecto; los arrays sustituyen el array anterior. `pairedSetup`, cuando existe, modifica esa configuración para una segunda ejecución independiente. Los hechos son observados o explícitamente desconocidos; no se llenan datos de la partida con valores deducidos de su baraja inicial salvo que el caso confirme que sigue intacta.

| Campo de caso | Uso |
|---|---|
| `setup` | Hechos que recibe el asesor rápido, sin planes de ronda |
| `auditWitness` | Cartas y cuenta independiente usada solo por el auditor/H2; nunca se inyecta en el consejo rápido |
| `acceptance.exact` | Hecho aritmético literal, unidad y derivación, que se contrasta por separado |
| `mustPreferAnyOf` | Acción compatible aceptable cuando el banco puede exigir una |
| `mustNotPrefer` | Acción que no puede presentarse como preferencia; prefijo `unconditional:` permite una alternativa explícitamente condicional |
| `mustExplain` | Hallazgo semántico que debe fundamentar el consejo; no exige una frase literal |
| `mustAskFor` | Dato puntual que falta y puede cambiar una rama |
| `mustNotClaim` | Afirmaciones no sostenidas o falsas para ese caso |
| `evidence` y `feasibility` | Referencias y explicación de posibilidad o carácter negativo de la entrada |

Los identificadores de acción normalizados son `hold`, `buy:<offerId>`, `replace:<instanceId>:<offerId>` y `buy-voucher:<offerId>`. El adaptador puede mapear los IDs internos reales; no cambia sus consecuencias. Los códigos semánticos pertenecen al banco y al informe de evaluación, no son permisos para insertar respuestas prefabricadas en el asesor.

Un consejo condicional, empate o abstención puede ser correcto. Una ausencia de recomendación no aprueba automáticamente todos los casos: cuando hay hechos relevantes, debe explicar los efectos o pedir el dato decisivo. Un fallo de ejecución, una expectativa no implementada por el runner o una cláusula no evaluada se publica como tal; no se cuenta como aprobado silenciosamente.

### Oráculo de puntuación de D02 y D03

Cartas: 2S, 4S, 6S, 8S y 10S. Forman Flush, no Straight. A nivel 1 son 35 fichas y Mult4; las cartas suman30. Mano inicial de ocho cartas únicas: las cinco anteriores más3H, 5C y7D.

- Sin comodines: `(35+30)×4 = 260`.
- Joker: `65×(4+4) = 520`.
- Joker y Abstract: dos comodines, así que Abstract aporta6; `65×(4+4+6) = 910`.

Estas cuentas se fijaron sin ejecutar H2 ni el asesor. D02 cruza Big450 al comprar Joker; D03 cruza Boss600 con Abstract y una mano de cinco cartas compatible con Psychic. **No se suministran estos testigos como evidencia de supervivencia al modo rápido**. Comprueban que la mejora existe y que no se debe negar por falta de una nueva etiqueta de rol. No prueban que esas cartas se roben, que no haya otras jugadas ni que la partida se gane.

### Economía: exacto frente a condicional

El saldo después de comprar o vender es una consecuencia inmediata de la acción compatible. Los intereses de una ronda futura exigen declarar que se gana y que no cambia el saldo antes del cobro. No se suman al estado real ni se presentan como ingreso asegurado.

Con Seed Money y35 dólares, los intereses aislados serían7; después de comprar Joker por2 quedarían33 y serían6. El sacrificio condicional es1 dólar por ese cobro. Verde da0 de intereses en ambos estados; eso no convierte el dinero conservado en inútil. Estas reglas siguen sujetas a la evidencia provisional existente y al modo estricto.

## Política entregada: quick-shop-2

Implementación: `src/advisor/quick-shop-policy.ts` centraliza los criterios y códigos de explicación; `shop-context.ts` los aplica sobre las proyecciones existentes de H2. No añade pesos ni suma dólares, puntos y contadores.

1. **Legalidad primero.** Una compra de comodín necesita proyección H2 legal; un precio aritméticamente pagable no habilita una operación desconocida. Fuera de tienda no se recomienda comprar. Los vales compatibles también se comprueban mediante H2; una descripción de recursos no certifica una transacción.
2. **Preparación y beneficio.** Un efecto de puntuación preparado puede reforzar un rol existente. Las condiciones apoyadas y las inversiones futuras se distinguen mediante los niveles de preparación ya documentados (2 frente a 1). El índice editorial, incluido el antiguo umbral70, no es una puerta universal. El ante cambia el horizonte y no crea material.
3. **Sacrificios visibles.** Reemplazar presenta conservar y vender→comprar como intercambio: se pierden el efecto y los contadores del vendido. Popcorn/Ice Cream/Ramen son remanentes temporales, no crecimiento acumulado. Bull/Bootstraps y Stencil mantienen advertencias sobre soporte perdido al gastar u ocupar huecos. Un contador alto tampoco prueba utilidad futura.
4. **Economía con condiciones.** Ramas económicas/generación y vales preparados se comparan explícitamente con ahorrar. Credit Card no crea efectivo ni acredita por sí sola una necesidad de financiación. La reserva se expresa en dólares; los intereses antes/después proceden de `interestOnBalance` sobre estados H2 y requieren ganar y conservar esos saldos hasta el cobro. No se registran como dinero real.
5. **Límites por rama.** Una oferta desconocida puede impedir una preferencia global y conserva sus preguntas, pero no elimina las consecuencias independientes calculables. Una tienda desconocida pide artículos/precios visibles y no se trata como vacía. Sin planes, supervivencia y consistencia siguen sin evaluar.

Joker y Abstract comparten con H2 el cálculo de su aporte propio mediante `fixedMainMult`; +4 o +6 Mult **no** se presentan como diferencia total de puntuación. Mano, orden, jefe y efectos conservados pueden cambiar el resultado. No hay búsqueda de secuencias de compras, comparación global de todos los reemplazos ni adaptación de jugadas a cada compra.

### Corrección mecánica limitada

Riff-Raff comprueba los comodines físicos contra la capacidad posterior a adquirirlo. Una edición Negative ya aumenta esa capacidad y no se descuenta una segunda vez del inventario físico. Se corrigió el mismo error en la generación H2 y se añadieron pruebas de inventario lleno/Negative. Fuente: L08, `card.lua:2529–2530` de la instalación1.0.1o-FULL; la reinspección mantiene los hashes documentados. Es inspección estática, no una nueva observación en partida. Que pueda generar no identifica ni garantiza utilidad de lo generado.

## Resultados del primer lote

| Evidencia | Resultado | Interpretación |
|---|---|---|
| Desarrollo inicial, revisión humana de salidas congeladas | Fallos concretos en D03, D04, D05, D09, D11, D13 y D14 | Incluye rechazo por rol repetido y explicaciones incompletas de pérdidas, etapa e intereses; no todos eran fallos de acción preferida |
| Desarrollo corregido | 12 situaciones estratégicas cumplen sus criterios; 1 entrada negativa legal cumple; D08 conserva límite funcional | 22 cláusulas de acción, 66 semánticas (59 automáticas/7 revisadas), 29 exactas; 2 oráculos documentales excluidos del grado estratégico |
| Reservado, abierto tras congelación | 6 situaciones estratégicas cumplen sus criterios; R03 conserva límite funcional | 11 cláusulas de acción, 33 semánticas (31 automáticas/2 revisadas), 11 exactas; 1 oráculo documental excluido |
| Regresión del código | 920 aprobadas, 0 fallos, 10 TODO manuales | 22 pruebas nuevas; contratos y aritmética, no eficacia estratégica |
| Runner / integración web nueva | 8 pruebas del runner y 7 grupos Chrome aprobados | Consulta sin escrituras, cálculos visibles y emulación390px; no Android físico ni Balatro observado |

El porcentaje de cláusulas aprobadas no se convierte en porcentaje de victorias o confianza. D08 y R03 no evalúan las cantidades de un resumen parcial que H1 no recibió: la abstención y su explicación son correctas, pero falta esa capacidad. No se ajustó producción, fixtures ni matcher después de abrir el reservado. Reutilizarlo para ajustes futuros lo convierte en desarrollo y exige otro reservado.

Resultados auditables: [línea base](../evaluation/results/baseline-regraded.json), [desarrollo](../evaluation/results/development.json), [reservado](../evaluation/results/reserved.json) y revisiones humanas [inicial](../evaluation/results/baseline-review.json), [desarrollo](../evaluation/results/development-review.json), [reservado](../evaluation/results/reserved-review.json). Se publican todas las cláusulas, citas y preferencias; se omiten snapshots completos repetidos. Los JSON íntegros y capturas permanecen bajo `docs/evidencia/eval01/`, según la convención de evidencia local ignorada por Git. Cada resumen conserva la huella del informe íntegro.

La línea base corresponde a `e53746c42598e6e8850c54558c22d2aefd908355`; las fuentes corregidas se vinculan mediante SHA-256 en [la congelación](../evaluation/policy-freeze.json). La [copia portable](../evaluation/policy-freeze-portable.json) normaliza únicamente CRLF→LF para una clonación Git: registra que esa conversión documental se produjo después de la ejecución reservada y no cambió producción. La revisión de matcher2 se hizo contra las mismas salidas iniciales, no reejecutando la política corregida como línea base.

### Ejecutar

```sh
npm ci
npm run check
npm run test:advisor-eval
npm run evaluate:advisor -- --split development --output docs/evidencia/eval01/new-development.json
npm run test:quick-shop
```

Para reproducir el reservado **ya abierto**, con las mismas fuentes semánticas:

```sh
npm run evaluate:advisor -- --split reserved --policy-freeze evaluation/policy-freeze-portable.json --output docs/evidencia/eval01/reserved-reproduction.json
```

La guarda rechaza una política modificada o fixtures alterados. Una reproducción no se presenta como un nuevo examen independiente. Los errores de ejecución o cláusulas automáticas fallidas devuelven error; una cláusula semántica sin coincidencia queda pendiente de revisión humana, no aprobada silenciosamente. CI ejecuta desarrollo, las ocho pruebas del runner y el recorrido web; no vuelve a usar el reservado para ajustar.

## Qué sigue abierto

**EVAL01a se cierra como lote sintético acotado. EVAL01 completo sigue abierto.** Faltan sesiones reales/revisión externa del consejo, contraste de reglas y cobertura fuera del banco; no se afirma que el asesor básico funcione perfectamente.

Siguiente tarea: **OBS01d**, admitir resumen parcial del mazo sin fabricar52cartas: cantidades relevantes y solapamientos conocidos/desconocidos, con validaciones y preguntas puntuales. Se evaluará con un nuevo lote. SURV02 debe aportar evidencia automática de capacidad ante la ciega; hasta entonces no se inventa un diagnóstico de supervivencia. Fuerza y los demás Tarot siguen en DECK04, sin bloquear estas tareas.

La revisión de navegador detectó explicaciones extensas en móvil; cabe el contenido sin desbordamiento, pero conviene compactar la conclusión y desplegar el detalle. El reservado identificó preguntas de precio todavía genéricas y un aporte hipotético visible junto a una compra sin huecos (bloqueada correctamente). Se registran para otro lote; no se afinó la política con esos resultados.
