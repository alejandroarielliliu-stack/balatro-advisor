# L12 / DECK04 · Tarot con cartas objetivo

17 de octubre de 2026, Panamá. Compatible con **Steam PC 1.0.1o-FULL sin mods**. Inspección estática del ejecutable instalado en `C:/Program Files (x86)/Steam/steamapps/common/Balatro/Balatro.exe`, leído como ZIP con `zipfile.ZipFile`, sin ejecutar Balatro, alterar la instalación ni extraer Lua al repositorio.

**Regla `tarot.targets`: provisional, respaldada por inspección; observación en partida pendiente.** Las ramas descritas son código del juego inspeccionado, no resultados vistos durante una partida. Una prueba aprobada en el asesor contrasta su salida con un esperado independiente; no cambia este nivel de evidencia. No se redistribuyen fuentes Lua.

## Cobertura de esta comprobación

Doce Tarot deterministas que transforman cartas seleccionadas de la mano. El primer alcance del asesor registra el uso de un Tarot ya poseído, sobre cartas de mano conocidas durante `in_round`. Esa restricción es de producto: el ejecutable también permite estos efectos en determinados sobres con mano disponible. Arcana, Spectral, Standard, generación aleatoria, destrucción, cambio de rango y copia de cartas no se incorporan por esta evidencia.

Las cantidades indicadas son **máximos**, no cantidades obligatorias: el mínimo es una carta. No se usa una selección aleatoria ni se deduce qué cartas están en mano a partir del mazo completo.

| ID del asesor | ID del ejecutable | Cambio aplicado | Objetivos legales | Fuente primaria |
|---|---|---|---|---|
| `c_magician` | Igual | Mejora Lucky | 1–2 | `game.lua:534` |
| `c_empress` | Igual | Mejora Mult | 1–2 | `game.lua:536` |
| `c_hierophant` | **`c_heirophant`** | Mejora Bonus | 1–2 | `game.lua:538` |
| `c_lovers` | Igual | Mejora Wild | 1 | `game.lua:539` |
| `c_chariot` | Igual | Mejora Steel | 1 | `game.lua:540` |
| `c_justice` | Igual | Mejora Glass | 1 | `game.lua:541` |
| `c_devil` | Igual | Mejora Gold | 1 | `game.lua:548` |
| `c_tower` | Igual | Mejora Stone | 1 | `game.lua:549` |
| `c_star` | Igual | Palo base Diamonds (`D`) | 1–3 | `game.lua:550` |
| `c_moon` | Igual | Palo base Clubs (`C`) | 1–3 | `game.lua:551` |
| `c_sun` | Igual | Palo base Hearts (`H`) | 1–3 | `game.lua:552` |
| `c_world` | Igual | Palo base Spades (`S`) | 1–3 | `game.lua:554` |

La diferencia ortográfica de Hierophant requiere un mapeo explícito entre metadatos/ilustración y la identidad canónica del asesor; no son dos cartas distintas.

## Matriz de reglas y casos mínimos

Los resultados esperados se deducen de las ramas citadas, independientemente del motor TypeScript. En «observado» se registra únicamente la inspección estática realizada. **Todos los casos siguen pendientes de contraste en una partida.**

