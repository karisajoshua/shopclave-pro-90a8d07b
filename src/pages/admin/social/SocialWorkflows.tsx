import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Play, Pause, Workflow } from "lucide-react";
import { toast } from "sonner";
import {
  useOcoyaAutomations, useStartAutomation, usePauseAutomation,
} from "@/hooks/useOcoya";
import { useSocialContext } from "./useSocialContext";

const SocialWorkflows = () => {
  const { workspaceId } = useSocialContext();
  const list = useOcoyaAutomations(workspaceId);
  const start = useStartAutomation(workspaceId);
  const pause = usePauseAutomation(workspaceId);

  const handle = async (action: "start" | "pause", id: string) => {
    try {
      if (action === "start") await start.mutateAsync(id);
      else await pause.mutateAsync(id);
      toast.success(`Automation ${action === "start" ? "started" : "paused"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Workflow className="h-5 w-5" /> Workflows
        </CardTitle>
      </CardHeader>
      <CardContent>
        {list.isLoading ? (
          <div className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading automations…
          </div>
        ) : list.error ? (
          <p className="text-sm text-muted-foreground">
            Automations aren't available on your Ocoya plan via API.
          </p>
        ) : !list.data || list.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No workflows yet. Create one in Ocoya.
          </p>
        ) : (
          <ul className="divide-y">
            {list.data.map((a) => {
              const isRunning = (a.status || "").toLowerCase() === "running" || (a.status || "").toLowerCase() === "active";
              return (
                <li key={a.id} className="py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{a.name || a.id}</p>
                      <Badge variant={isRunning ? "default" : "outline"}>{a.status || "paused"}</Badge>
                    </div>
                    {a.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">{a.description}</p>
                    )}
                  </div>
                  {isRunning ? (
                    <Button size="sm" variant="outline" onClick={() => handle("pause", a.id)} disabled={pause.isPending}>
                      <Pause className="h-4 w-4 mr-1" /> Pause
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => handle("start", a.id)} disabled={start.isPending}>
                      <Play className="h-4 w-4 mr-1" /> Start
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default SocialWorkflows;
