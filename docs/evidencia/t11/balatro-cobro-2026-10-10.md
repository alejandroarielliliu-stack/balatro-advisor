# O-I1 — cobro observado directamente

Fecha: 2026-10-10, sesión del usuario; captura autorizada tras aviso «ya». Se activó la ventana y se capturó; no se pulsó Cash Out ni se jugaron acciones.

## Hipótesis previa y caso

El interés usa el saldo previo al cobro, excluyendo la recompensa de ciega. Caso adaptado de M-I1: The Psychic (jefe, no Small/Big del protocolo original), saldo B=19, recompensa visible R=5, manos sobrantes H=0, sin comodines visibles. Esperado bajo la hipótesis documentada previamente: interés 3 y cobro total 8. Incluir primero la recompensa daría una base 24 e interés 4. No se infiere esta hipótesis del código del asesor.

## Observado

Captura balatro-cobro-2026-10-10.png: saldo lateral $19; Cash Out $8; recompensa de ciega cinco símbolos de dólar; línea «3 1 interest per $5 (5 max)» con tres símbolos de dólar; manos 0; descartes 0; puntuación acumulada 715 contra objetivo 600; 0/5 comodines y 0/2 consumibles.

## Conclusión limitada

El interés mostrado de $3 y total de $8 coinciden con la hipótesis en este caso. Existe ahora observación directa del cobro, distinta de lectura del ejecutable o prueba aritmética. El saldo $27 en tienda fue posteriormente observado directamente en balatro-tienda-27-2026-10-10.png, además de confirmado por el usuario. La secuencia capturada es saldo 19 → cobro mostrado 8 (5 de recompensa + 3 de interés) → tienda 27.

No verifica el tratamiento de manos sobrantes (H=0), Golden, Green, todos los umbrales ni el tope: el texto indica 5 max pero no se alcanzó. No se vio la versión en esta pantalla ni se inspeccionaron vales/tags/modificadores; la versión sigue vinculada por declaración y L01, no por captura del menú de esta sesión. El jefe difiere del protocolo original y se conserva explícitamente esa desviación. No se cierran T01/H2 ni se promueven reglas globales a confirmed/requireObserved.
