# BOSS-CATALOG-01: catálogo de jefes, objetivo y premio

7 de noviembre de 2026. Investigación e inspección **estática** del código del juego publicado en un espejo, fijado al commit `f081d0e41508d9dcc7a01cba5bffcccfbb115af1`. No se ejecutó Balatro en esta tarea ni se observó una partida. Los resultados no se presentan como evidencia E. El registro es provisional para el modelo y compatible con el perfil existente Steam **1.0.1o-FULL**, sin mods, Blanca, antes 1–8.

La compatibilidad no se deduce del nombre de un archivo de terceros: las huellas de `game.lua`, `common_events.lua` y `state_events.lua` coinciden con la [inspección local L01](h2-inspeccion-local.md), que identificó esa instalación y su `version.jkr`. El espejo no es una distribución oficial ni una licencia sobre el código o el arte.

## Hallazgos comprobados en la fuente

- Hay **23 jefes ordinarios** y **5 finales**. Los ordinarios pagan **$5**; los cinco finales pagan **$8**, incluyendo Bellota, Hoja, Corazón y Campana. El premio no depende del ante dentro de cada categoría. Es falso que todos los jefes paguen lo mismo, y también que únicamente Contenedor violeta pague $8.
- Casi todos exigen **×2** de la base del ante. Las excepciones son **La aguja ×1**, **El muro ×4** y **Contenedor violeta ×6**. No confundir la reducción de fichas/Mult base de **El pedernal** con una reducción del objetivo de la ciega: su objetivo conserva ×2.
- Para Blanca y escalado normal, las bases de los antes 1–8 son `300, 800, 2000, 5000, 11000, 20000, 35000, 50000`. El objetivo incorpora el multiplicador de jefe y el de baraja. Plasma aplica ×2 al objetivo; no al premio. Otros stakes usan otras tablas y permanecen fuera del cálculo admitido.
- El premio de la ciega es una línea del cobro. No incluye manos sobrantes, intereses, comodines ni etiquetas. El símbolo «+» que aparece detrás de los dólares en la selección del juego señala que puede haber otros ingresos, no que el premio de jefe crezca con el ante. Retos/modificadores pueden suprimir premios: no trasladar silenciosamente sus reglas a Blanca normal.
- Los jefes ordinarios tienen un ante mínimo. Los finales se seleccionan cuando `ante % win_ante == 0`; la partida estándar fija `win_ante=8`. Dentro del objetivo de esta aplicación, ordinarios antes 1–7 y finales en 8. Sus campos originales `boss.min=10` y `boss.max=10` **no** significan que aparezcan por primera vez en el ante 10: esa rama usa `showdown` y el módulo, no esos límites. El campo `max` tampoco se aplica como un tope de selección ordinaria en `get_new_boss`.
- Desactivar **El muro** reduce su objetivo a la mitad y desactivar **Contenedor violeta** lo divide entre tres; ambos quedan en ×2. El catálogo describe el jefe activo y su premio base. Un objetivo realmente observado o un jefe desactivado no debe sustituirse por el valor activo sin comprobar el contexto.

El catálogo implementable vive en [bosses.ts](../../src/catalog/bosses.ts). Tiene identidad canónica, nombre español original, nombre inglés, descripción propia fiel a la regla, texto corto, premio, multiplicador, disponibilidad, identificador de ilustración y datos dinámicos necesarios. Evita repetir esas 28 fichas en este documento. Sus ilustraciones ya están en el [atlas local](../../web/assets/blinds/README.md); las posiciones originales `bl_*` se conservan como `artId`, separadas de los IDs de estado `the_*` y los cinco finales.

## Casos mínimos y distinción de evidencia

Valores literales de contraste obtenidos de las tablas y ramas del juego, antes de invocar el motor de la aplicación. Son casos sintéticos legales dentro del perfil; **«observado» significa leído en el código**, no visto jugar.

