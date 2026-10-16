# H1 — implementación y verificación del núcleo

Informe histórico de H1. La entrega posterior de reglas y sus pruebas se documenta en [motor H2](../motor-h2.md); no cambia los resultados de H1 aquí registrados.

Fecha: 2026-10-09. Alcance autorizado: estado, validación estructural, guardado/carga y evidencia de reglas, independientemente de U1–U3. No se implementa estrategia, puntuación, interés ni interfaz completa.

## Qué funciona

- `src/state/model.ts`: esquema y tipos inferidos, observaciones known/unknown, hipótesis separadas, inventario ordenado, contadores genéricos y borrador sin reglas implícitas.
- `src/state/validation.ts`: validación sin coerción, IDs/referencias, JSON de entrada/salida, límite de 1 MiB y errores con ruta/código/mensaje. Se permiten builds y valores fuera de cobertura como datos; no como prueba de compatibilidad.
- `src/storage/state-store.ts`: almacenamiento inyectable, adaptador navegador diferido, save/load e importación/exportación. La revisión y los contadores se conservan; guardar no ejecuta acciones del juego ni incrementa revisiones por sí solo.
- `src/rules/evidence.ts`: evidencia primaria/secundaria separada de observación, estados confirmed/provisional/pending y dependencias por análisis. Pendiente/ausente => abstención; provisional => límite visible. Una regla ajena no bloquea otras consultas.
- `tests/fixtures/manual-rule-cases.json`: diez casos documentales con expected separado de observed:null. Los resultados literales proceden de hipótesis H0/T01 anteriores al código, no de una función de reglas invocada por la propia prueba.

## Ejecución y resultado

Desde `balatro-advisor/`: `npm.cmd run check`.

Entorno: Windows, Node 24.19.0, npm 11.17.0, TypeScript 7.0.2, @types/node 24.19.1. Dependencias solo de desarrollo. No se inicializó Git ni se añadió infraestructura.

Resultado: compilación y tipos correctos; **23 pruebas de software aprobadas, 0 fallidas, 10 TODO de observación en el juego**. El runner puede dibujar un símbolo junto a un TODO, pero su resumen lo cuenta por separado: no son pruebas aprobadas de Balatro.

Comprobación documental posterior: nueve Markdown, 37 enlaces locales existentes y un ejemplo JSON parseado sin errores. Desde balatro-advisor, Git resuelve al repositorio raíz existente; no hay balatro-advisor/.git. node_modules y dist quedan ignorados. Todos los cambios de implementación de H1 están dentro de balatro-advisor.

| Grupo | Prueba relevante | Qué demuestra / límite |
| --- | --- | --- |
| Estado | S01 literal copiado de la documentación, parsear/serializar y comparación profunda. | Conservación de campos; el fixture no demuestra las reglas de S01. |
| Incertidumbre | Borrador, contador desconocido, contador 7/17 y campos no compatibles. | No se inventa cero, no se resetea Green, no se certifica la versión. |
| Independencia de reglas | Otra build, mods, saldo negativo, siete espacios y cartas modificadas. | Estado estructuralmente válido guardable; no se fuerza el alcance del motor en el serializador. |
| Errores | Tipos incorrectos, campo ausente, fecha imposible, versión de esquema futura, ID duplicado/referencia inexistente. | Errores con ruta y mensajes claros; sin coerción silenciosa. |
| Importación | JSON corrupto, claves reservadas, ciclos, getters, valores no JSON y tamaño/profundidad excesivos. | Rechazo controlado de datos que no se conservarían correctamente. |
| Persistencia | Nueva instancia del store, export/import, comparación profunda. | Ida y vuelta exacta; otras claves del almacenamiento intactas. |
| Fallos | Cuota, acceso bloqueado, importación inválida y datos corruptos existentes. | No muestra éxito falso ni borra la partida anterior; exportar sigue disponible. |
| Persistencia real | Web Storage nativo de Node con archivo temporal; proceso de escritura termina, otro proceso lee. | Persistencia fuera de memoria del proceso con los mismos datos. No es prueba de un navegador Android. |
| Evidencia | Pendiente/ausente/provisional/confirmación documental. | Abstención o límite explícito; la prueba no cambia el estado de una regla a observada. |

El adaptador espera setItem atómico ante fallo, como el [contrato Web Storage](https://html.spec.whatwg.org/multipage/webstorage.html#the-storage-interface). Las pruebas con almacenamiento simulado respetan ese contrato. No se promete atomicidad para adaptadores arbitrarios que escriban parcialmente antes de lanzar un error.

Se usa el [runner nativo de Node](https://nodejs.org/api/test.html) en vez de Vitest: suficiente para funciones puras y almacenamiento inyectado. El test de Web Storage de Node emite un aviso de API experimental; no se oculta ni se depende de esa API en el código para navegador. Sus archivos temporales se limpian por nombre, sin borrado recursivo.

## Qué sigue pendiente

1. Versión/plataforma/mods reales. La pregunta ya está presentada; todavía no se recibieron esos datos.
2. Ejecución de los casos mínimos aplicables a intereses y Green, después de identificar la versión. Los diez TODO son una reserva de casos, no una solicitud de diez pruebas ahora.
3. Compatibilidad de juego, expansión de presets, comprobación de capacidad, precios, transiciones y legalidad de las secuencias: H2, con dependencias por regla.
4. Prueba de interfaz y localStorage en Chrome/Firefox PC y Chrome Android: corresponde a la integración de interfaz futura, no se afirma realizada aquí.

H0 se cierra únicamente como especificación y planificación bajo el criterio revisado del usuario. H1 no prueba que la estrategia aumente las victorias ni que todas las reglas del catálogo sean correctas.
