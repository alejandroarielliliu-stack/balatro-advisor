# GitHub Pages

Repositorio: [alejandroarielliliu-stack/balatro-advisor](https://github.com/alejandroarielliliu-stack/balatro-advisor).

Dirección prevista: [Balatro Advisor](https://alejandroarielliliu-stack.github.io/balatro-advisor/). Esta dirección no acredita que el despliegue haya terminado: debe existir una ejecución correcta del workflow y comprobarse el acceso público.

## Publicación automática

En Settings → Pages, seleccionar GitHub Actions como origen. El workflow [pages.yml](../.github/workflows/pages.yml) se ejecuta al subir cambios a `main` y también permite iniciarlo desde Actions → Publicar Balatro Advisor → Run workflow.

La ejecución instala las versiones del lockfile con Node.js 24, comprueba tipos y pruebas, construye `out/` y prueba ese artefacto bajo `/balatro-advisor/` con Chrome. Solo después publica el directorio `out/`. Una comprobación fallida impide desplegar esa ejecución; no anuncia una actualización correcta.

Para actualizar la aplicación, modificar y comprobar el proyecto, confirmar los archivos y subirlos a `main`. La pestaña Actions muestra el resultado y el job de publicación ofrece el enlace de Pages. No hacen falta un servidor propio, credenciales en la web ni una cuenta de ChatGPT para visitar el sitio público.

El directorio público contiene únicamente los módulos del navegador, estilos, recursos y dos ejemplos sintéticos. El workflow no publica documentación, pruebas, logs ni partidas locales. El repositorio fuente público sigue siendo consultable de forma independiente al contenido de Pages; no deben subirse datos personales, credenciales o guardados reales.

## Trasladar una partida

El almacenamiento pertenece al origen del sitio y al navegador. La nueva dirección no puede leer automáticamente la partida guardada en otra dirección ni en localhost.

1. Abrir la dirección anterior en el navegador donde está la partida guardada.
2. En Registro, usar Exportar JSON y conservar el archivo.
3. Abrir la dirección nueva y, en Registro, usar Importar JSON.
4. Revisar la confirmación antes de importar o reemplazar una partida existente.
5. Comprobar dinero, comodines e historial, y recargar para confirmar que se recuperan.

El formato `confirmed-1` conserva la partida registrada y su historial. Los archivos H1 compatibles se importan mediante la migración explícita existente. Los cambios de Mesa que todavía no se hayan guardado, las ofertas temporales de tienda y los escenarios de la sesión no se trasladan mediante esa exportación. Conservar la copia descargada hasta verificar la recuperación.

## Recursos y alcance

Se mantienen las atribuciones y los archivos de procedencia de las ilustraciones, la fuente y EFHIII. Publicar la web no cambia la cobertura del motor, la evidencia de las reglas ni las limitaciones del asesor.

Referencias: [workflows personalizados de Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) y [navegadores de Playwright](https://playwright.dev/docs/browsers).
