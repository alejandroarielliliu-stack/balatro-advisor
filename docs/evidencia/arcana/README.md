# L13 / DECK04b · Arcana con mano observada

18 de octubre de 2026, Panamá. Compatible con **Steam PC 1.0.1o-FULL sin mods**. Lectura estática del ZIP incorporado en `C:/Program Files (x86)/Steam/steamapps/common/Balatro/Balatro.exe`, sin ejecutar el juego, extraer Lua al repositorio ni modificar la instalación.

**Reglas provisionales, respaldadas por inspección; observación en partida pendiente.** «Observado estático» significa una rama de código leída, no una partida jugada. Los esperados siguientes proceden de esa evidencia primaria y no de la salida del asesor. Las pruebas y capturas web solo validan la implementación del asesor.

## Alcance de la evidencia

Arcana normal, Jumbo y Mega, abiertos desde la tienda, con contenido y mano registrados explícitamente. Los doce Tarot dirigidos de [L12](../tarot/README.md) conservan allí sus efectos, límites y esperados; no se repite su tabla. Este lote reutiliza esas transformaciones sobre la mano del sobre. Los otros diez Tarot y The Soul se pueden identificar como opciones observadas sin implementar su uso. **Omen Globe también permite otros Spectral en Arcana**; su presencia debe registrarse como incompatible o no implementada de forma explícita, nunca reinterpretarse como un Tarot ni descartarse silenciosamente.

El asesor no conoce la semilla, no genera contenido ni cartas robadas, y no asigna probabilidades a las opciones observadas. Los importes $4/$6/$8 son precios nominales de centros; el importe efectivamente registrado y sus modificadores siguen el contrato económico de [L11](../pack-shop/README.md). No se valida un descuento desconocido usando solo el precio nominal.

## Matriz de comprobaciones

Cada fila mantiene pendiente la observación en el juego. El resultado estático es la rama primaria que se pudo inspeccionar. Los ejemplos suponen las condiciones descritas, sin modificaciones adicionales.

