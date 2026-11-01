# DEC02 — comparación acotada y consejo parcial

Primera entrega del 1 de noviembre de 2026. Política `quick-shop-3`; conserva H2, T07b/H3, el índice de encaje y la confirmación T09b. No añade otra nota, un motor de manos ni una búsqueda general de compras. La calidad de uso EVAL01b y la evidencia manual de H2 continúan abiertas.

## Casos fijados antes del cambio

Los seis estados y expectativas de [dec02-development.json](../evaluation/fixtures/dec02-development.json) fueron escritos sin leer la política de tienda ni consultar sus resultados. [El manifiesto](../evaluation/fixtures/dec02-freeze.json) fija SHA256 `b9ad6643331c67d9caf4efc7a850cd27e4c5e6f0f31687640a0732918fdf1cd0` antes de la primera ejecución. Git conserva sus bytes mediante `.gitattributes`.

[Baseline conservado](../evaluation/results/dec02-baseline.json): `quick-shop-2` cumplía el contrato mínimo de los cuatro primeros casos; fallaba las preferencias de05/06. Ese mínimo no certificaba la calidad de las explicaciones. No se cambiaron expectativas después de ver las salidas. El banco es de desarrollo, no una muestra representativa ni un nuevo reservado; EVAL01a se mantiene como regresión.

| Caso sintético posible | Hechos independientes | Aceptación y resultado del nuevo alcance |
|---|---|---|
|01: Burglar y Cumbre frente a Barón sin reyes | Bases Azul5/3; al entrar en ronda Burglar da8/0. Material sin reyes | Reconocer preparación de Cumbre y condición de Barón. No alterar las bases de tienda ni afirmar supervivencia |
|02: Seed Money con$20 a precio$10 | Compra deja$10; interés aislado condicionado4→2, sin beneficio actual del tope adicional | Conservar dinero; explicar el vale como inversión futura, sin ingresos al comprar |
|03: Riff-Raff lleno → Abstract | Venta$3, compra$4, neto$1; saldo20→19; cinco comodines y Abstract nuevo+15 Mult propio | Mantener ahorrar/reemplazar condicionados; explicar generación futura sacrificada y que no se heredan contadores |
|04: puntuación frente a Golden | Unidades distintas; Golden$4 solo en un final de ronda compatible ganado | Empate útil, sin convertir dólares y fichas a una escala común ni inventar necesidad de puntuación |
|05: Joker frente a Abstract, inventario vacío | Joker$2/+4 Mult propio; Abstract$4/+3 con una instancia física | Preferencia condicional de refuerzo actual por Joker; Abstract conserva su alternativa y crecimiento posible al ampliar inventario |
|06: Joker y Tarot no evaluado | Compra conocida deja$23; Tarot observado cuesta$3, saldo hipotético$22, sin transacción modelada | Considerar Joker entre lo evaluado; Tarot permanece visible como competidor pendiente que puede cambiar la elección |

Los esperados mecánicos son literales del catálogo/evidencia compatible y derivaciones escritas antes de ejecutar H2. Se contrastan por separado de las expectativas cualitativas. No son resultados observados en Balatro ni pruebas de optimalidad.

## Regla comparativa pequeña

`shop-comparison.ts` consume las opciones ya calculadas: aporte propio de Mult de `fixedMainMult` compartido con H2 y coste neto de la transacción. Una opción se prefiere para ese aporte actual si aporta al menos tanto Mult, cuesta como máximo lo mismo y mejora estrictamente una de esas dimensiones. No divide Mult por dólares ni suma unidades.

El primer caso está limitado a Joker/Abstract con inventario vacío, compras compatibles, edición base, sin stickers ni reemplazos. Ese límite evita atribuir un balance total cuando hay efectos retenidos: por ejemplo Swashbuckler utiliza valores de venta y las copias/orden pueden cambiar otras consecuencias. Con otro inventario, un coste mayor a cambio de más Mult, modificadores, precio no compatible o datos pendientes, no se aplica esta preferencia.

