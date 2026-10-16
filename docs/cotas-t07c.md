# T07c — cotas conservadoras de puntuación

Entrega de software: 2026-10-10. Método round-bound-1, contrato H2 sin ampliar. Las reglas siguen provisionales; no se cierra H2/T11 ni se afirma haber observado S09 en una partida.

## Uso

En la web, guarda los datos transcritos y pulsa **Comprobar límite de puntuación** junto a Consultar recomendaciones. No requiere planes ni cartas futuras. Muestra cada alternativa, errores, premisas y desglose. No guarda acciones, no ordena compras por su cota y no sustituye el consejo H3. Editar la partida, importar, recibir cambios de otra pestaña o mostrar una demo invalida la vista de cotas.

Demostración sintética S09, sin sobrescribir la partida:

```powershell
npm.cmd run demo:bound
npm.cmd run demo:bound -- --json
```

El ejemplo es examples/s09-bound.json. Importarlo en la web reemplazaría tu registro con un estado sintético tras confirmación: para ver sus cálculos sin alterar tu partida, usar la demo CLI.

APIs exportadas:

```ts
boundRoundScore(state, { requireObserved: false });
compareShopBounds(state, { expectedRevision: state.revision, updatedAt }, options);
```

boundRoundScore devuelve EngineResult con evidencia, traza y projected:true. Su valor incluye revisión, método, horizonte de una ronda, objetivo, número de manos, límites de fichas/Mult/score, términos y premisas. Unknown/incompatible devuelve errores claros, no cero ni una cota ficticia. requireObserved conserva la abstención actual.

compareShopBounds reutiliza H2 para conservar, una compra y una venta→compra por par instancia/oferta, como T07b. Cada rama parte de la misma entrada, con acción, resultado de tienda y cota o error. Se mantienen las acciones ilegales visibles. Desde T08c-1 la enumeración también incluye una venta individual por instancia. La enumeración no incluye secuencias de varias compras/ventas, rerolls, paquetes, vales, consumibles ni cambios durante la ronda; no es exhaustiva. Una oferta con datos ausentes impide concluir insuficiencia conjunta, aunque algunas ramas sí tengan cota.

## Demostración de la cota

Para la cobertura cerrada, todas las contribuciones implementadas de fichas y Mult son no negativas y aditivas. No existen retriggers ni XMult ni efectos que cambien bases durante la ronda.

1. Como máximo se juegan cinco cartas por mano. Las fichas de cartas se acotan por cinco veces el mayor valor del mazo completo confirmado (55). Permitir incluso cinco ases sobreestima: solo existen cuatro, pero una cota puede relajar restricciones.
2. Tomar por separado los máximos de fichas base y Mult base entre las nueve manos. No exigir que ambos pertenezcan a la misma mano sobreestima. Toda base debe ser conocida y positiva; un ejemplo favorable no reemplaza esta información.
3. Añadir límites por comodín con inventario fijo: Joker constante; Half hasta 20 salvo Psychic, donde es cero; Abstract 3 por comodín posterior a la acción; Even hasta cinco activaciones; Scholar hasta cuatro ases; Banner hasta tres descartes, o cero con Water.
4. Green no puede superar su contador inicial más cinco incrementos. Ignorar las reducciones por descarte y aplicar ese contador final a todas las manos sobreestima el total. No se modelan robos ni secuencias para obtenerlo.
5. Multiplicar máximos no negativos y luego por las cinco manos. Ignorar agotamiento del mazo y reutilizar los máximos por mano vuelve a sobreestimar. Finalizar antes no puede aumentar el número de manos.

Por tanto, para cada secuencia legal del modelo, puntuación acumulada ≤ manos × fichas superiores × Mult superior. Esta es la prueba analítica; las pruebas de software y la muestra de manos comprueban implementación y consistencia, no sustituyen la demostración ni el contraste en Balatro.

