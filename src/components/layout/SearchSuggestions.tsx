import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Search, Tag } from "lucide-react";

interface SearchSuggestionsProps {
  query: string;
  visible: boolean;
  onClose: () => void;
}

interface Suggestion {
  type: "category" | "product";
  id: string;
  name: string;
  slug: string;
  image?: string;
  description?: string;
}

const SearchSuggestions = ({ query, visible, onClose }: SearchSuggestionsProps) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!query.trim() || !visible) {
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const term = `%${query.trim()}%`;
      const [catRes, prodRes] = await Promise.all([
        supabase.from("categories").select("id, name, slug").ilike("name", term).limit(4),
        supabase.from("products").select("id, name, slug, description, product_images(url, position)").eq("status", "active").ilike("name", term).limit(5),
      ]);

      const cats: Suggestion[] = (catRes.data || []).map((c: any) => ({
        type: "category", id: c.id, name: c.name, slug: c.slug,
      }));
      const prods: Suggestion[] = (prodRes.data || []).map((p: any) => {
        const imgs = (p.product_images || []).sort((a: any, b: any) => a.position - b.position);
        const desc = p.description ? (p.description.length > 80 ? p.description.slice(0, 80) + "…" : p.description) : undefined;
        return { type: "product", id: p.id, name: p.name, slug: p.slug, image: imgs[0]?.url, description: desc };
      });
      setSuggestions([...cats, ...prods]);
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, visible]);

  if (!visible || suggestions.length === 0) return null;

  const categories = suggestions.filter(s => s.type === "category");
  const products = suggestions.filter(s => s.type === "product");

  const handleClick = (s: Suggestion) => {
    onClose();
    if (s.type === "category") {
      navigate(`/search?category=${s.slug}`);
    } else {
      navigate(`/product/${s.slug}`);
    }
  };

  return (
    <div className="absolute top-full left-0 right-0 z-50 bg-card border border-border rounded-b-lg shadow-lg max-h-[400px] overflow-y-auto">
      {categories.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase px-3 pt-2 pb-1">Categories</p>
          {categories.map(s => (
            <button
              key={s.id}
              onClick={() => handleClick(s)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-secondary text-sm text-left transition-colors"
            >
              <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{s.name}</span>
            </button>
          ))}
        </div>
      )}
      {products.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-muted-foreground uppercase px-3 pt-2 pb-1">Products</p>
          {products.map(s => (
            <button
              key={s.id}
              onClick={() => handleClick(s)}
              className="w-full flex items-center gap-2 px-3 py-2 hover:bg-secondary text-sm text-left transition-colors"
            >
              {s.image ? (
                <img src={s.image} alt="" className="w-8 h-8 rounded object-cover shrink-0 bg-secondary" />
              ) : (
                <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <span className="truncate block">{s.name}</span>
                {s.description && (
                  <span className="text-xs text-muted-foreground truncate block">{s.description}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchSuggestions;
