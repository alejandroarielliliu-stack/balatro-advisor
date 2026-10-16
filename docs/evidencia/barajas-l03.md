# L03 — condiciones de las 15 barajas

**Actualización DECK02, motor 0.4.0:** sustituye la cobertura de tres barajas descrita en el registro histórico inferior. Catálogo declarativo completo, siete perfiles integrados en H2. [Contrato actual y límites](../barajas-condiciones.md).

2026-10-11. Corrección de alcance: antes solo se permitía Azul y el formulario fijaba `deckId=blue`. El usuario señala que la baraja inicial cambia la valoración. Motor 0.3.0 admite ahora **Azul, Roja y Amarilla**, White Stake, dentro del resto de limitaciones de H2. Las otras doce barajas no se modelan ni reciben cálculos de Azul. Baraja inicial y composición actual del mazo siguen siendo datos distintos.

## Registro histórico DECK01

## Evidencia estática

Mismo ejecutable de L01, `1.0.1o-FULL`, sin ejecutar una partida ni modificarlo:

- `game.lua` 628–630: Roja `discards=1`, Azul `hands=1`, Amarilla `dollars=10`.
- `functions/misc_functions.lua` 1868–1882: bases $4, cuatro manos, tres descartes, ocho cartas en mano, cinco espacios de comodín.
- `back.lua` 181–182, 199–200 y 209–210: agrega modificadores a parámetros de inicio. No añade el dinero de Amarilla cada ronda.
- `game.lua` desde 2151 aplica esos recursos al comienzo de la run.

SHA-256: `back.lua` = `c4d0b83f2f7a614a3b0c52c127f50290fd5f7bcad427fceb534c541ff8a4c0e1`; `functions/misc_functions.lua` = `c36ed54d8ab441be994a9afc5d38b8ac530f3b93995dfed424ec11f02e633198`. Huella de game.lua en L01. Evidencia **provisional por inspección estática**, no observación en juego; modo estricto sigue bloqueando lo no observado.

| Baraja | Manos base | Descartes base | Dinero al iniciar run |
| --- | --- | --- | --- |
| Azul | 5 | 3 | $4 |
| Roja | 4 | 4 | $4 |
| Amarilla | 4 | 3 | $14 |

## Comportamiento

Selector explícito en Mesa; los cambios preparan las bases correspondientes y marcan el formulario como editado. El dinero de tienda **no cambia** al elegir baraja: debe transcribirse de la partida. Ninguna selección recrea la run, aplica un bono retroactivo o sobrescribe un análisis silenciosamente. Guardar una corrección usa el historial T09b y cambia la revisión. El pie muestra la baraja registrada; los cambios sin guardar mantienen su aviso.

Se conserva el identificador histórico `balatro-pc-1.0.1o-blue-white-v1` para compatibilidad de archivos. Desde motor **0.3.0** funciona como identificador legado de esta familia: la cobertura efectiva depende del `deckId` explícito y las bases validadas. No se infiere Azul del nombre del identificador. La antigua puerta documental de H1/1.0.1f permanece histórica; H2 usa su registro activo. No hay migración ni modificación masiva de partidas existentes.

## Casos mínimos y resultados

Oráculos calculados de las reglas leídas, **no comprobados en una partida de Balatro**:

- Pareja de ochos nivel 1 + Banner: Azul/Amarilla `(10+8+8+90)×2 = 232`; Roja `(10+8+8+120)×2 = 292`. Prueba del motor coincide.
- Saldo $10, Small Blind ganada usando una mano, sin otros ingresos: Azul `$10+3+4+2=$19`; Roja/Amarilla `$10+3+3+2=$18`. No añadir otros $10 por Amarilla.
- Declarar Roja con cinco manos base es discrepancia y se rechaza. Plasma se rechaza como contexto no implementado.
- UI: seleccionar Roja no escribe hasta guardar; recuperar conserva `red`. Cambiar a Amarilla conserva el saldo $19 existente y pasa a cuatro manos/tres descartes. Se guarda explícitamente y conserva `yellow`.

157 pruebas aprobadas, cero fallos y 10 TODO de observación existentes. Suite web de regresión (17 grupos Chrome), diseño con selección/guardado y tamaños de pantalla. No prueba que la rúbrica prediga victorias.

## Pendiente, antes de extender notas a todas las barajas

Priorizar Verde (economía sin intereses), Negra (menos manos y más espacios), Abandonada/Cuadriculada/Errática (composición), Pintada (capacidad), Plasma (objetivos y fórmula) y las barajas con consumibles, vales o tags iniciales. Cada grupo necesita reglas y fixtures propios; no basta cambiar su nombre en el selector. La valoración de una run temprana debe emplear esos efectos y el estado actual, no un bono fijo de encaje por color.


