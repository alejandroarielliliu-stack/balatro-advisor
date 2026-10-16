# Balatro Strategic Advisor

**Web pública:** [Balatro Advisor en GitHub Pages](https://alejandroarielliliu-stack.github.io/balatro-advisor/). [Publicación automática y traslado de partidas](docs/github-pages.md). La migración solo se considera publicada cuando el despliegue termina y se comprueba el enlace sin iniciar sesión.

**Informe y plan actual (2026-10-15):** [auditoría del código y cobertura real](docs/reporte-codigo-2026-10-15.md), [recorrido de Balatro y entradas mínimas](docs/plan-asesor-de-partida.md), [hoja de ruta del resultado final](docs/hoja-de-ruta-asesor.md). La web aún no aconseja jugar/saltar ciegas ni mantiene el ciclo completo. Primera entrega propuesta: tienda unificada y acciones confirmadas/autoguardadas (SHOP03a), con fases y migración en paralelo; no equivale a añadir más perfiles de comodines.

**Versión vigente:** Mesa con puntaje global/seis barras, [tienda manual y consejo contextual](docs/tienda-contextual.md),150perfiles quick-fit-2,17familias de composiciones,32vales registrables (10efectos H2) y15sobres catalogados con ilustraciones. Disposición visual de Balatro, sin Renovar, Actualizar o Siguiente ronda; recálculo automático. Cálculos de manos en Análisis y guardado confirmado en Registro. Sobres cerrados con contenido desconocido y consejo condicionado. Cobertura web exacta82/150; perfiles no equivalen a efectos completamente implementados.

**Publicación:** `npm.cmd run build:site` genera `out/`; `npm.cmd run test:site` comprueba hosting estático dentro de un subdirectorio. [Acceso, Git separado y traslado de partidas](docs/publicacion.md). Los bloques siguientes conservan el historial de entregas.

**CAT02 (motor 0.6.0):** 33 comodines nuevos, **41 con cálculo**. Bonos por rango/palo/patrón, ×Mult con orden, dinero, valor de venta y Splash. [Cobertura, evidencia y pruebas](docs/comodines-cat02.md).

**Buscador:** al editar un comodín o una oferta, busca entre los 150 por nombre español/inglés o efecto. 41 tienen cálculo; el resto aparece marcado como catálogo. Seleccionar no guarda hasta confirmar.

**Barajas (motor 0.5.0):** 15 perfiles catalogados, **10 integrados**. [Composición real DECK03](docs/composicion-deck03.md): Abandonada, Cuadriculada y Errática con editor de cartas, identidades persistentes y manos especiales. Las otras cinco requieren consumibles, vales, sobres o tags. [Condiciones y límites](docs/barajas-condiciones.md).

**VC01a:** [encaje contextual 0–10](docs/plan-valoracion-contextual.md) en la comparación, con cinco criterios y diferencias de puntos por escenario. Rúbrica provisional sobre los ocho efectos compatibles; no califica automáticamente los 150 comodines.

**SYN01:** [32 sinergias y conflictos](docs/sinergias.md) con requisitos de mazo, cartas retenidas/puntuadas, orden y fuentes. Consulta en Colección; referencias documentales, aún sin detección automática ni nuevos cálculos.

**CAT01 (2026-10-11):** Colección de los 150 comodines vanilla con ilustraciones reales, nombres ES/EN, efectos, rareza, precios y propiedades. [Datos y procedencia](docs/catalogo-completo.md). 41 efectos están habilitados en el motor; 109 son solo catálogo. `npm run test:catalog` verifica la nueva vista.

**Interfaz UI-R2 (2026-10-11):** Mesa, Análisis y Registro; cartas editables y reordenables, comparación por escenario y detalle seleccionado. [Diseño, referencias y evidencia](docs/diseno-web.md). Ejecutar `npm.cmd run test:design` para las nuevas comprobaciones de interacción y tamaños de pantalla.

**Actualización del plan general:** [estado H0–H7 y próximos entregables](docs/plan-general-reconciliado.md). Firefox ya pasa los mismos 17 grupos que Chrome; [rendimiento medido](docs/rendimiento-h6.md) en PC y formato móvil emulado. Android físico aplazado por decisión del usuario. H4/H5 (simulación) y H7 (beta publicada) no están implementados; la v0.1 básica no equivale al plan completo.

H1 completo en su núcleo; H2 funcional y provisional; T07b compara planes y **H3 incorpora un asesor heurístico básico**. **H2 no está cerrado por falta de contraste ejecutado en Balatro; la eficacia estratégica de H3 tampoco está validada.** Interfaz web mínima local T10 implementada, sin simulaciones. Documentación y código exclusivos de esta carpeta; ../ProjectBonk/ no se modifica. Se usa el Git raíz preexistente, sin crear otro repositorio.

**T07b implementado:** comparación de conservar, comprar y reemplazar usando el mismo escenario explícito de cartas. Finalización temprana, saldos, contadores y limitaciones por rama, sin ranking estratégico. [Contrato y ejemplos](docs/comparacion-t07b.md).

**T09b implementado:** confirmaciones explícitas, revisión/duplicados, historial y correcciones; estado e historial se guardan juntos. [Migración H1 y uso](docs/confirmaciones-t09b.md). Consultar H3 nunca aplica su proyección a la partida registrada.

## Ventas en el consejo (T08c-1)

El asesor **h3-2** compara también vender sin comprar y explica qué efecto o crecimiento sacrificas. La confirmación sigue guardando solo la acción realizada. `npm.cmd run demo:sales` muestra una venta útil frente a Psychic. [Contrato y pruebas](docs/ventas-t08c.md).

## Varias rondas explícitas (T08c-2)

La web permite seleccionar planes como una secuencia de hasta tres ciegas, declarando cada ciega futura y la ausencia de operaciones intermedias. Conserva dinero/Green por alternativa y se detiene si falta información o el plan no vence. No predice robos ni modifica la partida real. `npm.cmd run demo:horizon` muestra S03: conservar 25→37→50 frente a comprar Golden 19→33→50. [Contrato, política y pruebas](docs/horizontes-t08c.md).

Verificación vigente: **141 pruebas, 29 contrastes EFHIII y 17 grupos Chrome aprobados**, con 10 TODO manuales. [Auditoría conjunta S01–S09 completada](docs/auditoria-t08c.md): T08c cerrado como software provisional, sin declarar eficacia validada. Reproducir los casos con `npm.cmd run test:scenarios`. Quedan T01/H2 y T11/A7 (contraste en juego, Firefox y Android físico).

## Límite conservador de puntuación (T07c)

La web incluye **Comprobar límite de puntuación**, sin necesidad de escenarios. Detecta insuficiencia cuando una cota superior queda por debajo de la ciega, bajo premisas y reglas provisionales; una cota alta no demuestra supervivencia. `npm.cmd run demo:bound` muestra S09. [Contrato, prueba y resultados](docs/cotas-t07c.md).

## Contraste independiente con EFHIII

Ejecuta `npm.cmd run test:reference`: 29 casos de puntuación contra una revisión fijada del calculador y esperados escritos a mano. [Alcance y límites](docs/contraste-efhiii.md). No certifica observación en Balatro ni cierra las reglas pendientes.

## Evaluación T11

[Prompt ejecutado](docs/prompt-t11.md) e [informe A1–A8](docs/evaluacion-t11.md): 103 pruebas del núcleo y 13 grupos de Chrome aprobados, incluidos teclado y tacto emulado. Firefox no pudo arrancar (configuración en paralelo); Android físico y contraste en Balatro pendientes. T11 permanece parcial.

## Abrir la web local (T10)

Desde esta carpeta, ejecutar `npm.cmd ci` y `npm.cmd start`; abrir **http://localhost:4173**. La copia local y el [sitio publicado](https://balatro-advisor.equalelf5.chatgpt.site) usan almacenamientos separados; usa el mismo origen para recuperar tus datos.

La web permite transcribir la partida, construir escenarios explícitos, consultar H3, confirmar acciones reales, corregir/deshacer y exportar/importar copias. Estado e historial se guardan juntos; una sola pestaña tiene el control de escritura mediante Web Locks. Las demostraciones están separadas del registro real.

[Guía de uso, garantías y límites T10](docs/interfaz-t10.md). Pruebas de navegador: en PowerShell, `$env:BROWSER_CHANNEL='chrome'` y `npm.cmd run test:web` (requiere Chrome instalado; la guía incluye la alternativa Chromium). Los planes hipotéticos son temporales y deben reintroducirse tras recargar.

## Ejecutar las pruebas

Requiere Node 24.x y npm. Versiones usadas: Node 24.19.0, npm 11.17.0; dependencias de desarrollo fijadas en package-lock.json. Sin dependencias de runtime.

    cd balatro-advisor
    npm.cmd ci
    npm.cmd run check
    npm.cmd run demo
    npm.cmd run demo:compare
    npm.cmd run demo:advisor
    npm.cmd run demo:confirm

check ejecuta tipos, compilación y pruebas: **375 aprobadas, 0 fallidas, 10 TODO de observación en Balatro**. Incluye H1/H2/T07b/H3/T09b/cotas/ventas/horizontes y auditoría integrada. Los TODO **no** cuentan como reglas verificadas. Una prueba usa Web Storage experimental de Node en dos procesos; su aviso es esperado. Además, 17 grupos de integración pasan en Chrome real headless; diseño revisado en escritorio y tamaños móviles. Android físico no probado.

demo:advisor muestra preferencias condicionales de compra/ahorro, empates y abstención. `-- --json` imprime todos los escenarios, cálculos y motivos. [Política h3-1 y límites](docs/asesor-h3.md): sin porcentajes, promedios de escenarios ni suma de dólares y puntos.

demo carga examples/shop-purchase.json, guarda/recupera con H1 en memoria y compra Half Joker: dinero 7→2, ocupación 0→1/5 y pareja de ochos 52→572. Imprime estados y desglose sin sobrescribir tu partida real. El contrato activo es **1.0.1o-FULL / Blue / White**; la lectura estática del ejecutable respalda sus reglas, pero no sustituye una sesión de prueba. [API, cobertura y limitaciones H2](docs/motor-h2.md).

## API mínima

    import { createDraft, validateState, createBrowserStateStore } from './src/index.js';

    const draft = createDraft('mi-partida', new Date().toISOString());
    const validation = validateState(draft);
    const store = createBrowserStateStore();
    if (validation.ok) {
      const saved = store.save(validation.value);
      const restored = store.load();
      // Comprobar .ok y mostrar .errors si falla.
    }

createStateStore(() => storage) permite inyectar un almacenamiento compatible para pruebas u otros clientes. importJson, exportJson, parseState y serializeState validan sin eliminar campos silenciosamente. load devuelve null solo si no existe la clave; corrupción devuelve un error. Se guardan observaciones e hipótesis; los resultados derivados no son autoritativos. No se calcula ni reinicia el contador de Green al cargar.

La estructura de datos no importa el registro de reglas. applyShopAction, scoreHand, beginRound, applyRoundEvent, finishRound, interestOnBalance y projectCashout implementan H2. Cada resultado incluye evidencia, traza y projected:true; requireObserved:true bloquea resultados todavía sin comprobación en juego. getEngineRuleRegistry identifica el contrato activo. assessAnalysis y getRuleRegistry conservan la metadata histórica H1/1.0.1f, sin ejecutar el motor.

## Documentación

- [Backlog y cierre documental de H0](docs/backlog.md)
- [Informe de H1 y limitaciones](docs/evidencia/h1-validacion.md)
- [Motor H2, demostración y pruebas](docs/motor-h2.md)
- [Comparación T07b](docs/comparacion-t07b.md) y [oráculos de sus cuatro demos](docs/evidencia/t07b-oraculos.md)
- [Asesor H3](docs/asesor-h3.md) y [evaluación de su política](docs/evidencia/h3-politica.md)
- [Confirmaciones, historial y guardado T09b](docs/confirmaciones-t09b.md)
- [Inspección estática L01](docs/evidencia/h2-inspeccion-local.md) y [oráculos independientes](docs/evidencia/h2-oraculos.md)
- [Especificación](docs/especificacion-v0.1.md)
- [Modelo de estado y distinción estructura/reglas](docs/modelo-de-estado.md)
- [Registro de reglas y evidencia](docs/reglas-y-fuentes.md)
- [T01, investigación y casos de referencia](docs/evidencia/t01-reglas.md)
- [Escenarios](docs/escenarios-v0.1.md) y [arquitectura](docs/arquitectura-v0.1.md)

H0 está cerrado como planificación. Ya se recibió Steam sin mods y la versión declarada; L01 identificó 1.0.1o-FULL en el archivo instalado. No se vuelven a pedir esos datos. La [tanda manual mínima](docs/evidencia/t01-tanda-usuario.md) sigue pendiente; H3 está implementado como software provisional, no validado mediante partidas.






- [Galería fija de comodines y comparación hipotética](docs/galeria-comodines.md). Prueba de interfaz: `npm run test:bay`.

- [Mesa refinada: crítica, referencias y pruebas](docs/diseno-web.md). `npm run test:design` comprueba reflujo, diálogos y HUD móvil.
