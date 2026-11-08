# Tienda en la escena de partida

8 de noviembre de 2026. Al confirmar **Siguiente** en el cobro, ese panel baja y la tienda sube en la misma mesa. El lateral, las bandejas y el mazo mantienen su posición. La tienda y el lateral tienen borde rojo y se muestra el rótulo SHOP de la referencia. Movimiento reducido abre la tienda sin animación.

La presentación utiliza el registro existente: dos espacios iniciales para comodines, uno para vales y dos para sobres. No copia los artículos ni precios de la captura. Pulsar un espacio permite transcribir catálogo, precio y, en comodines, edición y pegatinas. Todas las ofertas adicionales permanecen accesibles mediante desplazamiento. Consultar o cancelar no modifica la partida.

Las ofertas se guardan mediante el puente de tienda existente y conservan el mismo `shopId`, identidad y categorías. Comprar o abrir utiliza las confirmaciones y reglas anteriores; una oferta registrada no equivale a una adquisición. Los sobres comprados siguen su flujo de contenido observado. **Ver análisis de tienda** mantiene accesibles el consejo y las herramientas detalladas.

**Siguiente ronda** registra la salida de tienda con el progreso existente y devuelve la selección de ciegas. **Renovar** abre una transcripción explícita de una renovación realizada en Balatro: saldo actual y próximo coste observado. Conserva vales y sobres, deja pendientes las nuevas cartas y no genera artículos ni calcula un gasto supuesto. Los contadores de Flash afectados quedan por observar. Continuar recupera una tienda 0.2 sin repetir el cobro; las copias 0.1 conservan su entrada a Mesa.

Verificación: tipos y pruebas de código; ocho grupos nuevos de navegador de transición, disposición, ofertas, compras, errores/reintentos, renovación observada, recarga y siguiente ronda. Regresiones de cobro, selección, entrada y tienda persistente; artefacto estático bajo `/balatro-advisor/`. Capturas e informes sintéticos en `docs/evidencia/game-shop/`, excluidos de Git. No se presentan como observación nueva de Balatro ni prueba en Android físico.
