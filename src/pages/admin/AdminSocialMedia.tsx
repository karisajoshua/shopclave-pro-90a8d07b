import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Share2, ExternalLink, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOcoyaMe, useOcoyaWorkspaces } from "@/hooks/useOcoya";
import ComposeForm from "@/components/admin/social/ComposeForm";
import ScheduledList from "@/components/admin/social/ScheduledList";
import AccountsList from "@/components/admin/social/AccountsList";

const AdminSocialMedia = () => {
  const meQuery = useOcoyaMe();
  const workspacesQuery = useOcoyaWorkspaces();
  const [workspaceId, setWorkspaceId] = useState<string | undefined>();

  // Load saved workspace id from settings
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("social_media_settings")
        .select("workspace_id")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.workspace_id) setWorkspaceId(data.workspace_id);
    })();
  }, []);

  // Auto-pick first workspace if none saved yet
  useEffect(() => {
    if (!workspaceId && workspacesQuery.data && workspacesQuery.data.length > 0) {
      setWorkspaceId(workspacesQuery.data[0].id);
    }
  }, [workspaceId, workspacesQuery.data]);

  const handleWorkspaceChange = async (id: string) => {
    setWorkspaceId(id);
    const ws = workspacesQuery.data?.find((w) => w.id === id);
    const { data: existing } = await supabase
      .from("social_media_settings")
      .select("id")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing?.id) {
      await supabase
        .from("social_media_settings")
        .update({
          workspace_id: id,
          workspace_name: ws?.name ?? null,
          last_synced_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("social_media_settings").insert({
        workspace_id: id,
        workspace_name: ws?.name ?? null,
        last_synced_at: new Date().toISOString(),
      });
    }
    toast.success("Workspace updated");
  };

  const isAuthError = useMemo(() => {
    const m = meQuery.error?.message || workspacesQuery.error?.message || "";
    return /Invalid API token|Missing API token|Forbidden/i.test(m);
  }, [meQuery.error, workspacesQuery.error]);

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Social Media | Admin</title>
        <meta name="description" content="Plan, schedule and publish posts to your connected social accounts via Ocoya." />
      </Helmet>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Share2 className="h-6 w-6" /> Social Media
          </h1>
          <p className="text-sm text-muted-foreground">
            Compose, schedule and manage social posts via Ocoya.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {workspacesQuery.data && workspacesQuery.data.length > 0 && (
            <Select value={workspaceId} onValueChange={handleWorkspaceChange}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Select workspace" />
              </SelectTrigger>
              <SelectContent>
                {workspacesQuery.data.map((ws) => (
                  <SelectItem key={ws.id} value={ws.id}>
                    {ws.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="sm" asChild>
            <a href="https://www.app.ocoya.com" target="_blank" rel="noreferrer">
              Open Ocoya <ExternalLink className="ml-1 h-3 w-3" />
            </a>
          </Button>
        </div>
      </div>

      {(meQuery.isLoading || workspacesQuery.isLoading) && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Connecting to Ocoya…
        </div>
      )}

      {isAuthError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Ocoya authentication failed</AlertTitle>
          <AlertDescription>
            Please verify the OCOYA_API_KEY secret. Generate a new key in Ocoya → Settings → API and update it in Lovable Cloud.
          </AlertDescription>
        </Alert>
      )}

      {meQuery.data && (
        <Card>
          <CardContent className="py-3 text-sm text-muted-foreground">
            Connected as <span className="font-medium text-foreground">{meQuery.data.name || meQuery.data.email}</span>
            {workspaceId && workspacesQuery.data && (
              <>
                {" "}— Workspace:{" "}
                <span className="font-medium text-foreground">
                  {workspacesQuery.data.find((w) => w.id === workspaceId)?.name ?? workspaceId}
                </span>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {!workspaceId && !workspacesQuery.isLoading && !isAuthError ? (
        <Card>
          <CardHeader>
            <CardTitle>No workspace available</CardTitle>
          </CardHeader>
          <CardContent>
            Create a workspace in Ocoya to start scheduling posts from here.
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="compose" className="space-y-4">
          <TabsList>
            <TabsTrigger value="compose">Compose & Schedule</TabsTrigger>
            <TabsTrigger value="scheduled">Scheduled & Drafts</TabsTrigger>
            <TabsTrigger value="accounts">Connected Accounts</TabsTrigger>
          </TabsList>

          <TabsContent value="compose">
            <ComposeForm workspaceId={workspaceId} />
          </TabsContent>
          <TabsContent value="scheduled">
            <ScheduledList workspaceId={workspaceId} />
          </TabsContent>
          <TabsContent value="accounts">
            <AccountsList workspaceId={workspaceId} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default AdminSocialMedia;
