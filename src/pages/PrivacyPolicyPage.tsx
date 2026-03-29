import StaticPage from "./StaticPage";

const PrivacyPolicyPage = () => (
  <StaticPage title="Privacy Policy">
    <p className="text-sm text-muted-foreground"><strong>Last Updated:</strong> March 2026</p>
    <p>At Barakaz, we are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our platform.</p>

    <h2 className="text-lg font-semibold text-foreground mt-6">1. Information We Collect</h2>
    <p>We collect personal information that you voluntarily provide to us when you register, express an interest in obtaining information about us or our products, or otherwise contact us. This includes:</p>
    <ul className="list-disc pl-6 space-y-1">
      <li>Name, email address, and phone number</li>
      <li>Billing and shipping addresses</li>
      <li>Payment information (processed securely through third-party providers)</li>
      <li>Order history and product preferences</li>
      <li>Device and browser information collected automatically</li>
    </ul>

    <h2 className="text-lg font-semibold text-foreground mt-6">2. How We Use Your Information</h2>
    <p>We use your information to:</p>
    <ul className="list-disc pl-6 space-y-1">
      <li>Process and fulfil your orders</li>
      <li>Send you order updates and delivery notifications</li>
      <li>Personalize your shopping experience</li>
      <li>Improve our platform and customer service</li>
      <li>Comply with legal obligations</li>
    </ul>

    <h2 className="text-lg font-semibold text-foreground mt-6">3. Sharing Your Information</h2>
    <p>We may share your information with vendors to fulfil orders, payment processors for transactions, and delivery partners for shipping. We do not sell your personal data to third parties.</p>

    <h2 className="text-lg font-semibold text-foreground mt-6">4. Data Security</h2>
    <p>We implement appropriate technical and organizational security measures to protect your personal information. However, no electronic transmission over the Internet or data storage technology can be guaranteed to be 100% secure.</p>

    <h2 className="text-lg font-semibold text-foreground mt-6">5. Your Rights</h2>
    <p>You have the right to access, correct, or delete your personal data. You may also opt out of marketing communications at any time by contacting us at <strong>privacy@barakaz.com</strong>.</p>

    <h2 className="text-lg font-semibold text-foreground mt-6">6. Contact Us</h2>
    <p>If you have questions about this Privacy Policy, please contact us at <strong>privacy@barakaz.com</strong> or through our Help Center.</p>
  </StaticPage>
);

export default PrivacyPolicyPage;