| Regla o hipótesis | Caso mínimo | Resultado esperado independiente | Observado en fuente / evidencia | Estado y dato pendiente |
|---|---|---|---|---|
| Objetivos de la mano actual | Mazo contiene 8H, mano contiene solo 9S; usar Chariot sobre 8H | Acción no disponible: no se selecciona una carta fuera de la mano | `card.lua:1106–1144` opera sobre `G.hand.highlighted`; legalidad `1564–1568` | Provisional; mano y selección visibles antes de usar |
| Cantidad entre uno y máximo | Magician con 0, 1, 2 y 3 seleccionadas | Rechazar 0/3; admitir 1/2 | `game.lua:534`; `card.lua:1565–1568`, mínimo por defecto 1 y máximo efectivo `mod_num`; `4154–4155` | Provisional; botones al seleccionar 0/1/2/3 |
| Fase estable | Tarot objetivo durante selección de mano, frente a animación de mano jugada | Disponible con selección válida; bloqueado durante juego/robo/uso y bloqueos del controlador | `card.lua:1523–1528,1564–1578` | Provisional; este lote usa `in_round`, no intenta modelar animaciones |
| Una mejora reemplaza la anterior | 8H Bonus → Empress | Misma carta 8H, mejora Mult; no conserva Bonus como segunda mejora | `card.lua:1141–1144`, `223–299` reemplaza centro/atributos | Provisional; descripción de la carta antes/después |
| Preservar valores independientes | KH Foil, Red seal, +10 fichas permanentes, mejora Gold → Chariot | Misma identidad/rango/palo, Foil, Red y +10 conservados; mejora Steel | `card.lua:223–299` conserva `perma_bonus` y no sustituye `base`, `edition` ni `seal` | Provisional; carta desplegada antes/después |
| No convertir fichas de Bonus en permanentes | 8H Bonus, +10 permanentes → Mult | Mejora Mult y +10 permanentes; no +40 permanentes | `card.lua:273–299` y cálculo de fichas `976–981`; Bonus +30 en `game.lua:648` | Provisional; distinguir fichas por mejora y permanentes |
| Stone conserva base latente | QS Stone → Chariot | QS Steel; reaparece el rango/palo que Stone ocultaba | `set_ability`, `card.lua:223–365`, no cambia `base`; Stone no aporta ID normal `957–961` ni palo `4078–4079` | Provisional; usar una Stone cuya base se conocía antes de convertirla |
| Suit no sustituye mejora | 8H Steel → Star | 8D Steel; edición, sello y permanentes conservados | `card.lua:1137–1140`; `change_suit:547–561` cambia base | Provisional; carta desplegada antes/después |
| Suit en Stone modifica palo latente | QS Stone → Sun; después Chariot | QH Stone; después QH Steel. Stone sigue sin contar como Hearts mientras es Stone | `card.lua:547–561,4078–4079`; `set_ability:223–365` | Provisional; dos usos secuenciales y base conocida |
| Suit en Wild no elimina Wild | 8S Wild → Moon | 8C Wild, aún tratada como todos los palos cuando activa | `card.lua:547–561,4081–4087` | Provisional; descripción/selección conservada |
| Una transformación sin cambio es legal | 8H Steel → Chariot; 9D base → Star | Se consume el Tarot aunque la mejora/palo ya coincida; uso global aumenta una vez | `card.lua:1564–1568` solo restringe cantidad, sin excluir coincidencias; `1093`; `misc_functions.lua:1197–1199` | Provisional; inventario y contador antes/después |
| Mejorar no puntúa ni paga por sí solo | $20; 8H → Devil | Carta Gold, saldo sigue $20; no se acreditan $3 en el momento del uso | `card.lua:1101–1151` aplica mejora; Gold configura `h_dollars=3`, `game.lua:654` | Provisional; saldo antes/después; cobro de fin de ronda es otro evento |
| Tarot se consume sin gastar mano/descarte | Dos manos y tres descartes disponibles, un Chariot poseído | Tarot retirado, recursos de ronda intactos | `functions/button_callbacks.lua:2209–2220,2256–2260`; `card.lua:1091–1151` no resta esos recursos | Provisional; consumibles y recursos antes/después |
| Historial global se incrementa una vez | `tarotsUsed=7`, usar Empress en dos cartas | `tarotsUsed=8`, no 9; efecto en ambas cartas | `card.lua:1093` llama una vez a `set_consumeable_usage`; `misc_functions.lua:1191–1206` cuenta carta usada, no objetivos | Provisional; historial anterior explícito y contador Fortune Teller después |
| Fortune Teller lee historial, no crece por copia | Tarot usados 7, Fortune Teller y Blueprint; usar Chariot | Historial 8; cada aplicación puntuable de Fortune Teller lee +8 Mult; no se suman dos usos al historial | `card.lua:2722–2725` muestra total físico; `4016–4019` lee total al puntuar | Provisional; contador global y puntuación en caso independiente |
| Orden del registro de uso | Usar un Tarot compatible | Conteo de uso antes de transformación; después hook `using_consumeable` | `card.lua:1091–1095`; `button_callbacks.lua:2218–2220` | Provisional; implementación puede obtener mismo estado final, sin duplicar hook |
| No inventar un historial desconocido | Uso actual conocido pero total anterior sin registrar | El total anterior no puede deducirse ni sustituirse por cero | Contrato de información del asesor, coherente con lectura global `4016–4019` | Requisito del asesor; no es una regla observada en Balatro |

Si el asesor desconoce el total anterior de Tarot, la transformación local puede seguir siendo legal: el juego conoce su contador, pero el registro manual está incompleto. El asesor conserva esa incertidumbre y debe comunicar que no obtiene un nuevo total exacto ni un resultado exacto de Fortune Teller. No asigna cero ni impide por ese solo motivo una transformación independiente. Cuando el total está conocido, el hook compartido lo incrementa una vez.

Cambiar una carta no equivale a crear otra. No debe dispararse `playing_card_added`, crecimiento de Hologram ni destrucción de Glass/Canio por reemplazar una mejora. Las rutas de transformación anteriores no llaman a esos eventos.

## Debuff: no basta con conservar la bandera

`Card:set_ability`, `card.lua:365`, vuelve a consultar la ciega. `Card:change_suit`, `547–561`, hace lo mismo al cambiar la base. `Blind:debuff_card`, `blind.lua:624–652`, decide a partir de palo efectivo, cara, cartas jugadas en el ante para Pillar, valor/nominal y Verdant Leaf. Al no activarse ninguna condición, limpia la bandera. Una edición o un sello no se elimina por esa operación.

Casos esperados independientes que detectan una conservación incorrecta de `debuff`:

