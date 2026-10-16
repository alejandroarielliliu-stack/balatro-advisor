import type {GameState,Fact} from '../state/model.js';
import type {Card} from '../catalog/initial.js';
import type {FitSignal} from './quick-fit.js';
import {ALL_JOKER_FACTS} from '../catalog/all-joker-facts.js';
import {standardDeck} from '../catalog/initial.js';
import {deckProfile,resolveDeck} from '../catalog/decks.js';

/** Structural support, not a played-hand trace. Predicates are deliberately
 * explicit: SYN01's participant lists are documentary, not AND expressions.
 * See docs/composiciones.md for cases and the static evidence behind each one. */
const value=<T>(fact:Fact<T>|undefined):T|undefined=>fact?.status==='known'?fact.value:undefined;
const art=(id:string)=>ALL_JOKER_FACTS[id]?.artId??id;
const knownArtIds=new Set(Object.values(ALL_JOKER_FACTS).map(j=>j.artId));

function composition(state:GameState):readonly Card[]|undefined {
 const deck=value(state.observed.deck);if(!deck)return undefined;
 if('cards' in deck)return deck.cards;
 const deckId=value(state.observed.deckId);
 // An initial deck name is never used to fabricate its current cards. Only
 // an explicitly known standard preset consistent with that deck is expanded.
 if(deck.preset!=='standard52-unmodified'||!deckId||!deckProfile(deckId)||resolveDeck(deckId).composition!=='standard52')return undefined;
 return standardDeck();
}

/** Pure inspection of a valid state plus a hypothetical candidate. A replaced
 * instance is excluded before testing relations; no shop action is applied. */
