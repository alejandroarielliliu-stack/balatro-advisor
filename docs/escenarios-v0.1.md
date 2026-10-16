**Actualización T08c-3:** [auditoría integrada S01–S09](auditoria-t08c.md) completada; suite reproducible `npm.cmd run test:scenarios`. Incluye horizontes S03/S05, cotas S09 y fronteras. Esperados documentales usados como regresión del modelo provisional, no observaciones en juego.

**Actualización T07c:** S09 ya tiene [API, ejemplo y pruebas de cotas](cotas-t07c.md). Las menciones inferiores a cotas todavía pendientes describen el cierre histórico de H2. La instancia sigue siendo sintética y las reglas provisionales.

# Escenarios de evaluación v0.1

Los cuatro escenarios ejecutables adicionales de T07b y sus derivaciones están en [oráculos T07b](evidencia/t07b-oraculos.md). Complementan estos casos de producto; no sustituyen pruebas estratégicas de S01–S09 ni observaciones del juego.

Contrato y fuentes: [reglas](reglas-y-fuentes.md). Esquema: [estado](modelo-de-estado.md). Los nueve casos son **sintéticos**, no partidas observadas ni decisiones etiquetadas como óptimas.

H2 reutiliza estos oráculos documentales para el contrato explícito 1.0.1o identificado en L01; no los presenta como partidas verificadas. T08c ya integra preferencias estratégicas, cotas S09 y proyección mediante horizontes explícitos. [Cobertura del motor](motor-h2.md). En IDs de código, el diez se escribe `10C`, no la abreviatura narrativa `TC` de S05.

Actualización T01: no se encontró una instalación ejecutable en las ubicaciones revisadas y no se ejecutó ninguno de estos escenarios. Las cifras se conservan como resultados esperados del modelo. Los casos mínimos para obtener evidencia real de sus premisas están en el [informe T01](evidencia/t01-reglas.md), con «observado en juego» pendiente. S03 depende especialmente de I01–I05; S05 de G01–G05; las demás interacciones dependen de V01–V04/C01–C06.

## Convenciones y comprobación de posibilidad

Todos usan Blue Deck, White Stake, 52 cartas originales sin modificaciones, cinco espacios y los precios base de R-J. Salvo indicación, las nueve categorías están a nivel 1, hay cinco manos y tres descartes al iniciar la próxima ronda, tamaño de mano ocho, sin vales ni consumibles ni tags pendientes. Cada lista de inventario es completa. Otras ofertas de paquetes/vale se omiten de la comparación expresamente.

Los ejemplos de cartas son jugadas **hipotéticas de la próxima ronda**, no cartas visibles en tienda. `S/H/D/C` = picas/corazones/diamantes/tréboles; `8S,8H` es pareja de ochos, base 10×2 y 16 fichas de cartas. Todos los ejemplos son subconjuntos legales del mazo. Los distintos ejemplos de un caso son alternativas independientes salvo que se declare una secuencia.

La posibilidad de estos estados se comprobó por restricciones: ciegas y antes válidos, no más de dos ofertas, sin duplicar un comodín poseído en la tienda, sin más de cinco espacios, saldo suficiente tras la venta cuando aplica y cartas disponibles. Los comodines seleccionados son obtenibles sin desbloqueos especiales. Los inventarios de antes posteriores pueden reunirse en tiendas anteriores conservando el mazo intacto; Green 40 en ante 8 cabe en las manos de rondas anteriores. Los saldos pueden alcanzarse mediante cobros, ahorro y gastos previos. No se dispone de una semilla testigo ni se ha reproducido cada estado en Balatro; esto verifica consistencia con las reglas documentadas, no procedencia de una partida real. T01 contrasta las reglas temporales pendientes antes de convertir sus expectativas en pruebas de regresión aprobadas.

