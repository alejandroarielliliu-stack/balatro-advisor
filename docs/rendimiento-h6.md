# H6 — rendimiento y verificación web

Ejecutado el 2026-10-10, hora de Panamá (los JSON guardan UTC). La petición del usuario de probar formato móvil en web aplaza la prueba Android física; no se confunde esa decisión con evidencia del dispositivo.

## Firefox resuelto para las pruebas

Una descarga limpia de Playwright Firefox 153.0, build 1538, dentro de `.browser-runtime` pasó los 17 grupos de integración. No se alteraron configuración de Windows, instalación personal de Firefox ni sus perfiles. El ejecutable y mozglue de ambas ubicaciones tienen hashes coincidentes; no se atribuye el fallo previo a una DLL distinta o corrupta sin evidencia. La causa de activación anterior no quedó aislada; la nueva ubicación sí es una vía probada.

[Informe Firefox](evidencia/t11/firefox/verificacion.json). El [fallo anterior](evidencia/t11/firefox-bloqueo.json) se conserva como historial. Chrome 154.0.8037.98 también tiene sus 17 grupos aprobados. Las pruebas usan escritorio y tamaños 390/360, teclado y tacto emulado; no son pruebas de una persona ni de Android físico.

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH=Join-Path (Get-Location) '.browser-runtime'
npx.cmd playwright install firefox
$env:TEST_BROWSER='firefox'
npm.cmd run test:web
```

## Método y presupuestos

`tools/benchmark-web.mjs` ejecuta el código compilado en un navegador real headless, con un contexto temporal y servidor local propio. Usa tres calentamientos y veinte muestras por caso. Mediana: promedio del par central; p95: rango más próximo, posición 19 de 20. Es una muestra pequeña de rendimiento en un equipo, no una garantía universal.

Se fijaron antes de medir presupuestos técnicos iniciales de p95: 500 ms para un escenario, 2000 ms para veinte escenarios, 2000 ms para horizonte y 1000 ms para respuesta renderizada sencilla. No estaban definidos numéricamente en H0; son criterios prospectivos de esta entrega, no cifras elegidas tras ver el resultado ni umbrales validados con usuarios.

| Carga | Qué se mide |
| --- | --- |
| single | H3, estado de compra inicial y un plan; 3 alternativas. |
| twenty | H3, inventario lleno S09 y veinte copias con IDs distintos de un plan; 12 candidatos. Es carga técnica, no veinte evidencias estratégicas independientes. |
| horizon | S03, seis alternativas y dos rondas declaradas. No representa el peor caso posible de tres rondas. |
| render | Click de consulta, actualización del DOM y dos requestAnimationFrame, con un plan. Aproximación de respuesta de interfaz; no mide el tiempo de una persona ni asegura cuándo un monitor físico presentó cada píxel. |

Se comprueba entrada inmutable, ausencia de errores JS y que consultar no modifica el registro local. La toma de memoria disponible es una instantánea aproximada del heap JavaScript de Chrome, no memoria máxima del proceso; Firefox no la expone en este recorrido.

## Resultados en este equipo

Windows 10.0.26200, Intel Core i7-13650HX, 20 procesadores lógicos. Sin limitar CPU para simular un teléfono. Cifras en milisegundos, mediana / p95:

| Carga | Chrome escritorio | Firefox escritorio | Chrome formato móvil 390×844 |
| --- | --- | --- | --- |
| single | 10,7 / 12,8 | 10 / 12 | 8,35 / 10,5 |
| twenty | 880,5 / 950,5 | 869,5 / 928 | 694,5 / 758,1 |
| horizon | 20 / 24,5 | 21 / 25 | 19,6 / 24,9 |
| render | 17,5 / 24,3 | 13 / 24 | 12,2 / 15,9 |

Todas las cargas cumplieron esos presupuestos en sus ejecuciones. Las diferencias entre sesiones no prueban que un teléfono vaya más rápido ni constituyen una comparación controlada de navegadores. La CPU sigue siendo la del PC. No se observó desbordamiento horizontal en el recorrido móvil.

Datos sin redondear y muestras: [Chrome](evidencia/rendimiento/chromium.json), [Firefox](evidencia/rendimiento/firefox.json), [móvil emulado](evidencia/rendimiento/chromium-mobile.json). [Captura móvil](evidencia/rendimiento/chromium-mobile.png).

```powershell
# Chrome escritorio
$env:TEST_BROWSER='chromium'
$env:BROWSER_CHANNEL='chrome'
$env:BENCHMARK_MOBILE='0'
npm.cmd run benchmark:web

# Mismo equipo, formato móvil
$env:BENCHMARK_MOBILE='1'
npm.cmd run benchmark:web

# Firefox escritorio; requiere la instalación indicada arriba
$env:TEST_BROWSER='firefox'
$env:BENCHMARK_MOBILE='0'
npm.cmd run benchmark:web
```

El comando devuelve error si falla una comprobación o excede un presupuesto, conservando los resultados de la medición cuando el recorrido pudo completarse. No se reetiqueta una ejecución antigua como nueva. Los ficheros se reemplazan al repetir una ejecución de la misma configuración.

## Límites de cierre

Se completa esta medición local y se resuelve Firefox. El criterio original de Android físico queda aplazado por decisión del usuario; la emulación cubre diseño/tacto en PC. Siguen sin medirse comprensión, tiempo humano de transcripción, memoria máxima y rendimiento en hardware móvil. H6 del plan completo, H2 contrastado y H7 no se declaran cerrados por estos resultados.

## Revisión UI-R2 — 2026-10-11

El benchmark se adaptó a la navegación Mesa/Análisis/Registro. Se repitió Chrome escritorio con la interfaz nueva: mediana/p95 en ms: single 11,15/14; twenty 727,6/817,7; horizon 18,75/21,9; render 12,2/18,8. Todos dentro de los presupuestos previos. El JSON chromium.json corresponde ahora a esta medición; los valores de Firefox y móvil de la tabla anterior son históricos y no se atribuyen al nuevo diseño. Las suites funcionales sí se repitieron en ambos navegadores.
