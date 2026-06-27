# Relevamiento General

> **Proyecto:** d3-c4ndle — Gráfico candlestick basado en D3.js
>
> **Fecha:** 2026-06-27
>
> **Estado:** funcionando con errores de concepto, prácticas obsoletas y deuda técnica significativa.
>
> **Objetivo del documento:** inventario abstracto y conceptual de problemas detectados; sirve de base para futuros documentos de detalle.

---

## 1. Contexto General

El proyecto es un visualizador candlestick con gráfico de volumen, desarrollado con D3.js y jQuery. Se conecta a un backend (actualmente dados internos de ejemplo) y emite órdenes de compra y venta de forma interactiva. Su arquitectura está acoplada a versiones muy antiguas de D3 y jQuery, y contiene numerosos antipatrones que limitan su escalabilidad y mantenimiento.

---

## 2. Diagrama Conceptual de Componentes

```
+-----------------------------------------------------------+
|  HTML (index.html)                                        |
|  - carga D3 v1, jQuery, jQuery UI                        |
|  - define estilos inline                                  |
|  - botón "Resize" sin contexto documentado                |
+-----------------------------------------------------------+
                            |
      +---------------------+---------------------+
      |                                           |
+-----v------+                            +-------v------+
| common.js  |                            | argentobit.js |
| (helpers)  |                            | (nucleo)      |
|            |                            |               |
| - escala   |                            | - data hard   |
| - bordes   |                            | - ventanas    |
| - eventos  |                            | - zoom        |
|   mouse    |                            | - ordenes     |
+------------+-+                          +----+---------+
               |                                |
               |          +---------------------+
               |          |
         +-----v--+  +----v-----+
         |candle.js|  |volume.js |
         +---------+  +----------+
```

---

## 3. Hallazgos Agrupados por Dominio

### 3.1 Datos y Persistencia

| Concepto | Estado actual | Riesgo |
|----------|---------------|--------|
| Datos embebidos en código | JSON hardcodeado en `argentobit.js` | Imposibilidad de actualizar dinámicamente |
| ||Implementación incompleta de persistencia |
| Sin modelo de dominio | Objeto candle = objeto plano anónimo | Difícil validar, tipar o testear |
| Sin abstracción de repositorio | `dataRepository` es array global mutable | Race conditions, inconsistencia |

### 3.2 Arquitectura y Acoplamiento

| Concepto | Estado actual | Riesgo |
|----------|---------------|--------|
|todo el estado en variables globales | `windowsData`, `dataRepository` | Colisiones, imposibilidad de instancias múltiples |
| Patrón "todo en uno" | `argentobit.js` contiene vista, modelo y lógica de negocio | SRP violado |
| Funciones sin separación de responsabilidades | `buildWindows` crea DOM, escala datos y dibuja SVG | Difícil testear o reutilizar |
| Dependencia directa a selects D3 para todo | Sin capa de abstracción del gráfico | Cambio de librería = refactor total |

### 3.3 Renderizado y Visualización

| Concepto | Estado actual | Riesgo |
|----------|---------------|--------|
| D3 v1 (2009–2011) | APIs obsoletas (`d3.scale.linear`, `d3.behavior.zoom`) | Inseguridad, falta de soporte, bugs conocidos |
| jQuery UI draggable en contenedores SVG | Manipulación del DOM con dos librerías simultáneas | Inconsistencias de estado, rendimiento pobre |
| CSS inline y en archivo | Estilos duplicados y sin organización | Difícil mantener temas o responsividad |
| Sin sistema de coordenadas unificado | Cada módulo recalcula escalas por separado | Desalineación visual, bugs de layout |
| Zoom implementado redibujando todo | `buildWindows` entero en cada evento de zoom | Cuellos de botella en datasets grandes |

### 3.4 Interacción y UX

| Concepto | Estado actual | Riesgo |
|----------|---------------|--------|
| Cursor personalizado sin debounce | Evento `mousemove` sin throttle | FPS bajas, consumo de CPU |
| Único evento mouse para todo | Tooltip y línea guía en el mismo handler | Difícil extender comportamientos |
| Botón Resize sin efecto claro en el DOM | Agrega un `childData` `volume` y redibuja | Comportamiento sorpresivo |

### 3.5 Seguridad y Buenas Prácticas

| Concepto | Estado actual | Riesgo |
|----------|---------------|--------|
| Scripts desde URLs HTTP (no HTTPS) | `http://mbostock.github.com/...` | Interceptación, fallo si HTTPS obligatorio |
| Sin sanitización de entradas | Confianza total en datos internos | Si se conecta a API externa: XSS por reflujo |
| Sin validación de tipos en datos de candle | `d.open > d.close` puede fallar con `undefined` | Excepciones en runtime |
| `String.prototype.format` extendido globalmente | Pollution del prototipo nativo | Conflictos con otras librerías |

---

## 4. Mapa de Prácticas vs. Prácticas Actuales

| Práctica Recomendada | Práctica Actual |
|----------------------|-----------------|
| Estado encapsulado (clases, módulos) | Variables globales |
| D3 v7+ con selections modernas | D3 v1 con syntax obsoleto |
| React/Vue/Angular o al menos Web Components | jQuery + D3 imperativo puro |
| Data fetching desacoplado con async/await | Datos inline, sin fetch |
| TypeScript y validación de tipos | JS sin tipado, sin schema |
| Unit tests con Jest/Vitest | Sin tests |
| Bundler moderno (Vite, Webpack) | Scripts planos, sin build step |
| Diseño responsive con flexbox/grid | Tamaños fijos en px (1600x800) |

---

## 5. Posibles Direcciones de Refactor

> Estas líneas no son un plan de acción concreto; son direcciones estratégicas basadas en los hallazgos.

1. **Separar modelo de dominio:** definir entidades `Candle`, `Window`, `Chart` con validaciones.
2. **Abstraer la fuente de datos:** crear gateway/repository que consuma API real, cachee y transforme.
3. **Modularizar renderizado:** separar responsabilidad de calculo de escalas, generación de paths SVG y aplicación de eventos.
4. **Migrar a D3 actual o envolver en un framework de UI moderno:** evaluar si justifica seguir con D3 imperativo o migrar a un wrapper declarativo.
5. **Agregar capa de tests:** empezar por validaciones de modelo y luego snapshot del DOM generado.
6. **Modernizar toolchain:** agregar bundler, linter, formateador y CI mínima.

---

## 6. Glosario de Términos para Documentos Futuros

| Término | Significado en este contexto |
|---------|------------------------------|
| `ChildData` | Configuración de un sub-gráfico dentro de una ventana |
| `Window` | Contenedor visual que agrupa uno o más gráficos |
| `dataRepository` | Arreglo global que actúa como caché de datos |
| `scale` (en código) | Valor numérico que determina cantidad de registros visibles |
| `orderBook` | Datos de libro de órdenes (asks/bids); actualmente sin uso real |

---

## 7. Notas Adicionales para Quienes Extenderán Este Doc

- El archivo `argentobit.js` es el más grande y crítico; contiene la mayor densidad de deuda técnica.
- `common.js` centraliza helpers dispersos sin cohesión clara; ideal candidato para descomposición.
- `candle.js` y `volume.js` siguen el mismo patrón D3 enter/update/exit pero con inconsistencias en el manejo de margenes y escalas.
- `index.html` mezcla presentación, dependencias externas inline y CSS; debería delegar a un build tool.

---

*Fin del relevamiento abstracto.*
