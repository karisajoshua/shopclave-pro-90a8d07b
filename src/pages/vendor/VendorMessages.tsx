import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, MessageCircle, User, Package } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";

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
        .select("conversation_id, sender_id, message, created_at, is_read, product_id, order_id")
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false });

      if (!data) return [];

      // Helper: derive order_id from conversation_id of form "order_<uuid>"
      const deriveOrderId = (convId: string): string | null => {
        if (!convId.startsWith("order_")) return null;
        const suffix = convId.slice("order_".length);
        return /^[0-9a-f-]{36}$/i.test(suffix) ? suffix : null;
      };

      // Group by conversation
      const convMap = new Map<string, { lastMessage: any; unreadCount: number; userId: string; productId: string | null; orderId: string | null; messageCount: number }>();
      data.forEach((msg) => {
        const convId = msg.conversation_id;
        if (!convMap.has(convId)) {
          // For order threads conversation_id is "order_<uuid>"; for product/user threads it's "<userId>_<vendorId>(_<productId>)"
          const userId = convId.startsWith("order_") ? "" : convId.split("_")[0];
          convMap.set(convId, {
            lastMessage: msg,
            unreadCount: 0,
            userId,
            productId: msg.product_id,
            orderId: msg.order_id ?? deriveOrderId(convId),
            messageCount: 0,
          });
        }
        const conv = convMap.get(convId)!;
        conv.messageCount++;
        if (!msg.is_read && msg.sender_id !== user?.id) {
          conv.unreadCount++;
        }
        // Capture product_id from any message in the conversation
        if (msg.product_id && !conv.productId) {
          conv.productId = msg.product_id;
        }
        // Capture order_id from any message in the conversation
        if (msg.order_id && !conv.orderId) {
          conv.orderId = msg.order_id;
        }
      });

      // Get user profiles
      const userIds = [...new Set([...convMap.values()].map(c => c.userId))];
      const { data: profiles } = await supabase.rpc("get_public_profiles", { user_ids: userIds });
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      // Get product names for conversations that reference a product
      const productIds = [...new Set([...convMap.values()].map(c => c.productId).filter(Boolean))] as string[];
      let productMap = new Map<string, { name: string; slug: string }>();
      if (productIds.length > 0) {
        const { data: products } = await supabase.from("products").select("id, name, slug").in("id", productIds);
        productMap = new Map((products || []).map((p: any) => [p.id, { name: p.name, slug: p.slug }]));
      }

      return [...convMap.entries()].map(([id, conv]) => ({
        id,
        ...conv,
        profile: profileMap.get(conv.userId),
        product: conv.productId ? productMap.get(conv.productId) : null,
      }));
    },
    enabled: !!vendor,
  });

  // Derive product/order info from selected conversation
  const selectedConv = conversations.find((c: any) => c.id === selectedConversation);
  const selectedProduct = selectedConv?.product;
  const selectedProductId = selectedConv?.productId;
  const selectedOrderId = selectedConv?.orderId ?? null;

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
        queryClient.invalidateQueries({ queryKey: ["vendor-conversations"] });
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
      const payload: any = {
        conversation_id: selectedConversation,
        sender_id: user.id,
        vendor_id: vendor.id,
        message: newMessage.trim(),
      };
      // Preserve product reference on every reply in a product thread
      if (selectedProductId) payload.product_id = selectedProductId;
      // Preserve order reference so buyer-side RLS (order-linked messages) lets the buyer see this reply.
      // Always derive directly from the conversation_id as the source of truth — don't rely on
      // cached selectedConv which can be stale or briefly undefined right after switching threads.
      let orderIdForPayload: string | null = selectedOrderId;
      if (!orderIdForPayload && selectedConversation.startsWith("order_")) {
        const suffix = selectedConversation.slice("order_".length);
        if (/^[0-9a-f-]{36}$/i.test(suffix)) orderIdForPayload = suffix;
      }
      if (orderIdForPayload) payload.order_id = orderIdForPayload;

      const { error } = await supabase.from("chat_messages").insert(payload);
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
    <div className="space-y-5">
      <AdminPageHeader
        title="Messages"
        subtitle="Reply to customer enquiries about your products and orders."
        count={conversations.length}
        countLabel="conversations"
      />

      <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4 h-[calc(100vh-220px)] min-h-[400px]">
        {/* Conversation List */}
        <div className="admin-card overflow-y-auto p-0">
          {conversations.length === 0 && (
            <AdminEmptyState icon={MessageCircle} title="No conversations" description="Customer messages will appear here." />
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
                    <div className="flex items-center gap-1">
                      {conv.unreadCount > 0 && (
                        <Badge className="text-[10px] h-5 px-1.5">{conv.unreadCount}</Badge>
                      )}
                    </div>
                  </div>
                  {conv.product && (
                    <p className="text-[10px] text-primary truncate flex items-center gap-1">
                      <Package className="h-3 w-3" /> {conv.product.name}
                    </p>
                  )}
                  {conv.orderId && !conv.product && (
                    <p className="text-[10px] text-primary truncate flex items-center gap-1">
                      <Package className="h-3 w-3" /> Order #{String(conv.orderId).slice(0, 8).toUpperCase()}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground truncate">{conv.lastMessage.message}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {conv.messageCount} message{conv.messageCount !== 1 ? "s" : ""} · {new Date(conv.lastMessage.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Chat Area */}
        <div className="admin-card flex flex-col p-0 overflow-hidden">
          {!selectedConversation ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Select a conversation to view messages
            </div>
          ) : (
            <>
              {selectedProduct && (
                <div className="px-4 py-2 border-b border-border">
                  <div className="text-xs bg-muted/50 rounded p-2 text-muted-foreground flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    Re: <a href={`/product/${selectedProduct.slug}`} className="font-medium text-primary hover:underline">{selectedProduct.name}</a>
                  </div>
                </div>
              )}
              {selectedOrderId && !selectedProduct && (
                <div className="px-4 py-2 border-b border-border">
                  <div className="text-xs bg-muted/50 rounded p-2 text-muted-foreground flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    Re: Order #<span className="font-medium text-primary">{String(selectedOrderId).slice(0, 8).toUpperCase()}</span>
                  </div>
                </div>
              )}
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.length > 0 && (
                  <p className="text-[10px] text-center text-muted-foreground mb-2">
                    {messages.length} message{messages.length !== 1 ? "s" : ""}
                  </p>
                )}
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
