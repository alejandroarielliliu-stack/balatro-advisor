/** Original Balatro atlas cells from the pinned public mirror already used by
 * the Joker catalogue. See web/assets/decks/provenance.json. Presentation only.
 */
const backs:Record<string,readonly [number,number]>={
 red:[0,0],blue:[0,2],yellow:[1,2],green:[2,2],black:[3,2],magic:[0,3],nebula:[3,0],ghost:[6,2],
 abandoned:[3,3],checkered:[1,3],zodiac:[3,4],painted:[4,3],anaglyph:[2,4],plasma:[4,2],erratic:[2,3]
};
const chips:Record<string,readonly [number,number]>={white:[0,0],red:[1,0],green:[2,0],black:[4,0],blue:[3,0],purple:[0,1],orange:[1,1],gold:[2,1]};
function art(kind:'deck'|'stake',id:string,label:string):HTMLElement{
 const host=document.createElement('span');host.className=kind+'-art';host.dataset[kind]=id;host.setAttribute('role','img');host.setAttribute('aria-label',label);
 const position=(kind==='deck'?backs:chips)[id];
 const unavailable=()=>{host.dataset.artStatus='unavailable';host.dataset.artSource='unavailable';host.setAttribute('aria-label',label+' · ilustración no disponible');host.replaceChildren();const fallback=document.createElement('span');fallback.className='art-unavailable';fallback.textContent='?';fallback.setAttribute('aria-hidden','true');host.append(fallback);};
 if(!position){unavailable();return host;}
 host.dataset.artSource='balatro-game-atlas-1.0.1o';host.dataset.artStatus='loading';host.style.setProperty('--art-x',String(position[0]));host.style.setProperty('--art-y',String(position[1]));
 const image=document.createElement('img');image.alt='';image.setAttribute('aria-hidden','true');image.draggable=false;image.decoding='async';
 image.onload=()=>{host.dataset.artStatus='loaded';};image.onerror=unavailable;
 image.src='./web/assets/decks/'+(kind==='deck'?'enhancers.png':'chips.png');host.append(image);return host;
}
/** Actual 71:95 card-back cell. Resize with --deck-art-width. */
export function deckArt(id:string,label:string):HTMLElement{return art('deck',id,label);}
/** Actual 29:29 stake-chip cell. Color is identity, not engine support. */
export function stakeArt(id:string,label:string):HTMLElement{return art('stake',id,label);}
