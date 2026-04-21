import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";

const VendorNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: notifications } = useQuery({
    queryKey: ["vendor-notifications", user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any).from("notifications").select("*").eq("recipient_id", user!.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const markRead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("notifications").update({ is_read: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vendor-notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase as any)
        .from("notifications")
        .update({ is_read: true })
        .eq("recipient_id", user!.id)
        .eq("is_read", false);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vendor-notifications"] }),
  });

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
    if (type === "alert") return "text-destructive bg-destructive/10";
    if (type === "warning") return "text-warning bg-warning/10";
    if (type === "success") return "text-success bg-success/10";
    return "text-primary bg-primary/10";
  };

  const unreadCount = notifications?.filter((n: any) => !n.is_read).length || 0;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Notifications"
        subtitle="Order updates, customer messages, and platform alerts."
        count={notifications?.length || 0}
        countLabel={unreadCount > 0 ? `· ${unreadCount} unread` : undefined}
        actions={
          unreadCount > 0 && (
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => markAllRead.mutate()}>
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </Button>
          )
        }
      />

      {!notifications?.length ? (
        <div className="admin-card">
          <AdminEmptyState
            icon={Bell}
            title="You're all caught up"
            description="New notifications about your orders, messages and account will appear here."
          />
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n: any) => (
            <div
              key={n.id}
              className={`admin-card admin-card-hover p-4 flex items-start gap-3 cursor-pointer ${!n.is_read ? "border-primary/30 bg-primary/5" : ""}`}
              onClick={() => !n.is_read && markRead.mutate(n.id)}
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${typeColor(n.type)}`}>
                <Bell className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{n.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
              </div>
              <div className="text-right shrink-0 flex flex-col items-end gap-1">
                <span className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleDateString()}</span>
                {!n.is_read && <div className="w-2 h-2 bg-primary rounded-full" />}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VendorNotifications;
