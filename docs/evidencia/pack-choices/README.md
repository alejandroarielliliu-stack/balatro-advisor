# SHOP02c — verificación de la comparación visible

17 de octubre de 2026. Casos sintéticos de software, **sin observación de una partida de Balatro**. Las reglas conservan la evidencia provisional [L11](../pack-shop/README.md); no se vuelve a declarar una inspección del ejecutable ni se cambian sus estados.

## Oráculos y alcance

| Comprobación | Esperado independiente | Qué acredita |
|---|---|---|
| Mercury, Pair nivel 1 | Bases 10 fichas/Mult 2 → 25/3 | Aplicación y presentación de H2; no una puntuación final de 75 |
| Jupiter, Flush nivel 1 | Bases 35/4 → 50/6 | Identidad correcta y cambio solo de su mano |
| Constellation al usar Planet | ×1 → ×1,1 | Contador físico compatible, sin crecimiento de Blueprint supuesto |
| Red Card al omitir | Mult 9 → 12, también con Mega parcial | Sacrificio explícito frente a elegir; una omisión no se duplica |
| Dinero tras elegir | $16 → $16 | No se vuelve a pagar ni se cobra Satellite |
| Capacidad llena | Normal bloqueado; Negative pasa de 5/5 a 6/6 | Legalidad separada de encaje y sin venta hipotética |
| Mega primera elección | 2 → 1 elecciones restantes; una sola adquisición | No se copia una segunda elección hipotética |
| Material para Mimo/Steel Joker | Ausencia y abundancia declaradas producen condiciones distintas | Predicados de la política editorial; no frecuencia de robos o eficacia estratégica |
| Intención Celestial | Sin intención se abstiene; Pair declara una preferencia condicional por Mercury | Coherencia de la política explícita, sin inferir la estrategia del historial |
| Black Hole presente | Carta sin uso compatible; las mejoras Planet legales siguen calculables | Limitación local y abstención sobre el mejor contenido global |

Las cantidades proceden de L11, SYN01 y las políticas editoriales existentes. Los estados se construyen con observaciones literales; no se utiliza la salida del motor como oracle de sus propios esperados. Las pruebas de equivalencia, índices relativos, huellas e inmutabilidad acreditan contratos internos y se distinguen de esos esperados de reglas. Ninguna prueba acredita probabilidades de victoria ni una estrategia óptima.

## Comprobaciones reproducibles

`npm.cmd run check`: **784 aprobadas, 0 fallos y 10 TODO manuales**, incluidas 20 pruebas nuevas en `tests/pack-choices.test.ts`. `npm.cmd run demo:pack-choices` presenta cuatro ejemplos sin escritura. La web estática incluye 110 módulos del cliente, sin backend.

`npm.cmd run test:pack-choices`: ocho grupos de Chrome con perfiles temporales. Comprueba consulta/recarga/detalles sin escrituras, material real del mazo, confirmación explícita, intención de mano no persistida, Black Hole, Mega, capacidad/Negative y 390 px sin desbordamiento. Genera `report.json` y capturas junto a este documento, ignorados por Git. La emulación no es Android físico.

Las regresiones reutilizan `test:pack-shop`, `test:voucher-shop`, `test:shop-session` y `test:site`. El workflow ejecuta también los controles anteriores de fases, migración, recorrido, observaciones y decisiones antes de publicar.

La misma herramienta admite la URL pública mediante `PACK_CHOICES_BASE_URL`, `PACK_CHOICES_COMMIT` y `PACK_CHOICES_WORKFLOW`. Antes de sus ocho flujos compara SHA-256 de 19 módulos críticos, HTML y CSS con el artefacto local: 21 archivos. El informe público distingue su commit/despliegue, errores de JavaScript y entorno. Solo una ejecución aprobada y un despliegue terminado acreditan esa versión pública; el comando por sí solo no es evidencia de éxito.
