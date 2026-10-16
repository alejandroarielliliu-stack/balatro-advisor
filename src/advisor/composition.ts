import type {GameState,Fact,Issue} from '../state/model.js';
import {validateState} from '../state/validation.js';
import {ALL_JOKER_FACTS} from '../catalog/all-joker-facts.js';
import {standardDeck} from '../catalog/initial.js';
import type {Card} from '../catalog/initial.js';
import {deckProfile,resolveDeck} from '../catalog/decks.js';
import {VOUCHER_CATALOG} from '../catalog/voucher-catalog.js';
import {supportsVoucher} from '../catalog/vouchers.js';
import {FIT_PROFILES} from './fit-profiles.js';
import type {FitRole} from './fit-profiles.js';
import {evaluateOwnedFits} from './quick-fit.js';
import type {QuickFit,FitSignal} from './quick-fit.js';
import {inspectCompositions} from './composition-signals.js';
import {COMPOSITION_POLICY,compositionRound} from './composition-policy.js';

export interface CompositionFinding {
 id:string;title:string;detail:string;kind:'fact'|'potential'|'conflict'|'unknown';
 relatedJokers:string[];relatedVouchers:string[];
}
export interface CompositionMaterial {
 total:number|null;usable:number|null;kings:number|null;queens:number|null;faces:number|null;
 twos:number|null;steel:number|null;gold:number|null;blueSeals:number|null;stone:number|null;
}
export type CompositionSectionId='scoring'|'economy'|'synergy'|'deck'|'growth'|'resources';
export interface CompositionSection {
 id:CompositionSectionId;label:string;value:number|null;range:[number,number|null]|null;
 status:'known'|'partial'|'not-applicable';reasons:string[];ruleIds:string[];
}
export interface CompositionReport {
 policy:'composition-1';status:'empty'|'conflict'|'needs-data'|'conditional'|'supported';
 heading:string;summary:string;stage:string;material:CompositionMaterial;
 roles:{role:FitRole;status:'available'|'conditional'|'missing'|'unknown';count:number}[];
 fits:QuickFit[];strengths:CompositionFinding[];weaknesses:CompositionFinding[];
 priorities:CompositionFinding[];synergies:CompositionFinding[];vouchers:CompositionFinding[];
 limitations:string[];errors:Issue[];
 sections:CompositionSection[];
 global:{value:number|null;range:[number,number|null]|null;status:CompositionSection['status'];
  weights:Record<CompositionSectionId,number>;reasons:string[]};
}
const value=<T>(fact:Fact<T>|undefined):T|undefined=>fact?.status==='known'?fact.value:undefined;
const art=(id:string)=>ALL_JOKER_FACTS[id]?.artId??id;
const roleIds:FitRole[]=['chips','mult','xmult','retrigger','economy','growth','deck','utility'];
const nullMaterial=():CompositionMaterial=>({total:null,usable:null,kings:null,queens:null,faces:null,twos:null,steel:null,gold:null,blueSeals:null,stone:null});
const finding=(id:string,title:string,detail:string,kind:CompositionFinding['kind'],relatedJokers:string[]=[],relatedVouchers:string[]=[]):CompositionFinding=>({id,title,detail,kind,relatedJokers,relatedVouchers});

