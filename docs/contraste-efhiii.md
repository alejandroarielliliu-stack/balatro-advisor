# T11b — contraste independiente EFHIII

Fecha: 2026-10-10. [Prompt ejecutado](prompt-t11b-efhiii.md). **29 casos coincidentes, cero discrepancias de reglas** entre H2, EFHIII y resultados literales calculados a mano. Es evidencia de tipo external_implementation, no game_observation. Las reglas del motor y requireObserved no se modificaron.

## Referencia fijada y reproducción

Repositorio: https://github.com/EFHIII/balatro-calculator

Commit: **55322d59197ba08c16874a54b59ac0d443c8ab32**. Se guardan sin modificar balatro-sim.js, cards.js, README y licencia MIT (Saffron Haas) en tools/reference/efhiii. provenance.json registra URL, fecha y SHA-256 por archivo. La prueba comprueba esos hashes antes de ejecutar. Esto identifica la versión del calculador; no certifica que implemente exactamente nuestra build de Balatro. No se descarga main en cada prueba ni se crea un repositorio anidado.

```powershell
npm.cmd run test:reference
```

Funciona sin red después de instalar dependencias. Solo el script de desarrollo ejecuta la referencia en un contexto VM con tiempo limitado; no se integra en la aplicación, no modifica partidas y no sustituye H2. VM no se presenta como una garantía de seguridad para código arbitrario. El código fijado se inspeccionó para entender el contrato antes de usarlo.

[Informe por caso](evidencia/efhiii/resultados.json) conserva cartas, orden de comodines, descartes, contador inicial, esperados y ambos resultados. Una discrepancia hace fallar el comando después de escribir el informe. No se utiliza la salida externa para regenerar esperados.

## Adaptador y oráculos

Se ejecuta Hand.compileAll seguido de simulate sobre las cartas exactas elegidas: no se busca la mejor mano ni se reordena nada. Cada motor recibe una instancia nueva por caso. Todas las cartas son normales, las manos nivel 1 y la ciega local no aplica modificadores de puntuación. Las categorías externas se convierten por su tabla explícita, sin consultar la categoría que produjo H2.

La codificación externa de cartas es rango 0–12 (2–A), palos H=0/C=1/D=2/S=3 y atributos normales a cero. IDs externos: Joker=0, Half=7, Banner=21, Abstract=33, Even=38, Scholar=63, Green=112; Golden=29 según su posición x=9/y=2 en cards.js. Banner recibe descartes restantes; Green recibe el contador **anterior** a jugar. No se preincrementa ese contador en el adaptador: EFHIII añade 1 en su propio código. Esto permite contrastar el resultado de una mano, no la persistencia de dicho contador entre eventos.

Los esperados de fichas y Mult están escritos como literales en tools/compare-efhiii.mjs. Su producto se calcula como aritmética de presentación, sin invocar motor alguno. Derivaciones relevantes:

- Pareja de ochos: (10+8+8)×2=52; Joker lleva Mult a 6 (156); Half a 22 (572). Una tercera carta ajena a la pareja no puntúa y Half sigue activo; con cuatro cartas jugadas Half deja de activarse: 52.
- Dos parejas 8/2: (20+8+8+2+2)×2=80. Trío de ochos: (30+24)×3=162. Póquer de ochos con K ajeno: (60+32)×7=644.
- Escalera 2–6: (30+20)×4=200; rueda A–5: (30+11+2+3+4+5)×4=220. Color 2/4/6/8/J: (35+30)×4=260; full 8/2: (40+28)×4=272; escalera de color 2–6: (100+20)×8=960.
- Abstract solo suma 3 Mult: 26×5=130. Con Golden hay dos comodines: 26×8=208. Golden solo no altera la puntuación: 52, sin comprobar sus ingresos.
- Even sobre la pareja de ochos suma 8 Mult: 26×10=260; el 2 adicional sin puntuar no activa nada. Un as solo no activa Even: 16×1=16.
- Scholar sobre dos ases: (10+22+40)×(2+8)=720. Un as que no puntúa junto a pareja de ochos no lo activa: 52. Con Joker: 72×14=1008.
- Banner con tres descartes: (26+90)×2=232; sin descartes, 52. Banner+Even, en ambos órdenes: 116×10=1160.
- Green con K solo y contador inicial 0: 15×2=30; inicial 5: 15×7=105.
- Cinco plazas Joker/Half/Abstract/Even/Banner con pareja de ochos: fichas 26+90=116; Mult 2+4+20+15+8=49; total 5684.

Las bases/efectos proceden de los oráculos documentales previos de H2 y de la inspección L01. Son hipótesis contrastadas entre implementaciones, no deducciones de la salida del propio motor. El README externo advierte que algunos comodines pueden fallar; no se asume infalibilidad.

EFHIII representa puntuaciones mediante mantisa/exponente: devolvió 220.00000000000003 y 231.99999999999997 en dos casos. Se conserva el valor original y se usa tolerancia absoluta 1e-8 para score/Mult; chips y categoría deben coincidir exactamente. Los casos son pequeños y deterministas; esa tolerancia no es una política para puntuaciones enormes.

## Alcance real y pendientes

Se cubren nueve categorías más rueda, ocho comodines **solo en puntuación**, Half en 2/3/4 cartas, activación por cartas puntuadas, Banner en 0/3 descartes, Green en 0/5, combinaciones y dos órdenes de Banner/Even. No cubre todos los órdenes, niveles, manos o combinaciones posibles.

No comprueba venta/compra, intereses, ingresos Golden, decremento de Green por descarte, persistencia de contadores, jefes, manos modificadas, probabilidad ni calidad estratégica. No se cierran S01–S09/A1–A8 ni H2/T11 por estas coincidencias. La evidencia real O-I1 del cobro 19→27 conserva su categoría propia.

La siguiente tarea de desarrollo independiente es **T07c**: una cota conservadora documentada para S09, con premisas explícitas y abstención ante datos desconocidos, sin Monte Carlo. Las observaciones de Golden/Green pueden recogerse oportunistamente; no es necesario frenar ese desarrollo ni pedir al usuario que fabrique todos los estados.
