import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import {
  Search,
  Shield,
  AlertTriangle,
  FileText,
  ImageIcon,
  Mic,
  MapPin,
  Paperclip,
  Pencil,
  Trash2,
  Lock,
  Unlock,
  Flag,
  ChevronRight,
} from "lucide-react";

type OrderRow = {
  id: string;
  created_at: string;
  status: string;
  total: number;
  payment_method: string | null;
  payment_status: string;
  user_id: string | null;
  shipping_address: any;
  buyer_name?: string;
  buyer_phone?: string;
  vendor_names?: string[];
  has_dispute?: boolean;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  vendor_id: string;
  order_id: string | null;
  message: string;
  message_type: string;
  is_system_message: boolean;
  attachment_url: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
  deleted_by_sender: boolean;
  deleted_by_receiver: boolean;
  deleted_at: string | null;
  edited_at: string | null;
  seen_at: string | null;
  created_at: string;
};

type AuditLog = {
  id: string;
  user_id: string | null;
  order_id: string | null;
  action_type: string;
  action_details: any;
  created_at: string;
};

type Dispute = {
  id: string;
  order_id: string;
  opened_by: string;
  reason: string;
  status: string;
  admin_notes: string | null;
  opened_at: string;
  closed_at: string | null;
};

type RiskFlag = {
  id: string;
  user_id: string;
  flag_type: string;
  reason: string | null;
  score: number;
  created_at: string;
  expires_at: string | null;
};

const PAGE_SIZE = 25;

