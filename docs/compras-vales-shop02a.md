# SHOP02a — compras registradas de diez vales

Entrega del 17 de octubre de 2026. La tienda puede guardar ofertas observadas de vales y registrar la compra real de los diez vales cuyos efectos persistentes ya admite H2. La consulta muestra su legalidad, saldo y consecuencias mediante DEC00; la adquisición requiere una confirmación independiente en T09b. Se conserva el contrato PC/Steam, 1.0.1o-FULL, sin mods, White Stake y barajas compatibles. Las reglas continúan provisionales: la inspección del ejecutable y las pruebas del asesor no son observaciones de una partida.

## Uso y alcance

1. En una partida de formato 0.2 y fase de tienda, registra el vale que ves y su precio real. El precio de catálogo $10 es una referencia editable; registrar la oferta no paga ni adquiere nada.
2. Consulta la decisión de tienda. Cada vale tiene una prueba propia en `voucherActions`, con limitaciones, datos pendientes, saldo y consecuencias. Una oferta temporal que no coincida con la guardada necesita registrarse primero.
3. Usa **Compré** solo después de adquirir ese vale en Balatro y confirma la acción realizada. La aplicación registra lo ocurrido; no controla el juego.
4. Una confirmación aceptada descuenta el precio, añade el vale adquirido, cambia el recurso pertinente y consume esa oferta. Recargar conserva el resultado. **Deshacer** corrige el registro del asesor y recupera el estado anterior, incluida la oferta; no deshace la compra en Balatro.

El panel **Tus vales** sigue permitiendo transcribir vales ya adquiridos. Marcar uno allí no constituye una compra, no consume una oferta ni descuenta dinero. Las ofertas de sobres y otras cartas permanecen como consultas temporales; abrir un sobre, elegir su contenido y resolver sus efectos requiere otra entrega.

| Vales comprables | Requisito de la mejora | Cambio por compra |
|---|---|---|
| Grabber / Nacho Tong | Grabber | +1 mano por ronda cada uno |
| Wasteful / Recyclomancy | Wasteful | +1 descarte por ronda cada uno |
| Paint Brush / Palette | Paint Brush | +1 tamaño de mano cada uno |
| Blank / Antimatter | Blank | Blank no cambia recursos; Antimatter añade un espacio de comodín |
| Seed Money / Money Tree | Seed Money | Tope de ingreso por interés $10 / $20 |

El precio observado debe ser conocido y exactamente $10. Un precio distinto se conserva como observación, pero la compra queda fuera de cobertura; no se sustituye para hacerla pasar. Los otros 22 vales, descuentos, inflación y modificadores incompatibles no se habilitan por poder transcribir su nombre. Los requisitos deben estar adquiridos; una oferta de mejora no los concede implícitamente.

Credit Card permite financiar el precio hasta el límite físico compatible de deuda: una instancia permite terminar en −$20. Blueprint no añade crédito. Tener llenos los espacios de comodín no bloquea comprar un vale; Antimatter aumenta la capacidad sin añadir un comodín. Comprar Blank no concede un espacio ni una oferta de Antimatter. Los desbloqueos del perfil no se simulan: se parte de una oferta realmente observada.

La compra ordinaria rechaza un vale ya adquirido. Esta es una restricción del primer lote: el ejecutable puede ofrecer Blank de nuevo como reserva cuando se agota todo el catálogo. Esa situación, que requiere contenido ajeno a los diez vales integrados, queda fuera de cobertura; no se afirma que Balatro prohíba toda repetición de Blank.

## Estado 0.2 y compatibilidad histórica

`observed.shop.value.voucherOffers` es opcional en `GameStateV02`. Cada oferta contiene `offerId`, `catalogId` y `price: Fact<number entero ≥ 0>`. Se conservan identidad y precio desconocido; la validación estructural admite identidades todavía no soportadas sin atribuirles reglas. Los IDs de ofertas son únicos dentro de la tienda, también frente a `cardOffers`.

Una observación de tienda guarda ofertas sin cambiar dinero, vales adquiridos ni recursos. Omitir `voucherOffers` al actualizar la misma tienda conserva sus ofertas anteriores; pasar `[]` las elimina. Una tienda con otro `shopId` no hereda vales omitidos de la anterior. Una compra elimina únicamente la oferta elegida, conserva las demás ofertas y no genera la siguiente. El guardado de vales conserva las ofertas de cartas incluso si falla el recurso visual del catálogo de comodines; sus catálogos y rutas de carga son independientes. La lista ausente no inventa disponibilidad ni precio.

El formato 0.1 y `confirmed-1` permanecen congelados: no aceptan el campo ni la acción nueva. Leer, importar o consultar una copia antigua no la convierte. La [migración explícita](fases-y-migracion.md) transforma todos los snapshots a 0.2/`confirmed-2`, conserva el historial y permite recuperar el respaldo original exacto. Solo después pueden registrarse ofertas y compras de vales. No se reproducen compras antiguas para recalcular recursos.

