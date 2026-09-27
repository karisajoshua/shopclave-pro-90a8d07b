import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import AdminSellerDocuments from "@/components/admin/AdminSellerDocuments";

const AdminSellerApplications = () => {
 const qc=useQueryClient();
 const [reasons,setReasons]=useState<Record<string,string>>({});
 const {data=[],isLoading,error}=useQuery({
  queryKey:["admin-seller-applications"],
  queryFn:async()=>{
   const {data,error}=await supabase.from("seller_applications" as any)
    .select("id,user_id,status,country,business_type,business_info,store_info,kyc_status,submitted_at,review_reason")
    .neq("status","draft").order("submitted_at",{ascending:false}).limit(100);
   if(error)throw error;
   return (data||[]) as any[];
  }
 });
 const approve=useMutation({
  mutationFn:async(id:string)=>{
   const {error}=await supabase.rpc("approve_seller_application" as any,{p_application_id:id});
   if(error)throw error;
  },
  onSuccess:()=>{toast.success("Seller approved; Stripe payout verification remains separate");void qc.invalidateQueries({queryKey:["admin-seller-applications"]});},
  onError:(e:Error)=>toast.error(e.message)
 });
 const review=useMutation({
  mutationFn:async({id,decision}:{id:string;decision:string})=>{
   const {error}=await supabase.rpc("review_seller_application" as any,{
    p_application_id:id,p_decision:decision,p_reason:reasons[id]?.trim()||null
   });
   if(error)throw error;
  },
  onSuccess:()=>{toast.success("Review decision recorded");void qc.invalidateQueries({queryKey:["admin-seller-applications"]});},
  onError:(e:Error)=>toast.error(e.message)
 });
 return <div className="space-y-5">
  <h1 className="text-2xl font-bold">Seller Applications</h1>
  <p className="text-sm text-muted-foreground">Review applications and request missing information. Approval requires separate verified KYC and vendor activation.</p>
  {isLoading&&<p>Loading applications…</p>}
  {error&&<p role="alert" className="text-destructive">Applications could not be loaded. Check permissions and database migration status.</p>}
  {!isLoading&&!error&&data.length===0&&<p>No submitted applications.</p>}
  {data.map(a=><article key={a.id} className="rounded-xl border p-5 space-y-3">
   <div className="flex flex-wrap gap-3 justify-between">
    <h2 className="font-semibold">{a.store_info?.store_name||a.business_info?.legal_name||"Unnamed application"}</h2>
    <span className="capitalize">{a.status.replace(/_/g," ")}</span>
   </div>
   <p className="text-sm">Country: {a.country||"—"} · Business type: {a.business_type||"—"} · KYC: {a.kyc_status||"not started"}</p>
   <p className="text-xs text-muted-foreground">Submitted: {a.submitted_at?new Date(a.submitted_at).toLocaleString():"—"}</p>
   {a.review_reason&&<p className="text-sm">Previous review note: {a.review_reason}</p>}
   <label className="block text-sm">Review note
    <Textarea value={reasons[a.id]||""} onChange={e=>setReasons(x=>({...x,[a.id]:e.target.value}))}
      placeholder="Specify missing information or reason for rejection" />
   </label>
   <AdminSellerDocuments applicationId={a.id} onReviewed={()=>void qc.invalidateQueries({queryKey:["admin-seller-applications"]})} />
   <div className="flex flex-wrap gap-2">
    <Button disabled={approve.isPending || a.kyc_status!=="verified" || !["submitted","under_review"].includes(a.status)} onClick={()=>approve.mutate(a.id)}>Approve verified seller</Button>
    <Button disabled={review.isPending} variant="outline" onClick={()=>review.mutate({id:a.id,decision:"under_review"})}>Mark under review</Button>
    <Button disabled={review.isPending||!reasons[a.id]?.trim()} variant="secondary" onClick={()=>review.mutate({id:a.id,decision:"more_information_required"})}>Request information</Button>
    <Button disabled={review.isPending||!reasons[a.id]?.trim()} variant="destructive" onClick={()=>review.mutate({id:a.id,decision:"rejected"})}>Reject</Button>
   </div>
  </article>)}
 </div>;
};
export default AdminSellerApplications;
