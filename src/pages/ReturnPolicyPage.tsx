import StaticPage from "./StaticPage";

const ReturnPolicyPage = () => (
  <StaticPage
    title="Return Policy"
    description="Eligibility, process, and timelines for returning products purchased through Barakaz vendors."
    canonicalPath="/return-policy"
  >
    <p className="text-sm text-muted-foreground"><strong>Last Updated:</strong> March 2026</p>
    <p>We want you to be completely satisfied with your purchase. If you are not happy with an item, you may return it under the following conditions.</p>

    <h2 className="text-lg font-semibold text-foreground mt-6">Return Eligibility</h2>
    <ul className="list-disc pl-6 space-y-1">
      <li>Items must be returned within 7 days of delivery.</li>
      <li>Products must be unused, in original packaging, and in the same condition as received.</li>
      <li>Perishable goods, intimate items, and custom-made products cannot be returned.</li>
    </ul>

    <h2 className="text-lg font-semibold text-foreground mt-6">How to Initiate a Return</h2>
    <ol className="list-decimal pl-6 space-y-1">
      <li>Log in to your account and go to "My Orders".</li>
      <li>Select the order and item you wish to return.</li>
      <li>Provide a reason for the return and submit.</li>
      <li>Our team will review your request within 24 hours.</li>
    </ol>

    <h2 className="text-lg font-semibold text-foreground mt-6">Refunds</h2>
    <p>Once the returned item is received and inspected, we will process your refund within 5–10 business days. Refunds will be issued to the original payment method.</p>

    <h2 className="text-lg font-semibold text-foreground mt-6">Exchanges</h2>
    <p>If you'd like to exchange an item for a different size or colour, please return the original item and place a new order.</p>

    <h2 className="text-lg font-semibold text-foreground mt-6">Contact Us</h2>
    <p>For return-related queries, email us at <strong>returns@barakaz.com</strong>.</p>
  </StaticPage>
);

export default ReturnPolicyPage;
