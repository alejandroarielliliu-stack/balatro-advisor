**Estado vigente tras revisión del plan adjunto:** [rendimiento H6 y Firefox](rendimiento-h6.md) completados en PC. 17 grupos funcionales aprobados tanto en Chrome como en Firefox; formato/tacto móvil emulado. Android físico aplazado por indicación del usuario. [Plan completo H0–H7](plan-general-reconciliado.md) reconciliado. Las ejecuciones históricas siguientes conservan su contexto.

**Estado tras T08c-3:** [auditoría S01–S09](auditoria-t08c.md) completada; A3/A4 cubiertos como software provisional. 141 pruebas, 29 EFHIII, 17 grupos Chrome y cero fallos. Evidencia pendiente del juego no sustituida.

**Actualización T08c-2:** [horizontes explícitos integrados](horizontes-t08c.md), 131 pruebas + 29 EFHIII + 16 grupos Chrome. S03 y la extensión S05 tienen secuencias ejecutables.

**Actualización T08c-1:** [ventas solas integradas](ventas-t08c.md), 122 pruebas + 29 EFHIII + 15 grupos Chrome. El flujo de venta con confirmación y recuperación ya se probó en navegador.

**Actualización T07c:** [cotas S09 implementadas y probadas](cotas-t07c.md), incluidos UI y aislamiento de ramas; A3 ya cubre esta cota como software. A3/A4 siguen parciales por horizontes y evaluación completa. Suite vigente: 114 pruebas, 29 contrastes EFHIII y 14 grupos Chrome; los resultados anteriores se conservan como historial.

# T11 — evaluación integrada, entrega parcial

Fecha: 2026-10-10. [Prompt y plan ejecutado](prompt-t11.md). Solo se modificaron archivos dentro de balatro-advisor. No se controló Balatro ni se alteraron sus guardados.

## Resultado ejecutado

`npm.cmd run check`: tipos/build correctos, **103 aprobadas, 0 fallidas, 10 TODO** de observación del juego. `TEST_BROWSER=chromium`, `BROWSER_CHANNEL=chrome`, `npm.cmd run test:web`: **13 grupos aprobados**, cero errores JS. Chrome real 154.0.8037.98 en Windows, headless; perfiles temporales separados del usuario. [Informe](evidencia/t11/chromium/verificacion.json).

Se conservan los 11 grupos T10. Dos grupos nuevos prueban: navegación Tab hasta la cobertura, Space para marcar, Enter para crear con saldo desconocido y Escape para cancelar importación; y creación → plantilla hipotética → consejo sin escritura → confirmación de compra → recarga mediante acciones tap a 360×800 con hasTouch/isMobile. Los resultados literales 572 puntos y saldo 7→2 proceden del caso documentado anterior; no se derivan de la salida bajo prueba. El teclado no constituye una auditoría completa de accesibilidad.

Se descargó el Firefox 153.0 distribuido con Playwright. Su lanzamiento falló antes de cargar la web (`browserType.launch: spawn UNKNOWN`). Ejecutar `firefox.exe --version` produjo error de configuración en paralelo; el registro Application/SideBySide del equipo indicó que no se encontró el ensamblado dependiente mozglue, versión 1.0.0.0. El archivo mozglue.dll sí existe: no se concluye que falte físicamente esa DLL ni se atribuye el fallo al código de la web. No se cambiaron configuraciones de seguridad ni del sistema para forzar la prueba. **Firefox: no probado**. [Registro](evidencia/t11/firefox-bloqueo.json).

La comprobación táctil es emulación en Chrome de escritorio, no Android físico. La herramienta también admite Firefox con hasTouch sin isMobile, cuando el ejecutable pueda arrancar.

## Matriz A1–A8

