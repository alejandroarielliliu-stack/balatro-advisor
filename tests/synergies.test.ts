import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {relatedSynergies} from '../src/catalog/synergies.js';
import type {SynergyLibrary} from '../src/catalog/synergies.js';
const data=JSON.parse(readFileSync('web/assets/jokers/synergies.json','utf8')) as SynergyLibrary;
const catalogue=JSON.parse(readFileSync('web/assets/jokers/catalog.json','utf8'));
test('Sinergias: referencias, requisitos, evidencia y contraejemplos completos',()=>{
 assert.equal(data.gameVersion,'1.0.1o-FULL');assert.equal(data.synergies.length,32);
 assert.equal(new Set(data.synergies.map(s=>s.id)).size,32);
 const ids=new Set(catalogue.jokers.map((j:{id:string})=>j.id));
 for(const s of data.synergies){assert.ok(s.title&&s.mechanism&&s.example.setup&&s.example.expected);assert.ok(s.conditions.length&&s.risks.length&&s.sourceIds.length&&s.jokerIds.length);
  s.jokerIds.forEach(id=>assert.ok(ids.has(id),id));s.sourceIds.forEach(id=>assert.ok(data.sources[id],id));
  assert.equal(s.engineSupport,'reference-only');assert.equal(s.observedInGame,false);
  assert.ok(['static-supported','provisional-composition'].includes(s.evidenceStatus));
  s.deckRequirements.forEach(r=>{assert.ok(r.traits.length);assert.ok(['held','held-end-round','scoring','played','full-deck'].includes(r.zone));});
 }
 assert.equal(data.synergies.filter(s=>s.kind==='conflict').length,2);assert.equal(data.synergies.filter(s=>s.kind==='non-synergy').length,2);
});
test('Acero retenido no se confunde con el comodín Acero ni el sello dorado con Oro',()=>{
 const get=(id:string)=>data.synergies.find(s=>s.id===id)!;
 assert.equal(get('mime-steel').deckRequirements[0]!.zone,'held');
 assert.deepEqual(get('mime-steel').deckRequirements[0]!.traits,['enhancement:steel']);
 assert.deepEqual(get('mime-gold').deckRequirements[0]!.traits,['enhancement:gold']);
 assert.deepEqual(get('mime-gold-seal-false').deckRequirements[0]!.traits,['seal:gold']);
 assert.equal(get('mime-gold-seal-false').kind,'non-synergy');
 assert.equal(get('mime-steel-joker-false').kind,'non-synergy');
 assert.equal(get('steel-joker-deck').deckRequirements[0]!.zone,'full-deck');
 // Literal documentary fixtures, not engine tests or gameplay observations.
 assert.match(get('steel-king-mime').example.expected,/5\.0625/);
 assert.match(get('red-steel-mime').example.expected,/3\.375/);
 assert.match(get('photo-chad').conditions.join(' '),/primera carta puntuada/);
 assert.match(get('midas-vampire').order,/Midas antes de Vampiro/);
});
test('Consultar relaciones no cambia catálogo, cobertura ni partida',()=>{
 const before=JSON.stringify(data);assert.ok(relatedSynergies(data,'j_mime').some(s=>s.id==='mime-steel'));
 assert.equal(relatedSynergies(data,'not-a-joker').length,0);assert.equal(JSON.stringify(data),before);
});
