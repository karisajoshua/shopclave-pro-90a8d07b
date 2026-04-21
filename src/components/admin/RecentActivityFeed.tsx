import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { Activity, ShoppingBag, Shield, MessageCircle, Edit3, Trash2, Circle } from "lucide-react";

const iconFor = (type: string) => {
  if (type.includes("dispute")) return Shield;
  if (type.includes("order")) return ShoppingBag;
  if (type.includes("message_edit")) return Edit3;
  if (type.includes("message_delete")) return Trash2;
  if (type.includes("message")) return MessageCircle;
  return Circle;
};

const toneFor = (type: string) => {
  if (type.includes("dispute")) return "text-admin-danger bg-admin-danger/10";
  if (type.includes("delete")) return "text-admin-warning bg-admin-warning/10";
  if (type.includes("order")) return "text-admin-info bg-admin-info/10";
  return "text-muted-foreground bg-muted";
};

export const RecentActivityFeed = () => {
  const { data: items } = useQuery({
    queryKey: ["admin-recent-activity"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("audit_logs")
        .select("id, action_type, action_details, created_at, order_id, user_id")
        .order("created_at", { ascending: false })
        .limit(15);
      return data || [];
    },
    refetchInterval: 30_000,
  });

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Recent activity</h2>
      </div>
      <div className="rounded-xl border border-border bg-admin-card shadow-admin-card overflow-hidden">
        {!items || items.length === 0 ? (
          <div className="p-8 text-center">
            <Activity className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No recent activity to show</p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((item: any) => {
              const Icon = iconFor(item.action_type);
              const tone = toneFor(item.action_type);
              const details = item.action_details || {};
              const summary = details.summary || details.note || details.reason || item.action_type.replace(/_/g, " ");
              return (
                <li key={item.id} className="flex items-start gap-3 p-3 hover:bg-muted/40 transition-colors">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${tone}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground line-clamp-1">
                      <span className="font-medium capitalize">{item.action_type.replace(/_/g, " ")}</span>
                      {item.order_id && (
                        <span className="ml-2 font-mono text-[11px] text-muted-foreground">#{item.order_id.slice(0, 8)}</span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{String(summary)}</p>
                  </div>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
};

export default RecentActivityFeed;