export function inspectCompositions(state:GameState,candidateArtId:string,replacementId?:string):FitSignal[] {
 const candidate=art(candidateArtId);if(!knownArtIds.has(candidate))return [];
 const owned=value(state.observed.jokers);
 if(!owned)return [{id:'composition-inventory',kind:'heuristic',text:'Falta el inventario conocido: no se confirma qué otros comodines acompañarían al candidato.'}];
 const actors=new Set(owned.filter(j=>j.instanceId!==replacementId).map(j=>art(j.catalogId)));
 actors.add(candidate);
 const has=(id:string)=>actors.has(id),any=(ids:readonly string[])=>ids.some(has);
 const related=(ids:readonly string[])=>ids.includes(candidate);
 const deck=composition(state),usable=deck?.filter(card=>!card.debuff);
 const count=(predicate:(card:Card)=>boolean)=>usable?.filter(predicate).length;
 const rank=(card:Card,...ranks:Card['rank'][])=>card.enhancement!=='stone'&&ranks.includes(card.rank);
 const face=(card:Card)=>has('j_pareidolia')||(card.enhancement!=='stone'&&['J','Q','K'].includes(card.rank));
 const context=value(state.observed.jokerContext),signals:FitSignal[]=[];
 const add=(id:string,kind:FitSignal['kind'],text:string)=>signals.push({id:'composition-'+id,kind,text});
 const material=(id:string,n:number|undefined,label:string,mechanism:string,conditions:string)=>{
  const prefix=n===undefined?`Falta la composición actual para contar ${label}.`:n===0?`Sin ${label} elegibles en el mazo conocido.`:`${n} ${label} elegibles en el mazo conocido.`;
  add(id,n===undefined?'heuristic':n===0?'conflict':'potential',`${prefix} ${mechanism} ${conditions}`);
 };

 // Held scoring: an eligible king must really be K, even with Pareidolia.
 const steel=count(c=>c.enhancement==='steel'),kings=count(c=>rank(c,'K'));
 if(related(['j_mime','j_baron'])&&has('j_mime')&&(has('j_baron')||(steel??0)>0||steel===undefined)){
  const support=count(c=>c.enhancement==='steel'||has('j_baron')&&rank(c,'K'));
  const steelKings=count(c=>c.enhancement==='steel'&&rank(c,'K'));
  material('mime-steel-baron',support,'cartas de Acero o reyes con Barón',
   `Mimo repite efectos retenidos${has('j_baron')?' y Barón puede aportar sobre reyes reales':''}.${steel!==undefined?` Acero: ${steel}; reyes reales: ${kings}; reyes de Acero: ${steelKings}.`:''}`,
   'Falta robar y conservar esas cartas al puntuar; jugarlas no activa esta retención. Mimo no repite el efecto independiente de Steel Joker.');
 }
 const blueSeals=count(c=>c.seal==='blue');
 if(candidate==='j_mime'&&blueSeals!==undefined&&blueSeals>0){
  add('mime-blue','potential',`${blueSeals} cartas con sello azul en el mazo conocido. Mimo puede repetir intentos de crear planeta al finalizar la ronda. Falta robar y conservar el sello al cierre, conocer la última mano y disponer de espacio de consumibles en cada intento. Un único hueco no permite prometer dos planetas; no se registra ninguna creación futura.`);
 }

 if(related(['j_photograph','j_hanging_chad','j_pareidolia'])&&has('j_photograph')&&has('j_hanging_chad')){
  material('photo-chad',count(face),'figuras para Fotografía y Chad',
   `Fotografía y Chad pueden aprovechar la misma carta${has('j_pareidolia')?'; Pareidolia permite que otros rangos cuenten como figuras sin convertirlos en reyes':''}.`,
   'Falta que la primera carta puntuada sea también la primera figura puntuada. Tener figuras no demuestra ese orden ni la mano.');
 }
 if(related(['j_wee','j_hack'])&&has('j_wee')&&has('j_hack')){
  material('wee-hack',count(c=>rank(c,'2')),'doses para Wee y Hack','Hack puede repetir el crecimiento de Wee sobre un dos puntuado.',
   'Los doses deben puntuar y el crecimiento debe aprovecharse después; otros rangos que repite Hack no desarrollan Wee. No se añade crecimiento futuro al contador real.');
 }
 if(related(['j_dna','j_hologram'])&&has('j_dna')&&has('j_hologram')){
  add('dna-hologram','potential','ADN puede añadir una carta y desarrollar Holograma. Falta jugar una primera mano legal de una sola carta; no se simula la copia ni su crecimiento. Esa inversión consume una mano y puede diluir otros materiales del mazo.');
 }
 if(related(['j_erosion','j_dna','j_marble'])&&has('j_erosion')&&any(['j_dna','j_marble'])){
  const initial=value(context?.startingDeckSize),current=deck?.length;
  const sizes=initial===undefined||current===undefined?'Falta el tamaño inicial real o la composición actual para medir el soporte de Erosión.':`Tamaño actual ${current}; inicial registrado ${initial}.`;
  add('erosion-addition','conflict',`${has('j_dna')?'ADN':''}${has('j_dna')&&has('j_marble')?' y ':''}${has('j_marble')?'Mármol':''} añaden cartas bajo sus condiciones y compiten con el soporte de Erosión por reducción del mazo. ${sizes} No es una prohibición de la compra ni se supone siempre un tamaño inicial de 52; conservar sus otros beneficios puede justificar el intercambio.`);
 }
 if(related(['j_marble','j_stone','j_hologram'])&&has('j_marble')&&any(['j_stone','j_hologram'])){
  const stones=deck?.filter(c=>c.enhancement==='stone').length;
  add('marble-stone-hologram','potential',`Mármol añade Piedra al seleccionar ciega; esa adición puede alimentar ${has('j_stone')?'el recuento de Stone Joker':''}${has('j_stone')&&has('j_hologram')?' y ':''}${has('j_hologram')?'el desarrollo de Holograma':''}. ${stones===undefined?'Falta el recuento actual de Piedra.':`${stones} cartas de Piedra en el mazo completo conocido.`} Falta seleccionar la ciega con los componentes activos; no se añade una carta ni crecimiento al estado. Stone Joker usa el mazo completo, no necesita puntuar la Piedra.`);
 }

 const repeaters=['j_hanging_chad','j_hack','j_sock_and_buskin','j_dusk','j_selzer'] as const;
 const repeatCondition=(c:Card)=>has('j_hanging_chad')||has('j_dusk')||has('j_selzer')||has('j_hack')&&rank(c,'2','3','4','5')||has('j_sock_and_buskin')&&face(c);
 const glass=count(c=>c.enhancement==='glass');
 // Do not list an unrequested Glass build for every ordinary repeat joker.
 if(related([...repeaters,'j_pareidolia'])&&(candidate!=='j_pareidolia'||has('j_sock_and_buskin'))&&any(repeaters)&&glass!==undefined&&glass>0){
  material('glass-retriggers',count(c=>c.enhancement==='glass'&&repeatCondition(c)),'cartas de Cristal compatibles con las repeticiones presentes',
   'Repetir su puntuación puede repetir la mejora Cristal.',
   'Falta puntuar la carta y cumplir la condición: Chad primera carta, Hack rangos bajos, Sock figura, Dusk última mano o Seltzer con duración disponible. La rotura se trata por separado; repetir puntuación no prueba cuántas veces se comprueba destruirla.');
 }
 if(related(['j_hack','j_walkie_talkie'])&&has('j_hack')&&has('j_walkie_talkie')){
  material('hack-walkie',count(c=>rank(c,'4')),'cuatros para Hack y Walkie Talkie','El rango compartido entre ambos efectos es 4.',
   'Falta puntuar esos cuatros. Los dieces sirven a Walkie Talkie, pero Hack no los repite; ni un rey ni Pareidolia cambian esa intersección.');
 }

 const tarotGenerators=['j_cartomancer','j_vagabond','j_superposition','j_hallucination','j_8_ball'] as const;
 const consumables=value(context?.consumables),slots=value(context?.consumableSlots),room=slots===undefined||consumables===undefined?undefined:slots-consumables.filter(c=>c.edition!=='negative').length;
 const tarots=consumables?.filter(c=>c.kind==='tarot').length,planets=consumables?.filter(c=>c.kind==='planet').length;
 const tarotCopy=has('j_perkeo')&&(tarots??0)>0;
 if(related(['j_fortune_teller',...tarotGenerators,'j_perkeo'])&&(candidate!=='j_perkeo'||tarotCopy)&&has('j_fortune_teller')&&(candidate==='j_fortune_teller'||any(tarotGenerators)||tarotCopy)){
  const used=value(context?.tarotsUsed),producer=any(tarotGenerators)||tarotCopy;
  const supported=used!==undefined&&(candidate==='j_fortune_teller'?((tarots??0)>0||producer&&room!==undefined&&room>0||tarotCopy):candidate==='j_perkeo'?tarotCopy:room!==undefined&&room>0);
  const history=used===undefined?'Falta el número de Tarots usados: no se supone cero.':`${used} Tarots usados registrados; los Tarots poseídos todavía no son usos.`;
  add('tarot-development',supported?'potential':'heuristic',`Fortune Teller aprovecha Tarots usados, no solo generados o poseídos. ${history} ${tarots===undefined?'Falta inventario de consumibles.':`${tarots} Tarots poseídos.`} ${producer?'Los generadores tienen condiciones de ciega, saldo, mano, sobre o azar; Perkeo necesita un Tarot que copiar.':'Falta una fuente futura de Tarot conocida.'} ${room===undefined?'Falta capacidad de consumibles para comprobar las generaciones que la exigen.':`Huecos conocidos: ${Math.max(0,room)}.`} Falta usar los Tarots realmente; no se incorpora uso ni crecimiento futuro.`);
 }
 const blue=blueSeals,planetCopy=has('j_perkeo')&&(planets??0)>0;
 if(related(['j_constellation','j_astronomer','j_perkeo','j_mime'])&&(candidate!=='j_perkeo'||planetCopy)&&(candidate!=='j_mime'||(blue??0)>0)&&has('j_constellation')&&(candidate==='j_constellation'||has('j_astronomer')||planetCopy||has('j_mime')&&(blue??0)>0)){
  const used=value(context?.planetsUsed),supported=candidate!=='j_astronomer'&&used!==undefined&&((planets??0)>0||planetCopy||has('j_mime')&&(blue??0)>0&&room!==undefined&&room>0);
  add('planet-development',supported?'potential':'heuristic',`Constellation desarrolla su efecto al usar planetas; niveles obtenidos por otros efectos no equivalen a usarlos. ${used===undefined?'Falta el historial de planetas usados; no se supone vacío.':`${used.length} usos de planetas registrados.`} ${planets===undefined?'Falta inventario de planetas.':`${planets} planetas poseídos.`} ${has('j_astronomer')?'Astrónomo abarata planetas y sobres celestiales, pero falta una oferta y su uso real.':''} ${has('j_mime')&&(blue??0)>0?'El sello azul con Mimo exige retención al cierre, última mano conocida y espacio para cada creación.':''} ${planetCopy?'Perkeo puede copiar un planeta poseído, condicionado a su evento y a cuál copie.':''} No se genera ni utiliza un planeta hipotético.`);
 }

 if(related(['j_bloodstone','j_smeared','j_oops',...repeaters,'j_pareidolia'])&&(candidate!=='j_pareidolia'||has('j_sock_and_buskin'))&&has('j_bloodstone')&&(candidate==='j_bloodstone'||any(['j_smeared','j_oops',...repeaters]))){
  const heart=(c:Card)=>c.enhancement!=='stone'&&(c.suit==='H'||c.enhancement==='wild'||has('j_smeared')&&c.suit==='D');
  const hearts=count(heart),repeatable=count(c=>heart(c)&&repeatCondition(c));
  material('bloodstone-hearts',hearts,'cartas elegibles como corazones para Heliotropo',
   `El material puede sostener efectos de corazones${has('j_smeared')?'; Smeared permite aprovechar también diamantes':''}.${repeatable!==undefined&&any(repeaters)?` ${repeatable} son compatibles con al menos una repetición presente.`:''}${has('j_oops')?' Oops cambia las probabilidades del efecto y también puede afectar azar perjudicial.':''}`,
   'Falta robar y puntuar corazones y resolver condiciones de las repeticiones. No se deduce un color jugable ni un éxito aleatorio; no se genera una tirada, porcentaje ni ingreso esperado.');
 }
 if(related(['j_pareidolia','j_ride_the_bus'])&&has('j_pareidolia')&&has('j_ride_the_bus')){
  add('pareidolia-bus','conflict','Pareidolia hace que las cartas cuenten como figuras; Ride the Bus pierde su secuencia cuando se puntúa una figura. Esa condición compite con el crecimiento del Bus. Falta la mano concreta para registrar un reinicio; aquí no se borra su contador ni se presupone crecimiento futuro.');
 }
 const discardActors=['j_burglar','j_banner','j_mystic_summit','j_burnt','j_green_joker','j_ramen'] as const;
 if(related(discardActors)&&has('j_burglar')&&any(discardActors.filter(id=>id!=='j_burglar'))){
  const losses=(has('j_banner')||has('j_burnt'))&&['j_burglar','j_banner','j_burnt'].includes(candidate),notes:string[]=[];
  if(has('j_banner'))notes.push('Estandarte pierde su soporte por descartes restantes');
  if(has('j_burnt'))notes.push('Burnt no puede usar el primer descarte de esa ronda');
  if(has('j_mystic_summit'))notes.push('Cumbre Mística tiene favorecida su condición de cero descartes');
  if(has('j_green_joker'))notes.push('Green dispone de más oportunidades de jugar, pero crece solo en manos realmente jugadas');
  if(has('j_ramen'))notes.push('Ramen evita pérdida por descartes, sin garantizar que sus manos superen la ciega');
  add('burglar-discards',losses?'conflict':'potential',`Al seleccionar la ciega, Ladrón elimina descartes y concede manos. ${notes.join('; ')}. Falta activar esa selección y usar los recursos: no se consumen manos ni se modifica un contador, y no se garantiza agotar la ronda.`);
 }
 const gold=count(c=>c.enhancement==='gold'),goldSeals=count(c=>c.seal==='gold');
 if(related(['j_ticket','j_mime'])&&(candidate==='j_ticket'||has('j_ticket')||(gold??0)>0||(goldSeals??0)>0)){
  if(candidate==='j_mime'&&gold===0){
   add('gold-zones','heuristic',`${goldSeals??0} sellos dorados registrados, pero falta una carta con mejora Oro para su ingreso retenido. El sello dorado paga al puntuar y Mimo no lo repite por retención. Esto no descarta otros efectos retenidos de Mimo, como Acero o sello azul.`);
  }else material('gold-zones',gold,'cartas con mejora Oro',
   `${has('j_ticket')?'Golden Ticket necesita cartas de Oro puntuadas. ':''}${has('j_mime')?'Mimo puede repetir la mejora Oro retenida al finalizar la ronda. ':''}${goldSeals!==undefined?`Sellos dorados registrados: ${goldSeals}; el sello no es la mejora Oro.`:''}`,
   'Falta elegir las cartas puntuadas y las retenidas al cierre: una misma carta puntuada no queda retenida en esa mano. No se suman automáticamente los ingresos de zonas distintas; Mimo no repite un sello dorado por retención.');
 }
 if(related(['j_midas_mask','j_vampire','j_pareidolia'])&&has('j_midas_mask')&&has('j_vampire')){
  material('midas-vampire',count(face),'figuras para Midas y Vampiro',
   `Midas puede proporcionar Oro que Vampiro consume${has('j_pareidolia')?'; Pareidolia amplía la condición de figura a otros rangos':''}.`,
   'Falta puntuar esas cartas y disponer Midas antes de Vampiro para consumir la mejora recién creada. Se sacrifican mejoras; el orden inverso produce otro resultado. No se transforma una carta ni crece el contador en esta inspección.');
 }
 if(related(['j_hack','j_fibonacci'])&&has('j_hack')&&has('j_fibonacci')){
  material('hack-fibonacci',count(c=>rank(c,'2','3','5')),'doses, treses o cincos compartidos por Hack y Fibonacci',
   'Hack puede repetir sus aportes de Fibonacci cuando esas cartas puntúan.',
   'Falta robar y puntuar la intersección. Ases y ochos sirven a Fibonacci pero no a Hack; cuatros sirven a Hack pero no a Fibonacci.');
 }
 return signals;
}
