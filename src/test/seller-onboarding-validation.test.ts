import { describe, expect, it } from "vitest";
import { INITIAL_SELLER_DRAFT, validateSellerStep } from "@/lib/sellerOnboarding";

const complete={...INITIAL_SELLER_DRAFT,full_name:"Jane Seller",phone:"+14165550123",business_type:"company" as const,legal_name:"Seller Company",registration_number:"REG-123",address:"Real address",category:"Apparel",store_name:"Jane Store",store_description:"Genuine products",logo_url:"https://example.com/logo.jpg",product_categories:["category-id"],ship_from:"Real warehouse",return_address:"Real returns address"};
describe("seller onboarding validation",()=>{
 it("requires identity details before leaving account",()=>expect(validateSellerStep(1,INITIAL_SELLER_DRAFT)).toBeTruthy());
 it("requires a registration number for registered businesses",()=>expect(validateSellerStep(2,{...complete,registration_number:""})).toContain("registered"));
 it("does not require a registration number for individuals",()=>expect(validateSellerStep(2,{...complete,business_type:"individual",registration_number:""})).toBeNull());
 it("requires all store and logistics details",()=>expect(validateSellerStep(4,{...complete,ship_from:""})).toBeTruthy());
 it("accepts complete required information",()=>{expect(validateSellerStep(1,complete)).toBeNull();expect(validateSellerStep(2,complete)).toBeNull();expect(validateSellerStep(4,complete)).toBeNull();});
});
