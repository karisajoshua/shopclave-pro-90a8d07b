// FX rate fetcher with localStorage caching. Base currency: KES (storage currency).
const CACHE_KEY = "barakaz_fx_rates_v1";
const TTL_MS = 12 * 60 * 60 * 1000; // 12h

interface FxCache {
  ts: number;
  base: string;
  rates: Record<string, number>;
}

let inflight: Promise<FxCache | null> | null = null;

export async function getFxRates(): Promise<FxCache | null> {
  // memory + localStorage cache
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed: FxCache = JSON.parse(raw);
      if (Date.now() - parsed.ts < TTL_MS && parsed.rates && parsed.base === "KES") {
        return parsed;
      }
    }
  } catch {}

  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch("https://open.er-api.com/v6/latest/KES");
      if (!res.ok) throw new Error("fx http");
      const data = await res.json();
      if (!data?.rates) throw new Error("fx shape");
      const cache: FxCache = { ts: Date.now(), base: "KES", rates: data.rates };
      try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch {}
      return cache;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export function convertFromKES(amountKES: number, targetCurrency: string, rates: Record<string, number> | null | undefined): number | null {
  if (!rates) return null;
  if (targetCurrency === "KES") return amountKES;
  const r = rates[targetCurrency];
  if (typeof r !== "number" || !isFinite(r) || r <= 0) return null;
  return amountKES * r;
}
