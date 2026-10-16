# Perfiles de encaje rápido

Los 150 comodines del catálogo tienen un perfil explícito en [fit-profiles.ts](../src/advisor/fit-profiles.ts). Esta biblioteca orienta la valoración con etapa, construcción y mazo; **no calcula puntos de una mano, consistencia de robos, supervivencia ni probabilidad de victoria**. Tener un perfil tampoco convierte un efecto en un cálculo H2 implementado.

## Contrato y escala

Cada perfil identifica el `id` de arte exacto del catálogo (`j_*`), roles, una dependencia primaria, tres valores editoriales de etapa, detalle de condiciones y, cuando corresponde, mecanismo de crecimiento. El evaluador debe comprobar condiciones y combinar información de la construcción; un perfil por sí solo no recomienda comprarlo.

`stage = [inicio, desarrollo, cierre]` contiene los anclajes editoriales en ante1,4,8. quick-fit-2 interpola entre ellos; las etiquetas descriptivas cubren ante1–2,3–5,6–8 y no redondean el componente numérico. Cada valor usa una escala ordinal de **aporte estratégico potencial de una inversión nueva**, bajo su condición de uso:

| Valor | Interpretación editorial |
| --- | --- |
| 0 | Sin aporte identificable para ese horizonte y condición. |
| 1 | Aporte muy específico, limitado o inversión difícil de aprovechar a tiempo. |
| 2 | Aporte complementario que necesita soporte o tiene una limitación importante. |
| 3 | Función relevante para ese horizonte si puede aprovecharse. |
| 4 | Potencial importante en una construcción que satisface sus requisitos. |

Son categorías ordinales, **no unidades de Fichas, dólares, Mult o porcentajes**. Distintas funciones pueden compartir un valor sin aportar la misma magnitud ni sustituirse. El 4 de economía no demuestra que ganar dinero equivalga a multiplicar la puntuación. Ningún número se genera automáticamente por rareza, precio, pertenencia al motor o palabras de la descripción. Cada entrada contiene su elección explícita; no hay perfil predeterminado para elementos nuevos.

Los valores son una política editorial inicial y no están validados contra resultados de partidas. Se publican para que sus razones y límites puedan discutirse y probarse. Una decisión sensible entre perfiles debe mostrar qué condición y función explican la diferencia, no limitarse a comparar números.

El horizonte de un **escalador recién adquirido** puede reducir su utilidad al final. No aplicar ese descenso para borrar desarrollo ya registrado: un Green con Mult acumulado, Rocket con ingreso desarrollado o Hologram con multiplicador actual mantienen ese beneficio. El evaluador debe consultar contadores o informar de su ausencia. El crecimiento futuro sigue condicionado a acciones que todavía no ocurrieron.

## Dependencias y límites

`condition` es la dependencia primaria, no una definición completa del efecto. `detail` contiene restricciones adicionales. El evaluador solo puede declarar una condición respaldada cuando tiene un predicado adecuado y datos suficientes. Si no implementa ese predicado, debe limitar la valoración; no resolverla por coincidencia de nombres.

