import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const encode=(bytes:Uint8Array)=>Array.from(bytes).map(x=>x.toString(16).padStart(2,"0")).join("");
Deno.serve(async req=>{
 if(req.method!=="POST") return new Response("Method not allowed",{status:405});
 const secret=Deno.env.get("STRIPE_CONNECT_WEBHOOK_SECRET");
 if(!secret) return new Response("Not configured",{status:503});
 const header=req.headers.get("stripe-signature")||"";
 const t=header.split(",").find(x=>x.startsWith("t="))?.slice(2);
 const signatures=header.split(",").filter(x=>x.startsWith("v1=")).map(x=>x.slice(3));
 if(!t || !/^\d+$/.test(t) || Math.abs(Date.now()/1000-Number(t))>300 || signatures.length===0)
  return new Response("Invalid signature",{status:400});
 const body=await req.text();
 const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(secret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
 const expected=new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(t+"."+body)));
 // Constant-time byte comparison for each candidate signature.
 const valid=signatures.some(sig=>{
  if(!/^[0-9a-f]{64}$/i.test(sig)) return false;
  const actual=Uint8Array.from(sig.match(/.{2}/g)!.map(x=>parseInt(x,16)));
  let diff=0;for(let i=0;i<32;i++)diff|=expected[i]^actual[i];return diff===0;
 });
 if(!valid) return new Response("Invalid signature",{status:400});
 let event:any;
 try { event=JSON.parse(body); } catch {return new Response("Invalid payload",{status:400});}
 if(event.type!=="account.updated") return new Response("Ignored",{status:200});
 const a=event.data?.object;
 if(typeof event.id!=="string"||typeof event.created!=="number"||typeof a?.id!=="string"
 ||typeof a.charges_enabled!=="boolean"||typeof a.payouts_enabled!=="boolean"
 ||typeof a.details_submitted!=="boolean")
  return new Response("Invalid account event",{status:400});
 const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
 const {error}=await admin.rpc("record_seller_stripe_account_event",{
  p_event_id:event.id,p_account_id:a.id,p_created_at:new Date(event.created*1000).toISOString(),
  p_charges_enabled:a.charges_enabled,p_payouts_enabled:a.payouts_enabled,p_details_submitted:a.details_submitted
 });
 if(error){console.error("Connect webhook database update failed",error.code);return new Response("Retry later",{status:500});}
 return new Response("OK",{status:200});
});
