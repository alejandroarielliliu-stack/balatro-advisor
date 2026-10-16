# Mesa de decisiones — revisión 2026-10-13 (Panamá)

Actualización 2026-10-14: Candidatos se sustituye por la [tienda de Balatro](tienda-contextual.md#disposición-visual), con bandejas, precio encima de cada carta, vale y sobres separados. Renovar, Actualizar y Siguiente ronda no aparecen: solo controles reales del asesor y recálculo automático. La valoración contextual funciona con el estado, sin planes; las manos exactas siguen en Análisis. El texto inferior conserva la revisión histórica del 13 de octubre y sus pruebas.

Aquella revisión reemplazó la distribución anterior sin modificar fórmulas, prioridades estratégicas ni cobertura del catálogo. Los resultados exactos por escenario dependen de planes explícitos, no de robos predichos.

## Crítica de la interfaz anterior

- La galería estaba dentro de una caja de inventario de 690 px. En la captura de 1280×720, los candidatos comenzaban en y=898 y los vales en y=1046: no se veían junto a la construcción actual.
- Baraja y un párrafo largo compartían dos columnas estrechas, mientras dinero y objetivo quedaban abajo. Esa distribución daba prioridad a explicaciones sobre condiciones iniciales frente a los datos que el jugador cambia durante una partida.
- Fondos y bordes similares daban casi el mismo peso a inventario, catálogo y controles secundarios. Había encabezados y estadísticas duplicados; las cifras del registro podían parecer cifras del borrador en vivo.
- La edición desplegada podía quedar recortada por el contenedor del inventario. La alternativa de compra necesitaba un detalle con puntos y coste más legibles.
- En móvil, todo el formulario precedía a las cartas. El jugador necesitaba poder reducirlo manteniendo visibles dinero, ante y objetivo. El zoom CSS al 200 % también reveló desbordamiento de la cabecera.

## Investigación y decisiones

| Fuente primaria | Qué se consultó | Aplicación concreta |
| --- | --- | --- |
| [Press kit oficial de Balatro](https://www.playbalatro.com/press-kit/) | Captura Full Deck y los GIF 1 y 2, abiertos en navegador; el segundo muestra bloques azules/rojos y el primero cartas sobre el fondo animado. | Mesa verde, HUD de pizarra, cifras coloreadas, cartas como objetos. Sin incorporar los GIF como fondo ni reproducir el efecto CRT sobre texto. |
| [NN/g: jerarquía visual](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/) | Agrupación, contraste y prioridad visual. | La construcción actual y los candidatos preceden al catálogo; número y color sirven para leer un cambio concreto. |
| [NN/g: divulgación progresiva](https://www.nngroup.com/articles/progressive-disclosure/) | Separación de tareas principales y controles especializados. | Recursos, condiciones, cobertura y ofertas registradas reunidos en una zona secundaria; el mazo actual sigue accesible desde Partida. |
| [NN/g: propósito del movimiento](https://www.nngroup.com/articles/animation-purpose-ux/) | Movimiento breve para respuesta y cambio de estado; riesgo de distraer. | Elevación al seleccionar, entrada corta de carta y diálogo. Sin animación continua de cifras ni espera para ver un resultado; modo de movimiento reducido. |
| [m6x11, Daniel Linssen](https://managore.itch.io/m6x11) | Página del autor y condición de atribución. | Fuente local m6x11plus para títulos y números; texto normal de sistema para descripciones y formularios. Autor acreditado en el pie y en assets/fonts/README.md. |

Las decisiones de distribución son una adaptación al asesor, no una afirmación de que imitar el juego valida la usabilidad. Las referencias de portfolios de la revisión anterior siguen siendo inspiración histórica, no pruebas de esta entrega.

## Estructura implementada

1. **Partida:** baraja inicial, saldo, ante, ciega, objetivo, premio y cobro del escenario. El jefe aparece solo para Boss Blind. La composición del mazo se edita desde «Mazo actual». La confirmación de cobertura permanece visible; reducir campos no confirma datos.
2. **Mesa:** inventario de altura fija de 216 px. Imágenes para consultar, nombres para editar; se conservan arrastre, orden con teclado y capacidad. El editor es un diálogo modal real con Escape y retorno de foco.
3. **Candidatos:** cuatro compras individuales en una fila. Nombre, imagen y delta de puntos; signo, flecha y color evitan depender solo del color. Los cuatro huecos vacíos llevan a buscar. No suman compras ni aplican resultados al registro.
4. **Vales:** ilustraciones y estado adquirido en una cuadrícula compacta debajo de los candidatos. Marcar uno sigue siendo transcribir lo que se posee; no una compra gratuita del juego.
5. **Catálogo:** zona propia debajo de los vales, con galería de altura estable y desplazamiento interno. «＋ Buscar» enfoca el buscador. Se conservan búsqueda ES/EN/efecto y filtros unidos dentro de cada grupo, intersectados entre grupos.
6. **Recursos y condiciones:** datos secundarios desplegables. No se eliminan campos ni se convierten valores desconocidos en cero.

En móvil «Reducir» sustituye los campos de Partida por una lectura compacta de dinero, ante y objetivo. «Editar» recupera los mismos campos y valores. Los candidatos siguen en una fila desplazable; no desbordan la página. El guardado continúa siendo opcional para el cálculo en vivo y conserva su función de registro explícito.

La navegación usa Mesa, Análisis, Registro y Colección. El catálogo no genera una recomendación de victoria ni una puntuación universal por comodín. Una cifra verde indica únicamente un aumento en el escenario calculado.

## Implementación y verificación

`src/ui/workspace.ts` reorganiza los nodos existentes conservando lectores y eventos. `web/mesa.css` define la presentación sobre la base compartida; las ilustraciones permanecen locales. No se añadieron dependencias, cuentas, red pública ni servicios. Se corrigió también el valor de edición holográfica de los selectores: `holographic`, el identificador que admite H2; no se normalizan copias incompatibles silenciosamente.

- Núcleo: **375 pruebas aprobadas, 0 fallos, 10 TODO** de comprobación en Balatro. TypeScript y compilación pasan. Las expectativas antiguas de catálogo se corrigieron distinguiendo metadatos de efectos publicados; no se generaron oráculos desde el motor.
- Integración web: **17 grupos** aprobados en Chrome, con perfiles y servidores de prueba independientes del guardado normal.
- Galería, candidatos, vales, objetivos, cobro, cálculo en vivo y contexto CAT03: pasan sus scripts. Se conserva la altura al añadir y reordenar, los filtros, los cuatro candidatos y la ausencia de escritura al consultar.
- Diseño: tres pantallas a 360/390/768/1280/1440 px, zoom CSS 200 %, navegación, edición, cierre modal, selección, confirmación, guardado y recarga. Prueba adicional de holográfica con oráculo independiente: `(10+8+8+3×30)×(2+20+10)=3712`; añadir Joker produce `116×36=4176` sin escritura.
- El cierre de diálogo se espera de forma explícita en los recorridos. Un fallo intermitente inicial de recursos (Juggler 8 frente a 9) no se reprodujo en cinco ejecuciones posteriores; no se atribuye una causa sin evidencia.

Capturas de escritorio inspeccionadas en el navegador; capturas móviles generadas por el arnés de pruebas e inspeccionadas como imágenes. Son tamaños móviles en Chrome de escritorio, no un dispositivo Android físico. La herramienta de tamaño de IAB no cambió su viewport efectivo; no se presenta esa operación como una comprobación móvil.

[Informe de diseño](evidencia/redesign/chromium/report.json), [mesa con cuatro candidatos](evidencia/mesa-refinada/desktop.jpg), [móvil compacto](evidencia/redesign/chromium/table-mobile-viewport.png). Las capturas utilizan datos sintéticos; no registran acciones de una partida observada.

Para repetir:

```powershell
npm.cmd run check
$env:BROWSER_CHANNEL='chrome'
npm.cmd run test:web
npm.cmd run test:design
npm.cmd run test:bay
npm.cmd run test:candidates
npm.cmd run test:vouchers
npm.cmd run test:live
npm.cmd run test:target
npm.cmd run test:cashout
node tools/context-jokers-test.mjs
```

## Límites conservados

Las reglas provisionales continúan identificadas como tales. El catálogo publica 82 efectos disponibles en la UI; los metadatos de los 150 y las familias añadidas al código no equivalen a completar su integración y evidencia. Esta revisión no cierra esa ampliación, H2 contra el juego ni la eficacia de H3. La accesibilidad se comprobó en los recorridos de foco/teclado existentes; no se certificó una auditoría de lector de pantalla.
