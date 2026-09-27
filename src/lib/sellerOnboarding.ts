/** Seller application state is separate from vendor activation and provider payouts. */
export const SELLER_APPLICATION_STATUSES = [
  "draft", "submitted", "under_review", "more_information_required", "approved", "rejected",
] as const;
export type SellerApplicationStatus = typeof SELLER_APPLICATION_STATUSES[number];
export type SellerPayoutStatus = "not_started" | "onboarding" | "pending_verification" | "enabled" | "restricted" | "disabled";
export type SellerBusinessType = "individual" | "sole_proprietor" | "company";
export const SELLER_ONBOARDING_STEPS = ["account", "business", "verification", "store", "payout", "agreements", "review"] as const;
export type SellerOnboardingStep = typeof SELLER_ONBOARDING_STEPS[number];

export const SELLER_STATUS_TRANSITIONS: Readonly<Record<SellerApplicationStatus, readonly SellerApplicationStatus[]>> = {
  draft: ["submitted"],
  submitted: ["under_review"],
  under_review: ["more_information_required", "approved", "rejected"],
  more_information_required: ["submitted"],
  approved: [],
  rejected: [],
};

export function canTransitionSellerApplication(
  current: SellerApplicationStatus,
  next: SellerApplicationStatus,
): boolean {
  return SELLER_STATUS_TRANSITIONS[current]?.includes(next) ?? false;
}

/** UI convenience only: server authorization, document checks and provider state are mandatory. */
export function sellerMayReceivePayouts(
  applicationStatus: SellerApplicationStatus,
  payoutStatus: SellerPayoutStatus,
): boolean {
  return applicationStatus === "approved" && payoutStatus === "enabled";
}

export function countryCodeValid(country: string): boolean {
  return /^[A-Z]{2}$/.test(country);
}