## Ampliación DECK02: inspección estática 2026-10-11

No se ejecutó Balatro. Misma instalación, versión y hashes de L01/L03.

| Regla | Ubicación inspeccionada | Hallazgo |
| --- | --- | --- |
| Las 15 configuraciones | game.lua 628–642; back.lua `apply_to_run` | Modificadores iniciales, recursos, vales, consumibles y composición. |
| Recursos base | functions/misc_functions.lua 1868–1882 | 4 manos, 3 descartes, 8 cartas, 5 comodines, 2 consumibles, $4. |
| Pesos ordinarios | game.lua 1901–1905; functions/UI_definitions.lua 764–776 | 20 Joker, 4 Tarot, 4 planeta, 0 espectral/cartas; selección por suma de pesos. Fantasma fija espectral a 2. No es 2 %. |
| Merchant | game.lua 600–601; card.lua 1890–1900 | Config extra=9.6/4; peso asignado 4×extra=9.6. No duplicar ingenuamente una probabilidad final. |
| Crystal Ball/Overstock | card.lua 1885–1917 | Crystal Ball: +1 espacio de consumible. Overstock: +1 espacio de tienda. |
| Telescope | card.lua 1737–1752 | Primera carta del sobre celestial: planeta de mano visible con mayor número de jugadas, estrictamente mayor que cero; empate conserva primera en G.handlist. Si ninguna supera cero no se fuerza planeta. |
| Verde | back.lua `apply_to_run`; functions/state_events.lua 1168–1204 | $2/mano, $1/descarte restantes, omite intereses. |
| Plasma | back.lua `trigger_effect(final_scoring_step)`; blind.lua 107 | Ambos factores = floor((chips+mult)/2), al final. Multiplicador de objetivo 2. |
| Anaglifo | back.lua `trigger_effect(eval)` | Double Tag cuando last_blind es jefe. |
| Cuadriculada/Errática | back.lua; game.lua inicio de playing_cards | C→S, D→H; Errática elige rango/palo al crear cada carta. No se conoce la composición real sin transcribirla. |

Huellas adicionales: `blind.lua` SHA-256 `0a7e5fde144da36d4ca1a96950b4bf51e3c95be55fb02764a555de53a3bd8afb`; `functions/UI_definitions.lua` SHA-256 `e41dcdb24fb66faeb9e3809ea3e4252716d61836ef152677e39245a28fca6eb8`. card.lua y state_events.lua conservan las huellas de L01.

### Casos contrastados con el código implementado (no con una partida)

| Caso mínimo | Esperado independiente del motor | Obtenido | Estado de la regla |
| --- | --- | --- | --- |
| Verde: $10, ciega $3, 2 manos y 3 descartes restantes | 10+3+2×2+3=20; interés 0 | $20, interés 0 | Provisional / lectura estática |
| Negra: cinco comodines, compra de sexto | Legal con 6 espacios y precio suficiente | Legal; 0 libres; original intacto | Provisional |
| Pintada: diez cartas, descartar una y robar otra | Vuelve a diez; plan de ocho incompatible | Coincide | Provisional |
| Plasma: pareja de ochos sin comodines | (26+2)/2=14, 14²=196; Small ante 1=600 | 196 y 600 | Provisional |
| Plasma: carta alta 3 | floor((8+1)/2)²=16 | 16 | Provisional |
| Fantasma: un espacio ordinario, sin otro modificador | Peso espectral 2 / total 30 | 2/30 | Provisional, distribución condicional, no observación |
| Zodíaco: condiciones iniciales | Tarot/planeta 9.6/39.2; 3 espacios | Coincide | Provisional |
| Abandonada/Cuadriculada | 40 sin figuras / 26 S+26 H, 52 IDs distintos | Coincide en plantillas | Provisional; integración pendiente |
| Errática sin composición registrada | Desconocida, no 52 estándar inventadas | Desconocida | Provisional |

`npm run check`: 165 aprobadas, 0 fallos, 10 TODO existentes. Regresión web Chrome: 17 grupos. Diseño: selector de 15, vistas previas sin escritura, persistencia Pintada, cinco tamaños y 200% zoom. EFHIII: 29 comparaciones previas coinciden; no valida estas barajas nuevas ni sustituye observación directa. Captura móvil emulada `redesign/chromium/deck-conditions-mobile.png`.
