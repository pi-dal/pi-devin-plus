/**
 * Up to three attempts for transient network-level failures ("fetch failed",
 * ECONNRESET, socket hang-up) behind proxies/TUN. Backoff 0.4/0.8/1.6 s with
 * jitter. Retries only when fetch() itself rejects — once response headers
 * arrive, the stream is owned by the caller and is never replayed.
 */
export async function fetchWithRetry(
  input: string,
  init: RequestInit,
  shouldRetry?: (error: unknown) => boolean,
  signal?: AbortSignal,
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (signal?.aborted) throw new Error("Aborted");
    try {
      return await fetch(input, { ...init, signal });
    } catch (error) {
      if (signal?.aborted) throw new Error("Aborted");
      lastError = error;
      if (attempt === 2 || shouldRetry?.(error) === false) throw error;
      await new Promise((resolve) => setTimeout(resolve, (400 << attempt) + Math.floor(Math.random() * 400)));
    }
  }
  throw lastError;
}

export function isTransientNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = `${error.name}: ${error.message}`;
  return (
    message.startsWith("TypeError: fetch failed") ||
    message.includes("ECONNRESET") ||
    message.includes("ECONNREFUSED") ||
    message.includes("ETIMEDOUT") ||
    message.includes("EAI_AGAIN") ||
    message.includes("UND_ERR_SOCKET") ||
    message.includes("socket hang up")
  );
}
