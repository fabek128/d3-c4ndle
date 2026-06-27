# Plan de Implementación Detallado — d3-c4ndle

> Documento derivado de `docs/relevamiento.md` con análisis técnico profundo, pasos de implementación, riesgos, trade-offs y criterios de aceptación. Edición revisada tras revisión técnica.

---

## 0. Resumen Ejecutivo

| Métrica                    | Valor                                                                                                                                                                                              |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Alcance**                | Refactor de deuda técnica crítica: D3 v1→v7, eliminación de jQuery/global state, sanación de datos/sanitización, setup de testing, CI/CD mínima.                                                   |
| **Duración estimada**      | 4 sprints = 4 semanas (1 dev full-time)                                                                                                                                                            |
| **Lenguaje**               | TypeScript Vanilla + D3 v7 + Vite                                                                                                                                                                  |
| **Riesgo crítico**         | Breakpoints visuales por cambio de API D3; inversión de dependencias innecesaria; performance DOM con >1k velas SVG                                                                                |
| **Criterio de salida MVP** | Gráfico candlestick + volumen renderizado con D3 v7, datos desde archivo JSON local (mock API), tests de transformación de datos corriendo, build Vite verde en CI, sin jQuery/D3 v1/global state. |

---

## 1. Filosofía de este Plan

**Menos es más.** Este es un gráfico de 4 archivos JS y un HTML. El objetivo del refactor no es construir un producto escalable a 10 equipos, sino **dejar el código mantenible, testeable y seguro**.

No se escribirán capas de abstracción que no resuelvan un problema real hoy.

---

## 2. Arquitectura Objetivo (Flattened)

```
src/
├── main.ts                  # entry point, bootstrapping del chart ÚNICO
├── types/
│   └── candle.ts            # interfaces de Candle (zod Schema + TS infer)
├── data/
│   ├── candle.api.ts        # fetchCandles() -> Promise<Candle[]> + validación zod
│   └── fixtures.ts          # datos legacy migrados a JSON puro
├── lib/
│   └── chart/
│       ├── ChartRenderer.ts   # clase principal: monta SVG, orquesta Candle + Volume
│       ├── CandleLayer.ts     # renderiza velas (enter/update/exit)
│       ├── VolumeLayer.ts     # renderiza barras de volumen
│       ├── Crosshair.ts       # tooltip + línea de cruce (sin innerHTML)
│       └── Scales.ts          # factory de escalas x (tiempo) e y (precio/volumen)
├── styles/
│   ├── main.css               # custom properties (--bg, --up, --down), layout grid
│   └── normalize.css          # reset mínimo
├── utils/
│   ├── format.ts              # abbreviateNumber, formatTooltip, dateFormatters
│   └── throttle.ts            # requestAnimationFrame-based    # para interacciones ligeras sin lodash
├── tests/
│   ├── unit/
│   │   ├── candle.schema.test.ts
│   │   └── format.test.ts
│   └── e2e/
│       └── chart.visual.spec.ts  # Playwright visual regression
├── index.html                 # Vite entry point
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
└── package.json
```

**Principios rectores**

1. **Flat is better than nested.** No hay `core/`, `infra/`, `use-cases/`. Es un gráfico. Si crece, se refactoriza. Hoy, `lib/` y `data/` alcanzan.
2. **Inmutabilidad de datos.** Los datos son与以往不同。使用 `readonly` en tipos DTO.
3. **TypeScript strict + Zod.** Tipos en compile-time, validación en runtime.
4. **DOM Performance First.** Antes de optimizar código, medir. Si SVG choca con el rendimiento a >1k entidades, pasar a Canvas es una decisión de 1 dáa, no 2 sprints.

---

## 3. Plan por Fases (Realista, no aspiracional)

