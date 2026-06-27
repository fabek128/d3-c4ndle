import { Candle, validateCandles } from '../types/candle';

export interface CandleApi {
  fetchCandles(): Promise<Candle[]>;
}

export class StaticCandleApi implements CandleApi {
  constructor(private readonly url: string) {}

  async fetchCandles(): Promise<Candle[]> {
    const response = await fetch(this.url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const rawData: unknown = await response.json();
    return validateCandles(rawData);
  }
}

export class InMemoryCandleApi implements CandleApi {
  constructor(private readonly data: Candle[]) {}

  async fetchCandles(): Promise<Candle[]> {
    return Promise.resolve(this.data);
  }
}
