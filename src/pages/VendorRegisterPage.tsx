import LegacyVendorRegisterPage from "./LegacyVendorRegisterPage";
import SellerOnboardingV2Page from "./SellerOnboardingV2Page";

const sellerOnboardingV2Enabled =
  import.meta.env.VITE_SELLER_ONBOARDING_V2_ENABLED === "true";

export default function VendorRegisterPage() {
  return sellerOnboardingV2Enabled
    ? <SellerOnboardingV2Page />
    : <LegacyVendorRegisterPage />;
}