En cada caso el asesor debe enumerar también ventas individuales de cualquier comodín y reemplazos legales, aunque el contraste destacado sea menor. Toda cifra de interés presupone ganar y que no haya movimientos de dinero durante la ronda. «Interés base» es `I(saldo tras acción)`, no un ingreso ya realizado.

## S01 — potencia inmediata frente a liquidez

**Estado:** tienda después de Small del ante 1; próxima Big, objetivo 450; dinero 7; ningún comodín. Jefe visible The Psychic, objetivo 600, posterior a Big.

**Opciones/precios:** conservar 7; comprar Joker por 2 → saldo 5; comprar Half por 5 → saldo 2.

**Pregunta:** ¿qué compra mejora la potencia del próximo tramo y qué dinero sacrifica?

**Datos necesarios:** bases de Pair y High Card, jugadas `8S,8H` y `KS`, objetivo, recursos y jefe posterior.

**Comprobaciones exactas:** pareja: sin compra `26×2=52`; Joker `26×6=156`; Half `26×22=572`. High Card K: `15`, `75`, `315`, respectivamente. Interés base: `1,1,0`. Half supera 450 con la pareja especificada, no con K. Conservar dinero no permite esa mejora. Half no se activa en ninguna jugada válida contra Psychic.

**Expectativa estratégica:** Half es candidato de potencia para Big, con pérdida de liquidez y utilidad reducida ante el jefe. No concluir victoria ni recomendarlo solo por su 572: se desconoce si saldrá pareja. No multiplicar 572 por cinco y llamarlo puntuación esperada.

## S02 — ahorro en un umbral de intereses

**Estado:** tras jefe del ante 1, antes de Small del ante 2, objetivo 800; dinero 25; inventario Half y Banner. Jefe del ante 2 desconocido.

**Opciones/precios:** conservar; Joker por 2; ventas Half/Banner por 2 cada uno.

**Pregunta:** ¿justifica una mejora adicional atravesar el umbral de 25?

**Datos necesarios:** pareja `8S,8H`, High Card `KS`, tres descartes restantes y variante cero descartes.

**Comprobaciones exactas:** conservar con tres descartes: pareja `(26+90)×22=2552`, K `(15+90)×21=2205`. Comprar Joker: pareja `116×26=3016`, K `105×25=2625`. Dinero 25→23; interés base 5→4. Con cero descartes pareja 572→676, ambos por debajo de 800 en una mano. Vender Banner reduce fichas, no solo libera espacio.

**Expectativa estratégica:** preferencia provisional por ahorrar si las jugadas sin descartes describen bien el plan. Mostrar que esa conclusión depende de conservar descartes; no declarar supervivencia porque dos ejemplos superen 800. Advertir que el jefe futuro no fue informado.

## S03 — ingreso futuro con Golden

**Estado:** misma fase del ante 2 que S02; dinero 25; Half y Banner; próxima Small 800, jefe futuro desconocido.

**Opciones/precios:** conservar; comprar Golden por 6 → 19; venta posterior de Golden por 3 solo como cálculo de recuperación, no como segunda acción recomendada ahora.

**Pregunta:** ¿cuánto tarda en recuperar su coste y qué liquidez exige?

**Datos necesarios:** los ejemplos de S02 para potencia; supuesto explícito de ganar en una mano, conservar Golden y no gastar durante dos rondas consecutivas. La segunda ciega es Big del ante 2, recompensa 4.

**Exacto sobre acciones:** coste 6, saldo 19, puntuaciones iguales a conservar porque no hay Abstract. Interés base 5 frente a 3. Con 5 espacios hay sitio.

**Resultado condicional a U1:** tras Small ganado en una mano, conservar `25+3+4+5=37`; Golden `19+3+4+4+3=33`. Tras Big también en una mano y sin gastos: conservar `37+4+4+5=50`; Golden `33+4+4+4+5=50`. Golden conserva además venta 3. No decir «beneficio seguro de 4» ni «se amortiza en una ronda»: estos saldos incluyen el interés perdido y condicionan ganar ambas rondas.