| Regla o hipótesis | Caso mínimo | Resultado esperado independiente | Observado estático / fuente | Estado y contraste pendiente |
|---|---|---|---|---|
| Tamaño y elecciones | Arcana normal/Jumbo/Mega sin modificadores | $4, 3 opciones/1 elección; $6, 5/1; $8, 5/2 | `game.lua:665–672`, configuración `extra/choose/cost` | Provisional; precio antes, opciones y elecciones al abrir |
| Apertura cobra una vez | $20, normal observado a $4 | $16; Arcana abierto; no Tarot adquirido por abrir | `card.lua:1681–1716`, estado `TAROT_PACK`, elecciones y cargo | Provisional; saldo y fase antes/después |
| Contenido no se deduce | Normal abierto, opciones todavía sin registrar | El asesor mantiene contenido desconocido hasta observación explícita | El juego genera opciones `card.lua:1728–1735`; el asesor no ejecuta ese generador | Requisito informativo del asesor; no es una regla adicional del juego |
| Mano inicial se roba una vez | Mano vacía, mazo con 52 cartas disponibles, tamaño 8 | 8 cartas pasan a mano; los IDs concretos requieren observación | `game.lua:3345–3389`, llamada única inicial a robo en `3374`; `state_events.lua:355–377` | Provisional; sobre abierto con mano completa, sin inferir su identidad |
| Robo limitado por existencias | Mano vacía, solo 5 cartas disponibles, tamaño 8 | Se muestran 5, no se inventan otras 3 | `state_events.lua:362`, mínimo entre cartas disponibles y huecos | Provisional; captura de mano y cantidad disponible si ocurre |
| Mano ya parcial | 3 cartas en mano, 10 disponibles, tamaño 8 | Se roban 5; quedan 8 visibles | Mismo mínimo `state_events.lua:362` | Provisional; caso mecánico; no se presume una mano parcial al abrir desde tienda ordinaria |
| Sin tamaño positivo no se declara derrota al abrir | Tamaño de mano 0 y mano vacía en Arcana | No ejecuta la rama de game over usada fuera de sobres | `state_events.lua:356–359` excluye `TAROT_PACK/SPECTRAL_PACK` | Provisional; caso límite; el asesor debe declarar si no lo soporta |
| La mano no se predice por el orden guardado del mazo | Dos mazos con las mismas cartas, orden de entrada distinto | No elegir automáticamente los primeros 8 IDs como cartas visibles | El juego baraja al cobrar `button_callbacks.lua:2912–2919`; robo usa el mazo real `state_events.lua:362–375` | Requisito del asesor; no reconstruye semilla ni orden real |
| Uso directo de la opción | Consumibles llenos; Arcana muestra Chariot; KH en mano | KH pasa a Steel; Chariot no se añade al inventario ni requiere hueco de consumible; saldo no vuelve a disminuir | `button_callbacks.lua:2209–2220` llama directamente a `use_consumeable`; efectos en L12 | Provisional; mano, consumibles y saldo antes/después |
| Solo cartas de mano | QS en el mazo pero no entre IDs visibles; usar Chariot sobre QS | Selección rechazada: no se elige una carta arbitraria del mazo | `card.lua:1106–1144,1564–1568`, objetivos `G.hand.highlighted` | Provisional; mano y selección; contrato de referencia se prueba aparte |
| Mega conserva mano después de la primera elección | Mega, mano `[KH,8D,...]`, Chariot sobre KH | Queda una elección; mismos IDs visibles, KH Steel; no se roba otra mano | `button_callbacks.lua:2267–2283` solo resta elección cuando quedan >1; no llama al robo inicial | Provisional; captura antes/después de primera elección |
| La segunda opción ve la primera transformación | Mega: Chariot sobre KH, después Devil sobre el mismo KH | Primera elección KH Steel; segunda KH Gold, no Steel+Gold; dos usos Tarot, sobre cerrado | Ruta anterior y `card.lua:1141–1144,223–299`; uso global L12 | Provisional; las dos cartas usadas y detalle de KH tras cada una |
| Elegir la última opción cierra | Normal elige una; Mega elige segunda | Vuelve a la tienda interrumpida; no genera una nueva tienda/ronda | `button_callbacks.lua:2279–2283,2565–2614` | Provisional; tienda/ofertas restantes tras cierre |
| Cierre devuelve mano, conserva cambios | Sobre con KH convertido a Steel; finalizar u omitir | KH sigue en el mazo con Steel; no sigue como mano activa del sobre | `button_callbacks.lua:2592`; `state_events.lua:1121–1125` mueve toda la mano al mazo | Provisional; cartas del mazo después de cerrar |
| Omitir conserva elección previa | Mega $8, $20 inicial, una transformación realizada y omitir resto | Saldo $12; transformación conservada; no devolución ni reversión; Red Card crece por omisión si está activo | `button_callbacks.lua:2558–2562`; reglas Red Card/omisión en L11 | Provisional; saldo, carta cambiada y Red Card si está presente |
| Omitir espera que el sobre esté disponible | Contenido presente; mano visible, o tamaño de mano ≤0 | Botón de omitir disponible; durante espera sin mano y tamaño positivo no se presume disponible | `button_callbacks.lua:2132–2139` | Provisional; el caso degenerado mazo vacío/tamaño positivo exige límite explícito si no se soporta |
| El próximo jefe no debilita esta mano de tienda | Tienda previa a The Head; convertir una carta a Wild dentro de Arcana | La carta no queda debuffed por el futuro The Head; ese jefe aún no está activo | `blind.lua:330–336` llama a `set_blind(nil)`; `78–88` limpia nombre/debuff; transformación vuelve a consultar ciega, L12 | Provisional; carta en sobre y jefe siguiente visibles |
| The Soul puede estar en Arcana | Arcana sin Omen Globe con opción Soul observada | Conservar identidad Spectral `c_soul`; no tratar como Tarot dirigido ni conceder Legendario sin implementar su uso | `card.lua:1734` crea Tarot con `soulable`; `common_events.lua:2088–2093`; identidad `game.lua:587` | Provisional; solo foto del contenido si aparece |
| Omen Globe amplía tipos posibles | Vale Omen Globe poseído; opción Spectral observada en Arcana | La opción es plausible; registrar identidad, pero limitar uso si su efecto no está implementado | `card.lua:1731–1734` selecciona generador Spectral; `game.lua:613` define vale | Provisional; vale poseído y contenido; no se requiere buscar todos los Spectral |
| Duplicados y Showman | Showman poseído; dos opciones del mismo Tarot con IDs distintos | Pueden conservarse como dos opciones distintas; elegir una no consume la otra | Pool `common_events.lua:1987–1988`; cada opción se crea por iteración `card.lua:1728–1735` | Provisional; foto solo si aparecen; no estimar frecuencias |
| No reconstruir pool para rechazar una observación | Opciones con identidad repetida registradas | No declarar imposible solo por ausencia de Showman sin modelar todos los casos de generación | `common_events.lua:2038–2043` incluye fallback cuando pool se agota | Limitación explícita: se verifica catálogo/referencias, no toda la elegibilidad de generación |
| Historial Tarot aumenta por opción usada | `tarotsUsed=7`, Empress sobre dos cartas dentro de Arcana | Total 8; no 9; Fortune Teller puede leer +8 Mult posteriormente | `card.lua:1091–1095`; `misc_functions.lua:1191–1206`; L12 | Provisional; contador si está disponible; no se inventa un total previo desconocido |
| Usar consumible propio no consume elección del sobre | Mega abierto y Tarot del inventario usado dentro del sobre | Esa ruta conserva elecciones del sobre | `button_callbacks.lua:2270–2273`, distingue `area == G.consumeables` | Provisional; **fuera del primer alcance**: no reutilizar la acción de elegir opción para un consumible propio |

