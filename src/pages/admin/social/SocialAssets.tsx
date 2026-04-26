import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Image as ImageIcon, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { useOcoyaAssets } from "@/hooks/useOcoya";
import { useSocialContext } from "./useSocialContext";

const SocialAssets = () => {
  const { workspaceId } = useSocialContext();
  const assets = useOcoyaAssets(workspaceId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" /> Ocoya assets
          </CardTitle>
          <Button variant="outline" size="sm" asChild>
            <a href="https://www.app.ocoya.com" target="_blank" rel="noreferrer">
              Manage in Ocoya <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </Button>
        </CardHeader>
        <CardContent>
          {assets.isLoading ? (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading assets…
            </div>
          ) : assets.error ? (
            <p className="text-sm text-muted-foreground">
              Assets API isn't available on your Ocoya plan.
            </p>
          ) : !assets.data || assets.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No assets yet.</p>
          ) : (
            <ul className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {assets.data.map((a) => (
                <li key={a.id} className="rounded-md border overflow-hidden bg-card">
                  {a.thumbnailUrl || a.url ? (
                    <img src={a.thumbnailUrl || a.url} alt={a.name || ""} className="w-full aspect-square object-cover" />
                  ) : (
                    <div className="w-full aspect-square bg-muted" />
                  )}
                  <p className="text-xs p-1.5 truncate">{a.name || a.id}</p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Barakaz Media Library</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Use your shared Barakaz media in posts. Copy a public URL and paste it into the Posts composer.
          </p>
          <Button asChild variant="outline">
            <Link to="/admin/media">Open Media Library</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SocialAssets;
