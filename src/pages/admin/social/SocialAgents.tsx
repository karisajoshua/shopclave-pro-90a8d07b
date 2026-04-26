import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, Copy, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import {
  useGenerateCaption, useGenerateHashtags, useGenerateAiImage,
} from "@/hooks/useOcoya";

const SocialAgents = () => {
  const captionMut = useGenerateCaption();
  const hashtagsMut = useGenerateHashtags();
  const imageMut = useGenerateAiImage();

  const [captionPrompt, setCaptionPrompt] = useState("");
  const [captionResult, setCaptionResult] = useState("");

  const [hashtagsTopic, setHashtagsTopic] = useState("");
  const [hashtagsResult, setHashtagsResult] = useState<string[]>([]);

  const [imagePrompt, setImagePrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  const safeRun = async <T,>(fn: () => Promise<T>, ok: (v: T) => void) => {
    try {
      ok(await fn());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "AI request failed");
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> Caption generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label>Describe the post</Label>
          <Textarea rows={3} value={captionPrompt} onChange={(e) => setCaptionPrompt(e.target.value)} placeholder="e.g. New leather handbag launch — minimalist, bold colors" />
          <Button
            onClick={() => safeRun(() => captionMut.mutateAsync({ prompt: captionPrompt }), setCaptionResult)}
            disabled={captionMut.isPending || !captionPrompt.trim()}
          >
            {captionMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Generate caption
          </Button>
          {captionResult && (
            <div className="rounded-md border p-3 text-sm bg-muted/50 whitespace-pre-wrap">
              {captionResult}
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => copy(captionResult)}>
                <Copy className="h-3 w-3 mr-1" /> Copy
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> Hashtag generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label>Topic</Label>
          <Input value={hashtagsTopic} onChange={(e) => setHashtagsTopic(e.target.value)} placeholder="e.g. fashion, handbags, summer" />
          <Button
            onClick={() => safeRun(() => hashtagsMut.mutateAsync({ topic: hashtagsTopic, count: 15 }), setHashtagsResult)}
            disabled={hashtagsMut.isPending || !hashtagsTopic.trim()}
          >
            {hashtagsMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Generate hashtags
          </Button>
          {hashtagsResult.length > 0 && (
            <div className="rounded-md border p-3 text-sm bg-muted/50">
              <div className="flex flex-wrap gap-1">
                {hashtagsResult.map((h) => (
                  <span key={h} className="text-xs bg-background border rounded px-2 py-1">#{h.replace(/^#/, "")}</span>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => copy(hashtagsResult.map((h) => `#${h.replace(/^#/, "")}`).join(" "))}>
                <Copy className="h-3 w-3 mr-1" /> Copy all
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" /> AI image
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label>Image prompt</Label>
          <Textarea rows={2} value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)} placeholder="e.g. A photorealistic flat-lay of leather handbags on marble" />
          <Button
            onClick={() => safeRun(() => imageMut.mutateAsync({ prompt: imagePrompt, size: "1080x1080" }), setImageUrl)}
            disabled={imageMut.isPending || !imagePrompt.trim()}
          >
            {imageMut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ImageIcon className="h-4 w-4 mr-2" />}
            Generate image
          </Button>
          {imageUrl && (
            <div className="rounded-md border p-2 inline-block">
              <img src={imageUrl} alt="AI generated" className="max-w-sm rounded" />
              <div className="flex gap-2 mt-2">
                <Button variant="ghost" size="sm" onClick={() => copy(imageUrl)}>
                  <Copy className="h-3 w-3 mr-1" /> Copy URL
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SocialAgents;
