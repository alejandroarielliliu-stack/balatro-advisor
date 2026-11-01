# UX01b — datos básicos sin Guardar

Entrega de software: 1 de noviembre de 2026. Continúa [UX01](consejo-compacto-ux01.md) y reutiliza [T09b](confirmaciones-t09b.md). No cambia la política del asesor, las fórmulas H2 ni el catálogo. El resumen parcial del mazo OBS01d sigue pendiente.

## Qué se guarda y cuándo

Con una partida ya registrada, Mesa guarda dinero, contadores/valor de venta/edición de comodines, inventario y orden, y vales observados. Terminar un campo válido (salir del campo o Enter), cerrar el editor o completar una modificación de inventario/vales genera una corrección T09b. Escribir recalcula la vista, pero no guarda por tecla. Volver al valor anterior no crea una revisión innecesaria.

El aviso «Guardado» confirma la persistencia. El historial identifica los grupos corregidos y conserva revisión anterior/nueva y recuperación existentes. Una edición no inicia por sí sola una partida: la primera creación sigue siendo explícita. Los cambios de baraja, bases de manos y recursos manuales conservan el guardado avanzado de Registro; ante/fase mantienen el recorrido observado. Una edición avanzada pendiente no se incluye silenciosamente al guardar dinero. Si afecta los recursos de comodines/vales, se exige resolverla antes de guardar ese grupo.

Transcribir un comodín o un vale adquirido es una observación, sin descontar su precio ni inventar un recibo. Una compra/venta realizada continúa por su confirmación explícita H2/T09b. Consultar consejos, abrir detalles, seleccionar escenarios y comparar nunca copia robos hipotéticos, ingresos proyectados ni estados finales al registro. Las ofertas visibles conservan su mecanismo de guardado separado.

## Garantías y recuperación

- `prepareBasicObservation` valida un parche pequeño: dinero, comodines, vales y recursos dependientes. Rechaza otras propiedades y valida también el estado combinado. No calcula compras, revisiones, fechas ni puntuación.
- Un dato desconocido no se convierte en cero o edición Base. Las observaciones equivalentes conservan procedencia; cambiar un efecto no hereda sus contadores. Otros consumibles, etiquetas, modificadores y supuestos permanecen intactos.
- La capacidad se ajusta con los mecanismos de recursos existentes: una edición Negativa no añade dos espacios al resolver un desconocido; cambiar un contador no sustituye recursos ajenos desconocidos por valores por defecto.
- La transcripción admite dinero entero con signo dentro del rango seguro de H1. Esto no autoriza gastos: H2 sigue comprobando la deuda y legalidad de cada acción.
- Antes de guardar se comprueban revisión/copia persistida y pestaña escritora. Un error de validación, cuota, permiso o revisión no cambia el registro previo y conserva el borrador visible. Se ofrecen **Reintentar** y **Descartar borrador y recargar**. La segunda opción descarta explícitamente la edición local.
- Estado e historial se escriben juntos mediante `store.correct`; se conserva el mecanismo existente de deshacer. Una revisión nueva invalida los consejos anteriores. Al resolver una corrección no se reconstruye todo el formulario: se conserva el editor y se actualizan los controles de la tienda.

No hay una nueva clave de almacenamiento, versión de archivo, migración, dependencia ni arquitectura de eventos. Los archivos existentes siguen utilizando H1/T09b. Como antes, los datos son locales al navegador/origen, no una cuenta sincronizada.

## Pruebas reproducibles

```text
npm run check
npm run test:basic-autosave
```

Requiere Node24 y Chrome instalado, como las pruebas web existentes. `npm run check`: **947 aprobadas, 0 fallos y 10 TODO manuales**. Incluye once pruebas nuevas del parche: campos acotados, entradas inválidas, inmutabilidad, metadatos, desconocidos, contadores, vales y combinación con recursos.

El script web aporta **14 grupos sintéticos**, sin errores JavaScript: guardar solo al terminar; volver al valor original sin escribir; dinero/Green y recarga; consulta sin escrituras; edición y orden de inventario sin compras; no heredar crecimiento al cambiar efecto; vales y recursos; desconocidos/extraSell; edición Negativa sin duplicar capacidad; dato inválido; fallo de persistencia y reintento; revisión externa/segunda pestaña; móvil390px y sin creación automática; recursos de Turtle Bean, dinero negativo y separación de ajustes avanzados. Las expectativas son ediciones literales y contratos de revisión/preservación, no resultados generados por el propio motor.

Pasan también las regresiones existentes de navegador general (17 grupos), tienda (15), vales, Mesa/cálculo exacto, consejo compacto (6), compras de vales (10), recorrido observado (17), detalles observados (9) y cobro de ronda. Se adaptan los pasos de interacción al guardado automático sin eliminar las comprobaciones de legalidad, recibos, recuperación ni los esperados independientes de puntuación.

Capturas e informes runtime en `docs/evidencia/ux01b/`, ignorados conforme a la convención del repositorio. Se inspeccionaron escritorio y móvil emulado. No constituyen Android físico, sesión de un jugador ni observación directa en Balatro; no cierran EVAL01b o las reglas provisionales de H2.

El workflow de Pages ejecuta el nuevo script antes de publicar. Para contrastar el artefacto público, el script admite `AUTOSAVE_BASE_URL`, `AUTOSAVE_COMMIT` y `AUTOSAVE_WORKFLOW`: compara HTML, CSS y18 módulos críticos (20 archivos) con `out/` y repite los14 grupos en perfiles aislados.

## Próxima entrega

OBS01d.1: resumen parcial de material del mazo, con cuentas conocidas/desconocidas e intersecciones explícitas. Debe reutilizar este guardado y las validaciones existentes, sin fabricar cartas ni obligar a introducir los52 naipes. Barón/Mimo/Steel Joker se conectarán después, en OBS01d.2; esta entrega no afirma haberlos mejorado.
