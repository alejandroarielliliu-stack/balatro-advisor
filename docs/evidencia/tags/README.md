# Verificación TAG01a

- Núcleo: `npm.cmd run check` — 667 aprobadas, 0 fallos, 10 TODO de contraste manual anteriores.
- CLI: `npm.cmd run demo:tags` — salto sintético con guardado/recarga; no es partida observada.
- Navegador: `npm.cmd run test:tags` — siete grupos en Chrome, perfiles temporales. Etiqueta/cola observadas; cancelación/efectos no terminados sin escritura; salto y doble clic; fallo de cuota/reintento; Jefe no saltable; deshacer/recarga; escritorio y móvil emulado sin desbordamiento/errores JS.
- Regresiones: recorrido RUN01b, migración, confirmaciones de tienda, decisiones y consecuencias; CI ejecuta además OBS01 y hosting bajo subruta antes de publicar.
- Capturas `desktop.png`/`mobile.png` inspeccionadas visualmente; `report.json` y `public/report.json` son recibos generados ignorados por Git. El recibo público verifica los módulos servidos contra el artefacto exacto construido.

Estas pruebas acreditan el software. La inspección del ejecutable y los contrastes pendientes en partida se detallan en [contrato y evidencia](../../etiquetas-tag01.md). No acreditan utilidad estratégica, ejecución de tags ni Android físico.
