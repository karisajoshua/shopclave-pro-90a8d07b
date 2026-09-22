import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useOutletContext, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Truck, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import TrackingTimeline, { SHIPMENT_STATUS_LABELS } from "@/components/shipping/TrackingTimeline";

// Vendors may only advance these three statuses; the rest come from the carrier.
const VENDOR_FLOW = ["preparing", "ready_for_pickup", "collected"];

const VendorShipments = () => {
  const { vendor } = useOutletContext<{ vendor: any }>();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["vendor-shipments", vendor?.id],
    enabled: !!vendor,
    queryFn: async () => {
      const { data: shipments } = await supabase
        .from("shipments")
        .select("*, orders(created_at, payment_status, shipping_address)")
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false });

      const ids = (shipments || []).map((s: any) => s.id);
      const { data: events } = ids.length
        ? await supabase.from("tracking_events").select("*").in("shipment_id", ids)
        : { data: [] as any[] };

      return { shipments: shipments || [], events: events || [] };
    },
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("shipments").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-shipments"] });
      toast.success("Shipment updated");
    },
    onError: (e: any) => toast.error(e.message || "Could not update shipment"),
  });

  const shipments = data?.shipments || [];

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Fulfilment"
        subtitle="Prepare parcels, print labels and follow every delivery."
        count={shipments.length}
        countLabel="parcels"
      />

      {!shipments.length ? (
        <div className="admin-card">
          <AdminEmptyState
            icon={Truck}
            title="No parcels yet"
            description="Parcels appear here as soon as a customer pays for one of your products."
          />
        </div>
      ) : (
        <div className="space-y-3">
          {shipments.map((s: any) => {
            const idx = VENDOR_FLOW.indexOf(s.status);
            const next = idx > -1 && idx < VENDOR_FLOW.length - 1 ? VENDOR_FLOW[idx + 1] : null;
            const addr = s.orders?.shipping_address as any;
            const sEvents = (data?.events || []).filter((e: any) => e.shipment_id === s.id);
            return (
              <div key={s.id} className="admin-card p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">
                      Order <span className="font-mono">#{s.order_id.slice(0, 8)}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.carrier ? `${s.carrier}${s.service ? ` • ${s.service}` : ""}` : "Carrier pending"}
                      {addr?.city ? ` → ${addr.city}` : ""}
                    </p>
                  </div>
                  <span className="status-pill bg-primary/10 text-primary">
                    {SHIPMENT_STATUS_LABELS[s.status] || s.status}
                  </span>
                </div>

                {s.label_error && (
                  <p className="text-xs text-destructive bg-destructive/10 rounded p-2">
                    Label problem: {s.label_error}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  {next && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => setStatus.mutate({ id: s.id, status: next })}
                    >
                      Mark {SHIPMENT_STATUS_LABELS[next]}
                    </Button>
                  )}
                  {s.label_url && (
                    <a href={s.label_url} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                        <FileText className="h-3 w-3" /> Print label
                      </Button>
                    </a>
                  )}
                  {s.tracking_url && (
                    <a href={s.tracking_url} target="_blank" rel="noreferrer">
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1">
                        <ExternalLink className="h-3 w-3" /> Track
                      </Button>
                    </a>
                  )}
                  <Link to={`/orders/${s.order_id}/chat`}>
                    <Button size="sm" variant="ghost" className="h-7 text-xs">
                      Chat with buyer
                    </Button>
                  </Link>
                </div>

                {sEvents.length > 0 && (
                  <div className="pt-2 border-t border-border">
                    <TrackingTimeline events={sEvents} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default VendorShipments;
