import { stripeRequest } from "../_shared/stripe.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendOrderEmails } from "../_shared/order-emails.ts";
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"Content-Type":"application/json"}});
const enc=new TextEncoder();
function timingSafe(a:string,b:string){if(a.length!==b.length)return false;let x=0;for(let i=0;i<a.length;i++)x|=a.charCodeAt(i)^b.charCodeAt(i);return x===0;}
async function hmac(secret:string,payload:string){const key=await crypto.subtle.importKey("raw",enc.encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);const sig=await crypto.subtle.sign("HMAC",key,enc.encode(payload));return [...new Uint8Array(sig)].map(b=>b.toString(16).padStart(2,"0")).join("");}
async function validSignature(body:string,header:string,secret:string){const pairs=header.split(",").map(x=>x.trim().split("=",2));const t=pairs.find(([key])=>key==="t")?.[1];const signatures=pairs.filter(([key])=>key==="v1").map(([,value])=>value);if(!t||!signatures.length||!/^\d+$/.test(t))return false;if(Math.abs(Date.now()/1000-Number(t))>300)return false;const expected=await hmac(secret,`${t}.${body}`);return signatures.some(value=>timingSafe(expected,value));}
Deno.serve(async(req)=>{
 const body=await req.text(), sig=req.headers.get("stripe-signature"), secret=Deno.env.get("STRIPE_WEBHOOK_SECRET");
 if(!sig||!secret||!(await validSignature(body,sig,secret)))return json({error:"Invalid signature"},400);
 let event:any;try{event=JSON.parse(body)}catch{return json({error:"Invalid payload"},400)}
 const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
 // Only acknowledge completed processing. Failed attempts must be retried by Stripe.
 const {data:processed,error:lookupError}=await admin.from("webhook_events").select("event_key").eq("provider","stripe").eq("event_key",event.id).maybeSingle();
 if(lookupError)return json({error:"Event lookup failed; retry"},500);
 if(processed)return json({received:true,duplicate:true});
 try {
 if(event.type==="checkout.session.completed"||event.type==="checkout.session.async_payment_succeeded"){
  const s=event.data?.object, orderId=s?.metadata?.order_id||s?.client_reference_id;
  if(orderId && s?.payment_status==="paid"){
   const amount=Number(s.amount_total||0)/100, currency=String(s.currency||"cad").toUpperCase();
   const {data:order}=await admin.from("orders").select("id,charged_amount,charged_currency,payment_status,payment_provider,stripe_checkout_session_id").eq("id",orderId).maybeSingle();
   if(!order)throw new Error("Order not found");
   if(order.payment_provider!=="stripe"||order.stripe_checkout_session_id!==s.id)throw new Error("Session is not bound to this Stripe order");
   if(Math.abs(Number(order.charged_amount)-amount)>0.01 || String(order.charged_currency).toUpperCase()!==currency)throw new Error("Amount or currency mismatch");
   const {error:paidError}=await admin.rpc("confirm_stripe_checkout",{p_order:orderId,p_session:s.id,p_intent:typeof s.payment_intent==="string"?s.payment_intent:null,p_cents:s.amount_total,p_currency:s.currency});
   if(paidError)throw paidError;
   // Shipment fulfilment needs its own durable retry/outbox; do not mark an
   // event processed when downstream processing fails.
    // Sandbox guard: never buy real Shippo labels for Stripe test-mode events
    // or when explicitly disabled. Fails safe: anything other than livemode===true skips.
    const labelsDisabled=Deno.env.get("STRIPE_TEST_DISABLE_SHIPPO_LABELS")==="true"||event.livemode!==true;
    if(labelsDisabled)console.log("Shippo label purchase skipped (Stripe test mode or disabled)",{orderId});
    const {data:labelMarker}=labelsDisabled?{data:true}:await admin.from("webhook_events").select("event_key").eq("provider","stripe-label").eq("event_key",orderId).maybeSingle();
    if(!labelMarker){
    const {data:labelResult,error:labelError}=await admin.functions.invoke("shippo-purchase-label",{body:{order_id:orderId}});
    if(labelError)throw labelError;
    if(labelResult?.results?.some((result:{error?:string})=>Boolean(result.error)))throw new Error("One or more shipping labels failed; retry required");
    const {error:markerError}=await admin.from("webhook_events").upsert({provider:"stripe-label",event_key:orderId,payload:{session_id:s.id}},{onConflict:"provider,event_key",ignoreDuplicates:true});
    if(markerError)throw markerError;
   }
    // Verified, signed, amount-reconciled payment: send paid confirmation + seller emails (stable idempotency keys).
    await sendOrderEmails(admin,orderId,"paid",{notifyVendors:true});
  }
 }
 if(event.type==="checkout.session.async_payment_failed" || event.type==="checkout.session.expired") {
  const s=event.data?.object, orderId=s?.metadata?.order_id||s?.client_reference_id;
  if(orderId){const {error}=await admin.rpc("release_checkout_stock",{p_order:orderId,p_session:s.id});if(error)throw error;}
 }

 if(["refund.created","refund.updated","refund.failed"].includes(event.type)) {
  const object=event.data?.object;
  const current=await stripeRequest(`v1/refunds/${encodeURIComponent(object.id)}`);
  const refundId=current.metadata?.barakaz_refund_id;
  if(refundId){
   const {error}=await admin.rpc("complete_stripe_refund",{p_id:refundId,p_provider_id:current.id,p_status:current.status,p_cents:current.amount,p_currency:current.currency,p_intent:current.payment_intent});
   if(error)throw error;
  }
 }
 const {error:markError}=await admin.from("webhook_events").upsert({provider:"stripe",event_key:event.id,payload:event},{onConflict:"provider,event_key",ignoreDuplicates:true});
 if(markError)throw markError;
 return json({received:true});
 }catch(error){console.error("Stripe webhook processing failed",error);return json({error:"Processing failed; retry"},500);}
});
