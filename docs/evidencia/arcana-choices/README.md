# DECK04c: evidencia de comparación de objetivos

18 de octubre de 2026. Evidencia de software sobre estados sintéticos, separada de la inspección primaria L12/L13 y de la observación pendiente en Balatro. No se incorporan fórmulas nuevas del juego ni se atribuye eficacia estratégica por pasar las pruebas.

- `npm run check`: 885 pruebas aprobadas, cero fallos y diez TODO manuales. Las 19 nuevas están en `tests/arcana-choices.test.ts`.
- Combinatoria independiente: para ocho cartas, seleccionar de una a dos produce 8 + 28 = 36 conjuntos; hasta tres produce 8 + 28 + 56 = 92. Se comprueba contra listas distintas y sin duplicados.
- Los literales de transformaciones, saldo y Tarot usados proceden del contrato L12/L13, no de generar expectativas con la salida del asesor. Copia, determinismo, huellas, límite, no escritura y ausencia de falsas equivalencias son contratos del software.
- `npm run demo:arcana-choices`: escenario sintético de comparación con Mimo, sin persistencia. El resultado heurístico no se interpreta como comprobación en partida.
- `npm run test:arcana-choices`: ocho grupos de navegador con perfiles temporales, incluidos selección de vista previa, confirmación independiente, Mega/revisión, faltantes, pestaña lectora y emulación 390 px. `report.json` y capturas son evidencia local ignorada por Git.

La variante pública usa `ARCANA_CHOICES_BASE_URL`, `ARCANA_CHOICES_COMMIT` y `ARCANA_CHOICES_WORKFLOW`; exige igualdad de 23 módulos críticos, HTML y CSS con el artefacto probado. Solo un reporte `passed` confirma esa ejecución. Las regresiones de Arcana y subruta se mantienen aparte. Ninguno de estos reportes prueba una partida observada, Android físico, probabilidad de victoria o la utilidad de la política.

El contrato, criterios y límites están en [DECK04c](../../objetivos-arcana-deck04c.md). La siguiente ampliación de efectos necesita su evidencia propia; aprobar este comparador no habilita otros Tarot.
