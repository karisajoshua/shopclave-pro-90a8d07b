import StaticPage from "./StaticPage";
import SEO from "@/components/seo/SEO";

const contactJsonLd = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  name: "Barakaz",
  url: "https://barakaz.com/",
  email: "support@barakaz.com",
  telephone: "+254-700-000-000",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Nairobi",
    addressLocality: "Nairobi",
    addressCountry: "KE",
  },
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: "+254-700-000-000",
      contactType: "customer service",
      email: "support@barakaz.com",
      availableLanguage: ["English", "Swahili"],
    },
    {
      "@type": "ContactPoint",
      email: "vendors@barakaz.com",
      contactType: "vendor support",
    },
  ],
  openingHours: "Mo-Fr 08:00-18:00",
};

const ContactPage = () => (
  <StaticPage
    title="Contact Us"
    description="Reach Barakaz support by email, phone, or WhatsApp. Vendor and issue reporting contacts included."
    canonicalPath="/contact"
  >
    <SEO
      title="Contact Barakaz | Support, Vendor & Reporting"
      description="Reach Barakaz support by email, phone, or WhatsApp. Vendor and issue reporting contacts included."
      canonicalPath="/contact"
      jsonLd={contactJsonLd}
    />
    <p>We'd love to hear from you! Whether you have a question, feedback, or need assistance, our team is here to help.</p>

    <h2 className="text-lg font-semibold text-foreground mt-6">Get in Touch</h2>
    <ul className="list-none space-y-2">
      <li><strong>Email:</strong> support@barakaz.com</li>
      <li><strong>Phone:</strong> +254 700 000 000</li>
      <li><strong>WhatsApp:</strong> +254 700 000 000</li>
      <li><strong>Business Hours:</strong> Monday – Friday, 8:00 AM – 6:00 PM (EAT)</li>
    </ul>

    <h2 className="text-lg font-semibold text-foreground mt-6">Office Address</h2>
    <p>Barakaz Marketplace<br />Nairobi, Kenya</p>

    <h2 className="text-lg font-semibold text-foreground mt-6">For Vendors</h2>
    <p>If you are a vendor and need assistance with your account, please contact us at <strong>vendors@barakaz.com</strong> or visit the Vendor Hub.</p>

    <h2 className="text-lg font-semibold text-foreground mt-6">Report an Issue</h2>
    <p>To report a product listing, suspicious activity, or technical issue, please email <strong>report@barakaz.com</strong> with details of the issue.</p>
  </StaticPage>
);

export default ContactPage;
