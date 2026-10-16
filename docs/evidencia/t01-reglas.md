# T01 — verificación de reglas y acceso al juego

Fecha: 2026-10-08. Contrato propuesto: `balatro-pc-1.0.1f-blue-white-v1`.

**Estado actual H2:** instalación localizada e inspeccionada en modo lectura. [L01](h2-inspeccion-local.md) identifica 1.0.1o-FULL y sustenta U1/U2 como reglas provisionales implementables; ningún caso se ejecutó en una partida. Este documento conserva el protocolo y los resultados históricos. La entrega H2 queda parcial hasta contrastar los resultados; [cobertura actual](../motor-h2.md).

**Información posterior del usuario:** juego instalado, Steam sin mods, versión transcrita `1.01o-full`. Es declaración, no observación propia. La [primera tanda adaptada](t01-tanda-usuario.md) sustituye la solicitud de identificación anterior; conserva la cadena literal y trata esta instalación como candidata, sin certificar equivalencia con 1.0.1f. La búsqueda local de la sección 1 es histórica.

**Cierre histórico de H1, 2026-10-09: investigación y protocolo disponibles; ejecución en el juego pendiente. H0 cerrado como planificación y H1 implementado en estructura/persistencia, según la instrucción revisada del usuario.** En aquel cierre no se obtuvo una observación de partida ni se leyó el código de una instalación identificada. H2 añadió posteriormente L01. El campo «observado en juego» permanece expresamente sin datos.

## 1. Separación de proyectos y búsqueda local

Comprobaciones realizadas por lectura del filesystem, registro de Windows y procesos; no son pruebas de las reglas de Balatro.

| Comprobación | Esperado / objetivo | Observado | Evidencia y estado |
| --- | --- | --- | --- |
| Ubicación inicial | Localizar los documentos sin tocar Roblox. | Los seis Markdown estaban en `roblox studio/docs/`, no en `ProjectBonk/docs/`. | Inventario local leído. Confirmado. |
| Espacio propio | Balatro fuera del directorio de Project Bonk y de las raíces de Script Sync. | Documentos trasladados a `roblox studio/balatro-advisor/docs/`; README propio y enlace desde la ubicación antigua. | Hash SHA-256 de cada uno de los seis archivos idéntico antes/después del traslado, antes de las actualizaciones T01. Confirmado. |
| Topología Git | No inicializar ni anidar otro repositorio. | `git rev-parse --show-toplevel` desde raíz y desde `balatro-advisor/` devuelve `C:/Users/usuario/OneDrive/Documents/roblox studio`; `balatro-advisor/.git` no existe. | Comandos locales. Se conserva el `.git` preexistente de `ProjectBonk/`. Confirmado. |
| Proceso de juego | Detectar una sesión de Balatro disponible. | Steam está abierto; no se encontró proceso llamado Balatro. | Consulta `Get-Process -Name Balatro,steam`. No acredita ausencia de procesos con otros nombres. Acceso al juego no confirmado. |
| Instalación Steam | Localizar app 2379780 en las bibliotecas registradas. | `libraryfolders.vdf` registra la biblioteca revisada en `C:/Program Files (x86)/Steam`; no existe su `steamapps/appmanifest_2379780.acf`. | Rutas Steam del registro y archivo de bibliotecas. No se encontró instalación registrada. |
| Otras ubicaciones habituales | Buscar un ejecutable/acceso directo identificable sin recorrer todo el disco. | Sin coincidencias de nombres Balatro en Descargas, Escritorio OneDrive, Documentos OneDrive y menús Inicio revisados; sin entrada de desinstalación identificada como Balatro. | Búsqueda de nombres mediante `rg --files` y consultas de desinstalación. Puede existir otra ruta o nombre no revisado. |
| Datos antiguos | Comprobar si son una instalación ejecutable. | Existe `%APPDATA%/Balatro/`, con carpeta `1` y `settings.jkr` de agosto de 2025. | Solo se inspeccionaron nombres/metadatos; no se cargaron ni alteraron partidas. Estos archivos no prueban build, reglas ni ejecutabilidad. |

