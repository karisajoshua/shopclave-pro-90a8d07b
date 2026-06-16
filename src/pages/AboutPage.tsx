import StaticPage from "./StaticPage";

const AboutPage = () => (
  <StaticPage
    title="About Barakaz"
    description="Barakaz is a global multi-vendor marketplace headquartered in Canada, connecting buyers and sellers worldwide."
    canonicalPath="/about"
  >
    <p>Barakaz is a global multi-vendor marketplace headquartered in Canada, connecting buyers and sellers worldwide. Our mission is to empower entrepreneurs everywhere and give shoppers access to quality fashion, electronics, and lifestyle products at competitive prices.</p>

    <h2 className="text-lg font-semibold text-foreground mt-6">Our Story</h2>
    <p>Founded with a vision to make borderless commerce simple, Barakaz brings together thousands of vendors from around the world offering millions of products. From fashion to electronics, home goods to beauty, we make it easy for anyone to shop online with confidence — no matter where they are.</p>

    <h2 className="text-lg font-semibold text-foreground mt-6">Our Mission</h2>
    <p>To be the world's most trusted global marketplace by providing a seamless shopping experience, empowering vendors of every size, and delivering value to every customer.</p>

    <h2 className="text-lg font-semibold text-foreground mt-6">What Sets Us Apart</h2>
    <ul className="list-disc pl-6 space-y-1">
      <li><strong>Global Multi-Vendor Marketplace:</strong> Shop from thousands of verified sellers across continents in one place.</li>
      <li><strong>Secure Payments:</strong> Multiple international payment options including cards and local methods.</li>
      <li><strong>Worldwide Delivery:</strong> Reliable shipping options from local to international.</li>
      <li><strong>Buyer Protection:</strong> Comprehensive return policy and customer support.</li>
      <li><strong>Vendor Support:</strong> Tools and resources to help sellers grow their businesses globally.</li>
    </ul>

    <h2 className="text-lg font-semibold text-foreground mt-6">Contact Us</h2>
    <p>Have questions? Reach us at <strong>info@barakaz.com</strong> or through our Help Center.</p>
  </StaticPage>
);

export default AboutPage;
