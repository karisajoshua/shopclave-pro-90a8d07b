import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
export const STRIPE_API_VERSION = "2026-09-30.endive";
export const cors = {"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,x-client-info,content-type","Content-Type":"application/json"};
export const json = (body:unknown,status=200) => new Response(JSON.stringify(body),{status,headers:cors});
export function stripeKey(flag?:string) {
 const key=Deno.env.get("STRIPE_SECRET_KEY") || "";
 if(!/^(sk|rk)_(test|live)_\S+$/.test(key)) throw new Error("Stripe is not configured");
 if(/^(sk|rk)_live_/.test(key) && flag && Deno.env.get(flag)!=="true") throw new Error("Live operation is not enabled");
 return key;
}
export async function stripeRequest(path:string,body?:URLSearchParams|Record<string,unknown>,idempotency?:string) {
 const res=await fetch(`https://api.stripe.com/${path}`,{
  method:body?"POST":"GET",signal:AbortSignal.timeout(25000),
  headers:{Authorization:`Bearer ${stripeKey()}`,"Stripe-Version":STRIPE_API_VERSION,
   ...(body?{"Content-Type":body instanceof URLSearchParams?"application/x-www-form-urlencoded":"application/json"}:{}),
   ...(idempotency?{"Idempotency-Key":idempotency}:{})},
  body:body instanceof URLSearchParams?body:body?JSON.stringify(body):undefined,
 });
 const data=await res.json();
 if(!res.ok) throw new Error(`Stripe request failed (${res.status}); retry or reconcile the existing operation.`);
 return data;
}
export async function authenticatedAdmin(req:Request) {
 const url=Deno.env.get("SUPABASE_URL")!, auth=req.headers.get("Authorization");
 if(!auth) throw new Error("Unauthorized");
 const client=createClient(url,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:auth}}});
 const {data:{user}}=await client.auth.getUser();
 if(!user) throw new Error("Unauthorized");
 const admin=createClient(url,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
 const {data,error}=await admin.from("user_roles").select("role").eq("user_id",user.id).eq("role","admin").maybeSingle();
 if(error||!data) throw new Error("Admin access required");
 return {admin,user};
}
export function assertRetryWindow(createdAt:string) {
 // Stripe keys can be pruned after 24h; never blindly repeat an uncertain money request then.
 if(Date.now()-Date.parse(createdAt)>23*60*60*1000) throw new Error("Provider reconciliation required before retrying this operation");
}
export function transfersActive(account:any) {
 return account?.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status === "active";
}
