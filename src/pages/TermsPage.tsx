import StaticPage from "./StaticPage";

const TermsPage = () => (
  <StaticPage title="Terms & Conditions">
    <p className="text-sm text-muted-foreground"><strong>Last Updated:</strong> March 2026</p>
    <p>Welcome to Barakaz. By accessing and using our platform, you agree to be bound by these Terms and Conditions.</p>

    <h2 className="text-lg font-semibold text-foreground mt-6">1. Account Registration</h2>
    <p>You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.</p>

    <h2 className="text-lg font-semibold text-foreground mt-6">2. Orders and Payments</h2>
    <p>All prices are displayed in the local currency of your region. We reserve the right to refuse or cancel any order. Payment must be completed before order processing begins.</p>

    <h2 className="text-lg font-semibold text-foreground mt-6">3. Vendor Responsibilities</h2>
    <p>Vendors are responsible for the accuracy of product listings, timely order fulfilment, and compliance with all applicable laws. Barakaz reserves the right to suspend or terminate vendor accounts for policy violations.</p>

    <h2 className="text-lg font-semibold text-foreground mt-6">4. Intellectual Property</h2>
    <p>All content on the Barakaz platform, including logos, text, and images, is the property of Barakaz or its content suppliers and is protected by intellectual property laws.</p>

    <h2 className="text-lg font-semibold text-foreground mt-6">5. Limitation of Liability</h2>
    <p>Barakaz shall not be liable for any indirect, incidental, or consequential damages arising from the use of our platform. Our total liability shall not exceed the amount paid by you in the last 12 months.</p>

    <h2 className="text-lg font-semibold text-foreground mt-6">6. Governing Law</h2>
    <p>These Terms shall be governed by and construed in accordance with the laws of the Republic of Kenya.</p>
  </StaticPage>
);

export default TermsPage;
