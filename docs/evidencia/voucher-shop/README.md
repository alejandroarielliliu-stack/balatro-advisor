# L10 / SHOP02a — evidencia de compra de vales

17 de octubre de 2026, Panamá. Inspección estática en modo lectura del ZIP incorporado en `C:/Program Files (x86)/Steam/steamapps/common/Balatro/Balatro.exe`. Se leyeron sus entradas en memoria con Python `zipfile`, sin ejecutar Balatro, modificar la instalación ni copiar su código al repositorio. `version.jkr` contiene `1.0.1o-FULL`, `1.0.1o` y `PROD_PC_Console`. Las huellas coinciden con [L01](../h2-inspeccion-local.md).

**Estado de las reglas: provisional, documentado; pendiente contraste en una partida.** La identificación de los bytes está comprobada como lectura de archivo. No prueba que una sesión del usuario ejecutara esos mismos bytes ni sustituye evidencia observada. Las pruebas de software descritas abajo no se registran como partidas de Balatro ni cierran los TODO manuales históricos.

## Casos mínimos y fuentes independientes

Los resultados esperados siguientes se derivaron de las ramas leídas y aritmética literal. No se obtienen llamando al motor del asesor para generar el esperado. «Observado estático» describe código inspeccionado, no un resultado de juego.

| Regla | Caso mínimo | Esperado | Observado estático | Pendiente en partida |
|---|---|---|---|---|
| Precio base | Cada uno de los diez vales sin descuentos ni inflación | Precio $10 | `game.lua:598–624`: las diez entradas declaran coste 10; `card.lua:369–383` aplica modificadores de precio | Ver precio y saldo antes/después de comprar |
| Pago y consumo de oferta | $20, dos ofertas, comprar una por $10 | $10, vale adquirido, desaparece solo esa oferta | `functions/button_callbacks.lua:2209,2248–2252` retira la carta y canjea; `card.lua:1822,1845–1852` registra, cobra y aplica | Capturas de tienda, saldo e inventario de vales |
| Requisito de mejora | Ofrecer Nacho Tong sin Grabber; después con Grabber | Primero sin compra compatible; después puede comprarse si los demás datos son válidos | `game.lua:615–624` declara requisitos; `functions/common_events.lua:1990–1997` filtra por todos los vales adquiridos requeridos | Oferta de mejora vinculada a base adquirida |
| Unicidad ordinaria | Vale adquirido o mismo vale ya ofertado | Excluido del pool ordinario | `functions/common_events.lua:1987–2007` comprueba desbloqueo, adquisición y ofertas presentes | Contrastar disponibilidad ordinaria sin agotar catálogo |
| Reserva Blank | Agotar el catálogo completo | Puede ofrecerse Blank de nuevo; fuera del primer lote | `functions/common_events.lua:2038–2046` devuelve Blank si el pool queda vacío | No ejecutado; requiere ampliar alcance |
| Grabber / Nacho Tong | Azul, 5 manos; comprar base y luego mejora en ofertas observadas distintas | 5→6→7 manos | `card.lua:1936–1939` incrementa manos y actualiza el recurso; `game.lua:598,615` fija +1 | Registrar ambas adquisiciones y total por ronda |
| Wasteful / Recyclomancy | 3 descartes; adquirir base y mejora | 3→4→5 descartes | `card.lua:1943–1946`; parámetros +1 en `game.lua:599,616` | Contrastar totales de las rondas correspondientes |
| Paint Brush / Palette | Tamaño 8; adquirir base y mejora | 8→9→10 | `card.lua:1940–1942` llama a cambio de tamaño +1; `game.lua:607,624` | Contrastar capacidad sin inventar cartas robadas |
| Blank sin espacio | Comprar Blank por $10 con 5 espacios de comodín | Dinero −$10; capacidad sigue en 5 | `card.lua:1947–1948` solo comprueba desbloqueo | Capturar capacidad antes/después |
| Antimatter independiente | Blank adquirido, capacidad 5, comprar Antimatter | Capacidad 6; no aparece un comodín nuevo | `card.lua:1950–1955` suma exactamente 1; no usa `extra=15` como incremento | Capturar compra y hueco adicional |
| Momento de desbloqueo | Décimo uso histórico de Blank en perfil elegible | Se comprueba desbloqueo después de registrar uso; no se adquiere Antimatter automáticamente | `card.lua:1848,1852,1947–1948`; `functions/misc_functions.lua:1232–1240`; umbral 10 en `game.lua:620` y `functions/common_events.lua:1387–1390` | Perfil y sesión elegibles; no simulado por el asesor |
| Seed Money sin dinero inmediato | Saldo $60, comprar por $10 | Saldo $50; tope posterior de interés $10 | `card.lua:1931–1935` fija límite interno 50; `functions/state_events.lua:1191–1202` divide por cinco al cobrar | Compra y cobro posterior por separado |
| Money Tree sin dinero inmediato | Seed adquirido, saldo $110, comprar por $10 | Saldo $100; tope posterior $20 | Mismas ramas, límite interno 100 según `game.lua:619` | Compra y cobro posterior por separado |
| Crédito para vales | Credit Card física, saldo −$10 y vale $10; repetir con −$11 | −$20 permitido; −$21 rechazado | `functions/button_callbacks.lua:96–104` usa dinero menos umbral; `game.lua:388` fija crédito 20 y `card.lua:593–594` reduce el umbral | Contrastar límites y saldo resultante |
| Inventario lleno | Cinco comodines en cinco espacios, comprar Grabber o Antimatter | La compra no exige vender; Antimatter abre sexto espacio | `can_redeem` solo mira dinero; `functions/button_callbacks.lua:2392–2402` excluye Voucher del bloqueo por capacidad | Compra con capacidad llena y sin venta |

