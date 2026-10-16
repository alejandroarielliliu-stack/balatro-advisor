# DECK03 — composición actual e identidades

Entregado 2026-10-11, motor 0.5.0. Diez barajas integradas; Mágica, Nebulosa, Fantasma, Zodíaco y Anaglifo siguen con condiciones catalogadas e integración pendiente. No modifica Project Bonk.

## Contrato

H1 conserva `observed.deck` como dato conocido/desconocido, con lista explícita de cartas. Cada carta tiene ID estable, rango, palo y atributos existentes. Dos cartas del mismo rango y palo deben tener IDs distintos; el ID no codifica obligatoriamente su cara. H2 acepta 1–200 cartas base explícitas, incluidas copias, eliminaciones y cambios de rango/palo transcritos. Rechaza mejoras, sellos, ediciones y fichas añadidas todavía no implementados. El límite 200 es de esta aplicación, no del juego.

La composición registrada prevalece sobre la plantilla de inicio: una Abandonada puede tener una figura añadida después. No se ejecutan ni suponen los consumibles que la produjeron. El preset histórico estándar se conserva para archivos anteriores, pero se rechaza como inferencia de Abandonada/Cuadriculada/Errática. Estas requieren lista explícita. Una ronda exige la mano inicial completa del tamaño declarado; mazos menores que ese tamaño aún no se evalúan mediante planes.

En Mesa, «Mazo actual» permite confirmar una plantilla, editar rangos/palos, añadir y quitar instancias, o declarar desconocido. No guarda hasta confirmar la actualización. Abandonada genera 40 cartas, Cuadriculada 52 con dos copias de cada rango/palo resultante; Errática nunca genera una plantilla. Cambiar de baraja conserva las cartas explícitas ya registradas; no las reemplaza por su inicio. Si había un preset estándar, seleccionar las tres barajas especiales lo pasa a desconocido en el borrador.

Los selectores de escenarios muestran las cartas e IDs del registro actual; las vistas previas consultan rango/palo por ID. Un identificador como 8C puede representar un 8 de picas tras la conversión de Cuadriculada. Un escenario con cartas eliminadas se rechaza; no se sustituye silenciosamente por otro.

## Manos y compatibilidad

Se agregan Five of a Kind (120 fichas/12 Mult), Flush House (140/14) y Flush Five (160/16), nivel 1. Precedencia: Flush Five, Flush House, Five of a Kind, escalera de color y categorías anteriores. Las cinco cartas puntúan en las tres categorías especiales.

Las bases especiales son campos opcionales en archivos con bases manuales: un guardado antiguo sigue cargando. Si una categoría especial necesita una base no registrada, solo ese cálculo se abstiene. El preset «todas estándar nivel 1» declara también las nuevas bases. Las cotas incluyen categorías especiales cuando la composición puede contenerlas; si faltan sus bases manuales, se abstienen de demostrar una cota global. Ya no limitan Scholar a cuatro ases si el mazo contiene cinco copias utilizables.

## Correcciones y escenarios antiguos

H1 detecta referencias a cartas ausentes incluso en sus escenarios guardados. Para corregir un mazo sin fabricar esas cartas, el formulario ofrece **retirar explícitamente los escenarios guardados**. `store.correct` acepta `discardSavedScenarios: true`: vacía únicamente probes/roundPlans, dentro de la misma escritura atómica que la corrección. Por defecto no los retira. La entrada guarda antes/después y motivo; deshacer restaura composición y escenarios. Un fallo de guardado conserva ambos. Los escenarios abiertos en la pantalla de análisis no se adaptan y requieren revisión.

## Evidencia y pruebas

Inspección del ejecutable instalado 1.0.1o-FULL: `game.lua` 2002–2004 contiene bases de las tres categorías; `functions/misc_functions.lua` 379–425 contiene su identificación y precedencia. Misma instalación y huellas L01/L03. Inspección estática, **no observación en partida**; modo estricto conservado.

Oráculos sintéticos calculados de esas reglas, independientes de la salida del motor:

- Cinco ochos de distintos palos: (120+40)×12 = 1920.
- Tres ochos y dos doses del mismo palo: (140+24+4)×14 = 2352.
- Cinco ochos del mismo palo: (160+40)×16 = 3200.
- Cuadriculada, instancias 8S y 8C convertida a picas: pareja (10+8+8)×2 = 52; usar dos veces 8S se rechaza.
- Abandonada: cartas gastadas + disponibles + en mano = 40 después del descarte; JS ausente se rechaza.

`npm run check`: 172 aprobadas, cero fallos, diez TODO previos. Pruebas de composición, clasificación, cotas, inmutabilidad, IDs, serialización, bases antiguas, retirada explícita de escenarios, fallo de persistencia y deshacer. Diseño web: plantilla explícita, edición conservando ID, guardado/recarga, Errática desconocida y no sobrescritura al previsualizar. Regresión EFHIII previa: 29 coincidencias; no equivale a observación directa ni valida por sí sola las nuevas categorías.

Siguiente entrega: DECK04, inventario real de consumibles/vales y sus acciones; después sobres y tags. No añade simulación ni nuevos efectos de comodín.
