# T08c-1 — ventas individuales en el asesor

Entrega: 2026-10-10. [Plan ejecutado](plan-t08c-ventas.md). La comparación T07b, el asesor H3 y las cotas T07c incluyen vender un comodín sin comprar. Se reutilizan H2 para la transición y T09b para confirmar/guardar; no hay lógica económica duplicada en la UI.

## Usar

Recarga la web y consulta recomendaciones con tu partida y escenarios. Las ventas legales aparecen junto a conservar/comprar/reemplazar, aunque no sean la opción preferida. Cada venta muestra ingreso, saldo posterior, cobro condicionado, puntos, beneficios sacrificados y limitaciones. Puedes confirmar una venta desde su tarjeta solo cuando la hayas realizado; nada se aplica al consultar.

```powershell
npm.cmd run demo:sales
npm.cmd run demo:sales -- --json
```

La demo usa examples/sale-psychic.json y sale-psychic-plan.json, ambos sintéticos. No guarda ni modifica la partida del navegador. Los efectos, versión de juego, ocho comodines y recursos admitidos no cambian.

## Contratos y política

- Se enumeran conservar, una compra, un reemplazo venta→compra y **una venta individual por instancia poseída**. Las ventas se añaden al final para conservar los IDs anteriores para una entrada idéntica; los IDs continúan siendo locales al análisis, nunca identificadores persistentes entre revisiones.
- enumerateActions/applyShopAction validan dinero, valor de venta y revisiones. Las ramas parten de copias independientes y evalúan exactamente los mismos planes. Una venta no retira ofertas de la tienda ni compra nada.
- API: netCost es negativo para un ingreso por venta; la UI lo presenta como «Ingreso por venta». moneyAfterShop nunca se confunde con moneyAfterRound.
- H3 admite sell en options.actions, validado como un candidato disponible, sin campos adicionales, duplicados ni instancias inventadas. Si se restringen opciones, la conclusión declara ese subconjunto.
- sacrificed incluye la instancia vendida y su contador tanto para sell como para replace. Las diferencias T07b explican perder Golden o Green; su pérdida no se reduce al precio de venta.
- Política **h3-2**: versión nueva por el universo ampliado de alternativas. Las prioridades existentes no cambian: cobertura de escenarios, comparación de dimensiones y protección cualitativa H-PERSISTENCE, sin sumar dinero y puntos.
- A igual cobertura no se prefiere perder Green aplicado o un ingreso Golden calculado únicamente por dinero/recursos. Puede quedar un empate o compromiso. En el jefe final no se atribuye utilidad a futuras rondas fuera del objetivo.
- Una venta desconocida no se evalúa a precio cero. Si faltan datos de una alternativa comparable, H3 se abstiene de una recomendación global; vender Green con contador desconocido puede dejar una rama calculable, sin convertirla por ello en ganadora frente a las desconocidas.

No se enumeran varias ventas, varias compras, rerolls, paquetes, vales, consumibles o reordenación. Tienda desconocida conserva el fallback de analizar hold con error de enumeración explícito; este cambio no promete enumerar ventas automáticamente en esa situación. La acción H2/T09b sell sigue separada de esa limitación de enumeración.

## Oráculos independientes

| Caso sintético | Esperado escrito antes de ejecutar | Interpretación |
| --- | --- | --- |
| Psychic 600; Half/Joker/Banner; pareja de ochos y tres cartas ajenas, tres descartes; $10 | Conservar y vender Half: (26+90)×(2+4)=696. Saldo tienda 10/12; cobro 5+4+2=11 → 21/23. | Half no activa con cinco cartas. Preferencia condicional de venta en este escenario; pierde utilidad fuera de él. |
| Mismo caso, vender Banner | 26×6=156; saldo tienda 12, sin cobro porque el plan no vence; cuatro manos todavía disponibles. | Más dinero no compensa perder cobertura; el plan no ganar no equivale a partida perdida. |
| Small 300, Half/Golden, $25, pareja de ochos | Ambos 572. Conservar: 25+3+4+4+5=41. Vender Golden: 28+3+4+5=40. | Vender ingresa 3 ahora pero pierde 4 en ese cobro. Compromiso, no venta automática. |
| Small 300, Half/Green(10), $10, pareja de ochos | Conservar: 26×33=858, Green 11, saldo final 19. Vender Green: 26×22=572, saldo final 21. | H-PERSISTENCE impide resolver por liquidez sola; contador sacrificado 10 explícito. |
| Small 300, Half, pareja de ochos y otro escenario de escalera de color 5–9 | Vender deja 52 en la pareja pero conserva 1080 en la escalera de color. | Conservar cubre ambos; no se promedian escenarios como probabilidades. |
| Demo anterior C sin Green tras venta | Trío 54×3 + pareja 14×2 = 190; ingreso 2 y plan agotado sin cobro. | Se conserva el resto del plan y se compara sin adaptarlo silenciosamente. |

Solo el caso de Psychic tiene una nueva demo completa en archivos. Los demás están en tests/sales.test.ts o pruebas previas, con selección explícita de hold/venta cuando interesa aislar el compromiso. La selección no se presenta como búsqueda exhaustiva.

## Verificación

- `npm.cmd run check`: **122 aprobadas, 0 fallidas, 10 TODO** de observación manual. Ocho pruebas nuevas de ventas; las pruebas históricas actualizan la enumeración y mantienen sus oráculos, añadiendo el resultado independiente de la nueva rama.
- `npm.cmd run test:reference`: **29 coincidencias EFHIII**; no acredita estrategia ni observación del juego.
- Chrome real headless: **15 grupos aprobados**, sin errores JS. Nuevo recorrido mediante formulario: importar fixture aislado → introducir plan → consultar sin escritura → ver venta/sacrificio → confirmar → recuperar revisión 1 y $12. Comprueba que los $23 del cobro hipotético NO se copiaron al estado real y que la tienda queda intacta.
- [Informe del navegador](evidencia/t11/chromium/verificacion.json) y [tarjeta de venta a 390 px](evidencia/t11/chromium/venta-half.png). Tacto emulado, no Android físico.

No se modificó Project Bonk ni se amplió el catálogo. T08c-1 está completo como software. **T08c sigue parcial:** faltan horizontes explícitos de varias rondas y evaluación ampliada de utilidad estratégica; estos no se fingen a partir de un único plan. La siguiente subentrega debe definir transiciones y supuestos entre rondas antes de valorar esos beneficios futuros. Firefox/Android físico y evidencia pendiente T01 mantienen sus dependencias propias.
