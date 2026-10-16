# Publicación web

## Migración a GitHub Pages — 2026-10-15

Destino: [repositorio independiente](https://github.com/alejandroarielliliu-stack/balatro-advisor) y [web pública](https://alejandroarielliliu-stack.github.io/balatro-advisor/). El flujo de [GitHub Pages](github-pages.md) compila, verifica y publica el artefacto `out/` al actualizar `main`. El código público se prepara sin el historial de Sites, su configuración `.openai`, capturas, informes de ejecución ni rutas personales. Se conservan código, pruebas, ejemplos sintéticos, documentación de reglas, atribuciones y procedencia de activos.

La copia Git independiente está en `C:\Users\usuario\balatro-advisor-github`, fuera del repositorio padre y separada de la copia de Sites. No se sube Project Bonk. El sitio anterior se conserva durante el cambio; no se anuncia la nueva dirección como operativa hasta comprobar despliegue y acceso anónimo. Las partidas requieren exportación/importación porque cambia el origen del navegador, sin modificar su formato ni copiar datos reales al repositorio.

El resto de este documento conserva la publicación anterior en Sites como historial, no como destino de nuevas entregas.

Preparación2026-10-13. La aplicación se ejecuta en el navegador; el servidor local de desarrollo solo entrega archivos. El artefacto `out/` conserva las dependencias JavaScript alcanzables del cliente, estilos, catálogos, ilustraciones, fuente y los dos ejemplos sintéticos usados por la interfaz. El número de módulos se calcula en cada build, sin mantener una lista numérica obsoleta. No incluye servidor Node, demos CLI, pruebas, fuentes TypeScript, capturas/logs de desarrollo ni partidas del usuario.

## Preparar y comprobar

```powershell
npm.cmd run build:site
npm.cmd run test:site
```

El empaquetador usa una lista de archivos admitidos y sigue imports desde la entrada de la interfaz. Rechaza imports externos/Node y rutas fuera del cliente. Las rutas de HTML, CSS y fetch son relativas: funcionan en la raíz de un dominio y dentro de `/balatro-advisor/`. La prueba estática rechaza rutas globales `/web`, `/dist`, `/examples`; verifica150comodines, ilustraciones, fuente, comparación80→572, plantillas, persistencia explícita, recarga, ausencia de escrituras por consultar y anchuras390/1440. HTTPS permite las APIs de almacenamiento, Web Locks y UUID del navegador.

Actualización QR06:75módulos de cliente/95archivos permitidos. Ocho grupos estáticos aprobados, incluido el global y seis barras de composición bajo subruta, explicaciones sin escritura,86solicitudes internas y cero recursos externos/errores. Se inspeccionaron capturas locales de escritorio y móvil emulado; no se afirma inspección visual de producción. El intento inicial de renovar `out/` recibió un error transitorio EPERM de Windows en el cambio de nombre; el reintento construyó el artefacto completo y la prueba posterior pasó.

Actualización SHOP01 (2026-10-14): 78 módulos de cliente, 101 archivos y 17 activos. El artefacto incluye el catálogo y atlas de los 15 tipos de sobre y la tienda contextual con disposición de Balatro. No incluye Renovar, Actualizar o Siguiente ronda. Ocho grupos estáticos y 12 de tienda comprobados; el contenido de los sobres cerrados sigue desconocido. [Verificación actual](evidencia/tienda/README.md).

## Sitio y Git

Sitio registrado: `appgprj_6ace957e16948191b74c377a82053a10`. URL asignada: `https://balatro-advisor.equalelf5.chatgpt.site`. Una URL asignada no acredita publicación; solo el resultado de despliegue con estado `succeeded` lo hace.

Se usa Sites con acceso privado del propietario. Puede abrirse desde otros equipos usando la misma cuenta de ChatGPT. No se añaden cuentas a la aplicación ni servicios de partidas. El repositorio Git del proveedor de hosting queda separado del Git de desarrollo, fuera del árbol que también contiene Project Bonk. La copia de publicación se encuentra en `C:\Users\usuario\balatro-advisor-hosted`; nunca se inicializa Git dentro de `balatro-advisor` ni se sube el repositorio padre.

La conexión GitHub disponible permite leer repositorios y escribir archivos en los existentes, pero no crear uno nuevo; el navegador de control no dispone de una sesión habilitada para esa acción. Por ello este despliegue no es GitHub Pages ni crea un repositorio en la cuenta GitHub del usuario. El empaquetado queda compatible con Pages para una futura publicación allí, siguiendo su [documentación oficial](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

La identidad está en `.openai/hosting.json`; reutilizar su `project_id`, sin registrar otro sitio. Las credenciales temporales se mantienen en memoria y se entregan por stdin al helper de Sites; no se guardan en el repositorio ni en argumentos del shell. El código se confirma y se sube antes de empaquetar; el despliegue usa el SHA exacto y su archivo correspondiente.

## Datos y recursos

El estado permanece en localStorage del origen y navegador utilizados. Los datos de localhost no aparecen automáticamente en el sitio ni se sincronizan entre PC/Android: usar Registro→ExportarJSON/ImportarJSON para trasladarlos, con las confirmaciones T09b existentes. Consultar la tienda no sube ni guarda una partida; sus ofertas transcritas son temporales de la sesión. No se copia almacenamiento real al artefacto.

Las ilustraciones y textos de Balatro pertenecen a LocalThunk/Playstack; se conservan procedencia y atribución, sin declarar una licencia nueva o afiliación oficial. La fuente y la implementación EFHIII conservan sus créditos/licencia. No se distribuyen archivos Lua del juego. El acceso inicial privado no se amplía al publicar actualizaciones.

Los criterios de eficacia estratégica y comprobaciones en Balatro pendientes no se cierran por alojar la web. El despliegue comprueba disponibilidad y funcionamiento de la misma aplicación, sin añadir Monte Carlo, backend o catálogo.
