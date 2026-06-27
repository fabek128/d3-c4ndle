import { InMemoryCandleApi } from './data/candle.api';
import { sampleCandles } from './data/fixtures';
import { ChartRenderer } from './lib/chart/ChartRenderer';
import './styles/main.css';

async function init() {
  const api = new InMemoryCandleApi(sampleCandles);
  const candles = await api.fetchCandles();

  const container = document.getElementById('app') as HTMLElement;
  if (!container) {
    throw new Error('Container #app not found');
  }

  const chart = new ChartRenderer(container, candles);

  // Handle window resize
  const resizeObserver = new ResizeObserver(() => {
    chart.resize();
  });
  resizeObserver.observe(container);

  // Initial render
  chart.render();
}

init().catch(error => {
  console.error('Failed to initialize chart:', error);
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = `<div style="color: var(--down-color); padding: 20px;">Error: ${error instanceof Error ? error.message : 'Unknown error'}</div>`;
  }
});