| Fase  | Entregable                      | Duración | Criterio de aceptación                                                        | Riesgo clave                                   |
| ----- | ------------------------------- | -------- | ----------------------------------------------------------------------------- | ---------------------------------------------- |
| **0** | Tooling + Datos limpios         | 2 días   | `npm run dev` funciona, datos legacy convertidos a `candles.json`             | Migración incorrecta de timestamps             |
| **1** | Dominio + Tests unitarios       | 3 días   | `vitest` pasa 100% (validación zod, helpers); cobertura ≥ 80%                 | Reglas zod demasiado rígidas para datos sucios |
| **2** | Renderer D3 v7 básico           | 5 días   | Snapshots visuales de candle+volume en desktop (1920×1080) y mobile (375×667) | Breakpoints visuales                           |
| **3** | Interacciones + Responsive + CI | 5 días   | Zoom, pan, crosshair funcionan. CI verde en GH Actions.                       | Performance DOM con >1k velas                  |
| **4** | Hardening + Revisión            | 3 días   | Accesibilidad básica, sanitización revisada, bundle auditado                  | Ninguno si llegamos hasta acá                  |

**Total: 4 semanas.** No 16.

---

## 4. Análisis Técnico Detallado

### 4.1 Datos y Validación (`src/data/`)

#### Problema Actual (visto en código)

```javascript
// argentobit.js
var data = [...]; // datos de 2014 hardcodeados, todos con valores similares
String.prototype.format = function() { ... }; // polución global
```

#### Solución Técnica

```typescript
// src/types/candle.ts
import { z } from 'zod';

export const CandleSchema = z
  .object({
    timestamp: z.number().int().positive(),
    open: z.number(),
    high: z.number(),
    low: z.number(),
    close: z.number(),
    volume: z.number().nonnegative(),
  })
  .refine(data => data.high >= Math.max(data.open, data.close, data.low), {
    message: 'high debe ser >= open, close, low',
  })
  .refine(data => data.low <= Math.min(data.open, data.close, data.high), {
    message: 'low debe ser <= open, close, high',
  });

export type Candle = z.infer<typeof CandleSchema>;
```

**Tests Obligatorios**:

```typescript
// tests/unit/candle.schema.test.ts
import { CandleSchema } from '../../src/types/candle';

describe('CandleSchema', () => {
  it('acepta una vela válida', () => {
    expect(
      CandleSchema.parse({
        timestamp: 1404484300,
        open: 627.5,
        high: 639.63,
        low: 622.112,
        close: 629.127,
        volume: 2667.36,
      })
    ).toBeTruthy();
  });

  it('rechaza high < low', () => {
    expect(() => CandleSchema.parse({ ...valid, high: 100, low: 200 })).toThrow();
  });

  it('rechaza timestamp negativo', () => {
    expect(() => CandleSchema.parse({ ...valid, timestamp: -1 })).toThrow();
  });
});
```

**Riesgo**: Validación estricta rompe datos legacy sucios.  
**Mitigación**: `zod.safeParse` + log en consola de dev para ver qué falla. Si los datos de 2014 son solo para demo, no importa. Si se integra a API real, la API debe devolver datos limpios.

### 4.2 Renderizado D3 v7 (`src/lib/chart/`)

#### Cambios de API Críticos

| D3 v1 (Legacy)                  | D3 v7 (Nuevo)            | Impacto                                             |
| ------------------------------- | ------------------------ | --------------------------------------------------- |
| `d3.scale.linear()`             | `d3.scaleLinear()`       | Directo                                             |
| `d3.time.format()`              | `d3.timeFormat()`        | Directo, usar UTC para timestamps                   |
| `d3.behavior.zoom()`            | `d3.zoom()`              | Patrón distinto, requiere `d3.selection.call(zoom)` |
| `selection.enter().append(...)` | `selection.join(...)`    | Simplifica código, menos boilerplate                |
| `d3.svg.axis()`                 | `d3.axisBottom()/Left()` | Directo                                             |

#### Estrategia de Renderizado: SVG vs Canvas

Para 1-2 paneles (candle + volume) con hasta 1.000-2.000 velas, **SVG es aceptable**.

Si se detecta degradación de FPS:

- **Alternativa**: `d3.zoom` + Canvas 2D para las velas, SVG para overlays (crosshair, tooltip).
- **Comprobación**: Benchmark en Fase 2 con `console.time` + `performance.now()`

#### Refactor de `candle.js` y `volume.js`