**Expectativa estratégica:** opción de crecimiento económico si hay margen de puntuación; saldo y espacio son el coste de oportunidad. Si se cambia el número de manos usadas, recalcular en ambas ramas. Estas cifras no son oráculo aprobado hasta resolver U1.

## S04 — sinergia con ases y diferencia entre jugar y puntuar

**Estado:** tras Small del ante 2, próxima Big 1200; dinero 10; Half. Jefe visible The Wall (3200), posterior.

**Opciones/precios:** conservar; Scholar por 4; Even Steven por 4. Ambos dejan 6 e interés base 1 frente a 2.

**Pregunta:** ¿qué compra ayuda a qué manos y cuán específica es su activación?

**Datos necesarios:** `AS,AH`; `8S,8H`; `AS,AH,2D,7C`; bases y cartas puntuadas por categoría.

**Comprobaciones exactas:** ases con Half: `32×22=704`; añadir Scholar: `(32+40)×(22+8)=2160`; añadir Even: 704. Ochos con Half: `26×22=572`; Scholar sigue 572; Even `26×30=780`. Con `AS,AH,2D,7C`, Half se apaga por jugar cuatro; puntúan solo los ases: Scholar `72×10=720`, Even `32×2=64` (el 2 no puntúa). Inventario estándar: cuatro ases frente a veinte cartas pares; no son tasas de éxito.

**Expectativa estratégica:** Scholar mejora mucho el ejemplo con ases pero no el de ochos; no seleccionar por el mejor ejemplo aislado. Se necesita información de estilo y ejemplos adversos para una preferencia. Ninguna compra de este caso demuestra preparación para The Wall.

## S05 — crecimiento, orden de eventos e ingreso por manos

**Estado:** después del jefe del ante 1, próxima Small del ante 2 (800); dinero 10; Banner. Jefe futuro desconocido.

**Opciones/precios:** conservar; Green por 4; Joker por 2. Saldos 10/6/8; intereses base 2/1/1.

**Pregunta:** ¿cuándo el crecimiento compensa una ayuda fija?

**Datos necesarios:** contador inicial 0 al comprar Green; secuencia hipotética sin descartes de cinco High Cards `KS`, `QH`, `JD`, `TC`, `9S`, una carta por mano. Hay un robo inicial posible que contiene esas cartas; las cinco no se reutilizan. Objetivo y fin automático de ronda.

**Resultado condicional a U2:** Banner añade 90. Green da sucesivamente Mult total 2, 3, 4, 5…: las tres primeras manos son `105×2=210`, `105×3=315`, `105×4=420`; acumulado 945 y la ronda termina ahí, Green queda en 3. No conceder manos cuarta/quinta ni Green 5. Con Joker: dos manos de `105×5=525` terminan la ronda; quedan tres manos en vez de dos, un dólar más de ingreso por manos. Sin compra, incluso los cinco ejemplos suman `105+105+105+105+104=524`.

**Prueba adicional de contador:** desde Green 0, una acción que descarta tres cartas → 0; luego una mano → 1. Desde Green 2, descartar tres cartas en una sola acción → 1, no 0. Comparar secuencias, no `max(0, inicial+manos-descartes)` agregada.

**Expectativa estratégica:** Green tiene horizonte de crecimiento, Joker ayuda antes y conserva más efectivo. Mostrar la tensión, sin inventar media de manos por ronda. Las puntuaciones con incremento previo quedan pendientes de T01.

## S06 — un jefe elimina la contribución de Banner

**Estado:** tras Big del ante 2, próximo jefe The Water, objetivo 1600; dinero 8; Half y Banner.

**Opciones/precios:** conservar; comprar Scholar por 4 dejando 4; vender Banner por 2; reemplazar Banner por Scholar dejando `8+2-4=6`. También comparar comprar sin vender porque hay espacio.

