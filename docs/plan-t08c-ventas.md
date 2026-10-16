# Plan T08c-1 — vender sin comprar

Objetivo: añadir ventas individuales a las alternativas de T07b, H3 y cotas T07c, reutilizando la acción sell de H2 y la confirmación T09b. No ampliar catálogo ni añadir simulaciones o horizontes inventados.

1. Revisar enumeración, política y pruebas. Conservar los IDs de las alternativas preexistentes dentro de una misma entrada; añadir ventas al final. Declarar combinaciones excluidas.
2. Evaluar cada venta desde una copia de la entrada, con los mismos escenarios. Exponer ingreso inmediato, efecto/contador sacrificado y cobro condicionado. Admitir selección explícita de sell en H3.
3. Mantener H-PERSISTENCE: a cobertura igual, dinero no justifica por sí solo perder Green aplicado o ingresos Golden calculados. Mantener empates e incertidumbre. Versionar la política por su nuevo universo de candidatos.
4. Probar por oráculos literales una venta útil (Half frente a Psychic), venta que impide superar el plan, pérdida de Green/Golden, varias hipótesis, contador/precio desconocido, inmutabilidad y confirmación real en navegador.
5. Añadir demo; ejecutar núcleo, EFHIII y navegador; actualizar documentación y backlog. El horizonte de varias rondas queda como la siguiente subentrega separada, sin declarar T08c completo.
