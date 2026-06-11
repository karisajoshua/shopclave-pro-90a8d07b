import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Paperclip, Mic, Square, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { convertImageToWebp } from "@/lib/imageToWebp";

interface AttachmentButtonProps {
  userId: string;
  onUploaded: (info: { url: string; type: string; size: number; name: string; messageType: "image" | "file" | "voice" }) => void;
  disabled?: boolean;
}

export const AttachmentButton = ({ userId, onUploaded, disabled }: AttachmentButtonProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const upload = async (blob: Blob, name: string, mime: string) => {
    setUploading(true);
    try {
      const ext = name.split(".").pop() || "bin";
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("chat-attachments").upload(path, blob, { contentType: mime });
      if (error) throw error;
      const { data: signed } = await supabase.storage.from("chat-attachments").createSignedUrl(path, 60 * 60 * 24 * 7);
      if (!signed?.signedUrl) throw new Error("Failed to create file URL");
      const messageType: "image" | "file" | "voice" = mime.startsWith("image/")
        ? "image"
        : mime.startsWith("audio/")
          ? "voice"
          : "file";
      onUploaded({ url: signed.signedUrl, type: mime, size: blob.size, name, messageType });
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("File must be under 20MB");
      return;
    }
    await upload(file, file.name, file.type || "application/octet-stream");
    e.target.value = "";
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        await upload(blob, `voice-${Date.now()}.webm`, "audio/webm");
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
    } catch (e: any) {
      toast.error(e.message || "Microphone access denied");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  };

  return (
    <div className="flex gap-1">
      <input
        ref={fileRef}
        type="file"
        accept="image/*,application/pdf,.doc,.docx,.txt"
        className="hidden"
        onChange={handleFile}
      />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        disabled={disabled || uploading || recording}
        onClick={() => fileRef.current?.click()}
        title="Attach file or image"
      >
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
      </Button>
      <Button
        type="button"
        size="icon"
        variant={recording ? "destructive" : "ghost"}
        disabled={disabled || uploading}
        onClick={recording ? stopRecording : startRecording}
        title={recording ? "Stop recording" : "Record voice note"}
      >
        {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </Button>
    </div>
  );
};
