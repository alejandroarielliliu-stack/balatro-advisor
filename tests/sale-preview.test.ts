import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {previewMesaSale} from '../src/ui/sale-preview.js';
import {parseState} from '../src/state/validation.js';
import {initialCounters} from '../src/catalog/joker-counters.js';
import type {GameState,JokerInstance} from '../src/state/model.js';
import {known,success} from './helpers.js';
const fixture=()=>success(parseState(readFileSync(new URL('../../examples/shop-purchase.json',import.meta.url),'utf8')));
const joker=(id='joker',sell=1):JokerInstance=>({instanceId:'owned:'+id,catalogId:id,edition:known('base'),stickers:known([]),sellValue:known(sell),counters:initialCounters(id)});
const mutation=(s:GameState)=>({expectedRevision:s.revision,updatedAt:s.updatedAt});
const unknown={status:'unknown' as const,reason:'Sin transcribir.'};

test('Venta de Mesa sin configurar una mano/ciega, 7+1=8 y mismos desconocidos',()=>{
 const s=fixture();s.observed.jokers=known([joker()]);s.observed.nextBlind=unknown;s.observed.shop=unknown;
 s.observed.gameVersion=unknown;s.observed.gamePlatform=unknown;s.observed.stakeId=unknown;s.observed.modsPresent=unknown;
 const before=structuredClone(s),r=previewMesaSale(s,'owned:joker',mutation(s));assert.ok(r.ok);if(!r.ok)return;
 assert.equal(successFact(r.state.observed.money),8);assert.equal(successFact(r.state.observed.jokers).length,0);
 assert.equal(successFact(r.state.observed.resources.jokerSlots),5);assert.equal(r.assumptions.length,4);
 for(const key of ['gameVersion','gamePlatform','stakeId','modsPresent','nextBlind','shop'] as const)assert.deepEqual(r.state.observed[key],before.observed[key]);
 assert.deepEqual(s,before);assert.equal(r.state.revision,s.revision+1);
});
function successFact<T>(f:{status:'unknown';reason:string}|{status:'known';value:T}):T{assert.equal(f.status,'known');return f.value;}

test('Un contexto conocido incompatible no se sustituye por el modelo de Mesa',()=>{
 for(const field of ['gameVersion','gamePlatform','stakeId','modsPresent'] as const){const s=fixture();s.observed.jokers=known([joker()]);
  if(field==='modsPresent')s.observed.modsPresent=known(true);else s.observed[field]=known('unsupported');
  const before=structuredClone(s),r=previewMesaSale(s,'owned:joker',mutation(s));assert.equal(r.ok,false);if(!r.ok)assert.ok(r.errors.some(e=>['unsupported_context','unsupported_modifier'].includes(e.code)));assert.deepEqual(s,before);
 }
});
test('Dinero, precio desconocido o distinto, Eternal e ID ausente no producen una venta',()=>{
 const cases=[(s:GameState)=>{s.observed.money=unknown;},(s:GameState)=>{if(s.observed.jokers.status==='known')s.observed.jokers.value[0]!.sellValue=unknown;},(s:GameState)=>{if(s.observed.jokers.status==='known')s.observed.jokers.value[0]!.sellValue=known(9);},(s:GameState)=>{if(s.observed.jokers.status==='known')s.observed.jokers.value[0]!.stickers=known(['eternal']);}];
 for(const change of cases){const s=fixture();s.observed.jokers=known([joker()]);change(s);const before=structuredClone(s);assert.equal(previewMesaSale(s,'owned:joker',mutation(s)).ok,false);assert.deepEqual(s,before);}
 const s=fixture();s.observed.jokers=known([joker()]);assert.equal(previewMesaSale(s,'missing',mutation(s)).ok,false);
});
test('Vender negativa pierde el hueco adicional: saldo7+3=10 y capacidad6→5',()=>{
 const s=fixture(),j=joker('joker',3);j.edition=known('negative');s.observed.jokers=known([j]);s.observed.resources.jokerSlots=known(6);
 const r=previewMesaSale(s,j.instanceId,mutation(s));assert.ok(r.ok);if(!r.ok)return;
 assert.equal(successFact(r.state.observed.money),10);assert.equal(successFact(r.state.observed.resources.jokerSlots),5);assert.equal(successFact(s.observed.resources.jokerSlots),6);
});
test('Se aplican contadores de los restantes y no solo se quita una fila: Campfire100→125',()=>{
 const s=fixture();s.observed.jokers=known([joker(),joker('campfire',4)]);
 const before=structuredClone(s),r=previewMesaSale(s,'owned:joker',mutation(s));assert.ok(r.ok);if(!r.ok)return;
 // Executable-derived catalogue description and CAT04 documentary oracle:
 // X1 + X0.25 per sold card => X1.25, represented as125 hundredths.
 const remaining=successFact(r.state.observed.jokers);assert.equal(remaining.length,1);assert.equal(remaining[0]!.catalogId,'campfire');assert.equal(successFact(remaining[0]!.counters.x100!),125);assert.deepEqual(s,before);
});
test('Vales o resultados de venta fuera de cobertura no se evitan para quitar el comodín',()=>{
 const s=fixture();s.observed.jokers=known([joker()]);s.observed.outOfScope=known({vouchers:['v_tarot_merchant'],consumables:[],pendingTags:[],otherModifiers:[]});assert.equal(previewMesaSale(s,'owned:joker',mutation(s)).ok,false);
 const invisible=fixture();const copy=joker('invisible',4);copy.counters.rounds=known(2);invisible.observed.jokers=known([copy,joker()]);const before=structuredClone(invisible);
 const result=previewMesaSale(invisible,copy.instanceId,mutation(invisible));assert.equal(result.ok,false);assert.deepEqual(invisible,before);
});
