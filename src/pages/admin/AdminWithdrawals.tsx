import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { formatCAD } from "@/lib/money";
import { toast } from "sonner";
export default function AdminWithdrawals(){
 const [busy,setBusy]=useState<string|null>(null);
 const q=useQuery({queryKey:["admin-stripe-settlements"],queryFn:async()=>{
  const [items,transfers,legacy]=await Promise.all([
   supabase.from("order_items").select("id,order_id,vendor_payout,shipping_amount,refunded_amount,products(name),orders!inner(payment_status,payment_provider)").eq("orders.payment_status","paid").eq("orders.payment_provider","stripe").order("created_at",{ascending:false}).limit(200),
   (supabase as any).from("stripe_seller_transfers").select("*").order("created_at",{ascending:false}).limit(200),
   (supabase as any).from("withdrawal_requests").select("id,amount,status,requested_at").order("requested_at",{ascending:false}).limit(100)]);
  if(items.error||transfers.error||legacy.error)throw new Error("Unable to load settlement records");return {items:items.data,transfers:transfers.data,legacy:legacy.data};
 }});
 async function settle(id:string){setBusy(id);try{
  const {data,error}=await supabase.functions.invoke("stripe-transfer",{body:{order_item_id:id}});
  if(error){const detail=await (error as any).context?.json?.().catch(()=>null);throw new Error(detail?.error||"Settlement unavailable; check eligibility and provider status.");}
  if(data?.error)throw new Error(data.error);toast.success("Stripe confirmed the transfer");await q.refetch();
 }catch(e){toast.error(e instanceof Error?e.message:"Transfer failed");}finally{setBusy(null);}}
 return <div className="space-y-5"><h1 className="text-2xl font-semibold">Seller settlements</h1>
 <p>Only confirmed CAD Stripe payments can be settled. The server checks delivery, the seven-day return window, open returns, available earnings and seller verification before any transfer. Repeating a request reconciles the same transfer.</p>
 {q.error&&<p role="alert">{q.error.message}</p>}{q.isLoading&&<p>Loading…</p>}
 <div className="overflow-x-auto"><table className="admin-table"><thead><tr><th>Product / order</th><th>Original seller allocation</th><th>Transfer</th></tr></thead><tbody>
 {(q.data?.items||[]).map((i:any)=>{const t=q.data?.transfers.find((r:any)=>r.order_item_id===i.id);return <tr key={i.id}><td>{i.products?.name}<br/><small>{i.order_id}</small></td><td>{formatCAD(Number(i.vendor_payout||0)+Number(i.shipping_amount||0))}<br/><small>Refunds reduce settlement</small></td><td>{t?.status==="completed"?<span>{formatCAD(Number(t.amount))} · {t.provider_transfer_id}</span>:<Button disabled={!!busy} onClick={()=>settle(i.id)}>{busy===i.id?"Checking…":t?"Reconcile transfer":"Check eligibility and transfer"}</Button>}</td></tr>})}</tbody></table></div>
 <h2 className="font-semibold">Historical manual withdrawals (read only)</h2><p className="text-sm">Reconcile these with actual provider records before enabling Stripe settlements for the same seller. No manual completion controls are available.</p>
 {(q.data?.legacy||[]).map((w:any)=><p key={w.id}>{w.id} · {formatCAD(Number(w.amount))} · {w.status}</p>)}</div>;
}