En un sobre de tienda el estado activo de la ciega ya ha sido limpiado. `nextBlind` describe la próxima ciega y no autoriza aplicar su efecto a las cartas del sobre. El análisis contextual puede valorar esa amenaza futura por separado; no debe convertirla en un debuff actual.

Las doce transformaciones no añaden cartas, no cambian el tamaño de mano, no destruyen objetivos y no requieren nuevos robos después de cada uso. Strength, Death y Hanged Man necesitan otros contratos y permanecen fuera de este lote. También quedan fuera Emperor/High Priestess y efectos de azar: observar una opción no implementa su consecuencia ni justifica rellenar resultados desconocidos.

## Identidad de las fuentes

`version.jkr` contiene `1.0.1o-FULL`, `1.0.1o`, `PROD_PC_Console`. SHA-256 calculados de los bytes leídos el 18 de octubre de 2026:

| Archivo / entrada | SHA-256 |
|---|---|
| `Balatro.exe` | `0d75fe164accf3312734d4b37ac98788dd15f0b8e4f9bb8b7f90c4e59de93f47` |
| `version.jkr` | `a0525225e93bc81acd291aa4661e6648c8f3591ff34761bb3bee5319a766aaa3` |
| `game.lua` | `bbc67bd3fbadd1ea3f3f0aba07ef8596118d89ff1e9758718f9e17c07a96e912` |
| `card.lua` | `5073d834e08119da9516f1795a8c3d93110669aeb409c29ad1b308e0eb0be453` |
| `blind.lua` | `0a7e5fde144da36d4ca1a96950b4bf51e3c95be55fb02764a555de53a3bd8afb` |
| `functions/button_callbacks.lua` | `c88a74ca3a8fa8ace0ce46ad10a97238f347c292842c9164d11136fe9952c101` |
| `functions/common_events.lua` | `522ea0810101de1004685e13e7ed05a750b4e115e5231dca2cbc97aeb8c3e5fc` |
| `functions/state_events.lua` | `6c86aefb42d0323d737f87aaa84f53e42b755e72cd0bfd163b7d9cca5c0a99a9` |
| `functions/misc_functions.lua` | `c36ed54d8ab441be994a9afc5d38b8ac530f3b93995dfed424ec11f02e633198` |

Reproducir: leer el ejecutable con `zipfile.ZipFile`, calcular `hashlib.sha256` de cada entrada y consultar las líneas señaladas, sin extraer ni ejecutar código. Una huella diferente requiere revisar compatibilidad. Los literales sobre transformaciones son los de L12; las pruebas de copia, IDs, atomicidad, recarga, revisiones, fallo de cuota y deshacer son contratos de software del asesor.

## Evidencia manual mínima que falta

Versión/plataforma/mods ya declarados se conservan; solo hace falta avisar si cambiaron. No se pide recorrer el catálogo.

1. Un Arcana normal: precio y saldo antes de abrir; una captura con las tres opciones y mano visible; usar un Tarot dirigido sobre una carta conocida; detalle de carta, saldo y consumibles después de volver a tienda. Si el uso se hace con consumibles llenos, el mismo caso comprueba que la opción se usa directamente.
2. Cuando aparezca un Mega Arcana: contenido, mano y dos elecciones al abrir; tras el primer Tarot capturar la mano transformada y una elección restante; usar otro sobre la misma carta u omitir. Esto comprueba conservación de mano/cambios y cierre sin pedir otro conjunto completo de cartas.
3. Solo si aparece durante esas pruebas: Soul u otro Spectral con Omen Globe, Showman con duplicado, o Red Card al omitir se registra como evidencia adicional. Su ausencia no confirma ni refuta la rama estática.

No se han obtenido estas capturas de una partida en esta entrega. La observación pendiente permanece separada de cualquier prueba de navegador o del resultado de la integración.


## Implementación y verificación de software

La entrega efectiva, sus validaciones de mano completa, recarga y guardado, resultados de suites y continuación están en [DECK04b](../../arcana-deck04b.md). Las verificaciones del navegador no promueven estas reglas a observadas en Balatro.
