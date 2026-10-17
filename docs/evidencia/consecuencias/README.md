# Evidencia de consecuencias y planes en tienda

2026-10-16. Fixtures sintéticos; sin nuevas observaciones directas de Balatro ni prueba de eficacia estratégica.

```powershell
npm.cmd run check
npm.cmd run demo:consequences
npm.cmd run test:consequences
```

**655 pruebas aprobadas, 0 fallos y 10 TODO manuales.** Nueve nuevas cubren efectos inmediatos independientes, planes que necesitan comprar, ahorro cuando todos vencen, parada temprana, sensibilidad, sacrificio de Green, Juggler/plan incompatible, contadores proyectados y ausencia/estricto.

Oráculos independientes del código de síntesis:

- Pareja8: `(10+8+8)×2=52`; Joker: `26×6=156`; Half: `26×22=572`. Gasto2/5 deja dinero5/2 desde7; una compra ocupa un hueco, libres5→4.
- Escalera real de picas: fichas`100+11+10+10+10+10=151`; base`151×8=1208`; Joker`151×12=1812`; Half no se activa con cinco cartas. Todos vencen y conservar tiene ventaja económica. Diferencias tras cobro frente a conservar: Joker−2, Half−6 según el modelo económico provisional.
- Plan pareja seguida de escalera real: conservar usa dos manos y suma1260; Half termina con572 en la primera. No hay Δ de puntos equivalente. Half consume una mano menos y su diferencia de saldo tras cobro es−5.
- Segundo plan de carta2 sola: Half da`(5+2)×(1+20)=147`, no alcanza450; se conserva separado del plan de pareja favorable.
- Reemplazar Green7, venta2→compra Joker2, conserva dinero7 y pierde esa instancia/contador. No hereda7 en Joker.
- Juggler añade tamaño de mano8→9; un plan de ocho cartas no se completa con una carta inventada.
- Green7→8 en la rama proyectada conserva7 en la partida original. Regla ya provisional en H2, no validación nueva de su momento de activación.

Cinco grupos nuevos de navegador comprueban consulta sin escritura ni supervivencia inventada; formulario real de Análisis conectado a la tienda52/156/572; cambio de plan1208/1812/1208 que cambia la preferencia; plan inválido que retira resultados antiguos y mantiene el consejo básico; móvil390 y segunda pestaña sin copiar planes ni estados al registro.

Capturas1440/390 inspeccionadas. Se agrupó la tabla por escenario para evitar repetir nombres largos y se separó el consejo de composición de la preferencia en planes. Android físico sigue aplazado. Regresiones: decisiones6, tienda contextual, tienda persistente14, recorrido17, observaciones7, datos puntuales9, inventario8, navegador general17 y hosting estático bajo subruta.

Recibos/capturas ignorados por Git. `CONSEQUENCES_BASE_URL`, `CONSEQUENCES_COMMIT` y `CONSEQUENCES_WORKFLOW` permiten repetir las cinco comprobaciones públicamente y contrastar doce archivos con `out/`; los textos se normalizan a LF para comparar con Git/Linux. Recibo posterior al despliegue en `public/report.json`. No se deduce publicación comprobada de un build local.
