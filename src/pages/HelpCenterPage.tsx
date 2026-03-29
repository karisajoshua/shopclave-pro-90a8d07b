import StaticPage from "./StaticPage";

const HelpCenterPage = () => (
  <StaticPage title="Help Center">
    <p>Welcome to the Barakaz Help Center. Find answers to common questions below or contact our support team for further assistance.</p>

    <h2 className="text-lg font-semibold text-foreground mt-6">Frequently Asked Questions</h2>

    <h3 className="text-base font-semibold text-foreground mt-4">How do I place an order?</h3>
    <p>Browse products, add items to your cart, and proceed to checkout. Select your delivery address and payment method, then confirm your order.</p>

    <h3 className="text-base font-semibold text-foreground mt-4">How can I track my order?</h3>
    <p>Go to your Account page and select "My Orders" to view the status and tracking information for all your orders.</p>

    <h3 className="text-base font-semibold text-foreground mt-4">What payment methods are accepted?</h3>
    <p>We accept M-Pesa, Visa, Mastercard, bank transfers, and PayPal. Available payment methods may vary by region.</p>

    <h3 className="text-base font-semibold text-foreground mt-4">How do I return a product?</h3>
    <p>If you are not satisfied with your purchase, you can initiate a return within 7 days of delivery. Visit our Return Policy page for details.</p>

    <h3 className="text-base font-semibold text-foreground mt-4">How do I become a seller?</h3>
    <p>Click "Sell on Barakaz" in the navigation menu to register as a vendor. Once approved, you can start listing products immediately.</p>

    <h2 className="text-lg font-semibold text-foreground mt-6">Contact Support</h2>
    <p>Email: <strong>support@barakaz.com</strong></p>
    <p>WhatsApp: <strong>+254 700 000 000</strong></p>
    <p>We respond within 24 hours on business days.</p>
  </StaticPage>
);

export default HelpCenterPage;
