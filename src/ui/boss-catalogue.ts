import {BOSS_CATALOG} from '../catalog/bosses.js';
import type {BossDefinition} from '../catalog/bosses.js';
import {implementedBossEffects} from '../catalog/blinds.js';
import {blindArt} from './blind-art.js';
const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text='',className='')=>{const e=document.createElement(tag);e.textContent=text;e.className=className;return e;};

/** Reference data only. Neither browsing nor opening a boss changes a run. */
export function bossCatalogue(){
 const host=el('details','','boss-catalogue');host.id='boss-catalogue';host.append(el('summary',`Ciegas jefe · ${BOSS_CATALOG.length}`));
 const tools=el('div','','boss-catalogue-tools'),label=el('label','Buscar jefe'),search=el('input');search.type='search';search.id='boss-catalogue-search';search.placeholder='Nombre o efecto';label.htmlFor=search.id;label.append(search);const count=el('span','','tag');count.setAttribute('role','status');tools.append(label,count);
 const grid=el('div','','boss-catalogue-grid');grid.id='boss-catalogue-grid';const dialog=el('dialog','','boss-catalogue-dialog');dialog.id='boss-catalogue-detail';dialog.setAttribute('aria-label','Ficha de ciega jefe');
 let trigger:HTMLButtonElement|null=null;dialog.addEventListener('close',()=>trigger?.focus());
 const show=(boss:BossDefinition,button:HTMLButtonElement)=>{
  trigger=button;const close=el('button','Volver','boss-catalogue-close');close.type='button';close.onclick=()=>dialog.close();
  const header=el('div','','section-title');header.append(el('h2',boss.name),close);const body=el('div','','boss-catalogue-body'),info=el('div');
  info.append(el('small',boss.nameEn),el('p',boss.description),el('strong',`Objetivo ×${boss.multiplier} · premio base $${boss.reward}`),el('p',boss.showdown?'Jefe final del ante 8 dentro de este recorrido.':`Puede aparecer desde el ante ${boss.minAnte}; no sustituye a los jefes finales.`));
  const technical=el('details');technical.append(el('summary','Cálculo y fuentes'),el('p','El objetivo multiplica la base del ante y el factor de la baraja. El premio base no aumenta con el ante y no incluye manos sobrantes, intereses ni ingresos de comodines.'),el('p',implementedBossEffects(boss.id)?'Efecto disponible dentro del alcance actual del motor.':'Objetivo y premio disponibles; su efecto sobre las manos todavía está fuera del motor.'),el('p','1.0.1o-FULL · Inspección estática de fuentes del juego; no observación en una partida.'));
  const link=el('a','Datos originales del juego');link.href='https://github.com/Jofr3/balatro-source/blob/f081d0e41508d9dcc7a01cba5bffcccfbb115af1/game.lua';link.target='_blank';link.rel='noopener noreferrer';technical.append(link);info.append(technical);body.append(blindArt(boss.artId,boss.name),info);dialog.replaceChildren(header,body);dialog.showModal();close.focus();
 };
 const render=()=>{const needle=search.value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();const found=BOSS_CATALOG.filter(boss=>[boss.name,boss.nameEn,boss.description].join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(needle));count.textContent=`${found.length} / ${BOSS_CATALOG.length}`;grid.replaceChildren();for(const boss of found){const button=el('button','','boss-catalogue-card');button.type='button';button.dataset.bossCatalogId=boss.id;button.dataset.showdown=String(boss.showdown);const text=el('span','','boss-catalogue-copy');text.append(el('strong',boss.name),el('small',boss.nameEn),el('span',boss.shortDescription),el('small',`×${boss.multiplier} · $${boss.reward} · ${boss.showdown?'final':`ante ${boss.minAnte}+`}`));button.append(blindArt(boss.artId,boss.name),text);button.onclick=()=>show(boss,button);grid.append(button);}if(!found.length)grid.append(el('p','Sin coincidencias.'));};
 search.oninput=render;render();host.append(tools,grid,dialog);return host;
}
