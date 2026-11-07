# Arte del selector

Los 15 dorsos y ocho fichas son reinterpretaciones vectoriales propias para Balatro Advisor, generadas por `src/ui/deck-art.ts`. No son sprites oficiales, recortes del juego ni calcos. Usan geometría SVG, una paleta por baraja y motivos originales; no requieren red, texturas ni bibliotecas.

La captura aportada por el usuario orientó proporciones, borde de carta, presentación de fichas y aspecto de píxel. Los nombres/temas proceden del catálogo existente. Este arte no declara compatibilidad del motor ni verifica efectos.

Se consultó el [Press Kit oficial](https://www.playbalatro.com/press-kit), que anuncia recursos para uso en medios y conserva derechos reservados. No se identificó una licencia general de redistribución de los sprites de cada baraja; no se descargaron ni incorporaron archivos. La advertencia de procedencia del atlas previo en `docs/catalogo-completo.md` tampoco se trató como autorización para ampliar aquel espejo.

`provenance.json` identifica el método y las fuentes consultadas. La API de presentación es `deckArt(id,label)` / `stakeArt(id,label)` y cada elemento se marca con `data-art-source="advisor-original-vector-v1"`. Los SVG quedan dentro de elementos con nombre accesible; sus patrones tienen IDs únicos por instancia. Una clave desconocida utiliza una representación neutra, sin inventar un perfil del juego.

La hoja `web/deck-art.css` define tamaños base de 71:95 y 32:34. El selector puede cambiar `--deck-art-width` y `--stake-art-size`, o dimensionar los elementos mediante sus propias reglas. No se cambia el motor, almacenamiento ni catálogo.