```typescript
// src/lib/chart/CandleLayer.ts
import { Selection } from 'd3-selection';
import { Candle } from '../../types/candle';

export class CandleLayer {
  constructor(private container: Selection<SVGGElement, unknown, null, undefined>) {}

  render(data: Candle[], xScale, yScale) {
    const candleWidth = this.calculateCandleWidth(data.length);

    // STEMS (high-low)
    this.container
      .selectAll<SVGLineElement, Candle>('line.stem')
      .data(data, d => d.timestamp)
      .join('line')
      .attr('class', 'stem')
      .attr('x1', d => xScale(d.timestamp))
      .attr('x2', d => xScale(d.timestamp))
      .attr('y1', d => yScale(d.high))
      .attr('y2', d => yScale(d.low))
      .attr('stroke', d => (d.open > d.close ? 'var(--down-color)' : 'var(--up-color)'));

    // BODIES (open-close)
    this.container
      .selectAll<SVGRectElement, Candle>('rect.body')
      .data(data, d => d.timestamp)
      .join('rect')
      .attr('class', 'body')
      .attr('x', d => xScale(d.timestamp) - candleWidth / 2)
      .attr('y', d => yScale(Math.max(d.open, d.close)))
      .attr('height', d => Math.abs(yScale(d.open) - yScale(d.close)) || 1)
      .attr('width', candleWidth)
      .attr('fill', d => (d.open > d.close ? 'var(--down-color)' : 'var(--up-color)'))
      .attr('stroke', d => (d.open > d.close ? 'var(--down-color)' : 'var(--up-color)'));
  }

  private calculateCandleWidth(dataLength: number): number {
    // ancho disponible / datos * factor de padding
    return Math.max(1, 0.8 * (this.width / dataLength));
  }
}
```

### 4.3 Interacciones y UX (`src/lib/chart/Crosshair.ts`)

#### Sanitización de Tooltip

**Prohibido `innerHTML`**. El plan original sugería `this.tooltip.html(...)`.

```typescript
// ❌ INSEGURO: .html() ejecuta innerHTML bajo el capó
this.tooltip.html(formatTooltip(candle));

// ✅ SEGURO: Usar .text() o document.createTextNode()
this.tooltip
  .text(formatTooltip(candle)) // Escapa automáticamente HTML/JS
  .style('opacity', 1)
  .style('left', mx + 10 + 'px')
  .style('top', my + 10 + 'px');
```

**Si necesitamos formato enriquecido**, usar `DOMPurify` (3kB gzipped):

```typescript
import DOMPurify from 'dompurify';
this.tooltip.html(DOMPurify.sanitize(`<b>${price}</b> - ${date}`));
```

#### Debounce con `requestAnimationFrame`

```typescript
// src/utils/throttle.ts
export function rafThrottle<T extends (...args: any[]) => void>(fn: T): T {
  let ticking = false;
  return ((...args: any[]) => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        fn(...args);
        ticking = false;
      });
      ticking = true;
    }
  }) as T;
}

// Uso en Crosshair
svg.on(
  'mousemove',
  rafThrottle(event => {
    this.updateCrosshair(d3.pointer(event));
  })
);
```

#### Manejo de Bordes (Tooltip no se corta)

```typescript
private positionTooltip(mx: number, my: number): void {
  const tooltip = this.tooltip.node();
  const tooltipRect = tooltip.getBoundingClientRect();
  const { innerWidth, innerHeight } = window;

  let left = mx + 10;
  let top = my + 10;

  // Si se sale por la derecha
  if (left + tooltipRect.width kub width > innerWidth) {
    left = mx - tooltipRect.width - 10;
  }
  // Si se sale por abajo
  if (top + tooltipRect.height > innerHeight) {
    top = my - tooltipRect.height - 10;
  }

  this.tooltip.style('left', `${left}px`).style('top', `${top}px`);
}
```

### 4.4 CSS y Diseño Responsive (`src/styles/`)

#### Problemas heredados del `index.html`

```css
/* PROBLEMA: .yruleCursor declarado DOS VECES con fills distintos */
.yruleCursor {
  fill: white;
} /* Línea 30-37 */
.yruleCursor {
  fill: #292929;
} /* Línea 45-49: ¡gana por cascada! */

/* PROBLEMA: .boxChart vacío */
.boxChart {
} /* Clase usada para jQuery draggable */
```

#### Solución: CSS Custom Properties + BEM

