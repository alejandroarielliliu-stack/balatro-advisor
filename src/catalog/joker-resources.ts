/** Physical inventory effects; Blueprint/Brainstorm cannot copy passive resource changes. */
export function jokerResourceDelta(ids:readonly string[]){
 const r={hands:0,discards:0,handSize:0};
 for(const id of ids)switch(id){
  case 'juggler':r.handSize++;break;
  case 'drunkard':r.discards++;break;
  case 'troubadour':r.handSize+=2;r.hands--;break;
  case 'merry_andy':r.discards+=3;r.handSize--;break;
  case 'stuntman':r.handSize-=2;break;
 }
 return r;
}
