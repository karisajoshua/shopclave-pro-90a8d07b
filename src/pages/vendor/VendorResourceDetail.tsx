import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Clock, Eye, Download, ThumbsUp, ThumbsDown, CheckCircle2, FileText } from "lucide-react";
import VideoPlayer from "@/components/resources/VideoPlayer";
import { toast } from "sonner";

const VendorResourceDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const qc = useQueryClient();
  const [lightbox, setLightbox] = useState<string | null>(null);

  const { data: resource, isLoading } = useQuery({
    queryKey: ["resource-detail", slug],
    queryFn: async () => {
      const { data } = await supabase.from("resources").select("*, resource_categories(name, slug)").eq("slug", slug!).eq("is_published", true).maybeSingle();
      return data;
    },
    enabled: !!slug,
  });

  const { data: gallery = [] } = useQuery({
    queryKey: ["resource-gallery", resource?.id],
    queryFn: async () => {
      const { data } = await supabase.from("resource_images").select("*").eq("resource_id", resource!.id).order("position");
      return data || [];
    },
    enabled: !!resource && resource.resource_type === "gallery",
  });

  const { data: nextLesson } = useQuery({
    queryKey: ["resource-next", resource?.id],
    queryFn: async () => {
      const { data } = await supabase.from("resources").select("slug, title").eq("is_published", true).eq("category_id", resource!.category_id).gt("display_order", resource!.display_order).order("display_order").limit(1).maybeSingle();
      return data;
    },
    enabled: !!resource?.category_id,
  });

  const { data: myProgress } = useQuery({
    queryKey: ["my-progress", resource?.id, user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("resource_progress").select("*").eq("user_id", user!.id).eq("resource_id", resource!.id).maybeSingle();
      return data;
    },
    enabled: !!resource && !!user,
  });

  const { data: myFeedback } = useQuery({
    queryKey: ["my-feedback", resource?.id, user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("resource_feedback").select("*").eq("user_id", user!.id).eq("resource_id", resource!.id).maybeSingle();
      return data;
    },
    enabled: !!resource && !!user,
  });

  // Track view + bump count once
  useEffect(() => {
    if (!resource || !user) return;
    (async () => {
      await supabase.rpc("increment_resource_view", { _resource_id: resource.id });
      await supabase.from("resource_progress").upsert({
        user_id: user.id,
        resource_id: resource.id,
        status: resource.resource_type === "article" ? "completed" : "viewed",
        progress_percent: resource.resource_type === "article" ? 100 : 0,
        last_viewed_at: new Date().toISOString(),
      }, { onConflict: "user_id,resource_id" });
      qc.invalidateQueries({ queryKey: ["my-progress", resource.id, user.id] });
      qc.invalidateQueries({ queryKey: ["vendor-resource-progress", user.id] });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resource?.id, user?.id]);

  const markComplete = useMutation({
    mutationFn: async () => {
      if (!user || !resource) return;
      await supabase.from("resource_progress").upsert({
        user_id: user.id, resource_id: resource.id,
        status: "completed", progress_percent: 100,
        last_viewed_at: new Date().toISOString(),
      }, { onConflict: "user_id,resource_id" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-progress", resource?.id, user?.id] });
      qc.invalidateQueries({ queryKey: ["vendor-resource-progress", user?.id] });
    },
  });

  const sendFeedback = useMutation({
    mutationFn: async (helpful: boolean) => {
      if (!user || !resource) return;
      await supabase.from("resource_feedback").upsert({
        user_id: user.id, resource_id: resource.id, helpful,
      }, { onConflict: "resource_id,user_id" });
    },
    onSuccess: () => {
      toast.success("Thanks for your feedback!");
      qc.invalidateQueries({ queryKey: ["my-feedback", resource?.id, user?.id] });
    },
  });

  if (isLoading) return null;
  if (!resource) {
    return (
      <div className="space-y-4">
        <Link to="/vendor/resources"><Button variant="ghost" size="sm"><ChevronLeft className="h-4 w-4 mr-1" />Back</Button></Link>
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">Lesson not found.</CardContent></Card>
      </div>
    );
  }

  const isCompleted = myProgress?.status === "completed";

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <Link to={resource.resource_categories ? `/vendor/resources/c/${resource.resource_categories.slug}` : "/vendor/resources"}>
          <Button variant="ghost" size="sm"><ChevronLeft className="h-4 w-4 mr-1" />{resource.resource_categories?.name || "Back"}</Button>
        </Link>
        {isCompleted && <Badge className="bg-success text-success-foreground gap-1"><CheckCircle2 className="h-3 w-3" />Completed</Badge>}
      </div>

      <div>
        <h1 className="text-2xl md:text-3xl font-bold">{resource.title}</h1>
        {resource.summary && <p className="text-muted-foreground mt-2">{resource.summary}</p>}
        <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-muted-foreground">
          <span className="capitalize px-2 py-0.5 rounded bg-muted">{resource.difficulty}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{resource.duration_minutes} min</span>
          <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{resource.view_count} views</span>
          {resource.tags?.map((t: string) => <Badge key={t} variant="outline" className="text-[10px]">#{t}</Badge>)}
        </div>
      </div>

      {/* Video */}
      {resource.resource_type === "video" && resource.video_url && (
        <VideoPlayer
          url={resource.video_url}
          provider={resource.video_provider}
          poster={resource.cover_image_url}
          onProgress={() => markComplete.mutate()}
        />
      )}

      {/* Cover for articles */}
      {resource.resource_type !== "video" && resource.cover_image_url && (
        <img src={resource.cover_image_url} alt={resource.title} className="w-full rounded-lg border" />
      )}

      {/* Content */}
      {resource.content && (
        <div className="prose prose-sm max-w-none whitespace-pre-wrap text-foreground leading-relaxed">
          {resource.content}
        </div>
      )}

      {/* Gallery */}
      {resource.resource_type === "gallery" && gallery.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {gallery.map((g: any) => (
            <figure key={g.id} className="space-y-1">
              <button onClick={() => setLightbox(g.url)} className="block w-full">
                <img src={g.url} alt={g.caption || ""} className="w-full rounded border hover:opacity-90 transition" />
              </button>
              {g.caption && <figcaption className="text-xs text-muted-foreground">{g.caption}</figcaption>}
            </figure>
          ))}
        </div>
      )}

      {/* Attachments */}
      {Array.isArray(resource.attachments) && resource.attachments.length > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <h3 className="font-semibold text-sm">Downloads</h3>
            <div className="space-y-1.5">
              {resource.attachments.map((a: any, i: number) => (
                <a key={i} href={a.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <FileText className="h-4 w-4" />
                  <span className="flex-1 truncate">{a.name}</span>
                  <Download className="h-3.5 w-3.5" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Feedback */}
      <Card>
        <CardContent className="p-4 flex items-center gap-3">
          <span className="text-sm font-medium flex-1">Was this helpful?</span>
          <Button size="sm" variant={myFeedback?.helpful === true ? "default" : "outline"} onClick={() => sendFeedback.mutate(true)}>
            <ThumbsUp className="h-3.5 w-3.5 mr-1" />Yes
          </Button>
          <Button size="sm" variant={myFeedback?.helpful === false ? "default" : "outline"} onClick={() => sendFeedback.mutate(false)}>
            <ThumbsDown className="h-3.5 w-3.5 mr-1" />No
          </Button>
        </CardContent>
      </Card>

      {/* Mark complete + next */}
      <div className="flex flex-wrap gap-2 justify-between items-center pt-2 border-t">
        {!isCompleted && (
          <Button variant="outline" onClick={() => markComplete.mutate()}>
            <CheckCircle2 className="h-4 w-4 mr-1.5" />Mark as completed
          </Button>
        )}
        {nextLesson && (
          <Button onClick={() => navigate(`/vendor/resources/r/${nextLesson.slug}`)} className="ml-auto">
            Next: {nextLesson.title} <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div onClick={() => setLightbox(null)} className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer">
          <img src={lightbox} alt="" className="max-w-full max-h-full object-contain" />
        </div>
      )}
    </div>
  );
};

export default VendorResourceDetail;