/** Shared qualitative families. Participants are references, not extra AND predicates. */
const families:Readonly<Record<string,{title:string;actors:readonly string[]}>>={
 'mime-steel-baron':{title:'Retención con Mimo',actors:['j_mime','j_baron']},
 'mime-blue':{title:'Mimo y sello azul',actors:['j_mime']},
 'photo-chad':{title:'Fotografía y Chad',actors:['j_photograph','j_hanging_chad','j_pareidolia']},
 'wee-hack':{title:'Wee y Hack',actors:['j_wee','j_hack']},
 'dna-hologram':{title:'ADN y Holograma',actors:['j_dna','j_hologram']},
 'erosion-addition':{title:'Adiciones frente a Erosión',actors:['j_erosion','j_dna','j_marble']},
 'marble-stone-hologram':{title:'Mármol y desarrollo del mazo',actors:['j_marble','j_stone','j_hologram']},
 'glass-retriggers':{title:'Cristal con repeticiones',actors:['j_hanging_chad','j_hack','j_sock_and_buskin','j_dusk','j_selzer','j_pareidolia']},
 'hack-walkie':{title:'Hack y Walkie Talkie',actors:['j_hack','j_walkie_talkie']},
 'tarot-development':{title:'Desarrollo con Tarot',actors:['j_fortune_teller','j_cartomancer','j_vagabond','j_superposition','j_hallucination','j_8_ball','j_perkeo']},
 'planet-development':{title:'Desarrollo con planetas',actors:['j_constellation','j_astronomer','j_perkeo','j_mime']},
 'bloodstone-hearts':{title:'Corazones y repeticiones',actors:['j_bloodstone','j_smeared','j_oops','j_hanging_chad','j_hack','j_sock_and_buskin','j_dusk','j_selzer','j_pareidolia']},
 'pareidolia-bus':{title:'Pareidolia frente al Bus',actors:['j_pareidolia','j_ride_the_bus']},
 'burglar-discards':{title:'Ladrón y descartes',actors:['j_burglar','j_banner','j_mystic_summit','j_burnt','j_green_joker','j_ramen']},
 'gold-zones':{title:'Oro jugado o retenido',actors:['j_ticket','j_mime']},
 'midas-vampire':{title:'Midas y Vampiro',actors:['j_midas_mask','j_vampire','j_pareidolia']},
 'hack-fibonacci':{title:'Hack y Fibonacci',actors:['j_hack','j_fibonacci']}
};
function cardsOf(state:GameState):readonly Card[]|undefined {
 const deck=value(state.observed.deck);if(!deck)return undefined;
 if('cards' in deck)return deck.cards;
 const id=value(state.observed.deckId);
 return deck.preset==='standard52-unmodified'&&id&&deckProfile(id)&&resolveDeck(id).composition==='standard52'?standardDeck():undefined;
}
function materialOf(cards:readonly Card[]|undefined):CompositionMaterial {
 if(!cards)return nullMaterial();
 const usable=cards.filter(c=>!c.debuff),rank=(c:Card,r:string)=>c.enhancement!=='stone'&&c.rank===r;
 return {total:cards.length,usable:usable.length,kings:usable.filter(c=>rank(c,'K')).length,
  queens:usable.filter(c=>rank(c,'Q')).length,faces:usable.filter(c=>c.enhancement!=='stone'&&['J','Q','K'].includes(c.rank)).length,
  twos:usable.filter(c=>rank(c,'2')).length,steel:cards.filter(c=>c.enhancement==='steel').length,
  gold:cards.filter(c=>c.enhancement==='gold').length,blueSeals:cards.filter(c=>c.seal==='blue').length,
  stone:cards.filter(c=>c.enhancement==='stone').length};
}
function collectSynergies(state:GameState,actors:readonly string[]):CompositionFinding[] {
 const collected=new Map<string,CompositionFinding>();
 const order={unknown:0,fact:1,potential:2,conflict:3};
 for(const actor of actors)for(const signal of inspectCompositions(state,actor)){
  const family=families[signal.id.replace('composition-','')];
  const kind:CompositionFinding['kind']=signal.kind==='heuristic'?'unknown':signal.kind;
  const familyActors=family?.actors??[actor];
  const relevant=signal.id==='composition-burglar-discards'&&kind==='conflict'?['j_burglar','j_banner','j_burnt']:familyActors;
  const entry=finding(signal.id,family?.title??'Condición de composición',signal.text,kind,
   actors.filter(id=>relevant.includes(id)));
  const previous=collected.get(entry.id);
  if(!previous||order[entry.kind]>order[previous.kind])collected.set(entry.id,entry);
 }
 return [...collected.values()];
}
function stageOf(ante:number|undefined):string {
 return ante!==undefined&&Number.isInteger(ante)&&ante>=1&&ante<=8?ante<=2?'Inicio':ante<=5?'Desarrollo':'Cierre':'Etapa sin registrar';
}
function headingOf(actors:readonly string[],fits:readonly QuickFit[]):string {
 const has=(id:string)=>actors.includes(id);
 if(has('j_baron')||has('j_mime')||has('j_shoot_the_moon'))return 'Retención';
 if(has('j_photograph')||has('j_sock_and_buskin')||has('j_triboulet'))return 'Figuras';
 if(has('j_wee')||has('j_hack')||has('j_fibonacci'))return 'Rangos bajos';
 if(has('j_hologram')&&(has('j_dna')||has('j_marble')||has('j_certificate')))return 'Generación de cartas';
 if(fits.filter(f=>f.roles.includes('growth')).length>fits.length/2)return 'Crecimiento';
 if(fits.filter(f=>f.roles.includes('economy')).length>fits.length/2)return 'Economía';
 return 'Composición mixta';
}
function fitName(fit:QuickFit):string {
 return ALL_JOKER_FACTS[fit.id]?.name??Object.values(ALL_JOKER_FACTS).find(j=>j.artId===fit.id)?.name??fit.id;
}
function fitKind(signal:FitSignal):CompositionFinding['kind'] {return signal.kind==='heuristic'?'unknown':signal.kind;}

