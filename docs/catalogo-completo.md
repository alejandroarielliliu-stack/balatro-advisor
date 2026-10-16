# Colección de comodines — CAT01

2026-10-11. Entregado por petición del usuario: datos e ilustraciones de los **150 comodines vanilla de 1.0.1o-FULL**. No implementa los 142 efectos pendientes, combos ni nuevas sinergias.

## Datos y separación del motor

`web/assets/jokers/catalog.json` contiene 150 registros: 61 comunes, 64 inusuales, 20 raros y 5 legendarios; 105 desbloqueados inicialmente. Campos:

| Campo | Contenido |
| --- | --- |
| `id`, `order` | Clave original `j_*` y orden de colección, 1–150. |
| `names`, `localization` | Español latinoamericano e inglés de la instalación. Descripción de colección, plantilla original, variables resueltas cuando son constantes y plantilla de desbloqueo. |
| `basePrice`, `rarity` | Precio base sin modificaciones y rareza original 1–4. No representan el precio real de una tienda ni una probabilidad. |
| `compatibility` | Flags declarados de Blueprint, Eterno y Perecedero. No implican implementación ni compatibilidad con todas las combinaciones. |
| `config` | Parámetros iniciales originales, conservando nombres y tipos. No son contadores de la partida del usuario. |
| `initiallyUnlocked`, `unlockCondition`, `poolRestrictions` | Disponibilidad inicial, condición de desbloqueo y restricciones explícitas del registro. No afirman que el usuario haya desbloqueado la carta ni sustituyen toda la lógica de aparición del juego. |
| `art` | Celda del atlas y capa adicional cuando corresponde. Holograma y cinco legendarios tienen dos capas. Wee reutiliza la celda de Joker y se presenta más pequeño. |
| `engineId` | Mapeo a los ocho IDs existentes, o `null` para solo catálogo. |
| `evidence`, `observedInGame` | Inspección estática; `false` para observación en partida. |

`src/catalog/initial.ts` sigue siendo la cobertura cerrada del motor. El catálogo de consulta no se utiliza para ampliar acciones legales ni puntuar efectos desconocidos. No cambia el esquema de guardado ni necesita migración. El catálogo se descarga desde el servidor local solamente al abrir Colección; las ilustraciones se sirven localmente, sin solicitudes externas en ejecución.

## Procedencia y reproducción

- Datos y localizaciones: lectura del ejecutable propio instalado, `version.jkr = 1.0.1o-FULL`. Método estático de [L01](evidencia/h2-inspeccion-local.md), sin ejecutar el código Lua ni alterar la instalación.
- Ilustración de internet: [atlas 2x en el espejo Jofr3](https://github.com/Jofr3/balatro-source/blob/f081d0e41508d9dcc7a01cba5bffcccfbb115af1/resources/textures/2x/Jokers.png), commit fijo `f081d0e41508d9dcc7a01cba5bffcccfbb115af1`. Descarga de 612.524 bytes, 1420×3040 píxeles, **idéntica byte por byte** al atlas de la instalación objetivo. El espejo es de terceros, no una fuente oficial.
- `web/assets/jokers/provenance.json`: URLs, commit y SHA-256 de todas las entradas leídas, atlas y catálogo generado.
- Arte y textos pertenecen a LocalThunk / Playstack. Se conserva atribución; la disponibilidad del espejo no constituye una licencia de redistribución. Una futura publicación debe revisar el uso de esos recursos. Esta entrega es local.

Reimportar requiere Python 3, internet y una copia propia de la versión objetivo:

```powershell
python tools/import-jokers.py "C:/Program Files (x86)/Steam/steamapps/common/Balatro/Balatro.exe"
```

El importador analiza tablas literales y un conjunto restringido de expresiones de presentación; no ejecuta Lua. Rechaza otra versión, otro número de cartas o un atlas que no coincida con el instalado. Genera datos, procedencia y posiciones CSS reproducibles. No copia el código fuente del juego al repositorio.

## Textos y límites

Las descripciones resuelven las constantes a partir de `config` y del código de presentación. Omiten las líneas de contadores «Actual/Currently»; los objetivos variables conservan «según partida». Las probabilidades descritas usan el valor normal 1 sin modificadores; no son probabilidades de victoria ni cálculos de una partida concreta.

Se guardan las plantillas originales para auditar la transformación. Dos excepciones editoriales se marcan con `editorialOverride`: Misprint tiene texto original vacío y presenta el intervalo 0–23 de su configuración; la descripción española de Stencil se traduce de su texto inglés porque la plantilla española mezcla el total actual con la frase por espacio. Yorick omite el contador de descartes restantes entre corchetes; Loyalty Card omite su estado de activación actual. La configuración técnica conserva los valores iniciales, pero no debe interpretarse como estado real.

La ilustración conserva las capas del atlas; no reproduce shaders, animaciones, ediciones ni todos los cambios de tamaño del juego. Los flags de compatibilidad y las condiciones son datos estáticos, no pruebas de interacciones ejecutadas. No se cierran T01/H2 ni los 10 casos de observación pendientes.

## Interfaz y comprobaciones

Nueva vista **Colección**: búsqueda bilingüe sin sensibilidad a acentos, filtros por rareza y cobertura, 150 fichas con ilustración, detalle accesible con Escape y propiedades. Mesa y tienda usan las ilustraciones reales de sus ocho comodines compatibles. Consultar, filtrar y abrir detalles conserva intacto el almacenamiento.

```powershell
npm run check
npm run test:catalog
npm run test:web
npm run test:design
```

Resultado: **146 pruebas aprobadas, 0 fallos, 10 TODO de observación**. Cinco pruebas nuevas validan integridad, fixtures estáticos, separación del motor, huellas y búsqueda. Son controles de datos/software, no observaciones en Balatro. En Chrome y Firefox pasan los 17 grupos de flujos existentes, los controles de diseño y la nueva suite de colección. Revisión visual de capturas de colección, detalle legendario, mesa y móvil emulado; anchos 360/390/768/1280/1440 y reflujo existente al 200 %. Evidencia en `docs/evidencia/collection/`, `redesign/` y `t11/`. Android físico continúa aplazado.

Siguiente entrega independiente: seleccionar un lote pequeño de efectos del catálogo, definir fixtures y dependencias, e implementarlos en H2 antes de habilitarlos para análisis. Las sinergias quedan para después, conforme a la petición actual.
