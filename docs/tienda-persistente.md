# SHOP03a — tienda y acciones registradas

Entrega del 16 de octubre de 2026. Primer corte de la [hoja de ruta](hoja-de-ruta-asesor.md): comodines ofertados, compra/venta/reemplazo confirmados, guardado y deshacer desde Mesa. No cambia la política estratégica ni incorpora saltos, simulación o nuevas reglas.

## Uso

1. Configura una partida compatible o importa su copia. Si todavía no hay registro, la primera oferta puede registrar la transcripción actual después de confirmar el perfil compatible; no asume una versión desconocida.
2. Busca el comodín y pulsa **Poner en tienda**. Se guarda una observación de la oferta, con precio de catálogo como referencia editable. No se paga ni se adquiere.
3. Pulsa la oferta para completar el precio real o la edición. El cambio se guarda al terminar la edición, no en cada tecla. Un precio desconocido conserva esa incertidumbre. Elegir qué venderías es una hipótesis y no se guarda como venta.
4. Consulta el consejo o los cálculos. Consultar no modifica saldo, inventario, revisión ni historial.
5. Si realmente compraste, pulsa **Compré** y confirma la acción realizada. Para reemplazar, selecciona el vendedor y confirma **Vendí y compré** solo si hiciste ambas operaciones. Para registrar únicamente la venta, abre el comodín propio y pulsa **Vendí**.
6. Una acción aceptada actualiza el estado y se guarda con su historial. Recargar la web recupera dinero, inventario y ofertas restantes. **Deshacer** en la cabecera de tienda corrige el último registro; no deshace nada dentro de Balatro. El historial queda conservado.

Las ediciones de otros datos de partida siguen siendo una transcripción pendiente de guardar. No se mezclan silenciosamente al comprar: se pide guardarlas o recargar antes de confirmar. El autoguardado general y el avance por ciegas pertenecen a RUN01/OBS01.

## Una fuente de estado

Las ofertas de comodines se conservan en `observed.shop` del mismo registro `confirmed-1` que utiliza H2/H3. Se elimina el segundo editor editable de ofertas avanzadas; ese apartado remite a la tienda de Mesa. Los arrays de la vista son una caché reconstruida desde el registro, no otra partida persistente.

[shop-session.ts](../src/storage/shop-session.ts) adapta observaciones y acciones a H1/T09b. Una observación cambia solo la tienda; una compra/venta usa H2 y una entrada de acción; deshacer usa la corrección existente. No se copian al registro estados finales de escenarios, robos hipotéticos, ingresos proyectados o elecciones de reemplazo no realizadas.

Se conserva el formato actual de los archivos y la clave de almacenamiento. No se necesita migración de guardados para esta entrega. Se corrige la lista de campos de T09b para admitir `jokerContext`, ya válido en H1: una transcripción que lo contiene ya no falla por incluir ese campo. El contenido sigue pasando la validación estructural.

## Consistencia y errores

- Estado e historial se escriben juntos mediante T09b. Una oferta o acción inválida, fallo de cuota o conflicto no reemplaza la copia anterior. La vista revierte una edición de oferta que no se pudo guardar y muestra el error.
- Cada confirmación tiene ID propio y revisión esperada. Un doble clic no duplica la acción; dos compras o ventas distintas siguen siendo posibles. Cambiar ofertas invalida los análisis anteriores.
- Web Locks mantiene una pestaña escritora por origen. Las demás pueden consultar; adquirir el control permite continuar registrando. Sin esa capacidad se mantiene lectura.
- Un reemplazo valida venta y compra completas antes de guardar. Si solo se realizó la venta, se registra por separado. Una discrepancia con el saldo observado puede corregirse explícitamente desde Registro.
- Las ofertas y datos desconocidos no se transforman en propiedades base para poder comprar. Las observaciones no representables se conservan; limpiar ofertas visibles no borra datos incompatibles ocultos.

## Cobertura y límites

La transcripción admite los 150 IDs de catálogo, pero una transacción necesita las reglas y datos que H2 soporte. No se habilita un efecto por tener ilustración. Se conservan las limitaciones de precios, modificadores y resultados necesarios: no se sustituye el precio visto por uno que haga pasar el motor.

La vista admite hasta cuatro ofertas de comodín, mientras H2 conserva el límite de dos ofertas para comprar en este alcance. Más ofertas observadas pueden guardarse y valorarse contextualmente; una compra exacta devuelve su límite de cobertura. Ampliarlo con los modificadores pertinentes es otra entrega.

Vales, sobres y otras cartas de la tienda siguen siendo consultas de sesión; su compra/apertura/elección no está conectada a confirmaciones. Se indica en la interfaz. Los vales ya transcritos como adquiridos mantienen su comportamiento previo. No se ofrece una ruta de acción completa de toda la partida todavía.

## Reproducción

```powershell
npm.cmd run demo:shop-session
npm.cmd run check
npm.cmd run test:shop-session
npm.cmd run test:shop
npm.cmd run test:sale
npm.cmd run test:web
npm.cmd run test:site
```

La demo usa almacenamiento en memoria: observa una oferta, consulta sin escribir, confirma `$25 − $2 = $23`, recupera el registro, rechaza revisión antigua/ID duplicado y deshace hasta $25. No lee ni modifica la partida del navegador.

Los [resultados y oráculos](evidencia/shop-session/README.md) distinguen integración de software, reglas respaldadas por fuentes y observaciones del juego. Esta entrega no acredita una nueva partida jugada ni valida la eficacia estratégica.
