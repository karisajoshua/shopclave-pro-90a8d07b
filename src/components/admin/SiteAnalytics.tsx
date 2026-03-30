import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Button } from "@/components/ui/button";
import { Users, Eye, MousePointerClick, Clock, TrendingDown, RefreshCw } from "lucide-react";
import { format } from "date-fns";

const SiteAnalytics = () => {
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
    refetchInterval: 60000,
  });

  const analyticsData = cacheRow?.data;
  const stats = analyticsData?.stats;
  const breakdowns = analyticsData?.breakdowns;
  const timeseries = stats?.visitors?.timeseries || [];
  const cacheUpdatedAt = cacheRow?.updated_at;

  const chartData = timeseries.map((point: any) => ({
    date: format(new Date(point.date), "EEE"),
    visitors: point.value,
  }));

  const formatDuration = (seconds: number) => {
    if (!seconds) return "0s";
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const statCards = [
    { label: "Visitors", value: stats?.visitors?.total ?? "—", icon: Users, color: "text-primary" },
    { label: "Pageviews", value: stats?.pageviews?.total ?? "—", icon: Eye, color: "text-blue-500" },
    { label: "Views / Visit", value: stats?.pageviewsPerVisit?.total ?? "—", icon: MousePointerClick, color: "text-green-500" },
    { label: "Visit Duration", value: stats?.sessionDuration?.total ? formatDuration(stats.sessionDuration.total) : "—", icon: Clock, color: "text-amber-500" },
    { label: "Bounce Rate", value: stats?.bounceRate?.total != null ? `${stats.bounceRate.total}%` : "—", icon: TrendingDown, color: "text-destructive" },
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
                  <span className="truncate mr-2">{item.name || "Unknown"}</span>
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
              {cacheUpdatedAt ? `Updated ${format(new Date(cacheUpdatedAt), "MMM dd, HH:mm")}` : ""}
            </span>
          </Button>
          {analyticsData?.dateRange && (
            <span className="text-xs text-muted-foreground">
              {analyticsData.dateRange.start} – {analyticsData.dateRange.end}
            </span>
          )}
        </div>
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
        {renderBreakdown("Top Sources", breakdowns?.source)}
        {renderBreakdown("Top Pages", breakdowns?.page)}
        {renderBreakdown("Countries", breakdowns?.country)}
        {renderBreakdown("Devices", breakdowns?.device)}
      </div>
    </div>
  );
};

export default SiteAnalytics;
