import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Send, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface ChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId: string;
  vendorName: string;
  productId?: string;
  productName?: string;
}

const ChatDialog = ({ open, onOpenChange, vendorId, vendorName, productId, productName }: ChatDialogProps) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const conversationId = user ? `${user.id}_${vendorId}` : "";

  useEffect(() => {
    if (!open || !conversationId) return;

    const fetchMessages = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      setMessages(data || []);
    };
    fetchMessages();

    // Subscribe to realtime
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [open, conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Mark messages as read
  useEffect(() => {
    if (!open || !user || !messages.length) return;
    const unread = messages.filter((m) => !m.is_read && m.sender_id !== user.id);
    if (unread.length > 0) {
      supabase
        .from("chat_messages")
        .update({ is_read: true })
        .in("id", unread.map((m) => m.id))
        .then();
    }
  }, [messages, open, user]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;
    setSending(true);
    try {
      const payload: any = {
        conversation_id: conversationId,
        sender_id: user.id,
        vendor_id: vendorId,
        message: newMessage.trim(),
      };
      if (productId) payload.product_id = productId;

      const { error } = await supabase.from("chat_messages").insert(payload);
      if (error) throw error;

      // Create notification for vendor
      const { data: vendor } = await supabase
        .from("vendors")
        .select("user_id")
        .eq("id", vendorId)
        .single();

      if (vendor) {
        await supabase.from("notifications").insert({
          recipient_id: vendor.user_id,
          title: "New Message",
          message: `New message${productName ? ` about "${productName}"` : ""}: "${newMessage.trim().slice(0, 100)}"`,
          type: "chat",
        });
      }

      setNewMessage("");
    } catch (e: any) {
      toast.error(e.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chat with {vendorName}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground text-center py-8">
            Please log in to chat with the seller.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Chat with {vendorName}
          </DialogTitle>
        </DialogHeader>

        {productName && (
          <div className="text-xs bg-muted/50 rounded p-2 text-muted-foreground">
            Re: <span className="font-medium text-foreground">{productName}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-[200px] max-h-[400px] space-y-2 py-2">
          {productName && messages.length === 0 && (
            <div className="text-xs text-center bg-muted/50 rounded p-2 text-muted-foreground">
              Inquiring about: <span className="font-medium text-foreground">{productName}</span>
            </div>
          )}
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Start a conversation with {vendorName}
            </p>
          )}
          {messages.map((msg) => {
            const isMe = msg.sender_id === user.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  isMe
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}>
                  <p>{msg.message}</p>
                  <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <div className="flex gap-2 pt-2 border-t border-border">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          />
          <Button size="icon" onClick={handleSend} disabled={sending || !newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatDialog;
