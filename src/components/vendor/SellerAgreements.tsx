import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
const required=["seller_terms","commission_payout","shipping_fulfillment","returns_refunds","prohibited_products","product_authenticity"];
type Policy={policy_code:string;policy_version:string;title:string;document_url:string};
export default function SellerAgreements({country,businessType,onAccepted}:{
 country:string;businessType:string;onAccepted:()=>void
}){
 const [policies,setPolicies]=useState<Policy[]>([]);
 const [selected,setSelected]=useState<string[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState<string|null>(null);
 useEffect(()=>{
  let active=true;
  (async()=>{
   setLoading(true);setSelected([]);setPolicies([]);setError(null);
   const {data:rule,error:ruleError}=await supabase.from("seller_country_requirements" as any)
    .select("rules_version").eq("country",country).eq("business_type",businessType)
    .eq("stripe_connect_enabled",true).not("reviewed_at","is",null)
    .order("reviewed_at",{ascending:false}).limit(1).maybeSingle();
   if(!active)return;
   if(ruleError||!rule){setError("Seller agreements are not configured for your country.");setLoading(false);return;}
   const {data,error}=await supabase.from("seller_policy_documents" as any)
    .select("policy_code,policy_version,title,document_url")
    .eq("policy_version",(rule as any).rules_version).in("policy_code",required);
   if(!active)return;
   if(error){setError("Published seller policies could not be loaded.");}
   else {
    const available=(data||[]) as unknown as Policy[];
    if(required.some(code=>!available.some(p=>p.policy_code===code)))setError("Some required seller agreements have not been published yet.");
    setPolicies(available);
   }
   setLoading(false);
  })();
  return()=>{active=false;};
 },[country,businessType]);
 const submit=async()=>{
  if(selected.length!==required.length||error)return;
  setBusy(true);
  const {error:e}=await supabase.rpc("accept_seller_agreements" as any,{p_codes:required});
  setBusy(false);
  if(e){toast.error(e.message);return;}
  toast.success("Agreement acceptance recorded");onAccepted();
 };
 return <section className="space-y-3">
  <p className="text-sm text-muted-foreground">Read each current policy before accepting. Your acceptance and policy version are recorded.</p>
  {loading&&<p>Loading current agreements…</p>}
  {error&&<p role="alert" className="text-destructive">{error}</p>}
  {policies.map(p=><div key={p.policy_code} className="flex items-start gap-3 rounded-md border p-3">
   <Checkbox id={p.policy_code} disabled={!!error||busy} checked={selected.includes(p.policy_code)}
    onCheckedChange={v=>setSelected(old=>v===true?[...old,p.policy_code]:old.filter(x=>x!==p.policy_code))}/>
   <label htmlFor={p.policy_code} className="text-sm">
    I have read and accept <a className="underline" target="_blank" rel="noopener noreferrer"
     href={p.document_url}>{p.title}</a> (version {p.policy_version}).
   </label>
  </div>)}
  <Button type="button" disabled={!!error||busy||selected.length!==required.length} onClick={()=>void submit()}>
   {busy?"Recording…":"Accept all selected agreements"}
  </Button>
 </section>;
}
