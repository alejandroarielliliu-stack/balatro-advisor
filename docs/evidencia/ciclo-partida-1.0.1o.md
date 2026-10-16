# Evidencia del recorrido de partida — 1.0.1o-FULL

Revisión: 15 de octubre de 2026. Objetivo: fundamentar el diseño del asesor de partida, no declarar nuevas reglas observadas en una sesión.

## Método y compatibilidad

Se inspeccionaron los archivos Lua contenidos en el ZIP del ejecutable instalado, sin ejecutarlos. `version.jkr` identifica `1.0.1o-FULL`; el SHA256 del ejecutable es `0d75fe164accf3312734d4b37ac98788dd15f0b8e4f9bb8b7f90c4e59de93f47`. No se distribuye ese código propietario en el repositorio.

La [FAQ oficial](https://www.playbalatro.com/faq) describe pequeña, grande y jefe por ante, restricciones de jefe y final tradicional en ante 8. La [ficha oficial](https://store.steampowered.com/app/2379780/Balatro/) describe las familias de herramientas. Las condiciones precisas siguientes proceden de la build instalada; una página comercial o una guía no sustituyen esa evidencia. No se realizó una nueva partida ni se presenta una búsqueda de vídeos como una partida observada.

## Comprobaciones por regla

En todos los casos, «resultado observado en partida» permanece **pendiente**; «respaldada» significa inspección estática compatible, no confirmación de ejecución. Los casos son propuestas mínimas para contraste posterior; no se exige ejecutarlos todos para comenzar tareas independientes.

| Regla / caso mínimo | Esperado según el código inspeccionado | Evidencia primaria | Estado |
|---|---|---|---|
| Inicializar una partida sin modificadores | Base $4, tamaño de mano 8, manos 4, descartes 3, huecos 5 / consumibles 2; aplicar después baraja/dificultad | `functions/misc_functions.lua:1868–1880` | Respaldada; no asumir estos valores para todas las barajas |
| Seleccionar ciega | Small/Big ofrecen salto y tag; Boss no ofrece ese salto | `functions/UI_definitions.lua:1440–1449,1520–1548` | Respaldada |
| Saltar Small o Big | Avanza a Big o Boss, incrementa skips, agrega tag y dispara eventos propios; no llama cobro ni tienda ordinaria | `functions/button_callbacks.lua:2740–2781` | Respaldada |
| Saltar con Economy y $25 | Añade `min(40,max(0,25))=25`; saldo $50 al recoger | `tag.lua:176–188`, `game.lua:248` | Respaldada; Economy no tiene ante mínimo ni requisito en su definición |
| Recoger Investment | El pago de $25 espera a vencer un jefe | `tag.lua:117–129`, `game.lua:231` | Respaldada; no acreditar el dinero al recoger |
| Saltar con un tag de sobre inmediato | Puede abrir un sobre gratuito en `new_blind_choice`, sin una tienda ordinaria | `tag.lua:206–281` | Respaldada; no confundir «sin tienda» con «sin sobre posible» |
| Throwback y salto | Su XMult depende de `1+skips×0.25` | `card.lua:4176–4177`, `game.lua:488` | Respaldada; usa historial real |
| Red Card y salto | Saltar ciega no es su activación; omitir sobre dispara `skipping_booster` y +3Mult | `button_callbacks.lua:2558–2562`, `card.lua:2441–2443`, `game.lua:434` | Respaldada |
| Iniciar una ciega | Inicializa ronda, aplica ciega y roba; existen sucesos al seleccionar/iniciar, no solo al terminar | `functions/state_events.lua:290–334,355–375` | Respaldada; distinguirlo de saltar |
| Resolver mano/descartes | Hasta 5 cartas seleccionadas, sucesos por fase, cartas puntuadas/retenidas, orden y consumo de recursos | `button_callbacks.lua:2048–2055,2092–2098`; `state_events.lua:394–438,540–646,706–765,852–948,1068–1074` | Respaldada; condiciones particulares requieren su evidencia |
| Alcanzar objetivo | Termina la ronda; no obliga a gastar todas las manos | `game.lua:3196–3201`; `state_events.lua:475` | Respaldada |
| Fin de ronda y cobro | Evalúa resultado/excepciones y eventos; el cobro puede combinar premio, manos, comodines/tags e interés compatible | `state_events.lua:87–114,220–223,1135–1207`; `blind.lua:82–84` | Respaldada; no observado globalmente |
| Salir de tienda | Ejecuta eventos de salida y vuelve a selección; Perkeo responde a `ending_shop` | `button_callbacks.lua:2481–2507`; `card.lua:2412–2425` | Respaldada |
| Vencer al jefe | Avanza ante y renueva selección de vale; saltar Small/Big no aumenta ante | `state_events.lua:238–264`; `game.lua:1884` | Respaldada |

La inspección de tienda, precios y sobres se detalla en [SHOP01–08](tienda-investigacion.md). Los hashes registrados allí permiten identificar los archivos fuente relacionados.

## Caso económico del plan

Estado sintético compatible: Amarilla, White, ante 2/Small, saldo $25, cuatro manos, sin otros modificadores económicos; Economy visible. Amarilla solo aumenta el dinero inicial (`game.lua:630`). No se conoce una semilla ni se afirma que se haya observado este estado.

- Si el escenario declarado vence en una mano, sobran 3: premio $3 + manos $3 + interés $5 = $11; saldo $36. Fuentes: `game.lua:264`; `state_events.lua:1165–1168,1191–1202`.
- Si salta, Economy añade $25: saldo $50, avance a Big sin la tienda ordinaria de Small.

La aritmética es exacta bajo esas premisas. Ganar en una mano es una **hipótesis de evaluación**, no una predicción. La diferencia de dinero no fija el valor de tienda, crecimiento ni supervivencia posterior, por lo que no demuestra cuál acción es óptima para ganar la partida.
