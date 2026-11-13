import {collectionArt} from './collection-data.js';

// Owned 1.0.1o-FULL atlas; coordinates from game.lua's sticker sprites.
const positions:Record<string,[number,number]>={eternal:[0,0],perishable:[0,2],rental:[1,2]};
export function jokerStickerArt(id:string):HTMLElement|null {
 const position=positions[id];if(!position)return null;
 const art=collectionArt({id,name:id,nameEn:id,description:'',descriptionEn:'',art:{src:'./web/assets/collection/stickers.png',x:position[0],y:position[1],columns:5,rows:3,width:71,height:95}});
 art.classList.add('joker-sticker-art');art.dataset.sticker=id;art.setAttribute('aria-hidden','true');return art;
}
