import { stripeRequest, transfersActive } from "../_shared/stripe.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { connectKeyAllowed } from "../_shared/stripeLiveGuard.ts";
const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization,apikey,x-client-info,content-type" };
const respond = (body: unknown, status=200) => new Response(JSON.stringify(body), { status, headers });
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
   if (appError || !a || !["draft","more_information_required","submitted","under_review","approved"].includes(a.status))
    return respond({error:"No eligible seller draft"},403);
  const {action="onboard"}=await req.json().catch(()=>({}));
  // Canada-only launch: never create Connect accounts for other countries, whatever the rules table says.
  if (a.country!=="CA") return respond({error:"Stripe Connect onboarding is not enabled for this seller country/type"},422);
  const {data:rules}=await admin.from("seller_country_requirements")
   .select("stripe_connect_enabled").eq("country",a.country).eq("business_type",a.business_type)
   .eq("stripe_connect_enabled",true).not("reviewed_at","is",null).limit(1).maybeSingle();
  if (!rules) return respond({error:"Stripe Connect onboarding is not enabled for this seller country/type"},422);
  const secret=Deno.env.get("STRIPE_SECRET_KEY") || "";
  // Accepts sk_/rk_ test or live keys. Live requires the separate STRIPE_LIVE_CONNECT_ENABLED flag.
  const keyCheck=connectKeyAllowed(secret,Deno.env.get("STRIPE_LIVE_CONNECT_ENABLED"));
  if (!keyCheck.ok && keyCheck.reason==="live_disabled")
   return respond({error:"Live Stripe Connect onboarding is disabled"},503);
  if (!keyCheck.ok) return respond({error:"Stripe configuration unavailable"},503);
  const base=Deno.env.get("SELLER_ONBOARDING_RETURN_URL") || "";
  if (!base.startsWith("https://")) return respond({error:"Secure onboarding return URL not configured"},503);
  const {data:existing}=await admin.from("seller_payout_accounts")
   .select("provider_account_id").eq("application_id",a.id).eq("provider","stripe").maybeSingle();
  let accountId=existing?.provider_account_id;
  if (!accountId) {
   if(action==="status") return respond({connected:false,transfers_enabled:false,payouts_enabled:false});
   const account=await stripeRequest("v2/core/accounts",{
    contact_email:user.email,identity:{country:"ca"},dashboard:"express",
    defaults:{responsibilities:{fees_collector:"application",losses_collector:"application"}},
    configuration:{recipient:{capabilities:{stripe_balance:{stripe_transfers:{requested:true}}}}},
    metadata:{application_id:a.id,user_id:user.id},include:["configuration.recipient"]
   },`seller-connect-v2-${a.id}`);
   accountId=account.id;
   const {error:saveError}=await admin.from("seller_payout_accounts").upsert({
    application_id:a.id,provider:"stripe",provider_account_id:accountId,country:a.country,
    verification_status:"pending",charges_enabled:false,payouts_enabled:false
   },{onConflict:"application_id,provider"});
   if(saveError) throw saveError;
  }
  const account=await stripeRequest(`v2/core/accounts/${encodeURIComponent(accountId)}?include[0]=configuration.recipient`);
  const transfers_enabled=transfersActive(account);
  const payouts_enabled=account.configuration?.recipient?.capabilities?.stripe_balance?.payouts?.status==="active";
  const {error:statusError}=await admin.from("seller_payout_accounts").update({transfers_enabled,payouts_enabled,
   verification_status:transfers_enabled?"verified":"pending"}).eq("application_id",a.id).eq("provider","stripe");
  if(statusError)throw statusError;
  if(action==="status")return respond({connected:true,transfers_enabled,payouts_enabled});
  const link=await stripeRequest("v2/core/account_links",{account:accountId,use_case:{type:"account_onboarding",
   account_onboarding:{configurations:["recipient"],refresh_url:base,return_url:base}}});
  return respond({url:link.url});
 } catch(e) { console.error("Stripe Connect onboarding error",e instanceof Error?e.name:"unknown");
  return respond({error:"Unable to start secure payout onboarding"},500); }
});
