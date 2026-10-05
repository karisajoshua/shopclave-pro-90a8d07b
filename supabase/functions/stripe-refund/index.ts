import { authenticatedAdmin, stripeRequest, stripeKey, json, cors, assertRetryWindow } from "../_shared/stripe.ts";
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{headers:cors});
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 try {
  const {admin,user}=await authenticatedAdmin(req);
  stripeKey("STRIPE_LIVE_REFUNDS_ENABLED");
  const {return_request_id}=await req.json();
  if(typeof return_request_id!=="string"||! /^[0-9a-f-]{36}$/i.test(return_request_id))return json({error:"Invalid return"},400);
  const {data:f,error}=await admin.rpc("claim_stripe_refund",{p_return:return_request_id,p_admin:user.id});
  if(error||!f)return json({error:error?.message||"Refund unavailable"},409);
  if(f.provider!=="stripe")return json({error:"Legacy refund requires reconciliation"},409);
  if(f.status==="processed")return json({status:"processed",duplicate:true});
  if(f.status==="failed")return json({error:"Failed refund requires provider reconciliation; no new refund was created."},409);
  let refund;
  if(f.provider_refund_id)refund=await stripeRequest(`v1/refunds/${encodeURIComponent(f.provider_refund_id)}`);
  else {
   assertRetryWindow(f.created_at);
   const {data:t,error:te}=await admin.from("stripe_seller_transfers").select("*").eq("order_item_id",f.order_item_id).maybeSingle();
   if(te)throw te;
   // Separate charges/transfers need an explicit reversal; refund reverse_transfer does not apply.
   if(t?.provider_transfer_id && Number(f.vendor_debit)>0 && !f.stripe_reversal_id){
    const reversal=await stripeRequest(`v1/transfers/${encodeURIComponent(t.provider_transfer_id)}/reversals`,new URLSearchParams({amount:String(Math.round(Number(f.vendor_debit)*100)),"metadata[refund_id]":f.id}),`barakaz-refund-reversal-${f.id}`);
    const {error:re}=await admin.from("payment_refunds").update({stripe_reversal_id:reversal.id}).eq("id",f.id);if(re)throw re;
   }
   refund=await stripeRequest("v1/refunds",new URLSearchParams({payment_intent:f.stripe_payment_intent_id,amount:String(Math.round(Number(f.provider_amount)*100)),reason:"requested_by_customer","metadata[barakaz_refund_id]":f.id}),`barakaz-refund-${f.id}`);
  }
  const {error:done}=await admin.rpc("complete_stripe_refund",{p_id:f.id,p_provider_id:refund.id,p_status:refund.status,p_cents:refund.amount,p_currency:refund.currency,p_intent:typeof refund.payment_intent==="string"?refund.payment_intent:refund.payment_intent?.id});
  if(done)throw done;
  return json({refund_id:f.id,status:refund.status==="succeeded"?"processed":refund.status,amount_cad:f.amount});
 }catch(e){const msg=e instanceof Error?e.message:"Refund processing failed";return json({error:msg},msg==="Unauthorized"?401:msg==="Admin access required"?403:502);}
});
