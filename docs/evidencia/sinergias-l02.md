# L02 — sinergias: inspección estática 1.0.1o-FULL

2026-10-11. Se leyó el mismo ejecutable local de [L01](h2-inspeccion-local.md), con `zipfile`, sin ejecutarlo ni modificarlo. Las huellas se cotejan con `web/assets/jokers/provenance.json`. No es evidencia de partida observada. Los ejemplos son deducciones con factores aislados; no resultados del motor H2.

| Relación | Ubicación inspeccionada | Deducción y caso mínimo |
| --- | --- | --- |
| Mimo + Acero | `card.lua` 1011–1013, 3387–3394; `state_events.lua` 813–835; registro `m_steel` | El efecto retenido se repite una vez por Mimo. Una carta Acero retenida: 1.5² = 2.25. |
| Mimo + Barón | `card.lua` 3287–3300 y 3387–3394 | El rey retenido recibe el efecto por carta de Barón y la repetición de Mimo. Un rey base: 1.5²; un rey Acero: 1.5⁴. |
| Sello rojo + Acero + Mimo | `card.lua` 2242–2250; `state_events.lua` 813–835 | Sello y Mimo añaden repeticiones a la lista, no se multiplican entre sí. Original + sello + Mimo = tres activaciones de Acero, 3.375. |
| Mimo + Oro / azul al cierre | `card.lua` 1033–1064, 2879–2886; `state_events.lua` 192–210 | La mejora Oro genera dólares por retención al cierre; azul intenta crear planeta y comprueba capacidad. Mimo repite efectos elegibles. Oro aislado: $6; azul necesita espacio en cada intento. |
| Contraejemplo: sello dorado | `card.lua` 1068–1084 frente a 1033–1064 | El sello dorado paga por puntuación, no por retención al cierre. Mimo no duplica ingresos inexistentes de una carta base con ese sello retenida. |
| Fotografía + Chad | `card.lua` 3093–3107, 3352–3359 | Fotografía elige la primera figura puntuada; Chad repite la primera carta puntuada. Si coinciden, X2 tres veces = X8. Si no coinciden, no es el mismo combo. |
| Chad + Cristal | Repeticiones de `state_events.lua` 669–686 y registro `m_glass` | Repeticiones de puntuación vuelven a aplicar el X2 de Cristal; no se deduce de ello que cada repetición repita la comprobación de rotura. |
| Midas → Vampiro | `card.lua` 3443–3458 y 3465 en adelante; fase previa en `state_events.lua` | Midas transforma figuras del conjunto puntuado en Oro; Vampiro consume mejoras del conjunto puntuado. Ordenar Midas antes permite consumir la mejora recién creada; invertir el orden produce otro estado final. |
| Copiar Mimo | `card.lua` 2304–2317; flag Blueprint de Mimo en catálogo | Blueprint dirige la llamada al comodín de su derecha. La ficha solo cubre una copia válida, sin bucles ni cadenas de copia. |

Pendiente para todas: registrar una partida real con componentes activos, cartas jugadas/retenidas, mejoras, sellos, orden, efectos deshabilitados y desglose de activaciones. El caso no debe cambiar más de una condición entre comparación base y combo. Para validar efectividad estratégica harían falta además escenarios representativos; un cálculo correcto aislado no demuestra consistencia ni victoria hasta ante 8.

## Fuentes de internet y discrepancias

Se consultaron resultados indexados de la wiki y guías, con URL y tipo de evidencia conservados en `synergies.json`. Algunas páginas de Fandom no admitieron apertura completa; se registra **extracto de búsqueda**, no lectura completa. La guía [Mime de BalatroHQ](https://balatrohq.com/jokers/mime/) confunde en un apartado Gold Seal con Gold Card. Se descarta esa afirmación al contrastarla con las dos funciones del ejecutable. También se descarta la formulación de otra guía según la cual Mimo/Barón benefician al rey jugado: sus condiciones son de carta retenida.

El resto de las fichas combinan propiedades estáticas del catálogo y referencias comunitarias; están marcadas `provisional-composition`. No se ha inspeccionado toda la implementación de cada combinación ni se afirma que todas las excepciones estén cubiertas.
