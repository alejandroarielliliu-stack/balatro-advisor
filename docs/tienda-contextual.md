# Tienda de la Mesa — primera entrega

Implementación2026-10-14. Sustituye Candidatos por la transcripción de una tienda, con ofertas de comodines, vales, sobres y otras cartas visibles. Reutiliza los perfiles, composición y H2; consultar no compra ni guarda nada. Se mantiene separado el cálculo exacto por manos y el registro confirmado.

## Plan aplicado y alcance

1. Investigar tipos/tamaños de sobres, requisitos de vales y renovación en el ejecutable identificado: [SHOP01–08](evidencia/tienda-investigacion.md). Distinguir inspección de observación en partida.
2. Crear una instantánea independiente del formato guardado: ofertas con identidad propia, propiedades y precio visto. Un precio desconocido no es gratis; dos ofertas del mismo comodín pueden ser distintas.
3. Reutilizar el encaje contextual conservando precio, edición y stickers. Separar saldo aritmético, asequibilidad y transacción admitida por H2. Corregir los precios Holo/Policroma detectados en la inspección.
4. Añadir una política visible para comprar, ahorrar, reemplazar, considerar vales y valorar oportunidades de sobres. Admitir empates o abstención sin inventar una escala común de dinero y puntos. La API también conserva la evaluación limitada del coste de renovación.
5. Mostrar una tienda con la disposición visual de Balatro, ilustraciones reales, precio editable y consejo al pulsarlo; verificar escritorio, móvil emulado y conservación del registro. Por indicación del usuario, no mostrar Renovar, Actualizar ni Siguiente ronda.

Se comparan ahorrar, cada compra registrada, los reemplazos seleccionados venta→compra y cada vale/sobre. **No es búsqueda exhaustiva:** faltan varias compras, varios vendedores, órdenes completos, contenido después de abrir, ofertas después de renovar y estrategias de ronda adaptadas. No se afirma superar la ciega ni llegar al ante8 con estos índices.

## Flujo de interfaz

- Desde una ficha de comodín, **Poner en tienda** registra una oferta y su precio de referencia. Pulsar la oferta permite transcribir el precio real, edición y qué comodín venderías; los precios de referencia requieren revisión si el juego los modifica. Hasta cuatro comodines en una fila; los duplicados tienen IDs diferentes.
- **＋Vale** selecciona entre los32; **＋Sobre** entre15 familias/tamaños con sus imágenes, número de cartas y elecciones. Precios editables; estos objetos no se añaden a los inventarios adquiridos.
- **＋Otra carta** registra nombre/tipo/precio de Tarot, planeta, espectral o carta de juego. Su efecto no se infiere del nombre: puede impedir una conclusión mientras falte integrarlo.
- **Vaciar ofertas** limpia únicamente esta transcripción, sin gastar ni tocar la partida. No hay controles de Renovar, Actualizar ni Siguiente ronda. La API mantiene `rerollCost` para otros consumidores, pero esta interfaz lo deja desconocido y omite esa opción del detalle.
- El consejo se actualiza al cambiar partida u ofertas; pulsarlo muestra opciones, saldos, motivos y cobertura. Cambiar una oferta invalida los puntos de manos anteriores. Enter en los precios no envía el formulario de guardado.

Antes de transcribir una oferta, el botón de consejo está desactivado: una tienda todavía vacía en el formulario no demuestra que ahorrar sea la mejor acción en el juego.

La instantánea de tienda es de la sesión y se descarta al recargar. No se convierte en `observed.shop`, en inventario adquirido ni en historial. La importación de un guardado H1/T09b conserva su formato y los datos de su tienda registrada; estos últimos siguen en el flujo avanzado. La unificación persistente requiere una ampliación explícita posterior, sin insertar claves silenciosamente en0.1.

## Disposición visual

