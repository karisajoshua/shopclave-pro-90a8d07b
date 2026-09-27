import { describe, expect, it } from "vitest";
import {
  canTransitionSellerApplication, countryCodeValid, sellerMayReceivePayouts,
  SELLER_ONBOARDING_STEPS,
} from "@/lib/sellerOnboarding";

describe("global seller onboarding foundation", () => {
  it("provides a resumable seven-step flow", () => {
    expect(SELLER_ONBOARDING_STEPS).toEqual([
      "account", "business", "verification", "store", "payout", "agreements", "review",
    ]);
  });
  it("does not permit sellers to skip administrative review", () => {
    expect(canTransitionSellerApplication("draft", "approved")).toBe(false);
    expect(canTransitionSellerApplication("draft", "submitted")).toBe(true);
    expect(canTransitionSellerApplication("submitted", "under_review")).toBe(true);
    expect(canTransitionSellerApplication("under_review", "more_information_required")).toBe(true);
    expect(canTransitionSellerApplication("more_information_required", "submitted")).toBe(true);
    expect(canTransitionSellerApplication("rejected", "approved")).toBe(false);
  });
  it("keeps Barakaz approval separate from payout eligibility", () => {
    expect(sellerMayReceivePayouts("approved", "pending_verification")).toBe(false);
    expect(sellerMayReceivePayouts("under_review", "enabled")).toBe(false);
    expect(sellerMayReceivePayouts("approved", "enabled")).toBe(true);
  });
  it("accepts normalized country codes only", () => {
    expect(countryCodeValid("CA")).toBe(true);
    expect(countryCodeValid("CN")).toBe(true);
    expect(countryCodeValid("Canada")).toBe(false);
  });
});
