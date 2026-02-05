export * from './crypto';
export * from './logger';
export * from './validation';
export * from './errors';

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isDefined<T>(value: T | undefined | null): value is T {
  return value !== undefined && value !== null;
}

export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj } as Omit<T, K>;
  for (const key of keys) {
    delete (result as Record<string, unknown>)[key as string];
  }
  return result;
}

export function groupBy<T>(
  array: T[],
  keyGetter: (item: T) => string
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  for (const item of array) {
    const key = keyGetter(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
  }
  return groups;
}

export function calculateStandardDeviation(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length;
  const variance =
    numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) /
    numbers.length;
  return Math.sqrt(variance);
}

export function calculateZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function calculateMovingAverage(
  values: number[],
  windowSize: number
): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = values.slice(start, i + 1);
    const avg = window.reduce((a, b) => a + b, 0) / window.length;
    result.push(avg);
  }
  return result;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)(ms|s|m|h|d)$/);
  if (!match) throw new Error('Invalid duration format');
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60000,
    h: 3600000,
    d: 86400000
  };
  return value * multipliers[unit];
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function generateRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
}

export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function mergeDeep<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>
): T {
  const result = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object') {
      result[key] = mergeDeep(
        result[key] as Record<string, unknown>,
        source[key] as Record<string, unknown>
      ) as T[Extract<keyof T, string>];
    } else {
      result[key] = source[key] as T[Extract<keyof T, string>];
    }
  }
  return result;
}
