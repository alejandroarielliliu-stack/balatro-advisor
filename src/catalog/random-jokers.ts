/** CAT04: inspected local Steam 1.0.1o-FULL source; no gameplay observation claimed. */
export const RANDOM_JOKERS = {
  '8_ball': {name:'8 Ball',artId:'j_8_ball',price:5,sell:2,blueprint:true},
  misprint: {name:'Misprint',artId:'j_misprint',price:4,sell:2,blueprint:true},
  gros_michel: {name:'Gros Michel',artId:'j_gros_michel',price:5,sell:2,blueprint:true},
  business: {name:'Business Card',artId:'j_business',price:4,sell:2,blueprint:true},
  space: {name:'Space Joker',artId:'j_space',price:5,sell:2,blueprint:true},
  cavendish: {name:'Cavendish',artId:'j_cavendish',price:4,sell:2,blueprint:true},
  reserved_parking: {name:'Reserved Parking',artId:'j_reserved_parking',price:6,sell:3,blueprint:true},
  bloodstone: {name:'Bloodstone',artId:'j_bloodstone',price:7,sell:3,blueprint:true},
  oops: {name:'Oops! All 6s',artId:'j_oops',price:4,sell:2,blueprint:false}
} as const;
export const randomJoker=(id:string)=>Object.hasOwn(RANDOM_JOKERS,id)?RANDOM_JOKERS[id as keyof typeof RANDOM_JOKERS]:undefined;
