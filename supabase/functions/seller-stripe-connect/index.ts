import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization,apikey,x-client-info,content-type" };
const respond = (body: unknown, status=200) => new Response(JSON.stringify(body), { status, headers });
const stripeRequest = async (path: string, params: URLSearchParams, secret: string, idempotency?: string) => {
 const res = await fetch(`https://api.stripe.com/v1/${path}`, { method: "POST",
  headers: { Authorization: `Bearer ${secret}`, "Content-Type": "application/x-www-form-urlencoded",
   ...(idempotency ? { "Idempotency-Key": idempotency } : {}) }, body: params });
 const result = await res.json();
 if (!res.ok) throw new Error(result.error?.message || "Stripe request failed");
 return result;
};
Deno.serve(async req => {
 if (req.method === "OPTIONS") return new Response(null, { headers });
 if (req.method !== "POST") return respond({ error: "Method not allowed" },405);
 try {
  const auth = req.headers.get("Authorization");
  if (!auth) return respond({ error: "Unauthorized" },401);
  const url=Deno.env.get("SUPABASE_URL")!, anon=Deno.env.get("SUPABASE_ANON_KEY")!;
  const client=createClient(url,anon,{ global:{ headers:{ Authorization:auth } } });
  const { data:{user},error:authError }=await client.auth.getUser();
  if (authError || !user) return respond({ error: "Unauthorized" },401);
  const admin=createClient(url,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const {data:a,error:appError}=await admin.from("seller_applications")
   .select("id,user_id,status,country,business_type").eq("user_id",user.id).maybeSingle();
   if (appError || !a || !["draft","more_information_required"].includes(a.status))
    return respond({error:"No eligible seller draft"},403);
  const {data:rules}=await admin.from("seller_country_requirements")
   .select("stripe_connect_enabled").eq("country",a.country).eq("business_type",a.business_type)
   .eq("stripe_connect_enabled",true).not("reviewed_at","is",null).limit(1).maybeSingle();
  if (!rules) return respond({error:"Stripe Connect onboarding is not enabled for this seller country/type"},422);
  const secret=Deno.env.get("STRIPE_SECRET_KEY") || "";
  // Separate explicit flag: existing live-checkout configuration does not enable live Connect.
  if (!secret.startsWith("sk_test_") && Deno.env.get("STRIPE_LIVE_CONNECT_ENABLED")!=="true")
   return respond({error:"Live Stripe Connect onboarding is disabled"},503);
  if (!secret.startsWith("sk_test_") && !secret.startsWith("sk_live_"))
   return respond({error:"Stripe configuration unavailable"},503);
  const base=Deno.env.get("SELLER_ONBOARDING_RETURN_URL") || "";
  if (!base.startsWith("https://")) return respond({error:"Secure onboarding return URL not configured"},503);
  const {data:existing}=await admin.from("seller_payout_accounts")
   .select("provider_account_id").eq("application_id",a.id).eq("provider","stripe").maybeSingle();
  let accountId=existing?.provider_account_id;
  if (!accountId) {
   const p=new URLSearchParams({type:"express",country:a.country,
    "metadata[application_id]":a.id,"metadata[user_id]":user.id});
   const account=await stripeRequest("accounts",p,secret,`seller-connect-${a.id}`);
   accountId=account.id;
   const {error:saveError}=await admin.from("seller_payout_accounts").upsert({
    application_id:a.id,provider:"stripe",provider_account_id:accountId,country:a.country,
    verification_status:"pending",charges_enabled:false,payouts_enabled:false
   },{onConflict:"application_id,provider"});
   if(saveError) throw saveError;
  }
  const link=await stripeRequest("account_links",new URLSearchParams({
   account:accountId,type:"account_onboarding",
   refresh_url:base,return_url:base
  }),secret);
  return respond({url:link.url});
 } catch(e) { console.error("Stripe Connect onboarding error",e instanceof Error?e.name:"unknown");
  return respond({error:"Unable to start secure payout onboarding"},500); }
});
