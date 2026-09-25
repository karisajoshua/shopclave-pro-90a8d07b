import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.25.76";
const headers={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Content-Type":"application/json"};
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers});
const Body=z.object({order_id:z.string().uuid(),session_id:z.string().min(5).optional()});
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS") return new Response(null,{headers});
 try{
  const auth=req.headers.get("Authorization"); if(!auth)return json({error:"Unauthorized"},401);
  const url=Deno.env.get("SUPABASE_URL")!;
  const uc=createClient(url,Deno.env.get("SUPABASE_ANON_KEY")!,{global:{headers:{Authorization:auth}}});
  const {data:{user}}=await uc.auth.getUser(); if(!user)return json({error:"Unauthorized"},401);
  const parsed=Body.safeParse(await req.json().catch(()=>({}))); if(!parsed.success)return json({error:"Invalid request"},400);
  const admin=createClient(url,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const {data:order}=await admin.from("orders").select("id,user_id,payment_status,stripe_checkout_session_id,charged_amount,charged_currency").eq("id",parsed.data.order_id).maybeSingle();
  if(!order)return json({error:"Order not found"},404); if(order.user_id!==user.id)return json({error:"Forbidden"},403);
  if(order.payment_status==="paid")return json({paid:true,status:"paid",amount:order.charged_amount,currency:order.charged_currency});
  const sid=parsed.data.session_id||order.stripe_checkout_session_id; if(!sid)return json({paid:false,status:"pending"});
  const secret=Deno.env.get("STRIPE_SECRET_KEY"); if(!secret)return json({error:"Stripe is not configured"},503);
  const r=await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sid)}`,{headers:{Authorization:`Bearer ${secret}`}});
  const session=await r.json(); if(!r.ok)return json({error:"Could not verify payment"},502);
  if(session.client_reference_id!==order.id || session.metadata?.order_id!==order.id)return json({error:"Payment does not match order"},400);
  return json({paid:session.payment_status==="paid",status:session.payment_status==="paid"?"paid":"pending",amount:session.amount_total/100,currency:String(session.currency||"cad").toUpperCase()});
 }catch(e){console.error("stripe-verify",e);return json({error:"Internal server error"},500);}
});
