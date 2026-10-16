import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {filterCollection} from '../src/catalog/collection.js';
import type {JokerCollection} from '../src/catalog/collection.js';
import {jokerDefinition} from '../src/catalog/initial.js';
import {ALL_JOKER_FACTS} from '../src/catalog/all-joker-facts.js';
const data=JSON.parse(readFileSync('web/assets/jokers/catalog.json','utf8')) as JokerCollection;
const js=data.jokers;
test('Colección 1.0.1o: 150 IDs únicos, propiedades completas y límites de atlas',()=>{
 assert.equal(data.gameVersion,'1.0.1o-FULL');assert.equal(js.length,150);assert.equal(new Set(js.map(j=>j.id)).size,150);
 assert.deepEqual(js.map(j=>j.order),Array.from({length:150},(_,i)=>i+1));
 assert.equal(new Set(js.map(j=>JSON.stringify(j.art.position))).size,149); // Wee shares Joker art.
 assert.deepEqual(js.find(j=>j.id==='j_wee')!.art,js.find(j=>j.id==='j_joker')!.art);
 assert.deepEqual([1,2,3,4].map(r=>js.filter(j=>j.rarity===r).length),[61,64,20,5]);assert.equal(js.filter(j=>j.initiallyUnlocked).length,105);
 for(const j of js){assert.match(j.id,/^j_[a-z0-9_]+$/);assert.ok(j.basePrice>0);for(const lang of ['es','en'] as const){assert.ok(j.names[lang]);assert.ok(j.localization[lang].description.trim());assert.doesNotMatch(j.localization[lang].description,/#\d+#|\{C:/);}
  for(const value of Object.values(j.compatibility))assert.equal(typeof value,'boolean');
  for(const p of [j.art.position,j.art.overlay].filter(p=>p!==null)){assert.ok(Number.isInteger(p.x)&&p.x>=0&&p.x<10);assert.ok(Number.isInteger(p.y)&&p.y>=0&&p.y<16);}
  assert.equal(j.observedInGame,false);
 }
 assert.equal(js.filter(j=>j.art.overlay).length,6); // Five legendary portraits + Hologram.
});
test('Colección: los mapeos publicados coinciden con el motor; metadata no acredita cobertura completa',()=>{
 const implemented=js.filter(j=>j.engineId);assert.ok(implemented.length>0);
 for(const j of implemented)assert.equal(jokerDefinition(j.engineId!)?.price,j.basePrice);
 // Registering factual metadata is distinct from publishing a supported UI effect.
 assert.equal(Object.keys(ALL_JOKER_FACTS).length,150);
 for(const j of js){const fact=Object.values(ALL_JOKER_FACTS).find(f=>f.artId===j.id);assert.ok(fact,j.id);assert.equal(fact.price,j.basePrice);}
 assert.equal(jokerDefinition('not-a-catalog-joker'),undefined);assert.equal(jokerDefinition('j_blueprint'),undefined);
});
test('Datos literales de referencia: Joker, Scholar, Hanging Chad, Yorick, Stuntman y Perkeo',()=>{
 // Fixtures transcribed from inspected 1.0.1o registry/localization, not engine outputs.
 const get=(id:string)=>js.find(j=>j.id===id)!;
 assert.equal(get('j_joker').localization.es.description,'+4 multi');
 assert.deepEqual(get('j_scholar').config,{extra:{mult:4,chips:20}});
 assert.equal(get('j_hanging_chad').config.extra,2);
 assert.deepEqual(get('j_yorick').config.extra,{xmult:1,discards:23});
 assert.equal((get('j_stuntman').config.extra as {chip_mod:number}).chip_mod,250);
 assert.equal(get('j_perkeo').basePrice,20);assert.equal(get('j_perkeo').rarity,4);
 assert.match(get('j_misprint').localization.es.description,/0–23/);
 assert.match(get('j_mail').localization.es.description,/según partida/);
});
test('Procedencia: huellas del catálogo e ilustración descargada coincidentes con instalación',()=>{
 const p=JSON.parse(readFileSync('web/assets/jokers/provenance.json','utf8'));
 const hash=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
 assert.equal(hash('web/assets/jokers/catalog.json'),p.catalogSha256);
 assert.equal(hash('web/assets/jokers/atlas.png'),p.sha256['resources/textures/2x/Jokers.png']);
 const png=readFileSync('web/assets/jokers/atlas.png');assert.equal(png.readUInt32BE(16),1420);assert.equal(png.readUInt32BE(20),3040);
});
test('Búsqueda bilingüe y filtros combinados no alteran catálogo ni soporte',()=>{
 const original=JSON.stringify(data);
 assert.equal(filterCollection(js,'comodin').length>0,true);
 assert.equal(filterCollection(js,'Perkeo')[0]?.id,'j_perkeo');
 assert.equal(filterCollection(js,'','4').length,5);
 assert.equal(filterCollection(js,'','','implemented').length,js.filter(j=>j.engineId!==null).length);
 assert.equal(filterCollection(js,'','','catalog-only').length,js.filter(j=>j.engineId===null).length);
 assert.equal(filterCollection(js,'Scholar','4').length,0);
 assert.equal(JSON.stringify(data),original);
});
