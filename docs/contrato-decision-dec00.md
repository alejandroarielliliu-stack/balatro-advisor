# Informe de decisión de tienda — DEC00

Entrega del 16 de octubre de 2026. Une contratos existentes sin añadir fórmulas ni una política estratégica nueva: encaje/contexto de tienda, operaciones de H2 y, cuando se suministran planes explícitos, comparación T07b y asesor H3.

## Entrada y salida

`inspectShopDecision(state, snapshot, options)` valida estado H1, snapshot de tienda y opciones. Es determinista y no consulta almacenamiento, reloj ni red. Las opciones son `ante`, `requireObserved`, `hand`, `scenarios` y `actions`. Una mano concreta se delega a `scoreHand`; los escenarios conservan su tipo `AdvisorScenario` y se delegan a `adviseShop`.

El informe `shop-decision-1` contiene:

- `binding`, fase y tokens canónicos de estado, snapshot y opciones. `decisionIsCurrent` comprueba también cambios del formulario, ofertas temporales o escenarios que todavía no aumentaron la revisión. Se deben pasar las mismas opciones actuales a esta comprobación.
- `context`: resultado intacto de `evaluateShopContext`, con sus motivos, intercambios y limitaciones. Su ranking no se sustituye ni se mezcla con los puntos de una mano.
- `catalogue`: rutas por identidad/opción de [CAP01a](capacidades-cap01a.md).
- `actions`: prueba independiente de cada alternativa mediante H2, con acción, estado de capacidad, errores, trazas, evidencia, saldo posterior y posibilidad condicionada de confirmación. No incluye un estado final de transacción listo para copiar al registro.
- `hand`: resultado H2 de la mano concreta del estado inicial, o `null` si no se solicitó. No puntúa automáticamente una mano inventada para cada compra.
- `scenarios`: resultado H3 por escenario/alternativa, o `null` si no se solicitaron. Sus estados finales conservan su carácter proyectado y nunca se guardan aquí.
- `questions`: datos que bloquean operaciones solicitadas o ejes del encaje de las ofertas visibles. Comparten referencias a las operaciones afectadas y se ordenan por cuántas desbloquean; no hay una suma de dólares/puntos/prioridades inventada. Este orden no mide valor de información ni calidad estratégica.
- `projected:true`, `exhaustive:false` y limitaciones explícitas.

## Alternativas y coherencia

Por defecto se prueban conservar y una compra por oferta de comodín. Si una oferta especifica reemplazo, esa rama es venta→compra; no se añade simultáneamente la compra aislada. No se enumeran ventas sueltas, todos los reemplazos ni combinaciones de varias adquisiciones. `options.actions` permite solicitar acciones compatibles explícitas, hasta 50, sin duplicados. H3 mantiene sus propias restricciones de identidad/candidatos y devuelve su error si una acción explícita no es un candidato T07b; no se cambia silenciosamente para hacerla encajar.

Cada operación parte del mismo estado clonado. Se comparte con `enumerateActions` la asignación de IDs hipotéticos para que las ramas coincidan con los candidatos de T07b. No se duplica ninguna fórmula de precio, puntuación o economía.

Antes de probar una compra/reemplazo se comprueba que la oferta comparada coincide con la guardada: ID, identidad canónica, precio observado, edición y pegatinas. Una oferta temporal distinta sigue siendo valorable como hipótesis contextual, pero no se valida usando el precio de otra oferta almacenada. Debe registrarse primero. Si esa discrepancia afecta al conjunto solicitado a H3, se limita esa comparación completa: no se elimina la rama ni se cambia el conjunto a escondidas. Las otras pruebas de transacción y la mano inicial independiente continúan.

Sin escenarios explícitos no existe diagnóstico de supervivencia. Con escenarios se trata de planes fijos, sin ponderación probabilística ni política de juego adaptada por compra. Una sola mano favorable no demuestra consistencia ni supervivencia hasta ante8.

## Estados de operación

| Estado | Interpretación |
| --- | --- |
| `available` | Ejecución realizada sin limitación de evidencia devuelta por H2 |
| `provisional` | H2 calcula y devuelve evidencia limitada; no se declara contraste directo en Balatro |
| `missing_data` | Dato desconocido o identidad/precio de oferta sin conciliar con el registro |
| `pending_evidence` | El modo estricto bloquea por una regla/evidencia pendiente |
| `illegal` | Acción imposible en el estado actual, por ejemplo falta dinero, espacio, Eternal o fase incorrecta |
| `unsupported` | El caso queda fuera de la cobertura de H2; no equivale a ser ilegal en Balatro |
| `invalid` | Solicitud/datos inválidos, conservando el error original |

El clasificador solo traduce errores: no decide legalidad por cuenta propia. Un descuento no soportado conserva la aritmética contextual del precio, pero la transacción aparece fuera de cobertura. Una falta de saldo no impide puntuar una mano sin efectos basados en dinero. Una regla pendiente bloquea la operación dependiente, sin convertir las restantes en errores globales.

Las preguntas describen los bloqueos encontrados. H2 devuelve el primer error de una ejecución: al resolverlo pueden aparecer otros. Los ejes heurísticos desconocidos conservan el motivo del perfil existente; sus rutas `$context...` identifican una condición de valoración, no un campo de GameState editable automáticamente. No se solicitan indiscriminadamente todos los datos del catálogo.

## Interfaz y guardado

En **Decisión de tienda**, el apartado cerrado **Cobertura** de cada opción distingue el encaje heurístico, el estado de H2 y el requisito de confirmación. **Datos pendientes** aparece solo si el informe encuentra datos relevantes sin completar. No añade botones de compra de vales/sobres ni de renovación.

Una ejecución válida puede indicar `explicit_confirmation_required`; esto no concede titularidad de escritura ni prueba que la persistencia vaya a funcionar. Confirmar sigue pasando por el flujo T09b/SHOP03a existente. Una acción con resultados hipotéticos declarados puede evaluarse, pero no habilita confirmación real. Los errores, revisiones, cuota, duplicados y discrepancias siguen comprobándose al guardar. No se copia dinero proyectado, robos ni estados de escenarios al registro real.

## Verificar

```powershell
npm.cmd run demo:decision
npm.cmd run check
npm.cmd run test:decision
```

La demo carga el ejemplo guardado y muestra $7→$5 o$2 como alternativas independientes, mano de pareja52 y saldo desconocido que limita compras sin bloquear esa mano. [Pruebas y evidencia reproducible](evidencia/decisiones/README.md).

CAP01a/DEC00 queda entregado dentro de este contrato. Siguiente: DEC01/SURV01, comparar consecuencias incrementales con evidencia explícita de supervivencia y conectar esa comparación al consejo visible. No se añaden Monte Carlo, saltos/tags, resolución de sobres ni una estimación de victoria. OBS01 puede continuar la conciliación de identidades de forma independiente.
