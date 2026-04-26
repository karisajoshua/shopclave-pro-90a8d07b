import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, Inbox as InboxIcon } from "lucide-react";
import { toast } from "sonner";
import { useOcoyaInbox, useReplyInbox } from "@/hooks/useOcoya";
import { useSocialContext } from "./useSocialContext";

const SocialInbox = () => {
  const { workspaceId } = useSocialContext();
  const inboxQuery = useOcoyaInbox(workspaceId);
  const reply = useReplyInbox(workspaceId);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [text, setText] = useState("");

  const items = inboxQuery.data ?? [];
  const active = items.find((i) => i.id === activeId) ?? items[0];

  const handleSend = async () => {
    if (!active || !text.trim()) return;
    try {
      await reply.mutateAsync({ id: active.id, text });
      toast.success("Reply sent");
      setText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send reply");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <InboxIcon className="h-5 w-5" /> Inbox
        </CardTitle>
      </CardHeader>
      <CardContent>
        {inboxQuery.isLoading ? (
          <div className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading messages…
          </div>
        ) : inboxQuery.error ? (
          <p className="text-sm text-muted-foreground">
            Inbox isn't available on your Ocoya plan via API. Open Ocoya to view comments and DMs.
          </p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No messages yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
            <ul className="divide-y border rounded-md overflow-hidden max-h-[600px] overflow-y-auto">
              {items.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(m.id)}
                    className={`w-full text-left p-3 hover:bg-muted ${active?.id === m.id ? "bg-muted" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">{m.from || "Unknown"}</span>
                      {m.network && <Badge variant="outline" className="text-xs">{m.network}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.text}</p>
                  </button>
                </li>
              ))}
            </ul>

            <div className="border rounded-md p-4 flex flex-col">
              {active ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-medium">{active.from}</p>
                      <p className="text-xs text-muted-foreground">
                        {active.network} · {active.receivedAt && new Date(active.receivedAt).toLocaleString()}
                      </p>
                    </div>
                    {active.type && <Badge variant="secondary">{active.type}</Badge>}
                  </div>
                  <p className="text-sm whitespace-pre-wrap mb-4">{active.text}</p>

                  <div className="mt-auto space-y-2">
                    <Textarea
                      rows={3}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Write a reply…"
                    />
                    <Button onClick={handleSend} disabled={reply.isPending || !text.trim()}>
                      {reply.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                      Send reply
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">Select a message to reply.</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SocialInbox;
