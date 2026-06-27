import { Candle } from '../types/candle';

function generateMockCandles(count: number, startTimestamp: number): Candle[] {
  const candles: Candle[] = [];
  let price = 50000 + Math.random() * 5000;
  const interval = 3600;

  for (let i = 0; i < count; i++) {
    const change = (Math.random() - 0.48) * price * 0.02;
    const open = price;
    const close = +(price + change).toFixed(2);
    const high = +(Math.max(open, close) + Math.random() * Math.abs(change) * 2).toFixed(2);
    const low = +(Math.min(open, close) - Math.random() * Math.abs(change) * 2).toFixed(2);
    const volume = +(Math.random() * 5000 + 200).toFixed(2);

    candles.push({
      timestamp: startTimestamp + i * interval,
      open,
      high: Math.max(high, open, close),
      low: Math.min(low, open, close),
      close,
      volume,
    });

    price = close;
  }

  return candles;
}

const startTimestamp = 1704067200;
export const sampleCandles: Candle[] = generateMockCandles(300, startTimestamp);
