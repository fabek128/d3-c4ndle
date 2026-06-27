import { Selection } from 'd3-selection';
import { Candle } from '../../types/candle';

export class VolumeLayer {
  constructor(private container: Selection<SVGGElement, unknown, null, undefined>) {}

  render(data: Candle[], xScale: any, yScale: any): void {
    const barWidth = Math.max(2, ((xScale.range()[1] - xScale.range()[0]) / data.length) * 0.6);

    this.container
      .selectAll<SVGRectElement, Candle>('rect.volume-bar')
      .data(data, (d: Candle) => d.timestamp)
      .join('rect')
      .attr('class', 'volume-bar')
      .attr('x', (d: Candle) => xScale(new Date(d.timestamp * 1000)) - barWidth / 2)
      .attr('y', (d: Candle) => yScale(d.volume))
      .attr('width', barWidth)
      .attr('height', (d: Candle) => Math.max(1, yScale(0) - yScale(d.volume)))
      .attr('fill', (d: Candle) => (d.close >= d.open ? 'var(--up-color)' : 'var(--down-color)'))
      .attr('fill-opacity', 0.5);
  }
}
