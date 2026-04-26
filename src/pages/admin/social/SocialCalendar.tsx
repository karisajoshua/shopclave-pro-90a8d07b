import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useOcoyaPosts } from "@/hooks/useOcoya";
import { useSocialContext } from "./useSocialContext";
import { cn } from "@/lib/utils";

const SocialCalendar = () => {
  const { workspaceId } = useSocialContext();
  const postsQuery = useOcoyaPosts(workspaceId);
  const [month, setMonth] = useState<Date>(new Date());
  const [selected, setSelected] = useState<Date | undefined>(new Date());

  const postsByDay = useMemo(() => {
    const map = new Map<string, typeof postsQuery.data>();
    (postsQuery.data ?? []).forEach((p) => {
      if (!p.scheduledAt) return;
      const key = new Date(p.scheduledAt).toDateString();
      const arr = map.get(key) ?? [];
      arr.push(p);
      map.set(key, arr as any);
    });
    return map;
  }, [postsQuery.data]);

  const selectedDayPosts =
    selected ? (postsByDay.get(selected.toDateString()) ?? []) : [];

  const scheduledDays = Array.from(postsByDay.keys()).map((k) => new Date(k));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>
            {month.toLocaleString(undefined, { month: "long", year: "numeric" })}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => { const t = new Date(); setMonth(t); setSelected(t); }}>
              Today
            </Button>
            <Button variant="outline" size="icon" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {postsQuery.isLoading ? (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading scheduled posts…
            </div>
          ) : (
            <Calendar
              mode="single"
              month={month}
              onMonthChange={setMonth}
              selected={selected}
              onSelect={setSelected}
              modifiers={{ scheduled: scheduledDays }}
              modifiersClassNames={{ scheduled: "after:content-[''] after:block after:w-1.5 after:h-1.5 after:rounded-full after:bg-primary after:mx-auto after:mt-0.5 relative" }}
              className={cn("p-3 pointer-events-auto w-full")}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {selected ? selected.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" }) : "Select a day"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selected ? (
            <p className="text-sm text-muted-foreground">Pick a date to see scheduled posts.</p>
          ) : selectedDayPosts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No posts scheduled for this day.</p>
          ) : (
            <ul className="space-y-2">
              {selectedDayPosts.map((p) => (
                <li key={p.id} className="rounded-md border p-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">
                      {p.scheduledAt && new Date(p.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </Badge>
                    {p.status && <Badge variant="outline">{p.status}</Badge>}
                  </div>
                  <p className="text-sm mt-1 line-clamp-3">{p.caption || <em>(no caption)</em>}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SocialCalendar;
