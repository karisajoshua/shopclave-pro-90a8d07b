import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageCircle, User } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

const VendorMessages = () => {
  const { vendor } = useOutletContext<{ vendor: any }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Get all conversations for this vendor
  const { data: conversations = [] } = useQuery({
    queryKey: ["vendor-conversations", vendor?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("conversation_id, sender_id, message, created_at, is_read")
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false });

      if (!data) return [];

      // Group by conversation
      const convMap = new Map<string, { lastMessage: any; unreadCount: number; userId: string }>();
      data.forEach((msg) => {
        const convId = msg.conversation_id;
        if (!convMap.has(convId)) {
          const userId = convId.split("_")[0]; // user_id is first part
          convMap.set(convId, { lastMessage: msg, unreadCount: 0, userId });
        }
        if (!msg.is_read && msg.sender_id !== user?.id) {
          const conv = convMap.get(convId)!;
          conv.unreadCount++;
        }
      });

      // Get user profiles
      const userIds = [...new Set([...convMap.values()].map(c => c.userId))];
      const { data: profiles } = await supabase.rpc("get_public_profiles", { user_ids: userIds });
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      return [...convMap.entries()].map(([id, conv]) => ({
        id,
        ...conv,
        profile: profileMap.get(conv.userId),
      }));
    },
    enabled: !!vendor,
  });

  // Get product reference for current conversation
  const conversationProduct = messages.find(m => m.product_id)?.product_id;
  const { data: productRef } = useQuery({
    queryKey: ["chat-product", conversationProduct],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("name, slug").eq("id", conversationProduct!).single();
      return data;
    },
    enabled: !!conversationProduct,
  });

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedConversation) return;
    const fetchMessages = async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", selectedConversation)
        .order("created_at", { ascending: true });
      setMessages(data || []);

      // Mark as read
      const unread = (data || []).filter(m => !m.is_read && m.sender_id !== user?.id);
      if (unread.length > 0) {
        await supabase
          .from("chat_messages")
          .update({ is_read: true })
          .in("id", unread.map(m => m.id));
        queryClient.invalidateQueries({ queryKey: ["vendor-conversations"] });
      }
    };
    fetchMessages();

    const channel = supabase
      .channel(`vendor-chat-${selectedConversation}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "chat_messages",
        filter: `conversation_id=eq.${selectedConversation}`,
      }, (payload) => {
        setMessages((prev) => [...prev, payload.new]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedConversation]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user || !selectedConversation) return;
    setSending(true);
    try {
      const { error } = await supabase.from("chat_messages").insert({
        conversation_id: selectedConversation,
        sender_id: user.id,
        vendor_id: vendor.id,
        message: newMessage.trim(),
      });
      if (error) throw error;
      setNewMessage("");
      queryClient.invalidateQueries({ queryKey: ["vendor-conversations"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <MessageCircle className="h-5 w-5" /> Messages
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4 h-[calc(100vh-250px)] min-h-[400px]">
        {/* Conversation List */}
        <div className="bg-card rounded-lg border border-border overflow-y-auto">
          {conversations.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No messages yet</p>
          )}
          {conversations.map((conv: any) => (
            <button
              key={conv.id}
              onClick={() => setSelectedConversation(conv.id)}
              className={`w-full text-left p-3 border-b border-border hover:bg-muted/50 transition-colors ${
                selectedConversation === conv.id ? "bg-primary/5" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <User className="h-8 w-8 p-1.5 rounded-full bg-muted text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate">
                      {conv.profile?.full_name || "Customer"}
                    </span>
                    {conv.unreadCount > 0 && (
                      <Badge className="text-[10px] h-5 px-1.5">{conv.unreadCount}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{conv.lastMessage.message}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {new Date(conv.lastMessage.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Chat Area */}
        <div className="bg-card rounded-lg border border-border flex flex-col">
          {!selectedConversation ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Select a conversation to view messages
            </div>
          ) : (
            <>
              {productRef && (
                <div className="px-4 py-2 border-b border-border">
                  <div className="text-xs bg-muted/50 rounded p-2 text-muted-foreground">
                    Re: <a href={`/product/${productRef.slug}`} className="font-medium text-primary hover:underline">{productRef.name}</a>
                  </div>
                </div>
              )}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.map((msg) => {
                  const isMe = msg.sender_id === user?.id;
                  return (
                    <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        isMe ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
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
              <div className="flex gap-2 p-3 border-t border-border">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a reply..."
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                />
                <Button size="icon" onClick={handleSend} disabled={sending || !newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VendorMessages;
