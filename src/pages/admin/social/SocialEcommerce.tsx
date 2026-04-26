import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Loader2, ShoppingBag, Sparkles, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useOcoyaSocialProfiles, useCreateOcoyaPost,
} from "@/hooks/useOcoya";
import { useSocialContext } from "./useSocialContext";

interface ProductOption {
  id: string;
  title: string;
  description: string | null;
  images: string[] | null;
  price: number | null;
}

const SocialEcommerce = () => {
  const { workspaceId } = useSocialContext();
  const profilesQuery = useOcoyaSocialProfiles(workspaceId);
  const createPost = useCreateOcoyaPost(workspaceId);

  const [products, setProducts] = useState<ProductOption[]>([]);
  const [search, setSearch] = useState("");
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [selectedProfiles, setSelectedProfiles] = useState<string[]>([]);
  const [scheduledAt, setScheduledAt] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id, title, description, images, price")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(100);
      setProducts((data ?? []) as unknown as ProductOption[]);
      setLoading(false);
    })();
  }, []);

  const filtered = products.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  const toggleProduct = (id: string) =>
    setSelectedProducts((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleProfile = (id: string) =>
    setSelectedProfiles((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const buildCaption = (p: ProductOption) =>
    `✨ ${p.title}\n\n${(p.description ?? "").slice(0, 500)}${p.price ? `\n\nKsh ${p.price.toLocaleString()}` : ""}`;

  const submit = async () => {
    if (selectedProducts.length === 0) return toast.error("Select at least one product");
    if (selectedProfiles.length === 0) return toast.error("Select at least one social account");

    let okCount = 0;
    for (let i = 0; i < selectedProducts.length; i++) {
      const p = products.find((x) => x.id === selectedProducts[i]);
      if (!p) continue;
      try {
        const stagger = scheduledAt
          ? new Date(new Date(scheduledAt).getTime() + i * 60 * 60 * 1000).toISOString()
          : undefined;
        await createPost.mutateAsync({
          caption: buildCaption(p),
          mediaUrls: (p.images ?? []).slice(0, 4),
          socialProfileIds: selectedProfiles,
          scheduledAt: stagger,
        });
        okCount++;
      } catch (e) {
        toast.error(`${p.title}: ${e instanceof Error ? e.message : "failed"}`);
      }
    }
    if (okCount > 0) {
      toast.success(`${okCount} post${okCount === 1 ? "" : "s"} ${scheduledAt ? "scheduled" : "submitted"}`);
      setSelectedProducts([]);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingBag className="h-5 w-5" /> Products
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
          {loading ? (
            <div className="flex items-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading…
            </div>
          ) : (
            <ul className="divide-y border rounded-md max-h-[500px] overflow-y-auto">
              {filtered.map((p) => (
                <li key={p.id} className="flex items-center gap-3 p-2">
                  <Checkbox
                    checked={selectedProducts.includes(p.id)}
                    onCheckedChange={() => toggleProduct(p.id)}
                  />
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt="" className="w-10 h-10 rounded object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.title}</p>
                    {p.price != null && <p className="text-xs text-muted-foreground">Ksh {p.price.toLocaleString()}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Publish</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs uppercase font-semibold text-muted-foreground mb-1">Accounts</p>
            {profilesQuery.isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (profilesQuery.data ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No accounts connected.</p>
            ) : (
              <ul className="space-y-1">
                {(profilesQuery.data ?? []).map((p) => (
                  <li key={p.id} className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedProfiles.includes(p.id)}
                      onCheckedChange={() => toggleProfile(p.id)}
                    />
                    <span className="text-sm">{p.handle || p.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <p className="text-xs uppercase font-semibold text-muted-foreground mb-1">Schedule from (optional)</p>
            <Input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">Posts are staggered 1 hour apart.</p>
          </div>

          <Button onClick={submit} disabled={createPost.isPending} className="w-full">
            {createPost.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> :
             scheduledAt ? <CalendarClock className="h-4 w-4 mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
            {selectedProducts.length > 0 ? `Post ${selectedProducts.length} product${selectedProducts.length === 1 ? "" : "s"}` : "Post selected"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SocialEcommerce;