| Regla/hipótesis | Caso mínimo | Esperado por la fuente | Observado estáticamente | Estado |
| --- | --- | --- | --- | --- |
| Jefe ordinario normal | Roja, Blanca, ante1, La ventana activa | Objetivo600, premio$5 | Base300, multiplicador2, dólares5 | Provisional; sin captura en juego |
| El ante cambia la base | Mismo contexto, ante2, La ventana | Objetivo1600, premio$5 | Base800; mismo multiplicador y dólares | Provisional; no se calcula en una sesión real |
| Aguja es la excepción ×1 | Roja, Blanca, ante2, La aguja | Objetivo800, premio$5; una mano disponible por su efecto | Configuración mult1/dólares5; `set_blind` resta las manos extra | Provisional; mostrar metadata no implementa ese efecto |
| Muro es ×4 | Roja, Blanca, ante2, El muro activo | Objetivo3200, premio$5 | Configuración mult4/dólares5 | Provisional |
| Finales comparten premio | Roja, Blanca, ante8, Bellota/Hoja/Corazón/Campana | Objetivo100000, premio$8 | Las cuatro entradas tienen mult2/dólares8 | Provisional |
| Violeta es ×6 | Roja, Blanca, ante8, Contenedor violeta activo | Objetivo300000, premio$8 | Base50000, mult6/dólares8 | Provisional |
| Plasma no multiplica dólares | Plasma, Blanca, ante8, Contenedor violeta activo | Objetivo600000, premio$8 | `ante_scaling=2` interviene en fichas, no en dólares | Provisional |
| Desactivación de tamaño | Muro ante2, jefe ya desactivado | Objetivo1600; premio base sigue$5 | `disable` divide fichas por2 sin reescribir dólares | Provisional; no inferir si está desactivado |
| La disponibilidad no es el multiplicador | Buey en ante1 o final en ante7 | No pertenece al pool estándar de ese ante | Buey mínimo6; finales reservados al módulo de8 | Inspección del pool, no prueba de RNG |

Estas cifras son objetivos y premios base, no estimaciones de supervivencia ni probabilidades de ganar. No se ha probado que una mano o un mazo concreto supere esos objetivos.

## Efectos variables que no se deben inventar

- **El buey:** necesita el tipo concreto indicado por el juego. `most_played_poker_hand` se actualiza al finalizar el jefe anterior y se utiliza para localizar/comprobar este efecto; el historial actual de manos no basta para reconstruir esa referencia congelada de forma general. El texto del catálogo habla de «la mano indicada» y declara `ox_target_hand` pendiente de observar.
- **La rueda:** la rama usa `probabilities.normal/7`; 1/7 es el valor normal, no una probabilidad universal con modificadores. No generar una carta oculta ni su identidad a partir de ese número.
- **El ojo / La boca / El pilar:** requieren los tipos ya jugados, el primer tipo de la ronda o las cartas jugadas durante el ante, respectivamente. El catálogo no inventa ese historial.
- **El garfio / Bellota / Corazón / Campana:** necesitan resultados aleatorios observados o un modelo posterior validado. Se describe su efecto; no se predice el descarte, orden, comodín inhabilitado o carta obligatoria.
- Cartas que cuentan como otro palo o como figuras pueden alterar qué se debilita. La descripción por palo/figura no sustituye las reglas de Wild, Stone, Pareidolia o de las demás interacciones.
- **El pedernal:** `modify_hand` aplica su redondeo sobre fichas y Mult base; añadir el texto al catálogo no amplía por sí solo el motor de puntuación. La cobertura de cálculo debe seguir declarándose por separado.

## Fuentes y reproducción

Código primario del juego accesible en un espejo de terceros, inspeccionado sin ejecutar Lua. Enlaces fijados; las líneas corresponden a los bytes descargados, no a la numeración adaptada por el visor web:

