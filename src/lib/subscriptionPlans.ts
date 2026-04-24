export interface Plan {
  name: string;
  key: string;
  price: number;
  listings: number;
  expires_days: number;
  features: string[];
}

export const PLANS: Plan[] = [
  {
    name: "Free",
    key: "free",
    price: 0,
    listings: 5,
    expires_days: 365,
    features: [
      "5 active listings",
      "Basic store page",
      "Standard support",
    ],
  },
  {
    name: "Basic",
    key: "basic",
    price: 299,
    listings: 15,
    expires_days: 30,
    features: [
      "15 active listings",
      "Store page with logo & banner",
      "WhatsApp & Call buttons",
      "Email support",
    ],
  },
  {
    name: "Standard",
    key: "standard",
    price: 799,
    listings: 60,
    expires_days: 30,
    features: [
      "60 active listings",
      "Everything in Basic",
      "Featured in category pages",
      "Vendor analytics dashboard",
      "Priority email support",
    ],
  },
  {
    name: "Premium",
    key: "premium",
    price: 1999,
    listings: 250,
    expires_days: 30,
    features: [
      "250 active listings",
      "Everything in Standard",
      "Homepage feature rotation",
      "Promoted in search results",
      "Bulk product import",
      "Priority chat support",
    ],
  },
  {
    name: "Enterprise",
    key: "enterprise",
    price: 4999,
    listings: 9999,
    expires_days: 30,
    features: [
      "Unlimited listings",
      "Everything in Premium",
      "Top placement across the site",
      "Dedicated account manager",
      "Custom store branding",
      "24/7 priority support",
    ],
  },
];

export const getPlanLimit = (planName?: string | null): number => {
  if (!planName) return 5;
  const found = PLANS.find((p) => p.key === planName.toLowerCase() || p.name.toLowerCase() === planName.toLowerCase());
  return found?.listings ?? 5;
};

export const isAdminUnlimited = (roles: string[] | undefined | null): boolean => {
  return Array.isArray(roles) && roles.includes("admin");
};
