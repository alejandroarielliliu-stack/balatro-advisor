# Balatro Strategic Advisor — especificación v0.1

**Vigente 0.5.0:** [DECK03](composicion-deck03.md), diez barajas, composición explícita y doce categorías. Las cifras inferiores de 0.4.0/DECK02 son históricas.

**Actualización 2026-10-11:** [DECK02](barajas-condiciones.md) guarda condiciones de las 15 barajas y conecta siete al motor. Las secciones originales que dicen únicamente Blue son históricas. Se conservan las demás exclusiones del motor y los ocho efectos de comodín.

**Estado vigente, 2026-10-10:** asesor h3-2, ventas individuales, cotas, horizontes de 1–3 rondas y web implementados. [Auditoría S01–S09](auditoria-t08c.md) completada como software provisional; A3/A4 cubiertos. T01/H2 y T11/A7 siguen abiertos por evidencia del juego y dispositivos/navegadores. Las notas de creación siguientes son históricas y no sustituyen el backlog vigente.

Creación: 2026-10-08. Actualización: 2026-10-09. H0 cerrado como especificación y planificación; H1 implementado en su núcleo independiente de reglas.

**Entrega H2:** motor provisional implementado, sin asesor ni interfaz. Contrato activo cambiado explícitamente a **1.0.1o-FULL** tras [L01](evidencia/h2-inspeccion-local.md); el 1.0.1f de H0 se conserva como referencia histórica. [Cobertura ejecutable](motor-h2.md). Criterios de producto y contraste en partida aún pendientes; H2 no se declara cerrado.

## Contexto y estado de H0

Se revisaron el README raíz, el inventario de archivos, `ProjectBonk/README.md`, `ProjectBonk/AGENTS.md` y sus documentos de arquitectura y reglas de desarrollo. No se encontró un plan general adjunto, código de Balatro ni un proyecto web. `docs/` y `tests/` raíz estaban vacíos; `src/` raíz contiene directorios de Roblox. Existe además un repositorio Git dentro de `ProjectBonk/`, con modificaciones locales anteriores. Se preserva todo ese trabajo.

Las instrucciones Luau/Studio de `ProjectBonk/AGENTS.md` corresponden a ese proyecto; el trabajo de Balatro no lo modifica. Sus dependencias de desarrollo se instalan únicamente en `balatro-advisor/`. En T01 los seis documentos se trasladaron desde `docs/` raíz a **`balatro-advisor/docs/`**, con un README propio en `balatro-advisor/`. El núcleo TypeScript ya reside en ese mismo espacio, separado de las raíces de Script Sync. No se cambia el README de Project Bonk. No se inicializó Git: Balatro pertenece al repositorio raíz existente y no tiene `.git` propio. El repositorio interno de Project Bonk es preexistente y se conserva.

**H0 cerrado como definición del alcance y preparación del desarrollo.** La instrucción más reciente del usuario permite H1 sin resolver U1–U3: estas comprobaciones validan los módulos afectados de H2, no la estructura ni la persistencia. P1–P5 constituyen supuestos explícitos suficientes para comenzar y pueden revisarse. H1 conserva datos desconocidos o fuera de cobertura y no ejecuta fórmulas del juego. Véanse [resultado H1](evidencia/h1-validacion.md) y [dependencias reales](backlog.md).

T01 no encontró una instalación ejecutable en las ubicaciones revisadas ni una sesión en ejecución. El [informe T01](evidencia/t01-reglas.md) mantiene las observaciones pendientes; la publicación primaria del parche no certifica la build del usuario. Cerrar H0 no convierte esas hipótesis en reglas verificadas.

## Usuario, problema y objetivo

Jugador que conoce la interfaz básica de Balatro y quiere comprender decisiones de tienda mientras juega. Introduce datos manualmente desde PC o un navegador Android, incluso si el juego corre en otro dispositivo. La aplicación no necesita ni averigua la semilla y no controla Balatro.

Objetivo de producto: ayudar a decidir cómo invertir recursos para llegar a derrotar al jefe del ante 8. v0.1 es una prueba acotada de asesoría explicable, no un solucionador de cualquier partida ni evidencia de una mejora de tasa de victoria. Debe reconocer cuándo su cobertura no permite aconsejar.

## Requisitos establecidos y propuestas

| ID | Estado | Decisión |
| --- | --- | --- |
| R1 | Establecido por el usuario | Tienda: comprar, conservar dinero, vender y reemplazar comodines. |
| R2 | Establecido | Evaluar supervivencia, economía, sinergias, consistencia y crecimiento; no solo puntuación inmediata. |
| R3 | Establecido | Entrada manual, guardado, PC y Android, cálculos comprobables y reglas estratégicas. |
| R4 | Establecido | Una versión/baraja/dificultad, catálogo limitado, sin porcentajes de victoria. |
| P1 | Contrato activo H2; sustitución explícita del propuesto en H0 | Balatro PC Steam 1.0.1o-FULL, sin mods; Blue Deck, White Stake. Identificado estáticamente en la instalación; sin certificación de una partida. |
| P2 | Propuesta adoptada | Ocho comodines; cartas de juego estándar sin modificaciones; nueve categorías de manos normales. |
| P3 | Propuesta adoptada | Comparación de una acción de tienda por análisis: nada, una compra, una venta, o una venta seguida de una compra. |
| P4 | Propuesta adoptada | Interfaz en español; nombres ingleses del catálogo como identificadores visibles secundarios. Una partida activa local. |
| P5 | Propuesta adoptada | Evaluación de manos de referencia introducidas por el jugador, sin simulación de robos ni probabilidades. |

