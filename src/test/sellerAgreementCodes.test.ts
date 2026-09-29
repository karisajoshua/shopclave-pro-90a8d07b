import { describe, it, expect } from "vitest";
import { SELLER_POLICY_CODES } from "@/components/vendor/SellerAgreements";

// Must match the list enforced by submit_seller_application on the server.
const SERVER_REQUIRED = ["seller_terms","commission_payout","shipping_fulfillment","returns_refunds","prohibited_products","product_authenticity"];

describe("seller agreement codes", () => {
  it("match the six agreements the server requires", () => {
    expect([...SELLER_POLICY_CODES].sort()).toEqual([...SERVER_REQUIRED].sort());
  });
});
