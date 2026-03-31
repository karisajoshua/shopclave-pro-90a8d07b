import { useState, useEffect } from "react";

interface CountryInfo {
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
}

const TIMEZONE_TO_COUNTRY: Record<string, CountryInfo> = {
  "Africa/Nairobi": { code: "KE", name: "Kenya", currency: "KES", currencySymbol: "KSh" },
  "Africa/Lagos": { code: "NG", name: "Nigeria", currency: "NGN", currencySymbol: "₦" },
  "Africa/Johannesburg": { code: "ZA", name: "South Africa", currency: "ZAR", currencySymbol: "R" },
  "Africa/Dar_es_Salaam": { code: "TZ", name: "Tanzania", currency: "TZS", currencySymbol: "TSh" },
  "Africa/Kampala": { code: "UG", name: "Uganda", currency: "UGX", currencySymbol: "USh" },
  "Africa/Accra": { code: "GH", name: "Ghana", currency: "GHS", currencySymbol: "GH₵" },
  "Africa/Cairo": { code: "EG", name: "Egypt", currency: "EGP", currencySymbol: "E£" },
  "Africa/Mogadishu": { code: "SO", name: "Somalia", currency: "SOS", currencySymbol: "Sh" },
  "America/New_York": { code: "US", name: "United States", currency: "USD", currencySymbol: "$" },
  "America/Chicago": { code: "US", name: "United States", currency: "USD", currencySymbol: "$" },
  "America/Denver": { code: "US", name: "United States", currency: "USD", currencySymbol: "$" },
  "America/Los_Angeles": { code: "US", name: "United States", currency: "USD", currencySymbol: "$" },
  "America/Toronto": { code: "CA", name: "Canada", currency: "CAD", currencySymbol: "CA$" },
  "America/Vancouver": { code: "CA", name: "Canada", currency: "CAD", currencySymbol: "CA$" },
  "Europe/London": { code: "GB", name: "United Kingdom", currency: "GBP", currencySymbol: "£" },
  "Europe/Paris": { code: "FR", name: "France", currency: "EUR", currencySymbol: "€" },
  "Europe/Berlin": { code: "DE", name: "Germany", currency: "EUR", currencySymbol: "€" },
  "Europe/Madrid": { code: "ES", name: "Spain", currency: "EUR", currencySymbol: "€" },
  "Asia/Dubai": { code: "AE", name: "UAE", currency: "AED", currencySymbol: "AED" },
  "Asia/Kolkata": { code: "IN", name: "India", currency: "INR", currencySymbol: "₹" },
  "Asia/Shanghai": { code: "CN", name: "China", currency: "CNY", currencySymbol: "¥" },
  "Asia/Tokyo": { code: "JP", name: "Japan", currency: "JPY", currencySymbol: "¥" },
  "America/Sao_Paulo": { code: "BR", name: "Brazil", currency: "BRL", currencySymbol: "R$" },
};

// Map of country codes to currency info for IP geolocation results
const COUNTRY_CODE_MAP: Record<string, { currency: string; currencySymbol: string }> = {
  KE: { currency: "KES", currencySymbol: "KSh" },
  NG: { currency: "NGN", currencySymbol: "₦" },
  ZA: { currency: "ZAR", currencySymbol: "R" },
  TZ: { currency: "TZS", currencySymbol: "TSh" },
  UG: { currency: "UGX", currencySymbol: "USh" },
  GH: { currency: "GHS", currencySymbol: "GH₵" },
  EG: { currency: "EGP", currencySymbol: "E£" },
  SO: { currency: "SOS", currencySymbol: "Sh" },
  US: { currency: "USD", currencySymbol: "$" },
  CA: { currency: "CAD", currencySymbol: "CA$" },
  GB: { currency: "GBP", currencySymbol: "£" },
  FR: { currency: "EUR", currencySymbol: "€" },
  DE: { currency: "EUR", currencySymbol: "€" },
  ES: { currency: "EUR", currencySymbol: "€" },
  IT: { currency: "EUR", currencySymbol: "€" },
  NL: { currency: "EUR", currencySymbol: "€" },
  AE: { currency: "AED", currencySymbol: "AED" },
  IN: { currency: "INR", currencySymbol: "₹" },
  CN: { currency: "CNY", currencySymbol: "¥" },
  JP: { currency: "JPY", currencySymbol: "¥" },
  BR: { currency: "BRL", currencySymbol: "R$" },
  AU: { currency: "AUD", currencySymbol: "A$" },
  MX: { currency: "MXN", currencySymbol: "MX$" },
  RW: { currency: "RWF", currencySymbol: "RF" },
  ET: { currency: "ETB", currencySymbol: "Br" },
  SA: { currency: "SAR", currencySymbol: "SAR" },
  PK: { currency: "PKR", currencySymbol: "₨" },
};

const DEFAULT_LOCALE: CountryInfo = { code: "KE", name: "Kenya", currency: "KES", currencySymbol: "KSh" };

const CACHE_KEY = "barakaz_geo_country";

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

export function useLocale() {
  const [country, setCountry] = useState<CountryInfo>(() => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) return JSON.parse(cached);
    } catch {}
    return DEFAULT_LOCALE;
  });
  const [language, setLanguage] = useState(() => localStorage.getItem("barakaz_lang") || "EN");

  useEffect(() => {
    // Check cache first
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        setCountry(JSON.parse(cached));
        return;
      } catch {}
    }

    // Try IP-based geolocation
    const controller = new AbortController();
    fetch("https://ipapi.co/json/", { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("API error");
        return res.json();
      })
      .then((data) => {
        if (data.country_code && data.country_name) {
          const currencyInfo = COUNTRY_CODE_MAP[data.country_code] || {
            currency: data.currency || "USD",
            currencySymbol: data.currency || "$",
          };
          const detected: CountryInfo = {
            code: data.country_code,
            name: data.country_name,
            ...currencyInfo,
          };
          setCountry(detected);
          localStorage.setItem(CACHE_KEY, JSON.stringify(detected));
        }
      })
      .catch(() => {
        // Fallback to timezone detection
        try {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          const detected = TIMEZONE_TO_COUNTRY[tz];
          if (detected) {
            setCountry(detected);
            localStorage.setItem(CACHE_KEY, JSON.stringify(detected));
          }
        } catch {}
      });

    return () => controller.abort();
  }, []);

  const changeLanguage = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem("barakaz_lang", lang);
  };

  const formatPrice = (amount: number) => {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: country.currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount);
    } catch {
      return `${country.currencySymbol} ${amount.toLocaleString()}`;
    }
  };

  return { country, language, changeLanguage, formatPrice, languages: LANGUAGES };
}