```css
/* src/styles/main.css */
:root {
  --bg-primary: #0a0a0a;
  --fg-primary: #ffffff;
  --up-color: #4caf50;
  --down-color: #f44336;
  --grid-line: #47474744;
  --crosshair: #888888;
  --font-family: 'Verdana', sans-serif;
  --font-size-small: 0.61rem;
}

.chart-container {
  display: grid;
  grid-template-rows: 60% 40%; /* candle arriba, volume abajo */
  gap: 2px;
  height: 100vh;
  width: 100vw;
  background: var(--bg-primary);
  overflow: hidden;
  position: relative;
}

.candle-layer,
.volume-layer {
  width: 100%;
  height: 100%;
  overflow: hidden;
}

/* Responsive: tablet (hasta 768px) */
@media (max-width: 768px) {
  .chart-container {
    grid-template-rows: 70% 30%; /* Más espacio para candle en móvil */
  }
}
```

**Eliminar completamente**: jQuery UI, jQuery, `String.prototype.format()`, funciones globales `min()`, `max()`.

### 4.5 Toolchain y Calidad

| Herramienta             | Versión | Uso                  | Nota                                  |
| ----------------------- | ------- | -------------------- | ------------------------------------- |
| **Vite**                | 5.x     | Bundler y dev server | `template: vanilla-ts`                |
| **TypeScript**          | 5.x     | Tipado estático      | `strict: true`, `noImplicitAny: true` |
| **Vitest**              | 1.x     | Tests unitarios      | con `@vitest/coverage-v8`             |
| **Playwright**          | 1.x     | Tests E2E + visual   | Snapshots en CI                       |
| **ESLint**              | 9.x     | Lint con TypeScript  | `@typescript-eslint/recommended`      |
| **Prettier**            | 3.x     | Formato              | On save / pre-commit                  |
| **Husky + lint-staged** | latest  | Git hooks            | Bloquea commit si falla lint/test     |

#### CI/CD Pipeline mínima (`.github/workflows/ci.yml`)

```yaml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test:unit -- --coverage
      - run: npm run build
      - run: npm run test:e2e
```

---

## 5. Checklist de Migración Paso a Paso

### Fase 0: Tooling + Datos (2 días)

- [ ] `npm create vite@latest d3-c4ndle -- --template vanilla-ts`
- [ ] Instalar dependencias **de producción**: `d3@7 zod`
- [ ] Instalar dependencias **de desarrollo**: `vitest @vitest/coverage-v8 @playwright/test eslint @eslint/js @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier husky lint-staged`
- [ ] Configurar `vite.config.ts`, `tsconfig.json` (`strict: true`), `vitest.config.ts`
- [ ] Convertir datos legacy de `argentobit.js` a `public/candles.json`
- [ ] Crear `src/types/candle.ts` con `CandleSchema` + tests unitarios

### Fase 1: Dominio + Tests (3 días)

- [ ] Implementar `fetchCandles()` en `src/data/candle.api.ts` con validación `zod`
- [ ] Implementar `InMemoryCandleApi` (opcional, para tests sin red)
- [ ] Tests unitarios: 100% de `CandleSchema`, `format.ts`, `throttle.ts`
- [ ] Configurar coverage gate ≥ 80% en `vitest.config.ts`

### Fase 2: Renderer D3 v7 (5 días)

- [ ] Implementar `CandleLayer` y `VolumeLayer` con D3 v7 `join()`
- [ ] Implementar `ChartRenderer` (orquestador de SVG)
- [ ] Implementar `Scales` (tiempo + precio) con `scaleTime` y `scaleLinear`
- [ ] Snapshot visual Playwright: desktop (1920×1080) y mobile (375×667)
- [ ] **Benchmark de rendimiento**: loguear FPS y tiempo de render con 500/1000/2000 velas

### Fase 3: Interacciones + Responsive + CI (5 días)

- [ ] Implementar `Crosshair.ts` con `requestAnimationFrame` + `.text()` (no innerHTML)
- [ ] Implementar zoom/pan con `d3.zoom` (transforma <g>, no recrea SVG)
- [ ] Implementar `ResizeObserver` para recalcular escalas al cambiar tamaño de ventana
- [ ] Implementar manejo de bordes en tooltip (`getBoundingClientRect`)
- [ ] Responsive: CSS Grid se adapta a viewport sin media queries complejas
- [ ] Setup CI en GitHub Actions (ver arriba)

### Fase 4: Hardening + Release (3 días)