El resultado incluye `comparisons`: IDs de ambas alternativas, regla `S-COMPARABLE-MULT`, valores en sus unidades originales, condiciones y explicación. La opción no preferida continúa en el detalle. La interfaz muestra el contraste y su contexto de inventario; el desarrollo futuro de Abstract permanece entre las razones. No se convierte ese contraste en puntuación total o garantía de victoria.

Para Riff-Raff se explican los huecos actuales y la generación sacrificada **si la ocupación se mantiene al seleccionar la ciega**. No se presume que otros efectos mantengan esos huecos ni se genera un comodín futuro. Al no existir una prioridad de refuerzo declarada en el contrato, el reemplazo conserva su intercambio con ahorrar.

## Alcance parcial explícito

La recomendación conserva `conditional`, `tie` y `abstain`, y añade `scope` y `pendingOfferIds`. Una oferta desconocida no entra como compra recomendada ni adquiere precio cero. Cuando hay opciones conocidas utilizables se presenta «Entre lo evaluado…» y la limitación visible; cuando no hay una candidata suficiente, se mantiene la abstención.

El alcance tiene en cuenta ofertas pendientes, sobres cerrados asequibles y vales sin efecto integrado. Se conservan sus resultados descriptivos y económicos disponibles. Abrir un sobre no permite conocer todavía su contenido.

Si una vista de la misma tienda omite artículos ya registrados fuera de su representación compatible, el contexto recupera título/precio como opciones sin evaluar. Así una recarga no elimina silenciosamente un competidor. No se incorporan transacciones para esos artículos, no se interpreta su nombre como un efecto y no se mezclan tiendas con IDs distintos. Los artículos manuales temporales mantienen su alcance de sesión existente; no hay nueva migración de almacenamiento.

Consultar, recalcular y abrir detalles permanecen sin escrituras. La legalidad, estado real/proyección, revisión y confirmación dependen de los módulos existentes. El modo estricto conserva sus bloqueos por evidencia: el perfil o una comparación no habilitan una compra pendiente de contraste.

## Verificación y límites

```text
npm run check
npm run test:dec02
```

`npm run check`: **997 aprobadas,0 fallos y10 TODO manuales**. Treinta pruebas nuevas:19 de casos congelados/mecánicas y11 de política/guardas. Pasan también ocho pruebas del evaluador y la regresión de desarrollo EVAL01a (sin reabrir su reservado), siete grupos web de consejo rápido y seis de resumen compacto.

Las pruebas de casos congelados separan mecánicas, saldos e inmutabilidad del contrato mínimo de recomendación. Las pruebas de política cubren condiciones que impiden comparar y la propagación de incertidumbre. El script de navegador comprueba diez grupos, consulta sin escrituras, recuperación de la oferta pendiente, reemplazo, modo estricto y móvil390px. El modo público usa `DEC02_BASE_URL`, `DEC02_COMMIT`, `DEC02_WORKFLOW` y contrasta22 archivos con `out/`.

Los informes runtime y capturas quedan en `docs/evidencia/dec02/`, ignorados según la convención del repositorio. Son pruebas sintéticas y móvil emulado. No acreditan Android físico, usuarios participantes ni eficacia en partidas completas.

La búsqueda sigue sin ser exhaustiva: conservar, compras individuales y reemplazos seleccionados; no enumera todas las ventas ni secuencias de varias adquisiciones. Solo se comparan cuantitativamente los aportes compatibles indicados; el resto conserva condiciones o empates. El siguiente paso es comprobar utilidad con EVAL01b, y ampliar por una decisión concreta que el uso muestre insuficiente.

## EVAL01b: ficha breve de uso pendiente

Sin participantes ni respuestas registradas en esta entrega. En una revisión con el usuario, repetir tres situaciones (compra, ahorro/reemplazo y oferta pendiente) y anotar:

| Situación/versión | Datos nuevos y repetidos que pidió | Acción/condición/sacrificio entendidos | Error o consejo poco útil | Cambio y repetición |
|---|---|---|---|---|
| Pendiente | Pendiente | Pendiente | Pendiente | Pendiente |

No fijar una compra «correcta» por intuición del implementador. Contrastar primero hechos y explicaciones; cuando haya un intercambio, comprobar que el usuario lo entiende. La eficacia de una partida completa requiere una evaluación propia posterior.
