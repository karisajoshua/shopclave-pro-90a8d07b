import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ExternalLink, LayoutTemplate, FileEdit } from "lucide-react";
import { useOcoyaTemplates, useOcoyaDesigns } from "@/hooks/useOcoya";
import { useSocialContext } from "./useSocialContext";

const POST_SIZES = [
  { name: "Instagram Post", size: "1080 × 1080" },
  { name: "Instagram Story", size: "1080 × 1920" },
  { name: "Instagram Reel", size: "1080 × 1920" },
  { name: "Facebook Post", size: "1200 × 630" },
  { name: "Twitter / X Post", size: "1600 × 900" },
  { name: "LinkedIn Post", size: "1200 × 627" },
  { name: "TikTok Video", size: "1080 × 1920" },
  { name: "YouTube Thumbnail", size: "1280 × 720" },
  { name: "Pinterest Pin", size: "1000 × 1500" },
];

const SocialDesign = () => {
  const { workspaceId } = useSocialContext();
  const templatesQuery = useOcoyaTemplates(workspaceId);
  const designsQuery = useOcoyaDesigns(workspaceId);

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardContent className="p-6 md:p-10 bg-gradient-to-br from-primary/15 to-primary/5">
          <Tabs defaultValue="templates">
            <TabsList className="bg-background/60">
              <TabsTrigger value="templates">
                <LayoutTemplate className="h-4 w-4 mr-2" /> Templates
              </TabsTrigger>
              <TabsTrigger value="sizes">Sizes</TabsTrigger>
            </TabsList>

            <TabsContent value="templates" className="mt-6">
              <div className="text-center max-w-xl mx-auto">
                <LayoutTemplate className="h-10 w-10 mx-auto text-primary mb-2" />
                <h2 className="text-2xl font-semibold">Explore template library</h2>
                <p className="text-muted-foreground mt-2">
                  Hundreds of templates for posts, stories, and ads. Open Ocoya
                  to design with the full editor.
                </p>
                <div className="flex justify-center gap-2 mt-4">
                  <Button asChild>
                    <a href="https://www.app.ocoya.com" target="_blank" rel="noreferrer">
                      <FileEdit className="h-4 w-4 mr-2" /> Start blank
                    </a>
                  </Button>
                  <Button variant="outline" asChild>
                    <a href="https://www.app.ocoya.com/templates" target="_blank" rel="noreferrer">
                      Browse all <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {templatesQuery.isLoading ? (
                  <div className="col-span-full flex items-center text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading templates…
                  </div>
                ) : templatesQuery.error ? (
                  <p className="col-span-full text-sm text-muted-foreground">
                    Templates list isn't available on your Ocoya plan via API. Use "Browse all" to open it in Ocoya.
                  </p>
                ) : (templatesQuery.data ?? []).slice(0, 12).map((t) => (
                  <a
                    key={t.id}
                    href={`https://www.app.ocoya.com/templates/${t.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="group rounded-lg overflow-hidden border bg-card hover:shadow-md transition"
                  >
                    {t.thumbnailUrl ? (
                      <img src={t.thumbnailUrl} alt={t.name || "Template"} className="w-full aspect-square object-cover" />
                    ) : (
                      <div className="w-full aspect-square bg-muted" />
                    )}
                    <div className="p-2 text-xs truncate">{t.name || "Untitled"}</div>
                  </a>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="sizes" className="mt-6">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {POST_SIZES.map((s) => (
                  <a
                    key={s.name}
                    href="https://www.app.ocoya.com"
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-lg border bg-card p-4 hover:bg-muted transition"
                  >
                    <p className="font-medium text-sm">{s.name}</p>
                    <p className="text-xs text-muted-foreground">{s.size}</p>
                  </a>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent designs</CardTitle>
        </CardHeader>
        <CardContent>
          {designsQuery.isLoading ? (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading designs…
            </div>
          ) : !designsQuery.data || designsQuery.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No designs yet — create your first one in Ocoya.
            </p>
          ) : (
            <ul className="divide-y">
              {designsQuery.data.map((d) => (
                <li key={d.id} className="py-2 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    {d.thumbnailUrl && (
                      <img src={d.thumbnailUrl} alt="" className="w-10 h-10 rounded object-cover" />
                    )}
                    <span className="text-sm truncate">{d.name || "Untitled design"}</span>
                  </div>
                  <Button size="sm" variant="ghost" asChild>
                    <a href={`https://www.app.ocoya.com/designs/${d.id}`} target="_blank" rel="noreferrer">
                      Open <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SocialDesign;