1. [game.lua](https://github.com/Jofr3/balatro-source/blob/f081d0e41508d9dcc7a01cba5bffcccfbb115af1/game.lua#L263-L295): `P_BLINDS`, 30 identidades incluyendo Pequeña/Grande, premios, multiplicadores, mínimos, `showdown`, posiciones; Plasma641, `win_ante=8`1884 y otros stakes/modificadores2051–2057/2110–2116.
2. [blind.lua](https://github.com/Jofr3/balatro-source/blob/f081d0e41508d9dcc7a01cba5bffcccfbb115af1/blind.lua): `set_text`43–71 y `set_blind`72–207, objetivo107; `disable`355–395; descartes/efectos464–569; cartas obligatorias/ocultas/debilitadas574–650. El Buey y el redondeo de Pedernal se verifican aquí, no solo en su texto traducido.
3. [misc_functions.lua](https://github.com/Jofr3/balatro-source/blob/f081d0e41508d9dcc7a01cba5bffcccfbb115af1/functions/misc_functions.lua#L919-L954): `get_blind_amount`, tabla normal y tablas de otros escalados; no se añade endless al alcance de la aplicación.
4. [common_events.lua](https://github.com/Jofr3/balatro-source/blob/f081d0e41508d9dcc7a01cba5bffcccfbb115af1/functions/common_events.lua#L2338-L2380): `get_new_boss`, mínimos ordinarios y selección final por módulo.
5. [state_events.lua](https://github.com/Jofr3/balatro-source/blob/f081d0e41508d9dcc7a01cba5bffcccfbb115af1/functions/state_events.lua): referencia de mano del Buey129–138; `evaluate_round`1134 en adelante separa premio de ciega y otros ingresos.
6. [UI_definitions.lua](https://github.com/Jofr3/balatro-source/blob/f081d0e41508d9dcc7a01cba5bffcccfbb115af1/functions/UI_definitions.lua): selección1548/1598, popup4093–4130; distingue fichas objetivo, dólares y efecto.
7. [Localización española](https://github.com/Jofr3/balatro-source/blob/f081d0e41508d9dcc7a01cba5bffcccfbb115af1/localization/es_ES.lua#L133-L338) e [inglesa](https://github.com/Jofr3/balatro-source/blob/f081d0e41508d9dcc7a01cba5bffcccfbb115af1/localization/en-us.lua#L133-L338): nombres y contraste semántico de las descripciones. Las descripciones de aplicación se redactan para el contexto del asesor; no son una copia completa de esos archivos.

| Archivo inspeccionado | SHA-256 |
| --- | --- |
| `game.lua` | `bbc67bd3fbadd1ea3f3f0aba07ef8596118d89ff1e9758718f9e17c07a96e912` |
| `blind.lua` | `0a7e5fde144da36d4ca1a96950b4bf51e3c95be55fb02764a555de53a3bd8afb` |
| `functions/misc_functions.lua` | `c36ed54d8ab441be994a9afc5d38b8ac530f3b93995dfed424ec11f02e633198` |
| `functions/common_events.lua` | `522ea0810101de1004685e13e7ed05a750b4e115e5231dca2cbc97aeb8c3e5fc` |
| `functions/state_events.lua` | `6c86aefb42d0323d737f87aaa84f53e42b755e72cd0bfd163b7d9cca5c0a99a9` |
| `functions/UI_definitions.lua` | `e41dcdb24fb66faeb9e3809ea3e4252716d61836ef152677e39245a28fca6eb8` |
| `localization/es_ES.lua` | `98a18d2e15ed30cda13b163b28a7204073f3d2403793e4e8a5a5d20ceb096f28` |
| `localization/en-us.lua` | `a346c3ffbb39886694868b832c7d748e156a78740446ce3f7fd9bcdbf90a1b98` |

Para repetir, descargar las rutas del commit fijado, calcular SHA-256 sobre los bytes, localizar las tablas/funciones anteriores y comparar los casos literales. No ejecutar el código descargado ni elevar una suma o una prueba de la aplicación a observación del juego. Una comprobación posterior en una partida debe registrar versión/plataforma/mods y mostrar ante, baraja, stake, jefe, objetivo y premio; bastan casos mínimos representativos, no exigir capturas de todo el catálogo.
