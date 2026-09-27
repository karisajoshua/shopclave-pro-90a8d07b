import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Rule = { required_documents: string[]; rules_version: string };
export default function SellerKycUpload({ applicationId, country, businessType }: {
 applicationId: string; country: string; businessType: string;
}) {
 const { user }=useAuth();
 const [rules,setRules]=useState<Rule|null>(null);
 const [busy,setBusy]=useState<string|null>(null);
 const [uploaded,setUploaded]=useState<string[]>([]);
 const [error,setError]=useState<string|null>(null);
 useEffect(()=>{
  let active=true;
  if(!country||!businessType||!applicationId)return;
  (async()=>{
   const {data,error}=await supabase.from("seller_country_requirements" as any)
    .select("required_documents,rules_version").eq("country",country)
    .eq("business_type",businessType).eq("stripe_connect_enabled",true)
    .not("reviewed_at","is",null).order("reviewed_at",{ascending:false}).limit(1).maybeSingle();
   if(!active)return;
   if(error){setError("Unable to load country verification requirements.");return;}
   if(!data){setError("Seller verification is not enabled for this country and business type.");return;}
   setRules(data as unknown as Rule);setError(null);
  })();
  return()=>{active=false;};
 },[applicationId,country,businessType]);
 const upload=async(code:string,file:File)=>{
  if(!user || !applicationId)return;
  if(file.size>10*1024*1024 || !["image/jpeg","image/png","application/pdf"].includes(file.type)){
   toast.error("Upload a JPEG, PNG or PDF under 10 MB.");return;
  }
  setBusy(code);
  const ext=file.type==="application/pdf"?"pdf":file.type==="image/png"?"png":"jpg";
  const path=`${user.id}/${applicationId}/${crypto.randomUUID()}.${ext}`;
  const {error:storageError}=await supabase.storage.from("seller-kyc-private").upload(path,file,{
   upsert:false,contentType:file.type
  });
  if(storageError){setBusy(null);toast.error("Private upload failed.");return;}
  const {error:registerError}=await supabase.rpc("register_seller_kyc_upload" as any,{
   p_requirement_code:code,p_storage_path:path
  });
  setBusy(null);
  if(registerError){toast.error("Document could not be registered. Contact support.");return;}
  setUploaded(prev=>[...prev,code]);toast.success("Document received for review.");
 };
 return <section className="space-y-4">
  <p className="text-sm text-muted-foreground">Upload only the documents requested for your country. Files are private and are not considered verified until independently reviewed.</p>
  {error&&<p role="alert" className="text-destructive">{error}</p>}
  {rules?.required_documents.length===0&&<p>No additional document uploads are configured for your country. Stripe may request identity documents on its secure website.</p>}
  {rules?.required_documents.map(code=><div key={code} className="rounded-md border p-3 space-y-2">
   <label htmlFor={`kyc-${code}`} className="block text-sm font-medium">{code.replace(/_/g," ")}</label>
   <input id={`kyc-${code}`} type="file" accept=".jpg,.jpeg,.png,.pdf" disabled={!!busy}
    onChange={e=>{const file=e.target.files?.[0];if(file)void upload(code,file);e.currentTarget.value="";}} />
   {uploaded.includes(code)&&<p role="status" className="text-sm">Uploaded — awaiting verification</p>}
  </div>)}
  {busy&&<p role="status">Uploading securely…</p>}
 </section>;
}
