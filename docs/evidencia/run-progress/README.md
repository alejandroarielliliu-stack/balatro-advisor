# Verificación RUN01b

16 de octubre de 2026. Estados y confirmaciones sintéticos, almacenamiento en memoria y perfiles temporales de Chrome. No se observó una nueva partida de Balatro. Android físico sigue aplazado por el usuario. [Uso, contrato y límites](../../recorrido-run01b.md).

## Resultados de software

- `npm.cmd run check`: **594 aprobadas, 0 fallos, 10 TODO de observación en Balatro**. Añade 25 casos: 3 de inicio, 14 de progreso y 8 de persistencia.
- `npm.cmd run demo:run-progress`: nueva Amarilla, entrada, resultado declarado, saldo observado $22, tienda sin stock inventado, salida a grande, recarga, rechazo de revisión antigua y deshacer salida. Las consultas hacen cero escrituras.
- `node tools/run-progress-test.mjs`: **17 grupos aprobados**, incluidos editor/composición visibles durante selección/ronda/cobro/tienda y tienda oculta en otras fases. Sin errores JavaScript.
- Regresiones: **17 grupos web**, **14 de sesión de tienda** y **12 de migración** aprobados. En esta entrega se ejecutó el validador legacy congelado; la prueba opcional con el lector histórico completo pertenece a la [evidencia RUN01a](../run-migration/README.md).

Se revisaron capturas de escritorio (1440 px) y móvil emulado (390 px), con el editor real y el diálogo de confirmación: sin recortes de botones ni desborde de documento en los casos comprobados. Los nombres internos de tareas se retiraron del texto visible.

Un fixture inicial utilizaba `seed_money` en lugar del identificador válido `v_seed_money`: el estado era serializable pero quedaba fuera del editor compatible. Se corrigió el fixture y se añadieron aserciones de formulario/composición visibles. Los 17 grupos finales incluyen tanto persistencia como el recorrido del producto; la primera ejecución sobre datos fuera de cobertura no se utilizó para acreditar el editor.

## Esperados independientes

| Caso | Esperado escrito antes de evaluar la implementación |
|---|---|
| Inicio Azul | $4, cinco manos, tres descartes, mano de ocho, cinco huecos, 52 cartas, selección de pequeña ante1/300. [L03](../barajas-l03.md) y [ciclo inspeccionado](../ciclo-partida-1.0.1o.md). Jefe, tag y tienda desconocidos |
| Otras plantillas | Amarilla $14; Negra tres manos/seis huecos; Abandonada 40 cartas sin figuras; Plasma objetivo600; Errática sin rangos/palos generados |
| Recorrido | Pequeña → grande → jefe → pequeña del ante siguiente, únicamente tras resultado y cobro confirmados. No se infiere stock ni jefe nuevo |
| Resultado | Victoria no final → cobro con dinero pendiente; derrota explícita → fin sin premio; jefe ante8 ganado → fin del objetivo sin tienda posterior |
| Saldo | `collect_cashout.money=36` produce saldo36; `-3` sigue siendo−3. Son observaciones de entrada, no resultados de una fórmula de interés |
| Compra integrada | Nueva Azul → ronda → saldo observado25 → oferta Joker2 → compra: `$25−$2=$23`, mismo instanceId al salir y recargar. Seis revisiones/entradas, una por evento confirmado |
| Datos dinámicos | Green tras una mano y un descarte queda desconocido sin orden observado. No usar `0+1−1` como verdad. Objetivos renovados, Campfire, Egg/Gift y recursos afectados caducan sin valor final |
| Datos que no cambian | Red Card no crece al jugar una ronda; Gros Michel extinguido=true no vuelve a desconocido; salir de tienda no ejecuta nuevamente Perkeo al entrar en ciega |
| Persistencia | Cancelar/consultar no escribe; doble pulsación no duplica; fallo de cuota conserva archivo anterior; revisión antigua se rechaza; una pestaña escritora; undo añade una revisión y conserva historia |

Los esperados de estructura y almacenamiento son contratos de software. Los de reglas reutilizan evidencia primaria estática documentada; pasar estos tests no los convierte en observaciones directas del juego ni prueba la eficacia de la política.

## Reproducción

```powershell
npm.cmd run check
npm.cmd run demo:run-progress
npm.cmd run test:run-progress
$env:BROWSER_CHANNEL='chrome'
npm.cmd run test:web
npm.cmd run test:shop-session
npm.cmd run test:run-migration
npm.cmd run test:site
```

Ejecutar el navegador después de terminar la compilación; no reescribir `dist` durante su prueba. El workflow de Pages incorpora el recorrido después del build y antes de publicar. Informes JSON/capturas quedan locales e ignorados por Git; este resumen y las herramientas sí son reproducibles desde el repositorio público. El recibo público posterior al despliegue se conserva en `deployment.json`, sin inferir publicación a partir del build local.

## Alcance pendiente

La conciliación de inventario es conservadora: un parche de progreso no declara intactos los grupos omitidos; OBS01 debe permitir corregir solo lo afectado y pedir valores por dependencia. Los vales/comodines compatibles pueden seguir consultándose, pero no se confirma compra/apertura de vales y sobres con este flujo. TAG01 debe conectar saltos y sus efectos; DEC00/DEC01/SURV01 mejorarán la comparación contextual. No se añadieron simulación, nuevas dificultades ni una estimación de victoria.
