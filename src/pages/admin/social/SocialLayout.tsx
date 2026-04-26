import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutTemplate, Calendar, FileText, Inbox, Workflow, Sparkles,
  Plug, ShoppingBag, Image as ImageIcon, Share2, ExternalLink, Loader2,
  ChevronDown, ChevronRight, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useOcoyaMe, useOcoyaWorkspaces } from "@/hooks/useOcoya";
import { cn } from "@/lib/utils";

interface NavItem {
  to: string;
  label: string;
  icon: typeof Share2;
  end?: boolean;
}
interface NavGroup {
  label?: string;
  icon?: typeof Share2;
  items: NavItem[];
  defaultOpen?: boolean;
}

const NAV: NavGroup[] = [
  {
    items: [{ to: "/admin/social/design", label: "Design", icon: LayoutTemplate }],
  },
  {
    label: "Planner",
    icon: Calendar,
    defaultOpen: true,
    items: [
      { to: "/admin/social/planner/posts", label: "Posts", icon: FileText },
      { to: "/admin/social/planner/calendar", label: "Calendar", icon: Calendar },
    ],
  },
  {
    items: [{ to: "/admin/social/inbox", label: "Inbox", icon: Inbox }],
  },
  {
    label: "Automation",
    icon: Workflow,
    defaultOpen: true,
    items: [
      { to: "/admin/social/automation/workflows", label: "Workflows", icon: Workflow },
      { to: "/admin/social/automation/agents", label: "AI agents", icon: Sparkles },
    ],
  },
  {
    label: "Integrations",
    icon: Plug,
    defaultOpen: true,
    items: [
      { to: "/admin/social/integrations", label: "Social", icon: Share2 },
      { to: "/admin/social/ecommerce", label: "Ecommerce", icon: ShoppingBag },
    ],
  },
  {
    items: [{ to: "/admin/social/assets", label: "Assets", icon: ImageIcon }],
  },
];

const SocialLayout = () => {
  const location = useLocation();
  const meQuery = useOcoyaMe();
  const workspacesQuery = useOcoyaWorkspaces();
  const [workspaceId, setWorkspaceId] = useState<string | undefined>();

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
      await supabase.from("social_media_settings").update({
        workspace_id: id, workspace_name: ws?.name ?? null, last_synced_at: new Date().toISOString(),
      }).eq("id", existing.id);
    } else {
      await supabase.from("social_media_settings").insert({
        workspace_id: id, workspace_name: ws?.name ?? null, last_synced_at: new Date().toISOString(),
      });
    }
    toast.success("Workspace updated");
  };

  const isAuthError =
    /Invalid API token|Missing API token|Forbidden|OCOYA_API_KEY/i.test(
      meQuery.error?.message || workspacesQuery.error?.message || ""
    );

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Share2 className="h-6 w-6" /> Social Media
          </h1>
          <p className="text-sm text-muted-foreground">
            Full Ocoya workspace — design, plan, automate and analyze social posts.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {workspacesQuery.data && workspacesQuery.data.length > 0 && (
            <Select value={workspaceId} onValueChange={handleWorkspaceChange}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Select workspace" />
              </SelectTrigger>
              <SelectContent>
                {workspacesQuery.data.map((ws) => (
                  <SelectItem key={ws.id} value={ws.id}>{ws.name}</SelectItem>
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
            Verify the OCOYA_API_KEY secret. Generate a new key in Ocoya → Settings → API
            and update it in Lovable Cloud.
          </AlertDescription>
        </Alert>
      )}

      {/* Body: sub-sidebar + content */}
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
        <aside className="rounded-lg border bg-card p-2 h-fit lg:sticky lg:top-4">
          <nav className="space-y-3">
            {NAV.map((group, gi) => (
              <SocialNavGroup key={gi} group={group} currentPath={location.pathname} />
            ))}
          </nav>
        </aside>

        <main className="min-w-0">
          <Outlet context={{ workspaceId }} />
        </main>
      </div>
    </div>
  );
};

interface GroupProps { group: NavGroup; currentPath: string }

const SocialNavGroup = ({ group, currentPath }: GroupProps) => {
  const hasActive = group.items.some((i) =>
    i.end ? currentPath === i.to : currentPath.startsWith(i.to)
  );
  const [open, setOpen] = useState<boolean>(group.defaultOpen ?? hasActive ?? false);

  if (!group.label) {
    return (
      <ul className="space-y-1">
        {group.items.map((item) => (
          <SocialNavItem key={item.to} item={item} />
        ))}
      </ul>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-2 py-1.5 text-xs uppercase tracking-wider font-semibold text-muted-foreground hover:text-foreground"
      >
        <span className="flex items-center gap-2">
          {group.icon && <group.icon className="h-3.5 w-3.5" />}
          {group.label}
        </span>
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {open && (
        <ul className="space-y-1 mt-1">
          {group.items.map((item) => (
            <SocialNavItem key={item.to} item={item} indent />
          ))}
        </ul>
      )}
    </div>
  );
};

const SocialNavItem = ({ item, indent }: { item: NavItem; indent?: boolean }) => (
  <li>
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors",
          indent && "pl-6",
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-foreground hover:bg-muted"
        )
      }
    >
      <item.icon className="h-4 w-4" />
      <span>{item.label}</span>
    </NavLink>
  </li>
);

export default SocialLayout;
