import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bell } from "lucide-react";

const VendorNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications } = useQuery({
    queryKey: ["vendor-notifications", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("notifications").select("*").eq("recipient_id", user!.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications").update({ is_read: true } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vendor-notifications"] }),
  });

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("vendor-notifications")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${user.id}` }, () => {
        queryClient.invalidateQueries({ queryKey: ["vendor-notifications"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  const typeColor = (type: string) => {
    if (type === "alert") return "text-destructive";
    if (type === "warning") return "text-warning";
    if (type === "success") return "text-success";
    return "text-primary";
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Notifications</h2>
      {notifications?.length === 0 && (
        <div className="text-center py-12 bg-card rounded-lg border border-border">
          <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No notifications yet</p>
        </div>
      )}
      <div className="space-y-2">
        {notifications?.map((n: any) => (
          <div
            key={n.id}
            className={`bg-card rounded-lg border border-border p-4 flex items-start gap-3 cursor-pointer transition-colors ${!n.is_read ? "border-primary/30 bg-primary/5" : ""}`}
            onClick={() => !n.is_read && markRead.mutate(n.id)}
          >
            <Bell className={`h-4 w-4 mt-0.5 shrink-0 ${typeColor(n.type)}`} />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{n.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleDateString()}</span>
              {!n.is_read && <div className="w-2 h-2 bg-primary rounded-full ml-auto mt-1" />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VendorNotifications;
