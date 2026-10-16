# OBS01a — cambios por grupo y valores pendientes

Entrega del 16 de octubre de 2026. Primera parte de OBS01: conservar grupos independientes al registrar progreso y completar hechos numéricos concretos sin volver a guardar el formulario completo. No cierra la conciliación por carta ni la matriz de capacidades CAP01a.

## Uso

En una confirmación del recorrido, «sin cambios» conserva el comportamiento anterior. Si algo cambió, abre **Indicar qué cambió** y marca únicamente mazo, comodines, niveles, vales/modificadores, recursos o consumibles/historial. Solo esos grupos quedan pendientes; estás confirmando que los demás siguen iguales. No marcar nada produce un error, en lugar de borrar la certeza sobre todo el inventario. Los contadores que puedan caducar por el tramo siguen las reglas conservadoras de RUN01b.

**Datos pendientes**, en Mesa, aparece únicamente si hay solicitudes compatibles. Permite completar los contadores implementados de los comodines poseídos, valores de venta desconocidos en tienda y saldo/recursos desconocidos en selección o tienda. El saldo de cobro sigue en su control específico. No pide datos de los otros comodines del catálogo. Dos copias se identifican por posición e ID de instancia; nunca se aplica un valor a ambas por compartir nombre.

Se pueden completar varios campos y pulsar **Registrar valores observados**. Los vacíos siguen desconocidos; cero debe introducirse expresamente. La corrección se guarda con su historial, recalcula la vista y desaparecen las solicitudes resueltas. Deshacer recupera los hechos previos. Consultar, abrir el panel o escribir sin registrar no cambia el estado real.

## Contratos

- `inventory.reconcile.changedGroups` es una variante nueva de la declaración de inventario de progreso. Lista no vacía, sin duplicados ni campos arbitrarios. Un grupo marcado pasa a desconocido; los otros conservan sus datos después de las invalidaciones propias del suceso. No reconstruye los cambios internos de ese grupo.
- Los modos históricos `unchanged` y `patch` conservan su semántica, incluida la de `patch:{}`. No se reinterpretan archivos anteriores ni se ejecutan de nuevo sus acciones. Un lector anterior puede rechazar la nueva variante; nunca debe descartarla para escribir una versión parcial.
- `observationNeeds(state)` es puro. Devuelve ID estable por entidad/campo, etiqueta/unidades, motivo, operaciones afectadas, límites de entrada y revisión. Reutiliza `counterSpecs` y el contrato existente de Green Joker. No genera valores iniciales para una instancia poseída.
- `observationPatch(state, answers, expectedRevision)` acepta respuestas a solicitudes actuales, sin duplicados y dentro del rango admitido. Solo construye el parche observado de esos campos. Rechaza estados proyectados o claves adicionales; no puntúa ni infiere el valor desde manos/descartes.
- La UI vincula el envío a la revisión original y usa `store.correct`, conservando revisión, exclusión entre pestañas, historial, ID y escritura atómica de T09b. Un fallo conserva el registro previo; los datos no se anuncian guardados antes del éxito.

Las solicitudes no se conservan como otra fuente de verdad: se reconstruyen desde el registro. Cualquier cambio de revisión obliga a obtener la lista actual. Resolver Green de una instancia no cambia otro Green, el dinero, el mazo, los vales ni las hipótesis guardadas.

## Evidencia y comprobaciones

No añade reglas ni las promociona a observadas. Los rangos/unidades proceden del catálogo ya implementado; los hechos transcritos son declaraciones del usuario, no una comprobación directa de Balatro por esta herramienta. El modo estricto del motor no cambia.

- `npm.cmd run check`: **603 aprobadas, 0 fallos, 10 TODO de contraste manual**. Nueve pruebas nuevas de solicitudes/parches/grupos/persistencia.
- `npm.cmd run test:observations`: siete grupos de Chrome: consulta sin escritura, vacío/negativo inválidos, Green observado7 conservando otra copia9, recarga, deshacer, cuota, revisión antigua, grupos independientes, pestaña de lectura y móvil390.
- Regresiones: 17 grupos de recorrido, 17 de navegador y 14 de tienda aprobados. El test de recorrido ahora marca los grupos que realmente cambiaron y verifica que los demás sobreviven.
- Capturas escritorio/móvil emulado inspeccionadas, sin desborde en el caso probado. Android físico sigue aplazado. JSON/capturas se generan en `docs/evidencia/observaciones/`, ignorados por Git. La comprobación pública posterior al despliegue se registra separadamente, sin inferirla del build.

Los esperados son contratos independientes: introducir Mult7 conserva el Green9 y todos los demás hechos; un recurso nuevo conserva los restantes; marcar solo mazo no invalida vales/inventario/recursos. No se usa la puntuación producida por el asesor como oráculo para sus propias fórmulas.

## Continuación: OBS01b / CAP01a

Actualización: [OBS01b entrega cartas y consumibles por instancia](cambios-inventario-obs01b.md). Las limitaciones siguientes describen lo pendiente al cerrar OBS01a; comodines, bases e historial parcial siguen abiertos.

Todavía falta conciliar cambios internos por instancia: añadir/quitar/mejorar una carta, cambios concretos de comodines/consumibles, bases de manos e historial parcial. Un grupo marcado se conserva como desconocido hasta transcribirlo; esta entrega no fabrica las otras 51 cartas si solo se observó una. La edición de mazo existente sigue disponible, pero no se declara terminado el editor incremental.

También falta distinguir capacidades por operación para todo el catálogo y priorizar las preguntas que realmente cambian una comparación particular. Esta primera lista cubre hechos numéricos implementados del inventario actual; no es un diagnóstico de supervivencia ni prueba de soporte completo de cada comodín. DEC00/DEC01 y SURV01 siguen pendientes; TAG01, sobres y simulación mantienen sus dependencias anteriores.
