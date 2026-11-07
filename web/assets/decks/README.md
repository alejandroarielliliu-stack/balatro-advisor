# Ilustraciones de barajas y fichas

Las 15 barajas y las ocho fichas usan **los píxeles originales de Balatro**, mediante celdas de los atlas `Enhancers.png` y `chips.png`. Sustituyen las reinterpretaciones vectoriales anteriores conforme a la petición del usuario.

Los PNG proceden del [espejo público Jofr3/balatro-source](https://github.com/Jofr3/balatro-source/tree/f081d0e41508d9dcc7a01cba5bffcccfbb115af1), en el mismo commit fijo utilizado por el catálogo existente de 150 comodines. No se extrajo una copia privada ni se incorporó código del juego. El mapeo de celdas se leyó estáticamente de `game.lua` en esa revisión: la huella coincide con la fuente 1.0.1o-FULL ya documentada en el proyecto.

`provenance.json` registra URLs exactas, hashes, dimensiones y posiciones. La celda Ghost es `(6,2)` de Enhancers y la ficha Blanca `(0,0)` de chips. Negro y Azul ocupan columnas 4 y 3 respectivamente; el orden visual de dificultades no debe confundirse con el orden físico del atlas.

**Atribución:** ilustraciones de LocalThunk / Playstack. El espejo es de terceros, no una distribución oficial ni una concesión de licencia. Se conserva la misma distinción de procedencia que en los recursos actuales de comodines.

La API de presentación sigue siendo `deckArt(id,label)` y `stakeArt(id,label)`. Cada elemento tiene nombre accesible y `data-art-source="balatro-game-atlas-1.0.1o"`; su imagen interna se recorta por CSS sin modificar los PNG. `image-rendering: pixelated` mantiene los píxeles al dimensionar las cartas. No hay llamadas externas en ejecución: todos los recursos se sirven dentro del sitio.

Solo una imagen que no cargue o un ID desconocido muestra `?`, con nombre accesible «ilustración no disponible». No se sustituye el arte original por dibujos inventados. Esta importación no verifica reglas ni amplía los perfiles compatibles del motor.
