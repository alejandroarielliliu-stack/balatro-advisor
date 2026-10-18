# DECK04c: comparar los objetivos de Arcana

**Ampliación DECK04d:** [Ermitaño/Templanza](tarot-dinero-deck04d.md) añaden una alternativa sin objetivos por efecto de dinero. La política pasa a `arcana-choice-policy-2` para invalidar informes anteriores; no cambia los pesos de composición. La mano solo bloquea las opciones que la necesitan y la conclusión global correspondiente. El alcance original siguiente se conserva como referencia de DECK04c.

Entrega sobre [DECK04b](arcana-deck04b.md). No amplía los doce efectos Tarot ni sus reglas de juego: conecta sus proyecciones con la política contextual existente. La evidencia L12/L13 sigue siendo inspección del ejecutable 1.0.1o-FULL, sin observación nueva en una partida.

## Uso

Registra el contenido y la mano real completa de un Arcana abierto. **Objetivos para tu composición** compara automáticamente la próxima elección. Cada Tarot tiene **Comparar objetivos**: muestra las cartas afectadas, las diferencias entre apartados y las mejoras que se sustituyen. La lista presenta cinco combinaciones inicialmente; **Ver más objetivos** permite consultar las demás calculadas.

**Ver estos objetivos** selecciona cartas en la vista previa. No confirma la recomendación ni guarda su proyección. Para registrar una acción realizada se mantiene **Usé esta carta** y la confirmación T09b. Es posible escoger otros objetivos manualmente o usar otro Tarot compatible. Recargar elimina la selección de vista previa y conserva exclusivamente las acciones confirmadas.

Después de la primera elección Mega se compara otra vez desde la nueva revisión, con la misma mano y sus propiedades actualizadas. No se busca la mejor secuencia conjunta de dos Tarot. Las garantías de persistencia, deshacer y errores de guardado son las de DECK04b/T09b.

## Búsqueda y legalidad

`compareArcanaChoices` recibe el estado y opciones `requireObserved`/`maxCandidates`. Para cada Tarot compatible restante enumera subconjuntos no vacíos de la mano, desde uno hasta su máximo de objetivos. No enumera permutaciones: estas doce transformaciones deterministas no convierten el orden de selección en una combinación diferente. H2 valida y aplica cada proyección desde el mismo estado; el asesor no reproduce sus fórmulas.

Oráculos combinatorios independientes para una mano de ocho cartas: máximo uno = 8; máximo dos = 8 + 28 = 36; máximo tres = 8 + 28 + 56 = 92. Chariot, Empress y Moon ofrecen 136 combinaciones de objetivos, más omitir. Omitir no consume parte del presupuesto de búsqueda y se evalúa por H2, incluidos los contadores compatibles.

El límite predeterminado es 1024 proyecciones de objetivos, configurable de 1 a 4096. Es un límite de trabajo, no un umbral estratégico ni una probabilidad. El informe distingue cantidad comparada, cantidad combinatoria cuando se conoce y truncamiento. Alcanzar el límite obliga a abstenerse de una ganadora global. La enumeración sigue el orden observado; la posición dentro de un mismo grupo no es un desempate.

No se añaden ventas, Tarot propios usados dentro del sobre, efectos pendientes, robos hipotéticos ni secuencias Mega completas. `exhaustive: false` conserva este límite de alcance incluso cuando se enumeraron todos los objetivos compatibles de la próxima elección. Contenido incompatible o desconocido y mano desconocida impiden concluir sobre todo el sobre, pero conservan los cálculos independientes disponibles.

## Política y explicaciones

Se reutilizan los seis apartados de `composition-1`: puntuación estructural, economía, sinergia, mazo, crecimiento y recursos. La baraja, ante, cartas, comodines y vales registrados permanecen en cada proyección. No se suman dólares, fichas y contadores ni se crean nuevas notas para Tarot. El índice global describe cambios; no decide la preferencia.

La ordenación por frentes de dominancia compara únicamente apartados conocidos con igual aplicabilidad. Una preferencia es condicional a esa **preparación contextual**: exige mejora en al menos un apartado sin empeorar los demás frente a las opciones excluidas. No prueba que la opción sea el mejor Tarot, que sus cartas se roben o que supere una ciega.

La política actual usa umbrales, máximos y redondeos y no valora todo el beneficio intrínseco de mejoras como Bonus, Mult, Steel, Glass o Gold. Dos vectores iguales significan **sin distinción en los apartados**, aunque las transformaciones y su utilidad sean diferentes. Se conservan objetivos y cambios exactos para que esa limitación sea visible. Reemplazar una mejora existente, cambiar palos o convertir a Piedra puede sacrificar beneficios no representados: se explicita el coste y no se declara superioridad estratégica a partir de esa dominancia. Omitir con crecimiento de Red Card se presenta como intercambio, sin convertir ese crecimiento en valor de cartas futuras.

Faltantes en apartados relevantes, reglas bloqueadas o búsqueda limitada producen abstención. Un grupo sin distinción o con ventajas repartidas se conserva, sin desempate por ID, rango o nota global. La política no usa porcentajes de victoria/confianza ni considera una transformación de mazo como una activación ya ocurrida.

## Separación del registro y contrato

El informe incluye revisión, huella completa del estado/opciones, acciones con objetivos, proyecciones H2, cambios de cartas, apartados antes/después, consecuencias, evidencia y limitaciones. `arcanaChoicesAreCurrent` invalida cambios de estado o premisas incluso si alguien editó datos manteniendo la revisión. No requiere una migración de guardados: el informe es transitorio y el modelo de partida no cambia.

Las listas y previsualizaciones también funcionan en la pestaña lectora sin permitir confirmaciones. La escritura sigue pasando por H1/T09b con revisión, identificador de confirmación y documento atómico; nunca se copia al registro el estado final de una comparación.

## Comprobaciones

```powershell
npm.cmd run check
npm.cmd run demo:arcana-choices
npm.cmd run test:arcana-choices
```

Las pruebas distinguen combinatoria y contratos de software de los efectos respaldados por L12/L13. Las verificaciones de navegador usan partidas sintéticas en perfiles temporales; no son evidencia de una partida de Balatro. Los reportes y capturas se guardan localmente en `docs/evidencia/arcana-choices/`. La variante pública contrasta el artefacto publicado antes de repetir las interacciones. La emulación de 390 px no se presenta como Android físico.

## Continuación

La valoración contextual aún requiere calibración estratégica EVAL01; este módulo no la sustituye. La siguiente ampliación de cobertura es otro lote explícito de Tarot, empezando por transformaciones deterministas de dinero o cartas que puedan validarse aisladamente. Cada efecto necesita su contrato H2, evidencia, confirmación recuperable y política aplicable. Spectral/Standard, Black Hole, descuentos y optimización de secuencias permanecen separados.
