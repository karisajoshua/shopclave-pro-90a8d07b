import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const respond=(status:number,message:string)=>new Response(message,{status});
const messages:Record<string,string>={
 submitted:"Your Barakaz seller application has been submitted for review.",
 under_review:"Your Barakaz seller application is under review.",
 more_information_required:"Your Barakaz seller application needs additional information. Sign in to review your application.",
 rejected:"Your Barakaz seller application review is complete. Sign in for details.",
 approved:"Your Barakaz seller application has been approved. Your Stripe payout status is managed separately."
};
Deno.serve(async req=>{
 if(req.method!=="POST")return respond(405,"Method not allowed");
 const token=Deno.env.get("SELLER_NOTIFICATION_WORKER_TOKEN");
 if(!token||req.headers.get("x-worker-token")!==token)return respond(401,"Unauthorized");
 const key=Deno.env.get("RESEND_API_KEY"),from=Deno.env.get("SELLER_NOTIFICATION_FROM");
 if(!key||!from)return respond(503,"Email sender not configured");
 const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
 const {data:rows,error:claimError}=await admin.rpc("claim_seller_notifications",{p_limit:20});
 if(claimError)return respond(500,"Unable to claim notifications");
 let delivered=0,failed=0;
 for(const row of rows||[]){
  try{
   const {data:{user},error:userError}=await admin.auth.admin.getUserById(row.recipient_user_id);
   if(userError||!user?.email)throw new Error("Recipient unavailable");
   const message=messages[row.event_type];
   if(!message)throw new Error("Unknown notification");
   const res=await fetch("https://api.resend.com/emails",{
    method:"POST",
    headers:{"Authorization":`Bearer ${key}`,"Content-Type":"application/json",
      "Idempotency-Key":`seller-notification-${row.id}`},
    body:JSON.stringify({from,to:[user.email],subject:"Barakaz seller application update",
      text:message+"\n\nVisit https://barakaz.com/vendor/register to view your application."})
   });
   if(!res.ok)throw new Error(`Provider HTTP ${res.status}`);
   const {error:ackError}=await admin.rpc("complete_seller_notification",{
    p_id:row.id,p_claim_token:row.claim_token,p_delivered:true,p_error:null
   });
   if(ackError)throw ackError;
   delivered++;
  }catch(e){
   failed++;
   await admin.rpc("complete_seller_notification",{
    p_id:row.id,p_claim_token:row.claim_token,p_delivered:false,
    p_error:e instanceof Error?e.message:"Delivery failed"
   });
  }
 }
 return new Response(JSON.stringify({delivered,failed}),{
  status:failed?207:200,headers:{"Content-Type":"application/json"}
 });
});
