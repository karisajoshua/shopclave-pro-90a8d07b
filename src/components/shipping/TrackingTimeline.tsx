import { CheckCircle2, Circle, AlertTriangle } from "lucide-react";

export type TrackingEvent = {
  id: string;
  status: string;
  description: string | null;
  location: string | null;
  occurred_at: string;
};

export const SHIPMENT_STATUS_LABELS: Record<string, string> = {
  preparing: "Preparing",
  ready_for_pickup: "Ready for pickup",
  collected: "Collected",
  in_transit: "In transit",
  customs_clearance: "Customs clearance",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  exception: "Delivery exception",
  returned: "Returned",
};

const TrackingTimeline = ({ events }: { events: TrackingEvent[] }) => {
  if (!events.length) {
    return <p className="text-sm text-muted-foreground">No tracking updates yet.</p>;
  }

  const sorted = [...events].sort(
    (a, b) => new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
  );

  return (
    <ol className="relative space-y-4 pl-6">
      <span className="absolute left-[7px] top-2 bottom-2 w-px bg-border" aria-hidden />
      {sorted.map((e, i) => {
        const isException = e.status === "exception";
        const Icon = isException ? AlertTriangle : i === 0 ? CheckCircle2 : Circle;
        return (
          <li key={e.id} className="relative">
            <Icon
              className={`absolute -left-6 top-0.5 h-4 w-4 ${
                isException ? "text-destructive" : i === 0 ? "text-primary" : "text-muted-foreground"
              }`}
            />
            <p className="text-sm font-medium">
              {SHIPMENT_STATUS_LABELS[e.status] || e.status}
            </p>
            {e.description && (
              <p className="text-xs text-muted-foreground">{e.description}</p>
            )}
            <p className="text-[11px] text-muted-foreground">
              {new Date(e.occurred_at).toLocaleString()}
              {e.location ? ` • ${e.location}` : ""}
            </p>
          </li>
        );
      })}
    </ol>
  );
};

export default TrackingTimeline;
