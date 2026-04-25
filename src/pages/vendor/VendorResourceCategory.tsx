import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, BookOpen } from "lucide-react";
import ResourceCard from "@/components/resources/ResourceCard";

const VendorResourceCategory = () => {
  const { slug } = useParams();
  const { user } = useAuth();

  const { data: category } = useQuery({
    queryKey: ["resource-cat", slug],
    queryFn: async () => {
      const { data } = await supabase.from("resource_categories").select("*").eq("slug", slug!).maybeSingle();
      return data;
    },
    enabled: !!slug,
  });

  const { data: resources = [], isLoading } = useQuery({
    queryKey: ["resource-cat-items", category?.id],
    queryFn: async () => {
      const { data } = await supabase.from("resources").select("*").eq("is_published", true).eq("category_id", category!.id).order("display_order");
      return data || [];
    },
    enabled: !!category,
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

  return (
    <div className="space-y-5">
      <Link to="/vendor/resources"><Button variant="ghost" size="sm"><ChevronLeft className="h-4 w-4 mr-1" />Back to Help Center</Button></Link>

      {category ? (
        <>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" />{category.name}</h1>
            {category.description && <p className="text-sm text-muted-foreground mt-1">{category.description}</p>}
          </div>

          {isLoading ? null : resources.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No lessons in this category yet.</CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {resources.map((r: any) => <ResourceCard key={r.id} resource={r} completed={completedIds.has(r.id)} />)}
            </div>
          )}
        </>
      ) : (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Category not found.</CardContent></Card>
      )}
    </div>
  );
};

export default VendorResourceCategory;
