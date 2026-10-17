# TAG01a — etiquetas y saltos observados

**Actualización TAG01b (2026-10-17):** [comparación condicional y dos efectos proyectados](comparacion-ciegas-tag01b.md). Esta página conserva el contrato de registro observado de TAG01a; Economía/Inversión calculadas solo en consultas no cambian ese registro.

Entrega acotada del recorrido, no cierre de TAG01. Permite comunicar un salto que **ya ocurrió**; todavía no recomienda jugar frente a saltar ni ejecuta efectos de etiquetas. Versión objetivo: Steam `1.0.1o-FULL`, sin mods, White Stake, antes 1–8 y barajas integradas de RUN01b.

## Uso

En selección de Pequeña o Grande:

1. **Etiqueta visible** registra cuál ofrece esa ciega, o que no se conoce. No concede la etiqueta.
2. Tras saltar dentro de Balatro, resolver sobres/efectos y volver a la siguiente selección, **Salté esta ciega** registra el avance. Exige confirmar ese punto; no se usa mientras queda un sobre abierto.
3. El saldo es el total final observado, opcional; sin respuesta queda desconocido. No se suma un ingreso estimado. Confirma qué inventario siguió igual o marca solo los grupos que cambiaron para conciliarlos con OBS01.
4. **Etiquetas pendientes** transcribe la cola real, en orden y con duplicados. Marcar revisada y dejar vacío significa ninguna; no marcar significa desconocido. La cola posterior al salto no se deduce de la anterior.
5. Recarga conserva el registro; **Deshacer registro** corrige el último evento local.

La Jefe no ofrece salto. No hay tienda ni cobro por saltar; no cambia `lastCleared`, no añade `recentRounds`, no consume una mano ni hace crecer Green. Si el total previo de saltos se conoce aumenta uno; si no, sigue desconocido. Throwback reutiliza ese total en H2, sin otro contador duplicado.

Un Boss Tag o etiqueta no observada invalida el jefe anterior. Orbital invalida las bases de manos hasta transcribir las finales. La declaración de inventario sin cambios es una observación del usuario, no una deducción del motor; si hubo cartas/comodines/niveles alterados deben marcarse. No se modelan resultados de sobres, consumibles, Top-up, Economy o Double. Se pueden registrar los hechos resultantes con OBS01.

## Contrato y compatibilidad

Reutiliza `GameState 0.2`, `phaseData.skipTag`, `jokerContext.tags` y `blindsSkipped`, sin otro estado autoritativo ni arquitectura de eventos. Comandos nuevos en `applyRunProgress`:

| Comando | Datos | Restricción |
|---|---|---|
| `observe_skip_tag` | `tag: Fact<string>` | Selección Pequeña/Grande; identidad de catálogo o desconocida |
| `observe_tag_queue` | `tags: Fact<string[]>` | Partida ubicada en curso; máximo 100; duplicados legales |
| `skip_blind` | `atNextSelection: true`; opcionales `money`, `nextBlind`, `tags` | Pequeña→Grande o Grande→Jefe del mismo ante; nunca Jefe |

Cada confirmación usa revisión, ID, historial y escritura atómica T09b. Un fallo no cambia estado/historial. `nextBlind` opcional es una observación y debe corresponder a la siguiente referencia; sin ella, objetivos/premios no observados permanecen desconocidos (la UI puede completar las bases compatibles mediante el catálogo ya existente). La nueva etiqueta visible siempre queda desconocida.

No migra los archivos existentes ni sus anotaciones `outOfScope.pendingTags`: el lector antiguo sigue aceptándose. Las copias con comandos nuevos requieren esta versión del software. Una partida NUEVA compatible comienza con cola vacía como `confirmedPreset`; esto no repone etiquetas en partidas importadas. El editor avanzado permite ahora etiquetas repetidas, conservando la unicidad de planetas usados.

## Límites de cálculo

`src/catalog/tags.ts` contiene 24 identidades, nombres españoles, disparadores y mínimo ante declarado (`null` = no declarado; no supone probabilidad ni elegibilidad garantizada). **Estar en el catálogo no implica efecto implementado. TAG01b incorpora únicamente los efectos de Economía e Inversión.**

H2 conserva sus validaciones de precios, recursos y modo estricto. La nueva protección no genera efectos:

- Cola o contexto completo explícitamente desconocidos: limita cálculos que requieren recursos de ronda/cobro; interés de un saldo explícito y acciones de tienda independientes siguen disponibles.
- Juggle y efectos inmediatos/de selección todavía pendientes: limita esos recursos, evitando cifras que los omitan. Es una abstención conservadora, no simulación parcial.
- Desde TAG01b, Investment pendiente se calcula al cobrar un Jefe compatible y se consume al finalizar esa ronda; no bloquea puntuación ni cobro de Pequeña/Grande.
- Double y etiquetas de futuro stock no impiden puntuar una mano independiente. No se genera stock futuro ni se ejecutan sus cambios de precio/edición. Precios fuera de cobertura H2 se rechazan como antes.
- `outOfScope.pendingTags` antiguo mantiene su rechazo previo por modificadores no implementados; no se borra automáticamente. Ausencia del nuevo campo en copias antiguas conserva la política previa, **no certifica que su cola esté vacía**.

