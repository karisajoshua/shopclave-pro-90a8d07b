import { useEffect, useState } from "react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CreditCard, ExternalLink, Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const VendorPayments = () => {
  const { vendor } = useOutletContext<{ vendor: any }>();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [busy, setBusy] = useState(false);

  const { data: status, isLoading } = useQuery({
    queryKey: ["vendor-stripe-account", vendor?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("vendor_stripe_accounts")
        .select("*")
        .eq("vendor_id", vendor.id)
        .maybeSingle();
      return data;
    },
    enabled: !!vendor?.id,
  });

  // Re-sync from Stripe whenever the user returns from onboarding
  useEffect(() => {
    const completed = searchParams.get("completed");
    const refresh = searchParams.get("refresh");
    if (completed || refresh) {
      (async () => {
        try {
          await supabase.functions.invoke("stripe-connect-status");
          queryClient.invalidateQueries({ queryKey: ["vendor-stripe-account", vendor?.id] });
          if (completed) toast.success("Stripe onboarding updated");
        } catch (e) {
          console.error(e);
        } finally {
          setSearchParams({}, { replace: true });
        }
      })();
    }
  }, [searchParams, vendor?.id, queryClient, setSearchParams]);

  const handleConnect = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-connect-onboard", {
        body: { return_path: "/vendor/payments" },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (e: any) {
      toast.error(e.message || "Could not start Stripe onboarding");
    } finally {
      setBusy(false);
    }
  };

  const handleRefresh = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.functions.invoke("stripe-connect-status");
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["vendor-stripe-account", vendor?.id] });
      toast.success("Status refreshed");
    } catch (e: any) {
      toast.error(e.message || "Could not refresh status");
    } finally {
      setBusy(false);
    }
  };

  const isActive = status?.charges_enabled && status?.payouts_enabled;
  const inProgress = status?.stripe_account_id && !isActive;
  const notConnected = !status?.stripe_account_id;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold">Payments</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Connect your Stripe account so card payments go straight into your balance. Barakaz
          automatically deducts its commission from each order before transferring your share.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">Stripe Connect</CardTitle>
                <CardDescription>Receive card payments directly</CardDescription>
              </div>
            </div>
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : isActive ? (
              <Badge className="bg-success/15 text-success border-success/30">
                <ShieldCheck className="h-3 w-3 mr-1" /> Active
              </Badge>
            ) : inProgress ? (
              <Badge variant="outline">Setup incomplete</Badge>
            ) : (
              <Badge variant="outline">Not connected</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {notConnected && (
            <p className="text-sm text-muted-foreground">
              You haven't connected a Stripe account yet. Click below to open Stripe's secure
              onboarding form — you'll provide your business and bank details to Stripe directly.
            </p>
          )}

          {inProgress && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Your Stripe account needs more information before it can accept card payments.
                {status?.requirements_due &&
                Array.isArray(status.requirements_due) &&
                (status.requirements_due as unknown[]).length > 0 ? (
                  <ul className="list-disc pl-5 mt-2 space-y-0.5">
                    {(status.requirements_due as string[]).slice(0, 6).map((r) => (
                      <li key={r}>{r.replace(/_/g, " ")}</li>
                    ))}
                  </ul>
                ) : null}
              </AlertDescription>
            </Alert>
          )}

          {isActive && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-md border">
                <div className="text-xs text-muted-foreground">Country</div>
                <div className="font-medium uppercase">{status?.country || "—"}</div>
              </div>
              <div className="p-3 rounded-md border">
                <div className="text-xs text-muted-foreground">Currency</div>
                <div className="font-medium uppercase">{status?.default_currency || "—"}</div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            {notConnected && (
              <Button onClick={handleConnect} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-1" />}
                Connect Stripe account
              </Button>
            )}
            {inProgress && (
              <Button onClick={handleConnect} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <ExternalLink className="h-4 w-4 mr-1" />}
                Continue Stripe setup
              </Button>
            )}
            {status?.stripe_account_id && (
              <Button variant="outline" onClick={handleRefresh} disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                Refresh status
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How payouts work</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            When a buyer pays by card, Barakaz charges the full amount, automatically deducts the
            platform commission (based on the product's category) and a small processing fee, then
            transfers the rest into your Stripe balance.
          </p>
          <p>
            Stripe pays out to your bank account on its standard payout schedule — you can review
            balances, transfers and payouts from your Stripe dashboard.
          </p>
          <p>
            M-Pesa, bank transfer and cash on delivery remain available to buyers and are settled
            directly between buyer and vendor — those don't pass through Stripe.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default VendorPayments;
