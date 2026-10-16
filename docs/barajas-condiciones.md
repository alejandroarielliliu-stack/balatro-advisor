# Condiciones de baraja — DECK02

Motor 0.5.0, 1.0.1o-FULL / White Stake. [Fuente y casos verificables L03](evidencia/barajas-l03.md). No se ha observado su ejecución en una partida; las reglas siguen provisionales y se conserva el modo estricto.

## Datos y aplicación

`src/catalog/decks.ts` guarda los 15 perfiles como condiciones tipadas: evento, operación, campo, magnitud u objeto concedido. `resolveDeck(id)` parte de las bases normales, suma cambios y expande los efectos de los vales iniciales. Los consumidores reciben recursos, objetos iniciales, pesos de tienda, economía, composición, puntuación y eventos especiales. No existen bonos de valoración por nombre o color.

| Baraja | Condiciones guardadas | H2 / editor |
| --- | --- | --- |
| Roja | +1 descarte | Integrado |
| Azul | +1 mano | Integrado |
| Amarilla | +$10 solo al iniciar | Integrado |
| Verde | $2/mano + $1/descarte restantes; sin intereses | Integrado |
| Negra | −1 mano; +1 espacio de comodín | Integrado |
| Mágica | Crystal Ball (+1 espacio consumible), 2 The Fool | Catálogo y resolución; falta uso/inventario |
| Nebulosa | Telescope, −1 espacio consumible; condición de primera carta celestial | Catálogo y resolución; faltan sobres/vales |
| Fantasma | Peso espectral 2 en tienda, Hex inicial | Catálogo y resolución; falta uso/inventario |
| Abandonada | Eliminar J/Q/K al iniciar; 40 cartas | Integrado con composición actual explícita |
| Cuadriculada | Convertir tréboles→picas y diamantes→corazones | Integrado con IDs únicos por copia |
| Zodíaco | Tarot Merchant, Planet Merchant, Overstock | Pesos y capacidad resueltos; falta integración de vales |
| Pintada | +2 tamaño de mano; −1 espacio comodín | Integrado, incluidos planes de diez cartas |
| Anaglifo | 1 Double Tag al derrotar jefe | Condición registrada; falta gestión de tags |
| Plasma | Media con floor al final de puntuación; objetivo ×2 | Integrado, también en cotas |
| Errática | Aleatorizar rango/palo de las 52 cartas iniciales | Integrado; composición observada obligatoria, nunca generada |

`startingComposition` devuelve una plantilla nueva e independiente: no afirma que siga siendo la composición actual. Errática devuelve desconocido. En Cuadriculada el ID identifica la instancia original aunque cambie su palo; existen dos copias de cada rango/palo resultante.

`startingShopDistribution` normaliza pesos para un espacio ordinario de cartas de la tienda **solo bajo las condiciones iniciales**. No es probabilidad de victoria, carta concreta, rareza, edición, sobre o siguiente tienda. No contempla tags forzados, restricciones de pool ni vales adquiridos después. Fantasma: espectral 2/30; Zodíaco: Tarot y planeta 9.6/39.2 cada uno. No se usa esta distribución para predecir escenarios ni ordenar recomendaciones.

Telescope guarda el evento del sobre, slot 1, mano visible más jugada con al menos una jugada, desempate por orden de G.handlist y fallback al pool normal. El dato no afirma que abrir sobres ya esté implementado. Mágica/Fantasma conceden consumibles solo al iniciar: registrar su baraja no prueba que aún los poseas ni simula su uso.

## Estado real, guardado y evidencia

El estado sigue guardando `observed.deckId` y los recursos/cartas/objetos realmente conocidos. Los perfiles versionados pertenecen al catálogo; no se copian como observaciones ni se reponen al guardar, corregir o cargar. El identificador histórico de ruleset sigue compatible; el contexto efectivo se valida por deckId y versión del motor.

La UI permite consultar las 15 barajas y sus condiciones. Solo guarda las diez integradas desde este editor; intentar guardar las restantes explica la dependencia pendiente y conserva íntegro el registro anterior. Los archivos H1 que contienen otros perfiles siguen siendo estructuralmente guardables/importables, pero no reciben resultados de Azul. No se cambia el saldo actual ni el objetivo transcrito al seleccionar otra baraja; un objetivo incompatible (p. ej. Plasma) produce discrepancia al analizar.

Verde exige descartes sobrantes para proyectar cobro; si faltan, se abstiene únicamente ese cálculo. El evaluador de ronda sí los proporciona. `unusedHands` conserva su significado de dólares por manos no usadas; en Verde se añade `unusedDiscards` en dólares. Plasma usa una única función de factores finales tanto en puntuación como en cota; la media y floor son monótonos y mantienen la sobreestimación de factores independientes.

## Pendientes de integración

DECK03 completado como software: [composición explícita y límites](composicion-deck03.md). DECK04: inventario observado y acciones de consumibles/vales/sobres, no inferidos desde la baraja inicial. DECK05: adquisición y uso de tags, incluidos efectos diferidos de Anaglifo. Estos pendientes no bloquean cálculos de los diez perfiles integrados.

No amplía los ocho efectos de comodín, no añade Monte Carlo ni aplica puntuaciones artificiales a las barajas. Las notas contextuales siguen dependiendo de escenarios y cálculos disponibles.
