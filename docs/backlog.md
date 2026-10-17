# Backlog — seguimiento de partida en desarrollo

**DEC01/SURV01 (2026-10-16), entrega con planes explícitos:** [consecuencias y comparación desde tienda](consecuencias-dec01-surv01.md). H2 muestra dinero/recursos/huecos y pérdidas por reemplazo; H3 compara los planes temporales de Análisis por objetivo, consumo, economía y sensibilidad. Sin planes, supervivencia sin evaluar; ningún escenario se inventa ni se guarda. 655 aprobadas/0 fallos/10 TODO; cinco grupos nuevos de navegador. No cambia la política ni añade simulación. Siguiente TAG01 acotado; SURV02/EVAL01 y SHOP02a siguen abiertos.

**CAP01a/DEC00 (2026-10-16) entregado dentro del contrato:** [rutas por operación](capacidades-cap01a.md) e [informe de decisión](contrato-decision-dec00.md). Matriz212 sin certificar soporte universal; pruebas independientes H2, H3 solo con escenarios explícitos, datos pendientes por operaciones/ejes afectados y vigencia también de borradores/ofertas. Cobertura visible separa encaje, H2 y confirmación. 646 aprobadas/0 fallos/10 TODO; seis grupos nuevos de navegador. No cambia política, fórmulas ni catálogo. Siguiente DEC01/SURV01; OBS01, TAG01 y SHOP02a conservan su alcance independiente.

**OBS01c (2026-10-16), correcciones puntuales entregadas:** [comodines, bases e historial parcial](datos-puntuales-obs01c.md). Hechos por copia/campo, doce bases observadas, totales separados por ronda/partida y Tarots usados, desconocidos explícitos, lotes atómicos y T09b. 630 pruebas/0 fallos/10 TODO; nueve grupos nuevos de navegador. No ejecuta consumibles ni calcula bases a partir del nivel. OBS01 sigue parcial en conciliación de identidades e información priorizada por decisión; CAP01a/DEC00 pueden avanzar sin esperar esas ampliaciones.

**Ajuste pequeño OBS01b:** selector de consumibles con etiquetas españolas y tipo visible. IDs, guardados y reglas intactos; tipos y ocho grupos de navegador aprobados.

**OBS01b (2026-10-16) entregado para cartas y consumibles:** [contrato y uso](cambios-inventario-obs01b.md). Registro por instancia, lotes validados antes de escribir, referencia histórica real explícita, datos no afectados conservados, cuota/revisión/deshacer con T09b. 616 pruebas aprobadas/0 fallos/10 TODO; ocho grupos nuevos de navegador. No ejecuta consumibles ni infiere dinero, niveles o uso. OBS01 sigue parcial: OBS01c (comodines por instancia, bases e historial parcial) y CAP01a mantienen trabajo; DEC00 puede avanzar sobre estos contratos.

**OBS01a (2026-10-16) completado como entrega parcial de OBS01:** [cambios por grupo y valores pendientes](observaciones-obs01a.md). El progreso conserva grupos independientes y permite indicar solo cuáles cambiaron. Mesa pide hechos numéricos del inventario actual y registra únicamente los respondidos mediante T09b; revisión, cuota, recarga y deshacer cubiertos. 603 pruebas/0 fallos/10 TODO; siete grupos nuevos de navegador. No cierra OBS01 ni CAP01a: siguen la conciliación por instancia/carta, historial parcial y capacidades por operación. Siguiente OBS01b; DEC00 puede avanzar con los contratos existentes.

**RUN01b (2026-10-16) completado como software:** [recorrido observado](recorrido-run01b.md), sin simular manos: nueva partida compatible o continuación explícita, selección → ronda → resultado → cobro observado → tienda → selección; pérdida, objetivo ante 8 y detención declarados. Historial atómico, revisión/duplicados, recarga y deshacer reutilizan T09b. Identidades confirmadas se conservan; datos no reconstruibles quedan desconocidos. Inicio limitado a diez barajas integradas/White. No implementa saltos, sobres ni conciliación incremental OBS01. `demo:run-progress`, `test:run-progress` y [evidencia](evidencia/run-progress/README.md).

**RUN01a (2026-10-16) completado como software:** [fases y migración recuperable](fases-y-migracion.md), estado `0.2` y registro `confirmed-2`. Carga compatible de `0.1` sin conversión implícita; actualización explícita de todos los snapshots, con respaldo exacto anterior, revisión conservada e invalidación de consejos antiguos. H2, T07b y horizontes conservan su carácter hipotético. La web muestra la fase; una fase desconocida se conserva en lectura. No implementa todavía las transiciones de partida. Siguiente: RUN01b, registrar inicio/continuación y resultados observados para recorrer ciegas sin volver a transcribir el inventario. [Pruebas y límites](evidencia/run-migration/README.md).

