# OBS01d — valorar las cartas actuales sin introducirlas dos veces

Entrega de software del 1 de noviembre de 2026. Ajusta el alcance de [la hoja vigente](hoja-de-ruta-asesor.md) a la aclaración del usuario: comenzar con la composición de la baraja elegida y registrar sus cambios. No se añade otro formulario de cantidades ni un nuevo formato de resumen parcial persistido.

## Flujo de uso

1. Iniciar una partida compatible carga sus cartas iniciales con identidades. Las diez barajas integradas conservan el inicio existente: estándar52, Abandonada40, Cuadriculada con26 picas/26 corazones o Errática desconocida. Las otras cinco siguen catalogadas, sin ampliar silenciosamente la cobertura del inicio.
2. En **Mesa → Partida → Mazo actual**, cambiar rango, palo, mejora, sello o edición de una carta guarda la observación al terminar. Quitar una carta registra su retirada. Los datos restantes se conservan; no hay que volver a introducir el mazo.
3. **Añadir carta observada** abre un borrador: elegir rango/palo y revisar mejora, sello, edición, fichas adicionales y debilitamiento. Solo **Añadir esta carta** incorpora la carta con un ID nuevo. Cancelar o dejar datos inválidos no guarda una carta por defecto.
4. Las notas de los comodines, las barras de composición y las ofertas de tienda se recalculan usando esas mismas cartas, etapa, inventario y vales existentes. El pequeño recuento del editor es derivado, no editable por separado.

El guardado reutiliza [UX01b](autoguardado-basico-ux01b.md) y T09b: revisión, historial, deshacer, copia recuperable y pestaña escritora. Ante error o revisión externa mantiene el borrador y permite reintentar o descartarlo explícitamente. Una compra/venta sigue necesitando confirmación; editar una carta no registra el uso de un Tarot, un precio ni un robo.

La composición inicial no se aplica sobre una partida en curso por cambiar su nombre. **Usar composición inicial que confirmé** continúa siendo una restitución explícita de la lista, conservada en el historial. Los cambios de baraja inicial y recursos avanzados mantienen su guardado separado y bloquean mezclar esos borradores con una corrección del mazo.

## Una fuente para el material

`src/state/deck-material.ts` proporciona `resolveDeckCards`, `currentDeckCards`, `summarizeDeckCards` e `inspectDeckMaterial`. Lo usan `quick-fit`, `composition`, `composition-signals`, el editor y la reconciliación de inventario.

- Una lista explícita de cartas actuales prevalece sobre la plantilla inicial, también si se ha añadido un rey a Abandonada.
- El preset antiguo estándar solo se expande si el perfil conocido admite estándar52. Un perfil desconocido, Errática o un preset contradictorio no fabrica cartas.
- Se derivan tamaño, rangos, palos, mejoras, sellos, figuras e intersección reyes/Acero. El conjunto completo y el utilizable sin debilitamiento registrado están separados. Piedra no aporta rango/palo efectivo; Wild/Smeared/Pareidolia se resuelven en sus condiciones específicas, sin falsear los recuentos físicos.
- Se devuelven copias independientes. Desconocido es distinto de cero conocido. No se almacenan cantidades redundantes que puedan contradecir las cartas.

Barón y Mimo conservan sus condiciones de cartas retenidas; Steel Joker conserva el recuento de Acero del mazo completo. Un rey de Piedra o debilitado no acredita soporte retenido; Pareidolia no crea un rey real. Un rey de Acero pertenece a la intersección y no se cuenta dos veces en la unión. Se mantiene la diferencia entre material disponible y una carta efectivamente robada y retenida.

Los pesos del índice y la política estratégica no cambian. Se elimina la inconsistencia de los tres antiguos accesos al mazo y se corrige el respaldo de integración que podía aceptar un rey/Acero no elegible. Los efectos sobre etapas y vales ya implementados se conservan; no se atribuye a esta entrega toda la cobertura previa ni nuevas interacciones de vales.

## Correcciones y límites

`prepareBasicObservation` admite una corrección acotada de `deck`, con validación estructural e identidades existentes. Reutiliza la invalidación de crecimiento de `inventoryChanges`: una adición puede afectar Holograma; una retirada, Caino/Glass; una modificación, Vampiro. Si la causa/resultado no se conoce, el contador afectado queda desconocido y debe transcribirse. No se suma crecimiento por editar la lista. La interfaz sincroniza ese desconocido para que una edición posterior no restaure el contador antiguo.

Las referencias reales a cartas retenidas continúan protegidas. Si una retirada invalida escenarios guardados, se rechaza salvo que el usuario marque **Retirar escenarios guardados anteriores**; la corrección y esa retirada son atómicas y recuperables. Una consulta o escenario hipotético nunca actualiza el mazo real.

Errática y las composiciones con cambios sin registrar no se reconstruyen desde el nombre de baraja. Sin una lista completa conocida, añadir una carta aislada permanece bloqueado: no se transforma un mazo desconocido en uno ficticio de una carta. Los datos completos pueden incorporarse mediante los mecanismos existentes de importación/reconciliación con referencia conocida. La entrada abreviada de una composición totalmente desconocida sigue fuera de esta entrega; no se añade un cuestionario de cantidades parciales.

No se predicen robos, consistencia probabilística, puntuación de una mano ni victorias completas a partir de estos recuentos. El índice sigue siendo heurístico. Las reglas conservan evidencia provisional de inspección estática de Steam PC1.0.1o-FULL sin mods: [L02](evidencia/sinergias-l02.md), [condiciones de baraja](barajas-condiciones.md) y [familias de composiciones](composiciones.md). No hay observación nueva en Balatro ni cierre de H2/EVAL01b.

## Comprobaciones

```text
npm run check
npm run test:deck-material
```

967 pruebas de código aprobadas,0 fallos y10 TODO manuales. Veinte pruebas nuevas con esperados literales: diez inicios integrados, cuentas de reyes/palos/Acero, intersecciones, Piedra/debilitamiento, conocido0/desconocido, copias, correcciones aisladas, invalidación de crecimiento, referencias, fallos de guardado y deshacer. Las relaciones de valoración comprobadas son ordinales y justificadas por el material; no se usa la salida del motor como su propio esperado.

El script de navegador utiliza perfiles aislados y diez grupos: plantillas iniciales reales de la UI, cambiar Acero, editar rey/palo, recarga/reversión, consulta sin escrituras, añadir/quitar con IDs, desconocidos, cuota/revisión externa, contadores y móvil390px. Informes y capturas runtime en `docs/evidencia/mazo-actual/`, ignorados según la convención del repositorio. Son escenarios sintéticos y móvil emulado; no Android físico ni validación estratégica en partidas.

Las regresiones existentes de autoguardado (14 grupos), consejo rápido (7), inventario (8), composición y despliegue estático conservan sus comprobaciones. Los controles de las barras mantienen sus nodos al recalcular: salir de un campo no elimina el botón que el usuario acaba de pulsar.

El workflow de Pages incorpora el script y la regresión de composición. El modo público admite `DECK_MATERIAL_BASE_URL`, `DECK_MATERIAL_COMMIT` y `DECK_MATERIAL_WORKFLOW`: contrasta20 archivos críticos con el artefacto y repite las comprobaciones. La siguiente entrega es DEC02: comparar opciones con beneficio preparado y sacrificios concretos, conservando empates y condiciones cuando los datos no justifican una preferencia.
