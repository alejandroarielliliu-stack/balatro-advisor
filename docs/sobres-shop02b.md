# SHOP02b — sobres observados Buffoon y Celestial

Entrega del 17 de octubre de 2026. Se añade el registro de sobres de tienda, su apertura confirmada y las elecciones de contenido observado. Se reutilizan H1, H2, T09b y los eventos CAT04: consultar no adquiere cartas ni anticipa resultados. El contrato sigue siendo PC/Steam, 1.0.1o-FULL, sin mods, White Stake y barajas integradas. La evidencia nueva es inspección estática del ejecutable, no observación en una partida.

## Flujo y alcance

1. En una partida 0.2 y fase de tienda, registra el tipo, tamaño y precio visible del sobre. Transcribir la oferta no paga ni abre nada.
2. Después de comprar y abrir ese sobre en Balatro, confirma la apertura en el asesor. Se descuenta su precio una sola vez, se retira la oferta y se conserva un contexto de sobre abierto. Pago y apertura tienen consecuencias separadas en el desglose, aunque constituyen una confirmación real conjunta: Balatro abre el sobre al comprarlo.
3. Transcribe las opciones que aparecieron. El contenido comienza desconocido; no se genera con una semilla inventada ni se transforma una expectativa de un sobre cerrado en cartas poseídas.
4. Confirma cada elección efectuada. Buffoon añade la instancia elegida, con sus propiedades; Celestial usa inmediatamente el Planet elegido. Una elección no vuelve a pagar el precio del sobre.
5. En un Mega, recargar conserva la primera elección y las restantes. Agotar las elecciones cierra el sobre. **Omití** cierra las opciones restantes y aplica el evento de omisión; no devuelve dinero ni retira elecciones previas.

| Familia | Normal | Jumbo | Mega |
|---|---|---|---|
| Buffoon | $4 · muestra 2 · elige 1 | $6 · muestra 4 · elige 1 | $8 · muestra 4 · elige 2 |
| Celestial | $4 · muestra 3 · elige 1 | $6 · muestra 5 · elige 1 | $8 · muestra 5 · elige 2 |

Se admiten esos seis tipos y sus precios base conocidos. Astronomer físico compatible hace gratuito Celestial, incluido Jumbo/Mega; no hace gratuito Buffoon. Un precio observado diferente no se sustituye por el de catálogo. Descuentos, inflación, tutorial y sobres gratuitos de etiquetas necesitan sus propias reglas y quedan fuera de este lote. Arcana, Standard y Spectral se conservan como catálogo/observación, sin fingir que esta entrega resuelve sus efectos.

Abrir Buffoon no necesita un espacio de comodín libre. Elegir un comodín normal sí lo necesita; Negative permite una elección con el inventario lleno y aumenta la capacidad en uno. Se puede registrar una venta efectuada dentro del sobre mediante una acción separada que reutiliza H2; vender no elige una opción ni recupera su precio de apertura. Una venta incompatible mantiene intactos estado, contenido y elecciones.

## Contenido y efectos

**Buffoon.** Cada opción representa una instancia distinta, no solo un ID de catálogo. Edición, stickers, venta y contadores pertenecen a esa instancia. La adquisición no usa una compra ficticia de tienda: no añade una oferta temporal de comodín ni cobra su precio individual. Aplica los cambios persistentes compatibles de recursos e inventario, incluido Chaos. Los datos iniciales dependientes de un objetivo aleatorio, como la mano de To Do List, no se adivinan.

El precio del sobre no determina la venta del comodín. Por ejemplo, un Joker base puede venderse por $1 aunque el sobre costase $4. Las copias de la misma identidad no se confunden con IDs de instancia repetidos. La disponibilidad ordinaria depende del pool, desbloqueos y Showman; el asesor registra lo observado y no reconstruye el perfil ni certifica toda generación posible. Buffoon ordinario no genera Legendarios y White no genera stickers de dificultades superiores: los datos incompatibles o efectos sin cobertura necesitan una limitación explícita.

**Celestial.** Se reutiliza el mapa canónico de los doce Planet a sus manos y la progresión de H2. La elección se aplica directamente, sin insertar y retirar un consumible ficticio del inventario real. No necesita un espacio de consumible libre, no crea una carta que pueda conservarse para Observatory y no añade una carta al mazo. Se actualizan el historial compatible de Planet y el crecimiento físico de Constellation. Satellite usa las identidades únicas en un cobro posterior; no aporta dinero al elegir.

