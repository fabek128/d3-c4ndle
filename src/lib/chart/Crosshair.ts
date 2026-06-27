import { select } from 'd3-selection';
import { Candle } from '../../types/candle';
import { formatTooltip, abbreviateNumber } from '../../utils/format';

export class Crosshair {
  private lineX: any;
  private lineY: any;
  private tooltip: any;
  private mousePriceLine: any;
  private mousePriceLabel: any;
  private containerWidth: number;
  private containerHeight: number;

  constructor(
    private svg: any,
    private margin: { top: number; right: number; bottom: number; left: number }
  ) {
    this.lineX = svg.append('line').attr('class', 'crosshair-line').style('display', 'none');
    this.lineY = svg.append('line').attr('class', 'crosshair-line').style('display', 'none');

    this.mousePriceLine = svg
      .append('line')
      .attr('class', 'mouse-price-line')
      .style('display', 'none');

    this.mousePriceLabel = svg
      .append('text')
      .attr('class', 'mouse-price-label')
      .attr('text-anchor', 'end')
      .attr('dominant-baseline', 'middle')
      .style('display', 'none');

    this.tooltip = select(document.body)
      .append('div')
      .attr('class', 'tooltip')
      .style('display', 'none');
    this.containerWidth = 0;
    this.containerHeight = 0;
  }

  update(mouseX: number, mouseY: number, xScale: any, yScale: any, data: Candle[]): void {
    this.updateDimensions();
    const { margin, containerWidth, containerHeight } = this;

    if (
      mouseX < margin.left ||
      mouseX > containerWidth - margin.right ||
      mouseY < margin.top ||
      mouseY > containerHeight - margin.bottom
    ) {
      this.hide();
      return;
    }

    this.lineX
      .style('display', null)
      .attr('x1', margin.left)
      .attr('x2', containerWidth - margin.right)
      .attr('y1', mouseY)
      .attr('y2', mouseY);

    this.lineY
      .style('display', null)
      .attr('x1', mouseX)
      .attr('x2', mouseX)
      .attr('y1', margin.top)
      .attr('y2', containerHeight - margin.bottom);

    const price = yScale.invert(mouseY);
    this.mousePriceLine
      .style('display', null)
      .attr('x1', margin.left)
      .attr('x2', containerWidth - margin.right)
      .attr('y1', mouseY)
      .attr('y2', mouseY);

    this.mousePriceLabel
      .style('display', null)
      .attr('x', containerWidth - 6)
      .attr('y', mouseY)
      .text(abbreviateNumber(price));

    const timestamp = xScale.invert(mouseX).getTime() / 1000;
    const candle = data.reduce((nearest, current) => {
      return Math.abs(current.timestamp - timestamp) < Math.abs(nearest.timestamp - timestamp)
        ? current
        : nearest;
    });

    if (candle) {
      this.positionTooltip(mouseX, mouseY);
      this.tooltip.text(formatTooltip(candle));
    }
  }

  hide(): void {
    this.lineX.style('display', 'none');
    this.lineY.style('display', 'none');
    this.mousePriceLine.style('display', 'none');
    this.mousePriceLabel.style('display', 'none');
    this.tooltip.style('display', 'none');
  }

  private positionTooltip(mx: number, my: number): void {
    const tooltipNode = this.tooltip.node() as HTMLElement | null;
    if (!tooltipNode) return;

    this.tooltip.style('display', 'block');

    const tooltipRect = tooltipNode.getBoundingClientRect();
    const svgRect = this.svg.node()?.getBoundingClientRect() || {
      left: 0,
      top: 0,
      width: 0,
      height: 0,
    };

    let left = mx + 15;
    let top = my + 15;

    if (left + tooltipRect.width > svgRect.width) {
      left = mx - tooltipRect.width - 15;
    }
    if (top + tooltipRect.height > svgRect.height) {
      top = my - tooltipRect.height - 15;
    }

    this.tooltip.style('left', `${left}px`).style('top', `${top}px`);
  }

  private updateDimensions(): void {
    const node = this.svg.node();
    this.containerWidth = node?.clientWidth || 800;
    this.containerHeight = node?.clientHeight || 600;
  }
}
