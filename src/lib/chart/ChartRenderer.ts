import { select } from 'd3-selection';
import { scaleLinear, scaleTime } from 'd3-scale';
import { axisBottom, axisRight } from 'd3-axis';
import { timeFormat } from 'd3-time-format';
import { min, max } from 'd3-array';
import { zoom, zoomIdentity } from 'd3-zoom';
import { Candle } from '../../types/candle';
import { CandleLayer } from './CandleLayer';
import { VolumeLayer } from './VolumeLayer';
import { Crosshair } from './Crosshair';
import { rafThrottle } from '../../utils/throttle';

export class ChartRenderer {
  private svg: any;
  private xScale: any;
  private baseXScale: any;
  private yPriceScale: any;
  private yVolumeScale: any;
  private margin = { top: 20, right: 80, bottom: 30, left: 60 };
  private candleChart: CandleLayer;
  private volumeChart: VolumeLayer;
  private crosshair: Crosshair;
  private width: number;
  private height: number;
  private zoomBehavior: any;
  private mainGroup: any;

  constructor(
    private container: HTMLElement,
    private data: Candle[]
  ) {
    this.width = container.clientWidth;
    this.height = container.clientHeight;

    this.svg = select(container)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('class', 'chart-svg');

    this.mainGroup = this.svg.append('g').attr('class', 'chart-main');

    const candleG = this.mainGroup.append('g').attr('class', 'candle-layer');
    const volumeG = this.mainGroup.append('g').attr('class', 'volume-layer');

    this.candleChart = new CandleLayer(candleG);
    this.volumeChart = new VolumeLayer(volumeG);
    this.crosshair = new Crosshair(this.svg, this.margin);

    this.setupScales();
    this.setupZoom();
    this.setupCrosshair();
  }

  private setupScales(): void {
    const { margin } = this;

    const timestamps = this.data.map((d: Candle) => new Date(d.timestamp * 1000));
    const minDate = min(timestamps) || new Date();
    const maxDate = max(timestamps) || new Date();

    this.baseXScale = scaleTime()
      .domain([minDate, maxDate])
      .range([margin.left, this.width - margin.right]);
    this.xScale = this.baseXScale.copy();

    const minLow = min(this.data, (d: Candle) => d.low) || 0;
    const maxHigh = max(this.data, (d: Candle) => d.high) || 0;
    this.yPriceScale = scaleLinear()
      .domain([minLow, maxHigh])
      .range([this.height * 0.6, margin.top]);

    const maxVol = max(this.data, (d: Candle) => d.volume) || 0;
    this.yVolumeScale = scaleLinear()
      .domain([0, maxVol])
      .range([this.height - margin.bottom, this.height * 0.62]);
  }

  private setupZoom(): void {
    this.zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 100])
      .translateExtent([
        [this.margin.left, 0],
        [this.width - this.margin.right, this.height],
      ])
      .on('zoom', (event: any) => {
        const transform = event.transform;
        this.xScale = transform.rescaleX(this.baseXScale);

        this.candleChart.render(this.data, this.xScale, this.yPriceScale);
        this.volumeChart.render(this.data, this.xScale, this.yVolumeScale);
        this.drawAxes();
      });

    this.svg.call(this.zoomBehavior);

    this.svg.on('dblclick.zoom', null);
    this.svg.on('dblclick', () => {
      this.setupScales();
      this.render();
      this.svg.transition().duration(300).call(this.zoomBehavior.transform, zoomIdentity);
    });
  }

  private setupCrosshair(): void {
    const svgNode = this.svg.node();
    if (!svgNode) return;

    const handleMouseMove = rafThrottle((event: MouseEvent) => {
      const rect = svgNode.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;
      this.crosshair.update(mouseX, mouseY, this.xScale, this.yPriceScale, this.data);
    });

    svgNode.addEventListener('mousemove', handleMouseMove);
    svgNode.addEventListener('mouseleave', () => {
      this.crosshair.hide();
    });
  }

  render(): void {
    this.candleChart.render(this.data, this.xScale, this.yPriceScale);
    this.volumeChart.render(this.data, this.xScale, this.yVolumeScale);
    this.drawAxes();
    this.drawCurrentPrice();
  }

  private drawCurrentPrice(): void {
    const { margin, width, height } = this;
    const lastClose = this.data[this.data.length - 1]?.close;
    if (lastClose === undefined) return;

    this.mainGroup
      .selectAll('.current-price-line, .current-price-label-bg, .current-price-label')
      .remove();

    const y = this.yPriceScale(lastClose);
    if (y < margin.top || y > height * 0.6) return;

    this.mainGroup
      .append('line')
      .attr('class', 'current-price-line')
      .attr('x1', margin.left)
      .attr('x2', width - margin.right)
      .attr('y1', y)
      .attr('y2', y);

    const priceText = this.formatPrice(lastClose);

    this.mainGroup
      .append('rect')
      .attr('class', 'current-price-label-bg')
      .attr('x', width - margin.right)
      .attr('y', y - 8)
      .attr('width', margin.right - 8)
      .attr('height', 16)
      .attr('fill', 'rgba(10,10,10,0.85)')
      .attr('rx', 2);

    this.mainGroup
      .append('text')
      .attr('class', 'current-price-label')
      .attr('x', width - 6)
      .attr('y', y)
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .text(priceText);
  }

  private formatPrice(value: number): string {
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'k';
    }
    return value.toFixed(2);
  }

  private drawAxes(): void {
    const { margin, width, height } = this;

    this.mainGroup.selectAll('.axis').remove();

    this.mainGroup
      .append('g')
      .attr('class', 'axis x')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(
        axisBottom(this.xScale)
          .ticks(5)
          .tickFormat(timeFormat('%H:%M') as any)
      );

    this.mainGroup
      .append('g')
      .attr('class', 'axis y')
      .attr('transform', `translate(${width - margin.right},0)`)
      .call(axisRight(this.yPriceScale).ticks(5));
  }

  resize(): void {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    this.svg.attr('width', this.width).attr('height', this.height);
    this.setupScales();
    this.render();
  }
}
