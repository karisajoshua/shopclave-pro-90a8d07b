import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink } from "lucide-react";
import { useOcoyaSocialProfiles } from "@/hooks/useOcoya";

interface Props {
  workspaceId?: string;
}

const AccountsList = ({ workspaceId }: Props) => {
  const profilesQuery = useOcoyaSocialProfiles(workspaceId);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Connected Accounts</CardTitle>
        <Button variant="outline" size="sm" asChild>
          <a href="https://www.app.ocoya.com" target="_blank" rel="noreferrer">
            Connect more <ExternalLink className="ml-1 h-3 w-3" />
          </a>
        </Button>
      </CardHeader>
      <CardContent>
        {profilesQuery.isLoading ? (
          <div className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
          </div>
        ) : !profilesQuery.data || profilesQuery.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No social accounts connected. Connect them in the Ocoya app.
          </p>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {profilesQuery.data.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-lg border bg-card p-3"
              >
                {p.avatarUrl ? (
                  <img src={p.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-muted" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{p.handle || p.name || p.id}</p>
                  {p.network && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      {p.network}
                    </Badge>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default AccountsList;
