import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MarketplaceLayout from "@/components/layout/MarketplaceLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import SellerKycUpload from "@/components/vendor/SellerKycUpload";
import SellerAgreements from "@/components/vendor/SellerAgreements";

type Draft = {
  country: string; business_type: string; legal_name: string; registration_number: string;
  full_name: string; phone: string; address: string; category: string;
  store_name: string; store_description: string; ship_from: string; return_address: string;
};
const blank: Draft = { country: "", business_type: "", legal_name: "", registration_number: "",
 full_name: "", phone: "", address: "", category: "", store_name: "", store_description: "",
 ship_from: "", return_address: "" };
const steps = ["Account", "Business", "Verification", "Store", "Payout", "Review"];
const fields: Record<number, Array<[keyof Draft, string, boolean]>> = {
  1: [["full_name", "Full name", true], ["phone", "Phone (international format)", true]],
  2: [["country", "Country code (e.g. CA, CN)", true], ["business_type", "Business type: individual, sole_proprietor or company", true],
      ["legal_name", "Legal business or personal name", true], ["registration_number", "Registration number (if applicable)", false],
      ["address", "Registered business address", true], ["category", "Business category", true]],
  4: [["store_name", "Store name", true], ["store_description", "Store description", true],
      ["ship_from", "Ship-from address", true], ["return_address", "Return address", true]],
};
const VendorRegisterPage = () => {
 const { user, loading: authLoading } = useAuth();
 const navigate = useNavigate();
 const [step, setStep] = useState(1);
 const [draft, setDraft] = useState<Draft>(blank);
 const [busy, setBusy] = useState(false);
 const [loading, setLoading] = useState(true);
 const [status, setStatus] = useState("draft");
 const [saved, setSaved] = useState(false);
 const [payoutStatus, setPayoutStatus] = useState("not_started");
 const [applicationId, setApplicationId] = useState("");
 const [agreementsAccepted, setAgreementsAccepted] = useState(false);
 useEffect(() => {
   if (authLoading) return;
   if (!user) { navigate("/auth", { state: { from: "/vendor/register" } }); return; }
   let cancelled = false;
   (async () => {
     const { data, error } = await supabase.from("seller_applications" as any).select("*").eq("user_id", user.id).maybeSingle();
     if (cancelled) return;
     if (error) { toast.error("Seller onboarding is not available yet. Please try later."); setLoading(false); return; }
     if (data) {
       const a = data as any;
       setApplicationId(a.id);
       const { data: payout } = await supabase.from("seller_payout_accounts" as any).select("verification_status,payouts_enabled").eq("application_id",a.id).eq("provider","stripe").maybeSingle();
       if (!cancelled && payout) setPayoutStatus((payout as any).payouts_enabled ? "verified" : (payout as any).verification_status);
       setStep(a.current_step || 1); setStatus(a.status);
       setDraft({ ...blank, ...(a.business_info || {}), ...(a.store_info || {}), country: a.country || "", business_type: a.business_type || "" });
     } else { setDraft(d => ({ ...d, full_name: user.user_metadata?.full_name || "" })); }
     setLoading(false);
   })();
   return () => { cancelled = true; };
 }, [user, authLoading, navigate]);
 const update = (key: keyof Draft, value: string) => { setDraft(d => ({ ...d, [key]: value })); if (key === "country" || key === "business_type") setAgreementsAccepted(false); setSaved(false); };
 const save = async (nextStep: number) => {
   if (!user || status !== "draft") return false;
   setBusy(true);
   const { data: savedApplication, error } = await supabase.rpc("save_seller_application_draft" as any, {
     p_current_step: nextStep,
     p_country: draft.country || null,
     p_business_type: draft.business_type || null,
     p_business_info: {
       full_name: draft.full_name, phone: draft.phone, legal_name: draft.legal_name,
       registration_number: draft.registration_number, address: draft.address, category: draft.category,
     },
     p_store_info: {
       store_name: draft.store_name, store_description: draft.store_description,
       ship_from: draft.ship_from, return_address: draft.return_address,
     },
   });
   setBusy(false);
   if (error) { toast.error(error.message); return false; }
   if (savedApplication && (savedApplication as any).id) setApplicationId((savedApplication as any).id);
   setSaved(true); return true;
 };
 const connectStripe = async () => {
   if (!draft.country || !draft.business_type) { toast.error("Complete business information first."); return; }
   if (!await save(5)) return;
   setBusy(true);
   const { data, error } = await supabase.functions.invoke("seller-stripe-connect");
   setBusy(false);
   if (error || !data?.url) { toast.error("Stripe Connect is not available for this seller country or account yet."); return; }
   const target = new URL(data.url);
   if (target.protocol !== "https:" || !target.hostname.endsWith(".stripe.com")) {
     toast.error("Unexpected payout onboarding destination."); return;
   }
   window.location.assign(target.toString());
 };
 const advance = async () => {
   if ((fields[step] || []).some(([key, , required]) => required && !draft[key].trim())) {
     toast.error("Complete the required fields before continuing."); return;
   }
   if (step === 2 && (!/^[A-Z]{2}$/.test(draft.country) ||
       !["individual", "sole_proprietor", "company"].includes(draft.business_type))) {
     toast.error("Enter a two-letter country code and valid business type."); return;
   }
   if (step === 6) {
     if (!agreementsAccepted) { toast.error("Accept all current seller agreements first."); return; }
     setBusy(true);
     const {error}=await supabase.rpc("submit_seller_application" as any);
     setBusy(false);
     if(error){toast.error(error.message);return;}
     setStatus("submitted");
     toast.success("Your seller application has been submitted for review.");
     return;
   }
   if (step === 3 || step === 5) {
     toast.info("You can continue setting up your store. Verification and payouts must be completed before submission.");
   }
   if (await save(step + 1)) setStep(step + 1);
 };
 if (authLoading || !user || loading) return <MarketplaceLayout><main className="container py-16">Loading seller application…</main></MarketplaceLayout>;
 return <MarketplaceLayout><main className="container max-w-3xl py-10 space-y-6">
   <div><h1 className="text-3xl font-bold">Become a Seller</h1>
     <p className="text-muted-foreground mt-2">Create your store. Your application is saved as you progress.</p></div>
   {status !== "draft" ? <section className="rounded-xl border p-6" role="status">
     <h2 className="font-semibold">Application: {status.replace(/_/g, " ")}</h2>
     <p className="text-sm text-muted-foreground">Your application is no longer editable. Check back for review updates.</p>
   </section> : <>
   <ol className="grid grid-cols-3 sm:grid-cols-6 gap-2" aria-label="Registration progress">
     {steps.map((name, i) => <li key={name} className={`text-center text-xs rounded-lg p-2 border ${step === i + 1 ? "border-primary font-semibold" : ""}`}>
       <span className="block text-lg">{i + 1}</span>{name}</li>)}
   </ol>
   <section className="rounded-xl border bg-card p-6 space-y-5">
     <h2 className="text-xl font-semibold">{steps[step - 1]}</h2>
     {step === 1 && <p className="text-sm text-muted-foreground">Signed in as {user.email}. Your existing Barakaz account will be used; no second password is required.</p>}
     {(fields[step] || []).map(([key, label, required]) => <div key={key} className="space-y-2">
       <Label htmlFor={key}>{label}{required ? " *" : ""}</Label>
       {key === "store_description" ? <Textarea id={key} value={draft[key]} onChange={e => update(key, e.target.value)} /> :
        key === "business_type" ? <select id={key} className="w-full rounded-md border bg-background p-2" value={draft[key]} onChange={e => update(key, e.target.value)}>
          <option value="">Choose business type</option><option value="individual">Individual</option>
          <option value="sole_proprietor">Sole proprietor</option><option value="company">Company / corporation</option></select> :
        <Input id={key} required={required} value={draft[key]} maxLength={key === "country" ? 2 : 250}
          onChange={e => update(key, key === "country" ? e.target.value.toUpperCase() : e.target.value)} />}
     </div>)}
     {step === 3 && <>{applicationId ? <SellerKycUpload applicationId={applicationId} country={draft.country} businessType={draft.business_type} /> : <p className="text-sm">Save your business information first to start secure verification.</p>}</>}
     {step === 5 && <div className="space-y-3"><p className="text-sm">Payouts use Stripe Connect exclusively, where available. Verification is separate from Barakaz seller approval.</p><p role="status" className="text-sm font-medium">Stripe payout status: {payoutStatus.replace(/_/g, " ")}</p><Button type="button" variant="secondary" disabled={busy} onClick={() => void connectStripe()}>Connect with Stripe</Button></div>}
     {step === 6 && <SellerAgreements country={draft.country} businessType={draft.business_type} onAccepted={()=>setAgreementsAccepted(true)} />}
     <div className="flex flex-wrap justify-between gap-3 pt-4">
       <Button variant="outline" disabled={busy || step === 1} onClick={() => setStep(s => s - 1)}>Back</Button>
       <div className="flex gap-2">
         <Button variant="outline" disabled={busy} onClick={() => void save(step)}>{saved ? "Saved" : "Save draft"}</Button>
         <Button disabled={busy} onClick={() => void advance()}>{step === 6 ? "Submit application" : "Save & continue"}</Button>
       </div>
     </div>
   </section></>}
 </main></MarketplaceLayout>;
};
export default VendorRegisterPage;
