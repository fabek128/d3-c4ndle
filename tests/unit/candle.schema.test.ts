import { describe, it, expect } from 'vitest';
import { CandleSchema, validateCandles, validateCandle } from '../../src/types/candle';

describe('CandleSchema', () => {
  const validCandle = {
    timestamp: 1728432000,
    open: 64500.0,
    high: 64800.0,
    low: 64200.0,
    close: 64750.0,
    volume: 1200.5,
  };

  it('validates a correct candle', () => {
    expect(CandleSchema.parse(validCandle)).toEqual(validCandle);
  });

  it('rejects negative timestamp', () => {
    expect(() => CandleSchema.parse({ ...validCandle, timestamp: -1 })).toThrow();
  });

  it('rejects negative volume', () => {
    expect(() => CandleSchema.parse({ ...validCandle, volume: -100 })).toThrow();
  });

  it('rejects missing required field', () => {
    const { high: _h, ...missingHigh } = validCandle;
    expect(() => CandleSchema.parse(missingHigh)).toThrow();
  });

  it('rejects non-numeric values', () => {
    expect(() => CandleSchema.parse({ ...validCandle, open: 'not-a-number' })).toThrow();
  });
});

describe('validateCandles', () => {
  it('validates array of candles', () => {
    const data = [
      { timestamp: 1728432000, open: 100, high: 110, low: 90, close: 105, volume: 1000 },
      { timestamp: 1728432600, open: 105, high: 115, low: 100, close: 110, volume: 2000 },
    ];
    expect(validateCandles(data)).toHaveLength(2);
  });

  it('throws for non-array input', () => {
    expect(() => validateCandles('not-an-array')).toThrow('Expected array of candles');
  });

  it('throws with index information for invalid candle', () => {
    const data = [
      { timestamp: 1728432000, open: 100, high: 110, low: 90, close: 105, volume: 1000 },
      { timestamp: -1, open: 100, high: 110, low: 90, close: 105, volume: 1000 },
    ];
    expect(() => validateCandles(data)).toThrow('Invalid candle at index 1');
  });
});

describe('validateCandle', () => {
  it('validates single candle', () => {
    const candle = {
      timestamp: 1728432000,
      open: 100,
      high: 110,
      low: 90,
      close: 105,
      volume: 1000,
    };
    expect(validateCandle(candle)).toEqual(candle);
  });
});
