# Vales adquiridos — L06

El panel «Tus vales» queda debajo de Candidatos. Pulsar una ilustración abre su descripción y permite marcar o quitar un vale ya adquirido. No compra vales ni descuenta dinero. La selección recalcula los recursos desde la baraja base, invalida candidatos y actualiza el cobro por escenario. Guardar conserva la selección y sus recursos en el registro existente; consultar o editar no modifica la copia guardada.

Se conservan los archivos anteriores: los IDs utilizan `observed.outOfScope.value.vouchers`, sin cambiar el esquema. El nombre histórico del campo no determina la cobertura del motor. Los dos vales de interés existentes se muestran en el nuevo panel; se retiró el selector duplicado.

## Cobertura real

32 vales registrables como datos manuales, con ilustraciones y descripciones; 10 efectos persistentes integrados en H2:

| Vales | Efecto persistente integrado |
|---|---|
| Grabber / Nacho Tong | +1 mano cada uno |
| Wasteful / Recyclomancy | +1 descarte cada uno |
| Paint Brush / Palette | +1 tamaño de mano cada uno |
| Blank | Sin efecto sobre los cálculos de esta partida |
| Antimatter | +1 espacio de comodín |
| Seed Money / Money Tree | Topes de interés $10 / $20; véase [cobro](cobro-automatico.md) |

Las mejoras requieren su vale base. No se permite quitar el base mientras se conserve la mejora. No se simulan desbloqueos del perfil: el usuario registra adquisiciones reales. Los otros22 aparecen mediante «Ver los32» y pueden marcarse como adquiridos, con estado «Registrado · sin cálculo»; siguen visibles al reducir la lista. Se conservan al guardar y recuperar una partida, pero registrar su nombre no activa descuentos, renovaciones, probabilidades, sobres ni consumibles. H2 conserva el rechazo explícito a modificadores fuera de su cobertura; la valoración contextual los describe y limita únicamente los apartados pertinentes, según [composición global](composicion-global.md).

Jeroglífico y Petroglifo requieren transcribir respectivamente las manos y descartes actuales después de registrarlos. El campo afectado queda desconocido hasta hacerlo: no se repite la reducción histórica del ante ni se reconstruye un historial supuesto. Cambiar otro vale no sobrescribe el recurso transcrito; cambiar un modificador de ese recurso o la baraja exige transcribirlo nuevamente. Los otros recursos integrados siguen calculándose una sola vez.

Los escenarios admiten manos iniciales de 8–12 cartas, pero H2 exige exactamente el tamaño de la partida. Añadir Brocha a un escenario de ocho cartas lo vuelve incompatible hasta que el usuario complete sus cartas explícitamente; no se generan robos. Conservar seis comodines después de quitar Antimateria produce una incompatibilidad de capacidad, no una venta automática.

## Evidencia

Inspección estática del ZIP del ejecutable local `C:/Program Files (x86)/Steam/steamapps/common/Balatro/Balatro.exe`, versión `version.jkr = 1.0.1o-FULL`, 2026-10-12:

- `game.lua`: entradas `v_*`, posiciones del atlas, requisitos y parámetros.
- `card.lua`, `Card:apply_to_run`: incremento de `round_resets.hands`, `round_resets.discards`, `G.hand:change_size(1)` y `G.jokers.config.card_limit + 1`. Blank solo invoca comprobación de desbloqueo.
- `localization/es_419.lua`, `descriptions.Voucher`: nombres y textos de referencia.
- `resources/textures/2x/Vouchers.png`: atlas original, hash y atribución en `web/assets/vouchers/provenance.json`. Importador reproducible: `python tools/import-vouchers.py`.

Estado: **provisional, documentado**, no observado en una partida. L06 y `vouchers.resources` acompañan resultados afectados; se mantiene la abstención del modo estricto. Las descripciones del catálogo no amplían la cobertura del motor ni constituyen una distribución de probabilidades.

## Comprobación

Oráculos independientes derivados de las ramas inspeccionadas:

- Azul + Grabber + Nacho Tong: 7 manos. Pintada + Brocha + Paleta: tamaño 12. Negra + Grabber: 4 manos.
- Wasteful y Banner, pareja de ases: `(10 + 11 + 11 + 4×30) × 2 = 304`.
- Azul + Grabber, saldo $20, Big Blind y cinco manos sobrantes: `$4 + $5 + $4 = $13`.
- Antimateria con Blank: seis huecos en Azul; cinco en Pintada.

Estos casos pasan en `tests/vouchers.test.ts`; no son observaciones del juego. La suite también separa vales catalogados de efectos soportados y verifica que la transcripción estructural no habilite H2. `node tools/vouchers-test.mjs` comprueba recursos, requisitos, anotaciones, Jeroglífico/Petroglifo, cambio de baraja, conservación del registro, guardado/recarga y ausencia de desbordamiento móvil. Capturas en `docs/evidencia/vales/`. `tools/cashout-test.mjs` utiliza el panel y conserva la comprobación de interés y saldo.