**Pregunta:** ¿conviene liberar valor de un comodín temporalmente inactivo?

**Datos necesarios:** jefe, cero descartes de inicio, pareja `AS,AH`; horizonte después del jefe y posible reutilización futura de Banner.

**Comprobaciones exactas:** Banner aporta 0 durante este jefe, aunque en la tienda se vean recursos de la ronda anterior. Conservar o vender solo Banner: `32×22=704`. Comprar Scholar, con o sin vender Banner: `72×30=2160`. Interés base conservar/comprar/vender/reemplazar: `1/0/2/1`. Reemplazar recupera 2 pero pierde Banner para después.

**Expectativa estratégica:** vender Banner puede financiar la transición sin bajar este ejemplo contra Water. Mantenerlo preserva utilidad posterior; no llamarlo basura permanente ni afirmar que se conseguirá pareja de ases.

## S07 — reemplazar con capacidad llena

**Estado:** después del jefe del ante 3, próxima Small ante 4 (5000); dinero 3; cinco comodines: Joker, Half, Banner, Golden y Scholar. Jefe siguiente desconocido.

**Opciones/precios:** conservar; Abstract en oferta por 4. Compra directa ilegal por dinero y espacios. Valores de venta: Joker 1, Half 2, Banner 2, Golden 3, Scholar 2. Enumerar cada venta sola y cada venta→Abstract; la oferta es una, no cinco.

**Pregunta:** ¿qué potencia, ingresos y efectivo cambia cada reemplazo?

**Datos necesarios:** pareja `8S,8H`, tres descartes; ases como sensibilidad adicional; conteo de comodines posterior.

**Comprobaciones exactas:** inicial con ochos `(26+90)×(2+4+20)=3016`. Vender Joker y comprar Abstract: saldo 0, cinco comodines, Abstract +15, `116×37=4292`. Vender Golden y comprar Abstract: saldo 2, `116×41=4756`, se pierden 4 de ingreso condicional por ronda. Vender Scholar y comprar Abstract: saldo 1, misma puntuación 4756 con ochos, pero se pierde la ayuda con ases. Ninguna de esas jugadas alcanza 5000 por sí sola. Vender solo Joker: saldo 4 y `116×22=2552`. No acreditar venta después de intentar una compra ilegal.

**Sensibilidad de Abstract:** después de cualquier reemplazo hay cinco, no cuatro ni seis. Una venta posterior sin compra reduciría su bonus de 15 a 12. Debe recalcularse toda la combinación, no comparar solo textos de las cartas.

**Expectativa estratégica:** puede ser preferible conservar Golden o Scholar según horizonte y tipos de mano. Mostrar opciones de compromiso y necesidad de varias manos; no fijar Golden como venta automática por aportar cero puntos directos.

## S08 — preparación contra The Psychic

**Estado:** tras Big del ante 1, próximo jefe The Psychic, objetivo 600; dinero 6; Half y Joker. Se pudieron comprar en la tienda previa con los cobros iniciales; no se necesitan ediciones ni cambios de mazo.

**Opciones/precios:** conservar; Banner por 5 → 1; vender Half por 2 → 8; reemplazar Half por Banner → 3.

**Pregunta:** ¿se está sobrevalorando Half para una ciega que exige cinco cartas?

**Datos necesarios:** jugada `8S,8H,2D,5C,KS`, tres descartes; puntúan solo los ochos. Dos cartas no son una jugada válida para el evaluador de Psychic.

**Comprobaciones exactas:** Half no se activa aunque puntúen dos cartas; inicial `26×6=156`. Con Banner, conservando o vendiendo Half: `116×6=696`. Interés base por conservar/comprar/vender/reemplazar: `1/0/1/0`. Vender Half sin comprar no cambia la puntuación válida de este jefe, pero pierde su utilidad futura.

