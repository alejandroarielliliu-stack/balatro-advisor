# Plan: valoración con datos básicos y composiciones

2026-10-13. El usuario pide valorar sus comodines con etapa, mazo, sinergias y estrategia. Manos concretas quedan aparte. Este plan cierra el flujo básico y refina sus condiciones; no introduce simulación.

| Paso | Entrega verificable | Estado |
| --- | --- | --- |
| 1 | Mesa con baraja, ante, dinero, inventario y notas visibles; manos solo en Análisis, guardado en Registro. | Implementado y probado. |
| 2 | Perfiles explícitos de 150 IDs, nota ordinal con motivos y desconocidos sin cero inventado. | Implementado, con cobertura parcial de predicados declarada. |
| 3 | Material del mazo cambia la nota por su densidad conocida, no solo por existir una carta elegible. Separar mazo completo, cartas puntuadas y retenidas. | Implementado y refinado: proporción continua de material y contrastes Azul/Cuadriculada, sin probabilidades de robo. |
| 4 | Composiciones concretas y conflictos con participantes, material, orden y etapa. Investigar fuentes originales que falten; no importar tiers universales. | Implementado:17 familias ejecutables y seis fuentes originales adicionales, con límites de material y zona. |
| 5 | Contadores, copias y reemplazos no reutilizan beneficios vendidos ni interpretan progreso como aporte. | Probado: contadores, copias, palos, conflictos, saldo posterior y reemplazos; faltan predicados avanzados específicos declarados. |
| 6 | Recorrido desde cero: notas con datos básicos, sin guardar, cobertura ni manos; cambian al editar etapa y mazo. | Probado: ocho grupos web de encaje; pantallas separadas, plantilla inicial y mazo editado preservado. Evidencia en encaje-rapido.md. |

La nota mide encaje heurístico, no puntos, porcentajes o victoria. Densidad es proporción de cartas transcritas, no frecuencia de robo. Se publican umbrales editoriales y sus límites. Una condición desconocida muestra rango y dato faltante. No se guarda ningún resultado hipotético como partida real.

Solicitar solo datos relevantes: contador para escaladores, composición si el mazo cambió e historial/objetivos cuando el efecto los necesita. No exigir las nueve bases de manos para una primera valoración. El autoguardado por ciegas y el cálculo exacto de todos los efectos siguen siendo trabajos independientes.


Revisión QR05a: índice sin `/10` y con una décima, material continuo y transición gradual de ante; distingue aportes registrados de los contadores de puntuación permitidos. Plan y resultados en [índice de encaje](indice-encaje.md). La calibración de utilidad y otros predicados avanzados siguen pendientes; no hacen falta para quitar la antigua cuantización.