**SHOP03a (2026-10-16) completado como software:** [tienda persistente y confirmaciones desde Mesa](tienda-persistente.md), con demostración `demo:shop-session` y [verificación reproducible](evidencia/shop-session/README.md). Ofertas de comodines en el mismo `observed.shop` que H2/H3; compra/venta/reemplazo confirmados, guardado atómico, recarga y deshacer. Consulta y reemplazo hipotético no escriben. Se conserva el formato de copias; corrección de `jokerContext` ya admitido por H1. Extras de tienda siguen temporales y las demás ediciones requieren guardar. No amplía reglas ni cierra su evidencia empírica. Siguiente entrega: RUN01a, esquema de fases y migración de todos los snapshots del historial; OBS01 y pruebas de política pueden avanzar en paralelo.

**Plan vigente del asesor (actualizado 2026-10-16):** [hoja de ruta](hoja-de-ruta-asesor.md), [auditoría anterior](reporte-codigo-2026-10-15.md) y [recorrido/entradas mínimas](plan-asesor-de-partida.md). SHOP03a y RUN01a/b ya conectan tienda, fases, migración y recorrido observado. Continúan OBS01/CAP01a para datos mínimos y capacidades; DEC00/DEC01/SURV01 para comparación incremental y TAG01 para jugar/saltar. El banco de evaluación avanza en paralelo. Sobres/consumibles SHOP02a/DECK04 y capacidad automática SURV02/PG02/PG03 amplían el flujo; EVAL01/PG04 separa software correcto de política útil. Esas continuaciones permanecen pendientes.

