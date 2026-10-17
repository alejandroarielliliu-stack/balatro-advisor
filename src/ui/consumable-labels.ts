/** UI labels only: IDs, rules and saved files remain unchanged. */
const labels:Readonly<Record<string,string>>={
 c_fool:'El Loco',c_magician:'El Mago',c_high_priestess:'La Sacerdotisa',c_empress:'La Emperatriz',c_emperor:'El Emperador',c_heirophant:'El Hierofante',
 c_lovers:'Los Enamorados',c_chariot:'El Carro',c_justice:'La Justicia',c_hermit:'El Ermitaño',c_wheel_of_fortune:'La Rueda de la Fortuna',c_strength:'La Fuerza',
 c_hanged_man:'El Colgado',c_death:'La Muerte',c_temperance:'La Templanza',c_devil:'El Diablo',c_tower:'La Torre',c_star:'La Estrella',c_moon:'La Luna',c_sun:'El Sol',c_judgement:'El Juicio',c_world:'El Mundo',
 c_mercury:'Mercurio',c_venus:'Venus',c_earth:'Tierra',c_mars:'Marte',c_jupiter:'Júpiter',c_saturn:'Saturno',c_uranus:'Urano',c_neptune:'Neptuno',c_pluto:'Plutón',c_planet_x:'Planeta X',c_ceres:'Ceres',c_eris:'Eris',
 c_familiar:'Familiar',c_grim:'Sombrío',c_incantation:'Encantamiento',c_talisman:'Talismán',c_aura:'Aura',c_wraith:'Espectro',c_sigil:'Sigilo',c_ouija:'Ouija',c_ectoplasm:'Ectoplasma',c_immolate:'Inmolación',c_ankh:'Anj',c_deja_vu:'Déjà vu',c_hex:'Maleficio',c_trance:'Trance',c_medium:'Médium',c_cryptid:'Críptido',c_soul:'El Alma',c_black_hole:'Agujero Negro'
};
export const consumableLabel=(id:string)=>labels[id]??id;