Los tres Planet ocultos pueden transcribirse sin inventar que antes se jugó su mano. Sus condiciones de aparición pertenecen al pool, no a una probabilidad calculada por este registro. Celestial también puede contener **Black Hole**, una carta Spectral: poder registrar su presencia no habilita automáticamente su uso. Su elección queda limitada mientras no esté integrado su efecto completo. Las demás opciones conocidas del mismo sobre siguen siendo independientes cuando sus datos permiten ejecutarlas.

**Eventos de apertura y omisión.** Hallucination se evalúa al abrir, con los comodines que ya existían entonces, capacidad y resultados observados cuando hacen falta. No se decide una rama aleatoria ni se guardan resultados hipotéticos como hechos. La primera interfaz comunica los datos faltantes; no requiere introducir JSON técnico ni finge una apertura exitosa si faltan. Obtener Hallucination del propio Buffoon no dispara retroactivamente la apertura. Red Card gana +3 Mult físico al omitir, también si antes se tomó una opción de Mega; Blueprint no añade crecimiento físico a Red Card ni Constellation.

Adquirir o vender Astronomer afecta al precio de Celestial y Planet en el juego; esta entrega actualiza las ofertas Celestial compatibles. La compra individual de Planet sigue fuera de cobertura. La tienda debe reflejar el precio conocido nuevo o exigir su nueva observación; no puede seguir confirmando un precio antiguo incompatible sin avisar. No se inventa contenido ni se ofrece una reposición al terminar el sobre.

## Estado, confirmación y recuperación

Las ofertas de sobres son una extensión opcional del estado 0.2. Una copia 0.2 anterior sin ellas mantiene su significado: ausencia no equivale a una lista vacía observada. El contexto persistente distingue origen de tienda, sobre, contenido conocido/desconocido, identidades de opciones y elecciones restantes. Al cerrar se restaura la fase de tienda de origen con las otras ofertas, sin reiniciar manos, descartes o contadores de ronda.

Las acciones actuales de apertura, observación, elección, omisión y venta dentro del sobre usan revisión y confirmación T09b. Las observaciones no aplican efectos; las acciones realizadas necesitan consentimiento real. Una recomendación antigua no puede aplicarse después de otra elección. Repetir un ID de confirmación no añade dos cartas ni paga dos veces. IDs de instancia, referencias, cantidad de opciones y elecciones se validan antes de guardar.

Cada confirmación persiste estado e historial juntos. Un fallo de validación, legalidad o escritura conserva la versión anterior completa y permite reintentar un intento que no se guardó. **Deshacer** corrige el registro local y recupera su snapshot anterior, incluida la fase de sobre cuando corresponda; no deshace una acción en Balatro. La carga y el historial conservan las elecciones ya registradas.

El formato 0.1 y `confirmed-1` permanecen congelados. Leer o consultar una copia antigua no la convierte. Registrar sobres requiere la [migración explícita recuperable](fases-y-migracion.md), que conserva todos los snapshots y el respaldo original. La unión histórica de alternativas de comodines de H3/T07b no se amplía silenciosamente con acciones de sobres.

## Evidencia, demostración y límites

Las reglas `packs.purchase`, `packs.contents`, `packs.choose`, `packs.skip` y `packs.planet` usan L11 como inspección local provisional. Los efectos reutilizados mantienen sus dependencias originales. `requireObserved:true` conserva la abstención para reglas cuya evidencia de partida falta; una limitación de Black Hole o un resultado aleatorio ausente no habilita un efecto inventado. [Casos mínimos, ubicaciones y hashes](evidencia/pack-shop/README.md).

```powershell
npm.cmd run demo:packs
npm.cmd run check
npm.cmd run test:pack-shop
```

Validación de software de la entrega: **764 pruebas aprobadas, 0 fallos y 10 TODO de contraste manual**. Los ejemplos son sintéticos y sus esperados proceden de las reglas documentadas y literales independientes. Pasar las suites no comprueba una partida de Balatro ni demuestra la eficacia de una estrategia.

SHOP02b no es una búsqueda del mejor contenido desconocido ni un ranking H3 completo de sobres. No estima porcentajes de victoria, no genera contenido aleatorio ni hace Monte Carlo. Siguen pendientes los otros tipos de sobres, el uso de Black Hole, descuentos y modificadores fuera del contrato, los 22 vales sin compra integrada y los contrastes manuales. La comparación de la próxima elección visible ya se conecta en [SHOP02c](comparacion-sobres-shop02c.md), sobre estas acciones legales y recuperables, con política y límites separados.

Dependencia de esta entrega: H2 valida el inventario físico con `jokerSlots` conocido también al abrir, usar Planet u omitir; si falta, pide el valor y no asume cinco espacios. Es una limitación del validador compartido, no una exigencia universal de esas acciones en Balatro.
