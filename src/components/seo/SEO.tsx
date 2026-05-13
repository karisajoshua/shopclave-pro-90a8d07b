import { Helmet } from "react-helmet-async";

const SITE_URL = "https://barakaz.com";

interface SEOProps {
  title: string;
  description?: string;
  canonicalPath?: string; // e.g. "/store/my-shop"
  image?: string;
  type?: "website" | "product" | "profile";
  jsonLd?: Record<string, any> | Record<string, any>[];
}

const truncate = (s: string, n = 155) =>
  s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s;

const SEO = ({
  title,
  description,
  canonicalPath,
  image,
  type = "website",
  jsonLd,
}: SEOProps) => {
  const fullTitle = title.length > 60 ? title.slice(0, 57) + "…" : title;
  const desc = description ? truncate(description) : undefined;
  const canonical = canonicalPath ? `${SITE_URL}${canonicalPath}` : undefined;
  const ldArray = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];

  return (
    <Helmet>
      <title>{fullTitle}</title>
      {desc && <meta name="description" content={desc} />}
      {canonical && <link rel="canonical" href={canonical} />}

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      {desc && <meta property="og:description" content={desc} />}
      <meta property="og:type" content={type} />
      {canonical && <meta property="og:url" content={canonical} />}
      {image && <meta property="og:image" content={image} />}

      {/* Twitter */}
      <meta name="twitter:card" content={image ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={fullTitle} />
      {desc && <meta name="twitter:description" content={desc} />}
      {image && <meta name="twitter:image" content={image} />}

      {ldArray.map((ld, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(ld)}
        </script>
      ))}
    </Helmet>
  );
};

export default SEO;
export { SITE_URL };
