import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import MarketplaceLayout from "@/components/layout/MarketplaceLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, AlertCircle, Loader2, MailX } from "lucide-react";

type Status = "validating" | "valid" | "invalid" | "already" | "submitting" | "success" | "error";

const EmailUnsubscribePage = () => {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [status, setStatus] = useState<Status>("validating");

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      return;
    }
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;
    fetch(`${supabaseUrl}/functions/v1/handle-email-unsubscribe?token=${encodeURIComponent(token)}`, {
      headers: { apikey: supabaseAnonKey },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.valid === true) setStatus("valid");
        else if (data?.reason === "already_unsubscribed") setStatus("already");
        else setStatus("invalid");
      })
      .catch(() => setStatus("invalid"));
  }, [token]);

  const handleConfirm = async () => {
    if (!token) return;
    setStatus("submitting");
    const { data, error } = await supabase.functions.invoke("handle-email-unsubscribe", {
      body: { token },
    });
    if (error) return setStatus("error");
    if (data?.success) setStatus("success");
    else if (data?.reason === "already_unsubscribed") setStatus("already");
    else setStatus("error");
  };

  return (
    <MarketplaceLayout>
      <div className="container max-w-md py-16 text-center">
        <div className="bg-card border border-border rounded-lg p-8">
          {status === "validating" && (
            <>
              <Loader2 className="h-10 w-10 text-muted-foreground mx-auto mb-4 animate-spin" />
              <p className="text-muted-foreground">Verifying your link…</p>
            </>
          )}
          {status === "valid" && (
            <>
              <MailX className="h-12 w-12 text-primary mx-auto mb-4" />
              <h1 className="font-display text-2xl font-bold mb-2">Unsubscribe from emails</h1>
              <p className="text-sm text-muted-foreground mb-6">
                You'll stop receiving marketing and order-update emails from Barakaz.
                Important account-security messages may still be sent.
              </p>
              <Button onClick={handleConfirm} className="w-full">Confirm unsubscribe</Button>
            </>
          )}
          {status === "submitting" && (
            <>
              <Loader2 className="h-10 w-10 text-muted-foreground mx-auto mb-4 animate-spin" />
              <p className="text-muted-foreground">Processing…</p>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle className="h-12 w-12 text-success mx-auto mb-4" />
              <h1 className="font-display text-2xl font-bold mb-2">You're unsubscribed</h1>
              <p className="text-sm text-muted-foreground mb-6">
                We're sorry to see you go. You won't receive further emails from us.
              </p>
              <Link to="/"><Button variant="outline">Back to home</Button></Link>
            </>
          )}
          {status === "already" && (
            <>
              <CheckCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h1 className="font-display text-2xl font-bold mb-2">Already unsubscribed</h1>
              <p className="text-sm text-muted-foreground mb-6">
                This email address was already removed from our list.
              </p>
              <Link to="/"><Button variant="outline">Back to home</Button></Link>
            </>
          )}
          {status === "invalid" && (
            <>
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h1 className="font-display text-2xl font-bold mb-2">Invalid link</h1>
              <p className="text-sm text-muted-foreground mb-6">
                This unsubscribe link is invalid or has expired.
              </p>
              <Link to="/"><Button variant="outline">Back to home</Button></Link>
            </>
          )}
          {status === "error" && (
            <>
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <h1 className="font-display text-2xl font-bold mb-2">Something went wrong</h1>
              <p className="text-sm text-muted-foreground mb-6">
                Please try again in a moment.
              </p>
              <Button onClick={handleConfirm}>Try again</Button>
            </>
          )}
        </div>
      </div>
    </MarketplaceLayout>
  );
};

export default EmailUnsubscribePage;