P1 no implica que la edición Android de Balatro tenga esas reglas. Android es plataforma del asesor. Si la versión disponible difiere, primero se cambia y verifica el contrato del catálogo, no se asume equivalencia.

## Cobertura elegida

Blue Deck permite contrastar usar una mano para crecer con reservarla para cobrar dinero; White Stake evita stickers y cambios adicionales de dificultad. La baraja azul requiere estar desbloqueada en el juego. Se limita la composición compatible a las 52 cartas normales originales: cuatro palos y trece rangos, sin sellos, mejoras, ediciones ni cambios permanentes de fichas. Es una limitación consciente para verificar primero el razonamiento de tienda.

Los niveles de las nueve manos normales pueden variar: se transcriben también las fichas y Mult base mostrados en el juego; v0.1 no asesora sobre planetas ni calcula sus incrementos. El catálogo y los precios se definen únicamente en [reglas](reglas-y-fuentes.md).

| Comodín | Qué permite aprender y probar |
| --- | --- |
| Joker | Referencia barata de potencia incondicional. |
| Half Joker | Número de cartas jugadas frente a cartas que puntúan; manos pequeñas. |
| Abstract Joker | Valor de ocupar espacios y coste indirecto de vender. |
| Even Steven | Dependencia de rangos y de cartas efectivamente puntuadas. |
| Scholar | Sinergia mixta de fichas y Mult; sensibilidad a encontrar ases. |
| Banner | Fichas frente a usar descartes; sensibilidad al jefe. |
| Green Joker | Crecimiento persistente, descartes, manos e ingresos en conflicto. |
| Golden Joker | Ingresos futuros, coste inicial y coste de ocupar un espacio. |

Se admiten Small y Big Blind, y los jefes The Psychic, The Water, The Wall y Violet Vessel. Se incluyen dos restricciones sencillas y dos objetivos altos sin alterar la puntuación. Los demás jefes se registran pero provocan abstención de supervivencia. La selección no permite asesorar de principio a fin cualquier partida real, y no debe anunciarse como tal. La expansión de jefes será un hito posterior.

## Flujo principal

1. Crear o recuperar una partida. Seleccionar contrato compatible y confirmar modificadores ausentes.
2. Registrar la tienda después del cobro: dinero actual, comodines ordenados, valores de venta, contador de Green, ofertas y precios visibles.
3. Registrar la próxima ciega y el jefe visible del ante, manos/descartes/tamaño de mano, bases de manos y ejemplos de jugadas habituales y adversas. Ningún ejemplo se presenta como robo conocido.
4. Validar. Mostrar campos faltantes e incompatibilidades antes de recomendar.
5. Generar acciones legales; mostrar saldo, espacio, interés condicionado, puntuaciones por ejemplo y conflictos estratégicos. Dar una recomendación condicional o varias alternativas sin resolver.
6. El usuario ejecuta la decisión en Balatro. Puede aplicar explícitamente el resultado al registro local; analizar no modifica el estado. Después de jugar actualiza la siguiente tienda, sin deducir automáticamente lo que sucedió.
7. Guardar y recuperar localmente. Exportar/importar JSON permite respaldo o traslado manual entre dispositivos.

## Contrato del asesor

No habrá una suma opaca de pesos ni una cifra de «calidad» que parezca probabilidad. Para cada acción:

- **Exacto dentro del modelo:** legalidad, dinero y espacios posteriores, puntuación de cada jugada especificada, contador tras una secuencia especificada. «Exacto» siempre cita entradas, regla y cobertura.
- **Condicional:** interés al final si no cambia el saldo durante la ronda; ingresos si se gana y se conserva Golden; crecimiento si ocurren los eventos escritos.
- **Heurístico:** preferencia por liquidez cuando las jugadas probadas bastan; urgencia de potencia cuando no bastan; fragilidad por ases/pares/descartes; utilidad de crecimiento según rondas restantes.
- **Desconocido:** robos futuros, ofertas futuras, probabilidad de completar una mano o de ganar. No convertir frecuencias de cartas en probabilidades de supervivencia.

Algoritmo mínimo, determinista y versionado:

