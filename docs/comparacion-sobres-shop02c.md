# SHOP02c — comparar la próxima elección visible

Entrega del 17 de octubre de 2026 sobre [SHOP02b](sobres-shop02b.md). El registro del sobre, H2 y T09b conservan sus contratos. Esta entrega añade una consulta separada: compara las opciones que ya se transcribieron y omitir el resto. No elige ni registra una acción por el jugador.

## Entrada y alcance

`comparePackChoices(state, options)` recibe una partida 0.2 en `open_pack`, con el contexto de uno de los seis Buffoon/Celestial integrados. Las entradas ya elegidas se excluyen. Cada opción restante y la omisión se proyectan desde copias independientes del mismo estado, utilizando `applyPackAction`; no se cambia la fase para simular una tienda ni se añade una oferta ficticia.

`options.intendedHand`, si se declara, identifica la mano que se quiere mejorar. Es un supuesto de evaluación, no una observación de cartas, una predicción ni una garantía de poder jugarla. La interfaz conserva esa preferencia solo durante la sesión de la página. El historial de manos jugadas no se convierte automáticamente en una estrategia preferida.

La comparación es de **la próxima elección**. Un Mega se vuelve a evaluar después de cada elección confirmada; no se recorren todas las parejas, órdenes, ventas y elecciones posibles. El resultado declara `exhaustive:false`. Las ventas siguen siendo acciones separadas: no se presupone vender un comodín para hacer legal una opción que ahora no cabe.

## Cálculos y política

Los resultados exactos provienen de H2: legalidad, dinero, capacidad, adquisición, cambios de contadores y bases de manos. Elegir no vuelve a cobrar el sobre. Omitir no devuelve el precio pagado. Los cambios de Constellation y Red Card y el historial de Planet conservan las dependencias de SHOP02b. No se suman fichas, Mult, dólares y contadores para producir una utilidad inventada.

La política `pack-choice-policy-1` es heurística y se mantiene separada de esos cálculos:

- **Buffoon:** reutiliza `evaluateComposition` y el encaje contextual del comodín adquirido. Expone el índice global y las diferencias de cada apartado. La preferencia se basa en dominancia entre apartados comparables: mejorar un apartado sin empeorar los demás. El índice global permite entender el cambio de composición; no acredita supervivencia ni decide por sí solo entre ventajas contrapuestas. Los pesos y unidades siguen en las políticas de composición y quick-fit existentes; no se añaden pesos específicos para sobres.
- **Celestial:** las bases de manos distintas no se tratan como puntuaciones comparables. Sin una mano objetivo declarada, muestra las mejoras y se abstiene de decidir qué mano necesita la construcción. Con intención explícita, puede dar una preferencia condicional por el Planet correspondiente, conservando los efectos compartidos y las limitaciones de las otras opciones.
- **Omitir:** es una rama real para comparar, incluida la oportunidad de crecimiento de Red Card. No equivale a recuperar dinero ni a conservar una elección para la próxima tienda. Su beneficio depende de poder aprovechar el comodín en jugadas futuras; un contador mayor no demuestra ese aprovechamiento.
- **Información incompleta:** una opción incompatible conserva su error y no impide calcular las independientes. Una opción sin soporte o datos suficientes limita cualquier conclusión global. Se permiten empates, intercambios y abstención. Una preferencia condicional siempre conserva las premisas que podrían cambiarla.

El orden agrupa opciones mediante la relación de dominancia de la política; dentro de un empate se conserva el orden observado. No implica que se haya encontrado el mejor curso completo de la partida. Las explicaciones proceden de las diferencias y condiciones de cada rama.

## Salida y separación del registro

El informe `pack-choices-1` contiene revisión y huella del estado/opciones, alternativas, orden, acciones H2 proyectadas, consecuencias, encaje, composición antes/después, cambios de bases, errores, evidencia y recomendación estructurada. `packChoicesAreCurrent` detecta cambios incluso si una copia alterada conserva por error el mismo número de revisión. El modo estricto requiere la evidencia del motor y no puede ser eludido calculando una nota editorial sobre una rama rechazada.

La interfaz añade **Qué elegir**, un selector opcional **Mano que buscas** en Celestial y una comparación compacta por carta. Los detalles muestran apartados, condiciones y sacrificios. Se conserva el orden de las cartas observadas para relacionarlas con el sobre del juego; el informe programático expone la prioridad parcial. Consultar, cambiar la mano objetivo o abrir detalles no escribe el guardado. **Elegí/Usé esta carta** sigue abriendo la confirmación explícita de la acción real y utiliza la revisión actual de T09b.

Ejemplo independiente: Mercury, con Pair nivel 1, cambia sus bases de 10 fichas/Mult 2 a 25 fichas/Mult 3. Esas bases no significan que una mano puntúe 75: faltan cartas puntuadas, cartas retenidas, efectos y orden. Con Constellation físico en ×1, el uso compatible lo deja en ×1,1. No se cobra Satellite al usar el Planet.

## Verificación y pendientes

Los casos sintéticos comprueban aislamiento de ramas, inmutabilidad y ausencia de escrituras; revisión/huellas; capacidad y Negative; Red Card; Mega parcial; bases Planet y crecimiento; desconocidos locales; intención explícita y modo estricto. Los esperados aritméticos proceden de L11 y de literales documentados; las pruebas de política comprueban sus criterios y no demuestran eficacia estratégica.

```powershell
npm.cmd run demo:pack-choices
npm.cmd run check
npm.cmd run test:pack-choices
npm.cmd run test:pack-shop
```

La evidencia de reglas sigue siendo la [inspección estática provisional L11](evidencia/pack-shop/README.md), sin observación nueva en una partida. Pasar las pruebas de software no cierra los diez contrastes manuales existentes. El índice editorial no es una probabilidad ni una estimación de fichas o supervivencia.

SHOP02 sigue parcial: Black Hole, Arcana/Standard/Spectral, descuentos y otras operaciones pendientes conservan su cobertura anterior. Hallucination puede exigir resultados observados que la primera interfaz todavía no permite introducir. Tampoco se simulan robos, sobres cerrados ni estrategias de manos adaptadas. La siguiente ampliación puede integrar efectos deterministas de consumibles observados (DECK04) con el mismo patrón de proyección, confirmación y recuperación; EVAL01 debe contrastar la utilidad de la política por separado.
