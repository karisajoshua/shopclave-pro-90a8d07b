import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{
 status,headers:{"Content-Type":"application/json","Cache-Control":"no-store",
 "Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,apikey,x-client-info,content-type"}
});
Deno.serve(async req=>{
 if(req.method==="OPTIONS")return json({},200);
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 const auth=req.headers.get("Authorization");
 if(!auth)return json({error:"Unauthorized"},401);
 const url=Deno.env.get("SUPABASE_URL")!,anon=Deno.env.get("SUPABASE_ANON_KEY")!;
 const client=createClient(url,anon,{global:{headers:{Authorization:auth}}});
 const {data:{user},error:authError}=await client.auth.getUser();
 if(authError||!user)return json({error:"Unauthorized"},401);
 const admin=createClient(url,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
 const {data:role,error:roleError}=await admin.from("user_roles").select("role")
  .eq("user_id",user.id).eq("role","admin").maybeSingle();
 if(roleError||!role)return json({error:"Forbidden"},403);
 let body:unknown;
 try{body=await req.json();}catch{return json({error:"Invalid request"},400);}
 const payload=body as Record<string,unknown>;
 if(payload?.action==="list"){
  const appId=payload.application_id;
  if(typeof appId!=="string"||!/^[0-9a-f-]{36}$/i.test(appId))return json({error:"Invalid application"},400);
  const {data:docs,error:listError}=await admin.from("seller_verification_documents")
   .select("id,requirement_code,verification_status,uploaded_at,reviewed_at")
   .eq("application_id",appId).order("uploaded_at",{ascending:false});
  if(listError)return json({error:"Unable to load documents"},500);
  return json({documents:docs});
 }
 const id=payload?.document_id;
 if(typeof id!=="string"||!/^[0-9a-f-]{36}$/i.test(id))return json({error:"Invalid document"},400);
 const {data:document,error}=await admin.from("seller_verification_documents")
  .select("id,private_storage_path,application_id,requirement_code,verification_status")
  .eq("id",id).maybeSingle();
 if(error||!document)return json({error:"Document unavailable"},404);
 const {data:application}=await admin.from("seller_applications")
  .select("status").eq("id",document.application_id).maybeSingle();
 if(!application||!["submitted","under_review"].includes(application.status))
  return json({error:"Application not reviewable"},409);
 const {data:signed,error:signError}=await admin.storage.from("seller-kyc-private")
  .createSignedUrl(document.private_storage_path,60);
 if(signError||!signed?.signedUrl)return json({error:"Unable to prepare document"},500);
 const {error:auditError}=await admin.from("seller_document_access_events").insert({
  document_id:document.id,reviewer_id:user.id,action:"signed_url_issued"
 });
 if(auditError)return json({error:"Unable to audit document access"},500);
 return json({url:signed.signedUrl,expires_in:60,requirement_code:document.requirement_code});
});
