import { describe, it, expect } from 'vitest';
import { abbreviateNumber, formatTooltip, formatDate } from '../../src/utils/format';

describe('abbreviateNumber', () => {
  it('returns fixed 2 decimals for values < 1000', () => {
    expect(abbreviateNumber(500)).toBe('500.00');
  });

  it('abbreviates thousands with k', () => {
    expect(abbreviateNumber(2500)).toBe('2.5k');
  });

  it('abbreviates millions with m', () => {
    expect(abbreviateNumber(1500000)).toBe('1.5m');
  });
});

describe('formatTooltip', () => {
  it('formats candle data safely (no HTML injection)', () => {
    const candle = {
      timestamp: 1728432000,
      open: 64500.0,
      high: 64800.0,
      low: 64200.0,
      close: 64750.0,
      volume: 1200.5,
    };

    const result = formatTooltip(candle);
    expect(result).toContain('Apertura: 64500.00');
    expect(result).toContain('Volumen:');
    expect(result).not.toContain('<script>');
  });
});

describe('formatDate', () => {
  it('formats timestamp to ISO date', () => {
    expect(formatDate(1728432000)).toBe('2024-10-09');
  });
});
