# Valoración de la Mesa: quick-fit-2

Implementada el 2026-10-13. La Mesa valora comodines poseídos y candidatos **sin planes de manos, sin guardar, sin objetivo de fichas y sin confirmar la cobertura del cálculo exacto**. Usa ante, baraja, inventario, composición transcrita y datos particulares disponibles. La falta de dinero limita compras o efectos ligados al saldo; no impide valorar el Mult básico.

## Flujo

La [composición global](composicion-global.md) aparece debajo de Tus comodines: un índice y seis barras para Puntuación, Economía, Sinergia, Mazo, Crecimiento y Recursos. Resume únicamente el inventario actual y se recalcula con los datos de Mesa. Pulsar un número abre su cálculo; no se muestran explicaciones permanentes ni se requiere una mano o guardar. Esta media editorial es distinta de la nota individual y de las fichas exactas de Análisis; no determina por sí sola una compra. **Desde SHOP01, Candidatos se sustituye por [Tienda](tienda-contextual.md)**: ofertas de sesión, precios editables, vales, sobres y decisión contextual. Las referencias inferiores a Candidatos describen la entrega anterior; el flujo actual está en el contrato de tienda.

Elegir baraja, ante y ciega; introducir dinero y añadir comodines desde sus fichas. La nota aparece bajo cada carta. Hasta cuatro candidatos muestran encaje y motivo. Pulsar abre condiciones, coste y sacrificios de reemplazo. Si cambió el mazo, editar Mazo actual o confirmar una composición inicial que corresponda a la partida. En una vista nueva, mientras se usa la plantilla inicial, cambiar baraja aplica su composición original: Cuadriculada tiene26 corazones/26 picas y Abandonada40 cartas sin figuras. La plantilla se identifica como «inicial», no como observación del juego. Al editar una carta se deja de seguir la plantilla y cambiar la baraja no sobrescribe esas cartas. Los registros recuperados no se reinicializan. Errática exige composición real; no se inventan sus52 cartas aleatorias.

Pulsar un comodín propio ofrece **Vender** y **Editar**. [Vender](ventas-mesa.md) actualiza el borrador mediante H2 y recalcula sus notas; no escribe la copia guardada. Quitar fila solo corrige una transcripción sin cobrar dinero. Datos o efectos de venta incompatibles muestran su error, sin quitar la carta ni asumir una transacción exitosa.

Manos y robos hipotéticos están exclusivamente en **Análisis**. «Calcular manos del mazo y candidatos» reutiliza H2/T07b con el mismo estado y planes por alternativa. Un error antes de ejecutar eventos no muestra cero puntos como resultado válido. Editar invalida resultados y respuestas asíncronas pendientes. **Registro** conserva transcripciones y acciones confirmadas H1/T09b; los controles de guardar mantienen `form=run-form` aunque estén en otra pestaña. Sin cambio de formato ni autoguardado nuevo.

## Índice abierto con una décima

La revisión sustituye el cociente `/10` por un **índice editorial sin techo fijo**, visible tanto en inventario como candidatos y fichas. Más índice significa más encaje según esta política, no una recomendación automática de compra. El cambio no consiste solo en multiplicar notas antiguas: incorpora proporciones continuas, etapa interpolada y diferencias de aportes registrados. El [plan y los oráculos](indice-encaje.md) explican los ejemplos y límites.

`src/advisor/quick-fit.ts` es puro y determinista; `src/advisor/fit-index.ts` centraliza política, anclajes, referencias y formato numérico. Los150 IDs tienen [perfiles explícitos](perfiles-encaje.md); es cobertura editorial, no150 efectos de manos contrastados.

| Componente | Unidades de índice | Criterio |
| --- | --- | --- |
| Etapa | 0–40 | Perfil interpolado linealmente entre ante1,4,8. Inicio/desarrollo/cierre sigue siendo una etiqueta descriptiva. Material escaso puede reducir este componente. |
| Preparación | 0–30 | Condición imposible:0. Desarrollo pendiente:10. Uso condicionado sin densidad específica:20. Requisito disponible:30. Material positivo puntuado/retenido: `10 + 20·n/N`; permanece potencial. |
| Construcción | 0/10/20/30 | Conflicto, función presente, función nueva o relación potencial específica con soporte; no se apilan combos. Falta inventario/balance: desconocido. |
| Aporte registrado | Desde0, sin máximo fijo | Ajuste logarítmico editorial solo para la lista explícita de contadores de puntuación admisibles. Describe magnitud presente; no garantiza activación ni crecimiento futuro. |

`score = redondear1decimal(10·suma(ejes) + ajuste)`. Las referencias del ajuste son decisiones de resolución editorial:100Fichas,20Mult y100centésimas de gananciaXMult. **No establecen equivalencia mecánica entre esos aportes** ni se suman dólares o puntos de mano al índice. No está calibrado como utilidad estratégica; diferencias entre funciones, riesgos y precios todavía necesitan leer los motivos.

Una condición conocida no disponible limita el índice a20, después de todos los ajustes. Una décima permite ver diferencias del modelo, sin prometer precisión predictiva. Un eje desconocido devuelve `score:null`: rango si existen cotas finitas, o `≥mínimo` si falta un contador de desarrollo sin máximo conocido. `range[1]=null` expresa ausencia de cota, no100niInfinity. No son intervalos estadísticos ni porcentajes de confianza. Plasma conserva la integración desconocida sin medir su balance.

Colores: índice≥70verde,≤30rojo, intermedio dorado e información incompleta gris. Son referencias editoriales de presentación, no umbrales de compra o supervivencia. Se permiten empates. Un efecto de economía no se convierte en peor compra por tener menos ajuste de puntuación; dinero, coste y pérdidas se conservan separados.

