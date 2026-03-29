import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const AdminUsers = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profiles } = useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: roles } = useQuery({
    queryKey: ["admin-all-roles"],
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("*");
      return data || [];
    },
    enabled: !!user,
  });

  const addRole = useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: string }) => {
      const { error } = await supabase.from("user_roles").insert({ user_id, role } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-roles"] });
      toast.success("Role added");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const getUserRoles = (userId: string) =>
    roles?.filter((r: any) => r.user_id === userId).map((r: any) => r.role) || [];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">User Management</h2>
      <div className="bg-card rounded-lg border border-border overflow-x-auto">
        <table className="w-full text-sm min-w-[500px]">
          <thead className="bg-secondary">
            <tr>
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Roles</th>
              <th className="text-left p-3 font-medium">Joined</th>
              <th className="text-left p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {profiles?.map((p: any) => {
              const userRoles = getUserRoles(p.user_id);
              return (
                <tr key={p.id} className="border-t border-border">
                  <td className="p-3 font-medium">{p.full_name || "—"}</td>
                  <td className="p-3">
                    <div className="flex gap-1 flex-wrap">
                      {userRoles.map((r: string) => (
                        <span key={r} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{r}</span>
                      ))}
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      {!userRoles.includes("vendor") && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addRole.mutate({ user_id: p.user_id, role: "vendor" })}>
                          + Vendor
                        </Button>
                      )}
                      {!userRoles.includes("admin") && (
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => addRole.mutate({ user_id: p.user_id, role: "admin" })}>
                          + Admin
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;
