/** Original Balatro sprite positions, presentation only. See assets/blinds/provenance.json. */
const blindCells:Record<string,readonly [number,number]>={"bl_small":[0,0],"bl_big":[0,1],"bl_ox":[0,2],"bl_hook":[0,7],"bl_mouth":[0,18],"bl_fish":[0,5],"bl_club":[0,4],"bl_manacle":[0,8],"bl_tooth":[0,22],"bl_wall":[0,9],"bl_house":[0,3],"bl_mark":[0,23],"bl_final_bell":[0,26],"bl_wheel":[0,10],"bl_arm":[0,11],"bl_psychic":[0,12],"bl_goad":[0,13],"bl_water":[0,14],"bl_eye":[0,17],"bl_plant":[0,19],"bl_needle":[0,20],"bl_head":[0,21],"bl_final_leaf":[0,28],"bl_final_vessel":[0,29],"bl_window":[0,6],"bl_serpent":[0,15],"bl_pillar":[0,16],"bl_flint":[0,24],"bl_final_acorn":[0,27],"bl_final_heart":[0,25]};
const tagCells:Record<string,readonly [number,number]>={"tag_uncommon":[0,0],"tag_rare":[1,0],"tag_negative":[2,0],"tag_foil":[3,0],"tag_holo":[0,1],"tag_polychrome":[1,1],"tag_investment":[2,1],"tag_voucher":[3,1],"tag_boss":[0,2],"tag_standard":[1,2],"tag_charm":[2,2],"tag_meteor":[3,2],"tag_buffoon":[4,2],"tag_handy":[1,3],"tag_garbage":[2,3],"tag_ethereal":[3,3],"tag_coupon":[4,0],"tag_double":[5,0],"tag_juggle":[5,1],"tag_d_six":[5,3],"tag_top_up":[4,1],"tag_skip":[0,3],"tag_orbital":[5,2],"tag_economy":[4,3],"tag_undiscovered":[3,4]};
const aliases:Record<string,string>={small:'bl_small',big:'bl_big',violet_vessel:'bl_final_vessel',amber_acorn:'bl_final_acorn',cerulean_bell:'bl_final_bell',crimson_heart:'bl_final_heart',verdant_leaf:'bl_final_leaf'};
function sprite(kind:'blind'|'tag',id:string,label:string):HTMLElement{
 const host=document.createElement('span');host.className=kind+'-art';host.dataset[kind]=id;host.setAttribute('role','img');host.setAttribute('aria-label',label);
 const key=kind==='blind'?(aliases[id]??(id.startsWith('the_')?'bl_'+id.slice(4):id)):id;
 const cell=(kind==='blind'?blindCells:tagCells)[key];
 const unavailable=()=>{host.dataset.artStatus='unavailable';host.dataset.artSource='unavailable';host.setAttribute('aria-label',label+' · ilustración no disponible');host.replaceChildren();const mark=document.createElement('span');mark.className='blind-art-unavailable';mark.setAttribute('aria-hidden','true');mark.textContent='?';host.append(mark);};
 if(!cell){unavailable();return host;}
 host.dataset.artSource='balatro-blind-tag-atlas-1.0.1o';host.dataset.artStatus='loading';host.style.setProperty('--sprite-x',String(cell[0]));host.style.setProperty('--sprite-y',String(cell[1]));
 const image=document.createElement('img');image.alt='';image.setAttribute('aria-hidden','true');image.draggable=false;image.decoding='async';image.onload=()=>{host.dataset.artStatus='loaded';};image.onerror=unavailable;image.src='./web/assets/blinds/'+(kind==='blind'?'blind-chips.png':'tags.png');host.append(image);return host;
}
/** Original chip, first animation frame. Includes visual identities beyond engine coverage. */
export function blindArt(id:string,label:string):HTMLElement{return sprite('blind',id,label);}
/** Original icon for one of the existing 24 tag IDs. Does not implement tag effects. */
export function tagArt(id:string,label:string):HTMLElement{return sprite('tag',id,label);}
