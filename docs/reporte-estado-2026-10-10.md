# Reporte de estado — Balatro Strategic Advisor

Fecha: 10 de octubre de 2026. Corte: después de T08c-3. Basado en el código, backlog, documentación y últimas verificaciones registradas. Para elaborar este reporte no se volvió a ejecutar la suite ni se hicieron nuevas comprobaciones dentro de Balatro.

**Estado general.** Existe una aplicación web local funcional con entrada manual, motor de reglas, comparación de alternativas, asesor heurístico, guardado e historial. La estructura principal de v0.1 está implementada y su auditoría de nueve escenarios está completada como software. La versión todavía no está cerrada como producto validado: faltan comprobaciones del juego y pruebas de navegadores/dispositivo.

Su uso actual es analizar decisiones de tienda dentro de una cobertura pequeña y explícita. No puede asesorar cualquier partida completa ni demostrar que una decisión aumenta la probabilidad de llegar al ante 8.

**Qué puede hacer el usuario hoy.**

1. Crear, transcribir o recuperar una partida: dinero, comodines y sus contadores, ofertas, ciega, recursos y datos del mazo/manos.
2. Construir planes hipotéticos con cartas iniciales, manos, descartes y robos explícitos. Distinguir cartas conocidas de hipotéticas.
3. Comparar conservar dinero, una compra, una venta o un reemplazo mediante venta→compra. Ver acciones ilegales y sus motivos.
4. Consultar puntuación, recursos usados, economía calculable, activaciones, crecimiento y sacrificios. Recibir una preferencia condicional, un empate o una abstención.
5. Evaluar hasta tres rondas consecutivas declaradas. Cada alternativa conserva sus propios saldos y Green, sin inventar compras intermedias ni continuar después de un plan insuficiente.
6. Consultar una cota superior conservadora de puntuación. Una cota insuficiente permite detectar límites del modelo; una cota alta no demuestra que se pueda alcanzar.
7. Confirmar una acción realmente realizada, aunque no sea la recomendada, y guardar el estado actualizado. Consultar historial, corregir datos, deshacer el último registro y exportar/importar copias JSON.

Consultar nunca aplica una proyección a la partida real. Las confirmaciones comprueban revisión e identificador para rechazar recomendaciones antiguas y duplicados. Estado e historial se guardan juntos; la web mantiene una pestaña escritora mediante Web Locks.

**Cobertura actual.**

| Elemento | Alcance |
| --- | --- |
| Juego objetivo | Balatro PC Steam 1.0.1o-FULL, sin mods. Contrato identificado estáticamente; observación completa aún pendiente. |
| Baraja y dificultad | Blue Deck / White Stake. |
| Comodines | Joker, Half Joker, Abstract Joker, Even Steven, Scholar, Banner, Green Joker y Golden Joker. |
| Cartas | Mazo estándar de 52 cartas sin mejoras, sellos, ediciones ni modificaciones. |
| Manos | Nueve categorías normales. Se permiten bases/niveles transcritos compatibles; no se asesora sobre planetas. |
| Ciegas | Small, Big, The Psychic, The Water, The Wall y Violet Vessel. |
| Búsqueda de tienda | Conservar, una compra, una venta o una venta seguida de una compra. No es exhaustiva. |
| Evaluación | Escenarios de cartas fijos; horizonte explícito de 1–3 rondas, truncado al jefe del ante 8. |
| Plataforma del asesor | Web local, interfaz en español. Chrome de PC probado; Android físico y Firefox pendientes. |

Una entrada fuera de cobertura no se interpreta como un efecto nulo. El registro puede conservar información desconocida o incompatible; el motor limita o rechaza los cálculos afectados. Android sería un dispositivo para usar el asesor, no otro contrato de reglas de Balatro.

**Componentes y estado de los hitos.**

| Parte | Estado actual |
| --- | --- |
| H0: especificación y planificación | Cerrado. Alcance, esquema, escenarios, fuentes y backlog documentados. |
| H1: datos y persistencia | Núcleo implementado: validación estructural, JSON, guardado/carga y errores. |
| H2: reglas | Funcional y provisional. Acciones, puntuación, eventos de ronda, contadores y economía implementados. No cerrado como contrastado en juego. |
| T07b: comparación | Implementado: mismas cartas y supuestos por alternativa, ramas independientes, finalización temprana y errores explícitos. |
| H3: asesor | Heurística h3-2 implementada. Prioriza cobertura de los planes y compara dimensiones sin sumar dólares, puntos y contadores. Eficacia estratégica no validada. |
| T07c: cotas | Implementado, con premisas y desglose. No se usa la magnitud de la cota como ranking de compras. |
| T08c: ampliación y auditoría | Completado como software: ventas individuales, horizontes y matriz S01–S09 con variantes. |
| T09b: acciones confirmadas | Implementado: revisión, duplicados, secuencias, discrepancias, historial y correcciones. |
| T10: web mínima | Implementada y probada en Chrome, con formularios y recorridos de consulta/confirmación/recuperación. |
| T11: evaluación integrada | Parcial. A3/A4 cubiertos dentro del modelo; quedan pruebas de plataforma y evidencia del juego. |

El código está dividido en catálogo, estado, reglas, evaluación, asesor, almacenamiento e interfaz dentro de `src/`. Existen ejemplos ejecutables en `examples/`, pruebas en `tests/` y herramientas de contraste/navegador en `tools/`. Se utiliza TypeScript estricto, Node 24 para desarrollo y pruebas nativas de Node; Playwright para navegador. No hay dependencias de ejecución externas, backend, cuentas ni base de datos remota.