**PUB02 completado:** [GitHub Pages público](https://alejandroarielliliu-stack.github.io/balatro-advisor/) y workflow por actualización de `main`, con build/pruebas antes de desplegar. No exige ChatGPT para visitar la web. La migración de alojamiento no cerró T01/H2 ni la eficacia estratégica.

**SHOP01 (2026-10-14):** [tienda contextual](tienda-contextual.md) sustituye Candidatos: precio/edición reales, vales32, sobres15 con ilustraciones, otras cartas manuales y consejo condicionado sin planes. Diseño de tienda de Balatro; por indicación del usuario no hay Renovar, Actualizar ni Siguiente ronda. Snapshot de sesión separado de H1; comparar no guarda adquisiciones. Política por preparación/rol/material, saldo, sacrificios y límites; no usaΔglobal ni porcentajes. Holo/Poly corregidos por evidencia primaria y oráculos. [Investigación](evidencia/tienda-investigacion.md) y [verificación web](evidencia/tienda/README.md).

| Continuación de tienda | Dependencia real | Aceptación |
|---|---|---|
| SHOP03a — completado como software | SHOP01 + H1/H2/T09b; independiente de SHOP02 | Tienda observada de comodines única, compra/venta desde Mesa, autoguardado y deshacer; recarga conserva acciones reales, consultar no modifica registro. |
| SHOP02a / DECK04 | SHOP03a + fase/contexto de sobre + catálogos/eventos concretos | Contenido observado de Buffoon/Celestial, elecciones restantes, opciones visibles; pagar/abrir/elegir/usar/omitir separados, sin inventar cartas. |
| SHOP03 — continuación | SHOP03a + operaciones de SHOP02a que se integren | Confirmación y persistencia atómicas también de apertura/elección; las operaciones no implementadas limitan su rama. |
| SHOP04 | Operaciones específicas + datos de efectos | Descuentos, stickers fuera de White, vales22 restantes, Tarot/Spectral y renovaciones con nuevo stock transcrito. Regla pendiente limita solo su dependencia. |

SHOP01 no cierra los contrastes T01/H2 ni supone eficacia de la política; las limitaciones de sobres cerrados no bloquean valorar un comodín conocido.

Validación de SHOP01: `npm.cmd run check` aprueba 522 pruebas, sin fallos y con 10 TODO de contraste manual. Incluye precio observado sin sustituirlo por precio de catálogo, umbrales de utilidad del interés y propagación del modo estricto; los esperados mecánicos proceden de literales documentados. La UI conserva el estado registrado al consultar, transcribir y limpiar la tienda. Los resultados web y la publicación se registran por separado, sin convertirlos en evidencia de ejecución en Balatro.

**UI-SELL (2026-10-13):** [venta desde la ficha propia](ventas-mesa.md), separada de eliminar una transcripción. Transición completa H2 al borrador, dinero/espacios/contadores recalculados, sin exigir guardar o una mano. Contexto objetivo asumido solo en evaluación cuando no está confirmado; conservar hechos desconocidos y rechazar datos conocidos incompatibles. Corregida dependencia innecesaria de próxima ciega para ventas simples. T09b/almacenamiento no cambian. Núcleo472aprobadas/0fallos/10TODO;13casos nuevos con oráculos documentales e inmutabilidad. Verificación web y evidencia de entrega en la documentación enlazada.

**QR06 — composición global (2026-10-13):** [puntaje y seis barras](composicion-global.md) en Mesa, sin planes ni guardar; motivos accesibles al pulsar. Reutiliza QR/H1 y las familias de composición, separado de las fichas exactas H2 y del asesor por escenarios. 32vales registrables,10efectos H2; los otros22 conservan límites explícitos. Recursos actuales sin duplicar modificaciones; Jeroglífico/Petroglifo exigen transcripción del campo afectado. Política editorial `composition-1`, respaldada por [investigación de criterios](evidencia/composicion-puntuada-2026-10-13.md), sin calibración de eficacia.

Aceptación QR06:459pruebas aprobadas,0fallos,10TODO manuales;7grupos web de composición, vales con anotaciones/recarga,8grupos de encaje,17web y15de diseño. Capturas inspeccionadas a360–1440px y reflujo200%; móvil emulado. No modifica el registro al consultar, distingue desconocido/cero/no-aplicable y no acredita crecimiento ni ingresos hipotéticos. Revisión de datos/editor incluida; Project Bonk permanece separado.

**Economía UI/L05 (2026-10-12):** [premio y cobro automático](cobro-automatico.md), desglose por escenario y vales Seed Money/Money Tree integrados en intereses. Corrección manual de referencia para efectos no modelados; otros vales siguen fuera del motor exacto. 220 pruebas aprobadas + 10 TODO; test:cashout y regresión web/diseño aprobados. Evidencia estática, no observación de partida.


**UI en vivo (2026-10-12):** candidatos leen el formulario validado y recalculan al editar sin guardar, con retirada inmediata de cifras inválidas. Cartas/jugadas integradas en Mesa; la pestaña anterior queda como Avanzado. Guardar sigue siendo opcional para conservar registro/historial; no hay autoguardado ni acciones reales implícitas. `test:live` cubre cálculo antes del primer guardado, cambios de inventario/dinero/plan, foco y separación del registro. Detalles actuales en [galería](galeria-comodines.md).


**UI candidatos compactos (2026-10-12):** miniatura/nombre y delta verde ▲, rojo ▼ o neutro —; cuatro en una única fila, ficha completa al pulsar (sin desplegable), diferencias separadas por escenario. Fila con desplazamiento horizontal en móvil. Pruebas de signo positivo/negativo/empate, invalidación y galería aprobadas; capturas escritorio/móvil emulado revisadas.


**UI candidatos (2026-10-11):** panel de hasta cuatro candidatos debajo del inventario, añadido desde fichas, comparación visible antes/después por escenario, precio, encaje y reemplazos. Reutiliza H2/T07b/H3; no modifica tienda real ni inventario. Resultados invalidados por cambios; selección solo de sesión. Antiguo editor de ofertas plegado en datos avanzados. `test:candidates`, regresión web/diseño y 217 pruebas aprobadas; límites en [galería](galeria-comodines.md).


**UI objetivo automático (2026-10-11):** ante/ciega/jefe/baraja recalculan el objetivo usando la misma función de catálogo que H2. Incluye Plasma; solo White, antes 1–8 y jefes implementados. Objetivo manual opcional; valores importados diferentes o desconocidos se conservan sin reemplazarlos al abrir. Los valores calculados se guardan como `confirmedPreset`, sin declararlos observados. No cambia recompensas ni reglas. `test:target` comprueba 450→1200, Plasma, Wall/Violet, falta de jefe, modo manual, persistencia y procedencia. 217 pruebas aprobadas, 10 TODO anteriores; regresiones web/diseño conservadas.


**UI-GAL entregado (2026-10-11):** [galería fija y fichas hipotéticas](galeria-comodines.md), 150 miniaturas, buscador, filtros combinables de rareza/precio y 41 efectos calculables. Altura estable y edición flotante. Inventario centrado con contador, selección y reordenación mediante ratón, tacto emulado o Alt + flechas; cambios solo en borrador. Alta de inventario solo desde la ficha, como borrador con guardado explícito; sin botón antiguo. Consulta sin escritura usando escenarios explícitos y H3/T07b/H2. 215 pruebas aprobadas + 10 TODO; regresión web, diseño y nueva suite `test:bay` aprobadas. No amplía CAT02 ni cierra evidencia pendiente.

**CAT02 entregado (0.6.0):** [33 efectos nuevos y límites](comodines-cat02.md), **41 con cálculo / 109 solo catálogo**. 212 pruebas aprobadas + 10 TODO previos. Tienda, puntuación, cotas, H3, buscador e ilustraciones conectados. Próximo CAT03: efectos con contexto de cartas retenidas/posición; después contadores, recursos y finalmente copias/retriggers/azar. No amplía automáticamente los efectos pendientes ni cierra H2 contra el juego.

**UI buscador de comodines (2026-10-11):** búsqueda integrada en edición de inventario y ofertas, sobre los 150 nombres ES/EN y efectos. El buscador usa ahora los 41 efectos implementados; 109 aparecen como solo catálogo. No se amplía ni se falsea la cobertura H2. Búsqueda sin escritura/invalidation, selección como borrador; comprobación Chrome escritorio/móvil y regresión existente. CAT02 entregado arriba.

**DECK03 completado como software (motor 0.5.0):** [composición actual](composicion-deck03.md), editor de instancias, guardado, Abandonada/Cuadriculada/Errática y tres categorías especiales. 172 pruebas aprobadas + 10 TODO previos. Diez barajas integradas, quince catalogadas. **Siguiente: DECK04**, inventario observado de consumibles/vales; aceptación: nunca reponer los iniciales, acciones confirmadas y persistencia atómica. Después apertura de sobres y DECK05 tags.

DECK02 (2026-10-11) entregado como catálogo de condiciones: **15 perfiles, 7 integrados**, [contrato y pendientes](barajas-condiciones.md), [L03](evidencia/barajas-l03.md). 165 pruebas aprobadas + 10 TODO. DECK03: completado arriba; este párrafo registra la entrega histórica DECK02. DECK04 después: inventario y uso explícitos de consumibles/vales/sobres, sin recrear objetos iniciales. DECK05: ciclo de tags de Anaglifo. La presencia en catálogo no habilita automáticamente H2/H3.

VC01a (2026-10-11) entregado: [rúbrica contextual 0–10](plan-valoracion-contextual.md), desglose y diferencias frente a conservar. 154 pruebas aprobadas + 10 TODO existentes. No cambia la prioridad H3 ni amplía los ocho efectos del motor. VC01b/SYN02, detección de mazo VC01c y notas en selector VC01d siguen pendientes; no confundir biblioteca documental con cálculo.

SYN01 (2026-10-11) **completado como biblioteca documental**: [32 relaciones](sinergias.md), buscador y relaciones por comodín, evidencias estáticas/compuestas y límites explícitos. No amplía H2/H3. SYN02 pendiente: efectos retenidos Acero/Mimo/Barón, fixtures y casos negativos, antes de detectar o recomendar combos en la partida real.

CAT01 (2026-10-11) **completado**: [colección de 150 comodines](catalogo-completo.md), atlas de internet cotejado con la instalación, propiedades ES/EN, filtros y detalle. 146 pruebas aprobadas + 10 TODO existentes; colección/diseño y 17 grupos de flujos en Chrome y Firefox. No amplía la cobertura de cálculo de ocho efectos. CAT02 pendiente: lotes pequeños de efectos H2 con fixtures independientes antes de activarlos; combos/sinergias aplazados por la petición actual.

UI-R2 (2026-10-11): [rediseño integral](diseno-web.md). Mesa/Análisis/Registro, cartas editables, comparación por escenario y detalle seleccionado; navegación y borradores sin modificar el estado real. Pruebas de flujos adaptadas a las nuevas vistas y suite test:design independiente. No cambia H2/H3 ni cierra sus verificaciones pendientes.

Presentación web (2026-10-10, revisada a estética Balatro sin portada ni eslóganes): [rediseño responsive](diseno-web.md), formularios y tarjetas reorganizados, explicaciones repetidas agrupadas sin cambiar la política ni el guardado. Verificación funcional en Chrome/Firefox y revisión visual de escritorio/móvil emulado. No cierra las comprobaciones pendientes de reglas ni los hitos H4/H5/H7.

Plan general adjunto (2026-10-10): [reconciliación H0–H7](plan-general-reconciliado.md) y tareas PG01–PG07. El plan completo incluye H4/H5/H7, todavía no implementados; las tareas históricas de este backlog cubrían principalmente v0.1. Firefox ya pasó 17 grupos tras una descarga limpia local. [Rendimiento H6](rendimiento-h6.md) medido en Chrome, Firefox y formato móvil: presupuestos locales cumplidos. Android físico **aplazado por el usuario**, manteniendo emulación web; no se solicita nuevamente ni bloquea tareas independientes.

T08c-3 (2026-10-10): [auditoría conjunta S01–S09](auditoria-t08c.md) completada. Aviso de jefe posterior y cantidades de cartas elegibles corregidos; A3/A4 cubiertos dentro del modelo provisional. 141 pruebas + 29 EFHIII + 17 grupos Chrome; 10 TODO de observación. Siguiente: T11/A7 (Firefox y Android físico), en paralelo con T01. No equivale a validar eficacia estratégica ni cerrar H2.

T08c-2 (2026-10-10): [horizontes explícitos](horizontes-t08c.md) de 1–3 rondas, arrastre de dinero/Green, comparación y política cualitativa, CLI y formulario web. 131 pruebas + 29 EFHIII + 16 grupos Chrome aprobados; 10 TODO de observación. Próxima tarea independiente T08c-3: auditar conjuntamente S01–S09 y variantes contra A3/A4, sin confundir cobertura de software con observación o eficacia estratégica.

T08c-1 (2026-10-10): [ventas individuales](ventas-t08c.md) añadidas a T07b, H3 h3-2 y cotas. API, demo, UI, sacrificios y confirmación verificadas: 122 pruebas + 29 EFHIII + 15 grupos Chrome. El paso siguiente de horizontes se entregó en T08c-2, arriba.

T07c (2026-10-10): [cotas conservadoras](cotas-t07c.md), S09, API/CLI y botón web implementados. 114 pruebas + 29 casos EFHIII + 14 grupos Chrome aprobados; 10 TODO de observación. No cambia la política H3 ni convierte cotas en predicciones. Próxima tarea independiente: T08c, ventas solas, seguida por el contrato de horizontes explícitos.

T11b (2026-10-10): [contraste EFHIII](contraste-efhiii.md) implementado con commit y hashes fijados; 29 casos coincidentes con oráculos literales independientes. Evidencia external_implementation, no observación de Balatro. Sin cambios al motor ni a sus estados de evidencia. Siguiente desarrollo independiente: T07c/S09.

T11 (2026-10-10): [plan](prompt-t11.md) ejecutado y [matriz A1–A8](evaluacion-t11.md) revisada. 103 pruebas + 13 grupos Chrome aprobados; teclado y tap emulado añadidos. Firefox bloqueado por activación Windows/mozglue; Android físico y observación Balatro pendientes. A3/A4 requieren todavía T07c/T08c. No se cierra v0.1 por pruebas de interfaz.

T10 (2026-10-10): web local funcional y probada; 103 aprobadas, 0 fallidas, 10 TODO manuales y 11 grupos de integración en Chrome. No se modificó Project Bonk. [Alcance y evidencia](interfaz-t10.md).

T09b (2026-10-10): [confirmaciones y guardado](confirmaciones-t09b.md) implementados con migración explícita desde H1, control de revisión/duplicados, historial, corrección manual y undo. Una escritura guarda el documento completo. Suite actual: 99 aprobadas, 0 fallidas, 10 TODO manuales. T10 ya integra ese flujo y mantiene una pestaña escritora mediante Web Locks.

H3 (2026-10-10): T07b se volvió a revisar y pasó sus 72 pruebas sin necesitar cambios. Se implementaron T08a/T08b dentro del alcance básico de [política h3-1](asesor-h3.md). Suite actual: 87 aprobadas, 0 fallidas y 10 TODO manuales. No se declara eficacia validada ni se cierra H2 por esos tests.

Actualizado: 2026-10-10, hora local Panamá. H0 cerrado como planificación; H1 conserva su núcleo completo y sus pruebas. **H2 funcional provisional, no cerrado por falta de contraste en partida. T07b completado como software.** El registro de versión del archivo instalado y el cambio de contrato están en [L01](evidencia/h2-inspeccion-local.md); las APIs y límites, en [motor H2](motor-h2.md) y [comparación T07b](comparacion-t07b.md).

## Entregado y verificado como software

| ID | Dependencias | Resultado / aceptación |
| --- | --- | --- |
| T02/T03 | H0 | TypeScript estricto; modelo, validaciones estructurales, errores y JSON. H1 sin cambios en esquema ni validación. |
| T09a | T03 | Guardado/carga e importación/exportación reutilizados, incluida prueba de persistencia entre procesos. No depende del asesor. |
| T04a | Fuentes H0/T01 | Registro histórico de evidencia conservado; L01 añadido como local_source, distinto de game_observation. |
| T04b | T04a + identificación del archivo instalado | Catálogo cerrado 1.0.1o-FULL/Blue/White; presets y controles de cobertura separados del esquema. Modelo provisional, sin migración automática de 1.0.1f. |
| T05a | T03/T04b | Hold, compra, venta y venta→compra; capacidad, precios, revisión, IDs; entrada intacta y reemplazo fallido sin resultado parcial. |
| T06a | T04b + reglas base | Nueve categorías y siete comodines sin Green; cartas puntuadas, contribuciones y orden en trazas. |
| T06b | T06a + sustento estático L01 | Green: incremento antes de puntuar, reducción por acción de descarte y suelo, persistencia al finalizar. Provisional; no es evidencia ejecutada. |
| T05b | T04b + sustento estático L01 | Interés de saldo explícito y cobro condicionado a victoria, sin cambios económicos durante la ronda. Golden/manos/recompensa desglosados. |
| T07a | T06a/b + recursos/jefe usados | Eventos deterministas de ronda con cartas iniciales/robos explícitos, partición de mazo, fin automático. Sin simulación de robos ni cotas estratégicas. |
| H2-demo | T09a/T05a/T06a | CLI cargando ejemplo, compra Half, dinero 7→2, plazas 0→1 y pareja 52→572; estados y traza visibles. |
| H2-tests | Contratos anteriores y oráculos independientes | 57 pruebas aprobadas, 0 fallidas, 10 TODO manuales; tipos/build y demo pasan. 23 pruebas H1 incluidas. |
| T07b | H2 eventos/acciones y evidencia por módulo | evaluateRoundPlan y compareShopAlternatives: mismo escenario por rama, copias independientes, robos condicionales, fin temprano, errores parciales y cobro separado. Cuatro demos; diferencias sin ranking. |
| T07b-tests | T07b + oráculos documentales independientes | 15 pruebas nuevas; total 72 aprobadas, 0 fallidas y 10 TODO manuales. Tipos/build y ambas demos pasan. |
| T08a — H3 básico | H2/T07b verificados como software | Matriz por escenario, estados/errores/evidencia conservados; margen, recursos, economía, activaciones, crecimiento y sacrificios. Subconjunto opcional de acciones validado. |
| T08b — H3 básico | T08a + política explícita h3-1 | Prioridades de cobertura y dominancia por dimensión, protección cualitativa de beneficios persistentes, niveles con empates y abstención. 15 nuevas pruebas y demo ejecutable. Sin pesos ni probabilidades. |
| T09b | H1/H2/H3 | Acción realizada independiente del consejo, vínculo runId/revisión/ruleset, ID de confirmación, venta parcial/reemplazo completo, discrepancia, historial y corrección explícita. Migración conserva H1; 12 tests nuevos y demo. |

Los resultados esperados y sus derivaciones están en [oráculos](evidencia/h2-oraculos.md). Inmutabilidad/persistencia/errores son verificaciones de software; no se mezclan con observación del juego.

## T01 y cierre pendiente de H2

| Comprobación | Evidencia actual | Siguiente paso / dependencia real |
| --- | --- | --- |
| T01a versión/plataforma/mods | Steam sin mods declarado; version.jkr del ejecutable contiene 1.0.1o-FULL, buildid Steam registrado. | Identificación estática hecha; vincular sesión observada a esta versión con la captura inicial de la tanda. No volver a preguntar los tres datos. |
| T01b intereses/cobro | Código local respalda saldo previo al cobro y fórmula; implementación provisional probada contra literales documentales. | Ejecutar y registrar I01/I02 y fronteras pertinentes para validar economía; no bloquea puntuar o vender. |
| T01c Green | Código local respalda before y decremento por acción; secuencias del motor probadas documentalmente. | Ejecutar y registrar G01–G05; no bloquea el resto del catálogo ni el cálculo de interés. |
| T01d efectos y jefes usados | Fuentes documentales y lectura parcial de ramas locales. | Contrastar por módulo e interacción; no pedir todo el catálogo de una vez ni imponer una nueva puerta global al desarrollo. |
| Confirmación ejecutada | runtime.confirmation pendiente; O-I1 observa cobro 19→27 en un caso, sin certificar todos los módulos. | Bloquea requireObserved:true y declarar H2 contrastado, no el modo provisional con advertencias. |

La [tanda mínima](evidencia/t01-tanda-usuario.md) sigue siendo la solicitud de evidencia: cobro sin Golden, cobro con Golden y una secuencia Green cuando estén disponibles. Las antiguas matrices/fixtures de 1.0.1f se conservan como hipótesis con observed:null, no se certifican para otra build solo porque coincide la aritmética.

U1/U2 se reclasifican como provisionales **por evidencia estática nueva**, no para saltarse bloqueos. Toda dependencia que permanezca pendiente o ausente devuelve abstención/error para el cálculo que la requiera. H2 se cerrará cuando la cobertura implementada requerida tenga sus discrepancias y contrastes T01 resueltos; no por tener pruebas unitarias verdes.

## Próximas tareas hacia H3

| ID | Dependencias | Tarea pequeña | Aceptación |
| --- | --- | --- | --- |
| T07c — completado como software | H2 + datos completos/ruleset | Cota round-bound-1 y comparación de inventarios; API, demo S09 y web. | Premisas y trazas, desconocidos por rama, ninguna proyección después del ante 8; pruebas en cotas-t07c.md. Reglas aún provisionales. |
| T08c — completado como software | H3/T07c | Ventas, horizontes y auditoría integrada S01–S09 entregados. | Matriz y discrepancias en auditoria-t08c.md; A3/A4 cubiertos en el modelo. Eficacia estratégica y correspondencia empírica siguen sin certificarse. |
| T10 — completado como software | H3/T09b | Formulario, escenarios, H3, confirmación, historial y copias; [guía](interfaz-t10.md). | 103 tests aprobados + 11 grupos Chrome; Web Locks y revisión; escritorio/móvil emulado. Android físico sigue sin verificarse, no se confunde con emulación. |
| T11 — parcial, continuar por evidencia | T10; T01 solo para certificar reglas | Evaluación integrada con partida real; contraste por módulo y recorrido Android físico. | A1–A8 con informe de casos/discrepancias; no afirmar observación del juego ni del dispositivo sin evidencia. No bloquea revisar UI mientras faltan reglas. |

T07b y H3 ya operan con reglas provisionales y advertencias mientras llega evidencia manual. H3 usa las diferencias descriptivas de T07b y añade prioridades explícitas; no se presenta como validado usando módulos no contrastados. U4 (mejorar victorias) exige evaluación propia posterior, no es una afirmación de estos hitos.

## Fuera de esta entrega

Asesor validado sobre partidas completas, interfaz fuera de la cobertura, simulación aleatoria, backend de datos, cuentas, sincronización y CI remoto. La [publicación estática](publicacion.md) ya dispone de sitio y Git independientes del árbol de Project Bonk. No se modificó Project Bonk ni se creó un repositorio anidado.







## Vales en la mesa — 2026-10-12

- Hecho: panel debajo de candidatos, 32 ilustraciones y textos; 10 vales integrados, selección y requisitos, recursos/interés en vivo, guardado compatible y pruebas. [Cobertura y evidencia L06](vales.md).
- Pendiente: integrar los otros 22 por familias; primero descuentos con precios de compra/venta y candidatos consistentes. Renovaciones, sobres, probabilidades y consumibles requieren sus operaciones respectivas; no basta con activar su catálogo.
- Pendiente: contraste en partida de L06; la inspección local y los tests no cierran la evidencia de ejecución.


## UI04 — mesa refinada, 2026-10-13

- Hecho: inventario fijo separado del catálogo; cuatro candidatos en una fila; vales compactos; HUD móvil reducible; edición modal; jerarquía, tipografía y movimiento revisados con referencias oficiales. [Diseño, crítica y verificación](diseno-web.md).
- Hecho: pruebas de interfaz y reflujo 200 %, cierre/foco, holográfica3712→4176, guardado sin copiar hipótesis. Núcleo375 aprobadas/0 fallos/10 TODO y17 grupos web. No es evidencia nueva en Balatro.
- Pendiente independiente: integrar y contrastar la ampliación CAT04 en el formulario y los escenarios; actualizar cobertura publicada solo tras su verificación. Los150 metadatos no se presentan como150 efectos plenamente integrados.
- Se mantienen pendientes la evidencia por módulo y los22 vales fuera de cobertura. Esta revisión no añade una condición de bloqueo al plan estratégico ni solicita otra prueba física de Android.


## META/QR — valoración sin planes, dirección 2026-10-13

El usuario pide valorar mediante meta, combos, sinergias y etapa con datos básicos; en el futuro, registrar por ciegas sin pasos manuales de guardar. Esta dirección sustituye la obligación de planes para la futura valoración rápida, pero no elimina el cálculo exacto ni los guardados existentes.

| ID | Estado / dependencias | Entrega y aceptación |
| --- | --- | --- |
| META01 | Investigación completada | [Fuentes, discrepancias y criterio](meta-estrategico.md). Se distingue meta de Gold, reglas1.0.1o y opinión de jugadores. No activa puntuaciones. |
| QR01 | Primera entrega implementada; META01 + catálogo/H2/SYN01 | 150 perfiles editoriales explícitos y predicados iniciales Q01–Q08; perfiles no equivalen a 150 activaciones completas. Condiciones AND/OR y zona de carta; desconocidos; contador poseído frente a comprado. No inferir roles con regex ni exigir todos los datos. |
| QR02 | Primera entrega implementada; QR01 + H2 | evaluateJokerFit sin RoundPlan: legalidad, beneficio, coste, relación potencial y datos faltantes. Inmutable, determinista, con evidencia y motivos; probarQ01–Q08 con esperados documentales. |
| QR03 | Implementada; QR02 | Notas en inventario y candidatos sin manos; cálculos exactos en Análisis, guardado en Registro. Separar encaje de Δpuntos, cubrir estados incompletos y no dar notas a efectos sin perfil. |
| RUN01 | Diseño futuro; independiente de tener todos los perfiles | Avance confirmado por ciegas, salto explícito, cambios transcritos y autoguardado recuperable reutilizando H1/T09b. Migración, errores, doble pulsación y separación real/hipotético; no inventar jefes/tags/cobros. |

[Contrato propuesto y ocho casos](propuesta-encaje-rapido.md). La primera rúbrica0–10 fue sustituida por el índice abierto quick-fit-2, publicado en [encaje rápido](encaje-rapido.md); no está validada contra partidas ni hereda calibración del modo de escenarios.

Aclaración anterior conservada como historial: se corrigió «Con cálculo» antes de implementar la valoración. Fue sustituida por QR01–QR03; el flujo vigente y los límites están en [encaje rápido](encaje-rapido.md).


## QR — primera valoración contextual entregada

Sustituye la aclaración previa de «meta pendiente»: la Mesa muestra notas o rangos con datos básicos y mazo, sin planes ni guardar. Manos exclusivamente en Análisis; Registro conserva H1/T09b. Se mantienen 82/68 como cobertura publicada del cálculo exacto.

Validación: 422 pruebas aprobadas, 0 fallos, 10 TODO manuales; 47 nuevas de política, composición e integridad; ocho grupos test:fit, 17 web y 15 diseño, más regresiones de objetivos/cobro/vales/galería/candidatos/colección/Mesa viva. Evidencia y límites en [encaje rápido](encaje-rapido.md). No se certifica eficacia ni nuevas observaciones de Balatro.

QR04 primera entrega:17 familias composicionales conectadas a la nota y densidad de material comprobable, más investigación original [COMP01–COMP06](evidencia/composiciones-2026-10-13.md). Pendiente ampliar predicados específicos de perfiles con historial, copia, condiciones conjuntas e inventario de consumibles; solicitar solo el dato relevante, cubrir contraste y actualizar límites. QR05: calibrar discriminación entre magnitudes de desarrollo y evaluar la política con casos/partidas; no sumar dólares y puntos ni diagnosticar consistencia sin evidencia. RUN01 sigue independiente y pendiente.


La plantilla de mazo inicial sigue la baraja únicamente en una vista nueva sin cartas editadas; composiciones transcritas y registros previos no se reinicializan. Errática mantiene composición desconocida hasta transcribirla. El flujo básico pasó nuevamente desde cero sin guardar ni planes.


## QR05a — resolución del índice contextual

Implementada: política quick-fit-2, índice sin techo fijo y una décima; material continuo, etapa interpolada y ajuste declarado de magnitud para contadores admisibles. [Plan, ejemplos y límites](indice-encaje.md). No son puntos de mano ni probabilidades; coste, economía, riesgos y otros aportes no se reducen al número.

Aceptación:13/52→14/52 aporta una diferencia visible, GreenMult12→13 también; crecimiento desarrollado puede superar100; desconocido no obtiene máximo100; condición imposible conserva límite20; compra/reemplazo no heredan contador vendido y la API rechaza modos ambiguos. Mantiene H1/T09b, H2/H3 de escenarios y separación real/hipotético. Suite440aprobadas/0fallos/10TODO; ocho grupos quick-fit y regresiones web17/diseño15/galería/candidatos/Mesa. Capturas revisadas en escritorio y formato móvil.

QR05b pendiente: calibrar utilidad por composición, magnitud y activación con casos/partidas; ampliar predicados y sinergias de vales sin asumir que todos los150 perfiles ya discriminan todos los aportes. No sustituir esta calibración por añadir decimales. RUN01(registro por ciegas) conserva sus dependencias independientes.
