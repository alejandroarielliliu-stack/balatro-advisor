/** Original vector reinterpretations for the selector; not extracted game sprites.
 * Provenance: web/assets/decks/provenance.json. Presentation only, no game rules.
 */
const NS='http://www.w3.org/2000/svg';
let serial=0;
const element=(tag:string,attributes:Record<string,string|number>={})=>{
 const node=document.createElementNS(NS,tag);
 for(const [name,value] of Object.entries(attributes))node.setAttribute(name,String(value));
 return node;
};
const rect=(x:number,y:number,width:number,height:number,fill:string,extra:Record<string,string|number>={})=>element('rect',{x,y,width,height,fill,...extra});
const path=(d:string,fill:string,extra:Record<string,string|number>={})=>element('path',{d,fill,...extra});
const circle=(cx:number,cy:number,r:number,fill:string,extra:Record<string,string|number>={})=>element('circle',{cx,cy,r,fill,...extra});
const diamond=(cx:number,cy:number,r:number,fill:string)=>path(`M${cx} ${cy-r}L${cx+r*.65} ${cy}L${cx} ${cy+r}L${cx-r*.65} ${cy}Z`,fill);
const star=(x:number,y:number,fill:string)=>path(`M${x} ${y-4}L${x+1} ${y-1}L${x+4} ${y}L${x+1} ${y+1}L${x} ${y+4}L${x-1} ${y+1}L${x-4} ${y}L${x-1} ${y-1}Z`,fill);
type Palette={base:string;dark:string;light:string};
const palettes:Record<string,Palette>={
 red:{base:'#b73f43',dark:'#742932',light:'#ee9d88'},
 blue:{base:'#287eab',dark:'#204765',light:'#a2d7de'},
 yellow:{base:'#bd8e27',dark:'#785528',light:'#efd36b'},
 green:{base:'#3c8e6d',dark:'#26534b',light:'#b7d5a2'},
 black:{base:'#37404b',dark:'#192b35',light:'#9da9a5'},
 magic:{base:'#76519e',dark:'#40376a',light:'#d3b4e1'},
 nebula:{base:'#234f85',dark:'#182d4d',light:'#aecce7'},
 ghost:{base:'#315b92',dark:'#20385e',light:'#d8e8e3'},
 abandoned:{base:'#8b7952',dark:'#484b42',light:'#d3bf8a'},
 checkered:{base:'#b6424b',dark:'#283039',light:'#e7c6b1'},
 zodiac:{base:'#3c7771',dark:'#25434e',light:'#d1c99b'},
 painted:{base:'#e0be86',dark:'#4b605b',light:'#ece2b9'},
 anaglyph:{base:'#394d72',dark:'#23334d',light:'#d5dfd1'},
 plasma:{base:'#a380a4',dark:'#4a3b6a',light:'#eee0c2'},
 erratic:{base:'#6b6374',dark:'#364957',light:'#dac6ab'}
};
function illustration(id:string,p:Palette,patternId:string):SVGElement[]{
 const art:SVGElement[]=[rect(4,4,63,87,p.base),rect(4,4,63,87,`url(#${patternId})`)];
 if(['red','blue','yellow','green','black'].includes(id)){
  art.push(path('M35 10L60 29V66L35 85L11 66V29Z','none',{stroke:p.light,'stroke-width':1}),
   path('M35 17L55 32V62L35 78L16 62V32Z','none',{stroke:p.dark,'stroke-width':2}),
   element('ellipse',{cx:35.5,cy:47.5,rx:13,ry:24,fill:p.dark,stroke:p.light,'stroke-width':1}),
   diamond(35.5,47.5,15,p.light),diamond(35.5,47.5,8,p.base));
  for(const x of [12,59])for(const y of [13,82])art.push(diamond(x,y,3,p.light));
 }else if(id==='magic'){
  art.push(circle(35,47,22,'none',{stroke:p.light,'stroke-width':1}),
   path('M35 22L53 59L14 37L56 37L18 59Z','none',{stroke:p.light,'stroke-width':2}),
   diamond(35,46,9,'#e0c773'));
  for(const [x,y] of [[16,16],[52,18],[18,76],[54,79]])art.push(star(x!,y!,p.light));
 }else if(id==='nebula'){
  for(const [x,y,r] of [[13,16,1],[48,13,2],[56,31,1],[17,54,2],[54,76,1],[25,82,1],[11,77,1]])art.push(circle(x!,y!,r!,p.light));
  art.push(element('ellipse',{cx:36,cy:47,rx:25,ry:10,fill:'none',stroke:'#b69dbf','stroke-width':4,transform:'rotate(-32 36 47)'}),
   circle(36,47,14,'#729cae'),path('M27 39Q45 35 48 45Q35 43 25 51Z','#d0c2a6'),star(18,29,'#e4d69b'));
 }else if(id==='ghost'){
  art.push(path('M4 18Q24 5 28 25T52 37T66 17M4 64Q24 48 27 70T57 82T67 59','none',{stroke:'#bdab55','stroke-width':5}),
   path('M4 34Q18 19 18 40T38 66T57 56T67 41','none',{stroke:'#86a8c0','stroke-width':3}),
   path('M24 62V39Q24 26 36 26Q49 26 49 40V66L43 60L38 67L32 61L24 67Z',p.light,{stroke:p.dark,'stroke-width':2}),
   rect(30,39,4,7,p.dark),rect(40,39,4,7,p.dark),path('M33 53Q37 57 41 52','none',{stroke:p.dark,'stroke-width':2}),
   star(54,14,p.light),star(15,80,p.light));
 }else if(id==='abandoned'){
  art.push(path('M12 9L22 14L38 11L47 16L61 12L58 29L62 42L58 58L62 80L45 78L34 85L22 80L10 83L14 65L10 50L14 30Z','none',{stroke:p.light,'stroke-width':3}),
   path('M20 26L35 19L50 27L47 44L51 65L34 74L20 63L24 44Z',p.dark),
   path('M26 39L35 31L44 40L42 58L35 66L28 57Z',p.light),
   path('M7 36L17 40L9 48M59 50L52 57L63 61M26 7L30 18L24 22','none',{stroke:p.dark,'stroke-width':2}));
 }else if(id==='checkered'){
  for(let row=0;row<8;row++)for(let col=0;col<6;col++)if((row+col)%2===0)art.push(rect(5+col*11,4+row*11,11,11,p.dark));
  art.push(diamond(35.5,47.5,29,p.light),diamond(35.5,47.5,23,p.dark),diamond(35.5,47.5,16,p.base));
 }else if(id==='zodiac'){
  art.push(circle(35.5,47.5,25,'none',{stroke:p.light,'stroke-width':2}),circle(35.5,47.5,20,'none',{stroke:p.light,'stroke-width':1}));
  for(let n=0;n<12;n++){const angle=n*Math.PI/6;art.push(circle(35.5+24.5*Math.cos(angle),47.5+24.5*Math.sin(angle),1.5,p.light));}
  art.push(circle(35.5,47.5,13,p.light),circle(40.5,43.5,12,p.dark),star(26,53,p.light),star(15,15,p.light),star(56,80,p.light));
 }else if(id==='painted'){
  art.push(path('M8 19L53 10L62 22L25 35L58 33L63 44L12 62L10 51L46 38L8 42Z','#c36f67'),
   path('M8 69L55 51L62 64L23 79L59 76L62 85L10 89Z','#4f8c97'),
   path('M17 12L33 8L48 83L33 89Z','#d8a444'),
   path('M28 35L45 30L54 61L37 67Z','#71936f'));
 }else if(id==='anaglyph'){
  art.push(path('M29 15L52 47L29 80L7 47Z','none',{stroke:'#d16569','stroke-width':5}),
   path('M42 15L64 47L42 80L19 47Z','none',{stroke:'#58c2ca','stroke-width':5}),
   circle(29,47,13,'none',{stroke:'#e2918d','stroke-width':3}),circle(42,47,13,'none',{stroke:'#9edfe0','stroke-width':3}),
   rect(32,40,7,14,p.light));
 }else if(id==='plasma'){
  for(let i=0;i<5;i++){const d=i*6;art.push(path(`M${7+d} 6Q${62-d} 23 ${7+d} 46T${7+d} 89`,'none',{stroke:i%2?p.dark:p.light,'stroke-width':3}));}
  art.push(circle(35.5,47.5,13,p.dark),circle(35.5,47.5,9,p.light),circle(35.5,47.5,4,p.base));
 }else if(id==='erratic'){
  const colors=['#d36a68','#739da7','#d3b56c','#8988a6','#66998a'];
  for(let row=0;row<7;row++)for(let col=0;col<5;col++){
   const color=colors[(row*3+col*2)%colors.length]!;
   art.push(rect(6+col*12,6+row*12,10,10,color));
   if((row+col)%3===0)art.push(diamond(11+col*12,11+row*12,3,p.dark));
   else if((row+col)%3===1)art.push(circle(11+col*12,11+row*12,2,p.light));
  }
 }else art.push(diamond(35.5,47.5,22,p.light),diamond(35.5,47.5,15,p.dark));
 return art;
}
/** 71:95 artwork, sized with CSS --deck-art-width or the surrounding selector. */
export function deckArt(id:string,label:string):HTMLElement{
 const host=document.createElement('span');host.className='deck-art';host.dataset.deck=id;host.dataset.artSource='advisor-original-vector-v1';host.setAttribute('role','img');host.setAttribute('aria-label',label);
 const palette=palettes[id]??{base:'#69777c',dark:'#374c56',light:'#d3d7c4'},key='advisor-deck-art-'+(++serial);
 const svg=element('svg',{viewBox:'0 0 71 95','aria-hidden':'true',focusable:'false','shape-rendering':'crispEdges'}),defs=element('defs'),pattern=element('pattern',{id:key+'-pattern',width:8,height:8,patternUnits:'userSpaceOnUse'});
 pattern.append(path('M0 0L8 8M-4 4L4 12M4-4L12 4','none',{stroke:palette.light,'stroke-width':.7,opacity:.22}));
 const clip=element('clipPath',{id:key+'-clip'});clip.append(rect(4,4,63,87,'#fff',{rx:1}));defs.append(pattern,clip);svg.append(defs,
  path('M3 0H68V2H71V92H69V95H2V93H0V3H3Z','#a8b9b6'),
  path('M4 1H67V3H70V91H68V94H3V92H1V4H4Z','#ece7ce'));
 const content=element('g',{'clip-path':`url(#${key}-clip)`});content.append(...illustration(id,palette,key+'-pattern'));svg.append(content,rect(5.5,5.5,60,84,'none',{stroke:palette.light,'stroke-width':1,opacity:.7}));host.append(svg);return host;
}
const chipColors:Record<string,[string,string]>={white:['#e7e5cd','#a1b4ad'],red:['#d34a49','#8e303a'],green:['#4b9e75','#286453'],black:['#35464b','#152b35'],blue:['#368bb8','#205675'],purple:['#a06cb3','#634b7c'],orange:['#d68b3c','#925e36'],gold:['#ddbc50','#927336']};
/** Original chip illustration. Its color identifies a stake, not engine support. */
export function stakeArt(id:string,label:string):HTMLElement{
 const host=document.createElement('span');host.className='stake-art';host.dataset.stake=id;host.dataset.artSource='advisor-original-vector-v1';host.setAttribute('role','img');host.setAttribute('aria-label',label);
 const [base,dark]=chipColors[id]??['#92a1a0','#52666d'];
 const svg=element('svg',{viewBox:'0 0 32 34','aria-hidden':'true',focusable:'false','shape-rendering':'crispEdges'});
 svg.append(path('M10 3H22V5H27V9H30V25H27V29H22V32H10V30H5V26H2V10H5V6H10Z','#122b32'),
  path('M10 1H22V3H27V7H30V23H27V27H22V30H10V28H5V24H2V8H5V4H10Z',dark),
  circle(16,15.5,13,base),circle(16,15.5,9.5,'none',{stroke:'#e0dfc6','stroke-width':1.5,opacity:.75}),
  circle(16,15.5,6.5,'none',{stroke:dark,'stroke-width':1.5}));
 for(let i=0;i<8;i++)svg.append(rect(14.5,2.5,3,5,'#e6e4ce',{transform:`rotate(${i*45} 16 15.5)`,opacity:.9}));
 host.append(svg);return host;
}
