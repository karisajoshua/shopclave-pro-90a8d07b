import { useQuery } from "@tanstack/react-query";
import { useOutletContext, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatCAD } from "@/lib/money";
export default function VendorEarnings(){
 const {vendor}=useOutletContext<{vendor:any}>();
 const q=useQuery({queryKey:["vendor-financial-ledger",vendor?.id],enabled:!!vendor?.id,queryFn:async()=>{
  const [ledger,transfers]=await Promise.all([
   (supabase as any).from("vendor_ledger").select("id,amount,currency,entry_type,created_at").eq("vendor_id",vendor.id).eq("currency","CAD").order("created_at",{ascending:false}),
   (supabase as any).from("stripe_seller_transfers").select("id,amount,status,provider_transfer_id,created_at").eq("vendor_id",vendor.id).order("created_at",{ascending:false})]);
  if(ledger.error||transfers.error)throw new Error("Could not load financial records");return {ledger:ledger.data,transfers:transfers.data};
 }});
 if(q.isLoading)return <p>Loading earnings…</p>;
 if(q.error)return <p role="alert">{q.error.message}</p>;
 const total=(q.data?.ledger||[]).filter((r:any)=>["sale","refund"].includes(r.entry_type)).reduce((n:number,r:any)=>n+Number(r.amount),0);
 return <div className="space-y-5"><h1 className="text-2xl font-semibold">Earnings and transfers</h1>
 <div className="admin-card p-5"><p>Recorded CAD earnings after refunds</p><strong className="text-xl">{formatCAD(total)}</strong>
 <p className="text-sm text-muted-foreground">Based on confirmed payment ledger entries, including allocated seller shipping. This total is not your withdrawable balance. Transfers, reversals and bank payouts are separate.</p></div>
 <p>Eligible orders are settled through Stripe after delivery and the seven-day return window. <Link className="underline" to="/vendor/payments">Manage Stripe verification</Link></p>
 <h2 className="font-semibold">Stripe transfer history</h2><div className="overflow-x-auto"><table className="admin-table"><thead><tr><th>Amount</th><th>Status</th><th>Provider reference</th><th>Date</th></tr></thead><tbody>
 {(q.data?.transfers||[]).map((r:any)=><tr key={r.id}><td>{formatCAD(Number(r.amount))}</td><td>{r.status}</td><td>{r.provider_transfer_id||"Awaiting confirmation"}</td><td>{new Date(r.created_at).toLocaleDateString()}</td></tr>)}</tbody></table></div>
 {!q.data?.transfers.length&&<p>No Stripe transfers recorded.</p>}
 <p className="text-sm text-muted-foreground">Contact support to reconcile historical manual withdrawals or transfer reversals. A completed transfer confirms payment into the connected Stripe account, not bank arrival.</p></div>;
}
