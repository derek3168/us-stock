const DEFAULT_RETRIES = 3;
const BASE_DELAY_MS = 400;

export function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** 帶指數退避的 fetch，緩解 Yahoo 限流 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  retries = DEFAULT_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch(url, {
        ...init,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; StockScreener/1.0)",
          ...init?.headers,
        },
      });

      if (res.status === 429 || res.status >= 500) {
        throw new Error(`HTTP ${res.status}`);
      }

      return res;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < retries - 1) {
        await delay(BASE_DELAY_MS * Math.pow(2, attempt));
      }
    }
  }

  throw lastError ?? new Error("fetch 失敗");
}