**Expectativa estratégica:** Banner mejora el ejemplo legal; reemplazar conserva 2 dólares más que comprar sin vender, a cambio de perder Half. No permitir el falso resultado `116×26` para esas cinco cartas.

## S09 — ante 8: detectar que una mejora no basta

**Estado:** tras Big del ante 8, próximo Violet Vessel (300000); dinero 30; Joker, Half, Banner, Scholar y Green con contador 40; todas las manos a nivel 1, mazo original. No hay rondas posteriores dentro del objetivo.

**Posibilidad del historial:** no se afirma que este inventario dé para superar todas las ciegas previas. La instantánea puede tomarse después de vender en esta tienda un comodín de puntuación más fuerte y comprar Joker, dejando Abstract como oferta restante. Por ejemplo, Blackboard (fuera del catálogo actual, sin efecto permanente sobre el mazo) pudo ocupar ese espacio al superar Big. Ya vendido, su efecto no se aplica al estado actual. El contrato limita el estado evaluado, no prohíbe haber poseído cartas fuera de cobertura. Esta reconstrucción explica la reducción de potencia; sigue siendo sintética y requiere un testigo de partida para probar su realización completa.

**Opciones/precios:** conservar; Abstract por 4; reemplazar cualquiera de los cinco (ventas 1/2/2/2/2). Comprar directamente es ilegal por capacidad.

**Pregunta:** ¿se puede demostrar que la cobertura actual es insuficiente incluso con una mejora?

**Datos necesarios:** mazo completo confirmado, todas las bases, cinco manos, tres descartes, contador, jefe; no solo una mano representativa.

**Cota exacta conservadora:** sin compra, fichas de cualquier mano ≤ `100+55+90+80=325` (máxima base, hasta cinco ases como sobreestimación de fichas, Banner, hasta cuatro activaciones Scholar); Mult ≤ `8+4+20+16+45=93`. Aunque estos máximos no se puedan lograr juntos, `5×325×93=151125 < 300000`. Es una cota superior, no puntuación esperada. Green no supera 45 tras cinco manos bajo U2; descartes no pueden mejorar esta cota.

**Reemplazo Joker→Abstract:** saldo 27; la cota pasa a `5×325×104=169000`, todavía insuficiente. Es también una cota para los demás reemplazos: quitar otro comodín retira una contribución no negativa mientras conserva como mucho +4 del Joker; el máximo adicional frente al inventario inicial sería +15, por lo que una cota común aún más holgada es `5×325×108=175500 < 300000`. Registrar cuál se usa y su derivación.

**Expectativa estratégica:** abstenerse de prometer una solución dentro de las acciones cubiertas. La conclusión de insuficiencia sí se sostiene bajo los supuestos confirmados. No recomendar ingresos posteriores al jefe para justificar una decisión; no presentar interés como recompensa útil después de terminar el objetivo. Si hay una carta/modificador no informado, invalidar la prueba en vez de mantener el veredicto.

## Variantes transversales de validación

Aplicar a los casos anteriores sin contarlas como nuevos estados de partida:

- Precio desconocido: bloquear esa acción, no usar cero. Saldo negativo o sexto comodín: H1 puede conservar esos datos; H2 rechaza las operaciones afectadas fuera de su cobertura. No confundir validez estructural con compatibilidad del motor.
- Comodín no compatible poseído o carta mejorada: análisis estratégico parcial, sin puntuar como si no existiera.
- Oferta no compatible: mantenerla visible y declarar comparación incompleta.
- Jefe desconocido: nunca tratarlo como «sin efecto». Campos desconocidos de contador o base de mano invalidan solo los cálculos que dependen de ellos.
- Cambiar solo el orden de estos ocho comodines normales no cambia las puntuaciones válidas; no generalizar a otros catálogos.
- Tras guardar y recargar, cada resultado debe conservar acciones, trazas y etiquetas al recalcular con las mismas versiones.

