# Verificación de SHOP03a

16 de octubre de 2026. Estados sintéticos y perfiles temporales de Chrome. No son observaciones nuevas de Balatro, pruebas físicas de Android ni evidencia de que la política maximice victorias.

## Referencias independientes

- Compra de Joker base: precio $2 según catálogo del alcance; `$25 − $2 = $23`, inventario +1 y oferta −1. Venta base $1; reemplazo con saldo $1: `$1 + $1 − $2 = $0`.
- Venta de Half: `$25 + $2 = $27`. Venta de Joker Negativo: `$7 + $3 = $10`, huecos 6 → 5. Campfire restante X1 → X1.25: [fuente CAT04](../cat04-generation.md). No se obtienen estos esperados ejecutando el motor.
- Revisiones, IDs únicos, archivo recuperado e igualdad byte a byte son contratos de almacenamiento, no reglas estratégicas. Consulta y escenario no deben escribir; confirmar una acción sí.

## Comprobaciones

Resultado local de entrega: **536 pruebas aprobadas, 0 fallos y 10 TODO manuales** en `npm run check`; 14 grupos de sesión de tienda, 12 de consejo de tienda, 8 de venta, 17 de navegador y 8 de artefacto estático aprobados. La demo también se ejecutó correctamente. El workflow comprueba ahora las confirmaciones desde la tienda antes de publicar.

| Suite | Qué comprueba |
|---|---|
| `tests/shop-session.test.ts` | Observación recuperable, 150 IDs transcribibles, compra/venta/reemplazo, undo, no-op sin escritura, inmutabilidad, desconocidos, fallos de guardado, duplicados y reglas limitadas |
| `tests/confirmed.test.ts` | T09b, incluida corrección de contexto ya admitido por H1 y rechazo de contexto inválido sin escribir |
| `tools/shop-session-test.mjs` | Compra real desde oferta visible, cancelación, recarga/deshacer, legalidad, fallo de cuota/rollback, revisión antigua, aislamiento entre pestañas y móvil emulado |
| `tools/shop-test.mjs` | Consejo/edición de ofertas, precios, extras temporales, consulta sin escritura ni adquisición, recuperación de comodines ofertados |
| `tools/sale-test.mjs` | Venta confirmada, instancias distintas, recursos/contadores, Eternal, datos faltantes y recarga |
| `tools/browser-test.mjs` | Regresión del flujo H3/T09b: 17 grupos, teclado, exclusión entre pestañas, copias, errores y tacto emulado |
| `tools/static-site-test.mjs` | Artefacto servido bajo `/balatro-advisor/`, recursos locales, puntuación 80 → 572 documentada, observaciones persistidas y consulta inmutable |

Los informes JSON/logs y capturas producidos por estas herramientas se conservan localmente e ignorados por Git. Los tests y este resumen son reproducibles desde el código público. Se inspeccionaron capturas de escritorio y móvil; no se observaron desbordes de documento a 360/390/1440 px en los casos comprobados.

Las expectativas antiguas de venta solo en borrador y ofertas de comodín descartadas al recargar se sustituyen por el nuevo contrato. Se mantienen las comprobaciones de que consultar, simular, inspeccionar una carta o seleccionar un reemplazo hipotético no aplica operaciones reales.

La revisión añadió dos regresiones de integración: ganar el control de escritura habilita correctamente «Compré», y editar una oferta importada con ID de ilustración `j_joker` no duplica su identidad. El recibo opcional también admite un saldo negativo cuando H2 ya permite la deuda; una discrepancia sigue impidiendo guardar.
