export class TimeoutError extends Error {}

export async function withTimeout<T>(fn: () => Promise<T> | T, ms: number, label = "operation"): Promise<T> {
  return Promise.race([
    Promise.resolve().then(fn),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new TimeoutError(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}
