# Evaluación documental de la política h3-1

2026-10-10. Oráculos literales independientes del asesor. Los esperados no se generan invocando el módulo bajo prueba. Las prioridades se contrastan con el contrato de [H3](../asesor-h3.md); esto verifica implementación de una política, no que sea la mejor estrategia.

## Reutilización

Los casos A–D y su aritmética proceden de [T07b](t07b-oraculos.md), compatibles con las ideas de supervivencia/ahorro/crecimiento/reemplazo documentadas en H0. H3 no pretende cubrir íntegramente S01–S09.

| Caso | Datos documentales independientes | Conducta exigida a la política |
| --- | --- | --- |
| A, compra necesaria | Ciega 450. Conservar 52+28=80, Joker 156+84=240, Half 572 y coste 5. | Half primera candidata, H-COVERAGE. Consejo condicional; margen 122. |
| B, ahorro | Ciega 800. Conservar 1080/saldo final 37, Joker 1620/saldo 34; una mano ambas. | Conservar por H-ECONOMY. No pagar puntos sobrantes con un cambio arbitrario dólares/puntos. |
| C, crecimiento/reemplazo | Green pasa 10→12 al conservar; compra sin vender lo deja en 11. Conservar deja 18 con dos manos usadas; reemplazar deja 15 con una y elimina Green 10. | Mostrar sacrificio y aplicación; empate por compromisos. Un contador superior no basta para aconsejar. |
| D, desconocido | Green desconocido impide calcular ramas que lo conservan; reemplazo sí calculable. | Abstenerse globalmente, conservar la rama calculable sin promoverla por ausencia de datos ajenos. |

## Sinergia y sensibilidad añadidas

Sinergia: variante de A con Even Steven poseído y solo una pareja de ochos. Base 26 fichas, Mult 2+8=10. Oferta Joker 2 y Banner 5. Joker: 26×14=364, insuficiente para 450. Banner con tres descartes: (26+90)×10=1160. Reemplazar Even por Banner da 116×2=232; reemplazar por Joker da 156. Solo comprar Banner conservando Even supera este plan. Esperado: H-COVERAGE, con trazas de Banner y Even, y advertencia de dependencia de pares puntuados/descartes. La compra no es una garantía fuera de ese plan.

Sensibilidad: sin comodines, dinero 7, ofertas Banner y Half por 5. Dos escenarios de una mano contra 450: pareja de ochos y escalera 2S,3H,4D,5C,6S. Pareja: Banner 116×2=232, Half 26×22=572. Escalera: base 30+20=50, Banner 140×4=560, Half inactivo 50×4=200. Banner supera solo escalera; Half solo pareja. Esperado: mismo primer nivel, empate, sin promediar 232/560 o 572/200. Invertir el orden de escenarios conserva los niveles. Todas las cartas iniciales/robadas son distintas y las reposiciones explícitas son válidas en las ramas no terminales.

Beneficio persistente: variante de B con oferta Green 4. Conservar 1080 y saldo 37. Comprar Green: incremento de 0 a 1 aplicado, 135×9=1215; saldo 21+3+4+4=32. Ambas vencen en una mano. H-PERSISTENCE impide resolver solo por liquidez: se devuelve compromiso, sin afirmar que el crecimiento valga los cinco dólares de diferencia. El usuario ve contador, aplicación y dependencia futura.

Son instantáneas sintéticas, no una semilla ni una trayectoria real certificada. Se comprueban compatibilidad y legalidad del tramo descrito usando H2. Su aritmética sigue provisional bajo L01; no se realizó nueva observación del juego.

## Otras verificaciones

Quince pruebas H3 cubren además empate entre ofertas equivalentes, ausencia de escenarios, ningún éxito con dinero insuficiente, cobro desconocido sin bloquear puntuación/cobertura, subconjuntos de acciones y rechazo de inventadas, inmutabilidad, determinismo, igualdad de cálculos H3/T07b (consistencia interna), propagación de evidencia provisional y modo estricto, roles/IDs inválidos, precio desconocido, jefe desconocido, tienda incompleta y CLI ejecutable. Tipos/build y las pruebas H1/H2/T07b se ejecutaron también: 87 aprobadas, cero fallidas, diez TODO manuales.

No se midió tasa de victoria, confianza, calibración, utilidad futura de crecimiento ni eficacia frente a políticas alternativas. Faltan contrastes en partida y evaluación estratégica independiente antes de presentar el asesor como validado.
