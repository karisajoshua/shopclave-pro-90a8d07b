import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function VendorPayments() {
 const [busy,setBusy]=useState(false);
 const status=useQuery({queryKey:["seller-stripe-status"],queryFn:async()=>{
  const {data,error}=await supabase.functions.invoke("seller-stripe-connect",{body:{action:"status"}});
  if(error||data?.error)throw new Error(data?.error||"Unable to check Stripe account. Refresh to retry.");return data;
 }});
 async function connect(){setBusy(true);try{
  const {data,error}=await supabase.functions.invoke("seller-stripe-connect",{body:{action:"onboard"}});
  if(error||data?.error)throw new Error(data?.error||"Unable to start Stripe onboarding");
  const url=new URL(data.url);if(url.protocol!=="https:"||url.hostname!=="connect.stripe.com")throw new Error("Invalid onboarding link");
  window.location.assign(url.href);
 }catch(e){toast.error(e instanceof Error?e.message:"Unable to connect");}finally{setBusy(false);}}
 return <div className="space-y-5 max-w-3xl"><h1 className="text-2xl font-semibold">Stripe payments</h1>
 <p>Customer payments are collected in Canadian dollars. Seller transfers become eligible after delivery and the seven-day return window, subject to resolved returns and account verification.</p>
 <div className="admin-card p-6 space-y-4">
 {status.isLoading?<p>Checking payout account…</p>:status.error?<p role="alert">{status.error.message}</p>:<>
 <p>Stripe account: <strong>{status.data?.connected?"Connected":"Not connected"}</strong></p>
 <p>Receiving transfers: <strong>{status.data?.transfers_enabled?"Enabled":"Verification required"}</strong></p>
 <p>Bank payouts: <strong>{status.data?.payouts_enabled?"Enabled":"Not yet enabled"}</strong></p></>}
 <Button disabled={busy} onClick={connect}>{busy?"Opening…":"Complete or update Stripe verification"}</Button>
 <Button variant="outline" onClick={()=>status.refetch()}>Refresh status</Button>
 <p className="text-sm text-muted-foreground">If onboarding is unavailable, complete your seller application and contact support. Returning from Stripe does not by itself confirm verification.</p>
 <Link className="underline" to="/sell">Seller application</Link>
 </div><p className="text-sm text-muted-foreground">A transfer to your Stripe balance is separate from a payout to your bank. Stripe determines your bank payout schedule.</p></div>;
}
