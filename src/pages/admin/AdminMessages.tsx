import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, User, CheckCircle2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const AdminMessages = () => {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unreplied" | "replied">("all");

  const { data: conversations = [] } = useQuery({
    queryKey: ["admin-conversations"],
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("conversation_id, sender_id, vendor_id, message, created_at, is_read")
        .order("created_at", { ascending: false });

      if (!data) return [];

      const convMap = new Map<string, {
        messages: any[];
        vendorId: string;
        userId: string;
        lastMessage: any;
        vendorReplied: boolean;
      }>();

      data.forEach((msg) => {
        const convId = msg.conversation_id;
        if (!convMap.has(convId)) {
          const userId = convId.split("_")[0];
          const vendorId = msg.vendor_id;
          convMap.set(convId, {
            messages: [],
            vendorId,
            userId,
            lastMessage: msg,
            vendorReplied: false,
          });
        }
        convMap.get(convId)!.messages.push(msg);
      });

      // Check if vendor has replied in each conversation
      const vendorIds = [...new Set([...convMap.values()].map(c => c.vendorId))];
      const { data: vendors } = await supabase
        .from("vendors")
        .select("id, store_name, user_id")
        .in("id", vendorIds);
      const vendorMap = new Map((vendors || []).map(v => [v.id, v]));

      const userIds = [...new Set([...convMap.values()].map(c => c.userId))];
      const { data: profiles } = await supabase.rpc("get_public_profiles", { user_ids: userIds });
      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      return [...convMap.entries()].map(([id, conv]) => {
        const vendor = vendorMap.get(conv.vendorId);
        const vendorUserId = vendor?.user_id;
        const vendorReplied = conv.messages.some(m => m.sender_id === vendorUserId);
        return {
          id,
          ...conv,
          vendorReplied,
          vendorName: vendor?.store_name || "Unknown",
          customerName: profileMap.get(conv.userId)?.full_name || "Customer",
          messageCount: conv.messages.length,
        };
      });
    },
  });

  const filteredConversations = conversations.filter((c: any) => {
    if (filter === "replied") return c.vendorReplied;
    if (filter === "unreplied") return !c.vendorReplied;
    return true;
  });

  const { data: selectedMessages = [] } = useQuery({
    queryKey: ["admin-chat-messages", selectedConversation],
    queryFn: async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", selectedConversation!)
        .order("created_at", { ascending: true });
      return data || [];
    },
    enabled: !!selectedConversation,
  });

  // Get vendor user_id for the selected conversation
  const selectedConv = conversations.find((c: any) => c.id === selectedConversation);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <MessageCircle className="h-5 w-5" /> All Messages
      </h2>

      <div className="flex gap-2">
        {(["all", "unreplied", "replied"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={filter === f ? "default" : "outline"}
            onClick={() => setFilter(f)}
            className="capitalize"
          >
            {f === "unreplied" && <Clock className="h-3 w-3 mr-1" />}
            {f === "replied" && <CheckCircle2 className="h-3 w-3 mr-1" />}
            {f} ({conversations.filter((c: any) => {
              if (f === "replied") return c.vendorReplied;
              if (f === "unreplied") return !c.vendorReplied;
              return true;
            }).length})
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[350px_1fr] gap-4 h-[calc(100vh-300px)] min-h-[400px]">
        {/* Conversation List */}
        <div className="bg-card rounded-lg border border-border overflow-y-auto">
          {filteredConversations.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">No conversations</p>
          )}
          {filteredConversations.map((conv: any) => (
            <button
              key={conv.id}
              onClick={() => setSelectedConversation(conv.id)}
              className={`w-full text-left p-3 border-b border-border hover:bg-muted/50 transition-colors ${
                selectedConversation === conv.id ? "bg-primary/5" : ""
              }`}
            >
              <div className="flex items-start gap-2">
                <User className="h-8 w-8 p-1.5 rounded-full bg-muted text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-medium truncate">{conv.customerName}</span>
                    <Badge variant={conv.vendorReplied ? "secondary" : "destructive"} className="text-[10px] shrink-0">
                      {conv.vendorReplied ? "Replied" : "Pending"}
                    </Badge>
                  </div>
                  <p className="text-xs text-primary truncate">↔ {conv.vendorName}</p>
                  <p className="text-xs text-muted-foreground truncate">{conv.lastMessage.message}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {conv.messageCount} messages · {new Date(conv.lastMessage.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Read-Only Chat */}
        <div className="bg-card rounded-lg border border-border flex flex-col">
          {!selectedConversation ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Select a conversation to view
            </div>
          ) : (
            <>
              <div className="p-3 border-b border-border text-sm">
                <span className="font-medium">{selectedConv?.customerName}</span>
                <span className="text-muted-foreground"> ↔ </span>
                <span className="font-medium text-primary">{selectedConv?.vendorName}</span>
                <span className="text-muted-foreground text-xs ml-2">(Read-only)</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {selectedMessages.map((msg: any) => {
                  // Determine if the sender is the vendor
                  const conv = conversations.find((c: any) => c.id === selectedConversation);
                  const isVendor = conv && msg.sender_id !== conv.userId;
                  return (
                    <div key={msg.id} className={`flex ${isVendor ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        isVendor ? "bg-primary/10 text-foreground" : "bg-muted text-foreground"
                      }`}>
                        <p className="text-[10px] font-medium text-muted-foreground mb-0.5">
                          {isVendor ? "Vendor" : "Customer"}
                        </p>
                        <p>{msg.message}</p>
                        <p className="text-[10px] mt-1 text-muted-foreground">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          {msg.is_read ? " · Read" : ""}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminMessages;
