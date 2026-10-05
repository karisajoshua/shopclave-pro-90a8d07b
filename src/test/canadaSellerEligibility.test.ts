import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const connect = readFileSync(resolve(process.cwd(), "supabase/functions/seller-stripe-connect/index.ts"), "utf8");

describe("Canada-only seller Connect eligibility", () => {
  it("rejects non-CA seller countries before any Stripe call", () => {
    const guard = connect.indexOf('a.country!=="CA"');
    expect(guard).toBeGreaterThan(0);
    // Guard must run before the rules lookup and before any Stripe request.
    expect(connect.indexOf('seller_country_requirements')).toBeGreaterThan(guard);
    expect(connect.indexOf('stripeRequest("v2/core/accounts"')).toBeGreaterThan(guard);
  });

  it("requires a reviewed, Stripe-enabled country rule row (fail-closed)", () => {
    expect(connect).toContain('.eq("stripe_connect_enabled",true)');
    expect(connect).toContain('.not("reviewed_at","is",null)');
    expect(connect).toContain("Stripe Connect onboarding is not enabled for this seller country/type");
  });

  it("keeps live Connect gated behind the explicit flag", () => {
    expect(connect).toContain("connectKeyAllowed(secret,Deno.env.get(\"STRIPE_LIVE_CONNECT_ENABLED\"))");
    expect(connect).toContain("Live Stripe Connect onboarding is disabled");
  });

  it("never creates accounts for unauthenticated or non-draft sellers", () => {
    expect(connect).toContain('["draft","more_information_required","submitted","under_review","approved"].includes(a.status)');
    expect(connect.indexOf("Unauthorized")).toBeGreaterThan(0);
  });
});
