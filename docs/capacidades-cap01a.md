# Capacidades por operación — CAP01a

Entrega del 16 de octubre de 2026. El catálogo, los perfiles estratégicos y el motor son capas distintas. Mostrar una ilustración o disponer de una valoración no certifica todas las interacciones del elemento.

`catalogCapabilities(kind, id)` describe cinco operaciones para una identidad canónica. `listCatalogCapabilities()` cubre las 212 identidades existentes: 150 comodines, 32 vales, 15 sobres y 15 barajas. No modifica el catálogo ni aumenta el número de efectos implementados. Desconocidos devuelven `null`; no se sustituyen por Joker/Azul.

| Operación | Significado | Límites de la ruta actual |
| --- | --- | --- |
| `show` | Identidad y descripción catalogadas | Disponible para las 212; no es evidencia del comportamiento |
| `rate` | Ruta hacia valoración editorial contextual | Condicional a los datos y soporte del valorador; no son puntos ni probabilidad |
| `score` | Ruta hacia H2 para un caso concreto | Condicional para comodines y las barajas/vales integrados; una ejecución debe comprobar el caso. Un sobre cerrado no tiene una mano definida |
| `apply` | Compra/venta/reemplazo de tienda en H2 | Condicional para comodines y compra de los diez vales compatibles de SHOP02a; los demás 22 y apertura de sobres no están integrados. No describe todos los eventos internos del motor |
| `confirm` | Registro de esa transacción con T09b | Condicional para comodines y los diez vales de SHOP02a; requiere H2, revisión, confirmación humana y guardado. Transcribir posesión no equivale a confirmar una compra |

Estados de esta matriz: `available`, `conditional`, `unimplemented`, `not_applicable`. **Conditional significa que existe una ruta de comprobación, no que todos los efectos del elemento estén implementados.** No se utiliza esta matriz para omitir validaciones de H2 ni para promocionar reglas. La cobertura de cada solicitud procede del resultado real descrito en [DEC00](contrato-decision-dec00.md).

Los descriptores reutilizan `ALL_JOKER_FACTS`, `FIT_PROFILES`, los catálogos de vales/sobres/barajas, `supportsVoucher` y `deckDefinition`. Se conservan sus fuentes documentadas: [comodines CAT04](comodines-cat04.md), [vales](vales.md), [barajas](barajas-condiciones.md) y [tienda](evidencia/tienda-investigacion.md). No hay investigación nueva ni observación directa en una partida en esta entrega.

La evidencia dinámica se conserva con los IDs, estados y fuentes que H2 ya devuelve. La inspección del ejecutable no se etiqueta como observación de juego. El modo estricto continúa exigiendo `runtime.confirmation` y puede abstenerse aunque exista un perfil heurístico.

Esta entrega cierra la matriz de **rutas** y su comprobación por solicitud de tienda. CAP01b conserva la ampliación y certificación por familia/interacción. Los antiguos indicadores `engineId` de la colección no se reinterpretan como soporte universal ni cambian silenciosamente sus cifras. La eficacia estratégica y las diez verificaciones manuales siguen pendientes.

SHOP02a: `apply` y `confirm` son condicionales también para los diez vales compatibles. DEC00 expone `voucherActions` independientes; esto no los incluye en la búsqueda/ranking H3. [Contrato y evidencia](compras-vales-shop02a.md).
