import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users, Eye, MousePointerClick, Clock, TrendingDown, RefreshCw, AlertCircle } from "lucide-react";
import { format, subDays, startOfDay, startOfYesterday, endOfYesterday, isAfter, isBefore, parseISO, differenceInMinutes } from "date-fns";

type TimeFrame = "today" | "yesterday" | "7d" | "30d";

const timeFrameOptions: { label: string; value: TimeFrame }[] = [
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "7 Days", value: "7d" },
  { label: "30 Days", value: "30d" },
];

const SiteAnalytics = () => {
  const [timeFrame, setTimeFrame] = useState<TimeFrame>("7d");
  const queryClient = useQueryClient();

  const { data: cacheRow, isLoading, refetch, dataUpdatedAt } = useQuery({
    queryKey: ["site-analytics-cache"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_analytics_cache" as any)
        .select("data, updated_at")
        .eq("id", 1)
        .single();
      if (error) throw error;
      return data as any;
    },
    refetchInterval: 10000,
  });

  // Live updates: push new analytics the instant the cache row changes
  useEffect(() => {
    const channel = supabase
      .channel("site-analytics-cache-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_analytics_cache" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["site-analytics-cache"] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const analyticsData = cacheRow?.data;
  const timeSeries = analyticsData?.timeSeries;
  const lists = analyticsData?.lists;

  // Filter time series data based on selected time frame
  const filterByTimeFrame = (data: any[] | undefined) => {
    if (!data) return [];
    const now = new Date();
    let start: Date;
    let end: Date = now;

    switch (timeFrame) {
      case "today":
        start = startOfDay(now);
        break;
      case "yesterday":
        start = startOfYesterday();
        end = endOfYesterday();
        break;
      case "7d":
        start = subDays(now, 7);
        break;
      case "30d":
        start = subDays(now, 30);
        break;
      default:
        start = subDays(now, 7);
    }

    return data.filter((point: any) => {
      const date = parseISO(point.date);
      return isAfter(date, start) && isBefore(date, end);
    });
  };

  const filteredVisitors = useMemo(() => filterByTimeFrame(timeSeries?.visitors?.data), [timeSeries, timeFrame]);
  const filteredPageviews = useMemo(() => filterByTimeFrame(timeSeries?.pageviews?.data), [timeSeries, timeFrame]);
  const filteredBounce = useMemo(() => filterByTimeFrame(timeSeries?.bounceRate?.data), [timeSeries, timeFrame]);
  const filteredDuration = useMemo(() => filterByTimeFrame(timeSeries?.sessionDuration?.data), [timeSeries, timeFrame]);
  const filteredPpv = useMemo(() => filterByTimeFrame(timeSeries?.pageviewsPerVisit?.data), [timeSeries, timeFrame]);

  const sumValues = (arr: any[]) => arr.reduce((s: number, p: any) => s + (p.value || 0), 0);
  const avgValues = (arr: any[]) => {
    const nonZero = arr.filter((p: any) => p.value > 0);
    if (!nonZero.length) return 0;
    return Math.round((nonZero.reduce((s: number, p: any) => s + p.value, 0) / nonZero.length) * 100) / 100;
  };

  const chartData = filteredVisitors.map((point: any) => ({
    date: format(parseISO(point.date), "MMM dd"),
    visitors: point.value,
  }));

  const formatDuration = (seconds: number) => {
    if (!seconds) return "0s";
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const statCards = [
    { label: "Visitors", value: sumValues(filteredVisitors), icon: Users, color: "text-primary" },
    { label: "Pageviews", value: sumValues(filteredPageviews), icon: Eye, color: "text-blue-500" },
    { label: "Views / Visit", value: avgValues(filteredPpv), icon: MousePointerClick, color: "text-green-500" },
    { label: "Visit Duration", value: formatDuration(avgValues(filteredDuration)), icon: Clock, color: "text-amber-500" },
    { label: "Bounce Rate", value: `${avgValues(filteredBounce)}%`, icon: TrendingDown, color: "text-destructive" },
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

  const cacheUpdatedAt = cacheRow?.updated_at ? new Date(cacheRow.updated_at) : null;
  const minutesStale = cacheUpdatedAt ? differenceInMinutes(new Date(), cacheUpdatedAt) : null;
  const isStale = minutesStale !== null && minutesStale > 60 * 24;

  const formatStale = () => {
    if (minutesStale === null) return "";
    if (minutesStale < 1) return "just now";
    if (minutesStale < 60) return `${minutesStale}m ago`;
    if (minutesStale < 60 * 24) return `${Math.floor(minutesStale / 60)}h ago`;
    return `${Math.floor(minutesStale / (60 * 24))}d ago`;
  };

  const handleRefresh = () => {
    refetch();
    toast.info("Site analytics is provided by Lovable.", {
      description:
        'No public API exists to auto-pull this. To refresh, ask the AI in chat: "refresh site analytics" — it will fetch and update for you.',
      duration: 8000,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-semibold text-lg">Site Analytics</h3>
          {cacheUpdatedAt && (
            <p className={`text-xs mt-0.5 flex items-center gap-1 ${isStale ? "text-destructive" : "text-muted-foreground"}`}>
              {isStale && <AlertCircle className="h-3 w-3" />}
              Data refreshed {formatStale()}{isStale && " — ask AI to refresh"}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-1">
          <RefreshCw className="h-3.5 w-3.5" />
          <span className="text-xs">Refresh data</span>
        </Button>
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
