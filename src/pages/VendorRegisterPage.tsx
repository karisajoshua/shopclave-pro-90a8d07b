import LegacyVendorRegisterPage from "./LegacyVendorRegisterPage";
import SellerOnboardingV2Page from "./SellerOnboardingV2Page";

// Fail closed: the new database-backed flow stays OFF unless explicitly enabled.
const enabled = import.meta.env.VITE_SELLER_ONBOARDING_V2_ENABLED === "true";

export default function VendorRegisterPage() {
  return enabled ? <SellerOnboardingV2Page /> : <LegacyVendorRegisterPage />;
}
