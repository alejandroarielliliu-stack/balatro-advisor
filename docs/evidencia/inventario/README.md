# Verificación de cambios de inventario

Fecha: 2026-10-16. Datos sintéticos; ningún caso representa observación directa de Balatro.

## Reproducir

```powershell
npm.cmd run check
npm.cmd run test:inventory-changes
npm.cmd run build:site
node tools/static-site-test.mjs
```

Para el navegador general con Chrome ya instalado:

```powershell
$env:BROWSER_CHANNEL='chrome'
node tools/browser-test.mjs
```

Resultado local: 616 pruebas de núcleo aprobadas, 0 fallos, 10 TODO de contraste con Balatro; ocho grupos nuevos de navegador. Regresiones: observaciones7, recorrido17, tienda14, navegador17 y comprobación estática bajo subruta. La ejecución inicial del navegador general no encontró el Chromium bundled; se repitió correctamente usando el canal Chrome instalado, sin modificar dependencias.

Los ocho grupos nuevos comprueban:

1. Preparar y cancelar un cambio no escribe.
2. K acero requiere confirmación, conserva otras51 cartas, dinero/supuestos, se guarda y recarga.
3. Deshacer recupera el mazo y conserva historial.
4. Fallo de cuota mantiene estado/historial y lista pendiente.
5. Un modal abierto sobre otra revisión no sobrescribe un saldo nuevo.
6. Añadir/retirar Fool no calcula uso/venta ni cambia dinero/Tarots usados.
7. Mazo desconocido se concilia solo con referencia anterior real y declaración explícita.
8. Modal390 sin desborde horizontal, botones accesibles mediante desplazamiento y segunda pestaña en lectura.

Capturas `desktop.png` y `mobile.png` inspeccionadas. Se redujeron los márgenes heredados del formulario para que el modal sea compacto y mantenga dos columnas de atributos. Chrome headless, tamaños1440 y390; no Android físico.

Capturas y `report.json` se generan aquí y están ignorados por Git. Tras publicar, `INVENTORY_BASE_URL` permite ejecutar los mismos casos en una sesión temporal de la web pública; también compara SHA256 de ocho archivos servidos con `out/`. `INVENTORY_COMMIT` y `INVENTORY_WORKFLOW` vinculan ese recibo a la publicación. El recibo público se escribe en `public/report.json`; no se infiere éxito remoto de estas pruebas locales.
