# Verificación de datos puntuales OBS01c

Fecha: 2026-10-16. Fixtures sintéticos, sesión de navegador temporal; no observación directa del juego.

```powershell
npm.cmd run check
npm.cmd run test:observed-details
npm.cmd run build:site
node tools/static-site-test.mjs
```

El núcleo pasa **630 pruebas, 0 fallos y 10 TODO manuales**. Las catorce nuevas comprueban copias distintas, campos estrechos, catálogo/rangos, falta de inventario, bases literales y parciales, historia partida/ronda, desconocidos, validación de lotes, procedencia manual, cuota/revisión/duplicado/deshacer y compatibilidad0.1. El ejemplo Pareja7/123/9 es un contrato de transcripción literal, no un oráculo de reglas del juego.

Los nueve grupos nuevos de Chrome verifican:

1. Preparar/cancelar no escribe; el selector de consumibles muestra Tarot · El Loco.
2. Corregir solo Green A a11 mantiene Green B en9, guarda y recarga.
3. Un lote guarda base literal y tres totales históricos, conservando consumibles.
4. Deshacer recupera bases/contexto sin perder la corrección anterior del comodín.
5. Campo vacío muestra error en el modal; dato duplicado rechaza el lote; venta0 se admite sin vender.
6. Cuota fallida conserva estado, historial y lista preparada.
7. Modal de revisión antigua no sobrescribe una corrección externa.
8. Desconocido explícito no es cero y genera la pregunta del contador actual.
9. Modal390 no desborda horizontalmente; segunda pestaña permanece en lectura.

Regresiones aprobadas en la misma entrega: inventario8, observaciones7, recorrido17, tienda14, navegador general17 y hosting estático bajo subruta. Chrome headless instalado; el navegador general se ejecuta con `BROWSER_CHANNEL=chrome`. Capturas1440/390 inspeccionadas, con el mismo estilo de los otros editores. Android físico sigue aplazado.

Los recibos JSON y capturas se guardan aquí y están ignorados por Git. `DETAILS_BASE_URL`, `DETAILS_COMMIT` y `DETAILS_WORKFLOW` permiten repetir el flujo público y comparar SHA256 de diez archivos desplegados con el artefacto local; el recibo queda en `public/report.json`. En Windows, los textos del artefacto de comparación deben tener saltos LF, como los blobs de Git y el build Linux. No se equipara éxito local con publicación comprobada.
