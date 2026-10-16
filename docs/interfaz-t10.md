# T10 — interfaz web local

**Flujo vigente (2026-10-13):** Mesa ofrece [encaje contextual sin planes](encaje-rapido.md); manos en Análisis; guardar en Registro. Las entregas anteriores se conservan debajo como historial con su cobertura original.

Implementada el 2026-10-10. Conecta H1, H2, T07b, H3 y T09b: no es una maqueta ni incorpora fórmulas nuevas. T10 queda completo en el alcance solicitado, incluida prueba real de navegador y revisión de tamaños de escritorio/móvil. No se afirma validación en Android físico, eficacia estratégica ni cierre de H2.

## Iniciar

Desde balatro-advisor, con Node 24:

```powershell
npm.cmd ci
npm.cmd start
```

Abrir http://localhost:4173. El servidor solo sirve archivos y escucha en 127.0.0.1; no recibe partidas ni publica en internet. Ctrl+C lo detiene. Usa siempre el mismo origen: localhost y 127.0.0.1 tienen almacenes independientes. No abrir index.html mediante file://. No se implementó instalación/offline ni acceso desde un teléfono por LAN.

## Flujo normal

1. En **Partida**, confirmar la cobertura y transcribir saldo, próxima ciega, recursos, bases de manos, comodines y ofertas. Los campos vacíos representan desconocido, no cero. Precios sugeridos son base: revisar el importe del juego. Contador Green vacío significa desconocido. Guardar crea el registro autoritativo.
2. En **Escenarios**, añadir planes con cartas iniciales y secuencias de jugar/descartar/robar; usar los selectores o IDs de cartas. Declarar cuáles se conocen y cuáles son hipotéticas, y el fundamento del escenario. La plantilla es hipotética. Los planes se conservan solo durante esta sesión de página: recargar los borra, no borra la partida.
3. Consultar en **Consejo**. Se ejecuta H3 sobre los planes explícitos, con recursos, economía y trazas de T07b/H2. Los detalles separan cálculos y preferencias heurísticas; pueden aparecer empate, condición o abstención. Si falta información, se muestran los errores de cada rama. No se calcula una probabilidad de ganar.
4. Registrar una acción solo después de haberla realizado. El diálogo exige confirmación y permite contrastar el saldo observado. También se pueden registrar acciones legales distintas de la recomendada, incluidas ventas solas. Una compra no copia cartas futuras, cobros proyectados ni finales de escenario.
5. **Historial** muestra las entradas y sus snapshots/evidencia. Para corregir, editar la transcripción y escribir el motivo; para deshacer, usar la última entrada y explicar el error. El undo añade una revisión, no borra historia.
6. **Copias** exporta el registro completo y permite importar un archivo H1 o T09b validado. Reemplazar requiere confirmación; cancelar o importar datos inválidos deja el registro anterior. Hay migración explícita de la clave H1, que se conserva.

**Ver demostración** carga un ejemplo independiente y no escribe en la partida. Sus resultados no tienen botones de confirmación. Salir de la demostración devuelve al flujo real. Editar datos invalida los consejos; no se permite registrar desde un formulario con cambios sin guardar.

## Cobertura de entrada

1.0.1o-FULL, PC Steam sin mods, Blue/White, 52 cartas originales sin mejoras, ediciones, sellos, consumibles, vales ni tags. Selector cerrado de ocho comodines, hasta cinco plazas y dos ofertas de comodín. Las bases de las nueve manos pueden transcribirse, usar el preset nivel 1 o declararse desconocidas. Objetivo, recompensa y recursos son datos manuales, no deducciones silenciosas.

El editor se limita a la fase tienda y al mazo original. Un archivo válido pero fuera de su cobertura se preserva y puede exportarse; se explica que no puede editarse con este formulario. No se convierten borradores H1 ni mazos modificados a compatibles. Los selectores no presentan efectos no implementados como disponibles.

## Arquitectura y guardado

- web/index.html y style.css: presentación adaptable, controles etiquetados, foco visible, errores numéricos junto al campo, detalles expandibles y diálogo nativo.
- src/ui/app.ts: transcripción, escenarios y presentación de las salidas de H3; confirmación mediante T09b. No implementa reglas ni política estratégica.
- src/ui/writer.ts: propietario único mediante Web Locks del navegador.
- src/server.ts: servidor estático local con módulos ES compilados por TypeScript; sin API ni dependencias de runtime. Se evita añadir Vite/framework porque la compilación existente basta.
- Playwright es solo dependencia de desarrollo para probar el navegador.