| Contexto conocido | Transformación | Esperado |
|---|---|---|
| The Head activo, sin Smeared | 8H debuffed → Star | 8D no debuffed |
| The Head activo | 8S base → Lovers | Wild debuffed: el palo Hearts cuenta también |
| The Head activo, sin Pareidolia relevante | 8H debuffed → Tower | Stone no debuffed, porque no tiene palo efectivo |
| The Head activo | Stone con base latente 8H → Chariot | Steel debuffed, porque reaparece Hearts |
| The Head activo y Smeared activo | 8H → Star | 8D sigue debuffed: Smeared empareja Hearts/Diamonds |
| The Plant activo, sin Pareidolia | KH → Tower | Stone deja de ser cara y se limpia debuff |
| The Plant activo y Pareidolia activo | KH → Tower | Sigue siendo cara por Pareidolia; conserva debuff |

Fuentes: condiciones de ciega `blind.lua:624–652`; palos `card.lua:4064–4087`; caras `964–969`; definiciones The Head/Plant `game.lua:284,286`. **Provisional, sin observación en partida.**

El motor debe recalcular solo cuando los datos/reglas disponibles lo permitan. Si no puede resolver un jefe o su historial, debe rechazar o limitar la transformación afectada; preservar la bandera a ciegas, limpiarla siempre o afirmar éxito son resultados incorrectos. Un jefe que no cambie debuffs de cartas no justifica bloquear automáticamente un uso independiente. Véase la cobertura efectiva y los errores del módulo, sin confundirla con toda la mecánica del juego.

## Identidad de las fuentes inspeccionadas

`version.jkr` contiene `1.0.1o-FULL`, `1.0.1o`, `PROD_PC_Console`. Las huellas coinciden con entregas previas; se añade `blind.lua` para el refresco de debuff.

| Archivo / entrada | SHA-256 |
|---|---|
| `Balatro.exe` | `0d75fe164accf3312734d4b37ac98788dd15f0b8e4f9bb8b7f90c4e59de93f47` |
| `version.jkr` | `a0525225e93bc81acd291aa4661e6648c8f3591ff34761bb3bee5319a766aaa3` |
| `game.lua` | `bbc67bd3fbadd1ea3f3f0aba07ef8596118d89ff1e9758718f9e17c07a96e912` |
| `card.lua` | `5073d834e08119da9516f1795a8c3d93110669aeb409c29ad1b308e0eb0be453` |
| `blind.lua` | `0a7e5fde144da36d4ca1a96950b4bf51e3c95be55fb02764a555de53a3bd8afb` |
| `functions/button_callbacks.lua` | `c88a74ca3a8fa8ace0ce46ad10a97238f347c292842c9164d11136fe9952c101` |
| `functions/misc_functions.lua` | `c36ed54d8ab441be994a9afc5d38b8ac530f3b93995dfed424ec11f02e633198` |

Reproducir esta inspección: abrir el ejecutable como ZIP en memoria, leer cada entrada, calcular SHA-256 de sus bytes y consultar los números de línea indicados. No es necesario extraer ni ejecutar su contenido. Una huella o versión diferente exige revisar la compatibilidad antes de reutilizar esta evidencia.

## Contraste manual mínimo pendiente

No se vuelve a solicitar toda la colección. Versión Steam PC sin mods ya declarada por el usuario: solo hace falta avisar si cambió.

1. Cuando aparezca **Hierophant**, comprobar el límite con una captura al seleccionar dos y otra al seleccionar tres (botón usar disponible/bloqueado). Usarlo en una carta Steel permite comprobar reemplazo por Bonus: detalle antes/después, identidad de carta y Tarot, inventario y manos/descartes. Así se contrasta también la identidad canónica `c_hierophant` frente al nombre/ilustración del juego, cuyo código interno usa `c_heirophant`. Si tiene edición/sello/permanentes, desplegarla antes/después comprueba preservación sin otro lote. Si no aparece, Magician o Empress comprueban el mismo límite y Hierophant queda pendiente; no se afirma haberlo observado.
2. Cuando aparezca una conversión de palo, capturar la misma carta antes/después y el nombre de la ciega. El mínimo útil bajo jefe es **Star sobre una Hearts debuffed en The Head, sin Smeared**: debe quedar Diamonds sin debuff. Si aparece otro caso, registrarlo como otro caso; no se necesita buscar todos los jefes ni reemplazar esa evidencia por una captura de un jefe distinto.
3. Si está Fortune Teller, capturar su Mult antes y después de un único uso, incluso con dos objetivos. Esto contrasta incremento único; no demuestra por sí solo toda la puntuación de la mano.

Las capturas del navegador y las pruebas de almacenamiento del asesor verifican su interfaz y contrato. No sustituyen ninguna de esas observaciones del juego. Los resultados concretos de las suites se registran en la documentación de entrega; este archivo conserva los esperados primarios aunque cambie el número de pruebas.
