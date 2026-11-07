# Ilustraciones de ciegas y etiquetas

Atlas originales de Balatro de LocalThunk / Playstack. Se reutiliza el espejo público y commit fijado que ya proporciona las ilustraciones de comodines y barajas de este proyecto:

- [BlindChips.png](https://github.com/Jofr3/balatro-source/blob/f081d0e41508d9dcc7a01cba5bffcccfbb115af1/resources/textures/2x/BlindChips.png)
- [tags.png](https://github.com/Jofr3/balatro-source/blob/f081d0e41508d9dcc7a01cba5bffcccfbb115af1/resources/textures/2x/tags.png)

`provenance.json` conserva dimensiones, hashes SHA-256 y coordenadas leídas estáticamente de `game.lua` en ese commit. El espejo no es una distribución oficial y su disponibilidad no se presenta como una concesión de licencia.

`blindArt` muestra el primer fotograma de cada ficha; no añade otro bucle de animación ni trabajo por fotograma en móviles. `tagArt` recorta los iconos del catálogo existente. Las identidades visuales no amplían la cobertura de reglas: mostrar un jefe o una etiqueta no implica que su efecto esté implementado o observado en una partida.

Los recursos se sirven localmente. Ante un ID desconocido o fallo de carga se presenta «?» con una etiqueta accesible explícita, sin inventar una ilustración.
