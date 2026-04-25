import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Search, Sparkles, ChevronRight, GraduationCap, TrendingUp } from "lucide-react";
import ResourceCard from "@/components/resources/ResourceCard";

const VendorResources = () => {
  const { user } = useAuth();
  const [search, setSearch] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["vendor-resource-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("resource_categories").select("*").eq("is_active", true).order("display_order");
      return data || [];
    },
  });

  const { data: resources = [] } = useQuery({
    queryKey: ["vendor-resources-list"],
    queryFn: async () => {
      const { data } = await supabase.from("resources").select("*").eq("is_published", true).order("display_order");
      return data || [];
    },
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["vendor-resource-progress", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("resource_progress").select("*").eq("user_id", user!.id);
      return data || [];
    },
    enabled: !!user,
  });

  const completedIds = new Set(progress.filter((p: any) => p.status === "completed").map((p: any) => p.resource_id));
  const featured = resources.filter((r: any) => r.is_featured).slice(0, 6);
  const recent = [...resources].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 6);

  const matchesSearch = (r: any) => {
    if (!search) return false;
    const q = search.toLowerCase();
    return r.title.toLowerCase().includes(q)
      || r.summary?.toLowerCase().includes(q)
      || r.content?.toLowerCase().includes(q)
      || r.tags?.some((t: string) => t.toLowerCase().includes(q));
  };
  const searchResults = search ? resources.filter(matchesSearch) : [];

  const countByCat = (catId: string) => resources.filter((r: any) => r.category_id === catId).length;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border p-5 md:p-6">
        <div className="flex items-center gap-2 mb-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          <h1 className="text-xl md:text-2xl font-bold">Vendor Help Center</h1>
        </div>
        <p className="text-sm text-muted-foreground mb-4 max-w-2xl">
          Watch quick videos and read step-by-step guides on how to grow your store, manage orders, and use every Barakaz feature.
        </p>
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search guides… e.g. 'add product', 'shipping', 'M-Pesa'"
            className="pl-9 bg-background"
          />
        </div>
        {progress.length > 0 && (
          <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-background/60 rounded-full px-3 py-1">
            <TrendingUp className="h-3 w-3" />
            {completedIds.size} of {resources.length} lessons completed
          </div>
        )}
      </div>

      {/* Search results */}
      {search && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {searchResults.length} result{searchResults.length === 1 ? "" : "s"} for "{search}"
          </h2>
          {searchResults.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No matching guides. Try different keywords.</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {searchResults.map((r: any) => <ResourceCard key={r.id} resource={r} completed={completedIds.has(r.id)} />)}
            </div>
          )}
        </div>
      )}

      {!search && (
        <>
          {/* Featured */}
          {featured.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-warning" />
                <h2 className="text-base font-semibold">Featured guides</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {featured.map((r: any) => <ResourceCard key={r.id} resource={r} completed={completedIds.has(r.id)} />)}
              </div>
            </div>
          )}

          {/* Categories */}
          {categories.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold">Browse by topic</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {categories.map((c: any) => (
                  <Link key={c.id} to={`/vendor/resources/c/${c.slug}`}>
                    <Card className="hover:border-primary/40 transition-colors h-full">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <BookOpen className="h-5 w-5 text-primary" />
                          <Badge variant="secondary" className="text-[10px]">{countByCat(c.id)} lesson{countByCat(c.id) === 1 ? "" : "s"}</Badge>
                        </div>
                        <h3 className="font-semibold text-sm">{c.name}</h3>
                        {c.description && <p className="text-xs text-muted-foreground line-clamp-2">{c.description}</p>}
                        <div className="flex items-center text-xs text-primary font-medium">Browse <ChevronRight className="h-3 w-3 ml-0.5" /></div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recently added */}
          {recent.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-base font-semibold">Recently added</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {recent.map((r: any) => <ResourceCard key={r.id} resource={r} completed={completedIds.has(r.id)} />)}
              </div>
            </div>
          )}

          {resources.length === 0 && categories.length === 0 && (
            <Card><CardContent className="py-12 text-center text-muted-foreground">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Resources are being prepared. Check back soon!</p>
            </CardContent></Card>
          )}
        </>
      )}
    </div>
  );
};

export default VendorResources;