1. Filtrar acciones ilegales; conservar sus motivos para mostrarlos cuando el usuario las intente.
2. Evaluar cada acción sobre exactamente los mismos ejemplos y supuestos. La suma de una secuencia respeta cartas disponibles, descartes, contador y fin automático de ronda.
3. Si una cota superior válida demuestra incapacidad de vencer, marcar «insuficiente bajo esta cobertura». Un ejemplo favorable nunca demuestra seguridad.
4. Si solo algunas acciones alcanzan el objetivo en las secuencias aportadas, señalarlas como candidatas de supervivencia **en esos ejemplos**. Si solo hay jugadas sueltas, comparar potencia, sin afirmar cobertura de la ronda.
5. Mostrar alternativas de compromiso. Preferencia provisional por conservar dinero cuando ninguna compra mejora la cobertura observada y sí reduce liquidez; por potenciar cuando mejora ejemplos insuficientes; por crecimiento/ingresos cuando no sacrifica esa cobertura. Todas estas preferencias llevan etiqueta heurística, sin afirmar optimalidad.
6. Si las evidencias discrepan, hay datos críticos desconocidos o el jefe inmediato es incompatible, devolver «sin preferencia concluyente» o «análisis parcial», nunca resolver el empate con una regla escondida.

La consistencia se explica con condiciones de activación y cantidad de cartas elegibles: 4 ases, 20 cartas de rango par, y sensibilidad de cada ejemplo. El asesor no estima cuántas parejas o ases robará. El crecimiento se muestra por eventos y horizontes de 1–3 rondas elegidos explícitamente, truncados al jefe del ante 8; no extrapolar ingresos después del objetivo ni futuras compras.

## Elementos no compatibles

- Una oferta no compatible queda visible con nombre/precio y se excluye de las compras evaluadas. El resultado dice «comparación entre opciones compatibles», no «mejor compra de la tienda».
- Un comodín poseído no compatible, un modificador desconocido o un mazo alterado bloquea puntuación y recomendación global. Se permiten registro y aritmética del saldo sobre precios conocidos, separados de cualquier juicio estratégico.
- Un jefe futuro incompatible produce advertencia; si la ciega inmediata es compatible puede analizarse ese tramo, pero no afirmar preparación para el jefe. Jefe inmediato desconocido/incompatible: abstenerse de supervivencia.
- Una versión/baraja/dificultad incompatible permite guardar como borrador, sin usar el motor de reglas. Ausencia de información nunca equivale a ausencia de efecto.

## Exclusiones

Rerolls, paquetes, vales, compras/uso/venta de consumibles, tags, saltos de ciegas, secuencias de varias compras, optimización de descartes o de orden de comodines, modificaciones de mazo, retriggers, XMult, efectos aleatorios, desafíos, mods, endless, OCR, lectura de pantalla, importación de partidas del juego, semilla, control del juego, cuentas, backend, sincronización cloud, telemetría y monetización. Se registra la presencia de esos elementos para no ignorarlos. El guardado local no promete uso offline ni sincronización.

## Criterios de aceptación de v0.1

Estos criterios describen el producto completo, no condiciones para cerrar su planificación H0. La situación actual por criterio está en la [matriz T11](evaluacion-t11.md): H3/T10 ya están implementados, pero la aceptación completa y las comprobaciones físicas siguen pendientes.

| ID | Resultado observable |
| --- | --- |
| A1 | No presentar un resultado como contrastado con el juego sin evidencia T01. H2 permite cálculos provisionales rotulados del contrato identificado; requireObserved:true se abstiene mientras falte observación. Una versión incompatible produce error, sin migración implícita. |
| A2 | Todas las acciones de P3 respetan saldo y capacidad, incluidas ventas que financian compras; analizar no altera la partida. |
| A3 | Los nueve escenarios y sus variantes de frontera producen cálculos y abstenciones indicados; cada cifra abre su desglose. |
| A4 | Cada consejo expone economía, potencia/supervivencia, activación/consistencia y horizonte; distingue exacto, condicional y heurístico. |
| A5 | No aparecen porcentajes de victoria, «óptimo», «victoria garantizada» ni probabilidades inventadas. |
| A6 | Guardar, recargar y exportar/importar preserva el estado; un archivo inválido o de versión futura no reemplaza el guardado válido. |
| A7 | Flujo completo usable a 360 px y 1280 px, con teclado y pantalla táctil, sin información accesible solo por hover. Probar Chrome Android y Chrome/Firefox en PC; registrar versiones reales. |
| A8 | La misma entrada y versiones producen el mismo análisis. Ningún efecto no compatible se trata como cero. |

## Decisiones pendientes

P2–P5 siguen abiertas a revisión. Steam sin mods ya fue declarado; L01 identifica 1.0.1o-FULL en el ejecutable. La tanda mínima de cobro y Green sigue pendiente de evidencia en partida; el resto del catálogo se contrasta por módulo. No se repite la solicitud de versión/plataforma/mods. La instalación inspeccionada respalda un modelo provisional, no una prueba real jugada.

Lectura siguiente: [fuentes](reglas-y-fuentes.md), [escenarios](escenarios-v0.1.md), [estado](modelo-de-estado.md), [arquitectura](arquitectura-v0.1.md), [backlog](backlog.md).

