import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Send, CalendarClock, FileEdit, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  useOcoyaSocialProfiles,
  useCreateOcoyaPost,
} from "@/hooks/useOcoya";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  workspaceId?: string;
}

interface ProductOption {
  id: string;
  title: string;
  description: string | null;
  images: string[] | null;
}

const MAX_CAPTION = 10000;

const ComposeForm = ({ workspaceId }: Props) => {
  const profilesQuery = useOcoyaSocialProfiles(workspaceId);
  const createPost = useCreateOcoyaPost(workspaceId);

  const [caption, setCaption] = useState("");
  const [mediaUrlInput, setMediaUrlInput] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState<string>("");
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productId, setProductId] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id, title, description, images")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) setProducts(data as unknown as ProductOption[]);
    })();
  }, []);

  const charCount = caption.length;
  const overLimit = charCount > MAX_CAPTION;

  const toggleProfile = (id: string) =>
    setSelectedProfiles((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );

  const addMedia = () => {
    const url = mediaUrlInput.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url)) {
      toast.error("Media URL must start with http(s)://");
      return;
    }
    setMediaUrls((m) => [...m, url]);
    setMediaUrlInput("");
  };

  const removeMedia = (url: string) =>
    setMediaUrls((m) => m.filter((u) => u !== url));

  const prefillFromProduct = (id: string) => {
    setProductId(id);
    if (!id) return;
    const p = products.find((x) => x.id === id);
    if (!p) return;
    const text = `${p.title}${p.description ? `\n\n${p.description.slice(0, 800)}` : ""}`;
    setCaption(text);
    if (p.images && p.images.length > 0) {
      setMediaUrls(p.images.slice(0, 4));
    }
  };

  const submit = async (asDraft: boolean) => {
    if (selectedProfiles.length === 0) {
      toast.error("Select at least one social profile");
      return;
    }
    if (!caption && mediaUrls.length === 0) {
      toast.error("Add a caption or at least one media URL");
      return;
    }
    if (overLimit) {
      toast.error(`Caption must be under ${MAX_CAPTION} characters`);
      return;
    }
    try {
      const body: any = {
        caption: caption || undefined,
        mediaUrls: mediaUrls.length ? mediaUrls : undefined,
        socialProfileIds: selectedProfiles,
      };
      if (!asDraft && scheduledAt) {
        body.scheduledAt = new Date(scheduledAt).toISOString();
      }
      await createPost.mutateAsync(body);
      toast.success(asDraft ? "Draft saved" : scheduledAt ? "Post scheduled" : "Post submitted");
      setCaption("");
      setMediaUrls([]);
      setScheduledAt("");
      setProductId("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create post";
      toast.error(msg);
    }
  };

  const profiles = profilesQuery.data ?? [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileEdit className="h-5 w-5" /> Compose
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Pre-fill from product (optional)</Label>
            <select
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={productId}
              onChange={(e) => prefillFromProduct(e.target.value)}
            >
              <option value="">— Select a product —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>Caption</Label>
            <Textarea
              rows={6}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write your post…"
            />
            <div className={`text-xs mt-1 ${overLimit ? "text-destructive" : "text-muted-foreground"}`}>
              {charCount.toLocaleString()} / {MAX_CAPTION.toLocaleString()}
            </div>
          </div>

          <div>
            <Label>Media URLs</Label>
            <div className="flex gap-2">
              <Input
                placeholder="https://…"
                value={mediaUrlInput}
                onChange={(e) => setMediaUrlInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addMedia();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addMedia}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {mediaUrls.length > 0 && (
              <ul className="mt-2 space-y-1">
                {mediaUrls.map((url) => (
                  <li key={url} className="flex items-center justify-between text-xs bg-muted rounded px-2 py-1">
                    <span className="truncate">{url}</span>
                    <button
                      type="button"
                      onClick={() => removeMedia(url)}
                      className="text-muted-foreground hover:text-destructive ml-2"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <Label>Schedule for (optional)</Label>
            <Input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Leave empty to post immediately.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={() => submit(false)} disabled={createPost.isPending}>
              {createPost.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : scheduledAt ? (
                <CalendarClock className="h-4 w-4 mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {scheduledAt ? "Schedule post" : "Post now"}
            </Button>
            <Button variant="outline" onClick={() => submit(true)} disabled={createPost.isPending}>
              Save draft
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Publish to</CardTitle>
        </CardHeader>
        <CardContent>
          {profilesQuery.isLoading ? (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading profiles…
            </div>
          ) : profiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No social accounts connected in Ocoya yet. Connect them in the Ocoya app.
            </p>
          ) : (
            <ul className="space-y-2">
              {profiles.map((p) => (
                <li key={p.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`prof-${p.id}`}
                    checked={selectedProfiles.includes(p.id)}
                    onCheckedChange={() => toggleProfile(p.id)}
                  />
                  <Label htmlFor={`prof-${p.id}`} className="cursor-pointer text-sm">
                    <span className="font-medium">{p.handle || p.name || p.id}</span>
                    {p.network && (
                      <span className="ml-2 text-xs text-muted-foreground">({p.network})</span>
                    )}
                  </Label>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ComposeForm;