T09b incorpora initialize (sin sobrescribir), restoreJson (importación autorizada con token del texto anterior) y correcciones de campos observed estructuralmente validadas. Se mantienen schemaVersion y clave confirmed-1; no hay migración destructiva. Nunca se acepta un escenario dentro de un patch de corrección. Se escribe un único documento con estado e historial; el fallo de setItem conserva el anterior. El estado solo se vuelve a leer como guardado tras éxito. La cuota y los límites H1/T09b siguen vigentes.

### Garantías entre pestañas

La pestaña escritora mantiene un Web Lock exclusivo durante toda su vida activa. Otra pestaña puede consultar, pero no guardar ni importar. **Solicitar control** espera en la cola del navegador; **Liberar control**, pagehide o cerrar la escritora libera el bloqueo. pageshow intenta recuperarlo. Perder el control cierra el diálogo de confirmación. No se roba el bloqueo por tiempo de inactividad.

Todas las escrituras de esta UI pasan por un adaptador que exige posesión del lock. Además se compara el texto leído y la revisión de T09b antes del commit. El evento storage refresca las demás vistas e invalida sus análisis. Sin Web Locks se ofrece solo lectura: no hay un lease inseguro ni una bandera local que simule exclusión.

Esto coordina pestañas cooperativas del mismo origen/perfil. No coordina DevTools, scripts externos, otros perfiles u otras aplicaciones que escriban la clave ignorando este protocolo. Tampoco sincroniza dispositivos. Borrar datos del navegador elimina las partidas: exportar copias. La suspensión de una pestaña puede retrasar el traspaso; cerrar o liberar explícitamente permite continuar.

## Verificación ejecutada

```powershell
npm.cmd run check
$env:BROWSER_CHANNEL='chrome'
npm.cmd run test:web
```

Sin Chrome instalado, usar `npx.cmd playwright install chromium`, quitar BROWSER_CHANNEL y ejecutar test:web. Las pruebas usan un servidor independiente en puerto 4174 y perfiles temporales; no tocan el registro de la sesión normal.

- Tipos/build y 103 pruebas aprobadas, 0 fallidas, 10 TODO manuales en Balatro. Cuatro pruebas nuevas cubren inicialización, importación/restauración, fallo de cuota y corrección de progreso con revisión/undo.
- 11 grupos de integración en Chrome 154.0.8037.98 headless: crear, validar, guardar, consultar H3 sin escritura, confirmar/doble pulsación, revisión vieja/duplicado, recargar, corregir/deshacer, importar/exportar/cancelar, cuota, dos pestañas con lock real y cola, liberación/cierre, demo aislada y fallback de lectura sin Web Locks.
- Ejemplo independiente conservado: pareja de ochos con Half puntúa 572; saldo de compra 7→2. Los oráculos siguen en H2/H3; la interfaz no genera sus propios resultados esperados.
- Capturas inspeccionadas a 1280×900 y 390×844; sin desbordamiento horizontal también a 360×800. Es emulación de anchura en Chrome de escritorio, no ejecución física ni emulación completa de Android. Cero errores JS de página en el flujo probado.

[Informe reproducible](evidencia/t10/verificacion.json), [escritorio](evidencia/t10/escritorio-viewport.png), [móvil emulado](evidencia/t10/movil-viewport.png). Las capturas muestran datos sintéticos de prueba, no una partida observada.

## Límites y siguiente paso

No falta funcionalidad requerida para cerrar T10 en el alcance probado. Para ampliar la garantía PC/Android de la versión, T11 debe probar teclado/tacto y recuperación en un Android físico y otros navegadores previstos, con un modo de acceso local seguro definido para ese dispositivo. No se hizo publicación ni se abrió la red para aparentar esa prueba. La accesibilidad se apoya en HTML nativo y foco visible; no se certifica auditoría con lector de pantalla.

La siguiente tarea concreta es T11: ejecutar el recorrido integrado con una partida real dentro de la cobertura, registrar discrepancias UI/modelo y completar la tanda mínima T01 por módulo. La lectura del ejecutable sigue siendo evidencia estática, distinta de observación de partida. Ninguna prueba web convierte esas reglas en confirmadas ni valida que H3 mejore victorias. No se amplió catálogo, simulación ni infraestructura de cuentas.

## Ampliación T07c

La sección Consejo incluye Comprobar límite de puntuación: trabaja con la partida registrada sin necesitar planes. Presenta cotas de conservar/comprar/reemplazar, premisas y errores por rama; no aplica acciones ni promete supervivencia cuando una cota supera el objetivo. Se invalida al editar o cambiar la revisión. Ver [contrato T07c](cotas-t07c.md).


## Ampliación T08c-1