La [captura de tienda ya registrada](evidencia/t11/balatro-tienda-27-2026-10-10.png) y el [press kit oficial](https://www.playbalatro.com/press-kit/) sirven de referencia: marco rojo sobre pizarra, controles a la izquierda, cartas arriba, vale abajo a la izquierda y sobres juntos abajo a la derecha. Los precios usan pestañas oscuras con cifras amarillas encima del arte. Los dos controles grandes son acciones reales del asesor: **Buscar comodín** y abrir el consejo; no se copian acciones del juego que la aplicación no ejecuta. Las fichas abren sus editores al pulsarlas; las bandejas conservan huecos para transcribir una oferta. Las cuatro ofertas de comodín admitidas siguen en una fila con desplazamiento interno si hace falta. En móvil los controles pasan arriba y se mantiene la relación vale/sobres.

## Estado y contrato

[storefront.ts](../src/ui/storefront.ts) recoge datos; [shop-context.ts](../src/advisor/shop-context.ts) valida y evalúa `ShopSnapshot` de forma pura. Campos:

| Campo | Tipo / significado |
|---|---|
| `id` | Identificador no vacío de instantánea |
| `jokers` | Ofertas con `offerId`, `catalogId`, `price`, `edition`, `stickers` y `replacementId` opcional |
| `vouchers` | Ofertas con ID propio, ID de catálogo y precio |
| `packs` | Ofertas con ID propio, familia, tamaño y precio; contenido cerrado desconocido |
| `others` | Opcional; tipo, nombre manual y precio sin identidad mecánica inferida |
| `rerollCost` | Entero no negativo o `null` si falta |

Todos los precios son enteros no negativos o `null`; IDs únicos entre todas las áreas, sin utilizar los reservados `hold`/`reroll`. Se rechazan campos/tipos inválidos según los validadores existentes. Las referencias de catálogo desconocidas conservan limitación; no reciben un efecto fabricado.

Ejemplo sintético:

```json
{
  "id":"tienda-ante2",
  "jokers":[{"offerId":"c1","catalogId":"joker","price":2,"edition":"base","stickers":[]}],
  "vouchers":[{"offerId":"v1","catalogId":"v_paint_brush","price":10}],
  "packs":[{"offerId":"p1","family":"arcana","size":"normal","price":4}],
  "rerollCost":5
}
```

La salida conserva opciones con precio, saldo posterior, asequibilidad, cobertura, motivos y limitaciones; encaje de comodines y recursos proyectados cuando corresponda. `resourceChanges` contiene **totales proyectados**, no deltas ni adquisiciones. Recomendación `conditional`, `tie` o `abstain`, IDs vinculados a sus ofertas y `exhaustive:false`. Una abstención no resalta como recomendada la oferta desconocida que causó la limitación.

## Política de esta entrega

Se considera una compra cuando es financiable, hay espacio, su condición está preparada o tiene soporte potencial, y su encaje alcanza la referencia editorial70 de quick-fit-2. Debe cubrir un rol sin soporte actual o una relación específica apoyada por el material registrado. La referencia es de la política existente, no un umbral de victoria. Un comodín sin Acero, reyes u otro material necesario no obtiene apoyo solo por su nombre.

Los reemplazos usan el valor de venta, stickers y capacidad reales transcritos. No heredan contadores; se protege conservadoramente el desarrollo existente o desconocido mientras no se haya demostrado compensarlo. Se muestran pérdidas de mecanismos ligados al dinero como Bull/Bootstraps. Faltan calibración, comparación profunda de magnitudes y dominancia entre composiciones: dos compras pertinentes pueden empatar aunque tengan costes diferentes, que permanecen visibles.

El asesor **no ordena por la diferencia del índice global**, cuyo denominador puede cambiar. Tampoco suma dólares, fichas y contadores. Ahorrar es una alternativa explícita cuando no se identifica una mejora preparada. Una oferta manual sin efecto integrado puede producir abstención; un dato pendiente no se convierte en cero.

Los10 vales integrados proyectan recursos o tope de interés desde el estado actual, respetando requisitos y adquisición previa. No cobran ingresos ni vuelven a aplicar un vale poseído. Ejemplo: Seed gratis con saldo26 no mejora el interés base actual (`suelo(26/5)=5`); empieza a aprovechar el tope desde30. MoneyTree con Seed comienza desde55. Son condiciones sobre el saldo posterior explícito, no predicciones de cobro.

Los otros22 vales conservan descripción/contexto y límite de integración. Los sobres valoran coste y oportunidades de categoría: material para retención, uso de Tarot/planetas, búsqueda de roles o crecimiento mediante añadir cartas, con conflictos como Erosión. El contenido cerrado permanece desconocido: **no hay una mejora exacta, rentabilidad esperada, carta garantizada ni porcentaje**. Renovar compra información desconocida y no promete una oferta mejor.

## Cobertura mecánica y evidencia

La compra real de vales/sobres y los resultados de abrir, elegir, usar u omitir **no se aplican** en esta entrega. La UI es una transcripción y comparación; confirmar acciones sigue utilizando las operaciones admitidas de H2/T09b. Precio observado con descuento puede permitir calcular saldo sin que H2 admita su transición: se muestra como cobertura limitada, no como compra ilegal por el mero descuento.

La API conserva `requireObserved:true`: una compra con evidencia H2 pendiente o una proyección de vale L06 no observada no se recomienda bajo ese modo. La abstención mantiene visibles los costes aritméticos, el encaje descriptivo y los límites de sobres; no transforma una inspección del ejecutable en una observación en juego. La interfaz usa el modo provisional, indicado en el detalle.

La evaluación H2 de un comodín usa la oferta aislada y sus propiedades. Más de dos cartas visibles degradan la cobertura de la tienda ampliada; no certifican sus modificadores. El cálculo de manos también conserva el precio/edición de la oferta en vez de reemplazarlos por Base; si son incompatibles, conserva error y ausencia de puntos del candidato, no0ni un resultado al precio antiguo.

Precios corregidos: Foil+2, Holographic+3, Polychrome+5 y Negative+5; venta `suelo(coste/2)+extra` según `card.lua:372–382` de1.0.1o-FULL. [Pruebas independientes](../tests/edition-prices.test.ts). Esto sigue siendo inspección estática, no observación nueva. Guardados con un precio anterior diferente se conservan como datos y requieren revisión explícita; no se migran cambiando hechos conocidos.

## Verificación y continuación

`npm.cmd run check` comprueba núcleo y contratos: 522 pruebas aprobadas, sin fallos y 10 TODO manuales. `npm.cmd run test:shop` ejecuta12 grupos web, con saldos independientes25−1=24 y25−4=21, contenidos desconocidos, requisitos, ausencia de controles ajenos al asesor, cero escrituras, Enter, limpieza y emulación360/390/1440. La renovación sigue probada en la API, sin control web. [Informe y capturas](evidencia/tienda/README.md). Las pruebas validan software/rúbrica; no certifican eficacia estratégica ni una partida en Balatro.

Siguiente entrega: transcribir **el contenido real de un sobre abierto** y sus elecciones restantes, empezando por Buffoon de comodines conocidos y Celestial de planetas. Después conectar compra/apertura/elección a las confirmaciones y a un estado de tienda persistente compatible. No crear Monte Carlo para suplir esas entradas.