## Transacción, recursos y consulta

`VoucherPurchaseAction = {type: 'buy_voucher', offerId}` se ejecuta mediante `applyVoucherPurchase`. T09b la admite en el registro actual con revisión esperada, vínculo de análisis vigente, ID de confirmación único y consentimiento de la acción real. La unión histórica `ShopAction` de comodines y sus candidatos H3 conservan su contrato. No se inserta una compra de vale en una alternativa antigua ni se copian proyecciones de escenarios al registro.

La validación de recursos sigue las dependencias de cada efecto:

- Grabber/Nacho Tong necesitan el total previo coherente de manos; Wasteful/Recyclomancy, el de descartes; Paint Brush/Palette, el tamaño de mano. Se conservan efectos físicos compatibles de comodines y ediciones. Un total previo incompatible produce un error; comprar no lo repara.
- Un contador de tamaño de Turtle Bean desconocido limita la compra que cambia tamaño de mano. No obliga a completar ese contador para comprar manos o descartes.
- Antimatter necesita capacidad previa conocida y coherente, incluidos comodines Negativos; incrementa ese total una vez. No necesita completar datos ajenos de puntuación o tamaño de mano.
- Blank y los dos vales de interés no cambian recursos de ronda. Con saldo suficiente pueden conservar inventario y capacidad desconocidos. Una compra que termina en deuda necesita inventario conocido para demostrar crédito. Los huecos ocupados/libres se devuelven como desconocidos cuando faltan sus dependencias.

Seed Money/Money Tree solo modifican el tope usado en un cobro posterior. Comprar con $60 Seed Money deja $50, sin ingreso inmediato; el interés posterior compatible puede llegar a $10. Con Seed Money adquirido, comprar Money Tree con $110 deja $100 y permite un tope posterior de $20. Verde sigue sin cobrar interés. No se adelanta dinero del siguiente cobro.

DEC00 añade `voucherActions` como pruebas independientes desde el mismo estado inicial. Compara la identidad y precio de la oferta consultada con la oferta guardada y llama al motor de compra; una discrepancia produce `unrecorded_offer`. Un resultado puede ser provisional, faltar datos, ser ilegal o quedar fuera de cobertura. `explicit_confirmation_required` indica que la operación todavía necesita la confirmación real y las comprobaciones de almacenamiento; no es una compra ejecutada.

Estas pruebas no forman un ranking H3 de vales. Los escenarios H3 conservan sus alternativas de comodines; los ejes contextuales continúan siendo heurísticos. El informe puede consultar legalidad de un vale y puntuar una mano de manera independiente, sin inventar robos ni afirmar supervivencia o probabilidad de victoria. Cambiar estado, oferta o precio invalida el informe anterior.

## Guardado y errores

T09b escribe estado e historial juntos. La compra aumenta una revisión y conserva fase y datos ajenos al efecto. El recibo opcional puede contrastar también vales adquiridos y ofertas de vales restantes; los campos históricos de saldo, comodines y ofertas de cartas siguen admitidos.

Una falta de consentimiento, precio desconocido, requisito ausente, compra repetida, revisión antigua, ID duplicado, contradicción del recibo o fallo de cuota no sustituye la copia anterior. Deshacer y recargar usan el mismo registro persistente. Si falla una escritura al observar, comprar o deshacer, se conserva el documento completo anterior y se informa del error; reintentar una operación que no se guardó no consume su ID. Siguen vigentes el control de una pestaña escritora y los límites de tamaño de T09b.

## Evidencia y reproducción

La regla `vouchers.purchase` usa L06/L10 como fuentes locales provisionales; los efectos conservan `vouchers.resources` y `vouchers.interest`, y el crédito usa su evidencia económica cuando corresponde. `requireObserved:true` mantiene la abstención por evidencia de partida pendiente. Las referencias de líneas, huellas y casos mínimos están en [evidencia de SHOP02a](evidencia/voucher-shop/README.md).

```powershell
npm.cmd run demo:vouchers
npm.cmd run check
npm.cmd run test:voucher-shop
```

Resultado de validación de la entrega: **722 pruebas aprobadas, 0 fallos y 10 TODO de contraste manual**. La demo usa un registro sintético; las suites verifican reglas documentales, inmutabilidad, persistencia e interfaz. No acreditan resultados observados en Balatro ni eficacia estratégica.

Siguiente entrega posible: sobres observados Buffoon/Celestial con contenido y elecciones explícitos, o ampliar la confirmación a los 22 vales restantes junto con sus reglas. Monte Carlo no forma parte de esta continuación.
