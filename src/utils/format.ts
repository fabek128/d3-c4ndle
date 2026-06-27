export function abbreviateNumber(value: number): string {
  if (value < 1000) return value.toFixed(2);

  const suffixes = ['', 'k', 'm', 'b', 't'];
  const suffixNum = Math.floor(String(Math.floor(value)).length / 3);
  const shortValue = (value / Math.pow(1000, suffixNum)).toFixed(1);

  return `${shortValue}${suffixes[suffixNum]}`;
}

export function formatTooltip(candle: {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}): string {
  const date = new Date(candle.timestamp * 1000).toLocaleDateString('es-AR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return [
    `Fecha: ${date}`,
    `Apertura: ${candle.open.toFixed(2)}`,
    `Máximo: ${candle.high.toFixed(2)}`,
    `Mínimo: ${candle.low.toFixed(2)}`,
    `Cierre: ${candle.close.toFixed(2)}`,
    `Volumen: ${abbreviateNumber(candle.volume)}`,
  ].join(' | ');
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString().split('T')[0];
}
