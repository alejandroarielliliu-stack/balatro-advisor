# Oráculos de H2 y límites de sus pruebas

Los resultados esperados se escribieron como literales a partir de H0/T01 y aritmética manual; no se ejecutó el motor para generarlos. Son pruebas del **modelo documental**, no pruebas contra una sesión de Balatro. La lectura L01 respalda premisas; la observación directa sigue ausente.

## Categorías sin comodines, nivel 1

| Cartas / categoría | Derivación independiente | Esperado |
| --- | --- | ---: |
| K / High Card | (5+10)×1 | 15 |
| 8,8 y acompañante / Pair | (10+8+8)×2 | 52 |
| 8,8,2,2 y acompañante / Two Pair | (20+16+4)×2 | 80 |
| 8,8,8 y acompañante / Three of a Kind | (30+24)×3 | 162 |
| 2,3,4,5,6 de varios palos / Straight | (30+20)×4 | 200 |
| 2,4,6,8,10 mismo palo / Flush | (35+30)×4 | 260 |
| 8,8,8,2,2 / Full House | (40+24+4)×4 | 272 |
| Cuatro ochos y acompañante / Four of a Kind | (60+32)×7 | 644 |
| 2,3,4,5,6 mismo palo / Straight Flush | (100+20)×8 | 960 |
| A,2,3,4,5 mismo palo / Straight Flush | (100+11+2+3+4+5)×8 | 1000 |
| 10,J,Q,K,A mismo palo / Straight Flush | (100+51)×8 | 1208 |
| Q,K,A,2,3 varios palos / High Card | No hay escalera circular; (5+11)×1 | 16 |

## Interacciones y economía

- S01: pareja 26×2=52; Joker 26×6=156; Half 26×22=572. Compra Half: 7−5=2, una de cinco plazas, oferta retirada.
- S04: Half+Scholar con dos ases: (10+22+40)×(2+20+8)=2160. Half+Even con ochos: 26×30=780. Cuatro cartas con pareja de ases apagan Half; Scholar 72×10=720 y Even 32×2=64 porque el 2 acompañante no puntúa.
- S06/S08: Water, Half+Banner, ases: 32×22=704. Psychic con cinco cartas y pareja de ochos, Half+Joker+Banner: 116×6=696.
- S07: antes 116×26=3016. Joker vendido por 1 y Abstract comprado por 4 desde saldo 3: saldo 0; cinco comodines; 116×37=4292. Golden reemplazado: saldo 2 y 116×41=4756.
- Scholar+Half+Banner+Abstract+Golden, dos ases: fichas 10+22+40+90=162; Mult 2+8+20+15=45; total 7290. Permutar el inventario conserva ese total en este catálogo aditivo; la prueba de permutación es además consistencia interna.
- Green solo: K primero 15×2=30; Q después 15×3=45; descarte de tres cartas en una acción 2→1; dos descartes posteriores 1→0→0. J después vuelve a 15×2=30. Son los esperados históricos de G01–G05.
- S05: Banner+Green: 210+315+420=945; alcanza 800 en tres manos. Con saldo 7 y Small, cobro hipotético 7+3+2+1=13. No ejecutar manos cuarta y quinta.
- Interés explícito para 0,4,5,19,24,25,30: 0,0,1,3,4,5,5. I01 saldo final 19+3+2+3=27; I02 añade Golden 4 y termina en 31. Derrota: ningún ingreso de ronda.
- Bases transcritas Pair 25×3, ochos: (25+16)×3=123. No se usa una fórmula inventada de niveles.

## Qué demuestra cada grupo

Las igualdades anteriores comparan implementación con expectativas documentales externas. Inmutabilidad, ida/vuelta, revisiones, invalidación de oferta, atomicidad del reemplazo, partición de cartas y rechazo de desbordamientos prueban contratos internos de software. La CLI se ejecuta en otro proceso y debe mostrar 52→572 y conservación de entrada.

Las pruebas no generan robos, no miden probabilidades de victoria y no demuestran que un estado sintético se haya alcanzado en Balatro. El caso terminal de ante 8 usa bases transcritas sintéticas para probar el corte del horizonte; no constituye testigo de una partida real.

Los diez TODO de `manual-rule-cases.json` conservan su procedencia 1.0.1f y observed:null. El protocolo activo 1.0.1o reutiliza las hipótesis y exige registrar su propia evidencia. Pasar pruebas de H2 no modifica el manifiesto manual.