El avance observado puede caducar datos dinámicos al cambiar de fase, como RUN01b. Una cola vacía conocida se conserva; no se inventa vacío a partir de una cola no observada. La valoración heurística de composición sigue siendo distinta de las proyecciones exactas; esta entrega no añade puntuación estratégica a las etiquetas.

## Evidencia de reglas

Inspección local de `Balatro.exe`, sin ejecutarlo ni alterar la instalación. `version.jkr`: `1.0.1o-FULL`. SHA256 del ejecutable: `0d75fe164accf3312734d4b37ac98788dd15f0b8e4f9bb8b7f90c4e59de93f47`. No se afirma observación en partida.

| Regla/hipótesis | Caso mínimo / esperado | Observado en la fuente primaria | Estado |
|---|---|---|---|
| Pequeña→Grande, Grande→Jefe; salto no equivale a victoria/cobro/tienda | Saltar una Pequeña; debe ir a Grande sin cobro/tienda de ronda | `functions/button_callbacks.lua:2740–2800`: incremento de skips, cambio de selección y aplicación de etiquetas; no flujo de cobro/tienda | Respaldada por inspección; pendiente partida |
| Jefe no ofrece salto | Llegar a selección de Jefe; no debe tener botón de saltar | `functions/UI_definitions.lua:1463–1524`: tag extra y control de salto para Small/Big | Respaldada por inspección; pendiente partida |
| Total saltos +1, Throwback utiliza ese total | Con Throwback, registrar total anterior y su ×Mult antes/después de un salto | Callback `:2755`, `card.lua:2429` y rama Throwback; H2 ya usa `1+0.25*blindsSkipped` | Respaldada por inspección; pendiente partida |
| Double no se duplica al recibir Double; puede haber varios en la cola | Con Double pendiente, obtener Double; después obtener otra etiqueta y observar consumo/duplicación | `tag.lua:320–332`: comparación de identidad distinta de `tag_double` y copia con destino Orbital | Respaldada por inspección; efecto NO ejecutado en Advisor; pendiente partida |
| Investment se cobra al superar Jefe; Juggle modifica próxima mano | Registrar cola, jugar ronda correspondiente, observar cobro/tamaño de mano y consumo | `tag.lua:117–129` y `:334–342` | Respaldada por inspección; Investment calculado desde TAG01b; Juggle sigue limitado; pendiente partida |
| Boss reemplaza jefe, Orbital cambia bases, sobres deben resolverse antes de nueva selección | Anotar jefe/bases antes y después y completar un sobre gratuito | `tag.lua:191–204`, `:206–300` | Respaldada por inspección; resultados se transcriben; pendiente partida |
| Cola inicial vacía | Crear partida compatible nueva; sin etiquetas pendientes | `game.lua:1898,1930`, valores iniciales `skips=0`, `tags={}` | Respaldada por inspección; preset, no observación |

Huellas SHA256 de fuentes internas (no se redistribuye Lua):

- `game.lua`: `bbc67bd3fbadd1ea3f3f0aba07ef8596118d89ff1e9758718f9e17c07a96e912`
- `tag.lua`: `42b589519d7f6e4dd14fc4628198386daae1bbc011ba4125f86eec4e1ec29fe3`
- `functions/button_callbacks.lua`: `c88a74ca3a8fa8ace0ce46ad10a97238f347c292842c9164d11136fe9952c101`
- `localization/es_419.lua`: `ce9b2187aae86982b9df994786aa688765860ec3583d80d183922f6fc458a4e1`

`python tools/import-tags.py` reproduce metadatos desde la instalación propia; no ejecuta Lua ni descarga código. El analizador literal añade soporte para `nil` sin evaluar expresiones. Para un futuro contraste manual basta empezar por una Pequeña/Grande: versión/plataforma/mods ya comunicados; capturas de selección antes, saldo/cola/inventario antes y tras resolver todos los efectos. No se exige todo el catálogo para continuar las tareas independientes.

## Verificación y siguiente entrega

`npm.cmd run check`: 667 aprobadas, 0 fallos y las 10 TODO empíricas previas. Doce casos TAG01 cubren catálogo, legalidad, inmutabilidad, contadores, Oracle Throwback 78→91, cero/desconocido, duplicados, dependencias, archivos antiguos, modo estricto y guardado/deshacer. Esperados literales derivados de reglas inspeccionadas, no generados por el motor.

`npm.cmd run demo:tags`: ejemplo sintético ejecutable; `npm.cmd run test:tags`: siete grupos de navegador, con capturas y recibo en [evidencia](evidencia/tags/README.md). Las pruebas de UI no observan Balatro.

Continuación entregada: **TAG01b acotado**, [comparación condicional](comparacion-ciegas-tag01b.md), con Economía/Inversión proyectadas y planes explícitos. El registro de esta página sigue sin ejecutar premios: exige resultados observados. TAG01 permanece parcial para los otros premios y la política ampliada; SHOP02a continúa con vales y sobres observados.
