# T08c-2 — horizontes explícitos de 1–3 rondas

Actualización posterior: [T08c-3 completó la auditoría integrada](auditoria-t08c.md). Los pendientes y recuentos del cierre original de esta entrega, conservados al final, tienen ese contexto histórico.

Implementado como software el 2026-10-10. [Plan previo](plan-t08c-horizontes.md). Reutiliza H2, los planes T07b y los criterios cualitativos H3. No añade catálogo, fórmulas de Balatro, azar, tiendas futuras ni escritura de proyecciones.

## Contrato y dependencias

`validateHorizon`, `evaluateHorizon`, `compareShopHorizon` y `adviseHorizon` se exportan por `src/index.ts`. El contrato independiente `horizon-1` contiene:

- `horizonId`, `description`, `firstPlan`: plan T07b para la ciega registrada.
- `continuations`: cero a dos entradas `{blind, knowledge, basis, plan}`. `blind` declara ante, tipo, jefe, objetivo y recompensa como datos explícitos; los campos numéricos desconocidos conservan `Fact`. `knowledge` distingue una ciega conocida de una hipotética; las cartas mantienen además su propia procedencia T07b.
- `assumptions.noBetweenRoundActions` y `unchangedDeckAndHandBases`: deben ser verdaderos. Se supone conservar inventario, mazo y bases, sin comprar/vender/consumibles entre rondas.

Las ciegas deben ser consecutivas, sin saltos y sin ir más allá del jefe del ante 8. Las configuraciones estructuralmente inválidas se rechazan. Un jefe, objetivo, carta o contador no calculable detiene solo la rama cuando llega al cálculo afectado; las rondas anteriores conservan sus resultados. El precio o legalidad de cada acción inicial se valida por H2. No se adapta un plan que falle para una compra.

Cada alternativa inicial comienza desde una copia independiente. Tras vencer y cerrar una ronda se arrastran su saldo, inventario y contadores; el nuevo inicio reutiliza `beginRound` y sus recursos/jefe. Las cartas usadas pueden aparecer en otra ronda porque se vuelve a comenzar con el mazo completo. Esto describe un escenario explícito, no un método para predecir la barajada. Las ofertas futuras permanecen desconocidas y no se utilizan.

Resultados: `completed`, `plan_stopped`, `incompatible` o `settlement_missing`; etapas ejecutadas/no ejecutadas, errores, estados antes/después, puntuaciones, consumos y cobros completos. `roundsReached` cuenta objetivos alcanzados, incluso si falta el cierre contable; ese caso no es comparable para recomendar una cadena. Un plan insuficiente no prueba que la partida esté perdida. El jefe final no paga ingresos posteriores dentro de este objetivo.

## Política horizon-policy-1

1. `HH-PREFIX`: preferir un prefijo consecutivo más largo superado, exclusivamente en esta trayectoria de cartas y decisiones fijas.
2. Con igual progreso, reutilizar `prefer` de H3 por ronda: dinero disponible antes/después, manos y descartes, y margen en la última ronda no superada. No usar el exceso de puntuación como moneda. No compensar falta de liquidez temprana con efectivo tardío.
3. Conservar H-PERSISTENCE: no preferir perder Green efectivamente aplicado o ingreso Golden demostrado solo por dinero/recursos a igual cobertura. El contador sin aplicación no recibe valor independiente.
4. Permitir empate/compromiso. Datos o reglas que impidan comparar una rama provocan abstención global; las demás se calculan. Las acciones demostrablemente ilegales por dinero/espacios se excluyen. Sin ningún primer objetivo superado, abstenerse de diagnosticar supervivencia.

No hay ponderaciones, medias ni porcentajes. Los beneficios posteriores al horizonte y el valor residual de los comodines no se monetizan. Las ventas/reemplazos conservan las instancias y contadores sacrificados. La cobertura sigue limitada a conservar, una compra, una venta o una venta→compra inicial; no es exhaustiva.

## Demostración y web

Desde balatro-advisor:

