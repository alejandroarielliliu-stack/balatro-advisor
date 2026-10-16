# Cobertura pendiente de comodines

Actualizado 2026-10-12: **82 con cálculo dentro de la cobertura; 68 pendientes**. La solicitud de integrar los 150 sigue abierta. Un texto de catálogo o una rama que se abstiene no cuenta como implementación.

## Azar y resultados explícitos

- [ ] 8 Ball (`j_8_ball`)
- [ ] Misprint (`j_misprint`)
- [ ] Gros Michel (`j_gros_michel`)
- [ ] Business Card (`j_business`)
- [ ] Space Joker (`j_space`)
- [ ] Cavendish (`j_cavendish`)
- [ ] Reserved Parking (`j_reserved_parking`)
- [ ] Bloodstone (`j_bloodstone`)
- [ ] Oops! All 6s (`j_oops`)

## Consumibles, sobres, tienda y uso de objetos

- [ ] Chaos the Clown (`j_chaos`)
- [ ] Constellation (`j_constellation`)
- [ ] Superposition (`j_superposition`)
- [ ] To Do List (`j_todo_list`)
- [ ] Red Card (`j_red_card`)
- [ ] Séance (`j_seance`)
- [ ] Vagabond (`j_vagabond`)
- [ ] Hallucination (`j_hallucination`)
- [ ] Fortune Teller (`j_fortune_teller`)
- [ ] Diet Cola (`j_diet_cola`)
- [ ] Flash Card (`j_flash`)
- [ ] Campfire (`j_campfire`)
- [ ] Showman (`j_ring_master`)
- [ ] Satellite (`j_satellite`)
- [ ] Cartomancer (`j_cartomancer`)
- [ ] Astronomer (`j_astronomer`)
- [ ] Perkeo (`j_perkeo`)

## Creación, destrucción, mejoras y sellos

- [ ] Ceremonial Dagger (`j_ceremonial`)
- [ ] Marble Joker (`j_marble`)
- [ ] DNA (`j_dna`)
- [ ] Sixth Sense (`j_sixth_sense`)
- [ ] Hiker (`j_hiker`)
- [ ] Riff-Raff (`j_riff_raff`)
- [ ] Vampire (`j_vampire`)
- [ ] Hologram (`j_hologram`)
- [ ] Midas Mask (`j_midas_mask`)
- [ ] Stone Joker (`j_stone`)
- [ ] Lucky Cat (`j_lucky_cat`)
- [ ] Trading Card (`j_trading`)
- [ ] Certificate (`j_certificate`)
- [ ] Glass Joker (`j_glass`)
- [ ] Invisible Joker (`j_invisible`)
- [ ] Burnt Joker (`j_burnt`)
- [ ] Canio (`j_caino`)

## Historial, objetivos variables y reglas de ronda

- [ ] Loyalty Card (`j_loyalty_card`)
- [ ] Supernova (`j_supernova`)
- [ ] Burglar (`j_burglar`)
- [ ] Card Sharp (`j_card_sharp`)
- [ ] Madness (`j_madness`)
- [ ] Rocket (`j_rocket`)
- [ ] Obelisk (`j_obelisk`)
- [ ] Luchador (`j_luchador`)
- [ ] Turtle Bean (`j_turtle_bean`)
- [ ] Erosion (`j_erosion`)
- [ ] Mail-In Rebate (`j_mail`)
- [ ] Ancient Joker (`j_ancient`)
- [ ] Castle (`j_castle`)
- [ ] Mr. Bones (`j_mr_bones`)
- [ ] Throwback (`j_throwback`)
- [ ] The Idol (`j_idol`)
- [ ] Matador (`j_matador`)
- [ ] Chicot (`j_chicot`)

## Economía y orden de efectos

- [ ] Credit Card (`j_credit_card`)
- [ ] Egg (`j_egg`)
- [ ] Faceless Joker (`j_faceless`)
- [ ] Gift Card (`j_gift`)
- [ ] Baseball Card (`j_baseball`)
- [ ] Golden Ticket (`j_ticket`)
- [ ] Rough Gem (`j_rough_gem`)

## Orden de continuación

1. Estado explícito de historial de manos y eventos de tienda/consumibles. Inicializar datos desconocidos como desconocidos; no crear contadores históricos en cero al comprar un comodín que utiliza el historial global.
2. Operaciones de creación, destrucción, transformación, sellos y ediciones con IDs conservados. Aplicar Hiker, Vampire y Midas en el orden real; comparar planes que dejan de ser legales sin arreglar sus cartas silenciosamente.
3. Resultados aleatorios declarados por escenario, separados de observaciones. No sustituir un resultado por su esperanza ni generar cartas sin semilla/contexto.
4. Rondas, jefes, rescate y economía, incluidos cambios al vender. Pruebas de cada familia antes de habilitar su `engineId`.

Estos son trabajos pendientes del motor, no solicitudes de evidencia al usuario ni bloqueos para continuar desarrollando. Cada efecto requiere oráculo independiente y pruebas de compra, interacción y persistencia antes de pasar al grupo compatible.