Todo reside en `balatro-advisor`, separado de Project Bonk. Se utiliza el Git raíz preexistente; no se creó un repositorio anidado.

**Verificación disponible.**

| Verificación | Último resultado registrado | Qué acredita |
| --- | --- | --- |
| Tipos, compilación y suite completa | 141 aprobadas, 0 fallidas, 10 TODO | Comportamientos del software y regresiones del modelo. Los TODO no cuentan como aprobados. |
| Suite de escenarios/cotas/horizontes | 30 aprobadas, incluidas en la suite completa | S01–S09 y casos de frontera con esperados independientes de la implementación evaluada. |
| Contraste EFHIII | 29 casos coincidentes | Comparación de puntuación con una implementación externa fijada; no observación del juego. |
| Navegador | 17 grupos aprobados, cero errores JS | Chrome 154.0.8037.98 en Windows, headless; escritorio, teclado y tacto emulado. |
| Auditoría de producto | S01–S09 cubiertos como software provisional | Economía, supervivencia en planes, sinergias, crecimiento, reemplazos, jefes y cotas. No valida tasas de victoria. |

La auditoría corrigió avisos insuficientes sobre jefes futuros, añadió cantidades de cartas elegibles a las explicaciones de Scholar/Even y aclaró la diferencia entre guardar datos fuera de cobertura y poder analizarlos. No encontró discrepancias aritméticas en los casos examinados.

Se conserva evidencia de tres clases distintas: inspección del ejecutable local, contraste externo con EFHIII y observación directa en partida. O-I1 documenta un cobro de 19→27, con interés 3 y recompensa 5, sin manos sobrantes. Ese caso no verifica por sí solo Golden, Green ni todos los tiempos de cobro. El modo estricto sigue rechazando resultados que requieran comprobaciones pendientes.

**Ejemplos que ya se pueden demostrar.**

- Compra de Half: pareja de ochos 52→572; saldo 7→2. La mano está especificada, no se predice que vaya a salir.
- Golden durante dos rondas: conservar 25→37→50 frente a comprar 19→33→50. Se muestra la menor liquidez inicial y se mantiene el compromiso.
- Green: en S05 termina después de tres manos con 945 puntos y contador 3. No se concede crecimiento por manos que ya no se juegan.
- Violet Vessel: en S09 las cotas 151125 y 169000 quedan por debajo de 300000. Son límites superiores bajo las premisas, no puntuaciones prometidas.

**Qué falta para cerrar v0.1.**

| Pendiente | Trabajo concreto | Dependencia |
| --- | --- | --- |
| T01 / validación de H2 | Vincular la sesión observada a la versión y completar casos mínimos de intereses, Golden, Green e interacciones pendientes. Registrar esperado, observado y discrepancias. | Acceso a una partida y evidencia pertinente; no hace falta volver a pedir plataforma/mods ni todo el catálogo. |
| Firefox de PC | Resolver el fallo de arranque del navegador de pruebas y ejecutar el recorrido. El intento anterior falló por activación/configuración de Windows antes de abrir la web. | Entorno Firefox funcional. No se atribuye ese fallo al asesor. |
| Android físico | Probar introducción de datos, consulta, confirmación, guardado/recarga y copias en un dispositivo real. | Dispositivo y vía de acceso adecuada. El servidor actual es local; `localhost` del teléfono no apunta al PC. |
| Cierre T11/v0.1 | Registrar resultados anteriores y corregir discrepancias que aparezcan. | Evidencia real, sin sustituirla por emulación o pruebas aritméticas. |

La próxima tarea técnica independiente es resolver la ejecución de Firefox y repetir la prueba de navegador. La observación de Balatro y Android puede realizarse en paralelo cuando estén disponibles. No hace falta reconstruir la arquitectura para continuar.

**Fuera de esta versión.** Ampliar a todo el catálogo, todos los jefes/barajas/dificultades, cartas modificadas, rerolls, paquetes, vales, consumibles, secuencias de varias compras, optimización de descartes, Monte Carlo, porcentajes de victoria, lectura automática del juego, semilla, control del juego y servicios de cuentas/sincronización. Añadir un comodín nuevo requiere modelar su efecto, interacciones, evidencia y pruebas; no basta con incorporar nombre y precio.

**Cómo ejecutarlo.** Desde la carpeta `balatro-advisor`, con Node 24:

```powershell
# Solo si faltan las dependencias:
npm.cmd ci

# Compila e inicia la web local:
npm.cmd start
# Abrir http://localhost:4173/

# En otra terminal, verificaciones o ejemplos:
npm.cmd run check
npm.cmd run test:scenarios
npm.cmd run demo:advisor
npm.cmd run demo:horizon
```

El guardado pertenece al origen y perfil del navegador. Exportar JSON permite respaldarlo o trasladarlo manualmente; no existe sincronización automática. Los editores de planes/horizontes son temporales y se vuelven a introducir tras recargar. La aplicación no está publicada como servicio público ni promete funcionamiento offline.

**Documentos de referencia.** [Backlog vigente](backlog.md), [especificación](especificacion-v0.1.md), [auditoría integrada](auditoria-t08c.md), [evaluación T11](evaluacion-t11.md), [guía web](interfaz-t10.md), [reglas y fuentes](reglas-y-fuentes.md) e [informe de navegador](evidencia/t11/chromium/verificacion.json). Los documentos anteriores contienen recuentos históricos; para el corte de este reporte se toman las verificaciones posteriores a T08c-3.
