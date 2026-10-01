import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { normalizeSelection, resolveVariant, isOptionValueAvailable, getPurchaseState, clampQuantity, remainingForCart } from "@/lib/productPurchase";

const variants = [
  { id: "a", stock: 3, variant_options: { Color: "Red", Size: "M" } },
  { id: "b", stock: 0, variant_options: { Color: "Red", Size: "L" } },
  { id: "c", stock: 5, variant_options: { Color: "Blue", Size: "L" } },
];
const types = { Color: ["Red", "Blue"], Size: ["M", "L"] };
const keys = Object.keys(types);

describe("variant selection", () => {
  it("never silently defaults multi-value options", () => {
    expect(normalizeSelection(types, {})).toEqual({});
    expect(normalizeSelection({ Size: ["One"] }, {})).toEqual({ Size: "One" });
    expect(normalizeSelection(types, { Color: "Green", Size: "M" })).toEqual({ Size: "M" });
  });
  it("disables unavailable combinations", () => {
    expect(isOptionValueAvailable(variants, { Color: "Red" }, "Size", "L")).toBe(false);
    expect(isOptionValueAvailable(variants, { Color: "Red" }, "Size", "M")).toBe(true);
    expect(isOptionValueAvailable(variants, { Size: "M" }, "Color", "Blue")).toBe(false);
  });
  it("blocks purchase until every option is chosen", () => {
    const s = getPurchaseState({ hasVariants: true, optionKeys: keys, selected: { Color: "Red" }, variant: null, productStock: 99 });
    expect(s).toMatchObject({ canBuy: false, reason: "select_options" });
  });
  it("uses the variant stock, not product stock", () => {
    const sel = { Color: "Red", Size: "L" };
    const v = resolveVariant(variants, keys, sel);
    expect(getPurchaseState({ hasVariants: true, optionKeys: keys, selected: sel, variant: v, productStock: 99 })).toMatchObject({ canBuy: false, reason: "out_of_stock" });
    const sel2 = { Color: "Red", Size: "M" };
    expect(getPurchaseState({ hasVariants: true, optionKeys: keys, selected: sel2, variant: resolveVariant(variants, keys, sel2), productStock: 99 })).toEqual({ canBuy: true, maxQty: 3, reason: null });
  });
});

describe("quantity", () => {
  it("caps by stock and floors at 1", () => {
    expect(clampQuantity(10, 3)).toBe(3);
    expect(clampQuantity(0, 3)).toBe(1);
    expect(clampQuantity(NaN, 3)).toBe(1);
    expect(remainingForCart(3, 2)).toBe(1);
    expect(remainingForCart(3, 5)).toBe(0);
  });
});

describe("product page wiring", () => {
  const src = readFileSync("src/pages/ProductDetailPage.tsx", "utf8");
  const gallery = readFileSync("src/components/product/ProductGallery.tsx", "utf8");
  const details = readFileSync("src/components/product/ProductDescriptionTabs.tsx", "utf8");
  it("desktop and mobile actions share one guarded handler with quantity", () => {
    expect(src.match(/handlePurchase\("cart"\)/g)?.length).toBe(2);
    expect(src.match(/handlePurchase\("buy"\)/g)?.length).toBe(2);
    expect(src).toMatch(/\}, qtyToAdd\);/);
  });
  it("removes fabricated social proof and uses CAD schema", () => {
    expect(src).not.toMatch(/seededRandom|getDisplayVendorPerformance|getDisplayProductRating|viewing this right now/);
    expect(src).toContain('priceCurrency: "CAD"');
    expect(src).not.toContain('"KES"');
  });
  it("keeps purchase controls consistent and stock-capped", () => {
    expect(src).toContain('disabled={!purchase.canBuy || qty >= purchase.maxQty}');
    expect(src).toContain('remainingForCart(purchase.maxQty, inCart)');
    expect(src).toContain('variantId: selectedVariant?.id');
  });
  it("offers both dated delivery choices and carries the preference to checkout", () => {
    const checkout = readFileSync("src/pages/CheckoutPage.tsx", "utf8");
    expect(src).toContain('normalizeShippingOptions');
    expect(src).toContain("Estimated delivery {option.arrival}");
    expect(src).toContain("saveDeliveryPreference(product.vendor_id, selectedDelivery)");
    expect(checkout).toContain("readDeliveryPreference(v.vendor_id)");
  });
  it("provides accessible gallery controls and mobile swipe", () => {
    expect(gallery).toContain('aria-label="Previous product image"');
    expect(gallery).toContain('aria-label="Next product image"');
    expect(gallery).toContain('onTouchStart');
    expect(gallery).toContain('Gallery position');
    expect(src).toContain("const defaults = general.length ? general : sortedImages");
    expect(gallery).toContain("event.currentTarget.src = barakazIcon");
  });
  it("uses real review totals in the content tabs", () => {
    expect(details).toContain('Reviews ({reviewCount})');
    expect(details).toContain('ProductReviews productId={productId}');
    expect(details).not.toContain('Questions');
  });
  it("shows saved product specifications and expands long content", () => {
    expect(details).toContain('Package dimensions');
    expect(details).toContain("meta?.option_values");
    expect(details).toContain("Show more");
    expect(src).toContain("option_values: optionTypes");
    expect(src).toContain("weight_g: product.weight_g");
  });
});

describe("marketplace product card", () => {
  const card = readFileSync("src/components/marketplace/ProductCard.tsx", "utf8");
  it("shows a consistent row under the title: stars, review count and sold", () => {
    expect(card).toContain("displayReviewCount");
    expect(card).toContain("{displaySoldCount} sold");
    expect(card).toMatch(/aria-label=\{`Rated \${displayRating} out of 5/);
  });
  it("uses deterministic temporary fallbacks without writing review or order records", () => {
    const displayStats = readFileSync("src/lib/productDisplayStats.ts", "utf8");
    expect(card).toContain("getProductDisplayStats");
    expect(displayStats).toContain("hasRealReviews ? realRating");
    expect(displayStats).toContain("hasRealSold ? realSoldCount");
    expect(displayStats).not.toMatch(/Math\.random|supabase/);
  });
  it("falls back to the real stats hook when a list omits stats", () => {
    expect(card).toContain("useProductRatings(needsStats ? [id] : [])");
    expect(card).toContain("stats?.[id]?.sold");
  });
  it("shows only real stock, delivery, and seller verification signals", () => {
    expect(card).toContain("stock != null && stock > 0 && stock <= 5");
    expect(card).toContain("handlingTimeDays == null ? null");
    expect(card).toContain("verifiedSeller ?");
  });
});
