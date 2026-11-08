/** Descriptive data and target/reward metadata, not implementation of boss effects.
 * Pinned game source matches the game.lua hash in docs/evidencia/h2-inspeccion-local.md.
 * See docs/evidencia/jefes-catalogo.md; no direct observation of a played round. */
export const BOSS_CATALOG_EVIDENCE={
 id:'BOSS-CATALOG-01',status:'provisional',verification:'static_source_inspection',
 observedInGame:false,gameVersion:'1.0.1o-FULL',
 sourceCommit:'f081d0e41508d9dcc7a01cba5bffcccfbb115af1',
 source:'https://github.com/Jofr3/balatro-source/tree/f081d0e41508d9dcc7a01cba5bffcccfbb115af1',
 documentation:'docs/evidencia/jefes-catalogo.md'
} as const;

export interface BossDefinition {
 readonly id:string;
 readonly name:string;
 readonly nameEn:string;
 readonly description:string;
 readonly shortDescription:string;
 /** Multiplier of the ante base, before a deck multiplier or boss disable. */
 readonly multiplier:number;
 /** Base reward for winning the blind, not a full cashout or a projection. */
 readonly reward:number;
 /** First ordinary ante, or ante8 for the standard final within this app's goal. */
 readonly minAnte:number;
 readonly showdown:boolean;
 /** Original metadata; final selection actually uses ante modulo win_ante. */
 readonly sourceMinAnte:number;
 readonly sourceMaxAnte:number;
 readonly artId:string;
 readonly order:number;
 /** Observations required before this effect can be resolved, rather than guessed. */
 readonly dynamicRequirements:readonly string[];
 readonly evidence:typeof BOSS_CATALOG_EVIDENCE;
}

const entry=(id:string,name:string,nameEn:string,description:string,shortDescription:string,
 multiplier:number,minAnte:number,order:number,artId:string,dynamicRequirements:readonly string[]=[],showdown=false):BossDefinition=>({
 id,name,nameEn,description,shortDescription,multiplier,reward:showdown?8:5,
 minAnte:showdown?8:minAnte,showdown,sourceMinAnte:showdown?10:minAnte,sourceMaxAnte:10,
 artId,order,dynamicRequirements,evidence:BOSS_CATALOG_EVIDENCE
});

