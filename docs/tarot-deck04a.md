# DECK04a — Tarot propios con cartas objetivo

Entrega del 17 de octubre de 2026, motor 0.9.1. Se conecta el primer lote determinista de Tarot al estado 0.2 y al registro recuperable T09b. Se reutilizan las cartas por instancia, el inventario de consumibles y la mano de `phaseData.in_round.heldCardIds`; no se añade otro estado real ni se amplía la cobertura de barajas.

## Flujo

1. Durante una **Ronda**, **Mis consumibles** permite transcribir lo que realmente se posee mediante OBS01b. Registrar una posesión no ejecuta ni valida su compra.
2. En **Tarot → Registrar cartas en mano**, selecciona las cartas que ves, de izquierda a derecha. Confirma esa observación. No se simulan robos, se gastan jugadas ni se presume que esas cartas son todas las del mazo.
3. Elige un Tarot poseído y sus objetivos entre las cartas de esa mano. La vista previa muestra la transformación de H2 y, aparte, el cambio de índice de composición cuando está disponible. Seleccionar o consultar no escribe el registro.
4. Después de usarlo en Balatro, pulsa **Usé este Tarot** y confirma los objetivos y la vigencia de la mano. H2 vuelve a validar antes de que T09b guarde estado e historial juntos.
5. Recargar conserva las cartas transformadas, el inventario y el historial. **Deshacer** corrige solo el último registro local; no modifica el juego.

Si jugaste, descartaste o robaste fuera de este flujo, debes actualizar la mano antes de otro uso. El asesor manual no puede detectar por sí solo esos sucesos. Registrar la mano es una observación distinta de consumir el Tarot.

## Cobertura

| Tarot | Cambio | Objetivos de la mano |
|---|---|---|
| Mago / Emperatriz / Hierofante | Suerte / Mult / Bonificación | 1–2 |
| Enamorados / Carro / Justicia / Diablo / Torre | Comodín / Acero / Cristal / Oro / Piedra | 1 |
| Estrella / Luna / Sol / Mundo | Diamantes / Tréboles / Corazones / Picas | 1–3 |

Son doce Tarot. `c_hierophant` es la identidad canónica que ya usa el asesor; `c_heirophant` es la grafía de la fuente del juego, no otra carta ni un segundo ID guardado. La etiqueta de la interfaz reconoce ambas grafías, pero los consumibles siguen usando la identidad canónica.

Una mejora sustituye la anterior. Se conservan identidad, rango, edición, sello y fichas permanentes. Un cambio de palo conserva la mejora y modifica también el palo latente de Piedra. Pasar de Piedra a otra mejora recupera su rango/palo ya registrados. Aplicar un efecto que ya coincide es legal y consume el Tarot. No se dispara creación o destrucción de cartas por reemplazar una mejora, ni crecimiento de Hologram/Glass/Canio por ese solo hecho.

Los objetivos deben existir en el mazo y figurar en la mano observada. Se rechazan listas vacías, repetidas, fuera de la mano o superiores al máximo del Tarot. El tamaño de mano conocido también limita la observación; si es desconocido, se conserva la incertidumbre y se registran solo las cartas declaradas. No se interpreta una mano observada como un reparto probable ni se fabrican cartas faltantes.

Cambiar cartas obliga al juego a revisar su debilitamiento. Este lote limpia el debilitamiento solo en Pequeña/Grande, en un jefe desactivado confirmado o en los cuatro jefes sin debilitamiento de cartas ya admitidos: Psychic, Water, Wall y Violet Vessel. Un jefe activo con otras condiciones o historial no cubierto limita el uso con `unsupported_debuff_refresh`; **no impide registrar la mano**. La documentación de evidencia enumera los casos que aún requieren recalcularse; no se conserva ni se limpia una bandera incompatible a ciegas.

## Estado, reglas y persistencia

`src/state/tarot-contract.ts` define dos acciones actuales:

```ts
{ type: 'observe_round_hand', cardIds: ['8S', 'KH'] }
{ type: 'use_tarot', instanceId: 'owned-chariot', targetCardIds: ['KH'] }
```

`applyTarotAction` es determinista e inmutable. Devuelve el estado proyectado, cambios `before/after` por carta, trazas, evidencia y limitaciones. La observación no cambia el mazo ni el inventario; el uso retira únicamente el consumible elegido y transforma únicamente los objetivos. No calcula puntuación de manos, ingresos, interés, probabilidades ni una nueva ronda. Dinero, puntuación, manos y descartes se conservan; no se exige conocer dinero o plazas de comodines para una transformación que no los utiliza.

El contador conocido de Tarot usa el hook compartido CAT04 y aumenta una vez por carta Tarot usada, no por objetivo ni por copia de Fortune Teller. Si falta el total anterior, sigue desconocido y se comunica que no se puede derivar su bonificación exacta. Esa incertidumbre no bloquea la transformación de cartas. La lectura del inventario físico en el hook se aplaza a las ramas que la necesitan; un inventario de comodines desconocido no impide actualizar un total global conocido.

T09b mantiene revisión, ID de confirmación, guardado atómico, rechazo de duplicados, recarga, deshacer y limitaciones en el historial. Un fallo conserva el documento previo completo y permite reintentar una confirmación que no llegó a guardarse. No se copia una proyección al estado real sin confirmación. El formato 0.1 y `confirmed-1` permanecen congelados; requieren su migración explícita existente. No se exige una nueva migración de las copias 0.2 previas.

## Evidencia y verificación

[L12: fuentes primarias, versiones, hashes y casos mínimos](evidencia/tarot/README.md) conserva las comprobaciones de `tarot.targets` como **provisionales por inspección estática**, sin observación nueva en una partida. El modo estricto mantiene su bloqueo de evidencia. Los diez TODO manuales anteriores siguen abiertos; nuevas inspecciones y pruebas de software no los convierten en observaciones del juego.

```powershell
npm.cmd run demo:tarot
npm.cmd run check
npm.cmd run test:tarot
```

Resultado: **829 pruebas aprobadas, 0 fallos, 10 TODO manuales**. Se añaden 31 de motor y 14 de persistencia. Los esperados independientes incluyen Bonus→Steel conservando Foil/sello/fichas permanentes, los cuatro palos, máximos de objetivos, consumo único, total de Tarot, ausencia de cobro y propiedades conservadas. Las pruebas de inmutabilidad, aislamiento y huellas son verificaciones internas, no fidelidad empírica.

Ocho grupos de Chrome comprueban observación, consultas sin escrituras, confirmación, límites, propiedades, desconocidos, jefe incompatible, cuota, recarga/deshacer, lector y 390 px. Las capturas y reportes se guardan como evidencia local ignorada. La herramienta admite URL pública mediante `PACK_TAROT_BASE_URL`, `PACK_TAROT_COMMIT` y `PACK_TAROT_WORKFLOW`; contrasta 19 módulos críticos, HTML y CSS (21 archivos) antes de repetir los ocho flujos. La emulación no equivale a Android físico.

## Continuación

DECK04 sigue parcial. No están integrados los otros diez Tarot, la compra individual de consumibles, Arcana, selección de cartas robadas en sobres, Spectral, Standard, Black Hole ni los jefes restantes. El antiguo `applyGameEvent(use_consumable)` con corrección explícita conserva su contrato y no se presenta como implementación de esos efectos.

Siguiente entrega: integrar **Arcana** para este mismo lote de efectos, distinguiendo pago/apertura, mano robada observada, contenido del sobre, objetivos y uso directo. No debe insertar un Tarot ficticio en el inventario ni asumir qué cartas se roban. La comparación estratégica de objetivos y la calibración EVAL01 son trabajos separados de registrar correctamente una transformación.