El escalador con aporte registrado conserva etapa de al menos2, criterio para no borrar desarrollo por ser tarde. Solo se ajustan campos en `FIT_MAGNITUDE_COUNTERS`: Fichas, Mult o XMult; Castle no usa palo objetivo, Yorick no usa cartas pendientes, Loyalty/Invisible no usan progreso. Ingresos, duración y tamaño de mano permanecen descriptivos. Una compra nueva usa contadores iniciales; nunca hereda la instancia vendida. La API rechaza combinar `instanceId` con `purchase:true` y rechaza una instancia de otro comodín.

## Predicados y relaciones

Se comprueba material de palos, rangos y mejoras, patrones posibles de composición y soporte retenido. Material disponible no significa mano observada ni frecuencia de robo. Para material puntuado/retenido, cada carta pertinente cambia el componente de preparación mediante `n/N`. Las bandas escaso/moderado/abundante solo describen el material; ya no redondean su contribución. Aun con todas las cartas pertinentes permanece **potencial**: todavía hay que robar y utilizarlas. Con soporte positivo menor a1/4, el tope editorial de etapa es `2 + 2·min(1, (n/N)/(1/4))`, antes de convertir a índice; así tampoco salta de golpe al alcanzar la antigua banda. Encontrar los nombres de un combo no acredita una construcción preparada. Se conserva el tratamiento separado de contadores desarrollados. Una carta que es rey de Acero cuenta una sola vez en la densidad de soporte de Mimo.

Steel Joker, Stone Joker y Driver's License usan el mazo completo, con sus condiciones propias. También se consideran Pareidolia, Smeared, el umbral de16 mejoras, Stencil/huecos, Baseball/inusuales físicos y Swashbuckler/venta de otros. Blueprint requiere objetivo compatible y posición; Seeing Double requiere dos cartas distintas de los palos pertinentes.

Las [17 familias composicionales](composiciones.md) conectan participantes y material: retención Acero/Barón/Mimo, figuras/Fotografía/Chad, rangos bajos/Wee/Hack/Fibonacci, generación ADN/Holograma, Piedra/Mármol, corazones/Heliotropo, Oro en distintas zonas, Tarots y planetas, entre otras. La [investigación adicional](evidencia/composiciones-2026-10-13.md) conserva autores y errores filtrados. Mimo no repite Steel Joker ni un sello dorado retenido. Requisitos de carta, orden, eventos o azar siguen potenciales. `condition` es una dependencia primaria, no la definición mecánica completa: dependencias sin datos/predicado producen incertidumbre.

Una relación positiva con soporte comprobado lleva Construcción a3; un conflicto pertinente la lleva a0. **No se apilan bonificaciones por encontrar varios nombres de combos.** Información desconocida produce señales explicativas sin bonificar. La biblioteca documental de32 relaciones se conserva como referencia y no se ejecuta automáticamente como una lista AND.

La preparación de un reemplazo usa el inventario conservado; Pareidolia/Burglar vendidos no habilitan efectos nuevos. Se muestra beneficio y contador sacrificado. Si H2 valida la transición, dinero y recursos posteriores se usan para valorar el nuevo efecto; comprar Bootstraps gastando todo el saldo no mantiene el soporte del dinero anterior. El estado proyectado no se expone como partida real ni se guarda. Si no puede validarse, la nota descriptiva no fabrica un saldo posterior.

## Legalidad y límites

Compra base y venta→compra se validan con `applyShopAction` sobre una copia. Se conservan capacidad, precio, saldo, Eternal, venta incompatible y `requireObserved`. Si falta cobertura o una regla, se mantiene la valoración descriptiva y se indica **compra sin validar**. Una nota alta no autoriza una acción ilegal. Consultar no cambia dinero, tienda, historial ni partida persistida.

Los perfiles usan [investigación estratégica](meta-estrategico.md) y evidencia estática 1.0.1o, sin convertirla en observación del juego. Política sin validación de eficacia ni tiers de Gold importados como notas de Blanca. No amplía el cálculo exacto publicado 82/68 ni integra por sí sola campos CAT04, 22 vales pendientes, consumibles o sobres. Historiales, objetivos, copias y condiciones conjuntas todavía necesitan datos y predicados específicos; la ficha lo limita.

## Verificación

`npm run check`: 440 aprobadas, 0 fallidas, 10 TODO manuales. Incluye las47 pruebas de la primera entrega y18 casos I01–I18 con oráculos editoriales independientes, además de Q01–Q08, condiciones límite, desconocidos, reemplazos, inmutabilidad, perfiles150 y modo estricto. Pruebas de software, no observación de Balatro ni evaluación de eficacia.

`npm run test:fit`: ocho grupos con cobertura sin marcar, cero planes y cero escrituras. Índices de inventario/candidatos, ante, Green desconocido→12→13, Cuadriculada frente a Azul, Abandonada sin figuras→reina transcrita y conservación del mazo editado, pantallas separadas y reflujo390–1440. [Informe](evidencia/quick-fit/report.json) y [Mesa](evidencia/quick-fit/mesa-desktop.png). Emulación de anchura, sin nueva prueba física de Android.

Regresiones de quick-fit-2 ejecutadas: web(17grupos), diseño(15grupos), galería, candidatos y Mesa viva. Objetivos, cobro, vales y colección pertenecen a la verificación previa sin cambios de sus módulos en esta revisión. Oráculos 80→572/$2 y 240→676 comprobados en Análisis; holográfica 3712→4176 conservada. Los esperados no proceden de la salida del evaluador probado.
