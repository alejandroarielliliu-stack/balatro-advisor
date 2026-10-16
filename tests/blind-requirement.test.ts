import test from 'node:test';
import assert from 'node:assert/strict';
import {blindRequirement} from '../src/catalog/blinds.js';
test('Objetivos White: oráculos literales del alcance documentado, no observaciones nuevas',()=>{
 for(const [ante,kind,boss,deck,target] of [[1,'small','none','blue',300],[1,'big','none','red',450],[2,'boss','the_psychic','yellow',1600],[2,'boss','the_water','green',1600],[2,'boss','the_wall','black',3200],[8,'boss','violet_vessel','blue',300000],[1,'big','none','plasma',900],[8,'boss','violet_vessel','plasma',600000]] as const){
  const r=blindRequirement(ante,kind,boss,deck);assert.ok(r.ok);assert.equal(r.target,target);
 }
});
test('Objetivos desconocidos o fuera de cobertura no se inventan',()=>{
 for(const [ante,kind,boss,deck] of [[0,'small','none','blue'],[9,'small','none','blue'],[1,'','none','blue'],[1,'boss','','blue'],[1,'boss','the_wall','blue'],[8,'boss','the_water','blue'],[1,'small','none','ghost'],[1,'small','the_wall','blue']] as const)assert.equal(blindRequirement(ante,kind,boss,deck).ok,false);
});