Las constantes numéricas de efectos se centralizaron en SCORING_EFFECTS (catalog/initial.ts), compartidas con scoring.ts y round.ts. No hay otra fórmula de puntuación en el asesor o la interfaz. La fórmula de la cota pertenece al motor y tiene sus propias premisas explícitas; no es scoreHand con una mano inventada.

### Interpretación asimétrica

- Cota **menor** que objetivo: insufficient_under_model. Ninguna secuencia dentro del inventario fijo y de estas premisas alcanza la ciega según el modelo provisional.
- Cota **igual o mayor**: not_ruled_out. No demuestra que se pueda ganar ni encontrar una mano que alcance esa cifra. No se recomienda el inventario con la cota mayor: una sobreestimación mayor no significa mejor rendimiento.
- Datos necesarios desconocidos/incompatibles: no hay cota. No se etiqueta pérdida ni se adapta silenciosamente el mazo.

El inventario confirmado se refiere a la transcripción del usuario, no certifica que se inspeccionaron todos los efectos reales. Vales, modificadores, versiones/mazos/jefes incompatibles invalidan el cálculo. No se presenta la insuficiencia del inventario como imposibilidad de salvar la partida mediante acciones fuera del alcance.

## S09: resultados independientes

Los primeros dos resultados estaban escritos en escenarios-v0.1.md antes de esta implementación. Estado tras Big ante 8, Violet Vessel 300000, cinco manos, mazo original/nivel 1, Joker/Half/Banner/Scholar/Green(40), dinero 30, Abstract ofertado por 4. Es un ejemplo sintético; su historial de obtención no fue observado en Balatro.

| Acción | Fichas superiores | Mult superior | Cota de ronda |
| --- | ---: | ---: | ---: |
| Conservar | 100+55+90+80 = 325 | 8+4+20+16+45 = 93 | 151125 |
| Joker → Abstract | 325 | 104 | 169000 |
| Half → Abstract | 325 | 88 | 143000 |
| Banner → Abstract | 235 | 108 | 126900 |
| Scholar → Abstract | 245 | 92 | 112700 |
| Green → Abstract | 325 | 63 | 102375 |

Comprar sin vender se rechaza por falta de plazas. Cada reemplazo retira su efecto y añade Abstract +15 por cinco comodines. Todos estos límites son menores que 300000. No se extrapolan ingresos de Golden o interés después del objetivo del ante 8.

## Verificación y límites restantes

- `npm.cmd run check`: **114 aprobadas, 0 fallidas, 10 TODO** manuales. Once nuevas pruebas incluyen S09/reemplazos, inmutabilidad, bases explícitas, desconocidos, incompatibles, Psychic/Water, revisión, modo estricto, precisión numérica, aislamiento por rama y CLI.
- `npm.cmd run test:reference`: **29 coincidencias EFHIII** tras centralizar constantes. Sigue siendo contraste independiente de puntuación, no prueba de la cota ni de observación.
- `TEST_BROWSER=chromium`, `BROWSER_CHANNEL=chrome`, `npm.cmd run test:web`: **14 grupos aprobados**. Se añadió importar S09 en perfil temporal → calcular sin escenarios → no escribir → invalidar al editar; revisión de anchura 360 px sin desbordamiento. [Informe](evidencia/t11/chromium/verificacion.json) y [captura](evidencia/t11/chromium/cotas-s09.png).

No hay Monte Carlo, búsqueda exhaustiva de manos o validación empírica de eficacia estratégica. Android físico y Firefox siguen con los límites documentados en T11. H3 conserva su política; la cota es una comprobación adicional visible, no un cambio oculto del ranking.

T07c queda completo como software dentro del contrato. T08c-1 ya añade ventas solas al comparador, política y cotas, con pruebas de pérdida de beneficio/crecimiento. Los horizontes de varias rondas requieren después un contrato explícito de estados y condiciones; no se simulan futuros desconocidos para declararlos terminados.

