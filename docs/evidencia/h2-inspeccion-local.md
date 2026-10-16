# L01 — inspección estática de la instalación 1.0.1o

Fecha local: 2026-10-09 (Panamá). Método: lectura de archivos existentes, sin ejecutar Balatro, modificar su instalación ni extraer/copiar su código al repositorio. Python zipfile permite leer el archivo ZIP incorporado en el ejecutable. La primera consulta con .NET no mostró entradas; no se tomó ese resultado como ausencia de código.

## Identificación y procedencia

- Ruta leída: `C:/Program Files (x86)/Steam/steamapps/common/Balatro/Balatro.exe`.
- `steamapps/appmanifest_2379780.acf`: appid 2379780, buildid **17459173**, directorio Balatro. Solo se registran esos campos técnicos, no identificadores de cuenta.
- Entrada `version.jkr` del ejecutable: **1.0.1o-FULL**, segunda línea 1.0.1o, canal PROD_PC_Console. Aclara la transcripción previa del usuario `1.01o-full` sin alterar aquella evidencia histórica.
- Steam y ausencia de mods: declaración del usuario; no se auditó el entorno de carga completo.
- SHA-256 del ejecutable: `0d75fe164accf3312734d4b37ac98788dd15f0b8e4f9bb8b7f90c4e59de93f47`.

La huella identifica los bytes inspeccionados, no autentica su distribución ni demuestra que la sesión del usuario ejecutó esos bytes sin alteraciones. **L01 es lectura estática local, no E-observación en una partida.** La búsqueda web adicional de versión no aportó una fuente primaria específica que verificase las reglas temporales; no se promovieron resultados secundarios a comprobación directa.

## Comprobaciones

| Regla / hipótesis | Caso mínimo de contraste | Resultado esperado / observado estáticamente | Estado y evidencia pendiente |
| --- | --- | --- | --- |
| Build del archivo instalado | Leer version.jkr y manifest de Steam. | Declaración literal previa 1.01o-full; el archivo contiene 1.0.1o-FULL. | Identificación del archivo confirmada; sesión en juego no observada. |
| U1: interés antes de añadir recompensa, manos y Golden | I01: B=19, R=3, H=2; I02 añade un Golden. | Esperados 27 y 31. state_events acumula ingresos en una variable de cobro distinta del saldo; interés usa el saldo de G.GAME, common_events guarda el cobro y cash_out lo añade después. | Hipótesis sustentada estáticamente; provisional para cálculo, pendiente contraste ejecutado. |
| Fórmula y tope de interés | Saldos 24,25,30. | Esperados 4,5,5; game fija interest_amount=1 e interest_cap=25; cálculo divide saldo y límite por cinco. | Provisional; observados en juego ausentes. |
| U2: incremento Green aplicado a esa mano | Green 0, K normal High Card 5×1. | Esperado 30 y contador 1. state_events invoca contexto before antes de puntuar; card incrementa en ese contexto y aplica el contador en el efecto de Mult posterior. | Sustento estático, no ejecución de G01. |
| Decremento Green por acción y suelo | Contador 2, descartar tres cartas una vez; después dos descartes separados. | Esperado 1→0→0. card aplica una reducción cuando procesa la última carta del grupo descartado y limita a cero. | Provisional; G03/G04 pendientes en juego. |
| Ocho comodines y precios base | Datos game y ramas de efectos card. | Coinciden con R-J; Half usa número de cartas jugadas, Abstract incluye todos los comodines, Scholar/Even se aplican por carta puntuada, Banner usa descartes restantes, Golden devuelve 4 al cobro. | Provisional para la instalación, sin resultados de partida. |

Referencias de líneas (solo ubicaciones; no se redistribuye el código del juego):

- `game.lua`: catálogo 368–462; Blue 629; interés 1909–1910.
- `card.lua`: venta 382; Golden 1655–1659; Green descarte 2846–2855, incremento 3563–3568 y Mult 4010–4015; Scholar 3159–3165; Even 3196–3204; Half/Abstract 3672–3686; Banner 3707–3711.
- `functions/state_events.lua`: before 628–635; recompensa/manos/Golden 1138–1181; interés 1191–1202 y total 1207.
- `functions/common_events.lua`: almacena el total a cobrar en 1087.
- `functions/button_callbacks.lua`: cash_out desde 2912, incorporación del cobro al saldo en 2938.

## Huellas de entradas internas

| Entrada | SHA-256 |
| --- | --- |
| version.jkr | a0525225e93bc81acd291aa4661e6648c8f3591ff34761bb3bee5319a766aaa3 |
| game.lua | bbc67bd3fbadd1ea3f3f0aba07ef8596118d89ff1e9758718f9e17c07a96e912 |
| card.lua | 5073d834e08119da9516f1795a8c3d93110669aeb409c29ad1b308e0eb0be453 |
| functions/state_events.lua | 6c86aefb42d0323d737f87aaa84f53e42b755e72cd0bfd163b7d9cca5c0a99a9 |
| functions/button_callbacks.lua | c88a74ca3a8fa8ace0ce46ad10a97238f347c292842c9164d11136fe9952c101 |
| functions/common_events.lua | 522ea0810101de1004685e13e7ed05a750b4e115e5231dca2cbc97aeb8c3e5fc |

Para repetir: abrir el ejecutable con zipfile, leer esas entradas sin extraerlas y calcular SHA-256 de cada secuencia de bytes. Si cambia la huella, revisar reglas antes de afirmar que esta inspección sigue aplicando.

## Consecuencia para H2

Se crea el contrato explícito `balatro-pc-1.0.1o-blue-white-v1`. Los documentos y fixtures históricos 1.0.1f no se migran silenciosamente. En el registro activo, las hipótesis de momento de interés/Green pasan de pendientes de investigar a **provisionales sustentadas en L01**. No se elevan a confirmadas contra el juego y no se marca ningún caso manual como aprobado.

`runtime.confirmation` continúa pendiente y bloquea cualquier operación solicitada con `requireObserved:true`. El modo documental devuelve cálculos con sus dependencias provisionales visibles y `verifiedAgainstGame:false`. H2 sigue parcial por falta de la evidencia ejecutada requerida por T01.
