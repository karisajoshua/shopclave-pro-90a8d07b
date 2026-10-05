import { authenticatedAdmin,stripeRequest,stripeKey,json,cors,assertRetryWindow,transfersActive } from "../_shared/stripe.ts";
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return new Response(null,{headers:cors});
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 try {
  const {admin,user}=await authenticatedAdmin(req);
  stripeKey("STRIPE_LIVE_TRANSFERS_ENABLED");
  const {order_item_id}=await req.json();
  if(typeof order_item_id!=="string"||! /^[0-9a-f-]{36}$/i.test(order_item_id))return json({error:"Invalid order item"},400);
  const {data:t,error}=await admin.rpc("claim_stripe_transfer",{p_item:order_item_id,p_admin:user.id});
  if(error||!t)return json({error:error?.message||"Transfer unavailable"},409);
  if(t.status==="completed")return json({status:"completed",duplicate:true});
  const account=await stripeRequest(`v2/core/accounts/${encodeURIComponent(t.destination)}?include[0]=configuration.recipient`);
  if(!transfersActive(account))return json({error:"Seller must complete Stripe verification before receiving transfers"},409);
  let transfer;
  if(t.provider_transfer_id)transfer=await stripeRequest(`v1/transfers/${encodeURIComponent(t.provider_transfer_id)}`);
  else {
   assertRetryWindow(t.created_at);
   transfer=await stripeRequest("v1/transfers",new URLSearchParams({amount:String(Math.round(Number(t.amount)*100)),currency:"cad",destination:t.destination,"metadata[barakaz_transfer_id]":t.id,transfer_group:`barakaz-line-${order_item_id}`}),`barakaz-transfer-${t.id}`);
  }
  if(transfer.amount!==Math.round(Number(t.amount)*100)||transfer.currency!=="cad"||transfer.destination!==t.destination||transfer.reversed)throw new Error("Transfer requires reconciliation");
  const {error:save}=await admin.from("stripe_seller_transfers").update({status:"completed",provider_transfer_id:transfer.id,completed_at:new Date().toISOString()}).eq("id",t.id);if(save)throw save;
  return json({status:"completed",transfer_id:transfer.id,amount_cad:t.amount});
 }catch(e){const msg=e instanceof Error?e.message:"Transfer processing failed";return json({error:msg},msg==="Unauthorized"?401:msg==="Admin access required"?403:502);}
});
