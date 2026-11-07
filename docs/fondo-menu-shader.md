# Fondo del menú: investigación y segunda versión

6 de noviembre de 2026. Mejora del fondo, sin cambiar pantallas, controles, navegación ni reglas del asesor. El render sigue en `src/ui/menu-background.ts`, con la misma API de activación, movimiento y destrucción.

## Investigación previa

La referencia aportada, [Azkun/balatroShader](https://github.com/Azkun/balatroShader), se revisó antes de cambiar el shader. Versión consultada: [`6c85fec8e48eaa1e31451d41066603515d5ae477`](https://github.com/Azkun/balatroShader/blob/6c85fec8e48eaa1e31451d41066603515d5ae477/balatroShader.js). Su núcleo transforma coordenadas respecto al centro, aplica torsión polar según radio y tiempo, realimenta un campo bidimensional durante cinco iteraciones y obtiene tres pesos de color de su magnitud. Giro y flujo tienen relojes separados; cambiar solo la velocidad no recupera esa estructura. El tamaño de píxel, zoom, giro y contraste alteran resultados distintos. El README y el código discrepan en algunos valores por defecto; no se trataron como parámetros oficiales del juego.

**Distinción importante:** la copia local Steam 1.0.1o-FULL permite inspeccionar el original. Se leyeron en memoria los archivos del ZIP incluido en el EXE privado de pruebas ya existente, `.browser-runtime/balatro-api/game/BalatroAdvisorAPI.exe`, sin extraerlos, ejecutarlo, modificar el juego ni publicar sus fuentes. Ese ejecutable permanece excluido de Git.

| Archivo inspeccionado | SHA-256 de sus bytes |
| --- | --- |
| `game.lua` | `bbc67bd3fbadd1ea3f3f0aba07ef8596118d89ff1e9758718f9e17c07a96e912` |
| `resources/shaders/background.fs` | `81a512572b159d247ca747de36335bc47c933178cb5f6fb914ec6ce74dabf632` |
| `resources/shaders/splash.fs` | `ca20993fa5d92d5441f2ff09441fdf8eff4310ccc71f946caa5425003b7ee24f` |

El EXE conserva la huella `0d75fe164accf3312734d4b37ac98788dd15f0b8e4f9bb8b7f90c4e59de93f47`. En `Game:main_menu`, líneas 1517–1557 de `game.lua`, el menú enlaza **`splash`**, con rojo/azul, velocidad de vórtice 0,4 y una transición de destello. El shader `background` se enlaza al fondo de partida en las líneas 2268–2291. Por tanto, Azkun no representa por sí solo todo el efecto del menú de la captura.

`splash.fs` combina torsión dependiente del radio y del tiempo, deformaciones bidimensionales acopladas, densidad y máscaras luminosas. El relieve percibido no exige geometría tridimensional ni una simulación de fluidos. Esta comprobación es **inspección estática del ejecutable**, no observación de una partida ni medición visual del juego ejecutándose.

También se contrastaron dos recreaciones primarias: [conversión Godot de xxidbr9](https://github.com/xxidbr9/balatro-effect-recreate/blob/master/background.gdshader), que atribuye el origen a LocalThunk y añade iluminación; y [port HLSL de Hammster](https://github.com/Hammster/windows-terminal-shaders/blob/main/balatro.hlsl), que mantiene la misma familia de deformaciones. La [implementación de React Bits](https://github.com/DavidHDev/react-bits/blob/main/src/content/Backgrounds/Balatro/Balatro.jsx) consultada contiene un pase de pintura y pases opcionales para campo interactivo y postprocesado CRT; no significa que siempre ejecute todos ellos. No se incorpora esa arquitectura ni sus dependencias para resolver este fondo.

### Procedencia del código

Azkun no incluye LICENSE en el árbol revisado y la API del repositorio devuelve `license: null`; su aviso de no afiliación no se presenta como licencia MIT. [React Bits](https://github.com/DavidHDev/react-bits/blob/main/LICENSE.md) usa MIT con una condición Commons Clause, no MIT sin condiciones. La licencia CC0 del [repositorio de Hammster](https://github.com/Hammster/windows-terminal-shaders/blob/main/LICENSE) tampoco se atribuye al código propietario original.

Se conservan estos enlaces como referencias. El asesor implementa su propio campo y su propia iluminación a partir de los principios estudiados; no importa esas bibliotecas, no redistribuye los shaders extraídos y no afirma que el efecto sea código oficial de Balatro. La referencia artística y técnica original corresponde a LocalThunk.

## Cambio implementado

El shader anterior deformaba coordenadas, pero reducía color y reflejos al mismo escalar periódico: las vetas se desplazaban como una corriente única. La nueva implementación separa esas funciones:

1. Torsión amplia dependiente del radio y un reloj lento para la rotación global.
2. Dos vórtices locales con centros y fases distintas, aplicados sucesivamente para que sus deformaciones se afecten.
3. Cinco pasos de realimentación entre coordenadas, memoria vectorial y pliegues. El movimiento interno tiene fases diferentes del giro global.
4. Densidad del campo para distribuir rojo, azul y canales oscuros, evitando convertir las transiciones en una franja púrpura uniforme.
5. Altura superficial independiente del color: normales, iluminación difusa, reflejo especular, crestas y borde. No se calculan luces únicamente repitiendo las bandas de pigmento.

`OES_standard_derivatives` permite obtener normales sin evaluar todo el campo varias veces por píxel. Si no está disponible, se usa una aproximación a partir del mismo campo. La primera revisión visual detectó una cuadrícula al cuantizar las coordenadas antes de obtener derivadas; se retiró esa cuantización. La superficie de render limitada proporciona el ritmo de píxel sin introducir una cuadrícula de iluminación.

## Presupuesto y compatibilidad

- Un único pase y cinco iteraciones; sin texturas de simulación, realimentación entre fotogramas ni nuevas dependencias.
- Máximo de **800.000 píxeles de render**, redondeados hacia abajo; DPR limitado a 1,25 y objetivo máximo de 30 fotogramas por segundo.
- Pausa fuera del menú, con documento oculto o movimiento desactivado; conserva la fase al reanudar. Se mantiene la preferencia de movimiento existente.
- El tamaño se obtiene de `clientWidth`/`clientHeight` y, como respaldo, `offsetWidth`/`offsetHeight`. Una rotación CSS de 90 grados no intercambia por error el aspecto lógico del shader mediante `getBoundingClientRect`.
- Sin WebGL se conserva el fondo estático Canvas2D/CSS y las acciones del menú.

Estos son límites de trabajo y comportamiento, no una garantía de 30 fps en cualquier teléfono.

## Comprobaciones realizadas

El primer `npm.cmd run typecheck` del renderer pasó; el cierre global se repite cuando termine la integración de orientación. Una página aislada con el renderer se abrió en Chrome con WebGL real, sin errores: 1440×900 produjo 1131×707 (799.617 píxeles); 844×390 produjo 844×390 (329.160 píxeles). Con DPR 2 solicitado en ese tamaño, el límite de DPR produjo 1055×487 (513.785 píxeles). También compiló y dibujó con `OES_standard_derivatives` denegado, sin errores. Se inspeccionaron las capturas y se corrigió el artefacto de iluminación mencionado. La evidencia de esta inspección está en `.browser-runtime/menu/shader-v2/`, excluida de Git.

La integración con la rotación de toda la web y la regresión de navegación/guardado se verifican aparte. La emulación de viewport no acredita rendimiento en Android físico.

Una muestra exploratoria de cadencia en Chrome headless, 844×390 con DPR 2 solicitado, registró 64 llamadas de dibujo durante 2291 ms después del calentamiento: aproximadamente 27,5 por segundo y una separación máxima de 38 ms. Es una medición de ese PC y ese contexto aislado, no de un teléfono ni un benchmark general; el informe permanece junto a la evidencia privada.
