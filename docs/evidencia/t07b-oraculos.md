# Oráculos independientes de T07b

Fecha: 2026-10-10. Derivaciones manuales a partir de las reglas documentadas en [H2](h2-oraculos.md) y [L01](h2-inspeccion-local.md). Los tests comparan números literales; no usan el motor para generar resultados esperados. **No son resultados observados en Balatro.** Todas las cartas de la demo se etiquetan hipotéticas y las manos están a nivel 1.

## Casos de demostración

A usa Blue/White, ante 1 Big (450, recompensa 4), dinero 7, sin comodines. Ofertas Joker 2 y Half 5. Mano inicial 8S,8H,KS,QH,JD,4C,5S,6H; jugar los dos ochos, robar 2S/2H si continúa, jugar los dos doses y robar 3S/3H si continúa.

- Conservar: (10+8+8)×2=52; (10+2+2)×2=28; total 80. Quedan tres manos, no se cobra y no se declara derrota.
- Joker: 26×6=156 y 14×6=84, total 240; saldo de tienda 5.
- Half: 26×22=572 en la primera mano. No roba ni ejecuta la segunda; sobran cuatro manos. Saldo 7−5=2; cobro 4+4+0 de interés=8; saldo 10.

B usa ante 2 Small (800, recompensa 3), dinero 25 y ningún comodín. Oferta Joker 2. Juega 5S,6S,7S,8S,9S desde una mano inicial con KS,QH,JD adicionales.

- Conservar: escalera de color (100+5+6+7+8+9)×8=1080; gana con cuatro manos restantes. Saldo final 25+3+4+5=37.
- Joker: 135×(8+4)=1620; también una mano. Saldo de tienda 23; interés 4. Saldo final 23+3+4+4=34.
- Comprar suma 540 puntos, pero deja tres dólares menos. No se infiere que eso mejore la supervivencia futura. Los cinco robos condicionales se omiten en ambas ramas.

C usa ante 2 Small (800, recompensa 3), dinero 10, Green con contador 10 y venta 2. Oferta Half 5. Inicial: 8S,8H,8D,KS,QH,JD,4C,6H. Jugar trío de ochos; si continúa, robar 2S,2H,3S. Jugar pareja de doses y reponer con 3H,4S solo si continúa.

- Conservar: Green 11 en primera mano; (30+24)×(3+11)=756. Luego Green 12, (10+4)×(2+12)=196. Total 952; dos manos usadas. Saldo 10+3+3+2=18; se conserva Green 12.
- Comprar sin vender: 54×(3+11+20)=1836 en una mano; Green termina en 11. Saldo 5+3+4+1=13.
- Reemplazar: vender lleva a 12, comprar lleva a 7; coste neto 3. Half sin Green da 54×23=1242; una mano. Saldo final 7+3+4+1=15. Se pierde Green y su contador; no se transfiere al nuevo comodín.

D mantiene las cartas/tienda de C, pero Green es unknown. Conservar y comprar sin vender se abstienen de puntuar la primera mano; reemplazar sigue dando 1242 y saldo 15 porque no requiere conocer el contador vendido. No se puede calcular una diferencia de puntos válida respecto de conservar ni concluir que reemplazar sea mejor.

Son instantáneas sintéticas compatibles con la cobertura: cartas originales distintas, precios base, capacidad disponible, ciegas/recursos ordinarios. B–D se sitúan en ante 2 para permitir ahorro o crecimiento previo; no se supone Green 10 recién comprado en la primera tienda. Acumular 10 incrementos tras adquirirlo en ante 1 requiere conservarlo y jugar suficientes manos sin descartes; esa trayectoria no la genera esta demo. No se acredita una semilla, oferta concreta ni historial ejecutado. La validación del software comprueba la instantánea y su secuencia explícita, no prueba alcanzabilidad histórica de cada transcripción.

## Otros resultados literales

- C con Green 2: un descarte de 4C lo deja en 1, roba 2C y juega el trío de ochos. Green vuelve a 2 y da 54×(3+2)=270; se consume un descarte y una mano. No se incrementa dos veces por la preevaluación.
- A con cinco cartas altas K,Q,J,8,8 por separado: 15+15+15+13+13=71, cero manos restantes, sin cobro. El sexto evento se omite. Es agotamiento de manos en el escenario.
- El cuarto descarte es ilegal con tres disponibles. Robar una carta jugada, jugar una que aún no está en mano, duplicar la mano inicial o referenciar una carta inexistente devuelve error; no hay resultado alternativo fabricado.
- Recompensa desconocida en B deja 1080/1620 verificables documentalmente, pero saldo posterior desconocido. Eliminar el supuesto de dinero constante limita solamente el cobro.

## Qué se verificó

Quince pruebas nuevas cubren los cuatro ejemplos, igualdad de planes y entradas congeladas, independencia entre ramas, repetibilidad, robos condicionales, cartas y recursos ilegales, contadores, finalización temprana, datos incompletos, evidencia, modo estricto, candidatos ilegales, tienda desconocida, esquema y CLI. Son pruebas de contrato/consistencia y contraste con oráculos documentales. Ninguna constituye observación directa de reglas en una partida; los diez TODO manuales previos permanecen pendientes.
