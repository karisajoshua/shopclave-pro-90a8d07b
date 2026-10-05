import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
export default function AdminLaunchReadiness(){
 const q=useQuery({queryKey:["launch-readiness"],queryFn:async()=>{
  const tables=["products","vendors","tax_registrations","seller_country_requirements","seller_policy_documents","seller_payout_accounts"];
  const results=await Promise.all(tables.map(async table=>{let query=(supabase as any).from(table).select("*");if(table==="products")query=query.eq("status","active");if(table==="vendors")query=query.eq("status","approved");const {data,error}=await query.limit(1000);if(error)throw new Error(`Could not load ${table}`);return data;}));
  return Object.fromEntries(tables.map((table,i)=>[table,results[i]]));
 }});
 if(q.isLoading)return <p>Checking launch data…</p>;if(q.error)return <p role="alert">{q.error.message}</p>;
 const d=q.data!;const problems=d.products.map((p:any)=>({p,issues:[!(p.weight_g>0)&&"Missing packed weight",![p.length_cm,p.width_cm,p.height_cm].every(v=>v>0)&&"Missing packed dimensions",p.price<=1&&"Confirm low price",p.compare_at_price!=null&&p.compare_at_price<=p.price&&"Invalid compare-at price"].filter(Boolean)})).filter((x:any)=>x.issues.length);
 return <div className="space-y-5"><h1 className="text-2xl font-semibold">Launch readiness</h1><p>Live database checks (up to 1,000 rows per table). These checks do not confirm provider activation or a successful live payment.</p>
 <div className="admin-card p-5 space-y-2"><p>Products requiring attention: {problems.length}</p><p>Approved sellers missing origin country: {d.vendors.filter((v:any)=>!v.warehouse_country).length}</p><p>Reviewed tax registrations: {d.tax_registrations.filter((t:any)=>t.approved_at&&t.approved_by&&t.registration_number).length} / {d.tax_registrations.length}</p><p>Reviewed Canada Connect rules enabled: {d.seller_country_requirements.filter((c:any)=>c.country==="CA"&&c.stripe_connect_enabled&&c.reviewed_at).length}</p><p>Seller policy records: {d.seller_policy_documents.length}</p><p>Stripe accounts enabled for transfers: {d.seller_payout_accounts.filter((p:any)=>p.provider==="stripe"&&p.transfers_enabled).length}</p></div>
 <p><Link className="underline" to="/admin/products">Edit product prices and parcels</Link> · <Link className="underline" to="/admin/vendors">Review sellers</Link> · <Link className="underline" to="/admin/seller-applications">Seller applications</Link></p>
 <div className="overflow-x-auto"><table className="admin-table"><thead><tr><th>Product</th><th>Required check</th></tr></thead><tbody>{problems.map(({p,issues}:any)=><tr key={p.id}><td>{p.name}</td><td>{issues.join("; ")}</td></tr>)}</tbody></table></div>
 <p>Before enabling live operations: approve applicable tax registrations and seller requirements, publish seller policies, complete Stripe verification, configure signed webhooks, and run payment, expiry, refund and seller transfer acceptance tests. Shipping remains Canada only; all prices are CAD.</p></div>;
}
