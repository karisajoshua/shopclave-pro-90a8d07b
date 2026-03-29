import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FolderTree } from "lucide-react";

const AdminCategories = () => {
  const { user } = useAuth();

  const { data: categories } = useQuery({
    queryKey: ["admin-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("categories").select("*").order("name");
      return data || [];
    },
    enabled: !!user,
  });

  const topLevel = categories?.filter((c: any) => !c.parent_id) || [];

  const getChildren = (parentId: string) =>
    categories?.filter((c: any) => c.parent_id === parentId) || [];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Categories</h2>
      <div className="bg-card rounded-lg border border-border p-4 space-y-2">
        {topLevel.map((cat: any) => (
          <div key={cat.id}>
            <div className="flex items-center gap-2 p-2 font-medium">
              <FolderTree className="h-4 w-4 text-primary" />
              {cat.name}
            </div>
            {getChildren(cat.id).map((child: any) => (
              <div key={child.id} className="ml-6">
                <div className="flex items-center gap-2 p-1.5 text-sm text-muted-foreground">
                  └ {child.name}
                </div>
                {getChildren(child.id).map((gc: any) => (
                  <div key={gc.id} className="ml-6 flex items-center gap-2 p-1 text-xs text-muted-foreground">
                    └ {gc.name}
                  </div>
                ))}
              </div>
            ))}
          </div>
        ))}
        {topLevel.length === 0 && (
          <p className="text-muted-foreground text-center py-8">No categories found</p>
        )}
      </div>
    </div>
  );
};

export default AdminCategories;
