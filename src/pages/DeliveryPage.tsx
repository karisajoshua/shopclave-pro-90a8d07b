import StaticPage from "./StaticPage";

const DeliveryPage = () => (
  <StaticPage title="Delivery Services">
    <p>Barakaz partners with trusted logistics providers to ensure your orders arrive safely and on time.</p>

    <h2 className="text-lg font-semibold text-foreground mt-6">Delivery Options</h2>
    <ul className="list-disc pl-6 space-y-1">
      <li><strong>Standard Delivery:</strong> 3–7 business days. Free on orders over KSh 2,000.</li>
      <li><strong>Express Delivery:</strong> 1–2 business days. Available in select cities for an additional fee.</li>
      <li><strong>Pick-up Points:</strong> Collect your order from a convenient pick-up location near you.</li>
    </ul>

    <h2 className="text-lg font-semibold text-foreground mt-6">Delivery Areas</h2>
    <p>We currently deliver across Kenya, with expansion plans for East Africa. Delivery times may vary based on your location.</p>

    <h2 className="text-lg font-semibold text-foreground mt-6">Order Tracking</h2>
    <p>Once your order is shipped, you will receive a tracking number via email and SMS. Use this to track your delivery in real time through your Account page.</p>

    <h2 className="text-lg font-semibold text-foreground mt-6">Delivery Issues</h2>
    <p>If your order is delayed, damaged, or missing, please contact our support team within 48 hours of the expected delivery date. We will investigate and resolve the issue promptly.</p>
  </StaticPage>
);

export default DeliveryPage;
