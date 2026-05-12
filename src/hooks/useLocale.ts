import { useState, useEffect } from "react";
import { getFxRates, convertFromKES } from "@/lib/fx";

interface CountryInfo {
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
}

// Country code → currency info. Used for IP geo results and manual override.
const COUNTRY_CODE_MAP: Record<string, { name: string; currency: string; currencySymbol: string }> = {
  KE: { name: "Kenya", currency: "KES", currencySymbol: "KSh" },
  NG: { name: "Nigeria", currency: "NGN", currencySymbol: "₦" },
  ZA: { name: "South Africa", currency: "ZAR", currencySymbol: "R" },
  TZ: { name: "Tanzania", currency: "TZS", currencySymbol: "TSh" },
  UG: { name: "Uganda", currency: "UGX", currencySymbol: "USh" },
  GH: { name: "Ghana", currency: "GHS", currencySymbol: "GH₵" },
  EG: { name: "Egypt", currency: "EGP", currencySymbol: "E£" },
  SO: { name: "Somalia", currency: "SOS", currencySymbol: "Sh" },
  RW: { name: "Rwanda", currency: "RWF", currencySymbol: "RF" },
  ET: { name: "Ethiopia", currency: "ETB", currencySymbol: "Br" },
  US: { name: "United States", currency: "USD", currencySymbol: "$" },
  CA: { name: "Canada", currency: "CAD", currencySymbol: "CA$" },
  GB: { name: "United Kingdom", currency: "GBP", currencySymbol: "£" },
  FR: { name: "France", currency: "EUR", currencySymbol: "€" },
  DE: { name: "Germany", currency: "EUR", currencySymbol: "€" },
  ES: { name: "Spain", currency: "EUR", currencySymbol: "€" },
  IT: { name: "Italy", currency: "EUR", currencySymbol: "€" },
  NL: { name: "Netherlands", currency: "EUR", currencySymbol: "€" },
  IE: { name: "Ireland", currency: "EUR", currencySymbol: "€" },
  PT: { name: "Portugal", currency: "EUR", currencySymbol: "€" },
  BE: { name: "Belgium", currency: "EUR", currencySymbol: "€" },
  AE: { name: "UAE", currency: "AED", currencySymbol: "AED" },
  SA: { name: "Saudi Arabia", currency: "SAR", currencySymbol: "SAR" },
  IN: { name: "India", currency: "INR", currencySymbol: "₹" },
  PK: { name: "Pakistan", currency: "PKR", currencySymbol: "₨" },
  CN: { name: "China", currency: "CNY", currencySymbol: "¥" },
  JP: { name: "Japan", currency: "JPY", currencySymbol: "¥" },
  AU: { name: "Australia", currency: "AUD", currencySymbol: "A$" },
  BR: { name: "Brazil", currency: "BRL", currencySymbol: "R$" },
  MX: { name: "Mexico", currency: "MXN", currencySymbol: "MX$" },
};

const FALLBACK_LOCALE: CountryInfo = { code: "KE", name: "Kenya", currency: "KES", currencySymbol: "KSh" };

const CACHE_KEY = "barakaz_geo_country_v3"; // v3 invalidates old "always Kenya" caches
const MANUAL_KEY = "barakaz_geo_country_manual";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

interface CachedGeo {
  ts: number;
  country: CountryInfo;
}

const LANGUAGES = [
  { code: "EN", label: "English" },
  { code: "SW", label: "Kiswahili" },
  { code: "FR", label: "Français" },
  { code: "ES", label: "Español" },
  { code: "AR", label: "العربية" },
  { code: "PT", label: "Português" },
  { code: "DE", label: "Deutsch" },
  { code: "ZH", label: "中文" },
  { code: "SO", label: "Soomaali" },
  { code: "HI", label: "हिन्दी" },
];

function buildCountryFromCode(code: string, fallbackName?: string): CountryInfo | null {
  const upper = code.toUpperCase();
  const info = COUNTRY_CODE_MAP[upper];
  if (info) return { code: upper, ...info };
  if (fallbackName) {
    return { code: upper, name: fallbackName, currency: "USD", currencySymbol: "$" };
  }
  return null;
}

async function detectViaCloudflare(signal: AbortSignal): Promise<CountryInfo | null> {
  try {
    const res = await fetch("https://www.cloudflare.com/cdn-cgi/trace", { signal });
    if (!res.ok) return null;
    const text = await res.text();
    const match = text.match(/^loc=([A-Z]{2})$/m);
    if (!match) return null;
    return buildCountryFromCode(match[1]);
  } catch { return null; }
}

