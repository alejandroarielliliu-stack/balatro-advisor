# Evidencia de capacidades y contrato de decisión

Entrega: 2026-10-16. Fixtures sintéticos, sin nueva observación directa de Balatro ni validación de eficacia estratégica.

```powershell
npm.cmd run check
npm.cmd run demo:decision
npm.cmd run test:decision
npm.cmd run build:site
node tools/static-site-test.mjs
```

Núcleo: **646 aprobadas, 0 fallos, 10 TODO manuales existentes**. Dieciséis pruebas nuevas verifican matriz212, rutas sin soporte universal, saldos independientes, mano concreta, resultado contextual intacto, dependencias de dinero y material, ilegalidad/cobertura, oferta temporal distinta, modo estricto, escenarios H3, confirmación hipotética bloqueada, fases, vigencia, venta/reemplazo, validación y ninguna escritura durante la consulta.

Oráculos de puntuación escritos antes de consultar el motor: pareja de ochos `(10+8+8)×2=52`; con Joker `(10+8+8)×(2+4)=156`; con Half `(10+8+8)×(2+20)=572`. Objetivo450: solo la última de esas manos supera el objetivo. No afirma que ese plan fijo sea óptimo ni probable. Los saldos parten de $7: conservar7, comprar Joker por2 deja5, comprar Half por5 deja2. Son ramas separadas, no gastos consecutivos.

Seis grupos nuevos de navegador:

1. Cobertura visible separa encaje/H2/confirmación sin escribir.
2. Saldo desconocido produce una pregunta compartida por dos compras.
3. La mano independiente sigue dando52 con saldo desconocido.
4. Precio descontado1 conserva aritmética contextual, pero no promociona H2; otra oferta sigue calculable.
5. El modo estricto conserva evidencia pendiente y un cambio sin nueva revisión invalida el informe.
6. Modal390 y consulta desde segunda pestaña sin escrituras.

Capturas1440/390 inspeccionadas. Chrome headless y emulación móvil; Android físico aplazado. Las nuevas explicaciones se mantienen dentro de los apartados cerrados de cobertura/datos, conservando la disposición de Mesa.

Regresiones de la misma entrega: tienda contextual, tienda persistente14, recorrido17, observaciones7, datos puntuales9, inventario8, navegador general17 y hosting estático bajo subruta. Los recibos/capturas se generan en este directorio y están ignorados por Git.

`DECISION_BASE_URL`, `DECISION_COMMIT` y `DECISION_WORKFLOW` repiten el flujo público en una sesión temporal y comparan diez archivos servidos con el artefacto `out/`. En Windows se normalizan los textos locales a LF para comparar los bytes de Git/build Linux. Resultado posterior al despliegue en `public/report.json`; no se deduce éxito remoto de una compilación local.
