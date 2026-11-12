# Precios de tienda

Implementación revisada el 12 de noviembre de 2026 contra el código local de Steam 1.0.1o-FULL. Es inspección estática, con pruebas sintéticas; no acredita una partida observada.

`Card:set_cost` (`card.lua`, líneas 369–383) determina el precio así:

```
max(1, floor((base + edición + 0.5) × (100 − descuento) / 100))
```

Las ediciones añaden $2 (laminada), $3 (holográfica) o $5 (polícroma y negativa). Clearance Sale aplica 25%; Liquidation sustituye ese porcentaje por 50%. No se suman ambos descuentos. Por ejemplo, una Carta roja de $5 cuesta $4 con Clearance y $2 con Liquidation.

Astrónomo deja gratis los planetas y sobres Celestial. Alquiler fija después el coste en $1. Eterno y Perecedero no cambian el precio inicial. La venta se calcula antes de aplicar el cupón: `max(1, floor(coste / 2)) + extraSell`. Una Carta roja gratis por etiqueta conserva su venta de $2 sin descuentos.

`Tag:apply_to_run` (`tag.lua`) marca `ability.couponed` para las ofertas de rareza/edición y para Cupón. El cupón afecta las cartas iniciales y los sobres de la tienda, sin incluir vales ni cartas creadas por renovación. Cada oferta conserva su marca individual; renovar no vuelve de pago los sobres gratis que siguen presentes. Doble duplica la siguiente etiqueta distinta de Doble. Dos cupones pendientes se consumen en tiendas sucesivas.

La aplicación registra la cola del salto confirmado. Las etiquetas de rareza/edición se asignan a la primera oferta registrada que cumple esa condición y se consumen junto con ella, en la misma escritura. Abrir una ficha o consultar un consejo no consume etiquetas. Al corregir la transcripción conviene respetar el orden visible de las ofertas. No se genera contenido aleatorio de la tienda.

Compra, venta, consejos y ficha visual comparten el cálculo. Comprar un vale de descuento o adquirir/vender Astrónomo actualiza los artículos afectados. Los valores adicionales de Egg/Gift Card se conservan aparte del coste base.

El stake no añade un sobreprecio directo; las pegatinas observadas determinan sus efectos de precio. La ejecución general de compras mantiene el alcance White que ya tenía el motor. Reglas de retos, inflación o modificadores no representados dejan el precio desconocido. La ficha muestra `$—` cuando faltan datos necesarios.

Pruebas: `tests/shop-pricing.test.ts`, `tests/shop-price-tags.test.ts` y `tools/game-shop-test.mjs`. Se comprueban redondeo, precedencia de modificadores, compra, persistencia, cola, deshacer y la ficha sobre la tienda en distintos tamaños.