interface Bounds {lower:number;upper:number|null;known:boolean}
const exact=(n:number):Bounds=>({lower:n,upper:n,known:true});
const unknown=(lower=0,upper:number|null=null):Bounds=>({lower,upper,known:false});
const sumBounds=(parts:readonly Bounds[]):Bounds=>({lower:parts.reduce((n,p)=>n+p.lower,0),upper:parts.some(p=>p.upper===null)?null:parts.reduce((n,p)=>n+p.upper!,0),known:parts.every(p=>p.known)});
const scaleBounds=(b:Bounds,m:number):Bounds=>({lower:b.lower*m,upper:b.upper===null?null:b.upper*m,known:b.known});
const maximum=(parts:readonly Bounds[]):Bounds=>parts.length?{lower:Math.max(...parts.map(p=>p.lower)),upper:parts.some(p=>p.upper===null)?null:Math.max(...parts.map(p=>p.upper!)),known:parts.every(p=>p.known)}:exact(0);
const fitBounds=(fit:QuickFit):Bounds=>fit.readiness==='unavailable'?exact(0):fit.score!==null?exact(fit.score):unknown(fit.range?.[0]??0,fit.range?.[1]??null);
const readinessBounds=(fit:QuickFit):Bounds=>{
 const n=fit.axes.find(a=>a.key==='readiness')?.value;
 return n===undefined||n===null?unknown(0,3):fit.readiness==='unavailable'?exact(0):exact(n);
};
function section(id:CompositionSectionId,label:string,bounds:Bounds|null,reasons:string[],ruleIds:string[]):CompositionSection {
 return {id,label,value:bounds?.known?compositionRound(bounds.lower):null,
  range:bounds?[compositionRound(bounds.lower),bounds.upper===null?null:compositionRound(bounds.upper)]:null,
  status:bounds===null?'not-applicable':bounds.known?'known':'partial',reasons,ruleIds};
}
const materialConditions=new Set(['suit_spades','suit_hearts','suit_clubs','suit_diamonds','faces','even','odd','ace','fibonacci','steel','gold','stone','enhanced','no_faces','pair','three_kind','two_pair','four_kind','straight','flush','held']);
const materialSpecials=new Set(['j_mime','j_baron','j_photograph','j_walkie_talkie','j_hack','j_triboulet','j_drivers_license','j_stone','j_steel_joker','j_shoot_the_moon']);