/** All23 ordinary bosses and all5 standard ante8 finals, in the original order. */
export const BOSS_CATALOG:readonly BossDefinition[]=[
 entry('the_hook','El garfio','The Hook',
  'Después de jugar una mano, descarta al azar hasta 2 cartas de las que quedan en la mano.',
  'Descarta 2 cartas al azar.',2,1,3,'bl_hook',['held_cards','random_discard_result']),
 entry('the_ox','El buey','The Ox',
  'Jugar el tipo de mano señalado por este jefe deja el dinero en $0. Ese tipo concreto debe observarse; no se recalcula a partir de las manos actuales.',
  'La mano indicada deja $0.',2,6,4,'bl_ox',['ox_target_hand','played_hand_type','money']),
 entry('the_house','La casa','The House',
  'Las cartas de la mano inicial de la ronda se reciben boca abajo.',
  'Primera mano boca abajo.',2,2,5,'bl_house',['round_draw_history','hidden_card_observations']),
 entry('the_wall','El muro','The Wall',
  'Exige cuatro veces la base de fichas del ante; el tamaño es su efecto especial.',
  'Ciega cuatro veces la base.',4,2,6,'bl_wall',[]),
 entry('the_wheel','La rueda','The Wheel',
  'Cada carta recibida en la mano puede quedar boca abajo. La probabilidad normal es 1 de 7 y cambia con los modificadores de probabilidad.',
  'Cartas ocultas: base 1/7.',2,2,7,'bl_wheel',['normal_probability_modifier','observed_face_down_cards']),
 entry('the_arm','El brazo','The Arm',
  'Reduce en un nivel el tipo de mano que juegas, sin bajarlo de nivel 1.',
  'Baja el nivel de la mano.',2,2,8,'bl_arm',['played_hand_type','current_hand_levels']),
 entry('the_club','El garrote','The Club',
  'Debilita las cartas que cuentan como tréboles durante esta ciega.',
  'Tréboles debilitados.',2,1,9,'bl_club',['effective_card_suits']),
 entry('the_fish','El pez','The Fish',
  'Las cartas robadas después de jugar una mano se reciben boca abajo.',
  'Robos tras jugar: ocultos.',2,2,10,'bl_fish',['round_draw_history','hidden_card_observations']),
 entry('the_psychic','El psíquico','The Psychic',
  'Cada jugada debe incluir exactamente 5 cartas; no basta con que su categoría puntúe menos cartas.',
  'Debes jugar 5 cartas.',2,1,11,'bl_psychic',['played_card_count']),
 entry('the_goad','La provocación','The Goad',
  'Debilita las cartas que cuentan como picas durante esta ciega.',
  'Picas debilitadas.',2,1,12,'bl_goad',['effective_card_suits']),
 entry('the_water','El agua','The Water',
  'Al seleccionar esta ciega se eliminan los descartes disponibles para la ronda.',
  'Empiezas sin descartes.',2,2,13,'bl_water',['discards_at_blind_selection']),
 entry('the_window','La ventana','The Window',
  'Debilita las cartas que cuentan como diamantes durante esta ciega.',
  'Diamantes debilitados.',2,1,14,'bl_window',['effective_card_suits']),
 entry('the_manacle','El grillete','The Manacle',
  'Durante esta ciega el tamaño de la mano se reduce en 1.',
  'Tamaño de mano −1.',2,1,15,'bl_manacle',['effective_hand_size']),
 entry('the_eye','El ojo','The Eye',
  'Un tipo de mano ya jugado en esta ronda no puede volver a puntuar en ella.',
  'No repitas tipos de mano.',2,3,16,'bl_eye',['hand_types_played_this_round']),
 entry('the_mouth','La boca','The Mouth',
  'La primera jugada fija el único tipo de mano admitido para el resto de esta ronda.',
  'Un solo tipo de mano.',2,2,17,'bl_mouth',['first_played_hand_type']),
 entry('the_plant','La planta','The Plant',
  'Debilita todas las cartas que cuentan como figuras durante esta ciega.',
  'Figuras debilitadas.',2,4,18,'bl_plant',['effective_face_cards']),
 entry('the_serpent','La serpiente','The Serpent',
  'Después de jugar o descartar se roban siempre 3 cartas en lugar del relleno normal de la mano.',
  'Robas 3 al jugar o descartar.',2,5,19,'bl_serpent',['round_draw_history','remaining_deck_cards']),
 entry('the_pillar','El pilar','The Pillar',
  'Debilita las cartas que ya se hayan jugado en este mismo ante.',
  'Debilita lo jugado en el ante.',2,1,20,'bl_pillar',['card_ids_played_this_ante']),
 entry('the_needle','La aguja','The Needle',
  'Reduce a 1 las manos disponibles para jugar esta ronda. Su objetivo es una vez la base del ante.',
  'Solo 1 mano para jugar.',1,2,21,'bl_needle',['hands_at_blind_selection']),
 entry('the_head','La cabeza','The Head',
  'Debilita las cartas que cuentan como corazones durante esta ciega.',
  'Corazones debilitados.',2,1,22,'bl_head',['effective_card_suits']),
 entry('the_tooth','El diente','The Tooth',
  'Resta $1 por cada carta jugada, incluidas las que no puntúan.',
  '−$1 por carta jugada.',2,3,23,'bl_tooth',['played_card_count','money']),
 entry('the_flint','El pedernal','The Flint',
  'Divide a la mitad las fichas base y el Mult base de la mano antes de añadir sus otros efectos; el redondeo pertenece a la regla de puntuación.',
  'Fichas base y Mult a la mitad.',2,2,24,'bl_flint',['hand_base_chips','hand_base_mult']),
 entry('the_mark','La marca','The Mark',
  'Las cartas que cuentan como figuras se reciben boca abajo.',
  'Figuras boca abajo.',2,2,25,'bl_mark',['effective_face_cards','hidden_card_observations']),
 entry('amber_acorn','Bellota ambarina','Amber Acorn',
  'Al seleccionar esta ciega, voltea boca abajo los comodines y mezcla su orden.',
  'Comodines ocultos y mezclados.',2,8,26,'bl_final_acorn',['observed_joker_order'],true),
 entry('verdant_leaf','Hoja verde','Verdant Leaf',
  'Todas las cartas quedan debilitadas hasta que vendas un comodín durante esta ciega.',
  'Vende un comodín para habilitar.',2,8,27,'bl_final_leaf',['joker_sold_during_this_blind'],true),
 entry('violet_vessel','Contenedor violeta','Violet Vessel',
  'Exige seis veces la base de fichas del ante; el tamaño es su efecto especial.',
  'Ciega seis veces la base.',6,8,28,'bl_final_vessel',[],true),
 entry('crimson_heart','Corazón carmesí','Crimson Heart',
  'Un comodín elegido al azar queda inhabilitado para cada mano; la elección puede cambiar entre manos.',
  'Un comodín inhabilitado al azar.',2,8,29,'bl_final_heart',['observed_disabled_joker_each_hand'],true),
 entry('cerulean_bell','Campana cerúlea','Cerulean Bell',
  'Una carta de la mano queda marcada al azar y debe permanecer seleccionada mientras siga en la mano.',
  'Una carta de selección obligada.',2,8,30,'bl_final_bell',['observed_forced_card_id'],true)
];

/** Canonical application IDs only; art IDs are deliberately a separate field. */
export function bossDefinition(id:string):BossDefinition|undefined{return BOSS_CATALOG.find(boss=>boss.id===id);}
