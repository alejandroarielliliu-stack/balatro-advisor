# Correcciones puntuales de comodines, manos e historial

OBS01c, entrega del 16 de octubre de 2026. Continúa [cartas y consumibles](cambios-inventario-obs01b.md) y reutiliza el guardado T09b. El objetivo es registrar únicamente lo que cambió, sin transcribir de nuevo toda la partida ni copiar estados hipotéticos del asesor.

## Uso

En Mesa, **Comodines y manos** abre un único editor con tres tipos de datos:

- **Un comodín:** selecciona la copia actual por posición/ID y el dato: contador compatible, valor de venta, edición o pegatinas. Un cambio no modifica los demás campos ni otras copias del mismo comodín.
- **Base de una mano:** transcribe nivel, fichas base y Mult base visibles en la pantalla de manos. Registrar solo el nivel es insuficiente; no se deduce una fórmula ni se aplican Planetas. Las doce manos del catálogo pueden registrarse.
- **Historial parcial:** total de veces que jugaste una mano durante la partida o durante la ronda actual, o total de Tarots usados en la partida. Son totales absolutos observados, no incrementos. Registrar Pareja no declara que las otras manos tengan cero usos.

Pulsa **Añadir dato a la lista**, revisa las entradas y confirma que los demás datos siguen igual. **Registrar datos** guarda el lote completo. Cancelar, navegar por los selectores o preparar entradas no guarda. **Deshacer** recupera los datos anteriores y conserva el historial. Si hay cambios pendientes en el formulario principal, guárdalos o descártalos antes de usar este editor.

**No conozco el valor actual** registra un desconocido explícito en lugar de cero. Para un contador de comodín compatible, reaparece la solicitud correspondiente de OBS01a. Dejar vacío un campo numérico sin marcar desconocido produce un error dentro del diálogo. No se pregunta automáticamente por todas las bases/historias desconocidas: se editan voluntariamente, sin añadir decenas de campos a Mesa.

## Contrato implementado

`observedDetails(state, request)` no usa DOM, almacenamiento, azar ni reloj. La solicitud contiene revisión, confirmación del resto y una lista estricta de operaciones:

| Operación | Destino | Validación y conservación |
| --- | --- | --- |
| `joker_counter` | Copia actual + clave de contador | Rangos del catálogo compartido con OBS01a, incluido Green; conserva otros contadores |
| `joker_sell` | Copia actual | Entero no negativo; no vende ni cambia el saldo |
| `joker_edition` | Copia actual | Edición catalogada; no recalcula precio ni recursos observados |
| `joker_stickers` | Copia actual | Lista sin repeticiones; puede expresar ninguna; no ejecuta alquiler/caducidad |
| `hand_base` | Una de doce manos | Hecho conocido completo con nivel/fichas/Mult enteros no negativos, o desconocido |
| `hand_history` | Mano + ámbito partida/ronda | Total no negativo; si ambos se conocen, ronda no puede superar partida |
| `tarots_used` | Contexto de la partida | Total no negativo; no retira consumibles ni ejecuta sus efectos |

El resultado es un parche observado estrecho y su descripción. Todos los hechos conocidos escritos se etiquetan como transcripción manual, aunque un cliente envíe `confirmedPreset`. Los desconocidos conservan su motivo. El original y los objetos no afectados no se modifican.

Antes de guardar se rechazan campos extra, números inválidos, datos repetidos en el lote, identidades ausentes y revisión antigua. Si el inventario de comodines es desconocido, no se recupera del pasado; solo esa edición queda limitada. Las bases e historias independientes siguen registrables. Una edición futura/desconocida o pegatinas que el motor no admita pueden limitar operaciones posteriores: registrar un hecho no amplía la cobertura del motor.

El preset declarado `all-standard-level1` se expande usando `HAND_BASES` ya existente. Una base desconocida o un preset no reconocido produce bases desconocidas para las manos no transcritas, nunca doce manos de nivel1 supuestas. Con bases explícitas se conservan todos sus hechos y metadatos originales salvo la mano elegida. No se restaura contexto histórico antiguo para completar campos ausentes.

La integración aplica el parche mediante `store.correct`, con revisión, ID de confirmación y Web Lock existentes. Estado e historial se escriben juntos; un fallo de validación, cuota o conflicto conserva el registro anterior. No se modifica el esquema `0.1`/`0.2`, ni el formato de copias. Los escenarios guardados se conservan y los consejos anteriores se invalidan con la nueva revisión.

## Alcance y evidencia

Se añaden catorce pruebas de núcleo con resultados escritos independientemente de la implementación y nueve grupos de navegador. [Cómo reproducir y resultados](evidencia/datos-puntuales/README.md). Un ejemplo sintético registra Pareja con nivel7/fichas123/Mult9 para demostrar que se conservan valores observados literales; **no** es una afirmación de los valores que tendría una partida estándar en ese nivel.

No se introducen reglas de consumibles ni nuevas comprobaciones directas en Balatro. El modo estricto y la distinción entre inspección del ejecutable, observación en partida y heurística siguen vigentes. La calidad estratégica del consejo no se deduce de estas pruebas de transcripción.

**OBS01 sigue parcial.** Esta entrega corrige hechos de copias actuales; no añade otro sistema para crear comodines ni reconstruye un inventario desconocido desde una lista parcial. Compras/ventas reales siguen pasando por la tienda y H2; una reorganización o cambio completo observado conserva el formulario existente. Quedan la conciliación de cambios de identidades y las preguntas priorizadas por una decisión concreta, además de más campos de historial. CAP01a y DEC00 pueden avanzar con estos contratos, sin esperar esos extras: deben distinguir mostrar, valorar, puntuar, aplicar y confirmar, y solo bloquear cálculos dependientes de datos faltantes. No se cierran jugar/saltar, resolución de sobres, supervivencia automática ni simulación.