/** Each section uses index units. No dollar/Chip/Mult values are added together. */
function evaluateSections(state:GameState,fits:readonly QuickFit[],synergies:readonly CompositionFinding[],ante:number|undefined):CompositionSection[] {
 const p=COMPOSITION_POLICY,owned=value(state.observed.jokers),unidentified=fits.some(f=>!FIT_PROFILES[art(f.id)]),inventoryKnown=owned!==undefined&&!unidentified;
 const scoreFits=fits.filter(f=>f.roles.some(r=>(p.scoring.roles as readonly string[]).includes(r))&&f.readiness!=='unavailable');
 const supportedRoles=new Set(scoreFits.filter(f=>f.readiness==='ready'||f.readiness==='potential').flatMap(f=>f.roles.filter(r=>(p.scoring.roles as readonly string[]).includes(r))));
 const uncertainRoles=new Set(scoreFits.filter(f=>f.readiness==='unknown').flatMap(f=>f.roles.filter(r=>(p.scoring.roles as readonly string[]).includes(r))));
 const coverage=inventoryKnown?uncertainRoles.size?unknown(Math.max(0,supportedRoles.size-1)*p.scoring.additionalRole,Math.max(0,new Set([...supportedRoles,...uncertainRoles]).size-1)*p.scoring.additionalRole):exact(Math.max(0,supportedRoles.size-1)*p.scoring.additionalRole):unknown(0,30);
 const scoring=inventoryKnown?sumBounds([maximum(scoreFits.map(fitBounds)),coverage]):unknown();
 const score=section('scoring','Puntuación',scoring,['Encaje más alto de los efectos de puntuación presentes; otros tipos respaldados añaden cobertura editorial, sin exigirlos a toda construcción.','No son fichas de una mano ni un diagnóstico de superar la ciega.'],['C-SCORE-MAX','C-SCORE-COVERAGE']);
 const money=value(state.observed.money),reserve=money===undefined?unknown(0,p.economy.reserveUnits):exact(p.economy.reserveUnits*Math.min(1,Math.max(0,money)/p.economy.reserveReference));
 const economyEffects=inventoryKnown?maximum(fits.filter(f=>f.roles.includes('economy')&&f.readiness!=='unavailable').map(fitBounds)):unknown();
 const economy=section('economy','Economía',sumBounds([reserve,scaleBounds(economyEffects,p.economy.effectWeight)]),[
  money===undefined?'Saldo actual desconocido.':`Saldo registrado: $${money}; $${p.economy.reserveReference} es una referencia editorial de reserva, no un interés calculado.`,
  'Combina preparación de reserva y encaje del efecto económico mejor respaldado; no suma ingresos hipotéticos ni valor de venta como efectivo.'],['C-ECON-RESERVE','C-ECON-EFFECT']);
 const synergyActors=new Set(synergies.filter(s=>s.kind==='potential'||s.kind==='fact').flatMap(s=>s.relatedJokers));
 const unknownActors=new Set(synergies.filter(s=>s.kind==='unknown').flatMap(s=>s.relatedJokers));
 const conflicts=new Set(synergies.filter(s=>s.kind==='conflict').flatMap(s=>s.relatedJokers));
 const n=owned?.length??0;
 let synergy:Bounds;
 if(!inventoryKnown)synergy=unknown(0,100);
 else if(!n)synergy=exact(0);
 else {
  const eligible=fits.filter(f=>synergyActors.has(art(f.id))),possible=fits.filter(f=>unknownActors.has(art(f.id))&&!synergyActors.has(art(f.id)));
  const contribution=sumBounds([...eligible.map(readinessBounds),...possible.map(f=>{
   const readiness=readinessBounds(f);
   // A documentary distinction (for example Gold seal != Gold enhancement)
   // must not reopen a condition already known to be unavailable.
   return readiness.known&&readiness.upper===0?exact(0):unknown(0,readiness.upper);
  })]);
  const conflictCount=(owned??[]).filter(j=>conflicts.has(art(j.catalogId))).length,penalty=p.synergy.conflictUnits*conflictCount/n;
  const support=scaleBounds(contribution,p.synergy.supportUnits/(n*p.synergy.preparationReference));
  synergy={lower:Math.max(0,support.lower-penalty),upper:support.upper===null?null:Math.max(0,support.upper-penalty),known:support.known};
 }
 const synergySection=section('synergy','Sinergia',synergy,['Familias presentes y material compatible, deduplicados por comodín físico. Contar varios nombres del mismo combo no apila beneficios.','Las condiciones de robar, puntuar, retener, ordenar o resolver el azar siguen pendientes de jugadas concretas. Un conflicto es una tensión, no una venta obligatoria.'],['C-SYN-SUPPORT','C-SYN-CONFLICT']);
 const materialFits=fits.filter(f=>{const profile=FIT_PROFILES[art(f.id)];return profile&&(materialConditions.has(profile.condition)||materialSpecials.has(profile.id));});
 const deckBounds=!inventoryKnown?unknown(0,100):materialFits.length?scaleBounds(sumBounds(materialFits.map(readinessBounds)),p.deck.supportUnits/(materialFits.length*p.deck.preparationReference)):null;
 const deckSection=section('deck','Mazo',deckBounds,[materialFits.length?`${materialFits.length} efectos presentes requieren material del mazo; se mide su preparación conocida.`:'Sin requisito de material valorado por esta política: apartado no aplicable.',
  'No estima frecuencias de robo, consistencia ni probabilidad de formar una mano.'],['C-DECK-PREPARATION']);
 const growthFits=fits.filter(f=>FIT_PROFILES[art(f.id)]?.growth&&f.readiness!=='unavailable');
 const allGrowth=fits.some(f=>FIT_PROFILES[art(f.id)]?.growth);
 let growthBounds:Bounds|null=!inventoryKnown?unknown():!allGrowth?null:maximum(growthFits.map(fitBounds));
 const handDevelopers=growthFits.some(f=>(p.growth.handDevelopers as readonly string[]).includes(art(f.id)));
 if(growthBounds&&handDevelopers){
  const hands=value(state.observed.resources.handsPerRound),validAnte=ante!==undefined&&Number.isInteger(ante)&&ante>=1&&ante<=p.growth.lastAnte;
  const bonus=hands===undefined?unknown(0,null):!validAnte?unknown(0,p.growth.extraHandUnits*Math.max(0,hands-p.growth.handsReference)/p.growth.handsReference):exact(p.growth.extraHandUnits*Math.max(0,hands-p.growth.handsReference)/p.growth.handsReference*(p.growth.lastAnte-ante)/p.growth.anteSpan);
  growthBounds=sumBounds([growthBounds,bonus]);
 }
 const growth=section('growth','Crecimiento',growthBounds,[allGrowth?'Conserva el encaje y contador vigente del mecanismo de desarrollo mejor respaldado.':'No hay un mecanismo de crecimiento registrado: apartado no aplicable.',
  'Manos adicionales dan oportunidades editoriales a los desarrolladores compatibles; no se acreditan activaciones futuras ni se garantiza aprovecharlas.'],['C-GROWTH-CURRENT','C-GROWTH-HORIZON']);
 const resources=state.observed.resources,resourceInputs=[['handsPerRound','hands'],['discardsPerRound','discards'],['handSize','handSize'],['jokerSlots','jokerSlots']] as const;
 const resourceBounds=sumBounds(resourceInputs.map(([field,ref])=>{
  const current=value(resources[field]),spec=p.resources[ref];return current===undefined?unknown():exact(100*spec.weight*current/spec.reference);
 }));
 const resourceSection=section('resources','Recursos',resourceBounds,['Recursos actuales transcritos: manos, descartes, tamaño de mano y huecos. Los vales ya reflejados en estos campos no se suman otra vez.',
  'Las referencias 4/3/8/5 y pesos 40/20/25/15 son editoriales; un recurso extra no demuestra que podrá utilizarse.'],['C-RESOURCE-CURRENT']);
 return [score,economy,synergySection,deckSection,growth,resourceSection];
}
function globalIndex(sections:readonly CompositionSection[]):CompositionReport['global'] {
 const applicable=sections.filter(s=>s.status!=='not-applicable'),weights={scoring:0,economy:0,synergy:0,deck:0,growth:0,resources:0};
 if(!applicable.length)return {value:null,range:null,status:'not-applicable',weights,reasons:['No hay apartados aplicables.']};
 for(const item of applicable)weights[item.id]=1/applicable.length;
 const bounds=scaleBounds(sumBounds(applicable.map(s=>s.value!==null?exact(s.value):unknown(s.range?.[0]??0,s.range?.[1]??null))),1/applicable.length);
 return {value:bounds.known?compositionRound(bounds.lower):null,range:[compositionRound(bounds.lower),bounds.upper===null?null:compositionRound(bounds.upper)],status:bounds.known?'known':'partial',weights,
  reasons:['Media editorial con igual peso de los apartados aplicables. Los datos desconocidos conservan un intervalo; nunca se omiten ni se convierten en cero.',
   'Quitar o añadir un apartado aplicable cambia el denominador. El índice no sirve por sí solo como recomendación de vender o comprar.',
   'Índice abierto de preparación de la composición, no puntos de una mano ni probabilidad de ganar. Su eficacia estratégica aún no está calibrada contra partidas.']};
}
function preserveVoucherLimits(state:GameState,sections:CompositionSection[]):void {
 const ids=value(state.observed.outOfScope)?.vouchers??[],notes:Partial<Record<CompositionSectionId,string[]>>={};
 const add=(id:CompositionSectionId,text:string)=>(notes[id]??=[]).push(text);
 for(const id of ids){
  if(supportsVoucher(id))continue;
  const name=VOUCHER_CATALOG.find(v=>v.id===id)?.name??id;
  if(['v_observatory'].includes(id)){
   const consumables=value(value(state.observed.jokerContext)?.consumables),planets=consumables?.filter(c=>c.kind==='planet');
   if(planets===undefined||planets.length){
    const scoring=sections.find(s=>s.id==='scoring')!;
    scoring.status='partial';scoring.range=[scoring.value??scoring.range?.[0]??0,null];scoring.value=null;
    scoring.ruleIds.push('C-VOUCHER-OBSERVATORY-PENDING');
    add('scoring',`${name}: falta integrar el efecto de planetas conservados y su mano correspondiente. Se mantiene el soporte calculado como límite inferior, sin inventar la mejora.`);
   }else add('scoring',`${name}: no hay planetas registrados en consumibles; no se atribuye su efecto futuro.`);
  }else if(['v_clearance_sale','v_liquidation','v_overstock_norm','v_overstock_plus','v_reroll_surplus','v_reroll_glut'].includes(id))add('economy',`${name}: oportunidad de tienda documentada, sin modificar el saldo conocido ni atribuir compras o ahorros futuros.`);
  else if(['v_tarot_merchant','v_tarot_tycoon','v_planet_merchant','v_planet_tycoon','v_telescope','v_crystal_ball','v_omen_globe'].includes(id))add('growth',`${name}: conseguir consumibles no equivale a utilizarlos. Su oportunidad no añade crecimiento ni supera los datos desconocidos.`);
  else if(['v_hieroglyph','v_petroglyph'].includes(id))add('resources',`${name}: se usan el ante y los recursos actuales registrados. No se reconstruye ni repite el cambio de la adquisición.`);
  else if(['v_magic_trick','v_illusion'].includes(id))add('deck',`${name}: la oportunidad de comprar cartas no añade una carta al mazo ni cambia su preparación actual.`);
  else if(['v_hone','v_glow_up','v_directors_cut','v_retcon'].includes(id))add('scoring',`${name}: no se genera una edición ni un jefe favorable. Su oportunidad documental no añade preparación actual.`);
 }
 for(const s of sections)s.reasons.push(...(notes[s.id]??[]));
}