- `always` significa que la función no requiere una mano concreta como condición primaria. No garantiza ingresos, utilidad ni ausencia de costes: Marble necesita seleccionar ciega; Stuntman reduce mano; Chicot depende de la importancia del jefe.
- Condiciones de palo, rango y mejora son soporte de composición. Excepto requisitos explícitos de mazo completo, tener material no demuestra que se robe, puntúe o conserve.
- `held` incluye requisitos distintos. Mime necesita habilidades retenidas; Baron necesita reyes retenidos; Shoot the Moon, reinas; Blackboard, toda la mano retenida de palos negros. Un conteo genérico de figuras o Acero no confirma todas esas condiciones.
- `counter` incluye desarrollo o duración existentes y dependencias de composición que requieren datos específicos. Stencil necesita huecos; Baseball, rarezas físicas; Swashbuckler, ventas actuales. No inventar un contador para resolverlos ni interpretar contador desconocido como cero.
- `history` incluye el historial y objetivos observados, además de requisitos precisos que la unión básica no expresa: Hack usa 2/3/4/5, Walkie Talkie solo 4/10, Cloud 9 solo nueves; Flower Pot necesita cuatro palos puntuados. No contar rangos parecidos como soporte equivalente.
- `faces` no elimina límites de rango. Triboulet requiere reyes/reinas, no jotas ni cartas que Pareidolia vuelve figuras sin cambiar su rango. Photograph exige la primera figura puntuada; Scary Face no tiene esa restricción.
- `straight`, `suit_clubs` o `enhanced` pueden necesitar condiciones conjuntas o umbral: Superposition necesita as; Séance, escalera de color; Seeing Double, otro palo puntuado; Driver's License, dieciséis mejoras. Una coincidencia parcial no es activación.
- `discard` no significa que todo efecto mejore al descartar: Banner requiere descartes restantes, Mystic Summit cero, Delayed Gratification ninguno utilizado; Burnt y Trading necesitan un descarte concreto. Burglar es un conflicto conocido para efectos que necesitan conservar o utilizar descartes.
- `consumables` requiere inventario o capacidad según el efecto. Perkeo necesita un consumible poseído; Cartomancer necesita espacio. No presuponer consumibles ni generación útil.
- `copy` exige objetivo correcto, orden y compatibilidad Blueprint. No copiar automáticamente crecimiento propio, rareza física ni una función no compatible.
- `random` identifica incertidumbre sin importar una tirada media o favorable. Otros perfiles también contienen azar en su detalle, como Business Card o Bloodstone; la condición primaria no sustituye ese aviso.

Los roles describen función: Fichas (`chips`), Mult aditivo (`mult`), multiplicación (`xmult`), repetición (`retrigger`), economía, desarrollo de cartas/mazo, crecimiento y utilidad. `growth` es un mecanismo documentado, no un aumento prometido de la nota ni prueba de crecimiento útil. Las bases de manos, Plasma, orden y pérdidas por reemplazo pueden cambiar cómo se aprovecha un rol.

## Evidencia

Los efectos y restricciones se transcriben del catálogo local compatible con **Steam PC 1.0.1o-FULL sin mods**, respaldado por inspección estática del ejecutable. Las notas editoriales no son fórmulas encontradas en ese ejecutable. Las fuentes, sus límites y diferencias con observación directa están en:

- [Catálogo completo](catalogo-completo.md): identidades, propiedades, traducciones y cobertura web real.
- [Historial y ronda](evidencia/cat04-history.md), [generación](evidencia/cat04-generation.md), [economía](evidencia/cat04-economy.md) y [azar](evidencia/cat04-random.md): reglas y casos de fuente estática; no se declara observación de partida.
- [Meta estratégico](meta-estrategico.md) y su [registro de seis referencias](evidencia/meta-estrategico-2026-10-13.md): tiempo de inversión, coste de oportunidad, economía, desarrollo, repeticiones y límites de rankings. Las guías comunitarias aportan criterios, sin importar efectos antiguos ni tiers de Gold como notas de Blanca. Los videos localizados no se presentan como transcritos o vistos completos.
- [Sinergias](sinergias.md): requisitos y zonas de activación; una relación documentada no queda activa solo por poseer participantes.

La selección de etapa es una interpretación editorial de esos criterios: aportes fijos tienen más importancia relativa al principio; inversiones largas pierden oportunidades cerca de ante 8; multiplicación y repetición ganan oportunidades con material desarrollado. No es una ley universal: un comodín fijo puede seguir siendo útil al cierre y un multiplicador sin soporte puede no aportar nada.

La revisión de cobertura comprueba que estén exactamente los 150 IDs del catálogo, sin extras, y que cada perfil declare roles, condición, detalle y tres enteros entre 0 y 4. Esa comprobación prueba integridad de datos; **no valida el meta ni observa las reglas en el juego**. La evaluación y las pruebas contextuales Q01–Q08 se mantienen separadas de esta biblioteca.
