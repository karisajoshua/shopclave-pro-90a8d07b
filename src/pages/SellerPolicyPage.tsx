import { Link, Navigate, useParams } from "react-router-dom";
import StaticPage from "./StaticPage";

type Section = { heading: string; paragraphs: string[] };
type Policy = { title: string; code: string; version: string; sections: Section[] };

const policies: Record<string, Policy> = {
  "seller-terms": {
    title: "Seller Terms — Canada", code: "seller_terms", version: "ca-v1",
    sections: [
      { heading: "Eligibility and verification", paragraphs: ["Sellers must provide accurate, current and complete identity, contact, business, tax, banking and payout information requested during onboarding or review. False documents, impersonation, concealed required ownership information, fraud and unlawful activity are prohibited. Approval may be suspended or withdrawn if verification fails or material information becomes inaccurate."] },
      { heading: "Independent seller obligations", paragraphs: ["Unless Barakaz expressly states otherwise for a transaction, sellers operate as independent third-party sellers and are responsible for their products, inventory, descriptions, pricing, warranties, regulatory compliance, fulfilment, applicable taxes and legal obligations."] },
      { heading: "Accurate listings and orders", paragraphs: ["Listings must be accurate and not materially misleading. Sellers must accurately disclose material product characteristics, condition, quantity, price, origin where claimed, compatibility, safety information, warranties and restrictions.", "Sellers must honour valid accepted orders except where cancellation is reasonably required by fraud, illegality, inventory error, safety concerns or another legitimate reason recognized by Barakaz. Sellers must not divert customers off-platform to avoid applicable fees or controls."] },
      { heading: "Customer data and conduct", paragraphs: ["Sellers must communicate professionally and may use buyer information only for legitimate fulfilment, service, compliance and other authorized purposes. Discrimination, threats, harassment, deception and improper pressure are prohibited."] },
      { heading: "Compliance and enforcement", paragraphs: ["Sellers must comply with applicable Canadian federal, provincial and territorial requirements and destination requirements for international orders. Barakaz may verify information, investigate complaints, request evidence, remove listings, restrict functionality, suspend sales, apply lawful payout controls, require corrective action or terminate access for material violations.", "These terms incorporate the applicable Barakaz Commission & Payout, Shipping & Fulfilment, Returns & Refunds, Prohibited Products and Product Authenticity policies."] },
    ],
  },
  "commission-payout": {
    title: "Commission & Payout Policy — Canada", code: "commission_payout", version: "ca-v1",
    sections: [
      { heading: "Marketplace fees", paragraphs: ["Barakaz may charge commissions, transaction charges, service fees or other seller charges disclosed through the marketplace, seller dashboard, fee schedule or an agreed commercial arrangement. The fee displayed or agreed for a transaction governs unless law requires otherwise."] },
      { heading: "Payment processing and eligibility", paragraphs: ["Payments and seller payouts may be processed through approved providers including Stripe Connect. Sellers must complete required Barakaz and payment-provider verification.", "Payouts apply only to legitimate completed transactions and remain subject to applicable fees, refunds, reversals, disputes, chargebacks, reserves, adjustments, taxes and authorized deductions. A displayed balance does not guarantee immediate payout."] },
      { heading: "Timing, holds and disputes", paragraphs: ["Payout timing follows the schedule shown to the seller, provider processing requirements, risk controls and banking processing times. Where legally and contractually permitted, payouts may be delayed or reserved for suspected fraud, elevated disputes, unresolved claims, regulatory requirements, incomplete verification, chargebacks, safety investigations or material policy violations.", "Approved refunds, reversals and valid chargebacks may be deducted from current or future seller balances where permitted. Sellers must maintain accurate payout, banking, business and tax information and cooperate with legitimate disputes."] },
      { heading: "Currency", paragraphs: ["Unless expressly stated otherwise for a transaction, Barakaz's primary marketplace selling currency is Canadian dollars (CAD). Currency conversion or international settlement charges may be governed by the relevant provider or financial institution."] },
    ],
  },
  "shipping-fulfillment": {
    title: "Shipping & Fulfilment Policy — Canada", code: "shipping_fulfillment", version: "ca-v1",
    sections: [
      { heading: "Seller responsibility", paragraphs: ["Unless Barakaz expressly provides fulfilment, the seller is responsible for packaging, dispatch and fulfilment. Sellers must maintain reasonably accurate inventory and must not knowingly present unavailable goods as immediately available."] },
      { heading: "Dispatch and tracking", paragraphs: ["Sellers must provide accurate ship-from information, follow the buyer's confirmed shipping option and dispatch within the represented timeframe. Where tracking is available, valid tracking information must be supplied. An order must not be marked shipped before actual dispatch or transfer to the carrier."] },
      { heading: "Packaging and charges", paragraphs: ["Products must be packaged appropriately. Dangerous, regulated, fragile, perishable or restricted goods may require additional packaging, labelling, documentation or carrier approval. Sellers must not impose undisclosed shipping charges after checkout."] },
      { heading: "International orders and performance", paragraphs: ["For international orders, sellers must comply with applicable customs, export, import, product and destination requirements and provide truthful customs information.", "Sellers must cooperate with Barakaz, carriers and buyers on lost, damaged, misdirected or materially delayed shipments. Repeated material fulfilment failures may result in marketplace restrictions or account review."] },
    ],
  },
  "returns-refunds": {
    title: "Returns & Refunds Policy — Canada", code: "returns_refunds", version: "ca-v1",
    sections: [
      { heading: "General principle", paragraphs: ["Sellers must clearly disclose applicable return, exchange and refund conditions and comply with Barakaz requirements and mandatory consumer rights. Nothing in this policy removes rights that cannot lawfully be excluded."] },
      { heading: "Incorrect, damaged or defective products", paragraphs: ["Where a buyer receives the wrong item, a materially misrepresented or counterfeit product, or an item materially different from the confirmed listing, the seller must cooperate in providing an appropriate remedy. Sellers must also reasonably address claims for products received damaged, defective or unusable where the seller is responsible."] },
      { heading: "Returns and refunds", paragraphs: ["Return eligibility, periods, condition requirements and responsibility for return shipping must be disclosed where applicable. Material undisclosed restrictions must not be introduced after purchase. Approved refunds must use Barakaz's authorized payment workflow.", "Legitimate restrictions may apply to certain hygiene, safety, perishable, customized, digital or other products where lawful, but must be clearly disclosed before purchase and remain subject to applicable consumer law."] },
      { heading: "Disputes", paragraphs: ["Sellers must cooperate with Barakaz dispute handling and provide requested transaction, fulfilment and product evidence. Barakaz may investigate buyer or seller abuse and apply proportionate marketplace remedies without limiting mandatory legal rights."] },
    ],
  },
  "prohibited-products": {
    title: "Prohibited Products Policy — Canada", code: "prohibited_products", version: "ca-v1",
    sections: [
      { heading: "General rule", paragraphs: ["Sellers must not list, advertise, offer or sell products that are illegal, prohibited, recalled, unsafe, unlawfully imported or otherwise prohibited by Barakaz. Sellers remain responsible for determining whether products may lawfully be sold and delivered to the buyer."] },
      { heading: "Safety and restricted goods", paragraphs: ["Products prohibited under applicable Canadian product-safety law, applicable recalled products and products presenting an unlawful health or safety danger must not be sold. Sellers must monitor relevant safety and recall information.", "Goods subject to licensing, age restrictions, transportation requirements or regulatory controls may be offered only where Barakaz permits the category and all applicable requirements are satisfied. Counterfeit goods, unlawfully infringing goods, stolen property and goods obtained through fraud or theft are prohibited."] },
      { heading: "Labelling and marketplace controls", paragraphs: ["Sellers must not knowingly offer products with materially false, misleading or legally non-compliant safety, ingredient, certification, origin or other required labelling. Required warnings, instructions, certifications and restrictions must be provided as applicable.", "Barakaz may prohibit additional products because of legal, safety, payment-provider, carrier, insurance or marketplace-risk requirements and may immediately restrict a product where a credible legal, safety, authenticity or regulatory concern exists."] },
    ],
  },
  "product-authenticity": {
    title: "Product Authenticity Policy — Canada", code: "product_authenticity", version: "ca-v1",
    sections: [
      { heading: "Authentic products only", paragraphs: ["Products represented as genuine, branded or manufactured by a particular company must be authentic. Counterfeit, imitation or unauthorized products must not be represented as genuine."] },
      { heading: "Accurate representation and evidence", paragraphs: ["Sellers must accurately describe manufacturer, brand, model, condition, origin and other material characteristics. Claims such as Made in Canada, Product of Canada, authorized dealer status, certification, official affiliation or manufacturer approval may be made only when accurate and supportable.", "Barakaz may request invoices, supplier records, authorization letters, serial numbers, photographs, certificates or other reasonable evidence establishing authenticity and lawful sourcing."] },
      { heading: "Intellectual property and condition", paragraphs: ["Sellers are responsible for ensuring products, photographs, trademarks and listing content do not unlawfully infringe third-party rights. Genuine used, refurbished or open-box merchandise must be clearly identified and must not be represented as new. Material modifications affecting authenticity, safety, warranty, certification or performance must be disclosed where relevant."] },
      { heading: "Enforcement", paragraphs: ["Suspected counterfeit or materially misrepresented products may be removed during investigation. Confirmed violations may result in refunds, lawful payout controls, listing restrictions, suspension or termination. Repeated or deliberate counterfeit activity may result in permanent seller removal and appropriate referrals."] },
    ],
  },
};

export default function SellerPolicyPage() {
  const { policySlug } = useParams();
  const policy = policySlug ? policies[policySlug] : undefined;
  if (!policy) return <Navigate to="/vendor/register" replace />;

  return (
    <StaticPage
      title={policy.title}
      description={`Barakaz ${policy.title}, version ${policy.version}.`}
      canonicalPath={`/seller/policies/${policySlug}`}
    >
      <Link to="/vendor/register" className="text-sm text-primary hover:underline">← Back to seller registration</Link>
      <p className="text-sm text-muted-foreground"><strong>Seller policy version:</strong> {policy.version}</p>
      <p className="text-sm text-muted-foreground"><strong>Policy code:</strong> {policy.code}</p>
      {policy.sections.map(section => (
        <section key={section.heading}>
          <h2 className="text-lg font-semibold text-foreground mt-6">{section.heading}</h2>
          {section.paragraphs.map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        </section>
      ))}
    </StaticPage>
  );
}
