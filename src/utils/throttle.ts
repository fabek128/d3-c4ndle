/* eslint-disable @typescript-eslint/no-explicit-any */
export function rafThrottle<T extends (...args: any[]) => void>(
  fn: T
): (...args: Parameters<T>) => void {
  let ticking = false;
  let lastArgs: Parameters<T> | null = null;

  return (...args: Parameters<T>) => {
    lastArgs = args;
    if (!ticking) {
      requestAnimationFrame(() => {
        if (lastArgs) {
          fn(...lastArgs);
          lastArgs = null;
        }
        ticking = false;
      });
      ticking = true;
    }
  };
}

export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}