/** Structural voucher opportunities, never purchases, resource mutation or projected income. */
function voucherFindings(state:GameState,actors:readonly string[],fits:readonly QuickFit[]):CompositionFinding[] {
 const ids=value(state.observed.outOfScope)?.vouchers;
 if(!ids)return [finding('vouchers-unknown','Vales sin registrar','No se conoce qué vales están adquiridos. No se supone un inventario vacío.','unknown')];
 const has=(id:string)=>actors.includes(id),owned=new Set(ids),context=value(state.observed.jokerContext),result:CompositionFinding[]=[];
 const registered=(resource: keyof GameState['observed']['resources'],label:string)=>{
  const n=value(state.observed.resources[resource]);return n===undefined?`${label} actual sin registrar.`:`${label} actual: ${n}. Este valor se usa una vez; el informe no vuelve a sumar el vale.`;
 };
 const growth=fits.filter(f=>f.roles.includes('growth')).map(f=>art(f.id));
 for(const id of owned){
  const voucher=VOUCHER_CATALOG.find(v=>v.id===id);
  if(!voucher){result.push(finding(`voucher-${id}`,'Vale no identificado',`ID ${id}: no está en el catálogo compatible. No se atribuye ningún beneficio.`, 'unknown',[],[id]));continue;}
  const missing=voucher.requires.filter(required=>!owned.has(required));
  if(missing.length){result.push(finding(`voucher-${id}-requirement`,voucher.name,'La transcripción no incluye su vale base: '+missing.join(', ')+'. Revisa las adquisiciones; no se incorpora un efecto nuevo.','unknown',[],[id,...missing]));}
  const add=(suffix:string,title:string,detail:string,kind:CompositionFinding['kind'],related:string[]=[])=>result.push(finding(`voucher-${id}${suffix?'-'+suffix:''}`,title,detail,kind,related,[id]));
  add('catalog',voucher.name,voucher.description+(supportsVoucher(id)?' Efecto persistente integrado, respaldado por inspección estática L06; no es una observación nueva de partida.':' Efecto documentado; todavía no está integrado en H2 y no se utiliza para inventar cantidades o activaciones.'),'fact');
  if(['v_paint_brush','v_palette'].includes(id)){
   add('resource','Tamaño de mano',registered('handSize','Tamaño de mano'),'fact');
   const held=actors.filter(a=>['j_mime','j_baron','j_shoot_the_moon','j_blackboard','j_reserved_parking'].includes(a));
   if(held.length)add('held','Más espacio para retener','Un tamaño de mano mayor puede facilitar reservar cartas y elegir qué jugar. Falta robar el material y conservarlo en la mano concreta; no activa Barón, Mimo ni Acero por sí solo.','potential',held);
  }
  if(['v_grabber','v_nacho_tong'].includes(id)){
   add('resource','Manos disponibles',registered('handsPerRound','Manos por ronda'),'fact');
   if(growth.length)add('growth','Oportunidades de desarrollo','Más manos disponibles pueden permitir más activaciones compatibles. El contador real solo cambia cuando esas acciones se realizan; no se supone que se usarán todas las manos.','potential',growth);
   const temporary=actors.filter(a=>['j_ice_cream','j_selzer'].includes(a));
   if(temporary.length)add('duration','Consumo de efectos temporales','Jugar más manos consume duración o aporte de estos efectos temporales. Disponer de una mano adicional no obliga a jugarla ni reduce sus contadores aquí.','potential',temporary);
  }
  if(['v_wasteful','v_recyclomancy'].includes(id)){
   add('resource','Descartes disponibles',registered('discardsPerRound','Descartes por ronda'),'fact');
   const discard=actors.filter(a=>['j_banner','j_burnt','j_castle','j_trading','j_mail','j_hit_the_road','j_drunkard'].includes(a));
   if(discard.length)add('discard','Soporte de descartes',has('j_burglar')?'Ladrón elimina los descartes al seleccionar la ciega; estos recursos adicionales no acreditan un uso posterior en esa ronda.':'Los descartes adicionales ofrecen selección o activaciones compatibles. Estandarte depende de conservarlos; los efectos de descarte necesitan cartas, objetivos y uso real.',has('j_burglar')?'conflict':'potential',discard.concat(has('j_burglar')?['j_burglar']:[]));
   const losses=actors.filter(a=>['j_green_joker','j_ramen','j_delayed_grat'].includes(a));
   if(losses.length)add('discard-cost','Usar descartes tiene un coste','Tener el recurso adicional no perjudica por sí solo. Usarlo puede reducir Green o Ramen, o impedir el cobro de Delayed Gratification; hay que valorar la jugada concreta.','potential',losses);
  }
  if(id==='v_antimatter')add('resource','Capacidad de comodines',registered('jokerSlots','Espacios de comodín')+' Un hueco libre no equivale a un comodín encontrado ni a un beneficio de puntuación.','fact');
  if(['v_seed_money','v_money_tree'].includes(id))add('savings','Capacidad de ahorro',value(state.observed.deckId)==='green'?'Baraja verde no cobra intereses; aumentar el tope no crea interés en esa baraja.':'Un tope mayor permite aprovechar saldo de cierre suficiente, sujeto a las reglas de economía y su evidencia. No se supone ganar la ronda ni conservar el saldo actual; no se proyecta un cobro.','potential',actors.filter(a=>['j_bull','j_bootstraps','j_to_the_moon'].includes(a)));
  if(id==='v_blank')add('blank','Sin beneficio actual','En blanco no añade un recurso ni una sinergia actual. No recibe una mejora de composición por ser requisito de Antimateria.','fact');
  if(['v_tarot_merchant','v_tarot_tycoon'].includes(id)){
   const related=actors.filter(a=>['j_fortune_teller','j_perkeo'].includes(a));
   if(related.length)add('tarot','Acceso futuro a Tarot','El catálogo describe más presencia de Tarot en tienda, sin asegurar una oferta concreta. Fortune Teller requiere usarlos; Perkeo necesita poseer un Tarot elegible que copiar. No se añaden usos, copias ni probabilidades.','potential',related);
  }
  if(['v_planet_merchant','v_planet_tycoon','v_telescope'].includes(id)){
   const related=actors.filter(a=>['j_constellation','j_astronomer','j_perkeo','j_satellite'].includes(a));
   if(related.length)add('planet','Acceso futuro a planetas',id==='v_telescope'?'Telescopio está condicionado al sobre celestial y a la mano más jugada, que debe conocerse. Obtener un planeta no equivale a utilizarlo ni a aumentar Constellation.':'La presencia futura de planetas no acredita una compra ni un uso. Constellation exige usarlos; Satellite distingue identidades, y Perkeo necesita uno poseído. No se añaden niveles ni crecimiento.','potential',related);
  }
  if(id==='v_observatory'){
   const consumables=value(context?.consumables),planets=consumables?.filter(c=>c.kind==='planet')??[];
   add('held-planet','Planetas conservados',consumables===undefined?'Falta el inventario de consumibles y la mano que se puntúa para comprobar planetas retenidos.':`${planets.length} planetas registrados; su mano específica debe coincidir con la jugada para aprovechar Observatorio. No se calcula ese multiplicador fuera de H2.`,consumables===undefined?'unknown':'potential',actors.filter(a=>['j_perkeo','j_constellation','j_satellite'].includes(a)));
   if(has('j_constellation'))add('use-or-hold','Usar o conservar planetas','Usar un planeta para desarrollar Constellation consume ese planeta; conservarlo para Observatorio exige mantenerlo en consumibles. No se cuentan ambas ventajas futuras sobre el mismo consumible utilizado.','potential',['j_constellation']);
  }
  if(['v_magic_trick','v_illusion'].includes(id)){
   if(has('j_hologram'))add('addition','Adiciones para Holograma','Poder encontrar cartas de juego permite oportunidades de añadirlas, si se ofrecen y se compran. No se modifica el mazo ni el contador de Holograma por poseer el vale.','potential',['j_hologram']);
   if(has('j_erosion'))add('erosion','Compra de cartas frente a Erosión','Comprar y añadir cartas puede reducir el soporte de Erosión. Poseer el vale no añade ninguna carta ni reduce su aporte actual.','potential',['j_erosion']);
  }
  if(['v_reroll_surplus','v_reroll_glut'].includes(id)&&has('j_flash'))add('reroll','Renovaciones y Flash','Renovaciones más baratas pueden reducir el coste de futuras activaciones de Flash; faltan precio real, renovaciones y gasto confirmado. El vale no registra crecimiento por sí solo.','potential',['j_flash']);
  if(['v_crystal_ball','v_omen_globe'].includes(id))add('consumables','Capacidad y consumibles',id==='v_crystal_ball'?'La capacidad registrada de consumibles debe transcribirse explícitamente; no se suma aquí. Más espacio no crea Tarot o planeta.':'La aparición posible de Espectrales en paquetes arcanos no determina qué sobre ni qué consumible aparecerá. No se genera un efecto aleatorio.','potential',actors.filter(a=>['j_mime','j_perkeo','j_cartomancer','j_vagabond'].includes(a)));
  if(['v_hieroglyph','v_petroglyph'].includes(id))add('resources','Ante y recursos actuales','Transcribe el ante y los recursos después de la adquisición. El informe no vuelve a restar ante, manos o descartes ni supone nuevas rondas futuras. Los campos registrados actuales prevalecen.','unknown');
  if(['v_directors_cut','v_retcon'].includes(id))add('boss','Cambio de jefe','Poder renovar el jefe ofrece una opción que necesita saldo, jefe observado y confirmación del cambio. No se supone que el próximo jefe favorezca esta composición.','potential');
 }
 return result;
}