export default function AdminEvidence() {
  const [params, setParams] = useSearchParams();
  const selectedOrderId = params.get("order");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const loadOrders = async () => {
    setLoading(true);
    let query = supabase
      .from("orders")
      .select("id, created_at, status, total, payment_method, payment_status, user_id, shipping_address")
      .order("created_at", { ascending: false })
      .limit(200);

    if (statusFilter !== "all") query = query.eq("status", statusFilter);

    const { data: ordersData, error } = await query;
    if (error) {
      toast({ title: "Failed to load orders", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const orderIds = (ordersData ?? []).map((o) => o.id);
    const userIds = Array.from(new Set((ordersData ?? []).map((o) => o.user_id).filter(Boolean) as string[]));

    const [profilesRes, itemsRes, disputesRes] = await Promise.all([
      userIds.length
        ? supabase.rpc("get_public_profiles", { user_ids: userIds })
        : Promise.resolve({ data: [], error: null } as any),
      orderIds.length
        ? supabase.from("order_items").select("order_id, vendor_id").in("order_id", orderIds)
        : Promise.resolve({ data: [], error: null } as any),
      orderIds.length
        ? supabase.from("disputes").select("order_id, status").in("order_id", orderIds)
        : Promise.resolve({ data: [], error: null } as any),
    ]);

    const profileMap = new Map<string, { full_name: string | null }>();
    (profilesRes.data ?? []).forEach((p: any) => profileMap.set(p.user_id, p));

    const vendorIds = Array.from(new Set((itemsRes.data ?? []).map((i: any) => i.vendor_id).filter(Boolean)));
    const vendorsRes = vendorIds.length
      ? await supabase.from("vendors").select("id, store_name").in("id", vendorIds)
      : ({ data: [] } as any);
    const vendorMap = new Map<string, string>();
    (vendorsRes.data ?? []).forEach((v: any) => vendorMap.set(v.id, v.store_name));

    const vendorsByOrder = new Map<string, string[]>();
    (itemsRes.data ?? []).forEach((it: any) => {
      const list = vendorsByOrder.get(it.order_id) ?? [];
      const name = vendorMap.get(it.vendor_id);
      if (name && !list.includes(name)) list.push(name);
      vendorsByOrder.set(it.order_id, list);
    });

    const disputeSet = new Set(
      (disputesRes.data ?? [])
        .filter((d: any) => d.status === "open" || d.status === "investigating")
        .map((d: any) => d.order_id),
    );

    const enriched: OrderRow[] = (ordersData ?? []).map((o) => {
      const profile = o.user_id ? profileMap.get(o.user_id) : undefined;
      const addr = (o.shipping_address ?? {}) as any;
      return {
        ...o,
        buyer_name: profile?.full_name ?? addr?.full_name ?? "Guest",
        buyer_phone: addr?.phone ?? "",
        vendor_names: vendorsByOrder.get(o.id) ?? [],
        has_dispute: disputeSet.has(o.id),
      };
    });

    setOrders(enriched);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        (o.buyer_name ?? "").toLowerCase().includes(q) ||
        (o.buyer_phone ?? "").toLowerCase().includes(q) ||
        (o.vendor_names ?? []).some((v) => v.toLowerCase().includes(q)),
    );
  }, [orders, search]);

  if (selectedOrderId) {
    return <EvidenceDetail orderId={selectedOrderId} onBack={() => setParams({})} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-display font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" /> Evidence Vault
          </h2>
          <p className="text-sm text-muted-foreground">
            Investigate orders with full chat history, deleted messages, audit logs, and disputes.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by order ID, buyer name, phone, or vendor…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="shipped">Shipped</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Buyer</TableHead>
                <TableHead>Vendors</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No orders found.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((o) => (
                  <TableRow
                    key={o.id}
                    className="cursor-pointer"
                    onClick={() => setParams({ order: o.id })}
                  >
                    <TableCell className="font-mono text-xs">
                      <div className="flex items-center gap-2">
                        #{o.id.slice(0, 8)}
                        {o.has_dispute && (
                          <Badge variant="destructive" className="text-[10px]">
                            <AlertTriangle className="h-3 w-3 mr-1" /> Dispute
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{o.buyer_name}</div>
                      {o.buyer_phone && (
                        <div className="text-xs text-muted-foreground">{o.buyer_phone}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {o.vendor_names && o.vendor_names.length > 0 ? o.vendor_names.join(", ") : "—"}
                    </TableCell>
                    <TableCell className="text-sm">KSh {Number(o.total).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs capitalize">
                        {o.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {format(new Date(o.created_at), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================
// Detail view
// ============================================================

function EvidenceDetail({ orderId, onBack }: { orderId: string; onBack: () => void }) {
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { full_name: string | null; avatar_url: string | null }>>({});
  const [vendor, setVendor] = useState<any>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [riskFlags, setRiskFlags] = useState<RiskFlag[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    const [orderRes, itemsRes, msgsRes, logsRes, dispRes] = await Promise.all([
      supabase.from("orders").select("*").eq("id", orderId).maybeSingle(),
      supabase.from("order_items").select("*, products(name, slug), vendors(id, store_name, user_id, phone, whatsapp)").eq("order_id", orderId),
      supabase
        .from("chat_messages")
        .select("*")
        .or(`order_id.eq.${orderId},conversation_id.eq.order_${orderId}`)
        .order("created_at", { ascending: true }),
      supabase.from("audit_logs").select("*").eq("order_id", orderId).order("created_at", { ascending: false }),
      supabase.from("disputes").select("*").eq("order_id", orderId).order("opened_at", { ascending: false }),
    ]);

    setOrder(orderRes.data);
    setItems(itemsRes.data ?? []);
    setMessages((msgsRes.data ?? []) as Message[]);
    setLogs((logsRes.data ?? []) as AuditLog[]);
    setDisputes((dispRes.data ?? []) as Dispute[]);

    const userIds = new Set<string>();
    if (orderRes.data?.user_id) userIds.add(orderRes.data.user_id);
    (msgsRes.data ?? []).forEach((m: any) => userIds.add(m.sender_id));
    (logsRes.data ?? []).forEach((l: any) => l.user_id && userIds.add(l.user_id));
    (dispRes.data ?? []).forEach((d: any) => userIds.add(d.opened_by));

    if (userIds.size) {
      const { data: profs } = await supabase.rpc("get_public_profiles", {
        user_ids: Array.from(userIds),
      });
      const map: Record<string, any> = {};
      (profs ?? []).forEach((p: any) => (map[p.user_id] = p));
      setProfiles(map);

      // Risk flags for buyer + vendor owners
      const { data: flags } = await supabase
        .from("user_risk_flags")
        .select("*")
        .in("user_id", Array.from(userIds))
        .order("created_at", { ascending: false });
      setRiskFlags((flags ?? []) as RiskFlag[]);
    }

    const firstVendor = (itemsRes.data ?? [])[0]?.vendors;
    setVendor(firstVendor ?? null);

    setLoading(false);
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const openDispute = disputes.find((d) => d.status === "open" || d.status === "investigating");

  const updateDisputeStatus = async (id: string, status: string, notes?: string) => {
    const patch: any = { status };
    if (notes !== undefined) patch.admin_notes = notes;
    if (status === "resolved" || status === "closed") patch.closed_at = new Date().toISOString();
    const { error } = await supabase.from("disputes").update(patch).eq("id", id);
    if (error) {
      toast({ title: "Failed to update dispute", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Dispute updated" });
    void loadAll();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back
        </Button>
        <div className="text-center py-12 text-muted-foreground">Loading evidence…</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back
        </Button>
        <div className="text-center py-12 text-muted-foreground">Order not found.</div>
      </div>
    );
  }

  const buyerProfile = order.user_id ? profiles[order.user_id] : null;
  const addr = (order.shipping_address ?? {}) as any;
  const attachments = messages.filter((m) => !!m.attachment_url);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          ← Back to Evidence Vault
        </Button>
        <div className="flex items-center gap-2">
          {openDispute ? (
            <Badge variant="destructive" className="gap-1">
              <Lock className="h-3 w-3" /> Chat locked — dispute open
            </Badge>
          ) : (
            <Badge variant="outline" className="gap-1">
              <Unlock className="h-3 w-3" /> No active dispute
            </Badge>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between flex-wrap gap-2">
            <span className="font-mono text-base">Order #{order.id.slice(0, 12)}</span>
            <Badge variant="outline" className="capitalize">
              {order.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="space-y-1">
            <div className="text-xs uppercase text-muted-foreground font-semibold">Buyer</div>
            <div className="font-medium">{buyerProfile?.full_name ?? addr?.full_name ?? "Guest"}</div>
            {addr?.phone && <div className="text-muted-foreground">{addr.phone}</div>}
            {addr?.address_line && (
              <div className="text-muted-foreground text-xs">
                {addr.address_line}, {addr.city}
                {addr.country ? `, ${addr.country}` : ""}
              </div>
            )}
          </div>
          <div className="space-y-1">
            <div className="text-xs uppercase text-muted-foreground font-semibold">Vendor</div>
            <div className="font-medium">{vendor?.store_name ?? "—"}</div>
            {vendor?.phone && <div className="text-muted-foreground">{vendor.phone}</div>}
          </div>
          <div className="space-y-1">
            <div className="text-xs uppercase text-muted-foreground font-semibold">Payment</div>
            <div className="font-medium capitalize">{order.payment_method ?? "—"}</div>
            <div className="text-muted-foreground capitalize">Status: {order.payment_status}</div>
            <div className="font-semibold mt-1">KSh {Number(order.total).toLocaleString()}</div>
          </div>
          <div className="md:col-span-3">
            <div className="text-xs uppercase text-muted-foreground font-semibold mb-2">Items</div>
            <div className="space-y-1 text-sm">
              {items.map((it) => (
                <div key={it.id} className="flex justify-between border-b border-border/50 py-1">
                  <span>
                    {it.products?.name ?? "Product"} × {it.quantity}
                  </span>
                  <span className="text-muted-foreground">KSh {Number(it.price).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {riskFlags.length > 0 && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-destructive">
              <Flag className="h-4 w-4" /> Risk flags
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {riskFlags.map((f) => {
              const p = profiles[f.user_id];
              return (
                <div
                  key={f.id}
                  className="flex items-center justify-between text-sm border border-border rounded p-2"
                >
                  <div>
                    <div className="font-medium">
                      {p?.full_name ?? f.user_id.slice(0, 8)} —{" "}
                      <span className="text-destructive uppercase text-xs">{f.flag_type}</span>
                    </div>
                    {f.reason && <div className="text-xs text-muted-foreground">{f.reason}</div>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    score {f.score} ·{" "}
                    {f.expires_at
                      ? `expires ${formatDistanceToNow(new Date(f.expires_at), { addSuffix: true })}`
                      : "permanent"}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="chat">
        <TabsList>
          <TabsTrigger value="chat">Chat ({messages.length})</TabsTrigger>
          <TabsTrigger value="attachments">Attachments ({attachments.length})</TabsTrigger>
          <TabsTrigger value="audit">Audit log ({logs.length})</TabsTrigger>
          <TabsTrigger value="disputes">Disputes ({disputes.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <ChatHistory messages={messages} profiles={profiles} vendor={vendor} buyerId={order.user_id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attachments" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <AttachmentsGrid messages={attachments} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <AuditTimeline logs={logs} profiles={profiles} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="disputes" className="mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <DisputeControls
                orderId={orderId}
                disputes={disputes}
                profiles={profiles}
                onUpdate={updateDisputeStatus}
                onReload={loadAll}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
// Chat history (admins see EVERYTHING incl. soft-deleted)
// ============================================================

function ChatHistory({
  messages,
  profiles,
  vendor,
  buyerId,
}: {
  messages: Message[];
  profiles: Record<string, any>;
  vendor: any;
  buyerId: string | null;
}) {
  if (messages.length === 0) {
    return <div className="text-sm text-muted-foreground text-center py-8">No messages on this order yet.</div>;
  }

  return (
    <ScrollArea className="h-[520px] pr-3">
      <div className="space-y-3">
        {messages.map((m) => {
          const isSystem = m.is_system_message || m.message_type === "system";
          const senderProfile = profiles[m.sender_id];
          const isBuyer = m.sender_id === buyerId;
          const senderName =
            senderProfile?.full_name ?? (isBuyer ? "Buyer" : vendor?.store_name ?? "Vendor");

          if (isSystem) {
            return (
              <div key={m.id} className="text-center">
                <span className="inline-block text-xs bg-muted/50 text-muted-foreground rounded-full px-3 py-1">
                  {m.message} · {format(new Date(m.created_at), "MMM d HH:mm")}
                </span>
              </div>
            );
          }

          const deletedForEveryone = !!m.deleted_at;
          const deletedFlags: string[] = [];
          if (m.deleted_by_sender) deletedFlags.push("sender");
          if (m.deleted_by_receiver) deletedFlags.push("receiver");

          return (
            <div
              key={m.id}
              className={`border rounded-lg p-3 text-sm ${
                deletedForEveryone || deletedFlags.length
                  ? "border-destructive/30 bg-destructive/5"
                  : "border-border"
              }`}
            >
              <div className="flex items-center justify-between mb-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">
                    {senderName} <span className="font-normal">({isBuyer ? "buyer" : "vendor"})</span>
                  </span>
                  <span>· {format(new Date(m.created_at), "MMM d, yyyy HH:mm:ss")}</span>
                  {m.edited_at && (
                    <span className="flex items-center gap-1">
                      <Pencil className="h-3 w-3" /> edited
                    </span>
                  )}
                  {m.seen_at && <span>· seen</span>}
                </div>
                {(deletedForEveryone || deletedFlags.length > 0) && (
                  <Badge variant="destructive" className="text-[10px]">
                    <Trash2 className="h-3 w-3 mr-1" />
                    {deletedForEveryone
                      ? `removed for everyone @ ${format(new Date(m.deleted_at!), "HH:mm")}`
                      : `hidden by ${deletedFlags.join(" + ")}`}
                  </Badge>
                )}
              </div>
              <div className={deletedForEveryone ? "italic text-muted-foreground" : ""}>{m.message}</div>
              {m.attachment_url && !deletedForEveryone && (
                <AttachmentPreview
                  url={m.attachment_url}
                  type={m.attachment_type}
                  size={m.attachment_size}
                />
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

function AttachmentPreview({
  url,
  type,
  size,
}: {
  url: string;
  type: string | null;
  size: number | null;
}) {
  const isImage = type?.startsWith("image/");
  const isAudio = type?.startsWith("audio/");
  return (
    <div className="mt-2">
      {isImage ? (
        <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt="attachment" className="max-h-48 rounded border border-border" />
        </a>
      ) : isAudio ? (
        <audio controls src={url} className="w-full max-w-md" />
      ) : (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-primary hover:underline text-xs"
        >
          <Paperclip className="h-3 w-3" /> Download attachment
          {size ? ` (${Math.round(size / 1024)} KB)` : ""}
        </a>
      )}
    </div>
  );
}

// ============================================================
// Attachments grid
// ============================================================

function AttachmentsGrid({ messages }: { messages: Message[] }) {
  if (messages.length === 0) {
    return <div className="text-sm text-muted-foreground text-center py-8">No attachments.</div>;
  }

  const iconFor = (type: string | null) => {
    if (!type) return <FileText className="h-4 w-4" />;
    if (type.startsWith("image/")) return <ImageIcon className="h-4 w-4" />;
    if (type.startsWith("audio/")) return <Mic className="h-4 w-4" />;
    if (type === "location") return <MapPin className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {messages.map((m) => {
        const isImage = m.attachment_type?.startsWith("image/");
        return (
          <a
            key={m.id}
            href={m.attachment_url ?? "#"}
            target="_blank"
            rel="noreferrer"
            className="block border border-border rounded-lg overflow-hidden hover:border-primary transition-colors"
          >
            {isImage ? (
              <img
                src={m.attachment_url!}
                alt="attachment"
                className="aspect-square object-cover w-full"
              />
            ) : (
              <div className="aspect-square flex items-center justify-center bg-muted text-muted-foreground">
                {iconFor(m.attachment_type)}
              </div>
            )}
            <div className="p-2 text-xs">
              <div className="flex items-center gap-1 truncate">
                {iconFor(m.attachment_type)}
                <span className="truncate">{m.attachment_type ?? "file"}</span>
              </div>
              <div className="text-muted-foreground">
                {format(new Date(m.created_at), "MMM d HH:mm")}
              </div>
            </div>
          </a>
        );
      })}
    </div>
  );
}

// ============================================================
// Audit timeline
// ============================================================

function AuditTimeline({ logs, profiles }: { logs: AuditLog[]; profiles: Record<string, any> }) {
  if (logs.length === 0) {
    return <div className="text-sm text-muted-foreground text-center py-8">No audit log entries.</div>;
  }
  return (
    <ScrollArea className="h-[520px] pr-3">
      <div className="space-y-2">
        {logs.map((l) => {
          const p = l.user_id ? profiles[l.user_id] : null;
          return (
            <div key={l.id} className="border border-border rounded p-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs uppercase text-primary">{l.action_type}</span>
                <span className="text-xs text-muted-foreground">
                  {format(new Date(l.created_at), "MMM d, yyyy HH:mm:ss")}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                by {p?.full_name ?? (l.user_id ? l.user_id.slice(0, 8) : "system")}
              </div>
              {l.action_details && Object.keys(l.action_details).length > 0 && (
                <pre className="text-[11px] bg-muted/40 rounded p-2 mt-2 overflow-auto">
                  {JSON.stringify(l.action_details, null, 2)}
                </pre>
              )}
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

// ============================================================
// Dispute controls
// ============================================================

function DisputeControls({
  orderId,
  disputes,
  profiles,
  onUpdate,
  onReload,
}: {
  orderId: string;
  disputes: Dispute[];
  profiles: Record<string, any>;
  onUpdate: (id: string, status: string, notes?: string) => Promise<void>;
  onReload: () => void;
}) {
  const [reason, setReason] = useState("");

  const adminOpenDispute = async () => {
    if (!reason.trim()) {
      toast({ title: "Reason required", variant: "destructive" });
      return;
    }
    const { error } = await supabase.rpc("open_dispute", { _order_id: orderId, _reason: reason });
    if (error) {
      toast({ title: "Failed to open dispute", description: error.message, variant: "destructive" });
      return;
    }
    setReason("");
    toast({ title: "Dispute opened" });
    onReload();
  };

  return (
    <>
      {disputes.length === 0 ? (
        <div className="text-sm text-muted-foreground">No disputes filed for this order.</div>
      ) : (
        <div className="space-y-3">
          {disputes.map((d) => {
            const p = profiles[d.opened_by];
            const editable = d.status === "open" || d.status === "investigating";
            return (
              <DisputeRow
                key={d.id}
                dispute={d}
                openerName={p?.full_name ?? d.opened_by.slice(0, 8)}
                editable={editable}
                onUpdate={onUpdate}
              />
            );
          })}
        </div>
      )}

      <div className="border-t border-border pt-4">
        <Label className="text-xs uppercase text-muted-foreground">Open a new dispute (admin)</Label>
        <Textarea
          placeholder="Reason for opening this dispute…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mt-2"
          rows={3}
        />
        <Button size="sm" className="mt-2" onClick={adminOpenDispute}>
          <Lock className="h-4 w-4 mr-1" /> Lock chat & open dispute
        </Button>
      </div>
    </>
  );
}

function DisputeRow({
  dispute,
  openerName,
  editable,
  onUpdate,
}: {
  dispute: Dispute;
  openerName: string;
  editable: boolean;
  onUpdate: (id: string, status: string, notes?: string) => Promise<void>;
}) {
  const [notes, setNotes] = useState(dispute.admin_notes ?? "");
  const [status, setStatus] = useState(dispute.status);

  return (
    <div className="border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <Badge
            variant={
              dispute.status === "open" || dispute.status === "investigating"
                ? "destructive"
                : "outline"
            }
            className="capitalize"
          >
            {dispute.status}
          </Badge>
          <span className="ml-2 text-xs text-muted-foreground">
            opened by {openerName} · {format(new Date(dispute.opened_at), "MMM d, yyyy HH:mm")}
          </span>
        </div>
        {dispute.closed_at && (
          <span className="text-xs text-muted-foreground">
            closed {format(new Date(dispute.closed_at), "MMM d HH:mm")}
          </span>
        )}
      </div>
      <div className="text-sm">
        <span className="font-semibold">Reason:</span> {dispute.reason}
      </div>

      {editable ? (
        <>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Admin notes (visible only to admins)…"
            rows={3}
          />
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="investigating">Investigating</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" onClick={() => onUpdate(dispute.id, status, notes)}>
              Save
            </Button>
            {(status === "resolved" || status === "closed") && (
              <span className="text-xs text-muted-foreground">
                <Unlock className="inline h-3 w-3 mr-1" /> chat will unlock once saved
              </span>
            )}
          </div>
        </>
      ) : (
        dispute.admin_notes && (
          <div className="text-xs bg-muted/40 rounded p-2">
            <div className="font-semibold mb-1">Admin notes</div>
            {dispute.admin_notes}
          </div>
        )
      )}
    </div>
  );
}