El consejo también incluye vender sin comprar; muestra Ingreso por venta, sacrificios y saldo tras cobro por separado. Confirmar una venta guarda solo su saldo de tienda, nunca el cobro del plan. [Pruebas y alcance](ventas-t08c.md).



## Objetivo automático de la próxima ciega

El formulario obtiene el objetivo de `catalog/blinds.ts`, compartido con la validación H2. Cambiar ante, ciega, jefe o baraja recalcula el borrador, incluido el multiplicador de Plasma. Se muestra la operación y su carácter provisional (la evidencia existente no cambia). Si falta un dato o queda fuera de cobertura, el campo automático queda desconocido y muestra el motivo.

«Introducir objetivo manualmente» permite transcribir un objetivo distinto. Se conserva al cambiar otros campos; H2 sigue detectando discrepancias contra su modelo. Al abrir una copia con objetivo distinto o desconocido se activa el modo manual, sin corregirla silenciosamente. Un objetivo coincidente puede quedar en modo automático sin cambiar el registro al cargar. El nuevo cálculo se guarda como `confirmedPreset` mediante el guardado habitual; los valores manuales mantienen procedencia manual. Recompensa y dinero no se recalculan en esta mejora.

Prueba: `npm run test:target`; incluye persistencia, ausencia de escritura al consultar, error de jefe y reflujo móvil. Capturas en `docs/evidencia/auto-target/` revisadas visualmente. No es una observación nueva del juego.


## Distribución UI04

La estructura actual y su crítica están en [diseno-web.md](diseno-web.md). El inventario y las compras candidatas son zonas distintas del catálogo. La mesa evalúa el borrador en vivo; Registro conserva el guardado y las acciones confirmadas. En móvil, Reducir/Editar solo cambia la presentación de los campos. No modifica la partida ni las hipótesis. La edición holográfica usa el identificador `holographic` de H2.


## Clarificación de controles — 2026-10-13

«Sin copia guardada» reemplaza «Sin partida»: la Mesa puede comparar el borrador válido sin que exista un registro persistido. Se retiró la nota opcional de la creación inicial porque su valor no se utilizaba. El motivo de corrección de un registro existente permanece en el flujo de guardado T09b. La separación de controles de guardado se identifica por `data-save-control`, no por la existencia de esa nota.

Configurar jugadas abre el mismo editor que Cartas y jugadas de prueba. El cálculo actual de candidatos exige un plan explícito; no asigna todavía una valoración general automática a partir de mazo e inventario. Ofertas registradas corresponde a H3/confirmaciones sobre ofertas reales; la previsualización de candidatos la sustituye únicamente en una copia por una oferta al precio base.

Los recursos se derivan de baraja, vales y comodines compatibles. Las bases de las categorías utilizadas deben reflejar sus valores actuales, incluidos cambios por planetas. Los campos avanzados y resultados explícitos de CAT04 aún requieren integración; no pedir al usuario datos para los que no existe entrada. La ausencia de valoración en esos efectos es una limitación de cobertura.

Regresión de creación sin nota y corrección con motivo: `npm run test:web` (17 grupos, 0 errores de página, perfil y puerto independientes). No cambia fórmulas ni guardados anteriores.

## Disponibilidad de puntuación — 2026-10-13

«Con cálculo» confundía compatibilidad del efecto con un resultado ya obtenido. Se reemplazó por **«Cálculo con jugadas»** en fichas, búsqueda y colección. Ese distintivo no es una nota del comodín. Las fichas indican explícitamente que la valoración rápida por meta y sinergias sigue pendiente de implementación (QR01–QR03).

Los candidatos muestran el motivo estructurado cuando no pueden producir puntos: sin jugadas, datos faltantes, dinero insuficiente, falta de espacio, regla pendiente o incompatibilidad. No se deduce el estado buscando palabras en el texto de una explicación, ni se sustituye un resultado ausente por cero. El desglose conserva los errores detallados. Los valores existentes de Δpuntos siguen correspondiendo a planes fijos; la nota provisional de encaje se etiqueta «Encaje en este escenario».

Verificación: `npm run check` (375 aprobadas, 0 fallidas, 10 TODO de evidencia manual); `node tools/bay-test.mjs`, `node tools/collection-test.mjs`, `node tools/candidates-test.mjs` y `node tools/live-table-test.mjs`. Casos sin plan, efecto fuera de cobertura, falta de dinero y resultado calculado; oráculo independiente 80→572 conservado; ninguna escritura en la partida por consultar. Captura de ficha sin plan: [disponibilidad](evidencia/score-availability/sin-jugadas.jpg). Datos sintéticos, sin evidencia nueva de Balatro.
