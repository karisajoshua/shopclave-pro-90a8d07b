export interface Plan {
  name: string;
  key: string;
  price: number;
  listings: number;
  expires_days: number;
}

export const PLANS: Plan[] = [
  { name: "Free", key: "free", price: 0, listings: 5, expires_days: 365 },
  { name: "Basic", key: "basic", price: 500, listings: 10, expires_days: 30 },
  { name: "Standard", key: "standard", price: 1500, listings: 50, expires_days: 30 },
  { name: "Premium", key: "premium", price: 5000, listings: 200, expires_days: 30 },
  { name: "Enterprise", key: "enterprise", price: 15000, listings: 1000, expires_days: 30 },
];

export const getPlanLimit = (planName?: string | null): number => {
  if (!planName) return 5;
  const found = PLANS.find((p) => p.key === planName.toLowerCase() || p.name.toLowerCase() === planName.toLowerCase());
  return found?.listings ?? 5;
};

export const isAdminUnlimited = (roles: string[] | undefined | null): boolean => {
  return Array.isArray(roles) && roles.includes("admin");
};
