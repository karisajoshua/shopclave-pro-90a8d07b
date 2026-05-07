import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import barakazIcon from "@/assets/barakaz-icon.png";
import { useTranslation } from "@/contexts/TranslationContext";

const NewArrivalsCategories = () => {
  const { t } = useTranslation();
  const { data: categories } = useQuery({
    queryKey: ["new-arrivals-categories"],
    queryFn: async () => {
      const { data } = await supabase
        .from("categories")
        .select("id, name, slug, image_url")
        .is("parent_id", null)
        .order("name")
        .limit(12);
      return data || [];
    },
  });

  if (!categories?.length) return null;

  return (
    <section className="container py-6">
      <h2 className="font-display text-lg md:text-xl font-bold text-foreground mb-4">
        {t("home.newArrivals") || "New Arrivals"}
      </h2>
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
        {categories.map((c: any) => (
          <Link
            key={c.id}
            to={`/search?category=${c.slug}`}
            className="group flex flex-col items-center gap-2 p-2 rounded-lg hover:bg-marketplace-orange-light transition-colors"
          >
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full overflow-hidden bg-secondary border-2 border-border group-hover:border-primary transition-colors">
              <img
                src={c.image_url || barakazIcon}
                alt={c.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <span className="text-xs md:text-sm font-medium text-center text-foreground line-clamp-2">
              {c.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default NewArrivalsCategories;
