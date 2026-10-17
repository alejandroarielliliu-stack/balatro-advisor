# Verificación TAG01b

- `npm.cmd run check`: 683 aprobadas, 0 fallos, 10 TODO empíricas previas; dieciséis casos nuevos en `tests/blind-decision.test.ts`. Esperados documentales/literales, no obtenidos del motor bajo prueba.
- `npm.cmd run demo:blinds`: tres ejemplos sintéticos ($11 frente8, $31 frente40 y25 diferidos), con comprobación de inmutabilidad.
- `npm.cmd run test:blinds`: siete grupos de Chrome en perfiles temporales: sin planes; plan actual explícito; saldo editado sin guardar; efecto no compatible/estricto; Inversión/plan siguiente explícito; recarga/lector; móvil y errores JS.
- Regresión: TAG01a, RUN01b, migración, tienda, OBS01a/b/c, DEC00, DEC01/SURV01 y subruta estática.
- `desktop.png` y `mobile.png` inspeccionadas visualmente. Los recibos JSON/capturas están ignorados por Git; `public/report.json` comprueba las mismas interacciones y catorce huellas del artefacto servido.

Software y móvil emulado; no prueba de Android físico, partidas jugadas ni eficacia estratégica. [Contrato, reglas y pendientes](../../comparacion-ciegas-tag01b.md).