/** Actual inventory only: no candidates, shop mutations, round plans or generated cards. */
export function evaluateComposition(input:GameState,options:{ante?:number}={}):CompositionReport {
 const checked=validateState(input);
 const base:CompositionReport={policy:'composition-1',status:'needs-data',heading:'Tu composición',summary:'',stage:'Etapa sin registrar',material:nullMaterial(),roles:roleIds.map(role=>({role,status:'unknown',count:0})),fits:[],strengths:[],weaknesses:[],priorities:[],synergies:[],vouchers:[],limitations:[],errors:[],sections:[],global:{value:null,range:null,status:'partial',weights:{scoring:0,economy:0,synergy:0,deck:0,growth:0,resources:0},reasons:['Datos inválidos o todavía sin evaluar.']}};
 if(!checked.ok)return {...base,summary:'Revisa los datos de la partida.',errors:checked.errors};
 const state=checked.value,ante=options.ante??value(state.observed.nextBlind)?.ante,owned=value(state.observed.jokers),actors=[...new Set((owned??[]).map(j=>art(j.catalogId)))];
 const fits=evaluateOwnedFits(state,ante===undefined?{}:{ante}),cards=cardsOf(state),material=materialOf(cards);
 const report:CompositionReport={...base,stage:stageOf(ante),material,fits,
  heading:owned?.length?headingOf(actors,fits):owned?'Sin comodines registrados':'Inventario sin registrar',
  synergies:owned?collectSynergies(state,actors):[],vouchers:voucherFindings(state,actors,fits)};
 report.roles=roleIds.map(role=>{
  if(!owned)return {role,status:'unknown',count:0};
  const matching=fits.filter(f=>f.roles.includes(role));
  return {role,count:matching.length,status:matching.some(f=>f.readiness==='ready')?'available':matching.some(f=>f.readiness==='potential')?'conditional':matching.some(f=>f.readiness==='unknown')?'unknown':'missing'};
 });
 if(!owned)report.priorities.push(finding('inventory-unknown','Registra tus comodines','Sin inventario conocido no se comprueban roles ni relaciones entre comodines.','unknown'));
 if(!cards)report.priorities.push(finding('deck-unknown','Completa el mazo actual','La composición inicial por nombre no sustituye las cartas actuales. No se conoce si hay material para efectos que dependen de cartas.','unknown'));
 if(report.stage==='Etapa sin registrar')report.priorities.push(finding('stage-unknown','Indica el ante','La etapa de inversión no está disponible; se mantienen las condiciones conocidas.','unknown'));
 if(actors.includes('j_pareidolia'))report.strengths.push(finding('pareidolia-faces','Figuras habilitadas','El recuento de figuras mostrado es físico. Pareidolia puede habilitar la condición de figura para otras cartas no debilitadas, pero no cambia sus rangos a rey o reina.','fact',['j_pareidolia']));
 for(const fit of fits){
  const actor=art(fit.id),preparation=fit.signals.find(s=>s.id==='preparation'),name=fitName(fit),id=fit.instanceId??actor;
  if(fit.readiness==='ready')report.strengths.push(finding(`support-${id}`,name,preparation?.text??'Condición de preparación disponible. No demuestra una puntuación ni superar la ciega.','fact',[actor]));
  else if(fit.readiness==='unavailable'){
   const item=finding(`unavailable-${id}`,name,preparation?.text??'La condición conocida no está disponible.','conflict',[actor]);report.weaknesses.push(item);report.priorities.push(item);
  }else if(fit.readiness==='unknown'){
   const item=finding(`unknown-${id}`,name,preparation?.text??fit.limitations[0]??'Faltan datos para comprobar el efecto.','unknown',[actor]);report.weaknesses.push(item);report.priorities.push(item);
  }
  const profile=FIT_PROFILES[actor];
  if(profile?.growth)report.strengths.push(finding(`growth-${id}`,`Desarrollo de ${name}`,profile.growth+' No se añade crecimiento futuro ni se supone que un contador mayor será útil en todas las manos.','potential',[actor]));
  for(const signal of fit.signals.filter(s=>s.kind==='conflict'&&s.id!=='preparation'&&!s.id.startsWith('composition-'))){
   const item=finding(`fit-${id}-${signal.id}`,name,signal.text,fitKind(signal),[actor]);report.weaknesses.push(item);
  }
 }
 for(const synergy of report.synergies)if(synergy.kind==='conflict'){report.weaknesses.push(synergy);report.priorities.push(synergy);}
 for(const note of report.vouchers)if(note.kind==='unknown'||note.kind==='conflict')report.weaknesses.push(note);
 if(value(state.observed.deckId)==='plasma')report.limitations.push('Plasma requiere el balance real de fichas y Mult; no se exige un comodín de cada rol ni se infiere puntuación por contar roles.');
 const unsupported=value(state.observed.outOfScope)?.vouchers.filter(id=>!supportsVoucher(id))??[];
 if(unsupported.length)report.limitations.push('Vales con cobertura documental: '+unsupported.join(', ')+'. Sus anotaciones no amplían los cálculos H2 ni bloquean relaciones independientes.');
 report.limitations.push('Lectura estructural del estado registrado: no ejecuta jugadas, no predice robos ni comprueba superar la ciega.',
  'Los efectos del catálogo están respaldados por inspección estática de 1.0.1o-FULL; no se aportan observaciones nuevas de una partida.',
  'No se exige un comodín por rol: cartas, mejoras y niveles también aportan puntuación. Esta lectura no demuestra consistencia del mazo.');
 report.limitations.push(...new Set(fits.flatMap(f=>f.limitations)));
 report.sections=evaluateSections(state,fits,report.synergies,ante);
 preserveVoucherLimits(state,report.sections);
 report.global=globalIndex(report.sections);
 if(!owned)report.status='needs-data';
 else if(!owned.length)report.status='empty';
 else if(report.weaknesses.some(f=>f.kind==='conflict'))report.status='conflict';
 else if(fits.some(f=>f.readiness==='unknown')||!cards)report.status='needs-data';
 else if(fits.some(f=>f.readiness==='potential')||report.synergies.some(f=>f.kind==='potential'))report.status='conditional';
 else report.status='supported';
 report.summary=report.status==='empty'?'Sin efectos de comodines que evaluar.':report.status==='conflict'?'Hay condiciones incompatibles o material que falta.':report.status==='needs-data'?'Lectura parcial: faltan datos relevantes.':report.status==='conditional'?'Hay soporte; faltan activaciones concretas.':'Hay efectos preparados; no acredita superar la ciega.';
 return report;
}
