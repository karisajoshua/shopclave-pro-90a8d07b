import { useState, useEffect } from "react";

const TIMEZONE_TO_COUNTRY: Record<string, { code: string; name: string; currency: string; currencySymbol: string }> = {
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

const DEFAULT_LOCALE = { code: "KE", name: "Kenya", currency: "KES", currencySymbol: "KSh" };

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
  const [country, setCountry] = useState(DEFAULT_LOCALE);
  const [language, setLanguage] = useState(() => localStorage.getItem("barakaz_lang") || "EN");

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const detected = TIMEZONE_TO_COUNTRY[tz];
      if (detected) setCountry(detected);
    } catch {}
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
