import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
type Doc={id:string;requirement_code:string;verification_status:string;uploaded_at:string};
export default function AdminSellerDocuments({applicationId,onReviewed}:{
 applicationId:string;onReviewed:()=>void
}){
 const [docs,setDocs]=useState<Doc[]>([]);
 const [loaded,setLoaded]=useState(false);
 const [busy,setBusy]=useState(false);
 const [notes,setNotes]=useState<Record<string,string>>({});
 const load=async()=>{
  setBusy(true);
  const {data,error}=await supabase.functions.invoke("seller-review-document",{
   body:{action:"list",application_id:applicationId}
  });
  setBusy(false);
  if(error||!data?.documents){toast.error("Unable to load private verification queue");return;}
  setDocs(data.documents);setLoaded(true);
 };
 const open=async(id:string)=>{
  setBusy(true);
  const {data,error}=await supabase.functions.invoke("seller-review-document",{
   body:{document_id:id}
  });
  setBusy(false);
  if(error||!data?.url){toast.error("Private document access unavailable");return;}
  const link=document.createElement("a");
  link.href=data.url;link.target="_blank";link.rel="noopener noreferrer";
  link.click();
 };
 const decide=async(id:string,decision:string)=>{
  if(!notes[id]?.trim())return;
  setBusy(true);
  const {error}=await supabase.rpc("review_seller_document" as any,{
   p_document_id:id,p_decision:decision,p_reason:notes[id].trim()
  });
  setBusy(false);
  if(error){toast.error(error.message);return;}
  toast.success("Document decision recorded");await load();onReviewed();
 };
 return <div className="space-y-2 border-t pt-3">
  <Button variant="outline" size="sm" disabled={busy} onClick={()=>void load()}>
   {loaded?"Refresh documents":"Load verification documents"}
  </Button>
  {loaded&&docs.length===0&&<p className="text-sm">No documents registered.</p>}
  {docs.map(d=><div key={d.id} className="rounded-md border p-3 space-y-2">
   <p className="text-sm font-medium">{d.requirement_code.replace(/_/g," ")} — {d.verification_status}</p>
   {d.verification_status==="pending"&&<>
    <Button variant="outline" size="sm" disabled={busy} onClick={()=>void open(d.id)}>Inspect private document</Button>
    <Input aria-label={`Evidence note for ${d.requirement_code}`} placeholder="Evidence and decision note" value={notes[d.id]||""}
     onChange={e=>setNotes(x=>({...x,[d.id]:e.target.value}))}/>
    <div className="flex gap-2">
     <Button size="sm" disabled={busy||!notes[d.id]?.trim()} onClick={()=>void decide(d.id,"verified")}>Mark verified</Button>
     <Button size="sm" variant="destructive" disabled={busy||!notes[d.id]?.trim()} onClick={()=>void decide(d.id,"rejected")}>Reject document</Button>
    </div>
   </>}
  </div>)}
 </div>;
}