- [ ] Accessibility: `role="img"`, `aria-label` en contenedor de chart, focus visible
- [ ] Sanitización: auditar que ningún `.html()` o `.innerHTML` reciba datos sin sanitizar
- [ ] Bundle audit: `npm run build` y verificar que no empaquete jQuery/D3 v1
- [ ] README nuevo: instrucciones de instalación, desarrollo, testing, deploy
- [ ] Eliminar archivos legacy: `candle.js`, `volume.js`, `common.js`, `argentobit.js`, `index.html` original

---

## 6. Riesgos y Mitigaciones

| Riesgo                                               | Probabilidad | Impacto | Mitigación                                                              |
| ---------------------------------------------------- | ------------ | ------- | ----------------------------------------------------------------------- |
| D3 v7 API breaking changes rompen render             | Alta         | Alto    | `join()` alivia; tests snapshot atraparán diferencias inmediatamente    |
| Performance SVG con >1k velas                        | Media        | Medio   | Benchmark en Fase 2. Si falla, evaluar Canvas 2D en 1 día de spike      |
| Datos legacy inmigrables con validación zod          | Baja         | Medio   | `safeParse` + log detallado para identificar datos inválidos            |
| Seguridad residual (XSS)                             | Baja         | Alto    | Prohibir `innerHTML`; usar `.text()` + `DOMPurify` si es necesario HTML |
| CSS specificity wars (legacy vs nuevo)               | Baja         | Medio   | Purga completa de CSS legacy, no mezclar estilos                        |
| Scope creep: intentar hacer "orden bigger than life" | Alta         | Bajo    | **Criterio de aceptación del MVP es claro y congelado**                 |

---

## 7. Decisiones Arquitectónicas Registradas (ADR)

| ADR     | Título                                    | Rationale                                                                                                 | Fecha      |
| ------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------- |
| **001** | Vanilla TS + D3 v7 sin framework UI       | El proyecto es un gráfico puro. React/Vue añadiría complejidad innecesaria.                               | 2026-06-27 |
| **002** | Zod para validación estricta              | Datos legacy son sucios. Necesitamos fallar rápido ante datos corruptos.                                  | 2026-06-27 |
| **003** | Flat architecture (no Clean Architecture) | Clean Architecture para 2 paneles + 1 dataset es over-engineering. Se mantiene decoupling vía módulos ES. | 2026-06-27 |
| **004** | Playwright para regresión visual          | jsdom no renderiza SVG. Playwright garantiza captura de estados visuales.                                 | 2026-06-27 |
| **005** | No innerHTML / Zod en datos dinámicos     | Prevenir XSS: siempre `.text()` sobre `Selection<HTMLDivElement>`                                         | 2026-06-27 |
| **006** | 4 sprints, no 8                           | Foco en refactor técnico. Features nuevas (WS, i18n, canvas) fuera del MVP.                               | 2026-06-27 |

---

## 8. Próximos Pasos Inmediatos (Hoy)

1. `cd /Users/fabian/code/personal/d3-c4ndle && rm -rf node_modules package-lock.json`
2. `npm create vite@latest . -- --template vanilla-ts --force`
3. `npm i d3 zod`
4. `npm i -D vitest @vitest/coverage-v8 @playwright/test eslint @eslint/js @typescript-eslint/parser @typescript-eslint/eslint-plugin prettier husky lint-staged`
5. Copiar `public/candles.json` con datos limpios extraídos de `argentobit.js`
6. Crear `src/types/candle.ts` + tests unitarios básicos
7. `git add . && git到这里git commit -m "chore: bootstrap Vite + D3 v7 + tooling"`

---

## 9. Referencias Cruzadas

- `docs/relevamiento.md` — inventario original de deuda técnica
- `docs/IMPLEMENTATION_PLAN.md` — este documento (versión revisada)
- Archivos legacy a eliminar: `argentobit.js`, `candle.js`, `volume.js`, `common.js`, `index.html` (original)
- Archivos a eliminar si se migra a Vite: `package.json` antiguo, cualquier lockfile (`yarn.lock`, `package-lock.json`) no generado por npm 9+

---

_Documento finalizado. Para expansiones futuras (WebSocket, i18n, Canvas, React Wrapper), crear nuevo documento `docs/ROADMAP.post-mvp.md`._