| Criterio | Estado | Evidencia y límite |
| --- | --- | --- |
| A1 evidencia/versión | Cubierto como software | Pruebas H2 de versión y requireObserved; las reglas siguen provisionales. No acredita observación del juego. |
| A2 acciones legales/inmutabilidad | Cubierto dentro del catálogo | H2/T09b, consejo web sin escritura, confirmación/revisión y dos pestañas. No incluye combinaciones fuera de la enumeración documentada. |
| A3 nueve escenarios/fronteras | Cubierto como software provisional | Matriz T08c-3 y suite ejecutable de nueve escenarios; horizontes, cotas y variantes trazados. No son observaciones del juego. |
| A4 explicación multidimensional | Cubierto dentro de los casos y modelo probados | Auditoría de puntuación/recursos/dinero/sacrificios/condiciones; contexto de jefe corregido y web S04/S06 probada. Sin afirmación de consistencia probabilística ni eficacia estratégica. |
| A5 sin porcentajes/optimalidad ficticios | Cubierto en recorridos y política probados | Salidas conditional/tie/abstain y política cualitativa; no se afirma una auditoría universal de todos los textos futuros. |
| A6 persistencia | Cubierto en Chrome y núcleo | Recarga, importación/exportación, cancelación, datos inválidos, cuota y coherencia estado/historial; los límites del origen/perfil siguen aplicándose. |
| A7 navegadores/dispositivos | PC y emulación cubiertos; Android físico aplazado | Chrome y Firefox, 17 grupos cada uno; 1280/390/360, teclado y tacto emulado. Rendimiento local medido; dispositivo físico diferido por el usuario. |
| A8 determinismo/incompatibles | Cubierto dentro del modelo | Tests H2/T07b/H3 deterministas y rechazo/abstención; no es evidencia de correspondencia empírica con Balatro. |

**T11 y aceptación completa v0.1 permanecen abiertos.** T10 sigue entregado como interfaz mínima: sus pruebas por tamaños no sustituyen A7 completo. Las reglas pendientes solo afectan certificar los módulos correspondientes; no impiden trabajar en T07c/T08c ni corregir el navegador.

## Reproducir

```powershell
npm.cmd run check
$env:TEST_BROWSER='chromium'
$env:BROWSER_CHANNEL='chrome'
npm.cmd run test:web
# Otra ejecución independiente, si Firefox puede arrancar:
npx.cmd playwright install firefox
$env:TEST_BROWSER='firefox'
npm.cmd run test:web
```

Con TEST_BROWSER el informe y las capturas se guardan bajo evidencia/t11/<motor>; sin esa variable se conserva el destino T10. Una ejecución fallida no escribe un informe de éxito. Si se repite, comprobar la salida/fecha del informe: un archivo anterior no certifica el último intento.

## Próxima evidencia mínima del usuario

No volver a pedir plataforma/mods ni todo el catálogo. Para vincular una sesión real a la instalación y comprobar **solo M-I1**, enviar:

1. Captura del menú con la versión visible.
2. Cuando sea posible, antes de ganar Small/Big con **$19**, sin Golden ni otros ingresos/modificadores: captura con dinero, comodines y recursos.
3. Captura del desglose de cobro y otra del saldo de la siguiente tienda antes de gastar; anotar recompensa y manos sobrantes y confirmar que no cambió el dinero durante la mano ganadora.

Hipótesis previa: interés $3 y saldo 19 + recompensa + manos restantes + 3. Un observado diferente no se corrige para que coincida. Si no aparece ese estado, no reiniciar una partida importante para fabricarlo: revisar otro saldo discriminante antes de interpretar. Observado sigue ausente. Golden y Green quedan para una tanda posterior cuando estén disponibles; [protocolo completo](evidencia/t01-tanda-usuario.md).

Para A7 falta después una ejecución en un Android físico con acceso local seguro; no se abrió la red ni se publicó para simularla. Tareas independientes siguientes: resolver el arranque del Firefox de pruebas sin alterar la app; T07c (cota S09 con premisas explícitas), seguido por T08c para horizontes y cobertura de escenarios. No se añadieron fórmulas, Monte Carlo ni otro catálogo en esta entrega.

### Evidencia de cobro añadida

[O-I1](evidencia/t11/balatro-cobro-2026-10-10.md): ya se capturó directamente interés 3 con saldo 19 y recompensa 5, cero manos, tras The Psychic. Sustituye la ausencia total de observación de cobro descrita arriba, pero no cierra T01: variante de jefe, versión visual y saldo de tienda pendientes; Golden/Green y resto de casos sin observar.


O-I1 completado en su saldo final: captura directa de tienda con $27 tras cobro $8 desde $19. No cierra las demás comprobaciones T01 ni la identificación visual de versión.