No se abrió, instaló o modificó Balatro, no se editó un guardado y no se utilizó un mod para fabricar los casos. Si existe una instalación en otra ruta, basta aportar su ubicación exacta para intentar localizarla; eso todavía no equivale a disponer de control de su interfaz ni a haber ejecutado las pruebas.

Verificación histórica al terminar T01 (2026-10-08): los hashes SHA-256 de todos los archivos versionados de Project Bonk coincidieron con los registrados al iniciar T01, y su lista de cambios locales permaneció igual. Entonces se comprobaron nueve Markdown, 32 enlaces locales y el parseo del JSON sintético del modelo. Son controles de integridad documental, no evidencia E de Balatro. La entrega H1 posterior se registra por separado.

## 2. Investigación documental y fuente primaria recuperada

Clases de evidencia: **P-documental**, publicación original del desarrollador; **D-documental**, descripción comunitaria; **E-observada**, resultado visible en una build identificada. Una observación que aporte el usuario se identifica además como «ejecutada por el usuario, revisada por Codex», nunca como ejecución propia.

| ID | Fuente consultada y método | Hallazgo y límite |
| --- | --- | --- |
| P01 | [Anuncio oficial 1.0.1f](https://steamcommunity.com/games/2379780/announcements/detail/4208127528883891676). La apertura web no devolvió texto útil; se recuperó mediante la [API pública Steam News](https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=2379780&count=100&maxlength=0&enddate=1714694400), usando `Invoke-RestMethod`. | Entrada de LocalThunk, título `1.0.1f - Patch notes`, fecha 2024-05-01 16:37:33 UTC, feed `steam_community_announcements`, gid `5766372999940479946`. Confirma existencia del parche y el cambio de Banner a 30 fichas por descarte. No identifica la build del usuario ni verifica un evento ejecutado. |
| D01 | [Economy: Money, Interest & the Shop](https://teemo.dev/game-design/balatro/systems/economy-money-interest-and-the-shop/), apertura web, sección 8.1. | Describe interés sobre saldo anterior al cobro, excluyendo recompensa, manos y Golden del cobro actual. Apoya U1, no la confirma en la build objetivo. |
| D02 | [Guide: Activation Sequence](https://balatrogame.fandom.com/wiki/Guide%3A_Activation_Sequence), contenido indexado en búsqueda; apertura directa restringida. | Sitúa el crecimiento de Green antes de puntuar. Apoya U2; no es captura ni traza del juego. |
| D03 | [Green Joker](https://balatrogame.fandom.com/wiki/Green_Joker), contenido indexado. | Describe incremento por mano, reducción por acción de descarte y suelo cero. No confundir el número de cartas con el número de acciones. Sigue faltando E. |

La API P01 no contiene el término `interest`; la mención de Green en el parche trata de compatibilidad con Perishable, no demuestra su momento de incremento. Por ello no se usa el anuncio para resolver U1 o U2.

Para repetir la consulta P01: recuperar el endpoint indicado, seleccionar título exacto y autor `LocalThunk`; leer `contents` y calcular SHA-256 de sus bytes UTF-8. Hash obtenido: `03f20b5638d9677bd0b40602cbae2725167bfb3607b714eb7e5364ef3353089d`. Es huella del texto de la noticia, **no** del ejecutable. La fuente primaria confirma documentalmente Banner para ese parche; no se redistribuye el texto completo de la noticia.

## 3. Matriz de hipótesis y pruebas pendientes

Todos los resultados numéricos siguientes son **esperados**, calculados a partir de hipótesis. No son resultados observados. Un caso fallido se registra como contradicción y conserva la evidencia; no se cambia la expectativa para simular una prueba aprobada.

### Versión y configuración (U3)

| ID | Regla / hipótesis | Caso mínimo y esperado | Observado en juego | Fuente / estado |
| --- | --- | --- | --- | --- |
| V01 | Se puede probar el contrato en PC Steam 1.0.1f-FULL, sin mods. | Menú con cadena completa de versión; confirmar PC Steam y ausencia de mods. Esperado: build propuesta. | No observado; no se localizó instalación ejecutable. | P01 solo confirma existencia del parche. **Pendiente** identificar la build real. |
| V02 | Blue/White tiene recursos base 5/3/8/5 y mazo de 52. | Inicio de Small/Big sin modificadores: baraja, dificultad, manos, descartes, ocho cartas y capacidad de cinco comodines. | No observado. | Fuentes R-BASE del [registro de reglas](../reglas-y-fuentes.md). **Pendiente E**. |
| V03 | Bases de manos y objetivos coinciden con R-BASE/R-BLIND. | Capturar tabla de nueve manos nivel 1; objetivos de las ciegas de fixtures y textos de los cuatro jefes cubiertos. Esperados según tablas del registro, sin mezclar versiones. | No observado. | Evidencia D previa; no se interpreta P01 como validación de toda la tabla. **Pendiente E**. |
| V04 | Ocho efectos, precios y ventas base coinciden con R-J. | Capturas de tooltip/tienda/venta de cada uno, sin ediciones, descuentos o modificadores de valor. Esperados: tabla R-J. La colección puede verificar texto, pero no sustituye un precio ausente. | No observado. | P01 confirma únicamente el cambio de Banner; resto D. **Pendiente E** para contrato completo. |

### Intereses y cobro (U1)

Preparación común: Blue/White, Small o Big ganada, sin vales de interés, tags, sellos/cartas que produzcan dinero, alquileres ni dinero durante la ronda. Se pueden conservar comodines que solo puntúen, anotándolos. `B` es el dinero **inmediatamente antes del cobro**, `R` la recompensa visible de ciega, `H` las manos sobrantes. No usar el saldo de una captura antigua de tienda si hubo cambios después. R y H deben anotarse en cada caso.

| ID | Hipótesis | Caso mínimo / resultado esperado | Observado en juego | Evidencia / estado |
| --- | --- | --- | --- | --- |
| I01 | Recompensa y manos no se incorporan a la base del interés del mismo cobro. | B=19, sin Golden: interés 3, saldo final `19+R+H+3`. Con R=3/H=2: 27. Si se incluyera ese cobro en la base daría interés 4: el caso discrimina las hipótesis. | No observado. | D01; faltan capturas antes/cobro/después. **Pendiente E**. |
| I02 | Golden tampoco incrementa esa base de intereses. | B=19 y un Golden: línea Golden 4, interés 3; saldo final `19+R+H+4+3`. Con R=3/H=2: 31. Incluir Golden en la base daría al menos interés 4. | No observado. | D01 y ficha Golden de R-J. **Pendiente E**. |
| I03 | El tramo inferior a 25 paga cuatro. | B=24 sin Golden: interés 4, saldo `24+R+H+4`. | No observado. | D01. **Pendiente E**. |
| I04 | El umbral 25 paga cinco. | B=25 sin Golden: interés 5, saldo `25+R+H+5`. | No observado. | D01. **Pendiente E**. |
| I05 | El tope realmente limita el interés y no solo coincide con floor(25/5). | B=30 sin Golden: interés 5, no 6; saldo `30+R+H+5`. | No observado. | D01. **Pendiente E**. Se añade a T01 porque probar solo 25 no demuestra el tope. |

No hace falta usar la misma semilla ni igual R/H en los cinco casos. No se exige fabricar exactamente R=3/H=2: es solo ejemplo de saldo final. Los saldos 19, 24, 25 y 30 sí permiten distinguir los límites. Si se dispone de otro saldo, registrarlo y evaluar si diferencia las hipótesis antes de aceptarlo como sustituto. Ningún caso al tope puede demostrar por sí solo la exclusión de Golden, porque el tope puede ocultar la diferencia.

### Green Joker (U2)

Preparación común: Small/Big, Green normal recién comprado con contador 0, sin otros bonus de puntuación, cartas normales y High Card nivel 1 (5 fichas ×1 Mult). No usar jefe con efecto sobre manos/puntuación. No importa el palo. Una grabación continua a velocidad lenta facilita observar el orden; alternativamente capturas de estado antes y después y del desglose final de cada mano.

| ID | Hipótesis | Caso mínimo / resultado esperado | Observado en juego | Evidencia / estado |
| --- | --- | --- | --- | --- |
| G01 | El incremento se aplica a la propia mano que lo provoca. | Green 0, jugar solo K: fichas 15, Mult final 2, puntos de la mano 30, contador después 1. Incremento posterior habría dado 15, aun terminando con contador 1. | No observado. | D02/D03. **Pendiente E**. Ver solo el contador después no resuelve esta duda. |
| G02 | Crece en cada mano consecutiva. | Tras G01, jugar Q normal: contador 1→2, fichas 15, Mult 3, puntuación de mano 45; acumulado de esas dos manos 75. | No observado. | D02/D03. **Pendiente E**. |
| G03 | Descartar varias cartas es un solo decremento. | Con contador 2 y descartes disponibles, seleccionar tres cartas y pulsar Descartar una vez. Contador esperado 1; recurso descartes disminuye en uno. | No observado. | D03. **Pendiente E**. |
| G04 | El contador no baja de cero. | Tras G03, descartar una carta → contador 0; otra acción de descarte → sigue 0. Con los tres descartes iniciales esta secuencia es legal. | No observado. | D03. **Pendiente E**. |
| G05 | Crecimiento después de tocar el suelo. | Tras G04, jugar J normal: contador 0→1, 15×2=30 puntos de esa mano. | No observado. | D02/D03. **Pendiente E**. |

Para obtener la secuencia en una ronda no es obligatorio disponer de K/Q/J: cualquier carta normal individual sirve si se anota su rango y se recalcula **el esperado** con `c=valor de fichas`. G01/G05 esperan `(5+c)×2`; G02 `(5+c)×3`. Mantener la carta destinada a G05 fuera de los descartes. Registrar puntos de la mano o diferencia del acumulado antes/después, no confundirlos con el total de ronda. Si hay otro comodín o una mejora, documentarlo y diseñar un caso controlado; no descontar bonus de memoria.

### Interacciones de puntuación del catálogo (U3)

Casos independientes, sin necesidad de la misma ronda o semilla, usando solo los comodines indicados y las bases nivel 1. Referencias de cada efecto: R-J. Estos casos hacen concreto el punto 5 de T01; no son una ampliación del producto.

| ID | Regla / caso mínimo | Resultado esperado | Observado en juego | Estado |
| --- | --- | --- | --- | --- |
| C01 | Solo Joker; K normal como High Card. | 15×5=75. | No observado. | Pendiente E. |
| C02 | Solo Half; pareja de ochos jugada como dos cartas y, en otra mano, pareja de ochos con 2 y 5 acompañantes (sin crear otra categoría). | Dos cartas: 26×22=572. Cuatro: 26×2=52. | No observado. | Pendiente E. |
| C03 | Solo Scholar; pareja de ases y, en otro caso, pareja de ochos con un as acompañante. | Ases: 72×10=720. As no puntuado: 26×2=52. | No observado. | Pendiente E. |
| C04 | Solo Even; pareja de ochos frente a pareja de jotas. | Ochos 26×10=260; jotas 30×2=60. Las figuras no activan el efecto por valer diez fichas. | No observado. | Pendiente E. |
| C05 | Solo Banner; K normal a tres descartes y a cero descartes. | 105×1=105 frente a 15×1=15. | No observado. | Banner +30 confirmado documentalmente por P01; activación pendiente E. |
| C06 | Solo Abstract frente a Abstract+Golden; K normal en ambos casos. | Solo: bonus +3 y 15×4=60. Dos: bonus +6 y 15×7=105. | No observado. | Pendiente E. |

Green queda cubierto por G01–G05 y Golden por I02. Para completar U3, V03/V04 también deben quedar resueltas: las seis pruebas de interacción no demuestran por sí solas todos los precios y reglas de jefes. Las cartas ya usadas no se vuelven a introducir en la misma ronda para repetir un caso; usar otra ronda o ejemplares disponibles.

## 4. Solicitud por etapas

**Identificación declarada recibida:** Steam, sin mods, `1.01o-full`. No repetir la pregunta. La solicitud activa es la [primera tanda mínima](t01-tanda-usuario.md), con identificación visual incluida; no se solicita todo el catálogo.

Después de identificar la versión se adaptarán las hipótesis y se propondrá una tanda mínima: un caso de cobro discriminante sin Golden y otro con Golden para separar el orden de ingresos; una secuencia Green que muestre puntos de mano antes/después del incremento, un descarte múltiple y el suelo cero. Los casos frontera se agruparán después solo si hacen falta para validar fórmula/tope. La matriz de la sección 3 y los diez TODO automatizados son una reserva de pruebas, no una solicitud simultánea.

Al activar esa tanda se indicará exactamente qué evidencia tomar: saldo previo, configuración relevante, líneas de cobro y saldo posterior para interés; contador previo/posterior, cartas y base de mano, puntos de cada mano y número de clics de descarte para Green. No confundir acumulado de ronda con puntos de una mano. Si el estado disponible difiere se adaptará el esperado antes de observar el resultado.

El resto del catálogo se verificará por módulo según sus dependencias de H2, sin convertirlo en una condición global de H0/H1. Los archivos que posteriormente se reciban se registrarán con sesión, versión, autor y hash; una transcripción se etiquetará como tal y no como captura revisada.

Plantilla de registro por caso:

```text
ID del caso:
Fecha / sesión / persona que lo ejecutó:
Versión completa / plataforma / mods:
Baraja / dificultad / ciega / ante:
Comodines (orden, edición, contador) y otros modificadores:
Estado antes (B, manos, descartes, base de mano, cartas según corresponda):
Acción o secuencia realizada:
Esperado (referencia a esta matriz; cualquier adaptación anotada):
Observado (interés / Golden / saldo final o contador / puntos de mano):
Archivos y hash de evidencia:
Coincide / contradice / no concluyente:
Qué falta para decidir:
```

## 5. Decisión de cierre

| Puerta | Estado al terminar esta investigación |
| --- | --- |
| Separación documental / ausencia de nuevo Git anidado | Confirmada en filesystem. |
| Existencia del parche 1.0.1f y cambio de Banner | Confirmados documentalmente con publicación primaria P01. |
| U1, intereses/cobro en la build objetivo | Pendiente E: I01–I05 sin observaciones. |
| U2, incremento y descarte de Green | Pendiente E: G01–G05 sin observaciones. |
| U3, build local y resto del contrato | Pendiente V01–V04 y C01–C06; no se ha identificado un ejecutable local. |
| H0 / H1 | H0 cerrado como planificación bajo el criterio revisado; núcleo H1 implementado y probado, independiente de U1–U3. |

No convertir reglas pendientes en confirmadas por acumular fuentes secundarias o pruebas aritméticas. Cuando llegue evidencia, completar «observado», resolver discrepancias y actualizar la matriz. La falta de observación limita la validación del módulo correspondiente de H2, no la estructura ni la persistencia. Véanse [dependencias](../backlog.md) y [resultados H1](h1-validacion.md).