async function detectViaIpwho(signal: AbortSignal): Promise<CountryInfo | null> {
  try {
    const res = await fetch("https://ipwho.is/", { signal });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.success || !data?.country_code) return null;
    return buildCountryFromCode(data.country_code, data.country);
  } catch { return null; }
}

async function detectViaIpapi(signal: AbortSignal): Promise<CountryInfo | null> {
  try {
    const res = await fetch("https://ipapi.co/json/", { signal });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.country_code) return null;
    return buildCountryFromCode(data.country_code, data.country_name);
  } catch { return null; }
}

const CURRENCIES_NO_DECIMALS = new Set(["KES", "UGX", "TZS", "JPY", "RWF", "VND", "KRW", "CLP", "ISK"]);

export function useLocale() {
  // Manual override always wins.
  const [manualOverride, setManualOverride] = useState<CountryInfo | null>(() => {
    try {
      const raw = localStorage.getItem(MANUAL_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  });

  const [detected, setDetected] = useState<CountryInfo | null>(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed: CachedGeo = JSON.parse(raw);
        if (parsed && Date.now() - parsed.ts < CACHE_TTL_MS) return parsed.country;
      }
    } catch {}
    return null;
  });

  const [detecting, setDetecting] = useState<boolean>(() => {
    if (manualOverride) return false;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed: CachedGeo = JSON.parse(raw);
        if (parsed && Date.now() - parsed.ts < CACHE_TTL_MS) return false;
      }
    } catch {}
    return true;
  });

  const [language, setLanguageState] = useState(() => localStorage.getItem("barakaz_lang") || "EN");
  const [rates, setRates] = useState<Record<string, number> | null>(null);

  // Geo detection
  useEffect(() => {
    if (manualOverride) { setDetecting(false); return; }
    // If we already have a fresh cached value, skip
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const parsed: CachedGeo = JSON.parse(raw);
        if (parsed && Date.now() - parsed.ts < CACHE_TTL_MS) {
          setDetected(parsed.country);
          setDetecting(false);
          return;
        }
      }
    } catch {}

    const controller = new AbortController();
    (async () => {
      setDetecting(true);
      const result =
        (await detectViaCloudflare(controller.signal)) ||
        (await detectViaIpwho(controller.signal)) ||
        (await detectViaIpapi(controller.signal));
      if (controller.signal.aborted) return;
      if (result) {
        setDetected(result);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), country: result })); } catch {}
      }
      setDetecting(false);
    })();
    return () => controller.abort();
  }, [manualOverride]);

  // FX rates
  useEffect(() => {
    let cancelled = false;
    getFxRates().then((c) => { if (!cancelled && c) setRates(c.rates); });
    return () => { cancelled = true; };
  }, []);

  const country: CountryInfo = manualOverride || detected || FALLBACK_LOCALE;
  // While detecting and no manual override, surface a friendly placeholder name.
  const displayCountryName = manualOverride
    ? country.name
    : detected
      ? country.name
      : detecting
        ? "Detecting…"
        : country.name;

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    localStorage.setItem("barakaz_lang", lang);
  };

  const setCountryByCode = (code: string) => {
    const next = buildCountryFromCode(code);
    if (!next) return;
    setManualOverride(next);
    try { localStorage.setItem(MANUAL_KEY, JSON.stringify(next)); } catch {}
  };

  const clearManualCountry = () => {
    setManualOverride(null);
    try { localStorage.removeItem(MANUAL_KEY); } catch {}
  };

  const formatPrice = (amountInKES: number) => {
    const target = country.currency;
    // If rates aren't ready, or conversion not available, render as KES to avoid wildly wrong numbers.
    const converted = target === "KES" ? amountInKES : convertFromKES(amountInKES, target, rates);
    if (converted == null) {
      // Fallback: show KES properly even if user is in another country
      try {
        return new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: "KES",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(amountInKES);
      } catch {
        return `KSh ${Math.round(amountInKES).toLocaleString()}`;
      }
    }
    const noDecimals = CURRENCIES_NO_DECIMALS.has(target);
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: target,
        minimumFractionDigits: noDecimals ? 0 : 2,
        maximumFractionDigits: noDecimals ? 0 : 2,
      }).format(converted);
    } catch {
      const rounded = noDecimals ? Math.round(converted) : Math.round(converted * 100) / 100;
      return `${country.currencySymbol} ${rounded.toLocaleString()}`;
    }
  };

  const supportedCountries = Object.entries(COUNTRY_CODE_MAP).map(([code, info]) => ({ code, ...info }));

  return {
    country: { ...country, name: displayCountryName },
    detecting,
    language,
    changeLanguage: setLanguage,
    setLanguage,
    setCountryByCode,
    clearManualCountry,
    formatPrice,
    languages: LANGUAGES,
    supportedCountries,
  };
}
