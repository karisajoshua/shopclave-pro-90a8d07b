import StaticPage from "./StaticPage";

const AboutPage = () => (
  <StaticPage
    title="About Barakaz"
    description="Learn about Barakaz, Africa's multi-vendor marketplace connecting buyers with thousands of trusted sellers across Kenya and beyond."
    canonicalPath="/about"
  >
    <p>Barakaz is a multi-vendor e-commerce marketplace connecting buyers with trusted sellers across Africa and beyond. Our mission is to empower entrepreneurs and provide customers with access to quality products at competitive prices.</p>

    <h2 className="text-lg font-semibold text-foreground mt-6">Our Story</h2>
    <p>Founded with a vision to democratize e-commerce in Africa, Barakaz brings together thousands of vendors offering millions of products. From electronics to fashion, home goods to health products, we make it easy for anyone to shop online with confidence.</p>

    <h2 className="text-lg font-semibold text-foreground mt-6">Our Mission</h2>
    <p>To be Africa's most trusted online marketplace by providing a seamless shopping experience, empowering local vendors, and delivering value to every customer.</p>

    <h2 className="text-lg font-semibold text-foreground mt-6">What Sets Us Apart</h2>
    <ul className="list-disc pl-6 space-y-1">
      <li><strong>Multi-Vendor Marketplace:</strong> Shop from thousands of verified sellers in one place.</li>
      <li><strong>Secure Payments:</strong> Multiple payment options including M-Pesa, bank transfers, and cards.</li>
      <li><strong>Fast Delivery:</strong> Reliable delivery across Kenya and beyond.</li>
      <li><strong>Buyer Protection:</strong> Comprehensive return policy and customer support.</li>
      <li><strong>Vendor Support:</strong> Tools and resources to help sellers grow their businesses.</li>
    </ul>

    <h2 className="text-lg font-semibold text-foreground mt-6">Contact Us</h2>
    <p>Have questions? Reach us at <strong>info@barakaz.com</strong> or through our Help Center.</p>
  </StaticPage>
);

export default AboutPage;