```powershell
npm.cmd run demo:horizon
npm.cmd run demo:horizon -- --json
```

Usa `examples/horizon-golden-state.json` y `examples/horizon-golden.json`, sin tocar la partida registrada. Para la web, `npm.cmd start`: crea planes en el editor, abre **Comparar varias rondas consecutivas (hipótesis)** y pulsa **Preparar horizonte con mis planes**. Selecciona el plan inicial y los planes futuros, transcribe las ciegas/procedencia y confirma los supuestos. No se seleccionan ni inventan las ciegas automáticamente. El mismo plan de cartas puede reutilizarse explícitamente en otra ronda.

La configuración es temporal. Editar partida, planes o configuración invalida resultados; los datos reales editados deben guardarse antes de analizar. La vista es de consulta y no incluye un botón para guardar estados futuros. T09b sigue registrando únicamente la acción real inicial, por el flujo existente de acciones manuales. No hay migración ni cambio de formato de guardado.

## Oráculos independientes y resultados

Todos son casos sintéticos del modelo provisional. Las cifras se fijaron mediante derivaciones documentales, no leyendo el resultado bajo prueba. Ninguna constituye observación en Balatro.

| Caso | Esperado y fundamento | Verificado como software |
| --- | --- | --- |
| S03, pareja con Half/Banner | `(10+16+90)×(2+20)=2552`, una mano en Small 800 y Big 1200 | Ambas ramas mantienen las mismas cartas y terminan temprano. |
| S03, conservar | `25+3+4+5=37`; `37+4+4+5=50` | Saldos 25→37→50. |
| S03, Golden | Compra 6: 19; `19+3+4+4+3=33`; `33+4+4+4+5=50` | 19→33→50, empate/compromiso con conservar. No se valora su venta futura como cobro realizado. |
| S05, Green | Primera ronda: `105×(2+3+4)=945`, Green 3; segunda: `105×(5+6+7)=1890`, Green 6 | Tres manos por ronda, saldos 6→12→20; reinicio de recursos y persistencia de contador. |
| S05, Joker | `105×5×2=1050`; segunda `105×5×3=1575` | Dos y tres manos; saldos 8→15→24. No domina a Green solo por efectivo bajo H-PERSISTENCE. |
| S05, descarte en segunda ronda | Un descarte de tres cartas: Green 3→2, Banner 90→60; `75×(4+5+6+7)=1650` | Una acción de descarte, cuatro manos, saldo final 19. |
| Tercera ronda Psychic | Pareja jugada con cinco cartas: `116×2=232`; alternativa escalera de color: `(100+35+90)×8=1800` | Primer plan se detiene; segundo supera las tres rondas. |

Además se prueban cartas ilegales, saltos de ciega, límite de tres rondas, falta de supuesto de cobro, datos desconocidos aislados por rama, modo estricto, revisión, inmutabilidad y separación T09b. El test de fin del ante 8 usa deliberadamente un contador Green extremo para aislar esa transición: **es una prueba de frontera de software, no un estado de producto afirmado alcanzable**.

Verificación: `npm.cmd run check` (131 aprobadas, 0 fallidas, 10 TODO de observación); 29 contrastes EFHIII; 16 grupos Chrome. [Informe de navegador](evidencia/t11/chromium/verificacion.json) y [captura móvil emulada](evidencia/t11/chromium/horizonte-golden.png). El grupo nuevo comprueba formularios, 37/33/50, abstención ante objetivo contradictorio, invalidación y ausencia de escrituras. Android físico no probado.

## Límites restantes

T08c-2 está entregado como software. T08c sigue abierto para auditar conjuntamente S01–S09 y sus fronteras frente a A3/A4; implementar horizontes no certifica toda esa matriz ni eficacia estratégica. T01/H2 mantienen las observaciones pendientes (Golden, Green, entre otras) y el modo estricto. Una parte del cobro está observada en O-I1, sin promover todas las reglas. T11 conserva las limitaciones de navegador/dispositivo documentadas.
