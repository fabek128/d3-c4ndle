import { Selection } from 'd3-selection';
import { Candle } from '../../types/candle';

export class CandleLayer {
  constructor(private container: Selection<SVGGElement, unknown, null, undefined>) {}

  render(data: Candle[], xScale: any, yScale: any): void {
    const candleWidth = Math.max(2, ((xScale.range()[1] - xScale.range()[0]) / data.length) * 0.6);

    // Stems (high-low lines)
    this.container
      .selectAll<SVGLineElement, Candle>('line.stem')
      .data(data, (d: Candle) => d.timestamp)
      .join('line')
      .attr('class', 'stem')
      .attr('x1', (d: Candle) => xScale(new Date(d.timestamp * 1000)))
      .attr('x2', (d: Candle) => xScale(new Date(d.timestamp * 1000)))
      .attr('y1', (d: Candle) => yScale(d.high))
      .attr('y2', (d: Candle) => yScale(d.low))
      .attr('stroke', (d: Candle) => (d.close >= d.open ? 'var(--up-color)' : 'var(--down-color)'));

    // Bodies (open-close rectangles)
    this.container
      .selectAll<SVGRectElement, Candle>('rect.candle-body')
      .data(data, (d: Candle) => d.timestamp)
      .join('rect')
      .attr('class', 'candle-body')
      .attr('x', (d: Candle) => xScale(new Date(d.timestamp * 1000)) - candleWidth / 2)
      .attr('y', (d: Candle) => yScale(Math.max(d.open, d.close)))
      .attr('width', candleWidth)
      .attr('height', (d: Candle) => Math.max(1, Math.abs(yScale(d.open) - yScale(d.close))))
      .attr('fill', (d: Candle) => (d.close >= d.open ? 'var(--up-color)' : 'var(--down-color)'))
      .attr('stroke', (d: Candle) => (d.close >= d.open ? 'var(--up-color)' : 'var(--down-color)'));
  }
}
