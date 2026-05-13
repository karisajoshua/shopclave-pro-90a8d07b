import StaticPage from "./StaticPage";

const CookiePolicyPage = () => (
  <StaticPage
    title="Cookie Policy"
    description="How Barakaz uses cookies and similar technologies, and how you can manage your cookie preferences."
    canonicalPath="/cookie-policy"
  >
    <p className="text-sm text-muted-foreground"><strong>Last Updated:</strong> March 2026</p>
    <p>This Cookie Policy explains how Barakaz uses cookies and similar technologies to recognize you when you visit our platform.</p>

    <h2 className="text-lg font-semibold text-foreground mt-6">1. What Are Cookies?</h2>
    <p>Cookies are small data files placed on your device when you visit a website. They are widely used to make websites work efficiently and to provide information to the owners of the site.</p>

    <h2 className="text-lg font-semibold text-foreground mt-6">2. How We Use Cookies</h2>
    <ul className="list-disc pl-6 space-y-1">
      <li><strong>Essential Cookies:</strong> Required for the platform to function, including authentication and cart functionality.</li>
      <li><strong>Analytics Cookies:</strong> Help us understand how visitors interact with our platform to improve the user experience.</li>
      <li><strong>Preference Cookies:</strong> Remember your language, currency, and other settings.</li>
      <li><strong>Marketing Cookies:</strong> Used to deliver relevant advertisements and track campaign performance.</li>
    </ul>

    <h2 className="text-lg font-semibold text-foreground mt-6">3. Managing Cookies</h2>
    <p>You can control and manage cookies through your browser settings. Please note that disabling certain cookies may affect the functionality of our platform.</p>

    <h2 className="text-lg font-semibold text-foreground mt-6">4. Contact Us</h2>
    <p>For questions about our use of cookies, please contact us at <strong>privacy@barakaz.com</strong>.</p>
  </StaticPage>
);

export default CookiePolicyPage;