La disponibilidad de una mejora combina desbloqueo de perfil y requisito dentro de la partida. El asesor registra una oferta observada y comprueba el requisito de adquisición; no reconstruye el perfil, no convierte diez Blank históricos en diez adquisiciones de la misma partida y no genera una oferta nueva al comprar la base.

Las restricciones del primer lote —precio observado $10, diez IDs integrados, rechazo de duplicados ordinarios y de modificadores incompatibles— delimitan la implementación. No convierten los casos fuera de cobertura, como descuentos o la reserva Blank, en prohibiciones universales del juego.

## Identidad de las fuentes

Solo se publican ubicaciones, conclusiones y hashes, sin redistribuir las fuentes Lua. SHA-256 de los bytes inspeccionados:

| Archivo o entrada | SHA-256 |
|---|---|
| `Balatro.exe` | `0d75fe164accf3312734d4b37ac98788dd15f0b8e4f9bb8b7f90c4e59de93f47` |
| `version.jkr` | `a0525225e93bc81acd291aa4661e6648c8f3591ff34761bb3bee5319a766aaa3` |
| `game.lua` | `bbc67bd3fbadd1ea3f3f0aba07ef8596118d89ff1e9758718f9e17c07a96e912` |
| `card.lua` | `5073d834e08119da9516f1795a8c3d93110669aeb409c29ad1b308e0eb0be453` |
| `functions/button_callbacks.lua` | `c88a74ca3a8fa8ace0ce46ad10a97238f347c292842c9164d11136fe9952c101` |
| `functions/common_events.lua` | `522ea0810101de1004685e13e7ed05a750b4e115e5231dca2cbc97aeb8c3e5fc` |
| `functions/state_events.lua` | `6c86aefb42d0323d737f87aaa84f53e42b755e72cd0bfd163b7d9cca5c0a99a9` |
| `functions/misc_functions.lua` | `c36ed54d8ab441be994a9afc5d38b8ac530f3b93995dfed424ec11f02e633198` |

Para repetir: abrir el ejecutable con `zipfile.ZipFile`, leer `version.jkr` y las entradas indicadas sin extraerlas, calcular `hashlib.sha256` sobre los bytes y consultar las líneas. Si cambia una huella, revisar la aplicabilidad antes de reutilizar estas conclusiones. El catálogo de los diez efectos y sus requisitos también está en [vales](../../vales.md); su metadata no amplía la cobertura.

## Verificación del asesor

Resultado final de entrega: **722 pruebas aprobadas, 0 fallos y 10 TODO de contraste manual**. Diez grupos nuevos de navegador verifican también consulta sin escrituras, cuotas, revisión, dos pestañas, móvil390 y vales independientes del catálogo de comodines. Las suites de tienda existentes se volvieron a ejecutar, incluidos los 12 grupos de `tools/shop-test.mjs` y los 14 de `tools/shop-session-test.mjs`; los números históricos se conservan en sus documentos. Los comandos reproducibles son:

```powershell
npm.cmd run demo:vouchers
npm.cmd run check
npm.cmd run test:voucher-shop
```

| Comprobación | Contrato que verifica |
|---|---|
| `tests/voucher-shop.test.ts` | Diez efectos con totales literales, consumo de una oferta, precio conocido/base, requisitos, repetición, crédito, capacidad llena, Negro/Pintada, recursos por dependencia, desconocidos conservados, inmutabilidad y modo estricto |
| `tests/voucher-store.test.ts` | Ofertas 0.2 recuperables, IDs únicos entre familias, omisión/lista vacía/tienda nueva, T09b, recibos, dos compras, undo/recarga, cuota, revisión y confirmación duplicada, legacy congelado y migración completa explícita |
| DEC00 `voucherActions` | Pruebas independientes por oferta, conciliación exacta con observación persistida, limitaciones y datos pendientes sin adquirir; mantiene alternativas H3 de comodines |
| `test:voucher-shop` | Integración de la tienda: observación persistente, consulta sin escritura, confirmación real, recursos, cancelación, recarga, deshacer y errores de almacenamiento |
| `demo:vouchers` | Recorrido sintético y reproducible de observar, consultar, confirmar y recuperar, con dinero/recursos visibles |

Los esperados de revisión, historial, integridad de bytes, bloqueo por consentimiento y fallo de cuota son contratos del asesor; no son reglas de Balatro. Las proyecciones DEC00 se calculan desde el mismo estado inicial y no escriben. H3 no ordena compras de vales. Los recursos ajenos a la compra pueden seguir desconocidos: no se completan usando cartas, contadores o cobros inventados.

Una compra registrable exige que la persona confirme que ya la realizó en Balatro. T09b vuelve a validar fase, revisión, vínculo, identidad de oferta y resultados; guarda estado e historial juntos. Un fallo conserva la copia anterior. Deshacer modifica el registro, conserva el historial y permite recuperar la oferta anterior sin afirmar una devolución en el juego.

No se ejecutaron nuevos casos en una partida para esta entrega. `vouchers.purchase`, `vouchers.resources` y `vouchers.interest` permanecen provisionales, `verifiedAgainstGame:false` y `requireObserved:true` sigue requiriendo evidencia de ejecución pendiente. Tampoco se acreditan eficacia estratégica, Android físico, apertura de sobres ni probabilidades de ganar.

La continuación puede incorporar sobres observados Buffoon/Celestial o los 22 vales restantes con sus propias reglas y confirmaciones. No se requiere Monte Carlo para cerrar esos contratos.
