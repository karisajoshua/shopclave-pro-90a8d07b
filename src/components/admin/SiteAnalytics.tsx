import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { Users, Eye, MousePointerClick, Clock, TrendingDown, RefreshCw } from "lucide-react";
import { format, subDays, subHours, startOfDay, startOfYesterday, endOfYesterday, subMonths } from "date-fns";

type TimeFrame = "today" | "yesterday" | "24h" | "7d" | "30d" | "90d" | "12m";

const timeFrameOptions: { label: string; value: TimeFrame }[] = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 24h", value: "24h" },
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" },
  { label: "90 Days", value: "90d" },
  { label: "12 Months", value: "12m" },
];

const getDateRange = (tf: TimeFrame) => {
  const now = new Date();
  let start: Date;
  let end: Date = now;
  let granularity = "daily";

  switch (tf) {
    case "today":
      start = startOfDay(now);
      granularity = "hourly";
      break;
    case "yesterday":
      start = startOfYesterday();
      end = endOfYesterday();
      granularity = "hourly";
      break;
    case "24h":
      start = subHours(now, 24);
      granularity = "hourly";
      break;
    case "7d":
      start = subDays(now, 7);
      break;
    case "30d":
      start = subDays(now, 30);
      break;
    case "90d":
      start = subDays(now, 90);
      break;
    case "12m":
      start = subMonths(now, 12);
      break;
    default:
      start = subDays(now, 7);
  }

  return {
    startDate: format(start, "yyyy-MM-dd"),
    endDate: format(end, "yyyy-MM-dd"),
    granularity,
  };
};

const SiteAnalytics = () => {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("7d");

  const dateRange = useMemo(() => getDateRange(timeFrame), [timeFrame]);

  const { data: analyticsData, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["site-analytics", dateRange.startDate, dateRange.endDate, dateRange.granularity],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const response = await supabase.functions.invoke("get-analytics", {
        body: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          granularity: dateRange.granularity,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    refetchInterval: 30000,
  });

  const timeSeries = analyticsData?.timeSeries;
  const lists = analyticsData?.lists;

  const chartData = useMemo(() => {
    const series = timeSeries?.visitors?.data || [];
    const isHourly = dateRange.granularity === "hourly";
    return series.map((point: any) => ({
      date: isHourly
        ? format(new Date(point.date), "HH:mm")
        : format(new Date(point.date), "MMM dd"),
      visitors: point.value,
    }));
  }, [timeSeries, dateRange.granularity]);

  const formatDuration = (seconds: number) => {
    if (!seconds) return "0s";
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const statCards = [
    { label: "Visitors", value: timeSeries?.visitors?.total ?? "—", icon: Users, color: "text-primary" },
    { label: "Pageviews", value: timeSeries?.pageviews?.total ?? "—", icon: Eye, color: "text-blue-500" },
    { label: "Views / Visit", value: timeSeries?.pageviewsPerVisit?.total ?? "—", icon: MousePointerClick, color: "text-green-500" },
    { label: "Visit Duration", value: timeSeries?.sessionDuration?.total ? formatDuration(timeSeries.sessionDuration.total) : "—", icon: Clock, color: "text-amber-500" },
    { label: "Bounce Rate", value: timeSeries?.bounceRate?.total != null ? `${timeSeries.bounceRate.total}%` : "—", icon: TrendingDown, color: "text-destructive" },
  ];

  const renderBreakdown = (title: string, items: any[] | undefined) => (
    <div className="bg-card rounded-lg border border-border p-4">
      <h4 className="font-semibold text-sm mb-3">{title}</h4>
      {!items?.length ? (
        <p className="text-muted-foreground text-sm">No data</p>
      ) : (
        <div className="space-y-2">
          {items.slice(0, 8).map((item: any, idx: number) => {
            const maxVal = items[0]?.value || 1;
            const pct = Math.round((item.value / maxVal) * 100);
            return (
              <div key={idx}>
                <div className="flex justify-between text-sm mb-0.5">
                  <span className="truncate mr-2">{item.label || "Unknown"}</span>
                  <span className="font-medium tabular-nums">{item.value}</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-lg">Site Analytics</h3>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="gap-1">
            <RefreshCw className="h-3.5 w-3.5" />
            <span className="text-xs text-muted-foreground">
              {dataUpdatedAt ? `Updated ${format(new Date(dataUpdatedAt), "HH:mm:ss")}` : ""}
            </span>
          </Button>
        </div>
      </div>

      {/* Time frame selector */}
      <div className="flex gap-1 flex-wrap">
        {timeFrameOptions.map((tf) => (
          <Button
            key={tf.value}
            size="sm"
            variant={timeFrame === tf.value ? "default" : "outline"}
            onClick={() => setTimeFrame(tf.value)}
          >
            {tf.label}
          </Button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 mb-1">
              <s.icon className={`h-4 w-4 ${s.color}`} />
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
            <p className="text-xl font-bold">
              {isLoading ? <span className="animate-pulse bg-muted rounded w-12 h-6 inline-block" /> : s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Visitor trend chart */}
      <div className="bg-card rounded-lg border border-border p-4">
        <h4 className="font-semibold text-sm mb-4">Visitor Trend</h4>
        <div className="h-52">
          {isLoading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">Loading…</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  labelStyle={{ color: "hsl(var(--foreground))" }}
                />
                <Line type="monotone" dataKey="visitors" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Breakdowns 2x2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {renderBreakdown("Top Sources", lists?.source?.data)}
        {renderBreakdown("Top Pages", lists?.page?.data)}
        {renderBreakdown("Countries", lists?.country?.data)}
        {renderBreakdown("Devices", lists?.device?.data)}
      </div>
    </div>
  );
};

export default SiteAnalytics;
