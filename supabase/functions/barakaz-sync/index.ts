const corsHeaders={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...corsHeaders,"Content-Type":"application/json"}});
const TABLES=new Set(["orders","order_items","shipments","tracking_events","return_requests","notifications"]);
Deno.serve(async(req)=>{
 if(req.method==="OPTIONS")return new Response(null,{headers:corsHeaders});
 if(req.method!=="POST")return json({error:"Method not allowed"},405);
 const url=Deno.env.get("BARAKAZ_BRIDGE_URL"),secret=Deno.env.get("BARAKAZ_BRIDGE_SECRET");
 if(!url||!secret)return json({error:"Bridge not configured"},503);
 const token=(req.headers.get("Authorization")||"").replace("Bearer ","").trim();
 if(!token)return json({error:"Unauthorized"},401);
 const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
 if(token!==service)return json({error:"Server-to-server access only"},403);
 const b=await req.json().catch(()=>({}));
 if(!TABLES.has(b.table))return json({error:"Table not allowed"},403);
 if(!["select","insert","update"].includes(b.action))return json({error:"Action not allowed"},403);
 if(b.action==="update"&&(!Array.isArray(b.filters)||!b.filters.length))return json({error:"Update requires filters"},400);
 const upstream=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json","x-bridge-secret":secret},body:JSON.stringify({action:b.action,table:b.table,filters:b.filters||[],values:b.values||{}})});
 const text=await upstream.text();let data;try{data=JSON.parse(text)}catch{data={message:text}}
 return upstream.ok?json({ok:true,data}):json({error:"Bridge synchronization failed"},502);
});