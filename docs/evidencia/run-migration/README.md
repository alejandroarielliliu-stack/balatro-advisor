# Verificación RUN01a

16 de octubre de 2026. Pruebas de estructura, conversión y persistencia sobre estados sintéticos. No son observaciones de Balatro ni evaluación de eficacia estratégica. [Contrato y uso](../../fases-y-migracion.md).

## Resultados

- `npm.cmd run check`: **569 aprobadas, 0 fallos, 10 TODO manuales**. RUN01a incorpora 33 casos nuevos: 11 de fases, 15 de historial/persistencia y 7 de integración del motor.
- `npm.cmd run demo:run-migration`: copia antigua con compra registrada, migración, respaldo exacto, recarga, rechazo de análisis antiguo, deshacer y recuperación de la copia antigua.
- `tools/run-migration-test.mjs`: **13 grupos aprobados** en Chrome con perfiles temporales, incluido el lector histórico opcional. Sin él se ejecutan 12 grupos; no se presenta el validador congelado como prueba de la aplicación antigua completa.
- Regresión: **17 grupos de navegador**, **14 de tienda persistente** y **8 de artefacto estático** aprobados. El artefacto se sirve bajo `/balatro-advisor/`, sin depender de rutas en la raíz del dominio.

La revisión visual inspeccionó capturas a 1440 px y 390 px, incluida la ventana visible del diálogo a 390 × 844: texto y botones accesibles, sin desborde de documento en los casos comprobados. Sin errores JavaScript ni solicitudes fallidas en la ejecución final. Android físico sigue aplazado por el usuario.

Una ejecución intermedia de navegador falló al recargar mientras se recompilaba `dist` en paralelo. Se repitió después de terminar la compilación y pasó; las comprobaciones de navegador deben ejecutarse sobre un build estable. El workflow compila antes de arrancarlas.

## Referencias y oráculos

| Comprobación | Esperado independiente |
|---|---|
| Fases | Objetos literales de las siete variantes; rechazo de datos de otra fase, campos extra, referencias contradictorias y cartas inexistentes |
| Migración del historial | Cadena literal compra → reemplazo → corrección → undo, revisiones `0→1→3→4→5`; cada snapshot conserva hechos, hipótesis, fecha e identidad |
| Borrador antiguo | `draft→unknown`, con motivo explícito; no se deduce selección, victoria, derrota, cobro o tienda |
| Respaldo | Igualdad exacta con el JSON original, incluyendo indentación y salto final; escrito antes del reemplazo activo único |
| Consejos antiguos | El binding de 0.1 se rechaza tras migrar aunque la revisión numérica siga igual |
| Compatibilidad | Leer, importar o confirmar una compra legacy no convierte el formato silenciosamente |
| Persistencia | Fallo de respaldo no toca el activo; fallo del activo conserva legado y respaldo; conflicto entre vista previa/respaldo/escritura no pisa otra versión |
| V2 en tienda | `$25−$2=$23`, inventario +1 y oferta −1; undo vuelve a $25. Reemplazo: `$25+$1−$5=$21`, dos revisiones, una escritura de estado/historial |
| H2/T07b | Literales documentales `52→572` y `80/240/572`, finalización temprana y Green; se reutilizan los oráculos existentes, no se obtienen ejecutando la migración |
| Horizonte | `2552` puntos y economía `$37→$50` / `$33→$50` en el fixture heredado; la paridad V1/V2 se etiqueta como consistencia de software |

Los oráculos de reglas conservan su evidencia anterior: [H2](../h2-oraculos.md), [T07b](../t07b-oraculos.md) y [horizontes](../../horizontes-t08c.md). La migración no eleva una regla provisional a confirmada. `requireObserved:true` sigue limitando solo sus dependencias.

## Lector histórico

Antes de modificar/compilar esta entrega se conservó una copia compilada del commit `73554d73d930eda1becd5178b4d67ed31cafead1`, externa al repositorio. Se ejecutaron sus funciones `load`, `initialize` y `confirm` contra un documento `confirmed-2`: rechazo y **cero escrituras**. La herramienta fija estos SHA-256:

| Módulo compilado antiguo | SHA-256 |
|---|---|
| `storage/confirmed-store.js` | `601c993525725dadd147ac60eedff3f4e6d06a3c53f88ce8917e6f59a776c855` |
| `state/model.js` | `734efb9c871bf3d58244429437e53b2ed425a26519659e9359026669060d5417` |
| `state/validation.js` | `26f66a36a5e27fac159997b9c3545698a48b147c07245ca7219f0aa693dbc7c8` |

La reproducción opcional requiere compilar ese commit en una carpeta independiente y apuntar `LEGACY_READER_PATH` a sus módulos `dist/src`, con su ámbito ESM. No debe sustituirse `dist` de la aplicación actual durante una prueba. Ejecución local realizada:

```powershell
$env:LEGACY_READER_PATH="$env:TEMP\balatro-run01-legacy-reader-73554d7\src"
npm.cmd run test:run-migration
```

Los JSON de informes y capturas generados quedan locales e ignorados por Git; el código de pruebas y este informe quedan publicados. La comprobación pública posterior al despliegue se registra en `deployment.json` local; no se infiere de una compilación local.

## Límites de cierre

RUN01a cierra la base de datos versionada y su migración recuperable. Las fases nuevas se pueden validar/guardar/importar; salvo tienda, la web todavía las conserva en lectura. RUN01b debe conectar transiciones confirmadas, resultados reales y continuación. No existe todavía una acción de jugar/saltar, apertura confirmada de sobres ni avance automático por haber superado un escenario hipotético.
