import { z } from 'zod';

export const CandleSchema = z.object({
  timestamp: z.number().int().positive(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number().nonnegative(),
});

export type Candle = z.infer<typeof CandleSchema>;

export function validateCandles(data: unknown): Candle[] {
  if (!Array.isArray(data)) {
    throw new Error('Expected array of candles');
  }
  return data.map((item, index) => {
    try {
      return CandleSchema.parse(item);
    } catch (error) {
      throw new Error(
        `Invalid candle at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  });
}

export function validateCandle(data: unknown): Candle {
  return CandleSchema.parse(data);
}
