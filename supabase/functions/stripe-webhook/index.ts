import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"Content-Type":"application/json"}});
const enc=new TextEncoder();
function timingSafe(a:string,b:string){if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0;}
async function hmac(secret:string,payload:string){const key=await crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const sig=await crypto.subtle.sign("HMAC",key,enc.encode(payload));return [...new Uint8Array(sig)].map(b=>b.toString(16).padStart(2,"0")).join("");}
async function validSignature(body:string,header:string,secret:string){const parts=Object.fromEntries(header.split(",").map(x=>x.split("=",2)));const t=parts.t,v1=parts.v1;if(!t||!v1)return false;if(Math.abs(Date.now()/1000-Number(t))>300)return false;return timingSafe(await hmac(secret,`${t}.${body}`),v1);}
Deno.serve(async(req)=>{
 const body=await req.text(), sig=req.headers.get("stripe-signature"), secret=Deno.env.get("STRIPE_WEBHOOK_SECRET");
 if(!sig||!secret||!(await validSignature(body,sig,secret)))return json({error:"Invalid signature"},400);
 let event:any;try{event=JSON.parse(body)}catch{return json({error:"Invalid payload"},400)}
 const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
 const {error:seen}=await admin.from("webhook_events").insert({provider:"stripe",event_key:event.id,payload:event});
 if(seen?.code==="23505")return json({received:true,duplicate:true});
 if(event.type==="checkout.session.completed"||event.type==="checkout.session.async_payment_succeeded"){
  const s=event.data?.object, orderId=s?.metadata?.order_id||s?.client_reference_id;
  if(orderId && s?.payment_status==="paid"){
   const amount=Number(s.amount_total||0)/100, currency=String(s.currency||"cad").toUpperCase();
   const {data:order}=await admin.from("orders").select("id,charged_amount,charged_currency,payment_status").eq("id",orderId).maybeSingle();
   if(!order)return json({error:"Order not found"},400);
   if(Math.abs(Number(order.charged_amount)-amount)>0.01 || String(order.charged_currency).toUpperCase()!==currency)return json({error:"Amount or currency mismatch"},400);
   await admin.from("orders").update({payment_provider:"stripe",payment_status:"paid",status:"processing",stripe_checkout_session_id:s.id,stripe_payment_intent_id:typeof s.payment_intent==="string"?s.payment_intent:null,updated_at:new Date().toISOString()}).eq("id",orderId).neq("payment_status","paid");
   const {data:items}=await admin.from("order_items").select("id,vendor_id,vendor_payout,shipping_amount").eq("order_id",orderId);
   for(const item of items||[]){const payout=Number(item.vendor_payout||0)+Number(item.shipping_amount||0);if(payout>0)await admin.from("vendor_ledger").upsert({vendor_id:item.vendor_id,order_item_id:item.id,entry_type:"sale",amount:payout,currency:"CAD",status:"available",stripe_reference:s.payment_intent||s.id,notes:"Platform-collected via Stripe"},{onConflict:"order_item_id,entry_type",ignoreDuplicates:true});}
   const {error:once}=await admin.from("webhook_events").insert({provider:"stripe-label",event_key:orderId,payload:{session_id:s.id}});
   if(!once)await admin.functions.invoke("shippo-purchase-label",{body:{order_id:orderId}});
  }
 }
 if(event.type==="checkout.session.async_payment_failed"){const s=event.data?.object,orderId=s?.metadata?.order_id||s?.client_reference_id;if(orderId)await admin.from("orders").update({payment_status:"failed"}).eq("id",orderId);}
 return json({received:true});
});
